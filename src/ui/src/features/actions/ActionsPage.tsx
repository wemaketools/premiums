/**
 * COL-05 Recovery Action Queue: every recovery action of the data set with its account, reason, urgency, owner, due
 * date, status, latest note and last change, filtered by status, "Assigned to me", owner and reason. Each action
 * opens its history (who did what and when); those who may act create, assign, move and annotate actions, and every
 * change is logged by the API with the persona and the time. The changes stay after a refresh until Reset.
 */
import { useMemo, useState } from 'react';

import { PERSONA_USERS, TASK_REASONS, endpoints } from '../../../../contracts/index';
import type { InvoiceFacts, TaskListItem, TaskPriority } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector, usePersona, useScreenFilters } from '../../app/hooks';
import {
  Button,
  Checkbox,
  Chip,
  DataTable,
  DetailList,
  Dialog,
  EmptyState,
  ErrorState,
  FilterBar,
  IconButton,
  Menu,
  PageHeader,
  Reference,
  Select,
} from '../../components/ui';
import type { ChipTone, DataTableColumn, MenuEntry } from '../../components/ui';
import { EMPTY_VALUE } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  ExportCsvButton,
  TaskStatusChip,
  formatMoment,
  invoicePath,
  receiptPath,
  useLookups,
} from '../collections-scope';
import {
  AddNoteDialog,
  AssignTaskDialog,
  CreateTaskDialog,
  SetTaskStatusDialog,
  TaskAuditTimeline,
  TaskDue,
  useCanAct,
} from '../collections-tasks';
import {
  NO_OWNER,
  STATUS_CHOICES,
  actorLabel,
  filterActive,
  filterRows,
  queueOrder,
  queueRows,
  queueTable,
  statusChoiceLabel,
  statusLabel,
} from './rows';
import type { QueueFilter, QueueRow } from './rows';

const SCREEN = 'COL-05';
const DEFAULTS = { status: 'ACTIVE', mine: false, owner: '', reason: '' };

const URGENCY_TONE = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'info',
} as const satisfies Record<TaskPriority, ChipTone>;

type OpenDialog =
  | { readonly kind: 'create' }
  | { readonly kind: 'assign' | 'status' | 'note' | 'history'; readonly taskId: string };

const subjectPath = (task: TaskListItem): string =>
  task.subject_type === 'INVOICE' ? invoicePath(task.subject_id) : receiptPath(task.subject_id);

function AccountCell({ row }: { readonly row: QueueRow }) {
  const { task, account } = row;
  return (
    <>
      <Reference value={task.subject_id} to={subjectPath(task)} />
      {task.subject_type === 'RECEIPT' ? (
        <span className="prm-cell-sub">{t('actions.subjectType.RECEIPT')}</span>
      ) : account === null ? (
        <span className="prm-cell-sub">{EMPTY_VALUE}</span>
      ) : (
        <>
          <span className="prm-cell-sub">{account.client}</span>
          <span className="prm-cell-sub">
            {t('actions.policyBroker', { policy: account.policy, broker: account.broker })}
          </span>
        </>
      )}
    </>
  );
}

