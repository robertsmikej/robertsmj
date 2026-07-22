# robertsmj.com Personal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build robertsmj.com, a single-page "wireframe terrain" personal site, close to pixel-perfect from the Claude Design handoff, and deploy it on Cloudflare Workers static assets.

**Architecture:** Plain static site (one `index.html`, one `styles.css`, two tiny ES modules) served by an assets-only Cloudflare Worker. No framework, no bundler, no client-side runtime dependencies. The design ships four redundant artboards (dark/light x desktop/mobile); the real site is ONE set of markup themed entirely by CSS custom properties on `data-theme`. SVG symbols and `@keyframes` are lifted verbatim from the handoff.

**Tech Stack:** HTML, CSS custom properties, vanilla ES modules, self-hosted woff2 fonts, Cloudflare Wrangler (dev dependency), Node built-in test runner (`node --test`, zero deps) for the theme logic.

## Global Constraints

- No framework, no bundler, no build step for shipped code. Native ES modules only. (spec: Non-goals)
- No client-side runtime dependencies. Dev-only deps allowed (wrangler; Node built-in test runner needs none). (spec: Non-goals)
- Visual source of truth: `docs/design-handoff/README.md` and the `3a` artboards in `docs/design-handoff/robertsmj Directions.dc.html`. Colors, type, spacing, copy, SVG artwork, animation timings are final. (spec: Overview)
- Copy is final; lift verbatim from the handoff, do not rewrite it. (spec: Design tokens)
- Themes via `data-theme` on `<html>`: dark is default, light is the override. Filled-CTA text color on light is `#F7F6EF`, not `--bg`. (handoff Design Tokens)
- Only theme is client state: `theme: 'dark' | 'light'`, localStorage-persisted, `prefers-color-scheme` default, no flash of wrong theme. (spec: Interactions)
- All motion gated behind `@media (prefers-reduced-motion: reduce)`. (spec: Interactions)
- Primary CTA + footer email = `mailto:mike@robertsmj.com`. (spec: Resolved decisions)
- Mobile (<=768px): hide nav links, keep wordmark + theme toggle only. (spec: Resolved decisions)
- Fonts self-hosted woff2 (Instrument Sans 400/600/italic-400; IBM Plex Mono 400/600), `font-display: swap`. (spec: Resolved decisions)
- Node's `package.json` uses `"type": "module"` so the same `.js` files are ESM in both Node tests and the browser.
- iCloud email records on robertsmj.com must never be disturbed; the custom-domain/DNS step (Task 13) is gated and evidence-first. (spec: Deployment Phase B)

---

## File Structure

- `public/index.html` — head (meta, SEO, font preloads, no-flash theme script), inline SVG `<defs>` symbol library, and the page body (hero, WHAT I DO, SELECTED WORK, OFF THE CLOCK, AI aside, footer).
- `public/styles.css` — `@font-face`, CSS custom-property token sets for dark/light, base reset, typography, layout, components, `@keyframes`, hero-scale rules, responsive rules, reduced-motion overrides.
- `public/theme.js` — pure theme logic: `resolveTheme`, `nextTheme`, `THEMES`, `STORAGE_KEY`. No DOM access. Unit-tested.
- `public/main.js` — DOM wiring: theme toggle + persistence + `aria-pressed`, hero canvas scaling on load/resize. Imports `theme.js`.
- `public/favicon.svg` — on-brand mint ridgeline mark.
- `public/fonts/*.woff2` — self-hosted font files.
- `public/resume.pdf` — supplied by Mike (link stubbed until present).
- `public/og.png` — optional social share image (Task 11; stub if skipped).
- `wrangler.jsonc` — assets-only Worker config.
- `package.json` — scripts (`dev`, `deploy`, `test`), wrangler devDependency, `"type": "module"`.
- `test/theme.test.js` — Node test-runner unit tests for `theme.js`.

---

## Task 1: Scaffold and Cloudflare Worker config

**Files:**
- Create: `package.json`
- Create: `wrangler.jsonc`
- Create: `public/index.html`

**Interfaces:**
- Produces: a `public/` assets directory served by wrangler at `/`; npm scripts `dev`, `deploy`, `test`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "robertsmj",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "node --test"
  },
  "devDependencies": {
    "wrangler": "^4"
  }
}
```

- [ ] **Step 2: Create `wrangler.jsonc` (assets-only Worker)**

```jsonc
{
  "name": "robertsmj",
  "compatibility_date": "2025-01-01",
  "assets": {
    "directory": "./public"
  }
}
```

- [ ] **Step 3: Create a minimal `public/index.html` placeholder**

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mike Roberts</title>
</head>
<body>
  <main id="scaffold-marker">robertsmj.com scaffold</main>
</body>
</html>
```

- [ ] **Step 4: Install wrangler**

Run: `cd /Users/mikeroberts/Code/robertsmj && npm install`
Expected: `node_modules/` created, `wrangler` present, no errors.

- [ ] **Step 5: Verify local serving**

Run (background, then curl): `npx wrangler dev --port 8787` then in another shell `curl -s http://localhost:8787/ | grep scaffold-marker`
Expected: the line `<main id="scaffold-marker">robertsmj.com scaffold</main>` prints. Stop the dev server afterward.

- [ ] **Step 6: Commit**

```bash
git add package.json wrangler.jsonc public/index.html package-lock.json .gitignore
git commit -m "Scaffold static site served by assets-only Cloudflare Worker"
```

---

## Task 2: Theme logic module (TDD)

**Files:**
- Create: `test/theme.test.js`
- Create: `public/theme.js`

**Interfaces:**
- Produces:
  - `THEMES` = `{ DARK: 'dark', LIGHT: 'light' }`
  - `STORAGE_KEY` = `'theme'`
  - `resolveTheme(stored: string|null, systemPrefersDark: boolean): 'dark' | 'light'`
  - `nextTheme(current: 'dark' | 'light'): 'dark' | 'light'`
