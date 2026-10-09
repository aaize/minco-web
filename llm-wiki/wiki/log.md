---
type: log
updated: 2026-10-09
---

# Log

Chronological wiki activity. Append-only, newest last.

- 2026-10-02 — Initial compile from `README.md`, `WORKFLOW.txt`, `CONVERSATION.txt`, `backend/app.py` (lines 1–1192 read), `backend/NOTES.txt`, `backend/README.md`, `assets/js/api.js`, `index.html`. Created 19 pages: [[index]], [[overview]], [[architecture]], [[frontend-shell]], [[backend-api]], [[database-schema]], [[auth-sessions]], [[community-feed]], [[mood-calendar]], [[wellbeing-checkin]], [[private-journal]], [[habits-gratitude-polls]], [[meetings-board]], [[resource-library]], [[notifications-karma]], [[safety-privacy]], [[offline-first]], [[pwa-deployment]], [[glossary]]. Hub nodes: [[index]], [[overview]], [[architecture]], [[backend-api]], [[safety-privacy]]. No orphans — every page links back to [[index]].
- Next: ingest remaining `backend/app.py` lines 1193+ (meetings RSVP tail, resources, moods, stats, chat, serving), per-page JS (`home.js`, `mood.js`, `checkin.js`), then lint for stale claims.
- 2026-10-09 — Safety-controls ingest: `blocks` table + `GET/POST /api/blocks`, `DELETE /api/blocks/<id>`; `authorId` in `post_to_dict()` with muted-author post/reply filtering in feed + saves; enriched `GET /api/reports/mine` (preview, reportCount, received/under-review/gone, reports preserved on delete); rate limits (120/300s per IP) on register/login/chat → 429; feed 🔇/🚩 buttons + report modal (`home.js`, `pages/home.html`); Profile Safety tab (`profile.js`, `pages/profile.html`); `minco_muted_v1` offline fallback; 5 new tests in `backend/tests/test_safety.py` (36 green). Updated [[safety-privacy]], [[community-feed]], [[database-schema]] (20 tables), [[backend-api]], [[glossary]] (Mute, `blocks`, `minco_muted_v1`), [[overview]], [[index]], [[frontend-shell]]. Refreshed drifted `app.py` line numbers (post_to_dict 425, push_notification 484, chat_reply 509).

## Related

[[index]] · [[overview]] · [[glossary]]
