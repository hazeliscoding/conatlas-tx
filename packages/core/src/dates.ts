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

/** Today's calendar date in a given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}
