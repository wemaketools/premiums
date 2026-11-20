/** The sections of the finance digest, each a card with a plain table so the sheet reads on screen and on paper. */
import {
  RULE_CODES,
  RULE_IDS,
  SEVERITIES,
  compareMoney,
  formatMoney,
  sumMoney,
} from '../../../../contracts/index';
import type {
  BreakdownDimension,
  CollectionException,
  CollectionsSummary,
  ExposureRow,
  RuleCode,
  ScopeKey,
  Severity,
  TaskListItem,
} from '../../../../contracts/index';
import type { ApiError } from '../../api/client';
import { Card, CardLink, Chip, DataTable, EmptyState, Reference } from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { EMPTY_VALUE } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  ACTIONS_PATH,
  TaskStatusChip,
  exceptionsLink,
  invoicePath,
  invoicesLink,
  receiptPath,
  receiptsLink,
  ruleLabel,
} from '../collections-scope';
import type { Lookups } from '../collections-scope';
import { TaskDue } from '../collections-tasks';

interface KpiRow {
  readonly id: string;
  readonly label: string;
  readonly amount: string | null;
  readonly count: string;
  readonly definition: string;
  readonly to?: string;
}

function kpiRows(summary: CollectionsSummary, reviewDays: number): KpiRow[] {
  const invoices = (count: number): string => t('digest.kpi.invoices', { count });
  const rows: KpiRow[] = [
    {
      id: 'unpaid',
      label: t('digest.kpi.unpaid.label'),
      amount: summary.unpaid,
      count: invoices(summary.unpaid_invoices),
      definition: t('digest.kpi.unpaid.definition'),
      to: invoicesLink({ view: 'unpaid' }),
    },
    {
      id: 'overdue',
      label: t('digest.kpi.overdue.label'),
      amount: summary.overdue,
      count: invoices(summary.overdue_invoices),
      definition: t('digest.kpi.overdue.definition'),
      to: invoicesLink({ view: 'overdue' }),
    },
    {
      id: 'over30',
      label: t('digest.kpi.over30.label', { days: reviewDays }),
      amount: summary.over_30,
      count: invoices(summary.over_30_invoices),
      definition: t('digest.kpi.over30.definition', { days: reviewDays }),
      to: invoicesLink({ view: 'over-30' }),
    },
    {
      id: 'unknownDue',
      label: t('digest.kpi.unknownDue.label'),
      amount: summary.unknown_due,
      count: invoices(summary.unknown_due_invoices),
      definition: t('digest.kpi.unknownDue.definition'),
      to: invoicesLink({ view: 'unknown-due' }),
    },
    {
      id: 'received',
      label: t('digest.kpi.received.label'),
      amount: summary.received,
      count: t('digest.kpi.receipts', { count: summary.receipts }),
      definition: summary.filtered
        ? t('digest.kpi.received.definitionFiltered')
        : t('digest.kpi.received.definition'),
      to: receiptsLink('in-period'),
    },
    {
      id: 'failed',
      label: t('digest.kpi.failed.label'),
      amount: null,
      count: t('digest.kpi.attempts', { count: summary.failed_attempts }),
      definition: t('digest.kpi.failed.definition'),
      to: exceptionsLink({ rule: 'FAILED_ATTEMPT' }),
    },
    {
      id: 'unapplied',
      label: t('digest.kpi.unapplied.label'),
      amount: summary.unapplied,
      count:
        summary.unapplied_receipts === null
          ? EMPTY_VALUE
          : t('digest.kpi.receipts', { count: summary.unapplied_receipts }),
      definition:
        summary.unapplied === null
          ? t('digest.kpi.unapplied.notAttributable')
          : t('digest.kpi.unapplied.definition'),
      to: summary.unapplied === null ? undefined : receiptsLink('unapplied'),
    },
  ];
  return rows;
}

