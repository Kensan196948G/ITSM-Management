/** ダッシュボード集計ルーター */
import { Hono } from 'hono';
import type { AppEnv } from '../types.ts';
import { requireRole } from '../middleware.ts';
import { SLA_RISK_THRESHOLD_HOURS } from '../config.ts';

export const dashboardRoutes = new Hono<AppEnv>();

// 要認証（全ロール）— 未認証アクセスは 401
dashboardRoutes.use('*', requireRole());

/** ダッシュボードサマリ（KPI） */
dashboardRoutes.get('/summary', async (c) => {
  const db = c.get('db');

  // 集計は 2 クエリ（インシデント集計 + 他モジュール件数）に集約する。
  // 以前は 1 + 8 の計 9 回を逐次実行しており、D1 へのラウンドトリップが
  // そのままレイテンシになっていた（N+1 と同種の問題）。
  const inc = await db.queryOne<{
    total: number | string;
    open_cnt: number | string;
    resolved_cnt: number | string;
    sla_ok: number | string;
    avg_hours: number | string | null;
  }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('open','in_progress','waiting') THEN 1 ELSE 0 END) AS open_cnt,
            SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) AS resolved_cnt,
            SUM(CASE WHEN resolved_at IS NOT NULL AND due_at IS NOT NULL AND resolved_at <= due_at THEN 1 ELSE 0 END) AS sla_ok,
            AVG(CASE WHEN resolved_at IS NOT NULL
                     THEN (julianday(resolved_at) - julianday(created_at)) * 24 END) AS avg_hours
     FROM incidents`,
  );

  const total = Number(inc?.total ?? 0);
  const open = Number(inc?.open_cnt ?? 0);
  const resolved = Number(inc?.resolved_cnt ?? 0);
  const slaOk = Number(inc?.sla_ok ?? 0);
  const avgHours = inc?.avg_hours == null ? 0 : Math.round(Number(inc.avg_hours) * 10) / 10;
  const slaRate = resolved ? Math.round((slaOk / resolved) * 100) : 100;

  // 期限超過は日付比較が必要なため 1 クエリで取得して JS 側で判定する
  const overdueRes = await db.queryOne<{ overdue: number | string }>(
    `SELECT COUNT(*) AS overdue FROM incidents
     WHERE status NOT IN ('resolved','closed') AND due_at IS NOT NULL AND due_at < $1`,
    [new Date().toISOString()],
  );
  const overdue = Number(overdueRes?.overdue ?? 0);

  // モジュール別件数は UNION ALL で 1 ラウンドトリップにまとめる
  const counts = await db.query(
    `SELECT 'problems' AS k, COUNT(*) AS c FROM problems
     UNION ALL SELECT 'changes', COUNT(*) FROM changes
     UNION ALL SELECT 'assets', COUNT(*) FROM assets
     UNION ALL SELECT 'security_events', COUNT(*) FROM security_events
     UNION ALL SELECT 'cmdb_items', COUNT(*) FROM cmdb_items
     UNION ALL SELECT 'knowledge_articles', COUNT(*) FROM knowledge_articles
     UNION ALL SELECT 'patches', COUNT(*) FROM patches
     UNION ALL SELECT 'service_requests', COUNT(*) FROM service_requests`,
  );
  const byKey = new Map(counts.rows.map((r) => [String(r.k), Number(r.c)]));
  const cnt = (key: string) => byKey.get(key) ?? 0;

  return c.json({
    total,
    open,
    overdue,
    resolved,
    avgHours,
    slaRate,
    problems: cnt('problems'),
    changes: cnt('changes'),
    assets: cnt('assets'),
    security: cnt('security_events'),
    cmdb: cnt('cmdb_items'),
    knowledge: cnt('knowledge_articles'),
    patches: cnt('patches'),
    requests: cnt('service_requests'),
  });
});

/** 直近7日のインシデント推移 */
dashboardRoutes.get('/trend', async (c) => {
  const db = c.get('db');
  // SQLite: date(created_at) で日付化。基準日はアプリ側で ISO-8601 を生成
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const res = await db.query(
    `SELECT date(created_at) AS day, COUNT(*) AS cnt
     FROM incidents
     WHERE created_at >= $1
     GROUP BY day ORDER BY day`,
    [cutoff],
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
  // 閾値判定を SQL へ押し下げる。
  // 以前は ORDER BY due_at LIMIT 100 で取得してから JS でフィルタしていたため、
  // 「直近 100 件の中のリスク」しか返せず、101 件目以降の期限超過チケットが
  // リスク一覧から漏れていた（リスク一覧としては誤り）。
  // due_at は ISO-8601(UTC) の TEXT なので文字列比較で正しく比較できる。
  const threshold = new Date(Date.now() + SLA_RISK_THRESHOLD_HOURS * 3600 * 1000).toISOString();
  const res = await db.query(
    `SELECT * FROM incidents
     WHERE status NOT IN ('resolved','closed')
       AND due_at IS NOT NULL
       AND due_at < $1
     ORDER BY due_at ASC
     LIMIT 100`,
    [threshold],
  );
  return c.json(res.rows);
});
