# robertsmj.com — Personal Site: Design Spec

Date: 2026-07-22
Status: Approved, ready for implementation plan
Source of truth for visuals: `docs/design-handoff/README.md` + the `3a` artboards in `docs/design-handoff/robertsmj Directions.dc.html`

## Overview

Single-page, hiring-manager-facing personal site for Mike Roberts (senior full-stack engineer, Treasure Valley, Idaho). Visual concept is "wireframe terrain": a monoline topographic mountain scene rendered as inline SVG, alive with subtle looping motion, in light and dark themes. The Claude Design handoff is high-fidelity and final on colors, type, spacing, copy, artwork, and animation timings. This spec does not restate those pixel details (the handoff owns them); it captures the build/technical design and the decisions the handoff left open.

## Goals

- Recreate the `3a` direction close to pixel-perfect, lifting the SVG symbols and `@keyframes` verbatim.
- Ship a plain static site: no framework, no build step, no client-side dependencies.
- Deploy on Cloudflare Workers (static assets), consistent with the rest of Mike's stack.
- Fast first paint, no layout shift, accessible, and respectful of reduced-motion.

## Non-goals (YAGNI)

- No framework, bundler, or CSS toolchain.
- No CMS, no backend, no forms (contact is a `mailto:`).
- No analytics in v1 (can be added later if wanted).
- No multi-page routing. One page, anchor-scrolled sections.

## Resolved decisions

These were open in the handoff; now locked:

1. **Hosting:** Cloudflare Workers in static-assets mode (not Pages). Assets-only Worker, no Worker script required.
2. **Primary CTA** ("Hiring? Let's talk", hero + footer) and the footer email link: `mailto:mike@robertsmj.com`.
3. **Mobile nav (<=768px):** hide the nav links; keep only the wordmark + theme toggle, matching the mobile hero mock.
4. **Fonts:** self-hosted woff2 (Instrument Sans 400/600/italic-400, IBM Plex Mono 400/600), `font-display: swap`, preloaded. No third-party font request.

## Architecture

Static files served by an assets-only Cloudflare Worker. There is no server logic; all behavior (theme, smooth scroll) is a few lines of vanilla JS.

```
robertsmj/
  public/
    index.html          the whole page: head + SVG <defs> + body sections
    styles.css          tokens, layout, motion keyframes, responsive rules
    main.js             theme toggle + persistence; smooth-scroll is CSS where possible
    favicon.svg         on-brand mint ridgeline mark
    og.png              social share image generated from the terrain art (optional; stub if skipped)
    resume.pdf          supplied by Mike (stub link until provided)
    fonts/
      instrument-sans-400.woff2, instrument-sans-600.woff2, instrument-sans-italic-400.woff2
      ibm-plex-mono-400.woff2, ibm-plex-mono-600.woff2
  wrangler.jsonc         assets-only Worker config
  package.json           wrangler devDependency + scripts (dev, deploy)
  .gitignore
  docs/
    design-handoff/      the original Claude Design handoff, kept as reference
    superpowers/specs/   this spec
```

### Units and responsibilities

- **index.html** — document head (meta/SEO/font preloads), the inline SVG symbol library (`<defs>`), and the page body: hero, WHAT I DO, SELECTED WORK, OFF THE CLOCK, AI aside, footer/contact. Copy is final and lifted verbatim from the handoff.
- **styles.css** — CSS custom properties for the dark (default) and light themes keyed on `data-theme`; typography scale; layout (centered 760px measure, section rules); all `@keyframes` and the reveal/ambient animation wiring; the `prefers-reduced-motion` overrides; responsive rules at the 768px breakpoint.
- **main.js** — one concern: theme. Read stored theme from `localStorage`, else fall back to `prefers-color-scheme`, apply `data-theme` on `<html>` before first paint to avoid a flash, and toggle + persist on click of the toggle button. Smooth scrolling handled with CSS `scroll-behavior: smooth` plus `scroll-margin-top` on sections; JS only if a fallback is needed.

## Design tokens, type, artwork

Owned by the handoff; implemented exactly:

- CSS custom properties for both themes per the handoff token tables (dark default; light overrides; filled-CTA text `#F7F6EF` on light).
- Type scale, letter-spacing, and the mono/sans split per the handoff.
- SVG `<symbol>`s (`#svgB`, `#svgBm`, the 6 stack glyphs, 3 work schematics, 6 hobby icons) and all `@keyframes` copied verbatim from the design file, referenced with `<use>` and colored via CSS vars.
- Footer ridge = `#svgB` cropped to `viewBox="0 470 1440 290"`, `preserveAspectRatio="none"`, absolutely positioned, static (no animation).