export function KpiSection({
  summary,
  reviewDays,
}: {
  readonly summary: CollectionsSummary;
  readonly reviewDays: number;
}) {
  const rows = kpiRows(summary, reviewDays);
  const columns: DataTableColumn<KpiRow>[] = [
    {
      id: 'measure',
      header: t('digest.kpi.column.measure'),
      cell: (row) => <strong>{row.label}</strong>,
    },
    {
      id: 'amount',
      header: t('digest.kpi.column.amount'),
      numeric: true,
      cell: (row) =>
        row.amount === null ? (
          EMPTY_VALUE
        ) : row.to === undefined ? (
          formatMoney(row.amount)
        ) : (
          <Reference value={formatMoney(row.amount)} to={row.to} />
        ),
    },
    { id: 'count', header: t('digest.kpi.column.count'), numeric: true, cell: (row) => row.count },
    {
      id: 'definition',
      header: t('digest.kpi.column.definition'),
      cell: (row) => <span className="prm-digest-wrap">{row.definition}</span>,
    },
  ];
  return (
    <Card headingLevel={3} title={t('digest.kpi.title')} flush>
      <DataTable
        caption={t('digest.kpi.caption')}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
      />
      <p className="prm-text-muted prm-digest-note">{t('digest.kpi.validAllocation')}</p>
    </Card>
  );
}

interface AgingRow {
  readonly id: string;
  readonly label: string;
  readonly amount: string;
  readonly invoices: number;
  readonly to?: string;
}

export function AgingSection({ summary }: { readonly summary: CollectionsSummary }) {
  const rows: AgingRow[] = [
    ...summary.aging.map((row) => ({
      id: row.bucket,
      label: t(`collections-scope.bucket.${row.bucket}`),
      amount: row.amount,
      invoices: row.invoices,
      to: invoicesLink({ bucket: row.bucket }),
    })),
    {
      id: 'total',
      label: t('digest.aging.total'),
      amount: sumMoney(summary.aging.map((row) => row.amount)),
      invoices: summary.aging.reduce((count, row) => count + row.invoices, 0),
    },
  ];
  const columns: DataTableColumn<AgingRow>[] = [
    {
      id: 'bucket',
      header: t('digest.aging.column.bucket'),
      cell: (row) => (row.to === undefined ? <strong>{row.label}</strong> : row.label),
    },
    {
      id: 'amount',
      header: t('digest.aging.column.amount'),
      numeric: true,
      cell: (row) =>
        row.to === undefined ? (
          <strong>{formatMoney(row.amount)}</strong>
        ) : (
          <Reference value={formatMoney(row.amount)} to={row.to} />
        ),
    },
    {
      id: 'invoices',
      header: t('digest.aging.column.invoices'),
      numeric: true,
      cell: (row) => String(row.invoices),
    },
  ];
  return (
    <Card headingLevel={3} title={t('digest.aging.title')} flush>
      <DataTable
        caption={t('digest.aging.caption')}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
      />
      {summary.unknown_due_invoices > 0 && (
        <p className="prm-text-muted prm-digest-note">
          {t('digest.aging.unknown', {
            amount: formatMoney(summary.unknown_due),
            count: summary.unknown_due_invoices,
          })}
        </p>
      )}
    </Card>
  );
}

const EXPOSURE_DIMENSIONS = [
  'broker',
  'product',
  'client',
] as const satisfies readonly BreakdownDimension[];
type ExposureDimension = (typeof EXPOSURE_DIMENSIONS)[number];
const DIMENSION_KEY: Readonly<Record<ExposureDimension, ScopeKey>> = {
  broker: 'broker_id',
  product: 'product_id',
  client: 'client_id',
};
const TOP = 5;

/** The largest groups by gross unpaid, largest first. */
function topExposures(rows: readonly ExposureRow[]): ExposureRow[] {
  return rows
    .filter((row) => compareMoney(row.unpaid, '0.00') > 0)
    .sort((a, b) => compareMoney(b.unpaid, a.unpaid) || (a.id ?? '').localeCompare(b.id ?? ''))
    .slice(0, TOP);
}

