import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { INDEX_HTML, readPublicFile } from './helpers/page.js';

/**
 * The CSP in public/_headers allows the inline no-flash script by SHA-256 hash rather
 * than by 'unsafe-inline'. That is only safe while the hash matches the script byte
 * for byte, and Prettier reformatting the HTML is enough to change it. So the hash is
 * recomputed here rather than trusted.
 */

const HEADERS = readPublicFile('_headers');

const inlineScriptHash = (() => {
	const match = INDEX_HTML.match(/<script>([\s\S]*?)<\/script>/);
	if (!match) {
		throw new Error('No inline <script> found in index.html');
	}
	return `sha256-${createHash('sha256')
		.update(/** @type {string} */ (match[1]), 'utf8')
		.digest('base64')}`;
})();

/**
 * @param {string} name
 * @returns {string}
 */
function directive(name) {
	const policy = HEADERS.match(/Content-Security-Policy:\s*(.+)/)?.[1];
	if (!policy) {
		throw new Error('No Content-Security-Policy found in public/_headers');
	}
	const found = policy
		.split(';')
		.map((part) => part.trim())
		.find((part) => part === name || part.startsWith(`${name} `));
	if (!found) {
		throw new Error(`CSP has no ${name} directive`);
	}
	return found;
}

describe('Content-Security-Policy', () => {
	it('allows the inline theme script by its current hash', () => {
		expect(directive('script-src')).toContain(`'${inlineScriptHash}'`);
	});

	it('does not fall back to unsafe-inline for scripts', () => {
		expect(directive('script-src')).not.toContain('unsafe-inline');
		expect(directive('script-src')).not.toContain('unsafe-eval');
	});

	it('restricts the dangerous sinks a static site never needs', () => {
		expect(directive('object-src')).toBe("object-src 'none'");
		expect(directive('base-uri')).toBe("base-uri 'none'");
		expect(directive('frame-ancestors')).toBe("frame-ancestors 'none'");
		expect(directive('form-action')).toBe("form-action 'none'");
	});

	it('keeps every fetch directive on the same origin', () => {
		for (const name of ['default-src', 'img-src', 'font-src', 'connect-src']) {
			expect(directive(name)).toBe(`${name} 'self'`);
		}
	});
});

describe('other response headers', () => {
	it('sets the hardening headers a static site gets for free', () => {
		expect(HEADERS).toMatch(/X-Content-Type-Options:\s*nosniff/);
		expect(HEADERS).toMatch(/Referrer-Policy:\s*strict-origin-when-cross-origin/);
		expect(HEADERS).toMatch(/Strict-Transport-Security:\s*max-age=\d+/);
		expect(HEADERS).toMatch(/Permissions-Policy:/);
	});

	it('applies the policy to every path', () => {
		expect(HEADERS).toMatch(/^\/\*$/m);
	});

	it('caches the immutable self-hosted fonts', () => {
		expect(HEADERS).toMatch(/^\/fonts\/\*$/m);
		expect(HEADERS).toMatch(/Cache-Control:.*immutable/);
	});
});
