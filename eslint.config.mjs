import js from '@eslint/js';
import globals from 'globals';

/**
 * Flat ESLint config.
 *
 * Prettier owns formatting, so nothing here overlaps with it. The rules below
 * exist to mechanically enforce the house standards that are otherwise only
 * prose in `farmhand/resources/instructions.md`:
 *
 *   - "Strict equality (===, !==) always"            -> eqeqeq (null-comparison allowed)
 *   - "Braces around all control flow statements"    -> curly
 *   - "Maximum 2 levels of nesting per function"     -> max-depth
 *   - "Maximum function/method length: 20-25 lines"  -> max-lines-per-function
 *   - "Keep logic as simple as possible"             -> complexity
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
	{
		ignores: ['node_modules/', '.wrangler/', 'coverage/', 'docs/design-handoff/', '.superpowers/'],
	},
	js.configs.recommended,
	{
		files: ['**/*.js', '**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
		rules: {
			'eqeqeq': ['error', 'always', { null: 'ignore' }],
			'curly': ['error', 'all'],
			'max-depth': ['error', 2],
			'max-lines-per-function': ['error', { max: 25, skipBlankLines: true, skipComments: true }],
			'complexity': ['error', 8],
			'no-var': 'error',
			'prefer-const': 'error',
			'no-else-return': ['error', { allowElseIf: false }],
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		files: ['public/**/*.js'],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ['test/**/*.js', '*.config.js', '*.config.mjs'],
		languageOptions: {
			globals: globals.node,
		},
		rules: {
			// Test setup blocks and table-driven cases run long without getting harder
			// to read, and a describe() body is a declaration list, not a function.
			'max-lines-per-function': 'off',
		},
	},
	{
		// main.test.js runs under @vitest-environment jsdom because main.js is the page
		// entry point and reads the ambient `document`. Every other test builds its own
		// JSDOM and stays in the node environment.
		files: ['test/main.test.js'],
		languageOptions: {
			globals: { ...globals.node, ...globals.browser },
		},
	},
];
