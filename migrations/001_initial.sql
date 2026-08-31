-- =====================================================================
-- 001_initial.sql — ITSM Management / Service Desk 初期スキーマ（Cloudflare D1 / SQLite 版）
-- 適用: scripts/migrate.ts（wrangler d1 migrations 経由・冪等）
-- 設計根拠: docs/03-データモデル設計書.md
-- 注: 2026-08-31 Neon PostgreSQL 廃止に伴い SQLite (D1) 方言へ移行。
--      uuid → TEXT（アプリで crypto.randomUUID() 生成）、
--      timestamptz → TEXT（UTC ISO-8601）、jsonb → TEXT（JSON文字列）、
--      boolean → INTEGER（0/1）、citext → TEXT COLLATE NOCASE。
-- =====================================================================

-- =====================================================================
-- ユーザー (User) — ロール: viewer < operator < manager < admin
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,               -- PBKDF2: iterations:salt:hash (hex)
  role          TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('viewer','operator','manager','admin')),
  department    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================================
-- セッション (Session) — セッショントークン管理
-- =====================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,        -- SHA-256 hex
  expires_at    TEXT NOT NULL,
  last_seen_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  revoked_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- =====================================================================
-- 監査ログ (AuditLog) — create/update/delete の前後スナップショット
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  entity_type   TEXT NOT NULL,               -- incident / problem / change / ...
  entity_id     TEXT NOT NULL,               -- 対象レコードID（UUID文字列 or チケット番号）
  action        TEXT NOT NULL CHECK (action IN ('create','update','delete','login','logout')),
  before_json   TEXT,
  after_json    TEXT,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- =====================================================================
-- インシデント (Incident)
-- =====================================================================
CREATE TABLE IF NOT EXISTS incidents (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ticket_no     TEXT NOT NULL UNIQUE,        -- INC-YYYY-XXXX
  title         TEXT NOT NULL,
  description   TEXT,
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical','high','medium','low')),
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  category      TEXT,
  assignee_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  reporter_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  location      TEXT,
  site          TEXT,                        -- 本社 / 現場A / 現場B / 全拠点
  system_name   TEXT,
  impact        TEXT CHECK (impact IN ('high','medium','low')),
  urgency       TEXT CHECK (urgency IN ('high','medium','low')),
  due_at        TEXT,
  resolved_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_assignee ON incidents(assignee_id);
CREATE INDEX IF NOT EXISTS idx_incidents_site ON incidents(site);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);

-- =====================================================================
-- インシデントコメント (IncidentComment)
-- =====================================================================
CREATE TABLE IF NOT EXISTS incident_comments (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  incident_id   TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  comment       TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_inc_comments_incident ON incident_comments(incident_id);

-- =====================================================================
-- 問題 (Problem)
-- =====================================================================
CREATE TABLE IF NOT EXISTS problems (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ticket_no     TEXT NOT NULL UNIQUE,        -- PRB-YYYY-XXXX
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','investigating','known_error','resolved','closed')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical','high','medium','low')),
  root_cause    TEXT,
  workaround    TEXT,
  related_incident_ids TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);

-- =====================================================================
-- 変更 (Change)
-- =====================================================================
CREATE TABLE IF NOT EXISTS changes (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ticket_no     TEXT NOT NULL UNIQUE,        -- CHG-YYYY-XXXX
  title         TEXT NOT NULL,
  change_type   TEXT NOT NULL DEFAULT 'normal'
                CHECK (change_type IN ('normal','standard','emergency')),
  risk_level    TEXT NOT NULL DEFAULT 'medium'
                CHECK (risk_level IN ('high','medium','low')),
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','review','approved','implementing','closed','rejected')),
  description   TEXT,
  scheduled_at  TEXT,
  created_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status);

-- =====================================================================
-- CMDB (CI 構成アイテム)
-- =====================================================================
CREATE TABLE IF NOT EXISTS cmdb_items (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ci_id         TEXT NOT NULL UNIQUE,        -- CI-YYYY-XXXX
  name          TEXT NOT NULL,
  ci_type       TEXT NOT NULL DEFAULT 'server'
                CHECK (ci_type IN ('server','network','software','service','storage','other')),
  environment   TEXT NOT NULL DEFAULT 'production'
                CHECK (environment IN ('production','staging','cloud')),
  site          TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','maintenance','retired')),
  owner         TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_cmdb_type ON cmdb_items(ci_type);

-- =====================================================================
-- ナレッジ (Knowledge)
-- =====================================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ticket_no     TEXT NOT NULL UNIQUE,        -- KA-YYYY-XXXX
  title         TEXT NOT NULL,
  body          TEXT,
  category      TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','review','published','archived')),
  view_count    INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_articles(status);

-- =====================================================================
-- IT資産 (Asset)
-- =====================================================================
CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  asset_no      TEXT NOT NULL UNIQUE,        -- AST-YYYY-XXXX
  name          TEXT NOT NULL,
  asset_type    TEXT NOT NULL DEFAULT 'pc'
                CHECK (asset_type IN ('pc','monitor','nas','printer','smartphone','ups')),
  site          TEXT,
  status        TEXT NOT NULL DEFAULT 'stock'
                CHECK (status IN ('stock','in_use','maintenance','retired','disposed')),
  assignee      TEXT,
  purchase_date TEXT,
  warranty_end  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- =====================================================================
-- パッチ (Patch)
-- =====================================================================
CREATE TABLE IF NOT EXISTS patches (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  patch_no      TEXT NOT NULL UNIQUE,        -- PTH-YYYY-XXXX
  title         TEXT NOT NULL,
  severity      TEXT NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('critical','high','medium','low')),
  patch_type    TEXT NOT NULL DEFAULT 'windows_update'
                CHECK (patch_type IN ('windows_update','office','bios','vpn','antivirus','cad')),
  status        TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','testing','deploying','completed','failed','cancelled')),
  target_count  INTEGER NOT NULL DEFAULT 0,
  applied_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_patches_status ON patches(status);

-- =====================================================================
-- セキュリティイベント (SecurityEvent)
-- =====================================================================
CREATE TABLE IF NOT EXISTS security_events (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_no      TEXT NOT NULL UNIQUE,        -- SEC-YYYY-XXXX
  title         TEXT NOT NULL,
  event_type    TEXT NOT NULL DEFAULT 'other'
                CHECK (event_type IN ('suspicious_login','usb_block','mfa_failure','dlp','vpn_failure','unauthorized_access','other')),
  severity      TEXT NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('critical','high','medium','low')),
  status        TEXT NOT NULL DEFAULT 'detected'
                CHECK (status IN ('detected','investigating','contained','resolved','closed')),
  target        TEXT,
  action_taken  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_security_severity ON security_events(severity);

-- =====================================================================
-- サービス要求 (ServiceRequest)
-- =====================================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  req_no        TEXT NOT NULL UNIQUE,        -- REQ-YYYY-XXXX
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'pc'
                CHECK (category IN ('pc','account','teams','permission','software')),
  requester     TEXT,
  priority      TEXT NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high','medium','low')),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approving','in_progress','completed','rejected','cancelled')),
  approver      TEXT,
  description   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
