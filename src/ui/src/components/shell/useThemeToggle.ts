/**
 * The light/dark toggle shared by the top bar and the account menu: what switching would do (label, icon) and the
 * switch itself.
 */
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { chooseTheme } from '../../app/sessionActions';
import { t } from '../../lib/i18n';
import type { IconName } from '../ui/Icon';

export interface ThemeToggle {
  readonly label: string;
  readonly icon: IconName;
  readonly toggle: () => void;
}

export function useThemeToggle(): ThemeToggle {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.session.theme);
  const next = theme === 'dark' ? 'light' : 'dark';
  return {
    label: next === 'dark' ? t('shell.theme.useDark') : t('shell.theme.useLight'),
    icon: next === 'dark' ? 'moon' : 'sun',
    toggle: () => dispatch(chooseTheme(next)),
  };
}
