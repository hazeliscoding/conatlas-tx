// Drafts are proposed records in `data/drafts/`, laid out like `data/`. These helpers compare
// them with the published data so a maintainer can see exactly what publishing would change.
import { daysBetween, type IsoDate } from './dates.ts';
import type { Dataset, Edition } from './schema.ts';
import type { Issue } from './validate.ts';

/** Record directories, in the order they are reported. */
export const KINDS = ['conventions', 'editions', 'sources'] as const;
export type Kind = (typeof KINDS)[number];

type AnyRecord = Dataset[keyof Dataset][number];
const FIELD = { conventions: 'series', editions: 'editions', sources: 'sources' } as const;
const records = (data: Dataset, kind: Kind): AnyRecord[] => data[FIELD[kind]];

/** The published data with drafts laid over it: a draft replaces the record with its id, or adds one. */
export function applyDrafts(published: Dataset, drafts: Dataset): Dataset {
  const over = <T extends { id: string }>(base: T[], next: T[]): T[] => {
    const byId = new Map(next.map((r) => [r.id, r]));
    const ids = new Set(base.map((r) => r.id));
    return [...base.map((r) => byId.get(r.id) ?? r), ...next.filter((r) => !ids.has(r.id))];
  };
  return {
    series: over(published.series, drafts.series),
    editions: over(published.editions, drafts.editions),
    sources: over(published.sources, drafts.sources),
  };
}

/** Fields that record checking rather than what visitors see. Everything else is a fact. */
const VERIFICATION: Record<Kind, string[]> = {
  conventions: ['sources'],
  editions: ['evidence', 'last_verified_at', 'last_attempted_at'],
  sources: ['last_checked', 'access_notes', 'notes'],
};
const BOOKKEEPING = ['updated_at', 'revision'];

export interface FieldChange {
  field: string;
  before?: unknown;
  after?: unknown;
}

export interface RecordDiff {
  kind: Kind;
  id: string;
  status: 'added' | 'changed' | 'unchanged';
  /** Published facts: anything a visitor or calendar app sees. */
  facts: FieldChange[];
  /** Evidence, check dates and source links. */
  verification: FieldChange[];
  /** `updated_at` and `revision`. */
  bookkeeping: FieldChange[];
}

