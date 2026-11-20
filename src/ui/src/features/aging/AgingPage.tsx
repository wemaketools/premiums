/**
 * COL-02 Aging & Exposure: gross unpaid by aging bucket (chart and table, the unknown-due amount apart), and the
 * exposure by broker, product, client, channel and account owner. Each breakdown counts every unpaid invoice in
 * exactly one row, so its total row is gross unpaid. Every amount opens the invoice list with exactly its invoices.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import {
  AGING_BUCKETS,
  compareMoney,
  endpoints,
  formatMoney,
  subtractMoney,
  sumMoney,
} from '../../../../contracts/index';
import type {
  AgingBucket,
  BreakdownDimension,
  CollectionsSummary,
  ExposureRow,
  ScopeKey,
} from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { BarList } from '../../components/charts';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  QueryView,
  SkeletonBlock,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  ExportCsvButton,
  ScopeFilterBar,
  invoicesLink,
  scopeText,
  useLookups,
  useScope,
} from '../collections-scope';
import type { InvoiceCriterion, Lookups } from '../collections-scope';

/** The order of the exposure cards: the three "who dominates" breakdowns first. */
const DIMENSIONS: readonly BreakdownDimension[] = [
  'broker',
  'product',
  'client',
  'channel',
  'owner',
];

const DIMENSION_KEY: Readonly<Record<BreakdownDimension, ScopeKey>> = {
  broker: 'broker_id',
  product: 'product_id',
  client: 'client_id',
  channel: 'channel',
  owner: 'owner_id',
};

const ZERO = '0.00';

/** The share of gross unpaid, one decimal: a ratio for reading, never an amount. */
function share(amount: string, total: string): string {
  const whole = Number(total);
  return whole === 0 ? '0.0' : ((Number(amount) / whole) * 100).toFixed(1);
}

const bucketLabel = (bucket: AgingBucket): string => t(`collections-scope.bucket.${bucket}`);

const bucketAmount = (row: Pick<ExposureRow, 'buckets'>, bucket: AgingBucket): string =>
  row.buckets.find((item) => item.bucket === bucket)?.amount ?? ZERO;

/** The part of a group's unpaid that sits in no bucket: the invoices without a due date. */
const noDueAmount = (row: ExposureRow): string =>
  subtractMoney(row.unpaid, sumMoney(row.buckets.map((item) => item.amount)));

function groupName(
  lookups: Lookups | undefined,
  dimension: BreakdownDimension,
  id: string | null,
): string {
  if (lookups !== undefined) return lookups.nameOf[dimension](id);
  return id ?? t('collections-scope.unknown');
}

/** An amount that opens its invoices; a zero (nothing to open) or an unlinkable group shows as plain text. */
function MoneyLink({ amount, to }: { readonly amount: string; readonly to: string | null }) {
  if (to === null || compareMoney(amount, ZERO) === 0) return <>{formatMoney(amount)}</>;
  return <Link to={to}>{formatMoney(amount)}</Link>;
}

function CountLink({ count, to }: { readonly count: number; readonly to: string | null }) {
  if (to === null || count === 0) return <>{count}</>;
  return <Link to={to}>{count}</Link>;
}

// ---------------------------------------------------------------------------------------------------------
// Aging
// ---------------------------------------------------------------------------------------------------------

type AgingLine =
  | {
      readonly kind: 'bucket';
      readonly bucket: AgingBucket;
      readonly amount: string;
      readonly invoices: number;
    }
  | { readonly kind: 'unknown'; readonly amount: string; readonly invoices: number }
  | { readonly kind: 'total'; readonly amount: string; readonly invoices: number };

function agingLines(summary: CollectionsSummary): AgingLine[] {
  const lines: AgingLine[] = summary.aging.map((row) => ({
    kind: 'bucket',
    bucket: row.bucket,
    amount: row.amount,
    invoices: row.invoices,
  }));
  if (summary.unknown_due_invoices > 0) {
    lines.push({
      kind: 'unknown',
      amount: summary.unknown_due,
      invoices: summary.unknown_due_invoices,
    });
  }
  lines.push({ kind: 'total', amount: summary.unpaid, invoices: summary.unpaid_invoices });
  return lines;
}

function agingLineLabel(line: AgingLine): string {
  if (line.kind === 'bucket') return bucketLabel(line.bucket);
  if (line.kind === 'unknown') return t('aging.aging.unknownRow');
  return t('aging.aging.total');
}

function agingLineLink(line: AgingLine): string {
  if (line.kind === 'bucket') return invoicesLink({ bucket: line.bucket });
  if (line.kind === 'unknown') return invoicesLink({ view: 'unknown-due' });
  return invoicesLink({ view: 'unpaid' });
}

