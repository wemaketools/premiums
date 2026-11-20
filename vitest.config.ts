/** Root Vitest: the pure layers (contracts, rules engine, read model, mock API) and the CI scripts. The SPA has its own suite in src/ui. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: [
      'src/contracts/**/*.test.ts',
      'src/mock-api/**/*.test.ts',
      'src/read-model/**/*.test.ts',
      'src/rules/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
    testTimeout: 20_000,
  },
});
