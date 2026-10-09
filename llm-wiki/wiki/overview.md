---
type: synthesis
updated: 2026-10-09
sources: README.md, WORKFLOW.txt, CONVERSATION.txt, index.html
---

# Overview

Minco-Web is a safe peer-support community: plain HTML/CSS/JS frontend (no framework) + Flask + SQLite backend. Live at `https://aaize09.pythonanywhere.com`, demo login `demo@minco.app` / `minco123`.

Tagline from `README.md:3`: "You're not alone."

## What it does

- [[community-feed]] — topic spaces (calm, sleep, stress, wins), votes, loves, replies, saves, reports, polls, mute, search, sort hot/new/top
- [[mood-calendar]] — one-tap daily check-in, weekly average, streaks, care nudges
- [[wellbeing-checkin]] — private low-mood (9Q) / worry (7Q) screeners, 100% on-device, trends + insights
- [[private-journal]] — per-account entries, mood tags, export
- [[habits-gratitude-polls]] — tiny private habits with streaks, daily gratitude → c/wins, feed polls
- [[meetings-board]] — host video meetups, RSVPs, countdowns
- [[resource-library]] — 18 seeded articles/videos/podcasts, inline YouTube/Spotify, ratings
- [[notifications-karma]] — reply/love notifications, kindness karma, badges, streaks
- Break page — breathing presets, memory match, tic-tac-toe (`pages/games.html`)
- SOS button — floating on every page (`assets/js/sos.js`)

## Stack

Browser ([[frontend-shell]]) → Flask `backend/app.py` ([[backend-api]]) → SQLite `backend/minco.db` ([[database-schema]]). See [[architecture]].

- Auth: Bearer-token [[auth-sessions]], scrypt passwords
- Pattern: [[offline-first]] — backend-first, silent localStorage fallback, never hard-crashes
- PWA: installable offline shell, see [[pwa-deployment]]
- Safety: [[safety-privacy]] by design — guidelines gates, no medical-advice language, crisis helplines, mute + report status, auth/chat rate limits

## Entry points

- Landing: `index.html` → register → `pages/home.html` (feed)
- Feed tabs: Feed | Safe space | Break | Meetings | Resources | Check-in | Journal | Profile
- Health probe: `GET /api/health` decides backend vs offline mode

## Related

[[index]] · [[architecture]] · [[frontend-shell]] · [[backend-api]] · [[database-schema]] · [[community-feed]] · [[safety-privacy]] · [[offline-first]] · [[pwa-deployment]] · [[glossary]]
