// @ts-check
/**
 * The ESLint rules both configs share: the root one (backend, scripts) and the SPA's (src/ui/eslint.config.js).
 * Each config adds its own boundary rules on top.
 */

export const sharedRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
  ],
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
    },
  ],
  'no-console': ['error', { allow: ['warn', 'error'] }],
};
