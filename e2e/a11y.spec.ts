import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// One of each page type, in both themes. Serious and critical WCAG 2.2 AA issues fail the run.
const PAGES = [
  './',
  'calendar/',
  'calendar/2027-01/',
  'cons/ushicon-2027/',
  'cons/anime-matsuri-2026/',
  'about/',
];

for (const theme of ['light', 'dark']) {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility issues (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(serious).toEqual([]);
    });
  }
}
