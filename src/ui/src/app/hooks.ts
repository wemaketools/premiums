/**
 * Typed Redux hooks and the session selectors every feature uses.
 */
import { useDispatch, useSelector } from 'react-redux';

import type { Tenant } from './tenant';
import { tenantOf } from './tenant';
import type { PersonaId } from './personas';
import type { AppDispatch, RootState } from './store';
import { filtersChanged, filtersCleared } from './slices/filters';
import type { FilterValue, ScreenFilters } from './slices/filters';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

/** The persona the shell is showing. */
export function usePersona(): PersonaId {
  return useAppSelector((state) => state.session.persona);
}

/** The tenant of the selected data set. */
export function useTenant(): Tenant {
  const dataSet = useAppSelector((state) => state.dataContext.dataSet);
  return tenantOf(dataSet);
}

const NO_FILTERS: ScreenFilters = {};

/**
 * Filters of one screen, kept in the filters slice:
 * `const [filters, setFilters, clear] = useScreenFilters('CLM-02', { stage: null })`.
 */
export function useScreenFilters<T extends Record<string, FilterValue>>(
  screen: string,
  defaults: T,
): [T, (values: Partial<T>) => void, () => void] {
  const dispatch = useAppDispatch();
  const stored = useAppSelector((state) => state.filters.byScreen[screen] ?? NO_FILTERS);
  const merged = { ...defaults, ...stored } as T;
  const set = (values: Partial<T>): void => {
    dispatch(filtersChanged({ screen, values: values as ScreenFilters }));
  };
  const clear = (): void => {
    dispatch(filtersCleared({ screen }));
  };
  return [merged, set, clear];
}
