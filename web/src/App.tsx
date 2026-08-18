/** App: ルーティングとシェル */
import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './auth';
import { Sidebar, Header, NAV_SECTIONS } from './components/layout';
import { ModuleView } from './components/ModuleView';
import { MODULE_CONFIGS } from './modules.tsx';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { SlaPage, RealtimePage, VisualizationPage, AutomationPage } from './pages/Misc';

function Shell() {
  const { user, loading, refresh } = useAuth();
  const [activeView, setActiveView] = useState(() => localStorage.getItem('itsm-view') || 'dashboard');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('itsm-dark') === 'true');
  const [collapsed, setCollapsed] = useState(false);
  // モバイル（<=900px）用: サイドバーの開閉状態
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('itsm-dark', String(isDark));
  }, [isDark]);
  useEffect(() => { localStorage.setItem('itsm-view', activeView); }, [activeView]);

  const title = useMemo(() => {
    if (activeView === 'dashboard') return 'ダッシュボード';
    if (activeView === 'settings') return 'システム設定';
    if (activeView === 'sla') return 'SLA監視';
    if (activeView === 'realtime') return 'リアルタイム監視';
    if (activeView === 'visualization') return '統合可視化';
    if (activeView === 'automation') return 'Automation / AIOps';
    const cfg = MODULE_CONFIGS[activeView];
    if (cfg) return cfg.label;
    const flat = NAV_SECTIONS.flatMap((s) => s.items);
    return flat.find((i) => i.key === activeView)?.label ?? 'ITSM Management';
  }, [activeView]);

  const navigate = (view: string) => {
    setActiveView(view);
    // モバイルでは項目選択後にサイドバーを閉じる
    setSidebarOpen(false);
    const main = document.getElementById('itsm-main');
    if (main) main.scrollTop = 0;
  };

  // モバイルでは開閉、デスクトップでは折りたたみをトグル
  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setSidebarOpen((p) => !p);
    } else {
      setCollapsed((p) => !p);
    }
  };

  if (loading) {
    return <div className="login-wrap"><div className="login-card">読み込み中...</div></div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage onNewIncident={() => navigate('incidents')} />;
      case 'sla':
        return <SlaPage />;
      case 'realtime':
        return <RealtimePage />;
      case 'visualization':
        return <VisualizationPage />;
      case 'automation':
        return <AutomationPage />;
      case 'settings':
        return <SettingsPage isDark={isDark} onToggleDark={() => setIsDark((p) => !p)} />;
      default: {
        const cfg = MODULE_CONFIGS[activeView];
        if (cfg) return <ModuleView key={activeView} cfg={cfg} />;
        return (
          <div className="page-head">
            <h1>準備中</h1>
            <div className="sub">このモジュールは開発中です</div>
          </div>
        );
      }
    }
  };

  return (
    <div className="app">
      <Sidebar activeView={activeView} onNavigate={navigate} collapsed={collapsed} open={sidebarOpen} />
      <div className={`main ${collapsed ? 'main--expanded' : ''}`}>
        <Header title={title} isDark={isDark} onToggleDark={() => setIsDark((p) => !p)} collapsed={collapsed} onToggleCollapse={toggleSidebar} />
        <main id="itsm-main" className="content" role="main">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
