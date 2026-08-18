/** レイアウト: サイドバー + ヘッダー */
import { useState } from 'react';
import { useAuth } from '../auth';
import { ROLE_LABEL } from '../types';

export interface NavItem {
  key: string;
  label: string;
  sub: string;
  icon: string;
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: '概要', items: [
    { key: 'dashboard', label: 'ダッシュボード', sub: 'KPI・SLA・トレンド', icon: '📊' },
    { key: 'incidents', label: 'インシデント管理', sub: '障害・問い合わせ管理', icon: '🎫' },
    { key: 'sla', label: 'SLA監視', sub: '遵守率・期限監視', icon: '⏱' },
    { key: 'realtime', label: 'リアルタイム監視', sub: 'システム稼働状況', icon: '📡' },
  ]},
  { title: 'ITSM管理', items: [
    { key: 'problem', label: '問題管理', sub: 'RCA・既知エラーDB', icon: '🐛' },
    { key: 'change', label: '変更管理', sub: '承認・ロールバック', icon: '🔄' },
    { key: 'cmdb', label: 'CMDB', sub: '構成情報・依存関係', icon: '🖥' },
    { key: 'knowledge', label: 'ナレッジ管理', sub: 'FAQ・手順書', icon: '📚' },
    { key: 'asset', label: 'IT資産管理', sub: '所有・保守期限', icon: '📦' },
    { key: 'patch', label: 'パッチ管理', sub: '適用状況・緊急パッチ', icon: '🛡' },
    { key: 'security', label: 'セキュリティ管理', sub: 'MFA・DLP・AV', icon: '🔒' },
    { key: 'request', label: 'サービス要求', sub: '申請・承認ワークフロー', icon: '📥' },
  ]},
  { title: '分析・自動化', items: [
    { key: 'visualization', label: '統合可視化', sub: 'サービスマップ・影響図', icon: '🗺' },
    { key: 'automation', label: 'Automation', sub: '自動復旧・AI分析', icon: '⚡' },
  ]},
];

export function Sidebar({ activeView, onNavigate, collapsed, open }: {
  activeView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  open?: boolean;
}) {
  const { user, logout } = useAuth();
  const [collapsedSections, setCS] = useState<Record<string, boolean>>({});
  const toggleSection = (t: string) => setCS((p) => ({ ...p, [t]: !p[t] }));

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${open ? 'sidebar--open' : ''}`} role="navigation" aria-label="メインナビゲーション">
      <div className="sidebar__logo">
        <div className="sidebar__logo-mark">IT</div>
        {!collapsed && (
          <div>
            <div className="sidebar__logo-name">ITSM Management</div>
            <div className="sidebar__logo-sub">Service Desk</div>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <button className="sidebar__section-title" onClick={() => toggleSection(section.title)} aria-expanded={!collapsedSections[section.title]}>
                {section.title}
              </button>
            )}
            {!collapsedSections[section.title] &&
              section.items.map((item) => (
                <button key={item.key} className={`sidebar__item ${activeView === item.key ? 'sidebar__item--active' : ''}`}
                  onClick={() => onNavigate(item.key)} aria-current={activeView === item.key ? 'page' : undefined}>
                  <span aria-hidden="true">{item.icon}</span>
                  {!collapsed && (
                    <span className="sidebar__item-label">
                      <span className="l1">{item.label}</span>
                      <span className="l2">{item.sub}</span>
                    </span>
                  )}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">{(user?.display_name ?? '?').slice(0, 1)}</div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div className="sidebar__user-name">{user?.display_name}</div>
              <div className="sidebar__user-role">{user ? `${ROLE_LABEL[user.role] ?? user.role} · ${user.department ?? ''}` : ''}</div>
            </div>
          )}
        </div>
        <button className="sidebar__foot-btn" onClick={() => onNavigate('settings')}>
          <span aria-hidden="true">⚙️</span>{!collapsed && 'システム設定'}
        </button>
        <button className="sidebar__foot-btn" onClick={() => void logout()} aria-label="ログアウト">
          <span aria-hidden="true">🚪</span>{!collapsed && 'ログアウト'}
        </button>
      </div>
    </aside>
  );
}

export function Header({ title, isDark, onToggleDark, collapsed, onToggleCollapse }: {
  title: string;
  isDark: boolean;
  onToggleDark: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <header className="header" role="banner">
      <div className="header__left">
        <button className="icon-btn" onClick={onToggleCollapse} aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'} aria-hidden={undefined} style={{}}>
          <span aria-hidden="true">☰</span>
        </button>
        <div style={{ minWidth: 0 }}>
          <div className="header__title">{title}</div>
          <div className="header__crumb">ホーム › {title}</div>
        </div>
      </div>
      <div className="header__right">
        <button className="icon-btn" onClick={onToggleDark} aria-label={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}>
          <span aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
        </button>
      </div>
    </header>
  );
}
