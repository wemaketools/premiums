/** The words of the invoice detail that depend on the record: imported codes, the default action, the aging state. */
import type { InvoiceFacts, RuleCode, TaskPriority, TaskReason } from '../../../../contracts/index';
import { hasTranslation, t } from '../../lib/i18n';

/** An imported code in words when the catalog knows it, else as imported (never guessed). */
export function codeLabel(kind: 'method' | 'outcome' | 'reason', code: string | null): string {
  if (code === null) return '';
  const key = `invoice-detail.attempts.${kind}.${code}`;
  return hasTranslation(key) ? t(key) : code;
}

/** The flags in the order that decides the reason of a new action: the most urgent first. */
const REASON_BY_RULE: ReadonlyArray<readonly [RuleCode, TaskReason]> = [
  ['LAPSE_REVIEW', 'LAPSE_REVIEW'],
  ['REPEAT_FAILURE', 'REPEAT_FAILURE'],
  ['OVERDUE_30', 'OVERDUE'],
  ['DATA_QUALITY', 'DATA_QUALITY'],
];

export function defaultReason(facts: InvoiceFacts): TaskReason {
  for (const [rule, reason] of REASON_BY_RULE) {
    if (facts.flags.some((flag) => flag.rule === rule)) return reason;
  }
  return facts.overdue ? 'OVERDUE' : 'OTHER';
}

export function defaultPriority(facts: InvoiceFacts): TaskPriority {
  switch (facts.priority) {
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

/** The aging of an invoice in words: its bucket, or why it has none. */
export function agingWords(facts: InvoiceFacts): string {
  if (facts.aging_state === 'paid') return t('invoice-detail.installments.paid');
  if (facts.aging_state === 'unknown' || facts.bucket === null)
    return t('invoice-detail.installments.unknown');
  return t(`collections-scope.bucket.${facts.bucket}`);
}
