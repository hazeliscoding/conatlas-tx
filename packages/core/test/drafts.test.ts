import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  applyDrafts,
  checkDrafts,
  daysBetween,
  diffDrafts,
  findDuplicates,
  maintenanceTasks,
  type Dataset,
  type Edition,
} from '../src/index.ts';
import { loadDataset } from '../src/load.ts';

const base = loadDataset(fileURLToPath(new URL('./fixtures/data', import.meta.url))).dataset;
const edition = base.editions[0]!; // confirmed, Oct 23-25 2026, verified 2026-09-30
const tba = base.editions[1]!; // dates_tba, verified 2026-09-30
const none: Dataset = { series: [], editions: [], sources: [] };
const drafts = (editions: Edition[], rest: Partial<Dataset> = {}): Dataset => ({
  ...none,
  editions,
  ...rest,
});

describe('applyDrafts', () => {
  it('replaces records by id in place and appends new ones', () => {
    const changed = { ...edition, city: 'Round Rock' };
    const added = { ...edition, id: 'other-2026', slug: 'other-2026' };
    const merged = applyDrafts(base, drafts([added, changed]));
    expect(merged.editions.map((e) => e.id)).toEqual([edition.id, tba.id, 'other-2026']);
    expect(merged.editions[0]!.city).toBe('Round Rock');
    expect(merged.series).toEqual(base.series);
  });
});

describe('diffDrafts', () => {
  it('sorts changed fields into facts, verification and bookkeeping', () => {
    const draft = {
      ...edition,
      venue: { name: 'Palmer Events Center' },
      last_verified_at: '2026-10-02',
      updated_at: '2026-10-02',
    };
    const [diff] = diffDrafts(base, drafts([draft]));
    expect(diff).toMatchObject({ kind: 'editions', id: edition.id, status: 'changed' });
    expect(diff!.facts).toEqual([
      {
        field: 'venue',
        before: { name: 'Austin Convention Center' },
        after: { name: 'Palmer Events Center' },
      },
    ]);
    expect(diff!.verification.map((c) => c.field)).toEqual(['last_verified_at']);
    expect(diff!.bookkeeping.map((c) => c.field)).toEqual(['updated_at']);
  });

  it('ignores key order and reports an identical draft as unchanged', () => {
    const reordered = Object.fromEntries(Object.entries(edition).reverse()) as Edition;
    expect(diffDrafts(base, drafts([reordered]))[0]!.status).toBe('unchanged');
  });

  it('lists every field of a new record and counts a field removal as a change', () => {
    const added = { ...edition, id: 'new-2026', slug: 'new-2026' };
    expect(diffDrafts(base, drafts([added]))[0]).toMatchObject({ status: 'added' });
    const [diff] = diffDrafts(base, drafts([{ ...edition, tickets_url: undefined }]));
    expect(diff!.facts).toEqual([
      { field: 'tickets_url', before: edition.tickets_url, after: undefined },
    ]);
  });
});

