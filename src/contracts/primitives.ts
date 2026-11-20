/**
 * Field types shared by every entity. A failed check carries a `fix` in its issue params, so a quarantine entry can
 * tell the user what to change (the spec asks for row, field, problem and resolution).
 */
import { z } from 'zod';

import { CURRENCY, isMoney } from './money.js';
import { GABORONE_OFFSET, isRealDate } from './time.js';

export const ISSUE_FIX = 'fix';

function fail(problem: string, fix: string) {
  return { error: problem, params: { [ISSUE_FIX]: fix } };
}

export const Id = z
  .string()
  .refine((value) => value.trim() !== '' && value === value.trim(), fail('is empty or has spaces around it', 'Use the internal identifier exactly as exported, without spaces.'));

export const Text = z
  .string()
  .refine((value) => value.trim() !== '', fail('is empty', 'Fill in the value.'));

export const DateOnly = z
  .string()
  .refine(isRealDate, fail('is not a calendar date in YYYY-MM-DD form', 'Write the date as YYYY-MM-DD, for example 2026-10-21.'));

const INSTANT = new RegExp(`^(\\d{4}-\\d{2}-\\d{2})T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?\\${GABORONE_OFFSET}$`);

/** A date, or a time in Africa/Gaborone (`2026-10-21T08:00:00+02:00`). Seeded events are dates. */
export const Moment = z.string().refine(
  (value) => {
    const instant = INSTANT.exec(value);
    return instant === null ? isRealDate(value) : isRealDate(instant[1] ?? '');
  },
  fail(
    `is not a date (YYYY-MM-DD) or a time with the ${GABORONE_OFFSET} offset`,
    `Write YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS${GABORONE_OFFSET}; every time is Africa/Gaborone.`,
  ),
);

export const Instant = z.string().refine(
  (value) => INSTANT.test(value) && isRealDate(value.slice(0, 10)),
  fail(`is not a time with the ${GABORONE_OFFSET} offset`, `Write YYYY-MM-DDTHH:MM:SS${GABORONE_OFFSET}.`),
);

export const Money = z
  .string()
  .refine(isMoney, fail('is not a non-negative amount with 2 decimals', 'Write the amount as digits with 2 decimals, for example 1500.00, with no currency sign or minus.'));

export const Currency = z.literal(CURRENCY, fail(`must be ${CURRENCY}; only one currency is supported`, `Use ${CURRENCY}.`));

export const TenantId = Id;
