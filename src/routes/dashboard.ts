/** ダッシュボード集計ルーター */
import { Hono } from 'hono';
import type { AppEnv } from '../types.ts';
import { requireRole } from '../middleware.ts';

export const dashboardRoutes = new Hono<AppEnv>();

// 要認証（全ロール）— 未認証アクセスは 401
dashboardRoutes.use('*', requireRole());

/** ダッシュボードサマリ（KPI） */
dashboardRoutes.get('/summary', async (c) => {
  const db = c.get('db');

  const inc = await db.query(
    `SELECT status, priority, due_at, resolved_at, created_at, site FROM incidents`,
  );
  const rows = inc.rows as { status: string; priority: string; due_at: string | null; resolved_at: string | null; created_at: string; site: string }[];

  const total = rows.length;
  const open = rows.filter((r) => ['open', 'in_progress', 'waiting'].includes(r.status)).length;
  const overdue = rows.filter(
    (r) => !['resolved', 'closed'].includes(r.status) && r.due_at && new Date(r.due_at) < new Date(),
  ).length;
  const resolved = rows.filter((r) => r.resolved_at).length;
  const avgHours = resolved
    ? Math.round(
        (rows
          .filter((r) => r.resolved_at)
          .reduce((s, r) => s + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 3600000, 0) /
          resolved) *
          10,
      ) / 10
    : 0;
  const slaOk = rows.filter((r) => r.resolved_at && r.due_at && new Date(r.resolved_at) <= new Date(r.due_at)).length;
  const slaRate = resolved ? Math.round((slaOk / resolved) * 100) : 100;

  const count = async (table: string) => {
    const r = await db.queryOne<{ total: string }>(`SELECT COUNT(*) AS total FROM ${table}`);
    return parseInt(r?.total ?? '0', 10);
  };

  return c.json({
    total,
    open,
    overdue,
    resolved,
    avgHours,
    slaRate,
    problems: await count('problems'),
    changes: await count('changes'),
    assets: await count('assets'),
    security: await count('security_events'),
    cmdb: await count('cmdb_items'),
    knowledge: await count('knowledge_articles'),
    patches: await count('patches'),
    requests: await count('service_requests'),
  });
});

/** 直近7日のインシデント推移 */
dashboardRoutes.get('/trend', async (c) => {
  const db = c.get('db');
  const res = await db.query(
    `SELECT created_at::date AS day, COUNT(*) AS cnt
     FROM incidents
     WHERE created_at >= now() - interval '7 days'
     GROUP BY day ORDER BY day`,
  );
  const byDay = new Map<string, number>();
  for (const r of res.rows) {
    byDay.set(String((r.day as string).slice(0, 10)), parseInt(String(r.cnt), 10));
  }
  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, value: byDay.get(key) ?? 0 });
  }
  return c.json(days);
});

/** 優先度別の未解決分布 */
dashboardRoutes.get('/priority-dist', async (c) => {
  const db = c.get('db');
  const res = await db.query(
    `SELECT priority, COUNT(*) AS cnt FROM incidents
     WHERE status NOT IN ('resolved','closed') GROUP BY priority`,
  );
  const order = ['critical', 'high', 'medium', 'low'];
  const by = new Map(res.rows.map((r) => [String(r.priority), parseInt(String(r.cnt), 10)]));
  return c.json(order.filter((k) => by.has(k)).map((k) => ({ label: k, value: by.get(k)! })));
});

/** カテゴリ別分布 */
dashboardRoutes.get('/category-dist', async (c) => {
  const db = c.get('db');
  const res = await db.query(
    `SELECT category, COUNT(*) AS cnt FROM incidents WHERE category IS NOT NULL GROUP BY category ORDER BY cnt DESC`,
  );
  return c.json(res.rows.map((r) => ({ label: String(r.category), value: parseInt(String(r.cnt), 10) })));
});

/** 拠点別の未解決インシデント */
dashboardRoutes.get('/site-status', async (c) => {
  const db = c.get('db');
  const res = await db.query(
    `SELECT site, COUNT(*) AS cnt FROM incidents
     WHERE status NOT IN ('resolved','closed') AND site IS NOT NULL
     GROUP BY site ORDER BY cnt DESC`,
  );
  return c.json(
    res.rows.map((r) => ({
      name: String(r.site),
      incidents: parseInt(String(r.cnt), 10),
      level: parseInt(String(r.cnt), 10) >= 4 ? 'danger' : parseInt(String(r.cnt), 10) >= 2 ? 'warning' : 'safe',
    })),
  );
});

/** SLAリスク一覧（期限超過 + リスク） */
dashboardRoutes.get('/sla-risks', async (c) => {
  const db = c.get('db');
  const res = await db.query(
    `SELECT * FROM incidents WHERE status NOT IN ('resolved','closed') AND due_at IS NOT NULL
     ORDER BY due_at ASC LIMIT 100`,
  );
  const now = Date.now();
  const items = res.rows.filter((r: any) => {
    const due = new Date(r.due_at).getTime();
    const remaining = due - now;
    return remaining < 2 * 3600 * 1000; // risk（2時間以内）または超過
  });
  return c.json(items);
});
