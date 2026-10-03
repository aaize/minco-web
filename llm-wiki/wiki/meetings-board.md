---
type: concept
updated: 2026-10-02
sources: pages/meetings.html, assets/js/meetings.js, backend/app.py:1117-1192+, WORKFLOW.txt:209-219
---

# Meetings Board

Online awareness meetings board. `pages/meetings.html` + `meetings.js` + `meetings.css`. Tables `meetings` + `meeting_rsvps` — [[database-schema]].

Fields: title 3–80, topic calm|sleep|stress|wins, future `starts_at`, duration 15–240 min, video link http/https ≤500, description ≤500.

## Flow

1. List `GET /api/meetings` (upcoming/past split, live countdowns, re-render every minute)
2. Host form: `POST /api/meetings` (auth + guidelines checkbox) — [[safety-privacy]]
3. Cards with Join (opens link) + "I'm in" RSVP toggle (`POST /api/meetings/<id>/rsvp`, count updates)
4. Organiser-only Remove (`DELETE /api/meetings/<id>`, 403 otherwise)

Serialization `meeting_to_dict()`: rsvped flag, `mine` flag, `past` computed from `starts_at + duration` — [[backend-api]].

Offline: list falls back to cached/local data when backend down — [[offline-first]]. Linked from home app-tabs + all navs.

## Related

[[index]] · [[backend-api]] · [[database-schema]] · [[frontend-shell]] · [[resource-library]] · [[notifications-karma]] · [[safety-privacy]] · [[offline-first]]
