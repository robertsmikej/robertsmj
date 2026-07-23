# robertsmj.com

Single-page personal site for Mike Roberts. Plain static site (one HTML file, one CSS file, two small ES modules), no framework or build step, served by an assets-only Cloudflare Worker.

## Develop

```bash
npm install
npm run dev      # wrangler dev, local preview
npm test         # node --test (theme logic unit tests)
```

## Deploy

Pushing to `main` auto-deploys via GitHub Actions (`.github/workflows/deploy.yml`): it runs the tests, then `wrangler deploy` to the personal Cloudflare account. The account ID is pinned in `wrangler.jsonc`; the workflow only needs the `CLOUDFLARE_API_TOKEN` repo secret. You can also trigger it manually from the Actions tab (workflow_dispatch).

To deploy by hand instead:

```bash
# from a shell with the personal CF token exported (bare wrangler uses work OAuth)
npm run deploy
```

Live at `https://robertsmj.com`. The custom domain runs through Cloudflare (nameservers `bingo`/`odin.ns.cloudflare.com`); the iCloud email DNS records (MX/SPF/apple-TXT/DKIM, DKIM kept DNS-only) are preserved. Migration detail is in the plan under `docs/superpowers/plans/`.

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
