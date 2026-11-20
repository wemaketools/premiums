import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter, data } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { signedOutSession } from '../test/fixtures';
import { renderWithProviders } from '../test/render';
import { LoadingScreen } from './LoadingScreen';
import { NotFoundPage } from './NotFoundPage';
import { RouteErrorPage } from './RouteErrorPage';
import { isChunkLoadError } from './chunkLoadError';

function renderFailing(error: unknown, onReload?: () => void) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        loader: () => {
          throw error;
        },
        element: <p>loaded</p>,
        errorElement: <RouteErrorPage onReload={onReload} />,
      },
    ],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('status pages', () => {
  it('offers the way back from Not found and announces progress on the loading screen', () => {
    const { unmount } = renderWithProviders(<NotFoundPage />, {
      state: { session: signedOutSession() },
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/');
    unmount();

    renderWithProviders(<LoadingScreen message="Signing you in…" />);

    expect(screen.getByRole('status')).toHaveTextContent('Signing you in…');
  });

  it('turns a failed route into a reload prompt for a lost page module, a sanitized message otherwise, and Not found for a 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const chunkError = new TypeError('Failed to fetch dynamically imported module: http://x/a.tsx');
    expect(isChunkLoadError(chunkError)).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);

    const onReload = vi.fn();
    const first = renderFailing(chunkError, onReload);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This page could not be loaded' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reload the page' }));
    expect(onReload).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = renderFailing(new Error('secret internal detail'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument();
    second.unmount();

    renderFailing(data(null, { status: 404 }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
