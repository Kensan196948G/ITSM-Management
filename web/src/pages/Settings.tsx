/** 設定画面: 表示設定 / ユーザー管理 / 監査ログ */
import { useEffect, useState } from 'react';
import { api } from '../api';
import { DataTable, Pill } from '../components/ui';
import { fmtDate, type AuditLog, type User } from '../types.ts';
import { useAuth } from '../auth';

export function SettingsPage({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  const { user } = useAuth();
  const canAdmin = user ? ['manager', 'admin'].includes(user.role) : false;
  const [users, setUsers] = useState<User[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!canAdmin) return;
    void (async () => {
      try {
        const [u, a] = await Promise.all([
          api.get<User[]>('/api/users'),
          api.get<{ items: AuditLog[] }>('/api/audit_logs?limit=20'),
        ]);
        setUsers(u);
        setAudits(a.items);
      } catch {
        // ignore
      }
    })();
  }, [canAdmin]);

  const row = (label: string, desc: string, action: React.ReactNode) => (
    <div className="setting-row">
      <div style={{ minWidth: 0 }}>
        <div className="sr-label">{label}</div>
        {desc && <div className="sr-desc">{desc}</div>}
      </div>
      {action}
    </div>
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>システム設定</h1>
          <div className="sub">ITSM Management 全体設定</div>
        </div>
      </div>

      <div className="grid-2-eq">
        <div className="card">
          <div className="card__head"><h3>表示設定</h3></div>
          <div className="card__body" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {row('ダークモード', 'UIのテーマを暗色に切り替えます', <button className={`btn btn--sm ${isDark ? 'btn--primary' : 'btn--outline'}`} onClick={onToggleDark}>{isDark ? 'ON' : 'OFF'}</button>)}
          </div>
        </div>
        <div className="card">
          <div className="card__head"><h3>SLA設定</h3></div>
          <div className="card__body" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {row('緊急SLA', 'Critical優先度の対応期限', <span className="sr-value">2時間</span>)}
            {row('高SLA', 'High優先度の対応期限', <span className="sr-value">4時間</span>)}
            {row('中SLA', 'Medium優先度の対応期限', <span className="sr-value">8時間</span>)}
            {row('低SLA', 'Low優先度の対応期限', <span className="sr-value">24時間</span>)}
            {row('営業時間', '開始 / 終了', <span className="sr-value">09:00 – 18:00</span>)}
          </div>
        </div>
      </div>

      {canAdmin && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card__head"><h3>ユーザー・ロール管理</h3><Pill value={user?.role ?? 'viewer'} /></div>
            <div style={{ padding: '14px 18px' }}>
              <DataTable<User> columns={[
                { key: 'display_name', label: '氏名', render: (v) => <span style={{ fontWeight: 500 }}>{String(v)}</span> },
                { key: 'email', label: 'メール', cls: 'td-muted' },
                { key: 'role', label: 'ロール', render: (v) => <Pill value={String(v)} /> },
                { key: 'department', label: '部署', cls: 'td-muted' },
              ]} data={users} />
            </div>
          </div>

          <div className="card">
            <div className="card__head"><h3>監査ログ（直近20件）</h3></div>
            <div style={{ padding: '14px 18px' }}>
              <DataTable<AuditLog> columns={[
                { key: 'created_at', label: '日時', render: (v) => <span className="mono tnum td-muted">{fmtDate(String(v))}</span> },
                { key: 'action', label: '操作', render: (v) => <Pill value={String(v)} /> },
                { key: 'entity_type', label: '種別', cls: 'td-muted' },
                { key: 'user_name', label: '操作者', cls: 'td-muted', render: (v) => String(v ?? '—') },
              ]} data={audits} emptyMsg="監査ログはありません" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
