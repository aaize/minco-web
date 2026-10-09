---
type: ops
updated: 2026-10-09
---

# Glossary

Terms, tables, keys. See [[database-schema]] for columns, [[backend-api]] for routes.

## Domain

- Community (calm|sleep|stress|wins) — feed + meetings + resources topic — [[community-feed]]
- Karma = `posts*2 + lovesReceived*3 + repliesReceived` — [[notifications-karma]]
- Streak = consecutive mood days ending today (or yesterday if missing) — [[mood-calendar]]
- Band — check-in severity reflection, NOT diagnosis — [[wellbeing-checkin]], [[safety-privacy]]
- SOS — floating safety button, every page — [[safety-privacy]]
- Mute — soft block hiding someone's posts + replies, reversible in Profile → Safety — [[safety-privacy]]
- Report status — received (<2 reports) / under review / gone (post removed) — [[safety-privacy]]

## Tables

`users`, `sessions`, `posts`, `votes`, `loves`, `replies`, `saves`, `reports`, `blocks`, `polls`, `poll_votes`, `habits`, `habit_logs`, `journal_entries`, `meetings`, `meeting_rsvps`, `resources`, `resource_saves`, `resource_ratings`, `moods`, `notifications` — [[database-schema]].

## localStorage keys

`minco_token`, `minco_session`, `minco_users`, `minco_posts_v2`, `minco_muted_v1`, `minco_moods_v1`, `minco_mood_prompt`, `minco_journal_v1`, `minco_habits_v1`, `minco_checkin_history`, `minco_api_base` — [[offline-first]].

## APIs

`POST /api/register`, `/api/login`, `GET/PUT /api/me`, `/api/logout`, `/api/posts…`, `/api/blocks`, `/api/reports/mine`, `/api/moods`, `/api/journal…`, `/api/meetings…`, `/api/resources…`, `/api/notifications…`, `/api/wellness/daily`, `/api/support`, `/api/stats/me`, `/api/stats/community`, `/api/health`, `/api/chat` — [[backend-api]].

## Files

`index.html`, `pages/*.html`, `assets/js/api.js|auth.js|home.js|mood.js|checkin.js|journal.js|habits.js|meetings.js|resources.js|games.js|profile.js|sos.js`, `backend/app.py`, `backend/minco.db`, `sw.js`, `manifest.webmanifest` — [[frontend-shell]].

## Related

[[index]] · [[overview]] · [[architecture]] · [[database-schema]] · [[backend-api]] · [[offline-first]] · [[safety-privacy]]
