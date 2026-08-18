/**
 * シードスクリプト（開発・デモ用データ）— 冪等
 *   node --import tsx scripts/seed.ts
 * .env の DATABASE_URL を参照し、ユーザー/インシデント/問題/変更/CMDB/ナレッジ/資産/パッチ/セキュリティ/要求を投入する。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NeonClient } from '../src/db/client.ts';
import { hashPassword } from '../src/auth.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv(): Record<string, string> {
  const envFile = join(root, '.env');
  if (!existsSync(envFile)) {
    console.error('.env が見つかりません');
    process.exit(1);
  }
  const out: Record<string, string> = {};
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && m[1] !== undefined && m[2] !== undefined) out[m[1]] = m[2];
  }
  return out;
}

function demoPassword(env: Record<string, string>): string {
  const fromEnv = env.SEED_DEMO_PASSWORD;
  if (fromEnv) return fromEnv;
  if (env.ENVIRONMENT === 'production') {
    console.error('本番環境では SEED_DEMO_PASSWORD を設定してください');
    process.exit(1);
  }
  return 'Mirai#2026';
}

async function seedUser(db: NeonClient, u: { username: string; display_name: string; email: string; role: string; department: string }) {
  const existing = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE username = $1', [u.username]);
  if (existing) return existing.id;
  const passwordHash = await hashPassword(process.env.SEED_PASSWORD ?? 'Mirai#2026');
  const row = await db.queryOne<{ id: string }>(
    `INSERT INTO users (username, display_name, email, password_hash, role, department)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [u.username, u.display_name, u.email, passwordHash, u.role, u.department],
  );
  return row!.id;
}

async function seedIfEmpty(db: NeonClient, table: string, rows: { sql: string; params: unknown[] }[]) {
  const count = await db.queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM ${table}`);
  if (parseInt(count?.total ?? '0', 10) > 0) {
    console.log(`skip    ${table}（既に ${count!.total} 件）`);
    return;
  }
  for (const r of rows) {
    await db.query(r.sql, r.params);
  }
  console.log(`seed    ${table}: ${rows.length} 件`);
}

async function main() {
  const env = loadEnv();
  const db = new NeonClient(env.DATABASE_URL!);
  const password = demoPassword(env);
  console.log(`SEED_DEMO_PASSWORD: ${password.startsWith('Mirai') ? 'Mirai#2026 (デフォルト)' : '（環境変数由来）'}`);

  // ── ユーザー（冪等: usernameで存在確認） ──
  const users = [
    { username: 'tanaka', display_name: '田中 太郎', email: 'tanaka@example.com', role: 'admin', department: 'IT管理課' },
    { username: 'sato', display_name: '佐藤 花子', email: 'sato@example.com', role: 'operator', department: 'ヘルプデスク' },
    { username: 'suzuki', display_name: '鈴木 一郎', email: 'suzuki@example.com', role: 'operator', department: 'インフラ課' },
    { username: 'yamada', display_name: '山田 美咲', email: 'yamada@example.com', role: 'manager', department: 'IT管理課' },
    { username: 'takahashi', display_name: '高橋 健太', email: 'takahashi@example.com', role: 'viewer', department: '総務部' },
  ];
  const userIds: Record<string, string> = {};
  for (const u of users) {
    const id = await seedUser(db, { ...u, role: u.role });
    userIds[u.username] = id;
    console.log(`seed    user: ${u.username} (${u.role})`);
  }

  // ── インシデント ──
  const now = new Date();
  const daysAgo = (n: number, h = 9) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  const daysLater = (n: number, h = 17) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };

  const incidents: [string, string, string, string, string, string, string, string, string | null, string | null, string][] = [
    ['Microsoft 365 メール送信不可', 'Outlook経由のメール送信が全社で不可。Exchange Online障害の可能性。', 'critical', 'in_progress', 'メール', 'sato', '本社', 'Microsoft 365', daysLater(0, 12), null, daysAgo(0, 8)],
    ['VPN接続タイムアウト（現場A）', '現場AからのVPN接続が頻繁にタイムアウトする。', 'high', 'open', 'ネットワーク', 'suzuki', '現場A', 'VPN', daysLater(1), null, daysAgo(0, 9)],
    ['プリンタ印刷キュー滞留', '3Fプリンタの印刷キューが滞留している。', 'medium', 'open', 'プリンタ', 'sato', '本社', 'プリンタ', daysLater(2), null, daysAgo(1, 14)],
    ['Teams通話品質劣化', 'Teams会議中に音声が途切れる現象が複数報告。', 'high', 'in_progress', 'コミュニケーション', 'suzuki', '本社', 'Microsoft 365', daysLater(0, 18), null, daysAgo(1, 10)],
    ['CADソフト ライセンスエラー', 'AutoCAD起動時にライセンス認証に失敗する。', 'medium', 'waiting', 'ソフトウェア', 'suzuki', '現場B', 'CAD', daysLater(3), null, daysAgo(2, 9)],
    ['ファイルサーバ応答遅延', '共有フォルダへのアクセスに10秒以上かかる。', 'high', 'resolved', 'サーバ', 'suzuki', '本社', 'FileServer', daysAgo(0, 18), daysAgo(1, 15), daysAgo(3, 8)],
    ['新入社員PC セットアップ依頼', '4月入社の5名分のPC初期設定。', 'low', 'closed', 'PC', 'sato', '本社', 'PC', daysAgo(0), daysAgo(2, 17), daysAgo(5, 9)],
    ['OneDrive 同期エラー', '特定ユーザーのOneDriveが同期停止中。', 'medium', 'in_progress', 'クラウド', 'sato', '本社', 'Microsoft 365', daysLater(1, 12), null, daysAgo(1, 11)],
    ['Wi-Fi 接続不安定（2F会議室）', '2F会議室エリアのWi-Fiが断続的に切断。', 'medium', 'open', 'ネットワーク', 'suzuki', '本社', 'ネットワーク', daysLater(2), null, daysAgo(0, 13)],
    ['Entra ID 条件付きアクセス誤ブロック', '正規ユーザーがMFA後もブロックされる。', 'critical', 'resolved', '認証', 'tanaka', '全拠点', 'Entra ID', daysAgo(1, 12), daysAgo(3, 11), daysAgo(4, 7)],
    ['SharePoint サイトアクセス権エラー', '部門サイトに正規メンバーがアクセスできない。', 'high', 'open', 'クラウド', 'sato', '本社', 'Microsoft 365', daysLater(1), null, daysAgo(0, 11)],
    ['基幹システム ログイン不可', '会計システムにログインできない（パスワード期限切れ多発）。', 'critical', 'in_progress', '業務システム', 'tanaka', '本社', '会計システム', daysLater(0, 15), null, daysAgo(0, 7)],
    ['モバイル端末 紛失報告', '営業担当がスマートフォンを社外で紛失。リモートワイプ要。', 'critical', 'resolved', 'セキュリティ', 'tanaka', '現場A', 'MDM', daysAgo(0, 12), daysAgo(2, 18), daysAgo(2, 16)],
    ['プロジェクタ HDMI接続不良', '大会議室のプロジェクタが映らない。', 'low', 'closed', 'AV機器', 'sato', '本社', 'AV機器', daysAgo(1), daysAgo(3, 10), daysAgo(4, 13)],
    ['メール誤送信（添付ファイル）', '機密ファイルを誤って外部に送信。DLP連携で要調査。', 'high', 'in_progress', 'セキュリティ', 'tanaka', '本社', 'Microsoft 365', daysLater(0, 17), null, daysAgo(0, 10)],
    ['現場B 回線断（光ケーブル工事）', '近隣工事の影響で現場Bの光回線が不通。', 'high', 'waiting', 'ネットワーク', 'suzuki', '現場B', 'WAN', daysLater(1, 12), null, daysAgo(1, 8)],
    ['Windows Update後 起動不可', '更新適用後に複数PCがブルースクリーンで起動しない。', 'critical', 'in_progress', 'PC', 'suzuki', '本社', 'Windows', daysLater(0, 14), null, daysAgo(0, 9)],
    ['共有プリンタ トナー切れ', '2F複合機のトナーが切れて印刷不可。', 'low', 'resolved', 'プリンタ', 'sato', '本社', 'プリンタ', daysAgo(0, 15), daysAgo(2, 13), daysAgo(2, 11)],
    ['VPN同時接続数 上限超過', 'リモート勤務集中でVPN接続が上限に達し新規接続不可。', 'medium', 'open', 'ネットワーク', 'suzuki', '全拠点', 'VPN', daysLater(1), null, daysAgo(0, 8)],
    ['バックアップジョブ 失敗', '夜間のファイルサーバ自動バックアップが3夜連続失敗。', 'high', 'in_progress', 'サーバ', 'suzuki', '本社', 'BackupServer', daysLater(0, 20), null, daysAgo(1, 7)],
  ];

  const year = now.getFullYear();
  await seedIfEmpty(
    db,
    'incidents',
    incidents.map(([title, desc, priority, status, category, assignee, site, system, due, resolved, created], i) => ({
      sql: `INSERT INTO incidents (ticket_no, title, description, priority, status, category, assignee_id, site, system_name, due_at, resolved_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      params: [`INC-${year}-${String(i + 1).padStart(4, '0')}`, title, desc, priority, status, category, userIds[assignee as string], site, system, due, resolved, created],
    })),
  );
  console.log(`seed    incident: ${incidents.length} 件（INC-${year}-0001〜）`);

  // ── 問題 ──
  await seedIfEmpty(db, 'problems', [
    { sql: 'INSERT INTO problems (ticket_no, title, status, priority, root_cause, workaround) VALUES ($1,$2,$3,$4,$5,$6)', params: ['PRB-2026-0001', 'VPN接続タイムアウト反復', 'investigating', 'high', '', '再接続で一時復旧'] },
    { sql: 'INSERT INTO problems (ticket_no, title, status, priority, root_cause, workaround) VALUES ($1,$2,$3,$4,$5,$6)', params: ['PRB-2026-0002', 'Exchange Onlineメール遅延', 'known_error', 'critical', 'MS側リージョン障害', 'OWA経由で送信'] },
    { sql: 'INSERT INTO problems (ticket_no, title, status, priority, root_cause, workaround) VALUES ($1,$2,$3,$4,$5,$6)', params: ['PRB-2026-0003', 'プリンタドライバ互換性問題', 'open', 'medium', '', '旧ドライバ使用'] },
    { sql: 'INSERT INTO problems (ticket_no, title, status, priority, root_cause, workaround) VALUES ($1,$2,$3,$4,$5,$6)', params: ['PRB-2026-0004', 'Teams音声品質劣化（帯域）', 'resolved', 'high', 'QoS未設定', ''] },
  ]);

  // ── 変更 ──
  await seedIfEmpty(db, 'changes', [
    { sql: 'INSERT INTO changes (ticket_no, title, change_type, risk_level, status, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6)', params: ['CHG-2026-0001', 'VPNクライアントバージョンアップ', 'normal', 'medium', 'review', daysLater(7)] },
    { sql: 'INSERT INTO changes (ticket_no, title, change_type, risk_level, status, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6)', params: ['CHG-2026-0002', 'ファイルサーバ ストレージ増設', 'normal', 'low', 'approved', daysLater(14)] },
    { sql: 'INSERT INTO changes (ticket_no, title, change_type, risk_level, status, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6)', params: ['CHG-2026-0003', 'Entra ID 条件付きアクセスポリシー変更', 'emergency', 'high', 'implementing', daysLater(0)] },
    { sql: 'INSERT INTO changes (ticket_no, title, change_type, risk_level, status, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6)', params: ['CHG-2026-0004', 'Wi-Fi AP追加設置（2F）', 'standard', 'low', 'draft', daysLater(21)] },
    { sql: 'INSERT INTO changes (ticket_no, title, change_type, risk_level, status, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6)', params: ['CHG-2026-0005', 'Microsoft 365 E5ライセンス移行', 'normal', 'high', 'closed', daysAgo(2)] },
  ]);

  // ── CMDB ──
  await seedIfEmpty(db, 'cmdb_items', [
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0001', 'AD-DC01', 'server', 'production', '本社', 'active', 'インフラ課'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0002', 'FILE-SV01', 'server', 'production', '本社', 'active', 'インフラ課'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0003', 'VPN-GW01', 'network', 'production', '本社', 'active', 'インフラ課'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0004', 'SW-CORE-01', 'network', 'production', '本社', 'active', 'インフラ課'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0005', 'Microsoft 365', 'service', 'cloud', '全拠点', 'active', 'IT管理課'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0006', 'AP-2F-01', 'network', 'production', '本社', 'maintenance', 'インフラ課'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0007', 'PRINTER-3F', 'other', 'production', '本社', 'active', 'ヘルプデスク'] },
    { sql: 'INSERT INTO cmdb_items (ci_id, name, ci_type, environment, site, status, owner) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['CI-2026-0008', 'CAD-LIC-SV', 'server', 'production', '本社', 'active', 'インフラ課'] },
  ]);

  // ── ナレッジ ──
  await seedIfEmpty(db, 'knowledge_articles', [
    { sql: 'INSERT INTO knowledge_articles (ticket_no, title, category, status, view_count, helpful_count) VALUES ($1,$2,$3,$4,$5,$6)', params: ['KA-2026-0001', 'VPN接続トラブルシューティング手順', 'FAQ', 'published', 142, 38] },
    { sql: 'INSERT INTO knowledge_articles (ticket_no, title, category, status, view_count, helpful_count) VALUES ($1,$2,$3,$4,$5,$6)', params: ['KA-2026-0002', 'プリンタ障害 初動対応マニュアル', '障害対応手順', 'published', 87, 21] },
    { sql: 'INSERT INTO knowledge_articles (ticket_no, title, category, status, view_count, helpful_count) VALUES ($1,$2,$3,$4,$5,$6)', params: ['KA-2026-0003', 'Teams チーム作成申請手順', 'FAQ', 'published', 201, 56] },
    { sql: 'INSERT INTO knowledge_articles (ticket_no, title, category, status, view_count, helpful_count) VALUES ($1,$2,$3,$4,$5,$6)', params: ['KA-2026-0004', '新入社員PC セットアップ手順書', '運用手順', 'published', 95, 32] },
    { sql: 'INSERT INTO knowledge_articles (ticket_no, title, category, status, view_count, helpful_count) VALUES ($1,$2,$3,$4,$5,$6)', params: ['KA-2026-0005', '現場VPN接続ガイド', '現場向け手順', 'review', 12, 3] },
    { sql: 'INSERT INTO knowledge_articles (ticket_no, title, category, status, view_count, helpful_count) VALUES ($1,$2,$3,$4,$5,$6)', params: ['KA-2026-0006', 'OneDrive同期エラー復旧手順', 'FAQ', 'draft', 0, 0] },
  ]);

  // ── 資産 ──
  await seedIfEmpty(db, 'assets', [
    { sql: 'INSERT INTO assets (asset_no, name, asset_type, site, status, assignee) VALUES ($1,$2,$3,$4,$5,$6)', params: ['AST-2026-0001', 'ThinkPad T14s（田中）', 'pc', '本社', 'in_use', '田中 太郎'] },
    { sql: 'INSERT INTO assets (asset_no, name, asset_type, site, status, assignee) VALUES ($1,$2,$3,$4,$5,$6)', params: ['AST-2026-0002', 'ThinkPad T14s（佐藤）', 'pc', '本社', 'in_use', '佐藤 花子'] },
    { sql: 'INSERT INTO assets (asset_no, name, asset_type, site, status, assignee) VALUES ($1,$2,$3,$4,$5,$6)', params: ['AST-2026-0003', 'Dell U2722D モニタ', 'monitor', '本社', 'in_use', '田中 太郎'] },
    { sql: 'INSERT INTO assets (asset_no, name, asset_type, site, status, assignee) VALUES ($1,$2,$3,$4,$5,$6)', params: ['AST-2026-0004', 'iPhone 15（山田）', 'smartphone', '本社', 'in_use', '山田 美咲'] },
    { sql: 'INSERT INTO assets (asset_no, name, asset_type, site, status, assignee) VALUES ($1,$2,$3,$4,$5,$6)', params: ['AST-2026-0005', 'HP LaserJet Pro（3F）', 'printer', '本社', 'maintenance', ''] },
    { sql: 'INSERT INTO assets (asset_no, name, asset_type, site, status, assignee) VALUES ($1,$2,$3,$4,$5,$6)', params: ['AST-2026-0006', 'Synology NAS DS920+', 'nas', '本社', 'in_use', 'インフラ課'] },
  ]);

  // ── パッチ ──
  await seedIfEmpty(db, 'patches', [
    { sql: 'INSERT INTO patches (patch_no, title, severity, patch_type, status, target_count, applied_count, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', params: ['PTH-2026-0001', 'Windows 11 24H2 累積更新 (KB5040XXX)', 'critical', 'windows_update', 'deploying', 186, 169, daysLater(3)] },
    { sql: 'INSERT INTO patches (patch_no, title, severity, patch_type, status, target_count, applied_count, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', params: ['PTH-2026-0002', 'Office 365 セキュリティパッチ 2026-05', 'high', 'office', 'completed', 186, 186, daysAgo(3)] },
    { sql: 'INSERT INTO patches (patch_no, title, severity, patch_type, status, target_count, applied_count, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', params: ['PTH-2026-0003', 'FortiClient VPN 7.4.1', 'medium', 'vpn', 'testing', 45, 5, daysLater(7)] },
    { sql: 'INSERT INTO patches (patch_no, title, severity, patch_type, status, target_count, applied_count, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', params: ['PTH-2026-0004', 'AutoCAD 2026 Hotfix 3', 'low', 'cad', 'planned', 28, 0, daysLater(14)] },
    { sql: 'INSERT INTO patches (patch_no, title, severity, patch_type, status, target_count, applied_count, scheduled_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', params: ['PTH-2026-0005', 'Dell BIOS Update A15', 'medium', 'bios', 'completed', 92, 88, daysAgo(7)] },
  ]);

  // ── セキュリティ ──
  await seedIfEmpty(db, 'security_events', [
    { sql: 'INSERT INTO security_events (event_no, title, event_type, severity, status, target, action_taken) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['SEC-2026-0001', '不審ログイン検知（海外IP）', 'suspicious_login', 'critical', 'investigating', 'user: yamada@example.com', 'アカウント一時停止'] },
    { sql: 'INSERT INTO security_events (event_no, title, event_type, severity, status, target, action_taken) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['SEC-2026-0002', 'USB デバイスブロック', 'usb_block', 'medium', 'resolved', 'PC: DESKTOP-A1234', 'ポリシー通りブロック'] },
    { sql: 'INSERT INTO security_events (event_no, title, event_type, severity, status, target, action_taken) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['SEC-2026-0003', 'MFA未設定アカウント検出', 'mfa_failure', 'high', 'detected', '3アカウント', ''] },
    { sql: 'INSERT INTO security_events (event_no, title, event_type, severity, status, target, action_taken) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['SEC-2026-0004', 'DLP: 機密ファイル外部共有', 'dlp', 'critical', 'contained', 'SharePoint: 設計図共有リンク', 'リンク無効化済'] },
    { sql: 'INSERT INTO security_events (event_no, title, event_type, severity, status, target, action_taken) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['SEC-2026-0005', 'VPN認証連続失敗（10回超）', 'vpn_failure', 'medium', 'closed', 'user: guest-site-b', 'パスワードリセット'] },
  ]);

  // ── サービス要求 ──
  await seedIfEmpty(db, 'service_requests', [
    { sql: 'INSERT INTO service_requests (req_no, title, category, requester, priority, status, approver) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['REQ-2026-0001', '新入社員用 PC 手配（5台）', 'pc', '高橋 健太', 'medium', 'in_progress', '山田 美咲'] },
    { sql: 'INSERT INTO service_requests (req_no, title, category, requester, priority, status, approver) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['REQ-2026-0002', 'Teams チーム作成依頼「DX推進室」', 'teams', '田中 太郎', 'low', 'completed', '山田 美咲'] },
    { sql: 'INSERT INTO service_requests (req_no, title, category, requester, priority, status, approver) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['REQ-2026-0003', 'VPN権限追加（現場B 5名）', 'permission', '鈴木 一郎', 'high', 'approving', '山田 美咲'] },
    { sql: 'INSERT INTO service_requests (req_no, title, category, requester, priority, status, approver) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['REQ-2026-0004', 'AutoCAD ライセンス追加購入', 'software', '高橋 健太', 'medium', 'pending', ''] },
    { sql: 'INSERT INTO service_requests (req_no, title, category, requester, priority, status, approver) VALUES ($1,$2,$3,$4,$5,$6,$7)', params: ['REQ-2026-0005', '退職者アカウント削除（3名）', 'account', '山田 美咲', 'high', 'in_progress', '田中 太郎'] },
  ]);

  console.log('シード完了');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
