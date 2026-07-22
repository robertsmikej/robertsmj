# Handoff: robertsmj.com — Personal Site

## Overview
Single-page personal site for Mike Roberts, senior full-stack engineer (Treasure Valley, Idaho). Positioning: hiring-manager-facing portfolio with personality. Visual concept: "wireframe terrain" — a monoline topographic mountain scene (ridgeline, lakes, campsite) rendered as SVG line art, alive with subtle looping motion. Light + dark themes.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to ship directly. The task is to **recreate this design as a real deployable site**. There is no existing codebase; a plain static site (single `index.html` + one CSS file + a few lines of JS, no framework/build step) is the recommended target — it will be hosted on a static host (Cloudflare Pages / Netlify) with iCloud email DNS untouched. A framework is overkill for one page.

The design file (`robertsmj Directions.dc.html`) is an exploration canvas containing multiple mocked artboards (desktop/mobile × dark/light, heroes and full pages). **The source of truth is option `3a`** — the two "Full page" artboards (dark and light) plus the mobile hero artboards for <768px layout.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, SVG artwork, and animation timings are final. Recreate pixel-perfectly; the SVG symbols and keyframes can be lifted verbatim from the design file.

## Design Tokens
CSS custom properties, themed via a `data-theme` attribute on `<html>`:

Dark (default):
- `--bg: #0A1414` page background
- `--l1: #1E4038` faint terrain lines / hairline rules / card borders
- `--l2: #37705C` primary terrain lines / dashed borders / underlines
- `--ac: #5FD4A0` mint accent — CTAs, vertices, icons, section kickers
- `--wm: #E5B36A` warm amber — traveling signal dot + campfire only
- `--lk: rgba(95,212,160,.08)` lake fill
- `--tx: #F2F5F1` primary text
- `--tx2: #9FB8AB` secondary text

Light:
- `--bg: #F7F6EF`, `--l1: #D5DCCB`, `--l2: #7FA08C`, `--ac: #1F7A4D`, `--wm: #C08430`, `--lk: rgba(31,122,77,.08)`, `--tx: #1C201C`, `--tx2: #5D685C`
- On light theme, filled-CTA text color is `#F7F6EF` (not `--bg`).

Typography (Google Fonts):
- Instrument Sans (400, 600, italic 400) — all prose, headings, nav, CTAs
- IBM Plex Mono (400, 600) — wordmark, kickers, meta lines, hobby card titles, footer links

Scale:
- Hero name: 600 80px/1.02, letter-spacing -0.02em (mobile: 46px/1.05)
- Hero sub: 400 22px/1.5, max-width 560px (mobile: 17px/1.55)
- Section kicker: mono 600 12px, letter-spacing .16em, color `--ac`, uppercase
- Body prose: 19px/1.7 `--tx`
- Card title: 600 18px/1.3; card body: 15px/1.6 `--tx2`; card meta: mono 11px/1.5 `--ac`, letter-spacing .1em, uppercase
- Hobby card title: mono 600 13px/1.3, letter-spacing .1em
- Footer headline: 600 34px/1.1
- Nav links: 13px `--tx2`; footer links: mono 13px `--tx`; copyright: mono 11px

Other tokens: border-radius 6px (buttons) / 8px (cards); content measure 760px centered; section separator = 1px `--l1` rule with 88px vertical margins; radius 9px pill for theme toggle.

## Page Structure (top to bottom)
1. **Hero** — 100vh-ish (760px design height), terrain SVG fills it. Top bar: mono wordmark "robertsmj.com" left; nav right ("The work", "Off the clock", "Contact") + theme toggle pill (34×18, 1px `--tx2` border, 12px `--ac` knob; knob right = dark, left = light). Centered stack at ~170px from top: name, subtitle "Senior full-stack engineer. Idaho roots, production systems, and dirt under the fingernails.", CTA row: filled mint button "Hiring? Let's talk" (600 15px, padding 15px 26px) + text link "The work ↓" with 1px `--l2` underline.
2. **WHAT I DO** — kicker + one 19px paragraph (copy in design file) + stack strip: 6 inline-flex chips (17px mint monoline glyph + mono 13px label, letter-spacing .08em): TYPESCRIPT, SHOPIFY / LIQUID, CLOUDFLARE WORKERS, REMIX, GRAPHQL, NODE.
3. **SELECTED WORK** — 3 cards, grid `150px 1fr` gap 28px, 1px solid `--l1` border, radius 8px, padding 20px 26px. Each has a 150×90 monoline schematic SVG (`#schAb`, `#schTheme`, `#schEdge`), title, one-line description, and a mono mint meta line (e.g. "EDGE DELIVERY · ZERO FLICKER · MILLIONS OF SESSIONS").
4. **OFF THE CLOCK** — 2×2×3 grid (2 cols, gap 16px), dashed 1px `--l2` borders, radius 8px, padding 20px 22px. 22px mint icon + mono title + 15px body. Cards: DIRT OPS, THE FUNGUS PIPELINE, PRINT FARM, GERMAN CAR THERAPY, DAD MODE, WHATEVER BREAKS NEXT (exact copy in design file).
5. **AI aside** — centered: 64px 1px `--l2` rule, then italic 15px/1.6 `--tx2` line: "Yes, an engineer used AI to build his own website. I ship with the best tools available — that's kind of the point."
6. **Footer / Contact** — footer ridge: the hero terrain SVG cropped to its bottom 240px (`viewBox="0 470 1440 290"`, preserveAspectRatio="none", absolutely positioned at bottom, static — no animation). Over it: headline "Sound like your kind of engineer?" + repeated filled CTA; below, link row (mailto mike@robertsmj.com, GitHub, LinkedIn, Resume PDF — real URLs TBD by Mike) and "© 2026 MIKE ROBERTS — TREASURE VALLEY, IDAHO".

