import { beforeEach, describe, expect, it, vi } from 'vitest';

import { THEMES } from '../public/theme.js';
import { applyTheme, currentTheme, initThemeToggle, persistTheme, THEME_BACKGROUNDS } from '../public/theme-toggle.js';

import { loadIndexPage } from './helpers/page.js';

/** @type {import('jsdom').JSDOM} */
let dom;
/** @type {Document} */
let doc;

const toggleButton = () => /** @type {HTMLElement} */ (doc.querySelector('[data-theme-toggle]'));
const themeAttribute = () => doc.documentElement.getAttribute('data-theme');
const ariaPressed = () => toggleButton().getAttribute('aria-pressed');
const themeColor = () => /** @type {HTMLElement} */ (doc.getElementById('theme-color-meta')).getAttribute('content');

beforeEach(() => {
	dom = loadIndexPage();
	doc = dom.window.document;
});

describe('currentTheme', () => {
	it('reads the theme the no-flash script left on the document', () => {
		doc.documentElement.setAttribute('data-theme', 'light');
		expect(currentTheme(doc)).toBe('light');
	});

	it('reports dark when the attribute is missing, matching the CSS default', () => {
		doc.documentElement.removeAttribute('data-theme');
		expect(currentTheme(doc)).toBe('dark');
	});
});

describe('applyTheme', () => {
	it('sets the attribute the stylesheet switches on', () => {
		applyTheme(doc, THEMES.LIGHT);
		expect(themeAttribute()).toBe('light');
	});

	it('points the theme-color meta at that theme background', () => {
		applyTheme(doc, THEMES.LIGHT);
		expect(themeColor()).toBe(THEME_BACKGROUNDS.light);

		applyTheme(doc, THEMES.DARK);
		expect(themeColor()).toBe(THEME_BACKGROUNDS.dark);
	});

	it('reports dark as the pressed state of the toggle', () => {
		applyTheme(doc, THEMES.DARK);
		expect(ariaPressed()).toBe('true');

		applyTheme(doc, THEMES.LIGHT);
		expect(ariaPressed()).toBe('false');
	});

	it('still applies the theme on a page with no toggle button', () => {
		toggleButton().remove();

		expect(() => applyTheme(doc, THEMES.LIGHT)).not.toThrow();
		expect(themeAttribute()).toBe('light');
	});

	it('still applies the theme on a page with no theme-color meta', () => {
		/** @type {HTMLElement} */ (doc.getElementById('theme-color-meta')).remove();

		expect(() => applyTheme(doc, THEMES.LIGHT)).not.toThrow();
		expect(themeAttribute()).toBe('light');
	});
});

describe('persistTheme', () => {
	it('writes the choice so the next visit opens on the same theme', () => {
		persistTheme(doc, THEMES.LIGHT);
		expect(dom.window.localStorage.getItem('theme')).toBe('light');
	});

	it('swallows a storage failure instead of breaking the page', () => {
		// Safari private browsing throws on setItem rather than no-op'ing.
		vi.spyOn(dom.window.localStorage, 'setItem').mockImplementation(() => {
			throw new Error('The quota has been exceeded.');
		});

		expect(() => persistTheme(doc, THEMES.LIGHT)).not.toThrow();
	});
});

describe('initThemeToggle', () => {
	it('syncs the button to the theme already on the document', () => {
		doc.documentElement.setAttribute('data-theme', 'light');

		initThemeToggle(doc);

		expect(ariaPressed()).toBe('false');
	});

	it('re-applies the theme in case the inline no-flash script was blocked', () => {
		doc.documentElement.removeAttribute('data-theme');

		initThemeToggle(doc);

		expect(themeAttribute()).toBe('dark');
	});

	it('flips the theme, the button, the meta colour, and storage on click', () => {
		doc.documentElement.setAttribute('data-theme', 'dark');
		initThemeToggle(doc);

		toggleButton().click();

		expect(themeAttribute()).toBe('light');
		expect(ariaPressed()).toBe('false');
		expect(themeColor()).toBe(THEME_BACKGROUNDS.light);
		expect(dom.window.localStorage.getItem('theme')).toBe('light');
	});

	it('returns to the starting theme on a second click', () => {
		doc.documentElement.setAttribute('data-theme', 'dark');
		initThemeToggle(doc);

		toggleButton().click();
		toggleButton().click();

		expect(themeAttribute()).toBe('dark');
		expect(ariaPressed()).toBe('true');
		expect(themeColor()).toBe(THEME_BACKGROUNDS.dark);
		expect(dom.window.localStorage.getItem('theme')).toBe('dark');
	});

	it('keeps toggling when storage is unavailable', () => {
		vi.spyOn(dom.window.localStorage, 'setItem').mockImplementation(() => {
			throw new Error('The quota has been exceeded.');
		});
		doc.documentElement.setAttribute('data-theme', 'dark');
		initThemeToggle(doc);

		expect(() => toggleButton().click()).not.toThrow();
		expect(themeAttribute()).toBe('light');
	});

	it('does nothing on a page without a toggle button', () => {
		toggleButton().remove();

		expect(() => initThemeToggle(doc)).not.toThrow();
	});

	it('binds a single handler, so one click is one flip', () => {
		doc.documentElement.setAttribute('data-theme', 'dark');
		initThemeToggle(doc);

		toggleButton().click();

		// A double-bound handler would flip twice and land back on dark.
		expect(themeAttribute()).toBe('light');
	});
});
