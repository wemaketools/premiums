/**
 * The frame every series chart shares: the accessible data table (one row per point, one column per series) and the
 * inline legend, around the chart a caller draws.
 */
import type { ReactNode } from 'react';

import { ChartFrame } from './ChartFrame';
import { chartColor } from './chartTheme';
import type { TrendPoint, TrendSeries } from './TrendChart';

export interface SeriesChartFrameProps {
  readonly label: string;
  /** Header of the first column of the data table. */
  readonly categoryLabel: string;
  readonly series: readonly TrendSeries[];
  readonly points: readonly TrendPoint[];
  readonly formatValue: (value: number) => string;
  /** A legend entry that is not a series, such as a reference line. */
  readonly extraLegend?: { readonly label: string; readonly color: string };
  readonly children: ReactNode;
}

export function SeriesChartFrame({
  label,
  categoryLabel,
  series,
  points,
  formatValue,
  extraLegend,
  children,
}: SeriesChartFrameProps) {
  return (
    <ChartFrame
      label={label}
      columns={[categoryLabel, ...series.map((item) => item.label)]}
      rows={points.map((point) => ({
        key: point.x,
        cells: [
          point.x,
          ...series.map((item) => {
            const value = point.values[item.key];
            return value === null || value === undefined ? '—' : formatValue(value);
          }),
        ],
      }))}
    >
      {children}
      <ul className="prm-chart-legend prm-chart-legend--inline">
        {series.map((item, index) => (
          <li key={item.key}>
            <span
              className="prm-chart-swatch"
              style={{ background: chartColor(item.tone, index) }}
            />
            <span>{item.label}</span>
          </li>
        ))}
        {extraLegend !== undefined && (
          <li>
            <span className="prm-chart-swatch" style={{ background: extraLegend.color }} />
            <span>{extraLegend.label}</span>
          </li>
        )}
      </ul>
    </ChartFrame>
  );
}
