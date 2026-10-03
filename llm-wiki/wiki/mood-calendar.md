---
type: concept
updated: 2026-10-02
sources: assets/js/mood.js, assets/css/mood.css, backend/app.py moods routes, WORKFLOW.txt:123-147
---

# Mood Calendar

One-tap daily mood, private per account. Never a diagnosis. Widget: `assets/js/mood.js` + `mood.css` on `home.html`.

Moods: awful=1, low=2, okay=3, good=4, great=5 (+ optional 200-char note).

## Flow

1. Widget injects floating button `#moodFab` (dot while today missing) + modal `#moodOverlay` (mood buttons, note, Save, weekly score, 7-day dots, month calendar, care box)
2. Load: `GET /api/moods?days=90` → map by date + weekly summary; fallback `localStorage "minco_moods_v1"`
3. Auto-opens once/day (~1.2s after login) if today missing (tracked `localStorage "minco_mood_prompt"`). Manual via FAB; close X / outside / Escape
4. Pick past/today date (future disabled), tap mood, Save: `POST /api/moods {date,mood,note}` (upsert per user+date, rejects future) or localStorage upsert offline
5. Success toast "Saved for today", re-render, auto-close ~1.2s
6. Weekly score = avg last 7 days. If avg <2.5 (2+ check-ins) OR today score==1 → professional-help care box (GP/counsellor, US 988 / UK 116 123, links Resources + Meetings) — [[safety-privacy]]

Table `moods(user_id, date UNIQUE per user, mood, score, note)` — [[database-schema]].

Streak math feeds [[notifications-karma]] (`streakDays` = consecutive mood days ending today/yesterday).

## Related

[[index]] · [[wellbeing-checkin]] · [[backend-api]] · [[database-schema]] · [[notifications-karma]] · [[safety-privacy]] · [[offline-first]]
