// @vitest-environment jsdom
//
// The only test file that needs a global document: main.js is the page entry point,
// so it reads `document` directly and wires itself up on import. Everything else
// takes a Document as a parameter and runs in the default node environment.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INDEX_HTML } from './helpers/page.js';

/**
 * Listeners that main.js attached to the shared jsdom `document`.
 *
 * `document.innerHTML` resets discard element listeners but never document-level ones,
 * and `vi.resetModules()` only clears the module registry. Without tracking these, the
 * DOMContentLoaded handler from one test stays registered and fires in later ones,
 * which is exactly the cross-test coupling this suite claims not to have.
 *
 * @type {Array<[string, EventListenerOrEventListenerObject]>}
 */
let documentListeners = [];

/**
 * Rebuild the real page inside the ambient jsdom document, minus the inline script
 * (which jsdom would not run here anyway).
 *
 * @returns {void}
 */
function renderRealPage() {
	const head = INDEX_HTML.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1];
	const body = INDEX_HTML.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1];
	if (!head || !body) {
		// Defaulting to '' here would render a blank page and fail later with a
		// confusing null dereference instead of naming the real problem.
		throw new Error('Could not extract <head> and <body> from index.html');
	}
	document.head.innerHTML = head.replace(/<script>[\s\S]*?<\/script>/g, '');
	document.body.innerHTML = body;
	document.documentElement.setAttribute('data-theme', 'dark');
}

const toggle = () => /** @type {HTMLElement | null} */ (document.querySelector('[data-theme-toggle]'));
const theme = () => document.documentElement.getAttribute('data-theme');

beforeEach(() => {
	vi.resetModules();
	renderRealPage();

	documentListeners = [];
	const realAddEventListener = document.addEventListener.bind(document);
	vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
		documentListeners.push([type, /** @type {EventListenerOrEventListenerObject} */ (listener)]);
		realAddEventListener(type, /** @type {EventListenerOrEventListenerObject} */ (listener), options);
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	for (const [type, listener] of documentListeners) {
		document.removeEventListener(type, listener);
	}
	documentListeners = [];
});

describe('main entry point', () => {
	it('wires the theme toggle when the document is already parsed', async () => {
		await import('../public/main.js');

		/** @type {HTMLElement} */ (toggle()).click();

		expect(theme()).toBe('light');
	});

	it('waits for DOMContentLoaded when the document is still loading', async () => {
		const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');

		await import('../public/main.js');

		// Nothing is wired yet, so a click must not change the theme.
		/** @type {HTMLElement} */ (toggle()).click();
		expect(theme()).toBe('dark');

		readyState.mockRestore();
		document.dispatchEvent(new Event('DOMContentLoaded'));

		/** @type {HTMLElement} */ (toggle()).click();
		expect(theme()).toBe('light');
	});

	it('leaves a page with no toggle button untouched instead of throwing', async () => {
		document.body.innerHTML = '<p>No toggle here.</p>';

		await import('../public/main.js');

		// The observable outcome, not just "the import resolved": a module namespace
		// object is always defined, so asserting that proves nothing.
		expect(toggle()).toBeNull();
		expect(theme()).toBe('dark');
	});
});

describe('test isolation', () => {
	it('inherits no wiring from the tests above', () => {
		// This test never imports main.js, so nothing should be listening. If the
		// DOMContentLoaded handler registered by an earlier test had survived, this
		// dispatch would wire the toggle and the click would flip the theme.
		document.dispatchEvent(new Event('DOMContentLoaded'));
		/** @type {HTMLElement} */ (toggle()).click();

		expect(theme()).toBe('dark');
	});
});
