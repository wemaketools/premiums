/**
 * The invoices in view: the shared filters (product, broker, channel, account owner, client, policy) and the cash
 * period, remembered in the shell like the as-of date, so every collections screen shows the same scope.
 */
import { DEFAULT_PERIOD, PERIOD_OPTIONS, SCOPE_KEYS } from '../../../../contracts/index';
import type { PeriodOption, ScopeKey } from '../../../../contracts/index';
import { useScreenFilters } from '../../app/hooks';

export const SCOPE_SCREEN = 'collections-scope';

export type ScopeFilters = Record<ScopeKey, string | null>;

type StoredScope = ScopeFilters & { period: string | null };

const NO_FILTERS: StoredScope = {
  period: null,
  product_id: null,
  broker_id: null,
  channel: null,
  owner_id: null,
  client_id: null,
  policy_id: null,
};

export interface Scope {
  readonly filters: ScopeFilters;
  readonly setFilter: (key: ScopeKey, value: string | null) => void;
  readonly clearFilters: () => void;
  /** Whether a filter narrows the invoices (the period does not). */
  readonly filtered: boolean;
  readonly period: PeriodOption;
  readonly setPeriod: (period: PeriodOption) => void;
  /** The filters as query values (unset ones left out), for the collections endpoints. */
  readonly query: Readonly<Record<string, string>>;
}

export function useScope(): Scope {
  const [stored, setStored] = useScreenFilters<StoredScope>(SCOPE_SCREEN, NO_FILTERS);
  // A stored value that is not text (the store is browser data) counts as no filter.
  const filters = Object.fromEntries(
    SCOPE_KEYS.map((key) => [key, typeof stored[key] === 'string' ? stored[key] : null]),
  ) as ScopeFilters;
  const period = PERIOD_OPTIONS.find((option) => option === stored.period) ?? DEFAULT_PERIOD;
  const query = Object.fromEntries(
    SCOPE_KEYS.flatMap((key) => {
      const value = filters[key];
      return value === null ? [] : [[key, value]];
    }),
  );
  return {
    filters,
    setFilter: (key, value) => setStored({ [key]: value }),
    clearFilters: () =>
      setStored({
        product_id: null,
        broker_id: null,
        channel: null,
        owner_id: null,
        client_id: null,
        policy_id: null,
      }),
    filtered: Object.keys(query).length > 0,
    period,
    setPeriod: (next) => setStored({ period: next }),
    query,
  };
}
