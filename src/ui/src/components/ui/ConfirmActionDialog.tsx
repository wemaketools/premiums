/**
 * ConfirmActionDialog: every consequential action (assign, close, reset…) is confirmed in a dialog that states WHO
 * is acting (the active persona view), the SCOPE and the RESULT.
 *
 * The confirm button is disabled while the request runs. A failure is shown inside the dialog, with field errors
 * bound to the reason input.
 */
import { useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { usePersona } from '../../app/hooks';
import type { ApiError } from '../../api/client';
import { t } from '../../lib/i18n';
import { Banner } from './Banner';
import { Button } from './Button';
import { DetailList } from './DetailList';
import { Dialog } from './Dialog';
import { describeError } from './errors';
import { formErrors } from './formErrors';
import { Checkbox, FormErrorSummary, TextArea } from './FormFields';

export interface ConfirmActionDialogProps {
  readonly open: boolean;
  readonly title: ReactNode;
  /** What the action covers, for example "CLM-0003, Motor, Assessment". */
  readonly scope: ReactNode;
  /** What happens, for example "The task is closed and the closure is logged with your name and the time." */
  readonly consequence: ReactNode;
  readonly confirmLabel: string;
  readonly onConfirm: (input: { readonly reason: string }) => void | Promise<void>;
  readonly onCancel: () => void;
  /** Destructive actions use the danger button. */
  readonly tone?: 'primary' | 'danger';
  /** Asks for a reason (required when `reasonRequired`). The contract field name is `reason`. */
  readonly reason?: { readonly label: string; readonly required: boolean; readonly hint?: string };
  /** A statement the user must tick before confirming (for example an irrevocable action). */
  readonly acknowledgement?: string;
  readonly pending?: boolean;
  /** Keeps Confirm off until the dialog's own fields (given as `children`) are filled. */
  readonly confirmDisabled?: boolean;
  readonly error?: ApiError | null;
  /** Extra content, such as a readiness summary. */
  readonly children?: ReactNode;
  /** Dialog width; form-heavy confirmations use `lg` (default `md`). */
  readonly size?: 'sm' | 'md' | 'lg';
  /** Where focus goes when the dialog closes, for example the result banner (see Dialog). */
  readonly returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * The form state (reason, acknowledgement) lives in `OpenConfirmActionDialog`, which exists only while the dialog is
 * open, so every opening starts empty.
 */
export function ConfirmActionDialog(props: ConfirmActionDialogProps) {
  return props.open ? <OpenConfirmActionDialog {...props} /> : null;
}

function OpenConfirmActionDialog({
  title,
  scope,
  consequence,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'primary',
  reason,
  acknowledgement,
  pending = false,
  confirmDisabled = false,
  error = null,
  children,
  size = 'md',
  returnFocusRef,
}: ConfirmActionDialogProps) {
  const persona = usePersona();
  const [reasonText, setReasonText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const errors = formErrors(error, ['reason']);
  const reasonMissing = reason?.required === true && reasonText.trim() === '';
  const blocked =
    reasonMissing || confirmDisabled || (acknowledgement !== undefined && !acknowledged);

  return (
    <Dialog
      open
      size={size}
      title={title}
      onClose={onCancel}
      dismissible={!pending}
      returnFocusRef={returnFocusRef}
      footer={
        <>
          <Button onClick={onCancel} disabled={pending}>
            {t('ui.action.cancel')}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={pending}
            disabled={blocked}
            onClick={() => {
              void onConfirm({ reason: reasonText.trim() });
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="prm-consequence" data-testid="confirm-context">
        <DetailList
          items={[
            { key: 'actor', label: t('ui.confirm.actor'), value: t(`shell.persona.${persona}`) },
            { key: 'scope', label: t('ui.confirm.scope'), value: scope },
            { key: 'result', label: t('ui.confirm.result'), value: consequence },
          ]}
          stacked
        />
      </div>
      {children}
      {reason !== undefined && (
        <TextArea
          label={reason.label}
          hint={reason.hint}
          required={reason.required}
          value={reasonText}
          onChange={setReasonText}
          error={errors.forField('reason')}
          rows={3}
        />
      )}
      {acknowledgement !== undefined && (
        <Checkbox label={acknowledgement} checked={acknowledged} onChange={setAcknowledged} />
      )}
      {error !== null && error.fieldErrors.length === 0 && (
        <Banner tone="error" title={error.title}>
          <p>{describeError(error)}</p>
          {error.correlationId !== null && (
            <p className="prm-mono">{t('ui.error.correlation', { id: error.correlationId })}</p>
          )}
        </Banner>
      )}
      {error !== null && error.fieldErrors.length > 0 && (
        <FormErrorSummary title={error.title} errors={errors.other} />
      )}
    </Dialog>
  );
}
