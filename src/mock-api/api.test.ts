/** The mock API end to end: reads reconcile, actions persist with their audit trail, Reset restores the fixture. */
import { describe, expect, it } from 'vitest';

import { AS_OF_HEADER, PERSONA_HEADER, TENANT_HEADER } from '../contracts/index.js';
import { fixtureFolder, ruleConfigJson } from '../read-model/test-support/fixtureFiles.js';
import { createMockApi } from './api.js';
import { memoryStore } from './storage.js';

async function api(storage = memoryStore()) {
  const created = createMockApi({
    fixtures: { TEST: await fixtureFolder('test'), DEMO: await fixtureFolder('demo') },
    storage,
    ruleConfig: await ruleConfigJson(),
    now: () => new Date('2026-10-21T08:00:00Z'),
  });
  const request = async (method: string, path: string, options: { body?: unknown; persona?: string; tenant?: string; asOf?: string } = {}) => {
    const headers: Record<string, string> = { [TENANT_HEADER]: options.tenant ?? 'TEST' };
    if (options.persona !== undefined) headers[PERSONA_HEADER] = options.persona;
    if (options.asOf !== undefined) headers[AS_OF_HEADER] = options.asOf;
    const response = await created.fetch(path, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> & { items?: Record<string, unknown>[] } };
  };
  return { request, storage };
}

