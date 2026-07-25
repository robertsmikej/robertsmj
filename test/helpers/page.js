import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { JSDOM } from 'jsdom';

// Resolved from this file's own location (not cwd), and as a path string rather than
// a URL object: under the jsdom test environment the global URL is jsdom's
// implementation, which node:fs refuses with "The URL must be of scheme file".
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public');

/**
 * Read a file from public/ as text.
 *
 * @param {string} name
 * @returns {string}
 */
export function readPublicFile(name) {
	return readFileSync(join(PUBLIC_DIR, name), 'utf8');
}

export const INDEX_HTML = readPublicFile('index.html');

/**
 * Parse the real index.html into a fresh JSDOM.
 *
 * Tests run against the shipped markup rather than a hand-written fixture, so a
 * change that breaks the contract between the HTML and the JS (a renamed
 * `data-theme-toggle`, a removed meta tag) fails here instead of in production.
 *
 * `runScripts: 'outside-only'` gives the window a working `localStorage` while
 * leaving the page's own inline script unexecuted, so each test starts from the
 * markup as authored and applies only what it calls explicitly.
 *
 * @returns {JSDOM}
 */
export function loadIndexPage() {
	return new JSDOM(INDEX_HTML, {
		url: 'https://robertsmj.com/',
		runScripts: 'outside-only',
	});
}
