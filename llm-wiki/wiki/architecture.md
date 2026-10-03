---
type: concept
updated: 2026-10-02
sources: README.md:33-52, WORKFLOW.txt:7-36, backend/app.py:18-23, backend/NOTES.txt
---

# Architecture

Three-tier, deliberately small. No ORM, no framework, no build step.

```
Browser (plain HTML/CSS/JS, no framework) — [[frontend-shell]]
  │ backend-first, localStorage fallback — [[offline-first]]
  ▼
Flask (backend/app.py, stdlib sqlite3, no ORM) — [[backend-api]]
  │ Bearer-token sessions, scrypt passwords — [[auth-sessions]]
  ▼
SQLite (backend/minco.db, auto-created + seeded) — [[database-schema]]
```

## Core pattern

Every page uses [[offline-first]]: `assets/js/api.js:38` probes `GET /api/health`. Backend reachable + token present → Flask; otherwise localStorage demo data. App never hard-crashes offline.

Backend also serves the frontend itself: `/` → `index.html`, `/pages/<name>`, `/assets/...` (`backend/app.py` static serving + Flask routes). So site + API share one URL — zero frontend config after deploy ([[pwa-deployment]]).

## Data-flow summary

| Flow | Frontend | API | Tables |
|---|---|---|---|
| Auth | register/login forms | `POST /api/register`, `/api/login` | `users`, `sessions` — [[auth-sessions]] |
| Feed | `home.js` | `GET/POST /api/posts`, vote/love/replies/save/report | `posts`, `votes`, `loves`, `replies`, `saves`, `reports` — [[community-feed]] |
| Mood | `mood.js` popup | `GET/POST /api/moods` | `moods` — [[mood-calendar]] |
| Journal | `journal.js` | `/api/journal` CRUD | `journal_entries` — [[private-journal]] |
| Meetings | `meetings.js` | `/api/meetings` + rsvp | `meetings`, `meeting_rsvps` — [[meetings-board]] |
| Resources | `resources.js` | `/api/resources` | `resources`, `resource_saves`, `resource_ratings` — [[resource-library]] |
| Notify/stats | bell, profile | `/api/notifications`, `/api/stats/*` | `notifications` — [[notifications-karma]] |

Check-in ([[wellbeing-checkin]]) never touches the network by design. Habits/polls/gratitude in [[habits-gratitude-polls]].

## File map

- `index.html` landing, `pages/` 11 pages, `assets/js|css/` per-page, see [[frontend-shell]]
- `backend/app.py` (~1900 lines) all routes + `init_db()` + seed, see [[backend-api]]
- `WORKFLOW.txt:333-350` full workflow→file table, `CONVERSATION.txt` project memory

## Related

[[index]] · [[overview]] · [[frontend-shell]] · [[backend-api]] · [[database-schema]] · [[auth-sessions]] · [[offline-first]] · [[safety-privacy]] · [[pwa-deployment]] · [[glossary]]