- Consumed by: `public/main.js` and the no-flash inline script in `index.html` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `test/theme.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, THEMES, STORAGE_KEY } from '../public/theme.js';

test('constants', () => {
  assert.deepEqual(THEMES, { DARK: 'dark', LIGHT: 'light' });
  assert.equal(STORAGE_KEY, 'theme');
});

test('resolveTheme: stored value wins over system', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('resolveTheme: falls back to system when unset or invalid', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme('purple', true), 'dark');
  assert.equal(resolveTheme('', false), 'light');
});

test('nextTheme: flips', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/mikeroberts/Code/robertsmj && node --test`
Expected: FAIL, cannot find module `../public/theme.js`.

- [ ] **Step 3: Write the minimal implementation**

Create `public/theme.js`:

```js
export const THEMES = { DARK: 'dark', LIGHT: 'light' };
export const STORAGE_KEY = 'theme';

export function resolveTheme(stored, systemPrefersDark) {
  if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
    return stored;
  }
  return systemPrefersDark ? THEMES.DARK : THEMES.LIGHT;
}

export function nextTheme(current) {
  return current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /Users/mikeroberts/Code/robertsmj && node --test`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add test/theme.test.js public/theme.js
git commit -m "Add tested theme resolution logic"
```

---

## Task 3: Self-hosted fonts and base stylesheet

**Files:**
- Create: `public/fonts/` (5 woff2 files)
- Create: `public/styles.css`
- Modify: `public/index.html` (link stylesheet, font preloads)

**Interfaces:**
- Produces: font families `'Instrument Sans'` and `'IBM Plex Mono'` available site-wide; a linked `styles.css` with a base reset and body defaults.
- Consumed by: all later styling tasks.

- [ ] **Step 1: Download the woff2 files**

Run:
```bash
cd /Users/mikeroberts/Code/robertsmj/public/fonts
curl -sL "https://gwfh.mranftl.com/api/fonts/instrument-sans?download=zip&subsets=latin&variants=regular,600,italic&formats=woff2" -o is.zip
curl -sL "https://gwfh.mranftl.com/api/fonts/ibm-plex-mono?download=zip&subsets=latin&variants=regular,600&formats=woff2" -o ipm.zip
unzip -o is.zip && unzip -o ipm.zip && rm is.zip ipm.zip
ls
```
Expected: five `.woff2` files (instrument-sans regular/600/italic; ibm-plex-mono regular/600). Note their exact filenames for Step 3. If the API is unavailable, fetch the Google Fonts css2 URL from the handoff with a desktop browser User-Agent, extract the `latin` woff2 URLs, and download those instead.

- [ ] **Step 2: Create `public/styles.css` with font-face + base**

Use the exact filenames from Step 1 in the `src` URLs.

```css
/* ---- Self-hosted fonts ---- */
@font-face {
  font-family: 'Instrument Sans';
  font-style: normal; font-weight: 400; font-display: swap;
  src: url('fonts/instrument-sans-v6-latin-regular.woff2') format('woff2');
}
@font-face {
  font-family: 'Instrument Sans';
  font-style: normal; font-weight: 600; font-display: swap;
  src: url('fonts/instrument-sans-v6-latin-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Instrument Sans';
  font-style: italic; font-weight: 400; font-display: swap;
  src: url('fonts/instrument-sans-v6-latin-italic.woff2') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal; font-weight: 400; font-display: swap;
  src: url('fonts/ibm-plex-mono-v19-latin-regular.woff2') format('woff2');
}
@font-face {
  font-family: 'IBM Plex Mono';
  font-style: normal; font-weight: 600; font-display: swap;
  src: url('fonts/ibm-plex-mono-v19-latin-600.woff2') format('woff2');
}

/* ---- Reset / base ---- */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--tx);
  font-family: 'Instrument Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
svg { display: block; }
```

(Token variables `--bg`/`--tx` are defined in Task 4; if a section is rendered before Task 4, the page shows unstyled colors, which is fine for this task's verification.)

- [ ] **Step 3: Link the stylesheet and preload fonts in `index.html` head**

Add inside `<head>` (after the `<title>`), using the two most-used weights for preload:

```html
  <link rel="preload" href="/fonts/instrument-sans-v6-latin-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/ibm-plex-mono-v19-latin-regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
```

- [ ] **Step 4: Verify fonts load**

Run: `cd /Users/mikeroberts/Code/robertsmj && npx wrangler dev --port 8787` then open `http://localhost:8787/` in the browser (chrome-devtools MCP). In the Network panel confirm the woff2 files return 200 and the scaffold text renders in Instrument Sans.
Expected: fonts 200, no 404s, text in the sans face.

- [ ] **Step 5: Commit**

```bash
git add public/fonts public/styles.css public/index.html
git commit -m "Self-host Instrument Sans and IBM Plex Mono, add base stylesheet"
```

---

## Task 4: Design tokens, no-flash theme init, and toggle

**Files:**
- Modify: `public/styles.css` (token sets)
- Modify: `public/index.html` (no-flash inline script, load `main.js`)
- Create: `public/main.js`

**Interfaces:**
- Consumes: `resolveTheme`, `nextTheme`, `THEMES`, `STORAGE_KEY` from `theme.js`.
- Produces: `--bg --l1 --l2 --ac --wm --lk --tx --tx2` custom properties resolved per theme; a `[data-theme-toggle]` button contract (later tasks render the actual button in the top bar); `main.js` wires the toggle and sets `--hero-scale` (used in Task 5).

- [ ] **Step 1: Add token sets to `styles.css` (top, after `@font-face`)**

```css
/* ---- Theme tokens ---- */
:root, [data-theme="dark"] {
  --bg: #0A1414; --l1: #1E4038; --l2: #37705C; --ac: #5FD4A0;
  --wm: #E5B36A; --lk: rgba(95,212,160,.08); --tx: #F2F5F1; --tx2: #9FB8AB;
  --cta-tx: var(--bg);
}
[data-theme="light"] {
  --bg: #F7F6EF; --l1: #D5DCCB; --l2: #7FA08C; --ac: #1F7A4D;
  --wm: #C08430; --lk: rgba(31,122,77,.08); --tx: #1C201C; --tx2: #5D685C;
  --cta-tx: #F7F6EF;
}
```