## The Terrain Artwork
Two SVG `<symbol>`s in the design file — lift verbatim:
- `#svgB` (desktop, viewBox 0 0 1440 760): faint triangulation mesh (`--l1`), bold ridgeline path (`--l2`, 1.7px), valley mesh below, two lakes (`--lk` fill + `--l2` ripple lines), campsite (tent + flag in `--ac`, campfire mark, firelight in `--wm`), 5 mint vertex dots on peaks.
- `#svgBm` (mobile, viewBox 0 0 390 760): simplified version, one lake, tent, 3 vertex dots.
Ridgeline path (desktop): `M0,610 L140,520 L300,600 L430,470 L560,588 L700,430 L840,580 L980,455 L1120,592 L1260,495 L1440,596`. Mobile: `M0,640 L70,580 L140,632 L200,550 L260,624 L330,570 L390,634`.

## Interactions & Behavior
Animations (keyframes in the design file `<style>`; timings final):
- **Reveal (once, on load):** terrain wipes in left→right via `clip-path: inset(0 100% 0 0)` → `wipe 1.6s cubic-bezier(.4,0,.2,1) .1s forwards`; a 2px mint scan line sweeps across in sync (`scan`, translateX 1440px / 390px mobile, fading out); the ridgeline draws itself via `pathLength=1` + dashoffset (`ridgeDraw 2.4s`).
- **Ambient (looping):** whole terrain drifts vertically ±9px (`drift 9s ease-in-out 2.6s infinite alternate`); 8px amber dot travels the ridgeline via `offset-path` (`travel 10s linear infinite`, 8s mobile, fades in/out at ends); peak vertices pulse — 10px mint ring scaling .4→2.2 fading out (`pulse 3.4s`, staggered delays 2.2/3.4/4.6s); lake glints — 70px 1px mint line fading in/out (`glint 6s`, staggered); campfire flickers (4px amber dot, `glint 2.4s`); three 3–5px smoke rings rise ~28px from the tent fading (`smoke 5s linear`, delays 2.8/4.5/6.2s).
- Respect `prefers-reduced-motion: reduce` — skip ambient loops, keep or instant-complete the reveal.
- **Theme toggle:** switches `data-theme` on `<html>`, persists to `localStorage`, defaults to `prefers-color-scheme`. Knob slides right (dark) / left (light); transition ~200ms.
- **Nav / CTAs:** smooth-scroll to section anchors. "Hiring? Let's talk" and footer email → `mailto:mike@robertsmj.com` (or scroll to footer — Mike's call).
- **Hover states (not in mocks — add tastefully):** links `--tx2`→`--tx`; filled CTA slight brightness lift; work/hobby cards border `--l1`→`--l2` with ~150ms ease.
- **Responsive:** ≤768px use the mobile hero layout (left-aligned, 24px gutters, nav collapses to wordmark + toggle; either hide nav links or add a minimal menu), single-column content at 24px gutters, hobby grid → 1 column, footer stacks vertically. Content column: `min(760px, 100% - 48px)`.

## State Management
- `theme: 'dark' | 'light'` — localStorage-persisted, system-preference default. That's the only state.

## Assets
- No raster assets. All artwork is inline SVG (terrain symbols, 6 stack glyphs `#icTs #icShop #icCloud #icRemix #icGql #icNode`, 3 work schematics `#schAb #schTheme #schEdge`, 6 hobby icons `#icSprout #icMush #icPrinter #icWrench #icKite #icBolt`) — all defined as `<symbol>`s in the design file, referenced with `<use>` and colored by CSS vars.
- Fonts via Google Fonts (or self-host for performance).
- Resume PDF: to be supplied by Mike.

## Files
- `robertsmj Directions.dc.html` — design exploration canvas. Option **3a** (section id `t3`) is the approved direction: full-page dark + light artboards and mobile hero artboards. SVG symbols and `@keyframes` live at the top of the file.
- `support.js` — prototype runtime only; ignore for implementation.

## Deploy notes (context for the developer)
- Domain robertsmj.com is registered via Squarespace Domains (ex-Google Domains) still on `ns-cloud-b*.googledomains.com` nameservers. iCloud custom email (MX/SPF/apple-domain TXT) must not be disturbed — add only A/CNAME records for hosting.
- Target: static host free tier (Cloudflare Pages or Netlify), custom domain + HTTPS.
