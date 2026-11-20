/**
 * Inline value renderers: monospace accent references that link to their record, and the em dash for empty values.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { EMPTY_VALUE } from '../../lib/format';

export interface ReferenceProps {
  /** For example `CLM-0003`. */
  readonly value: string;
  /** In-app path of the record; omitted when the caller may not open it. */
  readonly to?: string | null;
}

/** A record reference in monospace accent text, linked when a path is given. */
export function Reference({ value, to }: ReferenceProps) {
  if (to === undefined || to === null) {
    return <span className="prm-ref">{value}</span>;
  }
  return (
    <Link to={to} className="prm-ref">
      {value}
    </Link>
  );
}

/** Renders the value, or the em dash when it is empty. */
export function OrDash({ children }: { readonly children: ReactNode }) {
  const empty = children === null || children === undefined || children === '';
  return <>{empty ? EMPTY_VALUE : children}</>;
}
