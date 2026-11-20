import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { createMockTransport } from '../api/mockTransport';
import { features } from '../app/featureRegistry';
import { buildRoutes } from '../app/router';
import { createAppStore } from '../app/store';
import { ToastProvider } from '../components/ui/ToastProvider';
import { PrototypeAuthProvider } from './PrototypeAuthProvider';

function renderPrototype(route: string) {
  const store = createAppStore();
  const router = createMemoryRouter(buildRoutes(features), { initialEntries: [route] });
  const { unmount } = render(
    <Provider store={store}>
      <PrototypeAuthProvider store={store} transport={createMockTransport()}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </PrototypeAuthProvider>
    </Provider>,
  );
  return { store, router, unmount };
}

describe('demo sign-in', () => {
  it('signs in by a role click with no password, keeps the session across a refresh, signs out, and lands each role on its screen', async () => {
    const warn = console.warn.bind(console);
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      if (!String(args[0]).includes('width(0) and height(0)')) warn(...args);
    });

    // A signed-out visitor to a deep link meets the roles card, not a password form, under the banner.
    const first = renderPrototype('/invoices');
    expect(await screen.findByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      'Synthetic demo data only: not a production finance system',
    );
    expect(screen.queryByLabelText(/Password/)).not.toBeInTheDocument();
    const roles = within(
      screen.getByRole('heading', { name: 'Demo accounts' }).closest('section')!,
    );
    expect(roles.getByText('Choose a role to sign in. No password needed.')).toBeInTheDocument();
    expect(roles.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'CFO / MDExecutive Demo',
      'Finance / Credit ControlTiro Demo',
      'Broker Relationship ManagerTiro Demo',
      'Executive ViewerExecutive Demo',
      'Demo AdminBuilder Demo',
    ]);

    // One click signs in as the role, returns to the page asked for, and shows the banner in the shell.
    await userEvent.click(roles.getByRole('button', { name: /^Finance \/ Credit Control/ }));
    expect(await screen.findByRole('heading', { name: 'Invoices', level: 1 })).toBeInTheDocument();
    expect(first.router.state.location.pathname).toBe('/invoices');
    expect(screen.getByRole('note')).toHaveTextContent('Synthetic demo data only');
    expect(screen.getByRole('combobox', { name: 'Viewing as' })).toHaveValue('credit-control');
    expect(window.localStorage.getItem('prm.prototype.role')).toBe('credit-control');
    first.unmount();

    // A refresh (a fresh store and router over the same browser storage) is still signed in, on the role's screen.
    const second = renderPrototype('/');
    expect(
      await screen.findByRole('heading', { name: 'Action Queue', level: 1 }),
    ).toBeInTheDocument();
    expect(second.store.getState().session.user?.fullName).toBe('Tiro Demo');

    // Sign out returns to sign-in and the next refresh stays signed out.
    await userEvent.click(screen.getByRole('button', { name: /^Tiro Demo/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in', level: 1 })).toBeInTheDocument();
    expect(second.router.state.location.pathname).toBe('/signin');
    expect(window.localStorage.getItem('prm.prototype.role')).toBeNull();

    // Each role lands on its own screen when it signs in with no address asked for, and switching it in the top bar goes there.
    const roleScreens = [
      ['Broker Relationship Manager', 'Aging & Exposure', 'broker-rm'],
      ['Executive Viewer', 'Finance Digest', 'executive'],
      ['CFO \\/ MD', 'Overview', 'cfo'],
    ] as const;
    for (const [role, screenTitle, persona] of roleScreens) {
      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${role}`) }));
      expect(
        await screen.findByRole('heading', { name: screenTitle, level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Viewing as' })).toHaveValue(persona);
      await userEvent.click(screen.getByRole('button', { name: /Demo/ }));
      await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
      await screen.findByRole('heading', { name: 'Sign in', level: 1 });
    }
    await userEvent.click(screen.getByRole('button', { name: /^Demo Admin/ }));
    await screen.findByRole('heading', { name: 'Overview', level: 1 });
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Viewing as' }),
      'credit-control',
    );
    expect(
      await screen.findByRole('heading', { name: 'Action Queue', level: 1 }),
    ).toBeInTheDocument();
    expect(second.router.state.location.pathname).toBe('/actions');
  });
});
