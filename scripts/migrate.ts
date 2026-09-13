/**
 * DB マイグレーション適用スクリプト（Cloudflare D1）
 *   node --import tsx scripts/migrate.ts [--local] [--dry-run]
 *
 * 既定では .env の CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / D1_DATABASE_ID を
 * 用いて本番 D1 へ適用する。--local を付けると node:sqlite のローカルDBへ適用する。
 * migrations/*.sql を未適用分のみ文単位で適用する（schema_migrations で管理・冪等）。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMigrations } from './migrate-core.ts';
import { LocalD1 } from '../src/db/local-d1.ts';
import { createRemoteD1FromEnv } from './lib-d1-http.ts';
import type { D1Like } from '../src/db/client.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** ローカル検証 DB の既定パス（--db で変更可能。.gitignore 対象） */
export const DEFAULT_LOCAL_DB = join(root, 'local-d1.sqlite');

/**
 * .env を読み込む。
 *
 * --local（検証DB）では .env を必要としないため、ファイルが無くても失敗させない。
 * リモート適用時に資格情報が無い場合は createRemoteD1FromEnv 側で検出される。
 * （CI には .env が存在しないため、以前は --local でも即終了していた）
 */
function loadEnv(): Record<string, string> {
  const envFile = join(root, '.env');
  const out: Record<string, string> = {};
  if (!existsSync(envFile)) return out;
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && m[1] !== undefined && m[2] !== undefined) out[m[1]] = m[2];
  }
  return out;
}

/** --db <path> もしくは --db=<path> を取得する */
function parseDbArg(argv: string[]): string | undefined {
  const eq = argv.find((a) => a.startsWith('--db='));
  if (eq) return eq.slice('--db='.length);
  const idx = argv.indexOf('--db');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return undefined;
}

async function main() {
  const env = loadEnv();
  const useLocal = process.argv.includes('--local');
  const dryRun = process.argv.includes('--dry-run');

  let db: D1Like;
  if (useLocal) {
    // ファイルベースにして、別プロセス（migrate → seed）で状態を共有できるようにする。
    // 既定の :memory: では seed 側が空のスキーマを見て "no such table: users" になる。
    const dbPath = parseDbArg(process.argv) ?? DEFAULT_LOCAL_DB;
    db = new LocalD1(dbPath);
    console.log(`対象: ローカル D1（node:sqlite, file=${dbPath}）`);
  } else {
    db = createRemoteD1FromEnv(env);
    console.log(`対象: 本番 D1（${env.D1_DATABASE_ID ?? ''}）`);
  }

  if (dryRun) {
    console.log('[dry-run] 対象SQLファイル:');
    const { readdirSync } = await import('node:fs');
    for (const f of readdirSync(join(root, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
      console.log(`  ${f}`);
    }
    process.exit(0);
  }

  await applyMigrations(db);
  console.log('マイグレーション完了');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