describe('checkDrafts', () => {
  const check = (draft: Edition, today = '2026-10-02') => {
    const d = drafts([draft]);
    return checkDrafts(diffDrafts(base, d), base, d, today).map((i) => `${i.level}: ${i.message}`);
  };

  it('asks for exactly one revision bump when a published fact changes', () => {
    const moved = { ...edition, city: 'Round Rock', updated_at: '2026-10-02' };
    expect(check(moved)).toEqual(['error: published facts changed (city); set revision to 1']);
    expect(check({ ...moved, revision: 1 })).toEqual([]);
    expect(check({ ...moved, revision: 2 })).toEqual([
      'error: published facts changed (city); set revision to 1',
    ]);
  });

  it('keeps the revision when only verification changed', () => {
    const rechecked = { ...edition, last_verified_at: '2026-10-02', updated_at: '2026-10-02' };
    expect(check({ ...rechecked, revision: 1 })).toEqual([
      'error: revision changes only when a published fact does; set it back to 0',
    ]);
  });

  it('warns about a stale updated_at and about drafts that change nothing', () => {
    const edited = { ...edition, last_attempted_at: '2026-10-02' };
    expect(check(edited)).toEqual([
      'warning: updated_at is still 2026-09-30; set it to the day of this edit',
    ]);
    // Edited again on the same day it was last updated: nothing to fix.
    expect(check(edited, '2026-09-30')).toEqual([]);
    expect(check(edition)).toEqual(['warning: matches the published record; delete the draft']);
  });

  it('treats renaming a convention as a fact change for each of its editions', () => {
    const series = { ...base.series[0]!, name: 'Lone Star Anime Festival' };
    const issues = (d: Dataset) =>
      checkDrafts(diffDrafts(base, d), base, d, '2026-10-02').map(
        (i) => `${i.record}: ${i.message}`,
      );
    expect(issues({ ...none, series: [series] })).toEqual([
      `editions/${edition.id}: conventions/lone-star-anime-fest was renamed, which changes this edition's calendar title; propose it and set revision to 1`,
      `editions/${tba.id}: conventions/lone-star-anime-fest was renamed, which changes this edition's calendar title; propose it and set revision to 1`,
    ]);
    const bumped = (e: Edition, revision: number) => ({ ...e, revision, updated_at: '2026-10-02' });
    expect(
      issues({ ...none, series: [series], editions: [bumped(edition, 0), bumped(tba, 1)] }),
    ).toEqual([
      `editions/${edition.id}: its convention was renamed, which changes its calendar title; set revision to 1`,
    ]);
  });

  it('expects a new edition to start at revision 0', () => {
    const added = { ...edition, id: 'new-2026', slug: 'new-2026', revision: 3 };
    expect(check(added)).toEqual(['warning: a new edition starts at revision 0']);
  });
});

describe('findDuplicates', () => {
  const series = base.series[0]!;

  it('flags a new convention with the same website or a near-identical name', () => {
    const sameSite = {
      ...series,
      id: 'lsaf',
      slug: 'lsaf',
      name: 'Totally Different',
      website: 'https://www.example.org/x',
    };
    const sameName = {
      ...series,
      id: 'lsaf2',
      slug: 'lsaf2',
      name: 'Lone Star Anime-Fest!',
      website: 'https://lsaf.example.net',
    };
    const unrelated = {
      ...series,
      id: 'oni',
      slug: 'oni',
      name: 'Oni-Con',
      website: 'https://oni.example.net',
    };
    const found = findDuplicates(base, { ...none, series: [sameSite, sameName, unrelated] });
    expect(found).toEqual([
      {
        record: 'conventions/lsaf',
        other: 'conventions/lone-star-anime-fest',
        reason: 'same website (example.org)',
      },
      {
        record: 'conventions/lsaf2',
        other: 'conventions/lone-star-anime-fest',
        reason: 'name like "Lone Star Anime Fest"',
      },
    ]);
  });

  it('tells social accounts apart on the same social site', () => {
    const insta = (id: string, account: string) => ({
      ...series,
      id,
      slug: id,
      name: id,
      website: `https://www.instagram.com/${account}/`,
    });
    const published = { ...base, series: [insta('first-con', 'firstcon')] };
    const drafts = {
      ...none,
      series: [insta('second-con', 'secondcon'), insta('third-con', 'FirstCon')],
    };
    expect(findDuplicates(published, drafts)).toEqual([
      {
        record: 'conventions/third-con',
        other: 'conventions/first-con',
        reason: 'same website (instagram.com/firstcon)',
      },
    ]);
  });

  it('flags new editions that overlap one in the same series or the same city', () => {
    const sameSeries = {
      ...edition,
      id: 'dup-2026',
      slug: 'dup-2026',
      edition: 'Spring 2026',
      start_date: '2026-10-25',
      end_date: '2026-10-26',
    };
    const sameCity = { ...edition, id: 'other-2026', slug: 'other-2026', series: 'other' };
    const elsewhere = {
      ...edition,
      id: 'far-2026',
      slug: 'far-2026',
      series: 'far',
      city: 'El Paso',
    };
    const later = {
      ...edition,
      id: 'later-2026',
      slug: 'later-2026',
      series: 'later',
      start_date: '2026-10-27',
      end_date: '2026-10-28',
    };
    const reasons = findDuplicates(base, drafts([sameSeries, sameCity, elsewhere, later])).map(
      (d) => `${d.record} ~ ${d.other}: ${d.reason}`,
    );
    expect(reasons).toEqual([
      `editions/dup-2026 ~ editions/${edition.id}: overlapping dates in the same series`,
      'editions/dup-2026 ~ editions/other-2026: same city and overlapping dates',
      `editions/other-2026 ~ editions/${edition.id}: same city and overlapping dates`,
    ]);
  });

  it('reports a pair of matching new drafts once', () => {
    const a = { ...edition, id: 'a-2026', slug: 'a-2026', series: 'a', city: 'Waco' };
    const b = { ...a, id: 'b-2026', slug: 'b-2026', series: 'b' };
    expect(findDuplicates(base, drafts([a, b]))).toHaveLength(1);
  });

  it('flags a new source with the same URL, ignoring a trailing slash', () => {
    const source = { ...base.sources[1]!, id: 'again', url: `${base.sources[1]!.url}/` };
    expect(findDuplicates(base, { ...none, sources: [source] })).toEqual([
      { record: 'sources/again', other: `sources/${base.sources[1]!.id}`, reason: 'same URL' },
    ]);
  });
});

