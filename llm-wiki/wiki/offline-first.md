---
type: concept
updated: 2026-10-02
sources: assets/js/api.js, WORKFLOW.txt:31-36 home.js/checkin.js/mood.js/journal.js
---

# Offline First

Core pattern on EVERY page: backend-first with silent localStorage fallback. App never hard-crashes offline — [[architecture]].

## Client (`assets/js/api.js`)

- `getBase()`: explicit `localStorage "minco_api_base"` override wins → else `window.location.origin` when served over http(s) → else `DEFAULT_BASE http://127.0.0.1:5000` for `file://` preview
- `available(timeoutMs=1500)`: cached `GET /api/health` probe; `resetCache()` on auth change
- `req(path, {method, body, auth})`: injects `Authorization: Bearer <token>`, throws `Error(data.error)` on non-OK
- `window.MincoAPI` helpers: posts save/report, notifications, wellness/support/stats, journal, resources, habits, polls — [[backend-api]]

Override: `localStorage.setItem("minco_api_base", "http://192.168.1.10:5000")`.

## Per-feature fallback keys

| Feature | Backend | Offline key |
|---|---|---|
| Feed | `GET/POST /api/posts` | `minco_posts_v2` — [[community-feed]] |
| Users | `/api/register`, `/api/login` | `minco_users`, `minco_session` — [[auth-sessions]] |
| Moods | `GET/POST /api/moods` | `minco_moods_v1`, `minco_mood_prompt` — [[mood-calendar]] |
| Journal | `/api/journal` CRUD | `minco_journal_v1` — [[private-journal]] |
| Habits | `/api/habits` | `minco_habits_v1` — [[habits-gratitude-polls]] |
| Check-in | none (by design) | `minco_checkin_history` (scores only) — [[wellbeing-checkin]] |

`GET /api/health` (`app.py:565` returns `{ok:true, ai:"offline-rules"}`) is the mode switch. Frontend-only `file://` preview works fully offline.

## Related

[[index]] · [[architecture]] · [[frontend-shell]] · [[backend-api]] · [[auth-sessions]] · [[community-feed]] · [[mood-calendar]] · [[private-journal]] · [[safety-privacy]] · [[pwa-deployment]]
