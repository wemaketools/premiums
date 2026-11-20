import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderApp, tableRows } from '../../test/renderApp';

const KPIS = 'Key figures and their definitions';
const user = userEvent.setup();

describe('Finance Digest', () => {
  it('summarizes TEST as of 21 Oct with the golden figures, their definitions, aging, top exposures, exceptions by rule and severity and the actions, follows a broker filter, and prints', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderApp('/digest');

    // The sheet names what it covers and says it is synthetic.
    await screen.findByRole('table', { name: KPIS });
    const sheet = await screen.findByRole('article', {
      name: 'Premium collections: finance summary and action digest',
    });
    const meta = within(sheet)
      .getAllByRole('definition')
      .map((item) => item.textContent);
    expect(meta.slice(0, 5)).toEqual([
      'Fixture validation',
      'TEST',
      '21 Oct 2026',
      'All invoices',
      'This month: 1 Oct 2026 – 21 Oct 2026',
    ]);
    expect(
      within(sheet).getByText(/^Synthetic demo data only: not a production finance system\./),
    ).toBeInTheDocument();

    // COL-AT-01 / COL-AT-04: the key figures with counts and their exact definitions.
    await screen.findByRole('table', { name: KPIS });
    const kpis = tableRows(KPIS);
    expect(kpis.map((row) => row.slice(0, 3))).toEqual([
      ['Gross unpaid', 'P34,000.00', '5 invoices'],
      ['Overdue', 'P29,000.00', '4 invoices'],
      ['Overdue more than 30 days', 'P21,000.00', '3 invoices'],
      ['Unknown due date', 'P0.00', '0 invoices'],
      ['Cash received in the period', 'P7,500.00', expect.stringMatching(/receipts?$/)],
      ['Failed payment attempts', '—', '2 attempts'],
      ['Unapplied cash', 'P1,500.00', '1 receipt'],
    ]);
    expect(kpis[0]?.[3]).toContain('max(0, issued − valid allocations), future-due included');
    expect(kpis[1]?.[3]).toContain('Due today and future-due balances are not overdue.');
    expect(kpis[4]?.[3]).toContain('by their received date');
    expect(kpis[5]?.[3]).toContain('Never cash, never an allocation.');
    expect(kpis[6]?.[3]).toContain('received − valid allocations, never negative');
    expect(within(sheet).getByRole('link', { name: 'P29,000.00' })).toHaveAttribute(
      'href',
      '/invoices?view=overdue',
    );

    // COL-AT-02: the aging, 5/8/4/10/7 thousand, adding up to gross unpaid.
    expect(tableRows('Gross unpaid by aging bucket')).toEqual([
      ['Current / not due', 'P5,000.00', '1'],
      ['1–30 days', 'P8,000.00', '1'],
      ['31–60 days', 'P4,000.00', '1'],
      ['61–90 days', 'P10,000.00', '1'],
      ['Over 90 days', 'P7,000.00', '1'],
      ['Total aged', 'P34,000.00', '5'],
    ]);

    // COL-FR-08: the top broker is Direct Sales (BRK-03) with P17,000.00.
    const brokers = tableRows('Top Broker exposures');
    expect(brokers[0]?.slice(0, 2)).toEqual(['Direct SalesBRK-03', 'P17,000.00']);
    expect(tableRows('Top Product exposures').length).toBeGreaterThan(0);
    expect(tableRows('Top Client exposures').length).toBeLessThanOrEqual(5);

    // Exceptions by rule and severity, for the same scope and October's attempts.
    expect(tableRows('Exceptions by rule and severity')).toEqual([
      ['COL-R01Overdue more than 30 days', '1', '2', '0', '3'],
      ['COL-R02Repeated payment failure', '1', '0', '0', '1'],
      ['COL-R03Lapse review', '1', '1', '0', '2'],
      ['COL-R04Unapplied cash', '0', '1', '0', '1'],
      ['COL-R05Failed payment attempt', '2', '0', '0', '2'],
      ['COL-R06Missing data', '0', '0', '0', '0'],
      ['Total', '5', '4', '0', '9'],
    ]);
    expect(
      screen.getByText('9 exceptions in this scope; failed attempts follow the cash period.'),
    ).toBeInTheDocument();

    // No recovery actions on the fixture yet.
    const actions = screen
      .getByRole('heading', { name: 'Recovery actions' })
      .closest('section') as HTMLElement;
    expect(
      within(actions)
        .getAllByRole('definition')
        .map((item) => item.textContent),
    ).toEqual(['0', '0', '0', '0']);
    expect(within(actions).getByText('No overdue recovery actions')).toBeInTheDocument();

    // A broker filter narrows every section and names itself on the sheet; unapplied cash is no longer attributable.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Broker' }), 'Direct Sales');
    await waitFor(() =>
      expect(tableRows(KPIS)[0]?.slice(1, 3)).toEqual(['P17,000.00', '2 invoices']),
    );
    expect(within(sheet).getByText('Broker: Direct Sales')).toBeInTheDocument();
    expect(tableRows(KPIS)[6]?.slice(1)).toEqual([
      '—',
      '—',
      expect.stringContaining('Not attributable while a filter is set'),
    ]);
    expect(
      within(actions).getByText(
        'Actions on invoices in these filters; actions on bank receipts are left out.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Print' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
