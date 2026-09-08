# Minco Web — a safe peer-support space

Static frontend (`index.html`, `pages/`, `assets/`) + optional Flask backend (`backend/`).

## Run frontend only (no setup)

Just open `index.html` in a browser. Accounts, posts, and chat work in offline
demo mode (localStorage). Demo login: `demo@minco.app` / `minco123`.

## Run with backend (real accounts + shared feed)

```bash
cd backend
python3 -m venv .venv        # one time only
source .venv/bin/activate    # every new terminal
pip install -r requirements.txt  # one time only
python app.py
```

Then open **http://127.0.0.1:5000**. Full details in [`backend/README.md`](backend/README.md).

The frontend auto-detects the backend: running → real API, stopped → offline demo.
