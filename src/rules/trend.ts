/**
 * The monthly collections trend up to the as-of date (COL-FR-15). Receipt cash (money the bank confirmed in the
 * month) and allocations (money applied to invoices in the month, split into arrears recovered and current premium)
 * are different measures: they are shown side by side and never added together.
 */
import { dateOf, sumMoney } from '../contracts/index.js';
import type { ScopeQuery, TrendMonth } from '../contracts/index.js';
import { firstOfMonth, inWindow, lastOfMonth, monthOf, monthsBefore } from './calendar.js';
import { isFailed, scopedReceipts } from './ledger.js';
import type { Ledger } from './ledger.js';

export const TREND_MONTHS = 6;

export function collectionsTrend(ledger: Ledger, scope: ScopeQuery, months = TREND_MONTHS): TrendMonth[] {
  const wanted = ledger.inScope(scope);
  const receipts = scopedReceipts(ledger, scope).filter((receipt) => receipt.is_cash);
  const allocations = ledger.allocations.filter((allocation) => wanted.has(allocation.invoice_id));
  const attempts = ledger.attempts.filter((attempt) => isFailed(attempt) && wanted.has(attempt.invoice_id));

  return Array.from({ length: months }, (_, index) => {
    const from = monthsBefore(ledger.asOf, months - 1 - index);
    const end = lastOfMonth(from);
    const window = { from, to: end > ledger.asOf ? ledger.asOf : end };
    const posted = allocations.filter((allocation) => inWindow(allocation.posted_at, window));
    const isArrears = (invoiceId: string): boolean => {
      const due = ledger.invoiceById.get(invoiceId)?.due_date ?? null;
      return due !== null && due < firstOfMonth(from);
    };
    return {
      month: monthOf(from),
      from: window.from,
      to: window.to,
      received: sumMoney(receipts.filter((receipt) => inWindow(receipt.received_at, window)).map((receipt) => receipt.in_scope)),
      arrears_recovered: sumMoney(posted.filter((a) => isArrears(a.invoice_id)).map((a) => a.allocated_amount)),
      current_applied: sumMoney(posted.filter((a) => !isArrears(a.invoice_id)).map((a) => a.allocated_amount)),
      failed_attempts: attempts.filter((attempt) => inWindow(dateOf(attempt.attempt_at), window)).length,
    };
  });
}
