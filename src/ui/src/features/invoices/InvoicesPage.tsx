/**
 * The invoice list every collections figure drills to. Its criterion comes from the address (view, bucket, priority,
 * rule and the dimension of a breakdown row), on top of the shared filters; the chips name it and remove its parts,
 * the selects change it, and the total row comes from the API's totals over exactly the listed invoices, so it
 * equals the figure that opened the list. The CSV holds every listed row, the total row, the as-of date and scope.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import {
  AGING_BUCKETS,
  COLLECTION_PRIORITIES,
  INVOICE_VIEWS,
  RULE_IDS,
  SCOPE_KEYS,
  compareMoney,
  endpoints,
  formatMoney,
} from '../../../../contracts/index';
import type { InvoiceRow, ScopeKey } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector } from '../../app/hooks';
import {
  Banner,
  Card,
  Chip,
  DataTable,
  EmptyState,
  IconButton,
  PageHeader,
  QueryView,
  Reference,
  Select,
  SkeletonBlock,
} from '../../components/ui';
import type { DataTableColumn, DataTableSort } from '../../components/ui';
import { EMPTY_VALUE, formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  BucketChip,
  ExportCsvButton,
  PriorityChip,
  RuleChip,
  ScopeFilterBar,
  formatMoment,
  invoicePath,
  ruleLabel,
  scopeText,
  useLookups,
  useScope,
} from '../collections-scope';
import type { Lookups } from '../collections-scope';
import { hasCriterion, listQuery, readCriterion } from './criterion';
import type { CriterionKey, ListCriterion } from './criterion';

const FILTER_FIELD: Readonly<Record<ScopeKey, string>> = {
  product_id: 'product',
  broker_id: 'broker',
  channel: 'channel',
  owner_id: 'owner',
  client_id: 'client',
  policy_id: 'policy',
};

const fieldLabel = (key: ScopeKey): string => t(`collections-scope.filters.${FILTER_FIELD[key]}`);

const valueLabel = (lookups: Lookups | undefined, key: ScopeKey, value: string): string =>
  lookups?.filterValue(key, value) ?? value;

interface CriterionChip {
  /** The address parameter the chip removes. */
  readonly param: string;
  readonly label: string;
}

function criterionChips(criterion: ListCriterion, lookups: Lookups | undefined): CriterionChip[] {
  const chips: CriterionChip[] = [];
  if (criterion.view !== undefined && criterion.view !== 'all') {
    chips.push({
      param: 'view',
      label: t('invoices.criterion.view', { value: t(`invoices.view.${criterion.view}`) }),
    });
  }
  if (criterion.bucket !== undefined) {
    chips.push({
      param: 'bucket',
      label: t('invoices.criterion.bucket', {
        value: t(`collections-scope.bucket.${criterion.bucket}`),
      }),
    });
  }
  if (criterion.priority !== undefined) {
    chips.push({
      param: 'priority',
      label: t('invoices.criterion.priority', {
        value: t(`collections-scope.priority.${criterion.priority}`),
      }),
    });
  }
  if (criterion.rule !== undefined) {
    chips.push({
      param: 'rule',
      label: t('invoices.criterion.rule', {
        value: `${RULE_IDS[criterion.rule]} ${ruleLabel(criterion.rule)}`,
      }),
    });
  }
  for (const key of SCOPE_KEYS) {
    const value = criterion.dimensions[key];
    if (value === undefined) continue;
    chips.push({
      param: key,
      label: t('invoices.criterion.dimension', {
        field: fieldLabel(key),
        value: valueLabel(lookups, key, value),
      }),
    });
  }
  return chips;
}

// ---------------------------------------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------------------------------------

type Line = { readonly kind: 'invoice'; readonly row: InvoiceRow } | { readonly kind: 'total' };

interface Names {
  readonly client: (row: InvoiceRow) => string;
  readonly policy: (row: InvoiceRow) => string;
  readonly broker: (row: InvoiceRow) => string;
  readonly product: (row: InvoiceRow) => string;
}

function namesOf(lookups: Lookups | undefined): Names {
  return {
    client: (row) => lookups?.nameOf.client(row.facts.client_id) ?? row.facts.client_id,
    policy: (row) => lookups?.nameOf.policy(row.facts.policy_id) ?? row.facts.policy_id,
    broker: (row) =>
      lookups?.nameOf.broker(row.facts.broker_id) ?? row.facts.broker_id ?? EMPTY_VALUE,
    product: (row) => lookups?.nameOf.product(row.facts.product_id) ?? row.facts.product_id,
  };
}

