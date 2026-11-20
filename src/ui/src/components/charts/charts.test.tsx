import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { BarList } from './BarList';
import { chartColor, evenTicks } from './chartTheme';
import { DonutChart } from './DonutChart';
import { GroupedBarChart } from './GroupedBarChart';
import { StackedBarChart } from './StackedBarChart';
import { TrendChart } from './TrendChart';

describe('charts', () => {
  it('colour from design tokens; the bar list shows shares, links and a full-label tooltip, and every chart is empty-aware', () => {
    expect(chartColor('danger', 0)).toBe('var(--prm-chart-6)');
    expect(chartColor(undefined, 7)).toBe('var(--prm-chart-2)');
    expect(evenTicks(36000)).toEqual([0, 10000, 20000, 30000, 40000]);
    expect(evenTicks(5000)).toEqual([0, 1250, 2500, 3750, 5000]);
    expect(evenTicks(0)).toEqual([0, 1]);

    render(
      <MemoryRouter>
        <BarList
          label="Claims by stage"
          items={[
            { id: 'open', label: 'Awaiting release approval', value: 3, to: '/claims?status=open' },
            { id: 'closed', label: 'Closed', value: 1 },
          ]}
        />
        <BarList label="Empty list" items={[]} />
        <TrendChart label="Empty trend" series={[]} points={[]} />
      </MemoryRouter>,
    );

    const list = screen.getByRole('list', { name: 'Claims by stage' });
    expect(within(list).getByRole('link')).toHaveAttribute('href', '/claims?status=open');
    expect(list).toHaveTextContent('375%');
    expect(list).toHaveTextContent('125%');
    expect(screen.getByText('Awaiting release approval')).toHaveAttribute(
      'title',
      'Awaiting release approval',
    );
    expect(screen.getAllByText('No data for this period.')).toHaveLength(2);
  });

  it('give the donut, line and stacked bar charts an accessible data table with the same values', () => {
    const series = [
      { key: 'won', label: 'Awarded' },
      { key: 'lost', label: 'Cancelled', dashed: true },
    ];
    const points = [
      { x: 'Aug', values: { won: 2_000_000, lost: null } },
      { x: 'Sep', values: { won: 100_000, lost: 50_000 } },
    ];
    render(
      <>
        <DonutChart
          label="Open claims by days to close"
          caption="Open claims"
          segments={[
            { id: 'a', label: '0-3 days', value: 1 },
            { id: 'b', label: '15+ days', value: 3, tone: 'danger' },
          ]}
        />
        <TrendChart
          label="Trend"
          series={series}
          points={points}
          formatValue={(v) => `BWP ${v / 1000}K`}
        />
        <StackedBarChart
          label="Stacked"
          categoryLabel="Owner"
          series={series}
          points={points}
          horizontal
        />
        <GroupedBarChart
          label="Grouped"
          categoryLabel="Supplier"
          series={series}
          points={points}
          reference={{ value: 5, label: 'Target' }}
        />
      </>,
    );

    const donut = screen.getByRole('table', { name: 'Open claims by days to close' });
    expect(within(donut).getByRole('row', { name: '15+ days 3 75%' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('table', { name: 'Trend' })).getByRole('row', {
        name: 'Aug BWP 2000K —',
      }),
    ).toBeInTheDocument();
    const stacked = screen.getByRole('table', { name: 'Stacked' });
    expect(within(stacked).getByRole('row', { name: 'Sep 100,000 50,000' })).toBeInTheDocument();
    expect(
      within(stacked)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Owner', 'Awarded', 'Cancelled']);
    expect(stacked.parentElement).toHaveClass('prm-visually-hidden');
    const grouped = screen.getByRole('table', { name: 'Grouped' });
    expect(within(grouped).getByRole('row', { name: 'Aug 2,000,000 —' })).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
  });
});
