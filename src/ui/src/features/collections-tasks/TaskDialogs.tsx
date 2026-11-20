/** "Assign owner", "Change status" and "Add note": each confirmed in a dialog and logged by the API with the active persona and the time. */
import { useState } from 'react';

import { TASK_STATUS_TRANSITIONS, endpoints } from '../../../../contracts/index';
import type { TaskRecord, TaskStatus } from '../../../../contracts/index';
import { isApiError } from '../../api/client';
import { invalidateApiQueries, useApiMutation, useApiQuery } from '../../api/hooks';
import { ConfirmActionDialog, Select, useToast } from '../../components/ui';
import { t } from '../../lib/i18n';

interface TaskDialogProps {
  readonly task: TaskRecord;
  readonly onClose: () => void;
}

const statusLabel = (status: TaskStatus): string => t(`collections-scope.taskStatus.${status}`);

/** After a change the queue, the exceptions (owner, due date) and the detail pages read again. */
const refresh = (): void =>
  invalidateApiQueries(
    (id) =>
      id.startsWith('tasks.') ||
      id.startsWith('exceptions.') ||
      id === 'invoices.get' ||
      id === 'receipts.get',
  );

/** Mount it while it is open: every opening starts with empty fields. */
export function AssignTaskDialog({ task, onClose }: TaskDialogProps) {
  const toast = useToast();
  const users = useApiQuery(endpoints.usersList, {});
  const assign = useApiMutation(endpoints.tasksAssign);
  const [owner, setOwner] = useState('');
  const people = users.data?.items ?? [];

  return (
    <ConfirmActionDialog
      open
      title={t('collections-tasks.assign.title')}
      scope={t('collections-tasks.assign.scope', { task: task.task_id, subject: task.subject_id })}
      consequence={t('collections-tasks.assign.consequence')}
      confirmLabel={t('collections-tasks.assign.confirm')}
      confirmDisabled={owner === ''}
      pending={assign.pending}
      error={assign.error}
      onCancel={onClose}
      onConfirm={async () => {
        try {
          await assign.mutate({ params: { taskId: task.task_id }, body: { assigned_to: owner } });
          refresh();
          toast.show(
            t('collections-tasks.assign.done', {
              task: task.task_id,
              owner: people.find((user) => user.user_id === owner)?.display_name ?? owner,
            }),
            'success',
          );
          onClose();
        } catch (caught) {
          if (!isApiError(caught)) throw caught;
        }
      }}
    >
      <Select
        label={t('collections-tasks.assign.owner')}
        placeholder={t('collections-tasks.assign.choose')}
        required
        loading={users.status === 'loading'}
        value={owner}
        options={people.map((user) => ({ value: user.user_id, label: user.display_name }))}
        onChange={setOwner}
      />
    </ConfirmActionDialog>
  );
}

/** The statuses the action may move to are the contract's transitions, so the API and the dialog agree. */
export function SetTaskStatusDialog({ task, onClose }: TaskDialogProps) {
  const toast = useToast();
  const setStatus = useApiMutation(endpoints.tasksSetStatus);
  const next = TASK_STATUS_TRANSITIONS[task.status];
  const [status, setChosen] = useState<TaskStatus | ''>('');

  return (
    <ConfirmActionDialog
      open
      title={t('collections-tasks.status.title')}
      scope={t('collections-tasks.status.scope', {
        task: task.task_id,
        subject: task.subject_id,
        status: statusLabel(task.status),
      })}
      consequence={t('collections-tasks.status.consequence')}
      confirmLabel={t('collections-tasks.status.confirm')}
      confirmDisabled={status === ''}
      reason={{
        label: t('collections-tasks.status.note'),
        hint: t('collections-tasks.status.noteHint'),
        required: false,
      }}
      pending={setStatus.pending}
      error={setStatus.error}
      onCancel={onClose}
      onConfirm={async ({ reason }) => {
        if (status === '') return;
        try {
          await setStatus.mutate({
            params: { taskId: task.task_id },
            body: { status, note: reason === '' ? null : reason },
          });
          refresh();
          toast.show(
            t('collections-tasks.status.done', { task: task.task_id, status: statusLabel(status) }),
            'success',
          );
          onClose();
        } catch (caught) {
          if (!isApiError(caught)) throw caught;
        }
      }}
    >
      <Select
        label={t('collections-tasks.status.next')}
        placeholder={t('collections-tasks.status.choose')}
        required
        value={status}
        options={next.map((value) => ({ value, label: statusLabel(value) }))}
        onChange={(value) => setChosen(next.find((candidate) => candidate === value) ?? '')}
      />
    </ConfirmActionDialog>
  );
}

export function AddNoteDialog({ task, onClose }: TaskDialogProps) {
  const toast = useToast();
  const addNote = useApiMutation(endpoints.tasksAddNote);

  return (
    <ConfirmActionDialog
      open
      title={t('collections-tasks.note.title')}
      scope={t('collections-tasks.note.scope', { task: task.task_id, subject: task.subject_id })}
      consequence={t('collections-tasks.note.consequence')}
      confirmLabel={t('collections-tasks.note.confirm')}
      reason={{
        label: t('collections-tasks.note.label'),
        hint: t('collections-tasks.note.hint'),
        required: true,
      }}
      pending={addNote.pending}
      error={addNote.error}
      onCancel={onClose}
      onConfirm={async ({ reason }) => {
        try {
          await addNote.mutate({ params: { taskId: task.task_id }, body: { note: reason } });
          refresh();
          toast.show(t('collections-tasks.note.done', { task: task.task_id }), 'success');
          onClose();
        } catch (caught) {
          if (!isApiError(caught)) throw caught;
        }
      }}
    />
  );
}
