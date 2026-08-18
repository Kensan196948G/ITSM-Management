/**
 * E2Eテスト（Playwright）: ログイン → ダッシュボード → インシデントCRUD → RBAC
 * 実行: 事前に worker を http://127.0.0.1:8793 で起動 → npx playwright test
 */
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, username: string, password: string) {
  await page.goto('/');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForSelector('.content h1', { timeout: 15000 });
}

test('ログイン → ダッシュボード表示', async ({ page }) => {
  await login(page, 'tanaka', 'Mirai#2026');
  await expect(page.locator('.content h1')).toHaveText('ダッシュボード');
  await expect(page.locator('.kpi')).toHaveCount(5);
  await expect(page.locator('.card')).toHaveCount(5);
});

test('インシデント一覧表示', async ({ page }) => {
  await login(page, 'tanaka', 'Mirai#2026');
  await page.click('.sidebar__item >> nth=1');
  await page.waitForSelector('.tbl tbody tr', { timeout: 15000 });
  await expect(page.locator('.content h1')).toHaveText('インシデント管理');
  const rows = await page.locator('.tbl tbody tr').count();
  expect(rows).toBeGreaterThan(0);
});

test('インシデント新規作成モーダルが開く', async ({ page }) => {
  await login(page, 'tanaka', 'Mirai#2026');
  await page.click('.sidebar__item >> nth=1');
  await page.waitForSelector('.page-head__actions .btn--primary', { timeout: 15000 });
  await page.click('.page-head__actions .btn--primary');
  await expect(page.locator('.modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).toHaveCount(0);
});

test('ダークモード切替', async ({ page }) => {
  await login(page, 'tanaka', 'Mirai#2026');
  await page.click('.header__right .icon-btn');
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(theme).toBe('dark');
});

test('viewerは作成ボタンが無効（RBAC）', async ({ page }) => {
  await login(page, 'takahashi', 'Mirai#2026');
  await page.click('.sidebar__item >> nth=1');
  await page.waitForSelector('.tbl tbody tr', { timeout: 15000 });
  const createBtnCount = await page.locator('.page-head__actions .btn--primary').count();
  expect(createBtnCount).toBe(0);
});

test('ログアウト機能', async ({ page }) => {
  await login(page, 'tanaka', 'Mirai#2026');
  await page.getByRole('button', { name: 'ログアウト' }).click();
  await expect(page.locator('.login-card')).toBeVisible();
});

test('キーボード操作: モーダルのEscで閉じる', async ({ page }) => {
  await login(page, 'tanaka', 'Mirai#2026');
  await page.click('.sidebar__item >> nth=1');
  await page.waitForSelector('.page-head__actions .btn--primary', { timeout: 15000 });
  await page.click('.page-head__actions .btn--primary');
  await expect(page.locator('.modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal')).toHaveCount(0);
});
