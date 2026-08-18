import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:8793',
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
