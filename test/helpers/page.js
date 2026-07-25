import { existsSync, readFileSync } from 'node:fs';
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

/**
 * Does a root-relative URL resolve to a file that will actually be deployed?
 *
 * `/` and any extension-less path map to the directory's index.html, matching how the
 * Workers assets handler serves them.
 *
 * @param {string} urlPath
 * @returns {boolean}
 */
export function publicFileExists(urlPath) {
	const withoutQuery = urlPath.split(/[?#]/)[0] ?? '';
	const relative = withoutQuery.replace(/^\//, '');
	const target = relative === '' || relative.endsWith('/') ? `${relative}index.html` : relative;
	return existsSync(join(PUBLIC_DIR, target));
}

export const INDEX_HTML = readPublicFile('index.html');

/**
 * Every inline `<script>` in index.html, in document order.
 *
 * The negative lookahead skips `<script src=...>` tags, and the pattern tolerates
 * attributes on the tag. An earlier version matched `/<script>/` exactly, which would
 * silently retarget to a different script if the no-flash tag ever gained an
 * attribute, and would ignore any additional inline script entirely. Both matter:
 * the CSP allows inline script by hash, so an unhashed one is blocked in production.
 *
 * @type {string[]}
 */
export const INLINE_SCRIPTS = [...INDEX_HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
	(match) => /** @type {string} */ (match[1]),
);

/**
 * The no-flash theme script. Asserting its identity here rather than trusting
 * position means a mis-extraction fails loudly, in one place, for every test that
 * depends on it.
 *
 * @type {string}
 */
export const NO_FLASH_SCRIPT = (() => {
	const candidates = INLINE_SCRIPTS.filter((body) => body.includes('data-theme'));
	if (candidates.length !== 1) {
		throw new Error(`Expected exactly one inline script setting data-theme, found ${candidates.length}`);
	}
	return /** @type {string} */ (candidates[0]);
})();

/**
 * Parse a Cloudflare `_headers` file into `{ path: { header: value } }`.
 *
 * Path blocks start at column zero; header lines are indented beneath them. Comment
 * and blank lines are dropped, so a header name appearing inside the explanatory
 * comment block cannot be mistaken for a real one.
 *
 * Scoping matters: a test that greps the whole file for `Content-Security-Policy`
 * passes even when the policy has been moved under a path that no HTML document
 * matches, which would ship every page with no CSP at all.
 *
 * @param {string} contents
 * @returns {Record<string, Record<string, string>>}
 */
export function parseHeadersFile(contents) {
	/** @type {Record<string, Record<string, string>>} */
	const blocks = {};
	/** @type {string | null} */
	let currentPath = null;

	for (const line of significantLines(contents)) {
		if (isPathLine(line)) {
			currentPath = line.trim();
			blocks[currentPath] ??= {};
			continue;
		}
		addHeader(currentPath === null ? undefined : blocks[currentPath], line);
	}
	return blocks;
}

/**
 * The file's lines with blanks and comments dropped, so a header name mentioned in the
 * explanatory comment block cannot be mistaken for a real one.
 *
 * @param {string} contents
 * @returns {Generator<string>}
 */
function* significantLines(contents) {
	for (const rawLine of contents.split('\n')) {
		const line = rawLine.trimEnd();
		if (line.trim() && !line.trim().startsWith('#')) {
			yield line;
		}
	}
}

/**
 * Path patterns start at column zero; their headers are indented beneath them.
 *
 * @param {string} line
 * @returns {boolean}
 */
function isPathLine(line) {
	return !/^\s/.test(line);
}

/**
 * @param {Record<string, string> | undefined} block
 * @param {string} line
 * @returns {void}
 */
function addHeader(block, line) {
	const separator = line.indexOf(':');
	if (!block || separator === -1) {
		return;
	}
	block[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}

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
