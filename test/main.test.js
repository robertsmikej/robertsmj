// @vitest-environment jsdom
//
// The only test file that needs a global document: main.js is the page entry point,
// so it reads `document` directly and wires itself up on import. Everything else
// takes a Document as a parameter and runs in the default node environment.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INDEX_HTML } from './helpers/page.js';

/**
 * Rebuild the real page inside the ambient jsdom document, minus the inline script
 * (which jsdom would not run here anyway).
 *
 * @returns {void}
 */
function renderRealPage() {
	const head = INDEX_HTML.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
	const body = INDEX_HTML.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
	document.head.innerHTML = head.replace(/<script>[\s\S]*?<\/script>/g, '');
	document.body.innerHTML = body;
	document.documentElement.setAttribute('data-theme', 'dark');
}

beforeEach(() => {
	vi.resetModules();
	vi.restoreAllMocks();
	renderRealPage();
});

describe('main entry point', () => {
	it('wires the theme toggle when the document is already parsed', async () => {
		await import('../public/main.js');

		/** @type {HTMLElement} */ (document.querySelector('[data-theme-toggle]')).click();

		expect(document.documentElement.getAttribute('data-theme')).toBe('light');
	});

	it('waits for DOMContentLoaded when the document is still loading', async () => {
		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');

		await import('../public/main.js');

		// Nothing is wired yet, so a click must not change the theme.
		/** @type {HTMLElement} */ (document.querySelector('[data-theme-toggle]')).click();
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

		readyState.mockRestore();
		document.dispatchEvent(new Event('DOMContentLoaded'));

		/** @type {HTMLElement} */ (document.querySelector('[data-theme-toggle]')).click();
		expect(document.documentElement.getAttribute('data-theme')).toBe('light');
	});

	it('does not throw on a page with no toggle button', async () => {
		document.body.innerHTML = '<p>No toggle here.</p>';

		await expect(import('../public/main.js')).resolves.toBeDefined();
	});
});
