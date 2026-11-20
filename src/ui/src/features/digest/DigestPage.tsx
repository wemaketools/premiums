/**
 * COL-FR-16 Finance summary / action digest: a print-friendly one-pager for the CFO with the as-of date, data set,
 * tenant, scope and cash period; the key figures, each with its exact definition and count; the aging; the top
 * exposures by broker, product and client; the exceptions by rule and severity; and the recovery actions, overdue
 * ones listed. Print hides the shell and the controls and keeps the sheet on A4.
 */
import { useMemo } from 'react';

import { endpoints } from '../../../../contracts/index';
import type { TaskListItem } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector, useTenant } from '../../app/hooks';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  QueryView,
  SkeletonBlock,
} from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import { ScopeFilterBar, periodLine, scopeText, useLookups, useScope } from '../collections-scope';
import {
  ActionsSection,
  AgingSection,
  ExceptionsSection,
  ExposureSection,
  KpiSection,
} from './DigestSections';

export default function DigestPage() {
  const scope = useScope();
  const lookups = useLookups();
  const tenant = useTenant();
  const { dataSet, asOf } = useAppSelector((state) => state.dataContext);
  const request = { query: { ...scope.query, period: scope.period } };
  const summary = useApiQuery(endpoints.collectionsSummary, request, { keepPrevious: true });
  const exceptions = useApiQuery(endpoints.exceptionsList, request, { keepPrevious: true });
  const config = useApiQuery(endpoints.ruleConfigGet, {});
  const tasks = useApiQuery(endpoints.tasksList, {});
  const users = useApiQuery(endpoints.usersList, {});
  // With a filter, the actions shown are those on invoices in scope.
  const inScope = useApiQuery(
    endpoints.invoicesList,
    scope.filtered ? { query: scope.query } : null,
    {
      keepPrevious: true,
    },
  );

  const reviewDays = config.data?.config.collections.overdue_30_review_days ?? 30;
  const taskItems = tasks.data?.items;
  const scopedInvoices = inScope.data?.items;
  const scopedTasks = useMemo((): TaskListItem[] | undefined => {
    if (taskItems === undefined) return undefined;
    if (!scope.filtered) return taskItems;
    if (scopedInvoices === undefined) return undefined;
    const ids = new Set(scopedInvoices.map((item) => item.invoice_id));
    return taskItems.filter((task) => task.subject_type === 'INVOICE' && ids.has(task.subject_id));
  }, [taskItems, scopedInvoices, scope.filtered]);
  const userName = (id: string): string =>
    users.data?.items.find((user) => user.user_id === id)?.display_name ?? id;
  const actionsError = tasks.error ?? users.error ?? (scope.filtered ? inScope.error : null);

  return (
    <div className="prm-page prm-digest">
      <PageHeader
        title={t('digest.title')}
        subtitle={t('digest.subtitle')}
        actions={
          <Button
            variant="primary"
            icon="printer"
            disabled={summary.data === undefined}
            onClick={() => window.print()}
          >
            {t('digest.print')}
          </Button>
        }
      />
      <div className="prm-digest-controls">
        <ScopeFilterBar scope={scope} lookups={lookups} withPeriod />
      </div>
      <article className="prm-digest-sheet" aria-labelledby="digest-title">
        <header className="prm-digest-header">
          <h2 className="prm-digest-title" id="digest-title">
            {t('digest.sheet.title')}
          </h2>
          <dl className="prm-digest-meta">
            <div>
              <dt>{t('digest.sheet.tenant')}</dt>
              <dd>{tenant.name}</dd>
            </div>
            <div>
              <dt>{t('digest.sheet.dataSet')}</dt>
              <dd>{t(`shell.data.set.${dataSet}`)}</dd>
            </div>
            <div>
              <dt>{t('digest.sheet.asOf')}</dt>
              <dd>{formatCalendarDate(asOf)}</dd>
            </div>
            <div>
              <dt>{t('digest.sheet.scope')}</dt>
              <dd>{scopeText(scope.query, lookups.lookups)}</dd>
            </div>
            <div>
              <dt>{t('digest.sheet.period')}</dt>
              <dd>
                {summary.data === undefined
                  ? t(`collections-scope.period.${scope.period}`)
                  : periodLine(summary.data.summary.period)}
              </dd>
            </div>
          </dl>
          <p className="prm-digest-note">
            <strong>{t('digest.sheet.synthetic')}</strong>
          </p>
        </header>
        <QueryView
          query={summary}
          loading={
            <Card data-state="loading">
              <SkeletonBlock lines={6} />
            </Card>
          }
          isEmpty={(answer) => answer.summary.invoices === 0}
          empty={
            <Card data-state="empty">
              <EmptyState
                icon="fileText"
                title={t('digest.empty.title')}
                description={
                  scope.filtered
                    ? t('digest.empty.filteredDescription')
                    : t('digest.empty.description')
                }
              />
            </Card>
          }
        >
          {(answer) => (
            <div className="prm-stack" aria-busy={summary.isFetching}>
              <KpiSection summary={answer.summary} reviewDays={reviewDays} />
              <div className="prm-grid prm-grid--2 prm-digest-pair">
                <AgingSection summary={answer.summary} />
                <ExceptionsSection
                  items={exceptions.data?.items}
                  error={exceptions.error}
                  onRetry={exceptions.reload}
                />
              </div>
              <ExposureSection summary={answer.summary} lookups={lookups.lookups} />
              <ActionsSection
                tasks={scopedTasks}
                filtered={scope.filtered}
                userName={userName}
                error={actionsError}
                onRetry={() => {
                  tasks.reload();
                  users.reload();
                  inScope.reload();
                }}
              />
            </div>
          )}
        </QueryView>
      </article>
    </div>
  );
}
