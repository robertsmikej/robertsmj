import { describe, expect, it } from 'vitest';

import { INLINE_SCRIPTS, loadIndexPage } from './helpers/page.js';

/**
 * The JSON-LD Person block is what search engines and link previews read about the
 * site's owner. Nothing renders it, so a typo that breaks the JSON or points `sameAs`
 * at a profile the footer no longer links would go unnoticed without these.
 */

const JSON_LD_TYPE = 'application/ld+json';

/** @returns {Record<string, unknown>} */
function loadPersonBlock() {
	const doc = loadIndexPage().window.document;
	const blocks = [...doc.querySelectorAll(`script[type="${JSON_LD_TYPE}"]`)];
	expect(blocks).toHaveLength(1);
	return JSON.parse(blocks[0]?.textContent ?? '');
}

describe('JSON-LD Person', () => {
	it('parses as JSON and describes a schema.org Person', () => {
		const person = loadPersonBlock();

		expect(person['@context']).toBe('https://schema.org');
		expect(person['@type']).toBe('Person');
		expect(person.name).toBe('Mike Roberts');
	});

	it('points url and image at the canonical origin', () => {
		const person = loadPersonBlock();
		const canonical = loadIndexPage().window.document.querySelector('link[rel="canonical"]')?.getAttribute('href');

		expect(person.url).toBe(canonical);
		expect(person.image).toBe(`${canonical}og.png`);
	});

	it('lists only profiles the footer actually links to', () => {
		const person = loadPersonBlock();
		const doc = loadIndexPage().window.document;
		const footerLinks = new Set(
			[...doc.querySelectorAll('.footer__links a[rel~="me"]')].map((a) => a.getAttribute('href')),
		);

		expect(footerLinks.size).toBeGreaterThan(0);
		expect(person.sameAs).toEqual([...footerLinks]);
	});

	it('uses the same contact address as the CTAs', () => {
		const person = loadPersonBlock();
		const doc = loadIndexPage().window.document;
		const mailto = doc.querySelector('.hero__cta a[href^="mailto:"]')?.getAttribute('href');

		expect(mailto).toBeTruthy();
		expect(person.email).toBe(mailto);
	});

	it('is counted among the inline scripts the CSP has to hash', () => {
		// The block never executes, but the CSP test derives its hash list from
		// INLINE_SCRIPTS. If the extraction ever skipped data blocks, an executable
		// inline script with a type attribute could slip through unhashed too.
		expect(INLINE_SCRIPTS.some((body) => body.includes('"@type": "Person"'))).toBe(true);
	});
});
