/** モジュール設定（各画面のカラム・フィルタ・フォーム定義） */
import type { ModuleConfig } from './components/ModuleView.tsx';
import { Pill } from './components/ui.tsx';
import type { Incident, Problem, Change, CmdbItem, KnowledgeArticle, Asset, Patch, SecurityEvent, ServiceRequest } from './types.ts';
import { fmtDate } from './types.ts';

/** SLAピル（安全/注意/超過/遵守/違反） */
export function SLAPill({ dueAt, resolvedAt }: { dueAt: string | null; resolvedAt: string | null }) {
  if (!dueAt) return <span style={{ color: 'var(--muted-2)', fontSize: 11.5 }}>—</span>;
  const due = new Date(dueAt).getTime();
  if (resolvedAt) {
    const ok = new Date(resolvedAt).getTime() <= due;
    return <Pill value={ok ? 'resolved' : 'critical'} />;
  }
  const remaining = due - Date.now();
  if (remaining < 0) return <span className="pill pill--danger">超過</span>;
  if (remaining < 2 * 3600 * 1000) return <span className="pill pill--warning">注意</span>;
  return <span className="pill pill--success">安全</span>;
}

export const MODULE_CONFIGS: Record<string, ModuleConfig<never>> = {
  incidents: {
    key: 'incidents',
    label: 'インシデント管理',
    sub: '障害・問い合わせのチケット管理',
    apiPath: '/api/incidents',
    titleField: 'title',
    columns: [
      { key: 'ticket_no', label: 'チケット番号', cls: 'td-id' },
      { key: 'title', label: 'タイトル', cls: 'td-title' },
      { key: 'priority', label: '優先度', render: (v) => <Pill value={String(v)} /> },
      { key: 'status', label: 'ステータス', render: (v) => <Pill value={String(v)} /> },
      { key: 'sla', label: 'SLA', render: (_, r) => <SLAPill dueAt={(r as Incident).due_at} resolvedAt={(r as Incident).resolved_at} /> },
      { key: 'site', label: '拠点', cls: 'td-muted' },
      { key: 'created_at', label: '作成日', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v), true)}</span>, cls: 'td-nowrap' },
    ],
    filters: [
      { key: 'status', label: 'ステータス', options: ['open', 'in_progress', 'waiting', 'resolved', 'closed'] },
      { key: 'priority', label: '優先度', options: ['critical', 'high', 'medium', 'low'] },
      { key: 'site', label: '拠点', options: ['本社', '現場A', '現場B', '全拠点'] },
    ],
    fields: [
      { key: 'title', label: 'タイトル', required: true, full: true },
      { key: 'priority', label: '優先度', type: 'select', options: ['critical', 'high', 'medium', 'low'], required: true },
      { key: 'status', label: 'ステータス', type: 'select', options: ['open', 'in_progress', 'waiting', 'resolved', 'closed'] },
      { key: 'category', label: 'カテゴリ' },
      { key: 'site', label: '拠点', type: 'select', options: ['本社', '現場A', '現場B'] },
      { key: 'system_name', label: '対象システム' },
      { key: 'assignee_id', label: '担当者ID' },
      { key: 'due_at', label: 'SLA期限', type: 'date' },
      { key: 'description', label: '詳細', type: 'textarea', full: true },
    ],
    defaults: { priority: 'medium', status: 'open' },
    kpis: (items, total) => [
      { icon: '🎫', label: '総チケット', value: `${total}件`, tone: 'info' },
      { icon: '⏳', label: '未対応', value: `${items.filter((x) => ['open', 'in_progress', 'waiting'].includes((x as Incident).status)).length}件`, tone: 'warning' },
      { icon: '⚠️', label: 'SLA違反', value: `${items.filter((x) => !['resolved', 'closed'].includes((x as Incident).status) && (x as Incident).due_at && new Date((x as Incident).due_at!) < new Date()).length}件`, tone: 'danger' },
    ],
  },

  problem: {
    key: 'problem',
    label: '問題管理',
    sub: '根本原因分析・再発防止・既知エラーDB',
    apiPath: '/api/problems',
    titleField: 'title',
    columns: [
      { key: 'ticket_no', label: '問題番号', cls: 'td-id' },
      { key: 'title', label: 'タイトル', cls: 'td-title' },
      { key: 'status', label: 'ステータス', render: (v) => <Pill value={String(v)} /> },
      { key: 'priority', label: '優先度', render: (v) => <Pill value={String(v)} /> },
      { key: 'workaround', label: '回避策', cls: 'td-muted' },
      { key: 'created_at', label: '作成日', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v), true)}</span> },
    ],
    filters: [
      { key: 'status', label: 'ステータス', options: ['open', 'investigating', 'known_error', 'resolved', 'closed'] },
      { key: 'priority', label: '優先度', options: ['critical', 'high', 'medium', 'low'] },
    ],
    fields: [
      { key: 'title', label: 'タイトル', required: true, full: true },
      { key: 'priority', label: '優先度', type: 'select', options: ['critical', 'high', 'medium', 'low'], required: true },
      { key: 'status', label: 'ステータス', type: 'select', options: ['open', 'investigating', 'known_error', 'resolved', 'closed'] },
      { key: 'root_cause', label: '根本原因', type: 'textarea', full: true },
      { key: 'workaround', label: '回避策', type: 'textarea', full: true },
    ],
    defaults: { priority: 'medium', status: 'open' },
  },

  change: {
    key: 'change',
    label: '変更管理',
    sub: '変更申請・CAB承認・ロールバック管理',
    apiPath: '/api/changes',
    titleField: 'title',
    columns: [
      { key: 'ticket_no', label: '変更番号', cls: 'td-id' },
      { key: 'title', label: 'タイトル', cls: 'td-title' },
      { key: 'change_type', label: '種別', render: (v) => <Pill value={String(v)} /> },
      { key: 'risk_level', label: 'リスク', render: (v) => <Pill value={String(v)} /> },
      { key: 'status', label: 'ステータス', render: (v) => <Pill value={String(v)} /> },
      { key: 'scheduled_at', label: '実施予定', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v), true)}</span> },
    ],
    filters: [
      { key: 'status', label: 'ステータス', options: ['draft', 'review', 'approved', 'implementing', 'closed', 'rejected'] },
      { key: 'risk_level', label: 'リスク', options: ['high', 'medium', 'low'] },
    ],
    fields: [
      { key: 'title', label: 'タイトル', required: true, full: true },
      { key: 'change_type', label: '変更種別', type: 'select', options: ['normal', 'standard', 'emergency'], required: true },
      { key: 'risk_level', label: 'リスクレベル', type: 'select', options: ['high', 'medium', 'low'] },
      { key: 'status', label: 'ステータス', type: 'select', options: ['draft', 'review', 'approved', 'implementing', 'closed', 'rejected'] },
      { key: 'scheduled_at', label: '実施予定日', type: 'date' },
      { key: 'description', label: '詳細', type: 'textarea', full: true },
    ],
    defaults: { change_type: 'normal', risk_level: 'medium', status: 'draft' },
  },

  cmdb: {
    key: 'cmdb',
    label: 'CMDB',
    sub: '構成情報・依存関係・拠点ネットワーク',
    apiPath: '/api/cmdb',
    titleField: 'name',
    columns: [
      { key: 'ci_id', label: 'CI ID', cls: 'td-id' },
      { key: 'name', label: '名前', render: (v) => <span className="mono">{String(v)}</span> },
      { key: 'ci_type', label: '種別', render: (v) => <Pill value={String(v)} /> },
      { key: 'environment', label: '環境', cls: 'td-muted' },
      { key: 'site', label: '拠点', cls: 'td-muted' },
      { key: 'status', label: '状態', render: (v) => <Pill value={String(v)} /> },
    ],
    filters: [
      { key: 'ci_type', label: '種別', options: ['server', 'network', 'software', 'service', 'storage', 'other'] },
      { key: 'status', label: '状態', options: ['active', 'maintenance', 'retired'] },
    ],
    fields: [
      { key: 'name', label: '名前', required: true },
      { key: 'ci_type', label: '種別', type: 'select', options: ['server', 'network', 'software', 'service', 'storage', 'other'], required: true },
      { key: 'environment', label: '環境', type: 'select', options: [{ value: 'production', label: '本番' }, { value: 'staging', label: '検証' }, { value: 'cloud', label: 'クラウド' }] },
      { key: 'site', label: '拠点' },
      { key: 'owner', label: 'オーナー' },
      { key: 'status', label: '状態', type: 'select', options: ['active', 'maintenance', 'retired'] },
    ],
    defaults: { ci_type: 'server', environment: 'production', status: 'active' },
  },

  knowledge: {
    key: 'knowledge',
    label: 'ナレッジ管理',
    sub: 'FAQ・手順書・既知エラー情報',
    apiPath: '/api/knowledge',
    titleField: 'title',
    columns: [
      { key: 'ticket_no', label: '記事番号', cls: 'td-id' },
      { key: 'title', label: 'タイトル', cls: 'td-title' },
      { key: 'category', label: 'カテゴリ', cls: 'td-muted' },
      { key: 'status', label: 'ステータス', render: (v) => <Pill value={String(v)} /> },
      { key: 'view_count', label: '参照数', render: (v) => <span className="mono tnum">{String(v)}</span> },
      { key: 'helpful_count', label: '役立った', render: (v) => <span className="mono tnum">{String(v)}</span> },
    ],
    filters: [
      { key: 'status', label: 'ステータス', options: ['draft', 'review', 'published', 'archived'] },
      { key: 'category', label: 'カテゴリ', options: ['FAQ', '障害対応手順', '運用手順', '現場向け手順'] },
    ],
    fields: [
      { key: 'title', label: 'タイトル', required: true, full: true },
      { key: 'category', label: 'カテゴリ', type: 'select', options: ['FAQ', '障害対応手順', '運用手順', '現場向け手順'], required: true },
      { key: 'status', label: 'ステータス', type: 'select', options: ['draft', 'review', 'published', 'archived'] },
      { key: 'body', label: '本文', type: 'textarea', full: true },
    ],
    defaults: { status: 'draft', category: 'FAQ' },
  },

  asset: {
    key: 'asset',
    label: 'IT資産管理',
    sub: '所有・貸与・保守期限管理',
    apiPath: '/api/assets',
    titleField: 'name',
    columns: [
      { key: 'asset_no', label: '資産番号', cls: 'td-id' },
      { key: 'name', label: '名称', cls: 'td-title' },
      { key: 'asset_type', label: '種別', render: (v) => <Pill value={String(v)} /> },
      { key: 'site', label: '拠点', cls: 'td-muted' },
      { key: 'assignee', label: '利用者', cls: 'td-muted' },
      { key: 'status', label: '状態', render: (v) => <Pill value={String(v)} /> },
    ],
    filters: [
      { key: 'asset_type', label: '種別', options: ['pc', 'monitor', 'nas', 'printer', 'smartphone'] },
      { key: 'status', label: '状態', options: ['stock', 'in_use', 'maintenance', 'retired', 'disposed'] },
    ],
    fields: [
      { key: 'name', label: '名称', required: true, full: true },
      { key: 'asset_type', label: '種別', type: 'select', options: ['pc', 'monitor', 'nas', 'printer', 'smartphone', 'ups'], required: true },
      { key: 'site', label: '拠点' },
      { key: 'assignee', label: '利用者' },
      { key: 'status', label: '状態', type: 'select', options: ['stock', 'in_use', 'maintenance', 'retired', 'disposed'] },
      { key: 'purchase_date', label: '購入日', type: 'date' },
      { key: 'warranty_end', label: '保証期限', type: 'date' },
    ],
    defaults: { asset_type: 'pc', status: 'stock' },
  },

  patch: {
    key: 'patch',
    label: 'パッチ管理',
    sub: '適用状況・失敗端末・緊急パッチ',
    apiPath: '/api/patches',
    titleField: 'title',
    columns: [
      { key: 'patch_no', label: 'パッチ番号', cls: 'td-id' },
      { key: 'title', label: 'タイトル', cls: 'td-title' },
      { key: 'severity', label: '重要度', render: (v) => <Pill value={String(v)} /> },
      { key: 'status', label: '状態', render: (v) => <Pill value={String(v)} /> },
      { key: 'applied', label: '適用/対象', render: (_, r) => <span className="mono tnum">{(r as Patch).applied_count}/{(r as Patch).target_count}</span> },
      { key: 'scheduled_at', label: '期限', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v), true)}</span> },
    ],
    filters: [
      { key: 'severity', label: '重要度', options: ['critical', 'high', 'medium', 'low'] },
      { key: 'status', label: '状態', options: ['planned', 'testing', 'deploying', 'completed', 'failed', 'cancelled'] },
    ],
    fields: [
      { key: 'title', label: 'タイトル', required: true, full: true },
      { key: 'severity', label: '重要度', type: 'select', options: ['critical', 'high', 'medium', 'low'], required: true },
      { key: 'patch_type', label: '種別', type: 'select', options: ['windows_update', 'office', 'bios', 'vpn', 'antivirus', 'cad'] },
      { key: 'status', label: '状態', type: 'select', options: ['planned', 'testing', 'deploying', 'completed', 'failed', 'cancelled'] },
      { key: 'target_count', label: '対象台数', type: 'number' },
      { key: 'applied_count', label: '適用台数', type: 'number' },
      { key: 'scheduled_at', label: '期限', type: 'date' },
    ],
    defaults: { severity: 'medium', status: 'planned', patch_type: 'windows_update' },
  },

  security: {
    key: 'security',
    label: 'セキュリティ管理',
    sub: 'MFA・不審ログイン・DLP・AV',
    apiPath: '/api/security_events',
    titleField: 'title',
    columns: [
      { key: 'event_no', label: 'イベント番号', cls: 'td-id' },
      { key: 'title', label: '内容', cls: 'td-title' },
      { key: 'event_type', label: '種別', render: (v) => <Pill value={String(v)} /> },
      { key: 'severity', label: '重要度', render: (v) => <Pill value={String(v)} /> },
      { key: 'status', label: '状態', render: (v) => <Pill value={String(v)} /> },
      { key: 'target', label: '対象', cls: 'td-muted' },
    ],
    filters: [
      { key: 'severity', label: '重要度', options: ['critical', 'high', 'medium', 'low'] },
      { key: 'status', label: '状態', options: ['detected', 'investigating', 'contained', 'resolved', 'closed'] },
    ],
    fields: [
      { key: 'title', label: '内容', required: true, full: true },
      { key: 'event_type', label: '種別', type: 'select', options: ['suspicious_login', 'usb_block', 'mfa_failure', 'dlp', 'vpn_failure', 'unauthorized_access'], required: true },
      { key: 'severity', label: '重要度', type: 'select', options: ['critical', 'high', 'medium', 'low'] },
      { key: 'status', label: '状態', type: 'select', options: ['detected', 'investigating', 'contained', 'resolved', 'closed'] },
      { key: 'target', label: '対象' },
      { key: 'action_taken', label: '対応内容', type: 'textarea', full: true },
    ],
    defaults: { severity: 'medium', status: 'detected' },
  },

  request: {
    key: 'request',
    label: 'サービス要求',
    sub: '申請・承認ワークフロー管理',
    apiPath: '/api/service_requests',
    titleField: 'title',
    columns: [
      { key: 'req_no', label: '申請番号', cls: 'td-id' },
      { key: 'title', label: '申請内容', cls: 'td-title' },
      { key: 'category', label: 'カテゴリ', render: (v) => <Pill value={String(v)} /> },
      { key: 'requester', label: '申請者', cls: 'td-muted' },
      { key: 'status', label: '状態', render: (v) => <Pill value={String(v)} /> },
      { key: 'created_at', label: '申請日', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v), true)}</span> },
    ],
    filters: [
      { key: 'status', label: '状態', options: ['pending', 'approving', 'in_progress', 'completed', 'rejected', 'cancelled'] },
      { key: 'category', label: 'カテゴリ', options: ['pc', 'account', 'teams', 'permission', 'software'] },
    ],
    fields: [
      { key: 'title', label: '申請内容', required: true, full: true },
      { key: 'category', label: 'カテゴリ', type: 'select', options: ['pc', 'account', 'teams', 'permission', 'software'], required: true },
      { key: 'priority', label: '優先度', type: 'select', options: ['high', 'medium', 'low'] },
      { key: 'requester', label: '申請者' },
      { key: 'status', label: '状態', type: 'select', options: ['pending', 'approving', 'in_progress', 'completed', 'rejected', 'cancelled'] },
      { key: 'approver', label: '承認者' },
      { key: 'description', label: '詳細', type: 'textarea', full: true },
    ],
    defaults: { category: 'pc', status: 'pending', priority: 'medium' },
  },
};

export type { Incident, Problem, Change, CmdbItem, KnowledgeArticle, Asset, Patch, SecurityEvent, ServiceRequest };
