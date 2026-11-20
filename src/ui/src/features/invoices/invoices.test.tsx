import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { formatMoney } from '../../../../contracts/index';
import { captureDownloads, parseCsv } from '../../test/csv';
import { renderApp, tableRows } from '../../test/renderApp';

const user = userEvent.setup();
const listed = () => tableRows('Invoices').map((row) => row[0]);

describe('Invoices', () => {
  it('lists exactly the overdue invoices a card opens with a total equal to the card, exports every row with the total and scope, and lets the user change and remove the criterion in the address', async () => {
    const downloads = captureDownloads();
    const { router } = renderApp('/invoices?view=overdue');

    // The Overdue card (P29,000.00 on 4 invoices) opens these, and the total row equals it.
    await waitFor(() =>
      expect(listed()).toEqual(['INV-001', 'INV-002', 'INV-003', 'INV-006', 'Total: 4 invoices']),
    );
    expect(screen.getByRole('list', { name: 'Showing' })).toHaveTextContent('Show: Overdue');
    const rows = tableRows('Invoices');
    expect(rows[0]).toEqual([
      'INV-001',
      'Dithaba Traders (fictional)SYN-BW-00001',
      'Kopano Brokers (fictional)Comprehensive Motor',
      '1 Sep 2026',
      '50',
      '31–60 daysMedium',
      'P10,000.00',
      'P6,000.00',
      'P4,000.00',
      'COL-R01 Overdue more than 30 days',
    ]);
    expect(rows[3]?.[9]).toBe('COL-R01 Overdue more than 30 daysCOL-R03 Lapse review');
    expect(rows.at(-1)?.slice(6, 9)).toEqual(['P37,000.00', 'P8,000.00', 'P29,000.00']);
    expect(screen.getByText(/^Advisory flag from a configurable demo rule/)).toBeInTheDocument();

    // COL-AT-10: the CSV is every listed row as plain values, the total row, and the as-of, scope and criterion lines.
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const file = await downloads.next();
    expect(file.name).toBe('premiums-invoices-TEST-2026-10-21.csv');
    const csv = parseCsv(file.text);
    expect(csv.slice(0, 3).map((row) => row.slice(0, 2))).toEqual([
      ['As of', '2026-10-21'],
      ['Scope', 'All invoices'],
      ['Showing', 'Show: Overdue'],
    ]);
    expect(csv[3]).toEqual([
      'Invoice',
      'Client',
      'Policy number',
      'Broker',
      'Product',
      'Due date',
      'Days overdue',
      'Aging',
      'Priority',
      'Issued (BWP)',
      'Applied (BWP)',
      'Outstanding (BWP)',
      'Flags',
    ]);
    const body = csv.slice(4, -1);
    expect(body[0]).toEqual([
      'INV-001',
      'Dithaba Traders (fictional)',
      'SYN-BW-00001',
      'Kopano Brokers (fictional)',
      'Comprehensive Motor',
      '2026-09-01',
      '50',
      '31–60 days',
      'Medium',
      '10000.00',
      '6000.00',
      '4000.00',
      'COL-R01 Overdue more than 30 days',
    ]);
    expect(body.map((row) => row[0])).toEqual(listed().slice(0, -1));
    expect(body.map((row) => formatMoney(row[11] ?? ''))).toEqual(
      tableRows('Invoices')
        .slice(0, -1)
        .map((row) => row[8]),
    );
    expect(body.reduce((sum, row) => sum + Number(row[11]), 0)).toBe(29000);
    expect(csv.at(-1)?.[0]).toBe('Total: 4 invoices');
    expect(csv.at(-1)?.slice(9, 12)).toEqual(['37000.00', '8000.00', '29000.00']);

    // Sorting by outstanding, largest first; the total row stays last.
    await user.click(screen.getByRole('button', { name: 'Outstanding' }));
    await user.click(screen.getByRole('button', { name: 'Outstanding' }));
    expect(listed()).toEqual(['INV-003', 'INV-002', 'INV-006', 'INV-001', 'Total: 4 invoices']);

    // The selects write the address; a chip removes its part.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Aging bucket' }), '61–90 days');
    await waitFor(() => expect(listed()).toEqual(['INV-003', 'Total: 1 invoice']));
    expect(router.state.location.search).toBe('?view=overdue&bucket=61-90');
    await user.click(screen.getByRole('button', { name: 'Remove Show: Overdue' }));
    expect(router.state.location.search).toBe('?bucket=61-90');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'High');
    expect(await screen.findByText('No matching records')).toBeInTheDocument();
    expect(
      screen.getByText(
        'No invoices match Aging bucket: 61–90 days; Priority: High. Remove a chip or clear the filters to see more.',
      ),
    ).toBeInTheDocument();

    // A breakdown row's dimension applies on top of the shared filters; an unknown value is named and left out.
    await act(() => router.navigate('/invoices?view=unpaid&broker_id=BRK-03&bucket=soon'));
    await waitFor(() => expect(listed()).toEqual(['INV-003', 'INV-006', 'Total: 2 invoices']));
    expect(screen.getByRole('list', { name: 'Showing' })).toHaveTextContent('Broker: Direct Sales');
    expect(screen.getByText(/does not know \(bucket=soon\)/)).toBeInTheDocument();
    expect(tableRows('Invoices').at(-1)?.[8]).toBe('P17,000.00');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Product' }), 'Business Package');
    await waitFor(() => expect(listed()).toEqual(['INV-003', 'Total: 1 invoice']));
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(listed()).toHaveLength(7));
    expect(router.state.location.search).toBe('');
  });
});
