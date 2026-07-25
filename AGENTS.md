# Contributor guide: robertsmj.com

Single-page personal site. Plain static files served by an assets-only Cloudflare
Worker: no framework, no bundler, no build step, no client-side dependencies.

## Commands

```bash
npm install          # also installs the lefthook pre-commit hook
npm run dev          # wrangler dev, local preview
npm run check        # format:check + lint + typecheck + test (what CI runs)
npm test             # vitest run
npm run test:watch   # vitest, watch mode
npm run test:coverage
npm run format       # prettier --write .
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit over the JS, via JSDoc
```

Run `npm run check` before pushing. CI runs exactly these four, and so does deploy.

## Standards

House standards are `farmhand/resources/instructions.md`, which is injected into
every Claude session. The ones this repo actively enforces:

- Functions under 25 lines, at most 2 levels of nesting. ESLint fails the build on
  either.
- Guard clauses and early returns over nested conditionals.
- Strict equality always (`== null` / `!= null` excepted). Braces on all control flow.
- Named constants for magic values.
- No superfluous comments. Comment the non-obvious decision, not the obvious line.
- Behavior-named tests, Arrange-Act-Assert, mock only at boundaries.

Three deliberate deviations from the wider estate, so nobody "corrects" them:

1. **ESLint is present**, though `ab-testing` and `claude-routines-bridge` are
   Prettier-only. It is here because it mechanically enforces four rules that are
   otherwise just prose.
2. **JSDoc types are used and checked**, though the estate mandates no doc format.
   With no TypeScript, `checkJs` over JSDoc is the only static type safety available,
   and `npm run typecheck` keeps the annotations honest.
3. **No coverage threshold.** `review-agents/test-coverage.md` asks for coverage of
   logic that matters and explicitly not for tests of trivial code. Coverage is
   reported for judgement, not gated on a number.

## Git

This is a personal project, so the ClickUp ticket, `tech-XXXXX` branch, and
`[TECH-XXXXX]` PR title conventions do **not** apply here (same carve-out as
`gearshed/AGENTS.md`). Work on a branch, not `main`: pushing `main` deploys to
production.

## Design constraints

`docs/design-handoff/` is the visual source of truth and is vendored byte-for-byte.
The spec requires the SVG artwork and `@keyframes` kept verbatim, which is why:

- The SVG symbol library in `index.html` is wrapped in `<!-- prettier-ignore -->`.
  Whitespace inside SVG `<text>` is significant and the formatter would reflow it.
- The terse design tokens (`--l1`, `--l2`, `--ac`, `--wm`, `--lk`, `--tx2`) keep
  their handoff names rather than getting descriptive ones. They are referenced
  ~40 times inside that artwork. There is a legend at the top of `styles.css`.
- `docs/design-handoff/` is in `.prettierignore`.

## Traps worth knowing

**Deploying by hand uses the wrong Cloudflare account.** Bare `wrangler` picks up
work OAuth credentials. This site lives on the personal account. The account ID is
pinned in `wrangler.jsonc`, and GitHub Actions has the right token, so prefer
letting CI deploy. If you must deploy locally, export a personal API token first.

**Editing the inline `<script>` in index.html breaks the CSP.** `public/_headers`
allows it by SHA-256 hash with no `script-src 'unsafe-inline'`. Reformatting the
HTML is enough to change the hash. `test/csp.test.js` recomputes it and fails, and
the fix is to paste the hash from the failure into `_headers`.

**That inline script duplicates `resolveTheme()` on purpose.** It has to run before
first paint, and an ES module import would be deferred and flash the wrong theme.
`test/no-flash-script.test.js` extracts and executes the real snippet against
`resolveTheme()`, so the copies cannot drift.

**The page background exists in four places** and cannot be reduced to one: `--bg` in
`styles.css`, `THEME_BACKGROUNDS` in `theme-toggle.js`, the initial `content` of the
theme-color meta tag, and the two hex literals in the inline no-flash script (which
updates that meta tag pre-paint, so a returning light-theme visitor does not watch
mobile browser chrome change colour). Nothing that runs that early can import a
module. `test/theme-color.test.js` and `test/no-flash-script.test.js` pin all four.

**The hero must never go back to a fixed `height` with `overflow: hidden`.** That
combination, with absolutely positioned content, clipped the tagline and the primary
CTA off short viewports with no way to scroll to them: 192px lost at 320x256 (400%
zoom) and the CTA sliced at iPhone-landscape widths. WCAG 1.4.10. It is now
`min-height` on a flex column, the content is in normal flow, and clipping lives on
the `.hero__art` wrapper. `test/stylesheet.test.js` fails if any of that is undone.
The flex column is also load-bearing: as a plain block, the content's `margin-top`
would collapse out through the hero's top edge and push the whole header down.

**Hero sizing is CSS, not JavaScript.** `--hero-scale` is
`calc(100vw / (var(--hero-canvas-w) * 1px))` behind an `@supports` guard, and `.hero`'s
scaled height sits inside that same guard so the fallback stays self-consistent (a
scaled box around an unscaled stage crops the terrain's detail band). Do not
reintroduce a resize handler.

Changing a canvas dimension is not a one-line edit. The 1440x760 and 390x760 numbers
live in **four** places that must move together:

1. the `--hero-canvas-*` custom properties in `styles.css`,
2. the `<svg width/height>` attributes and `<symbol viewBox>` values in `index.html`,
3. the scan keyframes (`@keyframes scan` translates `1438px`, `scanM` `388px`),
4. both ridge geometries: the `offset-path: path(...)` on `.hero-fx--ridge-dot-*` and
   the matching `d` attribute in the artwork.

Changing only the custom properties resizes and rescales the stage box while the
artwork stays put.

**`test/main.test.js` is the only file using the jsdom environment**, via a
`@vitest-environment jsdom` docblock, because `main.js` reads the ambient `document`.
Everything else builds its own JSDOM and passes it in, which keeps those tests
independent by construction. `main.test.js` cannot be, so it tracks the listeners
`main.js` attaches and removes them in `afterEach`: resetting `innerHTML` discards
element listeners but never document-level ones, and a surviving `DOMContentLoaded`
handler silently wires later tests. There is a test asserting that cleanup works.

**On Node 26 the test run prints `ExperimentalWarning: localStorage is not
available`.** That is Node's own experimental global, not this code. CI runs Node 22
and does not show it.

## Structure

```
public/            served assets
  index.html       head, inline SVG symbol library, all sections
  styles.css       token legend, hero canvas geometry, layout, keyframes, responsive
  theme.js         pure theme resolution, no DOM
  theme-toggle.js  DOM wiring, takes a Document so it is testable
  main.js          entry point, wiring only, no logic
  404.html         unmatched paths; no inline script, so it needs no CSP hash
  _headers         CSP (hashed inline script) and hardening headers
  robots.txt, sitemap.xml
  favicon.svg, og.png, fonts/
test/              vitest; helpers/page.js parses the real index.html
docs/
  design-handoff/  vendored visual source of truth
  superpowers/     spec and plans
```
