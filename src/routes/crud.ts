/**
 * 汎用CRUDルーター生成（モジュール別の一覧・詳細・作成・更新・削除）
 * 各モジュールはカラムマップとバリデーションを定義し、共通ロジックを再利用する。
 */
import { Hono } from 'hono';
import { Errors } from '../errors.ts';
import { parseListParams, buildWhere, writeAudit, generateTicketNo } from '../utils.ts';
import { ROLE_RANK } from '../config.ts';
import type { AppEnv, Role } from '../types.ts';

/** フィールドの型 */
export type CrudFieldType = 'string' | 'number' | 'date' | 'boolean';

export interface CrudField {
  /** 受け入れ可能なDBカラム名 */
  column: string;
  /** 入力キー（省略時は column） */
  key?: string;
  /** 必須 */
  required?: boolean;
  /** 許可値（enum） */
  allowed?: string[];
  /** 期待する型（省略時は string） */
  type?: CrudFieldType;
  /** 文字列の最大長（超過は 400） */
  maxLength?: number;
  /** 数値の下限（この値以上） */
  min?: number;
  /** 数値の上限（この値以下） */
  max?: number;
}

/** エラーメッセージ用の型名 */
const TYPE_LABEL: Record<CrudFieldType, string> = {
  string: '文字列',
  number: '数値',
  date: '日時',
  boolean: '真偽値',
};

/**
 * フィールド定義に従って入力を検証し、保存用の値へ正規化する。
 *
 * 検証が無いと SQLite は型に寛容なため、数値カラムへ文字列が入る、
 * 日付カラムへ任意文字列が入る、文字列カラムへ配列やオブジェクトが
 * 入る、といった不整合がそのまま保存されてしまう。
 *
 * @returns 正規化済みの値（未入力なら undefined）
 * @throws AppError(400) 検証に失敗した場合
 */
function coerceFieldValue(f: CrudField, key: string, raw: unknown): unknown {
  const type = f.type ?? 'string';

  // null は「値のクリア」として許可する（必須項目は呼び出し側で別途拒否）
  if (raw === null) return null;

  switch (type) {
    case 'string': {
      if (typeof raw !== 'string') {
        throw Errors.badRequest(`${key}は${TYPE_LABEL.string}で指定してください`);
      }
      const trimmed = raw.trim();
      if (trimmed === '') return undefined;
      if (f.maxLength !== undefined && trimmed.length > f.maxLength) {
        throw Errors.badRequest(`${key}は${f.maxLength}文字以内で指定してください`);
      }
      return trimmed;
    }
    case 'number': {
      const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      if (!Number.isFinite(n)) {
        throw Errors.badRequest(`${key}は${TYPE_LABEL.number}で指定してください`);
      }
      if (f.min !== undefined && n < f.min) {
        throw Errors.badRequest(`${key}は${f.min}以上で指定してください`);
      }
      if (f.max !== undefined && n > f.max) {
        throw Errors.badRequest(`${key}は${f.max}以下で指定してください`);
      }
      return n;
    }
    case 'date': {
      if (typeof raw !== 'string') {
        throw Errors.badRequest(`${key}は${TYPE_LABEL.date}（ISO-8601）で指定してください`);
      }
      const trimmed = raw.trim();
      if (trimmed === '') return undefined;
      // 実在しない日付（2026-99-99 等）は new Date が Invalid Date を返す
      if (Number.isNaN(new Date(trimmed).getTime())) {
        throw Errors.badRequest(`${key}は正しい日時（ISO-8601）で指定してください`);
      }
      return trimmed;
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return raw;
      if (raw === 1 || raw === '1' || raw === 'true') return true;
      if (raw === 0 || raw === '0' || raw === 'false') return false;
      throw Errors.badRequest(`${key}は${TYPE_LABEL.boolean}で指定してください`);
    }
    default: {
      // 未知の型指定はバグとして扱う（保存はしない）
      throw Errors.badRequest(`${key}の型定義が不正です`);
    }
  }
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
      const has = Object.prototype.hasOwnProperty.call(body, key);
      const value = has ? coerceFieldValue(f, key, (body as Record<string, unknown>)[key]) : undefined;
      // 空文字・空白のみは「未入力」として扱う。
      // 以前は '' のみを未入力としていたため、'   ' が必須チェックを通過し、
      // タイトルが空白だけのチケットが登録できてしまっていた。
      if (value === undefined || value === null) {
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
      const value = coerceFieldValue(f, key, (body as Record<string, unknown>)[key]);
      // 必須項目を空文字・空白のみへ更新することを禁止する
      // （作成時と同様、'   ' が必須チェックをすり抜けてしまうため）
      if (f.required && (value === undefined || value === null)) {
        throw Errors.badRequest(`${key}は必須です`);
      }
      if (f.allowed && value !== null && value !== undefined && !f.allowed.includes(String(value))) {
        throw Errors.badRequest(`${key}の値が不正です: ${String(value)}`);
      }
      params.push(value === undefined ? null : value);
      sets.push(`${f.column} = $${params.length}`);
      changed[f.column] = value ?? null;
    }
    if (sets.length === 0) {
      // 更新フィールドなし: updated_at のみ更新するが、監査ログは必ず記録する
      // （docs/06-セキュリティ設計書.md §4.1「update は before + after を記録」に準拠。
      //   早期 return で writeAudit を迂回すると、
      //   「updated_at は更新されたのに監査ログが無い」状態が発生する）
      await db.query(`UPDATE ${cfg.table} SET updated_at = now() WHERE id = $1`, [id]);
      const unchanged = await db.queryOne(`SELECT * FROM ${cfg.table} WHERE id = $1`, [id]);
      await writeAudit(db, {
        entityType: cfg.entity,
        entityId: id,
        action: 'update',
        before: existing,
        after: unchanged,
        userId: user.id,
        ip: c.req.header('cf-connecting-ip'),
      });
      return c.json(unchanged);
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
