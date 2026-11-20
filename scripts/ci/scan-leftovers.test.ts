/**
 * Guard: text copied from the products Premium Collections was scaffolded from (TenderIQ by way of ClaimsIQ) must not stay in the code. Comments and strings
 * that name another product's decision ids, spec sections, mock-up files or domain (tenders, approvals, audit
 * history) describe things this repository does not have.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const SELF = 'scripts/ci/scan-leftovers.test.ts';
const SCANNED_DIRS = ['src', 'scripts', 'e2e_tests/specs'];
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'dist-prototype', 'public']);

const LEFTOVERS: ReadonlyArray<{ readonly name: string; readonly pattern: RegExp }> = [
  { name: 'a tender, TenderIQ or QuoteIQ reference', pattern: /tender|quoteiq/i },
  { name: 'a decision id (DD-nn)', pattern: /\bDD-\d+/ },
  { name: 'a spec or brief section sign', pattern: /§/ },
  { name: 'a mock-up screenshot file', pattern: /\b[\w-]+\.png\b/ },
  { name: 'a reference-table, sealed-bid or opening-session wording', pattern: /reference[- ]tables?|reference screenshots?|sealed|opening session/i },
  { name: 'an approval, audit or amendment feature', pattern: /approval route|audit history|amendment histor/i },
  { name: 'a ClaimsIQ-only concept (supplier wait, reserve, stage SLA, Supabase sign-in)', pattern: /supplier wait|reserve event|stage sla|supabase-js|supabase auth/i },
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIPPED_DIRS.has(entry.name)) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

describe('copied text', () => {
  it('leaves no reference to another product, its decisions or its mock-ups in source files', () => {
    const offenders: string[] = [];
    for (const file of SCANNED_DIRS.flatMap((dir) => sourceFiles(join(root, dir)))) {
      const name = relative(root, file).replace(/\\/g, '/');
      if (name === SELF) {
        continue;
      }
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          for (const { name: what, pattern } of LEFTOVERS) {
            if (pattern.test(line)) {
              offenders.push(`${name}:${index + 1} has ${what}`);
            }
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
