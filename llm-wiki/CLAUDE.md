# CLAUDE.md — Minco-Web LLM Wiki Schema

This folder is an Obsidian vault. The LLM maintains `wiki/`, the human owns source code.

## Layers

- Raw sources (immutable, LLM reads but never writes):
  - `../index.html`, `../pages/*.html`, `../assets/js/*.js`, `../assets/css/*.css`
  - `../backend/app.py`, `../backend/NOTES.txt`, `../README.md`, `../WORKFLOW.txt`, `../CONVERSATION.txt`
- Wiki (LLM-owned): `wiki/*.md` — structured, interlinked with `[[wikilinks]]`.

## Page rules

1. Every page has `Related` section with `[[wikilinks]]`. No orphans.
2. `[[index]]` links to every page. Every page links back to `[[index]]` + `[[overview]]`.
3. Concepts use plain language, entities cite source paths + symbols.
4. File references use form: `backend/app.py:44`, `assets/js/api.js:38`.
5. On ingest of new source: update affected pages, add cross-links, append to `[[log]]`.
6. On query: answer from `wiki/` first, cite `[[page]]`, fall back to raw sources only on gaps.
7. Lint every ~10 ingests: orphans, contradictions, stale claims, missing backlinks.

## Page types

- `index` — master catalog, entry point
- `overview` — big-picture synthesis
- `architecture`, `frontend-shell`, `backend-api`, `database-schema` — system
- `auth-sessions`, `community-feed`, `mood-calendar`, `wellbeing-checkin`, `private-journal`, `habits-gratitude-polls`, `meetings-board`, `resource-library`, `notifications-karma` — features
- `safety-privacy`, `offline-first`, `pwa-deployment` — cross-cutting
- `glossary`, `log` — ops

## Graph view

Open `llm-wiki/` in Obsidian → Graph View. Nodes = pages, edges = `[[wikilinks]]`.
Hub nodes: `[[index]]`, `[[overview]]`, `[[architecture]]`, `[[backend-api]]`, `[[safety-privacy]]`.
