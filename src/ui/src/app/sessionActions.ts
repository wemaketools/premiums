/**
 * Session actions that remember their result in the browser: the persona view and the theme survive a refresh.
 */
import { storePersona, storeTheme } from '../lib/storage';
import type { StoredTheme } from '../lib/storage';
import type { PersonaId } from './personas';
import { personaChanged, themeChanged } from './slices/session';
import type { AppDispatch } from './store';

export function choosePersona(persona: PersonaId) {
  return (dispatch: AppDispatch): void => {
    storePersona(persona);
    dispatch(personaChanged(persona));
  };
}

export function chooseTheme(theme: StoredTheme) {
  return (dispatch: AppDispatch): void => {
    storeTheme(theme);
    dispatch(themeChanged(theme));
  };
}