// Key order carries no meaning, so values are compared with keys sorted.
const canonical = (value: unknown) =>
  JSON.stringify(value, (_, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

/** What each draft changes, field by field, compared with the published record of the same id. */
export function diffDrafts(published: Dataset, drafts: Dataset): RecordDiff[] {
  const diffs: RecordDiff[] = [];
  for (const kind of KINDS) {
    const before = new Map(records(published, kind).map((r) => [r.id, r]));
    for (const draft of records(drafts, kind)) {
      const old = before.get(draft.id) as Record<string, unknown> | undefined;
      const next = draft as Record<string, unknown>;
      const diff: RecordDiff = {
        kind,
        id: draft.id,
        status: old ? 'unchanged' : 'added',
        facts: [],
        verification: [],
        bookkeeping: [],
      };
      const fields = [...new Set([...Object.keys(next), ...Object.keys(old ?? {})])];
      for (const field of fields.filter((f) => f !== 'id')) {
        if (old && canonical(old[field]) === canonical(next[field])) continue;
        const group = BOOKKEEPING.includes(field)
          ? diff.bookkeeping
          : VERIFICATION[kind].includes(field)
            ? diff.verification
            : diff.facts;
        group.push(
          old ? { field, before: old[field], after: next[field] } : { field, after: next[field] },
        );
      }
      if (old && diff.facts.length + diff.verification.length + diff.bookkeeping.length > 0) {
        diff.status = 'changed';
      }
      diffs.push(diff);
    }
  }
  return diffs;
}

/**
 * Bookkeeping a draft needs before it can be published, beyond what validateDataset checks:
 * `revision` goes up by one exactly when a published fact changes, and edits get a new `updated_at`.
 */
export function checkDrafts(
  diffs: RecordDiff[],
  published: Dataset,
  drafts: Dataset,
  today: IsoDate,
): Issue[] {
  const issues: Issue[] = [];
  const old = new Map(published.editions.map((e) => [e.id, e]));
  const next = new Map(drafts.editions.map((e) => [e.id, e]));
  for (const diff of diffs) {
    const record = `${diff.kind}/${diff.id}`;
    if (diff.status === 'unchanged') {
      issues.push({
        level: 'warning',
        record,
        message: 'matches the published record; delete the draft',
      });
    }
    if (diff.kind !== 'editions') continue;
    const before = old.get(diff.id);
    const after = next.get(diff.id) as Edition;
    if (!before) {
      if (after.revision !== 0) {
        issues.push({ level: 'warning', record, message: 'a new edition starts at revision 0' });
      }
      continue;
    }
    if (diff.status !== 'changed') continue;
    const expected = before.revision + (diff.facts.length > 0 ? 1 : 0);
    if (after.revision !== expected) {
      const message =
        diff.facts.length > 0
          ? `published facts changed (${diff.facts.map((f) => f.field).join(', ')}); set revision to ${expected}`
          : `revision changes only when a published fact does; set it back to ${expected}`;
      issues.push({ level: 'error', record, message });
    }
    if (after.updated_at === before.updated_at && before.updated_at !== today) {
      issues.push({
        level: 'warning',
        record,
        message: `updated_at is still ${before.updated_at}; set it to the day of this edit`,
      });
    }
  }
  return issues;
}

export interface Duplicate {
  /** The draft, e.g. `conventions/new-con`. */
  record: string;
  /** The record it may duplicate. */
  other: string;
  reason: string;
}

const squash = (text: string) =>
  text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Dice coefficient of two names' letter pairs, ignoring case, spacing and punctuation. */
function nameSimilarity(a: string, b: string): number {
  const pairs = (s: string) => Array.from({ length: s.length - 1 }, (_, i) => s.slice(i, i + 2));
  const [x, y] = [pairs(squash(a)), pairs(squash(b))];
  if (x.length === 0 || y.length === 0) return squash(a) === squash(b) ? 1 : 0;
  const pool = [...y];
  let shared = 0;
  for (const pair of x) {
    const i = pool.indexOf(pair);
    if (i >= 0) {
      shared++;
      pool.splice(i, 1);
    }
  }
  return (2 * shared) / (x.length + y.length);
}

const overlaps = (a: Edition, b: Edition) =>
  !!(a.start_date && a.end_date && b.start_date && b.end_date) &&
  a.start_date <= b.end_date &&
  b.start_date <= a.end_date;

/**
 * New drafts that look like records we already have: the same website or a near-identical name
 * for a convention, overlapping dates for an edition, the same URL for a source. Warnings for a
 * human to judge, not proof.
 */
export function findDuplicates(published: Dataset, drafts: Dataset): Duplicate[] {
  const found: Duplicate[] = [];
  const all = applyDrafts(published, drafts);
  const isNew = (kind: Kind, id: string) => !records(published, kind).some((r) => r.id === id);
  // Two new drafts that match each other are one finding, not two.
  const seen = new Set<string>();
  const report = (record: string, other: string, reason: string) => {
    const key = [record, other].sort().join(' ');
    if (!seen.has(key)) found.push({ record, other, reason });
    seen.add(key);
  };

  for (const draft of drafts.series.filter((s) => isNew('conventions', s.id))) {
    for (const other of all.series.filter((s) => s.id !== draft.id)) {
      const reasons = [];
      if (host(draft.website) === host(other.website))
        reasons.push(`same website (${host(draft.website)})`);
      if (nameSimilarity(draft.name, other.name) >= 0.8) reasons.push(`name like "${other.name}"`);
      if (reasons.length)
        report(`conventions/${draft.id}`, `conventions/${other.id}`, reasons.join(', '));
    }
  }

  for (const draft of drafts.editions.filter((e) => isNew('editions', e.id))) {
    for (const other of all.editions.filter((e) => e.id !== draft.id && overlaps(draft, e))) {
      const reason =
        other.series === draft.series
          ? 'overlapping dates in the same series'
          : draft.city.toLowerCase() === other.city.toLowerCase()
            ? 'same city and overlapping dates'
            : undefined;
      if (reason) report(`editions/${draft.id}`, `editions/${other.id}`, reason);
    }
  }

  const normalUrl = (url: string) => url.replace(/\/+$/, '');
  for (const draft of drafts.sources.filter((s) => isNew('sources', s.id))) {
    for (const other of all.sources.filter((s) => s.id !== draft.id)) {
      if (normalUrl(draft.url) === normalUrl(other.url)) {
        report(`sources/${draft.id}`, `sources/${other.id}`, 'same URL');
      }
    }
  }
  return found;
}

export interface Task {
  /** e.g. `editions/san-japan-2027`. */
  record: string;
  priority: 'now' | 'soon' | 'later';
  reason: string;
}

const PRIORITY: Task['priority'][] = ['now', 'soon', 'later'];
const ago = (days: number) =>
  days === 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;

/**
 * What a maintainer should re-check, most urgent first. The closer an edition is, the more often
 * it's checked: within 30 days of starting every 7 days, within 90 days every 14, otherwise every 45.
 */
export function maintenanceTasks(data: Dataset, today: IsoDate): Task[] {
  const tasks: Task[] = [];
  const add = (record: string, priority: Task['priority'], reason: string) =>
    tasks.push({ record, priority, reason });

  for (const e of data.editions) {
    const record = `editions/${e.id}`;
    const age = daysBetween(e.last_verified_at, today);
    if (e.last_attempted_at && e.last_attempted_at > e.last_verified_at) {
      add(record, 'now', `the last check, on ${e.last_attempted_at}, failed`);
    }
    if (e.status === 'confirmed' && e.end_date && e.end_date < today) {
      add(record, 'now', `ended ${e.end_date}; mark it completed`);
    } else if (e.status === 'confirmed' && e.start_date && e.start_date > today) {
      const until = daysBetween(today, e.start_date);
      const every = until <= 30 ? 7 : until <= 90 ? 14 : 45;
      if (age > every) {
        add(
          record,
          until <= 30 ? 'now' : 'soon',
          `starts in ${until} days; last checked ${ago(age)}`,
        );
      }
    } else if (e.status === 'dates_tba' && age > 30) {
      add(record, 'soon', `dates not announced; last checked ${ago(age)}`);
    } else if (e.status === 'postponed' && age > 14) {
      add(record, 'soon', `postponed; look for new dates (last checked ${ago(age)})`);
    }
  }

  // A series with nothing upcoming: look for the next edition on its own sources.
  const upcoming = (e: Edition) =>
    e.status !== 'completed' && e.status !== 'cancelled' && (!e.end_date || e.end_date >= today);
  for (const series of data.series.filter((s) => s.status === 'active')) {
    if (data.editions.some((e) => e.series === series.id && upcoming(e))) continue;
    const checks = data.sources.filter((s) => s.series === series.id).map((s) => s.last_checked);
    const last = checks.sort().at(-1);
    const age = last ? daysBetween(last, today) : Infinity;
    if (age > 30) {
      add(
        `conventions/${series.id}`,
        'later',
        last
          ? `no next edition announced; sources last checked ${ago(age)}`
          : 'no next edition announced',
      );
    }
  }

  return tasks.sort(
    (a, b) =>
      PRIORITY.indexOf(a.priority) - PRIORITY.indexOf(b.priority) ||
      a.record.localeCompare(b.record),
  );
}
