/** COL-FR-15: receipt cash beside arrears recovered and current premium applied, per month up to the as-of date. */
import { endpoints } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { GroupedBarChart } from '../../components/charts';
import { Card, EmptyState, QueryView, SkeletonBlock } from '../../components/ui';
import { t } from '../../lib/i18n';
import { monthLabel, plottedMoney } from '../collections-scope';
import type { Scope } from '../collections-scope';

const MAX_BAR_WIDTH = 40;

export function TrendCard({ scope }: { readonly scope: Scope }) {
  const query = useApiQuery(
    endpoints.collectionsTrend,
    { query: scope.query },
    { keepPrevious: true },
  );
  return (
    <Card title={t('overview.trend.title')} subtitle={t('overview.trend.subtitle')}>
      <QueryView
        query={query}
        loading={<SkeletonBlock lines={4} />}
        errorTitle={t('overview.trend.error')}
        isEmpty={(data) =>
          data.months.every(
            (month) =>
              Number(month.received) === 0 &&
              Number(month.arrears_recovered) === 0 &&
              Number(month.current_applied) === 0,
          )
        }
        empty={<EmptyState compact icon="receipt" title={t('overview.trend.empty')} />}
      >
        {(data) => (
          <div className="prm-stack" aria-busy={query.isFetching}>
            <GroupedBarChart
              label={t('overview.trend.chart')}
              categoryLabel={t('overview.trend.month')}
              series={[
                { key: 'received', label: t('overview.trend.received'), tone: 'accent' },
                { key: 'arrears', label: t('overview.trend.arrears'), tone: 'warning' },
                { key: 'current', label: t('overview.trend.current'), tone: 'success' },
              ]}
              points={data.months.map((month) => ({
                x: monthLabel(month.month),
                values: {
                  received: Number(month.received),
                  arrears: Number(month.arrears_recovered),
                  current: Number(month.current_applied),
                },
              }))}
              formatValue={plottedMoney}
              axisWidth={96}
              maxBarSize={MAX_BAR_WIDTH}
              evenAxis
            />
            {data.filtered && <p className="prm-text-muted">{t('overview.trend.filtered')}</p>}
          </div>
        )}
      </QueryView>
    </Card>
  );
}