const agingText = (row: InvoiceRow): string => {
  const { facts } = row;
  if (facts.aging_state === 'paid') return t('invoices.aging.paid');
  if (facts.aging_state === 'unknown' || facts.bucket === null) return t('invoices.aging.unknown');
  return t(`collections-scope.bucket.${facts.bucket}`);
};

const flagsText = (row: InvoiceRow): string =>
  row.facts.flags.map((flag) => `${RULE_IDS[flag.rule]} ${ruleLabel(flag.rule)}`).join('; ');

function AgingCell({ row }: { readonly row: InvoiceRow }) {
  const { facts } = row;
  if (facts.aging_state === 'paid') {
    return (
      <Chip tone="success" size="sm">
        {t('invoices.aging.paid')}
      </Chip>
    );
  }
  if (facts.aging_state === 'unknown' || facts.bucket === null) {
    return (
      <Chip tone="warning" size="sm" outlined>
        {t('invoices.aging.unknown')}
      </Chip>
    );
  }
  return <BucketChip bucket={facts.bucket} />;
}

/** Nulls (no due date, not aged) sort last either way. */
function compareNullable<T>(
  a: T | null,
  b: T | null,
  compare: (x: T, y: T) => number,
  dir: number,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return compare(a, b) * dir;
}

const byId = (a: InvoiceRow, b: InvoiceRow): number =>
  a.invoice_id.localeCompare(b.invoice_id, 'en', { numeric: true });

function sortRows(rows: readonly InvoiceRow[], sort: DataTableSort | null): InvoiceRow[] {
  if (sort === null) return [...rows];
  const dir = sort.dir === 'asc' ? 1 : -1;
  const compare = (a: InvoiceRow, b: InvoiceRow): number => {
    switch (sort.key) {
      case 'invoice':
        return byId(a, b) * dir;
      case 'due':
        return compareNullable(
          a.facts.due_date,
          b.facts.due_date,
          (x, y) => x.localeCompare(y),
          dir,
        );
      case 'days':
        return compareNullable(a.facts.days_overdue, b.facts.days_overdue, (x, y) => x - y, dir);
      case 'outstanding':
        return compareMoney(a.facts.outstanding, b.facts.outstanding) * dir;
      default:
        return 0;
    }
  };
  return [...rows].sort((a, b) => compare(a, b) || byId(a, b));
}

function columnsOf(names: Names, count: number, totals: InvoiceTotals): DataTableColumn<Line>[] {
  const forInvoice =
    (render: (row: InvoiceRow) => ReactNode) =>
    (line: Line): ReactNode =>
      line.kind === 'invoice' ? render(line.row) : null;
  return [
    {
      id: 'invoice',
      header: t('invoices.column.invoice'),
      sortable: true,
      cell: (line) =>
        line.kind === 'total' ? (
          <strong>{t('invoices.table.total', { count })}</strong>
        ) : (
          <Reference value={line.row.invoice_id} to={invoicePath(line.row.invoice_id)} />
        ),
    },
    {
      id: 'client',
      header: t('invoices.column.clientPolicy'),
      cell: forInvoice((row) => (
        <>
          {names.client(row)}
          <span className="prm-cell-sub prm-mono">{names.policy(row)}</span>
        </>
      )),
    },
    {
      id: 'broker',
      header: t('invoices.column.brokerProduct'),
      cell: forInvoice((row) => (
        <>
          {names.broker(row)}
          <span className="prm-cell-sub">{names.product(row)}</span>
        </>
      )),
    },
    {
      id: 'due',
      header: t('invoices.column.due'),
      sortable: true,
      cell: forInvoice((row) => formatMoment(row.facts.due_date)),
    },
    {
      id: 'days',
      header: t('invoices.column.days'),
      sortable: true,
      numeric: true,
      cell: forInvoice((row) =>
        row.facts.days_overdue === null ? EMPTY_VALUE : String(row.facts.days_overdue),
      ),
    },
    {
      id: 'aging',
      header: t('invoices.column.agingPriority'),
      cell: forInvoice((row) => (
        <span className="prm-stack prm-stack--tight prm-stack--start">
          <AgingCell row={row} />
          {row.facts.priority === null ? null : <PriorityChip priority={row.facts.priority} />}
        </span>
      )),
    },
    {
      id: 'issued',
      header: t('invoices.column.issued'),
      numeric: true,
      cell: (line) =>
        line.kind === 'total' ? (
          <strong>{formatMoney(totals.issued)}</strong>
        ) : (
          formatMoney(line.row.facts.issued)
        ),
    },
    {
      id: 'applied',
      header: t('invoices.column.applied'),
      numeric: true,
      cell: (line) =>
        line.kind === 'total' ? (
          <strong>{formatMoney(totals.applied)}</strong>
        ) : (
          formatMoney(line.row.facts.applied)
        ),
    },
    {
      id: 'outstanding',
      header: t('invoices.column.outstanding'),
      sortable: true,
      numeric: true,
      cell: (line) =>
        line.kind === 'total' ? (
          <strong>{formatMoney(totals.outstanding)}</strong>
        ) : (
          formatMoney(line.row.facts.outstanding)
        ),
    },
    {
      id: 'flags',
      header: t('invoices.column.flags'),
      cell: forInvoice((row) =>
        row.facts.flags.length === 0 ? (
          EMPTY_VALUE
        ) : (
          <span className="prm-stack prm-stack--tight prm-stack--start">
            {row.facts.flags.map((flag) => (
              <RuleChip key={flag.rule} rule={flag.rule} />
            ))}
          </span>
        ),
      ),
    },
  ];
}

