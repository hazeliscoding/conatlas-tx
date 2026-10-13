import { defineConfig, devices } from '@playwright/test';

// Tests run against the built site (`pnpm build` first). Locally an already running
// `pnpm preview` is reused; CI starts its own.
const baseURL = 'http://localhost:4329/';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm preview --port 4329',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
