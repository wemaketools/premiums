import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { captureDownloads, parseCsv } from '../../test/csv';
import { renderApp, tableRows } from '../../test/renderApp';

const NAME = 'Recovery actions';
const user = userEvent.setup();

const rowOf = (task: string): HTMLElement =>
  screen.getByText(task, { selector: 'span.prm-ref' }).closest('tr') as HTMLElement;
const cells = (task: string): string[] =>
  within(rowOf(task))
    .getAllByRole('cell')
    .map((cell) => cell.textContent ?? '');

async function pickFromRowMenu(task: string, item: string) {
  await user.click(within(rowOf(task)).getByRole('button', { name: `Actions for ${task}` }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

async function changeStatus(task: string, status: string, note?: string) {
  await pickFromRowMenu(task, 'Change status');
  const dialog = await screen.findByRole('dialog', { name: 'Change the status' });
  await user.selectOptions(within(dialog).getByRole('combobox', { name: /^New status/ }), status);
  if (note !== undefined)
    await user.type(within(dialog).getByRole('textbox', { name: /^Note/ }), note);
  await user.click(within(dialog).getByRole('button', { name: 'Change status' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('Recovery Action Queue', () => {
  it('starts empty on TEST, creates an action for INV-006, assigns, moves it to Resolved with every change logged, filters by "Assigned to me", exports the queue as shown, keeps it across a refresh until Reset, and gives the Executive Viewer no edit controls', async () => {
    const downloads = captureDownloads();
    const view = renderApp('/actions');

    // No actions yet: the empty state offers the create button.
    expect(await screen.findByText('No recovery actions yet')).toBeInTheDocument();
    const createButtons = screen.getAllByRole('button', { name: 'Create recovery action' });
    expect(createButtons).toHaveLength(2);

    // Create from the queue: the invoice is chosen in the dialog; reason, urgency and owner start from the defaults.
    await user.click(createButtons[0] as HTMLElement);
    const create = await screen.findByRole('dialog', { name: 'Create a recovery action' });
    const confirm = within(create).getByRole('button', { name: 'Create action' });
    expect(confirm).toBeDisabled();
    expect(within(create).getByRole('combobox', { name: 'Reason' })).toHaveDisplayValue(
      'Overdue premium',
    );
    expect(within(create).getByRole('combobox', { name: 'Urgency' })).toHaveDisplayValue('Medium');
    await waitFor(() =>
      expect(within(create).getByRole('combobox', { name: 'Owner' })).toHaveDisplayValue(
        'Executive Demo',
      ),
    );
    await waitFor(() =>
      expect(within(create).getByRole('option', { name: 'INV-006' })).toBeInTheDocument(),
    );
    await user.selectOptions(within(create).getByRole('combobox', { name: /^Invoice/ }), 'INV-006');
    await user.selectOptions(within(create).getByRole('combobox', { name: 'Urgency' }), 'High');
    await user.type(within(create).getByLabelText('Due date'), '2026-10-20');
    await user.type(
      within(create).getByRole('textbox', { name: /Next action/ }),
      'Call the client about the arrears',
    );
    await user.click(confirm);
    expect(await screen.findByText('Action TASK-0001 created for INV-006.')).toBeInTheDocument();

    // The row: the account with its client, policy and broker; due 20 Oct is overdue at 21 Oct.
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(1));
    expect(cells('TASK-0001').slice(0, 9)).toEqual([
      'TASK-0001',
      'INV-006Naledi Engineering (fictional)SYN-BW-00006 · Direct Sales',
      'Overdue premium',
      'High',
      'Executive Demo',
      '20 Oct 2026Overdue',
      'Open',
      'Call the client about the arrears',
      expect.stringMatching(/^\d{2} \w{3} 2026, \d\d:\d\dby CFO \/ MD$/),
    ]);
    expect(within(rowOf('TASK-0001')).getByRole('link', { name: 'INV-006' })).toHaveAttribute(
      'href',
      '/invoices/INV-006',
    );
    expect(
      screen.getByText('1 action: 1 overdue, 1 open, 0 in progress, 0 resolved.'),
    ).toBeInTheDocument();

    // Assign to Tiro Demo, then Open → In progress → Resolved with a note.
    await pickFromRowMenu('TASK-0001', 'Assign owner');
    const assign = await screen.findByRole('dialog', { name: 'Assign an owner' });
    await user.selectOptions(within(assign).getByRole('combobox', { name: /^Owner/ }), 'Tiro Demo');
    await user.click(within(assign).getByRole('button', { name: 'Assign' }));
    expect(await screen.findByText('Action TASK-0001 assigned to Tiro Demo.')).toBeInTheDocument();
    await waitFor(() => expect(cells('TASK-0001')[4]).toBe('Tiro Demo'));
    await changeStatus('TASK-0001', 'In progress');
    await waitFor(() => expect(cells('TASK-0001')[6]).toBe('In progress'));
    await changeStatus('TASK-0001', 'Resolved', 'Client paid in full');

    // Resolved leaves the default "Not resolved" view; All statuses shows it, no longer overdue, with the note.
    expect(await screen.findByText('No actions match these filters')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'All statuses');
    await waitFor(() => expect(cells('TASK-0001')[6]).toBe('Resolved'));
    expect(cells('TASK-0001')[5]).toBe('20 Oct 2026');
    expect(cells('TASK-0001')[7]).toBe('Client paid in full');

    // The history: who (the persona), what and when, oldest first.
    await user.click(within(rowOf('TASK-0001')).getByRole('button', { name: 'Open TASK-0001' }));
    const history = await screen.findByRole('dialog', { name: 'Action TASK-0001' });
    const trail = within(within(history).getByRole('list', { name: 'History of TASK-0001' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    expect(trail).toEqual([
      expect.stringMatching(
        /^Created as OpenCFO \/ MD · \d{2} \w{3} 2026, \d\d:\d\dNote: Call the client about the arrears$/,
      ),
      expect.stringMatching(/^Assigned to Executive DemoCFO \/ MD · \d/),
      expect.stringMatching(/^Assigned to Tiro DemoCFO \/ MD · \d/),
      expect.stringMatching(/^Status changed from Open to In progressCFO \/ MD · \d/),
      expect.stringMatching(
        /^Status changed from In progress to ResolvedCFO \/ MD · \d.*Note: Client paid in full$/,
      ),
    ]);
    await user.click(within(history).getByRole('button', { name: 'Close' }));

    // COL-FR-12: the file is the queue as shown, with the as-of date and the filters on top.
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const file = await downloads.next();
    expect(file.name).toBe('premiums-actions-TEST-2026-10-21.csv');
    const csv = parseCsv(file.text);
    expect(csv.slice(0, 2)).toEqual([
      ['As of', '2026-10-21'],
      ['Filters', 'Status: All statuses'],
    ]);
    expect(csv[2]?.slice(0, 3)).toEqual(['Action ID', 'Subject type', 'Subject ID']);
    expect(csv).toHaveLength(3 + tableRows(NAME).length);
    const shown = cells('TASK-0001');
    expect(csv[3]).toEqual([
      'TASK-0001',
      'Invoice',
      'INV-006',
      'Naledi Engineering (fictional)',
      'SYN-BW-00006',
      'Direct Sales',
      shown[2],
      shown[3],
      shown[4],
      shown[5],
      'No',
      shown[6],
      shown[7],
      expect.any(String),
      'CFO / MD',
    ]);
    expect(`${csv[3]?.[13] ?? ''}by ${csv[3]?.[14] ?? ''}`).toBe(shown[8]);
    view.unmount();

    // COL-AT-09: a refresh keeps the action and its trail. Credit control is Tiro Demo, so "Assigned to me" shows it.
    const again = renderApp('/actions');
    await screen.findByRole('table', { name: NAME });
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Viewing as' }),
      'credit-control',
    );
    await screen.findByRole('table', { name: NAME });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'All statuses');
    await user.click(screen.getByRole('checkbox', { name: 'Assigned to me (Tiro Demo)' }));
    await waitFor(() => expect(tableRows(NAME).map((row) => row[0])).toEqual(['TASK-0001']));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Owner' }), 'Unassigned');
    expect(await screen.findByText('No actions match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('No actions match these filters')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Resolved');
    await waitFor(() => expect(tableRows(NAME).map((row) => row[0])).toEqual(['TASK-0001']));

    // The Executive Viewer reads the queue and the history, with no edit controls.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Viewing as' }), 'executive');
    await screen.findByRole('article');
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', {
        name: 'Action Queue',
      }),
    );
    await waitFor(() => expect(tableRows(NAME).map((row) => row[0])).toEqual(['TASK-0001']));
    expect(
      screen.queryByRole('button', { name: 'Create recovery action' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actions for TASK-0001' })).not.toBeInTheDocument();
    expect(
      screen.getByText('The Executive Viewer reads the collections and has no edit controls.'),
    ).toBeInTheDocument();
    await user.click(within(rowOf('TASK-0001')).getByRole('button', { name: 'Open TASK-0001' }));
    const readOnly = await screen.findByRole('dialog', { name: 'Action TASK-0001' });
    expect(within(readOnly).getAllByRole('listitem')).toHaveLength(5);
    expect(
      within(readOnly).queryByRole('button', { name: 'Change status' }),
    ).not.toBeInTheDocument();
    await user.click(within(readOnly).getByRole('button', { name: 'Close' }));

    // COL-FR-14: Reset brings the queue back to the fixture, which has no actions.
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const reset = await screen.findByRole('dialog', { name: 'Reset the TEST data set?' });
    await user.click(within(reset).getByRole('button', { name: 'Reset' }));
    expect(await screen.findByText('No recovery actions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Nobody has created a recovery action in this data set yet.'),
    ).toBeInTheDocument();
    again.unmount();
  });
});
