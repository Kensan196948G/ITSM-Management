/**
 * 共通ユーティリティ: チケット採番 / SLA計算 / ページング / 監査ログ
 */
import { D1Client } from './db/client.ts';
import { SLA_HOURS, SLA_RISK_THRESHOLD_HOURS } from './config.ts';
import type { SlaStatus } from './types.ts';

/** DBクライアント型（D1Client / ローカルアダプタ） */
export type DbLike = D1Client;

/** チケット番号採番（INC-2026-0001 形式） */
export async function generateTicketNo(
  db: DbLike,
  table: string,
  prefix: string,
  ticketColumn = 'ticket_no',
): Promise<string> {
  const year = new Date().getFullYear();
  // 現在年度内の該当チケット番号を取得し、連番の最大値を JS 側で計算する
  // （SQLite は PG の SUBSTRING(col FROM 'regex') をサポートしないため）
  const res = await db.query(
    `SELECT ${ticketColumn} FROM ${table}
     WHERE ${ticketColumn} LIKE $1`,
    [`${prefix}-${year}-%`],
  );
  let maxSeq = 0;
  for (const r of res.rows) {
    const m = /(\d+)$/.exec(String(r[ticketColumn] ?? ''));
    if (m) {
      const seq = parseInt(m[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** SLA 状態計算（safe / risk / urgent）。フロントのSLAPill仕様と一致 */
export function calcSlaStatus(dueAt: string | null, resolvedAt: string | null): SlaStatus {
  if (!dueAt) return 'safe';
  const due = new Date(dueAt).getTime();
  if (resolvedAt) {
    return new Date(resolvedAt).getTime() <= due ? 'safe' : 'urgent';
  }
  const now = Date.now();
  const remaining = due - now;
  if (remaining < 0) return 'urgent';
  if (remaining < SLA_RISK_THRESHOLD_HOURS * 3600 * 1000) return 'risk';
  return 'safe';
}

/** 優先度に基づくSLA期限の計算（due_at 未指定時の自動設定） */
export function calcDueAt(priority: string, base = new Date()): string | null {
  const hours = SLA_HOURS[priority];
  if (!hours) return null;
  const d = new Date(base.getTime() + hours * 3600 * 1000);
  return d.toISOString();
}

/** 一覧クエリ共通パラメータの解析 */
export function parseListParams(url: URL) {
  const skip = Math.max(0, parseInt(url.searchParams.get('skip') ?? '0', 10) || 0);
  const sizeRaw = parseInt(url.searchParams.get('limit') ?? '10', 10) || 10;
  const size = Math.min(Math.max(1, sizeRaw), 100);
  const keyword = url.searchParams.get('keyword')?.trim() || undefined;
  return { skip, size, keyword };
}

/** WHERE句ビルダー（モジュール別フィルタ） */
export function buildWhere(
  filters: { column: string; value: string | undefined }[],
  keywordColumns: string[] = [],
  keyword?: string,
): { where: string[]; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  for (const f of filters) {
    if (f.value && f.value !== 'all') {
      params.push(f.value);
      where.push(`${f.column} = $${params.length}`);
    }
  }
  if (keyword && keywordColumns.length > 0) {
    const cols = keywordColumns.map((c) => `COALESCE(${c}, '')`).join(" || ' ' || ");
    params.push(`%${keyword}%`);
    where.push(`${cols} ILIKE $${params.length}`);
  }
  return { where, params };
}

/** 監査ログ記録 */
export async function writeAudit(
  db: DbLike,
  args: {
    entityType: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    userId: string | null;
    ip?: string | null;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO audit_logs (entity_type, entity_id, action, before_json, after_json, user_id, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      args.entityType,
      args.entityId,
      args.action,
      args.before === undefined ? null : JSON.stringify(args.before),
      args.after === undefined ? null : JSON.stringify(args.after),
      args.userId,
      args.ip ?? null,
    ],
  );
}
