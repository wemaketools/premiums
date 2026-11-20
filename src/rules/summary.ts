/**
 * The overview figures of the invoices in scope: balances as of the as-of date (gross unpaid, overdue, over the
 * review threshold, aging) and cash in the period (receipts received, failed attempts). Every total is a sum over
 * exactly the invoices or receipts a list opened from it shows, so card, chart and table reconcile.
 */
import { AGING_BUCKETS, BREAKDOWN_DIMENSIONS, COLLECTION_PRIORITIES, compareMoney, dateOf, sumMoney } from '../contracts/index.js';
import type {
  BreakdownDimension,
  BucketTotal,
  CollectionPriority,
  CollectionsSummary,
  ExposureRow,
  InvoiceFacts,
  PeriodOption,
  ScopeQuery,
} from '../contracts/index.js';
import { inWindow, periodWindow } from './calendar.js';
import { isFailed, isScoped, scopedReceipts } from './ledger.js';
import type { Ledger } from './ledger.js';

const ZERO = '0.00';

export const isUnpaid = (facts: InvoiceFacts): boolean => compareMoney(facts.outstanding, ZERO) > 0;

/** Overdue beyond the review threshold (COL-R01): the ">30 days" card and list. */
export const isOverReview = (facts: InvoiceFacts, ledger: Pick<Ledger, 'config'>): boolean =>
  facts.days_overdue !== null && facts.days_overdue > ledger.config.overdue_30_review_days;

const total = (invoices: readonly InvoiceFacts[]): string => sumMoney(invoices.map((facts) => facts.outstanding));

export function bucketTotals(invoices: readonly InvoiceFacts[]): BucketTotal[] {
  return AGING_BUCKETS.map((bucket) => {
    const inBucket = invoices.filter((facts) => facts.bucket === bucket);
    return { bucket, amount: total(inBucket), invoices: inBucket.length };
  });
}

const DIMENSION_KEY: Readonly<Record<BreakdownDimension, (facts: InvoiceFacts) => string | null>> = {
  product: (facts) => facts.product_id,
  broker: (facts) => facts.broker_id,
  channel: (facts) => facts.channel,
  client: (facts) => facts.client_id,
  owner: (facts) => facts.owner_id,
};

/** Unpaid exposure per group, largest unpaid first; ties by id. Each unpaid invoice lands in exactly one group. */
export function exposureRows(
  invoices: readonly InvoiceFacts[],
  dimension: BreakdownDimension,
  ledger: Pick<Ledger, 'config'>,
): ExposureRow[] {
  const groups = new Map<string | null, InvoiceFacts[]>();
  for (const facts of invoices.filter(isUnpaid)) {
    const key = DIMENSION_KEY[dimension](facts);
    groups.set(key, [...(groups.get(key) ?? []), facts]);
  }
  return [...groups.entries()]
    .map(([id, members]) => ({
      id,
      unpaid: total(members),
      overdue: total(members.filter((facts) => facts.overdue)),
      over_30: total(members.filter((facts) => isOverReview(facts, ledger))),
      invoices: members.length,
      buckets: bucketTotals(members),
    }))
    .sort((a, b) => compareMoney(b.unpaid, a.unpaid) || String(a.id ?? '').localeCompare(String(b.id ?? '')));
}

export function summarize(ledger: Ledger, scope: ScopeQuery, option?: PeriodOption): CollectionsSummary {
  const window = periodWindow(ledger.asOf, option);
  const wanted = ledger.inScope(scope);
  const invoices = ledger.invoices.filter((facts) => wanted.has(facts.invoice_id));
  const unpaid = invoices.filter(isUnpaid);
  const overdue = invoices.filter((facts) => facts.overdue);
  const overReview = invoices.filter((facts) => isOverReview(facts, ledger));
  const unknown = invoices.filter((facts) => facts.aging_state === 'unknown');
  const filtered = isScoped(scope);

  const inPeriod = scopedReceipts(ledger, scope).filter((receipt) => receipt.is_cash && inWindow(receipt.received_at, window));
  const unapplied = ledger.receipts.filter((receipt) => compareMoney(receipt.unapplied, ZERO) > 0);
  const failed = ledger.attempts.filter(
    (attempt) => isFailed(attempt) && wanted.has(attempt.invoice_id) && inWindow(dateOf(attempt.attempt_at), window),
  );

  const priorities = Object.fromEntries(
    COLLECTION_PRIORITIES.map((priority) => [priority, invoices.filter((facts) => facts.priority === priority).length]),
  ) as Record<CollectionPriority, number>;
  const breakdowns = Object.fromEntries(
    BREAKDOWN_DIMENSIONS.map((dimension) => [dimension, exposureRows(invoices, dimension, ledger)]),
  ) as Record<BreakdownDimension, ExposureRow[]>;

  return {
    as_of: ledger.asOf,
    period: window,
    filtered,
    invoices: invoices.length,
    issued: sumMoney(invoices.map((facts) => facts.issued)),
    applied: sumMoney(invoices.map((facts) => facts.applied)),
    unpaid: total(unpaid),
    unpaid_invoices: unpaid.length,
    overdue: total(overdue),
    overdue_invoices: overdue.length,
    over_30: total(overReview),
    over_30_invoices: overReview.length,
    unknown_due: total(unknown),
    unknown_due_invoices: unknown.length,
    aging: bucketTotals(invoices),
    received: sumMoney(inPeriod.map((receipt) => receipt.in_scope)),
    receipts: inPeriod.length,
    unapplied: filtered ? null : sumMoney(unapplied.map((receipt) => receipt.unapplied)),
    unapplied_receipts: filtered ? null : unapplied.length,
    failed_attempts: failed.length,
    priorities,
    breakdowns,
  };
}
