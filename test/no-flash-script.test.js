import { describe, expect, it } from 'vitest';

import { resolveTheme } from '../public/theme.js';

import { INDEX_HTML } from './helpers/page.js';

/**
 * The inline `<script>` in index.html reimplements resolveTheme() because it has to
 * run before first paint, and an ES module import would be deferred. That makes it
 * the one piece of genuinely duplicated logic in the repo.
 *
 * Rather than trust the comment that says the two agree, these tests pull the real
 * snippet out of index.html and execute it, so drift fails the build.
 */
const inlineScript = (() => {
	const body = INDEX_HTML.match(/<script>([\s\S]*?)<\/script>/)?.[1];
	if (!body) {
		throw new Error('No inline <script> found in index.html; the no-flash theme init is missing.');
	}
	return body;
})();

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
		getItem() {
			if (throwOnRead) {
				throw new Error('Access denied for this document origin.');
			}
			return stored;
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
	new Function('localStorage', 'document', inlineScript)(localStorageStub, documentStub);
	return applied;
}

describe('inline no-flash theme script', () => {
	it('is present and sets data-theme before paint', () => {
		expect(inlineScript).toContain('data-theme');
		expect(runInlineScript({ stored: 'light' })).toBe('light');
	});

	it('agrees with resolveTheme on every input, valid or not', () => {
		const inputs = [null, undefined, '', 'dark', 'light', 'DARK', 'Light', 'purple', 'dark ', '0', 'null'];

		for (const stored of inputs) {
			expect(runInlineScript({ stored: /** @type {string | null} */ (stored ?? null) })).toBe(
				resolveTheme(/** @type {string | null | undefined} */ (stored)),
			);
		}
	});

	it('survives storage access throwing, leaving the CSS default in place', () => {
		// Safari private mode and blocked-cookie contexts throw on getItem.
		expect(() => runInlineScript({ throwOnRead: true })).not.toThrow();
		expect(runInlineScript({ throwOnRead: true })).toBeNull();
	});

	it('reads the same storage key the module writes', () => {
		expect(inlineScript).toContain("'theme'");
	});
});
