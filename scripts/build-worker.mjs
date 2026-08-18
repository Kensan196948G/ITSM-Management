/**
 * Worker バンドルビルド（API専用）
 *   node scripts/build-worker.mjs
 * 成果物: worker-build/worker.mjs（単一ファイル）
 *
 * SPAは Cloudflare Pages で配信する（web/ をPagesへデプロイ）。
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'worker-build');
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(root, 'src', 'index.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  platform: 'neutral',
  outfile: join(outDir, 'worker.mjs'),
  external: [],
  sourcemap: false,
  minify: true,
  logLevel: 'info',
});

console.log('worker-build/worker.mjs を生成しました（API専用）');
