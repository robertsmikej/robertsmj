import { describe, expect, it } from 'vitest';

import { resolveTheme, STORAGE_KEY } from '../public/theme.js';

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
 * Run the extracted snippet with stubbed globals and report what it set `data-theme`
 * to. The snippet reads bare `localStorage` and `document`, so passing them as
 * parameters shadows the real globals without touching them.
 *
 * @param {{ stored?: string | null, throwOnRead?: boolean }} options
 * @returns {string | null}
 */
function runInlineScript({ stored = null, throwOnRead = false }) {
	/** @type {string | null} */
	let applied = null;
	const localStorageStub = {
		/** @param {string} key */
		getItem(key) {
			if (throwOnRead) {
				throw new Error('Access denied for this document origin.');
			}
			return key === STORAGE_KEY ? stored : null;
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
					applied = value;
				}
			},
		},
	};

	// Executing the shipped snippet verbatim is the whole point: passing the globals it
	// reads as parameters shadows the real ones without mutating anything.
	new Function('localStorage', 'document', NO_FLASH_SCRIPT)(localStorageStub, documentStub);
	return applied;
}

describe('inline no-flash theme script', () => {
	it('applies the stored theme', () => {
		expect(runInlineScript({ stored: 'light' })).toBe('light');
	});

	it('agrees with resolveTheme on every input, valid or not', () => {
		const inputs = [null, '', 'dark', 'light', 'DARK', 'Light', 'purple', 'dark ', '0', 'null', '{"t":"light"}'];

		// Compared as whole arrays so a failure names the input that drifted, rather
		// than stopping at the first mismatch inside a loop.
		expect(inputs.map((stored) => runInlineScript({ stored }))).toEqual(inputs.map(resolveTheme));
	});

	it('survives storage access throwing, leaving the CSS default in place', () => {
		// Safari private mode and blocked-cookie contexts throw on getItem.
		expect(runInlineScript({ throwOnRead: true })).toBeNull();
	});

	it('reads the same storage key the module writes', () => {
		// Interpolated, not hardcoded: renaming STORAGE_KEY has to fail here.
		expect(NO_FLASH_SCRIPT).toContain(`'${STORAGE_KEY}'`);
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
