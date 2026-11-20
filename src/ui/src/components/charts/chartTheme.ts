/**
 * Chart colours and styles from the design tokens (charts follow the light/dark theme through CSS variables; no raw
 * colours). Chart geometry needs JS numbers: callers convert decimal strings with `Number()` for plotting ONLY and
 * pass formatted strings (from `lib/format`) for every label and tooltip, so no displayed amount is float-derived.
 */

export type ChartTone = 'accent' | 'info' | 'success' | 'warning' | 'neutral' | 'danger';

const TONE_VARIABLE: Readonly<Record<ChartTone, string>> = {
  accent: 'var(--prm-chart-1)',
  info: 'var(--prm-chart-2)',
  success: 'var(--prm-chart-3)',
  warning: 'var(--prm-chart-4)',
  neutral: 'var(--prm-chart-5)',
  danger: 'var(--prm-chart-6)',
};

export const CHART_SEQUENCE: readonly ChartTone[] = [
  'accent',
  'info',
  'success',
  'warning',
  'neutral',
  'danger',
];

/** The CSS colour of a tone, or of the n-th series when no tone is given. */
export function chartColor(tone: ChartTone | undefined, index: number): string {
  const resolved = tone ?? CHART_SEQUENCE[index % CHART_SEQUENCE.length] ?? 'accent';
  return TONE_VARIABLE[resolved];
}

const TICK_STEPS = [1, 1.25, 2, 2.5, 5, 10] as const;

/**
 * Value-axis ticks at an even step (1, 1.25, 2, 2.5 or 5 times a power of ten) from 0 up to the first multiple at or above
 * `max`, at most about `intervals` apart, so the top of the axis is a round number and every gap is the same size.
 */
export function evenTicks(max: number, intervals = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = (TICK_STEPS.find((factor) => factor * magnitude >= rough) ?? 10) * magnitude;
  const count = Math.ceil(max / step - 1e-9);
  return Array.from({ length: count + 1 }, (_, index) => Number((index * step).toFixed(10)));
}

export const AXIS_STYLE = { fill: 'var(--prm-chart-axis)', fontSize: 12 } as const;
export const GRID_STROKE = 'var(--prm-chart-grid)';
export const TOOLTIP_STYLE = {
  background: 'var(--prm-surface-raised)',
  border: '1px solid var(--prm-border-subtle)',
  borderRadius: 'var(--prm-radius-control)',
  boxShadow: 'var(--prm-shadow-raised)',
  color: 'var(--prm-text-primary)',
  fontSize: 12,
} as const;
