---
type: concept
updated: 2026-10-02
sources: assets/js/home.js bell, backend/app.py:472-493 notifications+stats, WORKFLOW.txt:256-307
---

# Notifications Karma

Engagement + reputation. Bell on `home.html` + `home.js`, profile stats on `pages/profile.html`.

## Notifications

Table `notifications(id, user_id=recipient, actor_id, actor_name, type=reply|love, post_id, preview≤80, created_at, read)` — deleted with post — [[database-schema]].

- Only replies and loves on YOUR posts notify (never own actions, never votes/saves)
- `push_notification()` (`app.py:472`) skips self-actions, never breaks main action
- Bell badge only when unread; click opens dropdown: "Jordan replied to your post — 'Holding space…'"
- Click jumps to post (expands replies + highlights). Opening panel marks all read; "Mark all read" same. Polls every 30s + toast on new
- API: `GET /api/notifications?limit=`, `POST /api/notifications/read {ids?}` — [[backend-api]]
- Offline fallback derives reply-only notifications from local posts — [[offline-first]]

## Karma, stats, streaks

- `GET /api/stats/me` (auth): `{posts, lovesReceived, repliesReceived, lovesGiven, saved, rsvps, checkins, streakDays, karma}` where `karma = posts*2 + lovesRx*3 + repliesRx`; streak = consecutive mood days ending today (or yesterday if today missing) — [[mood-calendar]]
- `GET /api/stats/community` (public): `{users, posts, replies, loves, meetingsUpcoming, resources}`
- `GET /api/wellness/daily`: deterministic `{date, affirmation×14, breathing×3, tip×7}` + gratitude — [[habits-gratitude-polls]]
- `GET /api/support`: peer-support note + crisis list (Emergency, US 988, UK Samaritans 116 123, CA 988, AU Lifeline 13 11 14, findahelpline.org) + app links — [[safety-privacy]]
- Profile: avatar, bio, kindness karma, check-in streaks, achievement badges (`PUT /api/me` — [[auth-sessions]])

## Related

[[index]] · [[community-feed]] · [[mood-calendar]] · [[backend-api]] · [[database-schema]] · [[safety-privacy]] · [[habits-gratitude-polls]]
