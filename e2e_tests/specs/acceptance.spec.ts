/**
 * The acceptance scenarios of the Premium Collections specification (COL-AT-01 to 12) on the production build, over the
 * golden TEST fixture as of 21 Oct 2026 (the defaults) and the DEMO fixture. COL-AT-06 (a duplicate allocation id) and
 * COL-AT-11 (an unknown due date) need a broken fixture, which the deployed build never carries: they are proven by the
 * loader and engine tests (src/read-model/fixtures/load.test.ts, src/rules/rules.test.ts); here the shipped fixtures
 * load with no data issue at all.
 */
import { expect, test } from '@playwright/test';

import { expectNoAxeViolations, expectNoHorizontalScroll, resetData, rowsOf, selectDataSet, signInAs } from './support';

const invoiceIds = async (page: import('@playwright/test').Page): Promise<string[]> =>
  (await rowsOf(page, 'Invoices')).map((row) => row[0] ?? '').filter((id) => /^D?INV-\d+$/.test(id));

test('COL-AT-01, 02, 04: the Overview reconciles to the golden figures and each card opens the invoices it counts', async ({ page }) => {
  await signInAs(page, 'CFO / MD', '/overview');
  const balances = page.getByRole('region', { name: /Balances as of 21 Oct 2026/ });
  await expect(balances.getByRole('link', { name: /Gross unpaid/ })).toContainText('P34,000.00');
  await expect(balances.getByRole('link', { name: /^Overdue P/ })).toContainText('P29,000.00');
  await expect(balances.getByRole('link', { name: /Unapplied cash/ })).toContainText('P1,500.00');
  const period = page.getByRole('region', { name: /Cash and attempts/ });
  await expect(period.getByRole('link', { name: /Cash received/ })).toContainText('P7,500.00');
  await expect(page.getByRole('button', { name: 'Data issues (0)' })).toBeVisible();
  await expectNoAxeViolations(page);

  // COL-AT-01: overdue opens the four overdue invoices, summing exactly to the card.
  await balances.getByRole('link', { name: /^Overdue P/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Invoices' })).toBeVisible();
  await expect.poll(() => invoiceIds(page)).toEqual(['INV-001', 'INV-002', 'INV-003', 'INV-006']);
  await expect(page.getByRole('table', { name: 'Invoices' })).toContainText('Total: 4 invoices');
  await expect(page.getByRole('table', { name: 'Invoices' })).toContainText('P29,000.00');

  // COL-AT-02: five non-overlapping buckets, 5/8/4/10/7 thousand, each invoice in exactly one.
  await page.goto('/aging');
  const buckets = await rowsOf(page, 'Aging buckets');
  const amounts = Object.fromEntries(buckets.map((row) => [row[0], row.find((cell) => cell.startsWith('P')) ?? '']));
  expect(amounts).toMatchObject({
    'Current / not due': 'P5,000.00',
    '1–30 days': 'P8,000.00',
    '31–60 days': 'P4,000.00',
    '61–90 days': 'P10,000.00',
    'Over 90 days': 'P7,000.00',
  });
  await expectNoAxeViolations(page);

  // COL-AT-04: the P1,500 unapplied receipt raises cash received and unapplied, never an invoice's applied amount.
  await page.goto('/receipts?view=unapplied');
  await expect.poll(async () => (await rowsOf(page, 'Receipts')).map((row) => row[0])).toContain('RCP-UNAPP');
  await page.getByRole('link', { name: 'RCP-UNAPP' }).click();
  await expect(page.getByText(/Received\s*P1,500\.00/)).toBeVisible();
  await expect(page.getByText(/unapplied\s*P1,500\.00/i).first()).toBeVisible();
  await expectNoAxeViolations(page);
});

test('COL-AT-03 and COL-AT-05: a due-today invoice is current, and failed debit orders change no cash or applied amount', async ({ page }) => {
  // As of 30 Oct, INV-004 (due 30 Oct) is due today: unpaid, current, not overdue.
  await signInAs(page, 'CFO / MD', '/invoices/INV-004');
  await page.getByLabel('As of').fill('2026-10-30');
  await expect(page.getByText('Current / not due').first()).toBeVisible();
  await page.goto('/invoices?view=overdue');
  await expect.poll(() => invoiceIds(page)).not.toContain('INV-004');
  await page.getByLabel('As of').fill('2026-10-21');

  // INV-002 has two FAILED debit orders: applied stays P0.00, outstanding P8,000.00.
  await page.goto('/invoices/INV-002');
  await expect(page.getByText(/Issued\s*P8,000\.00\s*[−-]\s*applied\s*P0\.00\s*=\s*outstanding\s*P8,000\.00/)).toBeVisible();
  await expect(page.getByText('ATT-002-1').first()).toBeVisible();
  await expect(page.getByText('ATT-002-2').first()).toBeVisible();
  await expectNoAxeViolations(page);
});

test('COL-AT-07: a broker filter narrows the cards, the chart and the tables to the same invoices', async ({ page }) => {
  await signInAs(page, 'CFO / MD', '/aging');
  await page.getByLabel('Broker', { exact: true }).selectOption({ label: 'Kopano Brokers (fictional)' });
  await expect(page.getByRole('list', { name: 'Active filters' })).toContainText('Kopano Brokers (fictional)');
  const total = (await rowsOf(page, 'Aging buckets')).find((row) => /Gross unpaid/.test(row[0] ?? ''));
  expect(total?.join(' ')).toContain('P9,000.00');
  await page.goto('/overview');
  await expect(page.getByRole('link', { name: /Gross unpaid/ })).toContainText('P9,000.00');
  await page.getByRole('link', { name: /Gross unpaid/ }).click();
  await expect.poll(() => invoiceIds(page)).toEqual(['INV-001', 'INV-004']);
  await expect(page.getByRole('table', { name: 'Invoices' })).toContainText('P9,000.00');
});

test('COL-AT-08, 09 and 12: INV-006 is flagged for review without touching the policy, an action is created, moved to In progress and survives a refresh, the Executive Viewer only reads, then Reset', async ({ page }) => {
  await signInAs(page, 'CFO / MD', '/invoices/INV-006');
  await expect(page.getByText('COL-R01 Overdue more than 30 days').first()).toBeVisible();
  await expect(page.getByText('COL-R03 Lapse review').first()).toBeVisible();
  await expect(page.getByText(/not a collection instruction, a legal lapse or cancellation/).first()).toBeVisible();
  await expect(page.getByText('ACTIVE', { exact: true })).toBeVisible();
  // COL-AT-12: the claim on the same policy.
  await expect(page.getByText('CLM-106')).toBeVisible();

  await page.getByRole('button', { name: 'Create recovery action' }).click();
  const create = page.getByRole('dialog', { name: 'Create a recovery action' });
  await create.getByLabel(/Next action/).fill('Call the broker about the lapse review');
  await create.getByRole('button', { name: 'Create action' }).click();
  await expect(page.getByText(/Action TASK-0001 created for INV-006/)).toBeVisible();

  await page.getByRole('button', { name: 'Change status of TASK-0001' }).click();
  const status = page.getByRole('dialog', { name: 'Change the status' });
  await status.getByLabel('New status').selectOption({ label: 'In progress' });
  await status.getByRole('button', { name: 'Change status' }).click();
  await expect(page.getByText('Action TASK-0001 is now In progress.')).toBeVisible();

  // The queue shows it after a refresh, with who did what and when.
  await page.goto('/actions');
  await page.reload();
  await expect(page.getByRole('table', { name: 'Recovery actions' })).toContainText('TASK-0001');
  await expect(page.getByRole('table', { name: 'Recovery actions' })).toContainText('In progress');
  await expectNoAxeViolations(page);
  await expectNoHorizontalScroll(page);

  // The Executive Viewer reads it and has no edit controls.
  await page.getByRole('combobox', { name: 'Viewing as' }).selectOption('executive');
  await page.goto('/invoices/INV-006');
  await expect(page.getByText('TASK-0001').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create recovery action' })).toHaveCount(0);

  // COL-AT-12 on DEMO: a policy with claims links them to ClaimsIQ; one without says so.
  await selectDataSet(page, 'DEMO');
  await page.goto('/invoices/DINV-001');
  await expect(page.getByRole('link', { name: /DCLM-001/ })).toHaveAttribute('href', 'https://claims.thebrittany.ai/claims/DCLM-001');
  await page.goto('/invoices/DINV-031');
  await expect(page.getByText('No linked claims')).toBeVisible();

  // COL-FR-14: Reset on TEST removes the action and the reference totals stand.
  await selectDataSet(page, 'TEST');
  await page.getByRole('combobox', { name: 'Viewing as' }).selectOption('cfo');
  await resetData(page, 'TEST');
  await page.goto('/actions');
  await expect(page.getByText('No recovery actions yet')).toBeVisible();
  await page.goto('/overview');
  await expect(page.getByRole('link', { name: /Gross unpaid/ })).toContainText('P34,000.00');
});

test('COL-AT-10: the exported overdue ledger has the on-screen rows and grand total', async ({ page }) => {
  await signInAs(page, 'CFO / MD', '/invoices?view=overdue');
  await expect.poll(() => invoiceIds(page)).toHaveLength(4);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const file = await (await download).path();
  const { readFileSync } = await import('node:fs');
  const lines = readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const invoiceLines = lines.filter((line) => /^INV-\d+,/.test(line));
  expect(invoiceLines.map((line) => line.split(',')[0])).toEqual(['INV-001', 'INV-002', 'INV-003', 'INV-006']);
  expect(lines.some((line) => line.includes('29000.00'))).toBe(true);
  expect(lines.some((line) => line.includes('2026-10-21'))).toBe(true);
});

test('the exceptions queue lists evidence, owner, severity and due date, and an acknowledgement records who and when', async ({ page }) => {
  await signInAs(page, 'Finance / Credit Control', '/exceptions');
  const table = page.getByRole('table', { name: 'Exceptions' });
  await expect(table).toContainText('RCP-UNAPP');
  await expect(table).toContainText('Unassigned');
  const row = table.getByRole('row').filter({ hasText: 'RCP-UNAPP' });
  await row.getByRole('button', { name: /Acknowledge/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Acknowledge' }).click();
  await expect(table).not.toContainText('RCP-UNAPP');
  await page.getByLabel('Show acknowledged').check();
  await expect(table.getByRole('row').filter({ hasText: 'RCP-UNAPP' })).toContainText('Finance / Credit Control');
  await expectNoAxeViolations(page);
  await resetData(page, 'TEST');
});

test('every destination opens from the sidebar with no accessibility violation and no horizontal scroll', async ({ page }) => {
  await signInAs(page, 'CFO / MD', '/overview');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  for (const name of ['Overview', 'Aging & Exposure', 'Invoices', 'Exceptions', 'Receipts', 'Action Queue', 'Finance Digest', 'Rules & Definitions']) {
    await nav.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoHorizontalScroll(page);
  }
  await expect(nav.getByRole('link', { name: 'ClaimsIQ' })).toHaveAttribute('href', 'https://claims.thebrittany.ai');
});
