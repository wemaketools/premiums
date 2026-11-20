/**
 * What the invoice list shows, read from its address: the view, bucket, priority and rule a figure opened it with,
 * and the dimension keys of a breakdown row. A dimension in the address applies on top of the shared filters and
 * wins over a shared filter of the same key. A value the list does not know is left out and named.
 */
import {
  AGING_BUCKETS,
  CHANNELS,
  COLLECTION_PRIORITIES,
  INVOICE_VIEWS,
  RULE_CODES,
  SCOPE_KEYS,
} from '../../../../contracts/index';
import type {
  AgingBucket,
  CollectionPriority,
  InvoiceView,
  RuleCode,
  ScopeKey,
} from '../../../../contracts/index';

export const CRITERION_KEYS = ['view', 'bucket', 'priority', 'rule'] as const;
export type CriterionKey = (typeof CRITERION_KEYS)[number];

export interface ListCriterion {
  readonly view?: InvoiceView;
  readonly bucket?: AgingBucket;
  readonly priority?: CollectionPriority;
  readonly rule?: RuleCode;
  readonly dimensions: Readonly<Partial<Record<ScopeKey, string>>>;
  /** `key=value` of each address value that was left out. */
  readonly ignored: readonly string[];
}

function pick<T extends string>(choices: readonly T[], value: string | null): T | undefined {
  return choices.find((choice) => choice === value);
}

export function readCriterion(params: URLSearchParams): ListCriterion {
  const ignored: string[] = [];
  const read = <T extends string>(key: string, choices: readonly T[]): T | undefined => {
    const raw = params.get(key);
    if (raw === null || raw === '') return undefined;
    const value = pick(choices, raw);
    if (value === undefined) ignored.push(`${key}=${raw}`);
    return value;
  };
  const view = read('view', INVOICE_VIEWS);
  const bucket = read('bucket', AGING_BUCKETS);
  const priority = read('priority', COLLECTION_PRIORITIES);
  const rule = read('rule', RULE_CODES);
  const dimensions: Partial<Record<ScopeKey, string>> = {};
  for (const key of SCOPE_KEYS) {
    const raw = params.get(key);
    if (raw === null || raw === '') continue;
    if (key === 'channel' ? pick(CHANNELS, raw) === undefined : raw.trim() !== raw) {
      ignored.push(`${key}=${raw}`);
      continue;
    }
    dimensions[key] = raw;
  }
  return {
    ...(view === undefined ? {} : { view }),
    ...(bucket === undefined ? {} : { bucket }),
    ...(priority === undefined ? {} : { priority }),
    ...(rule === undefined ? {} : { rule }),
    dimensions,
    ignored,
  };
}

/** Whether the address narrows the list at all. */
export function hasCriterion(criterion: ListCriterion): boolean {
  return (
    CRITERION_KEYS.some((key) => criterion[key] !== undefined) ||
    Object.keys(criterion.dimensions).length > 0
  );
}

/** The `invoices.list` query: the shared filters, the address's dimensions over them, then the criterion. */
export function listQuery(
  scope: Readonly<Record<string, string>>,
  criterion: ListCriterion,
): Readonly<Record<string, string>> {
  return {
    ...scope,
    ...criterion.dimensions,
    ...(criterion.view === undefined ? {} : { view: criterion.view }),
    ...(criterion.bucket === undefined ? {} : { bucket: criterion.bucket }),
    ...(criterion.priority === undefined ? {} : { priority: criterion.priority }),
    ...(criterion.rule === undefined ? {} : { rule: criterion.rule }),
  };
}
