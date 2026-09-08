import { beforeEach, describe, expect, it } from 'vitest';

import { loadIndexPage, publicFileExists } from './helpers/page.js';

/**
 * Whole-document invariants. These are the things a refactor can quietly break
 * without any single unit test noticing: a renamed SVG symbol, a nav link pointing
 * at a section that got an id rename, a heading level skipped when a `div` becomes
 * an `h3`, or inline styles creeping back into the markup.
 *
 * Every "nothing is broken" assertion is paired with a check that the set it filtered
 * was non-empty. An absence-assertion over an empty set is green by accident, and a
 * mistyped selector would otherwise read as a pass.
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
 * Scoped to the artwork itself plus the single wrapper `<svg>` that holds the `<defs>`.
 * A looser `el.querySelector('defs')` check would also exempt every *ancestor* of the
 * library, `<body>` and `<html>` included, which would let a real inline style through.
 *
 * @param {Element} el
 * @returns {boolean}
 */
function isInSymbolLibrary(el) {
	return Boolean(el.closest('defs') || (el.tagName === 'svg' && el.querySelector(':scope > defs')));
}

describe('SVG symbol references', () => {
	it('resolves every <use> to a symbol defined in the document', () => {
		const uses = [...doc.querySelectorAll('use')];
		expect(uses.length).toBeGreaterThan(0);

		const unresolved = uses.map((use) => use.getAttribute('href')).filter((href) => !href || !doc.querySelector(href));

		expect(unresolved).toEqual([]);
	});

	it('defines no symbols that nothing renders', () => {
		const symbols = [...doc.querySelectorAll('symbol')];
		expect(symbols.length).toBeGreaterThan(0);

		const referenced = new Set([...doc.querySelectorAll('use')].map((use) => use.getAttribute('href')));
		const orphans = symbols.map((symbol) => `#${symbol.id}`).filter((id) => !referenced.has(id));

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
		const labelled = [...doc.querySelectorAll('[aria-labelledby]')];
		// Without this, stripping every aria-labelledby from the page passes silently
		// and three sections lose their accessible names.
		expect(labelled.length).toBeGreaterThan(0);

		const broken = labelled
			.map((el) => el.getAttribute('aria-labelledby'))
			.filter((id) => !id || !doc.getElementById(id));

		expect(broken).toEqual([]);
	});

	it('points every internal link and asset at a file that gets deployed', () => {
		// The footer's "Resume (PDF)" link pointed at /resume.pdf for weeks, 404ing to a
		// blank page on a hiring site. This is the guard against that recurring.
		const urls = [
			...[...doc.querySelectorAll('a[href^="/"]')].map((el) => el.getAttribute('href')),
			...[...doc.querySelectorAll('link[href^="/"]')].map((el) => el.getAttribute('href')),
			...[...doc.querySelectorAll('script[src^="/"], img[src^="/"]')].map((el) => el.getAttribute('src')),
		].filter((url) => url !== null && !url.startsWith('//'));

		expect(urls.length).toBeGreaterThan(0);
		expect(urls.filter((url) => !publicFileExists(/** @type {string} */ (url)))).toEqual([]);
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

describe('document structure', () => {
	it('declares a language on the root element', () => {
		expect(doc.documentElement.getAttribute('lang')).toBe('en');
	});

	it('has exactly one h1', () => {
		expect(doc.querySelectorAll('h1')).toHaveLength(1);
	});

	it('never skips a heading level', () => {
		const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));
		expect(levels.length).toBeGreaterThan(1);
		expect(levels[0]).toBe(1);

		// Compared as arrays so a failure shows the whole outline, not just one index.
		const maxAllowed = levels.map((_level, i) => (i === 0 ? 1 : Math.min(levels[i - 1] ?? 1, 6) + 1));
		expect(levels.map((level, i) => level <= /** @type {number} */ (maxAllowed[i]))).not.toContain(false);
	});
});

describe('accessibility affordances', () => {
	it('offers a skip link that lands on the main landmark', () => {
		const skip = doc.querySelector('.skip-link');
		expect(skip).not.toBeNull();

		const target = doc.querySelector(/** @type {string} */ (skip?.getAttribute('href')));
		expect(target?.tagName).toBe('MAIN');
	});

	it('makes the main landmark focusable so the skip link moves focus', () => {
		expect(doc.querySelector('main')?.getAttribute('tabindex')).toBe('-1');
	});

	it('hides decorative SVG from assistive technology', () => {
		const svgs = [...doc.querySelectorAll('svg')];
		expect(svgs.length).toBeGreaterThan(0);

		// A titled SVG is legitimately exposed, but only its own direct-child <title>
		// counts. Searching descendants would excuse the symbol library for a title
		// buried inside <defs>.
		const exposed = svgs.filter(
			(svg) => svg.getAttribute('aria-hidden') !== 'true' && !svg.querySelector(':scope > title'),
		);

		expect(exposed).toEqual([]);
	});

	it('gives the icon-only theme toggle a non-blank accessible name', () => {
		const label = doc.querySelector('[data-theme-toggle]')?.getAttribute('aria-label');

		expect(label?.trim()).toBeTruthy();
		expect(label?.trim().length).toBeGreaterThan(3);
	});

	it('gives the theme toggle a valid pressed state', () => {
		// toBeTruthy() would accept aria-pressed="banana".
		expect(['true', 'false']).toContain(doc.querySelector('[data-theme-toggle]')?.getAttribute('aria-pressed'));
	});

	it('keeps the theme toggle out of implicit form submission', () => {
		expect(doc.querySelector('[data-theme-toggle]')?.getAttribute('type')).toBe('button');
	});
});

describe('work and side-project cards', () => {
	it('gives every case-notes disclosure a summary as its first child', () => {
		// A <details> without a leading <summary> gets a UA-generated "Details" label,
		// which is what a screen reader would announce.
		const notes = [...doc.querySelectorAll('details.notes')];
		expect(notes.length).toBeGreaterThan(0);

		const unlabeled = notes.filter((el) => el.firstElementChild?.tagName !== 'SUMMARY');
		expect(unlabeled).toEqual([]);
	});

	it('keeps case notes closed by default so the cards stay scannable', () => {
		const open = [...doc.querySelectorAll('details.notes[open]')];
		expect(open).toEqual([]);
	});

	it('links every side project over HTTPS', () => {
		const links = [...doc.querySelectorAll('#side-projects .work-card__links a')];
		expect(links.length).toBeGreaterThan(0);

		const insecure = links.map((a) => a.getAttribute('href')).filter((href) => !href?.startsWith('https://'));
		expect(insecure).toEqual([]);
	});

	it('gives every card a title, description, and meta line', () => {
		const cards = [...doc.querySelectorAll('.work-card')];
		expect(cards.length).toBeGreaterThan(4);

		const parts = ['.work-card__title', '.work-card__desc', '.work-card__meta'];
		const hasText = (/** @type {Element} */ card, /** @type {string} */ selector) =>
			Boolean(card.querySelector(selector)?.textContent?.trim());
		const incomplete = cards.filter((card) => !parts.every((selector) => hasText(card, selector)));

		expect(incomplete).toEqual([]);
	});
});

describe('presentation stays in the stylesheet', () => {
	it('keeps inline style attributes out of the markup', () => {
		// 16 hero overlay spans used to carry their geometry and timings inline. If
		// they come back, this fails.
		const styled = [...doc.querySelectorAll('[style]')];
		expect(styled.length).toBeGreaterThan(0);

		const inlineStyled = styled
			.filter((el) => !isInSymbolLibrary(el))
			.map((el) => `${el.tagName.toLowerCase()}[style="${el.getAttribute('style')}"]`);

		expect(inlineStyled).toEqual([]);
	});

	it('renders the hero overlays from classes', () => {
		expect(doc.querySelectorAll('.hero-fx')).toHaveLength(16);
	});
});

describe('head metadata', () => {
	it('describes the share image for preview and screen reader surfaces', () => {
		const alt = doc.querySelector('meta[property="og:image:alt"]')?.getAttribute('content');

		expect(alt?.trim()).toBeTruthy();
		expect(alt?.trim().length).toBeGreaterThan(10);
	});

	it('loads page script as a deferred module, never blocking render', () => {
		const scripts = [...doc.querySelectorAll('script[src]')];
		expect(scripts.length).toBeGreaterThan(0);

		expect(scripts.map((script) => script.getAttribute('type'))).toEqual(scripts.map(() => 'module'));
	});
});
