import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));
const FIXTURE = fileURLToPath(new URL('./fixtures/data', import.meta.url));

function run(args: string[], data = FIXTURE) {
  const result = spawnSync(process.execPath, [CLI, ...args, '--data', data], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

let copies: string[] = [];
afterEach(() => {
  for (const dir of copies) rmSync(dir, { recursive: true, force: true });
  copies = [];
});

/** A scratch copy of the fixture, so commands that write can't touch the real one. */
function copy(): string {
  const dir = mkdtempSync(join(tmpdir(), 'conatlas-'));
  cpSync(FIXTURE, dir, { recursive: true });
  copies.push(dir);
  return dir;
}

/** Every published file and its contents; drafts are left out. */
function published(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const kind of ['conventions', 'editions', 'sources']) {
    for (const file of readdirSync(join(dir, kind))) {
      files[relative(dir, join(dir, kind, file))] = readFileSync(join(dir, kind, file), 'utf8');
    }
  }
  return files;
}

describe('data:diff', () => {
  it('reports each draft field by field, with bookkeeping errors and likely duplicates', () => {
    const { code, out } = run(['diff', '--today', '2026-10-01']);
    expect(code).toBe(1);
    expect(out).toBe(`conventions/lone-star-anime-festival (new)
  Facts
    slug: lone-star-anime-festival
    name: Lone Star Anime Festival
    website: https://www.example.org/lsaf
    city: Austin
    region: central
    status: active
  Verification
    sources: [lone-star-anime-festival-site]
editions/lone-star-anime-fest-2026 (changed)
  Verification
    evidence:
      - lone-star-anime-fest-site [dates, venue, city, tickets] checked 2026-09-30
          "October 23-25, 2026 at the Austin Convention Center"
      + lone-star-anime-fest-site [dates, venue, city, tickets] checked 2026-10-01
          "October 23-25, 2026 at the Austin Convention Center"
    last_verified_at: 2026-09-30 → 2026-10-01
  Bookkeeping
    updated_at: 2026-09-30 → 2026-10-01
editions/lone-star-anime-fest-2027 (changed)
  Facts
    status: dates_tba → confirmed
    start_date: (none) → 2027-10-22
    end_date: (none) → 2027-10-24
    announced_window: Fall 2027 → (none)
  Verification
    evidence:
      - lone-star-anime-fest-site [existence] checked 2026-09-30
          "See you again in fall 2027!"
      + lone-star-anime-fest-site [existence, dates] checked 2026-10-01
          "Lone Star Anime Fest returns October 22-24, 2027"
    last_verified_at: 2026-09-30 → 2026-10-01
  Bookkeeping
    updated_at: 2026-09-30 → 2026-10-01
sources/lone-star-anime-fest-site (no changes)
sources/lone-star-anime-festival-site (new)
  Facts
    series: lone-star-anime-festival
    url: https://example.org/lone-star-anime-fest/
    type: official_site
    supports: [existence]
  Verification
    last_checked: 2026-10-01

error   editions/lone-star-anime-fest-2027: published facts changed (status, start_date, end_date, announced_window); set revision to 1
warning sources/lone-star-anime-fest-site: matches the published record; delete the draft
warning conventions/lone-star-anime-festival: may duplicate conventions/lone-star-anime-fest: same website (example.org), name like "Lone Star Anime Fest"
warning sources/lone-star-anime-festival-site: may duplicate sources/lone-star-anime-fest-site: same URL

5 drafts: 2 new, 2 changed, 1 unchanged. Published with these drafts: 1 errors, 3 warnings
`);
  });

  it('says so when there are no drafts', () => {
    const dir = copy();
    rmSync(join(dir, 'drafts'), { recursive: true });
    expect(run(['diff'], dir)).toMatchObject({ code: 0, out: 'No drafts in data/drafts/.\n' });
  });
});

describe('data:report', () => {
  it('lists what is due, most urgent first, and the drafts waiting', () => {
    const { code, out } = run(['report', '--today', '2026-11-02']);
    expect(code).toBe(0);
    expect(out).toBe(`Due now
  editions/lone-star-anime-fest-2026: ended 2026-10-25; mark it completed

Due soon
  editions/lone-star-anime-fest-2027: dates not announced; last checked 33 days ago

5 drafts are waiting for review: run pnpm data:diff.
`);
  });
});

describe('nothing reaches the published data without an explicit promote', () => {
  it('leaves published files alone on validate, diff, report and propose', () => {
    const dir = copy();
    const before = published(dir);
    rmSync(join(dir, 'drafts', 'editions', 'lone-star-anime-fest-2026.yaml'));
    for (const args of [
      ['validate'],
      ['diff'],
      ['report'],
      ['propose', 'lone-star-anime-fest-2026'],
    ]) {
      run(args, dir);
    }
    expect(published(dir)).toEqual(before);
    // propose copied the published record into drafts, untouched.
    expect(
      readFileSync(join(dir, 'drafts', 'editions', 'lone-star-anime-fest-2026.yaml'), 'utf8'),
    ).toBe(before[join('editions', 'lone-star-anime-fest-2026.yaml')]);
  });

  it('refuses to propose over an existing draft or an unknown record', () => {
    const dir = copy();
    expect(run(['propose', 'editions/lone-star-anime-fest-2026'], dir)).toMatchObject({ code: 2 });
    expect(run(['propose', 'no-such-con'], dir)).toMatchObject({ code: 2 });
  });

  it('refuses to promote without naming drafts', () => {
    const dir = copy();
    const before = published(dir);
    expect(run(['promote'], dir).code).toBe(2);
    expect(published(dir)).toEqual(before);
  });

  it('refuses to promote a draft with errors, alone or with --all', () => {
    const dir = copy();
    const before = published(dir);
    expect(run(['promote', 'lone-star-anime-fest-2027', '--today', '2026-10-01'], dir).code).toBe(
      1,
    );
    expect(run(['promote', '--all', '--today', '2026-10-01'], dir).code).toBe(1);
    expect(published(dir)).toEqual(before);
    expect(existsSync(join(dir, 'drafts', 'editions', 'lone-star-anime-fest-2027.yaml'))).toBe(
      true,
    );
  });

  it('publishes exactly the named draft and removes it from drafts', () => {
    const dir = copy();
    const before = published(dir);
    const draft = join(dir, 'drafts', 'editions', 'lone-star-anime-fest-2026.yaml');
    const text = readFileSync(draft, 'utf8');
    const { code, out } = run(
      ['promote', 'editions/lone-star-anime-fest-2026', '--today', '2026-10-01'],
      dir,
    );
    expect(code).toBe(0);
    expect(out).toContain('Published editions/lone-star-anime-fest-2026');
    expect(existsSync(draft)).toBe(false);
    expect(published(dir)).toEqual({
      ...before,
      [join('editions', 'lone-star-anime-fest-2026.yaml')]: text,
    });
  });

  it('refuses to promote a new convention without the source it depends on', () => {
    const dir = copy();
    const { code, out } = run(
      ['promote', 'conventions/lone-star-anime-festival', '--today', '2026-10-01'],
      dir,
    );
    expect(code).toBe(1);
    expect(out).toContain('unknown source "lone-star-anime-festival-site"');
  });
});
