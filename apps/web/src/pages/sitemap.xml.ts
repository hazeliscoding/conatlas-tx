// Every indexable page for search engines, with each convention page's last edit; robots.txt
// points here. Left out: Saved and 404 (noindex), the current month's dated page (/calendar/ is
// its canonical), months with nothing on them and regions with nothing upcoming (noindex), and
// cities without a page of their own (redirects).
import { REGIONS, todayIn } from '@conatlas/core';
import type { APIRoute } from 'astro';
import { calendarMonths, inMonth } from '../lib/calendar.ts';
import { cityPages, detailHref, getDataset, getUpcoming, href, regionHref } from '../lib/data.ts';

export const GET: APIRoute = ({ site }) => {
  const listings = getUpcoming();
  const [, ...later] = calendarMonths(todayIn('America/Chicago'), listings);
  const pages: { path: string; lastmod?: string }[] = [
    { path: href() },
    { path: href('calendar/') },
    ...later
      .filter((month) => inMonth(listings, month).length > 0)
      .map((month) => ({ path: href(`calendar/${month}/`) })),
    ...REGIONS.filter((region) => listings.some((e) => e.region === region && !e.awaitingNext)).map(
      (region) => ({ path: regionHref(region) }),
    ),
    ...[...cityPages(listings).values()].map((path) => ({ path })),
    ...getDataset().series.map((s) => ({ path: detailHref(s) })),
    ...getDataset().editions.map((e) => ({ path: detailHref(e), lastmod: e.updated_at })),
    { path: href('about/') },
    { path: href('contribute/') },
  ];
  const urls = pages.map(
    ({ path, lastmod }) =>
      `  <url><loc>${new URL(path, site)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
  );
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
