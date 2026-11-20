/** The rows of the Recovery Action Queue: each action joined to its account, in queue order, filtered, and as CSV. */
import { TASK_PRIORITIES } from '../../../../contracts/index';
import type {
  InvoiceFacts,
  PersonaId,
  TaskListItem,
  TaskReason,
  TaskStatus,
} from '../../../../contracts/index';
import { t } from '../../lib/i18n';
import { formatMoment } from '../collections-scope';
import type { Lookups } from '../collections-scope';

export interface Account {
  readonly client: string;
  readonly policy: string;
  readonly broker: string;
}

export interface QueueRow {
  readonly id: string;
  readonly task: TaskListItem;
  /** The invoice's client, policy and broker; `null` for a receipt, or while the invoices are not known. */
  readonly account: Account | null;
  /** The owner's name, or `null` when nobody owns the action. */
  readonly owner: string | null;
  /** The persona of the latest change. */
  readonly lastActor: PersonaId | null;
  /** The newest note of the trail (made with the action, a status change or on its own), or `null` when none. */
  readonly note: string | null;
}

export function queueRows(
  tasks: readonly TaskListItem[],
  invoices: ReadonlyMap<string, InvoiceFacts> | undefined,
  lookups: Lookups | undefined,
  userName: (userId: string) => string,
): QueueRow[] {
  return tasks.map((task) => {
    const facts = task.subject_type === 'INVOICE' ? invoices?.get(task.subject_id) : undefined;
    return {
      id: task.task_id,
      task,
      account:
        facts === undefined || lookups === undefined
          ? null
          : {
              client: lookups.nameOf.client(facts.client_id),
              policy: lookups.nameOf.policy(facts.policy_id),
              broker: lookups.nameOf.broker(facts.broker_id),
            },
      owner: task.assigned_to === null ? null : userName(task.assigned_to),
      lastActor: task.audit.at(-1)?.actor ?? null,
      note: task.audit.findLast((entry) => entry.note !== null)?.note ?? task.note,
    };
  });
}

/** `ACTIVE` is every action not resolved yet (the default), `ALL` every action. */
export const STATUS_CHOICES = ['ACTIVE', 'ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export type StatusChoice = (typeof STATUS_CHOICES)[number];
export const NO_OWNER = '__none';

export interface QueueFilter {
  readonly status: StatusChoice;
  /** The active persona's user when "Assigned to me" is on. */
  readonly me: string | null;
  readonly owner: string;
  readonly reason: TaskReason | '';
}

export const filterActive = (filter: QueueFilter): boolean =>
  filter.status !== 'ACTIVE' || filter.me !== null || filter.owner !== '' || filter.reason !== '';

function statusMatches(status: TaskStatus, choice: StatusChoice): boolean {
  if (choice === 'ALL') return true;
  if (choice === 'ACTIVE') return status !== 'RESOLVED';
  return status === choice;
}

export function filterRows(rows: readonly QueueRow[], filter: QueueFilter): QueueRow[] {
  return rows.filter(
    ({ task }) =>
      statusMatches(task.status, filter.status) &&
      (filter.me === null || task.assigned_to === filter.me) &&
      (filter.owner === '' ||
        (filter.owner === NO_OWNER
          ? task.assigned_to === null
          : task.assigned_to === filter.owner)) &&
      (filter.reason === '' || task.reason === filter.reason),
  );
}

const urgencyRank = (row: QueueRow): number => TASK_PRIORITIES.indexOf(row.task.priority);
const dueKey = (row: QueueRow): string => row.task.due_at?.slice(0, 10) ?? '9999-12-31';

/** Overdue first, then the higher urgency, then the earlier due date (none last), then the action number. */
export function queueOrder(rows: readonly QueueRow[]): QueueRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.task.overdue) - Number(a.task.overdue) ||
      urgencyRank(b) - urgencyRank(a) ||
      dueKey(a).localeCompare(dueKey(b)) ||
      a.id.localeCompare(b.id, 'en', { numeric: true }),
  );
}

export const statusLabel = (status: TaskStatus): string =>
  t(`collections-scope.taskStatus.${status}`);
export const statusChoiceLabel = (choice: StatusChoice): string =>
  choice === 'ACTIVE' || choice === 'ALL' ? t(`actions.filter.${choice}`) : statusLabel(choice);
export const actorLabel = (actor: PersonaId | null): string =>
  actor === null ? '' : t(`shell.persona.${actor}`);

/** The as-of line, the filter line, the header row and one row per action shown. An empty cell is a value the action does not have. */
export function queueTable(rows: readonly QueueRow[], asOf: string, filters: string): string[][] {
  return [
    [t('actions.csv.asOf'), asOf],
    [t('actions.csv.filters'), filters],
    [
      t('actions.csv.action'),
      t('actions.csv.subjectType'),
      t('actions.csv.subject'),
      t('actions.csv.client'),
      t('actions.csv.policy'),
      t('actions.csv.broker'),
      t('actions.column.reason'),
      t('actions.column.urgency'),
      t('actions.column.owner'),
      t('actions.column.due'),
      t('actions.csv.overdue'),
      t('actions.column.status'),
      t('actions.column.note'),
      t('actions.column.changed'),
      t('actions.csv.changedBy'),
    ],
    ...rows.map(({ task, account, owner, lastActor, note }) => [
      task.task_id,
      t(`actions.subjectType.${task.subject_type}`),
      task.subject_id,
      account?.client ?? '',
      account?.policy ?? '',
      account?.broker ?? '',
      t(`collections-scope.reason.${task.reason}`),
      t(`collections-scope.taskPriority.${task.priority}`),
      owner ?? '',
      task.due_at === null ? '' : formatMoment(task.due_at),
      task.overdue ? t('actions.csv.yes') : t('actions.csv.no'),
      statusLabel(task.status),
      note ?? '',
      formatMoment(task.updated_at),
      actorLabel(lastActor),
    ]),
  ];
}
