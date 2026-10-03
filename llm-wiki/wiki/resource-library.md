---
type: concept
updated: 2026-10-02
sources: pages/resources.html, assets/js/resources.js, backend/app.py resources routes, WORKFLOW.txt:221-234
---

# Resource Library

Support library. `pages/resources.html` + `resources.js` + `resources.css`. Tables `resources` + `resource_saves` + `resource_ratings` — [[database-schema]].

Kinds: article|video|podcast. Topics: calm|sleep|stress|wins.

## Seeds (18, link-verified)

7 articles (NHS ×2, WHO ×3, HelpGuide, Sleep Foundation), 7 videos (incl. Indiana Univ., Epworth, AskDoctorJo), 4 podcasts (incl. Happiness Lab). Seeds are NULL-owner so nobody can delete them; insert-if-missing BY URL so old DBs gain new seeds on boot (`app.py:253-320`) — [[database-schema]].

## Flow

1. List `GET /api/resources` (filter kind tabs + topic + search title+description)
2. Articles open externally; YouTube/Spotify play INLINE, else external button
3. Share form (kind/topic/title 3–100/link/description≤500 + safety checkbox, `POST /api/resources`, auth) — [[safety-privacy]]
4. Remove own shares only (`DELETE /api/resources/<id>`, 403 otherwise)
5. Save toggle (`POST /api/resources/<id>/save`), rate 5-star (`POST .../rate`) — helpers `MincoAPI.toggleResourceSave/rateResource` (`assets/js/api.js:88-90`)

Top-rated sorting, saves per user. Mood care-box and check-in results link here — [[mood-calendar]], [[wellbeing-checkin]].

## Related

[[index]] · [[meetings-board]] · [[backend-api]] · [[database-schema]] · [[safety-privacy]] · [[offline-first]] · [[notifications-karma]]
