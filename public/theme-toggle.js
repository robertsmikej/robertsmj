/**
 * Theme toggle: reads and writes the `data-theme` attribute, keeps the button's
 * pressed state and the mobile browser-chrome color in sync, and persists the
 * choice.
 *
 * Every function takes the `Document` to act on rather than reaching for the
 * global. That is what makes this testable against a throwaway JSDOM without
 * mutating globals between cases.
 */

import { nextTheme, resolveTheme, STORAGE_KEY, THEMES } from './theme.js';

/** @typedef {import('./theme.js').Theme} Theme */

const THEME_ATTRIBUTE = 'data-theme';
const TOGGLE_SELECTOR = '[data-theme-toggle]';
const THEME_COLOR_META_ID = 'theme-color-meta';

/**
 * Page background per theme, mirrored into `<meta name="theme-color">` so mobile
 * browser chrome matches the page.
 *
 * This duplicates `--bg` in styles.css, and index.html carries a third copy as the
 * meta tag's initial value. That copy is unavoidable: it has to be correct before
 * any stylesheet or script has run. Rather than pretend one source of truth is
 * possible, `test/theme-color.test.js` pins all three together and fails if any
 * one of them drifts.
 *
 * @type {Record<Theme, string>}
 */
export const THEME_BACKGROUNDS = {
	[THEMES.DARK]: '#0C1116',
	[THEMES.LIGHT]: '#F4F6F8',
};

/**
 * The theme currently applied to the document.
 *
 * @param {Document} doc
 * @returns {Theme}
 */
export function currentTheme(doc) {
	return resolveTheme(doc.documentElement.getAttribute(THEME_ATTRIBUTE));
}

/**
 * Reflect the active theme on the toggle button. `aria-pressed` describes "dark is
 * on", which is what a screen reader announces when the control is focused.
 *
 * @param {Element} button
 * @param {Theme} theme
 * @returns {void}
 */
function syncToggleButton(button, theme) {
	button.setAttribute('aria-pressed', String(theme === THEMES.DARK));
}

/**
 * @param {Document} doc
 * @param {Theme} theme
 * @returns {void}
 */
function syncThemeColorMeta(doc, theme) {
	const meta = doc.getElementById(THEME_COLOR_META_ID);
	if (!meta) {
		return;
	}
	meta.setAttribute('content', THEME_BACKGROUNDS[theme]);
}

/**
 * Apply a theme to the document and everything that mirrors it. Does not persist.
 *
 * @param {Document} doc
 * @param {Theme} theme
 * @param {Element | null} [button]
 * @returns {void}
 */
export function applyTheme(doc, theme, button = doc.querySelector(TOGGLE_SELECTOR)) {
	doc.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
	syncThemeColorMeta(doc, theme);
	if (button) {
		syncToggleButton(button, theme);
	}
}

/**
 * Persist the visitor's choice, tolerating storage being unavailable.
 *
 * @param {Document} doc
 * @param {Theme} theme
 * @returns {void}
 */
export function persistTheme(doc, theme) {
	try {
		doc.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Safari private browsing and storage-blocked contexts throw on setItem.
		// The theme still applies to this page view; only persistence is lost, so
		// there is nothing to recover from and nothing worth logging.
	}
}

/**
 * Wire up the toggle. A page without the button is a no-op, not an error.
 *
 * @param {Document} doc
 * @returns {void}
 */
export function initThemeToggle(doc) {
	const button = doc.querySelector(TOGGLE_SELECTOR);
	if (!button) {
		return;
	}

	// The no-flash script in index.html has already set the attribute; re-applying
	// it is idempotent and covers the case where that script was blocked.
	applyTheme(doc, currentTheme(doc), button);

	button.addEventListener('click', () => {
		const theme = nextTheme(currentTheme(doc));
		applyTheme(doc, theme, button);
		persistTheme(doc, theme);
	});
}
