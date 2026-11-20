import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { captureDownloads, parseCsv } from '../../test/csv';
import { renderApp, tableRows } from '../../test/renderApp';

const user = userEvent.setup();

const rowOf = (table: string, first: string): HTMLElement =>
  within(screen.getByRole('table', { name: table }))
    .getByRole('cell', { name: first })
    .closest('tr') as HTMLElement;

describe('Aging & Exposure', () => {
  it('shows the TEST aging 5/8/4/10/7k and exposure tables that each add up to gross unpaid, exports them, keeps chart and tables in one scope under a broker filter, and opens exactly a cell’s invoices', async () => {
    const downloads = captureDownloads();
    const { router } = renderApp('/aging');

    // COL-AT-02: one bucket per invoice, the buckets add up to gross unpaid.
    await waitFor(() =>
      expect(tableRows('Aging buckets')).toEqual([
        ['Current / not due', '1', 'P5,000.00', '14.7%'],
        ['1–30 days', '1', 'P8,000.00', '23.5%'],
        ['31–60 days', '1', 'P4,000.00', '11.8%'],
        ['61–90 days', '1', 'P10,000.00', '29.4%'],
        ['Over 90 days', '1', 'P7,000.00', '20.6%'],
        ['Gross unpaid', '5', 'P34,000.00', '100.0%'],
      ]),
    );
    expect(
      within(screen.getByRole('list', { name: 'Gross unpaid by aging bucket' })).getAllByRole(
        'link',
      ),
    ).toHaveLength(5);

    // COL-FR-08: who dominates, largest first, and the total row is gross unpaid (no double counting).
    expect(tableRows('Exposure by broker')).toEqual([
      [
        'Direct Sales',
        'P17,000.00',
        '50.0%',
        'P17,000.00',
        'P17,000.00',
        'P0.00',
        'P0.00',
        'P0.00',
        'P10,000.00',
        'P7,000.00',
        '2',
      ],
      [
        'Kopano Brokers (fictional)',
        'P9,000.00',
        '26.5%',
        'P4,000.00',
        'P4,000.00',
        'P5,000.00',
        'P0.00',
        'P4,000.00',
        'P0.00',
        'P0.00',
        '2',
      ],
      [
        'Tsholofelo Risk Advisors (fictional)',
        'P8,000.00',
        '23.5%',
        'P8,000.00',
        'P0.00',
        'P0.00',
        'P8,000.00',
        'P0.00',
        'P0.00',
        'P0.00',
        '1',
      ],
      [
        'Total',
        'P34,000.00',
        '100.0%',
        'P29,000.00',
        'P21,000.00',
        'P5,000.00',
        'P8,000.00',
        'P4,000.00',
        'P10,000.00',
        'P7,000.00',
        '5',
      ],
    ]);
    expect(
      screen.getByText('Direct Sales carries 50.0% of gross unpaid (P17,000.00).'),
    ).toBeInTheDocument();
    for (const table of [
      'Exposure by product',
      'Exposure by client',
      'Exposure by channel',
      'Exposure by account owner',
    ]) {
      expect(tableRows(table).at(-1)?.slice(0, 2)).toEqual(['Total', 'P34,000.00']);
    }

    // The CSV holds every table with the as-of date and the scope; each section's groups add up to its total.
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    const file = await downloads.next();
    expect(file.name).toBe('premiums-aging-TEST-2026-10-21.csv');
    const csv = parseCsv(file.text);
    expect(csv[0]?.slice(0, 2)).toEqual(['As of', '2026-10-21']);
    expect(csv[1]?.slice(0, 2)).toEqual(['Scope', 'All invoices']);
    expect(csv[2]?.slice(0, 6)).toEqual([
      'Section',
      'Group',
      'Group ID',
      'Invoices',
      'Gross unpaid (BWP)',
      'Share of gross unpaid (%)',
    ]);
    const section = (name: string) => csv.filter((row) => row[0] === name);
    expect(section('Aging').map((row) => row[4])).toEqual([
      '5000.00',
      '8000.00',
      '4000.00',
      '10000.00',
      '7000.00',
      '34000.00',
    ]);
    for (const name of [
      'Exposure by broker',
      'Exposure by product',
      'Exposure by client',
      'Exposure by channel',
      'Exposure by account owner',
    ]) {
      const rows = section(name);
      const groups = rows.slice(0, -1).reduce((sum, row) => sum + Number(row[4]), 0);
      expect([groups, rows.at(-1)?.[1], rows.at(-1)?.[4]]).toEqual([34000, 'Total', '34000.00']);
    }
    expect(section('Exposure by broker').map((row) => row[2])).toEqual([
      'BRK-03',
      'BRK-01',
      'BRK-02',
      '',
    ]);

    // COL-AT-07: under a broker filter the chart, the aging table and every breakdown answer the same invoices.
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Broker' }),
      'Kopano Brokers (fictional)',
    );
    await waitFor(() =>
      expect(tableRows('Aging buckets').at(-1)).toEqual([
        'Gross unpaid',
        '2',
        'P9,000.00',
        '100.0%',
      ]),
    );
    expect(
      within(screen.getByRole('list', { name: 'Gross unpaid by aging bucket' })).getByText(
        'P5,000.00',
      ),
    ).toBeInTheDocument();
    expect(tableRows('Exposure by broker').map((row) => row[0])).toEqual([
      'Kopano Brokers (fictional)',
      'Total',
    ]);
    expect(tableRows('Exposure by product').at(-1)?.slice(0, 2)).toEqual(['Total', 'P9,000.00']);
    expect(tableRows('Exposure by client').at(-1)?.slice(0, 2)).toEqual(['Total', 'P9,000.00']);

    // A bucket cell opens the invoice list with exactly its invoices, and the list's total equals the cell.
    const kopano = rowOf('Exposure by broker', 'Kopano Brokers (fictional)');
    expect(
      within(kopano)
        .getAllByRole('link', { name: 'P4,000.00' })
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/invoices?view=overdue&broker_id=BRK-01',
      '/invoices?view=over-30&broker_id=BRK-01',
      '/invoices?bucket=31-60&broker_id=BRK-01',
    ]);
    await user.click(within(kopano).getAllByRole('link', { name: 'P4,000.00' })[2] as HTMLElement);
    await waitFor(() =>
      expect(tableRows('Invoices').map((row) => row[0])).toEqual(['INV-001', 'Total: 1 invoice']),
    );
    expect(tableRows('Invoices').at(-1)?.[8]).toBe('P4,000.00');

    // DEMO: a long breakdown shows its ten largest groups and folds the rest into one row; the total stays gross unpaid.
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Data set' }), 'DEMO');
    await act(() => router.navigate('/aging'));
    await waitFor(() => expect(tableRows('Exposure by client')).toHaveLength(12));
    const clients = tableRows('Exposure by client');
    expect(clients[10]?.[0]).toBe('The other 18 together (show all to open them)');
    expect(clients[11]?.slice(0, 3)).toEqual(['Total', 'P260,500.00', '100.0%']);
    await user.click(screen.getByRole('button', { name: 'Show all 28' }));
    expect(tableRows('Exposure by client')).toHaveLength(29);
  });
});
