import { defineConfig } from 'vitest/config';

/**
 * The environment is `node`, not `jsdom`, on purpose. The DOM-facing modules take
 * a `Document` as a parameter, so each test builds its own throwaway JSDOM and
 * passes it in. That keeps tests independent by construction instead of relying
 * on resetting shared globals between cases.
 *
 * No coverage thresholds: the house standard asks for coverage of "logic that
 * matters" and explicitly does not demand tests for trivial code, so the numbers
 * are reported for judgement rather than gated on an invented percentage.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['test/**/*.test.js'],
		coverage: {
			provider: 'v8',
			include: ['public/**/*.js'],
			reporter: ['text', 'html'],
		},
	},
});
