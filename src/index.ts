/** Cloudflare Workers エントリポイント */
import { createApp } from './app.ts';

const app = createApp();

export default {
  async fetch(request: Request, env: Record<string, unknown>) {
    return app.fetch(request, env as never);
  },
} as ExportedHandler;
