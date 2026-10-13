import { describe, expect, it } from 'vitest';
import { calendarMonths, inMonth, monthWeeks } from '../src/lib/calendar.ts';

const ev = (id: string, start_date?: string, end_date = start_date) => ({
  id,
  start_date,
  end_date,
});

describe('monthWeeks', () => {
  it('lays out Sunday-first weeks covering the whole month', () => {
    const weeks = monthWeeks('2026-10', []);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]!.days[0]).toBe('2026-09-27');
    expect(weeks.at(-1)!.days[6]).toBe('2026-10-31');
  });

  it('spans multi-day events across columns and marks week breaks', () => {
    // Fri Jan 8 – Sun Jan 10, 2027; and an event running Sat Jan 30 – Mon Feb 1.
    const weeks = monthWeeks('2027-01', [
      ev('a', '2027-01-08', '2027-01-10'),
      ev('b', '2027-01-30', '2027-02-01'),
    ]);
    const a = weeks[1]!.segments.find((s) => s.item.id === 'a')!;
    expect([a.start, a.end, a.continuesBefore, a.continuesAfter]).toEqual([5, 6, false, true]);
    const aNext = weeks[2]!.segments.find((s) => s.item.id === 'a')!;
    expect([aNext.start, aNext.end, aNext.continuesBefore]).toEqual([0, 0, true]);
    const b = weeks[4]!.segments.find((s) => s.item.id === 'b')!;
    expect([b.start, b.end, b.continuesAfter]).toEqual([6, 6, true]);
  });

  it('stacks overlapping events into separate lanes and skips undated ones', () => {
    const weeks = monthWeeks('2027-02', [
      ev('x', '2027-02-12', '2027-02-14'),
      ev('y', '2027-02-12', '2027-02-14'),
      ev('z', '2027-02-13'),
      ev('tba'),
    ]);
    const lanes = Object.fromEntries(weeks[1]!.segments.map((s) => [s.item.id, s.lane]));
    expect(lanes).toEqual({ x: 0, y: 1, z: 2 });
    expect(weeks.flatMap((w) => w.segments).some((s) => s.item.id === 'tba')).toBe(false);
  });
});

describe('calendarMonths', () => {
  it('runs from the current month to the last month with an event', () => {
    expect(calendarMonths('2026-10-12', [ev('a', '2026-12-30', '2027-01-02')])).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
    expect(calendarMonths('2026-10-12', [])).toEqual(['2026-10']);
  });
});

describe('inMonth', () => {
  it('keeps dated items that touch the month, including ones crossing its edges', () => {
    const items = [
      ev('inside', '2027-01-08', '2027-01-10'),
      ev('from-december', '2026-12-31', '2027-01-02'),
      ev('into-february', '2027-01-30', '2027-02-01'),
      ev('february', '2027-02-05', '2027-02-07'),
      ev('undated'),
      { ...ev('stand-in', '2027-01-15'), awaitingNext: true },
    ];
    expect(inMonth(items, '2027-01').map((e) => e.id)).toEqual([
      'inside',
      'from-december',
      'into-february',
    ]);
  });
});
