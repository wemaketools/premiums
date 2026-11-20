/**
 * The strip that says a prototype build shows synthetic data. It cannot be dismissed, on every page of a prototype
 * build, so nobody mistakes the demo for live data.
 */
import { t } from '../../lib/i18n';
import { Icon } from '../ui/Icon';

export function PrototypeBanner() {
  return (
    <div className="prm-prototype-banner" role="note">
      <Icon name="info" />
      <span>{t('shell.prototype.banner')}</span>
    </div>
  );
}
