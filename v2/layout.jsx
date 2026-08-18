/* ITSM v2 — Layout Components: Sidebar, Header, PageLayout */

const NAV_SECTIONS = [
  { title:'概要', items:[
    { key:'dashboard', label:'ダッシュボード', sub:'KPI・SLA・トレンド' },
    { key:'incidents', label:'インシデント管理', sub:'障害・問い合わせ管理' },
    { key:'sla', label:'SLA監視', sub:'遵守率・期限監視' },
    { key:'realtime', label:'リアルタイム監視', sub:'システム稼働状況' },
  ]},
  { title:'ITSM管理', items:[
    { key:'problem', label:'問題管理', sub:'RCA・既知エラーDB' },
    { key:'change', label:'変更管理', sub:'承認・ロールバック' },
    { key:'cmdb', label:'CMDB', sub:'構成情報・依存関係' },
    { key:'knowledge', label:'ナレッジ管理', sub:'FAQ・手順書' },
    { key:'asset', label:'IT資産管理', sub:'所有・保守期限' },
    { key:'patch', label:'パッチ管理', sub:'適用状況・緊急パッチ' },
    { key:'security', label:'セキュリティ管理', sub:'MFA・DLP・AV' },
    { key:'request', label:'サービス要求', sub:'申請・承認ワークフロー' },
  ]},
  { title:'分析・自動化', items:[
    { key:'visualization', label:'統合可視化', sub:'サービスマップ・影響図' },
    { key:'automation', label:'Automation', sub:'自動復旧・AI分析' },
  ]},
];

