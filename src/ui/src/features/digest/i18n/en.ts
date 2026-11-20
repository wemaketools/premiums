import type { Catalog } from '../../../lib/i18n';

export default {
  nav: 'Finance Digest',
  title: 'Finance Digest',
  subtitle:
    'A one-page finance summary and action digest for the CFO, for the filters and cash period below. Print it on A4.',
  print: 'Print',
  sheet: {
    title: 'Premium collections: finance summary and action digest',
    tenant: 'Tenant',
    dataSet: 'Data set',
    asOf: 'As of',
    scope: 'Scope',
    period: 'Cash period',
    synthetic:
      'Synthetic demo data only: not a production finance system. Balances are as of the as-of date; cash and attempts follow the cash period.',
  },
  empty: {
    title: 'No invoices to summarize',
    description: 'The data set has no premium invoices.',
    filteredDescription: 'No invoices match these filters. Clear a filter to see more.',
  },
  kpi: {
    title: 'Key figures',
    caption: 'Key figures and their definitions',
    column: { measure: 'Measure', amount: 'Amount', count: 'Count', definition: 'Definition' },
    unpaid: {
      label: 'Gross unpaid',
      definition:
        'The sum of every invoice’s outstanding balance, max(0, issued − valid allocations), future-due included. Gross unpaid, not "collectible".',
    },
    overdue: {
      label: 'Overdue',
      definition:
        'The outstanding balances with a due date before the as-of date. Due today and future-due balances are not overdue.',
    },
    over30: {
      label: 'Overdue more than {days} days',
      definition:
        'The outstanding balances more than {days} days past their due date (the review threshold of rule COL-R01).',
    },
    unknownDue: {
      label: 'Unknown due date',
      definition:
        'Outstanding balances of invoices without a due date: in gross unpaid, never aged, never overdue.',
    },
    received: {
      label: 'Cash received in the period',
      definition:
        'Validated or posted bank receipts by their received date in the cash period, applied or not; never by allocation date.',
      definitionFiltered:
        'The part of the period’s validated or posted receipts applied to invoices in these filters, by received date.',
    },
    failed: {
      label: 'Failed payment attempts',
      definition:
        'Payment attempts with outcome FAILED in the cash period, each attempt counted once. Never cash, never an allocation.',
    },
    unapplied: {
      label: 'Unapplied cash',
      definition:
        'Per validated or posted receipt, received − valid allocations, never negative: cash that reduces no named invoice yet.',
      notAttributable:
        'Not attributable while a filter is set: unapplied cash belongs to no invoice, so no broker, product or client.',
    },
    invoices_one: '{count} invoice',
    invoices_other: '{count} invoices',
    receipts_one: '{count} receipt',
    receipts_other: '{count} receipts',
    attempts_one: '{count} attempt',
    attempts_other: '{count} attempts',
    validAllocation:
      'A valid allocation is one posted on or before the as-of date from a validated or posted receipt.',
  },
  aging: {
    title: 'Aging of gross unpaid',
    caption: 'Gross unpaid by aging bucket',
    column: { bucket: 'Bucket', amount: 'Gross unpaid', invoices: 'Invoices' },
    total: 'Total aged',
    unknown_one: 'Not aged (no due date): {amount} on {count} invoice.',
    unknown_other: 'Not aged (no due date): {amount} on {count} invoices.',
  },
  exposure: {
    title: 'Top exposures',
    caption: 'Top {dimension} exposures',
    column: { unpaid: 'Gross unpaid', overdue: 'Overdue' },
    dimension: { broker: 'Broker', product: 'Product', client: 'Client' },
    none: 'No unpaid invoices',
    top: 'The five largest groups by gross unpaid; each opens its invoices.',
  },
  exceptions: {
    title: 'Exceptions by rule and severity',
    caption: 'Exceptions by rule and severity',
    column: { rule: 'Rule', total: 'Total' },
    total: 'Total',
    count_one: '{count} exception in this scope; failed attempts follow the cash period.',
    count_other: '{count} exceptions in this scope; failed attempts follow the cash period.',
    none: 'No exceptions in this scope',
    link: 'All exceptions',
  },
  actions: {
    title: 'Recovery actions',
    link: 'Action Queue',
    caption: 'Overdue recovery actions',
    open: 'Open',
    inProgress: 'In progress',
    resolved: 'Resolved',
    overdue: 'Overdue',
    scopeAll: 'Every recovery action of the data set.',
    scopeFiltered: 'Actions on invoices in these filters; actions on bank receipts are left out.',
    overdueTitle: 'Overdue actions',
    noneOverdue: 'No overdue recovery actions',
    noneOverdueDescription: 'Every action not resolved is within its due date, or has none.',
    column: {
      action: 'Action',
      account: 'Account',
      reason: 'Reason',
      urgency: 'Urgency',
      owner: 'Owner',
      due: 'Due date',
      status: 'Status',
    },
  },
} satisfies Catalog;
