/**
 * モジュールルーター定義（汎用CRUDを使用）
 * 各モジュール: incidents / problems / changes / cmdb / knowledge / assets / patches / security / requests
 */
import { createCrudRouter, type CrudField } from './crud.ts';

const INCIDENT_PRIORITIES = ['critical', 'high', 'medium', 'low'];
const INCIDENT_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

/**
 * 入力サイズの上限。
 * 明示しないと 1 件で数 MB のテキストを保存でき、DB 肥大と
 * レスポンス遅延（一覧が全カラム SELECT のため）を招く。
 */
const MAX_TITLE = 255;   // タイトル・名称
const MAX_SHORT = 255;   // 分類・拠点・対象など
const MAX_ID = 64;       // ID 参照
const MAX_LONG = 20000;  // 説明・本文

/** タイトル（必須・255文字以内） */
const title = (extra: Partial<CrudField> = {}): CrudField =>
  ({ column: 'title', required: true, maxLength: MAX_TITLE, ...extra });
/** 名称（必須・255文字以内） */
const name = (extra: Partial<CrudField> = {}): CrudField =>
  ({ column: 'name', required: true, maxLength: MAX_TITLE, ...extra });
/** 短い文字列 */
const short = (column: string, extra: Partial<CrudField> = {}): CrudField =>
  ({ column, maxLength: MAX_SHORT, ...extra });
/** 説明・本文 */
const long = (column: string): CrudField => ({ column, maxLength: MAX_LONG });
/** ID 参照 */
const ref = (column: string): CrudField => ({ column, maxLength: MAX_ID });
/** 日時（ISO-8601 のみ許可） */
const date = (column: string): CrudField => ({ column, type: 'date' });
/** 非負の整数 */
const count = (column: string): CrudField => ({ column, type: 'number', min: 0, max: 1_000_000 });

/** ── インシデント ── */
export const incidentRoutes = createCrudRouter({
  table: 'incidents',
  entity: 'incident',
  ticketPrefix: 'INC',
  ticketColumn: 'ticket_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'description', 'ticket_no'],
  filterColumns: ['status', 'priority', 'site', 'category', 'assignee_id'],
  fields: [
    title(),
    long('description'),
    short('priority', { allowed: INCIDENT_PRIORITIES }),
    short('status', { allowed: INCIDENT_STATUSES }),
    short('category'),
    ref('assignee_id'),
    ref('reporter_id'),
    short('location'),
    short('site'),
    short('system_name'),
    short('impact', { allowed: ['high', 'medium', 'low'] }),
    short('urgency', { allowed: ['high', 'medium', 'low'] }),
    date('due_at'),
  ],
  updateOnlyFields: [date('resolved_at')],
});

/** ── 問題 ── */
export const problemRoutes = createCrudRouter({
  table: 'problems',
  entity: 'problem',
  ticketPrefix: 'PRB',
  ticketColumn: 'ticket_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'description', 'ticket_no', 'root_cause'],
  filterColumns: ['status', 'priority'],
  fields: [
    title(),
    long('description'),
    short('status', { allowed: ['open', 'investigating', 'known_error', 'resolved', 'closed'] }),
    short('priority', { allowed: INCIDENT_PRIORITIES }),
    long('root_cause'),
    long('workaround'),
    long('related_incident_ids'),
  ],
});

/** ── 変更 ── */
export const changeRoutes = createCrudRouter({
  table: 'changes',
  entity: 'change',
  ticketPrefix: 'CHG',
  ticketColumn: 'ticket_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'description', 'ticket_no'],
  filterColumns: ['status', 'risk_level', 'change_type'],
  fields: [
    title(),
    short('change_type', { allowed: ['normal', 'standard', 'emergency'] }),
    short('risk_level', { allowed: ['high', 'medium', 'low'] }),
    short('status', { allowed: ['draft', 'review', 'approved', 'implementing', 'closed', 'rejected'] }),
    long('description'),
    date('scheduled_at'),
    ref('created_by'),
  ],
});

