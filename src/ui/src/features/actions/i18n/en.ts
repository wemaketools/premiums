import type { Catalog } from '../../../lib/i18n';

export default {
  nav: 'Action Queue',
  title: 'Action Queue',
  subtitle:
    'Every recovery action with its account, reason, urgency, owner and status, overdue first. Open an action for its history: who did what and when.',
  caption: 'Recovery actions',
  column: {
    action: 'Action',
    account: 'Account',
    reason: 'Reason',
    urgency: 'Urgency',
    owner: 'Owner',
    due: 'Due date',
    status: 'Status',
    note: 'Latest note',
    changed: 'Last change',
    menu: 'Actions',
  },
  policyBroker: '{policy} · {broker}',
  subjectType: { INVOICE: 'Invoice', RECEIPT: 'Bank receipt' },
  by: 'by {actor}',
  noNote: 'No note',
  rowActions: 'Actions for {task}',
  accountsFailed:
    'The invoices could not be loaded, so the client, policy and broker of each action are not shown',
  summary_one:
    '{count} action: {overdue} overdue, {open} open, {inProgress} in progress, {resolved} resolved.',
  summary_other:
    '{count} actions: {overdue} overdue, {open} open, {inProgress} in progress, {resolved} resolved.',
  filter: {
    label: 'Action filters',
    status: 'Status',
    ACTIVE: 'Not resolved',
    ALL: 'All statuses',
    owner: 'Owner',
    allOwners: 'All owners',
    reason: 'Reason',
    allReasons: 'All reasons',
    mine: 'Assigned to me ({name})',
  },
  empty: {
    title: 'No recovery actions yet',
    description:
      'Create one for an invoice that needs follow-up: it is logged with you as the creator and the time.',
    readOnly: 'Nobody has created a recovery action in this data set yet.',
    noMatchTitle: 'No actions match these filters',
    noMatchDescription:
      'Change or clear a filter to see more actions; resolved actions show under All statuses.',
  },
  history: {
    open: 'Open {task}',
    title: 'Action {task}',
    subtitle:
      'Who did what and when, oldest first. Every change is logged with the persona and the time.',
  },
  csv: {
    asOf: 'As of',
    filters: 'Filters',
    status: 'Status: {status}',
    mine: 'Assigned to me: {name}',
    owner: 'Owner: {name}',
    reason: 'Reason: {reason}',
    action: 'Action ID',
    subjectType: 'Subject type',
    subject: 'Subject ID',
    client: 'Client',
    policy: 'Policy',
    broker: 'Broker',
    overdue: 'Overdue',
    changedBy: 'Changed by',
    yes: 'Yes',
    no: 'No',
  },
} satisfies Catalog;
