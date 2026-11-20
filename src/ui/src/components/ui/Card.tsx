/**
 * Card (`.prm-card`): title, optional subtitle, header actions (for example a "View … →" link or an overflow
 * menu), body and optional footer. `flush` removes the padding for tables that run edge to edge.
 */
import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

import { Icon } from './Icon';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly title?: ReactNode;
  readonly subtitle?: ReactNode;
  readonly actions?: ReactNode;
  readonly footer?: ReactNode;
  readonly flush?: boolean;
  /** Heading level of the title (default 2). */
  readonly headingLevel?: 2 | 3 | 4;
  readonly children?: ReactNode;
}

export function Card({
  title,
  subtitle,
  actions,
  footer,
  flush = false,
  headingLevel = 2,
  className,
  children,
  ...rest
}: CardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';
  const classes = ['prm-card'];
  if (flush) classes.push('prm-card--flush');
  if (className !== undefined) classes.push(className);
  const hasHead = title !== undefined || actions !== undefined;
  return (
    <section className={classes.join(' ')} {...rest}>
      {hasHead && (
        <header className="prm-card-head">
          <div className="prm-card-head-text">
            {title !== undefined && <Heading className="prm-card-title">{title}</Heading>}
            {subtitle !== undefined && <p className="prm-card-sub">{subtitle}</p>}
          </div>
          {actions !== undefined && <div className="prm-card-head-actions">{actions}</div>}
        </header>
      )}
      {children}
      {footer !== undefined && <footer className="prm-card-footer">{footer}</footer>}
    </section>
  );
}

export interface CardLinkProps {
  readonly to: string;
  readonly children: ReactNode;
}

/** The accent "View … →" link of a card header. */
export function CardLink({ to, children }: CardLinkProps) {
  return (
    <Link to={to} className="prm-card-link">
      {children}
      <Icon name="arrowRight" />
    </Link>
  );
}
