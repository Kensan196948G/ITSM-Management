/**
 * モジュールルーター定義（汎用CRUDを使用）
 * 各モジュール: incidents / problems / changes / cmdb / knowledge / assets / patches / security / requests
 */
import { createCrudRouter } from './crud.ts';
import { calcSlaStatus } from '../utils.ts';
import type { IncidentRow } from '../types.ts';

const INCIDENT_PRIORITIES = ['critical', 'high', 'medium', 'low'];
const INCIDENT_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];

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
    { column: 'title', required: true },
    { column: 'description' },
    { column: 'priority', allowed: INCIDENT_PRIORITIES },
    { column: 'status', allowed: INCIDENT_STATUSES },
    { column: 'category' },
    { column: 'assignee_id' },
    { column: 'reporter_id' },
    { column: 'location' },
    { column: 'site' },
    { column: 'system_name' },
    { column: 'impact', allowed: INCIDENT_PRIORITIES },
    { column: 'urgency', allowed: INCIDENT_PRIORITIES },
    { column: 'due_at' },
  ],
  updateOnlyFields: [{ column: 'resolved_at' }],
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
    { column: 'title', required: true },
    { column: 'description' },
    { column: 'status', allowed: ['open', 'investigating', 'known_error', 'resolved', 'closed'] },
    { column: 'priority', allowed: INCIDENT_PRIORITIES },
    { column: 'root_cause' },
    { column: 'workaround' },
    { column: 'related_incident_ids' },
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
    { column: 'title', required: true },
    { column: 'change_type', allowed: ['normal', 'standard', 'emergency'] },
    { column: 'risk_level', allowed: ['high', 'medium', 'low'] },
    { column: 'status', allowed: ['draft', 'review', 'approved', 'implementing', 'closed', 'rejected'] },
    { column: 'description' },
    { column: 'scheduled_at' },
    { column: 'created_by' },
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
    { column: 'name', required: true },
    { column: 'ci_type', allowed: ['server', 'network', 'software', 'service', 'storage', 'other'] },
    { column: 'environment', allowed: ['production', 'staging', 'cloud'] },
    { column: 'site' },
    { column: 'status', allowed: ['active', 'maintenance', 'retired'] },
    { column: 'owner' },
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
    { column: 'title', required: true },
    { column: 'body' },
    { column: 'category' },
    { column: 'status', allowed: ['draft', 'review', 'published', 'archived'] },
    { column: 'view_count' },
    { column: 'helpful_count' },
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
    { column: 'name', required: true },
    { column: 'asset_type', allowed: ['pc', 'monitor', 'nas', 'printer', 'smartphone', 'ups'] },
    { column: 'site' },
    { column: 'status', allowed: ['stock', 'in_use', 'maintenance', 'retired', 'disposed'] },
    { column: 'assignee' },
    { column: 'purchase_date' },
    { column: 'warranty_end' },
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
    { column: 'title', required: true },
    { column: 'severity', allowed: INCIDENT_PRIORITIES },
    { column: 'patch_type', allowed: ['windows_update', 'office', 'bios', 'vpn', 'antivirus', 'cad'] },
    { column: 'status', allowed: ['planned', 'testing', 'deploying', 'completed', 'failed', 'cancelled'] },
    { column: 'target_count' },
    { column: 'applied_count' },
    { column: 'scheduled_at' },
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
    { column: 'title', required: true },
    {
      column: 'event_type',
      allowed: ['suspicious_login', 'usb_block', 'mfa_failure', 'dlp', 'vpn_failure', 'unauthorized_access', 'other'],
    },
    { column: 'severity', allowed: INCIDENT_PRIORITIES },
    { column: 'status', allowed: ['detected', 'investigating', 'contained', 'resolved', 'closed'] },
    { column: 'target' },
    { column: 'action_taken' },
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
    { column: 'title', required: true },
    { column: 'category', allowed: ['pc', 'account', 'teams', 'permission', 'software'] },
    { column: 'requester' },
    { column: 'priority', allowed: ['high', 'medium', 'low'] },
    { column: 'status', allowed: ['pending', 'approving', 'in_progress', 'completed', 'rejected', 'cancelled'] },
    { column: 'approver' },
    { column: 'description' },
  ],
});

/**
 * インシデント一覧のSLA状態を付与するヘルパー
 * （ルーター登録後に app.ts で使用）
 */
export async function enrichIncidentsWithSla(
  rows: IncidentRow[],
): Promise<(IncidentRow & { sla_status: string })[]> {
  return rows.map((r) => ({
    ...r,
    sla_status: calcSlaStatus(r.due_at, r.resolved_at),
  }));
}
