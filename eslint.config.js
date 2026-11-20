// @ts-check
/**
 * ESLint flat config for the pure layers and scripts.
 *
 * `npm run lint` lints src/contracts, src/mock-api, src/read-model, src/rules and scripts. The SPA has its own config
 * (src/ui/eslint.config.js); the Playwright workspace is type-checked with `npm run typecheck:e2e`.
 *
 * Guards encoded here, and why:
 * - src/contracts is pure TypeScript + zod (+ decimal.js for money), shared by the SPA and the mock API: no Node or
 *   browser APIs, no imports other than those and sibling contract files. Contract tests (*.test.ts) may use Node APIs.
 * - src/rules (the collections rules engine) is pure too: only zod, decimal.js, its own files and src/contracts.
 * - src/read-model (the record sets and the reads the mock API answers through) is pure as well: zod, decimal.js, its
 *   own files, src/contracts and src/rules, and nothing of the mock API or the SPA.
 * - The mock API runs in the browser (no Node modules outside its tests).
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { sharedRules } from './eslint.shared.js';

const CONFIG_ONLY = 'The shared layers never read process.env: they run in the browser.';

/** Blocks every way of reaching process.env. */
const processEnvImportPaths = [
  { name: 'node:process', importNames: ['env'], message: CONFIG_ONLY },
  { name: 'process', importNames: ['env'], message: CONFIG_ONLY },
];

const MOCK_API_BOUNDARY = {
  group: ['**/mock-api', '**/mock-api/**'],
  message: 'The read model is shared by every transport: it never imports the mock API.',
};
const SPA_BOUNDARY = {
  group: ['**/ui/src', '**/ui/src/**'],
  message: 'The shared layers never import the SPA.',
};
const CONTRACTS_PURITY = {
  regex: '^(?!zod(?:/|$)|decimal\\.js$|\\.{1,2}/)',
  message:
    'src/contracts is pure: import only zod, decimal.js and sibling contract files. No Node, browser or server modules.',
};
const RULES_PURITY = {
  regex: '^(?!zod(?:/|$)|decimal\\.js$|\\./|\\.\\./contracts/)',
  message:
    'src/rules is pure: import only zod, decimal.js, files of src/rules and src/contracts. No Node, browser, mock API or server modules.',
};
const READ_MODEL_PURITY = {
  regex: '^(?!zod(?:/|$)|decimal\\.js$|\\.{1,2}/)',
  message:
    'src/read-model is pure: import only zod, decimal.js, files of src/read-model, src/contracts and src/rules. No Node, browser, mock API or server modules.',
};
const READ_MODEL_BOUNDARIES = [MOCK_API_BOUNDARY, SPA_BOUNDARY];
const PURE_GLOBALS = [
  'process',
  'Buffer',
  'require',
  '__dirname',
  '__filename',
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'fetch',
  'XMLHttpRequest',
];
const BROWSER_SAFE = {
  regex: '^(node:|fs$|path$|os$|child_process$)',
  message: 'src/mock-api runs in the browser: no Node modules outside its tests.',
};

export default defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    'src/ui/',
    'e2e_tests/',
    'docs/',
    '.build/',
    '.qa-scratch/',
    '.test-results/',
  ]),
  {
    name: 'premiums/shared',
    files: ['**/*.{ts,mts,cts,js,mjs,cjs}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...sharedRules,
      'no-restricted-properties': ['error', { object: 'process', property: 'env', message: CONFIG_ONLY }],
      'no-restricted-imports': ['error', { paths: processEnvImportPaths }],
    },
  },
  {
    name: 'premiums/contracts-purity',
    files: ['src/contracts/**/*.ts'],
    ignores: ['src/contracts/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: processEnvImportPaths, patterns: [CONTRACTS_PURITY] }],
      'no-restricted-globals': [
        'error',
        ...PURE_GLOBALS.map((name) => ({ name, message: 'src/contracts is pure: no Node or browser APIs.' })),
      ],
    },
  },
  {
    name: 'premiums/rules-purity',
    files: ['src/rules/**/*.ts'],
    ignores: ['src/rules/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: processEnvImportPaths, patterns: [RULES_PURITY] }],
      'no-restricted-globals': [
        'error',
        ...PURE_GLOBALS.map((name) => ({ name, message: 'src/rules is pure: no Node or browser APIs.' })),
      ],
    },
  },
  {
    name: 'premiums/read-model-boundary',
    files: ['src/read-model/**/*.ts'],
    ignores: ['src/read-model/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: processEnvImportPaths, patterns: READ_MODEL_BOUNDARIES }],
    },
  },
  {
    name: 'premiums/read-model-purity',
    files: ['src/read-model/**/*.ts'],
    ignores: ['src/read-model/**/*.test.ts', 'src/read-model/test-support/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: processEnvImportPaths, patterns: [READ_MODEL_PURITY, ...READ_MODEL_BOUNDARIES] }],
      'no-restricted-globals': [
        'error',
        ...PURE_GLOBALS.map((name) => ({ name, message: 'src/read-model is pure: no Node or browser APIs.' })),
      ],
    },
  },
  {
    name: 'premiums/mock-api-browser-safe',
    files: ['src/mock-api/**/*.ts'],
    ignores: ['src/mock-api/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: processEnvImportPaths, patterns: [BROWSER_SAFE] }],
    },
  },
]);
