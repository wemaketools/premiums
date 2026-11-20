import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import '../zodConfig';
import {
  EMPTY_VALUE,
  formatAge,
  formatBytes,
  formatCalendarDate,
  formatCount,
  formatDateTime,
  formatInstantDate,
  formatOfficialTime,
  formatTimeRemaining,
  initialsOf,
} from './format';
import { instantToWallTime, wallTimeToInstant } from './zonedTime';

describe('display formatting', () => {
  const now = Date.parse('2026-09-29T12:00:00Z');

  it('formats counts, official times in their own zone, ages, time left, byte sizes and initials', () => {
    expect(formatCount(12500)).toBe('12,500');
    expect(formatCount(null)).toBe(EMPTY_VALUE);

    expect(formatOfficialTime('2026-10-14T10:00:00Z', 'Africa/Gaborone')).toBe(
      '14 Oct 2026, 12:00 (UTC+02:00) Africa/Gaborone',
    );
    expect(formatOfficialTime('2026-10-14T10:00:00Z', 'Asia/Kolkata')).toBe(
      '14 Oct 2026, 15:30 (UTC+05:30) Asia/Kolkata',
    );
    expect(formatOfficialTime('2026-01-01T00:00:00Z', 'UTC')).toBe(
      '1 Jan 2026, 00:00 (UTC+00:00) UTC',
    );
    expect(formatDateTime('2026-09-29T22:30:00Z', 'Africa/Gaborone')).toBe('30 Sep 2026, 00:30');
    expect(formatInstantDate('2026-09-29T22:30:00Z', 'Africa/Gaborone')).toBe('30 Sep 2026');
    expect(formatDateTime(null, 'UTC')).toBe(EMPTY_VALUE);
    expect(formatCalendarDate('2026-10-01')).toBe('1 Oct 2026');

    expect(formatAge('2026-08-22T12:00:00Z', now)).toBe('38d');
    expect(formatAge('2026-09-29T11:48:00Z', now)).toBe('12m');
    expect(formatAge('2026-09-29T11:59:30Z', now)).toBe('now');
    expect(formatTimeRemaining('2026-10-01T16:00:00Z', now)).toBe('2 d 4 h left');
    expect(formatTimeRemaining('2026-09-27T12:00:00Z', now)).toBe('passed 2 d 0 h ago');
    expect(formatTimeRemaining('2026-09-29T12:00:30Z', now)).toBe('now');

    expect(formatBytes(12)).toBe('12 B');
    expect(formatBytes(52_428_800)).toBe('50 MB');
    expect(formatBytes(1_048_575)).toBe('1 MB');
    expect(initialsOf('Kagiso Dube')).toBe('KD');
    expect(initialsOf('Sam')).toBe('S');
  });

  it('converts wall times entered in a zone to UTC instants and back, daylight saving included', () => {
    expect(wallTimeToInstant({ date: '2026-10-14', time: '12:00' }, 'Africa/Gaborone')).toBe(
      '2026-10-14T10:00:00Z',
    );
    expect(wallTimeToInstant({ date: '2026-07-01', time: '09:00' }, 'America/New_York')).toBe(
      '2026-07-01T13:00:00Z',
    );
    expect(wallTimeToInstant({ date: '2026-10-14', time: '' }, 'UTC')).toBeNull();
    const wall = instantToWallTime('2026-10-14T10:00:00Z', 'Africa/Gaborone');
    expect(wall).toEqual({ date: '2026-10-14', time: '12:00' });
    expect(wallTimeToInstant(wall, 'Africa/Gaborone')).toBe('2026-10-14T10:00:00Z');
  });

  it('runs Zod without its new Function fast path, which the CSP forbids', () => {
    expect(z.config().jitless).toBe(true);
    expect(z.object({ a: z.string() }).parse({ a: 'x' })).toEqual({ a: 'x' });
  });
});
