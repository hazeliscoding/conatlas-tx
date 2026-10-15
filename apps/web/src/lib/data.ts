import { resolve } from 'node:path';
import {
  formatDateRange,
  REGION_NAMES,
  todayIn,
  validateDataset,
  type Dataset,
  type Edition,
  type Region,
  type Series,
} from '@conatlas/core';
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
/** Maintainer contact for people without a GitHub account; forwards to the maintainer. */
export const CONTACT_EMAIL = 'conatlas-tx.landing118@passfwd.com';

/** A site path under the deploy base, e.g. `href('calendar/')`. */
export const href = (path = '') => `${import.meta.env.BASE_URL}${path}`;

/** An edition's detail page. */
export const detailHref = (edition: Pick<Edition, 'slug'>) => href(`cons/${edition.slug}/`);

// "<number> <street>, <city>, TX <ZIP>" and nothing else: a suite, a landmark or a missing ZIP
// keeps the address at city level rather than risk splitting it wrong.
const STREET_ADDRESS = /^(\d[^,]*), ([^,]+), (?:TX|Texas) (\d{5})$/;

/** A schema.org PostalAddress built only from the venue address and city the page shows. */
export function postalAddress(e: Pick<Edition, 'city' | 'venue'>) {
  const m = STREET_ADDRESS.exec(e.venue?.address ?? '');
  return {
    '@type': 'PostalAddress',
    ...(m && m[2] === e.city && { streetAddress: m[1], postalCode: m[3] }),
    addressLocality: e.city,
    addressRegion: 'TX',
    addressCountry: 'US',
  };
}

/** "A", "A and B", "A, B and C"; past `max` items, "A, B, C and 2 more". */
export function andList(items: string[], max = Infinity): string {
  const shown = items.length > max ? [...items.slice(0, max), `${items.length - max} more`] : items;
  return shown.length > 1
    ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`
    : (shown[0] ?? '');
}

/** URL slug for a place name: "College Station" → "college-station", accents dropped. */
export const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const regionHref = (region: Region) => href(`regions/${slug(REGION_NAMES[region])}/`);

/**
 * Cities with a page of their own, to its address: three or more upcoming conventions (the
 * 2026-10-13 decision), counted as the home page counts them.
 */
export function cityPages(listings: Listing[] = getUpcoming()): Map<string, string> {
  const counts = new Map<string, number>();
  for (const e of listings) if (!e.awaitingNext) counts.set(e.city, (counts.get(e.city) ?? 0) + 1);
  return new Map(
    [...counts].filter(([, n]) => n >= 3).map(([city]) => [city, href(`cities/${slug(city)}/`)]),
  );
}

/** Search description for a region or city page, built only from its listings. */
export function placeDescription(place: string, listings: Listing[]): string {
  const titles = listings.filter((e) => !e.awaitingNext).map((e) => e.title);
  return titles.length
    ? `We list ${titles.length} upcoming ${place} anime ${titles.length === 1 ? 'convention' : 'conventions'}: ${andList(titles, 3)}. Checked against official sources.`
    : `We don't list an upcoming ${place} anime convention yet. Conventions appear here once a maintainer confirms them against an official source.`;
}

/**
 * A plain summary of an edition built only from its record: what, where, when, who runs it and
 * when it was last checked. The convention page's About section and llms.txt both use it, so
 * they always say the same thing.
 */
export function editionSummary(
  e: Edition,
  series: Pick<Series, 'name' | 'organizer'> & Partial<Pick<Series, 'status'>>,
  today = todayIn('America/Chicago'),
): string {
  const title = editionTitle(e, series.name);
  const where = `${e.city}, Texas`;
  const start = e.start_date;
  const end = e.end_date ?? start;
  const when = start && end ? formatDateRange(start, end) : undefined;
  const at = e.venue ? `, at ${e.venue.name}` : '';
  const ended = e.status === 'completed' || (end !== undefined && end < today);
  const lead =
    e.status === 'cancelled'
      ? `${title}, an anime convention in ${where}${when ? `, planned for ${when}${at}` : ''}, was cancelled.`
      : e.status === 'postponed'
        ? `${title}, an anime convention in ${where}, is postponed, and new dates haven't been announced.`
        : !when
          ? `${title} is an anime convention in ${where}. Its dates haven't been announced yet${e.venue ? `; the venue is ${e.venue.name}` : ''}.`
          : ended
            ? `${title} was an anime convention in ${where}, held ${when}${at}.`
            : `${title} is an anime convention in ${where}, on ${when}${at}.`;
  const state =
    series.status === 'ended'
      ? ` ${series.name} has ended.`
      : series.status === 'hiatus'
        ? ` ${series.name} is on hiatus.`
        : '';
  const by = series.organizer
    ? ` It${series.status === 'ended' ? ' was' : "'s"} run by ${series.organizer}.`
    : '';
  const checked = formatDateRange(e.last_verified_at, e.last_verified_at);
  return `${lead}${state}${by} ConAtlas TX checked these details against official sources on ${checked}.`;
}

/** An edition's full name, e.g. "San Japan 2027" or "KimoKawaii Conroe 2027". */
export const editionTitle = (edition: Edition, seriesName: string) =>
  `${seriesName} ${edition.edition}`;

/**
 * Calendar feeds by URL name (`feeds/<name>.ics`): all of Texas, then each region with a dated
 * edition. iCalendar needs at least one event, so a region without any gets no feed yet.
 */
export function getFeeds(): Record<string, string> {
  const dated = new Set(getDataset().editions.flatMap((e) => (e.start_date ? [e.region] : [])));
  const regions = Object.entries(REGION_NAMES).filter(([region]) => dated.has(region as Region));
  return { all: 'All of Texas', ...Object.fromEntries(regions) };
}

/** What calendar apps show for an edition, and the page they link back to. */
export const eventDetails = (edition: Edition, title: string) => ({
  summary: title,
  pageUrl: new URL(detailHref(edition), import.meta.env.SITE).href,
});

/**
 * An edition with the name to show for it. `awaitingNext` marks a series' latest past edition
 * when the organizer hasn't announced the next one, so the series stays findable.
 */
export type Listing = Edition & { displayName: string; title: string; awaitingNext?: boolean };

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
    title: editionTitle(e, names.get(e.series) ?? e.series),
  });
  const upcoming = editions
    .filter((e) => e.status !== 'completed' && (!e.end_date || e.end_date >= today))
    .map(toListing)
    .sort(
      (a, b) =>
        (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999') ||
        a.displayName.localeCompare(b.displayName),
    );

  // A series that has ended or is on hiatus isn't waiting for its next dates.
  const listed = new Set([
    ...upcoming.map((e) => e.series),
    ...series.filter((s) => s.status !== 'active').map((s) => s.id),
  ]);
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
