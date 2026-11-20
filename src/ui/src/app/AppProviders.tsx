/**
 * The application providers, outermost first: the Redux store, authentication (the demo role session, the API client
 * adapters and the theme) and toasts. The router renders inside them.
 */
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';

import type { ApiTransport } from '../api/client';
import { PrototypeAuthProvider } from '../auth/PrototypeAuthProvider';
import { ToastProvider } from '../components/ui/ToastProvider';
import type { AppStore } from './store';

export function AppProviders({
  store,
  children,
  transport,
}: {
  readonly store: AppStore;
  readonly children: ReactNode;
  readonly transport?: ApiTransport;
}) {
  return (
    <Provider store={store}>
      <PrototypeAuthProvider store={store} {...(transport === undefined ? {} : { transport })}>
        <ToastProvider>{children}</ToastProvider>
      </PrototypeAuthProvider>
    </Provider>
  );
}
