/**
 * Production bundle scan (`npm run ci:security`), run after `npm run build`.
 *
 * The deployed site is the static build in `src/ui/dist`, so this checks what a visitor downloads:
 * - `index.html` carries the production Content-Security-Policy, and its script-src has none of the dev-only
 *   relaxations (`'unsafe-inline'`, `'unsafe-eval'`, `ws:`);
 * - no file holds a secret-shaped string (a JWT, a Supabase secret key, a PEM private key);
 * - no source map ships.
 *
 * Usage: node --experimental-strip-types scripts/ci/scan-bundle.ts [--dist <dir>]
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const DEFAULT_DIST = join(repoRoot, 'src', 'ui', 'dist');

/** One directive of a Content-Security-Policy ("script-src 'self'"), or undefined when the policy has none. */
function directiveOf(policy: string, name: string): string | undefined {
  return policy
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith(`${name} `));
}

const SECRETS: ReadonlyArray<{ readonly id: string; readonly pattern: RegExp }> = [
  { id: 'jwt', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { id: 'supabase-secret-key', pattern: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { id: 'private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

/** Every problem of the build in `dist`, as `file: rule` lines; empty when the build is clean. */
export function scanBundle(dist: string): string[] {
  if (!existsSync(join(dist, 'index.html'))) {
    return [`${dist}: no index.html (run npm run build first)`];
  }
  const findings: string[] = [];
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const policy = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1];
  const scriptSrc = policy === undefined ? undefined : directiveOf(policy, 'script-src');
  if (scriptSrc === undefined) {
    findings.push('index.html: no Content-Security-Policy with a script-src');
  } else if (/'unsafe-inline'|'unsafe-eval'|ws:/.test(scriptSrc)) {
    findings.push(`index.html: script-src has a dev-only relaxation (${scriptSrc})`);
  }
  for (const file of filesUnder(dist)) {
    const name = relative(dist, file);
    if (name.endsWith('.map')) {
      findings.push(`${name}: source map in the production build`);
      continue;
    }
    if (!/\.(html|js|css|json|txt|svg)$/.test(name)) continue;
    const text = readFileSync(file, 'utf8');
    for (const rule of SECRETS) {
      if (rule.pattern.test(text)) findings.push(`${name}: ${rule.id}`);
    }
  }
  return findings;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const at = process.argv.indexOf('--dist');
  const dist = at === -1 ? DEFAULT_DIST : (process.argv[at + 1] ?? DEFAULT_DIST);
  const findings = scanBundle(dist);
  if (findings.length > 0) {
    process.stderr.write(`Bundle scan failed:\n${findings.map((line) => `  ${line}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`Bundle scan passed: ${relative(repoRoot, dist)}\n`);
}
