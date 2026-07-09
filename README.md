# thinfilm-extractor

Extract structured data (deposition conditions, film properties, paper metadata)
from research-paper PDFs using pdfplumber + the Google Gemini API, with a
FastAPI backend, SQLite/Postgres storage, and a React (Vite + Tailwind) frontend.

## Project layout

```
thinfilm-extractor/
  backend/
    main.py          FastAPI app (upload PDF -> extract -> store -> export)
    extractor.py     PDF text extraction + Gemini API call (template-driven)
    template_store.py  Template system: list/load/create, schema generation
    templates/       Extraction templates (JSON), one per research area
    exports.py       Excel / Word / PDF report generation
    schema.py        JSON schema the extraction must conform to
    database.py      SQLite storage (backend/extractions.db)
    requirements.txt Python dependencies (backend is the deploy root dir)
    test_papers/     drop sample PDFs here
  web/               React + Vite + Tailwind UI (the frontend)
  tests/
    test_extraction.py
  render.yaml        Render Blueprint for the backend service
  .env               your GEMINI_API_KEY (gitignored)
```

## Setup

Requires Python 3.11+.

```powershell
cd thinfilm-extractor
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Then put your Gemini API key (from Google AI Studio) in `.env`:

```
GEMINI_API_KEY=...
```

## Run the backend

The backend is self-contained in `backend/` — that directory is the app root
(the same as `rootDir: backend` on Render). With the venv activated, run it
from inside `backend/`:

```powershell
cd backend
uvicorn main:app --reload
```

API docs at http://localhost:8000/docs. Endpoints:

- `POST /extract` — upload a PDF (multipart `file` field, optional `template`
  field defaulting to `thin_film_deposition`), returns extracted JSON and saves it
- `GET /templates` — list extraction templates; `GET /templates/{name}` for one
- `POST /templates` — create a template from a JSON spec (name + field list),
  no code changes needed; stored in `backend/templates/`
- `GET /extractions` — list saved extractions
- `GET /extractions/{id}` — full result for one extraction
- `DELETE /extractions/{id}` — remove an extraction
- `GET /extractions/{id}/export/{fmt}` — download as `xlsx`, `docx`, or `pdf`
- `GET /extractions/export/all` — every paper in one Excel comparison workbook

## Run the frontend (React — primary)

Requires Node.js 18+. In a second terminal (backend running):

```powershell
cd web
npm install     # first time only
npm run dev
```

Opens at http://localhost:5173 ("Rock AI"), a multi-page app (React Router)
with a persistent top nav across four routes:

- **/library** (default) — stats strip + cards/papers/samples views, template
  filter, and export-all
- **/upload** — the specimen-intake upload zone; extraction lands you on the
  new paper's page
- **/templates** — list every template's field set, and build a new one
  (name + typed field list) via `POST /templates`
- **/paper/:id** — full detail for one extraction: all records, exports, delete

Pick an extraction template (thin-film, chemistry, or any you create), then
drag-and-drop a PDF to extract. Browse the library as ledger cards, a
searchable/sortable papers table, or flat per-template comparison tables —
all columns derive from each paper's template, and a template filter scopes
every view. Download any paper as Excel/Word/PDF (template-specific columns)
or the whole library as one workbook with a sheet per template. Extras:
library stats strip, duplicate-file badges, per-paper delete (two-click
confirm), copy-JSON, and toast notifications. The dev server proxies
`/api/*` to the backend on :8000 (change the target in `web/vite.config.js`
or set `VITE_API_URL` if the backend runs elsewhere).

## Run the tests

```powershell
pytest
```

The tests mock the Gemini API, so they run without an API key or network.

## Notes

- Extraction uses Gemini (`gemini-2.5-flash`, free tier) in JSON response
  mode; results are validated against the chosen template's schema, with one
  automatic retry on invalid output.
- Templates live in `backend/templates/` as field specs (see
  `backend/template_store.py`). A template may set `unreported_value` (e.g.
  `"NR"`) to have Gemini return that sentinel instead of `null` for fields a
  paper doesn't report. The `thin_film_deposition` template is a 32-column
  literature-tracking table (one row per paper) and its Excel export uses a
  bespoke reference layout (`Literature Parameters` sheet: title, subtitle,
  header, one data row per paper); all other templates use the generic
  comparison layout.
- Results are stored in `backend/extractions.db` (SQLite, created automatically).
- Scanned PDFs without a text layer will be rejected with a 422 (no OCR step yet).
