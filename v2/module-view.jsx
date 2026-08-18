/* ITSM v2 — Generic Module View + All Module Configs */

/* ── Module Configuration Registry ── */
const MODULE_CONFIGS = {
  incidents: {
    key:'incidents', label:'インシデント管理', sub:'障害・問い合わせのチケット管理', dataKey:'incidents',
    kpis: s => [
      { title:'総チケット', value:s.total+'件', color:'primary', icon:'📋' },
      { title:'未対応', value:s.items.filter(x=>['open','in_progress','waiting'].includes(x.status)).length+'件', color:'warning', icon:'⏳' },
      { title:'SLA違反', value:s.items.filter(x=>!['resolved','closed'].includes(x.status)&&x.due_at&&new Date(x.due_at)<new Date()).length+'件', color:'danger', icon:'⚠' },
    ],
    columns: [
      { key:'ticket_no', label:'チケット番号', sortable:true, nowrap:true },
      { key:'title', label:'タイトル', sortable:true, maxWidth:300 },
      { key:'priority', label:'優先度', sortable:true, render:v=>React.createElement(Badge,{value:v}) },
      { key:'status', label:'ステータス', sortable:true, render:v=>React.createElement(Badge,{value:v}) },
      { key:'sla', label:'SLA', render:(_,r)=>React.createElement(SLAPill,{dueAt:r.due_at,resolvedAt:r.resolved_at}) },
      { key:'site', label:'拠点', sortable:true },
      { key:'created_at', label:'作成日', sortable:true, render:v=>fmtDate(v,true), nowrap:true },
    ],
    filters: [
      { key:'status', label:'ステータス', options:['open','in_progress','waiting','resolved','closed'] },
      { key:'priority', label:'優先度', options:['critical','high','medium','low'] },
      { key:'site', label:'拠点', options:[{value:'本社',label:'本社'},{value:'現場A',label:'現場A'},{value:'現場B',label:'現場B'},{value:'全拠点',label:'全拠点'}] },
    ],
    formFields: [
      { key:'title', label:'タイトル', type:'text', required:true, full:true },
      { key:'priority', label:'優先度', type:'select', options:['critical','high','medium','low'], required:true },
      { key:'status', label:'ステータス', type:'select', options:['open','in_progress','waiting','resolved','closed'] },
      { key:'category', label:'カテゴリ', type:'text' },
      { key:'site', label:'拠点', type:'select', options:[{value:'本社',label:'本社'},{value:'現場A',label:'現場A'},{value:'現場B',label:'現場B'}] },
      { key:'system_name', label:'対象システム', type:'text' },
      { key:'description', label:'詳細', type:'textarea', full:true },
    ],
    defaults: { priority:'medium', status:'open', site:'本社' },
    ticketField:'ticket_no',
  },
  problem: {
    key:'problem', label:'問題管理', sub:'根本原因分析・再発防止・既知エラーDB', dataKey:'problems',
    kpis: s => [
      { title:'未解決問題', value:s.items.filter(x=>['open','investigating','known_error'].includes(x.status)).length+'件', color:'primary', icon:'🔍' },
      { title:'既知エラー', value:s.items.filter(x=>x.status==='known_error').length+'件', color:'warning', icon:'⚡' },
      { title:'総登録数', value:s.total+'件', color:'success', icon:'📚' },
    ],
    columns: [
      { key:'ticket_no', label:'問題番号', sortable:true, nowrap:true },
      { key:'title', label:'タイトル', sortable:true, maxWidth:300 },
      { key:'status', label:'ステータス', sortable:true, render:v=>React.createElement(Badge,{value:v}) },
      { key:'priority', label:'優先度', sortable:true, render:v=>React.createElement(Badge,{value:v}) },
      { key:'workaround', label:'回避策', render:v=>v||'—' },
      { key:'created_at', label:'作成日', sortable:true, render:v=>fmtDate(v,true), nowrap:true },
    ],
    filters: [
      { key:'status', label:'ステータス', options:['open','investigating','known_error','resolved','closed'] },
      { key:'priority', label:'優先度', options:['critical','high','medium','low'] },
    ],
    formFields: [
      { key:'title', label:'タイトル', type:'text', required:true, full:true },
      { key:'priority', label:'優先度', type:'select', options:['critical','high','medium','low'], required:true },
      { key:'status', label:'ステータス', type:'select', options:['open','investigating','known_error','resolved','closed'] },
      { key:'root_cause', label:'根本原因', type:'textarea', full:true },
      { key:'workaround', label:'回避策', type:'textarea', full:true },
    ],
    defaults:{ priority:'medium', status:'open' }, ticketField:'ticket_no',
  },
  change: {
    key:'change', label:'変更管理', sub:'変更申請・CAB承認・ロールバック管理', dataKey:'changes',
    kpis: s => [
      { title:'変更総数', value:s.total+'件', color:'primary', icon:'🔄' },
      { title:'承認待ち', value:s.items.filter(x=>['review','approved'].includes(x.status)).length+'件', color:'warning', icon:'📝' },
      { title:'実施中', value:s.items.filter(x=>x.status==='implementing').length+'件', color:'danger', icon:'⚡' },
    ],
    columns: [
      { key:'ticket_no', label:'変更番号', sortable:true, nowrap:true },
      { key:'title', label:'タイトル', sortable:true, maxWidth:280 },
      { key:'change_type', label:'種別', render:v=>React.createElement(Badge,{value:v}) },
      { key:'risk_level', label:'リスク', render:v=>React.createElement(Badge,{value:v}) },
      { key:'status', label:'ステータス', sortable:true, render:v=>React.createElement(Badge,{value:v}) },
      { key:'scheduled_at', label:'実施予定', render:v=>fmtDate(v,true), nowrap:true },
    ],
    filters: [
      { key:'status', label:'ステータス', options:['draft','review','approved','implementing','closed','rejected'] },
      { key:'risk_level', label:'リスク', options:['high','medium','low'] },
    ],
    formFields: [
      { key:'title', label:'タイトル', type:'text', required:true, full:true },
      { key:'change_type', label:'変更種別', type:'select', options:['normal','standard','emergency'], required:true },
      { key:'risk_level', label:'リスクレベル', type:'select', options:['high','medium','low'] },
      { key:'status', label:'ステータス', type:'select', options:['draft','review','approved','implementing','closed','rejected'] },
      { key:'scheduled_at', label:'実施予定日', type:'date' },
    ],
    defaults:{ change_type:'normal', risk_level:'medium', status:'draft' }, ticketField:'ticket_no',
  },
  cmdb: {
    key:'cmdb', label:'CMDB', sub:'構成情報・依存関係・拠点ネットワーク', dataKey:'cmdb',
    kpis: s => [
      { title:'登録CI', value:s.total+'件', color:'primary', icon:'🗄' },
      { title:'サーバ/NW', value:s.items.filter(x=>['server','network'].includes(x.ci_type)).length+'件', color:'success', icon:'🖥' },
      { title:'アクティブ', value:s.items.filter(x=>x.status==='active').length+'件', color:'warning', icon:'✓' },
    ],
    columns: [
      { key:'ci_id', label:'CI ID', sortable:true, nowrap:true },
      { key:'name', label:'名前', sortable:true },
      { key:'ci_type', label:'種別', render:v=>React.createElement(Badge,{value:v}) },
      { key:'environment', label:'環境' },
      { key:'site', label:'拠点' },
      { key:'status', label:'状態', render:v=>React.createElement(Badge,{value:v}) },
    ],
    filters: [
      { key:'ci_type', label:'種別', options:['server','network','software','service','storage','other'] },
      { key:'status', label:'状態', options:['active','maintenance','retired'] },
    ],
    formFields: [
      { key:'name', label:'名前', type:'text', required:true },
      { key:'ci_type', label:'種別', type:'select', options:['server','network','software','service','storage','other'], required:true },
      { key:'environment', label:'環境', type:'select', options:[{value:'production',label:'本番'},{value:'staging',label:'検証'},{value:'cloud',label:'クラウド'}] },
      { key:'site', label:'拠点', type:'text' },
      { key:'owner', label:'オーナー', type:'text' },
      { key:'status', label:'状態', type:'select', options:['active','maintenance','retired'] },
    ],
    defaults:{ ci_type:'server', environment:'production', status:'active' }, ticketField:'ci_id',
  },
  knowledge: {
    key:'knowledge', label:'ナレッジ管理', sub:'FAQ・手順書・既知エラー情報', dataKey:'knowledge',
    kpis: s => [
      { title:'公開記事', value:s.items.filter(x=>x.status==='published').length+'件', color:'primary', icon:'📘' },
      { title:'総参照数', value:s.items.reduce((a,x)=>a+(x.view_count||0),0)+'回', color:'success', icon:'👁' },
      { title:'レビュー待ち', value:s.items.filter(x=>['draft','review'].includes(x.status)).length+'件', color:'warning', icon:'📝' },
    ],
    columns: [
      { key:'ticket_no', label:'記事番号', sortable:true, nowrap:true },
      { key:'title', label:'タイトル', sortable:true, maxWidth:300 },
      { key:'category', label:'カテゴリ' },
      { key:'status', label:'ステータス', render:v=>React.createElement(Badge,{value:v}) },
      { key:'view_count', label:'参照数', sortable:true },
      { key:'helpful_count', label:'役立った', sortable:true },
    ],
    filters: [
      { key:'status', label:'ステータス', options:['draft','review','published','archived'] },
      { key:'category', label:'カテゴリ', options:[{value:'FAQ',label:'FAQ'},{value:'障害対応手順',label:'障害対応'},{value:'運用手順',label:'運用手順'},{value:'現場向け手順',label:'現場向け'}] },
    ],
    formFields: [
      { key:'title', label:'タイトル', type:'text', required:true, full:true },
      { key:'category', label:'カテゴリ', type:'select', options:[{value:'FAQ',label:'FAQ'},{value:'障害対応手順',label:'障害対応手順'},{value:'運用手順',label:'運用手順'},{value:'現場向け手順',label:'現場向け手順'}], required:true },
      { key:'status', label:'ステータス', type:'select', options:['draft','review','published','archived'] },
    ],
    defaults:{ status:'draft', category:'FAQ' }, ticketField:'ticket_no',
  },
  asset: {
    key:'asset', label:'IT資産管理', sub:'所有・貸与・保守期限管理', dataKey:'assets',
    kpis: s => [
      { title:'管理資産', value:s.total+'台', color:'primary', icon:'💻' },
      { title:'使用中', value:s.items.filter(x=>x.status==='in_use').length+'台', color:'success', icon:'✓' },
      { title:'保守中', value:s.items.filter(x=>x.status==='maintenance').length+'台', color:'warning', icon:'🔧' },
    ],
    columns: [
      { key:'asset_no', label:'資産番号', sortable:true, nowrap:true },
      { key:'name', label:'名称', sortable:true, maxWidth:280 },
      { key:'asset_type', label:'種別', render:v=>React.createElement(Badge,{value:v}) },
      { key:'site', label:'拠点' },
      { key:'assignee', label:'利用者' },
      { key:'status', label:'状態', render:v=>React.createElement(Badge,{value:v}) },
    ],
    filters: [
      { key:'asset_type', label:'種別', options:['pc','monitor','ups','nas','printer','smartphone','network','server','other'] },
      { key:'status', label:'状態', options:['stock','in_use','maintenance','retired','disposed'] },
    ],
    formFields: [
      { key:'name', label:'名称', type:'text', required:true, full:true },
      { key:'asset_type', label:'種別', type:'select', options:['pc','monitor','ups','nas','printer','smartphone','network','server','other'], required:true },
      { key:'site', label:'拠点', type:'text' },
      { key:'assignee', label:'利用者', type:'text' },
      { key:'status', label:'状態', type:'select', options:['stock','in_use','maintenance','retired','disposed'] },
    ],
    defaults:{ asset_type:'pc', status:'stock' }, ticketField:'asset_no',
  },
  patch: {
    key:'patch', label:'パッチ管理', sub:'適用状況・失敗端末・緊急パッチ', dataKey:'patches',
    kpis: s => {
      const tgt=s.items.reduce((a,x)=>a+(x.target_count||0),0), app=s.items.reduce((a,x)=>a+(x.applied_count||0),0);
      return [
        { title:'パッチ展開', value:s.total+'件', color:'primary', icon:'🛡' },
        { title:'適用率', value:(tgt?Math.round(app/tgt*100):0)+'%', color:'success', icon:'📊' },
        { title:'緊急未完了', value:s.items.filter(x=>x.severity==='critical'&&x.status!=='completed').length+'件', color:'danger', icon:'🚨' },
      ];
    },
    columns: [
      { key:'patch_no', label:'パッチ番号', sortable:true, nowrap:true },
      { key:'title', label:'タイトル', sortable:true, maxWidth:300 },
      { key:'severity', label:'重要度', render:v=>React.createElement(Badge,{value:v}) },
      { key:'status', label:'状態', render:v=>React.createElement(Badge,{value:v}) },
      { key:'applied', label:'適用/対象', render:(_,r)=>`${r.applied_count||0}/${r.target_count||0}` },
      { key:'scheduled_at', label:'期限', render:v=>fmtDate(v,true), nowrap:true },
    ],
    filters: [
      { key:'severity', label:'重要度', options:['critical','high','medium','low'] },
      { key:'status', label:'状態', options:['planned','testing','deploying','completed','failed','cancelled'] },
    ],
    formFields: [
      { key:'title', label:'タイトル', type:'text', required:true, full:true },
      { key:'severity', label:'重要度', type:'select', options:['critical','high','medium','low'], required:true },
      { key:'patch_type', label:'種別', type:'select', options:['windows_update','office','bios','vpn','antivirus','cad','other'] },
      { key:'status', label:'状態', type:'select', options:['planned','testing','deploying','completed','failed','cancelled'] },
      { key:'target_count', label:'対象台数', type:'number' },
    ],
    defaults:{ severity:'medium', status:'planned', patch_type:'windows_update' }, ticketField:'patch_no',
  },
  security: {
    key:'security', label:'セキュリティ管理', sub:'MFA・不審ログイン・DLP・AV', dataKey:'security',
    kpis: s => [
      { title:'重要アラート', value:s.items.filter(x=>['critical','high'].includes(x.severity)&&!['resolved','closed'].includes(x.status)).length+'件', color:'danger', icon:'🚨' },
      { title:'調査中', value:s.items.filter(x=>x.status==='investigating').length+'件', color:'warning', icon:'🔍' },
      { title:'イベント総数', value:s.total+'件', color:'primary', icon:'🔐' },
    ],
    columns: [
      { key:'event_no', label:'イベント番号', sortable:true, nowrap:true },
      { key:'title', label:'内容', sortable:true, maxWidth:280 },
      { key:'event_type', label:'種別', render:v=>React.createElement(Badge,{value:v}) },
      { key:'severity', label:'重要度', render:v=>React.createElement(Badge,{value:v}) },
      { key:'status', label:'状態', render:v=>React.createElement(Badge,{value:v}) },
      { key:'target', label:'対象' },
    ],
    filters: [
      { key:'severity', label:'重要度', options:['critical','high','medium','low'] },
      { key:'status', label:'状態', options:['detected','investigating','contained','resolved','closed'] },
    ],
    formFields: [
      { key:'title', label:'内容', type:'text', required:true, full:true },
      { key:'event_type', label:'種別', type:'select', options:['suspicious_login','usb_block','mfa_failure','dlp','vpn_failure','unauthorized_access','other'], required:true },
      { key:'severity', label:'重要度', type:'select', options:['critical','high','medium','low'] },
      { key:'status', label:'状態', type:'select', options:['detected','investigating','contained','resolved','closed'] },
      { key:'target', label:'対象', type:'text' },
      { key:'action_taken', label:'対応内容', type:'textarea', full:true },
    ],
    defaults:{ severity:'medium', status:'detected', event_type:'other' }, ticketField:'event_no',
  },
  request: {
    key:'request', label:'サービス要求', sub:'申請・承認ワークフロー管理', dataKey:'requests',
    kpis: s => [
      { title:'未処理', value:s.items.filter(x=>['pending','approving','in_progress'].includes(x.status)).length+'件', color:'primary', icon:'📝' },
      { title:'承認待ち', value:s.items.filter(x=>x.status==='approving').length+'件', color:'warning', icon:'✋' },
      { title:'完了', value:s.items.filter(x=>x.status==='completed').length+'件', color:'success', icon:'✓' },
    ],
    columns: [
      { key:'req_no', label:'申請番号', sortable:true, nowrap:true },
      { key:'title', label:'申請内容', sortable:true, maxWidth:300 },
      { key:'category', label:'カテゴリ', render:v=>React.createElement(Badge,{value:v}) },
      { key:'requester', label:'申請者' },
      { key:'status', label:'状態', render:v=>React.createElement(Badge,{value:v}) },
      { key:'created_at', label:'申請日', render:v=>fmtDate(v,true), nowrap:true },
    ],
    filters: [
      { key:'status', label:'状態', options:['pending','approving','in_progress','completed','rejected','cancelled'] },
      { key:'category', label:'カテゴリ', options:['pc','account','teams','permission','software','other'] },
    ],
    formFields: [
      { key:'title', label:'申請内容', type:'text', required:true, full:true },
      { key:'category', label:'カテゴリ', type:'select', options:['pc','account','teams','permission','software','other'], required:true },
      { key:'priority', label:'優先度', type:'select', options:['high','medium','low'] },
      { key:'requester', label:'申請者', type:'text' },
    ],
    defaults:{ category:'pc', status:'pending', priority:'medium' }, ticketField:'req_no',
  },
};

