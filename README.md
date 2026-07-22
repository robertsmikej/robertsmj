# robertsmj.com

Single-page personal site for Mike Roberts. Plain static site (one HTML file, one CSS file, two small ES modules), no framework or build step, served by an assets-only Cloudflare Worker.

## Develop

```bash
npm install
npm run dev      # wrangler dev, local preview
npm test         # node --test (theme logic unit tests)
```

## Deploy

```bash
npm run deploy   # wrangler deploy (assets-only Worker)
```

Note: this is a personal site. Deploy to the personal Cloudflare account (bare `wrangler` uses work OAuth). Attaching the `robertsmj.com` custom domain is a separate, gated step that must preserve the existing iCloud email DNS records: see the plan under `docs/superpowers/plans/`.

## Structure

```
public/          served assets
  index.html     the page: head, inline SVG symbols, all sections
  styles.css     tokens (light/dark), type, layout, keyframes, responsive
  theme.js       pure theme-resolution logic (unit-tested)
  main.js        theme toggle + persistence, hero canvas scaling
  favicon.svg    mint ridgeline mark
  og.png         social share image
  fonts/         self-hosted Instrument Sans + IBM Plex Mono (woff2)
wrangler.jsonc   assets-only Worker config
test/            node --test unit tests
docs/
  design-handoff/    the Claude Design handoff (visual source of truth)
  superpowers/       spec + implementation plan
```

## Design

Visual source of truth is `docs/design-handoff/` (the "wireframe terrain" concept, tokens, copy, SVG artwork, and animation timings). Light and dark themes via a `data-theme` attribute on `<html>`, persisted to `localStorage`, defaulting to `prefers-color-scheme`. All motion is gated behind `prefers-reduced-motion`.

## To do before launch

- LinkedIn URL and resume PDF are stubbed in the footer (marked `data-stub`); fill them in before the domain goes live.
