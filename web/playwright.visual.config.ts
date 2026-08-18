import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../tests/e2e',
  testMatch: 'visual.spec.ts',
  timeout: 60000,
  use: {
    baseURL: 'https://itsm-management.mirai-dx-platform.com',
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
