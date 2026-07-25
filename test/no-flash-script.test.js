import { describe, expect, it } from 'vitest';

import { resolveTheme, STORAGE_KEY } from '../public/theme.js';
import { THEME_BACKGROUNDS } from '../public/theme-toggle.js';

import { INDEX_HTML, NO_FLASH_SCRIPT } from './helpers/page.js';

/**
 * The inline `<script>` in index.html reimplements resolveTheme() because it has to
 * run before first paint, and an ES module import would be deferred. That makes it
 * the one piece of genuinely duplicated logic in the repo.
 *
 * Rather than trust the comment that says the two agree, these tests pull the real
 * snippet out of index.html and execute it, so drift fails the build.
 */

/**
 * Run the extracted snippet with stubbed globals and report everything it changed.
 *
 * The stub has to implement every DOM call the snippet makes, including
 * `getElementById`. The snippet wraps its whole body in try/catch, so a stub missing a
 * method throws a TypeError that the snippet swallows, and the test then passes while
 * never exercising the code it was written for. `metaMissing` covers the real
 * null-element branch explicitly instead.
 *
 * @param {{ stored?: string | null, throwOnRead?: boolean, metaMissing?: boolean }} options
 * @returns {{ theme: string | null, themeColor: string | null }}
 */
function runInlineScript({ stored = null, throwOnRead = false, metaMissing = false }) {
	/** @type {{ theme: string | null, themeColor: string | null }} */
	const applied = { theme: null, themeColor: null };

	const localStorageStub = {
		/** @param {string} key */
		getItem(key) {
			if (throwOnRead) {
				throw new Error('Access denied for this document origin.');
			}
			return key === STORAGE_KEY ? stored : null;
		},
	};
	const themeColorMeta = {
		/**
		 * @param {string} name
		 * @param {string} value
		 */
		setAttribute(name, value) {
			if (name === 'content') {
				applied.themeColor = value;
			}
		},
	};
	const documentStub = {
		documentElement: {
			/**
			 * @param {string} name
			 * @param {string} value
			 */
			setAttribute(name, value) {
				if (name === 'data-theme') {
					applied.theme = value;
				}
			},
		},
		/** @param {string} id */
		getElementById(id) {
			if (metaMissing || id !== 'theme-color-meta') {
				return null;
			}
			return themeColorMeta;
		},
	};

	// Executing the shipped snippet verbatim is the whole point: passing the globals it
	// reads as parameters shadows the real ones without mutating anything.
	new Function('localStorage', 'document', NO_FLASH_SCRIPT)(localStorageStub, documentStub);
	return applied;
}

describe('inline no-flash theme script', () => {
	it('applies the stored theme', () => {
		expect(runInlineScript({ stored: 'light' }).theme).toBe('light');
	});

	it('agrees with resolveTheme on every input, valid or not', () => {
		const inputs = [null, '', 'dark', 'light', 'DARK', 'Light', 'purple', 'dark ', '0', 'null', '{"t":"light"}'];

		// Compared as whole arrays so a failure names the input that drifted, rather
		// than stopping at the first mismatch inside a loop.
		expect(inputs.map((stored) => runInlineScript({ stored }).theme)).toEqual(inputs.map(resolveTheme));
	});

	it('survives storage access throwing, leaving the CSS default in place', () => {
		// Safari private mode and blocked-cookie contexts throw on getItem.
		expect(runInlineScript({ throwOnRead: true }).theme).toBeNull();
	});

	it('reads the same storage key the module writes', () => {
		// Interpolated, not hardcoded: renaming STORAGE_KEY has to fail here.
		expect(NO_FLASH_SCRIPT).toContain(`'${STORAGE_KEY}'`);
	});
});

describe('theme-color meta, set pre-paint', () => {
	// Without this, a returning light-theme visitor got dark mobile browser chrome until
	// the deferred module ran, then watched it change colour.

	it('sets the light background before paint for a returning light visitor', () => {
		expect(runInlineScript({ stored: 'light' }).themeColor).toBe(THEME_BACKGROUNDS.light);
	});

	it('sets the dark background for a returning dark visitor', () => {
		expect(runInlineScript({ stored: 'dark' }).themeColor).toBe(THEME_BACKGROUNDS.dark);
	});

	it('sets the dark background for a first-time visitor', () => {
		expect(runInlineScript({ stored: null }).themeColor).toBe(THEME_BACKGROUNDS.dark);
	});

	it('still applies the theme when the meta tag is absent', () => {
		const applied = runInlineScript({ stored: 'light', metaMissing: true });

		expect(applied.theme).toBe('light');
		expect(applied.themeColor).toBeNull();
	});

	it('uses the same colours as the module, not its own', () => {
		// These hex literals are a fourth copy of the background, unavoidable because
		// this script runs before any module. theme-color.test.js pins the rest.
		expect(NO_FLASH_SCRIPT).toContain(THEME_BACKGROUNDS.dark);
		expect(NO_FLASH_SCRIPT).toContain(THEME_BACKGROUNDS.light);
	});
});

describe('no-flash script placement', () => {
	// The entire reason this script is inline and duplicated is that it must run before
	// the first paint. Nothing about that is guaranteed by its content, only by where it
	// sits, so position is asserted rather than left to a comment.

	it('runs before the stylesheet is requested', () => {
		const scriptEnd = INDEX_HTML.indexOf('</script>');
		const stylesheet = INDEX_HTML.indexOf('rel="stylesheet"');

		expect(scriptEnd).toBeGreaterThan(-1);
		expect(stylesheet).toBeGreaterThan(-1);
		expect(scriptEnd).toBeLessThan(stylesheet);
	});

	it('sits inside <head>, not deferred to the end of the body', () => {
		const scriptStart = INDEX_HTML.indexOf('<script');
		const headEnd = INDEX_HTML.indexOf('</head>');

		expect(scriptStart).toBeLessThan(headEnd);
	});

	it('is not preceded by any external script that could delay it', () => {
		const firstInline = INDEX_HTML.indexOf('<script');
		const firstExternal = INDEX_HTML.search(/<script[^>]*\bsrc=/);

		expect(firstExternal).toBeGreaterThan(firstInline);
	});
});
