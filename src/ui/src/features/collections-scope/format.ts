/** Formatting the collections screens share: months, plotted money and the period window line. */
import { GABORONE_ZONE, formatMoney } from '../../../../contracts/index';
import type { PeriodWindow } from '../../../../contracts/index';
import { formatCalendarDate, formatDateTime } from '../../lib/format';
import { t } from '../../lib/i18n';

/** `2026-10` as `Oct 2026`. */
export const monthLabel = (month: string): string => {
  const [year = '', number = ''] = month.split('-');
  return `${t(`format.month.${Number(number)}`)} ${year}`;
};

/** Money for a plotted value: the label of an axis tick or tooltip, never a sum. */
export const plottedMoney = (value: number): string => formatMoney(value.toFixed(2));

/** "This month: 01 Oct 2026 – 21 Oct 2026". */
export const periodLine = (window: PeriodWindow): string =>
  t('collections-scope.period.window', {
    period: t(`collections-scope.period.${window.option}`),
    from: formatCalendarDate(window.from),
    to: formatCalendarDate(window.to),
  });

/** A date or a time in Africa/Gaborone as the screens show it; a missing one reads "Unknown", never an empty cell. */
export function formatMoment(moment: string | null): string {
  if (moment === null) return t('collections-scope.unknown');
  return moment.length === 10 ? formatCalendarDate(moment) : formatDateTime(moment, GABORONE_ZONE);
}
