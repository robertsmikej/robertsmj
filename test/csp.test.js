import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { INLINE_SCRIPTS, parseHeadersFile, readPublicFile } from './helpers/page.js';

/**
 * The CSP in public/_headers allows inline script by SHA-256 hash rather than by
 * 'unsafe-inline'. That is only safe while every inline script is hashed and the
 * hashes match byte for byte, and Prettier reformatting the HTML is enough to change
 * them. So the hashes are recomputed here rather than trusted.
 *
 * Headers are read from the parsed `/*` block, not grepped out of the file. Grepping
 * passes even when the policy has been moved under a path no document matches.
 */

const HEADERS_FILE = readPublicFile('_headers');
const BLOCKS = parseHeadersFile(HEADERS_FILE);
const ALL_PATHS = '/*';

/** @param {string} body @returns {string} */
const sha256 = (body) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;

/**
 * @param {string} path
 * @param {string} name
 * @returns {string}
 */
function header(path, name) {
	const value = BLOCKS[path]?.[name];
	if (!value) {
		throw new Error(`public/_headers has no ${name} under "${path}". Blocks found: ${Object.keys(BLOCKS).join(', ')}`);
	}
	return value;
}

/**
 * @param {string} name
 * @returns {string}
 */
function directive(name) {
	const found = header(ALL_PATHS, 'Content-Security-Policy')
		.split(';')
		.map((part) => part.trim())
		.find((part) => part === name || part.startsWith(`${name} `));
	if (!found) {
		throw new Error(`CSP has no ${name} directive`);
	}
	return found;
}

describe('Content-Security-Policy', () => {
	it('applies to every path, not just a subdirectory', () => {
		expect(Object.keys(BLOCKS)).toContain(ALL_PATHS);
		expect(header(ALL_PATHS, 'Content-Security-Policy')).toContain('default-src');
	});

	it('allows every inline script by its current hash', () => {
		expect(INLINE_SCRIPTS.length).toBeGreaterThan(0);

		const scriptSrc = directive('script-src');
		for (const body of INLINE_SCRIPTS) {
			expect(scriptSrc).toContain(`'${sha256(body)}'`);
		}
	});

	it('hashes no more and no fewer scripts than the page actually inlines', () => {
		// A stale hash left behind after a script is removed is harmless; a missing one
		// means that script is silently blocked in production.
		const hashCount = (directive('script-src').match(/'sha256-/g) ?? []).length;

		expect(hashCount).toBe(INLINE_SCRIPTS.length);
	});

	it('does not fall back to unsafe-inline or unsafe-eval for scripts', () => {
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

	it('blocks injected <style> elements even though style attributes are allowed', () => {
		// The artwork needs style attributes, which reach style-src via style-src-attr.
		// Inline <style> elements have no such need, so they stay blocked.
		expect(directive('style-src-elem')).toBe("style-src-elem 'self'");
	});
});

describe('hardening headers', () => {
	it('blocks MIME sniffing on every path', () => {
		expect(header(ALL_PATHS, 'X-Content-Type-Options')).toBe('nosniff');
	});

	it('refuses framing for engines that never implemented frame-ancestors', () => {
		expect(header(ALL_PATHS, 'X-Frame-Options')).toBe('DENY');
	});

	it('trims the referrer on cross-origin navigation', () => {
		expect(header(ALL_PATHS, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
	});

	it('pins HTTPS for at least a year', () => {
		// max-age=0 would satisfy a bare /max-age=\d+/ while disabling HSTS entirely.
		const hsts = header(ALL_PATHS, 'Strict-Transport-Security');
		const maxAge = Number(hsts.match(/max-age=(\d+)/)?.[1]);

		expect(maxAge).toBeGreaterThanOrEqual(31536000);
		expect(hsts).toContain('includeSubDomains');
	});

	it('denies the powerful features this site never uses', () => {
		// Asserting the header exists is not enough: an empty value denies nothing.
		const policy = header(ALL_PATHS, 'Permissions-Policy');

		for (const feature of ['geolocation', 'microphone', 'camera', 'payment', 'usb']) {
			expect(policy).toContain(`${feature}=()`);
		}
	});

	it('isolates the browsing context group', () => {
		expect(header(ALL_PATHS, 'Cross-Origin-Opener-Policy')).toBe('same-origin');
	});
});

describe('caching', () => {
	it('caches the immutable self-hosted fonts', () => {
		expect(header('/fonts/*', 'Cache-Control')).toMatch(/immutable/);
		expect(header('/fonts/*', 'Cache-Control')).toMatch(/max-age=\d{7,}/);
	});
});
