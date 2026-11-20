/**
 * COL-03 Exceptions: the failed payment attempts of the cash period, unapplied receipts, invoices overdue beyond the
 * review threshold, lapse reviews, repeated failures and missing data, each with its rule id, evidence, owner,
 * severity, due date and a link to its invoice or receipt. A row can be acknowledged (who and when are shown; no
 * figure changes) or turned into a recovery action. The rule and severity filters live in the URL, so a card of the
 * Overview opens exactly its exceptions.
 */
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';

import { RULE_CODES, RULE_IDS, SEVERITIES, endpoints } from '../../../../contracts/index';
import type { CollectionException, RuleCode, Severity } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector } from '../../app/hooks';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Chip,
  DataTable,
  EmptyState,
  PageHeader,
  QuickRanges,
  Reference,
  Select,
  SkeletonBlock,
} from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  ExportCsvButton,
  RuleChip,
  ScopeFilterBar,
  SeverityChip,
  evidenceText,
  invoicePath,
  periodLine,
  receiptPath,
  ruleLabel,
  useLookups,
  useScope,
} from '../collections-scope';
import type { Lookups } from '../collections-scope';
import { CreateTaskDialog, useCanAct } from '../collections-tasks';
import { contextRows } from './csvContext';
import { AcknowledgeDialog, ExceptionState } from './ExceptionParts';
import { REASON_OF_RULE, exceptionName, ownerName, stateText } from './exceptionText';

const ALL = 'all';

type Dialog =
  | { readonly kind: 'acknowledge'; readonly item: CollectionException }
  | { readonly kind: 'create'; readonly item: CollectionException };

const subjectPath = (item: CollectionException): string =>
  item.subject_type === 'INVOICE' ? invoicePath(item.subject_id) : receiptPath(item.subject_id);

function exceptionsTable(
  rows: readonly CollectionException[],
  lookups: Lookups | undefined,
  context: string[][],
): string[][] {
  return [
    ...context,
    [
      t('exceptions.csv.exception'),
      t('exceptions.csv.severity'),
      t('exceptions.csv.ruleId'),
      t('exceptions.csv.rule'),
      t('exceptions.csv.subjectType'),
      t('exceptions.csv.subject'),
      t('exceptions.csv.attempt'),
      t('exceptions.csv.reasonCode'),
      t('exceptions.csv.evidence'),
      t('exceptions.csv.owner'),
      t('exceptions.csv.due'),
      t('exceptions.csv.late'),
      t('exceptions.csv.triggered'),
      t('exceptions.csv.state'),
      t('exceptions.csv.note'),
    ],
    ...rows.map((item) => [
      item.exception_id,
      t(`collections-scope.severity.${item.severity}`),
      item.rule_id,
      ruleLabel(item.rule),
      t(`exceptions.subjectType.${item.subject_type}`),
      item.subject_id,
      item.attempt_id ?? '',
      item.reason_code ?? '',
      evidenceText(item.rule, item.measure, item.reason_code),
      ownerName(item.owner_id, lookups),
      item.due_at,
      item.late ? t('exceptions.csv.yes') : t('exceptions.csv.no'),
      item.triggered_at,
      stateText(item),
      item.acknowledged?.note ?? '',
    ]),
  ];
}

