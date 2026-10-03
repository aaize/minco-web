---
type: concept
updated: 2026-10-02
sources: sw.js, manifest.webmanifest, render.yaml, backend/pythonanywhere_wsgi_example.py, backend/README.md, WORKFLOW.txt:319-331
---

# Pwa Deployment

## PWA shell

- `sw.js` + `manifest.webmanifest` — installable, offline-first static shell
- Icons `assets/img/icon-*.png`, `mincologo.png`
- Frontend-only preview works via `file://` (offline demo mode) — [[offline-first]]

## Env

`HOST`, `PORT`, `DATABASE`, `FLASK_DEBUG` / `RENDER`, `AI_PROVIDER` (future — plug real provider inside `chat_reply()`, crisis check stays first, key server-side).

## Local dev

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py  # → http://127.0.0.1:5000 (API at /api/…)
```

macOS AirPlay may occupy :5000 → use :5100. Test: `node --check assets/js/<file>.js`; `curl /api/health`. System python has no flask — use `backend/.venv/bin/python`.

## Production — PythonAnywhere (live, no card)

- Site `https://aaize09.pythonanywhere.com`, Manual config, Python 3.10, venv `/home/aaize09/.virtualenvs/minco`
- WSGI imports app from `backend/`; `init_db()` runs at import so gunicorn gets seeded DB too
- Update: git push (Mac) → `cd ~/minco-web && git pull` (PA) → Reload. Live DB and local DB are SEPARATE
- Limits: 1 app, 512 MB, ~100 CPU-sec/day

## Production alt — Render (card required)

`render.yaml` Blueprint: install + `gunicorn` start. Caveats: sleeps ~15 min idle (first visit ~50s); ephemeral disk wipes `minco.db` on deploy → hosted Postgres when outgrown.

Deploy lessons in `backend/NOTES.txt:134-146`: venv path must be venv not repo; check Error log; `pip install -r requirements.txt` in venv; Linux case-sensitive (`minco-web` ≠ `Minco-Web`); never `python app.py` on PA.

## Related

[[index]] · [[architecture]] · [[frontend-shell]] · [[backend-api]] · [[offline-first]] · [[safety-privacy]] · [[glossary]]