- [ ] **Step 2: Add the no-flash inline script to `index.html` head**

Place as the FIRST element inside `<head>` (before any stylesheet link) so it runs before first paint. It hand-inlines the same logic as `resolveTheme` (must stay in sync with `theme.js`):

```html
  <script>
    /* No-flash theme init. Mirrors resolveTheme() in theme.js. */
    (function () {
      try {
        var s = localStorage.getItem('theme');
        var t = (s === 'dark' || s === 'light')
          ? s
          : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
```

Also remove the hardcoded `data-theme="dark"` from the `<html>` tag (the script now sets it); keep `lang="en"`.

- [ ] **Step 3: Load `main.js` as a module**

Add just before `</body>` in `index.html`:

```html
  <script type="module" src="/main.js"></script>
```

- [ ] **Step 4: Create `public/main.js`**

```js
import { nextTheme, THEMES, STORAGE_KEY } from './theme.js';

const root = document.documentElement;

/* ---- Theme toggle ---- */
function currentTheme() {
  return root.getAttribute('data-theme') === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
}

function syncTogglePressed(theme) {
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    btn.setAttribute('aria-pressed', String(theme === THEMES.DARK));
  }
}

function initThemeToggle() {
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  syncTogglePressed(currentTheme());
  btn.addEventListener('click', () => {
    const next = nextTheme(currentTheme());
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    root.setAttribute('data-theme', next);
    syncTogglePressed(next);
  });
}

/* ---- Hero canvas scaling ----
   The hero is a fixed design canvas (1440x760 desktop, 390x760 mobile) so the
   pixel-positioned animation overlays stay aligned. Scale it to viewport width. */
const DESKTOP_W = 1440;
const MOBILE_W = 390;
const DESIGN_H = 760;
const mobileQuery = matchMedia('(max-width: 768px)');

function setHeroScale() {
  const designW = mobileQuery.matches ? MOBILE_W : DESKTOP_W;
  const scale = window.innerWidth / designW;
  root.style.setProperty('--hero-scale', String(scale));
  root.style.setProperty('--hero-h', `${DESIGN_H * scale}px`);
}

function init() {
  initThemeToggle();
  setHeroScale();
  window.addEventListener('resize', setHeroScale);
  mobileQuery.addEventListener('change', setHeroScale);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

- [ ] **Step 5: Temporary toggle button for verification**

Temporarily add inside `<body>` (removed/replaced by the real top bar in Task 5):

```html
  <button data-theme-toggle type="button" aria-label="Toggle color theme">toggle</button>
```

- [ ] **Step 6: Verify toggle + persistence + no flash**

Run `npx wrangler dev --port 8787`, open in browser.
Expected: clicking the button flips `data-theme` on `<html>` and the body background swaps between `#0A1414` and `#F7F6EF`. Reload: theme persists and there is no flash of the wrong background. Confirm `node --test` still passes.

- [ ] **Step 7: Commit**

```bash
git add public/styles.css public/index.html public/main.js
git commit -m "Add theme tokens, no-flash init, working theme toggle and hero-scale setter"
```

---

## Task 5: SVG symbol library, hero, and terrain animations

**Files:**
- Modify: `public/index.html` (inline `<defs>`, hero markup)
- Modify: `public/styles.css` (keyframes, hero layout, top bar, CTAs, toggle)

**Interfaces:**
- Consumes: token vars, `--hero-scale`, `--hero-h` from Task 4.
- Produces: `#svgB`, `#svgBm`, glyph/schematic/hobby symbols available for `<use>` in later tasks; the real `[data-theme-toggle]` button in the top bar (replaces the temporary one).

- [ ] **Step 1: Inline the SVG symbol library**

Copy the entire `<svg width="0" height="0" ...><defs>...</defs></svg>` block verbatim from `docs/design-handoff/robertsmj Directions.dc.html` lines 11-64 and paste it as the first element inside `<body>`. This defines `#svgB #svgBm #icTs #icShop #icCloud #icRemix #icGql #icNode #icSprout #icMush #icPrinter #icWrench #icKite #icBolt #schAb #schTheme #schEdge`. Do not edit the paths.

- [ ] **Step 2: Add the keyframes to `styles.css`**

```css
/* ---- Motion ---- */
@keyframes wipe { to { clip-path: inset(0 0 0 0); } }
@keyframes pulse { 0% { transform: scale(.4); opacity: .9; } 70% { transform: scale(2.2); opacity: 0; } 100% { transform: scale(2.2); opacity: 0; } }
@keyframes travel { 0% { offset-distance: 0%; opacity: 0; } 4% { opacity: 1; } 92% { opacity: 1; } 100% { offset-distance: 100%; opacity: 0; } }
@keyframes drift { from { transform: translateY(0); } to { transform: translateY(-9px); } }
@keyframes scan { 0% { opacity: .85; transform: translateX(0); } 80% { opacity: .6; } 100% { opacity: 0; transform: translateX(1438px); } }
@keyframes scanM { 0% { opacity: .85; transform: translateX(0); } 80% { opacity: .6; } 100% { opacity: 0; transform: translateX(388px); } }
@keyframes ridgeDraw { 0% { stroke-dashoffset: 1; opacity: 1; } 70% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes glint { 0%, 100% { opacity: 0; } 50% { opacity: .45; } }
@keyframes smoke { 0% { transform: translate(0,0) scale(.6); opacity: 0; } 15% { opacity: .5; } 100% { transform: translate(7px,-46px) scale(1.5); opacity: 0; } }
```

- [ ] **Step 3: Add hero layout, top bar, CTA and toggle styles to `styles.css`**

