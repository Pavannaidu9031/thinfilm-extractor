# Deploying Rock AI (soft-launch)

Two pieces deploy separately:

- **Backend** (FastAPI) → Render or Railway. Holds the secrets (Gemini key,
  Postgres URL). Neither secret is ever sent to the browser.
- **Frontend** (React/Vite static build) → Vercel or Netlify. Its only config
  is the backend's public URL.

Templates given: [`.env.production.example`](.env.production.example) (backend)
and [`web/.env.production.example`](web/.env.production.example) (frontend).

---

## 1. Provision Postgres (Supabase or Neon)

1. Create a free project.
2. Copy the connection string (URI form):
   - **Supabase:** Project → Settings → Database → *Connection string* → URI.
   - **Neon:** Dashboard → *Connection Details* → connection string.
3. Keep it for `DATABASE_URL` below. `postgres://` and `postgresql://` both
   work — the app pins the psycopg driver automatically. Tables are created on
   first startup; no manual migration needed.
4. **Percent-encode special characters in the password.** A literal `@` in the
   password breaks URL parsing — encode it as `%40` (e.g. `Dl10cj@9031` →
   `Dl10cj%409031`). Also `:` → `%3A`, `/` → `%2F`, `#` → `%23`.

## 2. Backend → Render (or Railway)

**Render (Blueprint — easiest):** the repo ships a [`render.yaml`](render.yaml)
at its root. New → **Blueprint** → connect this repo and Render reads the
service config below automatically. It will prompt for the `sync: false`
secrets (`GEMINI_API_KEY`, `DATABASE_URL`, `ALLOWED_ORIGINS`).

**Render (manual)** — New → Web Service → connect this repo, then set:

- **Root directory:** `backend` (this is the app root; `requirements.txt`
  lives here and the code imports its modules top-level).
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Health check path:** `/health`
- **Environment variables** (Dashboard → Environment):
  | Key | Value |
  |---|---|
  | `GEMINI_API_KEY` | your Gemini key (from aistudio.google.com/apikey) |
  | `DATABASE_URL` | the Postgres URI from step 1 |
  | `ALLOWED_ORIGINS` | your frontend URL, e.g. `https://rock-ai.vercel.app` |
  | `RATE_LIMIT_PER_DAY` | `10` (optional; defaults to 10) |

**Railway** — New Project → Deploy from repo. Set the **root directory** to
`backend`, use the same start command (`uvicorn main:app --host 0.0.0.0 --port
$PORT`), and set the same variables under Variables. Railway provides `$PORT`
automatically.

After deploy, confirm `https://your-backend.onrender.com/health` returns
`{"status":"ok"}`.

## 3. Frontend → Vercel (or Netlify)

**Vercel** — New Project → import repo:

- **Root directory:** `web`
- Framework preset: **Vite** (build `npm run build`, output `dist`). A
  [`web/vercel.json`](web/vercel.json) is included with the SPA rewrite so deep
  routes like `/paper/5` work on refresh.
- **Environment variable:** `VITE_API_URL` = your backend URL from step 2
  (e.g. `https://your-backend.onrender.com`). Vite inlines this at build time,
  so redeploy after changing it.

**Netlify** — New site from Git:

- **Base directory:** `web`
- **Build command:** `npm run build`   **Publish directory:** `web/dist`
- **Environment variable:** `VITE_API_URL` = your backend URL.
- SPA fallback is handled by [`web/public/_redirects`](web/public/_redirects).

## 4. Wire CORS

Set the backend's `ALLOWED_ORIGINS` to the exact frontend origin(s), e.g.
`https://rock-ai.vercel.app`. Multiple allowed: comma-separate them. Redeploy
the backend after changing it. (`*` also works to start, but pin it to your
frontend once you know the URL.)

## 5. Smoke test

1. Open the frontend URL.
2. Upload a PDF → it extracts (backend key), lands on the paper page.
3. Open the same site in a different browser/incognito → empty library
   (separate session).

---

## Notes & limits

- **Secrets stay server-side.** `GEMINI_API_KEY` and `DATABASE_URL` are backend
  env vars only. The frontend build contains just `VITE_API_URL` (public).
- **Rate limit is per browser session, in-memory.** It resets when the backend
  restarts (e.g. on redeploy) and is not shared across multiple backend
  instances. For a dozens-of-users soft-launch on a single instance this is
  fine; move it to the DB or Redis (and/or add an IP backstop) before scaling.
- **Free-tier cold starts.** Render/Railway free tiers sleep when idle; the
  first request after a nap takes a few seconds to wake the backend.
- **Session scoping is isolation, not auth.** Anyone with a session id sees its
  library; there are no accounts. Appropriate for a public free tool.