describe('maintenanceTasks', () => {
  const tasks = (data: Dataset, today: string) =>
    maintenanceTasks(data, today).map((t) => `${t.priority} ${t.record}: ${t.reason}`);
  const only = (...editions: Edition[]): Dataset => ({ ...base, editions });

  it('checks more often as an edition gets closer', () => {
    // 2026-10-23 start, last checked 2026-09-30.
    expect(tasks(only({ ...edition, last_verified_at: '2026-10-07' }), '2026-10-14')).toEqual([]);
    expect(tasks(only({ ...edition, last_verified_at: '2026-10-06' }), '2026-10-14')).toEqual([
      `now editions/${edition.id}: starts in 9 days; last checked 8 days ago`,
    ]);
    const far = { ...edition, start_date: '2027-03-01', end_date: '2027-03-02' };
    expect(tasks(only(far), '2026-11-14')).toEqual([]); // 45 days since the check
    expect(tasks(only(far), '2026-11-15')).toEqual([
      `soon editions/${edition.id}: starts in 106 days; last checked 46 days ago`,
    ]);
  });

  it('asks to complete ended editions and retry failed checks', () => {
    const failed = { ...tba, last_attempted_at: '2026-10-05' };
    expect(tasks(only(edition, failed), '2026-10-26')).toEqual([
      `now editions/${edition.id}: ended 2026-10-25; mark it completed`,
      `now editions/${tba.id}: the last check, on 2026-10-05, failed`,
    ]);
  });

  it('looks for announcements on undated and postponed editions', () => {
    const postponed = { ...edition, status: 'postponed' as const, status_note: 'Moved.' };
    expect(tasks(only(tba), '2026-10-30')).toEqual([]);
    expect(tasks(only(tba), '2026-10-31')).toEqual([
      `soon editions/${tba.id}: dates not announced; last checked 31 days ago`,
    ]);
    expect(tasks(only(postponed), '2026-10-15')).toEqual([
      `soon editions/${edition.id}: postponed; look for new dates (last checked 15 days ago)`,
    ]);
  });

  it('asks to look for the next edition of a series with nothing upcoming', () => {
    const done = { ...edition, status: 'completed' as const };
    expect(tasks(only(done), '2026-10-30')).toEqual([]);
    expect(tasks(only(done), '2026-10-31')).toEqual([
      'later conventions/lone-star-anime-fest: no next edition announced; sources last checked 31 days ago',
    ]);
  });
});

describe('daysBetween', () => {
  it('counts whole days in either direction', () => {
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(0);
    expect(daysBetween('2026-12-31', '2027-01-02')).toBe(2);
    expect(daysBetween('2026-03-09', '2026-03-07')).toBe(-2);
  });
});
