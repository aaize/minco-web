---
type: concept
updated: 2026-10-09
sources: pages/home.html, assets/js/home.js, backend/app.py:662-967+blocks+reports
---

# Community Feed

Main page: `pages/home.html` + `assets/js/home.js` + `home.css`. Layout: sticky header (logo, search, bell, profile, logout) + left nav + center feed + right care aside.

Seeds: 4 starter posts if empty. Communities: calm, sleep, stress, wins. Sort: hot | new | top. Search across text + author + community + tag + replies (all words must match, `<mark>` highlight, 150ms debounce).

## View

`GET /api/posts?sort=&community=&q=&mine=` (auth optional). Server returns ≤200 posts with replies, `userVote/loved/saved/mine`, `authorId`, time-ago. Muted authors' posts excluded server-side (`blocks`); client re-filters via `minco_muted_v1` + re-sorts locally. Hot score = `ups - downs + loves*0.5`.

## Post

Floating quick-post button (bottom-right) or welcome-banner composer: community dropdown, 280-char text, optional image (canvas-downscaled ≤1000px JPEG). `publishPost()`: `POST /api/posts` → prepend + scroll. Offline: unshift local post `id=Date.now()`.

## Interact (one delegated listener on `#feed`)

- Up/Downvote → `POST /api/posts/<id>/vote {value:1|-1|0}`, toggle-off supported — [[backend-api]]
- Love → `POST .../love` toggle; liking others' post notifies author — [[notifications-karma]]
- Reply → `POST .../replies {text≤200}`; replying to others notifies author
- Share → copies link `#post-<id>` + toast
- Save → `POST .../save` toggle; `GET /api/saves` lists (muted authors filtered)
- Mute → 🔇 on others' posts (needs `authorId`; legacy NULL-author seeds can't be muted) → `POST /api/blocks`, hides instantly, unmute in Profile → Safety — [[safety-privacy]]
- Report → 🚩 opens reason modal → `POST .../report {reason: spam|unkind|unsafe|medical|other, detail≤200}`; one per user/post (409 repeat); status in Profile → Safety via enriched `GET /api/reports/mine` — [[safety-privacy]]
- Delete own → `DELETE /api/posts/<id>` owner-only + manual cascade (votes, loves, replies, saves, polls, notifications — reports preserved as audit trail)
- Edit own → `PUT /api/posts/<id>` text/community

Polls attached to posts live in [[habits-gratitude-polls]]. Karma/streaks in [[notifications-karma]].

## Related

[[index]] · [[frontend-shell]] · [[backend-api]] · [[database-schema]] · [[habits-gratitude-polls]] · [[notifications-karma]] · [[safety-privacy]] · [[offline-first]]
