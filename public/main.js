/**
 * Page entry point. Deliberately holds no logic of its own: it only wires the
 * behavior modules to this document, so everything with logic in it stays
 * testable without a browser.
 *
 * Hero sizing used to live here, recomputing `--hero-scale` and `--hero-h` on every
 * resize event. It is now pure CSS (`calc(100vw / 1440px)` in styles.css), which
 * produces identical values, drops an unthrottled resize handler, and makes the
 * hero render correctly with JavaScript disabled.
 */

import { initThemeToggle } from './theme-toggle.js';

function init() {
	initThemeToggle(document);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
