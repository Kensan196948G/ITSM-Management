/** SPAアセットをgzip+base64でsrc/static-server.tsへ埋め込む（ビルドチェーン: build:all で実行） */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'web', 'dist');

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('web/dist/index.html がありません。先に npm run build:web を実行してください');
  process.exit(1);
}

// dist から index.html と assets/*.js, *.css を動的検出（ハッシュ名に依存しない）
const files = { 'index.html': ['index.html', 'text/html; charset=utf-8'] };
if (existsSync(join(distDir, 'assets'))) {
  for (const f of readdirSync(join(distDir, 'assets')).sort()) {
    if (f.endsWith('.js')) files[`assets/${f}`] = [`assets/${f}`, 'application/javascript; charset=utf-8'];
    else if (f.endsWith('.css')) files[`assets/${f}`] = [`assets/${f}`, 'text/css; charset=utf-8'];
  }
}

const assets = {};
for (const [key, [f, ct]] of Object.entries(files)) {
  const data = readFileSync(join(distDir, f));
  assets[key] = { b64: gzipSync(data, { level: 9 }).toString('base64'), ct };
}

const code = `/** 自動生成: SPAアセット（scripts/embed-spa.mjs） */
export const SPA_ASSETS: Record<string, { b64: string; ct: string }> = ${JSON.stringify(assets)};
`;

// 既存の SPA_ASSETS 定義（値の有無を問わず）を置換
const target = join(root, 'src', 'static-server.ts');
const current = readFileSync(target, 'utf8');
const replaced = current.replace(/export const SPA_ASSETS: Record<string, \{ b64: string; ct: string \}> = \{[\s\S]*?\};\n?/, code);
if (!replaced.includes('自動生成: SPAアセット') || !replaced.includes(JSON.stringify(assets).slice(0, 50))) {
  console.error('static-server.ts の SPA_ASSETS 置換に失敗しました');
  process.exit(1);
}
writeFileSync(target, replaced);
console.log(`SPA assets embedded (${Object.keys(assets).length} files: ${Object.keys(assets).join(', ')})`);
