---
type: entity
updated: 2026-10-09
sources: backend/app.py, backend/NOTES.txt, backend/README.md
---

# Backend API

Single file: `backend/app.py` (~1900 lines). Flask + stdlib `sqlite3`, no ORM. `Flask-Cors`, `gunicorn` prod. Serves API + frontend.

Key symbols: `get_db()`, `init_db()`, `auth_user()`, `require_auth`, `post_to_dict()`, `chat_reply()`, `push_notification()`.

## Routes by area

- Meta: `GET /api/health` (`app.py:565`), `GET /api/wellness/daily`, `GET /api/support`, `GET /api/stats/community`, `GET /api/stats/me` — [[notifications-karma]], [[habits-gratitude-polls]]
- Auth: `POST /api/register`, `POST /api/login`, `GET/PUT /api/me`, `POST /api/logout` — [[auth-sessions]]
- Posts: `GET/POST /api/posts`, `PUT/DELETE /api/posts/<id>`, `.../vote`, `.../love`, `.../replies`, `.../save`, `.../report`, `.../poll/vote` — [[community-feed]], [[habits-gratitude-polls]]
- Saves/reports: `GET /api/saves` (muted authors filtered), enriched `GET /api/reports/mine` (preview, reportCount, received/under-review/gone) — [[community-feed]], [[safety-privacy]]
- Safety: `GET/POST /api/blocks`, `DELETE /api/blocks/<id>` (idempotent mute, 400 self, 404 unknown); rate limits on register/login/chat (120/300s per IP → 429 + `Retry-After`) — [[safety-privacy]]
- Moods: `GET/POST /api/moods` (upsert per user+date, rejects future) — [[mood-calendar]]
- Journal: `GET/POST /api/journal`, `GET/PUT/DELETE /api/journal/<id>` (user-scoped, others 404) — [[private-journal]]
- Meetings: `GET/POST /api/meetings`, `.../rsvp`, `DELETE` owner-only — [[meetings-board]]
- Resources: `GET/POST /api/resources`, `.../save`, `.../rate`, `DELETE` owner-only — [[resource-library]]
- Notifications: `GET /api/notifications`, `POST /api/notifications/read` — [[notifications-karma]]
- Chat: `POST /api/chat` offline rules engine `chat_reply()` (`app.py:497`) — crisis-first, swap for LLM later

## Helpers

- `init_db()` (`app.py:44`) — creates 20 tables, migrates `bio`/`avatar`, seeds demo user + 4 posts + 18 resources
- `post_to_dict()` (`app.py:425`) — serializes post + replies (muted authors' replies stripped) + votes/loved/saved + poll + `authorId` + `mine` flag
- `rate_limited()` (`app.py:584`) / `check_rate_limit()` (`app.py:597`) — in-memory sliding window per IP+endpoint
- `push_notification()` (`app.py:484`) — reply/love notify, never breaks main action
- `validate_poll_options()` (`app.py:412`) — 2–4 unique options, 60 chars
- `time_ago()` (`app.py:472`) — Just now / Xm / Xh / Xd
- `validate_journal()` (`app.py:1151`) — text 1–2000, mood enum

Frontend connects via `assets/js/api.js` `window.MincoAPI` — [[offline-first]]. Serves site at `/`, `/index.html`, `/pages/`, `/assets/`.

## Related

[[index]] · [[architecture]] · [[database-schema]] · [[auth-sessions]] · [[community-feed]] · [[offline-first]] · [[safety-privacy]] · [[pwa-deployment]]