/** ── CMDB ── */
export const cmdbRoutes = createCrudRouter({
  table: 'cmdb_items',
  entity: 'cmdb',
  ticketPrefix: 'CI',
  ticketColumn: 'ci_id',
  titleColumn: 'name',
  orderBy: 'created_at DESC',
  searchColumns: ['name', 'ci_id', 'owner'],
  filterColumns: ['ci_type', 'status', 'environment', 'site'],
  fields: [
    name(),
    short('ci_type', { allowed: ['server', 'network', 'software', 'service', 'storage', 'other'] }),
    short('environment', { allowed: ['production', 'staging', 'cloud'] }),
    short('site'),
    short('status', { allowed: ['active', 'maintenance', 'retired'] }),
    short('owner'),
  ],
});

/** ── ナレッジ ── */
export const knowledgeRoutes = createCrudRouter({
  table: 'knowledge_articles',
  entity: 'knowledge',
  ticketPrefix: 'KA',
  ticketColumn: 'ticket_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'body', 'ticket_no'],
  filterColumns: ['status', 'category'],
  fields: [
    title(),
    long('body'),
    short('category'),
    short('status', { allowed: ['draft', 'review', 'published', 'archived'] }),
    count('view_count'),
    count('helpful_count'),
  ],
});

/** ── 資産 ── */
export const assetRoutes = createCrudRouter({
  table: 'assets',
  entity: 'asset',
  ticketPrefix: 'AST',
  ticketColumn: 'asset_no',
  titleColumn: 'name',
  orderBy: 'created_at DESC',
  searchColumns: ['name', 'asset_no', 'assignee'],
  filterColumns: ['asset_type', 'status', 'site'],
  fields: [
    name(),
    short('asset_type', { allowed: ['pc', 'monitor', 'nas', 'printer', 'smartphone', 'ups'] }),
    short('site'),
    short('status', { allowed: ['stock', 'in_use', 'maintenance', 'retired', 'disposed'] }),
    short('assignee'),
    date('purchase_date'),
    date('warranty_end'),
  ],
});

/** ── パッチ ── */
export const patchRoutes = createCrudRouter({
  table: 'patches',
  entity: 'patch',
  ticketPrefix: 'PTH',
  ticketColumn: 'patch_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'patch_no'],
  filterColumns: ['severity', 'status', 'patch_type'],
  fields: [
    title(),
    short('severity', { allowed: INCIDENT_PRIORITIES }),
    short('patch_type', { allowed: ['windows_update', 'office', 'bios', 'vpn', 'antivirus', 'cad'] }),
    short('status', { allowed: ['planned', 'testing', 'deploying', 'completed', 'failed', 'cancelled'] }),
    count('target_count'),
    count('applied_count'),
    date('scheduled_at'),
  ],
});

/** ── セキュリティ ── */
export const securityRoutes = createCrudRouter({
  table: 'security_events',
  entity: 'security',
  ticketPrefix: 'SEC',
  ticketColumn: 'event_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'event_no', 'target'],
  filterColumns: ['severity', 'status', 'event_type'],
  fields: [
    title(),
    short('event_type', {
      allowed: ['suspicious_login', 'usb_block', 'mfa_failure', 'dlp', 'vpn_failure', 'unauthorized_access', 'other'],
    }),
    short('severity', { allowed: INCIDENT_PRIORITIES }),
    short('status', { allowed: ['detected', 'investigating', 'contained', 'resolved', 'closed'] }),
    short('target'),
    long('action_taken'),
  ],
});

/** ── サービス要求 ── */
export const requestRoutes = createCrudRouter({
  table: 'service_requests',
  entity: 'service_request',
  ticketPrefix: 'REQ',
  ticketColumn: 'req_no',
  titleColumn: 'title',
  orderBy: 'created_at DESC',
  searchColumns: ['title', 'req_no', 'requester'],
  filterColumns: ['status', 'category', 'priority'],
  fields: [
    title(),
    short('category', { allowed: ['pc', 'account', 'teams', 'permission', 'software'] }),
    short('requester'),
    short('priority', { allowed: ['high', 'medium', 'low'] }),
    short('status', { allowed: ['pending', 'approving', 'in_progress', 'completed', 'rejected', 'cancelled'] }),
    short('approver'),
    long('description'),
  ],
});
