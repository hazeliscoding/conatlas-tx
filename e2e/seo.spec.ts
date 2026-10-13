import { fileURLToPath } from 'node:url';
import { loadDataset } from '../packages/core/src/load.ts';
import { todayIn } from '../packages/core/src/dates.ts';
import { REGIONS } from '../packages/core/src/schema.ts';
import { cityPath, pagedCities, regionPath, upcoming } from './places.ts';
import { expect, test, type Page } from '@playwright/test';

const { dataset } = loadDataset(fileURLToPath(new URL('../data', import.meta.url)));
const SITE = 'https://conatlas-tx.vercel.app/';

/** Every JSON-LD block on the page, parsed (a block that isn't valid JSON fails the test). */
const jsonLd = async (page: Page): Promise<Record<string, unknown>[]> =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) =>
    JSON.parse(text),
  );
const ofType = (blocks: Record<string, unknown>[], type: string) =>
  blocks.filter((b) => b['@type'] === type);

test('the sitemap lists every indexable page, each with matching canonical and social tags', async ({
  page,
  request,
}) => {
  const xml = await (await request.get('sitemap.xml')).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  for (const edition of dataset.editions) expect(locs).toContain(`${SITE}cons/${edition.slug}/`);
  for (const path of ['', 'calendar/', 'about/', 'contribute/'])
    expect(locs).toContain(SITE + path);
  expect(locs.some((loc) => loc.includes('/saved/'))).toBe(false);

  const titles = new Set<string>();
  for (const loc of locs) {
    const path = loc.slice(SITE.length);
    const response = await page.goto(path || './');
    expect(response?.status(), path).toBe(200);
    const head = page.locator('head');
    await expect(head.locator('link[rel="canonical"]'), path).toHaveAttribute('href', loc);
    await expect(head.locator('meta[property="og:url"]'), path).toHaveAttribute('content', loc);
    await expect(head.locator('meta[name="robots"]'), path).toHaveCount(0);
    titles.add(await page.title());
    // The site name lives on the home page only, and only convention pages describe an event.
    const blocks = await jsonLd(page);
    expect(ofType(blocks, 'WebSite'), path).toEqual(
      path === ''
        ? [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'ConAtlas TX', url: SITE }]
        : [],
    );
    if (!path.startsWith('cons/')) expect(ofType(blocks, 'Event'), path).toEqual([]);
  }
  expect(titles.size, 'every page has its own title').toBe(locs.length);
});

test('every dated edition carries event data with its status, built only from its record', async ({
  page,
}) => {
  const STATUS = {
    confirmed: 'EventScheduled',
    completed: 'EventScheduled',
    postponed: 'EventPostponed',
    cancelled: 'EventCancelled',
  } as Record<string, string>;
  for (const edition of dataset.editions) {
    await page.goto(`cons/${edition.slug}/`);
    const events = ofType(await jsonLd(page), 'Event');
    if (!edition.start_date) {
      expect(events, edition.id).toEqual([]);
      continue;
    }
    expect(events, edition.id).toHaveLength(1);
    const event = events[0] as {
      location: { name?: string; address: Record<string, string> };
      organizer?: Record<string, string>;
    } & Record<string, unknown>;
    const series = dataset.series.find((s) => s.id === edition.series)!;
    expect(event, edition.id).toMatchObject({
      startDate: edition.start_date,
      endDate: edition.end_date,
      eventStatus: `https://schema.org/${STATUS[edition.status]}`,
      url: `${SITE}cons/${edition.slug}/`,
    });
    expect(event.location.name, edition.id).toBe(edition.venue?.name);
    const { address } = event.location;
    expect(address, edition.id).toMatchObject({
      addressLocality: edition.city,
      addressRegion: 'TX',
      addressCountry: 'US',
    });
    // A street and ZIP only ever come from the venue address the page shows, split exactly.
    if (address.streetAddress) {
      const shown = edition.venue?.address ?? '';
      expect(shown.startsWith(`${address.streetAddress}, ${edition.city}, `), edition.id).toBe(
        true,
      );
      expect(shown.endsWith(` ${address.postalCode}`), edition.id).toBe(true);
    }
    expect(event.organizer, edition.id).toEqual(
      series.organizer ? { '@type': 'Organization', name: series.organizer } : undefined,
    );
    for (const key of ['eventAttendanceMode', 'image', 'offers', 'performer']) {
      expect(event, `${edition.id} ${key}`).not.toHaveProperty(key);
    }
  }
});

