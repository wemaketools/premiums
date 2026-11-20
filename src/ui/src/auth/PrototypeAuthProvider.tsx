/**
 * PrototypeAuthProvider: the session is the demo role the visitor picked, kept in the browser (`lib/storage.ts`) so a
 * refresh keeps it. There is no password and no token: the persona is a demo convenience, never authentication.
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

import type { ApiTransport } from '../api/client';
import { useAppDispatch } from '../app/hooks';
import type { PersonaId } from '../app/personas';
import { choosePersona } from '../app/sessionActions';
import { authSignedIn, signedOut } from '../app/slices/session';
import type { SessionUser } from '../app/slices/session';
import type { AppStore } from '../app/store';
import { readStoredPrototypeRole, storePrototypeRole } from '../lib/storage';
import { AuthContext } from './authContext';
import { PROTOTYPE_USER_NAMES } from './prototypeUsers';
import type { AuthActions } from './authContext';
import { useApiClientAdapters, useThemeOnDocument } from './sessionEffects';

export interface PrototypeAuthProviderProps {
  readonly store: AppStore;
  readonly children: ReactNode;
  /** Where API calls go; the platform `fetch` when omitted. */
  readonly transport?: ApiTransport;
}

function prototypeUser(role: PersonaId): SessionUser {
  return { id: `prototype-${role}`, email: null, fullName: PROTOTYPE_USER_NAMES[role] };
}

const noToken = (): Promise<null> => Promise.resolve(null);

export function PrototypeAuthProvider({ store, children, transport }: PrototypeAuthProviderProps) {
  const dispatch = useAppDispatch();

  const endSession = useCallback(
    (reason: 'user' | 'expired') => {
      storePrototypeRole(null);
      dispatch(signedOut(reason));
    },
    [dispatch],
  );
  const onUnauthorized = useCallback(() => {
    if (store.getState().session.authStatus === 'signedIn') {
      endSession('expired');
    }
  }, [store, endSession]);
  useApiClientAdapters({ store, transport, getAccessToken: noToken, onUnauthorized });
  useThemeOnDocument();

  useEffect(() => {
    const role = readStoredPrototypeRole();
    dispatch(role === null ? signedOut() : authSignedIn({ user: prototypeUser(role) }));
  }, [dispatch]);

  const actions = useMemo<AuthActions>(
    () => ({
      signInAsRole(role) {
        storePrototypeRole(role);
        dispatch(choosePersona(role));
        dispatch(authSignedIn({ user: prototypeUser(role) }));
      },
      signOut() {
        endSession('user');
        return Promise.resolve();
      },
    }),
    [dispatch, endSession],
  );

  return <AuthContext.Provider value={actions}>{children}</AuthContext.Provider>;
}
