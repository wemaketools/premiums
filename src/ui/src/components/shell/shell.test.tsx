import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Outlet } from 'react-router';

import { LandingRedirect } from '../../app/LandingRedirect';
import type { FeatureModule } from '../../app/featureRegistry';
import { createAppStore } from '../../app/store';
import { signedInSession } from '../../test/fixtures';
import { renderRouteTree, stubAuth } from '../../test/render';
import { PageHeader } from '../ui/PageHeader';
import { AppShell } from './AppShell';

const modules: FeatureModule[] = [
  {
    id: 'demo',
    routes: [],
    nav: [
      { id: 'second', label: 'ui.action.dismiss', path: 'second', order: 2, icon: 'list' },
      { id: 'first', label: 'ui.action.retry', path: 'first', order: 1, icon: 'dashboard' },
      { id: 'digest', label: 'ui.action.close', path: 'digest', order: 3, icon: 'list' },
    ],
  },
];

function renderShell(options: Parameters<typeof renderRouteTree>[1]) {
  return renderRouteTree(
    [
      // Outside the shell, as in the real router.
      { path: '/', element: <LandingRedirect destinations={['/first', '/digest']} /> },
      {
        element: <AppShell modules={modules} />,
        children: [
          { path: 'first', element: <PageHeader title="First page" /> },
          { path: 'second', element: <Outlet /> },
          { path: 'digest', element: <PageHeader title="Digest page" /> },
        ],
      },
    ],
    options,
  );
}

describe('the app shell', () => {
  it('shows the tenant, brand, ordered nav and page title; switches persona and theme and remembers them; signs out', async () => {
    const auth = stubAuth();
    const store = createAppStore({ session: signedInSession() });
    const { router } = renderShell({ store, auth, route: '/first' });

    const sidebar = screen.getByRole('complementary', { name: 'Main navigation and account' });
    expect(within(sidebar).getByText('Fixture validation')).toBeInTheDocument();
    expect(within(sidebar).getByText('Control Tower')).toBeInTheDocument();
    expect(sidebar.querySelector('.prm-brand-name')).toHaveTextContent('Premium Collections');
    const links = within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole(
      'link',
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/first',
      '/second',
      '/digest',
      'https://claims.thebrittany.ai',
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 1, name: 'First page' })).toBeInTheDocument();

    const persona = screen.getByRole('combobox', { name: 'Viewing as' });
    expect(
      within(persona)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'CFO / MD',
      'Finance / Credit Control',
      'Broker Relationship Manager',
      'Executive Viewer',
      'Demo Admin',
    ]);
    await userEvent.selectOptions(persona, 'executive');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Digest page' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/digest');
    // The shell stayed mounted: the switch that was used is the same element and still has focus.
    expect(persona).toBeInTheDocument();
    expect(persona).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Use dark theme' }));

    expect(store.getState().session).toMatchObject({ persona: 'executive', theme: 'dark' });
    expect(createAppStore().getState().session).toMatchObject({
      persona: 'executive',
      theme: 'dark',
    });
    expect(screen.getByRole('button', { name: 'Use light theme' })).toBeInTheDocument();

    const account = screen.getByRole('button', { name: /^Executive Demo/ });
    expect(account).toHaveTextContent('Executive Viewer');
    await userEvent.click(account);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Use light theme' }));
    expect(store.getState().session.theme).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: /^Executive Demo/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('is a drawer on a phone: focus enters it, Escape closes it, and following a link focuses the main region', async () => {
    const original = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      ...original(query),
      matches: query === '(max-width: 767px)',
    }));
    renderShell({ state: { session: signedInSession() }, route: '/first' });
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getAllByRole('link')[0]).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();

    await userEvent.click(menuButton);
    await userEvent.click(within(nav).getByRole('link', { name: 'Dismiss' }));

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('offers the full-sidebar toggle only in the icon rail, remembers the choice and treats an unknown value as collapsed', async () => {
    const original = window.matchMedia;
    const mockRail = (rail: boolean): void => {
      vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
        ...original(query),
        matches: rail && query === '(min-width: 768px) and (max-width: 1279px)',
      }));
    };

    mockRail(false);
    const wide = renderShell({ state: { session: signedInSession() }, route: '/first' });
    expect(screen.queryByRole('button', { name: 'Full sidebar' })).not.toBeInTheDocument();
    wide.unmount();

    window.localStorage.setItem('prm.sidebar', 'sideways');
    mockRail(true);
    const rail = renderShell({ state: { session: signedInSession() }, route: '/first' });
    const toggle = screen.getByRole('button', { name: 'Full sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.prm-app')).not.toHaveClass('prm-app--sidebar-expanded');

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveFocus();
    expect(document.querySelector('.prm-app')).toHaveClass('prm-app--sidebar-expanded');
    expect(window.localStorage.getItem('prm.sidebar')).toBe('expanded');
    rail.unmount();

    renderShell({ state: { session: signedInSession() }, route: '/first' });
    const restored = screen.getByRole('button', { name: 'Full sidebar' });
    expect(restored).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(restored);
    expect(restored).toHaveAttribute('aria-expanded', 'false');
    expect(window.localStorage.getItem('prm.sidebar')).toBe('collapsed');
  });
});
