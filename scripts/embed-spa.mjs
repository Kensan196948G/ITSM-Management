/** SPAアセットをgzip+base64でsrc/static-server.tsへ埋め込む */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'web', 'dist');
const files = {
  'index.html': ['index.html', 'text/html; charset=utf-8'],
  'assets/index-CErfq58W.js': ['assets/index-CErfq58W.js', 'application/javascript; charset=utf-8'],
  'assets/index-aGcXtcLV.css': ['assets/index-aGcXtcLV.css', 'text/css; charset=utf-8'],
};
const assets = {};
for (const [key, [f, ct]] of Object.entries(files)) {
  const data = readFileSync(join(distDir, f));
  assets[key] = { b64: gzipSync(data, { level: 9 }).toString('base64'), ct };
}
const code = `/** 自動生成: SPAアセット（scripts/embed-spa.mjs） */
export const SPA_ASSETS: Record<string, { b64: string; ct: string }> = ${JSON.stringify(assets)};
`;
mkdirSync(join(root, 'src'), { recursive: true });
writeFileSync(join(root, 'src', 'static-server.ts'), readFileSync(join(root, 'src', 'static-server.ts'), 'utf8')
  .replace(/export const SPA_ASSETS: Record<string, \{ b64: string; ct: string \}> = \{\};/, code));
console.log('SPA assets embedded');
