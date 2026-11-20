/**
 * One bank receipt (COL-FR-05, COL-FR-07): its calculation in plain terms (received − applied = unapplied), why bank
 * cash does not reduce a named invoice until it is applied to it, the allocations made from it with each invoice's
 * outstanding, its exceptions (unapplied cash) with Acknowledge, and the recovery actions on it with their history.
 */
import { useState } from 'react';
import { useParams } from 'react-router';

import { compareMoney, endpoints, formatMoney } from '../../../../contracts/index';
import type { CollectionException, ReceiptDetail, TaskListItem } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  DataTable,
  DetailList,
  EmptyState,
  PageHeader,
  QueryView,
  Reference,
  SkeletonBlock,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  RECEIPTS_PATH,
  RuleChip,
  SeverityChip,
  TaskStatusChip,
  evidenceText,
  formatMoment,
  invoicePath,
  useLookups,
} from '../collections-scope';
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
import { AcknowledgeDialog, ExceptionState } from '../exceptions/ExceptionParts';
import { exceptionName, ownerName } from '../exceptions/exceptionText';

type Allocation = ReceiptDetail['allocations'][number];

type Dialog =
  | { readonly kind: 'acknowledge'; readonly item: CollectionException }
  | { readonly kind: 'create' }
  | { readonly kind: 'assign' | 'status' | 'note'; readonly task: TaskListItem };

function Calculation({ detail }: { readonly detail: ReceiptDetail }) {
  const { facts } = detail;
  return (
    <Card
      title={t('receipt-detail.calculation.title')}
      subtitle={t('receipt-detail.calculation.subtitle')}
    >
      <div className="prm-stack">
        {facts.is_cash ? (
          <p className="prm-calculation">
            <span>{t('receipt-detail.calculation.received')}</span>{' '}
            <strong>{formatMoney(facts.gross_amount)}</strong>{' '}
            <span>{t('receipt-detail.calculation.applied')}</span>{' '}
            <strong>{formatMoney(facts.allocated)}</strong>{' '}
            <span>{t('receipt-detail.calculation.unapplied')}</span>{' '}
            <strong>{formatMoney(facts.unapplied)}</strong>
          </p>
        ) : (
          <Banner tone="warning" title={t('receipt-detail.calculation.notCashTitle')}>
            <p>{t('receipt-detail.calculation.notCash', { status: facts.status })}</p>
          </Banner>
        )}
        <DetailList
          items={[
            {
              key: 'received',
              label: t('receipt-detail.field.received'),
              value: formatCalendarDate(facts.received_at),
            },
            {
              key: 'bank',
              label: t('receipt-detail.field.bankRef'),
              value: <span className="prm-mono">{facts.bank_ref}</span>,
            },
            { key: 'status', label: t('receipt-detail.field.status'), value: facts.status },
            {
              key: 'cash',
              label: t('receipt-detail.field.cash'),
              value: facts.is_cash ? t('receipt-detail.field.yes') : t('receipt-detail.field.no'),
            },
            {
              key: 'currency',
              label: t('receipt-detail.field.currency'),
              value: detail.receipt.currency,
            },
          ]}
        />
        <Banner tone="info" title={t('receipt-detail.why.title')}>
          <p>{t('receipt-detail.why.cash')}</p>
          <p>
            {compareMoney(facts.unapplied, '0.00') > 0
              ? t('receipt-detail.why.unapplied', { amount: formatMoney(facts.unapplied) })
              : t('receipt-detail.why.applied')}
          </p>
          <p>{t('receipt-detail.why.failed')}</p>
        </Banner>
      </div>
    </Card>
  );
}

function Allocations({ detail }: { readonly detail: ReceiptDetail }) {
  const columns: DataTableColumn<Allocation>[] = [
    {
      id: 'allocation',
      header: t('receipt-detail.allocations.allocation'),
      cell: (row) => <span className="prm-mono">{row.allocation_id}</span>,
    },
    {
      id: 'invoice',
      header: t('receipt-detail.allocations.invoice'),
      cell: (row) => <Reference value={row.invoice_id} to={invoicePath(row.invoice_id)} />,
    },
    {
      id: 'posted',
      header: t('receipt-detail.allocations.posted'),
      cell: (row) => formatMoment(row.posted_at),
    },
    {
      id: 'amount',
      header: t('receipt-detail.allocations.amount'),
      numeric: true,
      cell: (row) => formatMoney(row.allocated_amount),
    },
    {
      id: 'outstanding',
      header: t('receipt-detail.allocations.outstanding'),
      numeric: true,
      cell: (row) => formatMoney(row.invoice.outstanding),
    },
  ];
  return (
    <Card
      flush
      title={t('receipt-detail.allocations.title')}
      subtitle={t('receipt-detail.allocations.subtitle')}
    >
      <DataTable
        caption={t('receipt-detail.allocations.caption')}
        columns={columns}
        rows={detail.allocations}
        rowKey={(row) => row.allocation_id}
        empty={
          <EmptyState
            compact
            icon="coins"
            title={t('receipt-detail.allocations.empty')}
            description={t('receipt-detail.allocations.emptyDescription')}
          />
        }
      />
    </Card>
  );
}

