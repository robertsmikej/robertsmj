import { describe, expect, it } from 'vitest';

import { readPublicFile } from './helpers/page.js';

/**
 * Text-level guards for the parts of styles.css that carry an accessibility or
 * correctness promise. jsdom applies no linked stylesheet, so none of this can be
 * asserted through the DOM; without these, deleting the whole `:focus-visible` block
 * or the reduced-motion block leaves the suite green.
 *
 * These check that a rule exists and says what it should, not that a browser renders
 * it. Rendering was verified separately in Chrome.
 */

const STYLES_CSS = readPublicFile('styles.css');

describe('focus indicator (WCAG 2.4.7)', () => {
	it('styles :focus-visible rather than relying on the UA default', () => {
		expect(STYLES_CSS).toMatch(/:focus-visible\s*\{[^}]*outline:/);
	});

	it('draws the ring in the accent colour, which is contrast-checked in both themes', () => {
		// --ac measures 7.92:1 on the dark background and 5.73:1 on light, both well
		// over the 3:1 that WCAG 1.4.11 asks of a focus indicator.
		expect(STYLES_CSS).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ac\)/);
	});

	it('offsets the ring so it is not flush against the control', () => {
		expect(STYLES_CSS).toMatch(/:focus-visible\s*\{[^}]*outline-offset:/);
	});

	it('never removes an outline without replacing it', () => {
		// `outline: none` / `outline: 0` anywhere is the classic way focus disappears.
		expect(STYLES_CSS).not.toMatch(/outline:\s*(none|0)\s*;/);
	});
});

describe('skip link (WCAG 2.4.1)', () => {
	it('is hidden off-screen until it takes focus', () => {
		expect(STYLES_CSS).toMatch(/\.skip-link\s*\{[^}]*transform:\s*translate\(-50%,\s*-100%\)/);
	});

	it('reveals on :focus, not :focus-visible, so it works however focus arrived', () => {
		expect(STYLES_CSS).toMatch(/\.skip-link:focus\s*\{[^}]*transform:\s*translate\(-50%,\s*0\)/);
	});

	it('sits far enough from the viewport edge that its focus ring is not cropped', () => {
		// Measured in Chrome: the ring's outer edge lands at `top` minus outline-offset
		// minus outline-width. At top: 3px that was -2px, so the ring was clipped along
		// the top even though the link itself was visible.
		const focusBlock = STYLES_CSS.match(/:focus-visible\s*\{([^}]*)\}/)?.[1] ?? '';
		const outlineWidth = Number(focusBlock.match(/outline:\s*(\d+(?:\.\d+)?)px/)?.[1]);
		const outlineOffset = Number(focusBlock.match(/outline-offset:\s*(\d+(?:\.\d+)?)px/)?.[1]);
		const skipTop = Number(STYLES_CSS.match(/\.skip-link:focus\s*\{[^}]*top:\s*(\d+(?:\.\d+)?)px/)?.[1]);

		expect(outlineWidth).toBeGreaterThan(0);
		expect(outlineOffset).toBeGreaterThan(0);
		expect(skipTop).toBeGreaterThanOrEqual(outlineOffset + outlineWidth);
	});
});

describe('reduced motion (WCAG 2.3.3)', () => {
	it('has a prefers-reduced-motion block', () => {
		expect(STYLES_CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
	});

	it('cancels every animation, not just selected ones', () => {
		const block = STYLES_CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1];

		expect(block).toBeTruthy();
		expect(block).toMatch(/animation:\s*none\s*!important/);
	});

	it('cancels the two transform-based transitions, which animation:none does not cover', () => {
		const block = STYLES_CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';

		expect(block).toContain('.toggle__knob');
		expect(block).toContain('.skip-link');
	});

	it('stops smooth scrolling', () => {
		const block = STYLES_CSS.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1] ?? '';

		expect(block).toMatch(/scroll-behavior:\s*auto/);
	});
});

