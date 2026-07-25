import { beforeEach, describe, expect, it } from 'vitest';

import { loadIndexPage } from './helpers/page.js';

/**
 * Whole-document invariants. These are the things a refactor can quietly break
 * without any single unit test noticing: a renamed SVG symbol, a nav link pointing
 * at a section that got an id rename, a heading level skipped when a `div` becomes
 * an `h3`, or inline styles creeping back into the markup.
 */

/** @type {Document} */
let doc;

beforeEach(() => {
	doc = loadIndexPage().window.document;
});

/**
 * The vendored SVG symbol library is the one place inline `style` is expected: the
 * artwork paints itself with `style="stroke:var(--l2)"` presentation styles and the
 * design spec requires it kept verbatim.
 *
 * @param {Element} el
 * @returns {boolean}
 */
function isInSymbolLibrary(el) {
	return Boolean(el.closest('defs') || el.querySelector('defs'));
}

describe('SVG symbol references', () => {
	it('resolves every <use> to a symbol defined in the document', () => {
		const uses = [...doc.querySelectorAll('use')];
		expect(uses.length).toBeGreaterThan(0);

		const unresolved = uses.map((use) => use.getAttribute('href')).filter((href) => !href || !doc.querySelector(href));

		expect(unresolved).toEqual([]);
	});

	it('defines no symbols that nothing renders', () => {
		const referenced = new Set([...doc.querySelectorAll('use')].map((use) => use.getAttribute('href')));
		const orphans = [...doc.querySelectorAll('symbol')].map((s) => `#${s.id}`).filter((id) => !referenced.has(id));

		expect(orphans).toEqual([]);
	});
});

describe('in-page links', () => {
	it('points every anchor at an element that exists', () => {
		const anchors = [...doc.querySelectorAll('a[href^="#"]')];
		expect(anchors.length).toBeGreaterThan(0);

		const broken = anchors
			.map((a) => a.getAttribute('href'))
			.filter((href) => href !== '#' && (!href || !doc.querySelector(href)));

		expect(broken).toEqual([]);
	});

	it('resolves every aria-labelledby to an element that exists', () => {
		const broken = [...doc.querySelectorAll('[aria-labelledby]')]
			.map((el) => el.getAttribute('aria-labelledby'))
			.filter((id) => !id || !doc.getElementById(id));

		expect(broken).toEqual([]);
	});

	it('opens external links without handing over the opener', () => {
		const external = [...doc.querySelectorAll('a[target="_blank"]')];
		expect(external.length).toBeGreaterThan(0);

		const unsafe = external
			.filter((a) => !(a.getAttribute('rel') ?? '').includes('noopener'))
			.map((a) => a.getAttribute('href'));

		expect(unsafe).toEqual([]);
	});
});

describe('document structure and accessibility', () => {
	it('declares a language on the root element', () => {
		expect(doc.documentElement.getAttribute('lang')).toBe('en');
	});

	it('has exactly one h1', () => {
		expect(doc.querySelectorAll('h1')).toHaveLength(1);
	});

	it('never skips a heading level', () => {
		const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));

		expect(levels[0]).toBe(1);
		levels.forEach((level, i) => {
			if (i > 0) {
				expect(level).toBeLessThanOrEqual(/** @type {number} */ (levels[i - 1]) + 1);
			}
		});
	});

	it('offers a skip link that lands on the main landmark', () => {
		const skip = doc.querySelector('.skip-link');
		expect(skip).not.toBeNull();

		const target = doc.querySelector(/** @type {string} */ (skip?.getAttribute('href')));
		expect(target?.tagName).toBe('MAIN');
	});

	it('hides decorative SVG from assistive technology', () => {
		const exposed = [...doc.querySelectorAll('svg')].filter(
			(svg) => svg.getAttribute('aria-hidden') !== 'true' && !svg.querySelector('title'),
		);

		expect(exposed).toEqual([]);
	});

	it('gives the icon-only theme toggle an accessible name and a pressed state', () => {
		const toggle = doc.querySelector('[data-theme-toggle]');

		expect(toggle?.getAttribute('aria-label')).toBeTruthy();
		expect(toggle?.getAttribute('aria-pressed')).toBeTruthy();
		expect(toggle?.getAttribute('type')).toBe('button');
	});
});

describe('presentation stays in the stylesheet', () => {
	it('keeps inline style attributes out of the markup', () => {
		// 16 hero overlay spans used to carry their geometry and timings inline. If
		// they come back, this fails.
		const inlineStyled = [...doc.querySelectorAll('[style]')]
			.filter((el) => !isInSymbolLibrary(el))
			.map((el) => `${el.tagName.toLowerCase()}[style="${el.getAttribute('style')}"]`);

		expect(inlineStyled).toEqual([]);
	});

	it('renders the hero overlays from classes', () => {
		expect(doc.querySelectorAll('.hero-fx')).toHaveLength(16);
	});
});

describe('head metadata', () => {
	it('describes the share image for screen reader and preview surfaces', () => {
		expect(doc.querySelector('meta[property="og:image:alt"]')?.getAttribute('content')).toBeTruthy();
	});

	it('loads page script as a deferred module, never blocking render', () => {
		const scripts = [...doc.querySelectorAll('script[src]')];
		expect(scripts.length).toBeGreaterThan(0);

		for (const script of scripts) {
			expect(script.getAttribute('type')).toBe('module');
		}
	});
});
