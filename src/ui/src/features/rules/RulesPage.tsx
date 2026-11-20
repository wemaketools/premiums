/**
 * Rules & Definitions, read only: the thresholds the engine runs on (from `rules.config`), the rules COL-R01..R06 with
 * their conditions, severities and what they never do, the KPI calculation notes, the exception owner and due date,
 * the priority order and the accounting guardrail. The handover's "rules list" and "KPI calculation notes".
 */
import { RULE_CODES, RULE_IDS, SEVERITIES, endpoints } from '../../../../contracts/index';
import type { CollectionsRuleConfig, RuleCode, Severity } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import {
  Banner,
  Card,
  DataTable,
  DetailList,
  PageHeader,
  QueryView,
  SkeletonBlock,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import { PriorityChip, SeverityChip, ruleLabel } from '../collections-scope';

/** The engine's response days per severity (`RESPONSE_DAYS` in src/rules/exceptions.ts): a POC default, not a service level. */
const RESPONSE_DAYS: Readonly<Record<Severity, number>> = { HIGH: 2, MEDIUM: 5, LOW: 10 };

const NEVER: Readonly<Record<RuleCode, string>> = {
  OVERDUE_30: 'flag',
  REPEAT_FAILURE: 'flag',
  LAPSE_REVIEW: 'flag',
  UNAPPLIED_CASH: 'unapplied',
  FAILED_ATTEMPT: 'cash',
  DATA_QUALITY: 'data',
};

const KPIS = [
  'validAllocation',
  'outstanding',
  'unpaid',
  'overdue',
  'days',
  'aging',
  'received',
  'unapplied',
  'failed',
] as const;
type Kpi = (typeof KPIS)[number];

const PRIORITY_ORDER = ['HIGH', 'MEDIUM', 'LOW', 'CURRENT'] as const;

const days = (count: number): string => t('rules.thresholds.days', { count });

function Thresholds({
  config,
  asOf,
  timezone,
  currency,
}: {
  readonly config: CollectionsRuleConfig;
  readonly asOf: string;
  readonly timezone: string;
  readonly currency: string;
}) {
  return (
    <Card title={t('rules.thresholds.title')} subtitle={t('rules.thresholds.subtitle')}>
      <div className="prm-stack">
        <DetailList
          items={[
            {
              key: 'overdue',
              label: t('rules.thresholds.overdue'),
              value: days(config.overdue_30_review_days),
            },
            {
              key: 'lapse',
              label: t('rules.thresholds.lapse'),
              value: days(config.lapse_review_days),
            },
            {
              key: 'window',
              label: t('rules.thresholds.window'),
              value: days(config.repeat_failed_attempts_rolling_days),
            },
            {
              key: 'count',
              label: t('rules.thresholds.count'),
              value: t('rules.thresholds.attempts', { count: config.repeat_failed_attempt_count }),
            },
            { key: 'asOf', label: t('rules.thresholds.asOf'), value: formatCalendarDate(asOf) },
            { key: 'timezone', label: t('rules.thresholds.timezone'), value: timezone },
            { key: 'currency', label: t('rules.thresholds.currency'), value: currency },
          ]}
        />
        <Banner tone="warning">
          <p>{t('rules.thresholds.caveat')}</p>
        </Banner>
      </div>
    </Card>
  );
}

function RulesList({ config }: { readonly config: CollectionsRuleConfig }) {
  const numbers = {
    overdue: config.overdue_30_review_days,
    lapse: config.lapse_review_days,
    window: config.repeat_failed_attempts_rolling_days,
    count: config.repeat_failed_attempt_count,
  };
  const columns: DataTableColumn<RuleCode>[] = [
    {
      id: 'rule',
      header: t('rules.list.column.rule'),
      cell: (rule) => (
        <>
          <span className="prm-mono">{RULE_IDS[rule]}</span>
          <span className="prm-cell-sub">{ruleLabel(rule)}</span>
        </>
      ),
    },
    {
      id: 'condition',
      header: t('rules.list.column.condition'),
      cell: (rule) => t(`rules.list.condition.${rule}`, numbers),
    },
    {
      id: 'severity',
      header: t('rules.list.column.severity'),
      cell: (rule) => t(`rules.list.severity.${rule}`),
    },
    {
      id: 'never',
      header: t('rules.list.column.never'),
      cell: (rule) => t(`rules.list.never.${NEVER[rule]}`),
    },
  ];
  return (
    <Card title={t('rules.list.title')} subtitle={t('rules.list.subtitle')} flush>
      <DataTable
        caption={t('rules.list.caption')}
        columns={columns}
        rows={RULE_CODES}
        rowKey={(rule) => rule}
      />
      <p className="prm-text-muted">{t('collections-scope.advisory')}</p>
    </Card>
  );
}

function KpiNotes() {
  const columns: DataTableColumn<Kpi>[] = [
    {
      id: 'measure',
      header: t('rules.kpi.column.measure'),
      cell: (kpi) => t(`rules.kpi.${kpi}.label`),
    },
    {
      id: 'definition',
      header: t('rules.kpi.column.definition'),
      cell: (kpi) => t(`rules.kpi.${kpi}.text`),
    },
  ];
  return (
    <Card title={t('rules.kpi.title')} subtitle={t('rules.kpi.subtitle')} flush>
      <DataTable
        caption={t('rules.kpi.caption')}
        columns={columns}
        rows={KPIS}
        rowKey={(kpi) => kpi}
      />
    </Card>
  );
}

function OwnerAndDue() {
  const columns: DataTableColumn<Severity>[] = [
    {
      id: 'severity',
      header: t('rules.owner.severity'),
      cell: (severity) => <SeverityChip severity={severity} />,
    },
    {
      id: 'days',
      header: t('rules.owner.responseDays'),
      numeric: true,
      cell: (severity) => days(RESPONSE_DAYS[severity]),
    },
  ];
  return (
    <Card title={t('rules.owner.title')} subtitle={t('rules.owner.subtitle')}>
      <div className="prm-stack">
        <p>{t('rules.owner.owner')}</p>
        <p>{t('rules.owner.due')}</p>
        <DataTable
          caption={t('rules.owner.caption')}
          columns={columns}
          rows={SEVERITIES}
          rowKey={(severity) => severity}
        />
        <p className="prm-text-muted">{t('rules.owner.note')}</p>
      </div>
    </Card>
  );
}

function PriorityOrder() {
  return (
    <Card title={t('rules.priority.title')} subtitle={t('rules.priority.subtitle')}>
      <div className="prm-stack">
        <DetailList
          stacked
          items={PRIORITY_ORDER.map((priority) => ({
            key: priority,
            label: <PriorityChip priority={priority} />,
            value: t(`rules.priority.${priority}`),
          }))}
        />
        <p className="prm-text-muted">{t('rules.priority.override')}</p>
      </div>
    </Card>
  );
}

export default function RulesPage() {
  const config = useApiQuery(endpoints.ruleConfigGet, {});
  return (
    <div className="prm-page">
      <PageHeader title={t('rules.title')} subtitle={t('rules.subtitle')} />
      <QueryView
        query={config}
        errorTitle={t('rules.error')}
        loading={
          <Card data-state="loading">
            <SkeletonBlock lines={6} />
          </Card>
        }
      >
        {(answer) => (
          <div className="prm-page">
            <div className="prm-grid prm-grid--2">
              <Thresholds
                config={answer.config.collections}
                asOf={answer.config.as_of}
                timezone={answer.config.timezone}
                currency={answer.config.currency}
              />
              <PriorityOrder />
            </div>
            <RulesList config={answer.config.collections} />
            <KpiNotes />
            <OwnerAndDue />
            <Banner tone="info" title={t('rules.guardrail.title')}>
              <p>{t('rules.guardrail.text')}</p>
            </Banner>
          </div>
        )}
      </QueryView>
    </div>
  );
}
