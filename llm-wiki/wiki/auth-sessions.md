---
type: concept
updated: 2026-10-02
sources: backend/app.py:570-660, assets/js/auth.js, WORKFLOW.txt:53-86
---

# Auth Sessions

Token sessions. Passwords scrypt-hashed, never plaintext. Tables `users` + `sessions` — [[database-schema]].

## Register (`pages/register.html` + `assets/js/auth.js`)

1. Name 2–30 chars, email regex, password 6+ with strength meter, confirm match, guidelines checkbox
2. `POST /api/register {name,email,password}` → 201 `{user, token}`: store `localStorage "minco_token"` + `"minco_session" {name,email,at}`, redirect `home.html`
3. 400/409 → form error; network fail → offline fallback in `localStorage "minco_users"`
4. Existing valid session auto-skips to home

## Login (`pages/login.html`)

1. Email + password + "Fill demo" shortcut
2. `POST /api/login` → 200 `{user,token}`; 401 wrong credentials (no silent fallback); network fail → localStorage match
3. Later calls send `Authorization: Bearer <token>` via `assets/js/api.js:53-64`

## Session helpers (`backend/app.py:335-366`)

- `auth_user(optional=False)` — token → user row, else 401; `optional=True` for public-with-personalization (feed, meetings)
- `require_auth` decorator — 401 unless valid token
- `public_user()` — id, name, email, bio, avatar, joined

## Profile edit + logout

- `PUT /api/me` — name (2–30), bio ≤150, avatar `data:image/...` ≤700KB; rename propagates to past posts/replies server-side (`app.py:645`)
- `POST /api/logout` — invalidate token; client clears token + session → `login.html`
- Private pages gate on `localStorage "minco_session"` — [[frontend-shell]]

## Related

[[index]] · [[backend-api]] · [[database-schema]] · [[frontend-shell]] · [[offline-first]] · [[safety-privacy]] · [[notifications-karma]]
