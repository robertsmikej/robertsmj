import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme, THEMES, STORAGE_KEY } from '../public/theme.js';

test('constants', () => {
  assert.deepEqual(THEMES, { DARK: 'dark', LIGHT: 'light' });
  assert.equal(STORAGE_KEY, 'theme');
});

test('resolveTheme: stored value wins', () => {
  assert.equal(resolveTheme('light'), 'light');
  assert.equal(resolveTheme('dark'), 'dark');
});

test('resolveTheme: defaults to dark when unset or invalid', () => {
  assert.equal(resolveTheme(null), 'dark');
  assert.equal(resolveTheme(undefined), 'dark');
  assert.equal(resolveTheme('purple'), 'dark');
  assert.equal(resolveTheme(''), 'dark');
});

test('nextTheme: flips', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});
