/** The fixture files with one of them replaced by `change(text)`, for tests that need a broken file. */
import type { FixtureFiles } from '../fixtures/index.js';

export function withEdit(files: FixtureFiles, file: string, change: (text: string) => string): FixtureFiles {
  return { ...files, [file]: change(files[file] ?? '') };
}

/** The CSV files of one fixture folder (`fixtures/v2/test` or `fixtures/v2/demo`), read from disk for tests. */
export async function fixtureFolder(folder: 'test' | 'demo'): Promise<FixtureFiles> {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL(`../../../fixtures/v2/${folder}/`, import.meta.url);
  return Object.fromEntries(
    readdirSync(dir)
      .filter((name) => name.endsWith('.csv'))
      .map((name) => [name, readFileSync(new URL(name, dir), 'utf8')]),
  );
}

/** The spec's rule config, as the mock API receives it. */
export async function ruleConfigJson(): Promise<unknown> {
  const { readFileSync } = await import('node:fs');
  return JSON.parse(readFileSync(new URL('../../../fixtures/v2/proposed_rule_config.json', import.meta.url), 'utf8'));
}
