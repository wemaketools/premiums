/**
 * The shell catalog (English). Namespaces: shell, auth, ui, format, charts, pages. Feature strings live in
 * `features/<feature>/i18n/en.ts` (see `lib/i18n.ts`).
 * Plurals use `_one` / `_other` suffixes and the `count` parameter.
 */
import type { Catalog } from '../lib/i18n';

export const shellCatalog = {
  shell: {
    documentTitle: '{title} · Premium Collections',
    skipToContent: 'Skip to content',
    brand: {
      name: 'Premium ',
      accent: 'Collections',
      sub: 'Control Tower',
      claimsiq: 'ClaimsIQ',
      claimsiqHint: 'Opens the claims module of the suite in a new tab',
    },
    sidebar: { label: 'Main navigation and account', expand: 'Full sidebar' },
    nav: {
      label: 'Main navigation',
    },
    topbar: {
      openMenu: 'Open navigation',
    },
    persona: {
      label: 'Viewing as',
      cfo: 'CFO / MD',
      'credit-control': 'Finance / Credit Control',
      'broker-rm': 'Broker Relationship Manager',
      executive: 'Executive Viewer',
      'demo-admin': 'Demo Admin',
    },
    data: {
      label: 'Data controls',
      dataSet: 'Data set',
      asOf: 'As of',
      set: { TEST: 'TEST', DEMO: 'DEMO' },
      issues: 'Data issues ({count})',
      issuesUnknown: 'Data issues',
      reset: 'Reset',
      resetTitle: 'Reset the {dataSet} data set?',
      resetScope:
        'Every recovery action and its history, every exception acknowledgement, and any other change made in the {dataSet} data set',
      resetResult:
        'The changes are removed and the fixture shows exactly as loaded, so the reference figures are back. The data set and the as-of date stay.',
      resetDone: 'The {dataSet} fixture is back as loaded.',
      issuesDialog: {
        title: 'Data issues',
        summary_one:
          '{rejected} row was rejected and left out of the data; {warnings} loaded with a warning.',
        summary_other:
          '{rejected} rows were rejected and left out of the data; {warnings} loaded with a warning.',
        none: 'No data issues',
        noneDescription: 'Every row of the {dataSet} fixture loaded.',
        caption: 'Data issues of the {dataSet} fixture',
        kind: { quarantined: 'Rejected', warning: 'Warning' },
        column: {
          kind: 'Outcome',
          file: 'File',
          row: 'Row',
          field: 'Field',
          problem: 'Problem',
          fix: 'Fix',
        },
      },
    },
    theme: {
      useDark: 'Use dark theme',
      useLight: 'Use light theme',
    },
    user: {
      menu: 'Account menu',
      signedInAs: 'Signed in as {account}',
      signOut: 'Sign out',
    },
    loading: {
      session: 'Signing you in…',
    },
    prototype: {
      banner: 'Synthetic demo data only: not a production finance system',
    },
    footer: {
      copyright: '© Premium Collections',
      currency: 'All amounts in {currency}',
      asOf: 'Data as of {time}',
      refresh: 'Refresh data',
    },
  },
  auth: {
    signIn: {
      title: 'Sign in',
    },
    prototype: {
      subtitle: 'A demonstration on synthetic data: no accounts are needed.',
      title: 'Demo accounts',
      hint: 'Choose a role to sign in. No password needed.',
    },
  },
  ui: {
    loading: 'Loading…',
    overdue: 'Overdue',
    action: {
      cancel: 'Cancel',
      close: 'Close',
      dismiss: 'Dismiss',
      retry: 'Try again',
    },
    restricted: {
      title: 'Restricted',
      description: 'This view is not available to you. Nothing about it is shown.',
    },
    error: {
      title: {
        network: 'The service could not be reached.',
        contract: 'The response did not match the API contract.',
        failed: 'The request failed.',
        http: 'HTTP {status}',
      },
      loadTitle: 'This could not be loaded',
      network: 'The service could not be reached. Check your connection and try again.',
      server: 'An unexpected error occurred. Quote the correlation id when you contact support.',
      contract:
        'Development check: the response of {endpoint} does not match its API contract ({detail}).',
      notFound: 'This record does not exist or is not available to you.',
      rateLimited: 'Too many requests. Wait a moment and try again.',
      correlation: 'Correlation id: {id}',
    },
    confirm: {
      actor: 'Acting as',
      scope: 'Scope',
      result: 'Result',
    },
    filters: {
      label: 'Filters',
      clear: 'Clear filters',
    },
    form: {
      date: 'Date',
      time: 'Time',
      currency: 'Currency',
      errorTitle: 'Some information needs attention',
    },
    table: {
      empty: 'Nothing to show yet.',
      selectAll: 'Select all rows on this page',
      selectRow: 'Select {row}',
      openColumn: 'Open',
      openRowNumber: 'Open row {number}',
      selected_one: '{count} selected',
      selected_other: '{count} selected',
    },
    pagination: {
      label: 'Pages',
      showing: 'Showing {from}–{to} of {total}',
      pageSize: 'Rows per page',
      previous: 'Previous page',
      next: 'Next page',
      page: 'Page {page}',
    },
    step: {
      complete: 'Complete',
      current: 'Current step',
      upcoming: 'Not started',
      blocked: 'Blocked',
    },
    unsaved: {
      title: 'Leave without saving?',
      message: 'You have changes that are not saved. If you leave now, they are lost.',
      stay: 'Stay on this page',
      leave: 'Leave without saving',
    },
    toast: {
      region: 'Messages',
    },
  },
  format: {
    month: {
      1: 'Jan',
      2: 'Feb',
      3: 'Mar',
      4: 'Apr',
      5: 'May',
      6: 'Jun',
      7: 'Jul',
      8: 'Aug',
      9: 'Sep',
      10: 'Oct',
      11: 'Nov',
      12: 'Dec',
    },
    age: {
      now: 'now',
      minutes: '{value}m',
      hours: '{value}h',
      days: '{value}d',
    },
    span: {
      daysHours: '{days} d {hours} h',
      hoursMinutes: '{hours} h {minutes} min',
      minutes: '{minutes} min',
    },
    remaining: {
      now: 'now',
      left: '{span} left',
      ago: 'passed {span} ago',
    },
    bytes: {
      b: '{value} B',
      kb: '{value} KB',
      mb: '{value} MB',
      gb: '{value} GB',
    },
  },
  charts: {
    empty: 'No data for this period.',
    segment: 'Segment',
    value: 'Value',
    share: 'Share',
    period: 'Period',
    category: 'Category',
  },
  pages: {
    notFound: {
      title: 'Page not found',
      description: 'The address may be mistyped, or the page may have moved.',
      home: 'Go to the start page',
    },
    routeError: {
      reload: 'Reload the page',
      chunk: {
        title: 'This page could not be loaded',
        description:
          'The connection may have dropped, or a newer version of Premium Collections is available. Reload the page to continue.',
      },
      unexpected: {
        title: 'Something went wrong',
        description:
          'This page stopped because of an unexpected error. Reload the page, or go back to the start page.',
      },
    },
  },
} satisfies Catalog;