interface InvoiceTotals {
  readonly issued: string;
  readonly applied: string;
  readonly outstanding: string;
}

function invoicesTable(
  rows: readonly InvoiceRow[],
  totals: InvoiceTotals,
  names: Names,
  lines: { readonly asOf: string; readonly scope: string; readonly showing: string },
): string[][] {
  const header = [
    t('invoices.column.invoice'),
    t('invoices.column.client'),
    t('invoices.column.policy'),
    t('invoices.column.broker'),
    t('invoices.column.product'),
    t('invoices.column.due'),
    t('invoices.column.days'),
    t('invoices.column.aging'),
    t('invoices.column.priority'),
    t('invoices.csv.issued'),
    t('invoices.csv.applied'),
    t('invoices.csv.outstanding'),
    t('invoices.column.flags'),
  ];
  const pad = (first: readonly string[]): string[] => [
    ...first,
    ...Array.from({ length: header.length - first.length }, () => ''),
  ];
  return [
    pad([t('invoices.csv.asOf'), lines.asOf]),
    pad([t('invoices.csv.scope'), lines.scope]),
    pad([t('invoices.csv.showing'), lines.showing]),
    header,
    ...rows.map((row) => [
      row.invoice_id,
      names.client(row),
      names.policy(row),
      names.broker(row),
      names.product(row),
      row.facts.due_date ?? t('collections-scope.unknown'),
      row.facts.days_overdue === null ? '' : String(row.facts.days_overdue),
      agingText(row),
      row.facts.priority === null ? '' : t(`collections-scope.priority.${row.facts.priority}`),
      row.facts.issued,
      row.facts.applied,
      row.facts.outstanding,
      flagsText(row),
    ]),
    [
      t('invoices.table.total', { count: rows.length }),
      ...Array.from({ length: 8 }, () => ''),
      totals.issued,
      totals.applied,
      totals.outstanding,
      '',
    ],
  ];
}

// ---------------------------------------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------------------------------------

