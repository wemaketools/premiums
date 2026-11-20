/**
 * The rule config the collections engine runs on: the collections part of the spec's `proposed_rule_config.json`.
 * The thresholds are illustrative POC assumptions, not insurer collection terms, legal cover rules or regulatory
 * requirements. The claims part of the file belongs to ClaimsIQ and is ignored here.
 */
import { z } from 'zod';

import { AGING_BUCKETS } from './facts.js';

const Days = z.number().int().min(1).max(3650);

export const CollectionsRuleConfig = z.object({
  aging_buckets: z.array(z.string()).refine(
    (labels) => labels.length === AGING_BUCKETS.length,
    `must name the ${AGING_BUCKETS.length} buckets current_or_not_due, 1-30, 31-60, 61-90 and >90`,
  ),
  /** COL-R01: an unpaid invoice more than this many days overdue is flagged. */
  overdue_30_review_days: Days,
  /** COL-R03: an unpaid invoice at least this many days overdue is flagged for review of potential cover implications. */
  lapse_review_days: Days,
  /** COL-R02: the rolling window, in days up to the as-of date, in which failed attempts are counted. */
  repeat_failed_attempts_rolling_days: Days,
  /** COL-R02: this many failed attempts on one invoice inside the window flag it. */
  repeat_failed_attempt_count: z.number().int().min(2).max(50),
});
export type CollectionsRuleConfig = z.infer<typeof CollectionsRuleConfig>;

export const RuleConfig = z.object({
  as_of: z.string(),
  timezone: z.string(),
  currency: z.string(),
  collections: CollectionsRuleConfig,
});
export type RuleConfig = z.infer<typeof RuleConfig>;
