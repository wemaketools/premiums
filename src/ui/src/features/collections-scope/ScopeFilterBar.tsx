/**
 * The filter bar every collections screen shares: the cash period (on screens with period figures), product, broker,
 * channel, account owner and client, with Clear filters, and a row of chips naming each active filter (each chip
 * removes its filter), so the scope of every figure on the page is visible.
 */
import type { ReactNode } from 'react';

import { PERIOD_OPTIONS, SCOPE_KEYS } from '../../../../contracts/index';
import type { ScopeKey } from '../../../../contracts/index';
import { Chip, ErrorState, FilterBar, IconButton, Select } from '../../components/ui';
import type { SelectOption } from '../../components/ui';
import { t } from '../../lib/i18n';
import type { LookupsResult } from './lookups';
import { filterFieldLabel } from './scopeText';
import type { Scope } from './useScope';

const NONE: readonly SelectOption[] = [];

/** The filters shown as selects; the policy filter arrives only from a link and shows as a chip. */
const FIELDS: ReadonlyArray<readonly [ScopeKey, string, string]> = [
  ['product_id', 'product', 'allProducts'],
  ['broker_id', 'broker', 'allBrokers'],
  ['channel', 'channel', 'allChannels'],
  ['owner_id', 'owner', 'allOwners'],
  ['client_id', 'client', 'allClients'],
];

export interface ScopeFilterBarProps {
  readonly scope: Scope;
  readonly lookups: LookupsResult;
  /** Adds the cash-period choice, for the screens that show period figures. */
  readonly withPeriod?: boolean;
  /** Filters of the screen itself, shown after the shared ones; Clear filters clears them too. */
  readonly extra?: {
    readonly fields: ReactNode;
    readonly active: boolean;
    readonly clear: () => void;
  };
}

export function ScopeFilterBar({ scope, lookups, withPeriod = false, extra }: ScopeFilterBarProps) {
  const { filters, setFilter } = scope;
  const ready = lookups.lookups;
  const active = SCOPE_KEYS.flatMap((key) => {
    const value = filters[key];
    return value === null ? [] : [{ key, value }];
  });
  return (
    <>
      <FilterBar
        label={t('collections-scope.filters.label')}
        onClear={() => {
          scope.clearFilters();
          extra?.clear();
        }}
        canClear={scope.filtered || extra?.active === true}
      >
        {withPeriod && (
          <Select
            label={t('collections-scope.filters.period')}
            value={scope.period}
            options={PERIOD_OPTIONS.map((option) => ({
              value: option,
              label: t(`collections-scope.period.${option}`),
            }))}
            onChange={(value) => {
              const chosen = PERIOD_OPTIONS.find((option) => option === value);
              if (chosen !== undefined) scope.setPeriod(chosen);
            }}
          />
        )}
        {FIELDS.map(([key, label, all]) => (
          <Select
            key={key}
            label={t(`collections-scope.filters.${label}`)}
            placeholder={t(`collections-scope.filters.${all}`)}
            value={filters[key] ?? ''}
            options={ready?.options[key] ?? NONE}
            disabled={ready === undefined}
            onChange={(value) => setFilter(key, value === '' ? null : value)}
          />
        ))}
        {extra?.fields}
      </FilterBar>
      {active.length > 0 && (
        <ul className="prm-chip-row" aria-label={t('collections-scope.filters.active')}>
          {active.map(({ key, value }) => {
            const field = filterFieldLabel(key);
            const shown = ready?.filterValue(key, value) ?? value;
            return (
              <li key={key}>
                <Chip tone="accent" size="sm">
                  {t('collections-scope.filters.chip', { field, value: shown })}
                  <IconButton
                    icon="x"
                    size="sm"
                    variant="ghost"
                    label={t('collections-scope.filters.remove', { name: field })}
                    onClick={() => setFilter(key, null)}
                  />
                </Chip>
              </li>
            );
          })}
        </ul>
      )}
      {lookups.error !== null && (
        <ErrorState
          error={lookups.error}
          onRetry={lookups.reload}
          title={t('collections-scope.filters.loadFailed')}
        />
      )}
    </>
  );
}
