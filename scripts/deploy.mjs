/**
 * Cloudflare Workers デプロイスクリプト（Cloudflare REST API 直接呼び出し）
 *
 *   使い方:
 *     node scripts/deploy.mjs                # 通常デプロイ
 *     node scripts/deploy.mjs --secrets      # シークレット（DATABASE_URL/SESSION_SECRET）も設定
 *     node scripts/deploy.mjs --dry-run      # アップロードせず検証のみ
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const withSecrets = args.includes('--secrets');

function loadEnv() {
  const envFile = join(root, '.env');
  const out = { ...process.env };
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && m[1] && m[2] !== undefined) out[m[1]] = m[2];
    }
  }
  return out;
}

const env = loadEnv();
const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = env.CLOUDFLARE_API_TOKEN;
const WORKER_NAME = env.WORKER_NAME ?? 'itsm-management-api';
const CF_API = 'https://api.cloudflare.com/client/v4';

if (!ACCOUNT_ID) {
  console.error('CLOUDFLARE_ACCOUNT_ID が設定されていません（.env または環境変数）');
  process.exit(1);
}
if (!API_TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN が設定されていません。\n  Cloudflare Dashboard > My Profile > API Tokens で "Workers Scripts: Edit" 権限のトークンを作成し、.env に設定してください。');
  process.exit(1);
}

async function cf(path, options = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok) {
    throw new Error(`Cloudflare API ${options.method ?? 'GET'} ${path} -> ${res.status}: ${json?.errors?.[0]?.message ?? text.slice(0, 300)}`);
  }
  return json;
}

// ---- 1. 成果物チェック ----
const bundlePath = join(root, 'worker-build', 'worker.mjs');
if (!existsSync(bundlePath)) {
  console.error('worker-build/worker.mjs がありません。先に npm run build:all を実行してください');
  process.exit(1);
}
const bundle = readFileSync(bundlePath, 'utf8');
console.log(`worker.mjs: ${(bundle.length / 1024).toFixed(1)} KB`);

// ---- 2. メタデータ ----
const bindings = [
  { type: 'plain_text', name: 'APP_NAME', text: 'itsm-management' },
  { type: 'plain_text', name: 'ENVIRONMENT', text: env.ENVIRONMENT ?? 'production' },
];
const metadata = {
  main_module: 'worker.mjs',
  compatibility_date: '2026-08-16',
  bindings,
  // bindings に列挙しない既存シークレット（DATABASE_URL / SESSION_SECRET）を
  // アップロードで消さないための指定。これが無いと --secrets 無しのデプロイで Worker が壊れる。
  keep_bindings: ['secret_text'],
};

if (dryRun) {
  console.log(`[dry-run] worker: ${WORKER_NAME} / account: ${ACCOUNT_ID}`);
  console.log(`[dry-run] bindings: ${bindings.map((b) => b.name).join(', ')}`);
  process.exit(0);
}

// ---- 3. スクリプトアップロード（multipart）----
// モジュールパートの Content-Type は application/javascript+module が必須
// （application/javascript だと CJS として解釈され "Unexpected token 'export'" になる）
const boundary = `----itsm${Date.now()}`;
const modulePart = `--${boundary}\r\nContent-Disposition: form-data; name="worker.mjs"; filename="worker.mjs"\r\nContent-Type: application/javascript+module\r\n\r\n${bundle}\r\n`;
const metaPart = `--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}--\r\n`;
const body = modulePart + metaPart;

console.log(`> PUT /accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`);
const up = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}`, {
  method: 'PUT',
  headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
  body,
});
console.log(`スクリプト更新: ${up.result?.id ?? WORKER_NAME} (${up.success ? 'success' : 'failed'})`);

// ---- 4. シークレット（--secrets 時のみ。既存シークレットを上書きしない方針）----
if (withSecrets) {
  const secrets = [
    ['DATABASE_URL', env.DATABASE_URL],
    ['SESSION_SECRET', env.SESSION_SECRET],
  ];
  for (const [name, value] of secrets) {
    if (!value) {
      console.warn(`skip secret ${name}（.env に値がありません）`);
      continue;
    }
    await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/secrets`, {
      method: 'PUT',
      body: JSON.stringify({ name, type: 'secret_text', text: value }),
    });
    console.log(`secret 設定: ${name}`);
  }
}

// ---- 5. workers.dev サブドメイン確認 ----
const sub = await cf(`/accounts/${ACCOUNT_ID}/workers/scripts/${WORKER_NAME}/subdomain`).catch(() => null);
const url = sub?.result?.subdomain
  ? `https://${WORKER_NAME}.${sub.result.subdomain}.workers.dev`
  : `https://${WORKER_NAME}.workers.dev`;
console.log(`デプロイ完了: ${url}`);
