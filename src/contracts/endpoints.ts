/**
 * The typed endpoints of the API, shared by the SPA (which calls them) and the mock API (which answers them in the
 * browser, over the fixtures). Lists of master data return raw records; the collections reads run the rules engine
 * (`src/rules`) over the records as of the as-of date and the active filters, so a card, its chart and the table it
 * opens are always computed from the same invoices.
 *
 * Request context travels in headers: `X-Tenant-Id`, `X-As-Of` (a date, default 2026-10-21) and, on commands,
 * `X-Persona` (the actor).
 */
import { z } from 'zod';

import {
  Broker,
  Channel,
  Claim,
  Client,
  Invoice,
  PaymentAllocation,
  PaymentAttempt,
  Policy,
  Product,
  Receipt,
  Task,
  TaskPriority,
  TaskReason,
  TaskStatus,
  TaskSubjectType,
  User,
} from './entities.js';
import {
  AgingBucket,
  CollectionException,
  CollectionPriority,
  CollectionsSummary,
  InvoiceFacts,
  PeriodOption,
  PeriodWindow,
  ReceiptFacts,
  RuleCode,
  Severity,
  Suggestion,
  TrendMonth,
} from './facts.js';
import { PersonaId } from './personas.js';
import { DateOnly, Id, Instant, Money, Moment, Text } from './primitives.js';
import { RuleConfig } from './ruleConfig.js';

export const TENANT_HEADER = 'X-Tenant-Id';
export const AS_OF_HEADER = 'X-As-Of';
export const PERSONA_HEADER = 'X-Persona';

export interface EndpointContract<R, Q = undefined, B = undefined> {
  /** Unique and stable: the SPA's cache keys match on it, for example `invoices.list`. */
  readonly id: string;
  readonly method: 'GET' | 'POST';
  /** Absolute path; `:name` segments are path parameters. */
  readonly path: string;
  readonly response: z.ZodType<R>;
  readonly query: z.ZodType<Q> | null;
  readonly body: z.ZodType<B> | null;
  readonly idempotent?: boolean;
}

function endpoint<R, Q = undefined, B = undefined>(
  spec: Omit<EndpointContract<R, Q, B>, 'query' | 'body'> & {
    readonly query?: z.ZodType<Q>;
    readonly body?: z.ZodType<B>;
  },
): EndpointContract<R, Q, B> {
  const { query, body, ...rest } = spec;
  return { ...rest, query: query ?? null, body: body ?? null };
}

const API = '/api/v1';

const readContext = { tenant_id: Id, as_of: DateOnly };
const collection = <T extends z.ZodType>(item: T) => z.object({ ...readContext, items: z.array(item) });

/** The filters every collections screen shares: they narrow the invoices, and through them attempts and allocations. */
export const ScopeQuery = z.object({
  product_id: Id.optional(),
  broker_id: Id.optional(),
  channel: Channel.optional(),
  owner_id: Id.optional(),
  client_id: Id.optional(),
  policy_id: Id.optional(),
});
export type ScopeQuery = z.infer<typeof ScopeQuery>;
export const SCOPE_KEYS = ['product_id', 'broker_id', 'channel', 'owner_id', 'client_id', 'policy_id'] as const;
export type ScopeKey = (typeof SCOPE_KEYS)[number];

/** The cash window of the period figures; the as-of date's calendar month so far when absent. */
export const PeriodQuery = z.object({ period: PeriodOption.optional() });

export const SummaryQuery = ScopeQuery.extend(PeriodQuery.shape);
export type SummaryQuery = z.infer<typeof SummaryQuery>;

/** Which invoices a list shows: a KPI card or a chart opens the list with exactly the invoices it counts. */
export const INVOICE_VIEWS = ['all', 'unpaid', 'overdue', 'over-30', 'paid', 'unknown-due'] as const;
export const InvoiceView = z.enum(INVOICE_VIEWS);
export type InvoiceView = z.infer<typeof InvoiceView>;

export const InvoicesQuery = ScopeQuery.extend({
  view: InvoiceView.optional(),
  bucket: AgingBucket.optional(),
  priority: CollectionPriority.optional(),
  rule: RuleCode.optional(),
});
export type InvoicesQuery = z.infer<typeof InvoicesQuery>;

export const RECEIPT_VIEWS = ['all', 'in-period', 'unapplied'] as const;
export const ReceiptView = z.enum(RECEIPT_VIEWS);
export type ReceiptView = z.infer<typeof ReceiptView>;

export const ReceiptsQuery = ScopeQuery.extend({ ...PeriodQuery.shape, view: ReceiptView.optional() });
export type ReceiptsQuery = z.infer<typeof ReceiptsQuery>;

export const ExceptionsQuery = ScopeQuery.extend({
  ...PeriodQuery.shape,
  rule: RuleCode.optional(),
  severity: Severity.optional(),
});
export type ExceptionsQuery = z.infer<typeof ExceptionsQuery>;

