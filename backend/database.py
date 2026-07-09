"""Storage for extraction results.

Uses SQLAlchemy Core so the same code runs on SQLite (local dev, default) and
Postgres (production) — set DATABASE_URL to a Postgres connection string to
switch. Every user-facing row is scoped by `session_id`, which now holds the
authenticated Supabase user id (a UUID) so each account only sees its own
papers. The column keeps its historical name; rows written before Google
sign-in existed hold a random browser-session UUID instead and are simply never
matched by a signed-in account (left in place, not migrated).
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import (
    Column,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    create_engine,
    delete as sa_delete,
    func,
    insert,
    inspect,
    select,
    text,
    update as sa_update,
)

from template_store import DEFAULT_TEMPLATE

DEFAULT_SQLITE_PATH = Path(__file__).parent / "extractions.db"

metadata = MetaData()
extractions = Table(
    "extractions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("session_id", String(64), nullable=False, index=True),
    Column("filename", Text, nullable=False),
    Column("data", Text, nullable=False),
    Column("created_at", Text, nullable=False),
    Column("template", Text, nullable=False, server_default=DEFAULT_TEMPLATE),
)


def _normalize_url(url: str) -> str:
    # Supabase/Neon/Heroku hand out postgres:// or postgresql:// — pin the
    # psycopg (v3) driver so SQLAlchemy uses it.
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def _default_url() -> str:
    env = os.environ.get("DATABASE_URL")
    if env:
        return _normalize_url(env)
    return f"sqlite:///{DEFAULT_SQLITE_PATH}"


_engines: dict = {}


def get_engine(url: str | None = None):
    url = url or _default_url()
    if url not in _engines:
        _engines[url] = create_engine(url, future=True, pool_pre_ping=True)
    return _engines[url]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db(engine=None) -> None:
    engine = engine or get_engine()
    metadata.create_all(engine)

    # Legacy SQLite databases created before these columns existed: add them
    # and tag existing rows so nothing is lost. (Fresh Postgres skips this.)
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns("extractions")}
    with engine.begin() as conn:
        if "template" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE extractions ADD COLUMN template TEXT NOT NULL "
                    f"DEFAULT '{DEFAULT_TEMPLATE}'"
                )
            )
        if "session_id" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE extractions ADD COLUMN session_id VARCHAR(64) "
                    "NOT NULL DEFAULT 'legacy'"
                )
            )


def _row_to_dict(row) -> dict:
    return {
        "id": row.id,
        "filename": row.filename,
        "data": json.loads(row.data),
        "created_at": row.created_at,
        "template": row.template,
    }


# ---- user-scoped operations (every one filters by session_id) --------------


def save_extraction(
    session_id: str,
    filename: str,
    data: dict,
    template: str = DEFAULT_TEMPLATE,
    engine=None,
) -> int:
    engine = engine or get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            insert(extractions).values(
                session_id=session_id,
                filename=filename,
                data=json.dumps(data),
                created_at=_now(),
                template=template,
            )
        )
        return result.inserted_primary_key[0]


def get_extraction(session_id: str, extraction_id: int, engine=None) -> dict | None:
    engine = engine or get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            select(extractions).where(
                extractions.c.id == extraction_id,
                extractions.c.session_id == session_id,
            )
        ).first()
    return _row_to_dict(row) if row else None


def list_extractions(session_id: str, engine=None) -> list[dict]:
    engine = engine or get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            select(
                extractions.c.id,
                extractions.c.filename,
                extractions.c.created_at,
                extractions.c.template,
            )
            .where(extractions.c.session_id == session_id)
            .order_by(extractions.c.id.desc())
        ).all()
    return [
        {"id": r.id, "filename": r.filename, "created_at": r.created_at, "template": r.template}
        for r in rows
    ]


def delete_extraction(session_id: str, extraction_id: int, engine=None) -> bool:
    engine = engine or get_engine()
    with engine.begin() as conn:
        result = conn.execute(
            sa_delete(extractions).where(
                extractions.c.id == extraction_id,
                extractions.c.session_id == session_id,
            )
        )
        return result.rowcount > 0


def count_extractions(session_id: str, engine=None) -> int:
    engine = engine or get_engine()
    with engine.connect() as conn:
        return conn.execute(
            select(func.count())
            .select_from(extractions)
            .where(extractions.c.session_id == session_id)
        ).scalar_one()


# ---- admin / offline operations (not exposed via the user API) -------------


def update_extraction(
    extraction_id: int, data: dict, template: str | None = None, engine=None
) -> bool:
    """Replace a record's data (offline backfill; not session-scoped)."""
    engine = engine or get_engine()
    values = {"data": json.dumps(data)}
    if template is not None:
        values["template"] = template
    with engine.begin() as conn:
        result = conn.execute(
            sa_update(extractions).where(extractions.c.id == extraction_id).values(**values)
        )
        return result.rowcount > 0


def admin_list_all(engine=None) -> list[dict]:
    """Every record regardless of session (offline export/reporting)."""
    engine = engine or get_engine()
    with engine.connect() as conn:
        rows = conn.execute(
            select(
                extractions.c.id,
                extractions.c.filename,
                extractions.c.created_at,
                extractions.c.template,
                extractions.c.session_id,
            ).order_by(extractions.c.id.desc())
        ).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "created_at": r.created_at,
            "template": r.template,
            "session_id": r.session_id,
        }
        for r in rows
    ]


def admin_get(extraction_id: int, engine=None) -> dict | None:
    engine = engine or get_engine()
    with engine.connect() as conn:
        row = conn.execute(
            select(extractions).where(extractions.c.id == extraction_id)
        ).first()
    return _row_to_dict(row) if row else None
