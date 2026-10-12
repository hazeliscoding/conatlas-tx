import { describe, expect, it } from 'vitest';
import { allDayRange } from '../src/index.ts';

describe('allDayRange', () => {
  it('makes DTEND exclusive for a three-day weekend', () => {
    expect(allDayRange({ start_date: '2026-11-13', end_date: '2026-11-15' })).toEqual({
      start: '2026-11-13',
      endExclusive: '2026-11-16',
    });
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(allDayRange({ start_date: '2026-10-30', end_date: '2026-10-31' })?.endExclusive).toBe(
      '2026-11-01',
    );
    expect(allDayRange({ start_date: '2026-12-31', end_date: '2026-12-31' })?.endExclusive).toBe(
      '2027-01-01',
    );
    expect(allDayRange({ start_date: '2028-02-27', end_date: '2028-02-28' })?.endExclusive).toBe(
      '2028-02-29',
    );
  });

  it('returns nothing when dates are not announced', () => {
    expect(allDayRange({})).toBeUndefined();
  });
});
