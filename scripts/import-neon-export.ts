/**
 * Neon からエクスポートした JSON（/tmp/itsm-migrate/*.json）を D1 へ取り込む
 *   node --import tsx scripts/import-neon-export.ts <jsonDir>
 *
 * 2026-08-31 Neon 廃止に伴うデータ移行のための一回限りスクリプト。
 * タイムスタンプは UTC ISO-8601 へ正規化し、boolean は 0/1、json は TEXT へ変換する。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { loadLocalEnv } from './lib-env.ts';
import { createRemoteD1FromEnv } from './lib-d1-http.ts';
import { D1Client } from '../src/db/client.ts';

// テーブルごとの型変換ルール（true = 日時 → UTC ISO、'json' = JSON文字列化、'bool' = 0/1）
const RULES: Record<string, Record<string, 'ts' | 'json' | 'bool' | 'raw'>> = {
  users: { last_login_at: 'ts', created_at: 'ts', updated_at: 'ts', is_active: 'bool' },
  sessions: { expires_at: 'ts', last_seen_at: 'ts', revoked_at: 'ts', created_at: 'ts' },
  incidents: { due_at: 'ts', resolved_at: 'ts', created_at: 'ts', updated_at: 'ts' },
  problems: { created_at: 'ts', updated_at: 'ts', related_incident_ids: 'json' },
  changes: { scheduled_at: 'ts', created_at: 'ts', updated_at: 'ts' },
  cmdb_items: { created_at: 'ts', updated_at: 'ts' },
  knowledge_articles: { created_at: 'ts', updated_at: 'ts' },
  assets: { purchase_date: 'raw', warranty_end: 'raw', created_at: 'ts', updated_at: 'ts' },
  patches: { scheduled_at: 'ts', created_at: 'ts', updated_at: 'ts' },
  security_events: { created_at: 'ts', updated_at: 'ts' },
  service_requests: { created_at: 'ts', updated_at: 'ts' },
  audit_logs: { before_json: 'json', after_json: 'json', created_at: 'ts' },
};

function normalize(value: unknown, rule: 'ts' | 'json' | 'bool' | 'raw'): unknown {
  if (value === null || value === undefined) return null;
  if (rule === 'ts') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (rule === 'json') return JSON.stringify(value);
  if (rule === 'bool') return value ? 1 : 0;
  // raw: 日付のみのカラム（purchase_date / warranty_end）は YYYY-MM-DD を維持
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value;
}

async function importTable(db: D1Client, table: string, jsonDir: string) {
  const file = join(jsonDir, `${table}.json`);
  if (!existsSync(file)) {
    console.log(`skip    ${table}（エクスポートなし）`);
    return 0;
  }
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log(`skip    ${table}（0件）`);
    return 0;
  }
  const rules = RULES[table] ?? {};
  const cols = Object.keys(rows[0]);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  let count = 0;
  for (const row of rows) {
    const params = cols.map((c) => normalize(row[c], rules[c] ?? 'raw'));
    await db.query(`INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, params);
    count++;
  }
  console.log(`import  ${table}: ${count} 件`);
  return count;
}

async function main() {
  const jsonDir = process.argv[2];
  if (!jsonDir) {
    console.error('使い方: node --import tsx scripts/import-neon-export.ts <jsonDir>');
    process.exit(1);
  }
  const env = loadLocalEnv();
  const db = new D1Client(createRemoteD1FromEnv(env));

  // 外部キー順に投入（users → 業務テーブル → sessions/audit_logs）
  const order = ['users', 'incidents', 'problems', 'changes', 'cmdb_items', 'knowledge_articles', 'assets', 'patches', 'security_events', 'service_requests', 'sessions', 'audit_logs'];
  let total = 0;
  for (const t of order) {
    total += await importTable(db, t, jsonDir);
  }
  console.log(`取り込み完了: ${total} 件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
