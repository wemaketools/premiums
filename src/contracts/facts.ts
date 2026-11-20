/**
 * What the collections rules engine computes from the records: the facts of each invoice and receipt, the flags of
 * the rules, the exceptions the screens list, the totals and breakdowns of the overview and the monthly trend.
 * Written premium, premium due, receipt cash and allocations are different measures and stay in separate fields:
 * no field is ever the sum of two of them.
 */
import { z } from 'zod';

import { Channel } from './entities.js';
import { PersonaId } from './personas.js';
import { DateOnly, Id, Instant, Money } from './primitives.js';

/** Non-overlapping: current/not due (≤ 0 days), 1-30, 31-60, 61-90, more than 90 days overdue. */
export const AGING_BUCKETS = ['current', '1-30', '31-60', '61-90', '>90'] as const;
export const AgingBucket = z.enum(AGING_BUCKETS);
export type AgingBucket = z.infer<typeof AgingBucket>;

/**
 * Where an invoice stands for aging: `aged` (unpaid with a due date: it has a bucket), `paid` (nothing outstanding:
 * excluded from active aging) or `unknown` (no due date: never given a bucket, never overdue).
 */
export const AGING_STATES = ['aged', 'paid', 'unknown'] as const;
export const AgingState = z.enum(AGING_STATES);
export type AgingState = z.infer<typeof AgingState>;

/** The proposed collection priority: High over 90 days or a repeat failure on an overdue invoice, Medium 31-90, Low 1-30, Current no escalation. */
export const COLLECTION_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW', 'CURRENT'] as const;
export const CollectionPriority = z.enum(COLLECTION_PRIORITIES);
export type CollectionPriority = z.infer<typeof CollectionPriority>;

export const SEVERITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export const Severity = z.enum(SEVERITIES);
export type Severity = z.infer<typeof Severity>;

/** The rules that flag an account or a receipt. Every flag carries its rule id and an advisory caveat on screen. */
export const RULE_CODES = [
  'OVERDUE_30',
  'REPEAT_FAILURE',
  'LAPSE_REVIEW',
  'UNAPPLIED_CASH',
  'FAILED_ATTEMPT',
  'DATA_QUALITY',
] as const;
export const RuleCode = z.enum(RULE_CODES);
export type RuleCode = z.infer<typeof RuleCode>;

export const RULE_IDS: Readonly<Record<RuleCode, string>> = {
  OVERDUE_30: 'COL-R01',
  REPEAT_FAILURE: 'COL-R02',
  LAPSE_REVIEW: 'COL-R03',
  UNAPPLIED_CASH: 'COL-R04',
  FAILED_ATTEMPT: 'COL-R05',
  DATA_QUALITY: 'COL-R06',
};

/** The cash window of the period figures; the balances are always as of the as-of date. */
export const PERIOD_OPTIONS = ['month', 'last-30', 'last-90', 'ytd'] as const;
export const PeriodOption = z.enum(PERIOD_OPTIONS);
export type PeriodOption = z.infer<typeof PeriodOption>;
export const DEFAULT_PERIOD: PeriodOption = 'month';

export const PeriodWindow = z.object({
  option: PeriodOption,
  /** First and last day of the window, both included; `to` never passes the as-of date. */
  from: DateOnly,
  to: DateOnly,
});
export type PeriodWindow = z.infer<typeof PeriodWindow>;

/** The numbers a flag rests on; which are set depends on the rule. */
export const FlagMeasure = z.object({
  days_overdue: z.number().int().nullable(),
  amount: Money.nullable(),
  count: z.number().int().nullable(),
});
export type FlagMeasure = z.infer<typeof FlagMeasure>;

export const Flag = z.object({
  rule: RuleCode,
  rule_id: z.string(),
  severity: Severity,
  /** The day the rule's condition first held, by the records. */
  triggered_at: DateOnly,
  measure: FlagMeasure,
  /** The records the flag rests on (the invoice, its attempts, the receipt). */
  source_ids: z.array(Id),
});
export type Flag = z.infer<typeof Flag>;

export const InvoiceFacts = z.object({
  invoice_id: Id,
  policy_id: Id,
  client_id: Id,
  broker_id: Id.nullable(),
  product_id: Id,
  channel: Channel,
  /** The account owner: the owner of the policy's broker or channel; null for direct business without one. */
  owner_id: Id.nullable(),
  issue_date: DateOnly,
  due_date: DateOnly.nullable(),
  issued: Money,
  /** The valid allocations posted to the invoice on or before the as-of date. */
  applied: Money,
  /** max(0, issued - applied). */
  outstanding: Money,
  aging_state: AgingState,
  /** max(0, as-of - due date) for an aged invoice; null when paid or the due date is unknown. */
  days_overdue: z.number().int().min(0).nullable(),
  /** Due date before the as-of date and something outstanding. Due today is not overdue. */
  overdue: z.boolean(),
  bucket: AgingBucket.nullable(),
  priority: CollectionPriority.nullable(),
  /** Failed attempts on the invoice inside the repeat-failure window. */
  recent_failed_attempts: z.number().int().min(0),
  last_attempt_at: DateOnly.nullable(),
  flags: z.array(Flag),
});
export type InvoiceFacts = z.infer<typeof InvoiceFacts>;