describe('mock API', () => {
  it('lists exactly the invoices a card counts, with totals that equal the card', async () => {
    const { request } = await api();
    const summary = await request('GET', '/api/v1/collections/summary');
    expect(summary.body.summary).toMatchObject({ unpaid: '34000.00', overdue: '29000.00', received: '7500.00', unapplied: '1500.00' });
    const overdue = await request('GET', '/api/v1/invoices?view=overdue');
    expect(overdue.body.items?.map((row) => row.invoice_id)).toEqual(['INV-001', 'INV-002', 'INV-003', 'INV-006']);
    expect(overdue.body.totals).toEqual({ issued: '37000.00', applied: '8000.00', outstanding: '29000.00' });
    const bucket = await request('GET', '/api/v1/invoices?bucket=%3E90&broker_id=BRK-03');
    expect(bucket.body.items?.map((row) => row.invoice_id)).toEqual(['INV-006']);
    const unapplied = await request('GET', '/api/v1/receipts?view=unapplied');
    expect(unapplied.body.items?.map((row) => row.receipt_id)).toEqual(['RCP-UNAPP']);
    const demo = await request('GET', '/api/v1/collections/summary', { tenant: 'DEMO' });
    expect(demo.body.summary).toMatchObject({ invoices: 36 });
  });

  it('serves an invoice with its calculation sources, linked claims and suggestion, and answers 404 for an unknown one', async () => {
    const { request } = await api();
    const detail = await request('GET', '/api/v1/invoices/INV-006');
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      facts: { outstanding: '7000.00', days_overdue: 142, bucket: '>90' },
      policy: { policy_id: 'POL-006', status: 'ACTIVE' },
      suggestion: 'cover-review',
    });
    expect((detail.body.claims as { claim_id: string }[]).map((claim) => claim.claim_id)).toEqual(['CLM-106']);
    const paid = await request('GET', '/api/v1/invoices/INV-005');
    expect((paid.body.allocations as { allocation_id: string; bank_ref: string }[]).map((a) => [a.allocation_id, a.bank_ref])).toEqual([
      ['ALLOC-003', 'SYN-RCP-003'],
    ]);
    const demo = await request('GET', '/api/v1/invoices/DINV-031', { tenant: 'DEMO' });
    expect(demo.body.claims).toEqual([]);
    expect((await request('GET', '/api/v1/invoices/INV-404')).status).toBe(404);
  });

  it('creates, assigns, progresses and resolves a recovery action with actor and time, keeps it across a new API on the same storage, and Reset removes it (COL-AT-09, COL-FR-14)', async () => {
    const { request, storage } = await api();
    const created = await request('POST', '/api/v1/tasks', {
      persona: 'cfo',
      body: { subject_type: 'INVOICE', subject_id: 'INV-006', reason: 'LAPSE_REVIEW', priority: 'HIGH', due_at: '2026-10-28', note: 'Call the broker' },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ task_id: 'TASK-0001', status: 'OPEN', reason: 'LAPSE_REVIEW', module: 'COLLECTIONS' });
    await request('POST', '/api/v1/tasks/TASK-0001/assign', { persona: 'cfo', body: { assigned_to: 'USR-FIN' } });
    await request('POST', '/api/v1/tasks/TASK-0001/status', { persona: 'credit-control', body: { status: 'IN_PROGRESS' } });
    await request('POST', '/api/v1/tasks/TASK-0001/notes', { persona: 'credit-control', body: { note: 'Broker promised payment' } });

    const again = await api(storage);
    const task = (await again.request('GET', '/api/v1/tasks?subject_id=INV-006')).body.items?.[0];
    expect(task).toMatchObject({ status: 'IN_PROGRESS', assigned_to: 'USR-FIN', note: 'Broker promised payment', overdue: false });
    expect((task?.audit as { action: string; actor: string; at: string }[]).map((entry) => [entry.action, entry.actor, entry.at])).toEqual([
      ['CREATED', 'cfo', '2026-10-21T10:00:00+02:00'],
      ['ASSIGNED', 'cfo', '2026-10-21T10:00:00+02:00'],
      ['STATUS_CHANGED', 'credit-control', '2026-10-21T10:00:00+02:00'],
      ['NOTE_ADDED', 'credit-control', '2026-10-21T10:00:00+02:00'],
    ]);
    const exception = (await again.request('GET', '/api/v1/exceptions?rule=LAPSE_REVIEW')).body.items?.[0];
    expect(exception).toMatchObject({ exception_id: 'LAPSE_REVIEW:INV-006', owner_id: 'USR-FIN', due_at: '2026-10-28', open_task_id: 'TASK-0001' });

    const resolved = await again.request('POST', '/api/v1/tasks/TASK-0001/status', { persona: 'credit-control', body: { status: 'RESOLVED', note: 'Paid' } });
    expect(resolved.body).toMatchObject({ status: 'RESOLVED' });
    // The figures never move with an action: only cash allocated to the invoice would.
    expect((await again.request('GET', '/api/v1/collections/summary')).body.summary).toMatchObject({ unpaid: '34000.00' });

    expect((await again.request('POST', '/api/v1/demo/reset')).status).toBe(200);
    expect((await again.request('GET', '/api/v1/tasks')).body.items).toEqual([]);
  });

  it('acknowledges an exception once with actor and time, and refuses every change from the Executive Viewer', async () => {
    const { request } = await api();
    const path = `/api/v1/exceptions/${encodeURIComponent('UNAPPLIED_CASH:RCP-UNAPP')}/acknowledge`;
    const refused = await request('POST', path, { persona: 'executive', body: {} });
    expect(refused.status).toBe(403);
    const acknowledged = await request('POST', path, { persona: 'credit-control', body: { note: 'Bank asked for remittance' } });
    expect(acknowledged.body).toMatchObject({ acknowledged: { actor: 'credit-control', note: 'Bank asked for remittance' } });
    expect((await request('GET', '/api/v1/collections/summary')).body.summary).toMatchObject({ unapplied: '1500.00' });
    expect((await request('POST', '/api/v1/tasks', { persona: 'executive', body: { subject_type: 'INVOICE', subject_id: 'INV-001', reason: 'OVERDUE' } })).status).toBe(403);
    expect((await request('POST', '/api/v1/tasks', { persona: 'cfo', body: { subject_type: 'INVOICE', subject_id: 'INV-404', reason: 'OVERDUE' } })).status).toBe(422);
  });
});
