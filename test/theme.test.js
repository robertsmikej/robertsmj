import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, nextTheme, resolveTheme, STORAGE_KEY, THEMES } from '../public/theme.js';

describe('theme vocabulary', () => {
	it('exposes exactly the two theme values used by the stylesheet', () => {
		expect(THEMES).toEqual({ DARK: 'dark', LIGHT: 'light' });
	});

	it('stores the choice under the key the inline no-flash script reads', () => {
		expect(STORAGE_KEY).toBe('theme');
	});

	it('defaults to dark, matching the :root tokens a no-JS visitor gets', () => {
		expect(DEFAULT_THEME).toBe(THEMES.DARK);
	});
});

describe('resolveTheme', () => {
	it('keeps a stored theme the visitor explicitly chose', () => {
		expect(resolveTheme('light')).toBe('light');
		expect(resolveTheme('dark')).toBe('dark');
	});

	it('falls back to dark when nothing is stored', () => {
		expect(resolveTheme(null)).toBe('dark');
		expect(resolveTheme(undefined)).toBe('dark');
		expect(resolveTheme('')).toBe('dark');
	});

	it('falls back to dark rather than trusting an unrecognised stored value', () => {
		// localStorage is visitor-writable, so this is untrusted input.
		expect(resolveTheme('purple')).toBe('dark');
		expect(resolveTheme('DARK')).toBe('dark');
		expect(resolveTheme('dark ')).toBe('dark');
		expect(resolveTheme('{"theme":"light"}')).toBe('dark');
	});
});

describe('nextTheme', () => {
	it('flips between the two themes', () => {
		expect(nextTheme('dark')).toBe('light');
		expect(nextTheme('light')).toBe('dark');
	});

	it('returns to the starting theme after two flips', () => {
		expect(nextTheme(nextTheme('dark'))).toBe('dark');
		expect(nextTheme(nextTheme('light'))).toBe('light');
	});
});