```css
/* ---- Hero ---- */
.hero { position: relative; height: var(--hero-h, 760px); overflow: hidden; }
.hero__stage { position: absolute; top: 0; left: 0; width: 1440px; height: 760px;
  transform: scale(var(--hero-scale, 1)); transform-origin: top left; }
.hero__stage--mobile { width: 390px; display: none; }
@media (max-width: 768px) {
  .hero__stage--desktop { display: none; }
  .hero__stage--mobile { display: block; }
}
.hero__terrain { position: absolute; inset: 0; animation: drift 9s ease-in-out 2.6s infinite alternate; }
.hero__terrain use { clip-path: inset(0 100% 0 0); animation: wipe 1.6s cubic-bezier(.4,0,.2,1) .1s forwards; }
.hero__ridge { position: absolute; inset: 0; pointer-events: none; }
.hero__ridge path { fill: none; stroke: var(--ac); stroke-width: 2; stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: ridgeDraw 2.4s cubic-bezier(.4,0,.2,1) .1s forwards; }

/* ---- Top bar ---- */
.topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 2;
  display: flex; justify-content: space-between; align-items: center; padding: 22px 48px; }
.wordmark { font: 600 13px/1 'IBM Plex Mono', monospace; color: var(--tx); letter-spacing: .04em; }
.nav { display: flex; align-items: center; gap: 28px; }
.nav a { font: 400 13px/1 'Instrument Sans', sans-serif; color: var(--tx2); transition: color .15s ease; }
.nav a:hover { color: var(--tx); }
.toggle { width: 34px; height: 18px; border: 1px solid var(--tx2); border-radius: 9px; background: none;
  display: inline-flex; align-items: center; padding: 0 2px; cursor: pointer; justify-content: flex-end; }
[data-theme="light"] .toggle { justify-content: flex-start; }
.toggle__knob { width: 12px; height: 12px; border-radius: 50%; background: var(--ac); transition: all .2s ease; }
@media (max-width: 768px) {
  .topbar { padding: 18px 20px; }
  .nav a { display: none; }
}

/* ---- Hero content ---- */
.hero__content { position: absolute; left: 0; right: 0; top: 170px; z-index: 2;
  display: flex; flex-direction: column; gap: 26px; align-items: center; text-align: center; padding: 0 48px; }
.hero__name { font: 600 80px/1.02 'Instrument Sans', sans-serif; color: var(--tx); letter-spacing: -.02em; }
.hero__sub { font: 400 22px/1.5 'Instrument Sans', sans-serif; color: var(--tx2); max-width: 560px; }
.hero__cta { display: flex; align-items: center; gap: 24px; margin-top: 6px; }
@media (max-width: 768px) {
  .hero__content { top: 160px; align-items: flex-start; text-align: left; gap: 20px; left: 24px; right: 24px; padding: 0; }
  .hero__name { font-size: 46px; line-height: 1.05; }
  .hero__sub { font-size: 17px; line-height: 1.55; }
}

/* ---- Buttons ---- */
.btn { background: var(--ac); color: var(--cta-tx); font: 600 15px/1 'Instrument Sans', sans-serif;
  padding: 15px 26px; border-radius: 6px; transition: filter .15s ease; }
.btn:hover { filter: brightness(1.08); }
.textlink { font: 400 15px/1 'Instrument Sans', sans-serif; color: var(--tx);
  border-bottom: 1px solid var(--l2); padding-bottom: 3px; }
```

- [ ] **Step 4: Build the hero markup in `index.html`**

Replace the temporary toggle button with the hero. The desktop stage's terrain SVG and overlay spans are lifted verbatim from the dark full-page artboard (`docs/design-handoff/robertsmj Directions.dc.html` lines 186-198); the mobile stage's from lines 144-150. The overlay spans already use `var(--ac)`/`var(--wm)`, so they theme automatically. Strip any inline `--bg:...` token declarations. Structure:

```html
<header class="hero">
  <!-- DESKTOP stage: terrain + ridge draw + overlay spans -->
  <div class="hero__stage hero__stage--desktop">
    <svg class="hero__terrain" width="1440" height="760"><use href="#svgB"></use></svg>
    <svg class="hero__ridge" width="1440" height="760"><path pathLength="1" d="M0,610 L140,520 L300,600 L430,470 L560,588 L700,430 L840,580 L980,455 L1120,592 L1260,495 L1440,596"></path></svg>
    <!-- Overlay spans: copy VERBATIM from design file lines 188-198 (scan line, lake glints,
         campfire, smoke rings, traveling amber dot, three peak pulses). -->
  </div>
  <!-- MOBILE stage -->
  <div class="hero__stage hero__stage--mobile">
    <svg class="hero__terrain" width="390" height="760"><use href="#svgBm"></use></svg>
    <svg class="hero__ridge" width="390" height="760"><path pathLength="1" d="M0,640 L70,580 L140,632 L200,550 L260,624 L330,570 L390,634"></path></svg>
    <!-- Overlay spans: copy VERBATIM from design file lines 146-150 (scanM, glint, travel dot, two pulses). -->
  </div>

  <div class="topbar">
    <span class="wordmark">robertsmj.com</span>
    <nav class="nav">
      <a href="#work">The work</a>
      <a href="#off-the-clock">Off the clock</a>
      <a href="#contact">Contact</a>
      <button class="toggle" data-theme-toggle type="button" aria-label="Toggle color theme" aria-pressed="true"><span class="toggle__knob"></span></button>
    </nav>
  </div>

  <div class="hero__content">
    <div class="hero__name">Mike Roberts</div>
    <div class="hero__sub">Senior full-stack engineer. Idaho roots, production systems, and dirt under the fingernails.</div>
    <div class="hero__cta">
      <a class="btn" href="mailto:mike@robertsmj.com">Hiring? Let's talk</a>
      <a class="textlink" href="#work">The work &darr;</a>
    </div>
  </div>
</header>
```

Note: the `.hero__ridge path` and `.hero__terrain use` animation properties come from CSS (Step 3), so remove the inline `style="animation:..."`/`stroke:...` from the lifted `<use>`/`<path>` where the class already sets them; keep inline `style` only on the coordinate-bearing overlay spans.

- [ ] **Step 5: Verify hero fidelity in both themes and at both widths**

