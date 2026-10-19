import type { IsoDate } from './dates.ts';
import { OFFICIAL_SOURCE_TYPES, type Dataset, type Edition, type Source } from './schema.ts';

export interface Issue {
  level: 'error' | 'warning';
  /** `<dir>/<id>`, e.g. `editions/san-japan-2026`. */
  record: string;
  message: string;
}

type Report = (record: string, message: string) => void;

function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((value, i) => values.indexOf(value) !== i))];
}

/** Cross-record rules that a per-record schema can't express. `today` keeps it deterministic. */
export function validateDataset(data: Dataset, today: IsoDate): Issue[] {
  const issues: Issue[] = [];
  const error: Report = (record, message) => issues.push({ level: 'error', record, message });
  const warn: Report = (record, message) => issues.push({ level: 'warning', record, message });

  const kinds = [
    ['conventions', data.series],
    ['editions', data.editions],
    ['sources', data.sources],
  ] as const;
  for (const [dir, records] of kinds) {
    for (const id of duplicates(records.map((r) => r.id)))
      error(`${dir}/${id}`, `duplicate id "${id}"`);
  }
  for (const [dir, records] of [kinds[0], kinds[1]]) {
    for (const slug of duplicates(records.map((r) => r.slug))) {
      error(`${dir}/${slug}`, `slug "${slug}" is used by more than one record`);
    }
  }

  const seriesIds = new Set(data.series.map((s) => s.id));
  const seriesStatus = new Map(data.series.map((s) => [s.id, s.status]));
  const sources = new Map(data.sources.map((s) => [s.id, s]));

  for (const source of data.sources) {
    if (!seriesIds.has(source.series)) {
      error(`sources/${source.id}`, `unknown series "${source.series}"`);
    }
    if (source.last_checked > today) error(`sources/${source.id}`, 'last_checked is in the future');
  }

  for (const series of data.series) {
    if (series.status !== 'active') {
      const record = `conventions/${series.id}`;
      if (!series.status_note) {
        error(
          record,
          `a series marked ${series.status} needs a status_note summarizing the announcement`,
        );
      }
      const backed = series.sources.some((sourceId) => {
        const source = sources.get(sourceId);
        return (
          source &&
          OFFICIAL_SOURCE_TYPES.includes(source.type) &&
          source.supports.includes('status')
        );
      });
      if (!backed) error(record, `${series.status} status is not backed by an official source`);
    }
    for (const sourceId of series.sources) {
      const source = sources.get(sourceId);
      if (!source) error(`conventions/${series.id}`, `unknown source "${sourceId}"`);
      else if (source.series !== series.id) {
        error(
          `conventions/${series.id}`,
          `source "${sourceId}" belongs to series "${source.series}"`,
        );
      }
    }
  }

  const editionKeys = new Map<string, string>();
  for (const edition of data.editions) {
    const record = `editions/${edition.id}`;
    if (!seriesIds.has(edition.series)) error(record, `unknown series "${edition.series}"`);
    const status = seriesStatus.get(edition.series);
    if (
      status &&
      status !== 'active' &&
      ['confirmed', 'dates_tba', 'postponed'].includes(edition.status)
    ) {
      error(
        record,
        `its series is marked ${status}, so this edition must be completed or cancelled`,
      );
    }
    const key = `${edition.series}/${edition.edition}`;
    const first = editionKeys.get(key);
    if (first) error(record, `same series and edition as "${first}"`);
    else editionKeys.set(key, edition.id);
    if (edition.timezone === 'America/Denver' && edition.region !== 'west') {
      error(record, 'America/Denver is only used for West Texas venues');
    }
    checkDates(
      edition,
      today,
      (m) => error(record, m),
      (m) => warn(record, m),
    );
    checkEvidence(
      edition,
      sources,
      today,
      (m) => error(record, m),
      (m) => warn(record, m),
    );
  }

  return issues;
}

function checkDates(
  e: Edition,
  today: IsoDate,
  error: (m: string) => void,
  warn: (m: string) => void,
) {
  const hasDates = e.start_date !== undefined || e.end_date !== undefined;
  if (hasDates && (e.start_date === undefined || e.end_date === undefined)) {
    error('start_date and end_date must be given together');
  }
  if (e.start_date && e.end_date && e.end_date < e.start_date)
    error('end_date is before start_date');

  switch (e.status) {
    case 'confirmed':
      if (!hasDates) error('a confirmed edition needs start_date and end_date');
      else if (e.end_date && e.end_date < today)
        warn('this edition has ended; set status to completed');
      break;
    case 'completed':
      if (!hasDates) error('a completed edition needs start_date and end_date');
      else if (e.end_date && e.end_date >= today)
        error('marked completed but it has not ended yet');
      break;
    case 'dates_tba':
      if (hasDates) error('a dates_tba edition must not have dates');
      break;
    case 'postponed':
    case 'cancelled':
      if (!e.status_note)
        error(`a ${e.status} edition needs a status_note summarizing the announcement`);
      break;
  }
}

function checkEvidence(
  e: Edition,
  sources: Map<string, Source>,
  today: IsoDate,
  error: (m: string) => void,
  warn: (m: string) => void,
) {
  const official = new Set<string>();
  for (const ev of e.evidence) {
    const source = sources.get(ev.source);
    if (!source) {
      error(`evidence cites unknown source "${ev.source}"`);
      continue;
    }
    if (source.series !== e.series)
      error(`evidence source "${ev.source}" belongs to another series`);
    if (ev.checked_at > today) error(`evidence from "${ev.source}" is dated in the future`);
    if (OFFICIAL_SOURCE_TYPES.includes(source.type)) ev.facts.forEach((f) => official.add(f));
  }

  // Dates prove the edition exists; anything else needs an explicit official announcement.
  if (!official.has('existence') && !official.has('dates')) {
    error('no official source confirms this edition exists');
  }
  if (e.start_date && !official.has('dates')) error('dates are not backed by an official source');
  if (e.venue && !official.has('venue')) error('venue is not backed by an official source');
  if ((e.status === 'postponed' || e.status === 'cancelled') && !official.has('status')) {
    error(`${e.status} status is not backed by an official source`);
  }
  if (e.min_age && !official.has('age')) error('min_age is not backed by an official source');
  if (e.tickets_url && !official.has('tickets'))
    warn('tickets_url is not backed by an official source');

  const latestCheck =
    e.evidence
      .map((ev) => ev.checked_at)
      .sort()
      .at(-1) ?? '';
  if (e.last_verified_at > latestCheck) {
    error('last_verified_at is later than every evidence check; verification needs evidence');
  }
  if (e.last_attempted_at && e.last_attempted_at < e.last_verified_at) {
    error('last_attempted_at is earlier than last_verified_at; a successful check moves it up too');
  }
  if (e.last_attempted_at && e.last_attempted_at > today) {
    error('last_attempted_at is in the future');
  }
  if (e.updated_at > today) error('updated_at is in the future');
}
