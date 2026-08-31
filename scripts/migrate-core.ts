/**
 * マイグレーション適用コア（ローカル D1 / リモート D1 共通）
 * migrations/*.sql を未適用分のみ、文単位で適用する。
 * D1 HTTP API は複数文を一括実行できないため、SQL を文単位に分割して逐次実行する。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { D1Like } from '../src/db/client.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'migrations');

/** コメント行除去 + 文単位分割（`;` 区切り。簡単な DDL 前提） */
export function splitStatements(sql: string): string[] {
  const lines = sql.split('\n');
  const cleaned: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;
    cleaned.push(line);
  }
  return cleaned
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 未適用のマイグレーションを適用し、適用ファイル名を返す */
export async function applyMigrations(db: D1Like): Promise<string[]> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      )`,
    )
    .run();

  const appliedRows = await db.prepare('SELECT filename FROM schema_migrations').all();
  const applied = new Set(appliedRows.results.map((r) => String(r.filename)));

  const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const appliedNow: string[] = [];
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip    ${file} (already applied)`);
      continue;
    }
    console.log(`apply   ${file}`);
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const stmt of splitStatements(sql)) {
      await db.prepare(stmt).run();
    }
    await db.prepare('INSERT INTO schema_migrations (filename) VALUES (?1)').bind(file).run();
    appliedNow.push(file);
  }
  if (appliedNow.length === 0) console.log('全て適用済みです');
  return appliedNow;
}
