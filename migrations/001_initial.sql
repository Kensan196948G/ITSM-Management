-- =====================================================================
-- 001_initial.sql — ITSM Management / Service Desk 初期スキーマ
-- 適用: scripts/migrate.ts（冪等）
-- 設計根拠: docs/03-データモデル設計書.md
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- ユーザー (User) — ロール: viewer < operator < manager < admin
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      citext NOT NULL UNIQUE,
  display_name  text NOT NULL,
  email         citext NOT NULL UNIQUE,
  password_hash text NOT NULL,               -- PBKDF2: iterations:salt:hash (hex)
  role          text NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('viewer','operator','manager','admin')),
  department    text,
  is_active     boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================================
-- セッション (Session) — セッショントークン管理
-- =====================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id            text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,        -- SHA-256 hex
  expires_at    timestamptz NOT NULL,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- =====================================================================
-- 監査ログ (AuditLog) — create/update/delete の前後スナップショット
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text NOT NULL,               -- incident / problem / change / ...
  entity_id     text NOT NULL,               -- 対象レコードID（UUID文字列 or チケット番号）
  action        text NOT NULL CHECK (action IN ('create','update','delete','login','logout')),
  before_json   jsonb,
  after_json    jsonb,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- =====================================================================
-- インシデント (Incident)
-- =====================================================================
CREATE TABLE IF NOT EXISTS incidents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no     text NOT NULL UNIQUE,        -- INC-YYYY-XXXX
  title         text NOT NULL,
  description   text,
  priority      text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical','high','medium','low')),
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  category      text,
  assignee_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  reporter_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  location      text,
  site          text,                        -- 本社 / 現場A / 現場B / 全拠点
  system_name   text,
  impact        text CHECK (impact IN ('high','medium','low')),
  urgency       text CHECK (urgency IN ('high','medium','low')),
  due_at        timestamptz,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
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
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  comment       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inc_comments_incident ON incident_comments(incident_id);

-- =====================================================================
-- 問題 (Problem)
-- =====================================================================
CREATE TABLE IF NOT EXISTS problems (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no     text NOT NULL UNIQUE,        -- PRB-YYYY-XXXX
  title         text NOT NULL,
  description   text,
  status        text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','investigating','known_error','resolved','closed')),
  priority      text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('critical','high','medium','low')),
  root_cause    text,
  workaround    text,
  related_incident_ids jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);

-- =====================================================================
-- 変更 (Change)
-- =====================================================================
CREATE TABLE IF NOT EXISTS changes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no     text NOT NULL UNIQUE,        -- CHG-YYYY-XXXX
  title         text NOT NULL,
  change_type   text NOT NULL DEFAULT 'normal'
                CHECK (change_type IN ('normal','standard','emergency')),
  risk_level    text NOT NULL DEFAULT 'medium'
                CHECK (risk_level IN ('high','medium','low')),
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','review','approved','implementing','closed','rejected')),
  description   text,
  scheduled_at  timestamptz,
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_changes_status ON changes(status);

-- =====================================================================
-- CMDB (CI 構成アイテム)
-- =====================================================================
CREATE TABLE IF NOT EXISTS cmdb_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_id         text NOT NULL UNIQUE,        -- CI-YYYY-XXXX
  name          text NOT NULL,
  ci_type       text NOT NULL DEFAULT 'server'
                CHECK (ci_type IN ('server','network','software','service','storage','other')),
  environment   text NOT NULL DEFAULT 'production'
                CHECK (environment IN ('production','staging','cloud')),
  site          text,
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','maintenance','retired')),
  owner         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmdb_type ON cmdb_items(ci_type);

-- =====================================================================
-- ナレッジ (Knowledge)
-- =====================================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no     text NOT NULL UNIQUE,        -- KA-YYYY-XXXX
  title         text NOT NULL,
  body          text,
  category      text,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','review','published','archived')),
  view_count    integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_articles(status);

-- =====================================================================
-- IT資産 (Asset)
-- =====================================================================
CREATE TABLE IF NOT EXISTS assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_no      text NOT NULL UNIQUE,        -- AST-YYYY-XXXX
  name          text NOT NULL,
  asset_type    text NOT NULL DEFAULT 'pc'
                CHECK (asset_type IN ('pc','monitor','nas','printer','smartphone','ups')),
  site          text,
  status        text NOT NULL DEFAULT 'stock'
                CHECK (status IN ('stock','in_use','maintenance','retired','disposed')),
  assignee      text,
  purchase_date date,
  warranty_end  date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- =====================================================================
-- パッチ (Patch)
-- =====================================================================
CREATE TABLE IF NOT EXISTS patches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patch_no      text NOT NULL UNIQUE,        -- PTH-YYYY-XXXX
  title         text NOT NULL,
  severity      text NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('critical','high','medium','low')),
  patch_type    text NOT NULL DEFAULT 'windows_update'
                CHECK (patch_type IN ('windows_update','office','bios','vpn','antivirus','cad')),
  status        text NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','testing','deploying','completed','failed','cancelled')),
  target_count  integer NOT NULL DEFAULT 0,
  applied_count integer NOT NULL DEFAULT 0,
  scheduled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patches_status ON patches(status);

-- =====================================================================
-- セキュリティイベント (SecurityEvent)
-- =====================================================================
CREATE TABLE IF NOT EXISTS security_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no      text NOT NULL UNIQUE,        -- SEC-YYYY-XXXX
  title         text NOT NULL,
  event_type    text NOT NULL DEFAULT 'other'
                CHECK (event_type IN ('suspicious_login','usb_block','mfa_failure','dlp','vpn_failure','unauthorized_access','other')),
  severity      text NOT NULL DEFAULT 'medium'
                CHECK (severity IN ('critical','high','medium','low')),
  status        text NOT NULL DEFAULT 'detected'
                CHECK (status IN ('detected','investigating','contained','resolved','closed')),
  target        text,
  action_taken  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_severity ON security_events(severity);

-- =====================================================================
-- サービス要求 (ServiceRequest)
-- =====================================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  req_no        text NOT NULL UNIQUE,        -- REQ-YYYY-XXXX
  title         text NOT NULL,
  category      text NOT NULL DEFAULT 'pc'
                CHECK (category IN ('pc','account','teams','permission','software')),
  requester     text,
  priority      text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high','medium','low')),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approving','in_progress','completed','rejected','cancelled')),
  approver      text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);

COMMIT;
