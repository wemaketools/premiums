import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { vi } from 'vitest';

import { configureApiClient } from '../api/client';
import type { ApiTransport } from '../api/client';
import { createAppStore } from '../app/store';
import type { AppStore, RootState } from '../app/store';
import { tenantOf } from '../app/tenant';
import { AuthContext } from '../auth/authContext';
import type { AuthActions } from '../auth/authContext';
import { ToastProvider } from '../components/ui/ToastProvider';
import { restoreAfterEach } from './restoreAfterEach';

export function stubAuth(overrides: Partial<AuthActions> = {}): AuthActions {
  return {
    signInAsRole: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

export interface RenderOptions {
  readonly state?: Partial<RootState>;
  readonly store?: AppStore;
  readonly route?: string;
  readonly routes?: RouteObject[];
  readonly path?: string;
  readonly auth?: AuthActions;
  readonly onUnauthorized?: () => void;
  /** Sends API calls somewhere other than the global `fetch`, for example to a mock API. */
  readonly transport?: ApiTransport;
}

/** Also points the API client's adapters at this test's store and restores them afterwards. */
export function renderRouteTree(routes: RouteObject[], options: RenderOptions = {}) {
  const store = options.store ?? createAppStore(options.state);
  const auth = options.auth ?? stubAuth();
  restoreAfterEach(
    configureApiClient({
      getAccessToken: () => Promise.resolve(null),
      getTenantId: () =>
        store.getState().session.authStatus === 'signedIn'
          ? tenantOf(store.getState().dataContext.dataSet).id
          : null,
      getAsOf: () => store.getState().dataContext.asOf,
      getPersona: () => store.getState().session.persona,
      ...(options.transport === undefined ? {} : { transport: options.transport }),
      onUnauthorized: options.onUnauthorized ?? (() => undefined),
    }),
  );
  const router = createMemoryRouter(routes, { initialEntries: [options.route ?? '/'] });
  const result = render(
    <Provider store={store}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthContext.Provider>
    </Provider>,
  );
  return { ...result, store, router, auth };
}

export function renderWithProviders(element: ReactElement, options: RenderOptions = {}) {
  return renderRouteTree(
    [{ path: options.path ?? '*', element }, ...(options.routes ?? [])],
    options,
  );
}

export function LocationProbe({ label }: { readonly label: string }) {
  return <p data-testid="location-probe">{label}</p>;
}
