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

export interface EventDetails {
  /** Title calendar apps show, e.g. "Otaku Odyssey 2027". */
  summary: string;
  /** Absolute URL of the edition's ConAtlas page. */
  pageUrl: string;
}

const encoder = new TextEncoder();

/** "2026-11-13" → "20261113" (iCalendar's basic date format). */
const basic = (date: IsoDate) => date.replaceAll('-', '');

/** TEXT value escaping, RFC 5545 §3.3.11. */
const escape = (text: string) => text.replace(/[\\;,]/g, '\\$&').replace(/\r\n?|\n/g, '\\n');

/** One content line, folded at 75 octets without splitting a UTF-8 code point (§3.1). */
function line(content: string): string {
  let out = '';
  let octets = 0;
  for (const char of content) {
    const size = encoder.encode(char).length;
    if (octets + size > 75) {
      out += '\r\n ';
      octets = 1;
    }
    out += char;
    octets += size;
  }
  return `${out}\r\n`;
}

/** The plain-text facts both the .ics event and the Google link carry. */
function eventText(edition: Edition, details: EventDetails) {
  const range = allDayRange(edition);
  if (!range) return undefined;
  const prefix =
    edition.status === 'cancelled'
      ? 'Cancelled: '
      : edition.status === 'postponed'
        ? 'Postponed: '
        : '';
  const { venue, city } = edition;
  const place = venue?.address ?? `${city}, TX`;
  return {
    range,
    summary: prefix + details.summary,
    location: venue ? `${venue.name}, ${place}` : place,
    description: [
      edition.status_note,
      edition.min_age && `Ages ${edition.min_age} and up`,
      `Official site: ${edition.url}`,
      `Dates, venue and sources: ${details.pageUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/** One VEVENT for an edition with announced dates, CRLF line endings and ending in CRLF; undefined when dates aren't announced. */
export function editionEvent(edition: Edition, details: EventDetails): string | undefined {
  const text = eventText(edition, details);
  if (!text) return undefined;
  const off = edition.status === 'cancelled' || edition.status === 'postponed';
  return [
    'BEGIN:VEVENT',
    // Stable forever and host-free, so calendar apps update the event instead of duplicating it.
    `UID:${edition.id}@conatlas-tx`,
    `DTSTAMP:${basic(edition.updated_at)}T000000Z`,
    `SEQUENCE:${edition.revision}`,
    `DTSTART;VALUE=DATE:${basic(text.range.start)}`,
    `DTEND;VALUE=DATE:${basic(text.range.endExclusive)}`,
    `SUMMARY:${escape(text.summary)}`,
    `STATUS:${off ? 'CANCELLED' : 'CONFIRMED'}`,
    `LOCATION:${escape(text.location)}`,
    `URL:${edition.url}`,
    `DESCRIPTION:${escape(text.description)}`,
    'END:VEVENT',
  ]
    .map(line)
    .join('');
}

/**
 * A complete VCALENDAR around VEVENT blocks from editionEvent. RFC 5545 requires at least one
 * event, so only publish it with some; with none it is a template to add events to.
 */
export function calendar(name: string, events: string[]): string {
  const head = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ConAtlas TX//Texas anime conventions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(name)}`,
  ];
  return head.map(line).join('') + events.join('') + line('END:VCALENDAR');
}

/** Google Calendar "add event" link for an edition with announced dates; undefined otherwise. */
export function googleCalendarUrl(edition: Edition, details: EventDetails): string | undefined {
  const text = eventText(edition, details);
  if (!text) return undefined;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: text.summary,
    dates: `${basic(text.range.start)}/${basic(text.range.endExclusive)}`,
    location: text.location,
    details: text.description,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
