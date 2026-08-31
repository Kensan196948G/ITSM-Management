/**
 * シードスクリプト（開発・デモ用データ）— 冪等
 *   node --import tsx scripts/seed.ts [--local]
 *
 * 既定では .env の CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / D1_DATABASE_ID を
 * 用いて本番 D1 へ投入する。--local を付けると node:sqlite のローカルDBへ投入する。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSeed } from './seed-core.ts';
import { LocalD1 } from '../src/db/local-d1.ts';
import { createRemoteD1FromEnv } from './lib-d1-http.ts';
import type { D1Like } from '../src/db/client.ts';

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

async function main() {
  const env = loadEnv();
  const useLocal = process.argv.includes('--local');

  let db: D1Like;
  if (useLocal) {
    db = new LocalD1();
    console.log('対象: ローカル D1（node:sqlite, in-memory）');
  } else {
    db = createRemoteD1FromEnv(env);
    console.log(`対象: 本番 D1（${env.D1_DATABASE_ID ?? ''}）`);
  }

  await runSeed(db, env);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
