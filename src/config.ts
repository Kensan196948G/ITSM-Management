/**
 * 定数・設定（ITSM Management / Service Desk）
 */
export const APP_NAME = 'itsm-management';
export const APP_DISPLAY_NAME = 'ITSM Management / Service Desk';

/** RBAC ロール順位（viewer < operator < manager < admin） */
export const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  operator: 2,
  manager: 3,
  admin: 4,
};

export const ROLES = ['viewer', 'operator', 'manager', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<string, string> = {
  viewer: '閲覧者',
  operator: 'オペレータ',
  manager: 'マネージャ',
  admin: '管理者',
};

/** インシデント状態 */
export const INCIDENT_STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const;
export const INCIDENT_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export const STATUS_LABEL: Record<string, string> = {
  open: '新規',
  in_progress: '対応中',
  waiting: '保留',
  resolved: '解決済',
  closed: 'クローズ',
  investigating: '調査中',
  known_error: '既知エラー',
  draft: '下書き',
  review: 'レビュー中',
  approved: '承認済',
  implementing: '実施中',
  rejected: '却下',
  published: '公開済',
  archived: 'アーカイブ',
  detected: '検知',
  contained: '封じ込め',
  pending: '未処理',
  approving: '承認待ち',
  completed: '完了',
  failed: '失敗',
  cancelled: '取消',
  active: '稼働中',
  maintenance: '保守中',
  in_use: '使用中',
  stock: '在庫',
  retired: '退役',
  disposed: '廃棄',
  planned: '計画中',
  testing: 'テスト中',
  deploying: '展開中',
};

export const PRIORITY_LABEL: Record<string, string> = {
  critical: '緊急',
  high: '高',
  medium: '中',
  low: '低',
};

/** SLA 対応期限（優先度別・時間） */
export const SLA_HOURS: Record<string, number> = {
  critical: 2,
  high: 4,
  medium: 8,
  low: 24,
};

/** SLA リスク閾値（この時間以内なら risk） */
export const SLA_RISK_THRESHOLD_HOURS = 2;

/** セッション有効時間（時間） */
export const SESSION_TTL_HOURS = 12;

/** 一覧のデフォルトページサイズ */
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/** 監査対象モジュール（チケット採番プレフィックス） */
export const TICKET_PREFIX: Record<string, string> = {
  incidents: 'INC',
  problems: 'PRB',
  changes: 'CHG',
  cmdb_items: 'CI',
  knowledge_articles: 'KA',
  assets: 'AST',
  patches: 'PTH',
  security_events: 'SEC',
  service_requests: 'REQ',
};
