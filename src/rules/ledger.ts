/**
 * The collections ledger as of a date: the facts of every invoice and receipt, computed once from the records.
 *
 * - An allocation counts (is "valid") when it is posted on or before the as-of date and comes from a bank-confirmed
 *   receipt (validated or posted) received on or before it. Receipts reach invoices ONLY through allocations.
 * - A failed payment attempt is never cash and never an allocation: it only feeds the attempt counts and flags.
 * - Invoices are billed schedule items: every one counts, whatever its issue date (a future-due item is "current").
 * - Money goes through decimal.js; a JS float never touches an amount.
 */
import {
  CASH_RECEIPT_STATUSES,
  FAILED_OUTCOME,
  RULE_IDS,
  compareMoney,
  dateOf,
  sumMoney,
  subtractMoney,
} from '../contracts/index.js';
import type {
  AgingBucket,
  Broker,
  CollectionPriority,
  CollectionsRuleConfig,
  Flag,
  Invoice,
  InvoiceFacts,
  PaymentAllocation,
  PaymentAttempt,
  Policy,
  Receipt,
  ReceiptFacts,
  ScopeQuery,
  Severity,
} from '../contracts/index.js';
import { addDays, daysBetween } from './calendar.js';

export interface LedgerRecords {
  readonly policies: readonly Policy[];
  readonly brokers: readonly Broker[];
  readonly invoices: readonly Invoice[];
  readonly receipts: readonly Receipt[];
  readonly allocations: readonly PaymentAllocation[];
  readonly attempts: readonly PaymentAttempt[];
}

export interface LedgerContext {
  readonly asOf: string;
  readonly config: CollectionsRuleConfig;
}

export interface Ledger {
  readonly asOf: string;
  readonly config: CollectionsRuleConfig;
  /** Every invoice, in id order. */
  readonly invoices: readonly InvoiceFacts[];
  readonly invoiceById: ReadonlyMap<string, InvoiceFacts>;
  /** Receipts received on or before the as-of date, in id order. */
  readonly receipts: readonly ReceiptFacts[];
  /** The valid allocations (see above). */
  readonly allocations: readonly PaymentAllocation[];
  /** Attempts made on or before the as-of date. */
  readonly attempts: readonly PaymentAttempt[];
  /** The invoice ids the scope leaves. */
  readonly inScope: (scope: ScopeQuery) => ReadonlySet<string>;
}

const ZERO = '0.00';

export const isCashStatus = (status: string): boolean =>
  (CASH_RECEIPT_STATUSES as readonly string[]).includes(status.toUpperCase());

export const isFailed = (attempt: PaymentAttempt): boolean => attempt.outcome.toUpperCase() === FAILED_OUTCOME;

const byId = <T>(id: (item: T) => string) => (a: T, b: T): number => (id(a) < id(b) ? -1 : id(a) > id(b) ? 1 : 0);

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const list = grouped.get(key(item));
    if (list === undefined) grouped.set(key(item), [item]);
    else list.push(item);
  }
  return grouped;
}

export function bucketOf(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '>90';
}

/** The proposed priority order: High over 90 days or a repeat failure on an overdue invoice; Medium 31-90; Low 1-30; Current not due. */
export function priorityOf(daysOverdue: number, repeatFailure: boolean): CollectionPriority {
  if (daysOverdue > 90 || (repeatFailure && daysOverdue > 0)) return 'HIGH';
  if (daysOverdue > 30) return 'MEDIUM';
  if (daysOverdue > 0) return 'LOW';
  return 'CURRENT';
}

/** The severity of an exception about an invoice of this priority: no escalation stays Low. */
export function severityOfPriority(priority: CollectionPriority | null): Severity {
  return priority === 'HIGH' ? 'HIGH' : priority === 'MEDIUM' ? 'MEDIUM' : 'LOW';
}

const measure = (values: Partial<Flag['measure']>): Flag['measure'] => ({
  days_overdue: values.days_overdue ?? null,
  amount: values.amount ?? null,
  count: values.count ?? null,
});

