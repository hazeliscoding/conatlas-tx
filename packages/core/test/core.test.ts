import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EditionSchema,
  addDays,
  dayCount,
  formatDateRange,
  isIsoDate,
  todayIn,
  weekday,
  validateDataset,
  type Dataset,
  type Edition,
} from '../src/index.ts';
import { loadDataset } from '../src/load.ts';

const FIXTURES = fileURLToPath(new URL('./fixtures/data', import.meta.url));
const TODAY = '2026-10-11';

const loaded = loadDataset(FIXTURES);
const base = loaded.dataset;

/** Validates the fixture dataset with one edition replaced. */
function errorsFor(patch: Partial<Edition>, id = 'lone-star-anime-fest-2026'): string[] {
  const editions = base.editions.map((e) => (e.id === id ? { ...e, ...patch } : e));
  return validateDataset({ ...base, editions }, TODAY)
    .filter((i) => i.level === 'error')
    .map((i) => `${i.record}: ${i.message}`);
}

describe('dates', () => {
  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-1-5')).toBe(false);
    expect(isIsoDate('2026-10-11T00:00:00Z')).toBe(false);
  });

  it('adds days without time-zone drift', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08'); // US DST starts 2026-03-08
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02'); // and ends 2026-11-01
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it("reads today's date in Central and Mountain time", () => {
    const lateEveningCentral = new Date('2026-10-12T03:30:00Z');
    expect(todayIn('America/Chicago', lateEveningCentral)).toBe('2026-10-11');
    expect(todayIn('America/Denver', lateEveningCentral)).toBe('2026-10-11');
    expect(todayIn('UTC', lateEveningCentral)).toBe('2026-10-12');
  });

  it('formats date ranges the way the design writes them', () => {
    expect(formatDateRange('2026-10-31', '2026-10-31')).toBe('Oct 31, 2026');
    expect(formatDateRange('2026-12-04', '2026-12-06')).toBe('Dec 4–6, 2026');
    expect(formatDateRange('2027-01-30', '2027-02-01')).toBe('Jan 30 – Feb 1, 2027');
    expect(formatDateRange('2026-12-31', '2027-01-02')).toBe('Dec 31, 2026 – Jan 2, 2027');
    expect(formatDateRange('2026-12-04', '2026-12-06', { year: false })).toBe('Dec 4–6');
  });

  it('names weekdays and counts days without drift', () => {
    expect(weekday('2026-10-31')).toBe('Sat');
    expect(weekday('2026-03-08')).toBe('Sun');
    expect(dayCount('2026-12-04', '2026-12-06')).toBe(3);
    expect(dayCount('2026-03-07', '2026-03-09')).toBe(3); // across the DST change
  });
});

describe('loadDataset', () => {
  it('loads the valid fixtures with no issues and ignores drafts', () => {
    expect(loaded.issues).toEqual([]);
    expect(base.series.map((s) => s.id)).toEqual(['lone-star-anime-fest']);
    expect(base.editions.map((e) => e.id)).toEqual([
      'lone-star-anime-fest-2026',
      'lone-star-anime-fest-2027',
    ]);
    expect(base.sources).toHaveLength(2);
  });

  it('keeps dates as strings and reads an unquoted edition year as text', () => {
    const edition = base.editions[0];
    expect(edition?.start_date).toBe('2026-10-23');
    expect(edition?.edition).toBe('2026');
  });

  it('treats a missing data directory as empty', () => {
    const { dataset, issues } = loadDataset(fileURLToPath(new URL('./nowhere', import.meta.url)));
    expect(issues).toEqual([]);
    expect(dataset.editions).toEqual([]);
  });

  it('passes cross-record validation', () => {
    expect(validateDataset(base, TODAY)).toEqual([]);
  });
});

describe('EditionSchema', () => {
  const valid = base.editions[0] as Edition;
  const problems = (record: object) => {
    const result = EditionSchema.safeParse(record);
    return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
  };

  it('rejects unsafe or non-https URLs', () => {
    expect(problems({ ...valid, url: 'javascript:alert(1)' })).toContain('url');
    expect(problems({ ...valid, url: 'http://example.org' })).toContain('url');
    expect(problems({ ...valid, tickets_url: 'data:text/html,hi' })).toContain('tickets_url');
  });

  it('rejects unknown fields, bad ids, regions, statuses and time zones', () => {
    expect(problems({ ...valid, venu: 'typo' })).toEqual(['']);
    expect(problems({ ...valid, id: 'Lone Star 2026' })).toContain('id');
    expect(problems({ ...valid, region: 'east' })).toContain('region');
    expect(problems({ ...valid, status: 'rumored' })).toContain('status');
    expect(problems({ ...valid, timezone: 'America/New_York' })).toContain('timezone');
    expect(problems({ ...valid, start_date: '2026-02-30' })).toContain('start_date');
  });

  it('requires evidence', () => {
    expect(problems({ ...valid, evidence: [] })).toContain('evidence');
  });
});

