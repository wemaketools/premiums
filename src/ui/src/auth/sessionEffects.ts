/**
 * The effects both auth providers share: the API client adapters and the theme on `<html data-theme>`.
 */
import { useEffect } from 'react';

import { configureApiClient } from '../api/client';
import type { ApiTransport } from '../api/client';
import { useAppSelector } from '../app/hooks';
import type { AppStore } from '../app/store';
import { tenantOf } from '../app/tenant';

export interface ApiClientAuth {
  readonly store: AppStore;
  readonly transport: ApiTransport | undefined;
  /** Stable between renders: a change reinstalls the adapters. */
  readonly getAccessToken: () => Promise<string | null>;
  /** Stable between renders: a change reinstalls the adapters. */
  readonly onUnauthorized: () => void;
}

/** Token per request, tenant while signed in, as-of date, persona and the transport. */
export function useApiClientAdapters({
  store,
  transport,
  getAccessToken,
  onUnauthorized,
}: ApiClientAuth): void {
  useEffect(
    () =>
      configureApiClient({
        getAccessToken,
        getTenantId: () =>
          store.getState().session.authStatus === 'signedIn'
            ? tenantOf(store.getState().dataContext.dataSet).id
            : null,
        getAsOf: () => store.getState().dataContext.asOf,
        getPersona: () => store.getState().session.persona,
        ...(transport === undefined ? {} : { transport }),
        onUnauthorized,
      }),
    [store, transport, getAccessToken, onUnauthorized],
  );
}

export function useThemeOnDocument(): void {
  const theme = useAppSelector((state) => state.session.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
}
