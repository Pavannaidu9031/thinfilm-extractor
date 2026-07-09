"""FastAPI app: upload a research-paper PDF, get structured data back.

Multi-user: users sign in with Google via Supabase Auth and send the resulting
access token as an `Authorization: Bearer <token>` header. The backend verifies
the token (see auth.py) and uses the Supabase user id to scope all of a user's
data and to enforce a per-account daily extraction limit. Extraction itself runs
on the server's own Gemini key for every user.
"""

import os
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import (
    Body,
    Depends,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

import auth
import database
import exports
import template_store
from extractor import extract_from_pdf

EXPORTERS = {
    "xlsx": (exports.to_excel_bytes,
             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "docx": (exports.to_word_bytes,
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "pdf": (exports.to_pdf_bytes, "application/pdf"),
}

load_dotenv()

# Each account gets a fixed number of extractions per UTC calendar day,
# protecting the shared server Gemini key from being drained by one user/bot.
# In-memory + per-process: resets on restart, keyed by the authenticated
# Supabase user id — fine for a small soft-launch; move to a shared/DB-backed
# count to survive restarts and multiple backend instances.
RATE_LIMIT_PER_DAY = int(os.environ.get("RATE_LIMIT_PER_DAY", "10"))
_usage: dict[str, tuple[str, int]] = {}  # user_id -> (utc_date, count)


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _usage_today(user_id: str) -> int:
    day, count = _usage.get(user_id, (_utc_today(), 0))
    return count if day == _utc_today() else 0


def _bump_usage(user_id: str) -> None:
    _usage[user_id] = (_utc_today(), _usage_today(user_id) + 1)


def current_user_id(authorization: str = Header(default=None)) -> str:
    """FastAPI dependency: verify the Supabase access token and return the
    user id, or raise 401. Expects `Authorization: Bearer <token>`."""
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    user_id = auth.verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="rock-ai-extractor", lifespan=lifespan)

# Frontend is served from a different origin in production (Vercel/Netlify).
# ALLOWED_ORIGINS is a comma-separated list; "*" allows any origin.
_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,  # no cookies; auth is via the Authorization header
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/usage")
def usage(user_id: str = Depends(current_user_id)):
    used = _usage_today(user_id)
    return {
        "used": used,
        "limit": RATE_LIMIT_PER_DAY,
        "remaining": max(0, RATE_LIMIT_PER_DAY - used),
        "resets": "midnight UTC",
    }


@app.post("/extract")
def extract(
    file: UploadFile = File(...),
    template: str = Form(template_store.DEFAULT_TEMPLATE),
    user_id: str = Depends(current_user_id),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    # daily-limit gate (per account, UTC calendar day)
    if _usage_today(user_id) >= RATE_LIMIT_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail="Daily limit reached — resets at midnight UTC.",
        )

    try:
        template_spec = template_store.load_template(template)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file.file.read())
        tmp_path = Path(tmp.name)

    try:
        # server's own key (GEMINI_API_KEY) is used for every user
        data = extract_from_pdf(tmp_path, template=template_spec)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    finally:
        tmp_path.unlink(missing_ok=True)

    extraction_id = database.save_extraction(user_id, file.filename, data, template=template)
    _bump_usage(user_id)  # count only successful extractions
    return {
        "id": extraction_id,
        "filename": file.filename,
        "template": template,
        "data": data,
    }


@app.get("/templates")
def get_templates():
    return template_store.list_templates()


@app.get("/templates/{name}")
def get_template(name: str):
    try:
        return template_store.load_template(name)
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/templates", status_code=201)
def create_template(spec: dict = Body(...)):
    """Create a new extraction template from a plain JSON spec — see
    backend/template_store.py:create_template for the expected shape."""
    try:
        return template_store.create_template(spec)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.get("/extractions")
def extractions(user_id: str = Depends(current_user_id)):
    return database.list_extractions(user_id)


@app.get("/extractions/export/all")
def export_all_extractions(user_id: str = Depends(current_user_id)):
    """This account's extractions in one Excel workbook for comparison."""
    records = [
        database.get_extraction(user_id, item["id"])
        for item in database.list_extractions(user_id)
    ]
    records = [r for r in records if r]
    if not records:
        raise HTTPException(status_code=404, detail="No extractions to export yet.")
    content = exports.to_excel_all_bytes(records)
    return Response(
        content,
        media_type=EXPORTERS["xlsx"][1],
        headers={"Content-Disposition": 'attachment; filename="all_extractions.xlsx"'},
    )


@app.get("/extractions/{extraction_id}")
def extraction(extraction_id: int, user_id: str = Depends(current_user_id)):
    record = database.get_extraction(user_id, extraction_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Extraction not found.")
    return record


@app.delete("/extractions/{extraction_id}")
def delete_extraction(extraction_id: int, user_id: str = Depends(current_user_id)):
    if not database.delete_extraction(user_id, extraction_id):
        raise HTTPException(status_code=404, detail="Extraction not found.")
    return {"deleted": extraction_id}


@app.get("/extractions/{extraction_id}/export/{fmt}")
def export_extraction(
    extraction_id: int, fmt: str, user_id: str = Depends(current_user_id)
):
    if fmt not in EXPORTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown format '{fmt}'. Use one of: {', '.join(EXPORTERS)}.",
        )
    record = database.get_extraction(user_id, extraction_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Extraction not found.")

    build, media_type = EXPORTERS[fmt]
    content = build(record)
    download_name = f"{Path(record['filename']).stem}_extraction.{fmt}"
    return Response(
        content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )
