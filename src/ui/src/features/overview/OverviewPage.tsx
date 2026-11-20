/**
 * COL-01 Collections Overview: the balances as of the as-of date (gross unpaid, overdue, over the review threshold,
 * unknown due date), cash and attempts in the period (cash received, failed attempts), unapplied cash, the aging
 * chart, the priority exceptions and the monthly trend. Every card and bar opens exactly the records it counts.
 */
import { useMemo } from 'react';

import { endpoints, formatMoney } from '../../../../contracts/index';
import type { CollectionsSummary } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector } from '../../app/hooks';
import { BarList } from '../../components/charts';
import {
  Card,
  CardLink,
  EmptyState,
  KpiCard,
  KpiGrid,
  PageHeader,
  QueryView,
  SkeletonBlock,
} from '../../components/ui';
import type { KpiCardProps } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  ExportCsvButton,
  ScopeFilterBar,
  exceptionsLink,
  invoicesLink,
  periodLine,
  receiptsLink,
  scopeText,
  useLookups,
  useScope,
} from '../collections-scope';
import { PriorityExceptions } from './PriorityExceptions';
import { TrendCard } from './TrendCard';

interface Figure extends Omit<KpiCardProps, 'value'> {
  readonly id: string;
  readonly value: string;
  /** The plain value in the CSV: a decimal amount in BWP or a count. */
  readonly exported: { readonly amount: string; readonly count: string };
}

interface FigureGroup {
  readonly heading: string;
  readonly note?: string;
  readonly figures: readonly Figure[];
}

function figureGroups(summary: CollectionsSummary, reviewDays: number): FigureGroup[] {
  const money = (
    id: string,
    amount: string,
    count: number,
    icon: Figure['icon'],
    tone: Figure['tone'],
    to: string,
    hint: string,
    label = t(`overview.kpi.${id}.label`),
  ): Figure => ({
    id,
    label,
    value: formatMoney(amount),
    icon,
    tone,
    to,
    hint,
    exported: { amount, count: String(count) },
  });
  const balances: Figure[] = [
    money(
      'unpaid',
      summary.unpaid,
      summary.unpaid_invoices,
      'wallet',
      'accent',
      invoicesLink({ view: 'unpaid' }),
      t('overview.kpi.unpaid.hint', { count: summary.unpaid_invoices }),
    ),
    money(
      'overdue',
      summary.overdue,
      summary.overdue_invoices,
      'clock',
      'warning',
      invoicesLink({ view: 'overdue' }),
      t('overview.kpi.overdue.hint', { count: summary.overdue_invoices }),
    ),
    money(
      'over30',
      summary.over_30,
      summary.over_30_invoices,
      'alertTriangle',
      'danger',
      invoicesLink({ view: 'over-30' }),
      t('overview.kpi.over30.hint', { count: summary.over_30_invoices }),
      t('overview.kpi.over30.label', { days: reviewDays }),
    ),
  ];
  if (summary.unknown_due_invoices > 0) {
    balances.push(
      money(
        'unknownDue',
        summary.unknown_due,
        summary.unknown_due_invoices,
        'alertCircle',
        'warning',
        invoicesLink({ view: 'unknown-due' }),
        t('overview.kpi.unknownDue.hint', { count: summary.unknown_due_invoices }),
      ),
    );
  }
  const unapplied: Figure =
    summary.unapplied === null
      ? {
          id: 'unapplied',
          label: t('overview.kpi.unapplied.label'),
          value: '—',
          icon: 'coins',
          tone: 'info',
          hint: t('overview.kpi.unapplied.hintFiltered'),
          exported: { amount: '', count: '' },
        }
      : money(
          'unapplied',
          summary.unapplied,
          summary.unapplied_receipts ?? 0,
          'coins',
          'info',
          receiptsLink('unapplied'),
          t('overview.kpi.unapplied.hint', { count: summary.unapplied_receipts ?? 0 }),
        );
  balances.push(unapplied);

  const period: Figure[] = [
    money(
      'received',
      summary.received,
      summary.receipts,
      'receipt',
      'success',
      receiptsLink('in-period'),
      summary.filtered
        ? t('overview.kpi.received.hintFiltered')
        : t('overview.kpi.received.hint', { count: summary.receipts }),
    ),
    {
      id: 'failed',
      label: t('overview.kpi.failed.label'),
      value: String(summary.failed_attempts),
      icon: 'xCircle',
      tone: 'danger',
      to: exceptionsLink({ rule: 'FAILED_ATTEMPT' }),
      hint: t('overview.kpi.failed.hint'),
      exported: { amount: '', count: String(summary.failed_attempts) },
    },
  ];
  return [
    {
      heading: t('overview.group.asOf', { date: formatCalendarDate(summary.as_of) }),
      figures: balances,
    },
    {
      heading: t('overview.group.period', { window: periodLine(summary.period) }),
      note: t('overview.group.periodNote'),
      figures: period,
    },
  ];
}

