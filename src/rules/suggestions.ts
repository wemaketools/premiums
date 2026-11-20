/**
 * The suggested next action of an invoice (P1): one deterministic rule per flag, in order of urgency. It is a
 * suggestion for the person who owns the account, never an automated collection instruction.
 */
import type { InvoiceFacts, RuleCode, Suggestion } from '../contracts/index.js';

const BY_RULE: ReadonlyArray<readonly [RuleCode, Suggestion]> = [
  ['DATA_QUALITY', 'fix-data'],
  ['LAPSE_REVIEW', 'cover-review'],
  ['REPEAT_FAILURE', 'update-debit-order'],
  ['OVERDUE_30', 'escalate-arrears'],
];

export function suggestedAction(facts: InvoiceFacts): Suggestion {
  for (const [rule, suggestion] of BY_RULE) {
    if (facts.flags.some((flag) => flag.rule === rule)) return suggestion;
  }
  return facts.overdue ? 'remind' : 'none';
}