export const InvoiceRow = Invoice.extend({ facts: InvoiceFacts });
export type InvoiceRow = z.infer<typeof InvoiceRow>;

export const AllocationDetail = PaymentAllocation.extend({
  received_at: DateOnly,
  bank_ref: z.string(),
  receipt_status: z.string(),
});
export type AllocationDetail = z.infer<typeof AllocationDetail>;

/** One invoice with everything COL-04 traces its values to. */
export const InvoiceDetail = z.object({
  ...readContext,
  invoice: Invoice,
  facts: InvoiceFacts,
  policy: Policy,
  client: Client,
  broker: Broker.nullable(),
  product: Product,
  allocations: z.array(AllocationDetail),
  attempts: z.array(PaymentAttempt),
  /** Claims on the same policy, matched by policy id only; empty means "No linked claims". */
  claims: z.array(Claim),
  /** The invoice's own exceptions with their owner, due date and acknowledgement. */
  exceptions: z.array(CollectionException),
  /** The other invoices of the policy (installments), in due-date order. */
  policy_invoices: z.array(InvoiceFacts),
  suggestion: Suggestion,
});
export type InvoiceDetail = z.infer<typeof InvoiceDetail>;

export const ReceiptDetail = z.object({
  ...readContext,
  receipt: Receipt,
  facts: ReceiptFacts,
  allocations: z.array(PaymentAllocation.extend({ invoice: InvoiceFacts })),
  exceptions: z.array(CollectionException),
});
export type ReceiptDetail = z.infer<typeof ReceiptDetail>;

export const TaskAuditEntry = z.object({
  task_id: Id,
  at: Instant,
  actor: PersonaId,
  action: z.enum(['CREATED', 'ASSIGNED', 'STATUS_CHANGED', 'NOTE_ADDED']),
  from: z.string().nullable(),
  to: z.string().nullable(),
  note: z.string().nullable(),
});
export type TaskAuditEntry = z.infer<typeof TaskAuditEntry>;

export const TaskRecord = Task.extend({ audit: z.array(TaskAuditEntry) });
export type TaskRecord = z.infer<typeof TaskRecord>;

/** A task as `tasks.list` serves it: with whether it is overdue at the as-of date. */
export const TaskListItem = TaskRecord.extend({ overdue: z.boolean() });
export type TaskListItem = z.infer<typeof TaskListItem>;

export const TaskQuery = z.object({
  subject_type: TaskSubjectType.optional(),
  subject_id: Id.optional(),
  assigned_to: Id.optional(),
  status: TaskStatus.optional(),
});
export type TaskQuery = z.infer<typeof TaskQuery>;

export const CreateTaskBody = z.object({
  subject_type: TaskSubjectType,
  subject_id: Id,
  reason: TaskReason,
  assigned_to: Id.nullable().default(null),
  due_at: Moment.nullable().default(null),
  priority: TaskPriority.default('MEDIUM'),
  note: z.string().trim().min(1).max(2000).nullable().default(null),
});
export type CreateTaskBody = z.input<typeof CreateTaskBody>;

export const AssignTaskBody = z.object({ assigned_to: Id });
export type AssignTaskBody = z.infer<typeof AssignTaskBody>;

export const SetTaskStatusBody = z.object({
  status: TaskStatus,
  note: z.string().trim().min(1).max(2000).nullable().default(null),
});
export type SetTaskStatusBody = z.input<typeof SetTaskStatusBody>;

export const AddTaskNoteBody = z.object({ note: z.string().trim().min(1).max(2000) });
export type AddTaskNoteBody = z.infer<typeof AddTaskNoteBody>;

export const AcknowledgeExceptionBody = z.object({
  note: z.string().trim().min(1).max(2000).nullable().default(null),
});
export type AcknowledgeExceptionBody = z.input<typeof AcknowledgeExceptionBody>;

export const DataIssue = z.object({
  /** Counts from 1 in the order found; unique in a list, so it is the key of a row. */
  issue_no: z.number().int().min(1),
  /** `quarantined`: the row was rejected. `warning`: the row loaded, but evidence it should carry is missing. */
  kind: z.enum(['quarantined', 'warning']),
  entity: Text,
  file: Text,
  /** The line in the file, counting the header as line 1. */
  row: z.number().int().min(1),
  record_id: z.string().nullable(),
  field: Text,
  problem: Text,
  fix: Text,
});
export type DataIssue = z.infer<typeof DataIssue>;

