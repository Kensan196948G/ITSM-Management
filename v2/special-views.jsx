/* ITSM v2 — Special Views: SLA, Realtime, Visualization, Automation, Settings */

/* ── SLA Monitoring View ── */
function SLAView({ dense }) {
  const incidents = React.useMemo(() => MockAPI.list('incidents', { limit:100 }), []);
  const [data, setData] = React.useState({ items:[] });
  React.useEffect(() => { incidents.then(d => setData(d)); }, []);

  const items = data.items;
  const resolved = items.filter(x => x.resolved_at);
  const slaOk = resolved.filter(x => new Date(x.resolved_at) <= new Date(x.due_at)).length;
  const rate = resolved.length ? Math.round(slaOk/resolved.length*100) : 100;
  const overdue = items.filter(x => !['resolved','closed'].includes(x.status) && x.due_at && new Date(x.due_at)<new Date());
  const atRisk = items.filter(x => { if(['resolved','closed'].includes(x.status)||!x.due_at) return false; const r=new Date(x.due_at)-new Date(); return r>0&&r<2*3600000; });
  const avgH = resolved.length ? resolved.reduce((s,x)=>(new Date(x.resolved_at)-new Date(x.created_at))/3600000+s,0)/resolved.length : 0;
  const gap = dense ? 16 : 20;

  return React.createElement(PageLayout, { title:'SLA監視', subtitle:'SLA遵守率・期限監視・リスク一覧', breadcrumb:['ホーム','SLA監視'], dense },
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap,marginBottom:gap} },
      React.createElement(KPICard, { title:'SLA遵守率', value:rate+'%', icon:'✓', color:rate>=90?'success':rate>=70?'warning':'danger' }),
      React.createElement(KPICard, { title:'期限超過', value:overdue.length+'件', icon:'⚠', color:'danger' }),
      React.createElement(KPICard, { title:'リスク（2h以内）', value:atRisk.length+'件', icon:'⏰', color:'warning' }),
      React.createElement(KPICard, { title:'平均解決時間', value:avgH.toFixed(1)+'h', icon:'⏱', color:'info' }),
    ),
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16} }, 'SLAリスク一覧'),
      React.createElement(DataTable, {
        columns:[
          { key:'ticket_no', label:'チケット', nowrap:true },
          { key:'title', label:'タイトル', maxWidth:300 },
          { key:'priority', label:'優先度', render:v=>React.createElement(Badge,{value:v}) },
          { key:'sla', label:'SLA', render:(_,r)=>React.createElement(SLAPill,{dueAt:r.due_at,resolvedAt:r.resolved_at}) },
          { key:'due_at', label:'期限', render:v=>fmtDate(v,true), nowrap:true },
        ],
        data: [...overdue, ...atRisk],
        emptyMsg: 'SLAリスクのチケットはありません',
      })
    )
  );
}

/* ── Realtime View ── */
function RealtimeView({ dense }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => { const t = setInterval(()=>setTick(p=>p+1), 5000); return ()=>clearInterval(t); }, []);
  const systems = [
    { name:'Microsoft365', status:'operational', latency:'45ms', uptime:'99.97%' },
    { name:'VPN Gateway', status:'degraded', latency:'220ms', uptime:'99.2%' },
    { name:'Active Directory', status:'operational', latency:'12ms', uptime:'99.99%' },
    { name:'ファイルサーバ', status:'operational', latency:'8ms', uptime:'99.95%' },
    { name:'メールサーバ (Exchange)', status:'operational', latency:'65ms', uptime:'99.9%' },
    { name:'CADライセンスサーバ', status:'incident', latency:'—', uptime:'98.5%' },
    { name:'プリントサーバ', status:'operational', latency:'15ms', uptime:'99.8%' },
    { name:'監視 (Zabbix)', status:'operational', latency:'30ms', uptime:'99.99%' },
  ];
  const statusColor = { operational:'var(--c-success-600)', degraded:'var(--c-warn-600)', incident:'var(--c-danger-600)' };
  const statusLabel = { operational:'正常', degraded:'低下', incident:'障害' };
  const gap = dense ? 16 : 20;

  return React.createElement(PageLayout, { title:'リアルタイム監視', subtitle:'システム稼働状況のリアルタイム表示', breadcrumb:['ホーム','リアルタイム監視'], dense },
    React.createElement('div', { style:{display:'flex',alignItems:'center',gap:8,marginBottom:gap,fontSize:'var(--fs-sm)',color:'var(--c-text-3)'} },
      React.createElement('span', { style:{width:8,height:8,borderRadius:'var(--r-full)',background:'var(--c-success-600)',animation:'pulse 2s infinite'} }),
      '自動更新中 — 最終: ' + new Date().toLocaleTimeString('ja-JP'),
    ),
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap} },
      ...systems.map(s =>
        React.createElement('div', { key:s.name, className:'animate-fade', style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:20,display:'flex',alignItems:'center',gap:16,transition:'box-shadow var(--dur-base) var(--ease)'}, onMouseEnter:e=>e.currentTarget.style.boxShadow='var(--shadow-md)', onMouseLeave:e=>e.currentTarget.style.boxShadow='none' },
          React.createElement('div', { style:{width:12,height:12,borderRadius:'var(--r-full)',background:statusColor[s.status],flexShrink:0,boxShadow:`0 0 8px ${statusColor[s.status]}44`} }),
          React.createElement('div', { style:{flex:1} },
            React.createElement('div', { style:{fontWeight:600,fontSize:'var(--fs-sm)',color:'var(--c-text)'} }, s.name),
            React.createElement('div', { style:{fontSize:12,color:'var(--c-text-4)',marginTop:4,display:'flex',gap:12} },
              React.createElement('span', null, 'レイテンシ: ', s.latency),
              React.createElement('span', null, '稼働率: ', s.uptime),
            )
          ),
          React.createElement('span', { style:{fontSize:12,fontWeight:600,color:statusColor[s.status],padding:'4px 10px',borderRadius:'var(--r-full)',background:s.status==='operational'?'var(--c-success-50)':s.status==='degraded'?'var(--c-warn-50)':'var(--c-danger-50)'} }, statusLabel[s.status])
        )
      )
    )
  );
}

