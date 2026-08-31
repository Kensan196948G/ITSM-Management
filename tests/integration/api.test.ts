/**
 * 統合テスト: API + ローカル D1（node:sqlite / in-memory）
 * 実行: npm run test:integration
 * 外部依存なし（マイグレーション + シードをメモリ内DBへ適用して検証する）
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.ts';
import { LocalD1 } from '../../src/db/local-d1.ts';
import { applyMigrations } from '../../scripts/migrate-core.ts';
import { runSeed } from '../../scripts/seed-core.ts';
import { hashPassword } from '../../src/auth.ts';

let localD1: LocalD1;
const app = createApp();
const bindings = {
  DB: undefined as unknown,
  SESSION_SECRET: 'test-secret',
  ENVIRONMENT: 'test',
  APP_NAME: 'itsm-management',
};

async function call(path: string, opts: { method?: string; body?: unknown; cookie?: string } = {}) {
  const req = new Request(`http://localhost${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const res = await app.fetch(req, bindings as never, {} as never);
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, body, setCookie };
}

let adminCookie = '';
let viewerCookie = '';
let testIncidentId = '';

before(async () => {
  // メモリ内 D1 を用意し、マイグレーション + シードを適用
  localD1 = new LocalD1();
  await applyMigrations(localD1);
  await runSeed(localD1, { SEED_DEMO_PASSWORD: 'Mirai#2026' });
  bindings.DB = localD1;

  // テストユーザーを確実に作成
  const passwordHash = await hashPassword('Mirai#2026');
  await localD1
    .prepare(
      `INSERT INTO users (username, display_name, email, password_hash, role, department)
       VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT (username) DO NOTHING`,
    )
    .bind('qa_admin', 'QA管理者', 'qa_admin@example.com', passwordHash, 'admin', 'IT管理課')
    .run();
  await localD1
    .prepare(
      `INSERT INTO users (username, display_name, email, password_hash, role, department)
       VALUES (?1,?2,?3,?4,?5,?6) ON CONFLICT (username) DO NOTHING`,
    )
    .bind('qa_viewer', 'QA閲覧者', 'qa_viewer@example.com', passwordHash, 'viewer', '総務部')
    .run();
});

after(() => {
  localD1?.close();
});

test('認証なしで一覧 → 401', async () => {
  const res = await call('/api/incidents');
  assert.equal(res.status, 401);
});

test('adminでログイン → セッションCookie取得', async () => {
  const res = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'qa_admin', password: 'Mirai#2026' },
  });
  assert.equal(res.status, 200);
  assert.ok(res.setCookie);
  adminCookie = res.setCookie!.split(';')[0];
});

test('viewerでログイン → セッションCookie取得', async () => {
  const res = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'qa_viewer', password: 'Mirai#2026' },
  });
  assert.equal(res.status, 200);
  viewerCookie = res.setCookie!.split(';')[0];
});

test('adminでインシデント一覧 → 200', async () => {
  const res = await call('/api/incidents', { cookie: adminCookie });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
  assert.ok(res.body.total >= 0);
});

test('adminでインシデント作成 → 201 + チケット番号', async () => {
  const res = await call('/api/incidents', {
    method: 'POST',
    cookie: adminCookie,
    body: { title: 'QAテスト インシデント', priority: 'high', status: 'open', category: 'テスト', site: '本社' },
  });
  assert.equal(res.status, 201);
  assert.match(res.body.ticket_no, /^INC-\d{4}-\d{4}$/);
  testIncidentId = res.body.id;
});

test('adminでインシデント更新 → 200', async () => {
  const res = await call(`/api/incidents/${testIncidentId}`, {
    method: 'PUT',
    cookie: adminCookie,
    body: { status: 'in_progress' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'in_progress');
});

test('viewerで作成 → 403（RBAC）', async () => {
  const res = await call('/api/incidents', {
    method: 'POST',
    cookie: viewerCookie,
    body: { title: 'QAテスト 権限なし', priority: 'medium' },
  });
  assert.equal(res.status, 403);
});

test('viewerで一覧 → 200（閲覧可）', async () => {
  const res = await call('/api/incidents', { cookie: viewerCookie });
  assert.equal(res.status, 200);
});

test('キーワード検索 → 該当件数', async () => {
  const res = await call('/api/incidents?keyword=QAテスト', { cookie: adminCookie });
  assert.equal(res.status, 200);
  assert.ok(res.body.total >= 1);
});

test('ステータスフィルタ → 該当件数', async () => {
  const res = await call('/api/incidents?status=in_progress', { cookie: adminCookie });
  assert.equal(res.status, 200);
  assert.ok(res.body.items.every((i: { status: string }) => i.status === 'in_progress'));
});

test('未認証でダッシュボード → 401（認可）', async () => {
  const res = await call('/api/dashboard/summary');
  assert.equal(res.status, 401);
});

test('ダッシュボードサマリ → 200 + 数値', async () => {
  const res = await call('/api/dashboard/summary', { cookie: adminCookie });
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.total === 'number');
  assert.ok(typeof res.body.slaRate === 'number');
});

test('ダッシュボード推移 → 200', async () => {
  const res = await call('/api/dashboard/trend', { cookie: adminCookie });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body.length, 7);
});

test('adminでインシデント削除 → 204', async () => {
  const res = await call(`/api/incidents/${testIncidentId}`, { method: 'DELETE', cookie: adminCookie });
  assert.equal(res.status, 204);
});

test('監査ログ: admin/managerで参照可', async () => {
  const res = await call('/api/audit_logs?limit=5', { cookie: adminCookie });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
});

test('ヘルスチェック → 200 + db接続', async () => {
  const res = await call('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.db.connected, true);
});

test('ログアウト → セッション無効化', async () => {
  await call('/api/auth/logout', { method: 'POST', cookie: adminCookie });
  const res = await call('/api/auth/me', { cookie: adminCookie });
  assert.equal(res.status, 401);
});
