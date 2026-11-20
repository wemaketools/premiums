/** The lines at the top of a collections CSV: the as-of date, the cash period and the scope, as the screen shows them. */
import type { PeriodWindow } from '../../../../contracts/index';
import { t } from '../../lib/i18n';
import { periodLine, scopeText } from '../collections-scope';
import type { Lookups, Scope } from '../collections-scope';

/** As of, period and scope, each a two-cell row, padded to the width of the table below them. */
export function contextRows(
  asOf: string,
  period: PeriodWindow,
  scope: Scope,
  lookups: Lookups | undefined,
  width: number,
): string[][] {
  const pad = (row: string[]): string[] => [
    ...row,
    ...Array<string>(Math.max(0, width - row.length)).fill(''),
  ];
  return [
    pad([t('exceptions.csv.asOf'), asOf]),
    pad([t('exceptions.csv.period'), periodLine(period)]),
    pad([t('exceptions.csv.scope'), scopeText(scope.query, lookups)]),
  ];
}
