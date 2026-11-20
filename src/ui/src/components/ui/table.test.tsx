import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import { DataTable } from './DataTable';
import type { DataTableColumn, DataTableSort } from './DataTable';
import { Pagination } from './Pagination';

interface Row {
  readonly id: string;
  readonly title: string;
  readonly value: string;
}

const rows: Row[] = [
  { id: 'CLM-0003', title: 'Storm damage', value: '1,500,000' },
  { id: 'CLM-0002', title: 'Windscreen replacement', value: '786,000' },
];

const columns: DataTableColumn<Row>[] = [
  { id: 'ref', header: 'Reference', sortable: true, cell: (row) => row.id },
  { id: 'title', header: 'Title', cell: (row) => <a href={`/t/${row.id}`}>{row.title}</a> },
  {
    id: 'value',
    header: 'Reserve',
    numeric: true,
    sortable: true,
    width: '12rem',
    cell: (row) => <span>{`P ${row.value}`}</span>,
  },
];

describe('DataTable', () => {
  it('sorts, selects rows, opens a record by button or click, and paginates', async () => {
    const onRowClick = vi.fn();
    const onPageChange = vi.fn();
    function Harness() {
      const [sort, setSort] = useState<DataTableSort>({ key: 'ref', dir: 'asc' });
      const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
      return (
        <DataTable
          caption="Claims"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          rowLabel={(row) => `Open ${row.id}`}
          onRowClick={onRowClick}
          sort={sort}
          onSortChange={setSort}
          selection={{
            selected,
            onChange: setSelected,
            actions: <button type="button">Export</button>,
          }}
          pagination={{ page: 1, pageSize: 2, total: 5, onPageChange }}
        />
      );
    }
    render(<Harness />);
    const table = screen.getByRole('table', { name: 'Claims' });
    expect(within(table).getByRole('columnheader', { name: /Reference/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(within(table).getByRole('columnheader', { name: /Reserve/ }).style.minWidth).toBe(
      '12rem',
    );

    await userEvent.click(screen.getByRole('button', { name: /Reference/ }));
    expect(within(table).getByRole('columnheader', { name: /Reference/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    await userEvent.click(screen.getByRole('button', { name: /Reserve/ }));
    expect(within(table).getByRole('columnheader', { name: /Reserve/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Open CLM-0002' }));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();

    const row = screen.getByRole('row', { name: 'Open CLM-0003' });
    within(row).getByRole('button', { name: 'Open CLM-0003' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    await userEvent.click(within(row).getByText('Storm damage'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    await userEvent.click(within(row).getByText('P 1,500,000'));
    expect(onRowClick).toHaveBeenCalledTimes(2);

    expect(screen.getByText('Showing 1–2 of 5')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('links rows to their record, and shows loading, empty, restricted and error states', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <MemoryRouter initialEntries={['/claims']}>
        <Routes>
          <Route
            path="/claims"
            element={
              <DataTable
                caption="Claims"
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                rowHref={(row) => `/claims/${row.id}`}
              />
            }
          />
          <Route path="/claims/:id" element={<p>record page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Open row 1' })).toHaveAttribute(
      'href',
      '/claims/CLM-0003',
    );
    await userEvent.click(screen.getByText('P 786,000'));
    expect(screen.getByText('record page')).toBeInTheDocument();

    const states = (props: Partial<Parameters<typeof DataTable<Row>>[0]>) => (
      <DataTable
        caption="Claims"
        columns={columns}
        rows={undefined}
        rowKey={(row) => row.id}
        {...props}
      />
    );
    rerender(states({ loading: true }));
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    rerender(states({ rows: [] }));
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
    rerender(states({ rows, restricted: true }));
    expect(screen.getByText('Restricted')).toBeInTheDocument();
    expect(screen.queryByText('Storm damage')).not.toBeInTheDocument();
    rerender(
      states({
        onRetry,
        error: new ApiError({ kind: 'network', status: 0, title: 'x', endpointId: 'x' }),
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('Pagination', () => {
  it('shows the range, windows the page numbers, changes pages and size, and clamps a page past the end', async () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const { rerender } = render(
      <Pagination
        page={5}
        pageSize={25}
        total={500}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    expect(screen.getByText('Showing 101–125 of 500')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Pages' });
    expect(
      within(nav)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['', '1', '4', '5', '6', '20', '']);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(6);
    await userEvent.selectOptions(screen.getByRole('combobox'), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);

    rerender(<Pagination page={9} pageSize={25} total={60} onPageChange={() => undefined} />);

    expect(screen.getByText('Showing 51–60 of 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');
  });
});
