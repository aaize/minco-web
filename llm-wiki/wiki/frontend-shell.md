---
type: entity
updated: 2026-10-09
sources: index.html, pages/, assets/js/, assets/css/, sw.js
---

# Frontend Shell

No framework. Vanilla HTML/CSS/JS. Design tokens in `assets/css/main.css`. Each page has matching JS + CSS triplet — see `WORKFLOW.txt:333-350`.

## Pages

- `index.html` — landing (hero, features, 4 steps, CTA). JS: `assets/js/main.js`, `landing.js`, `sos.js`
- `pages/register.html` + `pages/login.html` — auth, JS `assets/js/auth.js`, CSS `auth.css` — [[auth-sessions]]
- `pages/home.html` — feed, main user page. JS `home.js`, CSS `home.css` — [[community-feed]] (mute/report buttons, report modal, poll composer)
- `pages/checkin.html` — questionnaires + stats dashboard. JS `checkin.js` — [[wellbeing-checkin]]
- `pages/journal.html` — private journal. JS `journal.js` — [[private-journal]]
- `pages/habits.html` — habits. JS `habits.js` — [[habits-gratitude-polls]]
- `pages/meetings.html` — meetings board. JS `meetings.js` — [[meetings-board]]
- `pages/resources.html` — library. JS `resources.js` — [[resource-library]]
- `pages/games.html` — break page (breathing, memory match, tic-tac-toe). JS `games.js`
- `pages/profile.html` — Instagram-style profile. JS `profile.js` — [[notifications-karma]] (Safety tab: muted list + report status — [[safety-privacy]])
- `pages/guidelines.html` — static safe-space rules — [[safety-privacy]]

## Shared JS

- `assets/js/api.js` — backend client, health probe, `window.MincoAPI` helpers — [[offline-first]]
- `assets/js/mood.js` — mood calendar widget (global popup on home) — [[mood-calendar]]
- `assets/js/sos.js` — floating SOS safety button, every page — [[safety-privacy]]
- Quick-post popup lives in `home.js` (bottom-right composer, community select, 280-char, image downscale)

## Shared behavior

- Login gate: each private JS reads `localStorage "minco_session"`; missing → redirect `login.html`
- Home layout: slim sticky header + left nav + center feed + right care aside; search (`/` focuses, `Esc` clears), bell, mood FAB, quick-post FAB
- Offline: every page works on localStorage demo data when backend down — [[offline-first]]

## Related

[[index]] · [[overview]] · [[architecture]] · [[backend-api]] · [[auth-sessions]] · [[community-feed]] · [[offline-first]] · [[safety-privacy]] · [[pwa-deployment]]
