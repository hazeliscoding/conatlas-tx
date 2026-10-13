import type { Edition } from '@conatlas/core';
import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import { calendar, editionEvent, googleCalendarUrl, type EventDetails } from '../src/index.ts';

// Fictional record: these tests exercise formatting, not published facts.
function edition(patch: Partial<Edition> = {}): Edition {
  return {
    id: 'example-con-2027',
    series: 'example-con',
    edition: '2027',
    slug: 'example-con-2027',
    status: 'confirmed',
    start_date: '2027-08-06',
    end_date: '2027-08-08',
    venue: { name: 'Example Hall', address: '100 Main St, Round Rock, TX 78664' },
    city: 'Round Rock',
    region: 'central',
    timezone: 'America/Chicago',
    url: 'https://example.com/con',
    evidence: [{ source: 'example-con-site', facts: ['dates'], checked_at: '2026-10-11' }],
    last_verified_at: '2026-10-11',
    updated_at: '2026-10-11',
    revision: 3,
    ...patch,
  };
}

const details: EventDetails = {
  summary: 'Example Con 2027',
  pageUrl: 'https://conatlas.example/conventions/example-con-2027/',
};

/** Parse a whole calendar with ical.js and return it and its events. */
function parse(ics: string) {
  const vcalendar = new ICAL.Component(ICAL.parse(ics));
  return { vcalendar, events: vcalendar.getAllSubcomponents('vevent') };
}

function onlyEvent(e: Edition, d: EventDetails = details) {
  const event = editionEvent(e, d);
  expect(event).toBeDefined();
  const { events } = parse(calendar('Test', [event!]));
  expect(events).toHaveLength(1);
  return events[0]!;
}

const value = (event: ICAL.Component, name: string) => event.getFirstPropertyValue(name);

describe('editionEvent', () => {
  it('writes a confirmed all-day event with an exclusive end', () => {
    const event = onlyEvent(edition());
    expect(value(event, 'uid')).toBe('example-con-2027@conatlas-tx');
    expect(value(event, 'sequence')).toBe(3);
    expect(String(value(event, 'dtstamp'))).toBe('2026-10-11T00:00:00Z');
    const start = value(event, 'dtstart') as ICAL.Time;
    const end = value(event, 'dtend') as ICAL.Time;
    expect([start.isDate, start.toString()]).toEqual([true, '2027-08-06']);
    expect([end.isDate, end.toString()]).toEqual([true, '2027-08-09']);
    expect(value(event, 'summary')).toBe('Example Con 2027');
    expect(value(event, 'status')).toBe('CONFIRMED');
    expect(value(event, 'location')).toBe('Example Hall, 100 Main St, Round Rock, TX 78664');
    expect(value(event, 'url')).toBe('https://example.com/con');
    expect(value(event, 'description')).toBe(
      'Official site: https://example.com/con\n' +
        'Dates, venue and sources: https://conatlas.example/conventions/example-con-2027/',
    );
  });

  it('round-trips commas, semicolons, backslashes and newlines', () => {
    const summary = 'Con, the; Sequel \\ part 2\nNight';
    const venueName = 'Hall A; B, C \\ D';
    const note = 'Moved, see; notes\\here\r\nand here';
    const url = 'https://example.com/con?a=1;b=2,3';
    const e = edition({ venue: { name: venueName }, status_note: note, url });
    const d = { ...details, summary };
    const event = onlyEvent(e, d);
    expect(value(event, 'summary')).toBe(summary);
    expect(value(event, 'location')).toBe(`${venueName}, Round Rock, TX`);
    expect(String(value(event, 'description')).split('\n').slice(0, 2)).toEqual([
      'Moved, see; notes\\here',
      'and here',
    ]);
    expect(value(event, 'url')).toBe(url);
    // ical.js also accepts unescaped commas, semicolons and lone backslashes, so check the raw text.
    const raw = editionEvent(e, d);
    expect(raw).toContain('SUMMARY:Con\\, the\\; Sequel \\\\ part 2\\nNight\r\n');
    expect(raw).toContain('LOCATION:Hall A\\; B\\, C \\\\ D\\, Round Rock\\, TX\r\n');
    expect(raw).toContain(`URL:${url}\r\n`);
  });

  it.each([
    ['cancelled', 'Cancelled: '],
    ['postponed', 'Postponed: '],
  ] as const)('marks a %s edition', (status, prefix) => {
    const event = onlyEvent(edition({ status, status_note: 'Organizer announcement.' }));
    expect(value(event, 'summary')).toBe(`${prefix}Example Con 2027`);
    expect(value(event, 'status')).toBe('CANCELLED');
    expect(String(value(event, 'description'))).toMatch(/^Organizer announcement\.\n/);
  });

  it('falls back to the city when there is no venue', () => {
    expect(value(onlyEvent(edition({ venue: undefined })), 'location')).toBe('Round Rock, TX');
  });

  it('skips editions without announced dates', () => {
    const tba = edition({ status: 'dates_tba', start_date: undefined, end_date: undefined });
    expect(editionEvent(tba, details)).toBeUndefined();
    expect(googleCalendarUrl(tba, details)).toBeUndefined();
  });

  it('folds a long multi-byte summary without breaking characters', () => {
    const summary = 'Café Kawaii ✨🎌 Matsuri Señorita Cosplay Ñ '.repeat(6).trim();
    const event = editionEvent(edition(), { ...details, summary })!;
    const physical = event.split('\r\n');
    expect(physical.filter((l) => l.startsWith(' ')).length).toBeGreaterThan(3);
    // A surrogate pair split across lines would leave a lone surrogate on each side.
    for (const l of physical) expect(l).not.toMatch(/\p{Cs}/u);
    expect(value(onlyEvent(edition(), { ...details, summary }), 'summary')).toBe(summary);
  });
});

