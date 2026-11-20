/**
 * The answers of the read endpoints, as pure functions over a `ReadModel`: the mock API builds the model from the
 * parsed fixtures and the changes kept in the browser and answers through these functions, so a later server can
 * answer the same reads from its own rows without the two drifting apart. The collections reads run the rules engine
 * (`src/rules`) here, over one ledger per request.
 */
import { compareMoney, dateOf, sumMoney } from '../contracts/index.js';
import type {
  CollectionException,
  DataIssue,
  ExceptionsQuery,
  InvoiceDetail,
  InvoiceFacts,
  InvoicesQuery,
  ReceiptDetail,
  ReceiptsQuery,
  RuleConfig,
  ScopeQuery,
  SummaryQuery,
  TaskListItem,
  TaskQuery,
  TaskRecord,
} from '../contracts/index.js';
import {
  buildLedger,
  collectionExceptions,
  collectionsTrend,
  inWindow,
  isOverReview,
  isScoped,
  isTaskOverdue,
  isUnpaid,
  periodWindow,
  scopedReceipts,
  suggestedAction,
  summarize,
} from '../rules/index.js';
import type { Acknowledgement, Ledger } from '../rules/index.js';
import type { DatasetRecords } from './fixtures/index.js';

export interface ReadModel {
  readonly tenantId: string;
  readonly records: Omit<DatasetRecords, 'task'>;
  /** Every task of the tenant with its audit trail, whatever its source. */
  readonly tasks: readonly TaskRecord[];
  /** Exception id to who acknowledged it, when and why. */
  readonly acknowledgements: Readonly<Record<string, Acknowledgement>>;
  readonly ruleConfig: RuleConfig;
  readonly issues: readonly DataIssue[];
}

const byTaskId = (a: { task_id: string }, b: { task_id: string }): number =>
  a.task_id < b.task_id ? -1 : a.task_id > b.task_id ? 1 : 0;

/** Tasks in id order, which is the order they were made in. */
export const tasksInOrder = (tasks: readonly TaskRecord[]): TaskRecord[] => [...tasks].sort(byTaskId);

export function ledgerOf(model: ReadModel, asOf: string): Ledger {
  const { policy, broker, invoice, receipt, payment_allocation, payment_attempt } = model.records;
  return buildLedger(
    {
      policies: policy,
      brokers: broker,
      invoices: invoice,
      receipts: receipt,
      allocations: payment_allocation,
      attempts: payment_attempt,
    },
    { asOf, config: model.ruleConfig.collections },
  );
}

const scopeOf = (query: ScopeQuery): ScopeQuery => {
  const { product_id, broker_id, channel, owner_id, client_id, policy_id } = query;
  return Object.fromEntries(
    Object.entries({ product_id, broker_id, channel, owner_id, client_id, policy_id }).filter(([, value]) => value !== undefined),
  );
};

const collection = <T>(model: ReadModel, asOf: string, items: readonly T[]) => ({
  tenant_id: model.tenantId,
  as_of: asOf,
  items: [...items],
});

function exceptionsOf(model: ReadModel, ledger: Ledger, query: ExceptionsQuery): CollectionException[] {
  return collectionExceptions(ledger, query, { tasks: model.tasks, acknowledgements: model.acknowledgements });
}

/** Whether an invoice belongs in a list view; each view lists exactly what its card or chart counts. */
function inView(facts: InvoiceFacts, query: InvoicesQuery, ledger: Ledger): boolean {
  switch (query.view ?? 'all') {
    case 'all':
      return true;
    case 'unpaid':
      return isUnpaid(facts);
    case 'overdue':
      return facts.overdue;
    case 'over-30':
      return isOverReview(facts, ledger);
    case 'paid':
      return facts.aging_state === 'paid';
    case 'unknown-due':
      return facts.aging_state === 'unknown';
  }
}

/** The distinct rows the loader rejected: one row can carry several problems. */
export const quarantinedRowCount = (issues: readonly DataIssue[]): number =>
  new Set(issues.filter((issue) => issue.kind === 'quarantined').map((issue) => `${issue.entity}:${issue.row}`)).size;

