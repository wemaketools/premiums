/**
 * The collections rules against the golden TEST fixture (expected_metrics.json and the spec's reconciliation table)
 * and the boundary cases of COL-AT-02, 03, 05 and 11.
 */
import { describe, expect, it } from 'vitest';

import type { CollectionsRuleConfig, Invoice, PaymentAllocation, PaymentAttempt, Receipt } from '../contracts/index.js';
import { loadDataset } from '../read-model/index.js';
import { fixtureFolder, ruleConfigJson } from '../read-model/test-support/fixtureFiles.js';
import { bucketOf, buildLedger, collectionExceptions, collectionsTrend, parseRuleConfig, priorityOf, summarize } from './index.js';
import type { LedgerRecords } from './index.js';

const AS_OF = '2026-10-21';

async function testRecords(): Promise<{ records: LedgerRecords; config: CollectionsRuleConfig }> {
  const data = loadDataset('TEST', await fixtureFolder('test'));
  const config = parseRuleConfig(await ruleConfigJson()).collections;
  const { policy, broker, invoice, receipt, payment_allocation, payment_attempt } = data.records;
  return {
    records: { policies: policy, brokers: broker, invoices: invoice, receipts: receipt, allocations: payment_allocation, attempts: payment_attempt },
    config,
  };
}

const invoice = (id: string, due: string | null, issued: string, issue = '2026-01-01'): Invoice => ({
  tenant_id: 'TEST',
  invoice_id: id,
  policy_id: 'POL-001',
  issue_date: issue,
  due_date: due,
  issued_amount: issued,
  currency: 'BWP',
  status: 'ISSUED',
});

