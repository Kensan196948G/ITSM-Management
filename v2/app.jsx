/* ITSM v2 — Main App Component */

function App() {
  /* Theme state */
  const [isDark, setIsDark] = React.useState(() => localStorage.getItem('itsm-dark')==='true');
  const [isDense, setIsDense] = React.useState(() => localStorage.getItem('itsm-dense')==='true');
  const [activeView, setActiveView] = React.useState(() => localStorage.getItem('itsm-view') || 'dashboard');

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', isDark?'dark':'light'); localStorage.setItem('itsm-dark', isDark); }, [isDark]);
  React.useEffect(() => { localStorage.setItem('itsm-dense', isDense); }, [isDense]);
  React.useEffect(() => { localStorage.setItem('itsm-view', activeView); }, [activeView]);

  const toggleDark = () => setIsDark(p => !p);
  const toggleDense = () => setIsDense(p => !p);

  const navigate = React.useCallback((view) => {
    setActiveView(view);
    /* Scroll main area to top on navigation */
    const main = document.getElementById('itsm-main');
    if (main) main.scrollTop = 0;
  }, []);

  /* Header title based on active view */
  const headerTitle = React.useMemo(() => {
    if (activeView === 'dashboard') return 'ダッシュボード';
    if (activeView === 'system-settings') return 'システム設定';
    const cfg = MODULE_CONFIGS[activeView];
    if (cfg) return cfg.label;
    const flat = NAV_SECTIONS.flatMap(s => s.items);
    const nav = flat.find(i => i.key === activeView);
    return nav ? nav.label : 'ITSM Management';
  }, [activeView]);

  /* Render active view */
  const renderView = () => {
    const dense = isDense;
    switch (activeView) {
      case 'dashboard': return React.createElement(DashboardView, { dense });
      case 'sla': return React.createElement(SLAView, { dense });
      case 'realtime': return React.createElement(RealtimeView, { dense });
      case 'visualization': return React.createElement(VisualizationView, { dense });
      case 'automation': return React.createElement(AutomationView, { dense });
      case 'system-settings': return React.createElement(SettingsView, { dense, isDark, onToggleDark:toggleDark, isDense, onToggleDense:toggleDense });
      default:
        if (MODULE_CONFIGS[activeView]) return React.createElement(ModuleView, { key:activeView, moduleKey:activeView, dense });
        return React.createElement(PageLayout, { title:'準備中', subtitle:'このモジュールは開発中です', breadcrumb:['ホーム', activeView], dense },
          React.createElement(EmptyState, { message:'このモジュールは現在準備中です', icon:'🚧' })
        );
    }
  };

  return React.createElement(ToastProvider, null,
    React.createElement('div', { style:{display:'flex',minHeight:'100vh',background:'var(--c-bg)'} },
      /* Sidebar */
      React.createElement(Sidebar, { activeView, onNavigate:navigate }),
      /* Main Area */
      React.createElement('div', { style:{flex:1,marginLeft:'var(--sidebar-w)',display:'flex',flexDirection:'column',minHeight:'100vh',transition:'margin-left var(--dur-slow) var(--ease)'} },
        React.createElement(Header, { title:headerTitle, isDark, onToggleDark:toggleDark, isDense, onToggleDense:toggleDense }),
        React.createElement('main', { id:'itsm-main', role:'main', style:{flex:1,overflowY:'auto'} },
          renderView()
        )
      )
    )
  );
}

/* ── Mount ── */
const rootEl = document.getElementById('root');
const root = ReactDOM.createRoot(rootEl);
root.render(React.createElement(App));
