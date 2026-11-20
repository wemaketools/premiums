import type { Catalog } from '../../../lib/i18n';

export default {
  filters: {
    label: 'Collections filters',
    period: 'Cash period',
    product: 'Product',
    allProducts: 'All products',
    broker: 'Broker',
    allBrokers: 'All brokers',
    channel: 'Channel',
    allChannels: 'All channels',
    owner: 'Account owner',
    allOwners: 'All owners',
    client: 'Client',
    allClients: 'All clients',
    policy: 'Policy',
    allPolicies: 'All policies',
    loadFailed: 'The filter choices could not be loaded',
    active: 'Active filters',
    remove: 'Remove filter {name}',
    chip: '{field}: {value}',
    allInvoices: 'All invoices',
  },
  period: {
    month: 'This month',
    'last-30': 'Last 30 days',
    'last-90': 'Last 90 days',
    ytd: 'Year to date',
    window: '{period}: {from} – {to}',
  },
  channel: { BROKER: 'Broker', DIRECT: 'Direct' },
  unknown: 'Unknown',
  noBroker: 'Direct (no broker)',
  noOwner: 'No owner',
  unassigned: 'Unassigned',
  bucket: {
    current: 'Current / not due',
    '1-30': '1–30 days',
    '31-60': '31–60 days',
    '61-90': '61–90 days',
    '>90': 'Over 90 days',
  },
  priority: { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', CURRENT: 'Current' },
  severity: { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' },
  rule: {
    OVERDUE_30: 'Overdue more than 30 days',
    REPEAT_FAILURE: 'Repeated payment failure',
    LAPSE_REVIEW: 'Lapse review',
    UNAPPLIED_CASH: 'Unapplied cash',
    FAILED_ATTEMPT: 'Failed payment attempt',
    DATA_QUALITY: 'Missing data',
  },
  evidence: {
    OVERDUE_30: '{days} days overdue with {amount} outstanding.',
    REPEAT_FAILURE_one:
      '{count} failed payment attempt inside the review window; {amount} outstanding.',
    REPEAT_FAILURE_other:
      '{count} failed payment attempts inside the review window; {amount} outstanding.',
    LAPSE_REVIEW:
      '{days} days overdue with {amount} outstanding: review for potential cover implications.',
    UNAPPLIED_CASH: '{amount} received and not yet applied to any invoice.',
    FAILED_ATTEMPT: 'The attempt failed ({reason}): no cash was received and nothing was applied.',
    DATA_QUALITY:
      'No due date: the invoice is in gross unpaid but in no aging bucket, and never overdue.',
  },
  advisory:
    'Advisory flag from a configurable demo rule: not a collection instruction, a legal lapse or cancellation, or a cover decision. The policy status is never changed.',
  reason: {
    OVERDUE: 'Overdue premium',
    REPEAT_FAILURE: 'Repeated payment failure',
    FAILED_ATTEMPT: 'Failed payment attempt',
    UNAPPLIED_CASH: 'Unapplied cash',
    LAPSE_REVIEW: 'Lapse review',
    DATA_QUALITY: 'Missing data',
    OTHER: 'Other',
  },
  taskStatus: { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' },
  taskPriority: { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' },
  suggestion: {
    'fix-data': 'Correct the missing due date in the source system, then reload the data.',
    'cover-review':
      'Refer the account for a cover review with the broker before any lapse decision.',
    'update-debit-order':
      'Contact the client to confirm or update the debit-order details before the next run.',
    'escalate-arrears': 'Escalate the arrears to the account owner and agree a payment date.',
    remind: 'Send a payment reminder for the overdue balance.',
    none: 'No collection action is suggested: nothing is overdue.',
  },
  export: { button: 'Export CSV' },
  readOnly: 'The Executive Viewer reads the collections and has no edit controls.',
} satisfies Catalog;
