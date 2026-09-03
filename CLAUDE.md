# MasterWhats

WhatsApp-like web viewer for browsing WhatsApp messages. Built with vanilla JS + Vite.

## Quick Start

```bash
npm install
npm run split-data    # Generate chunked data in public/data/
npm run dev           # Start dev server
```

## Architecture

- **Vanilla JS + Vite** — no framework, static data viewer
- **Data**: two sources, 66,387 messages across 24 conversations
  - 65,772 messages from DV ↔ Martha Graeff (2024-02-10 to 2025-08-13), in `data/messages.json`
  - 615 messages from the Federal Police report IPJ-A 3298613/2026 (23 conversations, including DV ↔ Alexandre de Moraes) — see `data/ipj-3298613/README.md`
- **Chunking**: `scripts/split_data.py` splits every source conversation into per-date JSON files in `public/data/`
- **Highlights are citations outside the app**: `scripts/lib/corpus.mjs` `createResolver()` runs each `action:search` link against the conversation at build time (same normalisation as `src/lib/search.js`) and `renderLinks()` emits the message link (`/#/chat/<id>/msg/<n>`, or `#msg-<n>` on the same page) plus `⟨date time · laudo p., fig.⟩`. A term that matches nothing **fails the build**. The hand-written highlights in `public/llms.txt` and the `<noscript>` of `index.html` were linked the same way — re-run the resolver if those quotes change
- **Pre-render**: `scripts/prerender.mjs` runs after `vite build`; for each conversation writes `dist/chat/<id>/index.html` (built app page retitled, profile + first messages as plain HTML in `<article id="prerender">`, a one-line script sets the hash so the app opens that chat; main.js removes the article at boot). Also `dist/llms-full.txt` and `dist/sitemap.xml`. Shared helpers in `scripts/lib/corpus.mjs`
- **Export**: `scripts/export.mjs` writes `public/export/` — one `.md` and `.json` per conversation, one of each with everything, and a zip. Reads the conversation list from `public/data/conversations.json`, messages from `data/`, profiles from `src/lib/profile-content.js`
- **Lazy loading**: Only loads day-chunks as user scrolls, with LRU cache

## Directory Structure

- `src/` — application source (styles, lib, components)
- `public/data/` — generated chunked data (gitignored, rebuild with `npm run split-data`)
- `public/export/` — clean export, md/json per conversation + zip (gitignored, rebuild with `npm run export`; runs after split-data, imports the profiles from src/lib)
- `public/assets/` — static assets (favicon, background, SVGs)
- `data/` — source data (messages.json, index.json)
- `data/ipj-3298613/` — transcription of the IPJ-A police report (JSONL, one line per message)
- `data/conversations/` — conversations built from that transcription by `scripts/build_ipj_data.py`
- `data/source/` — original source PDFs the transcriptions came from
- `ref/` — reference files (WDS style.css, WhatsApp desktop HTML, branding)
- `scripts/` — build scripts
- `tests/unit/` — Vitest unit tests
- `tests/e2e/` — Playwright E2E tests

## Key Conventions

- **Language**: All UI text in Brazilian Portuguese (pt-BR)
- **Styling**: WDS (WhatsApp Design System) CSS custom properties in `wds-tokens.css`
- **Message types**: text, image, video, audio, sticker, document, deleted, call, system
- **Outgoing messages**: `sender === "DV"` (right-aligned, green bubble)
- **Conversation ID**: slugified participant name (e.g., `martha-graeff`)

## API and MCP

- `src/lib/api-routes.js` is **the** table: route → file. `vercel.json` rewrites, the `/api` page (`ApiDrawer.js` in-app, `dist/api/` static), the `llms.txt` section and the MCP's URLs all derive from it; `tests/unit/api-routes.test.js` holds `vercel.json` to it and checks every example resolves to a file in `dist/`.
- `api/mcp.js` is the only Vercel Function: `mcp-handler` (SDK v2, Streamable HTTP, stateless). Tools in `src/lib/mcp/server.js` are adapters that `fetch` the static API; `search`/`fetch` follow OpenAI's connector contract. Limits in `src/lib/mcp/limits.js` (per-minute, per-day per client, global per day; in memory). Tested end-to-end with an in-memory client in `tests/unit/mcp.test.js`.
- Bulk (`masterwhats.md/.json`, zip) is written to `release/` (gitignored) and published with `scripts/publish-bulk.sh` as a GitHub Release; the site links `releases/latest/download/…`.

## Commands

```bash
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run split-data    # Regenerate data chunks (all conversations)
npm run export        # Clean export (md/json per conversation + zip) into public/export/
npm run prerender     # After vite build: dist/chat/<id>/index.html, dist/llms-full.txt, dist/sitemap.xml
npm run test          # Run unit tests (Vitest)
npm run test:watch    # Unit tests in watch mode
npm run test:e2e      # E2E tests (Playwright; starts its own dev server)
npm run test:coverage # Unit tests with coverage
npm run verify        # Everything, in deploy order: data → unit → build → E2E
```

## Before deploying

Vercel deploys on push, so the gate is a `pre-push` hook. Enable it once per
clone:

```bash
git config core.hooksPath .githooks
npx playwright install chromium   # first time only
```

It runs `npm run verify` (~5 min, mostly E2E across desktop and mobile).
`git push --no-verify` skips it.

E2E covers what jsdom cannot see: list scrolling, hover on touch, avatars that
actually load, and the read/unread wiring. Keep `test:e2e` pointed at
`tests/e2e/playwright.config.js` — without `--config` Playwright scans `tests/`,
picks up the Vitest files and dies on a matcher clash.

## Data Format

Each message in `messages.json`:
```json
{
  "id": 1,
  "timestamp": "2024-02-10T11:12:08",
  "date": "2024-02-10",
  "time": "11:12:08",
  "sender": "DV" | "Martha Graeff",
  "content": "...",
  "type": "text" | "image" | "video" | "audio" | "sticker" | "document" | "deleted" | "call" | "system",
  "is_edited": false,
  "attachment": null | "filename",
  "urls": []
}
```

## Reference Files

- `ref/style/style.css` — WDS tokens (500+ CSS vars)
- `ref/style/whatsapp-desktop-ref.html` — WhatsApp Web DOM structure
- `ref/style/whatsapp-background.webp` — Chat doodle wallpaper
- `ref/style/whatsapp-loading.png` — Loading screen reference
- `ref/branding-design-components/01_Digital/02_SVG/Green/Digital_Glyph_Green.svg` — WhatsApp glyph
