import type { Catalog } from '../../../lib/i18n';

export default {
  nav: 'Receipts',
  title: 'Receipts',
  subtitle:
    'Bank receipts by received date, what has been applied to invoices and the cash still unapplied. Each receipt opens its calculation and allocations.',
  notCash: 'Not cash',
  noInvoices: 'Not applied to any invoice',
  explain: {
    title: 'How receipt cash is counted',
    once: 'Cash is counted once, on the date the bank received it, whether or not it has been applied to an invoice.',
    allocation:
      'Applying cash to an invoice (allocation) is a separate step with its own posted date: only then does the invoice’s outstanding fall. The unapplied part stays visible here until it is applied.',
    failed:
      'A failed debit order is a payment attempt, never a receipt: it adds no cash and applies nothing. Only bank-confirmed (validated or posted) receipts count as cash; others are listed and marked "Not cash".',
    filtered:
      'With a filter set, only receipts applied to invoices in the filters are listed, and the in-scope column shows the part applied to them. Unapplied cash belongs to no invoice, so it cannot be attributed to a broker, product or client.',
  },
  view: {
    label: 'Which receipts',
    all: 'All receipts',
    'in-period': 'Received in the cash period',
    unapplied: 'With unapplied cash',
  },
  table: {
    title: 'Bank receipts',
    caption: 'Receipts',
    all: 'Every receipt received on or before the as-of date.',
    period: 'Bank-confirmed receipts received in {window}.',
    unapplied: 'Receipts with money not yet applied to any invoice, as of the as-of date.',
  },
  column: {
    receipt: 'Receipt',
    received: 'Received',
    bankRef: 'Bank reference',
    status: 'Status',
    gross: 'Received amount',
    applied: 'Applied',
    unapplied: 'Unapplied',
    inScope: 'In scope',
    invoices: 'Applied to',
  },
  totals: {
    label: 'Totals of the listed receipts',
    count: 'Receipts',
    receipts_one: '{count} receipt',
    receipts_other: '{count} receipts',
    gross: 'Received',
    applied: 'Applied',
    unapplied: 'Unapplied',
    inScope: 'In scope',
  },
  empty: {
    none: 'No receipts in this data set as of the as-of date',
    'in-period': 'No cash received in this period',
    unapplied: 'No unapplied cash',
    viewDescription: 'Choose "All receipts" or another cash period to see more.',
    filtered: 'No receipts applied to invoices in these filters',
    filteredDescription: 'Clear a filter to see more.',
  },
  csv: {
    receipt: 'Receipt ID',
    received: 'Received date',
    bankRef: 'Bank reference',
    status: 'Status',
    cash: 'Counts as cash',
    gross: 'Received (BWP)',
    applied: 'Applied (BWP)',
    unapplied: 'Unapplied (BWP)',
    inScope: 'In scope (BWP)',
    invoices: 'Applied to invoices',
    total_one: 'Total: {count} receipt',
    total_other: 'Total: {count} receipts',
    yes: 'Yes',
    no: 'No',
  },
} satisfies Catalog;
