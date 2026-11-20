/**
 * The recovery actions on the invoice (COL-FR-11): each with its status, owner, due date, latest note and audit
 * trail, and the create, assign, status and note dialogs. The Executive Viewer sees them read-only.
 */
import { useState } from 'react';

import type { InvoiceDetail, TaskListItem, TaskRecord } from '../../../../contracts/index';
import type { QueryResult } from '../../api/hooks';
import {
  Button,
  Card,
  DetailList,
  EmptyState,
  QueryView,
  SkeletonBlock,
} from '../../components/ui';
import { t } from '../../lib/i18n';
import { TaskStatusChip } from '../collections-scope';
import type { Lookups } from '../collections-scope';
import {
  AddNoteDialog,
  AssignTaskDialog,
  CreateTaskDialog,
  SetTaskStatusDialog,
  TaskAuditTimeline,
  TaskDue,
  useCanAct,
} from '../collections-tasks';
import { defaultPriority, defaultReason } from './labels';

type OpenDialog =
  | { readonly kind: 'create' }
  | { readonly kind: 'assign' | 'status' | 'note'; readonly task: TaskRecord }
  | null;

interface TaskList {
  readonly items: readonly TaskListItem[];
}

function latestNote(task: TaskRecord): string | null {
  const noted = task.audit.filter((entry) => entry.note !== null);
  return noted[noted.length - 1]?.note ?? task.note;
}

export function RecoveryActionsCard({
  detail,
  tasks,
  lookups,
}: {
  readonly detail: InvoiceDetail;
  readonly tasks: QueryResult<TaskList>;
  readonly lookups: Lookups | undefined;
}) {
  const canAct = useCanAct();
  const [open, setOpen] = useState<OpenDialog>(null);
  const userName = (id: string): string => lookups?.user(id)?.display_name ?? id;
  const invoiceId = detail.invoice.invoice_id;

  return (
    <Card
      title={t('invoice-detail.actions.title')}
      subtitle={t('invoice-detail.actions.subtitle')}
      actions={
        canAct ? (
          <Button variant="primary" icon="plus" onClick={() => setOpen({ kind: 'create' })}>
            {t('collections-tasks.create.button')}
          </Button>
        ) : undefined
      }
    >
      {!canAct && <p className="prm-text-muted">{t('collections-scope.readOnly')}</p>}
      <QueryView
        query={tasks}
        loading={<SkeletonBlock lines={3} />}
        errorTitle={t('invoice-detail.actions.error')}
        isEmpty={(data) => data.items.length === 0}
        empty={<EmptyState compact icon="listChecks" title={t('invoice-detail.actions.none')} />}
      >
        {(data) => (
          <ul className="prm-stack" aria-busy={tasks.isFetching}>
            {data.items.map((task) => (
              <li key={task.task_id} className="prm-stack">
                <div className="prm-inline">
                  <strong className="prm-mono">{task.task_id}</strong>
                  <TaskStatusChip status={task.status} />
                  <span>{t(`collections-scope.reason.${task.reason}`)}</span>
                </div>
                <DetailList
                  items={[
                    {
                      key: 'priority',
                      label: t('invoice-detail.actions.priority'),
                      value: t(`collections-scope.taskPriority.${task.priority}`),
                    },
                    {
                      key: 'owner',
                      label: t('invoice-detail.actions.owner'),
                      value:
                        task.assigned_to === null
                          ? t('invoice-detail.actions.unassigned')
                          : userName(task.assigned_to),
                    },
                    {
                      key: 'due',
                      label: t('invoice-detail.actions.due'),
                      value: <TaskDue task={task} />,
                    },
                    {
                      key: 'note',
                      label: t('invoice-detail.actions.latestNote'),
                      value: latestNote(task) ?? t('invoice-detail.actions.noNote'),
                    },
                  ]}
                />
                {canAct && (
                  <div className="prm-inline">
                    <Button
                      size="sm"
                      icon="userCheck"
                      aria-label={t('collections-tasks.assign.buttonFor', { task: task.task_id })}
                      onClick={() => setOpen({ kind: 'assign', task })}
                    >
                      {t('collections-tasks.assign.button')}
                    </Button>
                    <Button
                      size="sm"
                      icon="repeat"
                      aria-label={t('collections-tasks.status.buttonFor', { task: task.task_id })}
                      onClick={() => setOpen({ kind: 'status', task })}
                    >
                      {t('collections-tasks.status.button')}
                    </Button>
                    <Button
                      size="sm"
                      icon="messageSquare"
                      aria-label={t('collections-tasks.note.buttonFor', { task: task.task_id })}
                      onClick={() => setOpen({ kind: 'note', task })}
                    >
                      {t('collections-tasks.note.button')}
                    </Button>
                  </div>
                )}
                <TaskAuditTimeline task={task} userName={userName} />
              </li>
            ))}
          </ul>
        )}
      </QueryView>
      {canAct && open?.kind === 'create' && (
        <CreateTaskDialog
          subject={{ type: 'INVOICE', id: invoiceId }}
          defaultReason={defaultReason(detail.facts)}
          defaultPriority={defaultPriority(detail.facts)}
          defaultOwner={detail.facts.owner_id}
          onClose={() => setOpen(null)}
        />
      )}
      {canAct && open?.kind === 'assign' && (
        <AssignTaskDialog task={open.task} onClose={() => setOpen(null)} />
      )}
      {canAct && open?.kind === 'status' && (
        <SetTaskStatusDialog task={open.task} onClose={() => setOpen(null)} />
      )}
      {canAct && open?.kind === 'note' && (
        <AddNoteDialog task={open.task} onClose={() => setOpen(null)} />
      )}
    </Card>
  );
}