export const ReceiptFacts = z.object({
  receipt_id: Id,
  received_at: DateOnly,
  gross_amount: Money,
  bank_ref: z.string(),
  status: z.string(),
  /** Bank-confirmed (validated or posted): only then is it cash and can it be unapplied. */
  is_cash: z.boolean(),
  /** The valid allocations from the receipt posted on or before the as-of date. */
  allocated: Money,
  /** max(0, gross - allocated) for a cash receipt; 0.00 otherwise. */
  unapplied: Money,
  /** The invoices the receipt was applied to. */
  invoice_ids: z.array(Id),
  /** The part of the receipt the current filters reach: the gross with no filter, else its allocations to invoices in scope. */
  in_scope: Money,
});
export type ReceiptFacts = z.infer<typeof ReceiptFacts>;

export const BucketTotal = z.object({ bucket: AgingBucket, amount: Money, invoices: z.number().int().min(0) });
export type BucketTotal = z.infer<typeof BucketTotal>;

/** One group of a breakdown: every unpaid invoice lands in exactly one group, so the groups add up to the total. */
export const ExposureRow = z.object({
  /** Null groups the invoices without one (direct business has no broker; an account may have no owner). */
  id: z.string().nullable(),
  unpaid: Money,
  overdue: Money,
  over_30: Money,
  invoices: z.number().int().min(0),
  buckets: z.array(BucketTotal),
});
export type ExposureRow = z.infer<typeof ExposureRow>;

export const BREAKDOWN_DIMENSIONS = ['product', 'broker', 'channel', 'client', 'owner'] as const;
export const BreakdownDimension = z.enum(BREAKDOWN_DIMENSIONS);
export type BreakdownDimension = z.infer<typeof BreakdownDimension>;

export const CollectionsSummary = z.object({
  as_of: DateOnly,
  period: PeriodWindow,
  /** A filter narrows the invoices: unapplied cash cannot be attributed to a broker, product or client then. */
  filtered: z.boolean(),
  invoices: z.number().int().min(0),
  issued: Money,
  applied: Money,
  /** Gross unpaid: every outstanding balance, future-due included. Not "collectible". */
  unpaid: Money,
  unpaid_invoices: z.number().int().min(0),
  overdue: Money,
  overdue_invoices: z.number().int().min(0),
  over_30: Money,
  over_30_invoices: z.number().int().min(0),
  /** Unpaid balances of invoices without a due date: in gross unpaid, never in a bucket. */
  unknown_due: Money,
  unknown_due_invoices: z.number().int().min(0),
  aging: z.array(BucketTotal),
  /** Cash received in the period: whole receipts with no filter, their allocations to invoices in scope with one. */
  received: Money,
  receipts: z.number().int().min(0),
  /** Unapplied cash at the as-of date; null while a filter is set (it belongs to no invoice). */
  unapplied: Money.nullable(),
  unapplied_receipts: z.number().int().min(0).nullable(),
  failed_attempts: z.number().int().min(0),
  priorities: z.record(CollectionPriority, z.number().int().min(0)),
  breakdowns: z.record(BreakdownDimension, z.array(ExposureRow)),
});
export type CollectionsSummary = z.infer<typeof CollectionsSummary>;

export const TrendMonth = z.object({
  /** `YYYY-MM`. */
  month: z.string(),
  from: DateOnly,
  /** The month's last day, or the as-of date in the as-of month. */
  to: DateOnly,
  /** Bank receipt cash received in the month (whole receipts with no filter; allocations in scope with one). */
  received: Money,
  /** Allocations posted in the month to invoices already overdue when the month opened: arrears recovered. */
  arrears_recovered: Money,
  /** Allocations posted in the month to invoices not overdue when it opened. */
  current_applied: Money,
  failed_attempts: z.number().int().min(0),
});
export type TrendMonth = z.infer<typeof TrendMonth>;

export const ExceptionAcknowledgement = z.object({
  at: Instant,
  actor: PersonaId,
  note: z.string().nullable(),
});

export const CollectionException = z.object({
  /** `<rule>:<subject id>`, stable across reloads: an acknowledgement is kept under it. */
  exception_id: z.string(),
  rule: RuleCode,
  rule_id: z.string(),
  severity: Severity,
  subject_type: z.enum(['INVOICE', 'RECEIPT']),
  subject_id: Id,
  /** The attempt of a failed-attempt exception. */
  attempt_id: Id.nullable(),
  reason_code: z.string().nullable(),
  policy_id: Id.nullable(),
  /** The assignee of the subject's open recovery action, else the account owner; null when nobody owns it. */
  owner_id: Id.nullable(),
  triggered_at: DateOnly,
  /** The due date of the open action on the subject, else the triggered date plus the response days of the severity. */
  due_at: DateOnly,
  late: z.boolean(),
  measure: FlagMeasure,
  source_ids: z.array(Id),
  open_task_id: Id.nullable(),
  acknowledged: ExceptionAcknowledgement.nullable(),
});
export type CollectionException = z.infer<typeof CollectionException>;

/** The suggested next action of an invoice, one per flag in order of urgency; a suggestion, never an instruction. */
export const SUGGESTIONS = ['fix-data', 'cover-review', 'update-debit-order', 'escalate-arrears', 'remind', 'none'] as const;
export const Suggestion = z.enum(SUGGESTIONS);
export type Suggestion = z.infer<typeof Suggestion>;
