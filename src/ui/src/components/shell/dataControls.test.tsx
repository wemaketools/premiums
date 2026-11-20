import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { endpoints } from '../../../../contracts/index';
import { call } from '../../api/client';
import { createMockTransport } from '../../api/mockTransport';
import { createAppStore } from '../../app/store';
import { signedInSession } from '../../test/fixtures';
import { renderRouteTree } from '../../test/render';
import { AppShell } from './AppShell';

const ROUTES = [
  { element: <AppShell modules={[]} />, children: [{ path: 'first', element: null }] },
];
const NEW_TASK = {
  subject_type: 'INVOICE',
  subject_id: 'INV-006',
  reason: 'LAPSE_REVIEW',
  note: 'Call the broker',
} as const;

describe('the data controls', () => {
  it('switch the data set and the as-of date for every read, remember both across a refresh, and Reset removes the changes but keeps both', async () => {
    const store = createAppStore({ session: signedInSession() });
    renderRouteTree(ROUTES, { store, route: '/first', transport: createMockTransport() });
    const sidebar = screen.getByRole('complementary', { name: 'Main navigation and account' });
    const invoiceCount = async () => (await call(endpoints.invoicesList)).items.length;
    const receiptIds = async () =>
      (await call(endpoints.receiptsList)).items.map((receipt) => receipt.receipt_id);

    expect(await screen.findByRole('button', { name: 'Data issues (0)' })).toBeInTheDocument();
    expect(within(sidebar).getByText('Fixture validation')).toBeInTheDocument();
    expect(await invoiceCount()).toBe(6);
    const task = await call(endpoints.tasksCreate, { body: NEW_TASK });
    expect(task.audit[0]).toMatchObject({ actor: 'cfo', action: 'CREATED' });

    await userEvent.selectOptions(screen.getByLabelText('Data set'), 'DEMO');
    expect(within(sidebar).getByText('Fictional Botswana insurer demo')).toBeInTheDocument();
    expect(await invoiceCount()).toBe(36);
    expect((await call(endpoints.tasksList)).items).toEqual([]);

    fireEvent.change(screen.getByLabelText('As of'), { target: { value: '2026-10-05' } });
    expect((await call(endpoints.receiptsList)).as_of).toBe('2026-10-05');
    expect(await receiptIds()).toEqual([]);
    expect(createAppStore().getState().dataContext).toEqual({
      dataSet: 'DEMO',
      asOf: '2026-10-05',
    });

    await userEvent.selectOptions(screen.getByLabelText('Data set'), 'TEST');
    expect(await receiptIds()).toEqual(['RCP-001', 'RCP-002', 'RCP-003']);
    expect((await call(endpoints.tasksList)).items.map((item) => item.task_id)).toEqual([
      task.task_id,
    ]);

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset the TEST data set?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect((await call(endpoints.tasksList)).items).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('The TEST fixture is back as loaded.')).toBeInTheDocument();
    expect((await call(endpoints.tasksList)).items).toEqual([]);
    expect(store.getState().dataContext).toEqual({ dataSet: 'TEST', asOf: '2026-10-05' });
  });

  it('counts the data issues on its button and lists each with row, field, problem and fix', async () => {
    const issue = {
      issue_no: 1,
      kind: 'quarantined',
      entity: 'payment_allocation',
      file: 'payment_allocations.csv',
      row: 5,
      record_id: 'ALLOC-001',
      field: 'allocation_id',
      problem: '"ALLOC-001" is a duplicate of the row on line 2',
      fix: 'Give the row a unique id, or delete the repeated row.',
    };
    const transport = () =>
      Promise.resolve(
        new Response(JSON.stringify({ tenant_id: 'TEST', quarantined_rows: 1, issues: [issue] }), {
          headers: { 'content-type': 'application/json' },
        }),
      );
    renderRouteTree(ROUTES, { state: { session: signedInSession() }, route: '/first', transport });

    await userEvent.click(await screen.findByRole('button', { name: 'Data issues (1)' }));

    const dialog = screen.getByRole('dialog', { name: 'Data issues' });
    expect(await within(dialog).findByText(/1 row was rejected/)).toBeInTheDocument();
    const row = within(dialog).getByRole('row', { name: /payment_allocations\.csv/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      'Rejected',
      'payment_allocations.csv',
      '5',
      'allocation_id',
      '"ALLOC-001" is a duplicate of the row on line 2',
      'Give the row a unique id, or delete the repeated row.',
    ]);
  });
});
