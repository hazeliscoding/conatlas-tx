import { fileURLToPath } from 'node:url';
import { loadDataset } from '../packages/core/src/load.ts';
import { expect, test } from '@playwright/test';

const { dataset } = loadDataset(fileURLToPath(new URL('../data', import.meta.url)));
const SITE = 'https://conatlas-tx.vercel.app/';

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
  }
  expect(titles.size, 'every page has its own title').toBe(locs.length);
});

test('event data appears only for editions with confirmed dates', async ({ page }) => {
  for (const edition of dataset.editions) {
    await page.goto(`cons/${edition.slug}/`);
    const scripts = page.locator('script[type="application/ld+json"]');
    if (edition.status === 'confirmed' || edition.status === 'completed') {
      const data = JSON.parse((await scripts.first().textContent())!);
      expect(data, edition.id).toMatchObject({
        '@type': 'Event',
        startDate: edition.start_date,
        endDate: edition.end_date,
      });
    } else {
      await expect(scripts, edition.id).toHaveCount(0);
    }
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
  expect(body).not.toMatch(/Disallow:\s*\S/);
});