function invoiceFacts(
  invoice: Invoice,
  policy: Policy | undefined,
  broker: Broker | undefined,
  applied: string,
  attempts: readonly PaymentAttempt[],
  { asOf, config }: LedgerContext,
): InvoiceFacts {
  const outstandingRaw = subtractMoney(invoice.issued_amount, applied);
  const outstanding = compareMoney(outstandingRaw, ZERO) > 0 ? outstandingRaw : ZERO;
  const unpaid = compareMoney(outstanding, ZERO) > 0;
  const dueDate = invoice.due_date === null ? null : dateOf(invoice.due_date);

  const failed = attempts
    .filter(isFailed)
    .filter((attempt) => {
      const age = daysBetween(dateOf(attempt.attempt_at), asOf);
      return age >= 0 && age < config.repeat_failed_attempts_rolling_days;
    })
    .sort((a, b) => (dateOf(a.attempt_at) < dateOf(b.attempt_at) ? -1 : dateOf(a.attempt_at) > dateOf(b.attempt_at) ? 1 : a.attempt_id < b.attempt_id ? -1 : 1));
  const repeatFailure = failed.length >= config.repeat_failed_attempt_count;
  const lastAttempt = attempts.reduce<string | null>((latest, attempt) => {
    const day = dateOf(attempt.attempt_at);
    return latest === null || day > latest ? day : latest;
  }, null);

  let agingState: InvoiceFacts['aging_state'];
  let days: number | null = null;
  let bucket: AgingBucket | null = null;
  let priority: CollectionPriority | null = null;
  if (!unpaid) {
    agingState = 'paid';
  } else if (dueDate === null) {
    agingState = 'unknown';
  } else {
    agingState = 'aged';
    days = Math.max(0, daysBetween(dueDate, asOf));
    bucket = bucketOf(days);
    priority = priorityOf(days, repeatFailure);
  }
  const overdue = agingState === 'aged' && days !== null && days > 0;

  const flags: Flag[] = [];
  const severity = severityOfPriority(priority);
  if (dueDate !== null && days !== null && days > config.overdue_30_review_days) {
    flags.push({
      rule: 'OVERDUE_30',
      rule_id: RULE_IDS.OVERDUE_30,
      severity,
      triggered_at: addDays(dueDate, config.overdue_30_review_days + 1),
      measure: measure({ days_overdue: days, amount: outstanding }),
      source_ids: [invoice.invoice_id],
    });
  }
  if (repeatFailure) {
    const reached = failed[config.repeat_failed_attempt_count - 1];
    flags.push({
      rule: 'REPEAT_FAILURE',
      rule_id: RULE_IDS.REPEAT_FAILURE,
      severity: overdue ? 'HIGH' : 'MEDIUM',
      triggered_at: reached === undefined ? asOf : dateOf(reached.attempt_at),
      measure: measure({ count: failed.length, amount: outstanding, days_overdue: days }),
      source_ids: [invoice.invoice_id, ...failed.map((attempt) => attempt.attempt_id)],
    });
  }
  if (dueDate !== null && days !== null && days >= config.lapse_review_days) {
    flags.push({
      rule: 'LAPSE_REVIEW',
      rule_id: RULE_IDS.LAPSE_REVIEW,
      severity,
      triggered_at: addDays(dueDate, config.lapse_review_days),
      measure: measure({ days_overdue: days, amount: outstanding }),
      source_ids: [invoice.invoice_id, invoice.policy_id],
    });
  }
  if (dueDate === null) {
    flags.push({
      rule: 'DATA_QUALITY',
      rule_id: RULE_IDS.DATA_QUALITY,
      severity: 'HIGH',
      triggered_at: dateOf(invoice.issue_date),
      measure: measure({ amount: outstanding }),
      source_ids: [invoice.invoice_id],
    });
  }

  return {
    invoice_id: invoice.invoice_id,
    policy_id: invoice.policy_id,
    client_id: policy?.client_id ?? '',
    broker_id: policy?.broker_id ?? null,
    product_id: policy?.product_id ?? '',
    channel: broker?.channel ?? 'DIRECT',
    owner_id: broker?.owner_user_id ?? null,
    issue_date: dateOf(invoice.issue_date),
    due_date: dueDate,
    issued: invoice.issued_amount,
    applied,
    outstanding,
    aging_state: agingState,
    days_overdue: days,
    overdue,
    bucket,
    priority,
    recent_failed_attempts: failed.length,
    last_attempt_at: lastAttempt,
    flags,
  };
}

