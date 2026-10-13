import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'],
    // The CLI tests start several Node processes each, which takes seconds on Windows.
    testTimeout: 30_000,
  },
});
