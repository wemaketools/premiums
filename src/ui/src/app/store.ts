/**
 * The Redux store: session, data context and filters slices. `createAppStore` builds a fresh store (tests use it with
 * a preloaded state) that remembers every change to the filters in the browser; `store` is the application's instance.
 */
import { combineReducers, configureStore } from '@reduxjs/toolkit';

import { storeFilters } from '../lib/storage';
import { dataContextReducer } from './slices/dataContext';
import { filtersReducer } from './slices/filters';
import { sessionReducer } from './slices/session';

export const rootReducer = combineReducers({
  session: sessionReducer,
  dataContext: dataContextReducer,
  filters: filtersReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function createAppStore(preloadedState?: Partial<RootState>) {
  const created = configureStore({ reducer: rootReducer, preloadedState });
  let remembered = created.getState().filters.byScreen;
  created.subscribe(() => {
    const current = created.getState().filters.byScreen;
    if (current !== remembered) {
      remembered = current;
      storeFilters(current);
    }
  });
  return created;
}

export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore['dispatch'];

export const store = createAppStore();