export function buildLedger(records: LedgerRecords, context: LedgerContext): Ledger {
  const { asOf } = context;
  const policies = new Map(records.policies.map((policy) => [policy.policy_id, policy]));
  const brokers = new Map(records.brokers.map((broker) => [broker.broker_id, broker]));

  const visibleReceipts = records.receipts.filter((receipt) => dateOf(receipt.received_at) <= asOf);
  const cashReceipts = new Map(
    visibleReceipts.filter((receipt) => isCashStatus(receipt.status)).map((receipt) => [receipt.receipt_id, receipt]),
  );
  const allocations = records.allocations
    .filter((allocation) => dateOf(allocation.posted_at) <= asOf && cashReceipts.has(allocation.receipt_id))
    .sort(byId((allocation) => allocation.allocation_id));
  const attempts = records.attempts
    .filter((attempt) => dateOf(attempt.attempt_at) <= asOf)
    .sort(byId((attempt) => attempt.attempt_id));

  const allocationsByInvoice = groupBy(allocations, (allocation) => allocation.invoice_id);
  const allocationsByReceipt = groupBy(allocations, (allocation) => allocation.receipt_id);
  const attemptsByInvoice = groupBy(attempts, (attempt) => attempt.invoice_id);

  const invoices = [...records.invoices].sort(byId((invoice) => invoice.invoice_id)).map((invoice) => {
    const policy = policies.get(invoice.policy_id);
    const broker = policy?.broker_id === null || policy?.broker_id === undefined ? undefined : brokers.get(policy.broker_id);
    const applied = sumMoney((allocationsByInvoice.get(invoice.invoice_id) ?? []).map((allocation) => allocation.allocated_amount));
    return invoiceFacts(invoice, policy, broker, applied, attemptsByInvoice.get(invoice.invoice_id) ?? [], context);
  });
  const invoiceById = new Map(invoices.map((facts) => [facts.invoice_id, facts]));

  const receipts: ReceiptFacts[] = [...visibleReceipts].sort(byId((receipt) => receipt.receipt_id)).map((receipt) => {
    const isCash = isCashStatus(receipt.status);
    const own = allocationsByReceipt.get(receipt.receipt_id) ?? [];
    const allocated = sumMoney(own.map((allocation) => allocation.allocated_amount));
    const remainder = subtractMoney(receipt.gross_amount, allocated);
    return {
      receipt_id: receipt.receipt_id,
      received_at: dateOf(receipt.received_at),
      gross_amount: receipt.gross_amount,
      bank_ref: receipt.bank_ref,
      status: receipt.status,
      is_cash: isCash,
      allocated,
      unapplied: isCash && compareMoney(remainder, ZERO) > 0 ? remainder : ZERO,
      invoice_ids: [...new Set(own.map((allocation) => allocation.invoice_id))].sort(),
      in_scope: isCash ? receipt.gross_amount : ZERO,
    };
  });

  const inScope = (scope: ScopeQuery): ReadonlySet<string> =>
    new Set(
      invoices
        .filter(
          (facts) =>
            (scope.product_id === undefined || facts.product_id === scope.product_id) &&
            (scope.broker_id === undefined || facts.broker_id === scope.broker_id) &&
            (scope.channel === undefined || facts.channel === scope.channel) &&
            (scope.owner_id === undefined || facts.owner_id === scope.owner_id) &&
            (scope.client_id === undefined || facts.client_id === scope.client_id) &&
            (scope.policy_id === undefined || facts.policy_id === scope.policy_id),
        )
        .map((facts) => facts.invoice_id),
    );

  return { asOf, config: context.config, invoices, invoiceById, receipts, allocations, attempts, inScope };
}

/** True when a scope filter is set: the figures then cover only the invoices it leaves. */
export function isScoped(scope: ScopeQuery): boolean {
  return Object.values(scope).some((value) => value !== undefined);
}

/**
 * Receipts with the part of each the scope reaches: the whole receipt with no filter, else its allocations to the
 * invoices in scope (cash that reaches no invoice in scope is left out, never guessed).
 */
export function scopedReceipts(ledger: Ledger, scope: ScopeQuery): ReceiptFacts[] {
  if (!isScoped(scope)) return [...ledger.receipts];
  const wanted = ledger.inScope(scope);
  const byReceipt = groupBy(
    ledger.allocations.filter((allocation) => wanted.has(allocation.invoice_id)),
    (allocation) => allocation.receipt_id,
  );
  return ledger.receipts.flatMap((receipt) => {
    const own = byReceipt.get(receipt.receipt_id);
    return own === undefined || !receipt.is_cash
      ? []
      : [{ ...receipt, in_scope: sumMoney(own.map((allocation) => allocation.allocated_amount)) }];
  });
}