describe('golden TEST fixture as of 2026-10-21', () => {
  it('reconciles issued, applied, unpaid, overdue, aging and cash to the documented values', async () => {
    const { records, config } = await testRecords();
    const ledger = buildLedger(records, { asOf: AS_OF, config });
    const summary = summarize(ledger, {});

    // COL-AT-01
    expect(summary).toMatchObject({
      invoices: 6,
      issued: '48000.00',
      applied: '14000.00',
      unpaid: '34000.00',
      overdue: '29000.00',
      overdue_invoices: 4,
      over_30: '21000.00',
      unknown_due: '0.00',
    });
    // COL-AT-02: 5/8/4/10/7 thousand, each unpaid invoice in exactly one bucket.
    expect(summary.aging.map((row) => [row.bucket, row.amount, row.invoices])).toEqual([
      ['current', '5000.00', 1],
      ['1-30', '8000.00', 1],
      ['31-60', '4000.00', 1],
      ['61-90', '10000.00', 1],
      ['>90', '7000.00', 1],
    ]);
    // COL-AT-04 / COL-FR-05: October cash P7,500 of which P1,500 unapplied; the unapplied receipt pays no invoice.
    expect(summary).toMatchObject({ received: '7500.00', receipts: 2, unapplied: '1500.00', unapplied_receipts: 1, failed_attempts: 2 });
    expect(summary.period).toEqual({ option: 'month', from: '2026-10-01', to: AS_OF });

    const rows = Object.fromEntries(ledger.invoices.map((facts) => [facts.invoice_id, facts]));
    expect(
      Object.values(rows).map((facts) => [facts.invoice_id, facts.applied, facts.outstanding, facts.days_overdue, facts.bucket, facts.aging_state]),
    ).toEqual([
      ['INV-001', '6000.00', '4000.00', 50, '31-60', 'aged'],
      ['INV-002', '0.00', '8000.00', 16, '1-30', 'aged'],
      ['INV-003', '2000.00', '10000.00', 81, '61-90', 'aged'],
      ['INV-004', '0.00', '5000.00', 0, 'current', 'aged'],
      ['INV-005', '6000.00', '0.00', null, null, 'paid'],
      ['INV-006', '0.00', '7000.00', 142, '>90', 'aged'],
    ]);

    // COL-AT-08: INV-006 gets the >30 alert and the lapse REVIEW flag (the policy's status is never touched).
    expect(rows['INV-006']?.flags.map((flag) => [flag.rule_id, flag.rule, flag.severity, flag.triggered_at])).toEqual([
      ['COL-R01', 'OVERDUE_30', 'HIGH', '2026-07-02'],
      ['COL-R03', 'LAPSE_REVIEW', 'HIGH', '2026-07-31'],
    ]);
    expect(rows['INV-006']?.priority).toBe('HIGH');
    // Two failed debit orders on INV-002 inside 30 days: repeat failure, and High because it is overdue.
    expect(rows['INV-002']).toMatchObject({ priority: 'HIGH', recent_failed_attempts: 2, last_attempt_at: '2026-10-14' });
    expect(rows['INV-002']?.flags.map((flag) => [flag.rule, flag.severity, flag.triggered_at, flag.source_ids])).toEqual([
      ['REPEAT_FAILURE', 'HIGH', '2026-10-14', ['INV-002', 'ATT-002-1', 'ATT-002-2']],
    ]);
    expect(rows['INV-003']?.flags.map((flag) => flag.rule)).toEqual(['OVERDUE_30', 'LAPSE_REVIEW']);
    expect(rows['INV-001']?.flags.map((flag) => flag.rule)).toEqual(['OVERDUE_30']);
    expect(rows['INV-004']).toMatchObject({ priority: 'CURRENT', overdue: false, flags: [] });
  });

  it('narrows every figure to the same invoices under a broker or product filter, and leaves unapplied cash unattributed', async () => {
    const { records, config } = await testRecords();
    const ledger = buildLedger(records, { asOf: AS_OF, config });
    // BRK-01 places POL-001 (INV-001) and POL-004 (INV-004).
    const broker = summarize(ledger, { broker_id: 'BRK-01' });
    expect(broker).toMatchObject({ filtered: true, invoices: 2, unpaid: '9000.00', overdue: '4000.00', unapplied: null, failed_attempts: 0 });
    // October cash reaching BRK-01's invoices: none (RCP-001 was received in September).
    expect(broker.received).toBe('0.00');
    const motor = summarize(ledger, { product_id: 'PRD-01' }, 'ytd');
    // Motor: INV-001 and INV-005; the year's cash reaching them is RCP-001 (6,000 to INV-001) and RCP-003 (6,000 to INV-005).
    expect(motor).toMatchObject({ invoices: 2, unpaid: '4000.00', received: '12000.00', receipts: 2 });
    // The breakdowns partition the total: no invoice is counted twice across a dimension.
    const all = summarize(ledger, {});
    for (const rows of Object.values(all.breakdowns)) {
      expect(rows.reduce((sum, row) => sum + Number(row.unpaid), 0)).toBe(34000);
    }
    expect(all.breakdowns.broker.map((row) => [row.id, row.unpaid])).toEqual([
      ['BRK-03', '17000.00'],
      ['BRK-01', '9000.00'],
      ['BRK-02', '8000.00'],
    ]);
  });

  it('lists exceptions with rule, severity, owner, due date and acknowledgement, the open action setting owner and due date', async () => {
    const { records, config } = await testRecords();
    const ledger = buildLedger(records, { asOf: AS_OF, config });
    const none = collectionExceptions(ledger, {}, { tasks: [], acknowledgements: {} });
    expect(none.map((item) => [item.exception_id, item.severity])).toEqual([
      ['OVERDUE_30:INV-006', 'HIGH'],
      ['LAPSE_REVIEW:INV-006', 'HIGH'],
      ['FAILED_ATTEMPT:ATT-002-1', 'HIGH'],
      ['FAILED_ATTEMPT:ATT-002-2', 'HIGH'],
      ['REPEAT_FAILURE:INV-002', 'HIGH'],
      ['OVERDUE_30:INV-003', 'MEDIUM'],
      ['LAPSE_REVIEW:INV-003', 'MEDIUM'],
      ['OVERDUE_30:INV-001', 'MEDIUM'],
      ['UNAPPLIED_CASH:RCP-UNAPP', 'MEDIUM'],
    ]);
    const unapplied = none.find((item) => item.rule === 'UNAPPLIED_CASH');
    expect(unapplied).toMatchObject({ subject_type: 'RECEIPT', owner_id: null, measure: { amount: '1500.00' }, due_at: '2026-10-15', late: true });

    const task = {
      tenant_id: 'TEST', task_id: 'TASK-0001', module: 'COLLECTIONS' as const, subject_type: 'INVOICE' as const,
      subject_id: 'INV-006', assigned_to: 'USR-CFO', due_at: '2026-10-28', priority: 'HIGH' as const, status: 'OPEN' as const,
      note: null, updated_at: '2026-10-21T09:00:00+02:00', reason: 'LAPSE_REVIEW' as const, audit: [],
    };
    const owned = collectionExceptions(ledger, { rule: 'LAPSE_REVIEW' }, {
      tasks: [task],
      acknowledgements: { 'LAPSE_REVIEW:INV-006': { at: '2026-10-21T09:05:00+02:00', actor: 'cfo', note: null } },
    });
    expect(owned.map((item) => [item.exception_id, item.owner_id, item.due_at, item.late, item.open_task_id, item.acknowledged?.actor])).toEqual([
      ['LAPSE_REVIEW:INV-006', 'USR-CFO', '2026-10-28', false, 'TASK-0001', 'cfo'],
      // Triggered 2026-09-30 (due 1 Aug + 60 days), Medium: 5 days to respond.
      ['LAPSE_REVIEW:INV-003', 'USR-FIN', '2026-10-05', true, null, undefined],
    ]);
    // A resolved action no longer owns the exception.
    const resolved = collectionExceptions(ledger, { rule: 'LAPSE_REVIEW' }, { tasks: [{ ...task, status: 'RESOLVED' }], acknowledgements: {} });
    expect(resolved[0]?.owner_id).toBe('USR-FIN');
    // With a filter, unapplied cash cannot be attributed and is left out.
    expect(collectionExceptions(ledger, { broker_id: 'BRK-03' }, { tasks: [], acknowledgements: {} }).map((item) => item.exception_id)).toEqual([
      'OVERDUE_30:INV-006',
      'LAPSE_REVIEW:INV-006',
      'OVERDUE_30:INV-003',
      'LAPSE_REVIEW:INV-003',
    ]);
  });

  it('splits monthly receipt cash from arrears recovered and current premium applied, never adding them', async () => {
    const { records, config } = await testRecords();
    const months = collectionsTrend(buildLedger(records, { asOf: AS_OF, config }), {});
    expect(months.map((m) => [m.month, m.received, m.arrears_recovered, m.current_applied, m.failed_attempts])).toEqual([
      ['2026-05', '0.00', '0.00', '0.00', 0],
      ['2026-06', '0.00', '0.00', '0.00', 0],
      ['2026-07', '0.00', '0.00', '0.00', 0],
      // INV-003 and INV-001 were due on the 1st, so not yet overdue when August and September opened.
      ['2026-08', '2000.00', '0.00', '2000.00', 0],
      ['2026-09', '6000.00', '0.00', '6000.00', 0],
      ['2026-10', '7500.00', '6000.00', '0.00', 2],
    ]);
    expect(months.at(-1)).toMatchObject({ from: '2026-10-01', to: AS_OF });
  });
});

