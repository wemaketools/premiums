/**
 * ToastProvider (`.prm-toasts`): renders the toast stack in a polite live region. The toasts are not list items: a
 * `status` role on an `li` fails axe's `list` rule.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../lib/i18n';
import { IconButton } from './Button';
import { Icon } from './Icon';
import { ToastContext } from './toastContext';
import type { ToastApi, ToastTone } from './toastContext';

interface ToastItem {
  readonly id: number;
  readonly message: string;
  readonly tone: ToastTone;
}

const DURATION_MS = 6000;

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show(message, tone = 'info') {
        const id = nextId.current;
        nextId.current += 1;
        setToasts((list) => [...list.slice(-3), { id, message, tone }]);
        if (tone !== 'error') {
          window.setTimeout(() => dismiss(id), DURATION_MS);
        }
      },
    }),
    [dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="prm-toasts"
        role="region"
        aria-live="polite"
        aria-label={t('ui.toast.region')}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={toast.tone === 'info' ? 'prm-toast' : `prm-toast prm-toast--${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <Icon
              name={
                toast.tone === 'success'
                  ? 'checkCircle'
                  : toast.tone === 'error'
                    ? 'alertOctagon'
                    : 'info'
              }
            />
            <span>{toast.message}</span>
            <IconButton
              icon="x"
              label={t('ui.action.dismiss')}
              variant="ghost"
              size="sm"
              onClick={() => dismiss(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
