import { resolve } from 'node:path';
import { todayIn, validateDataset, type Dataset, type Edition } from '@conatlas/core';
import { loadDataset } from '@conatlas/core/load';

// Astro runs with apps/web as the working directory.
const DATA_DIR = resolve(process.cwd(), '../../data');

/** Approved records only. Invalid data fails the build rather than publishing. */
export function getDataset(): Dataset {
  const { dataset, issues } = loadDataset(DATA_DIR);
  const errors = [...issues, ...validateDataset(dataset, todayIn('America/Chicago'))].filter(
    (issue) => issue.level === 'error',
  );
  if (errors.length > 0) {
    const list = errors.map((e) => `  ${e.record}: ${e.message}`).join('\n');
    throw new Error(`Data has ${errors.length} errors (run pnpm data:validate):\n${list}`);
  }
  return dataset;
}

export const REPO_URL = 'https://github.com/hazeliscoding/conatlas-tx';

/** A site path under the deploy base, e.g. `href('calendar/')`. */
export const href = (path = '') => `${import.meta.env.BASE_URL}${path}`;

/** An edition's detail page. */
export const detailHref = (edition: Pick<Edition, 'slug'>) => href(`cons/${edition.slug}/`);

/**
 * An edition with the name to show for it. `awaitingNext` marks a series' latest past edition
 * when the organizer hasn't announced the next one, so the series stays findable.
 */
export type Listing = Edition & { displayName: string; awaitingNext?: boolean };

/**
 * Editions that haven't ended as of the build, soonest first, undated last; then one
 * `awaitingNext` listing per series with nothing upcoming.
 * shortcut: "today" is the build date, so an edition stays listed until the next build; rebuild daily once deploys exist.
 */
export function getUpcoming(): Listing[] {
  const { series, editions } = getDataset();
  const today = todayIn('America/Chicago');
  const names = new Map(series.map((s) => [s.id, s.name]));
  const toListing = (e: Edition): Listing => ({
    ...e,
    displayName: e.name ?? names.get(e.series) ?? e.series,
  });
  const upcoming = editions
    .filter((e) => e.status !== 'completed' && (!e.end_date || e.end_date >= today))
    .map(toListing)
    .sort(
      (a, b) =>
        (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999') ||
        a.displayName.localeCompare(b.displayName),
    );

  const listed = new Set(upcoming.map((e) => e.series));
  const latest = new Map<string, Edition>();
  for (const e of editions) {
    const prev = latest.get(e.series);
    if (!listed.has(e.series) && (!prev || (e.start_date ?? '') > (prev.start_date ?? ''))) {
      latest.set(e.series, e);
    }
  }
  const awaiting = [...latest.values()]
    .map((e) => ({ ...toListing(e), awaitingNext: true }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  return [...upcoming, ...awaiting];
}
