// A plain-text guide for AI assistants (https://llmstxt.org): what the site is, how its facts
// are checked, and every listed convention with the same summary its page shows. Rebuilt daily
// with the site, so it never says more than the data does.
import { REGION_NAMES, REGIONS, todayIn } from '@conatlas/core';
import type { APIRoute } from 'astro';
import {
  andList,
  cityPages,
  detailHref,
  editionSummary,
  getDataset,
  getFeeds,
  getUpcoming,
  href,
  REPO_URL,
  regionHref,
} from '../lib/data.ts';

export const GET: APIRoute = ({ site }) => {
  const today = todayIn('America/Chicago');
  const url = (path: string) => new URL(path, site).href;
  const { series } = getDataset();
  const seriesOf = new Map(series.map((s) => [s.id, s]));
  const listings = getUpcoming();
  const upcoming = listings.filter((e) => !e.awaitingNext);
  const line = (e: (typeof listings)[number]) =>
    `- [${e.title}](${url(detailHref(e))}): ${editionSummary(e, seriesOf.get(e.series)!, today)}`;
  const plural = (n: number) => `${n} upcoming ${n === 1 ? 'convention' : 'conventions'}`;

  const regions = REGIONS.map((region) => {
    const here = upcoming.filter((e) => e.region === region);
    return `- [${REGION_NAMES[region]}](${url(regionHref(region))}): ${
      here.length
        ? `${plural(here.length)}, in ${andList([...new Set(here.map((e) => e.city))])}`
        : 'no upcoming conventions listed yet'
    }`;
  });
  const cities = [...cityPages(listings)].map(
    ([city, path]) =>
      `- [${city}](${url(path)}): ${plural(upcoming.filter((e) => e.city === city).length)}`,
  );
  const feeds = Object.entries(getFeeds()).map(
    ([name, label]) =>
      `- [${label}](${url(href(`feeds/${name}.ics`))}): iCalendar feed of ${name === 'all' ? 'every listed convention' : `${label} conventions`}`,
  );
  const awaiting = listings.filter((e) => e.awaitingNext);

  const text = [
    '# ConAtlas TX',
    '',
    "> A free, community-maintained calendar of anime conventions in Texas. Every date, venue and status is checked against the organizer's official site or announcements before it is published, and dates that haven't been announced are never guessed.",
    '',
    `As of ${today}, ConAtlas TX lists ${plural(upcoming.length)}. The site rebuilds every morning. Each convention page shows its official sources and the day they were last checked. Convention data is licensed CC BY 4.0, and the source data is in the data/ folder of ${REPO_URL}.`,
    '',
    '## Upcoming conventions',
    '',
    ...upcoming.map(line),
    ...(awaiting.length ? ['', '## Next dates not announced', '', ...awaiting.map(line)] : []),
    '',
    '## Regions',
    '',
    ...regions,
    ...(cities.length ? ['', '## Cities', '', ...cities] : []),
    '',
    '## Calendar feeds',
    '',
    ...feeds,
    '',
    '## About',
    '',
    `- [Upcoming conventions](${url(href())}): the full list, soonest first`,
    `- [Month calendar](${url(href('calendar/'))}): the same conventions on a month grid`,
    `- [How dates are verified](${url(href('about/#verify'))})`,
    `- [Data policy](${REPO_URL}/blob/main/docs/DATA_POLICY.md): what counts as an official source`,
    `- [Suggest a convention or correction](${url(href('contribute/'))})`,
    '',
  ].join('\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