export default function InvoicesPage() {
  const scope = useScope();
  const lookups = useLookups();
  const asOf = useAppSelector((state) => state.dataContext.asOf);
  const [params, setParams] = useSearchParams();
  const criterion = useMemo(() => readCriterion(params), [params]);
  const query = listQuery(scope.query, criterion);
  const list = useApiQuery(endpoints.invoicesList, { query }, { keepPrevious: true });
  const [sort, setSort] = useState<DataTableSort | null>(null);
  const names = useMemo(() => namesOf(lookups.lookups), [lookups.lookups]);

  const chips = criterionChips(criterion, lookups.lookups);
  const showing =
    chips.length === 0 ? t('invoices.criterion.all') : chips.map((chip) => chip.label).join('; ');
  const effective: Partial<Record<ScopeKey, string>> = { ...scope.query, ...criterion.dimensions };
  const scopeLine = scopeText(effective, lookups.lookups);
  const overrides = SCOPE_KEYS.flatMap((key) => {
    const fromLink = criterion.dimensions[key];
    const filter = scope.filters[key];
    return fromLink !== undefined && filter !== null && filter !== fromLink
      ? [{ key, fromLink, filter }]
      : [];
  });

  const update = (change: (next: URLSearchParams) => void): void => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      change(next);
      return next;
    });
  };
  const setParam = (key: CriterionKey, value: string): void =>
    update((next) => {
      if (value === '' || (key === 'view' && value === 'all')) next.delete(key);
      else next.set(key, value);
    });

  const data = list.data;
  const rows = useMemo(
    () => (data === undefined ? undefined : sortRows(data.items, sort)),
    [data, sort],
  );
  const table =
    data === undefined || rows === undefined || lookups.lookups === undefined
      ? undefined
      : invoicesTable(rows, data.totals, names, { asOf: data.as_of, scope: scopeLine, showing });
  const narrowed = hasCriterion(criterion) || scope.filtered;
  const criterionText = [showing, ...(Object.keys(effective).length === 0 ? [] : [scopeLine])].join(
    '; ',
  );

  return (
    <div className="prm-page">
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        actions={<ExportCsvButton screen="invoices" queries={[list]} table={table} />}
      />
      <ScopeFilterBar
        scope={scope}
        lookups={lookups}
        extra={{
          active: hasCriterion(criterion),
          clear: () => setParams(new URLSearchParams()),
          fields: (
            <>
              <Select
                label={t('invoices.select.view')}
                value={criterion.view ?? 'all'}
                options={INVOICE_VIEWS.map((view) => ({
                  value: view,
                  label: t(`invoices.view.${view}`),
                }))}
                onChange={(value) => setParam('view', value)}
              />
              <Select
                label={t('invoices.select.bucket')}
                placeholder={t('invoices.select.allBuckets')}
                value={criterion.bucket ?? ''}
                options={AGING_BUCKETS.map((bucket) => ({
                  value: bucket,
                  label: t(`collections-scope.bucket.${bucket}`),
                }))}
                onChange={(value) => setParam('bucket', value)}
              />
              <Select
                label={t('invoices.select.priority')}
                placeholder={t('invoices.select.allPriorities')}
                value={criterion.priority ?? ''}
                options={COLLECTION_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: t(`collections-scope.priority.${priority}`),
                }))}
                onChange={(value) => setParam('priority', value)}
              />
            </>
          ),
        }}
      />
      {chips.length > 0 && (
        <ul className="prm-chip-row" aria-label={t('invoices.criterion.label')}>
          {chips.map((chip) => (
            <li key={chip.param}>
              <Chip tone="info" size="sm">
                {chip.label}
                <IconButton
                  icon="x"
                  size="sm"
                  variant="ghost"
                  label={t('invoices.criterion.remove', { name: chip.label })}
                  onClick={() => update((next) => next.delete(chip.param))}
                />
              </Chip>
            </li>
          ))}
        </ul>
      )}
      {overrides.map(({ key, fromLink, filter }) => (
        <p key={key} className="prm-text-muted">
          {t('invoices.criterion.overrides', {
            field: fieldLabel(key),
            value: valueLabel(lookups.lookups, key, fromLink),
            filter: valueLabel(lookups.lookups, key, filter),
          })}
        </p>
      ))}
      {criterion.ignored.length > 0 && (
        <Banner tone="warning">
          {t('invoices.criterion.ignored', { values: criterion.ignored.join(', ') })}
        </Banner>
      )}
      <QueryView
        query={list}
        loading={
          <Card data-state="loading">
            <SkeletonBlock lines={6} />
          </Card>
        }
        isEmpty={(answer) => answer.items.length === 0}
        empty={
          <Card data-state="empty">
            <EmptyState
              icon="fileText"
              title={t('invoices.empty.title')}
              description={
                narrowed
                  ? t('invoices.empty.description', { criterion: criterionText })
                  : t('invoices.empty.noData')
              }
            />
          </Card>
        }
      >
        {(answer) => (
          <Card
            title={t('invoices.table.title', { count: answer.items.length })}
            subtitle={t('invoices.table.asOf', { date: formatCalendarDate(asOf) })}
            aria-busy={list.isFetching}
          >
            <div className="prm-stack">
              <DataTable
                caption={t('invoices.table.caption')}
                columns={columnsOf(names, answer.items.length, answer.totals)}
                rows={[
                  ...(rows ?? answer.items).map((row) => ({ kind: 'invoice' as const, row })),
                  { kind: 'total' as const },
                ]}
                rowKey={(line) => (line.kind === 'total' ? 'total' : line.row.invoice_id)}
                sort={sort}
                onSortChange={setSort}
              />
              {answer.items.some((row) => row.facts.flags.length > 0) && (
                <p className="prm-text-muted">{t('collections-scope.advisory')}</p>
              )}
            </div>
          </Card>
        )}
      </QueryView>
    </div>
  );
}
