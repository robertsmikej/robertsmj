# robertsmj.com — Coding Standards Pass

Date: 2026-07-25
Branch: `chore/coding-standards`
Status: In progress

## Why

The site shipped fast and looks right, but it never got a standards pass. Concretely: no formatter,
no linter, no static checking, no CI beyond "deploy runs `npm test`", 81 lines of JS with two silent
`catch {}` blocks, 17 inline `style="..."` blobs in the hero, `<div>`s doing `<h3>`'s job, and exactly
zero test coverage of `main.js` (the only file with real behavior).

House standards come from `farmhand/resources/instructions.md` (injected into every session) plus its
near-verbatim forks in `ab-testing`, `animal-apps`, `shopship`, and `campwatch/agents.md`. The
vanilla-web principles come from `unified-theme/.github/CONTRIBUTING.md`.

Ticket/branch conventions are deliberately **not** applied: `gearshed/AGENTS.md` sets the precedent
that personal projects skip the ClickUp and `[TECH-XXXXX]` workflow. Confirmed with Mike.

## Constraints carried over from the original spec

- No build step, no bundler, no client-side dependencies. Dev-only tooling is fine.
- Pixel-perfect fidelity to `docs/design-handoff/`. SVG symbols and `@keyframes` stay verbatim.
- "Baseline: start with no JS. JS should only progressively enhance."
  (`unified-theme/.github/CONTRIBUTING.md`)

## House rules this pass enforces

| Rule | Source |
|---|---|
| Max function length 20-25 lines | `instructions.md:51` |
| Max 2 levels of nesting | `instructions.md:50` |
| Guard clauses and early returns | `instructions.md:49,52` |
| Constants for all magic values | `instructions.md:39` |
| Strict equality always | `instructions.md:46` |
| Braces around all control flow, no one-liner blocks | `instructions.md:47` |
| Descriptive naming, no clever one-liners | `instructions.md:36-41` |
| No superfluous comments; document non-obvious decisions | `shopship:64`, `instructions.md:75` |
| Behavior-named tests, Arrange-Act-Assert, mock only at boundaries | `test-write/SKILL.md:104-111` |
| Prettier is the formatter of record | `Animal Farm/AGENTS.md:43` |
| WCAG 2.1 AA on customer-facing front-end | `review-agents/accessibility.md:12` |

Deliberate deviations, with reasons:

- **No numeric coverage threshold.** The estate has none anywhere; `review-agents/test-coverage.md:16`
  says to cover "logic that matters" and explicitly not to demand tests for trivial code.
- **ESLint added, though `ab-testing` and `claude-routines-bridge` are Prettier-only.** Four of the
  prose rules above (strict equality, mandatory braces, 2-level nesting, 25-line functions) are
  mechanically enforceable. A rule a machine checks is worth more than a rule in a markdown file.
- **JSDoc with types, though the estate mandates none.** In a repo with no TypeScript, JSDoc plus
  `checkJs` is the only way to get type checking at all. The annotations are verified by
  `npm run typecheck`, so they cannot rot into decoration.

## Verification baseline (captured before any edit)

Two independent baselines on `wrangler dev`, so the refactor can be proven visually neutral:

1. Screenshots: desktop dark, desktop light (`.superpowers/standards-pass/`).
2. A deterministic DOM fingerprint: 155 elements × both themes × 28 geometry and computed-style
   properties each, with every animation pinned via `animation-play-state: paused` and
   `animation-delay: -1000s` so repeat runs are comparable. Stored in page `localStorage` under
   `__fp_baseline` and diffed in-page after the changes land.

The fingerprint is the real gate. Screenshots catch gross breakage; the fingerprint catches a 0.5px
shift or a changed easing curve.

## Work

### 1. Tooling

- `.prettierrc` — the Worker house config from `ab-testing/.prettierrc`, with two changes:
  `trailingComma: "all"` (newer of the two conflicting house values) and
  `htmlWhitespaceSensitivity: "css"` (`ab-testing` uses `"ignore"` only because it injects bare HTML
  fragments; this repo authors real documents, where `"ignore"` can move rendered whitespace).
