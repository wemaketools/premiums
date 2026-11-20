/**
 * The sidebar: the tenant label, the wordmark Premium + accent Collections and "Control Tower"; navigation built from
 * the feature registry, then the link to ClaimsIQ (the other module of the suite, in a new tab); the user card and, in
 * the icon rail, the toggle for the full sidebar at the bottom. Below 1280px it collapses to an icon rail, below
 * 768px it is a drawer.
 */
import { NavLink } from 'react-router';

import { features, navItemsFor } from '../../app/featureRegistry';
import { useTenant } from '../../app/hooks';
import type { FeatureModule } from '../../app/featureRegistry';
import { t } from '../../lib/i18n';
import { Icon } from '../ui/Icon';
import { UserCard } from './UserCard';
import { CLAIMSIQ_URL } from '../../lib/suite';

export interface SidebarProps {
  /** Called after a nav link is followed (closes the drawer). */
  readonly onNavigate?: () => void;
  readonly id?: string;
  /** The feature modules to build the navigation from (default: the registry). */
  readonly modules?: readonly FeatureModule[];
  /** Given only in the icon rail (768 to 1279px): the full-sidebar toggle at the bottom. */
  readonly widthToggle?: { readonly expanded: boolean; readonly onToggle: () => void };
}

export function Sidebar({ onNavigate, id, modules = features, widthToggle }: SidebarProps) {
  const items = navItemsFor(modules);
  const tenant = useTenant();
  return (
    <aside className="prm-sidebar" id={id} aria-label={t('shell.sidebar.label')}>
      <div className="prm-brand">
        <div className="prm-brand-tenant" title={tenant.name}>
          {tenant.name}
        </div>
        <div className="prm-brand-name">
          {t('shell.brand.name')}
          <span className="prm-brand-iq">{t('shell.brand.accent')}</span>
        </div>
        <div className="prm-brand-sub">{t('shell.brand.sub')}</div>
        <div className="prm-brand-mark" aria-hidden="true">
          P<span className="prm-brand-iq">C</span>
        </div>
      </div>
      <nav className="prm-nav" aria-label={t('shell.nav.label')}>
        <ul className="prm-nav-section">
          {items.map((item) => {
            const label = t(item.label);
            return (
              <li key={item.id}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'prm-nav-item prm-nav-item--active' : 'prm-nav-item'
                  }
                  title={label}
                  onClick={onNavigate}
                >
                  <Icon name={item.icon} />
                  <span className="prm-nav-label">{label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
        <ul className="prm-nav-section">
          <li>
            <a
              href={CLAIMSIQ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="prm-nav-item"
              title={t('shell.brand.claimsiqHint')}
            >
              <Icon name="externalLink" />
              <span className="prm-nav-label">{t('shell.brand.claimsiq')}</span>
            </a>
          </li>
        </ul>
      </nav>
      <UserCard />
      {widthToggle !== undefined && (
        <button
          type="button"
          className="prm-sidebar-toggle"
          title={t('shell.sidebar.expand')}
          aria-expanded={widthToggle.expanded}
          onClick={widthToggle.onToggle}
        >
          <Icon name={widthToggle.expanded ? 'chevronsLeft' : 'chevronsRight'} />
          <span className="prm-sidebar-toggle-label">{t('shell.sidebar.expand')}</span>
        </button>
      )}
    </aside>
  );
}