function ExposureTable({
  dimension,
  rows,
  lookups,
}: {
  readonly dimension: ExposureDimension;
  readonly rows: readonly ExposureRow[];
  readonly lookups: Lookups | undefined;
}) {
  const name = (id: string | null): string => lookups?.nameOf[dimension](id) ?? id ?? EMPTY_VALUE;
  const columns: DataTableColumn<ExposureRow>[] = [
    {
      id: 'name',
      header: t(`digest.exposure.dimension.${dimension}`),
      cell: (row) => (
        <>
          <span className="prm-digest-wrap">{name(row.id)}</span>
          {row.id !== null && <span className="prm-cell-sub prm-mono">{row.id}</span>}
        </>
      ),
    },
    {
      id: 'unpaid',
      header: t('digest.exposure.column.unpaid'),
      numeric: true,
      cell: (row) => (
        <Reference
          value={formatMoney(row.unpaid)}
          to={
            row.id === null
              ? invoicesLink({ view: 'unpaid' })
              : invoicesLink({
                  view: 'unpaid',
                  dimension: { key: DIMENSION_KEY[dimension], value: row.id },
                })
          }
        />
      ),
    },
    {
      id: 'overdue',
      header: t('digest.exposure.column.overdue'),
      numeric: true,
      cell: (row) => formatMoney(row.overdue),
    },
  ];
  return (
    <DataTable
      caption={t('digest.exposure.caption', {
        dimension: t(`digest.exposure.dimension.${dimension}`),
      })}
      columns={columns}
      rows={topExposures(rows)}
      rowKey={(row) => row.id ?? 'none'}
      empty={<EmptyState compact title={t('digest.exposure.none')} />}
    />
  );
}

export function ExposureSection({
  summary,
  lookups,
}: {
  readonly summary: CollectionsSummary;
  readonly lookups: Lookups | undefined;
}) {
  return (
    <Card headingLevel={3} title={t('digest.exposure.title')} subtitle={t('digest.exposure.top')}>
      <div className="prm-grid prm-grid--3 prm-digest-exposures">
        {EXPOSURE_DIMENSIONS.map((dimension) => (
          <ExposureTable
            key={dimension}
            dimension={dimension}
            rows={summary.breakdowns[dimension] ?? []}
            lookups={lookups}
          />
        ))}
      </div>
    </Card>
  );
}

interface RuleRow {
  readonly rule: RuleCode | 'total';
  readonly counts: Readonly<Record<Severity, number>>;
  readonly total: number;
}

function exceptionMatrix(items: readonly CollectionException[]): RuleRow[] {
  const countOf = (rule: RuleCode | null, severity: Severity | null): number =>
    items.filter(
      (item) =>
        (rule === null || item.rule === rule) && (severity === null || item.severity === severity),
    ).length;
  const row = (rule: RuleCode | null): RuleRow => ({
    rule: rule ?? 'total',
    counts: {
      HIGH: countOf(rule, 'HIGH'),
      MEDIUM: countOf(rule, 'MEDIUM'),
      LOW: countOf(rule, 'LOW'),
    },
    total: countOf(rule, null),
  });
  return [...RULE_CODES.map(row), row(null)];
}

export function ExceptionsSection({
  items,
  error,
  onRetry,
}: {
  readonly items: readonly CollectionException[] | undefined;
  readonly error: ApiError | null;
  readonly onRetry: () => void;
}) {
  const count = (row: RuleRow, value: number, severity?: Severity) =>
    value === 0 || row.rule === 'total' ? (
      String(value)
    ) : (
      <Reference value={String(value)} to={exceptionsLink({ rule: row.rule, severity })} />
    );
  const columns: DataTableColumn<RuleRow>[] = [
    {
      id: 'rule',
      header: t('digest.exceptions.column.rule'),
      cell: (row) =>
        row.rule === 'total' ? (
          <strong>{t('digest.exceptions.total')}</strong>
        ) : (
          <>
            <span className="prm-mono">{RULE_IDS[row.rule]}</span>
            <span className="prm-cell-sub">{ruleLabel(row.rule)}</span>
          </>
        ),
    },
    ...SEVERITIES.map((severity): DataTableColumn<RuleRow> => ({
      id: severity,
      header: t(`collections-scope.severity.${severity}`),
      numeric: true,
      cell: (row) => count(row, row.counts[severity], severity),
    })),
    {
      id: 'total',
      header: t('digest.exceptions.column.total'),
      numeric: true,
      cell: (row) => <strong>{count(row, row.total)}</strong>,
    },
  ];
  const rows = items === undefined ? undefined : exceptionMatrix(items);
  return (
    <Card
      headingLevel={3}
      title={t('digest.exceptions.title')}
      actions={<CardLink to={exceptionsLink()}>{t('digest.exceptions.link')}</CardLink>}
      flush
    >
      {items !== undefined && (
        <p className="prm-text-muted prm-digest-note">
          {t('digest.exceptions.count', { count: items.length })}
        </p>
      )}
      <DataTable
        caption={t('digest.exceptions.caption')}
        columns={columns}
        rows={items !== undefined && items.length === 0 ? [] : rows}
        rowKey={(row) => row.rule}
        loading={error === null && items === undefined}
        error={error}
        onRetry={onRetry}
        empty={<EmptyState compact icon="alertTriangle" title={t('digest.exceptions.none')} />}
      />
      <p className="prm-text-muted prm-digest-note">{t('collections-scope.advisory')}</p>
    </Card>
  );
}

