/** ダッシュボード画面 */
import { useEffect, useState } from 'react';
import { api } from '../api';
import { BarChart, DonutChart, LineChart, KPI } from '../components/ui';
import { PRIORITY_LABEL, type DashboardSummary, type TrendPoint, type SiteStatus } from '../types.ts';

export function DashboardPage({ onNewIncident }: { onNewIncident: () => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [priorityDist, setPriorityDist] = useState<{ label: string; value: number }[]>([]);
  const [categoryDist, setCategoryDist] = useState<{ label: string; value: number }[]>([]);
  const [siteStatus, setSiteStatus] = useState<SiteStatus[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [s, t, p, cat, site] = await Promise.all([
          api.get<DashboardSummary>('/api/dashboard/summary'),
          api.get<TrendPoint[]>('/api/dashboard/trend'),
          api.get<{ label: string; value: number }[]>('/api/dashboard/priority-dist'),
          api.get<{ label: string; value: number }[]>('/api/dashboard/category-dist'),
          api.get<SiteStatus[]>('/api/dashboard/site-status'),
        ]);
        setSummary(s);
        setTrend(t);
        setPriorityDist(p.map((x) => ({ label: PRIORITY_LABEL[x.label] ?? x.label, value: x.value })));
        setCategoryDist(cat);
        setSiteStatus(site);
      } catch {
        // ignore
      }
    })();
  }, []);

  const slaDonut = summary
    ? [
        { value: summary.slaRate, color: 'var(--accent)' },
        { value: 100 - summary.slaRate, color: 'var(--surface-2)' },
      ]
    : [];

  const catColors = ['var(--info)', 'var(--accent)', 'var(--warning)', 'var(--danger)', 'var(--muted-2)'];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>ダッシュボード</h1>
          <div className="sub">ITSM 全体の稼働状況と主要メトリクス</div>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--primary" onClick={onNewIncident}>＋ 新規インシデント</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI icon="🎫" label="総チケット数" value={String(summary?.total ?? '—')} sub="全期間" tone="info" />
        <KPI icon="⏳" label="未対応" value={String(summary?.open ?? '—')} sub="要対応" tone="warning" />
        <KPI icon="⚠️" label="SLA違反" value={String(summary?.overdue ?? '—')} sub="期限超過" tone="danger" />
        <KPI icon="✅" label="SLA遵守率" value={`${summary?.slaRate ?? '—'}%`} sub="解決済ベース" tone="success" />
        <KPI icon="⏱" label="平均解決時間" value={`${summary?.avgHours ?? '—'}h`} sub="解決済チケット" tone="accent" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__head"><h3>直近7日のインシデント推移</h3></div>
          <div className="card__body"><LineChart data={trend} /></div>
        </div>
        <div className="card">
          <div className="card__head"><h3>SLA遵守率</h3></div>
          <div className="card__body" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <DonutChart data={slaDonut} centerLabel={`${summary?.slaRate ?? 0}%`} centerSub="遵守率" />
            <div className="chart-legend">
              <div className="li"><span className="sw" style={{ background: 'var(--accent)' }} />遵守 {summary?.slaRate ?? 0}%</div>
              <div className="li"><span className="sw" style={{ background: 'var(--surface-2)' }} />違反 {100 - (summary?.slaRate ?? 0)}%</div>
              <div className="li" style={{ color: 'var(--muted-2)', fontSize: 11.5 }}>解決済 {summary?.resolved ?? 0} 件を集計</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2-eq">
        <div className="card">
          <div className="card__head"><h3>優先度別の未解決分布</h3></div>
          <div className="card__body"><BarChart data={priorityDist} /></div>
        </div>
        <div className="card">
          <div className="card__head"><h3>カテゴリ別インシデント</h3></div>
          <div className="card__body">
            {categoryDist.map((c, i) => {
              const totalCat = categoryDist.reduce((s, x) => s + x.value, 0) || 1;
              const pct = Math.round((c.value / totalCat) * 100);
              return (
                <div key={c.label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--fg-2)' }}>{c.label}</span>
                    <span className="mono" style={{ color: 'var(--muted)' }}>{c.value}件 · {pct}%</span>
                  </div>
                  <div className="hbar"><div style={{ width: `${pct}%`, background: catColors[i % catColors.length] }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__head"><h3>拠点別の未解決インシデント</h3></div>
        <div className="card__body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {siteStatus.map((s) => (
              <div key={s.name} style={{ padding: '14px 16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 2 }}>{s.incidents}件 未解決</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
