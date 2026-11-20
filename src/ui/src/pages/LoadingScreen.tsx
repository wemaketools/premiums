/** The full-page loading state while the demo session is read from the browser. */
import { Wordmark } from '../auth/AuthLayout';
import { t } from '../lib/i18n';

export function LoadingScreen({ message }: { readonly message?: string }) {
  return (
    <div className="prm-loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="prm-loading-screen-inner">
        <Wordmark />
        <span className="prm-btn-spinner" aria-hidden="true" />
        <span>{message ?? t('shell.loading.session')}</span>
      </div>
    </div>
  );
}