describe('aging and as-of boundaries', () => {
  it('puts 0/1/30/31/60/61/90/91 days in the right bucket and priority (COL-FR-03)', () => {
    expect([0, 1, 30, 31, 60, 61, 90, 91].map((days) => [days, bucketOf(days), priorityOf(days, false)])).toEqual([
      [0, 'current', 'CURRENT'],
      [1, '1-30', 'LOW'],
      [30, '1-30', 'LOW'],
      [31, '31-60', 'MEDIUM'],
      [60, '31-60', 'MEDIUM'],
      [61, '61-90', 'MEDIUM'],
      [90, '61-90', 'MEDIUM'],
      [91, '>90', 'HIGH'],
    ]);
    expect(priorityOf(5, true)).toBe('HIGH');
    expect(priorityOf(0, true)).toBe('CURRENT');
  });

  it('counts a due-today invoice as unpaid and current, never overdue, and gives an unknown due date no bucket (COL-AT-03, COL-AT-11)', async () => {
    const { config } = await testRecords();
    const records: LedgerRecords = {
      policies: [], brokers: [], receipts: [], allocations: [], attempts: [],
      invoices: [invoice('DUE-TODAY', AS_OF, '1000.00'), invoice('NO-DUE', null, '500.00'), invoice('DUE-31', '2026-09-20', '200.00')],
    };
    const ledger = buildLedger(records, { asOf: AS_OF, config });
    const summary = summarize(ledger, {});
    expect(summary).toMatchObject({ unpaid: '1700.00', overdue: '200.00', overdue_invoices: 1, unknown_due: '500.00', unknown_due_invoices: 1, over_30: '200.00' });
    expect(summary.aging.reduce((sum, row) => sum + Number(row.amount), 0)).toBe(1200);
    expect(ledger.invoiceById.get('DUE-TODAY')).toMatchObject({ days_overdue: 0, overdue: false, bucket: 'current' });
    expect(ledger.invoiceById.get('NO-DUE')).toMatchObject({ aging_state: 'unknown', bucket: null, days_overdue: null, overdue: false, priority: null });
    expect(ledger.invoiceById.get('NO-DUE')?.flags.map((flag) => [flag.rule_id, flag.rule])).toEqual([['COL-R06', 'DATA_QUALITY']]);
    expect(ledger.invoiceById.get('DUE-31')?.days_overdue).toBe(31);
  });

  it('never counts a failed attempt or a non-cash receipt as cash, and never lets an allocation drive unapplied below zero (COL-AT-05, COL-FR-07)', async () => {
    const { config } = await testRecords();
    const receipt = (id: string, amount: string, status: string): Receipt => ({
      tenant_id: 'TEST', receipt_id: id, received_at: '2026-10-05', gross_amount: amount, currency: 'BWP', bank_ref: id, status,
    });
    const allocation = (id: string, receiptId: string, amount: string): PaymentAllocation => ({
      tenant_id: 'TEST', allocation_id: id, receipt_id: receiptId, invoice_id: 'INV-A', allocated_amount: amount, posted_at: '2026-10-06',
    });
    const attempt = (id: string, outcome: string): PaymentAttempt => ({
      tenant_id: 'TEST', attempt_id: id, invoice_id: 'INV-A', attempt_at: '2026-10-07', method: 'DEBIT_ORDER', outcome, reason_code: 'RETURNED',
    });
    const base: LedgerRecords = {
      policies: [], brokers: [],
      invoices: [invoice('INV-A', '2026-10-01', '1000.00')],
      receipts: [receipt('R-OK', '400.00', 'POSTED'), receipt('R-PENDING', '300.00', 'PENDING')],
      allocations: [allocation('A-1', 'R-OK', '400.00'), allocation('A-2', 'R-PENDING', '300.00')],
      attempts: [],
    };
    const before = summarize(buildLedger(base, { asOf: AS_OF, config }), {});
    const after = summarize(buildLedger({ ...base, attempts: [attempt('F-1', 'FAILED')] }, { asOf: AS_OF, config }), {});
    expect(before).toMatchObject({ applied: '400.00', unpaid: '600.00', received: '400.00', unapplied: '0.00', failed_attempts: 0 });
    expect(after).toMatchObject({ applied: '400.00', unpaid: '600.00', received: '400.00', unapplied: '0.00', failed_attempts: 1 });
    const pending = buildLedger(base, { asOf: AS_OF, config }).receipts.find((r) => r.receipt_id === 'R-PENDING');
    expect(pending).toMatchObject({ is_cash: false, allocated: '0.00', unapplied: '0.00' });
  });

  it('hides receipts, allocations and attempts dated after the as-of date', async () => {
    const { records, config } = await testRecords();
    const early = summarize(buildLedger(records, { asOf: '2026-09-30', config }), {}, 'month');
    // RCP-003 (Oct 3, to INV-005) and RCP-UNAPP (Oct 10) do not exist yet; INV-005 is unpaid again.
    expect(early).toMatchObject({ applied: '8000.00', unpaid: '40000.00', received: '6000.00', unapplied: '0.00', failed_attempts: 0 });
  });
});
