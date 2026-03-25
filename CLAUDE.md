# MasterZap

WhatsApp-like web viewer for browsing WhatsApp messages. Built with vanilla JS + Vite.

## Quick Start

```bash
npm install
npm run split-data    # Generate chunked data in public/data/
npm run dev           # Start dev server
```

## Architecture

- **Vanilla JS + Vite** — no framework, static data viewer
- **Data**: 65,772 messages from DV ↔ Martha Graeff (2024-02-10 to 2025-08-13)
- **Chunking**: `scripts/split_data.py` splits `data/messages.json` into per-date JSON files in `public/data/`
- **Lazy loading**: Only loads day-chunks as user scrolls, with LRU cache

## Directory Structure

- `src/` — application source (styles, lib, components)
- `public/data/` — generated chunked data (gitignored, rebuild with `npm run split-data`)
- `public/assets/` — static assets (favicon, background, SVGs)
- `data/` — source data (messages.json, index.json)
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

## Commands

```bash
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run split-data    # Regenerate data chunks
npm run test          # Run unit tests (Vitest)
npm run test:watch    # Unit tests in watch mode
npm run test:e2e      # E2E tests (Playwright, needs dev server)
npm run test:coverage # Unit tests with coverage
```

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
