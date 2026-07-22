import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, THEMES, STORAGE_KEY } from '../public/theme.js';

test('constants', () => {
  assert.deepEqual(THEMES, { DARK: 'dark', LIGHT: 'light' });
  assert.equal(STORAGE_KEY, 'theme');
});

test('resolveTheme: stored value wins over system', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('resolveTheme: falls back to system when unset or invalid', () => {
  assert.equal(resolveTheme(null, true), 'dark');
  assert.equal(resolveTheme(null, false), 'light');
  assert.equal(resolveTheme('purple', true), 'dark');
  assert.equal(resolveTheme('', false), 'light');
});

test('nextTheme: flips', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});
