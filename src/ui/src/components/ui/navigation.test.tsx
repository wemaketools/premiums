import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { signedInSession } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { FilterBar, QuickRanges, SearchField } from './FilterBar';
import { Menu } from './Menu';
import { LinkTabs, Tabs, VerticalTabs } from './Tabs';
import { useToast } from './toastContext';

describe('navigation widgets', () => {
  it('tabs move with the arrow keys and route tabs mark the current page', async () => {
    function Harness() {
      const [selected, setSelected] = useState('a');
      return (
        <MemoryRouter initialEntries={['/claims/3/lots']}>
          <Tabs
            label="Sections"
            selected={selected}
            onSelect={setSelected}
            tabs={[
              { id: 'a', label: 'Overview' },
              { id: 'b', label: 'Lots', count: 3 },
              { id: 'c', label: 'Documents' },
            ]}
          >
            <p>panel {selected}</p>
          </Tabs>
          <LinkTabs
            label="Claim"
            tabs={[
              { to: '/claims/3', label: 'Summary', end: true },
              { to: '/claims/3/lots', label: 'Lot list' },
            ]}
          />
          <VerticalTabs
            label="Settings"
            title="Settings"
            tabs={[{ to: '/claims/3/lots', label: 'Brokers' }]}
          >
            <p>content</p>
          </VerticalTabs>
        </MemoryRouter>
      );
    }
    render(<Harness />);

    screen.getByRole('tab', { name: 'Overview' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Lots/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel b');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveFocus();

    expect(screen.getByRole('link', { name: 'Lot list' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Summary' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Brokers' })).toHaveAttribute('aria-current', 'page');
  });

  it('the filter bar offers quick ranges, search and clear', async () => {
    const onClear = vi.fn();
    const onSelect = vi.fn();
    const onSubmit = vi.fn();
    function Search() {
      const [value, setValue] = useState('');
      return <SearchField label="Search" value={value} onChange={setValue} onSubmit={onSubmit} />;
    }
    render(
      <FilterBar
        onClear={onClear}
        quickRanges={
          <QuickRanges
            label="Range"
            selected="month"
            onSelect={onSelect}
            options={[
              { id: 'month', label: 'This month' },
              { id: 'quarter', label: 'This quarter' },
            ]}
          />
        }
      >
        <Search />
      </FilterBar>,
    );

    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'This quarter' }));
    expect(onSelect).toHaveBeenCalledWith('quarter');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'pump{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('pump');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('a menu opens with the keyboard, runs actions, and returns focus to its trigger after an action or a link', async () => {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <Menu
          label="Account"
          entries={[
            { kind: 'text', id: 't', label: 'Acting as officer' },
            { id: 'a', label: 'Switch persona', onSelect },
            { kind: 'link', id: 'p', label: 'Profile', to: '/me/profile' },
            { kind: 'separator', id: 's' },
            { id: 'b', label: 'Sign out', onSelect: () => undefined, danger: true },
          ]}
          trigger={(props) => (
            <button type="button" {...props}>
              account
            </button>
          )}
        />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: 'account' });
    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Switch persona' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('a toast reports the result of an action in a live region and can be dismissed', async () => {
    function Trigger() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.show('Saved', 'success')}>
          save
        </button>
      );
    }
    renderWithProviders(<Trigger />, { state: { session: signedInSession() } });

    await userEvent.click(screen.getByRole('button', { name: 'save' }));

    const region = screen.getByRole('region', { name: 'Messages' });
    expect(within(region).getByRole('status')).toHaveTextContent('Saved');
    await userEvent.click(within(region).getByRole('button', { name: 'Dismiss' }));
    expect(within(region).queryByRole('status')).not.toBeInTheDocument();
  });
});
