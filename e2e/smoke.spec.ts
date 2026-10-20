import { fileURLToPath } from 'node:url';
import { loadDataset } from '../packages/core/src/load.ts';
import { expect, test, type Page } from '@playwright/test';

const { dataset } = loadDataset(fileURLToPath(new URL('../data', import.meta.url)));

const cardLinks = (page: Page) =>
  page
    .locator('[data-listing] h3 a')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')!));

test('every active convention is on the home page and opens its own page', async ({ page }) => {
  await page.goto('./');
  const titles = await page.locator('[data-listing] h3').allTextContents();
  // Series that have ended or are on hiatus leave the lists (see places.spec.ts).
  for (const series of dataset.series.filter((s) => s.status === 'active')) {
    expect(
      titles.some((t) => t.includes(series.name)),
      series.name,
    ).toBe(true);
  }

  for (const href of await cardLinks(page)) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    const official = page.getByRole('link', { name: /Visit official site/ });
    expect(await official.getAttribute('href')).toMatch(/^https:\/\//);
    await expect(page.locator('#verify-h')).toHaveText('Verification');
  }
});

test('every convention has a page linking each of its editions, and each edition links back', async ({
  page,
}) => {
  for (const series of dataset.series) {
    const pages = dataset.editions
      .filter((e) => e.series === series.id)
      .map((e) => `/cons/${e.slug}/`);
    expect((await page.goto(`cons/${series.slug}/`))?.status(), series.slug).toBe(200);
    await expect(page.locator('h1')).toHaveText(series.name);
    const linked = await page
      .locator('main a[href^="/cons/"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
    expect(new Set(linked), series.slug).toEqual(new Set(pages));
    await page.goto(pages[0]!);
    await expect(page.locator('nav[aria-label="Breadcrumb"] a').nth(1)).toHaveAttribute(
      'href',
      `/cons/${series.slug}/`,
    );
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the full timeline renders and the filter bar stays hidden', async ({ page }) => {
    await page.goto('./');
    const titles = await page.locator('[data-listing] h3').allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    await expect(page.locator('[data-filters]')).toBeHidden();
    await expect(page.locator('[data-listing] time').first()).toBeVisible();
  });
});

test('filters narrow the timeline and round-trip through the URL', async ({ page }) => {
  await page.goto('./');
  const all = (await cardLinks(page)).length;

  await page.getByText('Gulf Coast', { exact: true }).first().click();
  await expect(page).toHaveURL(/\?region=gulf-coast$/);
  const visible = page.locator('[data-listing]:visible');
  expect(await visible.count()).toBeLessThan(all);
  for (const region of await visible.evaluateAll((cards) => cards.map((c) => c.dataset.region))) {
    expect(region).toBe('gulf-coast');
  }

  // A region plus a city from another region matches nothing, whatever the data holds.
  await page.goto('./?region=west&city=Houston');
  await expect(page.locator('[data-filter-empty]')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  expect(await page.locator('[data-listing]:visible').count()).toBe(all);
});

test('calendar months link to each other and keep the region filter', async ({ page }) => {
  await page.goto('calendar/?region=central');
  await page.getByRole('link', { name: 'Next month' }).click();
  await expect(page).toHaveURL(/\/calendar\/\d{4}-\d{2}\/\?region=central$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible();
});

test('unknown pages show the not-found page', async ({ page }) => {
  await page.goto('404.html');
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
});

test('conventions with an age limit say so on their card and page', async ({ page }) => {
  const limited = dataset.editions.filter((e) => e.min_age);
  test.skip(limited.length === 0, 'no edition has an age limit');
  const label = (e: (typeof limited)[number]) => `Ages ${e.min_age}+`;
  await page.goto('./');
  const listed = new Set(
    await page
      .locator('[data-listing]')
      .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-listing'))),
  );
  for (const e of limited) {
    if (listed.has(e.id)) {
      await expect(page.locator(`[data-listing="${e.id}"] [data-min-age]`), e.id).toHaveText(
        label(e),
      );
    }
  }
  for (const e of limited) {
    await page.goto(`cons/${e.slug}/`);
    // The hero's label comes before any nearby convention cards.
    await expect(page.locator('main [data-min-age]').first(), e.id).toHaveText(label(e));
    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((s) => JSON.parse(s.textContent!)));
    const event = types.find((t) => t['@type'] === 'Event');
    if (event) expect(event.typicalAgeRange, e.id).toBe(`${e.min_age}-`);
    await expect(page.locator('[data-age-notice]'), e.id).toContainText('may show mature content');
  }
});

test('Hide 18+ filters out conventions with an age limit and round-trips through the URL', async ({
  page,
}) => {
  const limited = new Set(dataset.editions.filter((e) => e.min_age).map((e) => e.id));
  await page.goto('./');
  const all = await page
    .locator('[data-listing]')
    .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-listing')!));
  test.skip(!all.some((id) => limited.has(id)), 'no listed convention has an age limit');
  await page.getByText('Hide 18+', { exact: true }).first().click();
  await expect(page).toHaveURL(/\?hide=adult$/);
  const visible = await page
    .locator('[data-listing]:visible')
    .evaluateAll((cards) => cards.map((c) => c.getAttribute('data-listing')!));
  expect(visible).toEqual(all.filter((id) => !limited.has(id)));
  await page.reload();
  await expect(page.locator('input[name="hide"]')).toBeChecked();
  expect(await page.locator('[data-listing]:visible').count()).toBe(visible.length);
});
