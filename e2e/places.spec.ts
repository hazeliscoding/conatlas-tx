import { REGION_NAMES, REGIONS } from '../packages/core/src/schema.ts';
import { cityPath, dataset, pagedCities, regionPath, upcoming } from './places.ts';
import { expect, test, type Page } from '@playwright/test';

const listingIds = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-listing')!));

test('region cards open region pages listing the same conventions as the home page', async ({
  page,
}) => {
  await page.goto('./');
  const cards = await page
    .locator('a.region')
    .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).pathname));
  expect(cards).toEqual(REGIONS.map(regionPath));
  const home = new Map<string, string[]>();
  for (const region of REGIONS) {
    home.set(region, await listingIds(page, `[data-listing][data-region="${region}"]`));
  }

  for (const region of REGIONS) {
    const response = await page.goto(regionPath(region));
    expect(response?.status(), region).toBe(200);
    await expect(page.locator('h1')).toHaveText(`${REGION_NAMES[region]} anime conventions`);
    expect(await listingIds(page, '[data-listing]'), region).toEqual(home.get(region));
    // The page is the region, so cards don't repeat it.
    await expect(page.locator('.ev__eyebrow')).toHaveCount(0);
    const n = upcoming.filter((e) => e.region === region).length;
    if (n > 0) {
      await expect(page.locator('h1 + p')).toContainText(`We list ${n} upcoming`);
      // Sentences built from separate pieces still have their spaces ("Mesquite. Next up:").
      expect(await page.locator('h1 + p').textContent(), region).not.toMatch(/[.,:][A-Za-z]/);
    } else if (home.get(region)!.length === 0) {
      await expect(page.getByText('Nothing here yet')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Suggest a convention', exact: true }).first(),
      ).toHaveAttribute('href', '/contribute/');
    }
  }
});

test('cities with three upcoming conventions get a page; others redirect to their region', async ({
  page,
}) => {
  const regions = new Map(dataset.editions.map((e) => [e.city, e.region]));
  for (const [city, region] of regions) {
    await page.goto(cityPath(city));
    if (!pagedCities.includes(city)) {
      await page.waitForURL(`**${regionPath(region)}`);
      continue;
    }
    await expect(page.locator('h1')).toHaveText(`${city} anime conventions`);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    const cities = await page
      .locator('[data-listing]')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-city')));
    expect(new Set(cities), city).toEqual(new Set([city]));
    await expect(page.locator('nav[aria-label="Breadcrumb"] a').nth(1)).toHaveAttribute(
      'href',
      regionPath(region),
    );
    // The region page points back with a city guide link.
    await page.goto(regionPath(region));
    await expect(page.getByRole('link', { name: `${city} anime conventions` })).toHaveAttribute(
      'href',
      cityPath(city),
    );
  }
});

test('convention pages link their region, and their city when it has a page', async ({ page }) => {
  for (const edition of dataset.editions) {
    await page.goto(`cons/${edition.slug}/`);
    const main = page.locator('main');
    expect(await main.locator(`a[href="${regionPath(edition.region)}"]`).count(), edition.id).toBe(
      1,
    );
    expect(await main.locator(`a[href="${cityPath(edition.city)}"]`).count(), edition.id).toBe(
      pagedCities.includes(edition.city) ? 1 : 0,
    );
  }
});

test('the footer lists every region', async ({ page }) => {
  await page.goto('./');
  const links = page.locator('footer nav[aria-label="Discover"] a[href^="/regions/"]');
  await expect(links).toHaveText(REGIONS.map((r) => REGION_NAMES[r]));
  expect(await links.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname))).toEqual(
    REGIONS.map(regionPath),
  );
});

test('the header Regions link reaches the region cards and marks region and city pages', async ({
  page,
}) => {
  await page.goto('calendar/');
  // Under 768px the nav sits in the menu.
  if (!(await page.locator('.hdr__nav').isVisible())) await page.locator('.hdr__menu').click();
  const link = page.locator('nav[aria-label="Primary"] a:visible', { hasText: 'Regions' });
  await expect(link).not.toHaveAttribute('aria-current');
  await link.click();
  await expect(page).toHaveURL(/\/#regions$/);
  await expect(page.locator('#regions')).toBeInViewport();
  for (const path of [regionPath(REGIONS[0]), ...pagedCities.map(cityPath)]) {
    await page.goto(path);
    await expect(page.locator('.hdr__nav [aria-current="page"]'), path).toHaveText('Regions');
  }
});

test('region and city pages offer the right calendar feeds', async ({ page }) => {
  const dated = new Set(dataset.editions.filter((e) => e.start_date).map((e) => e.region));
  for (const region of REGIONS) {
    await page.goto(regionPath(region));
    const feeds = page.locator('.feeds__url');
    await expect(feeds.filter({ hasText: 'feeds/all.ics' })).toHaveCount(1);
    await expect(feeds.filter({ hasText: `feeds/${region}.ics` })).toHaveCount(
      dated.has(region) ? 1 : 0,
    );
    if (!dated.has(region)) {
      await expect(page.getByText(`${REGION_NAMES[region]} gets its own feed`)).toBeVisible();
    }
  }
  for (const city of pagedCities) {
    await page.goto(cityPath(city));
    await expect(page.getByText(`${city} has no feed of its own`)).toBeVisible();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('region and city pages show every fact', async ({ page }) => {
    const paths = [
      ...REGIONS.filter((r) => upcoming.some((e) => e.region === r)).map(regionPath),
      ...pagedCities.map(cityPath),
    ];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('h1 + p'), path).toContainText('We list');
      await expect(page.locator('[data-listing] time').first(), path).toBeVisible();
      await expect(page.locator('.feeds__row').first(), path).toBeVisible();
      await expect(page.locator('[data-filters]'), path).toHaveCount(0);
    }
  });
});
