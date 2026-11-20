/** The committed CSV fixtures and a mock API over files a test has changed (the SPA's own transport reads the originals). */
import ruleConfig from '../../../../fixtures/v2/proposed_rule_config.json';
import { createMockApi, memoryStore } from '../../../mock-api/index';
import type { FixtureFiles } from '../../../mock-api/index';
import type { ApiTransport } from '../api/client';

const csv = import.meta.glob('../../../../fixtures/v2/*/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function fixtureFiles(name: 'test' | 'demo'): Record<string, string> {
  return Object.fromEntries(
    Object.entries(csv)
      .filter(([path]) => path.includes(`/v2/${name}/`))
      .map(([path, text]) => [path.slice(path.lastIndexOf('/') + 1), text]),
  );
}

/** The committed rule config with some of its `collections` thresholds changed. */
export function ruleConfigWith(changes: Record<string, unknown>): unknown {
  return { ...ruleConfig, collections: { ...ruleConfig.collections, ...changes } };
}

export function transportOver(files: {
  TEST?: FixtureFiles;
  DEMO?: FixtureFiles;
  ruleConfig?: unknown;
}): ApiTransport {
  return createMockApi({
    fixtures: {
      TEST: files.TEST ?? fixtureFiles('test'),
      DEMO: files.DEMO ?? fixtureFiles('demo'),
    },
    storage: memoryStore(),
    ruleConfig: files.ruleConfig ?? ruleConfig,
  }).fetch;
}