- `.editorconfig` — copied from `ab-testing`, tabs, LF, final newline.
- `.prettierignore` — fonts, `og.png`, the vendored design handoff, `.wrangler`.
- `eslint.config.mjs` — flat config, no framework plugins. Enforces `eqeqeq`, `curly`,
  `no-empty`, `max-depth: 2`, `max-lines-per-function: 25`, `complexity`, `no-var`,
  `prefer-const`, unused-vars with the `^_` ignore convention from `campwatch/next`.
- `tsconfig.json` — `checkJs` + `allowJs` + the strict flag set from `claude-routines-bridge`
  merged with the three extra flags `ab-testing` adds (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`). Type-checks the JS; emits nothing.
- `lefthook.yml` — pre-commit Prettier on staged files, same as `ab-testing`.
- `package.json` — `engines.node >= 22` (wrangler 4 requires it; `deploy.yml` already pins 22),
  plus `format`, `format:check`, `lint`, `typecheck`, `test`, `test:watch`, `test:coverage`.

### 2. CI

- New `.github/workflows/ci.yml`: `format:check`, `lint`, `typecheck`, `test` on push and PR.
  CampWatch learned this the hard way (`reference_campwatch_ci_prettier_gate`): a green deploy with
  red formatting is possible when only the deploy runs checks.
- `deploy.yml` gains the same gates, so `main` cannot deploy unformatted or untyped code.

### 3. Hero scaling: JS to CSS

`main.js` currently recomputes `--hero-scale` and `--hero-h` on every `resize` and on a `matchMedia`
change. Verified in Chrome 149 that CSS produces bit-identical values:

```
calc(100vw / 1440px)        -> 1.7451389   JS: 1.7451389   (identical)
calc(100vw * 760 / 1440)    -> 1326.30px   JS: 1326.3056px (identical to 0.01px)
```

So the whole block becomes four CSS declarations. This deletes an unthrottled resize handler that
wrote CSS custom properties on every event, and it makes the hero render correctly with JS disabled
(today, no JS means a 1440px-wide stage at scale 1 inside a 760px hero: badly clipped on a phone).

Length-division `calc()` needs Chrome 116+ / Firefox 118+ / Safari 17.2+. Older browsers fall back to
`--hero-scale: 1`, which is the "functional, not pixel-perfect" degradation the house principle asks
for, and strictly better than today's no-JS behavior. Guarded with `@supports`.

### 4. `main.js` refactor

- Delete the hero-scaling block (moved to CSS above). `main.js` becomes theme-toggle only.
- `currentTheme()` reuses `resolveTheme()` instead of re-implementing the dark default.
- Split `syncTogglePressed()` — it currently updates the button *and* the `theme-color` meta, which
  its name does not say. Two named single-purpose functions.
- Stop re-querying `[data-theme-toggle]` on every sync; resolve the element once.
- Replace both `catch (e) {}` blocks. Empty catch is an ESLint `no-empty` violation and hides real
  failures; these become `catch { /* explained */ }` with the actual reason (Safari private mode
  throws on `localStorage`).
- Delete the hardcoded `THEME_COLORS` map. It is a third copy of the background color, after
  `--bg` in `styles.css` and the `<meta name="theme-color">` default. Read the live value from the
  computed `--bg` instead, so CSS stays the single source of truth.

### 5. CSS

- Move the 17 inline `style="position:absolute;..."` hero overlay spans into named classes.
  This is the single biggest readability problem in `index.html`.
- Add `:focus-visible` styles. There are none today, so keyboard focus relies on the UA default
  on top of a custom-styled toggle. WCAG 2.4.7.
- Add a legend comment for the terse design tokens (`--l1`, `--l2`, `--ac`, `--wm`, `--lk`, `--tx2`).
  Not renamed: they are referenced ~40 times inside SVG art the spec requires kept verbatim, so a
  rename would trade a real fidelity risk for a cosmetic gain.
- Prettier reformats the whole file (currently multi-declaration single lines).

### 6. HTML / accessibility

- Skip link to `<main>` (WCAG 2.4.1).
- `.work-card__title` and `.hobby-card__title` `<div>`s become `<h3>`; the hero sub `<div>` becomes
  `<p>`. Today the document goes `h1` → `h2` → `div`, so screen-reader heading navigation stops at
  the section level. WCAG 1.3.1.
- `og:image:alt`, `og:image:width/height`.
- Remove the now-extracted inline styles.

Contrast was measured, not assumed. All text pairs pass AA in both themes (worst case 5.55:1). Two
non-text pairs fail WCAG 1.4.11's 3:1: `--l1` card borders (1.62 dark / 1.28 light) and `--l2` dashed
hobby borders in light (2.74). These are decorative grouping, not UI controls or meaningful graphics,
so 1.4.11 does not apply; recorded here rather than "fixed" because changing them is a design
decision for Mike, not a conformance fix. The one real control, the theme toggle, uses `--tx2`
(7.54 dark / 5.55 light) and passes.

### 7. Tests (vitest + jsdom)

Port the 4 existing `node:test` cases, then add the coverage that matters:

- `theme.test.js` — pure logic, behavior-named.
- `theme-toggle.test.js` — jsdom. Click flips `data-theme`, `aria-pressed`, the `theme-color` meta,
  and persists to `localStorage`. A throwing `localStorage` (Safari private mode) still flips the
  theme. A missing button is a no-op, not a crash.
- `markup.test.js` — guard tests against the whole-file invariants a refactor can silently break:
  every `<use href="#id">` resolves to a defined `<symbol>`; every in-page anchor has a matching
  target; the `<body>` carries no inline `style` attributes outside the SVG art (this is what keeps
  the extraction in step 5 from regressing); one `<h1>`, no skipped heading levels; every external
  link has `rel="noopener"`.
- `no-flash-script.test.js` — the inline `<head>` script is a deliberate duplicate of
  `resolveTheme()` (a module would be deferred and flash). Rather than trust the "mirrors
  resolveTheme()" comment, this extracts the real script from `index.html`, runs it against every
  input, and asserts it agrees with `resolveTheme()`.
- `csp.test.js` — recomputes the SHA-256 of the inline script from `index.html` and asserts it
  matches the hash in `public/_headers`, so editing the script cannot silently break CSP.

Coverage is reported, not threshold-gated (see deviations above).

### 8. Security headers

`public/_headers` (verified working under `wrangler dev`: header applied, and the file itself is not
served as an asset). `Content-Security-Policy` with a SHA-256 hash for the inline no-flash script and
no `script-src 'unsafe-inline'`; plus `Referrer-Policy`, `X-Content-Type-Options`,
`Permissions-Policy`, and HSTS.

`style-src` keeps `'unsafe-inline'`: the SVG art carries ~40 `style="stroke:var(--l1)"` presentation
styles, and this is a fully static site with no user input, no backend, and no query-param handling,
so there is no injection vector for style to exploit. Locking `script-src` is the win worth having;
`review-agents/security.md:15` says to flag real risk and skip theoretical nits.

Also `robots.txt` and a one-URL `sitemap.xml`.

### 9. Docs

- `AGENTS.md` + a `CLAUDE.md` symlink to it (the `ab-testing` and `gearshed` pattern), recording the
  standards, the no-ticket exception, and the non-obvious traps: the personal-Cloudflare-token
  requirement, `_headers` CSP hash sync, and why the no-flash script is duplicated.
- README fixes. It is currently wrong on two points: it claims the theme defaults to
  `prefers-color-scheme` (it hard-defaults to dark), and it lists the LinkedIn URL as an unfilled
  stub (it was wired in `878b26e`). Add the new commands and refresh the structure tree.

## Order of execution

Tooling and CI first, so every later step is checked as it lands. Then the JS refactor with tests
(tests before the refactor where behavior is changing, per `refactor/SKILL.md:103`). Then CSS/HTML,
which is the visually risky part, verified against the fingerprint. Docs last, describing what
actually shipped.
