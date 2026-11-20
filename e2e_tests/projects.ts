/** The e2e server: a production build of the SPA served by `vite preview`, the same static files Vercel deploys. */
import { envValue } from './env';

function portFromEnv(name: string, fallback: number): number {
  const raw = envValue(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw new Error(`${name} must be a TCP port between 1024 and 65535, got "${raw}".`);
  }
  return value;
}

export const previewPort = portFromEnv('PREVIEW_PORT', 5381);
export const origin = `http://127.0.0.1:${previewPort}`;
// The build goes to its own folder, so a developer's `dist` is left alone.
export const serverCommand = `npm run build -- --outDir dist-e2e && npx vite preview --outDir dist-e2e --host 127.0.0.1 --port ${previewPort} --strictPort`;
