import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { captureDownloads, parseCsv } from '../../test/csv';
import { renderApp, tableRows } from '../../test/renderApp';

const NAME = 'Exceptions';
/** Rule chip and subject of each listed row, for example "COL-R04 Unapplied cash RCP-UNAPP". */
const listed = () =>
  tableRows(NAME).map(
    (row) => `${row[0]?.replace(/^(High|Medium|Low)/, '') ?? ''} ${row[1] ?? ''}`,
  );
const rowOf = (text: RegExp): HTMLElement => {
  const row = within(screen.getByRole('table', { name: NAME }))
    .getAllByRole('row')
    .find((candidate) => text.test(candidate.textContent ?? ''));
  if (row === undefined) throw new Error(`No row matches ${String(text)}`);
  return row;
};

async function viewAs(persona: string) {
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Viewing as' }), persona);
  await userEvent.click(await screen.findByRole('link', { name: 'Exceptions' }));
  await screen.findByRole('table', { name: NAME });
}

describe('Exceptions (COL-03)', () => {
  it('lists the nine TEST exceptions most severe first with evidence, owner and due date, filters by rule from the URL and the counts, acknowledges the unapplied receipt as Credit Control with who and when, hides it with a count, and exports the listed rows', async () => {
    const user = userEvent.setup();
    const downloads = captureDownloads();
    renderApp('/exceptions?rule=FAILED_ATTEMPT');

    // The Overview "Failed payment attempts" card opens ?rule=FAILED_ATTEMPT: the two failed debit orders on INV-002.
    await waitFor(() =>
      expect(listed()).toEqual([
        'COL-R05 Failed payment attempt INV-002Attempt ATT-002-1 · reason INSUFFICIENT_FUNDS',
        'COL-R05 Failed payment attempt INV-002Attempt ATT-002-2 · reason INSUFFICIENT_FUNDS',
      ]),
    );
    expect(screen.getByRole('combobox', { name: 'Rule' })).toHaveValue('FAILED_ATTEMPT');
    expect(rowOf(/ATT-002-1/)).toHaveTextContent(
      'The attempt failed (INSUFFICIENT_FUNDS): no cash was received and nothing was applied.',
    );
    expect(screen.getByText(/Advisory flag from a configurable demo rule/)).toBeInTheDocument();

    // Credit Control opens the screen from the sidebar: every rule, High first, by the day each was raised.
    await viewAs('Finance / Credit Control');
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(9));
    const rows = tableRows(NAME);
    expect(rows.slice(0, 2).map((row) => [row[0], row[1]])).toEqual([
      ['HighCOL-R01 Overdue more than 30 days', 'INV-006'],
      ['HighCOL-R03 Lapse review', 'INV-006'],
    ]);
    expect(rows[0]?.[2]).toBe('142 days overdue with P7,000.00 outstanding.');
    expect(rows[1]?.[2]).toBe(
      '142 days overdue with P7,000.00 outstanding: review for potential cover implications.',
    );
    expect(rows.map((row) => row[1])).toEqual(
      expect.arrayContaining(['INV-001', 'INV-002', 'INV-003', 'RCP-UNAPP']),
    );
    // Every exception has evidence, an owner, a due date and a link to its invoice or receipt.
    for (const row of rows) {
      expect(row[2]).not.toBe('');
      expect(row[3]).not.toBe('');
      expect(row[4]).toMatch(/\d{1,2} \w{3} 2026/);
    }
    expect(within(rowOf(/RCP-UNAPP/)).getByRole('link', { name: 'RCP-UNAPP' })).toHaveAttribute(
      'href',
      '/receipts/RCP-UNAPP',
    );
    expect(within(rowOf(/RCP-UNAPP/)).getAllByRole('cell')[3]).toHaveTextContent('Unassigned');
    expect(
      within(rowOf(/COL-R01.*INV-006/)).getByRole('link', { name: 'INV-006' }),
    ).toHaveAttribute('href', '/invoices/INV-006');
    expect(within(rowOf(/COL-R01.*INV-006/)).getAllByRole('cell')[3]).toHaveTextContent(
      'Tiro Demo',
    );
    expect(document.body.textContent).not.toMatch(/fraud|collectible/i);

    // The counts by rule are quick filters, written to the URL.
    const counts = screen.getByRole('group', { name: 'Show the exceptions of one rule' });
    expect(within(counts).getByRole('button', { name: 'All · 9' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      within(counts).getByRole('button', { name: 'COL-R01 Overdue more than 30 days · 3' }),
    ).toBeInTheDocument();
    await user.click(within(counts).getByRole('button', { name: 'COL-R04 Unapplied cash · 1' }));
    await waitFor(() => expect(listed()).toEqual(['COL-R04 Unapplied cash RCP-UNAPP']));
    expect(screen.getByRole('combobox', { name: 'Rule' })).toHaveValue('UNAPPLIED_CASH');

    // Acknowledge: the dialog says who acts and that no figure changes; the optional note is kept.
    await user.click(
      screen.getByRole('button', { name: 'Acknowledge COL-R04 Unapplied cash on RCP-UNAPP' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Acknowledge the exception' });
    expect(within(dialog).getByTestId('confirm-context')).toHaveTextContent(
      'Finance / Credit Control',
    );
    expect(dialog).toHaveTextContent('The figures do not change');
    await user.type(
      within(dialog).getByRole('textbox', { name: /Note/ }),
      'Bank asked for remittance',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Acknowledge' }));
    expect(
      await screen.findByText('COL-R04 Unapplied cash on RCP-UNAPP acknowledged.'),
    ).toBeInTheDocument();

    // Hidden by default, with a count; shown again with who, when and the note.
    expect(await screen.findByText('The 1 exception here is acknowledged')).toBeInTheDocument();
    expect(screen.getByText('1 acknowledged exception is hidden.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Show acknowledged' }));
    const acknowledged = rowOf(/RCP-UNAPP/);
    expect(acknowledged).toHaveTextContent('Acknowledged');
    expect(acknowledged).toHaveTextContent(/by Finance \/ Credit Control · \d{1,2} \w{3} 2026/);
    expect(acknowledged).toHaveTextContent('Note: Bank asked for remittance');
    expect(
      within(acknowledged).queryByRole('button', { name: /^Acknowledge/ }),
    ).not.toBeInTheDocument();

    // Back to every rule: 9 with the acknowledged one shown, 8 without.
    await user.click(within(counts).getByRole('button', { name: 'All · 9' }));
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(9));
    await user.click(screen.getByRole('checkbox', { name: 'Show acknowledged' }));
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(8));
    expect(within(counts).getByRole('button', { name: 'All · 8' })).toBeInTheDocument();

    // COL-FR-12: the CSV is the listed rows, with the as-of date, period and scope on top.
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const file = await downloads.next();
    expect(file.name).toBe('premiums-exceptions-TEST-2026-10-21.csv');
    const csv = parseCsv(file.text);
    expect(csv.slice(0, 3).map((row) => row.slice(0, 2))).toEqual([
      ['As of', '2026-10-21'],
      ['Cash period', 'This month: 1 Oct 2026 – 21 Oct 2026'],
      ['Scope', 'All invoices'],
    ]);
    expect(csv[3]?.slice(0, 6)).toEqual([
      'Exception ID',
      'Severity',
      'Rule ID',
      'Rule',
      'Subject type',
      'Subject',
    ]);
    const body = csv.slice(4);
    expect(body).toHaveLength(8);
    expect(body.map((row) => row[5])).toEqual(
      tableRows(NAME).map((row) => row[1]?.replace(/Attempt.*$/, '')),
    );
    expect(body[0]?.slice(0, 4)).toEqual([
      'OVERDUE_30:INV-006',
      'High',
      'COL-R01',
      'Overdue more than 30 days',
    ]);
    expect(body.some((row) => row[0] === 'UNAPPLIED_CASH:RCP-UNAPP')).toBe(false);
  });

  it('gives the Executive Viewer no row actions, and a broker filter drops the unapplied receipt and says why', async () => {
    const user = userEvent.setup();
    renderApp('/exceptions');
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(9));
    expect(screen.getAllByRole('button', { name: /^Create action for/ })).toHaveLength(9);

    await viewAs('Executive Viewer');
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(9));
    expect(screen.queryByRole('button', { name: /^Acknowledge/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Create recovery action/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('The Executive Viewer reads the collections and has no edit controls.'),
    ).toBeInTheDocument();

    // Kopano Brokers holds INV-001 (overdue 50 days) and INV-004 (not due): one exception, no receipt.
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Broker' }),
      'Kopano Brokers (fictional)',
    );
    await waitFor(() => expect(listed()).toEqual(['COL-R01 Overdue more than 30 days INV-001']));
    expect(
      screen.getByText(/Unapplied cash cannot be attributed to a broker, product or client/),
    ).toBeInTheDocument();

    // No match for a severity in this scope is a filtered empty state, not "no exceptions".
    await user.selectOptions(screen.getByRole('combobox', { name: 'Severity' }), 'High');
    expect(await screen.findByText('No exceptions match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(tableRows(NAME)).toHaveLength(9));
  });
});
