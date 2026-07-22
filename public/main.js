import { nextTheme, THEMES, STORAGE_KEY } from './theme.js';

const root = document.documentElement;

/* ---- Theme toggle ---- */
function currentTheme() {
  return root.getAttribute('data-theme') === THEMES.LIGHT ? THEMES.LIGHT : THEMES.DARK;
}

const THEME_COLORS = { [THEMES.DARK]: '#0A1414', [THEMES.LIGHT]: '#F7F6EF' };

function syncTogglePressed(theme) {
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    btn.setAttribute('aria-pressed', String(theme === THEMES.DARK));
  }
  const meta = document.getElementById('theme-color-meta');
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[theme]);
  }
}

function initThemeToggle() {
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  syncTogglePressed(currentTheme());
  btn.addEventListener('click', () => {
    const next = nextTheme(currentTheme());
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
    root.setAttribute('data-theme', next);
    syncTogglePressed(next);
  });
}

/* ---- Hero canvas scaling ----
   The hero is a fixed design canvas (1440x760 desktop, 390x760 mobile) so the
   pixel-positioned animation overlays stay aligned. Scale it to viewport width. */
const DESKTOP_W = 1440;
const MOBILE_W = 390;
const DESIGN_H = 760;
const mobileQuery = matchMedia('(max-width: 768px)');

function setHeroScale() {
  const designW = mobileQuery.matches ? MOBILE_W : DESKTOP_W;
  const scale = window.innerWidth / designW;
  root.style.setProperty('--hero-scale', String(scale));
  root.style.setProperty('--hero-h', `${DESIGN_H * scale}px`);
}

function init() {
  initThemeToggle();
  setHeroScale();
  window.addEventListener('resize', setHeroScale);
  mobileQuery.addEventListener('change', setHeroScale);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