function Exceptions({
  detail,
  lookups,
  canAct,
  onAcknowledge,
}: {
  readonly detail: ReceiptDetail;
  readonly lookups: Lookups | undefined;
  readonly canAct: boolean;
  readonly onAcknowledge: (item: CollectionException) => void;
}) {
  const columns: DataTableColumn<CollectionException>[] = [
    {
      id: 'severity',
      header: t('receipt-detail.exceptions.severity'),
      cell: (item) => <SeverityChip severity={item.severity} />,
    },
    {
      id: 'rule',
      header: t('receipt-detail.exceptions.rule'),
      cell: (item) => <RuleChip rule={item.rule} />,
    },
    {
      id: 'evidence',
      header: t('receipt-detail.exceptions.evidence'),
      cell: (item) => evidenceText(item.rule, item.measure, item.reason_code),
    },
    {
      id: 'owner',
      header: t('receipt-detail.exceptions.owner'),
      cell: (item) => ownerName(item.owner_id, lookups),
    },
    {
      id: 'due',
      header: t('receipt-detail.exceptions.due'),
      cell: (item) => (
        <span className="prm-inline">
          <span className={item.late ? 'prm-text-danger' : undefined}>
            {formatCalendarDate(item.due_at)}
          </span>
          {item.late && (
            <Chip tone="danger" size="sm">
              {t('receipt-detail.exceptions.late')}
            </Chip>
          )}
        </span>
      ),
    },
    {
      id: 'triggered',
      header: t('receipt-detail.exceptions.triggered'),
      cell: (item) => formatCalendarDate(item.triggered_at),
    },
    {
      id: 'state',
      header: t('receipt-detail.exceptions.state'),
      cell: (item) => <ExceptionState item={item} />,
    },
  ];
  if (canAct) {
    columns.push({
      id: 'actions',
      header: <span className="prm-visually-hidden">{t('receipt-detail.exceptions.actions')}</span>,
      cell: (item) =>
        item.acknowledged === null ? (
          <div className="prm-row-actions">
            <Button
              size="sm"
              icon="check"
              aria-label={t('exceptions.acknowledge.buttonFor', { name: exceptionName(item) })}
              onClick={() => onAcknowledge(item)}
            >
              {t('exceptions.acknowledge.button')}
            </Button>
          </div>
        ) : null,
    });
  }
  return (
    <Card
      flush
      title={t('receipt-detail.exceptions.title')}
      subtitle={t('collections-scope.advisory')}
    >
      <DataTable
        caption={t('receipt-detail.exceptions.caption')}
        columns={columns}
        rows={detail.exceptions}
        rowKey={(item) => item.exception_id}
        empty={
          <EmptyState compact icon="checkCircle" title={t('receipt-detail.exceptions.empty')} />
        }
      />
    </Card>
  );
}