Run `npx wrangler dev --port 8787`. In the browser (chrome-devtools MCP): at 1440px wide, screenshot and compare against the "Full page desktop dark" hero (design lines 184-216) and toggle to light. Resize to 390px and compare against the mobile hero artboards.
Expected: terrain wipes in once on load, ridgeline draws, amber dot travels the ridge on loop, peaks pulse, drift is visible; layout matches the artboards in both themes; hero scales cleanly with the window with overlays staying aligned to the terrain.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "Add SVG symbol library, animated terrain hero, top bar and CTAs"
```

---

## Task 6: WHAT I DO and SELECTED WORK sections

**Files:**
- Modify: `public/index.html` (two sections after the hero)
- Modify: `public/styles.css` (content measure, kicker, prose, stack chips, work cards)

**Interfaces:**
- Consumes: token vars; symbols `#icTs #icShop #icCloud #icRemix #icGql #icNode #schAb #schTheme #schEdge`.
- Produces: `#work` anchor target; `.wrap`, `.kicker`, `.rule` reused by Tasks 7-9.

- [ ] **Step 1: Add layout, kicker, prose, stack, and work-card styles**

```css
/* ---- Content layout ---- */
.wrap { width: min(760px, 100% - 48px); margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
.content { display: flex; flex-direction: column; align-items: center; padding: 120px 0 0; }
.rule { width: min(760px, 100% - 48px); height: 1px; background: var(--l1); margin: 88px auto; }
.kicker { font: 600 12px/1 'IBM Plex Mono', monospace; color: var(--ac); letter-spacing: .16em; text-transform: uppercase; }
.prose { font: 400 19px/1.7 'Instrument Sans', sans-serif; color: var(--tx); }

/* ---- Stack strip ---- */
.stack { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 22px; margin-top: 8px; }
.stack span { display: inline-flex; align-items: center; gap: 8px; font: 400 13px/1 'IBM Plex Mono', monospace;
  color: var(--tx2); letter-spacing: .08em; }
.stack svg { width: 17px; height: 17px; color: var(--ac); }

/* ---- Selected work ---- */
.work-list { display: flex; flex-direction: column; gap: 18px; }
.work-card { display: grid; grid-template-columns: 150px 1fr; gap: 28px; align-items: center;
  border: 1px solid var(--l1); border-radius: 8px; padding: 20px 26px; transition: border-color .15s ease; }
.work-card:hover { border-color: var(--l2); }
.work-card__body { display: flex; flex-direction: column; gap: 8px; }
.work-card__title { font: 600 18px/1.3 'Instrument Sans', sans-serif; color: var(--tx); }
.work-card__desc { font: 400 15px/1.6 'Instrument Sans', sans-serif; color: var(--tx2); }
.work-card__meta { font: 400 11px/1.5 'IBM Plex Mono', monospace; color: var(--ac); letter-spacing: .1em; }
@media (max-width: 768px) {
  .content { padding: 80px 0 0; }
  .work-card { grid-template-columns: 1fr; gap: 16px; }
}
```

- [ ] **Step 2: Add the WHAT I DO and SELECTED WORK markup**

Wrap all body sections below the hero in `<main class="content">`. Lift copy and the stack/schematic `<use>` references verbatim from the design file: WHAT I DO from lines 217-229, SELECTED WORK from lines 231-238. Convert inline styles to the classes above.

```html
<main class="content">
  <section class="wrap" aria-labelledby="whatido">
    <div class="kicker" id="whatido">WHAT I DO</div>
    <p class="prose">I lead a team building A/B testing infrastructure and theme platforms for high-volume Shopify storefronts. The job is shipping experiments to millions of sessions without breaking checkout. I care about systems that stay fast, measurable, and boring to operate. Fifteen years across the stack, the last several at e-commerce scale.</p>
    <div class="stack">
      <span><svg viewBox="0 0 24 24"><use href="#icTs"></use></svg>TYPESCRIPT</span>
      <span><svg viewBox="0 0 24 24"><use href="#icShop"></use></svg>SHOPIFY / LIQUID</span>
      <span><svg viewBox="0 0 24 24"><use href="#icCloud"></use></svg>CLOUDFLARE WORKERS</span>
      <span><svg viewBox="0 0 24 24"><use href="#icRemix"></use></svg>REMIX</span>
      <span><svg viewBox="0 0 24 24"><use href="#icGql"></use></svg>GRAPHQL</span>
      <span><svg viewBox="0 0 24 24"><use href="#icNode"></use></svg>NODE</span>
    </div>
  </section>

  <hr class="rule">

  <section class="wrap" id="work" aria-labelledby="work-h">
    <div class="kicker" id="work-h">SELECTED WORK</div>
    <div class="work-list">
      <article class="work-card">
        <svg width="150" height="90" viewBox="0 0 150 90"><use href="#schAb"></use></svg>
        <div class="work-card__body">
          <div class="work-card__title">A/B testing platform</div>
          <div class="work-card__desc">Server-side experimentation for high-volume storefronts, variant delivery at the edge, zero flicker, checkout untouched.</div>
          <div class="work-card__meta">EDGE DELIVERY &middot; ZERO FLICKER &middot; MILLIONS OF SESSIONS</div>
        </div>
      </article>
      <article class="work-card">
        <svg width="150" height="90" viewBox="0 0 150 90"><use href="#schTheme"></use></svg>
        <div class="work-card__body">
          <div class="work-card__title">Theme platform</div>
          <div class="work-card__desc">One Shopify theme architecture powering multiple brands from a single codebase.</div>
          <div class="work-card__meta">ONE CODEBASE &middot; EVERY BRAND &middot; SHOPIFY / LIQUID</div>
        </div>
      </article>
      <article class="work-card">
        <svg width="150" height="90" viewBox="0 0 150 90"><use href="#schEdge"></use></svg>
        <div class="work-card__body">
          <div class="work-card__title">Edge tooling</div>
          <div class="work-card__desc">Cloudflare Workers services for routing, personalization, and analytics capture.</div>
          <div class="work-card__meta">CLOUDFLARE WORKERS &middot; ROUTING &middot; PERSONALIZATION</div>
        </div>
      </article>
    </div>
  </section>
</main>
```

