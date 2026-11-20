import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import { signedInSession } from '../../test/fixtures';
import { renderWithProviders } from '../../test/render';
import { ConfirmActionDialog } from './ConfirmActionDialog';
import { Dialog } from './Dialog';

describe('dialogs', () => {
  it('is a labelled modal; focus returns to the opener, or to the main region when the opener is gone, or to the given target', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const [removed, setRemoved] = useState(false);
      const [useTarget, setUseTarget] = useState(false);
      const result = useRef<HTMLParagraphElement>(null);
      return (
        <main id="prm-main" tabIndex={-1}>
          {!removed && (
            <button type="button" onClick={() => setOpen(true)}>
              open
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setUseTarget(true);
              setOpen(true);
            }}
          >
            open with target
          </button>
          <p ref={result} tabIndex={-1}>
            result
          </p>
          <Dialog
            open={open}
            title="Confirm"
            onClose={() => setOpen(false)}
            returnFocusRef={useTarget ? result : undefined}
          >
            <input aria-label="first field" />
            <button
              type="button"
              onClick={() => {
                setRemoved(true);
                setOpen(false);
              }}
            >
              remove opener
            </button>
          </Dialog>
        </main>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('first field')).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'remove opener' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'open with target' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('result')).toHaveFocus();
  });

  it('cannot be dismissed while busy', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Busy" onClose={onClose} dismissible={false}>
        <p>working</p>
      </Dialog>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('confirms an action: names the acting persona, needs the reason, shows a failure inside, and starts empty on each opening', async () => {
    const onConfirm = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen((current) => !current)}>
            toggle
          </button>
          <ConfirmActionDialog
            open={open}
            title="Close task"
            scope="INV-003 Payment reminder"
            consequence="The task is closed and the closure is logged with your name and the time."
            confirmLabel="Close task"
            reason={{ label: 'Reason', required: true }}
            acknowledgement="I have read the evidence."
            error={
              new ApiError({
                kind: 'conflict',
                status: 409,
                title: 'Already decided',
                endpointId: 'x',
              })
            }
            onConfirm={onConfirm}
            onCancel={() => setOpen(false)}
          />
        </>
      );
    }
    renderWithProviders(<Harness />, {
      state: { session: signedInSession({ persona: 'credit-control' }) },
    });
    const context = screen.getByTestId('confirm-context');
    expect(context).toHaveTextContent('Finance / Credit Control');
    expect(context).toHaveTextContent('INV-003 Payment reminder');
    expect(screen.getByRole('alert')).toHaveTextContent('Already decided');
    const confirm = screen.getByRole('button', { name: 'Close task' });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/Reason/), 'Customer reached');
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ reason: 'Customer reached' });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByLabelText(/Reason/)).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
