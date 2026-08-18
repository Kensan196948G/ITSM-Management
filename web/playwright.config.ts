import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/e2e',
  // CI ではアプリ本体の E2E（app.spec.ts）のみ実行。
  // visual.spec.ts はデプロイ環境検証用（web/playwright.visual.config.ts で実行）
  testMatch: 'app.spec.ts',
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
