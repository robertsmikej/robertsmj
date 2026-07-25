import { describe, expect, it } from 'vitest';

import { THEME_BACKGROUNDS } from '../public/theme-toggle.js';

import { loadIndexPage, readPublicFile } from './helpers/page.js';

/**
 * The page background exists in three places by necessity: `--bg` in styles.css,
 * `THEME_BACKGROUNDS` in theme-toggle.js (for the mobile browser-chrome colour), and
 * the initial `content` of the theme-color meta tag in index.html, which has to be
 * right before any CSS or JS has run.
 *
 * One source of truth is not achievable, so this pins all three together instead.
 */

const STYLES_CSS = readPublicFile('styles.css');

/**
 * Read a declaration out of the rule block for an exact selector.
 *
 * @param {string} selector
 * @param {string} property
 * @returns {string}
 */
function declaredValue(selector, property) {
	const rule = new RegExp(`${escapeForRegExp(selector)}\\s*\\{([^}]*)\\}`);
	const block = STYLES_CSS.match(rule);
	if (!block) {
		throw new Error(`No rule block found for selector "${selector}" in styles.css`);
	}
	const declaration = block[1]?.match(new RegExp(`${escapeForRegExp(property)}\\s*:\\s*([^;]+);`));
	if (!declaration) {
		throw new Error(`Selector "${selector}" declares no ${property}`);
	}
	return /** @type {string} */ (declaration[1]).trim();
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeForRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('theme background stays consistent across CSS, JS, and HTML', () => {
	it('matches the dark --bg token in styles.css', () => {
		expect(declaredValue("[data-theme='dark']", '--bg').toLowerCase()).toBe(THEME_BACKGROUNDS.dark.toLowerCase());
	});

	it('matches the light --bg token in styles.css', () => {
		expect(declaredValue("[data-theme='light']", '--bg').toLowerCase()).toBe(THEME_BACKGROUNDS.light.toLowerCase());
	});

	it('ships the default theme background in the theme-color meta tag', () => {
		// Dark is the default, so the pre-paint value has to be the dark background or
		// mobile browser chrome flashes the wrong colour on load.
		const doc = loadIndexPage().window.document;
		const initial = doc.querySelector('meta[name="theme-color"]')?.getAttribute('content');

		expect(initial?.toLowerCase()).toBe(THEME_BACKGROUNDS.dark.toLowerCase());
	});

	it('applies the dark tokens to :root so a no-JS visitor gets the default theme', () => {
		expect(STYLES_CSS).toMatch(/:root,\s*\[data-theme='dark'\]\s*\{/);
	});
});