/* ── Visualization View ── */
function VisualizationView({ dense }) {
  const gap = dense ? 16 : 20;
  const maps = [
    { name:'サービスマップ', target:'M365/VPN/CAD', source:'CMDB', status:'最新' },
    { name:'現場NW図', target:'現場A/B', source:'NW台帳', status:'要更新' },
    { name:'障害影響マップ', target:'全サービス', source:'CMDB依存関係', status:'最新' },
    { name:'M365依存関係', target:'Teams/SPO/OD', source:'Entra ID', status:'最新' },
    { name:'プロセス対応表', target:'申請/設計/施工', source:'業務棚卸', status:'作成中' },
  ];
  return React.createElement(PageLayout, { title:'統合可視化', subtitle:'サービスマップ・影響図・ネットワーク図', breadcrumb:['ホーム','統合可視化'], dense },
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap,marginBottom:gap} },
      React.createElement(KPICard, { title:'可視化マップ', value:'5種', icon:'🧭', color:'primary' }),
      React.createElement(KPICard, { title:'影響サービス', value:'12件', icon:'🕸', color:'warning' }),
      React.createElement(KPICard, { title:'未紐付けCI', value:'7件', icon:'⚡', color:'danger' }),
    ),
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16} }, '可視化マップ一覧'),
      React.createElement(DataTable, {
        columns:[
          { key:'name', label:'マップ' },
          { key:'target', label:'対象' },
          { key:'source', label:'更新元' },
          { key:'status', label:'鮮度', render:v => {
            const c = v==='最新'?'success':v==='要更新'?'warning':'info';
            return React.createElement(Badge, { value:v==='最新'?'resolved':v==='要更新'?'waiting':'in_progress' });
          }},
        ],
        data: maps,
      })
    )
  );
}

/* ── Automation View ── */
function AutomationView({ dense }) {
  const gap = dense ? 16 : 20;
  const rules = [
    { id:1, name:'SLA期限30分前通知', trigger:'SLA期限30分前', action:'Teams通知+チケット更新', approval:'不要', enabled:true },
    { id:2, name:'VPN失敗検知', trigger:'VPN失敗10回以上', action:'ログ収集+Security起票', approval:'不要', enabled:true },
    { id:3, name:'印刷キュー自動復旧', trigger:'キュー滞留30分', action:'スプーラ再起動', approval:'不要', enabled:true },
    { id:4, name:'ディスク容量警告', trigger:'C: 90%超過', action:'一時ファイル削除+Teams通知', approval:'不要', enabled:false },
    { id:5, name:'サービス自動再起動', trigger:'応答タイムアウト', action:'サービス再起動(3回まで)', approval:'初回のみ', enabled:true },
  ];
  return React.createElement(PageLayout, { title:'Automation / AIOps', subtitle:'自動復旧・Teams通知・AI分析', breadcrumb:['ホーム','Automation'], dense },
    React.createElement('div', { style:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap,marginBottom:gap} },
      React.createElement(KPICard, { title:'自動化ルール', value:rules.length+'本', icon:'🤖', color:'primary' }),
      React.createElement(KPICard, { title:'自動チケット化', value:'7件', icon:'🎫', color:'success', subtitle:'今月' }),
      React.createElement(KPICard, { title:'手作業削減', value:'18h', icon:'⏱', color:'info', subtitle:'月間見込み' }),
    ),
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:16} }, '自動化ルール一覧'),
      React.createElement(DataTable, {
        columns:[
          { key:'name', label:'ルール名' },
          { key:'trigger', label:'トリガー' },
          { key:'action', label:'動作' },
          { key:'approval', label:'承認' },
          { key:'enabled', label:'状態', render:v => React.createElement(Badge, { value:v?'active':'closed' }) },
        ],
        data: rules,
      })
    )
  );
}

