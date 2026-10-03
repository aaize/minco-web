---
type: concept
updated: 2026-10-02
sources: pages/guidelines.html, assets/js/sos.js, backend/app.py chat_reply+report, WORKFLOW.txt:309-318
---

# Safety Privacy

Safety by design, privacy by design. Applies everywhere. Hub node — link generously.

## Guidelines gates

- `pages/guidelines.html` + checkbox gates (register, meetings, resources)
- No medical advice/diagnosis language; "peer support, not professional care" disclaimers on check-in, mood popup, support API
- Anonymous display names allowed; owner-only deletes; one report per user/post

## Crisis triggers → helplines

- Check-in Q9 (self-harm) >0 → crisis box (emergency + US 988 + UK Samaritans 116 123) — [[wellbeing-checkin]]
- Mood score 1 / low week (avg <2.5, 2+ check-ins) → care box + Resources/Meetings links — [[mood-calendar]]
- `chat_reply()` (`app.py:497`) crisis keywords first (suicide/self-harm list) → emergency + helplines, never medical advice — [[backend-api]]
- `GET /api/support`: Emergency, US 988, UK 116 123, CA 988, AU Lifeline 13 11 14, findahelpline.org
- Floating SOS button every page (`assets/js/sos.js`): crisis helplines, breathing resets, calm next steps

## Reporting + moderation

- `POST /api/posts/<id>/report {reason: spam|unkind|unsafe|medical|other, detail≤200}`; 409 on repeat; `GET /api/reports/mine` — [[community-feed]]
- Security headers + strict same-origin framing (backend serves frontend)

## Privacy

- Check-in answers never sent/stored; only optional local score history — [[wellbeing-checkin]]
- Journal + moods strictly per-account; cross-user journal ids → 404 — [[private-journal]], [[mood-calendar]]
- Passwords scrypt-hashed; Bearer sessions — [[auth-sessions]]
- Display names may be anonymous

## Related

[[index]] · [[overview]] · [[architecture]] · [[community-feed]] · [[mood-calendar]] · [[wellbeing-checkin]] · [[private-journal]] · [[meetings-board]] · [[resource-library]] · [[auth-sessions]] · [[backend-api]] · [[offline-first]]
