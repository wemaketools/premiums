import { afterEach } from 'vitest';

const pending: Array<() => void> = [];

afterEach(() => {
  while (pending.length > 0) pending.pop()?.();
});

export function restoreAfterEach(restore: () => void): void {
  pending.push(restore);
}
