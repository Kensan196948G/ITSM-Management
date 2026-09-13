/** ユーザー・監査ログ・ヘルスチェック ルーター */
import { Hono } from 'hono';
import { Errors } from '../errors.ts';
import { hashPassword } from '../auth.ts';
import { parseListParams } from '../utils.ts';
import type { AppEnv, UserRow } from '../types.ts';

/** ── ユーザー管理（admin） ── */
export const userRoutes = new Hono<AppEnv>();

userRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();
  // ユーザー一覧は管理操作の一部として admin に限定する。
  // （docs/06-セキュリティ設計書.md §3.2 権限マトリクス「ユーザー管理 = admin のみ」に準拠。
  //   以前は manager にも許可されており、書き込み不可の管理 UI が表示される原因になっていた）
  if (user.role !== 'admin') throw Errors.forbidden();
  const db = c.get('db');
  const res = await db.query(
    'SELECT id, username, display_name, email, role, department, is_active, created_at FROM users ORDER BY display_name',
  );
  return c.json(res.rows);
});

userRoutes.post('/', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();
  if (user.role !== 'admin') throw Errors.forbidden();
  const db = c.get('db');
  const body = await c.req.json().catch(() => null);
  if (!body) throw Errors.badRequest();
  const { username, display_name, email, password, role = 'viewer', department } = body as Record<string, string>;
  if (!username || !display_name || !email || !password) throw Errors.badRequest('必須項目が不足しています');
  const allowedRoles = ['viewer', 'operator', 'manager', 'admin'];
  if (!allowedRoles.includes(role)) throw Errors.badRequest('ロールが不正です');
  const passwordHash = await hashPassword(password);
  // 事前に一意制約を確認する。
  // （DB エラーメッセージの文字列一致に依存すると、SQLite/D1 の
  //   "UNIQUE constraint failed: ..." を検出できず 500 になるため）
  const dup = await db.queryOne<{ id: string }>(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email],
  );
  if (dup) throw Errors.conflict('ユーザー名またはメールアドレスが既に使用されています');
  try {
    const row = await db.queryOne<UserRow>(
      `INSERT INTO users (username, display_name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, display_name, email, role, department, is_active, created_at`,
      [username, display_name, email, passwordHash, role, department ?? null],
    );
    return c.json(row, 201);
  } catch (e: unknown) {
    // 競合で事前チェックをすり抜けた場合の保険（DB 制約違反を 409 へ変換）
    const msg = String((e as { message?: unknown })?.message ?? '');
    if (msg.includes('UNIQUE constraint failed') || msg.toLowerCase().includes('duplicate')) {
      throw Errors.conflict('ユーザー名またはメールアドレスが既に使用されています');
    }
    throw e;
  }
});

userRoutes.put('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();
  if (user.role !== 'admin') throw Errors.forbidden();
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  if (!body) throw Errors.badRequest();
  const sets: string[] = [];
  const params: unknown[] = [id];
  const allowedRoles = ['viewer', 'operator', 'manager', 'admin'];
  for (const key of ['display_name', 'department']) {
    if (body[key] !== undefined) {
      params.push(body[key]);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (body.role !== undefined) {
    if (!allowedRoles.includes(body.role)) throw Errors.badRequest('ロールが不正です');
    params.push(body.role);
    sets.push(`role = $${params.length}`);
  }
  if (body.is_active !== undefined) {
    // 文字列 "false" が truthy になるのを防ぐため、真偽値を厳密に解釈する
    const raw = body.is_active;
    const active = raw === true || raw === 1 || raw === '1' || raw === 'true';
    params.push(active ? true : false);
    sets.push(`is_active = $${params.length}`);
  }
  if (body.password) {
    params.push(await hashPassword(String(body.password)));
    sets.push(`password_hash = $${params.length}`);
  }
  if (sets.length === 0) throw Errors.badRequest('更新項目がありません');
  await db.query(`UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, params);
  const updated = await db.queryOne(
    'SELECT id, username, display_name, email, role, department, is_active, created_at FROM users WHERE id = $1',
    [id],
  );
  if (!updated) throw Errors.notFound('ユーザーが見つかりません');
  return c.json(updated);
});

/** ── 監査ログ（admin / manager） ── */
export const auditRoutes = new Hono<AppEnv>();

auditRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();
  if (user.role !== 'admin' && user.role !== 'manager') throw Errors.forbidden();
  const db = c.get('db');
  const url = new URL(c.req.url);
  const { skip, size } = parseListParams(url);
  const entityType = url.searchParams.get('entity_type');
  const entityId = url.searchParams.get('entity_id');

  const conds: string[] = [];
  const params: unknown[] = [];
  if (entityType) {
    params.push(entityType);
    conds.push(`entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    conds.push(`entity_id = $${params.length}`);
  }
  const whereSql = conds.length > 0 ? ` WHERE ${conds.join(' AND ')}` : '';
  const countRes = await db.queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM audit_logs${whereSql}`, params);
  const items = await db.query(
    `SELECT a.*, u.display_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id${whereSql}
     ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, size, skip],
  );
  return c.json({ items: items.rows, total: parseInt(countRes?.total ?? '0', 10), page: Math.floor(skip / size) + 1, size });
});

/** ── ヘルスチェック（公開） ── */
export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/', async (c) => {
  const db = c.get('db');
  let dbOk = false;
  let dbLatency = 0;
  try {
    const t0 = Date.now();
    await db.queryOne('SELECT 1 AS ok');
    dbLatency = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return c.json({
    status: dbOk ? 'ok' : 'degraded',
    version: c.env.APP_NAME ?? 'itsm-management',
    db: { connected: dbOk, latencyMs: dbLatency },
    time: new Date().toISOString(),
  });
});
