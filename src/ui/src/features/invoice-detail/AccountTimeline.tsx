/**
 * COL-FR-10: everything recorded on the invoice in one chronological line: issued, due, each allocation posted, each
 * payment attempt, each flag triggered or acknowledged, and each change to a recovery action with its actor and time.
 */
import { RULE_IDS, TASK_STATUSES, chronological, formatMoney } from '../../../../contracts/index';
import type {
  InvoiceDetail,
  TaskAuditEntry,
  TaskListItem,
  TaskStatus,
} from '../../../../contracts/index';
import { Card, Timeline } from '../../components/ui';
import type { TimelineItem } from '../../components/ui';
import { t } from '../../lib/i18n';
import { formatMoment, ruleLabel } from '../collections-scope';
import type { Lookups } from '../collections-scope';
import { codeLabel } from './labels';

interface Event extends TimelineItem {
  readonly id: string;
  readonly at: string;
}

const persona = (actor: string): string => t(`shell.persona.${actor}`);
const statusOf = (value: string | null): TaskStatus =>
  TASK_STATUSES.find((status) => status === value) ?? 'OPEN';
const statusLabel = (value: string | null): string =>
  t(`collections-scope.taskStatus.${statusOf(value)}`);

function auditText(entry: TaskAuditEntry, userName: (id: string) => string): string {
  switch (entry.action) {
    case 'ASSIGNED':
      return t('collections-tasks.audit.ASSIGNED', {
        to: entry.to === null ? t('collections-tasks.audit.unassignedFrom') : userName(entry.to),
      });
    case 'STATUS_CHANGED':
      return t('collections-tasks.audit.STATUS_CHANGED', {
        from: statusLabel(entry.from),
        to: statusLabel(entry.to),
      });
    default:
      return t(`collections-tasks.audit.${entry.action}`);
  }
}

function events(
  detail: InvoiceDetail,
  tasks: readonly TaskListItem[],
  userName: (id: string) => string,
): Event[] {
  const { facts } = detail;
  const list: Event[] = [
    {
      id: `1-issued`,
      at: facts.issue_date,
      icon: 'fileText',
      title: t('invoice-detail.timeline.issued', { amount: formatMoney(facts.issued) }),
      meta: formatMoment(facts.issue_date),
    },
  ];
  if (facts.due_date !== null) {
    list.push({
      id: `2-due`,
      at: facts.due_date,
      icon: 'calendar',
      tone: facts.overdue ? 'warning' : 'neutral',
      title:
        facts.due_date > detail.as_of
          ? t('invoice-detail.timeline.dueFuture')
          : t('invoice-detail.timeline.due'),
      meta: formatMoment(facts.due_date),
    });
  }
  for (const allocation of detail.allocations) {
    list.push({
      id: `3-${allocation.allocation_id}`,
      at: allocation.posted_at,
      icon: 'coins',
      tone: 'success',
      title: t('invoice-detail.timeline.allocation', {
        allocation: allocation.allocation_id,
        receipt: allocation.receipt_id,
        amount: formatMoney(allocation.allocated_amount),
      }),
      meta: formatMoment(allocation.posted_at),
    });
  }
  for (const attempt of detail.attempts) {
    const failed = attempt.outcome === 'FAILED';
    list.push({
      id: `4-${attempt.attempt_id}`,
      at: attempt.attempt_at,
      icon: failed ? 'xCircle' : 'activity',
      tone: failed ? 'danger' : 'neutral',
      title: t('invoice-detail.timeline.attempt', {
        attempt: attempt.attempt_id,
        method: codeLabel('method', attempt.method),
        outcome: codeLabel('outcome', attempt.outcome).toLowerCase(),
      }),
      meta: formatMoment(attempt.attempt_at),
      detail: failed
        ? t('invoice-detail.timeline.attemptFailed', {
            reason: attempt.reason_code === null ? '—' : codeLabel('reason', attempt.reason_code),
          })
        : undefined,
    });
  }
  for (const flag of facts.flags) {
    const rule = `${RULE_IDS[flag.rule]} ${ruleLabel(flag.rule)}`;
    list.push({
      id: `5-${flag.rule}`,
      at: flag.triggered_at,
      icon: 'flag',
      tone: flag.severity === 'HIGH' ? 'danger' : 'warning',
      title: t('invoice-detail.timeline.flag', { rule }),
      meta: formatMoment(flag.triggered_at),
    });
    const acknowledged =
      detail.exceptions.find((item) => item.rule === flag.rule)?.acknowledged ?? null;
    if (acknowledged !== null) {
      list.push({
        id: `6-${flag.rule}`,
        at: acknowledged.at,
        icon: 'checkCircle',
        tone: 'info',
        title: t('invoice-detail.timeline.acknowledged', { rule }),
        meta: t('invoice-detail.timeline.by', {
          actor: persona(acknowledged.actor),
          time: formatMoment(acknowledged.at),
        }),
        detail: acknowledged.note ?? undefined,
      });
    }
  }
  for (const task of tasks) {
    task.audit.forEach((entry, index) => {
      list.push({
        id: `7-${task.task_id}-${String(index).padStart(4, '0')}`,
        at: entry.at,
        icon: 'listChecks',
        tone: 'accent',
        title: t('invoice-detail.timeline.task', {
          task: task.task_id,
          action: auditText(entry, userName),
        }),
        meta: t('invoice-detail.timeline.by', {
          actor: persona(entry.actor),
          time: formatMoment(entry.at),
        }),
        detail:
          entry.note === null ? undefined : t('collections-tasks.audit.note', { note: entry.note }),
      });
    });
  }
  return chronological(
    list,
    (event) => event.at,
    (event) => event.id,
  );
}

export function AccountTimelineCard({
  detail,
  tasks,
  lookups,
}: {
  readonly detail: InvoiceDetail;
  readonly tasks: readonly TaskListItem[];
  readonly lookups: Lookups | undefined;
}) {
  const userName = (id: string): string => lookups?.user(id)?.display_name ?? id;
  return (
    <Card
      title={t('invoice-detail.timeline.title')}
      subtitle={t('invoice-detail.timeline.subtitle')}
    >
      <Timeline
        label={t('invoice-detail.timeline.label', { invoice: detail.invoice.invoice_id })}
        items={events(detail, tasks, userName).map(({ at: _at, ...item }) => item)}
      />
    </Card>
  );
}