/* ── Generic Module View ── */
function ModuleView({ moduleKey, dense }) {
  const cfg = MODULE_CONFIGS[moduleKey];
  if (!cfg) return React.createElement('div', { style:{padding:40,textAlign:'center',color:'var(--c-text-3)'} }, 'モジュール未設定: ' + moduleKey);

  const [data, setData] = React.useState({ items:[], total:0 });
  const [loading, setLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState('');
  const [filters, setFilters] = React.useState({});
  const [sortKey, setSortKey] = React.useState('');
  const [sortDir, setSortDir] = React.useState('desc');
  const [page, setPage] = React.useState(1);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState(null);
  const [formData, setFormData] = React.useState({});
  const [formErrors, setFormErrors] = React.useState({});
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [detailItem, setDetailItem] = React.useState(null);
  const toast = useToast();
  const pageSize = 20;

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, keyword: keyword||undefined, skip:(page-1)*pageSize, limit:pageSize, sortKey, sortDir };
      const res = await MockAPI.list(cfg.dataKey, params);
      setData(res);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [cfg.dataKey, keyword, filters, page, sortKey, sortDir]);

  React.useEffect(() => { loadData(); }, [loadData]);
  React.useEffect(() => { setPage(1); setKeyword(''); setFilters({}); setSortKey(''); }, [moduleKey]);

  const handleSort = (key) => {
    if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const openCreate = () => { setEditItem(null); setFormData(cfg.defaults||{}); setFormErrors({}); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setFormData({...item}); setFormErrors({}); setModalOpen(true); };

  const handleSave = async () => {
    const errs = {};
    (cfg.formFields||[]).forEach(f => { if(f.required && !formData[f.key]) errs[f.key]='必須項目です'; });
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      if (editItem) {
        await MockAPI.update(cfg.dataKey, editItem.id, formData);
        toast(cfg.label + 'を更新しました', 'success');
      } else {
        await MockAPI.create(cfg.dataKey, formData);
        toast(cfg.label + 'を登録しました', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch(e) { toast('エラー: '+e.message, 'error'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await MockAPI.remove(cfg.dataKey, deleteTarget.id);
    toast('削除しました', 'success');
    setDeleteTarget(null);
    loadData();
  };

  const kpis = cfg.kpis ? cfg.kpis(data) : [];
  const gap = dense ? 16 : 20;

  return React.createElement(PageLayout, {
    title: cfg.label,
    subtitle: cfg.sub,
    breadcrumb: ['ホーム', cfg.label],
    dense,
    actions: React.createElement(React.Fragment, null,
      React.createElement(Btn, { variant:'primary', size:'sm', onClick:openCreate }, '＋ 新規作成'),
      React.createElement(Btn, { variant:'outline', size:'sm', onClick:()=>toast('CSV出力（デモ）','info') }, '⬇ CSV'),
    )
  },
    /* KPIs */
    kpis.length > 0 && React.createElement('div', { style:{display:'grid',gridTemplateColumns:`repeat(${Math.min(kpis.length,4)},1fr)`,gap,marginBottom:gap} },
      ...kpis.map((k,i) => React.createElement(KPICard, { key:i, ...k }))
    ),

    /* Filter Bar */
    React.createElement('div', { style:{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'} },
      React.createElement(SearchInput, { value:keyword, onChange:v=>{setKeyword(v);setPage(1);}, placeholder:cfg.label+'を検索...' }),
      ...(cfg.filters||[]).map(f =>
        React.createElement(FilterSelect, { key:f.key, label:f.label, value:filters[f.key]||'all', options:f.options,
          onChange:v => { setFilters(p=>({...p,[f.key]:v==='all'?undefined:v})); setPage(1); }
        })
      ),
      (keyword || Object.values(filters).some(Boolean)) && React.createElement(Btn, { size:'sm', variant:'ghost', onClick:()=>{setKeyword('');setFilters({});setPage(1);} }, '✕ クリア')
    ),

    /* Data Table */
    React.createElement(DataTable, {
      columns: [...(cfg.columns||[]), {
        key:'_actions', label:'操作', render:(_,row) =>
          React.createElement('div', { style:{display:'flex',gap:4} },
            React.createElement(Btn, { size:'sm', variant:'ghost', onClick:e=>{e.stopPropagation();openEdit(row);} }, '✏'),
            React.createElement(Btn, { size:'sm', variant:'ghost', onClick:e=>{e.stopPropagation();setDeleteTarget(row);} }, '🗑'),
          )
      }],
      data: data.items, loading, sortKey, sortDir, onSort:handleSort,
      onRowClick: row => setDetailItem(row),
    }),

    /* Pagination */
    React.createElement(Pagination, { page, total:data.total, size:pageSize, onChange:setPage }),

    /* Create/Edit Modal */
    React.createElement(Modal, {
      open:modalOpen, onClose:()=>setModalOpen(false),
      title: editItem ? cfg.label+' 編集' : cfg.label+' 新規作成',
      footer: [
        React.createElement(Btn, { key:'c', variant:'outline', onClick:()=>setModalOpen(false) }, 'キャンセル'),
        React.createElement(Btn, { key:'s', variant:'primary', onClick:handleSave }, editItem?'更新':'作成'),
      ]
    },
      React.createElement('div', { style:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16} },
        ...(cfg.formFields||[]).map(f =>
          React.createElement(FormField, { key:f.key, label:f.label, required:f.required, error:formErrors[f.key], fullWidth:f.full },
            f.type==='textarea' ?
              React.createElement(TextArea, { value:formData[f.key]||'', onChange:e=>setFormData(p=>({...p,[f.key]:e.target.value})) }) :
            f.type==='select' ?
              React.createElement(SelectInput, { value:formData[f.key]||'', onChange:e=>setFormData(p=>({...p,[f.key]:e.target.value})), options:f.options }) :
            f.type==='date' ?
              React.createElement(TextInput, { type:'datetime-local', value:formData[f.key]||'', onChange:e=>setFormData(p=>({...p,[f.key]:e.target.value})) }) :
            f.type==='number' ?
              React.createElement(TextInput, { type:'number', value:formData[f.key]||'', onChange:e=>setFormData(p=>({...p,[f.key]:e.target.value})) }) :
              React.createElement(TextInput, { type:'text', value:formData[f.key]||'', onChange:e=>setFormData(p=>({...p,[f.key]:e.target.value})) })
          )
        )
      )
    ),

    /* Delete Confirm */
    React.createElement(ConfirmDialog, {
      open:!!deleteTarget, onClose:()=>setDeleteTarget(null), onConfirm:handleDelete,
      title:'削除確認', message:`「${deleteTarget?.title||deleteTarget?.name||''}」を削除しますか？この操作は取り消せません。`, confirmLabel:'削除', danger:true
    }),

    /* Detail Side Modal */
    React.createElement(Modal, {
      open:!!detailItem, onClose:()=>setDetailItem(null),
      title: (detailItem && (detailItem[cfg.ticketField]||detailItem.name||'')) + ' 詳細', width:560,
      footer: [
        React.createElement(Btn, { key:'e', variant:'outline', onClick:()=>{openEdit(detailItem);setDetailItem(null);} }, '✏ 編集'),
        React.createElement(Btn, { key:'c', variant:'outline', onClick:()=>setDetailItem(null) }, '閉じる'),
      ]
    },
      detailItem && React.createElement('dl', { style:{display:'grid',gridTemplateColumns:'120px 1fr',gap:'10px 16px',fontSize:'var(--fs-sm)'} },
        ...Object.entries(detailItem).filter(([k])=>k!=='id').map(([k,v]) =>
          [
            React.createElement('dt', { key:'dt'+k, style:{color:'var(--c-text-3)',fontWeight:600} }, k),
            React.createElement('dd', { key:'dd'+k, style:{color:'var(--c-text)'} },
              ['status','priority','severity','ci_type','asset_type','event_type','change_type','category','risk_level','patch_type'].includes(k) && v ?
                React.createElement(Badge, { value:v }) : (typeof v==='string' && v.match(/^\d{4}-/) ? fmtDate(v) : String(v??'—'))
            )
          ]
        ).flat()
      )
    ),
  );
}

Object.assign(window, { ModuleView, MODULE_CONFIGS });
