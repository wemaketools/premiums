/** The High-severity exceptions in scope, first five, each opening its invoice or receipt. */
import { Link } from 'react-router';

import { endpoints } from '../../../../contracts/index';
import { useApiQuery } from '../../api/hooks';
import { Card, CardLink, Chip, EmptyState, QueryView, SkeletonBlock } from '../../components/ui';
import { formatCalendarDate } from '../../lib/format';
import { t } from '../../lib/i18n';
import {
  RuleChip,
  evidenceText,
  exceptionsLink,
  invoicePath,
  receiptPath,
} from '../collections-scope';
import type { Scope } from '../collections-scope';

const SHOWN = 5;

export function PriorityExceptions({ scope }: { readonly scope: Scope; readonly asOf: string }) {
  const query = useApiQuery(
    endpoints.exceptionsList,
    { query: { ...scope.query, period: scope.period, severity: 'HIGH' } },
    { keepPrevious: true },
  );
  return (
    <Card
      title={t('overview.priority.title')}
      subtitle={t('overview.priority.subtitle')}
      actions={
        <CardLink to={exceptionsLink({ severity: 'HIGH' })}>{t('overview.priority.link')}</CardLink>
      }
    >
      <QueryView
        query={query}
        loading={<SkeletonBlock lines={4} />}
        errorTitle={t('overview.priority.error')}
        isEmpty={(data) => data.items.length === 0}
        empty={<EmptyState compact icon="checkCircle" title={t('overview.priority.empty')} />}
      >
        {(data) => (
          <ul className="prm-stack" aria-busy={query.isFetching}>
            {data.items.slice(0, SHOWN).map((item) => (
              <li key={item.exception_id}>
                <div className="prm-stack prm-stack--tight">
                  <div className="prm-inline">
                    <Link
                      to={
                        item.subject_type === 'INVOICE'
                          ? invoicePath(item.subject_id)
                          : receiptPath(item.subject_id)
                      }
                    >
                      {item.subject_id}
                    </Link>
                    <RuleChip rule={item.rule} />
                    {item.late && (
                      <Chip tone="danger" size="sm">
                        {t('overview.priority.late')}
                      </Chip>
                    )}
                  </div>
                  <span className="prm-text-muted">
                    {evidenceText(item.rule, item.measure, item.reason_code)}
                  </span>
                  <span className="prm-text-muted">
                    {t('overview.priority.due', { date: formatCalendarDate(item.due_at) })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryView>
    </Card>
  );
}
