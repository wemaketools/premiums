import { describe, expect, it, vi } from 'vitest';

import { hasTranslation } from '../lib/i18n';
import { collectFeatures, features, navItemsFor } from './featureRegistry';
import type { FeatureModule } from './featureRegistry';

const page = { load: () => Promise.resolve({ default: () => null }) };

function module(id: string, overrides: Partial<FeatureModule> = {}): FeatureModule {
  return {
    id,
    routes: [{ path: id, ...page }],
    nav: [{ id, label: `${id}.nav`, path: id, order: 1, icon: 'list' }],
    ...overrides,
  };
}

describe('feature registry', () => {
  it('collects modules in file order, reports and skips malformed or duplicate ones, and orders the nav', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const collected = collectFeatures({
      '../features/b/routes.tsx': {
        features: [
          module('b', { nav: [{ id: 'b', label: 'b', path: 'b/x', order: 2, icon: 'list' }] }),
        ],
      },
      '../features/a/routes.tsx': { features: [module('a')] },
      '../features/broken/routes.tsx': {},
      '../features/dup/routes.tsx': {
        features: [
          module('a', { routes: [] }),
          module('c', {
            routes: [{ path: 'none' }, { path: 'b', ...page }],
            nav: module('a').nav,
          }),
        ],
      },
    });

    expect(collected.map((feature) => feature.id)).toEqual(['a', 'b', 'c']);
    expect(collected[0]?.routes).toHaveLength(1);
    expect(collected[2]?.routes).toEqual([]);
    expect(collected[2]?.nav).toEqual([]);
    expect(error).toHaveBeenCalledTimes(5);
    expect(navItemsFor(collected).map((item) => [item.id, item.to])).toEqual([
      ['a', '/a'],
      ['b', '/b/x'],
    ]);
    error.mockRestore();
  });

  it('registers the eight Premium Collections destinations, each with a translated label', () => {
    const items = navItemsFor(features);

    expect(items.map((item) => item.to)).toEqual([
      '/overview',
      '/aging',
      '/invoices',
      '/exceptions',
      '/receipts',
      '/actions',
      '/digest',
      '/rules',
    ]);
    for (const item of items) {
      expect(hasTranslation(item.label), item.label).toBe(true);
    }
  });
});