test('breadcrumb data matches the visible breadcrumb', async ({ page }) => {
  const paths = [
    ...dataset.editions.map((e) => `cons/${e.slug}/`),
    'contribute/',
    ...REGIONS.map((r) => regionPath(r).slice(1)),
    ...pagedCities.map((c) => cityPath(c).slice(1)),
  ];
  for (const path of paths) {
    await page.goto(path);
    const lists = ofType(await jsonLd(page), 'BreadcrumbList');
    expect(lists, path).toHaveLength(1);
    const items = lists[0]!.itemListElement as { position: number; name: string; item?: string }[];
    const crumbs = page.locator('nav[aria-label="Breadcrumb"] li');
    expect(
      items.map((i) => i.name),
      path,
    ).toEqual((await crumbs.allTextContents()).map((t) => t.trim()));
    expect(
      items.map((i) => i.position),
      path,
    ).toEqual(items.map((_, i) => i + 1));
    const hrefs = await crumbs.evaluateAll((lis) =>
      lis.map((li) => li.querySelector('a')?.href ?? null),
    );
    // Linked crumbs point where their link goes (on the production host); the last has none.
    expect(
      items.map((i) => i.item ?? null),
      path,
    ).toEqual(hrefs.map((h) => (h ? new URL(new URL(h).pathname, SITE).href : null)));
    expect(items.at(-1)!.item, path).toBeUndefined();
  }
});

test('Saved and not-found pages stay out of search', async ({ page }) => {
  for (const path of ['saved/', '404.html']) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', 'noindex');
  }
});

test('robots.txt allows crawling and points to the sitemap', async ({ request }) => {
  const response = await request.get('robots.txt');
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain(`Sitemap: ${SITE}sitemap.xml`);
  expect(body).toContain(`${SITE}llms.txt`);
  expect(body).not.toMatch(/Disallow:\s*\S/);
});

test('every month heading on the home page links to an indexable calendar page', async ({
  page,
}) => {
  await page.goto('./');
  const links = await page
    .locator('.tl__month a')
    // Paths, not attributes: the filter script rewrites these links' hrefs as absolute URLs.
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname));
  expect(links.length).toBeGreaterThan(0);
  for (const link of links) {
    expect(link).toMatch(/^\/calendar\/(\d{4}-\d{2}\/)?$/);
    expect((await page.goto(link))?.status(), link).toBe(200);
    await expect(page.locator('meta[name="robots"]'), link).toHaveCount(0);
  }
});

test("the current month's dated page points search engines at /calendar/", async ({ page }) => {
  await page.goto(`calendar/${todayIn('America/Chicago').slice(0, 7)}/`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}calendar/`);
});

test('region and city pages follow the index rules', async ({ page, request }) => {
  const xml = await (await request.get('sitemap.xml')).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  for (const region of REGIONS) {
    const listed = upcoming.some((e) => e.region === region);
    expect(locs.includes(new URL(regionPath(region), SITE).href), region).toBe(listed);
    if (!listed) {
      await page.goto(regionPath(region));
      await expect(page.locator('meta[name="robots"]'), region).toHaveAttribute(
        'content',
        'noindex',
      );
    }
  }
  expect(locs.filter((loc) => loc.includes('/cities/')).sort()).toEqual(
    pagedCities.map((city) => new URL(cityPath(city), SITE).href).sort(),
  );
});

test('llms.txt lists every listed convention with the summary its page shows', async ({
  page,
  request,
}) => {
  const response = await request.get('llms.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  const text = await response.text();
  expect(text.startsWith('# ConAtlas TX\n\n> ')).toBe(true);
  const lines = [...text.matchAll(/^- \[[^\]]+\]\((https:\/\/[^)]+\/cons\/[^)]+)\): (.+)$/gm)];
  for (const edition of upcoming) {
    expect(text, edition.id).toContain(`${SITE}cons/${edition.slug}/`);
  }
  for (const [, link, summary] of lines) {
    await page.goto(new URL(link!).pathname);
    await expect(page.locator('[data-summary]'), link).toHaveText(summary!);
  }
});