function Actions({
  receiptId,
  lookups,
  canAct,
  open,
}: {
  readonly receiptId: string;
  readonly lookups: Lookups | undefined;
  readonly canAct: boolean;
  readonly open: (dialog: Dialog) => void;
}) {
  const tasks = useApiQuery(endpoints.tasksList, {
    query: { subject_type: 'RECEIPT', subject_id: receiptId },
  });
  const userName = (id: string): string => lookups?.user(id)?.display_name ?? id;
  return (
    <Card
      title={t('receipt-detail.actions.title')}
      subtitle={t('receipt-detail.actions.subtitle')}
      actions={
        canAct ? (
          <Button variant="primary" icon="plus" onClick={() => open({ kind: 'create' })}>
            {t('collections-tasks.create.button')}
          </Button>
        ) : (
          <span className="prm-text-muted">{t('collections-scope.readOnly')}</span>
        )
      }
    >
      <QueryView
        query={tasks}
        loading={<SkeletonBlock lines={3} />}
        errorTitle={t('receipt-detail.actions.error')}
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            compact
            icon="clipboard"
            title={t('receipt-detail.actions.empty')}
            description={canAct ? t('receipt-detail.actions.emptyDescription') : undefined}
          />
        }
      >
        {(data) => (
          <ul className="prm-list-plain" aria-label={t('receipt-detail.actions.list')}>
            {data.items.map((task) => (
              <li key={task.task_id}>
                <Card
                  headingLevel={3}
                  title={t('receipt-detail.actions.task', { task: task.task_id })}
                  subtitle={t(`collections-scope.reason.${task.reason}`)}
                  actions={
                    canAct ? (
                      <div className="prm-row-actions">
                        <Button
                          size="sm"
                          aria-label={t('collections-tasks.assign.buttonFor', {
                            task: task.task_id,
                          })}
                          onClick={() => open({ kind: 'assign', task })}
                        >
                          {t('collections-tasks.assign.button')}
                        </Button>
                        <Button
                          size="sm"
                          aria-label={t('collections-tasks.status.buttonFor', {
                            task: task.task_id,
                          })}
                          onClick={() => open({ kind: 'status', task })}
                        >
                          {t('collections-tasks.status.button')}
                        </Button>
                        <Button
                          size="sm"
                          aria-label={t('collections-tasks.note.buttonFor', { task: task.task_id })}
                          onClick={() => open({ kind: 'note', task })}
                        >
                          {t('collections-tasks.note.button')}
                        </Button>
                      </div>
                    ) : undefined
                  }
                >
                  <div className="prm-stack">
                    <DetailList
                      items={[
                        {
                          key: 'status',
                          label: t('receipt-detail.actions.status'),
                          value: <TaskStatusChip status={task.status} />,
                        },
                        {
                          key: 'priority',
                          label: t('receipt-detail.actions.priority'),
                          value: t(`collections-scope.taskPriority.${task.priority}`),
                        },
                        {
                          key: 'owner',
                          label: t('receipt-detail.actions.owner'),
                          value:
                            task.assigned_to === null
                              ? t('collections-scope.unassigned')
                              : userName(task.assigned_to),
                        },
                        {
                          key: 'due',
                          label: t('receipt-detail.actions.due'),
                          value: <TaskDue task={task} />,
                        },
                        {
                          key: 'note',
                          label: t('receipt-detail.actions.note'),
                          value: task.note ?? '',
                        },
                      ]}
                    />
                    <TaskAuditTimeline task={task} userName={userName} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Card>
  );
}

export default function ReceiptDetailPage() {
  const { receiptId = '' } = useParams();
  const lookups = useLookups();
  const canAct = useCanAct();
  const detail = useApiQuery(endpoints.receiptsGet, { params: { receiptId } });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = (): void => setDialog(null);
  const back = { to: RECEIPTS_PATH, label: t('receipt-detail.back') };

  if (detail.error?.kind === 'not_found' && detail.data === undefined) {
    return (
      <div className="prm-page">
        <PageHeader title={t('receipt-detail.title', { receipt: receiptId })} back={back} />
        <Card data-state="not-found">
          <EmptyState
            icon="receipt"
            title={t('receipt-detail.notFound.title', { receipt: receiptId })}
            description={t('receipt-detail.notFound.description')}
            action={<ButtonLink to={RECEIPTS_PATH}>{t('receipt-detail.notFound.link')}</ButtonLink>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="prm-page">
      <PageHeader
        title={t('receipt-detail.title', { receipt: receiptId })}
        subtitle={t('receipt-detail.subtitle')}
        back={back}
        meta={
          detail.data === undefined ? undefined : (
            <span className="prm-inline">
              <Reference value={detail.data.facts.receipt_id} />
              <Chip tone={detail.data.facts.is_cash ? 'success' : 'neutral-outlined'} size="sm">
                {detail.data.facts.status}
              </Chip>
              <span className="prm-text-muted">
                {t('receipt-detail.meta', {
                  date: formatCalendarDate(detail.data.facts.received_at),
                  amount: formatMoney(detail.data.facts.gross_amount),
                })}
              </span>
            </span>
          )
        }
      />
      <QueryView query={detail} loading={<SkeletonBlock lines={6} />}>
        {(data) => (
          <div className="prm-page" aria-busy={detail.isFetching}>
            <Calculation detail={data} />
            <Allocations detail={data} />
            <Exceptions
              detail={data}
              lookups={lookups.lookups}
              canAct={canAct}
              onAcknowledge={(item) => setDialog({ kind: 'acknowledge', item })}
            />
            <Actions
              receiptId={receiptId}
              lookups={lookups.lookups}
              canAct={canAct}
              open={setDialog}
            />
          </div>
        )}
      </QueryView>
      {dialog?.kind === 'acknowledge' && <AcknowledgeDialog item={dialog.item} onClose={close} />}
      {dialog?.kind === 'create' && (
        <CreateTaskDialog
          subject={{ type: 'RECEIPT', id: receiptId }}
          defaultReason="UNAPPLIED_CASH"
          defaultPriority="MEDIUM"
          onClose={close}
        />
      )}
      {dialog?.kind === 'assign' && <AssignTaskDialog task={dialog.task} onClose={close} />}
      {dialog?.kind === 'status' && <SetTaskStatusDialog task={dialog.task} onClose={close} />}
      {dialog?.kind === 'note' && <AddNoteDialog task={dialog.task} onClose={close} />}
    </div>
  );
}