/* ── Sidebar ── */
function Sidebar({ activeView, onNavigate, collapsed, onToggleCollapse }) {
  const [collapsedSections, setCS] = React.useState({});
  const toggleSection = (title) => setCS(p => ({...p, [title]: !p[title]}));

  const sidebarStyle = {
    width: collapsed ? 72 : 'var(--sidebar-w)',
    background: 'var(--c-sidebar)',
    borderRight: '1px solid var(--c-border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 50,
    transition: 'width var(--dur-slow) var(--ease)',
    overflow: 'hidden',
  };

  return React.createElement('aside', { style: sidebarStyle, role:'navigation', 'aria-label':'メインナビゲーション' },
    /* Logo */
    React.createElement('div', {
      style: { padding: collapsed ? '16px 12px' : '16px 20px', borderBottom: '1px solid var(--c-border)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }
    },
      React.createElement('div', {
        style: { width:36, height:36, borderRadius:'var(--r-md)', background:'var(--c-primary-600)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:700, flexShrink:0 }
      }, 'IT'),
      !collapsed && React.createElement('div', { style:{overflow:'hidden'} },
        React.createElement('div', { style:{fontSize:'var(--fs-md)',fontWeight:700,color:'var(--c-text)',whiteSpace:'nowrap'} }, 'ITSM'),
        React.createElement('div', { style:{fontSize:11,color:'var(--c-primary-600)',fontWeight:500,whiteSpace:'nowrap'} }, 'Management System'),
      )
    ),

    /* Search */
    !collapsed && React.createElement('div', { style:{padding:'12px 16px',flexShrink:0} },
      React.createElement('input', {
        type:'search', placeholder:'メニュー検索...',
        'aria-label':'メニュー検索',
        style: { width:'100%',padding:'7px 12px',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',fontSize:'var(--fs-xs)',background:'var(--c-hover)',color:'var(--c-text)',outline:'none' },
        onFocus: e => e.target.style.borderColor='var(--c-primary-500)',
        onBlur: e => e.target.style.borderColor='var(--c-border)',
      })
    ),

    /* Nav Sections */
    React.createElement('nav', { style:{flex:1,overflowY:'auto',overflowX:'hidden',padding:'4px 0'} },
      ...NAV_SECTIONS.map(section =>
        React.createElement('div', { key: section.title, style:{marginBottom:4} },
          !collapsed && React.createElement('button', {
            onClick: () => toggleSection(section.title),
            'aria-expanded': !collapsedSections[section.title],
            style: { width:'100%',display:'flex',alignItems:'center',padding:'8px 20px',fontSize:11,color:'var(--c-text-4)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',background:'none',border:'none',cursor:'pointer',justifyContent:'space-between' }
          },
            section.title,
            React.createElement('span', { style:{fontSize:10,transition:'transform var(--dur-fast) var(--ease)',transform:collapsedSections[section.title]?'rotate(-90deg)':'none'},'aria-hidden':'true' }, '▼')
          ),
          !collapsedSections[section.title] && section.items.map(item =>
            React.createElement('button', {
              key: item.key,
              onClick: () => onNavigate(item.key),
              'aria-current': activeView === item.key ? 'page' : undefined,
              style: {
                width:'100%',display:'flex',alignItems:'center',gap: collapsed ? 0 : 12,
                padding: collapsed ? '12px' : '10px 20px',
                background: activeView === item.key ? 'var(--c-primary-50)' : 'transparent',
                color: activeView === item.key ? 'var(--c-primary-600)' : 'var(--c-text-2)',
                border:'none',cursor:'pointer',fontSize:'var(--fs-sm)',textAlign:'left',
                borderRight: activeView === item.key ? '3px solid var(--c-primary-600)' : '3px solid transparent',
                transition:'all var(--dur-fast) var(--ease)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              },
              onMouseEnter: e => { if(activeView!==item.key) e.currentTarget.style.background='var(--c-hover)'; },
              onMouseLeave: e => { if(activeView!==item.key) e.currentTarget.style.background='transparent'; },
            },
              !collapsed && React.createElement('div', { style:{flex:1,minWidth:0} },
                React.createElement('div', { style:{fontWeight: activeView===item.key?600:400,lineHeight:1.3} }, item.label),
                React.createElement('div', { style:{fontSize:11,color:'var(--c-text-4)',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'} }, item.sub)
              )
            )
          )
        )
      )
    ),

    /* Settings at bottom */
    React.createElement('div', { style:{borderTop:'1px solid var(--c-border)',flexShrink:0} },
      React.createElement('button', {
        onClick: () => onNavigate('system-settings'),
        'aria-current': activeView==='system-settings'?'page':undefined,
        style: {
          width:'100%',display:'flex',alignItems:'center',gap:12,padding: collapsed?'12px':'12px 20px',
          background: activeView==='system-settings'?'var(--c-primary-50)':'transparent',
          color: activeView==='system-settings'?'var(--c-primary-600)':'var(--c-text-2)',
          border:'none',cursor:'pointer',fontSize:'var(--fs-sm)',fontWeight:500,
          justifyContent: collapsed?'center':'flex-start',
        },
        onMouseEnter: e => { if(activeView!=='system-settings') e.currentTarget.style.background='var(--c-hover)'; },
        onMouseLeave: e => { if(activeView!=='system-settings') e.currentTarget.style.background='transparent'; },
      },
        React.createElement('span', { 'aria-hidden':'true',style:{fontSize:16} }, '⚙'),
        !collapsed && 'システム設定'
      )
    ),

    /* User Info */
    React.createElement('div', {
      style: { padding: collapsed?'12px':'14px 20px',borderTop:'1px solid var(--c-border)',display:'flex',alignItems:'center',gap:12,flexShrink:0,background:'var(--c-hover)',justifyContent:collapsed?'center':'flex-start' }
    },
      React.createElement('div', {
        style: { width:36,height:36,borderRadius:'var(--r-full)',background:'var(--c-primary-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:600,flexShrink:0 }
      }, '田'),
      !collapsed && React.createElement('div', { style:{flex:1,minWidth:0,overflow:'hidden'} },
        React.createElement('div', { style:{fontSize:'var(--fs-sm)',fontWeight:600,color:'var(--c-text)',whiteSpace:'nowrap'} }, '田中 太郎'),
        React.createElement('div', { style:{fontSize:11,color:'var(--c-text-4)'} }, 'Admin')
      )
    )
  );
}

/* ── Header ── */
function Header({ title, onToggleDark, isDark, onToggleDense, isDense }) {
  return React.createElement('header', {
    style: {
      height: 'var(--header-h)',
      background: 'var(--c-surface)',
      borderBottom: '1px solid var(--c-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    },
    role: 'banner'
  },
    React.createElement('h1', { style:{fontSize:'var(--fs-md)',fontWeight:600,color:'var(--c-text)'} }, title || 'ITSM Management'),
    React.createElement('div', { style:{display:'flex',alignItems:'center',gap:8} },
      /* Dense toggle */
      React.createElement('button', {
        onClick: onToggleDense,
        title: isDense ? '標準表示' : 'コンパクト表示',
        'aria-label': isDense ? '標準表示に切替' : 'コンパクト表示に切替',
        style: { background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',padding:'6px 10px',color:'var(--c-text-3)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:6,transition:'all var(--dur-fast) var(--ease)' },
        onMouseEnter: e => e.currentTarget.style.borderColor='var(--c-primary-500)',
        onMouseLeave: e => e.currentTarget.style.borderColor='var(--c-border)',
      }, isDense ? '☰ 標準' : '☷ Dense'),
      /* Theme toggle */
      React.createElement('button', {
        onClick: onToggleDark,
        title: isDark ? 'ライトモード' : 'ダークモード',
        'aria-label': isDark ? 'ライトモードに切替' : 'ダークモードに切替',
        style: { background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',padding:'6px 10px',color:'var(--c-text-3)',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',gap:6,transition:'all var(--dur-fast) var(--ease)' },
        onMouseEnter: e => e.currentTarget.style.borderColor='var(--c-primary-500)',
        onMouseLeave: e => e.currentTarget.style.borderColor='var(--c-border)',
      }, isDark ? '☀️ Light' : '🌙 Dark'),
      /* Notifications */
      React.createElement('button', {
        'aria-label':'通知',
        style: { position:'relative',background:'none',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',padding:'6px 10px',color:'var(--c-text-3)',cursor:'pointer',fontSize:16,transition:'all var(--dur-fast) var(--ease)' },
        onMouseEnter: e => e.currentTarget.style.borderColor='var(--c-primary-500)',
        onMouseLeave: e => e.currentTarget.style.borderColor='var(--c-border)',
      },
        '🔔',
        React.createElement('span', { style:{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'var(--r-full)',background:'var(--c-danger-600)',color:'#fff',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600} }, '3')
      )
    )
  );
}

/* ── Page Layout ── */
function PageLayout({ title, subtitle, breadcrumb, actions, children, dense }) {
  const pad = dense ? 16 : 24;
  return React.createElement('div', { className:'animate-fade', style:{padding:pad} },
    breadcrumb && React.createElement('nav', {
      'aria-label':'パンくずリスト',
      style:{display:'flex',alignItems:'center',gap:8,fontSize:'var(--fs-sm)',color:'var(--c-text-4)',marginBottom:12}
    },
      ...breadcrumb.map((b, i) => [
        i > 0 && React.createElement('span', { key:'sep'+i, 'aria-hidden':'true', style:{color:'var(--c-border-2)'} }, '›'),
        React.createElement('span', { key:i, style:{ color: i===breadcrumb.length-1 ? 'var(--c-text-2)' : 'var(--c-text-4)', fontWeight: i===breadcrumb.length-1?500:400 } }, b)
      ]).flat().filter(Boolean)
    ),
    React.createElement('div', { style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom: dense?16:24,gap:16,flexWrap:'wrap'} },
      React.createElement('div', null,
        React.createElement('h2', { style:{fontSize: dense?'var(--fs-xl)':'var(--fs-2xl)',fontWeight:700,color:'var(--c-text)',lineHeight:1.2} }, title),
        subtitle && React.createElement('p', { style:{fontSize:'var(--fs-sm)',color:'var(--c-text-3)',marginTop:6} }, subtitle),
      ),
      actions && React.createElement('div', { style:{display:'flex',gap:8,flexShrink:0,flexWrap:'wrap'} }, actions)
    ),
    children
  );
}

Object.assign(window, { Sidebar, Header, PageLayout, NAV_SECTIONS });
