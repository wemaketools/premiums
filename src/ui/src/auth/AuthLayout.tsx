/**
 * The centred auth surface (`.prm-auth-page`): wordmark, one card, optional extra content below (the demo accounts or
 * roles). Sign-in renders outside the app shell.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { PrototypeBanner } from '../components/shell/PrototypeBanner';
import { Card } from '../components/ui/Card';
import { t } from '../lib/i18n';

export interface AuthLayoutProps {
  readonly title: string;
  readonly subtitle?: ReactNode;
  readonly children?: ReactNode;
  readonly below?: ReactNode;
  readonly wide?: boolean;
}

export function Wordmark() {
  return (
    <span className="prm-brand-name">
      {t('shell.brand.name')}
      <span className="prm-brand-iq">{t('shell.brand.accent')}</span>
    </span>
  );
}

export function AuthLayout({ title, subtitle, children, below, wide = false }: AuthLayoutProps) {
  useEffect(() => {
    document.title = t('shell.documentTitle', { title });
  }, [title]);
  return (
    <>
      <PrototypeBanner />
      <main className="prm-auth-page">
        <div className="prm-auth-brand">
          <Wordmark />
          <span className="prm-brand-sub">{t('shell.brand.sub')}</span>
        </div>
        <Card
          className={wide ? 'prm-auth-card prm-auth-card--wide' : 'prm-auth-card'}
          headingLevel={2}
        >
          <h1 className="prm-card-title">{title}</h1>
          {subtitle !== undefined && <p className="prm-card-sub">{subtitle}</p>}
          {children}
        </Card>
        {below}
      </main>
    </>
  );
}
