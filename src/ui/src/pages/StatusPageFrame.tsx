/**
 * The frame of a status page (Not found, route error): a page with a header inside the app shell, or a centred card
 * on its own outside it.
 */
import type { ReactNode } from 'react';

import { PageHeader } from '../components/ui/PageHeader';

export interface StatusPageFrameProps {
  readonly inShell: boolean;
  readonly title: string;
  readonly children: ReactNode;
}

export function StatusPageFrame({ inShell, title, children }: StatusPageFrameProps) {
  if (inShell) {
    return (
      <div className="prm-page">
        <PageHeader title={title} />
        {children}
      </div>
    );
  }
  return (
    <main className="prm-auth-page">
      <PageHeader title={title} />
      <div className="prm-auth-card prm-auth-card--wide">{children}</div>
    </main>
  );
}
