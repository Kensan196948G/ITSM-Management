/**
 * ビジュアル・レスポンシブ確認（デプロイ環境向け）
 * 実行: npx playwright test --config /tmp/pw-visual.config.ts
 * スクリーンショットは test-results/visual/ に保存
 */
import { test, expect } from '@playwright/test';

test.describe('ビジュアル確認', () => {
  test('ログイン画面（デスクトップ）', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.login-card')).toBeVisible();
    await page.screenshot({ path: 'test-results/visual/01-login-desktop.png', fullPage: true });
  });

  test('ダッシュボード（デスクトップ）', async ({ page }) => {
    await page.goto('/');
    await page.fill('#username', 'tanaka');
    await page.fill('#password', 'Mirai#2026');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.content h1', { timeout: 15000 });
    await expect(page.locator('.content h1')).toHaveText('ダッシュボード');
    await page.screenshot({ path: 'test-results/visual/02-dashboard-desktop.png', fullPage: true });
  });

  test('インシデント一覧（デスクトップ）', async ({ page }) => {
    await page.goto('/');
    await page.fill('#username', 'tanaka');
    await page.fill('#password', 'Mirai#2026');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.content h1', { timeout: 15000 });
    await page.click('.sidebar__item >> nth=1');
    await page.waitForSelector('.tbl tbody tr', { timeout: 15000 });
    await expect(page.locator('.content h1')).toHaveText('インシデント管理');
    await page.screenshot({ path: 'test-results/visual/03-incidents-desktop.png', fullPage: true });
  });

  test('ダッシュボード（モバイル 390px）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.fill('#username', 'tanaka');
    await page.fill('#password', 'Mirai#2026');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.content h1', { timeout: 15000 });
    // モバイルではサイドバーが折りたたまれる（オーバーフローなし）
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(overflowX).toBe(true);
    await page.screenshot({ path: 'test-results/visual/04-dashboard-mobile.png', fullPage: true });
  });

  test('インシデント一覧（モバイル）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.fill('#username', 'tanaka');
    await page.fill('#password', 'Mirai#2026');
    await page.click('button[type="submit"]');
    await page.waitForSelector('.content h1', { timeout: 15000 });
    // モバイル: ハンバーガーメニューでサイドバーを開く
    await page.click('.header__left .icon-btn');
    await page.waitForSelector('.sidebar--open', { timeout: 10000 });
    await page.click('.sidebar__item >> nth=1');
    await page.waitForSelector('.tbl tbody tr', { timeout: 15000 });
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(overflowX).toBe(true);
    await page.screenshot({ path: 'test-results/visual/05-incidents-mobile.png', fullPage: true });
  });

  test('キーボード操作: Tab 移動 + Enter ログイン', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#username', { timeout: 15000 });
    // autoFocus により username にフォーカスされる（描画タイミングのため短いリトライ）
    let focused = '';
    for (let i = 0; i < 10 && !focused; i++) {
      await page.waitForTimeout(100);
      focused = await page.evaluate(() => document.activeElement?.id ?? '');
    }
    expect(focused).toBe('username');
    // Tab で password へ移動
    await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focused2).toBe('password');
    // キーボードのみでログイン（Enter）
    await page.fill('#username', 'tanaka');
    await page.fill('#password', 'Mirai#2026');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.content h1', { timeout: 15000 });
    await expect(page.locator('.content h1')).toHaveText('ダッシュボード');
  });
});
