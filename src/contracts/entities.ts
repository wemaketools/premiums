/**
 * The entities of the canonical data model this module reads, one zod schema each, keyed (tenant_id, id). Claims are
 * read only to show the claims linked to a policy; their stage history, reserves and suppliers belong to ClaimsIQ.
 * A field that may be missing in the source and then means "unknown" (a due date, never an amount) is nullable; the
 * rules treat null as UNKNOWN, never as good or bad.
 */
import { z } from 'zod';

import { DataSetId } from './datasets.js';
import { Currency, Id, Instant, Money, Moment, Text } from './primitives.js';

export const ClaimStatus = z.enum(['OPEN', 'CLOSED']);

/** Receipt statuses that are bank-confirmed cash. Any other status is listed but never counted as cash. */
export const CASH_RECEIPT_STATUSES = ['VALIDATED', 'POSTED'] as const;
/** The payment attempt outcome that is a failure to collect: never cash, never an allocation. */
export const FAILED_OUTCOME = 'FAILED';

export const TASK_MODULES = ['COLLECTIONS', 'CLAIMS'] as const;
/** What a recovery action is about: an invoice (the account's due item) or a bank receipt (cash to apply). */
export const TASK_SUBJECT_TYPES = ['INVOICE', 'RECEIPT'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
/** Why the action exists: one of the rules that flag an account, a data gap, or a reason the user writes in the note. */
export const TASK_REASONS = [
  'OVERDUE',
  'REPEAT_FAILURE',
  'FAILED_ATTEMPT',
  'UNAPPLIED_CASH',
  'LAPSE_REVIEW',
  'DATA_QUALITY',
  'OTHER',
] as const;
export const TaskModule = z.enum(TASK_MODULES);
export const TaskSubjectType = z.enum(TASK_SUBJECT_TYPES);
export const TaskPriority = z.enum(TASK_PRIORITIES);
export const TaskStatus = z.enum(TASK_STATUSES);
export const TaskReason = z.enum(TASK_REASONS);
export type TaskSubjectType = z.infer<typeof TaskSubjectType>;
export type TaskPriority = z.infer<typeof TaskPriority>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskReason = z.infer<typeof TaskReason>;

/** The status changes a task allows: a Resolved task can only be reopened, not resumed. */
export const TASK_STATUS_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED'],
  RESOLVED: ['OPEN'],
};

export const Tenant = z.object({
  tenant_id: Id,
  display_name: Text,
  dataset_tag: DataSetId,
});

export const User = z.object({
  tenant_id: Id,
  user_id: Id,
  display_name: Text,
  role: Text,
  team: Text,
});

export const Client = z.object({
  tenant_id: Id,
  client_id: Id,
  name: Text,
  segment: Text,
  region: Text,
  is_corporate: z.boolean(),
});

export const CHANNELS = ['BROKER', 'DIRECT'] as const;
export const Channel = z.enum(CHANNELS);
export type Channel = z.infer<typeof Channel>;

export const Broker = z.object({
  tenant_id: Id,
  broker_id: Id,
  name: Text,
  channel: Channel,
  owner_user_id: Id,
  branch: Text,
});

export const Product = z.object({
  tenant_id: Id,
  product_id: Id,
  class_of_business: Text,
  product_name: Text,
  currency: Currency,
});

export const Policy = z.object({
  tenant_id: Id,
  policy_id: Id,
  policy_number: Text,
  client_id: Id,
  broker_id: Id.nullable(),
  product_id: Id,
  inception_at: Moment,
  expiry_at: Moment,
  /** An imported fact. No collection rule ever changes it: a lapse flag is advisory. */
  status: Text,
});

export const Invoice = z.object({
  tenant_id: Id,
  invoice_id: Id,
  policy_id: Id,
  issue_date: Moment,
  /** Null when the source has none: the invoice cannot be aged, and the loader raises a data-quality warning. */
  due_date: Moment.nullable(),
  issued_amount: Money,
  currency: Currency,
  status: Text,
});

export const Receipt = z.object({
  tenant_id: Id,
  receipt_id: Id,
  received_at: Moment,
  gross_amount: Money,
  currency: Currency,
  bank_ref: Text,
  status: Text,
});

export const PaymentAllocation = z.object({
  tenant_id: Id,
  allocation_id: Id,
  receipt_id: Id,
  invoice_id: Id,
  allocated_amount: Money,
  posted_at: Moment,
});

export const PaymentAttempt = z.object({
  tenant_id: Id,
  attempt_id: Id,
  invoice_id: Id,
  attempt_at: Moment,
  method: Text,
  outcome: Text,
  reason_code: Text.nullable(),
});

