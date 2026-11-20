import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, tableRows } from '../../test/renderApp';

const section = (heading: string): HTMLElement =>
  screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement;

describe('Receipt detail', () => {
  it('explains RCP-UNAPP in plain terms, creates a recovery action on it with its audit line, moves it to In progress and acknowledges the exception', async () => {
    const user = userEvent.setup();
    renderApp('/receipts/RCP-UNAPP');

    // The CFO demo step: P1,500 received, nothing applied, so no named invoice is reduced.
    expect(await screen.findByRole('heading', { name: 'Calculation' })).toBeInTheDocument();
    expect(section('Calculation')).toHaveTextContent(
      'Received P1,500.00 − applied P0.00 = unapplied P1,500.00',
    );
    expect(
      screen.getByText(
        /P1,500.00 of this receipt is applied to no invoice yet, so no named invoice is reduced/,
      ),
    ).toBeInTheDocument();
    expect(
      within(section('Allocations from this receipt')).getByText('Not applied to any invoice yet'),
    ).toBeInTheDocument();
    const [exception] = tableRows('Exceptions on this receipt');
    expect(exception?.slice(0, 5)).toEqual([
      'Medium',
      'COL-R04 Unapplied cash',
      'P1,500.00 received and not yet applied to any invoice.',
      'Unassigned',
      '15 Oct 2026Late',
    ]);
    expect(section('Exceptions on this receipt')).toHaveTextContent(
      /Advisory flag from a configurable demo rule/,
    );
    expect(await screen.findByText('No recovery actions on this receipt')).toBeInTheDocument();

    // Create: the subject is the receipt, the reason unapplied cash and the urgency Medium by default.
    await user.click(screen.getByRole('button', { name: 'Create recovery action' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create a recovery action' });
    expect(within(dialog).getByTestId('confirm-context')).toHaveTextContent('RCP-UNAPP');
    expect(within(dialog).getByRole('combobox', { name: 'Reason' })).toHaveValue('UNAPPLIED_CASH');
    expect(within(dialog).getByRole('combobox', { name: 'Urgency' })).toHaveValue('MEDIUM');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Owner' }), 'Tiro Demo');
    await user.type(
      within(dialog).getByRole('textbox', { name: /Next action/ }),
      'Ask the bank for the remittance advice',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Create action' }));
    expect(await screen.findByText(/^Action \S+ created for RCP-UNAPP\.$/)).toBeInTheDocument();

    const actions = within(
      await screen.findByRole('list', { name: 'Recovery actions on this receipt' }),
    );
    const [task] = actions.getAllByRole('listitem');
    expect(task).toHaveTextContent('Unapplied cash');
    expect(task).toHaveTextContent('Tiro Demo');
    expect(task).toHaveTextContent('Ask the bank for the remittance advice');
    expect(within(task as HTMLElement).getByText('Created as Open')).toBeInTheDocument();
    expect(within(task as HTMLElement).getAllByText(/^CFO \/ MD · /)).toHaveLength(2);
    // The exception now names the open action and its owner.
    await waitFor(() => expect(tableRows('Exceptions on this receipt')[0]?.[3]).toBe('Tiro Demo'));
    expect(section('Exceptions on this receipt')).toHaveTextContent('Action open');

    // Change status: logged with the persona and the time.
    await user.click(
      within(task as HTMLElement).getByRole('button', { name: /^Change status of / }),
    );
    const status = await screen.findByRole('dialog', { name: 'Change the status' });
    await user.selectOptions(
      within(status).getByRole('combobox', { name: 'New status' }),
      'In progress',
    );
    await user.click(within(status).getByRole('button', { name: 'Change status' }));
    expect(
      await within(task as HTMLElement).findByText('Status changed from Open to In progress'),
    ).toBeInTheDocument();

    // Acknowledge: who and when show on the exception; the calculation does not change.
    await user.click(
      screen.getByRole('button', { name: 'Acknowledge COL-R04 Unapplied cash on RCP-UNAPP' }),
    );
    const acknowledge = await screen.findByRole('dialog', { name: 'Acknowledge the exception' });
    await user.click(within(acknowledge).getByRole('button', { name: 'Acknowledge' }));
    await waitFor(() =>
      expect(section('Exceptions on this receipt')).toHaveTextContent(
        /by CFO \/ MD · \d{1,2} \w{3} 2026/,
      ),
    );
    expect(section('Calculation')).toHaveTextContent(
      'Received P1,500.00 − applied P0.00 = unapplied P1,500.00',
    );
  });

  it('shows an applied receipt with its allocation for the Executive Viewer without edit controls, and an unknown receipt as not found', async () => {
    const user = userEvent.setup();
    const app = renderApp('/receipts');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Viewing as' }),
      'Executive Viewer',
    );
    await user.click(await screen.findByRole('link', { name: 'Receipts' }));
    await user.click(await screen.findByRole('link', { name: 'RCP-001' }));

    expect(await screen.findByRole('heading', { name: 'Calculation' })).toBeInTheDocument();
    expect(section('Calculation')).toHaveTextContent(
      'Received P6,000.00 − applied P6,000.00 = unapplied P0.00',
    );
    expect(tableRows('Allocations from this receipt')).toEqual([
      ['ALLOC-001', 'INV-001', '20 Sep 2026', 'P6,000.00', 'P4,000.00'],
    ]);
    expect(screen.getByRole('link', { name: 'INV-001' })).toHaveAttribute(
      'href',
      '/invoices/INV-001',
    );
    expect(screen.getByText('No exceptions on this receipt')).toBeInTheDocument();
    expect(await screen.findByText('No recovery actions on this receipt')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Create recovery action|Acknowledge/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText('The Executive Viewer reads the collections and has no edit controls.'),
    ).not.toHaveLength(0);

    app.unmount();
    renderApp('/receipts/RCP-NOPE');
    expect(await screen.findByText('Receipt RCP-NOPE was not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to receipts' })).toHaveAttribute(
      'href',
      '/receipts',
    );
  });
});
