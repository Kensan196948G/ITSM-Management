/** ローカル開発サーバー（API のみ。フロントは vite dev が担当） */
import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { loadLocalEnv } from '../scripts/lib-env.ts';
import { LocalD1 } from './db/local-d1.ts';
import { applyMigrations } from '../scripts/migrate-core.ts';

async function main() {
  const env = loadLocalEnv();

  // ローカル D1（node:sqlite）を用意し、マイグレーションを適用
  const localD1 = new LocalD1();
  await applyMigrations(localD1);
  if (env.SEED_ON_START === 'true') {
    const { runSeed } = await import('../scripts/seed-core.ts');
    await runSeed(localD1, env);
  }

  const bindings = {
    ...env,
    DB: localD1,
  };
  const app = createApp();

  serve(
    {
      fetch: (request: Request) => {
        return app.fetch(request, bindings as never, {} as never);
      },
      port: Number(process.env.PORT ?? 8787),
    },
    (info) => {
      console.log(`API server: http://localhost:${info.port}`);
    },
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