export const Claim = z.object({
  tenant_id: Id,
  claim_id: Id,
  policy_id: Id,
  loss_at: Moment.nullable(),
  reported_at: Moment.nullable(),
  stage: Text,
  status: ClaimStatus,
  handler_id: Id,
  supplier_id: Id.nullable(),
  current_outstanding_reserve: Money,
  currency: Currency,
  closed_at: Moment.nullable(),
});

export const Task = z.object({
  tenant_id: Id,
  task_id: Id,
  module: TaskModule,
  subject_type: TaskSubjectType,
  subject_id: Id,
  assigned_to: Id.nullable(),
  due_at: Moment.nullable(),
  priority: TaskPriority,
  status: TaskStatus,
  note: z.string().nullable(),
  updated_at: Instant,
  /** Not a fixture column: a task made in the app always names one, a seeded task reads as OTHER. */
  reason: TaskReason.default('OTHER'),
});

export interface EntityReference {
  readonly field: string;
  readonly entity: EntityName;
  /** An optional reference may be null (a policy without a broker is direct business). */
  readonly optional: boolean;
}

export interface EntityDefinition<S extends z.ZodObject = z.ZodObject> {
  readonly name: EntityName;
  readonly file: string;
  /** The key is (tenant_id, idField). */
  readonly idField: string;
  readonly schema: S;
  readonly booleanFields: readonly string[];
  readonly references: readonly EntityReference[];
}

/** Parents come before the entities that point at them: the loader checks references in this order. */
export const ENTITY_NAMES = [
  'tenant',
  'user',
  'client',
  'broker',
  'product',
  'policy',
  'invoice',
  'receipt',
  'payment_allocation',
  'payment_attempt',
  'claim',
  'task',
] as const;
export type EntityName = (typeof ENTITY_NAMES)[number];

function entity<S extends z.ZodObject>(
  name: EntityName,
  file: string,
  idField: string,
  schema: S,
  extra: { booleanFields?: readonly string[]; references?: readonly EntityReference[] } = {},
): EntityDefinition<S> {
  return { name, file, idField, schema, booleanFields: extra.booleanFields ?? [], references: extra.references ?? [] };
}

const ref = (field: string, target: EntityName, optional = false): EntityReference => ({ field, entity: target, optional });

export const ENTITIES = {
  tenant: entity('tenant', 'tenants.csv', 'tenant_id', Tenant),
  user: entity('user', 'users.csv', 'user_id', User),
  client: entity('client', 'clients.csv', 'client_id', Client, { booleanFields: ['is_corporate'] }),
  broker: entity('broker', 'brokers.csv', 'broker_id', Broker, { references: [ref('owner_user_id', 'user')] }),
  product: entity('product', 'products.csv', 'product_id', Product),
  policy: entity('policy', 'policies.csv', 'policy_id', Policy, {
    references: [ref('client_id', 'client'), ref('broker_id', 'broker', true), ref('product_id', 'product')],
  }),
  invoice: entity('invoice', 'premium_invoices.csv', 'invoice_id', Invoice, { references: [ref('policy_id', 'policy')] }),
  receipt: entity('receipt', 'receipts.csv', 'receipt_id', Receipt),
  payment_allocation: entity('payment_allocation', 'payment_allocations.csv', 'allocation_id', PaymentAllocation, {
    references: [ref('receipt_id', 'receipt'), ref('invoice_id', 'invoice')],
  }),
  payment_attempt: entity('payment_attempt', 'payment_attempts.csv', 'attempt_id', PaymentAttempt, {
    references: [ref('invoice_id', 'invoice')],
  }),
  claim: entity('claim', 'claims.csv', 'claim_id', Claim, { references: [ref('policy_id', 'policy')] }),
  task: entity('task', 'tasks.csv', 'task_id', Task, { references: [ref('assigned_to', 'user', true)] }),
} as const satisfies Record<EntityName, EntityDefinition>;

export type Tenant = z.infer<typeof Tenant>;
export type User = z.infer<typeof User>;
export type Client = z.infer<typeof Client>;
export type Broker = z.infer<typeof Broker>;
export type Product = z.infer<typeof Product>;
export type Policy = z.infer<typeof Policy>;
export type Invoice = z.infer<typeof Invoice>;
export type Receipt = z.infer<typeof Receipt>;
export type PaymentAllocation = z.infer<typeof PaymentAllocation>;
export type PaymentAttempt = z.infer<typeof PaymentAttempt>;
export type Claim = z.infer<typeof Claim>;
export type Task = z.infer<typeof Task>;