export interface ActionCounts {
  readonly open: number;
  readonly inProgress: number;
  readonly resolved: number;
  readonly overdue: number;
}

function actionCounts(tasks: readonly TaskListItem[]): ActionCounts {
  return {
    open: tasks.filter((task) => task.status === 'OPEN').length,
    inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
    resolved: tasks.filter((task) => task.status === 'RESOLVED').length,
    overdue: tasks.filter((task) => task.overdue).length,
  };
}

const URGENCY_TONE = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info' } as const;

export function ActionsSection({
  tasks,
  filtered,
  userName,
  error,
  onRetry,
}: {
  readonly tasks: readonly TaskListItem[] | undefined;
  readonly filtered: boolean;
  readonly userName: (id: string) => string;
  readonly error: ApiError | null;
  readonly onRetry: () => void;
}) {
  const counts = tasks === undefined ? undefined : actionCounts(tasks);
  const overdue = tasks?.filter((task) => task.overdue);
  const columns: DataTableColumn<TaskListItem>[] = [
    {
      id: 'action',
      header: t('digest.actions.column.action'),
      cell: (task) => <span className="prm-mono">{task.task_id}</span>,
    },
    {
      id: 'account',
      header: t('digest.actions.column.account'),
      cell: (task) => (
        <Reference
          value={task.subject_id}
          to={
            task.subject_type === 'INVOICE'
              ? invoicePath(task.subject_id)
              : receiptPath(task.subject_id)
          }
        />
      ),
    },
    {
      id: 'reason',
      header: t('digest.actions.column.reason'),
      cell: (task) => t(`collections-scope.reason.${task.reason}`),
    },
    {
      id: 'urgency',
      header: t('digest.actions.column.urgency'),
      cell: (task) => (
        <Chip tone={URGENCY_TONE[task.priority]} size="sm">
          {t(`collections-scope.taskPriority.${task.priority}`)}
        </Chip>
      ),
    },
    {
      id: 'owner',
      header: t('digest.actions.column.owner'),
      cell: (task) =>
        task.assigned_to === null ? t('collections-scope.unassigned') : userName(task.assigned_to),
    },
    { id: 'due', header: t('digest.actions.column.due'), cell: (task) => <TaskDue task={task} /> },
    {
      id: 'status',
      header: t('digest.actions.column.status'),
      cell: (task) => <TaskStatusChip status={task.status} />,
    },
  ];
  return (
    <Card
      headingLevel={3}
      className="prm-digest-actions"
      title={t('digest.actions.title')}
      actions={<CardLink to={ACTIONS_PATH}>{t('digest.actions.link')}</CardLink>}
    >
      <div className="prm-stack">
        <p className="prm-text-muted prm-digest-note">
          {filtered ? t('digest.actions.scopeFiltered') : t('digest.actions.scopeAll')}
        </p>
        {counts !== undefined && (
          <dl className="prm-digest-meta" aria-label={t('digest.actions.title')}>
            <div>
              <dt>{t('digest.actions.open')}</dt>
              <dd>{counts.open}</dd>
            </div>
            <div>
              <dt>{t('digest.actions.inProgress')}</dt>
              <dd>{counts.inProgress}</dd>
            </div>
            <div>
              <dt>{t('digest.actions.resolved')}</dt>
              <dd>{counts.resolved}</dd>
            </div>
            <div>
              <dt>{t('digest.actions.overdue')}</dt>
              <dd>{counts.overdue}</dd>
            </div>
          </dl>
        )}
        <h4 className="prm-digest-group">{t('digest.actions.overdueTitle')}</h4>
        <DataTable
          caption={t('digest.actions.caption')}
          columns={columns}
          rows={overdue}
          rowKey={(task) => task.task_id}
          loading={error === null && tasks === undefined}
          error={error}
          onRetry={onRetry}
          empty={
            <EmptyState
              compact
              icon="listChecks"
              title={t('digest.actions.noneOverdue')}
              description={t('digest.actions.noneOverdueDescription')}
            />
          }
        />
      </div>
    </Card>
  );
}
