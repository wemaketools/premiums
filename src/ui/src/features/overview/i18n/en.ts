import type { Catalog } from '../../../lib/i18n';

export default {
  nav: 'Overview',
  title: 'Overview',
  subtitle:
    'What premium is due, how much is overdue, what cash arrived and what needs review. Each card opens the records it counts.',
  empty: {
    title: 'No invoices to summarize',
    description: 'The data set has no premium invoices.',
    filteredDescription: 'No invoices match these filters. Clear a filter to see more.',
  },
  group: {
    asOf: 'Balances as of {date}',
    period: 'Cash and attempts, {window}',
    periodNote: 'These cards follow the cash period above; the balances do not.',
  },
  kpi: {
    unpaid: {
      label: 'Gross unpaid',
      hint_one: '{count} invoice: issued minus applied, future-due included. Not "collectible".',
      hint_other: '{count} invoices: issued minus applied, future-due included. Not "collectible".',
    },
    overdue: {
      label: 'Overdue',
      hint_one: '{count} invoice with a due date before the as-of date. Due today is not overdue.',
      hint_other:
        '{count} invoices with a due date before the as-of date. Due today is not overdue.',
    },
    over30: {
      label: 'Overdue more than {days} days',
      hint_one: '{count} invoice past the review threshold (rule COL-R01).',
      hint_other: '{count} invoices past the review threshold (rule COL-R01).',
    },
    received: {
      label: 'Cash received',
      hint_one: '{count} bank-confirmed receipt by its received date, applied or not.',
      hint_other: '{count} bank-confirmed receipts by their received date, applied or not.',
      hintFiltered:
        'The part of the period’s receipts applied to invoices in these filters; cash not applied to them is left out.',
    },
    failed: {
      label: 'Failed payment attempts',
      hint: 'Failed debit orders in the period. Never counted as cash.',
    },
    unapplied: {
      label: 'Unapplied cash',
      hint_one: '{count} receipt with money not yet applied to any invoice.',
      hint_other: '{count} receipts with money not yet applied to any invoice.',
      hintFiltered:
        'Not attributable: unapplied cash belongs to no invoice, so no broker, product or client. Clear the filters to see it.',
    },
    unknownDue: {
      label: 'Unknown due date',
      hint_one: '{count} invoice in gross unpaid but in no aging bucket: its due date is missing.',
      hint_other:
        '{count} invoices in gross unpaid but in no aging bucket: their due dates are missing.',
    },
  },
  aging: {
    title: 'Aging of gross unpaid',
    subtitle: 'Each unpaid invoice sits in exactly one bucket; a bucket opens its invoices.',
    chart: 'Gross unpaid by aging bucket',
    link: 'Aging & Exposure',
    unknown: 'Not aged (no due date): {amount}',
  },
  priority: {
    title: 'Priority exceptions',
    subtitle: 'High-severity exceptions first, by the day they were raised.',
    link: 'All exceptions',
    empty: 'No High-severity exceptions in this scope.',
    due: 'Due {date}',
    late: 'Late',
    error: 'The exceptions could not be loaded',
  },
  trend: {
    title: 'Monthly collections',
    subtitle:
      'Receipt cash by received month beside allocations by posted month, split into arrears recovered and current premium. Different measures: never added together.',
    chart: 'Receipt cash and allocations by month',
    month: 'Month',
    received: 'Receipt cash',
    arrears: 'Arrears recovered',
    current: 'Current premium applied',
    error: 'The monthly trend could not be loaded',
    empty: 'No cash or allocations in the last six months.',
    filtered: 'Receipt cash here is the part applied to invoices in these filters.',
  },
  csv: {
    section: 'Section',
    measure: 'Measure',
    amount: 'Amount (BWP)',
    count: 'Count',
    scope: 'Scope',
    asOf: 'As of',
  },
} satisfies Catalog;
