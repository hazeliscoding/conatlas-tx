import { test } from '@playwright/test';

// Full-page captures of each page type, for comparing against the design by eye.
// They land in test-results/screens/, which Playwright clears at the start of every run.
const PAGES = {
  home: './',
  calendar: 'calendar/2027-01/',
  detail: 'cons/ushicon-2027/',
  about: 'about/',
};

for (const theme of ['light', 'dark']) {
  for (const [name, path] of Object.entries(PAGES)) {
    test(`screenshot ${name} (${theme})`, async ({ page }, info) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto(path);
      await page.screenshot({
        path: `test-results/screens/${info.project.name}-${theme}-${name}.png`,
        fullPage: true,
      });
    });
  }
}
