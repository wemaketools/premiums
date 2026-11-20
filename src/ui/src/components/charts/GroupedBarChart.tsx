/**
 * GroupedBarChart: categories on the x axis, one bar per series side by side (for example receipt cash and
 * arrears recovered per month), with an optional dashed reference line (a target or
 * baseline). Recharts, token colours; a `null` value leaves a gap.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatCount } from '../../lib/format';
import { t } from '../../lib/i18n';
import { EmptyState } from '../ui/EmptyState';
import { AXIS_STYLE, GRID_STROKE, TOOLTIP_STYLE, chartColor, evenTicks } from './chartTheme';
import { SeriesChartFrame } from './SeriesChartFrame';
import type { TrendPoint, TrendSeries } from './TrendChart';

export interface ChartReference {
  readonly value: number;
  readonly label: string;
}

export interface GroupedBarChartProps {
  readonly series: readonly TrendSeries[];
  /** One entry per category (`x` is the category label). */
  readonly points: readonly TrendPoint[];
  readonly label: string;
  readonly height?: number;
  readonly formatValue?: (value: number) => string;
  /** Header of the category column in the accessible data table (default "Category"). */
  readonly categoryLabel?: string;
  /** A horizontal line across the chart, named in the legend. */
  readonly reference?: ChartReference;
  /** Width of the value axis, for labels longer than a count. */
  readonly axisWidth?: number;
  /** Widest a bar may be, in pixels, so one or two categories do not fill the chart with bars. */
  readonly maxBarSize?: number;
  /** Puts the value axis ticks at an even step up to a round top (for amounts, not for counts of days). */
  readonly evenAxis?: boolean;
}

export function GroupedBarChart({
  series,
  points,
  label,
  height = 260,
  formatValue = formatCount,
  categoryLabel,
  reference,
  axisWidth = 60,
  maxBarSize,
  evenAxis = false,
}: GroupedBarChartProps) {
  if (points.length === 0 || series.length === 0) {
    return <EmptyState compact title={t('charts.empty')} />;
  }
  const data = points.map((point) => ({ x: point.x, ...point.values }));
  const top = Math.max(
    reference?.value ?? 0,
    ...points.flatMap((point) => Object.values(point.values).map((value) => value ?? 0)),
  );
  const ticks = evenAxis ? evenTicks(top) : undefined;
  const referenceColor = 'var(--prm-chart-axis)';
  return (
    <SeriesChartFrame
      label={label}
      categoryLabel={categoryLabel ?? t('charts.category')}
      series={series}
      points={points}
      formatValue={formatValue}
      extraLegend={
        reference === undefined ? undefined : { label: reference.label, color: referenceColor }
      }
    >
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            data={data}
            margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="x" tick={AXIS_STYLE} stroke={GRID_STROKE} tickLine={false} />
            <YAxis
              tick={AXIS_STYLE}
              stroke={GRID_STROKE}
              tickLine={false}
              tickFormatter={formatValue}
              width={axisWidth}
              ticks={ticks}
              domain={
                ticks === undefined
                  ? [0, (max: number) => Math.max(max, reference?.value ?? 0)]
                  : [0, ticks[ticks.length - 1] ?? top]
              }
            />
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
                fill={chartColor(item.tone, index)}
                maxBarSize={maxBarSize}
                isAnimationActive={false}
              />
            ))}
            {reference !== undefined && (
              <ReferenceLine y={reference.value} stroke={referenceColor} strokeDasharray="4 4" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SeriesChartFrame>
  );
}
