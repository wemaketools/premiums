import type { Catalog } from '../../../lib/i18n';

export default {
  nav: 'Aging & Exposure',
  title: 'Aging & Exposure',
  subtitle:
    'Gross unpaid by aging bucket, and who carries it: broker, channel, product, client and account owner. Every amount opens exactly the invoices behind it.',
  asOf: 'Balances as of {date}',
  empty: {
    title: 'No matching records',
    description: 'The data set has no unpaid premium invoices.',
    filteredDescription: 'No unpaid invoices match these filters. Clear a filter to see more.',
  },
  aging: {
    title: 'Aging of gross unpaid',
    subtitle:
      'Each unpaid invoice with a due date sits in exactly one bucket; a bucket opens its invoices.',
    chart: 'Gross unpaid by aging bucket',
    caption: 'Aging buckets',
    unknown_one:
      'Not aged: {amount} on {count} invoice without a due date. It is in gross unpaid but in no bucket (rule COL-R06).',
    unknown_other:
      'Not aged: {amount} on {count} invoices without a due date. They are in gross unpaid but in no bucket (rule COL-R06).',
    unknownRow: 'No due date (not aged)',
    total: 'Gross unpaid',
  },
  exposure: {
    title: {
      broker: 'Exposure by broker',
      channel: 'Exposure by channel',
      product: 'Exposure by product',
      client: 'Exposure by client',
      owner: 'Exposure by account owner',
    },
    caption: {
      broker: 'Exposure by broker',
      channel: 'Exposure by channel',
      product: 'Exposure by product',
      client: 'Exposure by client',
      owner: 'Exposure by account owner',
    },
    group: {
      broker: 'Broker',
      channel: 'Channel',
      product: 'Product',
      client: 'Client',
      owner: 'Account owner',
    },
    subtitle:
      'Largest first. Each unpaid invoice is counted in exactly one row, so the rows add up to gross unpaid: no double counting across this dimension.',
    top: '{name} carries {share} of gross unpaid ({amount}).',
    nullGroup:
      '{name} is shown without a link: those invoices have no {dimension} id, and the invoice list can only be narrowed by one.',
    total: 'Total',
    rest_one: 'The other {count} (show all to open it)',
    rest_other: 'The other {count} together (show all to open them)',
    showAll: 'Show all {count}',
    showTop: 'Show the largest {count} only',
  },
  column: {
    group: 'Group',
    invoices: 'Invoices',
    unpaid: 'Gross unpaid',
    share: 'Share',
    overdue: 'Overdue',
    over30: 'Over {days} days',
    noDue: 'No due date',
    amount: 'Amount',
  },
  csv: {
    asOf: 'As of',
    scope: 'Scope',
    section: 'Section',
    group: 'Group',
    groupId: 'Group ID',
    invoices: 'Invoices',
    unpaid: 'Gross unpaid (BWP)',
    share: 'Share of gross unpaid (%)',
    overdue: 'Overdue (BWP)',
    over30: 'Over {days} days (BWP)',
    bucket: '{bucket} (BWP)',
    noDue: 'No due date (BWP)',
    aging: 'Aging',
  },
} satisfies Catalog;
