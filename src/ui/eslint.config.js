// @ts-check
/**
 * SPA ESLint flat config: typescript-eslint, react-hooks (the upstream flat `recommended` preset, including the
 * React Compiler correctness rules), react-refresh and Prettier compatibility. `npm run lint:ui` also runs `prettier --check`, and warnings fail the lint (`--max-warnings 0`).
 *
 * Boundaries enforced here:
 * - Screens talk to the API only through src/api/client.ts.
 * - The mock API (src/mock-api) is imported only by src/api/mockTransport.ts, the one place that picks the transport,
 *   and by tests; screens call the typed endpoints.
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { sharedRules } from '../../eslint.shared.js';

const MOCK_API_BOUNDARY = {
  group: ['**/mock-api', '**/mock-api/**'],
  message:
    'Screens talk to the typed API through src/api/client.ts. Only src/api/mockTransport.ts imports the mock API.',
};

export default defineConfig([
  globalIgnores(['dist/', 'dist-e2e/', 'node_modules/', 'public/']),
  {
    name: 'premiums-ui/base',
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...sharedRules,
      'no-restricted-syntax': [
        'error',
        ...[
          "NewExpression[callee.name='ApiError'] > ObjectExpression > Property[key.name='title'] > :matches(Literal, TemplateLiteral)",
          "NewExpression[callee.name='ApiError'] > ObjectExpression > Property[key.name='title'] > :matches(ConditionalExpression, LogicalExpression) > :matches(Literal, TemplateLiteral)",
        ].map((selector) => ({
          selector,
          message: 'An ApiError title is shown to the user: take it from the catalog with t().',
        })),
      ],
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: [MOCK_API_BOUNDARY] }],
    },
  },
  {
    name: 'premiums-ui/mock-api-importers',
    files: ['src/api/mockTransport.ts', '**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-restricted-imports': 'off' },
  },
  {
    name: 'premiums-ui/non-component-modules',
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}', 'src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    name: 'premiums-ui/tooling',
    files: ['vite.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  prettier,
]);
