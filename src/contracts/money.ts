/**
 * Money is BWP, a non-negative decimal string with exactly 2 decimals ("14000.00"), and every calculation goes
 * through decimal.js: a JS float never touches an amount.
 */
import { Decimal } from 'decimal.js';

export const CURRENCY = 'BWP';

const AMOUNT = /^\d+(\.\d{1,2})?$/;
const CANONICAL = /^\d+\.\d{2}$/;

/** Pads "14000" and "14000.5" to 2 decimals. Anything that is not a plain non-negative amount comes back unchanged. */
export function normalizeMoney(text: string): string {
  return AMOUNT.test(text) ? new Decimal(text).toFixed(2) : text;
}

export function isMoney(text: string): boolean {
  return CANONICAL.test(text);
}

export function sumMoney(amounts: readonly string[]): string {
  return amounts.reduce((total, amount) => total.plus(amount), new Decimal(0)).toFixed(2);
}

export function addMoney(a: string, b: string): string {
  return new Decimal(a).plus(b).toFixed(2);
}

export function subtractMoney(a: string, b: string): string {
  return new Decimal(a).minus(b).toFixed(2);
}

export function compareMoney(a: string, b: string): number {
  return new Decimal(a).comparedTo(b);
}

/** `12345.67` → `P12,345.67`; a negative amount reads `-P1,000.00`. The currency is always BWP. */
export function formatMoney(amount: string): string {
  const fixed = new Decimal(amount).toFixed(2);
  const negative = fixed.startsWith('-');
  const [whole = '0', cents = '00'] = (negative ? fixed.slice(1) : fixed).split('.');
  return `${negative ? '-' : ''}P${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
}
