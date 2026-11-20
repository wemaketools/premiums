/** The read-only cards of COL-04: the account, the calculation, the flags, the attempts, the suggestion, the policy's installments and its claims. */
import { formatMoney } from '../../../../contracts/index';
import type {
  AllocationDetail,
  Claim,
  DataSetId,
  InvoiceDetail,
  InvoiceFacts,
  PaymentAttempt,
} from '../../../../contracts/index';
import {
  Banner,
  Card,
  Chip,
  DataTable,
  DetailList,
  EmptyState,
  Icon,
  Reference,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { EMPTY_VALUE, formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import { claimsIqClaimUrl } from '../../lib/suite';
import {
  BucketChip,
  PriorityChip,
  RuleChip,
  SeverityChip,
  evidenceText,
  formatMoment,
  invoicePath,
  receiptPath,
} from '../collections-scope';
import type { Lookups } from '../collections-scope';
import { agingWords, codeLabel } from './labels';

const persona = (actor: string): string => t(`shell.persona.${actor}`);

export function AgingChip({ facts }: { readonly facts: InvoiceFacts }) {
  if (facts.aging_state === 'paid') {
    return (
      <Chip tone="success" size="sm">
        {agingWords(facts)}
      </Chip>
    );
  }
  if (facts.aging_state === 'unknown' || facts.bucket === null) {
    return (
      <Chip tone="warning" size="sm" outlined>
        {agingWords(facts)}
      </Chip>
    );
  }
  return <BucketChip bucket={facts.bucket} />;
}

function Named({ name, id }: { readonly name: string; readonly id: string }) {
  return (
    <span className="prm-stack prm-stack--tight">
      <span>{name}</span>
      <span className="prm-cell-sub prm-mono">{id}</span>
    </span>
  );
}

export function AccountCard({
  detail,
  lookups,
}: {
  readonly detail: InvoiceDetail;
  readonly lookups: Lookups | undefined;
}) {
  const { facts, policy, client, broker, product, invoice } = detail;
  return (
    <Card title={t('invoice-detail.account.title')}>
      <DetailList
        items={[
          {
            key: 'client',
            label: t('invoice-detail.account.client'),
            value: <Named name={client.name} id={client.client_id} />,
          },
          {
            key: 'policy',
            label: t('invoice-detail.account.policy'),
            value: <Named name={policy.policy_number} id={policy.policy_id} />,
          },
          {
            key: 'policyStatus',
            label: t('invoice-detail.account.policyStatus'),
            value: (
              <span className="prm-stack prm-stack--tight">
                <span>{policy.status}</span>
                <span className="prm-cell-sub">{t('invoice-detail.account.policyStatusNote')}</span>
              </span>
            ),
          },
          {
            key: 'broker',
            label: t('invoice-detail.account.broker'),
            value:
              broker === null ? (
                t('collections-scope.noBroker')
              ) : (
                <Named name={broker.name} id={broker.broker_id} />
              ),
          },
          {
            key: 'channel',
            label: t('invoice-detail.account.channel'),
            value: t(`collections-scope.channel.${facts.channel}`),
          },
          {
            key: 'product',
            label: t('invoice-detail.account.product'),
            value: <Named name={product.product_name} id={product.product_id} />,
          },
          {
            key: 'owner',
            label: t('invoice-detail.account.owner'),
            value:
              lookups?.nameOf.owner(facts.owner_id) ??
              facts.owner_id ??
              t('collections-scope.noOwner'),
          },
          {
            key: 'issued',
            label: t('invoice-detail.account.issued'),
            value: formatMoment(facts.issue_date),
          },
          {
            key: 'invoiceStatus',
            label: t('invoice-detail.account.invoiceStatus'),
            value: invoice.status,
          },
        ]}
      />
    </Card>
  );
}

const ALLOCATION_COLUMNS: DataTableColumn<AllocationDetail>[] = [
  {
    id: 'allocation',
    header: t('invoice-detail.calculation.column.allocation'),
    cell: (row) => <Reference value={row.allocation_id} />,
  },
  {
    id: 'receipt',
    header: t('invoice-detail.calculation.column.receipt'),
    cell: (row) => <Reference value={row.receipt_id} to={receiptPath(row.receipt_id)} />,
  },
  {
    id: 'received',
    header: t('invoice-detail.calculation.column.received'),
    cell: (row) => formatMoment(row.received_at),
  },
  {
    id: 'bankRef',
    header: t('invoice-detail.calculation.column.bankRef'),
    cell: (row) =>
      row.bank_ref === '' ? EMPTY_VALUE : <span className="prm-mono">{row.bank_ref}</span>,
  },
  {
    id: 'posted',
    header: t('invoice-detail.calculation.column.posted'),
    cell: (row) => formatMoment(row.posted_at),
  },
  {
    id: 'amount',
    header: t('invoice-detail.calculation.column.amount'),
    numeric: true,
    cell: (row) => formatMoney(row.allocated_amount),
  },
];

export function CalculationCard({ detail }: { readonly detail: InvoiceDetail }) {
  const { facts } = detail;
  const daysOverdue =
    facts.days_overdue === null
      ? EMPTY_VALUE
      : facts.overdue
        ? String(facts.days_overdue)
        : t('invoice-detail.calculation.notDue');
  return (
    <Card
      title={t('invoice-detail.calculation.title')}
      subtitle={t('invoice-detail.calculation.subtitle', {
        date: formatCalendarDate(detail.as_of),
      })}
    >
      <div className="prm-stack">
        <p className="prm-calculation">
          {t('invoice-detail.calculation.issued')} <strong>{formatMoney(facts.issued)}</strong>{' '}
          {t('invoice-detail.calculation.applied')} <strong>{formatMoney(facts.applied)}</strong>{' '}
          {t('invoice-detail.calculation.outstanding')}{' '}
          <strong>{formatMoney(facts.outstanding)}</strong>
        </p>
        {detail.allocations.length === 0 ? (
          <p className="prm-text-muted">{t('invoice-detail.calculation.noAllocations')}</p>
        ) : (
          <DataTable
            caption={t('invoice-detail.calculation.allocations')}
            columns={ALLOCATION_COLUMNS}
            rows={detail.allocations}
            rowKey={(row) => row.allocation_id}
          />
        )}
        {facts.aging_state === 'unknown' && (
          <Banner tone="warning" title={t('invoice-detail.calculation.unknownTitle')}>
            <p>{t('invoice-detail.calculation.unknownBody')}</p>
          </Banner>
        )}
        {facts.aging_state === 'paid' && (
          <Banner tone="success" title={t('invoice-detail.calculation.paidTitle')}>
            <p>{t('invoice-detail.calculation.paidBody')}</p>
          </Banner>
        )}
        <DetailList
          items={[
            {
              key: 'due',
              label: t('invoice-detail.calculation.due'),
              value: formatMoment(facts.due_date),
            },
            { key: 'days', label: t('invoice-detail.calculation.days'), value: daysOverdue },
            {
              key: 'bucket',
              label: t('invoice-detail.calculation.bucket'),
              value: <AgingChip facts={facts} />,
            },
            {
              key: 'priority',
              label: t('invoice-detail.calculation.priority'),
              value:
                facts.priority === null ? EMPTY_VALUE : <PriorityChip priority={facts.priority} />,
            },
          ]}
        />
      </div>
    </Card>
  );
}

export function FlagsCard({ detail }: { readonly detail: InvoiceDetail }) {
  const { facts, exceptions } = detail;
  return (
    <Card title={t('invoice-detail.flags.title')} subtitle={t('invoice-detail.flags.subtitle')}>
      {facts.flags.length === 0 ? (
        <EmptyState compact icon="checkCircle" title={t('invoice-detail.flags.none')} />
      ) : (
        <div className="prm-stack">
          <ul className="prm-stack" aria-label={t('invoice-detail.flags.caption')}>
            {facts.flags.map((flag) => {
              const exception = exceptions.find((item) => item.rule === flag.rule);
              const acknowledged = exception?.acknowledged ?? null;
              return (
                <li key={flag.rule} className="prm-stack prm-stack--tight">
                  <span className="prm-inline">
                    <RuleChip rule={flag.rule} />
                    <SeverityChip severity={flag.severity} />
                    {exception?.late === true && (
                      <Chip tone="danger" size="sm">
                        {t('invoice-detail.flags.late')}
                      </Chip>
                    )}
                  </span>
                  <span>{evidenceText(flag.rule, flag.measure)}</span>
                  <span className="prm-text-muted">
                    {t('invoice-detail.flags.triggered', {
                      date: formatCalendarDate(flag.triggered_at),
                    })}
                    {exception !== undefined &&
                      ` · ${t('invoice-detail.flags.responseDue', { date: formatCalendarDate(exception.due_at) })}`}
                  </span>
                  <span className="prm-text-muted">
                    {acknowledged === null
                      ? t('invoice-detail.flags.notAcknowledged')
                      : t('invoice-detail.flags.acknowledged', {
                          actor: persona(acknowledged.actor),
                          time: formatMoment(acknowledged.at),
                        })}
                  </span>
                  {acknowledged?.note != null && (
                    <span className="prm-text-muted">
                      {t('invoice-detail.flags.acknowledgedNote', { note: acknowledged.note })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <Banner tone="info">
            <p>{t('collections-scope.advisory')}</p>
          </Banner>
        </div>
      )}
    </Card>
  );
}

const ATTEMPT_COLUMNS: DataTableColumn<PaymentAttempt>[] = [
  {
    id: 'attempt',
    header: t('invoice-detail.attempts.column.attempt'),
    cell: (row) => <Reference value={row.attempt_id} />,
  },
  {
    id: 'date',
    header: t('invoice-detail.attempts.column.date'),
    cell: (row) => formatMoment(row.attempt_at),
  },
  {
    id: 'method',
    header: t('invoice-detail.attempts.column.method'),
    cell: (row) => codeLabel('method', row.method),
  },
  {
    id: 'outcome',
    header: t('invoice-detail.attempts.column.outcome'),
    cell: (row) => (
      <Chip tone={row.outcome === 'FAILED' ? 'danger' : 'neutral'} size="sm">
        {codeLabel('outcome', row.outcome)}
      </Chip>
    ),
  },
  {
    id: 'reason',
    header: t('invoice-detail.attempts.column.reason'),
    cell: (row) => (row.reason_code === null ? EMPTY_VALUE : codeLabel('reason', row.reason_code)),
  },
];

export function AttemptsCard({ detail }: { readonly detail: InvoiceDetail }) {
  return (
    <Card
      title={t('invoice-detail.attempts.title')}
      subtitle={t('invoice-detail.attempts.statement')}
    >
      {detail.attempts.length === 0 ? (
        <p className="prm-text-muted">{t('invoice-detail.attempts.none')}</p>
      ) : (
        <DataTable
          caption={t('invoice-detail.attempts.caption')}
          columns={ATTEMPT_COLUMNS}
          rows={detail.attempts}
          rowKey={(row) => row.attempt_id}
        />
      )}
    </Card>
  );
}

export function SuggestionCard({ detail }: { readonly detail: InvoiceDetail }) {
  return (
    <Card
      title={t('invoice-detail.suggestion.title')}
      subtitle={t('invoice-detail.suggestion.note')}
    >
      <p className="prm-inline">
        <Chip tone="accent" size="sm" icon="compass">
          {t('invoice-detail.suggestion.label')}
        </Chip>
        <span>{t(`collections-scope.suggestion.${detail.suggestion}`)}</span>
      </p>
    </Card>
  );
}

export function InstallmentsCard({ detail }: { readonly detail: InvoiceDetail }) {
  const current = detail.invoice.invoice_id;
  const columns: DataTableColumn<InvoiceFacts>[] = [
    {
      id: 'invoice',
      header: t('invoice-detail.installments.column.invoice'),
      cell: (row) =>
        row.invoice_id === current ? (
          <span className="prm-inline">
            <Reference value={row.invoice_id} />
            <Chip tone="neutral-outlined" size="sm">
              {t('invoice-detail.installments.current')}
            </Chip>
          </span>
        ) : (
          <Reference value={row.invoice_id} to={invoicePath(row.invoice_id)} />
        ),
    },
    {
      id: 'due',
      header: t('invoice-detail.installments.column.due'),
      cell: (row) => formatMoment(row.due_date),
    },
    {
      id: 'outstanding',
      header: t('invoice-detail.installments.column.outstanding'),
      numeric: true,
      cell: (row) => formatMoney(row.outstanding),
    },
    {
      id: 'aging',
      header: t('invoice-detail.installments.column.aging'),
      cell: (row) => <AgingChip facts={row} />,
    },
  ];
  return (
    <Card
      title={t('invoice-detail.installments.title')}
      subtitle={t('invoice-detail.installments.subtitle', { policy: detail.policy.policy_number })}
    >
      <DataTable
        caption={t('invoice-detail.installments.caption')}
        columns={columns}
        rows={detail.policy_invoices}
        rowKey={(row) => row.invoice_id}
      />
    </Card>
  );
}

function ClaimLink({ claim, dataSet }: { readonly claim: Claim; readonly dataSet: DataSetId }) {
  if (dataSet !== 'DEMO') return <Reference value={claim.claim_id} />;
  return (
    <a
      href={claimsIqClaimUrl(claim.claim_id)}
      target="_blank"
      rel="noopener noreferrer"
      className="prm-ref prm-inline"
      aria-label={t('invoice-detail.claims.open', { claim: claim.claim_id })}
    >
      {claim.claim_id}
      <Icon name="externalLink" />
    </a>
  );
}

export function ClaimsCard({
  detail,
  dataSet,
}: {
  readonly detail: InvoiceDetail;
  readonly dataSet: DataSetId;
}) {
  const columns: DataTableColumn<Claim>[] = [
    {
      id: 'claim',
      header: t('invoice-detail.claims.column.claim'),
      cell: (row) => <ClaimLink claim={row} dataSet={dataSet} />,
    },
    { id: 'stage', header: t('invoice-detail.claims.column.stage'), cell: (row) => row.stage },
    {
      id: 'status',
      header: t('invoice-detail.claims.column.status'),
      cell: (row) => (
        <Chip tone={row.status === 'OPEN' ? 'info' : 'neutral'} size="sm">
          {t(`invoice-detail.claims.status.${row.status}`)}
        </Chip>
      ),
    },
    {
      id: 'reported',
      header: t('invoice-detail.claims.column.reported'),
      cell: (row) => formatMoment(row.reported_at),
    },
    {
      id: 'reserve',
      header: t('invoice-detail.claims.column.reserve'),
      numeric: true,
      cell: (row) => formatMoney(row.current_outstanding_reserve),
    },
  ];
  return (
    <Card
      title={t('invoice-detail.claims.title')}
      subtitle={t('invoice-detail.claims.subtitle', { policy: detail.policy.policy_number })}
    >
      {detail.claims.length === 0 ? (
        <EmptyState compact icon="shield" title={t('invoice-detail.claims.none')} />
      ) : (
        <div className="prm-stack">
          <DataTable
            caption={t('invoice-detail.claims.caption')}
            columns={columns}
            rows={detail.claims}
            rowKey={(row) => row.claim_id}
          />
          {dataSet !== 'DEMO' && (
            <p className="prm-text-muted">{t('invoice-detail.claims.testNote')}</p>
          )}
        </div>
      )}
    </Card>
  );
}
