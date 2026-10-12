import { addDays, type Edition, type IsoDate } from '@conatlas/core';

/**
 * The all-day range for an edition as iCalendar wants it: DTEND is the day *after* the last
 * day (RFC 5545 §3.6.1). Undefined when the organizer hasn't announced dates.
 */
export function allDayRange(
  edition: Pick<Edition, 'start_date' | 'end_date'>,
): { start: IsoDate; endExclusive: IsoDate } | undefined {
  if (!edition.start_date || !edition.end_date) return undefined;
  return { start: edition.start_date, endExclusive: addDays(edition.end_date, 1) };
}