## Interactions and behavior

- **Reveal (once, on load):** terrain wipe left-to-right, mint scan line in sync, ridgeline self-draw, per the handoff timings.
- **Ambient (looping):** vertical drift, traveling amber signal dot on the ridgeline (`offset-path`), staggered peak pulses, lake glints, campfire flicker, rising smoke rings, per the handoff timings.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` skips ambient loops and instant-completes (or skips) the reveal so the terrain is shown in its final state.
- **Theme toggle:** interactive button, toggles `data-theme` on `<html>`, persists to `localStorage`, defaults to `prefers-color-scheme`; knob slides right (dark) / left (light), ~200ms.
- **Nav / CTAs:** nav links smooth-scroll to section anchors (The work -> selected work, Off the clock -> hobbies, Contact -> footer). Hero "The work down-arrow" scrolls to selected work. Both "Hiring? Let's talk" buttons and the footer email -> `mailto:mike@robertsmj.com`.
- **Hover states (added tastefully, not in mocks):** links `--tx2` -> `--tx`; filled CTA slight brightness lift; work/hobby card borders `--l1` -> `--l2`, ~150ms ease.

## Responsive

- `<=768px`: mobile hero layout (left-aligned, 24px gutters), nav collapses to wordmark + toggle (links hidden), mobile terrain symbol `#svgBm`.
- Content below the hero (only the mobile *hero* was mocked): built to the handoff's prose, single column at 24px gutters, hobby grid to 1 column, footer stacked vertically. Content column `min(760px, 100% - 48px)`.

## Accessibility

- Semantic landmarks (`header`, `main`, `footer`, `nav`, `section` with headings).
- Theme toggle is a real `<button>` with an accessible label and `aria-pressed`.
- Decorative SVG marked `aria-hidden`; meaningful controls labeled.
- Color/contrast per the handoff tokens; verify AA on both themes during implementation, especially light-mode secondary text.
- Reduced-motion respected as above.

## Head / SEO (authored here; not in the design)

- `<title>` and meta description describing Mike as a senior full-stack engineer in Idaho.
- Open Graph + Twitter card tags (title, description, image, url, type).
- On-brand SVG favicon (mint ridgeline motif).
- Optional OG share image generated from the terrain art; stub if skipped.
- `lang="en"`, viewport, theme-color meta per active theme.

## Assets to obtain from Mike (non-blocking; stubbed until provided)

- LinkedIn profile URL.
- Resume PDF file (link stubbed / hidden until dropped into `public/resume.pdf`).
- GitHub pre-filled as `github.com/robertsmikej`; confirm or replace.
- Confirm `mike@robertsmj.com` is a live inbox (reads as the iCloud custom-domain address on the domain).

## Deployment

Two phases, decoupled so the build carries zero DNS/email risk.

### Phase A — build and preview (no DNS risk)

- `wrangler.jsonc`: `name`, a current `compatibility_date`, and `assets: { directory: "./public" }`. Assets-only, no `main`.
- `wrangler dev` for local preview; `wrangler deploy` publishes to a `*.workers.dev` URL for full end-to-end testing.

### Phase B — custom domain (gated, done only after build is verified)

`robertsmj.com` is registered at Squarespace Domains, currently on `ns-cloud-b*.googledomains.com` nameservers, with iCloud custom email (MX / SPF / apple-domain TXT / DKIM). Attaching a Worker custom domain requires the zone to be on Cloudflare. Process, evidence-first:

1. Enumerate all current DNS records (dig / registrar export), especially every email record.
2. Add the zone to Cloudflare; verify Cloudflare's import captured all email records, or add them by hand. Confirm MX/SPF/apple-TXT/DKIM are present and correct.
3. Only then switch nameservers to Cloudflare.
4. Attach the Worker custom domain (apex + `www`), confirm HTTPS.
5. Send/receive a test email to prove the inbox still works before considering cutover done.

Nothing touches email until it is proven intact. Roll back by restoring the original nameservers if anything looks wrong.

## Verification (evidence before claims)

- Render locally via `wrangler dev`; compare hero, sections, and footer against the `3a` artboards in both themes.
- Toggle theme, reload, confirm persistence and no flash-of-wrong-theme.
- Confirm reveal plays once and ambient loops run; then enable reduced-motion and confirm loops stop and the terrain shows final state.
- Check the 768px breakpoint (mobile hero + stacked content).
- Confirm `mailto:` opens with the right address; nav anchors scroll to the right sections.
- Basic Lighthouse pass (performance, accessibility) on the workers.dev preview before any domain work.

## Open questions

None blocking. The items under "Assets to obtain from Mike" are fill-in-later; everything else is decided.
