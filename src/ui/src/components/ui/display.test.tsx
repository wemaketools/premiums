import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import { t } from '../../lib/i18n';
import { Banner } from './Banner';
import { Button, ButtonLink, IconButton, IconLink } from './Button';
import { Card, CardLink } from './Card';
import { Chip, OverdueChip } from './Chip';
import { CHIP_TONES } from './chipTones';
import { DetailList } from './DetailList';
import { EmptyState, ErrorState, RestrictedState } from './EmptyState';
import { describeError } from './errors';
import { Icon } from './Icon';
import { ICON_NAMES } from './icons';
import { KpiCard } from './KpiCard';
import { SkeletonBlock } from './Skeleton';
import { Stepper } from './Stepper';
import { Timeline } from './Timeline';
import { OrDash, Reference } from './Values';

describe('display components', () => {
  it('renders buttons, cards, chips, banners, states, KPIs, steps and timelines as one page', async () => {
    const onClick = vi.fn();
    const onRetry = vi.fn();
    render(
      <MemoryRouter>
        <Icon name="lock" label="Locked" />
        <Button variant="primary" loading onClick={onClick}>
          Submit
        </Button>
        <IconButton icon="bell" label="Notifications" count={120} />
        <IconLink to="/actions" icon="checkSquare" label="Tasks, 3 open" count={3} />
        <ButtonLink to="/claims" variant="primary">
          Go
        </ButtonLink>
        <Card
          title="Pipeline"
          subtitle="By stage"
          actions={<CardLink to="/claims">View all</CardLink>}
        >
          <DetailList
            items={[
              { label: 'Owner', value: 'Kagiso Dube' },
              { label: 'Budget', value: null },
            ]}
          />
          <Reference value="CLM-0003" to="/claims/3" />
          <OrDash>{''}</OrDash>
        </Card>
        {CHIP_TONES.map((tone) => (
          <Chip key={tone} tone={tone}>
            {`tone ${tone}`}
          </Chip>
        ))}
        <OverdueChip />
        <Banner tone="error" title="Cannot continue" />
        <Banner tone="success" title="Done" />
        <EmptyState title="No claims yet" description="Create the first one." />
        <RestrictedState
          title="Hidden"
          description="Finance figures are not shown to this persona."
        />
        <ErrorState
          onRetry={onRetry}
          error={
            new ApiError({
              kind: 'server',
              status: 500,
              title: 'Internal',
              correlationId: 'corr-7',
              endpointId: 'x',
            })
          }
        />
        <SkeletonBlock lines={3} />
        <KpiCard
          label="Open claims"
          value="4"
          icon="fileText"
          delta={{ direction: 'down', text: '-2' }}
        />
        <KpiCard label="Avg cycle time" value={null} icon="timer" />
        <KpiCard label="Finance figures" value="9" icon="lock" restricted />
        <Stepper
          label="Claim progress"
          steps={[
            { id: 'a', label: 'Draft', state: 'complete' },
            { id: 'b', label: 'Approval', state: 'current' },
            { id: 'c', label: 'Hold', state: 'blocked' },
          ]}
        />
        <Timeline
          label="History"
          items={[
            {
              id: 1,
              title: 'Published',
              meta: 'Kagiso Dube',
              detail: 'Version 2',
              tone: 'success',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(60);
    expect(screen.getByRole('img', { name: 'Locked' })).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(submit);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Notifications' })).toHaveTextContent('99+');
    expect(screen.getByRole('link', { name: 'Tasks, 3 open' })).toHaveAttribute('href', '/actions');
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute('href', '/claims');

    expect(screen.getByRole('heading', { name: 'Pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/claims');
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'CLM-0003' })).toHaveAttribute('href', '/claims/3');
    for (const tone of CHIP_TONES) {
      expect(screen.getByText(`tone ${tone}`)).toBeVisible();
    }
    expect(screen.getByText('Overdue')).toBeInTheDocument();

    expect(screen.getByText('Cannot continue').closest('[role="alert"]')).not.toBeNull();
    expect(screen.getByText('Done').closest('[role="status"]')).not.toBeNull();
    expect(screen.getByText('No claims yet')).toBeInTheDocument();
    expect(screen.getByText('Finance figures are not shown to this persona.')).toBeInTheDocument();
    expect(screen.getByText('Correlation id: corr-7')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('region', { name: 'Avg cycle time' })).toHaveTextContent('—');
    expect(screen.queryByRole('region', { name: 'Finance figures' })).not.toBeInTheDocument();
    expect(screen.getByText('Approval').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'History' })).toHaveTextContent(
      'PublishedKagiso DubeVersion 2',
    );
    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0);
  });

  it('describes failures in the catalog wording and shows a 403 as the restricted state', () => {
    const failure = (kind: ApiError['kind'], detail: string | null = null) =>
      new ApiError({ kind, status: 500, title: 'Title', detail, endpointId: 'x.y' });

    expect(describeError(failure('network', 'raw'))).toBe(t('ui.error.network'));
    expect(describeError(failure('server', 'raw'))).toBe(t('ui.error.server'));
    expect(describeError(failure('forbidden', 'raw'))).toBe(t('ui.restricted.description'));
    expect(describeError(failure('contract', 'items: Required'))).toContain('items: Required');
    expect(describeError(failure('validation', 'Amount is negative'))).toBe('Amount is negative');

    render(<ErrorState error={failure('forbidden')} />);

    expect(screen.getByText('Restricted')).toBeInTheDocument();
  });
});
