import type { Catalog } from '../../../lib/i18n';

export default {
  nav: 'Rules & Definitions',
  title: 'Rules & Definitions',
  subtitle:
    'The rules that flag an account, how each figure is calculated, and who owns an exception by when. Read only: the same rules and numbers the screens run on.',
  error: 'The rule configuration could not be loaded',
  thresholds: {
    title: 'Thresholds in force',
    subtitle: 'The collections part of proposed_rule_config.json, as the engine reads it.',
    caveat:
      'Illustrative POC assumptions from proposed_rule_config.json: not insurer collection terms, legal cover rules or regulatory requirements.',
    overdue: 'Overdue review threshold (COL-R01)',
    lapse: 'Lapse review threshold (COL-R03)',
    window: 'Repeat-failure window (COL-R02)',
    count: 'Repeat-failure count (COL-R02)',
    asOf: 'Reference as-of date',
    timezone: 'Time zone',
    currency: 'Currency',
    days_one: '{count} day',
    days_other: '{count} days',
    attempts_one: '{count} failed attempt',
    attempts_other: '{count} failed attempts',
  },
  list: {
    title: 'The rules',
    subtitle:
      'Each flag carries its rule ID, its evidence and the advisory caveat wherever it shows.',
    caption: 'Collection rules',
    column: {
      rule: 'Rule',
      condition: 'Condition',
      severity: 'Severity',
      never: 'What it never does',
    },
    condition: {
      OVERDUE_30: 'Something outstanding and more than {overdue} days overdue.',
      REPEAT_FAILURE_one:
        'At least {count} failed payment attempt on the same invoice in the last {window} days up to the as-of date.',
      REPEAT_FAILURE_other:
        'At least {count} failed payment attempts on the same invoice in the last {window} days up to the as-of date.',
      LAPSE_REVIEW:
        'Something outstanding and at least {lapse} days overdue: review for potential cover implications.',
      UNAPPLIED_CASH:
        'A validated or posted receipt with money not applied to any invoice (received minus valid allocations above zero).',
      FAILED_ATTEMPT:
        'A payment attempt with outcome FAILED in the chosen cash period, one exception per attempt.',
      DATA_QUALITY: 'An invoice without a due date: it cannot be aged and is never overdue.',
    },
    severity: {
      OVERDUE_30:
        'Follows the invoice priority: High over 90 days overdue or a repeat failure on an overdue invoice, Medium 31–90 days.',
      REPEAT_FAILURE: 'High when the invoice is overdue, else Medium.',
      LAPSE_REVIEW:
        'Follows the invoice priority: High over 90 days overdue or a repeat failure on an overdue invoice, Medium 31–90 days.',
      UNAPPLIED_CASH: 'Medium.',
      FAILED_ATTEMPT:
        'Follows the invoice priority (High, Medium or Low); Low when the invoice is not overdue.',
      DATA_QUALITY: 'High.',
    },
    never: {
      flag: 'No collection instruction, no lapse or cancellation, no change to the policy status.',
      cash: 'Never counts the attempt as cash or as an allocation. No collection instruction, no change to the policy status.',
      unapplied:
        'Never reduces a named invoice: only an allocation does. No collection instruction, no change to the policy status.',
      data: 'Never invents a due date or an aging bucket. No collection instruction, no change to the policy status.',
    },
  },
  kpi: {
    title: 'KPI calculation notes',
    subtitle: 'How every figure on the screens is calculated, as of the as-of date.',
    caption: 'KPI definitions',
    column: { measure: 'Measure', definition: 'Definition' },
    validAllocation: {
      label: 'Valid allocation',
      text: 'An allocation posted on or before the as-of date from a validated or posted receipt.',
    },
    outstanding: {
      label: 'Invoice outstanding',
      text: 'max(0, issued amount − valid allocations). The POC has no credit adjustments, and an overpayment never makes it negative.',
    },
    unpaid: {
      label: 'Gross unpaid',
      text: 'The sum of invoice outstanding, future-due balances included. It is gross unpaid, not "collectible".',
    },
    overdue: {
      label: 'Overdue',
      text: 'The sum of outstanding where the due date is before the as-of date. Due today is not overdue; future-due is not overdue.',
    },
    days: {
      label: 'Days overdue',
      text: 'max(0, as-of date − due date) in calendar days, for an unpaid invoice. A paid invoice has no active aging bucket.',
    },
    aging: {
      label: 'Aging buckets',
      text: 'Current / not due (0 days or less), 1–30, 31–60, 61–90 and more than 90 days overdue; each unpaid invoice sits in exactly one. An invoice without a due date is in none.',
    },
    received: {
      label: 'Cash received in the period',
      text: 'The sum of validated or posted receipts by their received date in the period (this month by default: the 1st of the as-of month to the as-of date). Never by the allocation posted date.',
    },
    unapplied: {
      label: 'Unapplied cash',
      text: 'Per receipt, received amount − valid allocations; never negative; validated or posted receipts only. It belongs to no invoice, so it is not shown while a broker, product or client filter is set.',
    },
    failed: {
      label: 'Failed payment attempts',
      text: 'The count of attempts with outcome FAILED in the period, each attempt counted once. Never cash, never an allocation.',
    },
  },
  owner: {
    title: 'Exception owner and due date',
    subtitle: 'Who an exception is waiting on, and by when.',
    owner:
      'The owner of the open recovery action on the account, else the account owner (the owner of the policy’s broker).',
    due: 'The due date of the open recovery action, else the day the rule was triggered plus the response days of its severity:',
    caption: 'Response days by severity',
    severity: 'Severity',
    responseDays: 'Response days',
    note: 'A POC default, not a service level.',
  },
  priority: {
    title: 'Priority order',
    subtitle: 'The proposed collection priority of an unpaid invoice.',
    HIGH: 'More than 90 days overdue, or a repeat payment failure on an overdue invoice.',
    MEDIUM: '31–90 days overdue.',
    LOW: '1–30 days overdue.',
    CURRENT: 'Not due yet: no collection escalation.',
    override:
      'A user may override the urgency on a recovery action; the invoice priority and the figures do not change.',
  },
  guardrail: {
    title: 'Accounting guardrail',
    text: 'Receipt cash, allocations to invoices, premium written and premium due are different measures. The same P1,000 receipt must never inflate both “received cash” and “additional cash recovered” when one total is intended.',
  },
} satisfies Catalog;
