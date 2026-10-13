import { test } from '@playwright/test';

// Full-page captures of each page type, for comparing against the design by eye.
// They land in test-results/screens/, which Playwright clears at the start of every run.
const PAGES = {
  home: './',
  calendar: 'calendar/2027-01/',
  detail: 'cons/ushicon-2027/',
  past: 'cons/anime-matsuri-2026/',
  about: 'about/',
  saved: 'saved/',
  contribute: 'contribute/?con=ushicon-2027',
};
// Two saved conventions, so the Saved page and the Save buttons show their saved state.
const SAVED = ['ushicon-2027', 'san-japan-2027'];

// For looking at locally; CI doesn't keep them, and its headless Chromium sometimes fails a capture.
test.skip(!!process.env.CI, 'screenshots are for local design review');

for (const theme of ['light', 'dark']) {
  for (const [name, path] of Object.entries(PAGES)) {
    test(`screenshot ${name} (${theme})`, async ({ page }, info) => {
      await page.addInitScript(
        ([t, saved]) => {
          localStorage.setItem('theme', t);
          localStorage.setItem('conatlas-saved', saved);
        },
        [theme, JSON.stringify(SAVED)],
      );
      await page.goto(path);
      await page.screenshot({
        path: `test-results/screens/${info.project.name}-${theme}-${name}.png`,
        fullPage: true,
      });
    });
  }
}