describe('validateDataset', () => {
  const ed2026 = 'editions/lone-star-anime-fest-2026';

  it('requires dates for confirmed editions and forbids them for TBA ones', () => {
    expect(errorsFor({ start_date: undefined, end_date: undefined })).toContain(
      `${ed2026}: a confirmed edition needs start_date and end_date`,
    );
    expect(
      errorsFor({ start_date: '2027-10-01', end_date: '2027-10-03' }, 'lone-star-anime-fest-2027'),
    ).toContain('editions/lone-star-anime-fest-2027: a dates_tba edition must not have dates');
  });

  it('rejects backwards and half-specified ranges', () => {
    expect(errorsFor({ end_date: '2026-10-22' })).toContain(
      `${ed2026}: end_date is before start_date`,
    );
    expect(errorsFor({ end_date: undefined })).toContain(
      `${ed2026}: start_date and end_date must be given together`,
    );
  });

  it('keeps completed distinct from cancelled', () => {
    expect(errorsFor({ status: 'completed' })).toContain(
      `${ed2026}: marked completed but it has not ended yet`,
    );
    expect(errorsFor({ status: 'cancelled' })).toEqual([
      `${ed2026}: a cancelled edition needs a status_note summarizing the announcement`,
      `${ed2026}: cancelled status is not backed by an official source`,
    ]);
  });

  it('needs an announcement for a series that has ended, and nothing still to come', () => {
    const seriesErrors = (patch: Partial<Dataset['series'][number]>) =>
      validateDataset({ ...base, series: base.series.map((s) => ({ ...s, ...patch })) }, TODAY)
        .filter((i) => i.level === 'error')
        .map((i) => `${i.record}: ${i.message}`);
    expect(seriesErrors({ status: 'ended' })).toEqual([
      'conventions/lone-star-anime-fest: a series marked ended needs a status_note summarizing the announcement',
      `${ed2026}: its series is marked ended, so this edition must be completed or cancelled`,
      'editions/lone-star-anime-fest-2027: its series is marked ended, so this edition must be completed or cancelled',
    ]);
    expect(
      seriesErrors({
        status: 'hiatus',
        status_note: 'Taking a year off.',
        sources: ['lone-star-anime-fest-listing'],
      }),
    ).toContain(
      'conventions/lone-star-anime-fest: hiatus status is not backed by an official source',
    );
  });

  it('warns, not fails, when a confirmed edition has ended', () => {
    const issues = validateDataset(base, '2026-11-01');
    expect(issues).toEqual([
      {
        level: 'warning',
        record: ed2026,
        message: 'this edition has ended; set status to completed',
      },
    ]);
  });

  it('never accepts third-party evidence for published facts', () => {
    const thirdPartyOnly = [
      {
        source: 'lone-star-anime-fest-listing',
        facts: ['dates' as const],
        checked_at: '2026-09-30',
      },
    ];
    expect(errorsFor({ evidence: thirdPartyOnly })).toEqual(
      expect.arrayContaining([
        `${ed2026}: no official source confirms this edition exists`,
        `${ed2026}: dates are not backed by an official source`,
        `${ed2026}: venue is not backed by an official source`,
      ]),
    );
  });

  it('needs official evidence for an age limit', () => {
    expect(errorsFor({ min_age: 18 })).toContain(
      `${ed2026}: min_age is not backed by an official source`,
    );
  });

  it('does not let verification run ahead of the evidence', () => {
    expect(errorsFor({ last_verified_at: '2026-10-10' })).toContain(
      `${ed2026}: last_verified_at is later than every evidence check; verification needs evidence`,
    );
  });

  it('rejects a last_attempted_at date in the future', () => {
    expect(errorsFor({ last_attempted_at: '2026-10-12' })).toContain(
      `${ed2026}: last_attempted_at is in the future`,
    );
  });

  it('catches broken cross-references and duplicates', () => {
    expect(errorsFor({ series: 'ghost-con' })).toContain(`${ed2026}: unknown series "ghost-con"`);
    expect(errorsFor({ edition: '2027' })).toContain(
      'editions/lone-star-anime-fest-2027: same series and edition as "lone-star-anime-fest-2026"',
    );
    expect(errorsFor({ slug: 'lone-star-anime-fest-2027' })).toContain(
      'editions/lone-star-anime-fest-2027: slug "lone-star-anime-fest-2027" is used by more than one record',
    );
    const dupe: Dataset = { ...base, sources: [...base.sources, base.sources[0]!] };
    expect(validateDataset(dupe, TODAY).map((i) => i.message)).toContain(
      `duplicate id "${base.sources[0]!.id}"`,
    );
  });

  it('only allows Mountain time in West Texas', () => {
    expect(errorsFor({ timezone: 'America/Denver' })).toContain(
      `${ed2026}: America/Denver is only used for West Texas venues`,
    );
    expect(errorsFor({ timezone: 'America/Denver', region: 'west' })).toEqual([]);
  });
});