export default function ExceptionsPage() {
  const scope = useScope();
  const lookups = useLookups();
  const canAct = useCanAct();
  const asOf = useAppSelector((state) => state.dataContext.asOf);
  const [params, setParams] = useSearchParams();
  const rule: RuleCode | undefined = RULE_CODES.find((code) => code === params.get('rule'));
  const severity: Severity | undefined = SEVERITIES.find(
    (level) => level === params.get('severity'),
  );
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const setParam = (key: 'rule' | 'severity', value: string | undefined): void => {
    const next = new URLSearchParams(params);
    if (value === undefined) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const base = {
    ...scope.query,
    period: scope.period,
    ...(severity === undefined ? {} : { severity }),
  };
  // Every rule of the scope, for the counts above the table; the table adds the chosen rule.
  const counts = useApiQuery(endpoints.exceptionsList, { query: base }, { keepPrevious: true });
  const list = useApiQuery(
    endpoints.exceptionsList,
    { query: rule === undefined ? base : { ...base, rule } },
    { keepPrevious: true },
  );

  const listed = list.data?.items;
  const rows = useMemo(
    () => listed?.filter((item) => showAcknowledged || item.acknowledged === null),
    [listed, showAcknowledged],
  );
  const hidden = (listed?.length ?? 0) - (rows?.length ?? 0);
  const filtered = scope.filtered || rule !== undefined || severity !== undefined;
  const period = list.data?.period;

  const ruleCounts = useMemo(() => {
    const visible = (counts.data?.items ?? []).filter(
      (item) => showAcknowledged || item.acknowledged === null,
    );
    return {
      total: visible.length,
      byRule: Object.fromEntries(
        RULE_CODES.map((code) => [code, visible.filter((item) => item.rule === code).length]),
      ) as Record<RuleCode, number>,
    };
  }, [counts.data, showAcknowledged]);

  const table = useMemo(
    () =>
      rows === undefined || period === undefined
        ? undefined
        : exceptionsTable(
            rows,
            lookups.lookups,
            contextRows(asOf, period, scope, lookups.lookups, 15),
          ),
    // The scope rows follow the query values, which the list already depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, period, lookups.lookups, asOf],
  );

  const columns: DataTableColumn<CollectionException>[] = [
    {
      id: 'rule',
      header: t('exceptions.column.rule'),
      cell: (item) => (
        <div className="prm-stack prm-stack--tight prm-stack--start">
          <SeverityChip severity={item.severity} />
          <RuleChip rule={item.rule} />
        </div>
      ),
    },
    {
      id: 'subject',
      header: t('exceptions.column.subject'),
      cell: (item) => (
        <div className="prm-stack prm-stack--tight">
          <Reference value={item.subject_id} to={subjectPath(item)} />
          {item.attempt_id !== null && (
            <span className="prm-cell-sub">
              {t('exceptions.attempt', {
                attempt: item.attempt_id,
                reason: item.reason_code ?? '—',
              })}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'evidence',
      width: '14rem',
      header: t('exceptions.column.evidence'),
      cell: (item) => evidenceText(item.rule, item.measure, item.reason_code),
    },
    {
      id: 'owner',
      header: t('exceptions.column.owner'),
      cell: (item) => ownerName(item.owner_id, lookups.lookups),
    },
    {
      id: 'due',
      header: t('exceptions.column.due'),
      width: '9rem',
      cell: (item) => (
        <div className="prm-stack prm-stack--tight">
          <span className={item.late ? 'prm-text-danger' : undefined}>
            {formatCalendarDate(item.due_at)}
          </span>
          {item.late && (
            <span className="prm-inline">
              <Chip tone="danger" size="sm">
                {t('exceptions.late')}
              </Chip>
            </span>
          )}
          <span className="prm-cell-sub">
            {t('exceptions.raised', { date: formatCalendarDate(item.triggered_at) })}
          </span>
        </div>
      ),
    },
    {
      id: 'state',
      header: t('exceptions.column.state'),
      cell: (item) => <ExceptionState item={item} />,
    },
  ];
  if (canAct) {
    columns.push({
      id: 'actions',
      header: <span className="prm-visually-hidden">{t('exceptions.column.actions')}</span>,
      cell: (item) => (
        <div className="prm-stack prm-stack--tight prm-stack--start">
          {item.acknowledged === null && (
            <Button
              size="sm"
              icon="check"
              aria-label={t('exceptions.acknowledge.buttonFor', { name: exceptionName(item) })}
              onClick={() => setDialog({ kind: 'acknowledge', item })}
            >
              {t('exceptions.acknowledge.button')}
            </Button>
          )}
          {item.open_task_id === null && (
            <Button
              size="sm"
              icon="plus"
              aria-label={t('exceptions.create.buttonFor', { name: exceptionName(item) })}
              onClick={() => setDialog({ kind: 'create', item })}
            >
              {t('exceptions.create.short')}
            </Button>
          )}
        </div>
      ),
    });
  }

  let empty: ReactNode;
  if ((listed?.length ?? 0) > 0) {
    empty = (
      <EmptyState
        compact
        icon="checkCircle"
        title={t('exceptions.empty.allAcknowledged', { count: listed?.length ?? 0 })}
        description={t('exceptions.empty.allAcknowledgedDescription')}
        action={
          <Button onClick={() => setShowAcknowledged(true)}>
            {t('exceptions.showAcknowledged')}
          </Button>
        }
      />
    );
  } else if (filtered) {
    empty = (
      <EmptyState
        compact
        icon="filter"
        title={t('exceptions.empty.filtered')}
        description={t('exceptions.empty.filteredDescription')}
      />
    );
  } else {
    empty = (
      <EmptyState
        compact
        icon="checkCircle"
        title={t('exceptions.empty.none')}
        description={t('exceptions.empty.noneDescription', { date: formatCalendarDate(asOf) })}
      />
    );
  }

  return (
    <div className="prm-page">
      <PageHeader
        title={t('exceptions.title')}
        subtitle={t('exceptions.subtitle')}
        actions={<ExportCsvButton screen="exceptions" queries={[list]} table={table} />}
      />
      <ScopeFilterBar
        scope={scope}
        lookups={lookups}
        withPeriod
        extra={{
          active: rule !== undefined || severity !== undefined,
          clear: () => {
            const next = new URLSearchParams(params);
            next.delete('rule');
            next.delete('severity');
            setParams(next, { replace: true });
          },
          fields: (
            <>
              <Select
                label={t('exceptions.filters.rule')}
                placeholder={t('exceptions.filters.allRules')}
                value={rule ?? ''}
                options={RULE_CODES.map((code) => ({
                  value: code,
                  label: `${RULE_IDS[code]} ${ruleLabel(code)}`,
                }))}
                onChange={(value) => setParam('rule', value === '' ? undefined : value)}
              />
              <Select
                label={t('exceptions.filters.severity')}
                placeholder={t('exceptions.filters.allSeverities')}
                value={severity ?? ''}
                options={SEVERITIES.map((level) => ({
                  value: level,
                  label: t(`collections-scope.severity.${level}`),
                }))}
                onChange={(value) => setParam('severity', value === '' ? undefined : value)}
              />
              <Checkbox
                label={t('exceptions.showAcknowledged')}
                checked={showAcknowledged}
                onChange={setShowAcknowledged}
              />
            </>
          ),
        }}
      />
      <Banner tone="info" title={t('exceptions.advisoryTitle')}>
        <p>{t('collections-scope.advisory')}</p>
        {scope.filtered && <p>{t('exceptions.unattributable')}</p>}
      </Banner>
      <Card
        title={t('exceptions.byRule.title')}
        subtitle={
          period === undefined
            ? undefined
            : t('exceptions.byRule.period', { window: periodLine(period) })
        }
      >
        {counts.data === undefined ? (
          <SkeletonBlock lines={1} />
        ) : (
          <QuickRanges
            label={t('exceptions.byRule.label')}
            selected={rule ?? ALL}
            onSelect={(id) => setParam('rule', id === ALL || id === rule ? undefined : id)}
            options={[
              { id: ALL, label: t('exceptions.byRule.all', { count: ruleCounts.total }) },
              ...RULE_CODES.map((code) => ({
                id: code,
                label: t('exceptions.byRule.rule', {
                  rule: `${RULE_IDS[code]} ${ruleLabel(code)}`,
                  count: ruleCounts.byRule[code],
                }),
              })),
            ]}
          />
        )}
      </Card>
      <Card
        flush
        title={t('exceptions.table.title')}
        subtitle={
          rows === undefined ? undefined : t('exceptions.table.count', { count: rows.length })
        }
        actions={
          canAct ? undefined : (
            <span className="prm-text-muted">{t('collections-scope.readOnly')}</span>
          )
        }
        footer={
          hidden > 0 && !showAcknowledged ? (
            <div className="prm-table-footer">
              <span className="prm-text-muted">{t('exceptions.hidden', { count: hidden })}</span>
              <Button size="sm" onClick={() => setShowAcknowledged(true)}>
                {t('exceptions.showAcknowledged')}
              </Button>
            </div>
          ) : undefined
        }
      >
        <DataTable
          caption={t('exceptions.table.caption')}
          columns={columns}
          rows={rows}
          rowKey={(item) => item.exception_id}
          loading={list.isFetching}
          error={list.error}
          onRetry={list.reload}
          empty={empty}
        />
      </Card>
      {dialog?.kind === 'acknowledge' && (
        <AcknowledgeDialog item={dialog.item} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'create' && (
        <CreateTaskDialog
          subject={{ type: dialog.item.subject_type, id: dialog.item.subject_id }}
          defaultReason={REASON_OF_RULE[dialog.item.rule]}
          defaultPriority={dialog.item.severity}
          defaultOwner={dialog.item.owner_id}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