export default function ActionsPage() {
  const persona = usePersona();
  const canAct = useCanAct();
  const asOf = useAppSelector((state) => state.dataContext.asOf);
  const tasks = useApiQuery(endpoints.tasksList, {});
  const users = useApiQuery(endpoints.usersList, {});
  const invoices = useApiQuery(endpoints.invoicesList, { query: {} });
  const lookups = useLookups();
  const [stored, setStored, clearStored] = useScreenFilters(SCREEN, DEFAULTS);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);

  const me = PERSONA_USERS[persona];
  const filter: QueueFilter = {
    status: STATUS_CHOICES.find((value) => value === stored.status) ?? 'ACTIVE',
    me: stored.mine === true ? me : null,
    owner: typeof stored.owner === 'string' ? stored.owner : '',
    reason: TASK_REASONS.find((value) => value === stored.reason) ?? '',
  };
  const narrowed = filterActive(filter);

  const taskItems = tasks.data?.items;
  const userItems = users.data?.items;
  const invoiceItems = invoices.data?.items;
  const ready = lookups.lookups;
  const userName = (id: string): string =>
    userItems?.find((user) => user.user_id === id)?.display_name ?? id;

  const all = useMemo(() => {
    if (taskItems === undefined || userItems === undefined) return undefined;
    const names = new Map(userItems.map((user) => [user.user_id, user.display_name]));
    const facts =
      invoiceItems === undefined
        ? undefined
        : new Map<string, InvoiceFacts>(invoiceItems.map((item) => [item.invoice_id, item.facts]));
    return queueOrder(queueRows(taskItems, facts, ready, (id) => names.get(id) ?? id));
  }, [taskItems, userItems, invoiceItems, ready]);
  const rows = useMemo(
    () => (all === undefined ? undefined : filterRows(all, filter)),
    // The filter is rebuilt from the stored values on every render; they are what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, filter.status, filter.me, filter.owner, filter.reason],
  );

  const filterLine = (): string => {
    const parts = [t('actions.csv.status', { status: statusChoiceLabel(filter.status) })];
    if (filter.me !== null) parts.push(t('actions.csv.mine', { name: userName(filter.me) }));
    if (filter.owner !== '') {
      parts.push(
        t('actions.csv.owner', {
          name:
            filter.owner === NO_OWNER ? t('collections-scope.unassigned') : userName(filter.owner),
        }),
      );
    }
    if (filter.reason !== '') {
      parts.push(
        t('actions.csv.reason', { reason: t(`collections-scope.reason.${filter.reason}`) }),
      );
    }
    return parts.join('; ');
  };
  const table = rows === undefined ? undefined : queueTable(rows, asOf, filterLine());

  const queryError = tasks.error ?? users.error;
  const taskOf = (id: string): TaskListItem | undefined =>
    taskItems?.find((task) => task.task_id === id);
  const countOf = (status: TaskListItem['status']): number =>
    rows?.filter((row) => row.task.status === status).length ?? 0;

  const rowMenu = (row: QueueRow): MenuEntry[] => [
    {
      id: 'assign',
      label: t('collections-tasks.assign.button'),
      icon: 'userCheck',
      onSelect: () => setDialog({ kind: 'assign', taskId: row.id }),
    },
    {
      id: 'status',
      label: t('collections-tasks.status.button'),
      icon: 'check',
      onSelect: () => setDialog({ kind: 'status', taskId: row.id }),
    },
    {
      id: 'note',
      label: t('collections-tasks.note.button'),
      icon: 'messageSquare',
      onSelect: () => setDialog({ kind: 'note', taskId: row.id }),
    },
  ];

  const columns: DataTableColumn<QueueRow>[] = [
    {
      id: 'action',
      header: t('actions.column.action'),
      cell: (row) => <Reference value={row.id} />,
    },
    {
      id: 'account',
      header: t('actions.column.account'),
      cell: (row) => <AccountCell row={row} />,
    },
    {
      id: 'reason',
      header: t('actions.column.reason'),
      cell: (row) => t(`collections-scope.reason.${row.task.reason}`),
    },
    {
      id: 'urgency',
      header: t('actions.column.urgency'),
      cell: (row) => (
        <Chip tone={URGENCY_TONE[row.task.priority]} size="sm">
          {t(`collections-scope.taskPriority.${row.task.priority}`)}
        </Chip>
      ),
    },
    {
      id: 'owner',
      header: t('actions.column.owner'),
      cell: (row) =>
        row.owner ?? <span className="prm-text-muted">{t('collections-scope.unassigned')}</span>,
    },
    { id: 'due', header: t('actions.column.due'), cell: (row) => <TaskDue task={row.task} /> },
    {
      id: 'status',
      header: t('actions.column.status'),
      cell: (row) => <TaskStatusChip status={row.task.status} />,
    },
    {
      id: 'note',
      header: t('actions.column.note'),
      width: '14rem',
      cell: (row) => row.note ?? <span className="prm-text-muted">{t('actions.noNote')}</span>,
    },
    {
      id: 'changed',
      header: t('actions.column.changed'),
      cell: (row) => (
        <>
          <span>{formatMoment(row.task.updated_at)}</span>
          {row.lastActor !== null && (
            <span className="prm-cell-sub">
              {t('actions.by', { actor: actorLabel(row.lastActor) })}
            </span>
          )}
        </>
      ),
    },
    ...(canAct
      ? [
          {
            id: 'menu',
            header: t('actions.column.menu'),
            accessibleHeader: t('actions.column.menu'),
            cell: (row: QueueRow) => (
              <Menu
                label={t('actions.rowActions', { task: row.id })}
                entries={rowMenu(row)}
                trigger={(props) => (
                  <IconButton
                    icon="moreHorizontal"
                    variant="ghost"
                    size="sm"
                    label={t('actions.rowActions', { task: row.id })}
                    {...props}
                  />
                )}
              />
            ),
          },
        ]
      : []),
  ];

  const createButton = (
    <Button variant="primary" icon="plus" onClick={() => setDialog({ kind: 'create' })}>
      {t('collections-tasks.create.button')}
    </Button>
  );
  const open = dialog !== null && dialog.kind !== 'create' ? taskOf(dialog.taskId) : undefined;
  const noActions = taskItems !== undefined && taskItems.length === 0;

  return (
    <div className="prm-page">
      <PageHeader
        title={t('actions.title')}
        subtitle={t('actions.subtitle')}
        actions={
          <ExportCsvButton
            screen="actions"
            queries={[tasks, users]}
            optionalQueries={[invoices]}
            table={table}
          />
        }
        primaryAction={
          canAct ? (
            createButton
          ) : (
            <p className="prm-text-muted">{t('collections-scope.readOnly')}</p>
          )
        }
      />
      <FilterBar label={t('actions.filter.label')} onClear={clearStored} canClear={narrowed}>
        <Select
          label={t('actions.filter.status')}
          value={filter.status}
          options={STATUS_CHOICES.map((value) => ({ value, label: statusChoiceLabel(value) }))}
          onChange={(value) => setStored({ status: value })}
        />
        <Select
          label={t('actions.filter.owner')}
          placeholder={t('actions.filter.allOwners')}
          value={filter.owner}
          loading={users.status === 'loading'}
          options={[
            { value: NO_OWNER, label: t('collections-scope.unassigned') },
            ...(userItems ?? []).map((user) => ({ value: user.user_id, label: user.display_name })),
          ]}
          onChange={(value) => setStored({ owner: value })}
        />
        <Select
          label={t('actions.filter.reason')}
          placeholder={t('actions.filter.allReasons')}
          value={filter.reason}
          options={TASK_REASONS.map((value) => ({
            value,
            label: t(`collections-scope.reason.${value}`),
          }))}
          onChange={(value) => setStored({ reason: value })}
        />
        <Checkbox
          label={t('actions.filter.mine', { name: userName(me) })}
          checked={filter.me !== null}
          onChange={(checked) => setStored({ mine: checked })}
        />
      </FilterBar>
      {rows !== undefined && rows.length > 0 && (
        <p className="prm-text-muted" role="status">
          {t('actions.summary', {
            count: rows.length,
            overdue: rows.filter((row) => row.task.overdue).length,
            open: countOf('OPEN'),
            inProgress: countOf('IN_PROGRESS'),
            resolved: countOf('RESOLVED'),
          })}
        </p>
      )}
      {invoices.error !== null && invoices.data === undefined && (
        <ErrorState
          error={invoices.error}
          onRetry={invoices.reload}
          title={t('actions.accountsFailed')}
        />
      )}
      <DataTable
        caption={t('actions.caption')}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        rowLabel={(row) => t('actions.history.open', { task: row.id })}
        onRowClick={(row) => setDialog({ kind: 'history', taskId: row.id })}
        loading={queryError === null && rows === undefined}
        error={queryError}
        onRetry={() => {
          tasks.reload();
          users.reload();
        }}
        empty={
          noActions ? (
            <EmptyState
              compact
              icon="listChecks"
              title={t('actions.empty.title')}
              description={canAct ? t('actions.empty.description') : t('actions.empty.readOnly')}
              action={canAct ? createButton : undefined}
            />
          ) : (
            <EmptyState
              compact
              icon="filter"
              title={t('actions.empty.noMatchTitle')}
              description={t('actions.empty.noMatchDescription')}
            />
          )
        }
      />
      {dialog?.kind === 'create' && (
        <CreateTaskDialog
          subject={null}
          defaultReason="OVERDUE"
          defaultPriority="MEDIUM"
          defaultOwner={me}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'assign' && open !== undefined && (
        <AssignTaskDialog task={open} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'status' && open !== undefined && (
        <SetTaskStatusDialog task={open} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'note' && open !== undefined && (
        <AddNoteDialog task={open} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'history' && open !== undefined && (
        <Dialog
          open
          size="lg"
          title={t('actions.history.title', { task: open.task_id })}
          description={t('actions.history.subtitle')}
          onClose={() => setDialog(null)}
          footer={
            canAct ? (
              <>
                <Button onClick={() => setDialog({ kind: 'note', taskId: open.task_id })}>
                  {t('collections-tasks.note.button')}
                </Button>
                <Button onClick={() => setDialog({ kind: 'assign', taskId: open.task_id })}>
                  {t('collections-tasks.assign.button')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setDialog({ kind: 'status', taskId: open.task_id })}
                >
                  {t('collections-tasks.status.button')}
                </Button>
              </>
            ) : undefined
          }
        >
          <DetailList
            items={[
              {
                key: 'account',
                label: t('actions.column.account'),
                value: <Reference value={open.subject_id} to={subjectPath(open)} />,
              },
              {
                key: 'reason',
                label: t('actions.column.reason'),
                value: t(`collections-scope.reason.${open.reason}`),
              },
              {
                key: 'urgency',
                label: t('actions.column.urgency'),
                value: t(`collections-scope.taskPriority.${open.priority}`),
              },
              {
                key: 'owner',
                label: t('actions.column.owner'),
                value:
                  open.assigned_to === null
                    ? t('collections-scope.unassigned')
                    : userName(open.assigned_to),
              },
              { key: 'due', label: t('actions.column.due'), value: <TaskDue task={open} /> },
              { key: 'status', label: t('actions.column.status'), value: statusLabel(open.status) },
              { key: 'note', label: t('actions.column.note'), value: open.note },
            ]}
          />
          <TaskAuditTimeline task={open} userName={userName} />
        </Dialog>
      )}
    </div>
  );
}
