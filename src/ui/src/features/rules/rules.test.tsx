import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp, tableRows } from '../../test/renderApp';

describe('Rules & Definitions', () => {
  it('shows the thresholds in force as POC assumptions, the rules COL-R01..R06 with the configured numbers, the KPI notes, the owner and due-date defaults and the guardrail, read only', async () => {
    renderApp('/rules');

    const thresholds = (
      await screen.findByRole('heading', { name: 'Thresholds in force' })
    ).closest('section') as HTMLElement;
    expect(
      within(thresholds)
        .getAllByRole('definition')
        .slice(0, 4)
        .map((item) => item.textContent),
    ).toEqual(['30 days', '60 days', '30 days', '2 failed attempts']);
    expect(
      within(thresholds).getByText(
        'Illustrative POC assumptions from proposed_rule_config.json: not insurer collection terms, legal cover rules or regulatory requirements.',
      ),
    ).toBeInTheDocument();

    const rules = tableRows('Collection rules');
    expect(rules.map((row) => row[0])).toEqual([
      'COL-R01Overdue more than 30 days',
      'COL-R02Repeated payment failure',
      'COL-R03Lapse review',
      'COL-R04Unapplied cash',
      'COL-R05Failed payment attempt',
      'COL-R06Missing data',
    ]);
    expect(rules[0]?.[1]).toBe('Something outstanding and more than 30 days overdue.');
    expect(rules[1]?.[1]).toContain(
      'At least 2 failed payment attempts on the same invoice in the last 30 days',
    );
    expect(rules[2]?.[1]).toContain('at least 60 days overdue');
    expect(rules[1]?.[2]).toBe('High when the invoice is overdue, else Medium.');
    expect(rules[5]?.[2]).toBe('High.');
    for (const row of rules) expect(row[3]).toContain('no change to the policy status');

    const kpis = tableRows('KPI definitions');
    expect(kpis.map((row) => row[0])).toContain('Valid allocation');
    expect(kpis.find((row) => row[0] === 'Overdue')?.[1]).toContain('Due today is not overdue');
    expect(tableRows('Response days by severity')).toEqual([
      ['High', '2 days'],
      ['Medium', '5 days'],
      ['Low', '10 days'],
    ]);
    expect(screen.getByText('A POC default, not a service level.')).toBeInTheDocument();
    expect(
      screen.getByText(/A user may override the urgency on a recovery action/),
    ).toBeInTheDocument();
    expect(screen.getByText(/The same P1,000 receipt must never inflate both/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save|Edit/ })).not.toBeInTheDocument();
  });
});