describe('calendar', () => {
  it('is a valid calendar with no events', () => {
    const { vcalendar, events } = parse(calendar('Texas, all; upcoming \\ soon', []));
    expect(events).toEqual([]);
    expect(value(vcalendar, 'version')).toBe('2.0');
    // ical.js doesn't know X-WR-CALNAME is TEXT, so it hands back the escaped text as written.
    expect(value(vcalendar, 'x-wr-calname')).toBe('Texas\\, all\\; upcoming \\\\ soon');
  });

  it('keeps every line within 75 octets and CRLF-terminated', () => {
    const long = { ...details, summary: 'Ünïcödé 🎌 '.repeat(20) };
    const events = [
      editionEvent(edition({ status_note: 'x'.repeat(200) }), long)!,
      editionEvent(edition({ id: 'example-con-2028', venue: undefined }), details)!,
    ];
    const ics = calendar('Texas anime conventions', events);
    expect(ics.endsWith('\r\n')).toBe(true);
    const physical = ics.slice(0, -2).split('\r\n');
    for (const l of physical) {
      expect(l).not.toMatch(/[\r\n]/);
      expect(Buffer.byteLength(l)).toBeLessThanOrEqual(75);
    }
    expect(parse(ics).events.map((e) => value(e, 'uid'))).toEqual([
      'example-con-2027@conatlas-tx',
      'example-con-2028@conatlas-tx',
    ]);
  });
});

describe('googleCalendarUrl', () => {
  it('links to a prefilled all-day event', () => {
    const url = new URL(googleCalendarUrl(edition({ status: 'postponed' }), details)!);
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      action: 'TEMPLATE',
      text: 'Postponed: Example Con 2027',
      dates: '20270806/20270809',
      location: 'Example Hall, 100 Main St, Round Rock, TX 78664',
      details:
        'Official site: https://example.com/con\n' +
        'Dates, venue and sources: https://conatlas.example/conventions/example-con-2027/',
    });
  });
});
