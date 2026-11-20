/** The fixture loader: both data sets load clean, and bad rows are quarantined before any calculation (COL-FR-01, 13, AT-06, AT-11). */
import { describe, expect, it } from 'vitest';

import { buildLedger, parseRuleConfig, summarize } from '../../rules/index.js';
import { fixtureFolder, ruleConfigJson, withEdit } from '../test-support/fixtureFiles.js';
import { loadDataset } from './load.js';
import type { LoadedDataset } from './load.js';

async function totals(data: LoadedDataset) {
  const config = parseRuleConfig(await ruleConfigJson()).collections;
  const { policy, broker, invoice, receipt, payment_allocation, payment_attempt } = data.records;
  const ledger = buildLedger(
    { policies: policy, brokers: broker, invoices: invoice, receipts: receipt, allocations: payment_allocation, attempts: payment_attempt },
    { asOf: '2026-10-21', config },
  );
  return summarize(ledger, {});
}

describe('loadDataset', () => {
  it('loads TEST and DEMO with no data issues and the documented row counts', async () => {
    const test = loadDataset('TEST', await fixtureFolder('test'));
    const demo = loadDataset('DEMO', await fixtureFolder('demo'));
    expect(test.issues).toEqual([]);
    expect(demo.issues).toEqual([]);
    expect([test.records.invoice.length, test.records.receipt.length, test.records.claim.length]).toEqual([6, 4, 6]);
    expect([demo.records.invoice.length, demo.records.claim.length]).toEqual([36, 30]);
    expect(test.tenant).toMatchObject({ tenant_id: 'TEST', dataset_tag: 'TEST' });
  });

  it('quarantines a duplicate allocation id and keeps the totals unchanged (COL-AT-06)', async () => {
    const files = await fixtureFolder('test');
    const duplicated = withEdit(files, 'payment_allocations.csv', (text) => `${text.trimEnd()}\nTEST,ALLOC-001,RCP-UNAPP,INV-002,1500,2026-10-11\n`);
    const data = loadDataset('TEST', duplicated);
    expect(data.issues).toEqual([
      expect.objectContaining({ kind: 'quarantined', entity: 'payment_allocation', row: 5, record_id: 'ALLOC-001', field: 'allocation_id' }),
    ]);
    expect(await totals(data)).toMatchObject({ applied: '14000.00', unpaid: '34000.00', unapplied: '1500.00' });
  });

  it('quarantines an invoice with an unknown policy, a duplicate invoice id and an over-allocation, naming row, field, problem and fix (COL-FR-01)', async () => {
    let files = await fixtureFolder('test');
    files = withEdit(files, 'premium_invoices.csv', (text) =>
      `${text.trimEnd()}\nTEST,INV-007,POL-999,2026-09-01,2026-09-10,1000,BWP,ISSUED\nTEST,INV-001,POL-001,2026-09-01,2026-09-10,1000,BWP,ISSUED\n`,
    );
    files = withEdit(files, 'payment_allocations.csv', (text) => `${text.trimEnd()}\nTEST,ALLOC-009,RCP-UNAPP,INV-004,9000,2026-10-11\n`);
    const data = loadDataset('TEST', files);
    expect(data.issues.map((issue) => [issue.file, issue.row, issue.record_id, issue.field])).toEqual([
      ['premium_invoices.csv', 8, 'INV-007', 'policy_id'],
      ['premium_invoices.csv', 9, 'INV-001', 'invoice_id'],
      ['payment_allocations.csv', 5, 'ALLOC-009', 'allocated_amount'],
      ['payment_allocations.csv', 5, 'ALLOC-009', 'allocated_amount'],
    ]);
    for (const issue of data.issues) {
      expect(issue.problem).not.toBe('');
      expect(issue.fix).not.toBe('');
    }
    expect(await totals(data)).toMatchObject({ invoices: 6, issued: '48000.00', unpaid: '34000.00' });
  });

  it('loads an invoice without a due date with a warning, in gross unpaid but in no bucket (COL-AT-11, COL-FR-13)', async () => {
    const files = withEdit(await fixtureFolder('test'), 'premium_invoices.csv', (text) =>
      text.replace('TEST,INV-004,POL-004,2026-10-25,2026-10-30,5000', 'TEST,INV-004,POL-004,2026-10-25,,5000'),
    );
    const data = loadDataset('TEST', files);
    expect(data.issues).toEqual([
      expect.objectContaining({ kind: 'warning', record_id: 'INV-004', field: 'due_date', problem: 'has no due date, so it cannot be aged' }),
    ]);
    const summary = await totals(data);
    expect(summary).toMatchObject({ unpaid: '34000.00', overdue: '29000.00', unknown_due: '5000.00', unknown_due_invoices: 1 });
    expect(summary.aging.find((row) => row.bucket === 'current')).toMatchObject({ amount: '0.00', invoices: 0 });
  });
});
