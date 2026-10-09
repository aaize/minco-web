---
type: entity
updated: 2026-10-09
sources: backend/app.py:44-320+blocks, backend/NOTES.txt:30-61
---

# Database Schema

File: `backend/minco.db` (git-ignored, auto-created + seeded on boot via `init_db()` at `backend/app.py:44`). Delete to reset. Live PA DB and local DB are separate.

## Tables (20)

- `users(id, name, email UNIQUE, password_hash, created_at, bio, avatar)` — bio/avatar via `ALTER TABLE` migration on boot — [[auth-sessions]]
- `sessions(token PK, user_id, created_at)` — Bearer tokens — [[auth-sessions]]
- `posts(id, user_id, name, community, tag, text, image, ups, downs, loves, created_at)` — communities calm/sleep/stress/wins — [[community-feed]]
- `votes(post_id, user_id, value)` PK(post,user) — [[community-feed]]
- `loves(post_id, user_id)` — [[community-feed]], [[notifications-karma]]
- `replies(id, post_id, user_id, name, text, created_at)` — [[community-feed]]
- `saves(post_id, user_id, created_at)` PK — bookmarks, counts via `COUNT(*)` — [[community-feed]]
- `reports(id, post_id, user_id, reason, created_at)` UNIQUE(post,user) — preserved on post delete (reporter audit trail) — [[safety-privacy]]
- `blocks(blocker_id, blocked_id, created_at)` PK pair — mute/soft-block — [[safety-privacy]]
- `polls(id, post_id UNIQUE, options JSON, created_at)` + `poll_votes(poll_id, user_id, option_idx)` — [[habits-gratitude-polls]]
- `habits(id, user_id, title, icon, created_at)` + `habit_logs(habit_id, user_id, date, created_at)` PK — [[habits-gratitude-polls]]
- `journal_entries(id, user_id NOT NULL, title, text, mood, created_at, updated_at)` — private, always filtered by user_id — [[private-journal]]
- `meetings(id, user_id, name, title, description, link, topic, starts_at, duration_min, rsvps, created_at)` + `meeting_rsvps(meeting_id, user_id)` — [[meetings-board]]
- `resources(id, user_id NULL for seeds, name, kind, title, description, url, topic, created_at)` + `resource_saves` + `resource_ratings` — [[resource-library]]
- `moods(id, user_id, date YYYY-MM-DD, mood, score 1-5, note, created_at)` UNIQUE(user,date) — [[mood-calendar]]
- `notifications(id, user_id=recipient, actor_id, actor_name, type=reply|love, post_id, preview<=80, created_at, read)` — deleted with post — [[notifications-karma]]

FKs declared but SQLite FKs off by default → manual cascades in `DELETE /api/posts/<id>` (`backend/app.py:931`; reports deliberately excluded).

## Seeds

- Demo user `demo@minco.app` / `minco123` + 4 starter posts (Ama, Jordan, Rae, Minco Team) + 1 reply (`app.py:215-250`)
- 18 resources insert-if-missing BY URL: 7 articles (NHS, WHO, HelpGuide, Sleep Foundation), 7 videos, 4 podcasts (`app.py:253-320`). Seeds are NULL-owner so owner-DELETE can't remove them.

## Related

[[index]] · [[architecture]] · [[backend-api]] · [[auth-sessions]] · [[community-feed]] · [[mood-calendar]] · [[private-journal]] · [[glossary]]
