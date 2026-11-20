import type { SessionState, SessionUser } from '../app/slices/session';

export function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'prototype-cfo',
    email: null,
    fullName: 'Executive Demo',
    ...overrides,
  };
}

export function signedInSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    authStatus: 'signedIn',
    user: makeUser(),
    persona: 'cfo',
    theme: 'light',
    signOutReason: null,
    ...overrides,
  };
}

export function signedOutSession(overrides: Partial<SessionState> = {}): SessionState {
  return signedInSession({ authStatus: 'signedOut', user: null, ...overrides });
}