export const reads = {
  collectionsSummary: (model: ReadModel, asOf: string, query: SummaryQuery) => ({
    tenant_id: model.tenantId,
    as_of: asOf,
    summary: summarize(ledgerOf(model, asOf), scopeOf(query), query.period),
  }),

  collectionsTrend: (model: ReadModel, asOf: string, query: ScopeQuery) => ({
    tenant_id: model.tenantId,
    as_of: asOf,
    filtered: isScoped(scopeOf(query)),
    months: collectionsTrend(ledgerOf(model, asOf), scopeOf(query)),
  }),

  invoicesList: (model: ReadModel, asOf: string, query: InvoicesQuery) => {
    const ledger = ledgerOf(model, asOf);
    const wanted = ledger.inScope(scopeOf(query));
    const invoices = new Map(model.records.invoice.map((invoice) => [invoice.invoice_id, invoice]));
    const items = ledger.invoices
      .filter((facts) => wanted.has(facts.invoice_id) && inView(facts, query, ledger))
      .filter((facts) => query.bucket === undefined || facts.bucket === query.bucket)
      .filter((facts) => query.priority === undefined || facts.priority === query.priority)
      .filter((facts) => query.rule === undefined || facts.flags.some((flag) => flag.rule === query.rule))
      .flatMap((facts) => {
        const invoice = invoices.get(facts.invoice_id);
        return invoice === undefined ? [] : [{ ...invoice, facts }];
      });
    return {
      tenant_id: model.tenantId,
      as_of: asOf,
      items,
      totals: {
        issued: sumMoney(items.map((row) => row.facts.issued)),
        applied: sumMoney(items.map((row) => row.facts.applied)),
        outstanding: sumMoney(items.map((row) => row.facts.outstanding)),
      },
    };
  },

  /** `null` when the invoice does not exist. */
  invoicesGet: (model: ReadModel, asOf: string, invoiceId: string): InvoiceDetail | null => {
    const { invoice, policy, client, broker, product, receipt, claim } = model.records;
    const record = invoice.find((row) => row.invoice_id === invoiceId);
    const ledger = ledgerOf(model, asOf);
    const facts = ledger.invoiceById.get(invoiceId);
    if (record === undefined || facts === undefined) return null;
    const policyRow = policy.find((row) => row.policy_id === record.policy_id);
    const clientRow = client.find((row) => row.client_id === policyRow?.client_id);
    const productRow = product.find((row) => row.product_id === policyRow?.product_id);
    if (policyRow === undefined || clientRow === undefined || productRow === undefined) return null;
    const receipts = new Map(receipt.map((row) => [row.receipt_id, row]));
    return {
      tenant_id: model.tenantId,
      as_of: asOf,
      invoice: record,
      facts,
      policy: policyRow,
      client: clientRow,
      broker: broker.find((row) => row.broker_id === policyRow.broker_id) ?? null,
      product: productRow,
      allocations: ledger.allocations
        .filter((allocation) => allocation.invoice_id === invoiceId)
        .map((allocation) => {
          const source = receipts.get(allocation.receipt_id);
          return {
            ...allocation,
            received_at: source === undefined ? dateOf(allocation.posted_at) : dateOf(source.received_at),
            bank_ref: source?.bank_ref ?? '',
            receipt_status: source?.status ?? '',
          };
        }),
      attempts: ledger.attempts.filter((attempt) => attempt.invoice_id === invoiceId),
      claims: claim.filter((row) => row.policy_id === record.policy_id).sort((a, b) => (a.claim_id < b.claim_id ? -1 : 1)),
      exceptions: exceptionsOf(model, ledger, { period: 'ytd' }).filter(
        (item) => item.subject_type === 'INVOICE' && item.subject_id === invoiceId,
      ),
      policy_invoices: ledger.invoices
        .filter((other) => other.policy_id === record.policy_id)
        .sort((a, b) => String(a.due_date ?? '9999').localeCompare(String(b.due_date ?? '9999')) || a.invoice_id.localeCompare(b.invoice_id)),
      suggestion: suggestedAction(facts),
    };
  },

  receiptsList: (model: ReadModel, asOf: string, query: ReceiptsQuery) => {
    const ledger = ledgerOf(model, asOf);
    const window = periodWindow(asOf, query.period);
    const scope = scopeOf(query);
    const items = scopedReceipts(ledger, scope).filter((receipt) => {
      switch (query.view ?? 'all') {
        case 'all':
          return true;
        case 'in-period':
          return receipt.is_cash && inWindow(receipt.received_at, window);
        case 'unapplied':
          return compareMoney(receipt.unapplied, '0.00') > 0;
      }
    });
    return {
      tenant_id: model.tenantId,
      as_of: asOf,
      period: window,
      filtered: isScoped(scope),
      items,
      totals: {
        gross: sumMoney(items.map((receipt) => receipt.gross_amount)),
        allocated: sumMoney(items.map((receipt) => receipt.allocated)),
        unapplied: sumMoney(items.map((receipt) => receipt.unapplied)),
        in_scope: sumMoney(items.map((receipt) => receipt.in_scope)),
      },
    };
  },

  /** `null` when the receipt does not exist as of the date. */
  receiptsGet: (model: ReadModel, asOf: string, receiptId: string): ReceiptDetail | null => {
    const ledger = ledgerOf(model, asOf);
    const record = model.records.receipt.find((row) => row.receipt_id === receiptId);
    const facts = ledger.receipts.find((row) => row.receipt_id === receiptId);
    if (record === undefined || facts === undefined) return null;
    return {
      tenant_id: model.tenantId,
      as_of: asOf,
      receipt: record,
      facts,
      allocations: ledger.allocations
        .filter((allocation) => allocation.receipt_id === receiptId)
        .flatMap((allocation) => {
          const invoice = ledger.invoiceById.get(allocation.invoice_id);
          return invoice === undefined ? [] : [{ ...allocation, invoice }];
        }),
      exceptions: exceptionsOf(model, ledger, {}).filter(
        (item) => item.subject_type === 'RECEIPT' && item.subject_id === receiptId,
      ),
    };
  },

  exceptionsList: (model: ReadModel, asOf: string, query: ExceptionsQuery) => ({
    tenant_id: model.tenantId,
    as_of: asOf,
    period: periodWindow(asOf, query.period),
    items: exceptionsOf(model, ledgerOf(model, asOf), { ...query, ...scopeOf(query) }),
  }),

  /** The exception as listed now, or `null` when it does not exist as of the date (in any period of the year). */
  exceptionById: (model: ReadModel, asOf: string, exceptionId: string): CollectionException | null =>
    exceptionsOf(model, ledgerOf(model, asOf), { period: 'ytd' }).find((item) => item.exception_id === exceptionId) ?? null,

  policiesList: (model: ReadModel, asOf: string) => collection(model, asOf, model.records.policy),
  clientsList: (model: ReadModel, asOf: string) => collection(model, asOf, model.records.client),
  brokersList: (model: ReadModel, asOf: string) => collection(model, asOf, model.records.broker),
  productsList: (model: ReadModel, asOf: string) => collection(model, asOf, model.records.product),
  usersList: (model: ReadModel, asOf: string) => collection(model, asOf, model.records.user),

  tasksList: (model: ReadModel, asOf: string, query: TaskQuery) => {
    const { subject_type, subject_id, assigned_to, status } = query;
    const tasks: TaskListItem[] = tasksInOrder(model.tasks)
      .filter((task) => subject_type === undefined || task.subject_type === subject_type)
      .filter((task) => subject_id === undefined || task.subject_id === subject_id)
      .filter((task) => assigned_to === undefined || task.assigned_to === assigned_to)
      .filter((task) => status === undefined || task.status === status)
      .map((task) => ({ ...task, overdue: isTaskOverdue(task, asOf) }));
    return collection(model, asOf, tasks);
  },

  ruleConfig: (model: ReadModel) => ({ tenant_id: model.tenantId, config: model.ruleConfig }),

  dataIssues: (model: ReadModel) => ({
    tenant_id: model.tenantId,
    quarantined_rows: quarantinedRowCount(model.issues),
    issues: [...model.issues],
  }),
};
