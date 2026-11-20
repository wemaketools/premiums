/** How an action reads wherever it shows: its due date with the overdue flag, and its audit trail. */
import type { TaskListItem, TaskRecord, TaskStatus } from '../../../../contracts/index';
import { TASK_STATUSES } from '../../../../contracts/index';
import { Chip, Timeline } from '../../components/ui';
import type { TimelineItem } from '../../components/ui';
import { t } from '../../lib/i18n';
import { formatMoment } from '../collections-scope';

/** The due date, with the overdue flag as a chip; `overdue` is required so no surface can show a due date without it. */
export function TaskDue({ task }: { readonly task: Pick<TaskListItem, 'due_at' | 'overdue'> }) {
  if (task.due_at === null) {
    return <span className="prm-text-muted">{t('collections-tasks.noDue')}</span>;
  }
  return (
    <span className="prm-inline">
      <span className={task.overdue ? 'prm-text-danger' : undefined}>
        {formatMoment(task.due_at)}
      </span>
      {task.overdue && (
        <Chip tone="danger" size="sm">
          {t('collections-tasks.overdue')}
        </Chip>
      )}
    </span>
  );
}

const statusOf = (value: string | null): TaskStatus =>
  TASK_STATUSES.find((status) => status === value) ?? 'OPEN';
const statusLabel = (status: TaskStatus): string => t(`collections-scope.taskStatus.${status}`);

/** Who did what and when, oldest first; the actor is the persona that made the change. */
export function TaskAuditTimeline({
  task,
  userName,
}: {
  readonly task: TaskRecord;
  readonly userName: (userId: string) => string;
}) {
  const person = (id: string | null): string =>
    id === null ? t('collections-tasks.audit.unassignedFrom') : userName(id);
  const items: TimelineItem[] = task.audit.map((entry, index) => ({
    id: `${task.task_id}-${index}`,
    title:
      entry.action === 'ASSIGNED'
        ? t('collections-tasks.audit.ASSIGNED', { to: person(entry.to) })
        : entry.action === 'STATUS_CHANGED'
          ? t('collections-tasks.audit.STATUS_CHANGED', {
              from: statusLabel(statusOf(entry.from)),
              to: statusLabel(statusOf(entry.to)),
            })
          : t(`collections-tasks.audit.${entry.action}`),
    meta: t('collections-tasks.audit.by', {
      actor: t(`shell.persona.${entry.actor}`),
      time: formatMoment(entry.at),
    }),
    detail:
      entry.note === null ? undefined : t('collections-tasks.audit.note', { note: entry.note }),
  }));
  return (
    <Timeline items={items} label={t('collections-tasks.audit.title', { task: task.task_id })} />
  );
}
