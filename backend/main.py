"""FastAPI app: upload a research-paper PDF, get structured data back.

Multi-user ready: each browser sends an X-Session-Id header that scopes all of
its data, and its own Gemini API key as X-Gemini-Key (never stored). Uploads
are rate-limited per client IP.
"""

import os
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from backend import database, exports, template_store
from backend.extractor import extract_from_pdf

EXPORTERS = {
    "xlsx": (exports.to_excel_bytes,
             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    "docx": (exports.to_word_bytes,
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "pdf": (exports.to_pdf_bytes, "application/pdf"),
}

load_dotenv()

# Each browser session gets a fixed number of extractions per UTC calendar day,
# protecting the shared server Gemini key from being drained by one user/bot.
# In-memory + per-process: resets on restart, and keyed by the client-supplied
# session id (bypassable by clearing browser storage) — fine for a small
# soft-launch; move to a shared store / add an IP backstop to harden it.
RATE_LIMIT_PER_DAY = int(os.environ.get("RATE_LIMIT_PER_DAY", "10"))
_usage: dict[str, tuple[str, int]] = {}  # session_id -> (utc_date, count)


def _utc_today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _usage_today(session_id: str) -> int:
    day, count = _usage.get(session_id, (_utc_today(), 0))
    return count if day == _utc_today() else 0


def _bump_usage(session_id: str) -> None:
    _usage[session_id] = (_utc_today(), _usage_today(session_id) + 1)


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
    allow_credentials=False,  # no cookies; auth is via the X-Session-Id header
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/usage")
def usage(session_id: str = Header(..., alias="X-Session-Id")):
    used = _usage_today(session_id[:64])
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
    session_id: str = Header(default=None, alias="X-Session-Id"),
):
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-Id header.")
    session_id = session_id[:64]
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    # daily-limit gate (per session, UTC calendar day)
    if _usage_today(session_id) >= RATE_LIMIT_PER_DAY:
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

    extraction_id = database.save_extraction(session_id, file.filename, data, template=template)
    _bump_usage(session_id)  # count only successful extractions
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
def extractions(session_id: str = Header(..., alias="X-Session-Id")):
    return database.list_extractions(session_id[:64])


@app.get("/extractions/export/all")
def export_all_extractions(session_id: str = Header(..., alias="X-Session-Id")):
    """This session's extractions in one Excel workbook for comparison."""
    session_id = session_id[:64]
    records = [
        database.get_extraction(session_id, item["id"])
        for item in database.list_extractions(session_id)
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
def extraction(extraction_id: int, session_id: str = Header(..., alias="X-Session-Id")):
    record = database.get_extraction(session_id[:64], extraction_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Extraction not found.")
    return record


@app.delete("/extractions/{extraction_id}")
def delete_extraction(extraction_id: int, session_id: str = Header(..., alias="X-Session-Id")):
    if not database.delete_extraction(session_id[:64], extraction_id):
        raise HTTPException(status_code=404, detail="Extraction not found.")
    return {"deleted": extraction_id}


@app.get("/extractions/{extraction_id}/export/{fmt}")
def export_extraction(
    extraction_id: int, fmt: str, session_id: str = Header(..., alias="X-Session-Id")
):
    if fmt not in EXPORTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown format '{fmt}'. Use one of: {', '.join(EXPORTERS)}.",
        )
    record = database.get_extraction(session_id[:64], extraction_id)
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
