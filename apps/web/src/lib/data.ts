import { resolve } from 'node:path';
import { todayIn, validateDataset, type Dataset } from '@conatlas/core';
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