Note: the original card descriptions and the WHAT-I-DO paragraph use em dashes in the design copy. The design copy is final; reproduce the punctuation exactly as it appears in the design file (do not substitute), except where an entity (`&middot;`) is used for the mid-dots in meta lines to match the rendered glyph.

- [ ] **Step 3: Verify against artboards**

Render and compare the two sections against design lines 217-238 in both themes. Confirm the `#work` anchor scrolls correctly from the nav and the hero "The work" link.
Expected: kicker/prose/stack and three work cards match; hover lifts card borders to `--l2`.

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "Add WHAT I DO and SELECTED WORK sections"
```

---

## Task 7: OFF THE CLOCK grid and AI aside

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`

**Interfaces:**
- Consumes: `.wrap`, `.kicker`, `.rule`, token vars; symbols `#icSprout #icMush #icPrinter #icWrench #icKite #icBolt`.
- Produces: `#off-the-clock` anchor target.

- [ ] **Step 1: Add hobby-grid and aside styles**

```css
/* ---- Off the clock ---- */
.hobby-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.hobby-card { border: 1px dashed var(--l2); border-radius: 8px; padding: 20px 22px;
  display: flex; flex-direction: column; gap: 10px; transition: border-color .15s ease; }
.hobby-card svg { width: 22px; height: 22px; color: var(--ac); }
.hobby-card__title { font: 600 13px/1.3 'IBM Plex Mono', monospace; color: var(--tx); letter-spacing: .1em; }
.hobby-card__body { font: 400 15px/1.6 'Instrument Sans', sans-serif; color: var(--tx2); }
@media (max-width: 768px) { .hobby-grid { grid-template-columns: 1fr; } }

/* ---- AI aside ---- */
.aside { width: min(760px, 100% - 48px); margin: 96px auto 72px; display: flex; flex-direction: column;
  align-items: center; gap: 18px; }
.aside__rule { width: 64px; height: 1px; background: var(--l2); }
.aside__text { font: italic 400 15px/1.6 'Instrument Sans', sans-serif; color: var(--tx2); max-width: 620px; text-align: center; }
```

- [ ] **Step 2: Add markup (copy verbatim from design lines 240-254)**

Add inside `<main class="content">` after the SELECTED WORK section:

```html
  <hr class="rule">

  <section class="wrap" id="off-the-clock" aria-labelledby="otc-h">
    <div class="kicker" id="otc-h">OFF THE CLOCK</div>
    <div class="hobby-grid">
      <article class="hobby-card"><svg viewBox="0 0 24 24"><use href="#icSprout"></use></svg><div class="hobby-card__title">DIRT OPS</div><div class="hobby-card__body">Twelve raised beds and a food-security spreadsheet that is, frankly, a little intense.</div></article>
      <article class="hobby-card"><svg viewBox="0 0 24 24"><use href="#icMush"></use></svg><div class="hobby-card__title">THE FUNGUS PIPELINE</div><div class="hobby-card__body">Oak logs drilled, plugged, and waxed by hand. Deploy cycle: two years.</div></article>
      <article class="hobby-card"><svg viewBox="0 0 24 24"><use href="#icPrinter"></use></svg><div class="hobby-card__title">PRINT FARM</div><div class="hobby-card__body">Two printers running. The replacement part was modeled before the original broke.</div></article>
      <article class="hobby-card"><svg viewBox="0 0 24 24"><use href="#icWrench"></use></svg><div class="hobby-card__title">GERMAN CAR THERAPY</div><div class="hobby-card__body">Diagnosed a BMW water pump for fun. The fun part is being right.</div></article>
      <article class="hobby-card"><svg viewBox="0 0 24 24"><use href="#icKite"></use></svg><div class="hobby-card__title">DAD MODE</div><div class="hobby-card__body">Raising kids who know where food comes from and how to find a stud without an app.</div></article>
      <article class="hobby-card"><svg viewBox="0 0 24 24"><use href="#icBolt"></use></svg><div class="hobby-card__title">WHATEVER BREAKS NEXT</div><div class="hobby-card__body">There is always something. That is kind of the appeal.</div></article>
    </div>
  </section>

  <div class="aside">
    <span class="aside__rule"></span>
    <div class="aside__text">Yes, an engineer used AI to build his own website. I ship with the best tools available, that's kind of the point.</div>
  </div>
</main>
```

(Reproduce the design's copy punctuation exactly; the two sentences above show comma substitution only for illustration. Match the design file's exact wording.)

- [ ] **Step 3: Verify against design lines 240-254 in both themes**

Expected: 2-column dashed-border grid of six cards, then the centered short rule + italic aside; `#off-the-clock` anchor scrolls from the nav.

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "Add OFF THE CLOCK grid and AI aside"
```

---

## Task 8: Footer / contact

**Files:**
- Modify: `public/index.html` (footer, after `</main>`)
- Modify: `public/styles.css`

**Interfaces:**
- Consumes: token vars, `#svgB`, `.btn`.
- Produces: `#contact` anchor target; contact links (mailto, GitHub, LinkedIn, Resume).

- [ ] **Step 1: Add footer styles**

```css
/* ---- Footer ---- */
.footer { position: relative; overflow: hidden; }
.footer__ridge { position: absolute; left: 0; bottom: 0; width: 100%; height: 240px; }
.footer__inner { position: relative; z-index: 2; padding: 70px 96px 48px; display: flex; flex-direction: column; gap: 36px; }
.footer__top { display: flex; align-items: center; justify-content: space-between; }
.footer__headline { font: 600 34px/1.1 'Instrument Sans', sans-serif; color: var(--tx); letter-spacing: -.01em; }
.footer__bottom { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; }
.footer__links { display: flex; gap: 28px; }
.footer__links a { font: 400 13px/1 'IBM Plex Mono', monospace; color: var(--tx); transition: color .15s ease; }
.footer__links a:hover { color: var(--ac); }
.footer__copy { font: 400 11px/1 'IBM Plex Mono', monospace; color: var(--tx); }
@media (max-width: 768px) {
  .footer__inner { padding: 60px 24px 40px; }
  .footer__top, .footer__bottom { flex-direction: column; align-items: flex-start; gap: 24px; }
  .footer__links { flex-wrap: wrap; gap: 16px 28px; }
}
```

