import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REGIONS } from '../packages/core/src/schema.ts';
import { todayIn } from '../packages/core/src/dates.ts';
import { loadDataset } from '../packages/core/src/load.ts';
import { expect, test } from '@playwright/test';
import ICAL from 'ical.js';

const { dataset } = loadDataset(fileURLToPath(new URL('../data', import.meta.url)));
const FORMS_DIR = fileURLToPath(new URL('../.github/ISSUE_TEMPLATE/', import.meta.url));
const NEW_ISSUE = 'https://github.com/hazeliscoding/conatlas-tx/issues/new';
const today = todayIn('America/Chicago');
const seriesName = (id: string) => dataset.series.find((s) => s.id === id)!.name;
// An edition that gets a Save button, an "Add to calendar" menu and a place in the export.
const upcoming = dataset.editions.find((e) => e.status === 'confirmed' && e.end_date! >= today)!;
const title = `${seriesName(upcoming.series)} ${upcoming.edition}`;
const cardName = upcoming.name ?? seriesName(upcoming.series);

/** UIDs of the events in an iCalendar file; ical.js throws if the file doesn't parse. */
const uids = (text: string) =>
  new ICAL.Component(ICAL.parse(text))
    .getAllSubcomponents('vevent')
    .map((event) => event.getFirstPropertyValue('uid'));

test('saved conventions survive a reload, list on the Saved page and export', async ({ page }) => {
  await page.goto('saved/');
  await expect(page.getByText('Your con adventure starts here.')).toBeVisible();

  await page.goto('./');
  const save = page.locator(`[data-listing="${upcoming.id}"] [data-save]`);
  await expect(save).toHaveAccessibleDescription(cardName);
  await expect(save).toHaveAccessibleName('Save');
  await save.click();
  await expect(save).toHaveAttribute('data-saved');
  await expect(save).toHaveAccessibleName('Saved');
  await page.reload();
  await expect(save).toHaveAttribute('data-saved');
  await expect(page.locator('[data-saved-count]').first()).toHaveText('1');

  await page.goto('saved/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('1 saved convention');
  await expect(page.locator('[data-listing]:visible')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all (.ics)' }).click();
  const file = readFileSync((await (await download).path())!, 'utf8');
  expect(uids(file)).toEqual([`${upcoming.id}@conatlas-tx`]);

  // Unsaving keeps the card until the page is left, so it can be saved again in one click.
  const card = page.locator(`[data-listing="${upcoming.id}"]`);
  await card.locator('[data-save]').click();
  await expect(card.locator('[data-save]')).not.toHaveAttribute('data-saved');
  await expect(card).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your saved conventions');
  await page.reload();
  await expect(page.getByText('Your con adventure starts here.')).toBeVisible();
});

test('every calendar file parses and holds the right editions', async ({ request }) => {
  const dated = dataset.editions.filter((e) => e.start_date);
  for (const feed of ['all', ...REGIONS]) {
    const response = await request.get(`feeds/${feed}.ics`);
    expect(response.status(), feed).toBe(200);
    const expected = dated.filter((e) => feed === 'all' || e.region === feed);
    expect(uids(await response.text()).sort(), feed).toEqual(
      expected.map((e) => `${e.id}@conatlas-tx`).sort(),
    );
  }
  for (const edition of dated) {
    const response = await request.get(`cons/${edition.slug}.ics`);
    expect(response.status(), edition.id).toBe(200);
    expect(uids(await response.text())).toEqual([`${edition.id}@conatlas-tx`]);
  }
});

test('a convention page offers its calendar file and Google Calendar', async ({ page }) => {
  await page.goto(`cons/${upcoming.slug}/`);
  const menu = page.locator('details[data-menu]');
  await menu.locator('summary').click();
  const ics = page.getByRole('link', { name: /Download \.ics/ });
  expect(await ics.getAttribute('href')).toMatch(new RegExp(`/cons/${upcoming.slug}\\.ics$`));
  const google = await page.getByRole('link', { name: /Google Calendar/ }).getAttribute('href');
  expect(google).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&/);
  await page.keyboard.press('Escape');
  await expect(ics).toBeHidden();
});

test('every contribution path opens an issue form that exists', async ({ page }) => {
  const forms = readdirSync(FORMS_DIR);
  await page.goto('contribute/');
  const links = page.locator('a[data-issue]');
  await expect(links).toHaveCount(5);
  for (const href of await links.evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).href),
  )) {
    const url = new URL(href);
    expect(`${url.origin}${url.pathname}`).toBe(NEW_ISSUE);
    expect(forms).toContain(url.searchParams.get('template'));
  }
});

test('reporting from a convention page prefills the forms', async ({ page }) => {
  await page.goto(`cons/${upcoming.slug}/`);
  await page.getByRole('link', { name: 'Report a problem' }).click();
  await expect(page).toHaveURL(new RegExp(`/contribute/\\?con=${upcoming.id}$`));
  await expect(page.locator('[data-report]')).toContainText(title);

  for (const link of await page.locator('a[data-issue]').all()) {
    const url = new URL((await link.getAttribute('href'))!);
    const template = url.searchParams.get('template')!;
    if (template === 'new-convention.yml') {
      // A listed con is never a missing one, so this form stays blank.
      expect(url.searchParams.get('title')).toBe('[New con]: ');
      expect(url.searchParams.has('convention')).toBe(false);
      continue;
    }
    expect(url.searchParams.get('title')).toBe(
      `${await link.getAttribute('data-prefix')}: ${title}`,
    );
    expect(url.searchParams.get('convention')).toBe(title);
    // The prefilled field has to exist in the form, or GitHub drops the value.
    expect(readFileSync(`${FORMS_DIR}/${template}`, 'utf8')).toMatch(/^\s+id: convention$/m);
  }
  const mail = await page.getByRole('link', { name: 'Email the maintainers' }).getAttribute('href');
  expect(mail).toContain(`subject=ConAtlas%20TX%20correction%3A%20`);

  await page.getByRole('button', { name: 'Stop reporting this convention' }).click();
  await expect(page.locator('[data-report]')).toBeHidden();
  await expect(page).toHaveURL(/\/contribute\/$/);
  const first = new URL((await page.locator('a[data-issue]').first().getAttribute('href'))!);
  expect(first.searchParams.get('title')).toBe('[New con]: ');
});

test('the Contribute page ignores ids that are not editions', async ({ page }) => {
  for (const con of ['constructor', '<b>hi</b>']) {
    await page.goto(`contribute/?con=${encodeURIComponent(con)}`);
    await expect(page.locator('[data-report]')).toBeHidden();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('save buttons stay hidden and the Saved page explains why', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('[data-save]').first()).toBeHidden();
    await page.goto('saved/');
    await expect(page.locator('[data-saved-nojs]')).toBeVisible();
    await expect(page.locator('[data-listing]').first()).toBeHidden();
  });

  test('the calendar menu still opens', async ({ page }) => {
    await page.goto(`cons/${upcoming.slug}/`);
    await page.locator('details[data-menu] summary').click();
    await expect(page.getByRole('link', { name: /Download \.ics/ })).toBeVisible();
  });
});
