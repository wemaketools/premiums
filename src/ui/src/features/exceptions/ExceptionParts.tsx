/**
 * The parts of an exception every surface that lists one shares: its state (who acknowledged it and when, or the
 * open recovery action, or open) and the Acknowledge dialog.
 */
import { Link } from 'react-router';

import { endpoints } from '../../../../contracts/index';
import type { CollectionException } from '../../../../contracts/index';
import { isApiError } from '../../api/client';
import { invalidateApiQueries, useApiMutation } from '../../api/hooks';
import { Chip, ConfirmActionDialog, useToast } from '../../components/ui';
import { t } from '../../lib/i18n';
import { ACTIONS_PATH, formatMoment } from '../collections-scope';
import { actorName, exceptionName } from './exceptionText';

export function ExceptionState({ item }: { readonly item: CollectionException }) {
  if (item.acknowledged !== null) {
    return (
      <div className="prm-stack prm-stack--tight">
        <span className="prm-inline">
          <Chip tone="success" size="sm">
            {t('exceptions.state.acknowledgedChip')}
          </Chip>
        </span>
        <span className="prm-cell-sub">
          {t('exceptions.state.by', {
            actor: actorName(item.acknowledged.actor),
            time: formatMoment(item.acknowledged.at),
          })}
        </span>
        {item.acknowledged.note !== null && (
          <span className="prm-cell-sub">
            {t('exceptions.state.note', { note: item.acknowledged.note })}
          </span>
        )}
      </div>
    );
  }
  if (item.open_task_id !== null) {
    return (
      <div className="prm-stack prm-stack--tight">
        <span className="prm-inline">
          <Chip tone="warning" size="sm">
            {t('exceptions.state.actionChip')}
          </Chip>
        </span>
        <Link to={ACTIONS_PATH} className="prm-cell-sub">
          {t('exceptions.state.action', { task: item.open_task_id })}
        </Link>
      </div>
    );
  }
  return (
    <span className="prm-inline">
      <Chip tone="info" size="sm">
        {t('exceptions.state.open')}
      </Chip>
    </span>
  );
}

/** Mount it while it is open: every opening starts with an empty note. */
export function AcknowledgeDialog({
  item,
  onClose,
}: {
  readonly item: CollectionException;
  readonly onClose: () => void;
}) {
  const toast = useToast();
  const acknowledge = useApiMutation(endpoints.exceptionsAcknowledge);
  return (
    <ConfirmActionDialog
      open
      title={t('exceptions.acknowledge.title')}
      scope={exceptionName(item)}
      consequence={t('exceptions.acknowledge.consequence')}
      confirmLabel={t('exceptions.acknowledge.confirm')}
      reason={{
        label: t('exceptions.acknowledge.note'),
        hint: t('exceptions.acknowledge.noteHint'),
        required: false,
      }}
      pending={acknowledge.pending}
      error={acknowledge.error}
      onCancel={onClose}
      onConfirm={async ({ reason }) => {
        try {
          await acknowledge.mutate({
            params: { exceptionId: item.exception_id },
            body: { note: reason === '' ? null : reason },
          });
          invalidateApiQueries(
            (id) => id.startsWith('exceptions.') || id === 'invoices.get' || id === 'receipts.get',
          );
          toast.show(t('exceptions.acknowledge.done', { name: exceptionName(item) }), 'success');
          onClose();
        } catch (caught) {
          // The mutation keeps the problem and the dialog shows it; anything else is a bug worth seeing.
          if (!isApiError(caught)) throw caught;
        }
      }}
    />
  );
}
