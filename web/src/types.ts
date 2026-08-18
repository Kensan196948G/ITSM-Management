/** API レスポンス型定義 */

export type Role = 'viewer' | 'operator' | 'manager' | 'admin';

export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: Role;
  department: string | null;
}

export interface Incident {
  id: string;
  ticket_no: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  category: string | null;
  assignee_id: string | null;
  site: string | null;
  system_name: string | null;
  due_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Problem {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  priority: string;
  root_cause: string | null;
  workaround: string | null;
  created_at: string;
}

export interface Change {
  id: string;
  ticket_no: string;
  title: string;
  change_type: 'normal' | 'standard' | 'emergency';
  risk_level: 'high' | 'medium' | 'low';
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

export interface CmdbItem {
  id: string;
  ci_id: string;
  name: string;
  ci_type: string;
  environment: string;
  site: string | null;
  status: string;
  owner: string | null;
  created_at: string;
}

export interface KnowledgeArticle {
  id: string;
  ticket_no: string;
  title: string;
  category: string | null;
  status: string;
  view_count: number;
  helpful_count: number;
  created_at: string;
}

export interface Asset {
  id: string;
  asset_no: string;
  name: string;
  asset_type: string;
  site: string | null;
  status: string;
  assignee: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  created_at: string;
}

export interface Patch {
  id: string;
  patch_no: string;
  title: string;
  severity: string;
  patch_type: string;
  status: string;
  target_count: number;
  applied_count: number;
  scheduled_at: string | null;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_no: string;
  title: string;
  event_type: string;
  severity: string;
  status: string;
  target: string | null;
  action_taken: string | null;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  req_no: string;
  title: string;
  category: string;
  requester: string | null;
  priority: string;
  status: string;
  approver: string | null;
  created_at: string;
}

export interface DashboardSummary {
  total: number;
  open: number;
  overdue: number;
  resolved: number;
  avgHours: number;
  slaRate: number;
  problems: number;
  changes: number;
  assets: number;
  security: number;
  cmdb: number;
  knowledge: number;
  patches: number;
  requests: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface SiteStatus {
  name: string;
  incidents: number;
  level: 'safe' | 'warning' | 'danger';
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_name: string | null;
  created_at: string;
}

/** ラベル・トーン定義 */
export const STATUS_LABEL: Record<string, string> = {
  open: '新規', in_progress: '対応中', waiting: '保留', resolved: '解決済', closed: 'クローズ',
  investigating: '調査中', known_error: '既知エラー', draft: '下書き', review: 'レビュー中',
  approved: '承認済', implementing: '実施中', rejected: '却下', published: '公開済', archived: 'アーカイブ',
  detected: '検知', contained: '封じ込め', pending: '未処理', approving: '承認待ち',
  completed: '完了', failed: '失敗', cancelled: '取消', active: '稼働中', maintenance: '保守中',
  in_use: '使用中', stock: '在庫', retired: '退役', disposed: '廃棄', planned: '計画中',
  testing: 'テスト中', deploying: '展開中', normal: '通常', standard: '標準', emergency: '緊急',
};

export const PRIORITY_LABEL: Record<string, string> = {
  critical: '緊急', high: '高', medium: '中', low: '低',
};

export const TONE: Record<string, string> = {
  critical: 'danger', high: 'warning', medium: 'info', low: 'success',
  open: 'info', in_progress: 'warning', waiting: 'info', resolved: 'success', closed: 'neutral',
  investigating: 'warning', known_error: 'danger', draft: 'neutral', review: 'info',
  approved: 'success', implementing: 'warning', rejected: 'danger', published: 'success',
  archived: 'neutral', detected: 'danger', contained: 'warning', pending: 'info',
  approving: 'info', completed: 'success', failed: 'danger', cancelled: 'neutral',
  active: 'success', maintenance: 'warning', in_use: 'success', stock: 'neutral',
  retired: 'warning', disposed: 'neutral', planned: 'info', testing: 'info', deploying: 'warning',
  normal: 'info', standard: 'info', emergency: 'danger',
};

export const ROLE_LABEL: Record<string, string> = {
  viewer: '閲覧者', operator: 'オペレータ', manager: 'マネージャ', admin: '管理者',
};

export function fmtDate(v: string | null | undefined, short = false): string {
  if (!v) return '—';
  const dt = new Date(v);
  if (isNaN(dt.getTime())) return '—';
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return short ? `${mm}/${dd} ${hh}:${mi}` : `${dt.getFullYear()}/${mm}/${dd} ${hh}:${mi}`;
}
