/** Class names of the `.prm-btn` variants, shared by Button, ButtonLink and other button-styled elements. */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-soft' | 'ghost' | 'link';

export function buttonClassName(
  variant: ButtonVariant = 'secondary',
  size: 'md' | 'sm' = 'md',
  block = false,
  extra?: string,
): string {
  const classes = ['prm-btn'];
  if (variant !== 'secondary') {
    classes.push(`prm-btn--${variant}`);
  }
  if (size === 'sm') {
    classes.push('prm-btn--sm');
  }
  if (block) {
    classes.push('prm-btn--block');
  }
  if (extra !== undefined) {
    classes.push(extra);
  }
  return classes.join(' ');
}
