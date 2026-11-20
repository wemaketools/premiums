/**
 * What the specs share: signing in by role, choosing the data set, Reset, and the checks every screen gets (WCAG 2.0/2.1
 * A and AA through axe, no horizontal page scroll).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function expectNoAxeViolations(page: Page): Promise<void> {
  // Axe reads colours, so let any running colour transition settle first; a cancelled animation counts as settled.
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.allSettled(document.getAnimations().map((animation) => animation.finished));
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact ?? 'n/a'}): ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Opens `path` signed in as the role: the sign-in page lists the roles and a click signs in, then the address is visited. */
export async function signInAs(page: Page, role: string, path = '/'): Promise<void> {
  await page.goto(path);
  await page.getByRole('button', { name: new RegExp(`^${role.replace(/[/]/g, '\\/')}`) }).click();
  await expect(page.getByRole('complementary', { name: 'Main navigation and account' })).toBeVisible();
}

export async function selectDataSet(page: Page, dataSet: 'TEST' | 'DEMO'): Promise<void> {
  await page.getByLabel('Data set').selectOption(dataSet);
}

/** Reset from the top bar, confirmed in its dialog, and the toast that says the data set is back as loaded. */
export async function resetData(page: Page, dataSet: string): Promise<void> {
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByText(`The ${dataSet} fixture is back as loaded.`)).toBeVisible();
}

/** A table's body rows as the text of each cell. */
export async function rowsOf(page: Page, table: string): Promise<string[][]> {
  return page
    .getByRole('table', { name: table })
    .locator('tbody tr')
    .evaluateAll((rows) => rows.map((row) => Array.from(row.querySelectorAll('td, th')).map((cell) => (cell.textContent ?? '').trim())));
}
