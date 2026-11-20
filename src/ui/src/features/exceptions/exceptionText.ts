/** How an exception reads in a table cell, a CSV row and a dialog: its rule, subject, owner and state, in words. */
import { PERSONA_IDS, RULE_IDS } from '../../../../contracts/index';
import type { CollectionException, RuleCode, TaskReason } from '../../../../contracts/index';
import { t } from '../../lib/i18n';
import { formatMoment, ruleLabel } from '../collections-scope';
import type { Lookups } from '../collections-scope';

/** The reason a recovery action opened from an exception starts with. */
export const REASON_OF_RULE: Readonly<Record<RuleCode, TaskReason>> = {
  OVERDUE_30: 'OVERDUE',
  REPEAT_FAILURE: 'REPEAT_FAILURE',
  LAPSE_REVIEW: 'LAPSE_REVIEW',
  UNAPPLIED_CASH: 'UNAPPLIED_CASH',
  FAILED_ATTEMPT: 'FAILED_ATTEMPT',
  DATA_QUALITY: 'DATA_QUALITY',
};

/** "COL-R04 Unapplied cash on RCP-UNAPP", naming a failed attempt by its own id. */
export function exceptionName(item: CollectionException): string {
  return t('exceptions.name', {
    rule: `${RULE_IDS[item.rule]} ${ruleLabel(item.rule)}`,
    subject: item.attempt_id ?? item.subject_id,
  });
}

/** The persona that acted, by its shell label. */
export function actorName(actor: string): string {
  return PERSONA_IDS.some((id) => id === actor) ? t(`shell.persona.${actor}`) : actor;
}

export function ownerName(ownerId: string | null, lookups: Lookups | undefined): string {
  if (ownerId === null) return t('collections-scope.unassigned');
  return lookups?.user(ownerId)?.display_name ?? ownerId;
}

/** The state in one line: acknowledged (by whom, when), an open recovery action, or open. */
export function stateText(item: CollectionException): string {
  if (item.acknowledged !== null) {
    return t('exceptions.state.acknowledged', {
      actor: actorName(item.acknowledged.actor),
      time: formatMoment(item.acknowledged.at),
    });
  }
  if (item.open_task_id !== null) return t('exceptions.state.action', { task: item.open_task_id });
  return t('exceptions.state.open');
}
