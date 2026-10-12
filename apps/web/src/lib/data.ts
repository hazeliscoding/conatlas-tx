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

/** An edition with the name to show for it. */
export type Listing = Edition & { displayName: string };

/**
 * Editions that haven't ended as of the build, soonest first, undated last.
 * shortcut: "today" is the build date, so an edition stays listed until the next build; rebuild daily once deploys exist.
 */
export function getUpcoming(): Listing[] {
  const { series, editions } = getDataset();
  const today = todayIn('America/Chicago');
  const names = new Map(series.map((s) => [s.id, s.name]));
  return editions
    .filter((e) => e.status !== 'completed' && (!e.end_date || e.end_date >= today))
    .map((e) => ({ ...e, displayName: e.name ?? names.get(e.series) ?? e.series }))
    .sort(
      (a, b) =>
        (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999') ||
        a.displayName.localeCompare(b.displayName),
    );
}
