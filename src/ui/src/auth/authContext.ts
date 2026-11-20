/**
 * The authentication actions of the demo. Session DATA (the user) lives in the Redux session slice; this context only
 * carries the operations: sign in as a role (no password: the role is the session) and sign out. The persona switch
 * and this sign-in are a demo convenience, never authentication.
 */
import { createContext, useContext } from 'react';

import type { PersonaId } from '../app/personas';

export interface AuthActions {
  /** Signs in as a demo role: no password, the session is the role. */
  signInAsRole(role: PersonaId): void;
  /** Ends the session; the session slice resets and the guard sends the visitor to sign-in. */
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthActions | null>(null);

export function useAuth(): AuthActions {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error('useAuth must be used inside an auth provider.');
  }
  return value;
}
