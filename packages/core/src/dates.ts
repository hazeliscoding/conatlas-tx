// Calendar dates are `YYYY-MM-DD` strings. UTC is used only as arithmetic scratch space here,
// never to interpret a date, so a date can't drift a day in any time zone.

export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(date: IsoDate): Date {
  const [, y, m, d] = ISO_DATE.exec(date) ?? [];
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function fromUtc(utc: Date): IsoDate {
  return utc.toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && fromUtc(toUtc(value)) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const utc = toUtc(date);
  utc.setUTCDate(utc.getUTCDate() + days);
  return fromUtc(utc);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Abbreviated weekday, e.g. "Fri". */
export function weekday(date: IsoDate): string {
  return WEEKDAYS[toUtc(date).getUTCDay()]!;
}

/** Days from start to end, inclusive. */
export function dayCount(start: IsoDate, end: IsoDate): number {
  return Math.round((toUtc(end).getTime() - toUtc(start).getTime()) / 86_400_000) + 1;
}

/** "Oct 31, 2026", "Dec 4–6, 2026", "Jan 30 – Feb 1, 2027", "Dec 31, 2026 – Jan 2, 2027". */
export function formatDateRange(start: IsoDate, end: IsoDate, { year = true } = {}): string {
  const [sy, sm, sd] = start.split('-').map(Number) as [number, number, number];
  const [ey, em, ed] = end.split('-').map(Number) as [number, number, number];
  const y = year ? `, ${ey}` : '';
  if (start === end) return `${MONTHS[sm - 1]} ${sd}${y}`;
  if (sy === ey && sm === em) return `${MONTHS[sm - 1]} ${sd}–${ed}${y}`;
  const startYear = sy !== ey && year ? `, ${sy}` : '';
  return `${MONTHS[sm - 1]} ${sd}${startYear} – ${MONTHS[em - 1]} ${ed}${y}`;
}

/** Today's calendar date in a given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}
