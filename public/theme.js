/**
 * Theme vocabulary and pure resolution logic. No DOM and no storage access, so it
 * is directly unit-testable and safe to import from anywhere.
 *
 * The no-flash `<script>` in index.html reimplements `resolveTheme` by necessity
 * (an ES module would be deferred and the page would flash the wrong theme before
 * it ran). `test/no-flash-script.test.js` executes that inline copy against this
 * one so the duplication cannot drift.
 */

/** @typedef {'dark' | 'light'} Theme */

/**
 * The literal cast gives `THEMES.DARK` the type `'dark'` rather than `string`,
 * which is what lets `resolveTheme` narrow an untrusted value by comparison.
 */
export const THEMES = /** @type {{ readonly DARK: 'dark'; readonly LIGHT: 'light' }} */ ({
	DARK: 'dark',
	LIGHT: 'light',
});

/** `localStorage` key holding the visitor's explicit choice. */
export const STORAGE_KEY = 'theme';

/**
 * Used when nothing valid is stored. Dark is the design's default, and the `:root`
 * block in styles.css carries the dark tokens so a no-JS visitor lands here too.
 */
export const DEFAULT_THEME = THEMES.DARK;

/**
 * Narrow an untrusted value (stored string, DOM attribute, `null`) to a Theme.
 *
 * @param {string | null | undefined} stored
 * @returns {Theme}
 */
export function resolveTheme(stored) {
	if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
		return stored;
	}
	return DEFAULT_THEME;
}

/**
 * The other theme. Only two exist, so this is a flip rather than a cycle.
 *
 * @param {Theme} current
 * @returns {Theme}
 */
export function nextTheme(current) {
	return current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
}