function AgingCard({ summary }: { readonly summary: CollectionsSummary }) {
  const columns: DataTableColumn<AgingLine>[] = [
    {
      id: 'bucket',
      header: t('aging.column.group'),
      cell: (line) =>
        line.kind === 'total' ? <strong>{agingLineLabel(line)}</strong> : agingLineLabel(line),
    },
    {
      id: 'invoices',
      header: t('aging.column.invoices'),
      numeric: true,
      cell: (line) => <CountLink count={line.invoices} to={agingLineLink(line)} />,
    },
    {
      id: 'amount',
      header: t('aging.column.amount'),
      numeric: true,
      cell: (line) => {
        const link = <MoneyLink amount={line.amount} to={agingLineLink(line)} />;
        return line.kind === 'total' ? <strong>{link}</strong> : link;
      },
    },
    {
      id: 'share',
      header: t('aging.column.share'),
      numeric: true,
      cell: (line) => `${share(line.amount, summary.unpaid)}%`,
    },
  ];
  return (
    <Card title={t('aging.aging.title')} subtitle={t('aging.aging.subtitle')}>
      <div className="prm-grid prm-grid--2">
        <BarList
          label={t('aging.aging.chart')}
          items={summary.aging.map((row) => ({
            id: row.bucket,
            label: bucketLabel(row.bucket),
            value: Number(row.amount),
            display: formatMoney(row.amount),
            to: invoicesLink({ bucket: row.bucket }),
            tone:
              row.bucket === '>90' ? 'danger' : row.bucket === 'current' ? 'neutral' : 'warning',
          }))}
        />
        <DataTable
          caption={t('aging.aging.caption')}
          columns={columns}
          rows={agingLines(summary)}
          rowKey={(line) => (line.kind === 'bucket' ? line.bucket : line.kind)}
        />
      </div>
      {summary.unknown_due_invoices > 0 && (
        <p className="prm-text-muted">
          {t('aging.aging.unknown', {
            amount: formatMoney(summary.unknown_due),
            count: summary.unknown_due_invoices,
          })}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------
// Exposure
// ---------------------------------------------------------------------------------------------------------

type ExposureLine =
  | { readonly kind: 'group'; readonly row: ExposureRow }
  /** The groups past the first few, folded into one row (its amounts are their sums). */
  | { readonly kind: 'rest'; readonly row: ExposureRow; readonly count: number }
  | { readonly kind: 'total' };

/** Groups shown before the rest is folded into one row. */
const SHOWN = 10;

function foldRows(rows: readonly ExposureRow[]): ExposureRow {
  const sum = (pick: (row: ExposureRow) => string): string => sumMoney(rows.map(pick));
  return {
    id: null,
    unpaid: sum((row) => row.unpaid),
    overdue: sum((row) => row.overdue),
    over_30: sum((row) => row.over_30),
    invoices: rows.reduce((count, row) => count + row.invoices, 0),
    buckets: AGING_BUCKETS.map((bucket) => ({
      bucket,
      amount: sum((row) => bucketAmount(row, bucket)),
      invoices: rows.reduce(
        (count, row) => count + (row.buckets.find((item) => item.bucket === bucket)?.invoices ?? 0),
        0,
      ),
    })),
  };
}

interface ExposureContext {
  readonly summary: CollectionsSummary;
  readonly dimension: BreakdownDimension;
  readonly lookups: Lookups | undefined;
  readonly reviewDays: number;
  readonly withNoDue: boolean;
}

/** The link of a cell: the group's dimension on top of the criterion; a group without an id cannot be opened. */
function cellLink(
  line: ExposureLine,
  dimension: BreakdownDimension,
  criterion: InvoiceCriterion,
): string | null {
  if (line.kind === 'total') return invoicesLink(criterion);
  if (line.kind === 'rest' || line.row.id === null) return null;
  return invoicesLink({
    ...criterion,
    dimension: { key: DIMENSION_KEY[dimension], value: line.row.id },
  });
}

function exposureColumns({
  summary,
  dimension,
  lookups,
  reviewDays,
  withNoDue,
}: ExposureContext): DataTableColumn<ExposureLine>[] {
  const strongIfTotal = (line: ExposureLine, content: ReactNode): ReactNode =>
    line.kind === 'total' ? <strong>{content}</strong> : content;
  const money = (
    id: string,
    header: string,
    amount: (line: ExposureLine) => string,
    criterion: InvoiceCriterion,
  ): DataTableColumn<ExposureLine> => ({
    id,
    header,
    numeric: true,
    cell: (line) =>
      strongIfTotal(
        line,
        <MoneyLink amount={amount(line)} to={cellLink(line, dimension, criterion)} />,
      ),
  });
  const columns: DataTableColumn<ExposureLine>[] = [
    {
      id: 'group',
      header: t(`aging.exposure.group.${dimension}`),
      width: '12rem',
      cell: (line) => {
        if (line.kind === 'total') return <strong>{t('aging.exposure.total')}</strong>;
        if (line.kind === 'rest') return t('aging.exposure.rest', { count: line.count });
        const name = groupName(lookups, dimension, line.row.id);
        const to = cellLink(line, dimension, { view: 'unpaid' });
        return to === null ? name : <Link to={to}>{name}</Link>;
      },
    },
    money(
      'unpaid',
      t('aging.column.unpaid'),
      (line) => (line.kind === 'total' ? summary.unpaid : line.row.unpaid),
      {
        view: 'unpaid',
      },
    ),
    {
      id: 'share',
      header: t('aging.column.share'),
      numeric: true,
      cell: (line) =>
        strongIfTotal(
          line,
          `${share(line.kind === 'total' ? summary.unpaid : line.row.unpaid, summary.unpaid)}%`,
        ),
    },
    money(
      'overdue',
      t('aging.column.overdue'),
      (line) => (line.kind === 'total' ? summary.overdue : line.row.overdue),
      { view: 'overdue' },
    ),
    money(
      'over30',
      t('aging.column.over30', { days: reviewDays }),
      (line) => (line.kind === 'total' ? summary.over_30 : line.row.over_30),
      { view: 'over-30' },
    ),
    ...AGING_BUCKETS.map((bucket) =>
      money(
        `bucket-${bucket}`,
        bucketLabel(bucket),
        (line) =>
          bucketAmount(line.kind === 'total' ? { buckets: summary.aging } : line.row, bucket),
        { bucket },
      ),
    ),
  ];
  if (withNoDue) {
    columns.push(
      money(
        'noDue',
        t('aging.column.noDue'),
        (line) => (line.kind === 'total' ? summary.unknown_due : noDueAmount(line.row)),
        { view: 'unknown-due' },
      ),
    );
  }
  columns.push({
    id: 'invoices',
    header: t('aging.column.invoices'),
    numeric: true,
    cell: (line) =>
      strongIfTotal(
        line,
        <CountLink
          count={line.kind === 'total' ? summary.unpaid_invoices : line.row.invoices}
          to={cellLink(line, dimension, { view: 'unpaid' })}
        />,
      ),
  });
  return columns;
}

function ExposureCard(context: ExposureContext) {
  const { summary, dimension, lookups } = context;
  const rows = summary.breakdowns[dimension] ?? [];
  const largest = rows[0];
  const nullGroup = rows.find((row) => row.id === null);
  const [expanded, setExpanded] = useState(false);
  const folded = !expanded && rows.length > SHOWN + 1;
  const shown = folded ? rows.slice(0, SHOWN) : rows;
  const rest = rows.slice(SHOWN);
  const lines: ExposureLine[] = [
    ...shown.map((row) => ({ kind: 'group' as const, row })),
    ...(folded ? [{ kind: 'rest' as const, row: foldRows(rest), count: rest.length }] : []),
    { kind: 'total' },
  ];
  return (
    <Card title={t(`aging.exposure.title.${dimension}`)} subtitle={t('aging.exposure.subtitle')}>
      <div className="prm-stack">
        {largest !== undefined && (
          <p className="prm-text-muted">
            {t('aging.exposure.top', {
              name: groupName(lookups, dimension, largest.id),
              share: `${share(largest.unpaid, summary.unpaid)}%`,
              amount: formatMoney(largest.unpaid),
            })}
          </p>
        )}
        <DataTable
          caption={t(`aging.exposure.caption.${dimension}`)}
          columns={exposureColumns(context)}
          rows={lines}
          rowKey={(line) => (line.kind === 'group' ? (line.row.id ?? 'none') : line.kind)}
        />
        {rows.length > SHOWN + 1 && (
          <div>
            <Button size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded
                ? t('aging.exposure.showTop', { count: SHOWN })
                : t('aging.exposure.showAll', { count: rows.length })}
            </Button>
          </div>
        )}
        {nullGroup !== undefined && (
          <p className="prm-text-muted">
            {t('aging.exposure.nullGroup', {
              name: groupName(lookups, dimension, null),
              dimension: t(`aging.exposure.group.${dimension}`).toLowerCase(),
            })}
          </p>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------------------------------------

function agingTable(
  summary: CollectionsSummary,
  lookups: Lookups | undefined,
  scope: string,
  reviewDays: number,
): string[][] {
  const withNoDue = summary.unknown_due_invoices > 0;
  const header = [
    t('aging.csv.section'),
    t('aging.csv.group'),
    t('aging.csv.groupId'),
    t('aging.csv.invoices'),
    t('aging.csv.unpaid'),
    t('aging.csv.share'),
    t('aging.csv.overdue'),
    t('aging.csv.over30', { days: reviewDays }),
    ...AGING_BUCKETS.map((bucket) => t('aging.csv.bucket', { bucket: bucketLabel(bucket) })),
    ...(withNoDue ? [t('aging.csv.noDue')] : []),
  ];
  const blanks = header.length - 6;
  const aging = agingLines(summary).map((line) => [
    t('aging.csv.aging'),
    agingLineLabel(line),
    line.kind === 'bucket' ? line.bucket : line.kind === 'unknown' ? 'unknown-due' : '',
    String(line.invoices),
    line.amount,
    share(line.amount, summary.unpaid),
    ...Array.from({ length: blanks }, () => ''),
  ]);
  const exposure = DIMENSIONS.flatMap((dimension) => {
    const section = t(`aging.exposure.title.${dimension}`);
    const rows = (summary.breakdowns[dimension] ?? []).map((row) => [
      section,
      groupName(lookups, dimension, row.id),
      row.id ?? '',
      String(row.invoices),
      row.unpaid,
      share(row.unpaid, summary.unpaid),
      row.overdue,
      row.over_30,
      ...AGING_BUCKETS.map((bucket) => bucketAmount(row, bucket)),
      ...(withNoDue ? [noDueAmount(row)] : []),
    ]);
    const total = [
      section,
      t('aging.exposure.total'),
      '',
      String(summary.unpaid_invoices),
      summary.unpaid,
      share(summary.unpaid, summary.unpaid),
      summary.overdue,
      summary.over_30,
      ...AGING_BUCKETS.map((bucket) => bucketAmount({ buckets: summary.aging }, bucket)),
      ...(withNoDue ? [summary.unknown_due] : []),
    ];
    return [...rows, total];
  });
  const line = (label: string, value: string): string[] => [
    label,
    value,
    ...Array.from({ length: header.length - 2 }, () => ''),
  ];
  return [
    line(t('aging.csv.asOf'), summary.as_of),
    line(t('aging.csv.scope'), scope),
    header,
    ...aging,
    ...exposure,
  ];
}

// ---------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------

export default function AgingPage() {
  const scope = useScope();
  const lookups = useLookups();
  const summary = useApiQuery(
    endpoints.collectionsSummary,
    { query: scope.query },
    { keepPrevious: true },
  );
  const config = useApiQuery(endpoints.ruleConfigGet, {});
  const reviewDays = config.data?.config.collections.overdue_30_review_days ?? 30;
  const data = summary.data?.summary;
  const scopeLine = scopeText(scope.query, lookups.lookups);
  const table = useMemo(
    () =>
      data === undefined || lookups.lookups === undefined
        ? undefined
        : agingTable(data, lookups.lookups, scopeLine, reviewDays),
    [data, lookups.lookups, scopeLine, reviewDays],
  );

  return (
    <div className="prm-page">
      <PageHeader
        title={t('aging.title')}
        subtitle={t('aging.subtitle')}
        actions={
          <ExportCsvButton
            screen="aging"
            queries={[summary]}
            optionalQueries={[config]}
            table={table}
          />
        }
      />
      <ScopeFilterBar scope={scope} lookups={lookups} />
      <QueryView
        query={summary}
        loading={
          <Card data-state="loading">
            <SkeletonBlock lines={6} />
          </Card>
        }
        isEmpty={(answer) => answer.summary.unpaid_invoices === 0}
        empty={
          <Card data-state="empty">
            <EmptyState
              icon="barChart"
              title={t('aging.empty.title')}
              description={
                scope.filtered ? t('aging.empty.filteredDescription') : t('aging.empty.description')
              }
            />
          </Card>
        }
      >
        {(answer) => (
          <div className="prm-page" aria-busy={summary.isFetching}>
            <h2 className="prm-card-title">
              {t('aging.asOf', { date: formatCalendarDate(answer.summary.as_of) })}
            </h2>
            <AgingCard summary={answer.summary} />
            {DIMENSIONS.map((dimension) => (
              <ExposureCard
                key={dimension}
                summary={answer.summary}
                dimension={dimension}
                lookups={lookups.lookups}
                reviewDays={reviewDays}
                withNoDue={answer.summary.unknown_due_invoices > 0}
              />
            ))}
          </div>
        )}
      </QueryView>
    </div>
  );
}
