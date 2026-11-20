/**
 * COL-04 Account / Invoice Detail: the account, the calculation of the outstanding traced to its allocations, the
 * flags with their evidence and the advisory caveat, the payment attempts, the suggested next action, the recovery
 * actions with their audit trail, a chronological timeline, the policy's installments and its linked claims.
 */
import { Link, useParams } from 'react-router';

import { endpoints, formatMoney } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { useAppSelector } from '../../app/hooks';
import {
  ButtonLink,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonBlock,
} from '../../components/ui';
import { t } from '../../lib/i18n';
import { INVOICES_PATH, PriorityChip, useLookups } from '../collections-scope';
import {
  AccountCard,
  AgingChip,
  AttemptsCard,
  CalculationCard,
  ClaimsCard,
  FlagsCard,
  InstallmentsCard,
  SuggestionCard,
} from './AccountCards';
import { AccountTimelineCard } from './AccountTimeline';
import { RecoveryActionsCard } from './RecoveryActions';

function Breadcrumb({ invoiceId }: { readonly invoiceId: string }) {
  return (
    <nav aria-label={t('invoice-detail.breadcrumb.label')} className="prm-inline">
      <Link to={INVOICES_PATH}>{t('invoice-detail.breadcrumb.invoices')}</Link>
      <span aria-hidden="true">›</span>
      <span aria-current="page" className="prm-mono">
        {invoiceId}
      </span>
    </nav>
  );
}

export default function InvoiceDetailPage() {
  const invoiceId = useParams().invoiceId ?? '';
  const dataSet = useAppSelector((state) => state.dataContext.dataSet);
  const lookups = useLookups();
  const detail = useApiQuery(endpoints.invoicesGet, { params: { invoiceId } });
  const tasks = useApiQuery(endpoints.tasksList, {
    query: { subject_type: 'INVOICE', subject_id: invoiceId },
  });
  const title = t('invoice-detail.title', { invoice: invoiceId });
  const data = detail.data;

  if (data === undefined) {
    const notFound = detail.error?.kind === 'not_found';
    return (
      <div className="prm-page">
        <PageHeader title={title} meta={<Breadcrumb invoiceId={invoiceId} />} />
        {notFound ? (
          <Card data-state="empty">
            <EmptyState
              icon="fileText"
              title={t('invoice-detail.notFound.title')}
              description={t('invoice-detail.notFound.description', {
                invoice: invoiceId,
                dataSet,
              })}
              action={
                <ButtonLink to={INVOICES_PATH} icon="arrowLeft">
                  {t('invoice-detail.notFound.back')}
                </ButtonLink>
              }
            />
          </Card>
        ) : detail.error !== null ? (
          <ErrorState error={detail.error} onRetry={detail.reload} />
        ) : (
          <Card data-state="loading">
            <SkeletonBlock lines={8} />
          </Card>
        )}
      </div>
    );
  }

  const { facts } = data;
  return (
    <div className="prm-page" aria-busy={detail.isFetching}>
      <PageHeader
        title={title}
        meta={
          <div className="prm-stack prm-stack--tight">
            <Breadcrumb invoiceId={invoiceId} />
            <span className="prm-inline">
              <AgingChip facts={facts} />
              {facts.priority !== null && <PriorityChip priority={facts.priority} />}
              <Chip tone="neutral-outlined" size="sm">
                {`${t('invoice-detail.installments.column.outstanding')} ${formatMoney(facts.outstanding)}`}
              </Chip>
            </span>
          </div>
        }
      />
      {detail.error !== null && <ErrorState error={detail.error} onRetry={detail.reload} />}
      <div className="prm-grid prm-grid--2">
        <AccountCard detail={data} lookups={lookups.lookups} />
        <CalculationCard detail={data} />
      </div>
      <div className="prm-grid prm-grid--2">
        <FlagsCard detail={data} />
        <div className="prm-stack">
          <SuggestionCard detail={data} />
          <AttemptsCard detail={data} />
        </div>
      </div>
      <div className="prm-grid prm-grid--2">
        <RecoveryActionsCard detail={data} tasks={tasks} lookups={lookups.lookups} />
        <AccountTimelineCard
          detail={data}
          tasks={tasks.data?.items ?? []}
          lookups={lookups.lookups}
        />
      </div>
      <div className="prm-grid prm-grid--2">
        <InstallmentsCard detail={data} />
        <ClaimsCard detail={data} dataSet={dataSet} />
      </div>
    </div>
  );
}
