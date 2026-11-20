/**
 * StackedBarChart: categories on the x axis, one stacked bar segment per series (for example unpaid premium by bucket per
 * month, or obligations by status per contract). Recharts, token colours.
 */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCount } from '../../lib/format';
import { t } from '../../lib/i18n';
import { EmptyState } from '../ui/EmptyState';
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE, chartColor } from './chartTheme';
import { SeriesChartFrame } from './SeriesChartFrame';
import type { TrendPoint, TrendSeries } from './TrendChart';

export interface StackedBarChartProps {
  readonly series: readonly TrendSeries[];
  /** One entry per category (`x` is the category label). */
  readonly points: readonly TrendPoint[];
  readonly label: string;
  readonly height?: number;
  readonly formatValue?: (value: number) => string;
  /** Horizontal bars (categories on the y axis). */
  readonly horizontal?: boolean;
  /** Header of the category column in the accessible data table (default "Category"), for example "Owner". */
  readonly categoryLabel?: string;
}

export function StackedBarChart({
  series,
  points,
  label,
  height = 260,
  formatValue = formatCount,
  horizontal = false,
  categoryLabel,
}: StackedBarChartProps) {
  if (points.length === 0 || series.length === 0) {
    return <EmptyState compact title={t('charts.empty')} />;
  }
  const data = points.map((point) => ({ x: point.x, ...point.values }));
  return (
    <SeriesChartFrame
      label={label}
      categoryLabel={categoryLabel ?? t('charts.category')}
      series={series}
      points={points}
      formatValue={formatValue}
    >
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={data}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
          >
            <CartesianGrid
              stroke={GRID_STROKE}
              strokeDasharray="3 3"
              vertical={horizontal}
              horizontal={!horizontal}
            />
            {horizontal ? (
              <>
                <XAxis
                  type="number"
                  tick={AXIS_STYLE}
                  stroke={GRID_STROKE}
                  tickFormatter={formatValue}
                />
                <YAxis
                  type="category"
                  dataKey="x"
                  tick={AXIS_STYLE}
                  stroke={GRID_STROKE}
                  width={120}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="x" tick={AXIS_STYLE} stroke={GRID_STROKE} tickLine={false} />
                <YAxis
                  tick={AXIS_STYLE}
                  stroke={GRID_STROKE}
                  tickLine={false}
                  tickFormatter={formatValue}
                />
              </>
            )}
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value) =>
                typeof value === 'number' ? formatValue(value) : String(value ?? '')
              }
            />
            {series.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="stack"
                fill={chartColor(item.tone, index)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SeriesChartFrame>
  );
}
