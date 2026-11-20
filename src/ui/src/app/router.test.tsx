import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { ApiTransport } from '../api/client';
import { createMockTransport } from '../api/mockTransport';
import { makeUser, signedInSession } from '../test/fixtures';
import { renderRouteTree } from '../test/render';
import { features } from './featureRegistry';
import { buildRoutes } from './router';
import { authSignedIn, personaChanged, signedOut } from './slices/session';
import { createAppStore } from './store';

/** Each destination with a text only that page shows on the TEST data set. */
const PAGES = [
  ['Overview', 'Gross unpaid'],
  ['Aging & Exposure', 'Aging buckets'],
  ['Invoices', 'Total: 6 invoices'],
  ['Exceptions', 'Show acknowledged'],
  ['Receipts', 'How receipt cash is counted'],
  ['Action Queue', 'No recovery actions yet'],
  ['Finance Digest', 'Key figures'],
  ['Rules & Definitions', 'Thresholds in force'],
] as const;

describe('the application routes', () => {
  it('lands a signed-in user on Overview and walks the eight pages through the sidebar, then an unknown address', async () => {
    expect(() => buildRoutes([])).toThrow('No navigation destination is registered');
    const { router } = renderRouteTree(buildRoutes(features), {
      state: { session: signedInSession(), dataContext: { dataSet: 'TEST', asOf: '2026-10-21' } },
      transport: createMockTransport(),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/overview');
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([...PAGES.map(([title]) => title), 'ClaimsIQ']);
    expect(within(nav).getByRole('link', { name: 'ClaimsIQ' })).toHaveAttribute(
      'href',
      'https://claims.thebrittany.ai',
    );
    for (const [title, text] of PAGES) {
      await userEvent.click(within(nav).getByRole('link', { name: title }));

      expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: title })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }

    await act(() => router.navigate('/nowhere'));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('opens each persona on its own screen at "/", and after a sign-in sends a deep link where it was asked and "/" to the persona\'s screen', async () => {
    const landings = [
      ['cfo', '/overview', 'Overview'],
      ['credit-control', '/actions', 'Action Queue'],
      ['broker-rm', '/aging', 'Aging & Exposure'],
      ['executive', '/digest', 'Finance Digest'],
      ['demo-admin', '/overview', 'Overview'],
    ] as const;
    for (const [persona, path, title] of landings) {
      const { router, unmount } = renderRouteTree(buildRoutes(features), {
        state: { session: signedInSession({ persona }) },
        transport: createMockTransport(),
      });

      expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe(path);
      unmount();
    }

    // Signed out: "/" and a deep link both go to sign-in; once signed in as another persona, "/" opens that
    // persona's screen and the deep link still opens the address that was asked for.
    for (const [asked, expected] of [
      ['/', '/actions'],
      ['/invoices/INV-006', '/invoices/INV-006'],
    ] as const) {
      const store = createAppStore();
      const { router, unmount } = renderRouteTree(buildRoutes(features), {
        store,
        route: asked,
        transport: createMockTransport(),
      });
      act(() => {
        store.dispatch(signedOut());
      });
      expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

      act(() => {
        store.dispatch(personaChanged('credit-control'));
        store.dispatch(authSignedIn({ user: makeUser() }));
      });

      await waitFor(() => expect(router.state.location.pathname).toBe(expected));
      unmount();
    }
  });

  it('shows the loading screen while the session is established, then sends a signed-out user to sign-in', async () => {
    const store = createAppStore();
    const { router } = renderRouteTree(buildRoutes(features), { store, route: '/invoices' });
    expect(screen.getByRole('status')).toHaveTextContent('Signing you in');

    act(() => {
      store.dispatch(signedOut());
    });

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/signin');
  });

  it('shows a page loading, then its error with a retry that recovers to the page', async () => {
    const mock = createMockTransport();
    let attempt = 0;
    let release: () => void = () => undefined;
    const transport: ApiTransport = (url, init) => {
      if (!url.startsWith('/api/v1/collections/summary')) return mock(url, init);
      attempt += 1;
      if (attempt > 1) return mock(url, init);
      return new Promise<void>((resolve) => {
        release = resolve;
      }).then(
        () =>
          new Response(JSON.stringify({ type: 'about:blank', title: 'Down', status: 500 }), {
            status: 500,
            headers: { 'content-type': 'application/problem+json' },
          }),
      );
    };
    renderRouteTree(buildRoutes(features), {
      state: {
        session: signedInSession(),
        dataContext: { dataSet: 'TEST', asOf: '2026-10-21' },
      },
      transport,
      route: '/aging',
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aging & Exposure' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Aging buckets')).not.toBeInTheDocument();

    await act(async () => release());

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect((await screen.findAllByText('Aging buckets')).length).toBeGreaterThan(0);
  });
});
