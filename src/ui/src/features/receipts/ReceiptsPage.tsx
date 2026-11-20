/**
 * Bank receipts and unapplied cash (COL-FR-05, COL-FR-07): every receipt with its received date, bank reference,
 * status, gross amount, what has been applied to invoices and what is still unapplied. The view (all, received in
 * the cash period, unapplied) lives in the URL, so the Overview "Cash received" and "Unapplied cash" cards open
 * exactly the receipts they count; the totals row is the API's, over exactly the listed receipts.
 */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import type { z } from 'zod';

import { RECEIPT_VIEWS, endpoints, formatMoney } from '../../../../contracts/index';
import type { ReceiptFacts, ReceiptView, ReceiptsQuery } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector } from '../../app/hooks';
import {
  Banner,
  Card,
  Chip,
  DataTable,
  EmptyState,
  PageHeader,
  QuickRanges,
  Reference,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  ExportCsvButton,
  ScopeFilterBar,
  invoicePath,
  periodLine,
  receiptPath,
  useLookups,
  useScope,
} from '../collections-scope';
import { contextRows } from '../exceptions/csvContext';

type ReceiptsAnswer = z.infer<typeof endpoints.receiptsList.response>;

function receiptsTable(answer: ReceiptsAnswer, context: string[][]): string[][] {
  const scoped = answer.filtered;
  const header = [
    t('receipts.csv.receipt'),
    t('receipts.csv.received'),
    t('receipts.csv.bankRef'),
    t('receipts.csv.status'),
    t('receipts.csv.cash'),
    t('receipts.csv.gross'),
    t('receipts.csv.applied'),
    t('receipts.csv.unapplied'),
    ...(scoped ? [t('receipts.csv.inScope')] : []),
    t('receipts.csv.invoices'),
  ];
  const yesNo = (value: boolean): string => (value ? t('receipts.csv.yes') : t('receipts.csv.no'));
  return [
    ...context,
    header,
    ...answer.items.map((item) => [
      item.receipt_id,
      item.received_at,
      item.bank_ref,
      item.status,
      yesNo(item.is_cash),
      item.gross_amount,
      item.allocated,
      item.unapplied,
      ...(scoped ? [item.in_scope] : []),
      item.invoice_ids.join('; '),
    ]),
    [
      t('receipts.csv.total', { count: answer.items.length }),
      '',
      '',
      '',
      '',
      answer.totals.gross,
      answer.totals.allocated,
      answer.totals.unapplied,
      ...(scoped ? [answer.totals.in_scope] : []),
      '',
    ],
  ];
}

