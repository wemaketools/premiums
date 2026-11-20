import { describe, expect, it } from 'vitest';

import type { Catalog } from './i18n';
import {
  RESERVED_NAMESPACES,
  featureNamespaceOf,
  hasTranslation,
  registerCatalog,
  t,
} from './i18n';

describe('translation', () => {
  it('interpolates, picks plural forms, shows a missing key as itself and namespaces feature catalogs', () => {
    expect(t('shell.footer.currency', { currency: 'BWP' })).toBe('All amounts in BWP');
    expect(t('ui.table.selected', { count: 1 })).toBe('1 selected');
    expect(t('ui.table.selected', { count: 3 })).toBe('3 selected');
    expect(t('no.such.key')).toBe('no.such.key');
    expect(hasTranslation('no.such.key')).toBe(false);

    registerCatalog('testfeature', { list: { title: 'Claims {count}' }, 'flat.key': 'Flat' });
    expect(t('testfeature.list.title', { count: 3 })).toBe('Claims 3');
    expect(t('testfeature.flat.key')).toBe('Flat');
    expect(featureNamespaceOf('../features/claim-handling/i18n/en.ts')).toBe('claim-handling');
    expect(featureNamespaceOf('../features/x/other.ts')).toBeNull();
    for (const feature of ['overview', 'stages', 'exceptions', 'claims', 'suppliers', 'actions']) {
      expect(RESERVED_NAMESPACES as readonly string[]).not.toContain(feature);
    }
  });

  it('has a translation for every literal key the app passes to t()', () => {
    const sources = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}'], {
      query: '?raw',
      import: 'default',
      eager: true,
    });
    const missing: string[] = [];
    for (const [file, text] of Object.entries(sources)) {
      for (const match of text.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)) {
        const key = match[1] ?? '';
        if (key.split('.').length > 1 && !hasTranslation(key) && !file.endsWith('i18n.ts')) {
          missing.push(`${file}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('has a reader for every string a feature catalog defines', () => {
    const catalogs = import.meta.glob<{ default: Catalog }>('../features/*/i18n/en.ts', {
      eager: true,
    });
    const sources = import.meta.glob<string>(
      ['../**/*.{ts,tsx}', '!../**/*.test.{ts,tsx}', '!../features/*/i18n/en.ts'],
      { query: '?raw', import: 'default', eager: true },
    );
    const text = Object.values(sources).join('\n');
    // A key is read when it appears as a literal, or sits under a template such as `ns.group.${name}`; the template
    // must end its prefix at a segment inside a group (never a bare namespace), so it cannot vouch for a whole feature.
    const literals = new Set(
      [...text.matchAll(/['"]([a-z][\w-]*(?:\.[\w-]+)+)['"]/g)].map((m) => m[1]),
    );
    const prefixes = [...text.matchAll(/`([a-z][\w-]*\.[\w-]+\.[\w.-]*)\$\{/g)]
      .map((m) => m[1] ?? '')
      .filter((start) => start.endsWith('.'));
    const unread: string[] = [];
    const walk = (prefix: string, catalog: Catalog): void => {
      for (const [name, value] of Object.entries(catalog)) {
        const key = `${prefix}.${name}`.replace(/_(one|other)$/, '');
        if (typeof value !== 'string') walk(key, value);
        else if (!literals.has(key) && !prefixes.some((start) => key.startsWith(start))) {
          unread.push(key);
        }
      }
    };
    for (const [path, module] of Object.entries(catalogs)) {
      const namespace = featureNamespaceOf(path);
      if (namespace !== null) walk(namespace, module.default);
    }
    expect(unread).toEqual([]);
  });

  it('gives every catalog string that counts something a singular and a plural form', () => {
    const catalogs = import.meta.glob<{ default: Catalog }>('../features/*/i18n/en.ts', {
      eager: true,
    });
    const flat: [string, string][] = [];
    const walk = (prefix: string, catalog: Catalog): void => {
      for (const [name, value] of Object.entries(catalog)) {
        if (typeof value === 'string') flat.push([`${prefix}.${name}`, value]);
        else walk(`${prefix}.${name}`, value);
      }
    };
    for (const [path, module] of Object.entries(catalogs)) {
      const namespace = featureNamespaceOf(path);
      if (namespace !== null) walk(namespace, module.default);
    }
    const keys = new Set(flat.map(([key]) => key));
    // `t()` picks `<key>_one` or `<key>_other` from the `count` parameter, so a string with {count} needs both. These
    // read the same for any number: {count} is not followed by a noun that changes with it.
    const NO_NOUN = new Set([
      'aging.exposure.showAll',
      'aging.exposure.showTop',
      'exceptions.byRule.all',
      'exceptions.byRule.rule',
    ]);
    const unformed = flat
      .filter(([key, text]) => text.includes('{count}') && !/_(one|other)$/.test(key))
      .filter(([key]) => !NO_NOUN.has(key))
      .map(([key]) => key)
      .filter((key) => !(keys.has(`${key}_one`) && keys.has(`${key}_other`)));
    expect(unformed).toEqual([]);
  });
});
