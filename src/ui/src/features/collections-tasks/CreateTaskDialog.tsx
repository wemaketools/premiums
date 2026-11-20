/**
 * "Create recovery action": opens an action on an invoice or a receipt through the typed endpoint, confirmed with
 * who, what and the result. Given no subject, it asks which invoice. The reason, owner and urgency start from what
 * the screen knows (the flag that prompted it, the account owner) and the user may change each.
 */
import { useState } from 'react';

import { TASK_PRIORITIES, TASK_REASONS, endpoints } from '../../../../contracts/index';
import type { TaskPriority, TaskReason, TaskSubjectType } from '../../../../contracts/index';
import { isApiError } from '../../api/client';
import { invalidateApiQueries, useApiMutation, useApiQuery } from '../../api/hooks';
import { ConfirmActionDialog, DateInput, Select, useToast } from '../../components/ui';
import { t } from '../../lib/i18n';

export interface CreateTaskDialogProps {
  /** The invoice or receipt the action is about; `null` lets the user choose an invoice. */
  readonly subject: { readonly type: TaskSubjectType; readonly id: string } | null;
  readonly defaultReason: TaskReason;
  readonly defaultPriority: TaskPriority;
  readonly defaultOwner?: string | null;
  readonly onClose: () => void;
  readonly onCreated?: (taskId: string) => void;
}

/** Mount it while it is open: every opening starts with fresh fields. */
export function CreateTaskDialog({
  subject,
  defaultReason,
  defaultPriority,
  defaultOwner = null,
  onClose,
  onCreated,
}: CreateTaskDialogProps) {
  const toast = useToast();
  const users = useApiQuery(endpoints.usersList, {});
  const invoices = useApiQuery(
    endpoints.invoicesList,
    subject === null ? { query: { view: 'unpaid' } } : null,
  );
  const [chosen, setChosen] = useState('');
  const target = subject ?? (chosen === '' ? null : { type: 'INVOICE' as const, id: chosen });
  const create = useApiMutation(endpoints.tasksCreate);
  const [reason, setReason] = useState<TaskReason>(defaultReason);
  const [owner, setOwner] = useState(defaultOwner ?? '');
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [due, setDue] = useState('');

  return (
    <ConfirmActionDialog
      open
      size="lg"
      title={t('collections-tasks.create.title')}
      scope={
        target === null
          ? t('collections-tasks.create.scopeNone')
          : t('collections-tasks.create.scope', { subject: target.id })
      }
      confirmDisabled={target === null}
      consequence={t('collections-tasks.create.consequence')}
      confirmLabel={t('collections-tasks.create.confirm')}
      reason={{
        label: t('collections-tasks.create.nextAction'),
        hint: t('collections-tasks.create.nextActionHint'),
        required: true,
      }}
      pending={create.pending}
      error={create.error}
      onCancel={onClose}
      onConfirm={async ({ reason: note }) => {
        if (target === null) return;
        try {
          const task = await create.mutate({
            body: {
              subject_type: target.type,
              subject_id: target.id,
              reason,
              assigned_to: owner === '' ? null : owner,
              due_at: due === '' ? null : due,
              priority,
              note,
            },
          });
          invalidateApiQueries(
            (id) =>
              id.startsWith('tasks.') ||
              id.startsWith('exceptions.') ||
              id === 'invoices.get' ||
              id === 'receipts.get',
          );
          toast.show(
            t('collections-tasks.create.created', { task: task.task_id, subject: target.id }),
            'success',
          );
          onCreated?.(task.task_id);
          onClose();
        } catch (caught) {
          // The mutation keeps the problem and the dialog shows it; anything else is a bug worth seeing.
          if (!isApiError(caught)) throw caught;
        }
      }}
    >
      {subject === null && (
        <Select
          label={t('collections-tasks.create.invoice')}
          placeholder={t('collections-tasks.create.chooseInvoice')}
          required
          loading={invoices.status === 'loading'}
          value={chosen}
          hint={invoices.error === null ? undefined : t('collections-tasks.create.invoicesFailed')}
          options={(invoices.data?.items ?? [])
            .map((item) => ({ value: item.invoice_id, label: item.invoice_id }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { numeric: true }))}
          onChange={setChosen}
        />
      )}
      <Select
        label={t('collections-tasks.create.reason')}
        value={reason}
        options={TASK_REASONS.map((value) => ({
          value,
          label: t(`collections-scope.reason.${value}`),
        }))}
        onChange={(value) => setReason(TASK_REASONS.find((r) => r === value) ?? reason)}
      />
      <Select
        label={t('collections-tasks.create.assignee')}
        placeholder={t('collections-tasks.create.unassigned')}
        loading={users.status === 'loading'}
        value={owner}
        options={(users.data?.items ?? []).map((user) => ({
          value: user.user_id,
          label: user.display_name,
        }))}
        onChange={setOwner}
      />
      <Select
        label={t('collections-tasks.create.priority')}
        value={priority}
        options={TASK_PRIORITIES.map((value) => ({
          value,
          label: t(`collections-scope.taskPriority.${value}`),
        }))}
        onChange={(value) => setPriority(TASK_PRIORITIES.find((p) => p === value) ?? priority)}
      />
      <DateInput label={t('collections-tasks.create.due')} value={due} onChange={setDue} />
    </ConfirmActionDialog>
  );
}