- [ ] **Step 2: Add footer markup**

The ridge SVG is `#svgB` cropped to its bottom, lifted from design line 257 (`viewBox="0 470 1440 290"`, `preserveAspectRatio="none"`, static, no animation). GitHub pre-filled to Mike's handle; LinkedIn and Resume are stubs to be filled when Mike supplies them.

```html
<footer class="footer" id="contact">
  <svg class="footer__ridge" viewBox="0 470 1440 290" preserveAspectRatio="none"><use href="#svgB"></use></svg>
  <div class="footer__inner">
    <div class="footer__top">
      <div class="footer__headline">Sound like your kind of engineer?</div>
      <a class="btn" href="mailto:mike@robertsmj.com">Hiring? Let's talk</a>
    </div>
    <div class="footer__bottom">
      <div class="footer__links">
        <a href="mailto:mike@robertsmj.com">mike@robertsmj.com</a>
        <a href="https://github.com/robertsmikej" target="_blank" rel="noopener">GitHub</a>
        <a href="#" data-stub="linkedin" target="_blank" rel="noopener">LinkedIn</a>
        <a href="/resume.pdf" data-stub="resume" target="_blank" rel="noopener">Resume (PDF)</a>
      </div>
      <span class="footer__copy">&copy; 2026 MIKE ROBERTS &mdash; TREASURE VALLEY, IDAHO</span>
    </div>
  </div>
</footer>
```

The `data-stub` attributes mark links awaiting real URLs/assets from Mike; leave a code comment noting they must be updated before the domain goes live.

- [ ] **Step 3: Verify against design lines 256-273 in both themes**

Expected: footer ridge terrain sits behind the headline + CTA and the link row + copyright; ridge stretches full width; `#contact` anchor scrolls from the nav; mailto links open a compose window to mike@robertsmj.com.

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "Add footer/contact with ridge terrain and contact links"
```

---

## Task 9: Reduced motion, responsive polish, accessibility pass

**Files:**
- Modify: `public/styles.css`
- Modify: `public/index.html` (aria/semantics touch-ups only)

**Interfaces:**
- Consumes: everything prior.
- Produces: a reduced-motion-safe, mobile-correct, accessible page.

- [ ] **Step 1: Add the reduced-motion override to `styles.css`**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; }
  .hero__terrain use { clip-path: none !important; }
  .hero__ridge path { stroke-dashoffset: 0 !important; opacity: 0 !important; }
  html { scroll-behavior: auto; }
}
```

This instantly completes the reveal (terrain fully shown, ridge overlay hidden as at animation end) and stops all ambient loops.

- [ ] **Step 2: Verify reduced motion**

In the browser (chrome-devtools MCP) emulate `prefers-reduced-motion: reduce` and reload.
Expected: terrain is shown in its final state immediately, no wipe/drift/travel/pulse/glint/smoke motion, page still fully legible in both themes.

- [ ] **Step 3: Responsive sweep**

Check widths 1440, 1024, 768, 390 in the browser.
Expected: no horizontal scroll; nav links hidden at/below 768px (wordmark + toggle remain); content single-column at 24px gutters; hobby grid one column; work cards stack; footer stacks; hero uses `#svgBm` at/below 768px and scales cleanly.

- [ ] **Step 4: Accessibility check**

Confirm: `header`/`main`/`footer`/`nav`/`section` landmarks present; each section has a heading association (`aria-labelledby`); the toggle is a `<button>` with `aria-label` and `aria-pressed` that flips on click; decorative SVGs are `aria-hidden="true"` (add to the `<defs>` wrapper and the terrain/ridge/glyph `<svg>`s that are purely decorative). Run the chrome-devtools `lighthouse_audit` accessibility category.
Expected: Lighthouse accessibility >= 95; no critical contrast failures in either theme (pay attention to `--tx2` on light).

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "Add reduced-motion support, responsive polish, accessibility pass"
```

---

## Task 10: Head, SEO, favicon, and optional OG image

**Files:**
- Modify: `public/index.html` (head)
- Create: `public/favicon.svg`
- Create (optional): `public/og.png`

**Interfaces:**
- Produces: complete document head; browser-tab favicon.

- [ ] **Step 1: Create `public/favicon.svg` (mint ridgeline on the dark bg)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0A1414"/>
  <path d="M2,24 L8,15 L13,21 L19,10 L24,19 L30,12" fill="none" stroke="#5FD4A0" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Complete the `<head>`**

Add/confirm inside `<head>` (title/description authored without em dashes; keep the no-flash script first, preloads and stylesheet as already present):

```html
  <meta name="description" content="Mike Roberts, senior full-stack engineer in Idaho. A/B testing infrastructure and theme platforms for high-volume Shopify storefronts.">
  <meta name="theme-color" content="#0A1414" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#F7F6EF" media="(prefers-color-scheme: light)">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="https://robertsmj.com/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Mike Roberts, senior full-stack engineer">
  <meta property="og:description" content="Idaho roots, production systems, and dirt under the fingernails.">
  <meta property="og:url" content="https://robertsmj.com/">
  <meta property="og:image" content="https://robertsmj.com/og.png">
  <meta name="twitter:card" content="summary_large_image">
```

- [ ] **Step 3 (optional): Generate `public/og.png` (1200x630)**

Build a temporary 1200x630 HTML page reusing the dark hero terrain + name/subtitle, open it in the browser (chrome-devtools MCP), set viewport to 1200x630, and `take_screenshot` (png) into `public/og.png`. If skipped, remove the `og:image` line or leave it pointing at a to-be-added file and note it as a stub.

- [ ] **Step 4: Verify head**

Render; confirm the favicon shows in the tab, `<title>` is correct, and validate the OG tags (view source). Confirm no em dashes in authored head/meta strings.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/favicon.svg public/og.png
git commit -m "Add favicon, SEO meta, Open Graph tags and OG image"
```