export default function ReceiptsPage() {
  const scope = useScope();
  const lookups = useLookups();
  const asOf = useAppSelector((state) => state.dataContext.asOf);
  const [params, setParams] = useSearchParams();
  const view: ReceiptView = RECEIPT_VIEWS.find((option) => option === params.get('view')) ?? 'all';
  const query: ReceiptsQuery = { ...scope.query, period: scope.period, view };
  const receipts = useApiQuery(endpoints.receiptsList, { query }, { keepPrevious: true });
  const answer = receipts.data;

  const table = useMemo(
    () =>
      answer === undefined
        ? undefined
        : receiptsTable(
            answer,
            contextRows(asOf, answer.period, scope, lookups.lookups, answer.filtered ? 10 : 9),
          ),
    // The scope rows follow the query values, which the list already depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answer, lookups.lookups, asOf],
  );

  const setView = (next: string): void => {
    const search = new URLSearchParams(params);
    if (next === 'all') search.delete('view');
    else search.set('view', next);
    setParams(search, { replace: true });
  };

  const filtered = answer?.filtered ?? scope.filtered;
  const columns: DataTableColumn<ReceiptFacts>[] = [
    {
      id: 'receipt',
      header: t('receipts.column.receipt'),
      cell: (item) => <Reference value={item.receipt_id} to={receiptPath(item.receipt_id)} />,
    },
    {
      id: 'received',
      header: t('receipts.column.received'),
      cell: (item) => formatCalendarDate(item.received_at),
    },
    {
      id: 'bankRef',
      header: t('receipts.column.bankRef'),
      cell: (item) => <span className="prm-mono">{item.bank_ref}</span>,
    },
    {
      id: 'status',
      header: t('receipts.column.status'),
      cell: (item) => (
        <span className="prm-inline">
          <Chip tone={item.is_cash ? 'success' : 'neutral-outlined'} size="sm">
            {item.status}
          </Chip>
          {!item.is_cash && (
            <Chip tone="warning" size="sm">
              {t('receipts.notCash')}
            </Chip>
          )}
        </span>
      ),
    },
    {
      id: 'gross',
      header: t('receipts.column.gross'),
      numeric: true,
      cell: (item) => formatMoney(item.gross_amount),
    },
    {
      id: 'applied',
      header: t('receipts.column.applied'),
      numeric: true,
      cell: (item) => formatMoney(item.allocated),
    },
    {
      id: 'unapplied',
      header: t('receipts.column.unapplied'),
      numeric: true,
      cell: (item) => formatMoney(item.unapplied),
    },
    ...(filtered
      ? [
          {
            id: 'inScope',
            header: t('receipts.column.inScope'),
            numeric: true,
            cell: (item: ReceiptFacts) => formatMoney(item.in_scope),
          },
        ]
      : []),
    {
      id: 'invoices',
      header: t('receipts.column.invoices'),
      cell: (item) =>
        item.invoice_ids.length === 0 ? (
          <span className="prm-text-muted">{t('receipts.noInvoices')}</span>
        ) : (
          <span className="prm-inline">
            {item.invoice_ids.map((id) => (
              <Reference key={id} value={id} to={invoicePath(id)} />
            ))}
          </span>
        ),
    },
  ];

  let empty: ReactNode;
  if (filtered) {
    empty = (
      <EmptyState
        compact
        icon="filter"
        title={t('receipts.empty.filtered')}
        description={t('receipts.empty.filteredDescription')}
      />
    );
  } else if (view !== 'all') {
    empty = (
      <EmptyState
        compact
        icon="receipt"
        title={t(`receipts.empty.${view}`)}
        description={t('receipts.empty.viewDescription')}
      />
    );
  } else {
    empty = <EmptyState compact icon="receipt" title={t('receipts.empty.none')} />;
  }

  return (
    <div className="prm-page">
      <PageHeader
        title={t('receipts.title')}
        subtitle={t('receipts.subtitle')}
        actions={<ExportCsvButton screen="receipts" queries={[receipts]} table={table} />}
      />
      <ScopeFilterBar scope={scope} lookups={lookups} withPeriod />
      <Banner tone="info" title={t('receipts.explain.title')}>
        <ul className="prm-list-plain">
          <li>{t('receipts.explain.once')}</li>
          <li>{t('receipts.explain.allocation')}</li>
          <li>{t('receipts.explain.failed')}</li>
          {filtered && <li>{t('receipts.explain.filtered')}</li>}
        </ul>
      </Banner>
      <Card
        flush
        title={t('receipts.table.title')}
        subtitle={
          answer === undefined
            ? undefined
            : view === 'in-period'
              ? t('receipts.table.period', { window: periodLine(answer.period) })
              : t(`receipts.table.${view}`)
        }
        actions={
          <QuickRanges
            label={t('receipts.view.label')}
            selected={view}
            onSelect={setView}
            options={RECEIPT_VIEWS.map((option) => ({
              id: option,
              label: t(`receipts.view.${option}`),
            }))}
          />
        }
        footer={
          answer === undefined || answer.items.length === 0 ? undefined : (
            <dl className="prm-dl" aria-label={t('receipts.totals.label')}>
              <div>
                <dt>{t('receipts.totals.count')}</dt>
                <dd>{t('receipts.totals.receipts', { count: answer.items.length })}</dd>
              </div>
              <div>
                <dt>{t('receipts.totals.gross')}</dt>
                <dd>{formatMoney(answer.totals.gross)}</dd>
              </div>
              <div>
                <dt>{t('receipts.totals.applied')}</dt>
                <dd>{formatMoney(answer.totals.allocated)}</dd>
              </div>
              <div>
                <dt>{t('receipts.totals.unapplied')}</dt>
                <dd>{formatMoney(answer.totals.unapplied)}</dd>
              </div>
              {answer.filtered && (
                <div>
                  <dt>{t('receipts.totals.inScope')}</dt>
                  <dd>{formatMoney(answer.totals.in_scope)}</dd>
                </div>
              )}
            </dl>
          )
        }
      >
        <DataTable
          caption={t('receipts.table.caption')}
          columns={columns}
          rows={answer?.items}
          rowKey={(item) => item.receipt_id}
          loading={receipts.isFetching}
          error={receipts.error}
          onRetry={receipts.reload}
          empty={empty}
        />
      </Card>
    </div>
  );
}
