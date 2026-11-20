/**
 * Not found: an unknown URL. Inside the app shell it keeps the navigation; outside it offers the way home.
 */
import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { t } from '../lib/i18n';
import { StatusPageFrame } from './StatusPageFrame';

export interface NotFoundPageProps {
  /** Rendered inside the app shell (true) or standalone (false). */
  readonly inShell?: boolean;
}

export function NotFoundPage({ inShell = false }: NotFoundPageProps) {
  const body = (
    <div className="prm-card">
      <EmptyState
        icon="compass"
        title={t('pages.notFound.title')}
        description={t('pages.notFound.description')}
        action={
          <ButtonLink to="/" variant="primary">
            {t('pages.notFound.home')}
          </ButtonLink>
        }
      />
    </div>
  );
  return (
    <StatusPageFrame inShell={inShell} title={t('pages.notFound.title')}>
      {body}
    </StatusPageFrame>
  );
}
