/** Calendar-day arithmetic on `YYYY-MM-DD` dates. A date is a day in Africa/Gaborone; no time zone math is needed. */
import { DEFAULT_PERIOD, dateOf } from '../contracts/index.js';
import type { PeriodOption, PeriodWindow } from '../contracts/index.js';

const DAY_MS = 86_400_000;

export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${dateOf(date)}T00:00:00Z`) / DAY_MS);
}

export function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Calendar days from `earlier` to `later`; negative when `later` comes first. */
export function daysBetween(earlier: string, later: string): number {
  return dayNumber(later) - dayNumber(earlier);
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function firstOfMonth(date: string): string {
  return `${monthOf(date)}-01`;
}

export function lastOfMonth(date: string): string {
  const [year, month] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** The month `count` months before the month of `date` (0 is the same month), as its first day. */
export function monthsBefore(date: string, count: number): string {
  const [year, month] = [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
  return new Date(Date.UTC(year, month - 1 - count, 1)).toISOString().slice(0, 10);
}

/** True when `date` falls in the window, both ends included. */
export function inWindow(date: string, window: { readonly from: string; readonly to: string }): boolean {
  const day = dateOf(date);
  return day >= window.from && day <= window.to;
}

/**
 * The cash window of a period option, ending on the as-of date: the as-of date's calendar month so far (`month`),
 * the last 30 or 90 days including the as-of date, or the year so far.
 */
export function periodWindow(asOf: string, option: PeriodOption = DEFAULT_PERIOD): PeriodWindow {
  switch (option) {
    case 'month':
      return { option, from: firstOfMonth(asOf), to: asOf };
    case 'last-30':
      return { option, from: addDays(asOf, -29), to: asOf };
    case 'last-90':
      return { option, from: addDays(asOf, -89), to: asOf };
    case 'ytd':
      return { option, from: `${asOf.slice(0, 4)}-01-01`, to: asOf };
  }
}
