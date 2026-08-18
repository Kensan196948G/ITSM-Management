/** 補助画面: SLA監視 / リアルタイム / 統合可視化 / Automation */
import { useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable, KPI, Pill } from '../components/ui';
import { SLAPill } from '../modules.tsx';
import { fmtDate, type Incident } from '../types';

/* ── SLA監視 ── */
export function SlaPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ items: Incident[] }>('/api/incidents?limit=100');
        setIncidents(res.items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resolved = incidents.filter((x) => x.resolved_at);
  const slaOk = resolved.filter((x) => x.due_at && new Date(x.resolved_at!) <= new Date(x.due_at)).length;
  const rate = resolved.length ? Math.round((slaOk / resolved.length) * 100) : 100;
  const overdue = incidents.filter((x) => !['resolved', 'closed'].includes(x.status) && x.due_at && new Date(x.due_at) < new Date());
  const atRisk = incidents.filter((x) => {
    if (['resolved', 'closed'].includes(x.status) || !x.due_at) return false;
    const r = new Date(x.due_at).getTime() - Date.now();
    return r > 0 && r < 2 * 3600 * 1000;
  });
  const avgH = resolved.length
    ? Math.round((resolved.reduce((s, x) => s + (new Date(x.resolved_at!).getTime() - new Date(x.created_at).getTime()) / 3600000, 0) / resolved.length) * 10) / 10
    : 0;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>SLA監視</h1>
          <div className="sub">SLA遵守率・期限監視・リスク一覧</div>
        </div>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <KPI icon="✅" label="SLA遵守率" value={`${rate}%`} tone={rate >= 90 ? 'success' : rate >= 70 ? 'warning' : 'danger'} />
        <KPI icon="⚠️" label="期限超過" value={`${overdue.length}件`} tone="danger" />
        <KPI icon="⏱" label="リスク（2h以内）" value={`${atRisk.length}件`} tone="warning" />
        <KPI icon="⏳" label="平均解決時間" value={`${avgH.toFixed(1)}h`} tone="info" />
      </div>
      <div className="card">
        <div className="card__head"><h3>SLAリスク一覧</h3></div>
        <div style={{ padding: '14px 18px' }}>
          <DataTable<Incident> columns={[
            { key: 'ticket_no', label: 'チケット', cls: 'td-id' },
            { key: 'title', label: 'タイトル', cls: 'td-title' },
            { key: 'priority', label: '優先度', render: (v) => <Pill value={String(v)} /> },
            { key: 'sla', label: 'SLA', render: (_, r) => <SLAPill dueAt={r.due_at} resolvedAt={r.resolved_at} /> },
            { key: 'due_at', label: '期限', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v), true)}</span> },
          ]} data={[...overdue, ...atRisk]} loading={loading} emptyMsg="SLAリスクのチケットはありません" />
        </div>
      </div>
    </div>
  );
}

/* ── リアルタイム監視 ── */
export function RealtimePage() {
  const systems = [
    { name: 'Microsoft 365', status: 'operational', latency: '45ms', uptime: '99.97%' },
    { name: 'VPN Gateway', status: 'degraded', latency: '220ms', uptime: '99.2%' },
    { name: 'Active Directory', status: 'operational', latency: '12ms', uptime: '99.99%' },
    { name: 'ファイルサーバ', status: 'operational', latency: '8ms', uptime: '99.95%' },
    { name: 'メールサーバ (Exchange)', status: 'operational', latency: '65ms', uptime: '99.9%' },
    { name: 'CADライセンスサーバ', status: 'incident', latency: '—', uptime: '98.5%' },
    { name: 'プリントサーバ', status: 'operational', latency: '15ms', uptime: '99.8%' },
    { name: '監視 (Zabbix)', status: 'operational', latency: '30ms', uptime: '99.99%' },
  ];
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>リアルタイム監視</h1>
          <div className="sub">システム稼働状況のリアルタイム表示</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {systems.map((s) => (
          <div key={s.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.status === 'operational' ? 'var(--success)' : s.status === 'degraded' ? 'var(--warning)' : 'var(--danger)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-2)', marginTop: 3, display: 'flex', gap: 14 }}>
                <span className="mono">レイテンシ {s.latency}</span>
                <span className="mono">稼働率 {s.uptime}</span>
              </div>
            </div>
            <Pill value={s.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 統合可視化 ── */
export function VisualizationPage() {
  const maps = [
    { name: 'サービスマップ', target: 'M365 / VPN / CAD', source: 'CMDB', status: 'published' },
    { name: '現場NW図', target: '現場A / 現場B', source: 'NW台帳', status: 'review' },
    { name: '障害影響マップ', target: '全サービス', source: 'CMDB依存関係', status: 'published' },
    { name: 'M365依存関係', target: 'Teams / SPO / OD', source: 'Entra ID', status: 'published' },
    { name: 'プロセス対応表', target: '申請 / 設計 / 施工', source: '業務棚卸', status: 'draft' },
  ];
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>統合可視化</h1>
          <div className="sub">サービスマップ・影響図・ネットワーク図</div>
        </div>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <KPI icon="🗺" label="可視化マップ" value="5種" tone="info" />
        <KPI icon="📡" label="影響サービス" value="12件" tone="warning" />
        <KPI icon="⚡" label="未紐付けCI" value="7件" tone="danger" />
      </div>
      <div className="card">
        <div className="card__head"><h3>可視化マップ一覧</h3></div>
        <div style={{ padding: '14px 18px' }}>
          <DataTable columns={[
            { key: 'name', label: 'マップ', render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
            { key: 'target', label: '対象', cls: 'td-muted' },
            { key: 'source', label: '更新元', cls: 'td-muted' },
            { key: 'status', label: '鮮度', render: (v) => <Pill value={String(v)} /> },
          ]} data={maps as never[]} />
        </div>
      </div>
    </div>
  );
}

/* ── Automation ── */
export function AutomationPage() {
  const rules = [
    { id: 1, name: 'SLA期限30分前通知', trigger: 'SLA期限30分前', action: 'Teams通知 + チケット更新', enabled: true },
    { id: 2, name: 'VPN失敗検知', trigger: 'VPN失敗10回以上', action: 'ログ収集 + Security起票', enabled: true },
    { id: 3, name: '印刷キュー自動復旧', trigger: 'キュー滞留30分', action: 'スプーラ再起動', enabled: true },
    { id: 4, name: 'ディスク容量警告', trigger: 'C: 90%超過', action: '一時ファイル削除 + Teams通知', enabled: false },
    { id: 5, name: 'サービス自動再起動', trigger: '応答タイムアウト', action: 'サービス再起動（3回まで）', enabled: true },
  ];
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Automation / AIOps</h1>
          <div className="sub">自動復旧・Teams通知・AI分析</div>
        </div>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <KPI icon="⚡" label="自動化ルール" value={`${rules.length}本`} tone="info" />
        <KPI icon="🎫" label="自動チケット化" value="7件" sub="今月" tone="success" />
        <KPI icon="⏱" label="手作業削減" value="18h" sub="月間見込み" tone="accent" />
      </div>
      <div className="card">
        <div className="card__head"><h3>自動化ルール一覧</h3></div>
        <div style={{ padding: '14px 18px' }}>
          <DataTable columns={[
            { key: 'name', label: 'ルール名', render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
            { key: 'trigger', label: 'トリガー', cls: 'td-muted' },
            { key: 'action', label: '動作', cls: 'td-muted' },
            { key: 'enabled', label: '状態', render: (v) => <Pill value={v ? 'active' : 'closed'} /> },
          ]} data={rules as never[]} />
        </div>
      </div>
    </div>
  );
}
