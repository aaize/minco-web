---
type: entity
updated: 2026-10-02
sources: backend/app.py, backend/NOTES.txt, backend/README.md
---

# Backend API

Single file: `backend/app.py` (~1900 lines). Flask + stdlib `sqlite3`, no ORM. `Flask-Cors`, `gunicorn` prod. Serves API + frontend.

Key symbols: `get_db()`, `init_db()`, `auth_user()`, `require_auth`, `post_to_dict()`, `chat_reply()`, `push_notification()`.

## Routes by area

- Meta: `GET /api/health` (`app.py:565`), `GET /api/wellness/daily`, `GET /api/support`, `GET /api/stats/community`, `GET /api/stats/me` — [[notifications-karma]], [[habits-gratitude-polls]]
- Auth: `POST /api/register`, `POST /api/login`, `GET/PUT /api/me`, `POST /api/logout` — [[auth-sessions]]
- Posts: `GET/POST /api/posts`, `PUT/DELETE /api/posts/<id>`, `.../vote`, `.../love`, `.../replies`, `.../save`, `.../report`, `.../poll/vote` — [[community-feed]], [[habits-gratitude-polls]]
- Saves/reports: `GET /api/saves`, `GET /api/reports/mine` — [[community-feed]]
- Moods: `GET/POST /api/moods` (upsert per user+date, rejects future) — [[mood-calendar]]
- Journal: `GET/POST /api/journal`, `GET/PUT/DELETE /api/journal/<id>` (user-scoped, others 404) — [[private-journal]]
- Meetings: `GET/POST /api/meetings`, `.../rsvp`, `DELETE` owner-only — [[meetings-board]]
- Resources: `GET/POST /api/resources`, `.../save`, `.../rate`, `DELETE` owner-only — [[resource-library]]
- Notifications: `GET /api/notifications`, `POST /api/notifications/read` — [[notifications-karma]]
- Chat: `POST /api/chat` offline rules engine `chat_reply()` (`app.py:497`) — crisis-first, swap for LLM later

## Helpers

- `init_db()` (`app.py:44`) — creates 19 tables, migrates `bio`/`avatar`, seeds demo user + 4 posts + 18 resources
- `post_to_dict()` (`app.py:420`) — serializes post + replies + votes/loved/saved + poll + `mine` flag
- `push_notification()` (`app.py:472`) — reply/love notify, never breaks main action
- `time_ago()` (`app.py:460`) — Just now / Xm / Xh / Xd
- `validate_poll_options()` (`app.py:407`) — 2–4 unique options, 60 chars
- `validate_journal()` (`app.py:1025`) — text 1–2000, mood enum

Frontend connects via `assets/js/api.js` `window.MincoAPI` — [[offline-first]]. Serves site at `/`, `/index.html`, `/pages/`, `/assets/`.

## Related

[[index]] · [[architecture]] · [[database-schema]] · [[auth-sessions]] · [[community-feed]] · [[offline-first]] · [[safety-privacy]] · [[pwa-deployment]]
