import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, tableRows } from '../../test/renderApp';

const user = userEvent.setup();

/** The card with this heading. */
/** The plain-terms calculation line, matched as a whole sentence. */
const calculation = (text: string) => (_: string, element: Element | null) =>
  element?.classList.contains('prm-calculation') === true && element.textContent === text;

const card = (heading: string): HTMLElement =>
  screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement;

describe('Invoice Detail', () => {
  it('traces INV-006 from issued to outstanding with its advisory flags, an unchanged policy status and its claim, logs a recovery action with actor and time, hides edits from the Executive Viewer, and shows DEMO claims or "No linked claims"', async () => {
    const { router } = renderApp('/invoices/INV-006');

    // COL-04: the account and the calculation in plain terms.
    expect(
      await screen.findByText(
        calculation('Issued P7,000.00 − applied P0.00 = outstanding P7,000.00'),
      ),
    ).toBeInTheDocument();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Invoices' })).toHaveAttribute(
      'href',
      '/invoices',
    );
    const account = card('Account');
    for (const text of [
      'Naledi Engineering (fictional)',
      'SYN-BW-00006',
      'Direct Sales',
      'Property All Risk',
      'Tiro Demo',
    ]) {
      expect(account).toHaveTextContent(text);
    }
    // COL-AT-08: the policy status stays as imported, whatever the flags say.
    expect(account).toHaveTextContent(
      'Policy status (imported)ACTIVEImported from the policy records. No collection flag ever changes it.',
    );
    const figures = card('How the outstanding is calculated');
    expect(figures).toHaveTextContent('Days overdue142');
    expect(figures).toHaveTextContent('Aging bucketOver 90 days');
    expect(figures).toHaveTextContent(
      'No allocation posted: nothing has been applied to this invoice.',
    );

    // COL-FR-09: each flag with its rule id, severity, evidence, time, acknowledgement and the advisory caveat.
    const flags = card('Flags');
    expect(flags).toHaveTextContent('COL-R01 Overdue more than 30 days');
    expect(flags).toHaveTextContent('COL-R03 Lapse review');
    expect(flags).toHaveTextContent(
      '142 days overdue with P7,000.00 outstanding: review for potential cover implications.',
    );
    expect(flags).toHaveTextContent('Triggered 31 Jul 2026');
    expect(flags).toHaveTextContent('Not acknowledged yet');
    expect(flags).toHaveTextContent('Advisory flag from a configurable demo rule');
    expect(card('Suggested next action')).toHaveTextContent('Refer the account for a cover review');

    // COL-AT-12 on TEST: the claim on the same policy, shown here only.
    expect(tableRows('Claims on the policy')).toEqual([
      ['CLM-106', 'Assessment', 'Open', '25 Sep 2026', 'P30,000.00'],
    ]);
    expect(card('Linked claims')).toHaveTextContent(
      'so the claims of the TEST data set are shown here only',
    );
    expect(within(card('Linked claims')).queryByRole('link')).not.toBeInTheDocument();
    expect(tableRows('Invoices of the policy')).toEqual([
      ['INV-006This invoice', '1 Jun 2026', 'P7,000.00', 'Over 90 days'],
    ]);

    // COL-AT-09: the CFO creates an action, with the reason, urgency and owner taken from the account, then moves it on.
    await user.click(screen.getByRole('button', { name: 'Create recovery action' }));
    const create = await screen.findByRole('dialog', { name: 'Create a recovery action' });
    expect(within(create).getByRole('combobox', { name: 'Reason' })).toHaveDisplayValue(
      'Lapse review',
    );
    expect(within(create).getByRole('combobox', { name: 'Urgency' })).toHaveDisplayValue('High');
    await waitFor(() =>
      expect(within(create).getByRole('combobox', { name: 'Owner' })).toHaveDisplayValue(
        'Tiro Demo',
      ),
    );
    await user.type(
      within(create).getByRole('textbox', { name: /Next action/ }),
      'Refer to the broker for a cover review',
    );
    await user.click(within(create).getByRole('button', { name: 'Create action' }));
    const actions = card('Recovery actions');
    expect(await within(actions).findByText('TASK-0001')).toBeInTheDocument();
    expect(actions).toHaveTextContent('Refer to the broker for a cover review');
    await user.click(within(actions).getByRole('button', { name: 'Change status of TASK-0001' }));
    const status = await screen.findByRole('dialog', { name: 'Change the status' });
    await user.selectOptions(
      within(status).getByRole('combobox', { name: /^New status/ }),
      'In progress',
    );
    await user.click(within(status).getByRole('button', { name: 'Change status' }));
    await waitFor(() => {
      const trail = within(within(actions).getByRole('list', { name: 'History of TASK-0001' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent ?? '');
      expect(trail).toEqual([
        expect.stringContaining('Created as Open'),
        expect.stringContaining('Assigned to Tiro Demo'),
        expect.stringContaining('Status changed from Open to In progress'),
      ]);
      expect(trail.every((line) => line.includes('CFO / MD · '))).toBe(true);
    });

    // COL-FR-10: one chronological timeline of the account, the action's changes included.
    const timeline = within(screen.getByRole('list', { name: 'Timeline of INV-006' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent ?? '');
    expect(timeline).toEqual([
      expect.stringContaining('Invoice issued for P7,000.00'),
      expect.stringContaining('Due date1 Jun 2026'),
      expect.stringContaining('COL-R01 Overdue more than 30 days triggered'),
      expect.stringContaining('COL-R03 Lapse review triggered'),
      expect.stringContaining('TASK-0001: Created as Open'),
      expect.stringContaining('TASK-0001: Assigned to Tiro Demo'),
      expect.stringContaining('TASK-0001: Status changed from Open to In progress'),
    ]);

    // The Executive Viewer reads the same page with no edit controls.
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Viewing as' }),
      'Executive Viewer',
    );
    // Switching persona opens its landing page; come back to the invoice.
    await act(() => router.navigate('/invoices/INV-006'));
    expect(
      await screen.findByText(
        'The Executive Viewer reads the collections and has no edit controls.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Create recovery action' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Change status|Assign owner|Add a note)/ }),
    ).not.toBeInTheDocument();
    expect(card('Recovery actions')).toHaveTextContent(
      'The Executive Viewer reads the collections and has no edit controls.',
    );
    expect(card('Recovery actions')).toHaveTextContent('Status changed from Open to In progress');

    // A paid invoice is out of active aging; a failed debit order is never cash (COL-AT-05).
    await act(() => router.navigate('/invoices/INV-002'));
    await waitFor(() =>
      expect(tableRows('Payment attempts of the invoice')).toEqual([
        ['ATT-002-1', '6 Oct 2026', 'Debit order', 'Failed', 'Insufficient funds'],
        ['ATT-002-2', '14 Oct 2026', 'Debit order', 'Failed', 'Insufficient funds'],
      ]),
    );
    expect(
      screen.getByText(calculation('Issued P8,000.00 − applied P0.00 = outstanding P8,000.00')),
    ).toBeInTheDocument();
    expect(card('Payment attempts')).toHaveTextContent('does not reduce the outstanding');
    await act(() => router.navigate('/invoices/INV-005'));
    expect(await screen.findByText('Paid in full')).toBeInTheDocument();
    expect(tableRows('Allocations to the invoice')[0]?.[0]).toBe('ALLOC-003');
    expect(screen.getByRole('link', { name: 'RCP-003' })).toHaveAttribute(
      'href',
      '/receipts/RCP-003',
    );

    // An invoice the data set does not have leads back to the list.
    await act(() => router.navigate('/invoices/INV-999'));
    expect(await screen.findByText('Invoice not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the invoice list' })).toHaveAttribute(
      'href',
      '/invoices',
    );

    // COL-AT-12 on DEMO: a claim links out to ClaimsIQ; a policy without claims says so.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Data set' }), 'DEMO');
    await act(() => router.navigate('/invoices/DINV-001'));
    const claimLink = await screen.findByRole('link', {
      name: 'Open DCLM-001 in ClaimsIQ (new tab)',
    });
    expect(claimLink).toHaveAttribute('href', 'https://claims.thebrittany.ai/claims/DCLM-001');
    expect(claimLink).toHaveAttribute('target', '_blank');
    expect(claimLink).toHaveAttribute('rel', 'noopener noreferrer');
    await act(() => router.navigate('/invoices/DINV-031'));
    await waitFor(() => expect(card('Linked claims')).toHaveTextContent('No linked claims'));
    expect(within(card('Linked claims')).queryByRole('table')).not.toBeInTheDocument();
  });
});
