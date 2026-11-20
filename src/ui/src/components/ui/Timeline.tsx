/**
 * Timeline (`.prm-timeline`): a vertical sequence of events with a toned marker, title, meta line and detail.
 */
import type { ReactNode } from 'react';

import { Icon } from './Icon';
import type { IconName } from './Icon';

export type TimelineTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'accent';

export interface TimelineItem {
  readonly id: string | number;
  readonly title: ReactNode;
  readonly meta?: ReactNode;
  readonly detail?: ReactNode;
  readonly tone?: TimelineTone;
  readonly icon?: IconName;
}

export interface TimelineProps {
  readonly items: readonly TimelineItem[];
  readonly label: string;
}

export function Timeline({ items, label }: TimelineProps) {
  return (
    <ol className="prm-timeline" aria-label={label}>
      {items.map((item) => {
        const tone = item.tone ?? 'neutral';
        return (
          <li key={item.id} className="prm-timeline-item">
            <span
              className={
                tone === 'neutral'
                  ? 'prm-timeline-dot'
                  : `prm-timeline-dot prm-timeline-dot--${tone}`
              }
              aria-hidden="true"
            >
              <Icon name={item.icon ?? 'clock'} />
            </span>
            <div className="prm-timeline-body">
              <p className="prm-timeline-title">{item.title}</p>
              {item.meta !== undefined && <p className="prm-timeline-meta">{item.meta}</p>}
              {item.detail !== undefined && (
                <div className="prm-timeline-detail">{item.detail}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
