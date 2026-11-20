/**
 * Session slice: the signed-in user, the persona view and the theme.
 *
 * The persona and the theme are remembered in the browser (`lib/storage.ts`) and read once when the store is
 * created, so a refresh keeps them. Writing them is the job of the actions in `../sessionActions.ts`.
 */
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { readStoredPersona, readStoredTheme } from '../../lib/storage';
import type { StoredTheme } from '../../lib/storage';
import { DEFAULT_PERSONA } from '../personas';
import type { PersonaId } from '../personas';

export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn';
/** Why the last sign-out happened: the user chose it, or the session expired (the API answered 401). */
export type SignOutReason = 'user' | 'expired';

export interface SessionUser {
  /** `prototype-<role>`: the demo role signed in as. */
  readonly id: string;
  readonly email: string | null;
  readonly fullName: string;
}

export interface SessionState {
  readonly authStatus: AuthStatus;
  readonly user: SessionUser | null;
  readonly persona: PersonaId;
  readonly theme: StoredTheme;
  readonly signOutReason: SignOutReason | null;
}

function initialSessionState(): SessionState {
  return {
    authStatus: 'initializing',
    user: null,
    persona: readStoredPersona() ?? DEFAULT_PERSONA,
    theme: readStoredTheme() ?? 'light',
    signOutReason: null,
  };
}

const sessionSlice = createSlice({
  name: 'session',
  initialState: initialSessionState,
  reducers: {
    authSignedIn(state, action: PayloadAction<{ user: SessionUser }>) {
      state.authStatus = 'signedIn';
      state.user = action.payload.user;
      state.signOutReason = null;
    },
    signedOut(state, action: PayloadAction<SignOutReason | undefined>) {
      state.authStatus = 'signedOut';
      state.user = null;
      state.signOutReason = action.payload ?? null;
    },
    personaChanged(state, action: PayloadAction<PersonaId>) {
      state.persona = action.payload;
    },
    themeChanged(state, action: PayloadAction<StoredTheme>) {
      state.theme = action.payload;
    },
  },
});

export const { authSignedIn, signedOut, personaChanged, themeChanged } = sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;

/** Actions after which every user-scoped slice must reset. */
export const userBoundaryActions = [signedOut] as const;
