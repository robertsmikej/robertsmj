# robertsmj.com

Single-page personal site for Mike Roberts. Plain static site (one HTML file, one CSS file, three small
ES modules), no framework or build step, served by an assets-only Cloudflare Worker.

Live at `https://robertsmj.com`.

## Develop

```bash
npm install          # also installs the lefthook pre-commit hook (Prettier on staged files)
npm run dev          # wrangler dev, local preview
npm run check        # format:check + lint + typecheck + test, exactly what CI runs
```

Individual checks: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run lint`,
`npm run format`, `npm run typecheck`.

There is no TypeScript here; `typecheck` runs `tsc --noEmit` over the JS through its JSDoc annotations.

Conventions, the reasoning behind the deliberate deviations from the wider house standards, and the
non-obvious traps (CSP hash, the duplicated no-flash script, personal vs work Cloudflare credentials)
are in [AGENTS.md](AGENTS.md).

## Deploy

Pushing to `main` auto-deploys via GitHub Actions (`.github/workflows/deploy.yml`): it runs formatting,
lint, typecheck, and tests, then `wrangler deploy` to the personal Cloudflare account. The account ID is
pinned in `wrangler.jsonc`; the workflow only needs the `CLOUDFLARE_API_TOKEN` repo secret. You can also
trigger it manually from the Actions tab (workflow_dispatch).

To deploy by hand instead:

```bash
# from a shell with the personal CF token exported (bare wrangler uses work OAuth)
npm run deploy
```

The custom domain runs through Cloudflare (nameservers `bingo`/`odin.ns.cloudflare.com`); the iCloud
email DNS records (MX/SPF/apple-TXT/DKIM, DKIM kept DNS-only) are preserved. Migration detail is in the
plan under `docs/superpowers/plans/`.

## Structure

```
public/            served assets
  index.html       the page: head, inline SVG symbol library, all sections
  styles.css       token legend, hero canvas geometry, type, layout, keyframes, responsive
  theme.js         pure theme resolution (no DOM, no storage)
  theme-toggle.js  theme toggle DOM wiring; takes a Document, so it is testable
  main.js          entry point: wiring only, no logic
  _headers         CSP (inline script allowed by hash) and hardening headers
  robots.txt       + sitemap.xml
  favicon.svg      mint ridgeline mark
  og.png           social share image
  fonts/           self-hosted Instrument Sans, Space Grotesk, IBM Plex Mono (woff2)
wrangler.jsonc     assets-only Worker config
test/              vitest; helpers/page.js parses the real index.html
docs/
  design-handoff/  the Claude Design handoff (visual source of truth)
  superpowers/     spec + implementation plans
```

## Design

Visual source of truth is `docs/design-handoff/` (the "wireframe terrain" concept, tokens, copy, SVG
artwork, and animation timings). Light and dark themes via a `data-theme` attribute on `<html>`,
persisted to `localStorage`, **defaulting to dark** when nothing is stored. All motion is gated behind
`prefers-reduced-motion`.

The hero is a fixed design canvas (1440x760 desktop, 390x760 mobile) scaled to the viewport in CSS, so
the hand-placed overlay coordinates stay aligned with the terrain artwork. That scaling is pure CSS and
needs no JavaScript.

## To do before launch

- The footer Resume link points at `/resume.pdf`, which does not exist yet and currently 404s. It is
  marked `data-stub="resume"`. Drop the PDF into `public/` (or remove the link) before sharing the site
  with anyone hiring.
