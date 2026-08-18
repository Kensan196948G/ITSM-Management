/**
 * 共有型定義（API レスポンス・リクエスト・DB行）
 */
export type Role = 'viewer' | 'operator' | 'manager' | 'admin';

export const ROLE_ORDER: Role[] = ['viewer', 'operator', 'manager', 'admin'];

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  role: Role;
  department: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: Role;
  department: string | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export interface IncidentRow {
  id: string;
  ticket_no: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  category: string | null;
  assignee_id: string | null;
  reporter_id: string | null;
  location: string | null;
  site: string | null;
  system_name: string | null;
  impact: string | null;
  urgency: string | null;
  due_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProblemRow {
  id: string;
  ticket_no: string;
  title: string;
  description: string | null;
  status: 'open' | 'investigating' | 'known_error' | 'resolved' | 'closed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  root_cause: string | null;
  workaround: string | null;
  related_incident_ids: unknown[];
  created_at: string;
  updated_at: string;
}

export interface ChangeRow {
  id: string;
  ticket_no: string;
  title: string;
  change_type: 'normal' | 'standard' | 'emergency';
  risk_level: 'high' | 'medium' | 'low';
  status: 'draft' | 'review' | 'approved' | 'implementing' | 'closed' | 'rejected';
  description: string | null;
  scheduled_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmdbRow {
  id: string;
  ci_id: string;
  name: string;
  ci_type: 'server' | 'network' | 'software' | 'service' | 'storage' | 'other';
  environment: 'production' | 'staging' | 'cloud';
  site: string | null;
  status: 'active' | 'maintenance' | 'retired';
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeRow {
  id: string;
  ticket_no: string;
  title: string;
  body: string | null;
  category: string | null;
  status: 'draft' | 'review' | 'published' | 'archived';
  view_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface AssetRow {
  id: string;
  asset_no: string;
  name: string;
  asset_type: 'pc' | 'monitor' | 'nas' | 'printer' | 'smartphone' | 'ups';
  site: string | null;
  status: 'stock' | 'in_use' | 'maintenance' | 'retired' | 'disposed';
  assignee: string | null;
  purchase_date: string | null;
  warranty_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatchRow {
  id: string;
  patch_no: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  patch_type: 'windows_update' | 'office' | 'bios' | 'vpn' | 'antivirus' | 'cad';
  status: 'planned' | 'testing' | 'deploying' | 'completed' | 'failed' | 'cancelled';
  target_count: number;
  applied_count: number;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityEventRow {
  id: string;
  event_no: string;
  title: string;
  event_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  target: string | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestRow {
  id: string;
  req_no: string;
  title: string;
  category: 'pc' | 'account' | 'teams' | 'permission' | 'software';
  requester: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approving' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';
  approver: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json: unknown;
  after_json: unknown;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

/** 一覧レスポンス共通形 */
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

/** SLA状態（計算値・非保存） */
export type SlaStatus = 'safe' | 'risk' | 'urgent';

export interface AppEnv {
  Bindings: {
    DATABASE_URL: string;
    SESSION_SECRET: string;
    ENVIRONMENT?: string;
    APP_NAME?: string;
  };
  Variables: {
    user: UserRow;
    db: import('./db/client.ts').NeonClient;
  };
}
