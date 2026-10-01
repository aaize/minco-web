# Minco Web — a safe peer-support space

> You're not alone. Minco is a calm place to connect with others, share what you're
> going through, and give and receive support — one conversation at a time.

<img width="1256" height="729" alt="Minco landing page" src="https://github.com/user-attachments/assets/78e9717d-2631-49a8-ac43-983192dbcd87" />
<img width="1256" height="729" alt="Minco community feed" src="https://github.com/user-attachments/assets/a7277bb0-a23e-44d5-be47-76459dea78ab" />

**Live:** https://aaize09.pythonanywhere.com · **Demo login:** `demo@minco.app` / `minco123`

## Features

- **Community feed** — topic spaces (calm, sleep, stress, wins), up/down votes, loves,
  replies, saves, reports, polls with one-tap voting, search, sort (hot/new/top),
  image posts, edit + delete your own posts
- **Daily gratitude** — rotating gratitude prompt in the feed aside, shareable to c/wins
- **Gentle habits** — tiny private habits with today ticks, streaks, 7-day dots and totals
- **Mood calendar** — one-tap daily check-in, weekly average, streaks, gentle care nudges
- **Wellbeing check-in** — private low-mood / worry questionnaires with bands, trends,
  per-question breakdown and auto-written insights (100% on-device, never sent anywhere)
- **Private journal** — per-account entries with mood tags, writing prompts, one-tap mood
  logging, `.txt` / `.json` export and print
- **Meetings board** — host video meetups with topics, RSVPs, countdowns, calendar-friendly times
- **Resource library** — community-shared articles, videos (inline YouTube) and podcasts
  (inline Spotify) with saves, 5-star ratings and top-rated sorting
- **Break page** — guided breathing presets, memory match, tic-tac-toe
- **Profile + karma** — avatar, bio, kindness karma, check-in streaks, achievement badges
- **Notifications** — replies + loves on your posts, unread badge, 30s polling
- **SOS safety net** — one-tap floating button on every page with crisis helplines,
  breathing resets and calm next steps
- **PWA** — installable, offline-first static shell via service worker

## Architecture

```
Browser (plain HTML/CSS/JS, no framework)
  │  backend-first, localStorage fallback — the app never hard-crashes offline
  ▼
Flask (backend/app.py, stdlib sqlite3, no ORM)
  │  Bearer-token sessions, scrypt-hashed passwords, serves API + frontend
  ▼
SQLite (backend/minco.db, auto-created + seeded on boot)
```

- **Offline-first:** `assets/js/api.js` probes `GET /api/health`. Backend reachable + token
  present → Flask; otherwise every page works on localStorage demo data and syncs later.
- **Privacy by design:** check-in answers are never sent to any server; journal and moods
  are strictly per-account; display names may be anonymous.
- **Safety by design:** guidelines gates, no medical-advice/diagnosis language, crisis
  triggers (self-harm answer, mood score 1, low week) surface helplines (US 988,
  UK Samaritans 116 123), one-report-per-user, owner-only deletes, security headers
  + strict same-origin framing.

## Run locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python app.py   # → http://127.0.0.1:5000 (API at /api/…)
```

Frontend-only preview also works via `file://` (offline demo mode).
`GET /api/health` tells you which mode you're in.

Production: push → pull on PythonAnywhere → Reload (WSGI points at `backend/app.py`;
`init_db()` runs at import so gunicorn gets a seeded DB too). `render.yaml` included
as an alternative host.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/register`, `POST /api/login`, `GET/PUT /api/me`, `POST /api/logout` |
| Posts | `GET/POST /api/posts`, `PUT/DELETE /api/posts/<id>`, `…/vote`, `…/love`, `…/replies`, `…/save`, `…/report`, `…/poll/vote` |
| Moods | `GET/POST /api/moods` |
| Habits | `GET/POST /api/habits`, `…/<id>/check`, `DELETE …` |
| Journal | `GET/POST /api/journal`, `GET/PUT/DELETE /api/journal/<id>` |
| Meetings | `GET/POST /api/meetings`, `…/rsvp`, `DELETE …` |
| Resources | `GET/POST /api/resources`, `…/save`, `…/rate`, `DELETE …` |
| Meta | `GET /api/wellness/daily`, `/api/support`, `/api/stats/community`, `/api/stats/me`, `/api/notifications…` |

See `WORKFLOW.txt` for the full per-page data-flow reference.

## Project structure

```
index.html                  landing (hero, features, steps, CTA)
pages/                      login, register, home (feed), checkin, journal, habits,
                            meetings, resources, games (break), profile, guidelines
assets/js|css|img/          vanilla JS + CSS per page, shared api.js/sos.js/mood.js
sw.js + manifest.webmanifest PWA shell
backend/app.py              Flask API + frontend serving + security headers
backend/minco.db            local SQLite (git-ignored, auto-seeded)
WORKFLOW.txt                detailed workflow / data-flow reference
```
