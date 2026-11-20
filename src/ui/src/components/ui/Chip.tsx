/**
 * Chips: a coloured label for a status, a count or a flag. The label text is always shown, so colour is never the
 * only signal.
 */
import type { ReactNode } from 'react';

import { t } from '../../lib/i18n';
import type { ChipTone } from './chipTones';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface ChipProps {
  readonly tone: ChipTone;
  readonly children: ReactNode;
  /** Transparent background with a coloured outline (for example an overdue flag next to a due date). */
  readonly outlined?: boolean;
  readonly size?: 'md' | 'sm';
  readonly icon?: IconName;
  readonly title?: string;
}

export function Chip({ tone, children, outlined = false, size = 'md', icon, title }: ChipProps) {
  const classes = ['prm-chip', `prm-chip--${tone}`];
  if (outlined) classes.push('prm-chip--outlined');
  if (size === 'sm') classes.push('prm-chip--sm');
  return (
    <span className={classes.join(' ')} data-tone={tone} title={title}>
      {icon !== undefined && <Icon name={icon} />}
      {children}
    </span>
  );
}

/** The danger "Overdue" flag used next to due dates. */
export function OverdueChip() {
  return (
    <Chip tone="danger" outlined size="sm">
      {t('ui.overdue')}
    </Chip>
  );
}
