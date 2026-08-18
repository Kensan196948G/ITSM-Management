/**
 * 汎用CRUDルーター生成（モジュール別の一覧・詳細・作成・更新・削除）
 * 各モジュールはカラムマップとバリデーションを定義し、共通ロジックを再利用する。
 */
import { Hono } from 'hono';
import { Errors } from '../errors.ts';
import { parseListParams, buildWhere, writeAudit, generateTicketNo } from '../utils.ts';
import { ROLE_RANK } from '../config.ts';
import type { AppEnv, Role } from '../types.ts';

export interface CrudField {
  /** 受け入れ可能なDBカラム名 */
  column: string;
  /** 入力キー（省略時は column） */
  key?: string;
  /** 必須 */
  required?: boolean;
  /** 許可値（enum） */
  allowed?: string[];
}

export interface CrudConfig {
  /** DBテーブル名 */
  table: string;
  /** エンティティ名（監査・エラー表示用） */
  entity: string;
  /** チケット採番プレフィックス（nullならUUIDのみ） */
  ticketPrefix: string | null;
  /** チケット番号カラム名（ticketPrefix指定時必須） */
  ticketColumn?: string;
  /** 表示名カラム（詳細/一覧の識別用） */
  titleColumn: string;
  /** 一覧ソート（デフォルト） */
  orderBy: string;
  /** 検索対象カラム */
  searchColumns: string[];
  /** フィルタ対象カラム */
  filterColumns: string[];
  /** 作成・更新で受け入れるフィールド */
  fields: CrudField[];
  /** 更新時のみ受け入れるフィールド（resolved_at等） */
  updateOnlyFields?: CrudField[];
  /** 一覧時のJOINで表示用に追加するカラム（必要ならルーター側で拡張） */
  writeRole?: 'operator' | 'manager' | 'admin';
}

export function createCrudRouter(cfg: CrudConfig): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  // ── 認証 + RBAC（ルーター内で確実に適用） ──
  // 全メソッドで認証必須（viewer 以上）。書込系（POST/PUT/DELETE）は operator 以上。
  router.use('*', async (c, next) => {
    const user = c.get('user');
    if (!user) throw Errors.unauthorized();
    const method = c.req.method;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      const writeRole = (cfg.writeRole ?? 'operator') as Role;
      const userRank = ROLE_RANK[user.role] ?? 0;
      const needRank = ROLE_RANK[writeRole] ?? 2;
      if (userRank < needRank) throw Errors.forbidden();
    }
    await next();
  });

  /** 一覧 */
  router.get('/', async (c) => {
    const db = c.get('db');
    const url = new URL(c.req.url);
    const { skip, size, keyword } = parseListParams(url);

    const filters = cfg.filterColumns
      .map((col) => ({ column: col, value: url.searchParams.get(col) ?? undefined }))
      .filter((f) => f.value !== undefined);

    const { where, params } = buildWhere(filters, cfg.searchColumns, keyword);
    const whereSql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

    const countRes = await db.queryOne<{ total: string }>(
      `SELECT COUNT(*) AS total FROM ${cfg.table}${whereSql}`,
      params,
    );
    const total = parseInt(countRes?.total ?? '0', 10);

    const items = await db.query(
      `SELECT * FROM ${cfg.table}${whereSql} ORDER BY ${cfg.orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, size, skip],
    );

    return c.json({
      items: items.rows,
      total,
      page: Math.floor(skip / size) + 1,
      size,
    });
  });

  /** 詳細 */
  router.get('/:id', async (c) => {
    const db = c.get('db');
    const row = await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [c.req.param('id')]);
    if (!row) throw Errors.notFound(`${cfg.entity}が見つかりません`);
    return c.json(row);
  });

  /** 作成（operator以上） */
  router.post('/', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw Errors.badRequest('リクエストボディが不正です');

    // 入力検証
    const cols: string[] = [];
    const params: unknown[] = [];
    const values: unknown[] = [];

    for (const f of cfg.fields) {
      const key = f.key ?? f.column;
      const value: unknown = (body as Record<string, unknown>)[key];
      if (value === undefined || value === null || value === '') {
        if (f.required) throw Errors.badRequest(`${key}は必須です`);
        continue;
      }
      if (f.allowed && !f.allowed.includes(String(value))) {
        throw Errors.badRequest(`${key}の値が不正です: ${String(value)}`);
      }
      cols.push(f.column);
      values.push(value);
      params.push(value);
    }

    // チケット採番
    let id: string;
    if (cfg.ticketPrefix && cfg.ticketColumn) {
      const ticketNo = await generateTicketNo(db, cfg.table, cfg.ticketPrefix, cfg.ticketColumn);
      const idRow = await db.queryOne<{ id: string }>('SELECT gen_random_uuid() AS id');
      id = idRow!.id;
      cols.push(cfg.ticketColumn, 'id');
      values.push(ticketNo, id);
    } else {
      const idRow = await db.queryOne<{ id: string }>('SELECT gen_random_uuid() AS id');
      id = idRow!.id;
      cols.push('id');
      values.push(id);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    await db.query(
      `INSERT INTO ${cfg.table} (${cols.join(', ')}) VALUES (${placeholders})`,
      values,
    );

    const created = await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]);
    await writeAudit(db, {
      entityType: cfg.entity,
      entityId: id,
      action: 'create',
      after: created,
      userId: user.id,
      ip: c.req.header('cf-connecting-ip'),
    });
    return c.json(created, 201);
  });

  /** 更新（operator以上） */
  router.put('/:id', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const id = c.req.param('id');
    const existing = await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]);
    if (!existing) throw Errors.notFound(`${cfg.entity}が見つかりません`);

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw Errors.badRequest('リクエストボディが不正です');

    const sets: string[] = [];
    const params: unknown[] = [id];
    const changed: Record<string, unknown> = {};

    const allFields = [...cfg.fields, ...(cfg.updateOnlyFields ?? [])];
    for (const f of allFields) {
      const key = f.key ?? f.column;
      if (!(key in (body as Record<string, unknown>))) continue;
      const value: unknown = (body as Record<string, unknown>)[key];
      if (f.allowed && value !== null && value !== undefined && !f.allowed.includes(String(value))) {
        throw Errors.badRequest(`${key}の値が不正です: ${String(value)}`);
      }
      params.push(value === undefined ? null : value);
      sets.push(`${f.column} = $${params.length}`);
      changed[f.column] = value ?? null;
    }
    if (sets.length === 0) {
      // 更新フィールドなし
      await db.query(`UPDATE ${cfg.table} SET updated_at = now() WHERE id = $1`, [id]);
      return c.json(await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]));
    }

    await db.query(`UPDATE ${cfg.table} SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`, params);
    const updated = await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]);
    await writeAudit(db, {
      entityType: cfg.entity,
      entityId: id,
      action: 'update',
      before: existing,
      after: updated,
      userId: user.id,
      ip: c.req.header('cf-connecting-ip'),
    });
    return c.json(updated);
  });

  /** 削除（operator以上） */
  router.delete('/:id', async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const id = c.req.param('id');
    const existing = await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]);
    if (!existing) throw Errors.notFound(`${cfg.entity}が見つかりません`);

    await db.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [id]);
    await writeAudit(db, {
      entityType: cfg.entity,
      entityId: id,
      action: 'delete',
      before: existing,
      userId: user.id,
      ip: c.req.header('cf-connecting-ip'),
    });
    return c.body(null, 204);
  });

  return router;
}
