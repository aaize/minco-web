---
type: index
updated: 2026-10-02
---

# Minco-Web Wiki — Index

> You're not alone. Minco is a calm peer-support space — one conversation at a time.

Master catalog for the Minco-Web codebase. Start here, then follow wikilinks. Open this folder in Obsidian for Graph View.

## Big picture

- [[overview]] — what Minco is, features, live demo
- [[architecture]] — Browser → Flask → SQLite, data-flow map
- [[glossary]] — terms, tables, localStorage keys

## System

- [[frontend-shell]] — `index.html`, `pages/*.html`, per-page JS/CSS
- [[backend-api]] — `backend/app.py` Flask routes, helpers
- [[database-schema]] — SQLite tables in `backend/minco.db`
- [[auth-sessions]] — register/login, Bearer tokens, profile edit
- [[offline-first]] — `assets/js/api.js`, backend-first + localStorage fallback
- [[pwa-deployment]] — `sw.js`, `manifest.webmanifest`, PythonAnywhere + Render

## Features

- [[community-feed]] — posts, votes, loves, replies, saves, reports, polls
- [[mood-calendar]] — daily one-tap mood, weekly avg, care nudges
- [[wellbeing-checkin]] — on-device PHQ-9/GAD-7 style screeners + stats dashboard
- [[private-journal]] — per-account journal CRUD
- [[habits-gratitude-polls]] — habits streaks, daily gratitude, feed polls
- [[meetings-board]] — video meetups, RSVPs, countdowns
- [[resource-library]] — articles/videos/podcasts, inline players, ratings
- [[notifications-karma]] — reply/love notifications, karma, streaks, stats APIs

## Cross-cutting

- [[safety-privacy]] — guidelines gates, crisis triggers, no-diagnosis rule
- [[log]] — ingest history for this wiki

## Source map (raw, immutable)

- Frontend: `index.html`, `pages/`, `assets/js|css|img/`, `sw.js`, `manifest.webmanifest`
- Backend: `backend/app.py`, `backend/requirements.txt`, `backend/minco.db`
- Docs: `README.md`, `WORKFLOW.txt`, `CONVERSATION.txt`, `backend/NOTES.txt`, `backend/README.md`

## Related

[[overview]] · [[architecture]] · [[frontend-shell]] · [[backend-api]] · [[database-schema]] · [[auth-sessions]] · [[community-feed]] · [[mood-calendar]] · [[wellbeing-checkin]] · [[private-journal]] · [[habits-gratitude-polls]] · [[meetings-board]] · [[resource-library]] · [[notifications-karma]] · [[safety-privacy]] · [[offline-first]] · [[pwa-deployment]] · [[glossary]] · [[log]]