describe('hero reflow (WCAG 1.4.10)', () => {
	// A fixed height plus overflow:hidden on `.hero`, with absolutely positioned
	// content, silently cut off the tagline and the primary CTA on short viewports:
	// 192px lost at 320x256, and the CTA sliced at iPhone-landscape widths.

	it('bounds the hero with min-height so it can grow for its content', () => {
		const heroBlock = STYLES_CSS.match(/^\.hero\s*\{([^}]*)\}/m)?.[1] ?? '';

		expect(heroBlock).toMatch(/min-height:/);
		expect(heroBlock).not.toMatch(/[^-]height:\s*calc/);
	});

	it('does not clip the hero itself', () => {
		expect(STYLES_CSS.match(/^\.hero\s*\{([^}]*)\}/m)?.[1]).not.toMatch(/overflow:/);
	});

	it('clips the artwork layer instead', () => {
		expect(STYLES_CSS).toMatch(/\.hero__art\s*\{[^}]*overflow:\s*hidden/);
	});

	it('keeps the hero content in normal flow', () => {
		const content = STYLES_CSS.match(/^\.hero__content\s*\{([^}]*)\}/m)?.[1] ?? '';

		expect(content).toMatch(/position:\s*relative/);
		expect(content).toMatch(/margin-top:/);
		expect(content).not.toMatch(/position:\s*absolute/);
	});

	it('uses min-height at the mobile breakpoint too', () => {
		expect(STYLES_CSS).toMatch(/min-height:\s*100svh/);
		expect(STYLES_CSS).not.toMatch(/[^-]height:\s*100svh/);
	});
});

describe('hero canvas scaling', () => {
	it('computes the scale in CSS, with no JavaScript resize handler', () => {
		expect(STYLES_CSS).toMatch(/--hero-scale:\s*calc\(100vw \/ \(var\(--hero-canvas-w\) \* 1px\)\)/);
	});

	it('guards the scale behind @supports, since calc length division is not universal', () => {
		expect(STYLES_CSS).toMatch(/@supports \(line-height: calc\(100vw \/ 1px\)\)/);
	});

	it('falls back to an unscaled canvas rather than no fallback at all', () => {
		expect(STYLES_CSS).toMatch(/--hero-scale:\s*1;/);
	});

	it('keeps the fallback height consistent with the fallback scale', () => {
		// The failure this guards: a viewport-scaled height around an unscaled stage
		// crops the terrain's detail band (tent, campfire, lake glints at y=682-716).
		// So the unguarded height must be the unscaled canvas, and the scaled height
		// must live inside the same @supports block as the scale.
		expect(STYLES_CSS).toMatch(/\.hero\s*\{[^}]*height:\s*calc\(var\(--hero-canvas-h\) \* 1px\)/);

		const guarded = STYLES_CSS.match(
			/@supports \(line-height: calc\(100vw \/ 1px\)\)\s*\{\s*\.hero\s*\{([^}]*)\}/,
		)?.[1];
		expect(guarded).toMatch(/height:\s*calc\(100vw \* var\(--hero-canvas-h\) \/ var\(--hero-canvas-w\)\)/);
	});
});

describe('hero overlay animation timings', () => {
	it('sets each staggered variant with a full animation shorthand', () => {
		// Splitting the shorthand onto a base class and the delay onto a variant works
		// only while the variants sit lower in the file. Reordering would silently
		// collapse the stagger and fire all the smoke puffs and pulses at once.
		const staggered = [...STYLES_CSS.matchAll(/\.hero-fx--(?:smoke|pulse)-[a-z0-9-]+\s*\{([^}]*)\}/g)];
		expect(staggered.length).toBeGreaterThan(4);

		for (const [, body] of staggered) {
			expect(body).toMatch(/animation:\s*\w+ [\d.]+s [\w-]+(?:\([^)]*\))? [\d.]+s/);
			expect(body).not.toMatch(/animation-delay:/);
		}
	});
});