/* ── System Settings View ── */
function SettingsView({ dense, isDark, onToggleDark, isDense, onToggleDense }) {
  const toast = useToast();
  const gap = dense ? 16 : 20;
  const settingRow = (label, desc, action) => React.createElement('div', {
    style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderBottom:'1px solid var(--c-border)'}
  },
    React.createElement('div', null,
      React.createElement('div', { style:{fontWeight:500,fontSize:'var(--fs-sm)',color:'var(--c-text)'} }, label),
      React.createElement('div', { style:{fontSize:12,color:'var(--c-text-4)',marginTop:2} }, desc),
    ),
    action
  );

  return React.createElement(PageLayout, { title:'システム設定', subtitle:'ITSM-Management 全体設定', breadcrumb:['ホーム','システム設定'], dense },
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:8} }, '表示設定'),
      settingRow('ダークモード', 'UIのテーマを暗色に切り替えます', React.createElement(Btn, { size:'sm', variant:isDark?'primary':'outline', onClick:onToggleDark }, isDark?'ON':'OFF')),
      settingRow('Denseモード', '表示をコンパクトにして一覧性を向上させます', React.createElement(Btn, { size:'sm', variant:isDense?'primary':'outline', onClick:onToggleDense }, isDense?'ON':'OFF')),
    ),
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:8} }, 'SLA設定'),
      settingRow('緊急SLA', 'Critical優先度の対応期限', React.createElement('span', { style:{fontFamily:'var(--font-mono)',fontSize:'var(--fs-sm)',color:'var(--c-text-2)'} }, '2時間')),
      settingRow('高SLA', 'High優先度の対応期限', React.createElement('span', { style:{fontFamily:'var(--font-mono)',fontSize:'var(--fs-sm)',color:'var(--c-text-2)'} }, '4時間')),
      settingRow('中SLA', 'Medium優先度の対応期限', React.createElement('span', { style:{fontFamily:'var(--font-mono)',fontSize:'var(--fs-sm)',color:'var(--c-text-2)'} }, '8時間')),
      settingRow('低SLA', 'Low優先度の対応期限', React.createElement('span', { style:{fontFamily:'var(--font-mono)',fontSize:'var(--fs-sm)',color:'var(--c-text-2)'} }, '24時間')),
      settingRow('営業時間', '開始 / 終了', React.createElement('span', { style:{fontFamily:'var(--font-mono)',fontSize:'var(--fs-sm)',color:'var(--c-text-2)'} }, '09:00 – 18:00')),
    ),
    /* ── ログインユーザー・アカウント管理 ── */
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:8} }, 'ログインユーザー管理'),
      settingRow('現在のユーザー', 'ログイン中のアカウント情報',
        React.createElement('div', { style:{display:'flex',alignItems:'center',gap:12} },
          React.createElement('div', { style:{width:32,height:32,borderRadius:'var(--r-full)',background:'var(--c-primary-600)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600} }, '田'),
          React.createElement('div', null,
            React.createElement('div', { style:{fontSize:'var(--fs-sm)',fontWeight:600,color:'var(--c-text)'} }, '田中 太郎'),
            React.createElement('div', { style:{fontSize:11,color:'var(--c-text-4)'} }, 'tanaka@example.com'),
          ),
          React.createElement(Badge, { value:'admin', size:'sm' }),
        )
      ),
      settingRow('パスワード変更', '現在のパスワードを変更します（90日ごとの更新を推奨）', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('パスワード変更画面（デモ）','info') }, '変更')),
      settingRow('MFA設定', '多要素認証（TOTP）の有効化・再登録', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('MFA設定画面（デモ）','info') }, '設定')),
      settingRow('アクティブセッション', '現在ログイン中のセッションを管理します',
        React.createElement('div', { style:{display:'flex',alignItems:'center',gap:8} },
          React.createElement('span', { style:{fontSize:'var(--fs-sm)',color:'var(--c-text-3)',fontFamily:'var(--font-mono)'} }, '2セッション'),
          React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('他のセッションをすべてログアウトしました','success') }, '他を切断'),
        )
      ),
      settingRow('ログアウト', '現在のセッションからログアウトします', React.createElement(Btn, { size:'sm', variant:'danger', onClick:()=>toast('ログアウトしました（デモ）','info') }, 'ログアウト')),
    ),

    /* ── ユーザー・ロール管理（Admin向け） ── */
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('div', { style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8} },
        React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600} }, 'ユーザー・ロール管理'),
        React.createElement(Badge, { value:'admin' }),
      ),
      React.createElement('p', { style:{fontSize:12,color:'var(--c-text-4)',marginBottom:12} }, '管理者のみ操作可能です。RBACに基づいたロール割当を行います。'),
      React.createElement(DataTable, {
        columns: [
          { key:'display_name', label:'氏名' },
          { key:'email', label:'メール' },
          { key:'role', label:'ロール', render:v=>React.createElement(Badge,{value:v}) },
          { key:'department', label:'部署' },
          { key:'_actions', label:'操作', render:(_,row) =>
            React.createElement('div', { style:{display:'flex',gap:4} },
              React.createElement(Btn, { size:'sm', variant:'ghost', onClick:()=>toast(row.display_name+'のロール編集（デモ）','info') }, '✏'),
              row.role!=='admin' && React.createElement(Btn, { size:'sm', variant:'ghost', onClick:()=>toast(row.display_name+'を無効化（デモ）','info') }, '🚫'),
            )
          },
        ],
        data: window.ITSM_USERS || [],
      }),
      React.createElement('div', { style:{display:'flex',gap:8,marginTop:12} },
        React.createElement(Btn, { size:'sm', variant:'primary', onClick:()=>toast('ユーザー招待画面（デモ）','info') }, '＋ ユーザー招待'),
        React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('ロール定義画面（デモ）','info') }, '🔑 ロール定義'),
      ),
    ),

    /* ── 監査ログ ── */
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:8} }, '監査ログ'),
      settingRow('操作ログ閲覧', '全ユーザーの操作履歴（作成・更新・削除・ログイン）を確認します', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('監査ログ画面（デモ）','info') }, '閲覧')),
      settingRow('ログ保存期間', '監査ログの保持期間設定', React.createElement('span', { style:{fontFamily:'var(--font-mono)',fontSize:'var(--fs-sm)',color:'var(--c-text-2)'} }, '365日')),
      settingRow('ログエクスポート', '監査ログをCSV / Excel形式で出力', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('監査ログエクスポート（デモ）','info') }, 'エクスポート')),
    ),

    /* ── 通知設定 ── */
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24,marginBottom:gap} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:8} }, '通知設定'),
      settingRow('メール通知', 'SLA違反・Critical障害時のメール通知', React.createElement(Btn, { size:'sm', variant:'primary', onClick:()=>toast('メール通知をOFFにしました','info') }, 'ON')),
      settingRow('Teams通知', 'チャネルへの自動投稿', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('Teams通知をONにしました','success') }, 'OFF')),
      settingRow('承認待ち通知', '変更管理・サービス要求の承認待ちアラート', React.createElement(Btn, { size:'sm', variant:'primary', onClick:()=>toast('承認通知をOFFにしました','info') }, 'ON')),
    ),

    /* ── データ管理 ── */
    React.createElement('div', { style:{background:'var(--c-surface)',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',padding:dense?16:24} },
      React.createElement('h3', { style:{fontSize:'var(--fs-md)',fontWeight:600,marginBottom:8} }, 'データ管理'),
      settingRow('フィルター初期化', '全画面のフィルターと検索条件をリセット', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('フィルターを初期化しました','success') }, '初期化')),
      settingRow('設定エクスポート', '現在の設定をJSONでダウンロード', React.createElement(Btn, { size:'sm', variant:'outline', onClick:()=>toast('JSONエクスポート（デモ）','info') }, 'エクスポート')),
      settingRow('サンプルデータリセット', 'モックデータを初期状態に戻す', React.createElement(Btn, { size:'sm', variant:'danger', onClick:()=>{location.reload();} }, 'リセット')),
    ),
  );
}

Object.assign(window, { SLAView, RealtimeView, VisualizationView, AutomationView, SettingsView });