---

## Task 11: Full verification and Phase A deploy (workers.dev)

**Files:** none (verification + deploy)

**Interfaces:**
- Produces: a live `*.workers.dev` preview URL, zero DNS risk.

- [ ] **Step 1: Run the unit tests**

Run: `cd /Users/mikeroberts/Code/robertsmj && node --test`
Expected: PASS.

- [ ] **Step 2: Full local render pass**

Run `npx wrangler dev`. Compare every section against its artboard in both themes at 1440 and 390 widths (chrome-devtools MCP screenshots). Confirm: reveal plays once; ambient loops run; toggle persists with no flash; all anchors scroll; both mailto CTAs work; no console errors; no 404s.
Expected: matches the `3a` direction; clean console/network.

- [ ] **Step 3: Lighthouse pass**

Run the chrome-devtools `lighthouse_audit` (performance + accessibility) against the local dev URL.
Expected: performance and accessibility both >= 95 (self-hosted fonts + no JS deps should make this easy). Record the scores.

- [ ] **Step 4: Authenticate and deploy to workers.dev**

If not logged in, ask Mike to run `! npx wrangler login` in this session (interactive OAuth). Then:
Run: `cd /Users/mikeroberts/Code/robertsmj && npx wrangler deploy`
Expected: deploy succeeds; note the `https://robertsmj.<subdomain>.workers.dev` URL.

- [ ] **Step 5: Verify the live preview**

Open the workers.dev URL in the browser; repeat the smoke checks from Step 2 against the live URL.
Expected: identical behavior to local.

- [ ] **Step 6: Commit any deploy-config tweaks and update the repo README**

Create a short top-level `README.md` (dev/deploy/test commands, stack, deploy notes) if not already present, then:
```bash
git add -A
git commit -m "Deploy to workers.dev preview; add project README"
```

---

## Task 12 (GATED, do not run without Mike's go-ahead): Custom domain + DNS

**Files:** possibly `wrangler.jsonc` (routes) or dashboard config.

This step points robertsmj.com at the Worker. It touches DNS, which carries the iCloud email. Do NOT run any nameserver change until each verification below is confirmed and Mike has explicitly approved the cutover. Roll back by restoring the original nameservers.

- [ ] **Step 1: Inventory current DNS (evidence first)**

Run: `dig robertsmj.com NS +short; dig robertsmj.com MX +short; dig robertsmj.com TXT +short; dig www.robertsmj.com CNAME +short; dig sig1._domainkey.robertsmj.com CNAME +short`
Record every record, especially MX (iCloud), SPF TXT, the apple-domain verification TXT, and DKIM CNAME(s). Also export the full record set from the Squarespace Domains dashboard.

- [ ] **Step 2: Add the zone to Cloudflare and replicate records**

Add robertsmj.com to Cloudflare (Mike's personal Cloudflare account). Let Cloudflare scan/import, then diff the imported records against Step 1. Manually add any missing email records (MX, SPF, apple TXT, DKIM). Confirm every email record from Step 1 is present and correct in Cloudflare before touching nameservers.

- [ ] **Step 3: Switch nameservers**

Only after Step 2 is verified: at Squarespace Domains, change the nameservers to the Cloudflare-assigned pair. Wait for propagation.

- [ ] **Step 4: Attach the Worker custom domain**

In the Cloudflare dashboard (Workers > robertsmj > Domains & Routes) add `robertsmj.com` and `www.robertsmj.com` as custom domains. Confirm HTTPS is issued.

- [ ] **Step 5: Prove email still works**

Send a test message to mike@robertsmj.com and confirm delivery to the iCloud inbox, and send one from it. Do not consider the cutover complete until email round-trips.

- [ ] **Step 6: Final live verification**

Load https://robertsmj.com/ and https://www.robertsmj.com/, confirm the site + HTTPS, re-run Lighthouse against the production URL.

- [ ] **Step 7: Commit any config changes**

```bash
git add -A
git commit -m "Attach robertsmj.com custom domain to the Worker"
```

---

## Self-Review

- **Spec coverage:** hero, WHAT I DO, SELECTED WORK, OFF THE CLOCK, AI aside, footer (Tasks 5-8); tokens/type/artwork (Tasks 4-8); reveal + ambient motion + reduced-motion (Tasks 5, 9); theme toggle/persistence/no-flash (Tasks 2, 4); responsive + hidden mobile nav (Tasks 5-9); self-hosted fonts (Task 3); mailto CTAs (Tasks 5, 8); head/SEO/favicon/OG (Task 10); accessibility (Task 9); Cloudflare Workers static-assets hosting + workers.dev preview (Tasks 1, 11); DNS-safe custom-domain cutover (Task 12). All spec sections mapped.
- **Placeholders:** the only stubs are the LinkedIn URL and resume.pdf, which the spec explicitly defers to Mike; they are marked `data-stub` with a required-before-launch note, not silent gaps.
- **Type consistency:** `resolveTheme`/`nextTheme`/`THEMES`/`STORAGE_KEY` are defined in Task 2 and consumed unchanged in Task 4; CSS class names (`.wrap`, `.kicker`, `.rule`, `.btn`, `.hero__*`, `.work-card*`, `.hobby-card*`, `.footer__*`) and anchor ids (`#work`, `#off-the-clock`, `#contact`) are introduced once and reused consistently; `--hero-scale`/`--hero-h` set in `main.js` (Task 4) are consumed by `.hero`/`.hero__stage` CSS (Task 5).

## Notes for the implementer

- Reproduce the design copy's wording and punctuation exactly (it is final and Mike's voice). The em-dash-avoidance rule applies only to newly authored strings (head/meta), not to the design copy you are transcribing.
- Prefer copying the large SVG blocks and coordinate-bearing overlay spans verbatim from the handoff file over retyping them, to avoid path/coordinate transcription errors.
- Keep files focused: markup in `index.html`, all styling in `styles.css`, pure logic in `theme.js`, DOM wiring in `main.js`.
