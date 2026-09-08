# Minco backend — Flask + SQLite

REST API for the Minco frontend (auth, feed posts, chat). No ORM, no build step.
The frontend works **without** the backend too (localStorage demo mode) — the backend
adds real shared accounts and posts when it's running.

## Endpoints

| Method | Path | Auth | What |
|---|---|---|---|
| GET | `/api/health` | – | Health check |
| POST | `/api/register` | – | `{name, email, password}` → `{user, token}` |
| POST | `/api/login` | – | `{email, password}` → `{user, token}` |
| GET | `/api/me` | Bearer | Current user |
| POST | `/api/logout` | Bearer | Invalidate token |
| GET | `/api/posts?sort=hot&community=all&q=` | optional | Feed |
| POST | `/api/posts` | Bearer | `{text, community, image?}` |
| POST | `/api/posts/<id>/vote` | Bearer | `{value: 1\|0\|-1}` |
| POST | `/api/posts/<id>/love` | Bearer | Toggle support |
| POST | `/api/posts/<id>/replies` | Bearer | `{text}` |
| POST | `/api/chat` | – | `{message}` → `{reply, crisis}` (offline rules; plug an LLM here later) |

It also serves the site itself: `/` → `index.html`, `/pages/…`, `/assets/…`.

## Setup (macOS, step by step)

```bash
# 1. Go to the backend folder
cd Minco-Web/backend

# 2. Create a virtual environment (one time only)
python3 -m venv .venv

# 3. Activate it (every new terminal)
source .venv/bin/activate

# 4. Install dependencies (one time only)
pip install -r requirements.txt

# 5. (Optional) copy env config
cp .env.example .env

# 6. Run it
python app.py
```

Open **http://127.0.0.1:5000** — the full site runs from the backend,
API included. The database file `minco.db` is created automatically with a
demo user (`demo@minco.app` / `minco123`) and 4 starter posts.

Press `Ctrl+C` to stop. Deactivate the venv with `deactivate`.

## Going online (Render, free)

The repo includes `render.yaml`, so deployment is a Blueprint:

1. Push `Minco-Web/` to GitHub (make sure `minco.db` and `.venv/` stay
   uncommitted — both are git-ignored already).
2. Go to https://dashboard.render.com → **New → Blueprint** → select your repo.
3. Render reads `render.yaml` (install + `gunicorn` start command) — click Apply.
4. Wait ~2–3 min. Open the `https://minco-web-xxxx.onrender.com` URL it gives you.

No frontend config needed: the site talks to the same server that served it.

Two free-tier caveats:
- **Sleep:** the service spins down after ~15 min idle; first visit takes ~50 s.
- **Ephemeral disk:** `minco.db` resets on every deploy/restart — accounts and
  posts are wiped. Fine for a demo; when you outgrow it, the fix is a hosted
  Postgres (ask me and I'll wire it up).

## How the frontend finds it

`assets/js/api.js` points at `http://127.0.0.1:5000` by default and checks
`/api/health` on each page. Backend up → real accounts/posts/chat; backend
down → silent fallback to the offline demo. To point elsewhere:

```js
localStorage.setItem("minco_api_base", "http://192.168.1.10:5000");
```

## Going to real AI later

`/api/chat` currently uses the same offline rules as the widget. To upgrade,
set `AI_PROVIDER` in `.env` and call your provider inside `chat_reply()` in
`app.py` — keep the crisis-keyword check **first**, and never expose the API
key to the frontend.
