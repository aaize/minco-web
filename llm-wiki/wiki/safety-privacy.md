---
type: concept
updated: 2026-10-09
sources: pages/guidelines.html, pages/home.html report modal, pages/profile.html Safety tab, assets/js/sos.js, assets/js/home.js muteFlow, assets/js/profile.js renderSafety, backend/app.py chat_reply+report+blocks+rate limits, WORKFLOW.txt:309-318+§18
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
- `chat_reply()` (`app.py:509`) crisis keywords first (suicide/self-harm list) → emergency + helplines, never medical advice — [[backend-api]]
- `GET /api/support`: Emergency, US 988, UK 116 123, CA 988, AU Lifeline 13 11 14, findahelpline.org
- Floating SOS button every page (`assets/js/sos.js`): crisis helplines, breathing resets, calm next steps

## Reporting + moderation

- `POST /api/posts/<id>/report {reason: spam|unkind|unsafe|medical|other, detail≤200}`; 409 on repeat; feed 🚩 opens a reason modal (`pages/home.html` report overlay, `home.js` submitReport); offline shows a hint, mute still works — [[community-feed]]
- `GET /api/reports/mine` enriched: preview, reason, community, reportCount, status `received` (<2 reports) / `under review`, `gone` + "(post removed)" after delete — tracked in Profile → Safety tab
- Reports are **preserved** on post delete (unlike votes/loves/replies) as the reporter's audit trail
- Mute (soft block): 🔇 on others' posts → `POST /api/blocks {user_id}` (idempotent 201; 400 self, 404 unknown); hides their posts in feed/saves and strips their replies server- + client-side; reversible via `DELETE /api/blocks/<id>` in Profile → Safety; offline fallback `minco_muted_v1 {ids, names}` — [[community-feed]]
- Rate limits: in-memory sliding window (120 hits / 300s per IP) on register/login/chat → 429 + `Retry-After` (`RATE_LIMIT_MAX/WINDOW`, `check_rate_limit()`)
- Security headers + strict same-origin framing (backend serves frontend)

## Privacy

- Check-in answers never sent/stored; only optional local score history — [[wellbeing-checkin]]
- Journal + moods strictly per-account; cross-user journal ids → 404 — [[private-journal]], [[mood-calendar]]
- Passwords scrypt-hashed; Bearer sessions — [[auth-sessions]]
- Display names may be anonymous

## Related

[[index]] · [[overview]] · [[architecture]] · [[community-feed]] · [[mood-calendar]] · [[wellbeing-checkin]] · [[private-journal]] · [[meetings-board]] · [[resource-library]] · [[auth-sessions]] · [[backend-api]] · [[offline-first]]
