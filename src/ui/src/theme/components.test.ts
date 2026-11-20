/**
 * Layout and accessibility contracts of the component class library that jsdom cannot measure (no layout engine):
 * the rules are asserted on the stylesheet itself.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { readSourceFile } from '../test/readSourceFile';

/** The stylesheet without comments, whitespace-normalised once for all `rule()` lookups. */
let normalised = '';

beforeAll(async () => {
  const css = await readSourceFile('./components.css', import.meta.url);
  normalised = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');
});

/**
 * The declarations of every rule (media queries included) whose selector list is exactly `selector`
 * (whitespace-normalised), joined.
 */
function rule(selector: string): string {
  const wanted = selector.replace(/\s+/g, ' ').trim();
  const bodies: string[] = [];
  for (const match of normalised.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectors = '', body = ''] = match;
    if (selectors.trim() === wanted) {
      bodies.push(body);
    }
  }
  if (bodies.length === 0) {
    throw new Error(`No rule for ${selector}`);
  }
  return bodies.join(' ');
}

describe('components.css', () => {
  it('keeps the closed drawer out of focus, the focus ring on the selected tab and skip link, links underlined in text, and scroll containers positioned', () => {
    expect(rule('.prm-sidebar')).toMatch(/visibility: hidden/);
    expect(rule('.prm-app--drawer-open .prm-sidebar')).toMatch(/visibility: visible/);

    expect(
      rule(".prm-tab--active:focus-visible, .prm-tab[aria-selected='true']:focus-visible"),
    ).toMatch(/var\(--prm-focus-ring\), var\(--prm-shadow-card\)/);
    expect(rule('.prm-skip-link:focus-visible')).toMatch(/var\(--prm-focus-ring\)/);

    expect(
      rule(
        ':where(p, dd, figcaption, .prm-banner, .prm-text-muted, .prm-field-hint, .prm-cell-sub) a:not([class])',
      ),
    ).toMatch(/text-decoration: underline/);
    expect(rule('.prm-banner a:not([class])')).toMatch(/color: inherit/);

    for (const selector of ['.prm-table-wrap', '.prm-chart', '.prm-stepper', '.prm-step']) {
      expect(rule(selector)).toMatch(/position: relative/);
    }
  });
});
