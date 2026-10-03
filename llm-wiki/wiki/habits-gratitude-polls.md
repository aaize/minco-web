---
type: concept
updated: 2026-10-02
sources: pages/habits.html, assets/js/habits.js, assets/js/home.js, backend/app.py polls+habits routes, WORKFLOW.txt:352-376
---

# Habits Gratitude Polls

Small positive loops: private habits, daily gratitude, feed polls.

## Habits (private, streaks celebrate never punish)

Page `pages/habits.html`, linked from home side-nav. Tables `habits` + `habit_logs` — [[database-schema]].

- Fields: title 2–40, icon optional from fixed emoji set, max 12/user
- Flow: `GET /api/habits` → cards with today tick, streak pill (2+ days), 7-day dots, totals → `POST /api/habits/<id>/check` toggles today → `DELETE` removes habit + logs
- Offline: `minco_habits_v1 [{id,title,icon,logs[dates]}]` with mirrored streak math — [[offline-first]]
- Helpers: `MincoAPI.listHabits/createHabit/toggleHabit/deleteHabit` (`assets/js/api.js:91-94`)

## Gratitude (daily prompt → c/wins)

- `GET /api/wellness/daily` gains deterministic `gratitude` string (by date ordinal)
- `home.html` aside card shows it; "Share in c/wins" opens composer with `community=wins` + prefilled "Today I'm grateful for… (prompt)"
- Offline: same 7 prompts hardcoded in `home.js`, picked by day number
- Feeds [[community-feed]] wins community

## Polls (feed attachment, one vote each, change allowed)

- Composer: quick-post popup "Poll" toggle → 2 required inputs, "+ option" reveals 3rd/4th (60 chars each, must differ). Empty = plain post
- Backend: `POST /api/posts` accepts optional `poll[2-4]` → `polls(post_id UNIQUE, options JSON)`; `POST /api/posts/<id>/poll/vote {option}` upserts `poll_votes`; `post_to_dict` embeds `poll{options,votes[],total,myVote}`; deleted with post — [[backend-api]]
- Feed: percentage bars, my vote marked, tap to vote/change; search covers option text. Offline: local poll object, one local vote
- Validation `validate_poll_options()` (`app.py:407`)

## Related

[[index]] · [[community-feed]] · [[mood-calendar]] · [[backend-api]] · [[database-schema]] · [[notifications-karma]] · [[offline-first]]
