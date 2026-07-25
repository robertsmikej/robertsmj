import { describe, expect, it } from 'vitest';

import { JSDOM } from 'jsdom';

import { publicFileExists, readPublicFile } from './helpers/page.js';

/**
 * An assets-only Worker with no `not_found_handling` returns a bare 404 with an empty
 * body for every mistyped URL. These tests pin both halves of the fix: the page exists
 * and is usable, and the Worker is actually configured to serve it.
 */

const NOT_FOUND_HTML = readPublicFile('404.html');
const WRANGLER_CONFIG = readPublicFile('../wrangler.jsonc');

// Comments in this page explain why it carries no inline script or style, so they
// mention those tags by name. Strip them before asserting the tags are absent.
const NOT_FOUND_MARKUP = NOT_FOUND_HTML.replace(/<!--[\s\S]*?-->/g, '');

const doc = new JSDOM(NOT_FOUND_HTML, { url: 'https://robertsmj.com/nope' }).window.document;

describe('wrangler assets configuration', () => {
	it('serves the 404 page instead of an empty body', () => {
		expect(WRANGLER_CONFIG).toMatch(/"not_found_handling":\s*"404-page"/);
	});

	it('ships the page that setting points at', () => {
		expect(publicFileExists('/404.html')).toBe(true);
	});
});

describe('404 page', () => {
	it('gives the visitor a way back', () => {
		const home = [...doc.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));

		expect(home).toContain('/');
	});

	it('keeps itself out of search results', () => {
		expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
	});

	it('declares a language and a title', () => {
		expect(doc.documentElement.getAttribute('lang')).toBe('en');
		expect(doc.title.trim()).toBeTruthy();
	});

	it('has exactly one h1 and no skipped heading levels', () => {
		expect(doc.querySelectorAll('h1')).toHaveLength(1);
		expect([...doc.querySelectorAll('h2, h3, h4, h5, h6')]).toEqual([]);
	});

	it('carries no inline script, so it needs no CSP hash of its own', () => {
		// A hash here would be a second thing to keep in sync in _headers, and this page
		// has no behaviour to justify it.
		expect(NOT_FOUND_MARKUP).not.toMatch(/<script/);
	});

	it('carries no inline style element, which style-src-elem would block', () => {
		expect(NOT_FOUND_MARKUP).not.toMatch(/<style[\s>]/);
	});

	it('styles itself from the shared stylesheet', () => {
		expect(doc.querySelector('link[rel="stylesheet"]')?.getAttribute('href')).toBe('/styles.css');
	});

	it('references only assets that get deployed', () => {
		const urls = [
			...[...doc.querySelectorAll('a[href^="/"], link[href^="/"]')].map((el) => el.getAttribute('href')),
			...[...doc.querySelectorAll('script[src^="/"], img[src^="/"]')].map((el) => el.getAttribute('src')),
		].filter((url) => url !== null);

		expect(urls.length).toBeGreaterThan(0);
		expect(urls.filter((url) => !publicFileExists(/** @type {string} */ (url)))).toEqual([]);
	});

	it('uses only classes the stylesheet actually defines', () => {
		const styles = readPublicFile('styles.css');
		const classes = new Set(
			[...doc.querySelectorAll('[class]')].flatMap((el) => el.getAttribute('class')?.split(/\s+/) ?? []),
		);

		expect(classes.size).toBeGreaterThan(0);
		expect([...classes].filter((name) => name && !styles.includes(`.${name}`))).toEqual([]);
	});
});