function overviewTable(
  summary: CollectionsSummary,
  groups: readonly FigureGroup[],
  scope: string,
): string[][] {
  const header = [
    t('overview.csv.section'),
    t('overview.csv.measure'),
    t('overview.csv.amount'),
    t('overview.csv.count'),
  ];
  return [
    [t('overview.csv.asOf'), summary.as_of, '', ''],
    [t('overview.csv.scope'), scope, '', ''],
    header,
    ...groups.flatMap((group) =>
      group.figures.map((figure) => [
        group.heading,
        figure.label,
        figure.exported.amount,
        figure.exported.count,
      ]),
    ),
    ...summary.aging.map((row) => [
      t('overview.aging.title'),
      t(`collections-scope.bucket.${row.bucket}`),
      row.amount,
      String(row.invoices),
    ]),
  ];
}

function AgingCard({ summary }: { readonly summary: CollectionsSummary }) {
  return (
    <Card
      title={t('overview.aging.title')}
      subtitle={t('overview.aging.subtitle')}
      actions={<CardLink to="/aging">{t('overview.aging.link')}</CardLink>}
    >
      <BarList
        label={t('overview.aging.chart')}
        items={summary.aging.map((row) => ({
          id: row.bucket,
          label: t(`collections-scope.bucket.${row.bucket}`),
          value: Number(row.amount),
          display: formatMoney(row.amount),
          to: invoicesLink({ bucket: row.bucket }),
          tone: row.bucket === '>90' ? 'danger' : row.bucket === 'current' ? 'neutral' : 'warning',
        }))}
      />
      {summary.unknown_due_invoices > 0 && (
        <p className="prm-text-muted">
          {t('overview.aging.unknown', { amount: formatMoney(summary.unknown_due) })}
        </p>
      )}
    </Card>
  );
}

export default function OverviewPage() {
  const scope = useScope();
  const lookups = useLookups();
  const asOf = useAppSelector((state) => state.dataContext.asOf);
  const summary = useApiQuery(
    endpoints.collectionsSummary,
    { query: { ...scope.query, period: scope.period } },
    { keepPrevious: true },
  );
  const config = useApiQuery(endpoints.ruleConfigGet, {});
  const reviewDays = config.data?.config.collections.overdue_30_review_days ?? 30;
  const data = summary.data?.summary;
  const groups = useMemo(
    () => (data === undefined ? undefined : figureGroups(data, reviewDays)),
    [data, reviewDays],
  );
  const table = useMemo(
    () =>
      data === undefined || groups === undefined
        ? undefined
        : overviewTable(data, groups, scopeText(scope.query, lookups.lookups)),
    // The scope text follows the query values, which the summary already depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, groups, lookups.lookups],
  );

  return (
    <div className="prm-page">
      <PageHeader
        title={t('overview.title')}
        subtitle={t('overview.subtitle')}
        actions={<ExportCsvButton screen="overview" queries={[summary]} table={table} />}
      />
      <ScopeFilterBar scope={scope} lookups={lookups} withPeriod />
      <QueryView
        query={summary}
        loading={
          <Card data-state="loading">
            <SkeletonBlock lines={4} />
          </Card>
        }
        isEmpty={(answer) => answer.summary.invoices === 0}
        empty={
          <Card data-state="empty">
            <EmptyState
              icon="dashboard"
              title={t('overview.empty.title')}
              description={
                scope.filtered
                  ? t('overview.empty.filteredDescription')
                  : t('overview.empty.description')
              }
            />
          </Card>
        }
      >
        {(answer) => (
          <div className="prm-page" aria-busy={summary.isFetching}>
            {figureGroups(answer.summary, reviewDays).map((group) => (
              <section key={group.heading} className="prm-stack" aria-label={group.heading}>
                <h2 className="prm-card-title">{group.heading}</h2>
                {group.note !== undefined && <p className="prm-text-muted">{group.note}</p>}
                <KpiGrid>
                  {group.figures.map(({ id, exported: _exported, ...figure }) => (
                    <KpiCard key={id} {...figure} />
                  ))}
                </KpiGrid>
              </section>
            ))}
            <div className="prm-grid prm-grid--2">
              <AgingCard summary={answer.summary} />
              <PriorityExceptions scope={scope} asOf={asOf} />
            </div>
            <TrendCard scope={scope} />
          </div>
        )}
      </QueryView>
    </div>
  );
}
