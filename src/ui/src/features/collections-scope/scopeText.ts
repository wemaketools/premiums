/** The scope of a screen in words, for its CSV and printed sheet: the active filters by name, or "All invoices". */
import { SCOPE_KEYS } from '../../../../contracts/index';
import type { ScopeKey } from '../../../../contracts/index';
import { t } from '../../lib/i18n';
import type { Lookups } from './lookups';

export const FILTER_FIELD: Readonly<Record<ScopeKey, string>> = {
  product_id: 'product',
  broker_id: 'broker',
  channel: 'channel',
  owner_id: 'owner',
  client_id: 'client',
  policy_id: 'policy',
};

/** The label of a filter, for example "Broker". */
export const filterFieldLabel = (key: ScopeKey): string =>
  t(`collections-scope.filters.${FILTER_FIELD[key]}`);

/** "Broker: Kopano Brokers (fictional); Product: Comprehensive Motor", or "All invoices". */
export function scopeText(
  values: Readonly<Partial<Record<ScopeKey, string | null>>>,
  lookups: Lookups | undefined,
): string {
  const parts = SCOPE_KEYS.flatMap((key) => {
    const value = values[key];
    return value === undefined || value === null
      ? []
      : [
          t('collections-scope.filters.chip', {
            field: filterFieldLabel(key),
            value: lookups?.filterValue(key, value) ?? value,
          }),
        ];
  });
  return parts.length === 0 ? t('collections-scope.filters.allInvoices') : parts.join('; ');
}
