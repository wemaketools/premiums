/**
 * User-facing text of a failed request: sanitized, and a 5xx asks the user to quote the correlation id.
 */
import type { ApiError } from '../../api/client';
import { t } from '../../lib/i18n';

export function describeError(error: ApiError): string {
  switch (error.kind) {
    case 'network':
      return t('ui.error.network');
    case 'server':
      return t('ui.error.server');
    case 'contract':
      // Only development builds validate responses, so this message is written for the developer.
      return t('ui.error.contract', { endpoint: error.endpointId, detail: error.detail ?? '' });
    case 'not_found':
      return t('ui.error.notFound');
    case 'rate_limited':
      return t('ui.error.rateLimited');
    case 'forbidden':
      return t('ui.restricted.description');
    default:
      return error.detail ?? error.title;
  }
}
