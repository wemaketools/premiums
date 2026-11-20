/**
 * Sign-in: there are no accounts, so no form. A click on a role signs in as it at once; after sign-in the user lands
 * on the page they asked for, or on the screen of the active persona (`/`).
 */
import { Navigate, useLocation } from 'react-router';

import { LANDING_ROUTE } from '../app/landing';
import { useAppSelector } from '../app/hooks';
import { PERSONA_IDS } from '../app/personas';
import { t } from '../lib/i18n';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './authContext';
import { DemoAccounts } from './DemoAccounts';
import { PROTOTYPE_USER_NAMES } from './prototypeUsers';

interface FromState {
  readonly from?: string;
}

export function SignInPage() {
  const auth = useAuth();
  const location = useLocation();
  const authStatus = useAppSelector((state) => state.session.authStatus);
  const from = (location.state as FromState | null)?.from;

  if (authStatus === 'signedIn') {
    return (
      <Navigate to={from !== undefined && from !== '/signin' ? from : LANDING_ROUTE} replace />
    );
  }
  return (
    <AuthLayout
      title={t('auth.signIn.title')}
      subtitle={t('auth.prototype.subtitle')}
      below={
        <DemoAccounts
          title={t('auth.prototype.title')}
          subtitle={t('auth.prototype.hint')}
          accounts={PERSONA_IDS.map((role) => ({
            id: role,
            name: t(`shell.persona.${role}`),
            detail: PROTOTYPE_USER_NAMES[role],
          }))}
          onPick={auth.signInAsRole}
        />
      }
    />
  );
}
