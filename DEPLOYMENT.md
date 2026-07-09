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

### 1b. Enable Google sign-in (Supabase Auth)

Users sign in with Google; that identity scopes each account's library and its
per-account daily limit. One-time setup across Google Cloud + Supabase:

1. **Google Cloud Console** → *APIs & Services*:
   - *OAuth consent screen*: User type **External**; set app name + support
     email; add scopes `openid`, `email`, `profile`. While the app is in
     "Testing", add your test Google accounts under **Test users**.
   - *Credentials → Create OAuth client ID → Web application*. Set the
     **Authorized redirect URI** to your Supabase callback:
     `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Copy the **Client ID**
     and **Client Secret**.
2. **Supabase → Authentication → Providers → Google**: enable, paste the Client
   ID + Secret, save.
3. **Supabase → Authentication → URL Configuration**: set **Site URL** to your
   frontend URL, and add both `http://localhost:5173/**` and your production
   frontend URL (with `/**`) to **Redirect URLs**.
4. **Supabase → Settings → API**: copy the **Project URL** and **anon/public**
   key — these become `SUPABASE_URL` / `SUPABASE_ANON_KEY` (backend) and
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend). The anon key is
   public; do **not** use the service_role key.

## 2. Backend → Render (or Railway)

**Render (Blueprint — easiest):** the repo ships a [`render.yaml`](render.yaml)
at its root. New → **Blueprint** → connect this repo and Render reads the
service config below automatically. It will prompt for the `sync: false`
secrets (`GEMINI_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`ALLOWED_ORIGINS`).

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
  | `SUPABASE_URL` | your Supabase Project URL (step 1b) |
  | `SUPABASE_ANON_KEY` | your Supabase anon/public key (step 1b) |
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
- **Environment variables** (all public; Vite inlines them at build time, so
  redeploy after changing any):
  - `VITE_API_URL` = your backend URL from step 2 (e.g.
    `https://your-backend.onrender.com`)
  - `VITE_SUPABASE_URL` = your Supabase Project URL (step 1b)
  - `VITE_SUPABASE_ANON_KEY` = your Supabase anon/public key (step 1b)

**Netlify** — New site from Git:

- **Base directory:** `web`
- **Build command:** `npm run build`   **Publish directory:** `web/dist`
- **Environment variables:** `VITE_API_URL` = your backend URL,
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from step 1b.
- SPA fallback is handled by [`web/public/_redirects`](web/public/_redirects).

## 4. Wire CORS

Set the backend's `ALLOWED_ORIGINS` to the exact frontend origin(s), e.g.
`https://rock-ai.vercel.app`. Multiple allowed: comma-separate them. Redeploy
the backend after changing it. (`*` also works to start, but pin it to your
frontend once you know the URL.)

## 5. Smoke test

1. Open the frontend URL → the data pages prompt **Sign in with Google**.
2. Sign in with a Google account → upload a PDF → it extracts (backend key)
   and lands on the paper page.
3. Sign out and sign in with a **different** Google account → empty library
   (each account is isolated) with its own daily allowance.

---

## Notes & limits

- **Secrets stay server-side.** `GEMINI_API_KEY` and `DATABASE_URL` are backend
  env vars only. The Supabase anon key is public by design. The frontend build
  contains only public `VITE_*` values.
- **Rate limit is per Google account, in-memory.** It resets when the backend
  restarts (e.g. on redeploy) and is not shared across multiple backend
  instances. For a dozens-of-users soft-launch on a single instance this is
  fine; move it to a DB-backed count (or Redis) before scaling out.
- **Free-tier cold starts.** Render/Railway free tiers sleep when idle; the
  first request after a nap takes a few seconds to wake the backend.
- **Auth = Google sign-in via Supabase.** The backend verifies each request's
  Supabase access token and scopes data + quota by the account's user id.
  Papers stored before sign-in existed (anonymous browser sessions) remain in
  the database but are not attached to any account.
