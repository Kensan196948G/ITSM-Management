/** Hono アプリ組み立て（テスト・dev・Worker 共通） */
import { Hono } from 'hono';
import { dbProvider, sessionAuth, csrfGuard, errorHandler, notFoundHandler, securityHeaders } from './middleware.ts';
import { authRoutes } from './routes/auth.ts';
import { dashboardRoutes } from './routes/dashboard.ts';
import { userRoutes, auditRoutes, healthRoutes } from './routes/misc.ts';
import {
  incidentRoutes,
  problemRoutes,
  changeRoutes,
  cmdbRoutes,
  knowledgeRoutes,
  assetRoutes,
  patchRoutes,
  securityRoutes,
  requestRoutes,
} from './routes/modules.ts';
import type { AppEnv } from './types.ts';
import { staticAssets } from './static-server.ts';

export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', dbProvider());
  app.use('*', securityHeaders);
  app.use('/api/*', sessionAuth);
  app.use('/api/*', csrfGuard);
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  // 公開
  app.route('/api/health', healthRoutes);

  // 認証
  app.route('/api/auth', authRoutes);

  // 要認証（全ロール）
  app.route('/api/incidents', incidentRoutes);
  app.route('/api/problems', problemRoutes);
  app.route('/api/changes', changeRoutes);
  app.route('/api/cmdb', cmdbRoutes);
  app.route('/api/knowledge', knowledgeRoutes);
  app.route('/api/assets', assetRoutes);
  app.route('/api/patches', patchRoutes);
  app.route('/api/security_events', securityRoutes);
  app.route('/api/service_requests', requestRoutes);
  app.route('/api/dashboard', dashboardRoutes);
  app.route('/api/users', userRoutes);
  app.route('/api/audit_logs', auditRoutes);

  // SPA 静的配信（最後に登録）
  app.use('*', staticAssets);

  return app;
}

export type App = ReturnType<typeof createApp>;
