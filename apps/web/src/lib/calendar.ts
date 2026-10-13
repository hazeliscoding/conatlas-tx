import { addDays, dayCount, weekday, type IsoDate } from '@conatlas/core';

/** A calendar month as `YYYY-MM`. */
export type Month = string;

interface Dated {
  start_date?: IsoDate;
  end_date?: IsoDate;
}

/** One event's bar within a week: columns 0 (Sunday) to 6 (Saturday). */
export interface Segment<T> {
  item: T;
  start: number;
  end: number;
  lane: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface Week<T> {
  days: IsoDate[];
  segments: Segment<T>[];
}

const SUNDAY_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const columnOf = (week: IsoDate, date: IsoDate) => dayCount(week, date) - 1;

/** Sunday-first weeks covering a month, with each dated item's bars stacked into lanes. */
export function monthWeeks<T extends Dated>(month: Month, items: T[]): Week<T>[] {
  const first = `${month}-01`;
  const last = addDays(`${nextMonth(month)}-01`, -1);
  const weeks: Week<T>[] = [];
  for (
    let start = addDays(first, -SUNDAY_FIRST.indexOf(weekday(first)));
    start <= last;
    start = addDays(start, 7)
  ) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const segments: Segment<T>[] = [];
    for (const item of items) {
      if (!item.start_date) continue;
      const end = item.end_date ?? item.start_date;
      if (end < days[0]! || item.start_date > days[6]!) continue;
      segments.push({
        item,
        start: Math.max(0, columnOf(start, item.start_date)),
        end: Math.min(6, columnOf(start, end)),
        lane: 0,
        continuesBefore: item.start_date < days[0]!,
        continuesAfter: end > days[6]!,
      });
    }
    // Earliest first, longer bars first on ties; each takes the lowest free lane.
    segments.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const lanes: Segment<T>[][] = [];
    for (const seg of segments) {
      seg.lane = lanes.findIndex((lane) =>
        lane.every((o) => seg.end < o.start || seg.start > o.end),
      );
      if (seg.lane === -1) seg.lane = lanes.length;
      (lanes[seg.lane] ??= []).push(seg);
    }
    weeks.push({ days, segments });
  }
  return weeks;
}

/** Months from today's through the last one any item touches. */
export function calendarMonths(today: IsoDate, items: Dated[]): Month[] {
  const lastDate = items.reduce((max, e) => {
    const end = e.end_date ?? e.start_date;
    return end && end > max ? end : max;
  }, today);
  const months: Month[] = [];
  for (let m = today.slice(0, 7); m <= lastDate.slice(0, 7); m = nextMonth(m)) months.push(m);
  return months;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "January 2027" for "2027-01". */
export function monthTitle(month: Month): string {
  return `${MONTH_NAMES[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
}

export function nextMonth(month: Month): Month {
  return addDays(`${month}-28`, 7).slice(0, 7);
}
