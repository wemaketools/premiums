/**
 * The exceptions of COL-03: the flags of the invoices in scope (overdue beyond review, repeat failure, lapse review,
 * missing due date), every failed attempt in the period, and every receipt with unapplied cash. Each carries its rule,
 * severity, evidence, owner and due date; an acknowledgement marks it seen and changes no figure.
 */
import { RULE_IDS, compareMoney, dateOf } from '../contracts/index.js';
import type {
  CollectionException,
  ExceptionsQuery,
  Severity,
  TaskRecord,
} from '../contracts/index.js';
import { addDays, inWindow, periodWindow } from './calendar.js';
import { isFailed, isScoped, severityOfPriority } from './ledger.js';
import type { Ledger } from './ledger.js';

/** Days to respond to an exception without an action of its own: a POC default, not an insurer service level. */
export const RESPONSE_DAYS: Readonly<Record<Severity, number>> = { HIGH: 2, MEDIUM: 5, LOW: 10 };

const SEVERITY_ORDER: Readonly<Record<Severity, number>> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export type Acknowledgement = CollectionException['acknowledged'] & {};

export interface ExceptionInputs {
  /** Every task of the tenant; the open one on a subject sets the exception's owner and due date. */
  readonly tasks: readonly TaskRecord[];
  readonly acknowledgements: Readonly<Record<string, Acknowledgement>>;
}

type Draft = Omit<CollectionException, 'owner_id' | 'due_at' | 'late' | 'open_task_id' | 'acknowledged'> & {
  readonly account_owner: string | null;
};

/** The open (not resolved) task on a subject, the newest first. */
export function openTaskOn(tasks: readonly TaskRecord[], subjectType: string, subjectId: string): TaskRecord | undefined {
  return tasks
    .filter((task) => task.subject_type === subjectType && task.subject_id === subjectId && task.status !== 'RESOLVED')
    .sort((a, b) => (a.task_id < b.task_id ? 1 : a.task_id > b.task_id ? -1 : 0))[0];
}

export function collectionExceptions(ledger: Ledger, query: ExceptionsQuery, inputs: ExceptionInputs): CollectionException[] {
  const { rule, severity, period, ...scope } = query;
  const window = periodWindow(ledger.asOf, period);
  const wanted = ledger.inScope(scope);
  const drafts: Draft[] = [];

  for (const facts of ledger.invoices.filter((invoice) => wanted.has(invoice.invoice_id))) {
    for (const flag of facts.flags) {
      drafts.push({
        exception_id: `${flag.rule}:${facts.invoice_id}`,
        rule: flag.rule,
        rule_id: flag.rule_id,
        severity: flag.severity,
        subject_type: 'INVOICE',
        subject_id: facts.invoice_id,
        attempt_id: null,
        reason_code: null,
        policy_id: facts.policy_id,
        triggered_at: flag.triggered_at,
        measure: flag.measure,
        source_ids: flag.source_ids,
        account_owner: facts.owner_id,
      });
    }
  }

  for (const attempt of ledger.attempts) {
    const facts = ledger.invoiceById.get(attempt.invoice_id);
    if (facts === undefined || !wanted.has(facts.invoice_id) || !isFailed(attempt)) continue;
    if (!inWindow(dateOf(attempt.attempt_at), window)) continue;
    drafts.push({
      exception_id: `FAILED_ATTEMPT:${attempt.attempt_id}`,
      rule: 'FAILED_ATTEMPT',
      rule_id: RULE_IDS.FAILED_ATTEMPT,
      severity: severityOfPriority(facts.priority),
      subject_type: 'INVOICE',
      subject_id: facts.invoice_id,
      attempt_id: attempt.attempt_id,
      reason_code: attempt.reason_code,
      policy_id: facts.policy_id,
      triggered_at: dateOf(attempt.attempt_at),
      measure: { days_overdue: facts.days_overdue, amount: facts.outstanding, count: null },
      source_ids: [attempt.attempt_id, facts.invoice_id],
      account_owner: facts.owner_id,
    });
  }

  // Unapplied cash belongs to no invoice, so a broker, product or client filter cannot reach it.
  if (!isScoped(scope)) {
    for (const receipt of ledger.receipts.filter((item) => compareMoney(item.unapplied, '0.00') > 0)) {
      drafts.push({
        exception_id: `UNAPPLIED_CASH:${receipt.receipt_id}`,
        rule: 'UNAPPLIED_CASH',
        rule_id: RULE_IDS.UNAPPLIED_CASH,
        severity: 'MEDIUM',
        subject_type: 'RECEIPT',
        subject_id: receipt.receipt_id,
        attempt_id: null,
        reason_code: null,
        policy_id: null,
        triggered_at: receipt.received_at,
        measure: { days_overdue: null, amount: receipt.unapplied, count: null },
        source_ids: [receipt.receipt_id],
        account_owner: null,
      });
    }
  }

  return drafts
    .filter((draft) => (rule === undefined || draft.rule === rule) && (severity === undefined || draft.severity === severity))
    .map((draft): CollectionException => {
      const { account_owner, ...rest } = draft;
      const task = openTaskOn(inputs.tasks, draft.subject_type, draft.subject_id);
      const dueAt =
        task?.due_at !== null && task?.due_at !== undefined
          ? dateOf(task.due_at)
          : addDays(draft.triggered_at, RESPONSE_DAYS[draft.severity]);
      return {
        ...rest,
        owner_id: task?.assigned_to ?? account_owner,
        due_at: dueAt,
        late: dueAt < ledger.asOf,
        open_task_id: task?.task_id ?? null,
        acknowledged: inputs.acknowledgements[draft.exception_id] ?? null,
      };
    })
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        (a.triggered_at < b.triggered_at ? -1 : a.triggered_at > b.triggered_at ? 1 : 0) ||
        (a.exception_id < b.exception_id ? -1 : 1),
    );
}