export const endpoints = {
  /** The KPIs, aging and exposure breakdowns of the invoices in scope (COL-01, COL-02). */
  collectionsSummary: endpoint({
    id: 'collections.summary',
    method: 'GET',
    path: `${API}/collections/summary`,
    query: SummaryQuery,
    response: z.object({ ...readContext, summary: CollectionsSummary }),
  }),
  /** Receipt cash, arrears recovered and failed attempts per calendar month up to the as-of date (COL-FR-15). */
  collectionsTrend: endpoint({
    id: 'collections.trend',
    method: 'GET',
    path: `${API}/collections/trend`,
    query: ScopeQuery,
    response: z.object({ ...readContext, filtered: z.boolean(), months: z.array(TrendMonth) }),
  }),
  invoicesList: endpoint({
    id: 'invoices.list',
    method: 'GET',
    path: `${API}/invoices`,
    query: InvoicesQuery,
    response: z.object({
      ...readContext,
      items: z.array(InvoiceRow),
      /** Over exactly the listed invoices, so a footer or an export reconciles to the card that opened the list. */
      totals: z.object({ issued: Money, applied: Money, outstanding: Money }),
    }),
  }),
  invoicesGet: endpoint({
    id: 'invoices.get',
    method: 'GET',
    path: `${API}/invoices/:invoiceId`,
    response: InvoiceDetail,
  }),
  receiptsList: endpoint({
    id: 'receipts.list',
    method: 'GET',
    path: `${API}/receipts`,
    query: ReceiptsQuery,
    response: z.object({
      ...readContext,
      period: PeriodWindow,
      filtered: z.boolean(),
      items: z.array(ReceiptFacts),
      totals: z.object({ gross: Money, allocated: Money, unapplied: Money, in_scope: Money }),
    }),
  }),
  receiptsGet: endpoint({
    id: 'receipts.get',
    method: 'GET',
    path: `${API}/receipts/:receiptId`,
    response: ReceiptDetail,
  }),
  /** Failed attempts, unapplied receipts, overdue > 30 days, lapse review, repeat failure and data gaps (COL-03). */
  exceptionsList: endpoint({
    id: 'exceptions.list',
    method: 'GET',
    path: `${API}/exceptions`,
    query: ExceptionsQuery,
    response: z.object({ ...readContext, period: PeriodWindow, items: z.array(CollectionException) }),
  }),
  /** Marks an exception seen, with who and when; the figures do not change. The Executive Viewer may not (403). */
  exceptionsAcknowledge: endpoint({
    id: 'exceptions.acknowledge',
    method: 'POST',
    path: `${API}/exceptions/:exceptionId/acknowledge`,
    body: AcknowledgeExceptionBody,
    response: CollectionException,
  }),
  policiesList: endpoint({ id: 'policies.list', method: 'GET', path: `${API}/policies`, response: collection(Policy) }),
  clientsList: endpoint({ id: 'clients.list', method: 'GET', path: `${API}/clients`, response: collection(Client) }),
  brokersList: endpoint({ id: 'brokers.list', method: 'GET', path: `${API}/brokers`, response: collection(Broker) }),
  productsList: endpoint({ id: 'products.list', method: 'GET', path: `${API}/products`, response: collection(Product) }),
  usersList: endpoint({ id: 'users.list', method: 'GET', path: `${API}/users`, response: collection(User) }),
  tasksList: endpoint({
    id: 'tasks.list',
    method: 'GET',
    path: `${API}/tasks`,
    query: TaskQuery,
    response: collection(TaskListItem),
  }),
  tasksCreate: endpoint({
    id: 'tasks.create',
    method: 'POST',
    path: `${API}/tasks`,
    idempotent: true,
    body: CreateTaskBody,
    response: TaskRecord,
  }),
  tasksAssign: endpoint({
    id: 'tasks.assign',
    method: 'POST',
    path: `${API}/tasks/:taskId/assign`,
    body: AssignTaskBody,
    response: TaskRecord,
  }),
  tasksSetStatus: endpoint({
    id: 'tasks.setStatus',
    method: 'POST',
    path: `${API}/tasks/:taskId/status`,
    body: SetTaskStatusBody,
    response: TaskRecord,
  }),
  tasksAddNote: endpoint({
    id: 'tasks.addNote',
    method: 'POST',
    path: `${API}/tasks/:taskId/notes`,
    body: AddTaskNoteBody,
    response: TaskRecord,
  }),
  /** The rule config the engine runs on. */
  ruleConfigGet: endpoint({
    id: 'rules.config',
    method: 'GET',
    path: `${API}/rule-config`,
    response: z.object({ tenant_id: Id, config: RuleConfig }),
  }),
  dataIssues: endpoint({
    id: 'data.issues',
    method: 'GET',
    path: `${API}/data/issues`,
    response: z.object({ tenant_id: Id, quarantined_rows: z.number().int().min(0), issues: z.array(DataIssue) }),
  }),
  /** Throws away the changes made on top of the active tenant's fixture: actions and acknowledgements. */
  demoReset: endpoint({
    id: 'demo.reset',
    method: 'POST',
    path: `${API}/demo/reset`,
    response: z.object({ tenant_id: Id, reset: z.literal(true) }),
  }),
} as const;

export type Endpoints = typeof endpoints;
