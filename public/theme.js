export const THEMES = { DARK: 'dark', LIGHT: 'light' };
export const STORAGE_KEY = 'theme';

export function resolveTheme(stored, systemPrefersDark) {
  if (stored === THEMES.DARK || stored === THEMES.LIGHT) {
    return stored;
  }
  return systemPrefersDark ? THEMES.DARK : THEMES.LIGHT;
}

export function nextTheme(current) {
  return current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
}
