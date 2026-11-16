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
- **Data**: several sources, 93,807 messages across 78 conversations
  - 65,772 messages from DV ↔ Martha Graeff (2024-02-10 to 2025-08-13), in `data/messages.json`
  - 615 messages from the Federal Police report IPJ-A 3298613/2026 (23 conversations, including DV ↔ Alexandre de Moraes) — see `data/ipj-3298613/README.md`
  - 14 messages from the PF representation in Inq 5.026 (DV ↔ "Berg", José Alfredo Berg Filho) — see `data/inq-5026/README.md`. Other police documents go in `data/<document>/mensagens.jsonl`, each line with its fixed `id`, listed in `DOCUMENTS` in `scripts/build_ipj_data.py`
  - 101 messages from the PF representation in Pet 15.497 (RioPrevidência; 4 conversations) — see `data/pet-15497/README.md`. No PDF of it was found anywhere public, so they come from another project's transcription, sealed `nao-verificado`. Lines the fork took from elsewhere keep their own `source_id` and seal: press reports are `imprensa` (even without a link), an anonymous excerpt `nao-verificado`, a paraphrase `reconstruido`. Everything the fork has comes in, whatever the source. A source without its PDF in the repo can never be `verificado` (the schema refuses it)
  - 1,183 messages in 46 new conversations from the fork 1uc4sm4theus/masterzap, in `data/fork/` (`mensagens.jsonl` + `conversas.json`, see its README): each conversation keeps the source the fork records, and each line its own when it differs. Press prints and reports are `imprensa`; documents without the PDF, excerpts given to the fork with no outlet, and lines with no recorded source are `nao-verificado`; paraphrases and the fork's summaries are `reconstruido`. A time the fork filled in is unknown; an approximate date keeps only its month. Everything the fork has comes in, except what is not Vorcaro's (the Lula wiretaps)
  - 25,673 messages from the fork's four full forensic exports (IPED HTML, origin not given by the fork; source `iped-<conv>`, sealed `nao-verificado`): Ana Matos (13,940 added to the report's 99), Flávio Carneiro, Fred Kachar and Lilian Tahan. Reactions are kept in `reactions`; see "Exportações completas" in `data/fork/README.md`
  - 449 messages the fork added to 11 conversations we already had (Moraes, Ciro Soares, Fábio Faria, Luiz Rennó, Leo Serrano, Romy and others): in `data/fork/mensagens.jsonl` with the existing `conv` (not in `conversas.json`), or in `data/pet-15497/` when they cite that document. Each line carries `after` (the message before it on the same day) and its own source and seal; the index lists `id_runs` for a day that is no longer one run of ids. See "Acréscimos" in `data/README.md`. When more than half a conversation's messages carry another seal than its source's, the header shows that seal (`majority_verification`, from split_data.py; `headerSeal` in src/lib/provenance.js) and the source's own messages are marked one by one; the data is not rewritten
- **Chunking**: `scripts/split_data.py` splits every source conversation into per-date JSON files in `public/data/`
- **Highlights are citations outside the app**: `scripts/lib/corpus.mjs` `createResolver()` runs each `action:search` link against the conversation at build time (same normalisation as `src/lib/search.js`) and `renderLinks()` emits the message link (`/#/chat/<id>/msg/<n>`, or `#msg-<n>` on the same page) plus `⟨date time · laudo p., fig.⟩`, and the message's seal and source when the reader does not already see them (another source than its conversation's, or a highlight read out of its conversation). A term that matches nothing **fails the build**. The hand-written highlights in `public/llms.txt` and the `<noscript>` of `index.html` were linked the same way — re-run the resolver if those quotes change
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

- **Scope: the Banco Master case only.** Data comes in only when it concerns Daniel Vorcaro and the Master case: his conversations, the documents of the investigation, press reports about it. Material that only reached the same compilations (other people's wiretaps, audios of other politicians, old conversations with no tie to Vorcaro) stays out, even when a fork or a third-party compilation carries it. When importing from such a compilation, leave those conversations and files behind rather than importing and hiding them
- **Language**: All UI text in Brazilian Portuguese (pt-BR)
- **Styling**: WDS (WhatsApp Design System) CSS custom properties in `wds-tokens.css`
- **Message types**: text, image, video, audio, sticker, document, deleted, call, system
- **Outgoing messages**: the phone owner's (right-aligned, green bubble). The owner is per conversation — `owner` in `conversations.json`, from the source's `metadata.owner`, "DV" by default. Ask `src/lib/participants.js` (`ownerOf`, `contactOf`, `isOutgoing`, `ownerName`); never compare with "DV" directly
- **Conversation ID**: slugified participant name (e.g., `martha-graeff`)

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
