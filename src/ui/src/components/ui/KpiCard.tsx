/**
 * KPI cards: icon halo, label, value, optional delta and hint. A metric the caller may not see is
 * not rendered at all: no locked tile, and never a misleading zero. `KpiGrid` lays the cards out
 * responsively and disappears when none of them renders.
 */
import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { EMPTY_VALUE } from '../../lib/format';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface KpiDelta {
  readonly direction: 'up' | 'down' | 'flat';
  /** Display text, for example `-6` or `+30.5pp`. */
  readonly text: string;
  /** Whether the change is good; defaults to "up is good". */
  readonly positive?: boolean;
}

export interface KpiCardProps {
  readonly label: string;
  /** Formatted value; `null` renders the em dash. */
  readonly value: ReactNode;
  readonly icon: IconName;
  readonly tone?: 'accent' | 'warning' | 'danger' | 'success' | 'info';
  readonly delta?: KpiDelta;
  readonly hint?: ReactNode;
  /** Makes the card a link to the underlying list. */
  readonly to?: string;
  /** The caller may not see this metric: the card is not rendered. */
  readonly restricted?: boolean;
}

export function KpiCard({
  label,
  value,
  icon,
  tone = 'accent',
  delta,
  hint,
  to,
  restricted = false,
}: KpiCardProps) {
  const deltaGood = delta === undefined ? true : (delta.positive ?? delta.direction !== 'down');
  const deltaClass =
    delta === undefined || delta.direction === 'flat'
      ? 'prm-kpi-delta prm-kpi-delta--flat'
      : deltaGood
        ? 'prm-kpi-delta prm-kpi-delta--up'
        : 'prm-kpi-delta prm-kpi-delta--down';
  const valueRef = useRef<HTMLSpanElement>(null);
  // Long values (for example "BWP 1,920,000" in a narrow card) shrink to fit instead of overflowing; short ones
  // keep the full size. The class is toggled on the element directly, so no re-render is needed.
  useLayoutEffect(() => {
    const element = valueRef.current;
    if (element === null) return undefined;
    const fit = (): void => {
      element.classList.remove('prm-kpi-value--fit');
      if (element.scrollWidth > element.clientWidth) element.classList.add('prm-kpi-value--fit');
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, restricted]);
  if (restricted) {
    return null;
  }
  const body = (
    <div className="prm-kpi">
      <div className="prm-kpi-head">
        <span className={tone === 'accent' ? 'prm-kpi-halo' : `prm-kpi-halo prm-kpi-halo--${tone}`}>
          <Icon name={icon} />
        </span>
        <span className="prm-kpi-label">{label}</span>
      </div>
      <span className="prm-kpi-value" ref={valueRef}>
        {value === null || value === undefined ? EMPTY_VALUE : value}
      </span>
      {delta !== undefined && (
        <span className={deltaClass}>
          <Icon
            name={
              delta.direction === 'up'
                ? 'arrowUp'
                : delta.direction === 'down'
                  ? 'arrowDown'
                  : 'minus'
            }
          />
          {delta.text}
        </span>
      )}
      {hint !== undefined && <span className="prm-kpi-hint">{hint}</span>}
    </div>
  );
  return (
    <section className="prm-card" aria-label={label}>
      {to !== undefined ? (
        <Link to={to} className="prm-kpi-link">
          {body}
        </Link>
      ) : (
        body
      )}
    </section>
  );
}

export function KpiGrid({ children }: { readonly children: ReactNode }) {
  return <div className="prm-kpi-grid">{children}</div>;
}
