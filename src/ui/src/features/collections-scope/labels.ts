/** The words for the engine's codes, and the evidence sentence of a flag or exception, so every screen says them alike. */
import { formatMoney } from '../../../../contracts/index';
import type { FlagMeasure, RuleCode } from '../../../../contracts/index';
import { t } from '../../lib/i18n';

export function ruleLabel(rule: RuleCode): string {
  return t(`collections-scope.rule.${rule}`);
}

/** The plain-language evidence of a flag, from the numbers it rests on. */
export function evidenceText(
  rule: RuleCode,
  measure: FlagMeasure,
  reasonCode: string | null = null,
): string {
  const amount = measure.amount === null ? '' : formatMoney(measure.amount);
  const days = measure.days_overdue ?? 0;
  switch (rule) {
    case 'REPEAT_FAILURE':
      return t('collections-scope.evidence.REPEAT_FAILURE', { count: measure.count ?? 0, amount });
    case 'FAILED_ATTEMPT':
      return t('collections-scope.evidence.FAILED_ATTEMPT', { reason: reasonCode ?? '—' });
    default:
      return t(`collections-scope.evidence.${rule}`, { days, amount });
  }
}
