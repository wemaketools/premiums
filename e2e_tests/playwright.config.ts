/**
 * Playwright: one project on a PRODUCTION build of the SPA (`vite build`, then `vite preview` on PREVIEW_PORT, default
 * 5381), the static demo Vercel deploys. It needs no backend: the mock API runs in the browser over the bundled
 * fixtures, and each test starts from a fresh browser context, so from the unchanged fixture.
 *
 * Run from the repository root: `npm run test:e2e`.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

import { envValue } from './env';
import { origin, serverCommand } from './projects';

const uiDir = fileURLToPath(new URL('../src/ui', import.meta.url));
const isCI = envValue('CI') !== undefined;

export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  ...(isCI ? { workers: 2 } : {}),
  reporter: isCI
    ? [['github'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  projects: [{ name: 'prototype', use: { baseURL: origin } }],
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: serverCommand,
    cwd: uiDir,
    url: origin,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
