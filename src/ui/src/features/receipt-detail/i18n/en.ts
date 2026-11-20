import type { Catalog } from '../../../lib/i18n';

export default {
  title: 'Receipt {receipt}',
  subtitle:
    'Bank cash received, what has been applied to invoices from it, and what is still unapplied.',
  back: 'Receipts',
  meta: 'Received {date} · {amount}',
  notFound: {
    title: 'Receipt {receipt} was not found',
    description:
      'No receipt with this id exists in this data set on or before the as-of date. It may belong to the other data set, or be received after the as-of date.',
    link: 'Back to receipts',
  },
  calculation: {
    title: 'Calculation',
    subtitle:
      'Unapplied = received amount − valid allocations from the receipt; it is never negative.',
    received: 'Received',
    applied: '− applied',
    unapplied: '= unapplied',
    notCashTitle: 'Not cash',
    notCash:
      'The receipt has status {status}: it is not bank-confirmed (validated or posted), so it counts as no cash and nothing of it is unapplied.',
  },
  field: {
    received: 'Received date',
    bankRef: 'Bank reference',
    status: 'Status',
    cash: 'Counts as cash',
    currency: 'Currency',
    yes: 'Yes',
    no: 'No',
  },
  why: {
    title: 'Why bank cash does not reduce an invoice by itself',
    cash: 'The money counts as cash received on the day the bank received it. An invoice’s outstanding falls only when an allocation applies part of a receipt to that invoice, on the allocation’s posted date.',
    unapplied:
      '{amount} of this receipt is applied to no invoice yet, so no named invoice is reduced by it: it stays visible as unapplied cash until someone identifies the payer and applies it.',
    applied: 'The whole receipt has been applied: each allocation below reduced its invoice.',
    failed:
      'A failed debit order is a payment attempt, never a receipt: it adds no cash and applies nothing.',
  },
  allocations: {
    title: 'Allocations from this receipt',
    subtitle: 'Each allocation applies part of the receipt to one invoice, on its posted date.',
    caption: 'Allocations from this receipt',
    allocation: 'Allocation',
    invoice: 'Invoice',
    posted: 'Posted',
    amount: 'Applied',
    outstanding: 'Invoice outstanding now',
    empty: 'Not applied to any invoice yet',
    emptyDescription: 'No named invoice is reduced by this receipt until an allocation is posted.',
  },
  exceptions: {
    title: 'Exceptions on this receipt',
    caption: 'Exceptions on this receipt',
    severity: 'Severity',
    rule: 'Rule',
    evidence: 'Evidence',
    owner: 'Owner',
    due: 'Due',
    late: 'Late',
    triggered: 'Raised',
    state: 'State',
    actions: 'Actions',
    empty: 'No exceptions on this receipt',
  },
  actions: {
    title: 'Recovery actions on this receipt',
    subtitle:
      'Who follows up the unapplied cash, by when, and every change with its actor and time.',
    list: 'Recovery actions on this receipt',
    task: 'Action {task}',
    status: 'Status',
    priority: 'Urgency',
    owner: 'Owner',
    due: 'Due',
    note: 'Next action',
    empty: 'No recovery actions on this receipt',
    emptyDescription: 'Create one to have someone identify the payer and apply the cash.',
    error: 'The recovery actions could not be loaded',
  },
} satisfies Catalog;
