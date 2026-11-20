/**
 * The paths of the collections screens, and the links a figure opens: each carries exactly the criterion of what the
 * figure counts, so the list it opens adds up to it. The shared filters are not in the link; the list applies them,
 * as the figure did.
 */
import type {
  AgingBucket,
  CollectionPriority,
  InvoiceView,
  ReceiptView,
  RuleCode,
  ScopeKey,
  Severity,
} from '../../../../contracts/index';

export const INVOICES_PATH = '/invoices';
export const RECEIPTS_PATH = '/receipts';
export const EXCEPTIONS_PATH = '/exceptions';
export const ACTIONS_PATH = '/actions';

export const invoicePath = (invoiceId: string): string =>
  `${INVOICES_PATH}/${encodeURIComponent(invoiceId)}`;
export const receiptPath = (receiptId: string): string =>
  `${RECEIPTS_PATH}/${encodeURIComponent(receiptId)}`;

function withQuery(
  path: string,
  values: Readonly<Record<string, string | null | undefined>>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text === '' ? path : `${path}?${text}`;
}

/** What an invoice list shows; a breakdown row adds the one dimension it groups by. */
export interface InvoiceCriterion {
  readonly view?: InvoiceView;
  readonly bucket?: AgingBucket;
  readonly priority?: CollectionPriority;
  readonly rule?: RuleCode;
  readonly dimension?: { readonly key: ScopeKey; readonly value: string };
}

export function invoicesLink(criterion: InvoiceCriterion = {}): string {
  return withQuery(INVOICES_PATH, {
    view: criterion.view,
    bucket: criterion.bucket,
    priority: criterion.priority,
    rule: criterion.rule,
    ...(criterion.dimension === undefined
      ? {}
      : { [criterion.dimension.key]: criterion.dimension.value }),
  });
}

export function receiptsLink(view: ReceiptView = 'all'): string {
  return withQuery(RECEIPTS_PATH, { view: view === 'all' ? undefined : view });
}

export function exceptionsLink(
  criterion: { readonly rule?: RuleCode; readonly severity?: Severity } = {},
): string {
  return withQuery(EXCEPTIONS_PATH, { rule: criterion.rule, severity: criterion.severity });
}
