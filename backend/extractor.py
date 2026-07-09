"""PDF text extraction and Gemini API calls (template-driven)."""

import json
import logging
import os
import time
from pathlib import Path

import jsonschema
import pdfplumber
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from template_store import (
    DEFAULT_TEMPLATE,
    build_schema,
    build_system_prompt,
    load_template,
)

load_dotenv()

logger = logging.getLogger(__name__)

MODEL = "gemini-2.5-flash"

STRICT_RETRY_INSTRUCTION = (
    "IMPORTANT: Your previous response was not valid JSON matching the required "
    "schema. Respond with ONLY a single raw JSON object that validates against "
    "the schema given in the instructions. Every required key must be present; "
    "use null for unknown values. No markdown, no code fences, no explanations."
)


def extract_pdf_text(pdf_path: str | Path) -> str:
    """Extract plain text from every page of a PDF."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return "\n\n".join(pages)


def _build_client(api_key: str | None = None) -> genai.Client:
    # The shared server key (GEMINI_API_KEY) serves all users; it lives only in
    # the backend environment and is never exposed to the browser. An explicit
    # api_key arg is supported for offline scripts/tests.
    api_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set on the server.")
    return genai.Client(api_key=api_key)


# Gemini free tier intermittently returns 503 "high demand" / 429; back off and
# retry those instead of surfacing a raw server error.
TRANSIENT_CODES = {429, 500, 502, 503, 504}
BACKOFF_SECONDS = (5, 15)


def _generate_with_backoff(client, prompt: str, config):
    last_exc = None
    for attempt in range(len(BACKOFF_SECONDS) + 1):
        try:
            return client.models.generate_content(
                model=MODEL, contents=prompt, config=config
            )
        except genai_errors.APIError as exc:
            if getattr(exc, "code", None) not in TRANSIENT_CODES:
                raise
            last_exc = exc
            if attempt < len(BACKOFF_SECONDS):
                logger.warning(
                    "Gemini transient error %s — retrying in %ss",
                    exc.code,
                    BACKOFF_SECONDS[attempt],
                )
                time.sleep(BACKOFF_SECONDS[attempt])
    raise ValueError(
        f"Gemini is temporarily unavailable (HTTP {last_exc.code}); please try "
        "again in a minute."
    )


def extract_data(
    paper_text: str, client=None, template: dict | None = None, api_key: str | None = None
) -> dict:
    """Send paper text to Gemini and return structured data for a template.

    The template (default: thin_film_deposition) supplies both the JSON schema
    the response must match and the field guide in the system prompt. JSON
    response mode plus local jsonschema validation enforce the schema. If the
    response is invalid, retries once with a stricter prompt, then logs the
    failure and raises ValueError (the API layer maps this to a 422).
    """
    if client is None:
        client = _build_client(api_key)
    if template is None:
        template = load_template(DEFAULT_TEMPLATE)

    schema = build_schema(template)
    config = types.GenerateContentConfig(
        system_instruction=build_system_prompt(template, schema),
        response_mime_type="application/json",
    )

    prompt = paper_text
    last_error = None
    for attempt in (1, 2):
        response = _generate_with_backoff(client, prompt, config)
        try:
            # .text is None when the response was blocked or has no text part
            raw = response.text
        except Exception as exc:
            last_error = f"no text in Gemini response ({exc})"
        else:
            if raw is None:
                last_error = "no text in Gemini response (empty or blocked)"
            else:
                try:
                    data = json.loads(raw)
                    jsonschema.validate(data, schema)
                    return data
                except json.JSONDecodeError as exc:
                    last_error = f"invalid JSON ({exc})"
                except jsonschema.ValidationError as exc:
                    last_error = f"JSON does not match schema ({exc.message})"

        if attempt == 1:
            logger.warning(
                "Extraction attempt 1 failed: %s — retrying with stricter prompt",
                last_error,
            )
            prompt = f"{paper_text}\n\n{STRICT_RETRY_INSTRUCTION}"

    logger.error("Extraction failed after retry: %s", last_error)
    raise ValueError(
        f"Gemini did not return valid JSON matching the schema: {last_error}"
    )


def extract_from_pdf(
    pdf_path: str | Path, client=None, template: dict | None = None, api_key: str | None = None
) -> dict:
    """Full pipeline: PDF file -> text -> structured data."""
    paper_text = extract_pdf_text(pdf_path)
    if not paper_text.strip():
        raise ValueError(f"No extractable text in {pdf_path} (scanned PDF without OCR?)")
    return extract_data(paper_text, client=client, template=template, api_key=api_key)
