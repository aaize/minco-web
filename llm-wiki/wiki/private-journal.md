---
type: concept
updated: 2026-10-02
sources: pages/journal.html, assets/js/journal.js, backend/app.py:1018-1115
---

# Private Journal

`pages/journal.html` + `assets/js/journal.js` + `journal.css`. Per-account only, never shared. Backend table `journal_entries` — [[database-schema]].

Fields: title ≤80, text required ≤2000, mood tag optional (awful|low|okay|good|great).

## Flow

1. Login gate → `initBackend`: `GET /api/journal` else `localStorage "minco_journal_v1"`
2. Composer: New entry / Edit mode → Save via `POST /api/journal` or `PUT /api/journal/<id>`
3. List newest-first, search `?q` filters title+text client-side, limit ≤100
4. Per-entry Edit (loads into composer) / Delete (confirm)
5. Cross-user ids return 404 — all queries filter by `user_id` — [[safety-privacy]]

## API

- `GET /api/journal?q=&limit=` (auth, limit 50 default / 100 max)
- `POST /api/journal {title?, text 1-2000, mood?}` → 201
- `GET/PUT/DELETE /api/journal/<id>` owner-only, others 404
- Validation in `validate_journal()` (`app.py:1025`) — [[backend-api]]

Frontend helpers: `MincoAPI.listJournal/createJournal/getJournal/updateJournal/deleteJournal` (`assets/js/api.js:83-87`) — [[offline-first]].

## Related

[[index]] · [[mood-calendar]] · [[wellbeing-checkin]] · [[backend-api]] · [[database-schema]] · [[safety-privacy]] · [[offline-first]]
