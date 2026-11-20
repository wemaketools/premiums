/**
 * Vite + Vitest configuration for the Premium Collections SPA.
 *
 * - The build is a static site: the mock API (`src/mock-api`, `src/read-model`, `src/rules`) runs in the browser over
 *   the CSV fixtures (`fixtures/`), which sit outside `src/ui`, so the dev server may serve the repository root
 *   (`server.fs.allow`).
 * - The Content-Security-Policy meta tag in index.html is filled in here, because the dev server needs relaxations a
 *   production build must not carry (see `contentSecurityPolicy`).
 */
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const uiDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const rootNodeModules = fileURLToPath(new URL('../../node_modules', import.meta.url));

/** Build-time token in index.html that this config replaces with the policy. */
const CSP_TOKEN = '__PREMIUMS_CONTENT_SECURITY_POLICY__';

/**
 * The SPA document gets its CSP from a <meta http-equiv> tag.
 * - Production builds: scripts only from the app's own origin; network only to the app (the mock API answers in the
 *   page and calls nothing); fonts self-hosted, so no font origin is allowed.
 * - Dev server: Vite's React Fast Refresh preamble is an inline module script and HMR uses a websocket, so the dev
 *   policy adds 'unsafe-inline' for scripts and ws:/wss: for connections.
 * Inline style attributes stay allowed ('unsafe-inline' in style-src): React and Recharts set styles at runtime.
 */
function contentSecurityPolicy(): Plugin {
  let isDevServer = false;
  return {
    name: 'premiums:content-security-policy',
    configResolved(config) {
      isDevServer = config.command === 'serve';
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes(CSP_TOKEN)) {
          throw new Error(
            `index.html must keep the Content-Security-Policy meta tag with content="${CSP_TOKEN}".`,
          );
        }
        const policy = [
          "default-src 'self'",
          isDevServer ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          `connect-src 'self'${isDevServer ? ' ws: wss:' : ''}`,
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ');
        return html.replace(CSP_TOKEN, policy);
      },
    },
  };
}

export default defineConfig({
  root: uiDir,
  plugins: [react(), contentSecurityPolicy()],
  // Crawl every source module at startup so dependencies reached only through lazy routes are pre-bundled up front.
  // Otherwise the dev server re-optimizes and reloads the page mid-session, which breaks Playwright runs.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/test/**'],
  },
  server: {
    port: 5283,
    strictPort: true,
    fs: { strict: true, allow: [repoRoot, rootNodeModules] },
    warmup: { clientFiles: ['./src/main.tsx'] },
  },
  preview: {
    port: 4283,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-is|scheduler|react-router)[\\/]/,
              priority: 40,
            },
            {
              name: 'vendor-state',
              test: /[\\/]node_modules[\\/](@reduxjs|react-redux|redux|immer|reselect|redux-thunk)[\\/]/,
              priority: 30,
            },
            {
              name: 'vendor-charts',
              test: /[\\/]node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap|decimal\.js-light|eventemitter3|es-toolkit)[\\/]/,
              priority: 20,
            },
            { name: 'vendor-zod', test: /[\\/]node_modules[\\/]zod[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    testTimeout: 15_000,
  },
});
