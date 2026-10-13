import { fileURLToPath } from 'node:url';
import { loadDataset } from '../packages/core/src/load.ts';
import { expect, test, type Page } from '@playwright/test';

const { dataset } = loadDataset(fileURLToPath(new URL('../data', import.meta.url)));

const cardLinks = (page: Page) =>
  page
    .locator('[data-listing] h3 a')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')!));

test('every published convention is on the home page and opens its own page', async ({ page }) => {
  await page.goto('./');
  const titles = await page.locator('[data-listing] h3').allTextContents();
  for (const series of dataset.series) {
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

  await page.goto('./?region=west');
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
