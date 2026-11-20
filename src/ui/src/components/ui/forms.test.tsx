import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import { formErrors } from './formErrors';
import {
  Checkbox,
  DateInput,
  DateTimeInput,
  FormErrorSummary,
  MoneyInput,
  MultiSelect,
  NumberInput,
  RadioGroup,
  Select,
  TextArea,
  TextField,
} from './FormFields';

interface FormValue {
  readonly title: string;
  readonly status: string;
  readonly mine: boolean;
  readonly lots: string[];
  readonly kind: string;
  readonly reserve: { amount: string; currency: string };
  readonly weight: string;
  readonly target: string;
  readonly deadline: string | null;
}

const INITIAL: FormValue = {
  title: '',
  status: '',
  mine: false,
  lots: [],
  kind: '',
  reserve: { amount: '', currency: 'BWP' },
  weight: '',
  target: '',
  deadline: null,
};

function Form({ onChange }: { readonly onChange: (value: FormValue) => void }) {
  const [value, setValue] = useState(INITIAL);
  const update = (patch: Partial<FormValue>): void => {
    const next = { ...value, ...patch };
    setValue(next);
    onChange(next);
  };
  return (
    <form>
      <TextField
        label="Title"
        value={value.title}
        onChange={(title) => update({ title })}
        required
        hint="Shown to handlers"
        error="A title is required."
      />
      <TextArea label="Summary" value="" onChange={() => undefined} />
      <Select
        label="Status"
        value={value.status}
        onChange={(status) => update({ status })}
        placeholder="All statuses"
        options={[{ value: 'open', label: 'Open' }]}
      />
      <Select
        label="Owner"
        value=""
        onChange={() => undefined}
        loading
        placeholder="Choose an owner"
        options={[]}
      />
      <Checkbox label="My items only" checked={value.mine} onChange={(mine) => update({ mine })} />
      <MultiSelect
        label="Lots"
        value={value.lots}
        onChange={(lots) => update({ lots })}
        options={[
          { value: '1', label: 'Lot 1' },
          { value: '2', label: 'Lot 2' },
        ]}
      />
      <RadioGroup
        label="Claim type"
        required
        value={value.kind}
        onChange={(kind) => update({ kind })}
        options={[
          { value: 'motor', label: 'Motor' },
          { value: 'property', label: 'Property' },
        ]}
      />
      <MoneyInput
        label="Reserve"
        value={value.reserve}
        onChange={(reserve) => update({ reserve })}
        currencies={['BWP', 'USD']}
      />
      <NumberInput
        label="Weight"
        value={value.weight}
        onChange={(weight) => update({ weight })}
        places={2}
        suffix="%"
      />
      <DateInput
        label="Target date"
        value={value.target}
        onChange={(target) => update({ target })}
      />
      <DateTimeInput
        label="Deadline"
        value={value.deadline}
        onChange={(deadline) => update({ deadline })}
        timeZone="Africa/Gaborone"
      />
    </form>
  );
}

describe('form fields', () => {
  it('label and describe their inputs and hand back strings: decimal money and numbers, calendar dates and UTC instants from the zone', async () => {
    let latest = INITIAL;
    render(<Form onChange={(value) => (latest = value)} />);

    const title = screen.getByLabelText(/Title/);
    expect(title).toBeRequired();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Shown to handlers A title is required.');
    const radiogroup = screen.getByRole('radiogroup', { name: /Claim type/ });
    expect(radiogroup).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('group', { name: /Claim type/ })).not.toHaveAttribute('aria-required');

    // Options still on their way: the select is disabled and says so, instead of offering an empty list.
    const owner = screen.getByLabelText('Owner');
    expect(owner).toBeDisabled();
    expect(owner).toHaveDisplayValue('Loading…');

    await userEvent.type(title, 'Roof');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'open');
    await userEvent.click(screen.getByLabelText('My items only'));
    await userEvent.click(screen.getByLabelText('Lot 2'));
    await userEvent.click(screen.getByLabelText('Property'));
    await userEvent.type(screen.getByLabelText('Reserve'), '1,500,000.505x');
    await userEvent.selectOptions(screen.getByLabelText('Currency'), 'USD');
    await userEvent.type(screen.getByLabelText('Weight'), '12.345');
    await userEvent.type(screen.getByLabelText('Target date'), '2026-10-14');
    expect(screen.getByText('(UTC+02:00) Africa/Gaborone')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Date'), '2026-10-14');
    await userEvent.type(screen.getByLabelText('Time'), '12:00');

    expect(latest).toEqual({
      title: 'Roof',
      status: 'open',
      mine: true,
      lots: ['2'],
      kind: 'property',
      reserve: { amount: '1500000.50', currency: 'USD' },
      weight: '12.34',
      target: '2026-10-14',
      deadline: '2026-10-14T10:00:00Z',
    });
  });

  it('bind problem+json field errors to inputs by path and list the unmatched ones in the summary', () => {
    const error = new ApiError({
      kind: 'validation',
      status: 422,
      title: 'Validation failed',
      endpointId: 'x',
      fieldErrors: [
        { field: 'amount.currency', code: 'INVALID_CURRENCY', message: 'Use BWP.' },
        { field: 'title', code: 'TITLE_REQUIRED', message: 'A title is required.' },
        { field: 'lots.0.value', code: 'INVALID', message: 'Lot value is wrong.' },
      ],
    });

    const errors = formErrors(error, ['title', 'amount']);
    render(<FormErrorSummary title="Validation failed" errors={errors.other} />);

    expect(errors.forField('amount')).toBe('Use BWP.');
    expect(errors.forField('title')).toBe('A title is required.');
    expect(errors.hasFieldErrors).toBe(true);
    expect(formErrors(new Error('x'), ['title']).hasFieldErrors).toBe(false);
    expect(screen.getByRole('alert')).toHaveTextContent('lots.0.value: Lot value is wrong.');
  });
});
