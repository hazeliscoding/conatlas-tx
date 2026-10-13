// What the region and city pages should hold, worked out from the data independently of the
// site code (shared by the place, SEO and accessibility specs).
import { fileURLToPath } from 'node:url';
import { todayIn } from '../packages/core/src/dates.ts';
import { loadDataset } from '../packages/core/src/load.ts';
import { REGION_NAMES, type Region } from '../packages/core/src/schema.ts';

export const { dataset } = loadDataset(fileURLToPath(new URL('../data', import.meta.url)));
const today = todayIn('America/Chicago');

/** Editions the home page counts as upcoming: not completed and not ended. */
export const upcoming = dataset.editions.filter(
  (e) => e.status !== 'completed' && (!e.end_date || e.end_date >= today),
);

export const placeSlug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const regionPath = (region: Region) => `/regions/${placeSlug(REGION_NAMES[region])}/`;
export const cityPath = (city: string) => `/cities/${placeSlug(city)}/`;

/** Cities with three or more upcoming conventions, the ones with a page of their own. */
export const pagedCities = [
  ...upcoming.reduce((m, e) => m.set(e.city, (m.get(e.city) ?? 0) + 1), new Map<string, number>()),
]
  .filter(([, n]) => n >= 3)
  .map(([city]) => city);
