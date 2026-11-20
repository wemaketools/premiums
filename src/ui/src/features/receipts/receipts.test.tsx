import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { captureDownloads, parseCsv } from '../../test/csv';
import { renderApp, tableRows } from '../../test/renderApp';

const NAME = 'Receipts';
const ids = () => tableRows(NAME).map((row) => row[0]);
const totals = () => screen.getByLabelText('Totals of the listed receipts');

describe('Receipts (COL-FR-05, COL-FR-07)', () => {
  it('opens from the Overview cash card with the same P7,500.00, switches to the unapplied view, shows the in-scope part under a broker filter, and exports the listed rows with totals', async () => {
    const user = userEvent.setup();
    const downloads = captureDownloads();
    renderApp('/overview');

    // COL-AT-04: October cash received is RCP-003 (P6,000) and RCP-UNAPP (P1,500), counted by received date.
    const card = await screen.findByRole('link', { name: /Cash received/ });
    expect(card).toHaveTextContent('P7,500.00');
    await user.click(card);
    await screen.findByRole('table', { name: NAME });
    await waitFor(() => expect(ids()).toEqual(['RCP-003', 'RCP-UNAPP']));
    expect(screen.getByRole('button', { name: 'Received in the cash period' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByText('Bank-confirmed receipts received in This month: 1 Oct 2026 – 21 Oct 2026.'),
    ).toBeInTheDocument();
    expect(within(totals()).getByText('2 receipts')).toBeInTheDocument();
    expect(totals()).toHaveTextContent('ReceivedP7,500.00AppliedP6,000.00UnappliedP1,500.00');
    expect(tableRows(NAME)[1]?.slice(0, 8)).toEqual([
      'RCP-UNAPP',
      '10 Oct 2026',
      'SYN-RCP-UNAPP',
      'POSTED',
      'P1,500.00',
      'P0.00',
      'P1,500.00',
      'Not applied to any invoice',
    ]);
    expect(screen.getByRole('link', { name: 'INV-005' })).toHaveAttribute(
      'href',
      '/invoices/INV-005',
    );
    expect(screen.getByRole('link', { name: 'RCP-UNAPP' })).toHaveAttribute(
      'href',
      '/receipts/RCP-UNAPP',
    );
    // COL-AT-05: cash counts once by received date; a failed debit order is never a receipt.
    expect(
      screen.getByText(/Cash is counted once, on the date the bank received it/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A failed debit order is a payment attempt, never a receipt/),
    ).toBeInTheDocument();
    expect(ids()).not.toContain('ATT-002-1');

    // The unapplied view: RCP-UNAPP alone, P1,500.00 (the Overview "Unapplied cash" card).
    await user.click(screen.getByRole('button', { name: 'With unapplied cash' }));
    await waitFor(() => expect(ids()).toEqual(['RCP-UNAPP']));
    expect(totals()).toHaveTextContent('UnappliedP1,500.00');

    // COL-FR-12: the file is the listed receipts with their totals, as-of, period and scope.
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const file = await downloads.next();
    expect(file.name).toBe('premiums-receipts-TEST-2026-10-21.csv');
    const csv = parseCsv(file.text);
    expect(csv.slice(0, 3).map((row) => row.slice(0, 2))).toEqual([
      ['As of', '2026-10-21'],
      ['Cash period', 'This month: 1 Oct 2026 – 21 Oct 2026'],
      ['Scope', 'All invoices'],
    ]);
    expect(csv.slice(3)).toEqual([
      [
        'Receipt ID',
        'Received date',
        'Bank reference',
        'Status',
        'Counts as cash',
        'Received (BWP)',
        'Applied (BWP)',
        'Unapplied (BWP)',
        'Applied to invoices',
      ],
      [
        'RCP-UNAPP',
        '2026-10-10',
        'SYN-RCP-UNAPP',
        'POSTED',
        'Yes',
        '1500.00',
        '0.00',
        '1500.00',
        '',
      ],
      ['Total: 1 receipt', '', '', '', '', '1500.00', '0.00', '1500.00', ''],
    ]);

    // Every receipt; then a broker filter keeps only the receipts applied to its invoices, with the in-scope part.
    await user.click(screen.getByRole('button', { name: 'All receipts' }));
    await waitFor(() => expect(ids()).toEqual(['RCP-001', 'RCP-002', 'RCP-003', 'RCP-UNAPP']));
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Broker' }),
      'Kopano Brokers (fictional)',
    );
    await waitFor(() => expect(ids()).toEqual(['RCP-001']));
    expect(screen.getByRole('columnheader', { name: 'In scope' })).toBeInTheDocument();
    expect(tableRows(NAME)[0]?.[7]).toBe('P6,000.00');
    expect(screen.getByText(/Unapplied cash belongs to no invoice/)).toBeInTheDocument();
    expect(totals()).toHaveTextContent('In scopeP6,000.00');
  });
});
