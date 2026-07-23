export const THEMES = { DARK: 'dark', LIGHT: 'light' };
export const STORAGE_KEY = 'theme';

export function resolveTheme(stored) {
  if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
    return stored;
  }
  return THEMES.DARK;
}

export function nextTheme(current) {
  return current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
}
