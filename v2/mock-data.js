/* ITSM Mock Data Layer — Data + API abstraction */
(function(){
const now = new Date();
const d = (days,h=9) => new Date(now.getFullYear(),now.getMonth(),now.getDate()-days,h,0).toISOString();
const f = (days,h=17) => new Date(now.getFullYear(),now.getMonth(),now.getDate()+days,h,0).toISOString();

const USERS = [
  {id:1,display_name:'田中 太郎',email:'tanaka@example.com',role:'admin',department:'IT管理課'},
  {id:2,display_name:'佐藤 花子',email:'sato@example.com',role:'operator',department:'ヘルプデスク'},
  {id:3,display_name:'鈴木 一郎',email:'suzuki@example.com',role:'operator',department:'インフラ課'},
  {id:4,display_name:'山田 美咲',email:'yamada@example.com',role:'manager',department:'IT管理課'},
  {id:5,display_name:'高橋 健太',email:'takahashi@example.com',role:'viewer',department:'総務部'},
];

const INCIDENTS = [
  {id:1,ticket_no:'INC-2026-0001',title:'Microsoft365 メール送信不可',description:'Outlook経由のメール送信が全社で不可。Exchange Onlineの障害の可能性。',priority:'critical',status:'in_progress',category:'メール',assignee_id:2,site:'本社',system_name:'Microsoft365',due_at:f(0,12),created_at:d(0,8),updated_at:d(0,10),resolved_at:null},
  {id:2,ticket_no:'INC-2026-0002',title:'VPN接続タイムアウト（現場A）',description:'現場AからのVPN接続が頻繁にタイムアウトする。',priority:'high',status:'open',category:'ネットワーク',assignee_id:3,site:'現場A',system_name:'VPN',due_at:f(1),created_at:d(0,9),updated_at:d(0,9),resolved_at:null},
  {id:3,ticket_no:'INC-2026-0003',title:'プリンタ印刷キュー滞留',description:'3Fプリンタの印刷キューが詰まっている。',priority:'medium',status:'open',category:'プリンタ',assignee_id:2,site:'本社',system_name:'プリンタ',due_at:f(2),created_at:d(1,14),updated_at:d(1,14),resolved_at:null},
  {id:4,ticket_no:'INC-2026-0004',title:'Teams通話品質劣化',description:'Teams会議中に音声が途切れる現象が複数報告。',priority:'high',status:'in_progress',category:'コミュニケーション',assignee_id:3,site:'本社',system_name:'Microsoft365',due_at:f(0,18),created_at:d(1,10),updated_at:d(0,11),resolved_at:null},
  {id:5,ticket_no:'INC-2026-0005',title:'CADソフト ライセンスエラー',description:'AutoCAD起動時にライセンス認証に失敗する。',priority:'medium',status:'waiting',category:'ソフトウェア',assignee_id:3,site:'現場B',system_name:'CAD',due_at:f(3),created_at:d(2,9),updated_at:d(1,16),resolved_at:null},
  {id:6,ticket_no:'INC-2026-0006',title:'ファイルサーバ応答遅延',description:'共有フォルダへのアクセスに10秒以上かかる。',priority:'high',status:'resolved',category:'サーバ',assignee_id:3,site:'本社',system_name:'FileServer',due_at:d(0,18),created_at:d(3,8),updated_at:d(1,15),resolved_at:d(1,15)},
  {id:7,ticket_no:'INC-2026-0007',title:'新入社員PC セットアップ依頼',description:'4月入社の5名分のPC初期設定。',priority:'low',status:'closed',category:'PC',assignee_id:2,site:'本社',system_name:'PC',due_at:d(0),created_at:d(5,9),updated_at:d(2,17),resolved_at:d(2,17)},
  {id:8,ticket_no:'INC-2026-0008',title:'OneDrive 同期エラー',description:'特定ユーザーのOneDriveが同期停止中。',priority:'medium',status:'in_progress',category:'クラウド',assignee_id:2,site:'本社',system_name:'Microsoft365',due_at:f(1,12),created_at:d(1,11),updated_at:d(0,14),resolved_at:null},
  {id:9,ticket_no:'INC-2026-0009',title:'Wi-Fi 接続不安定（2F会議室）',description:'2F会議室エリアのWi-Fiが断続的に切断。',priority:'medium',status:'open',category:'ネットワーク',assignee_id:3,site:'本社',system_name:'ネットワーク',due_at:f(2),created_at:d(0,13),updated_at:d(0,13),resolved_at:null},
  {id:10,ticket_no:'INC-2026-0010',title:'Entra ID 条件付きアクセス誤ブロック',description:'正規ユーザーがMFA後もブロックされる。',priority:'critical',status:'resolved',category:'認証',assignee_id:1,site:'全拠点',system_name:'EntraID',due_at:d(1,12),created_at:d(4,7),updated_at:d(3,11),resolved_at:d(3,11)},
  {id:11,ticket_no:'INC-2026-0011',title:'SharePoint サイトアクセス権エラー',description:'部門サイトに正規メンバーがアクセスできない。',priority:'high',status:'open',category:'クラウド',assignee_id:2,site:'本社',system_name:'Microsoft365',due_at:f(1),created_at:d(0,11),updated_at:d(0,11),resolved_at:null},
  {id:12,ticket_no:'INC-2026-0012',title:'基幹システム ログイン不可',description:'会計システムにログインできない（パスワード期限切れ多発）。',priority:'critical',status:'in_progress',category:'業務システム',assignee_id:1,site:'本社',system_name:'会計システム',due_at:f(0,15),created_at:d(0,7),updated_at:d(0,9),resolved_at:null},
  {id:13,ticket_no:'INC-2026-0013',title:'モバイル端末 紛失報告',description:'営業担当がスマートフォンを社外で紛失。リモートワイプ要。',priority:'critical',status:'resolved',category:'セキュリティ',assignee_id:1,site:'現場A',system_name:'MDM',due_at:d(0,12),created_at:d(2,16),updated_at:d(2,18),resolved_at:d(2,18)},
  {id:14,ticket_no:'INC-2026-0014',title:'プロジェクタ HDMI接続不良',description:'大会議室のプロジェクタが映らない。',priority:'low',status:'closed',category:'AV機器',assignee_id:2,site:'本社',system_name:'AV機器',due_at:d(1),created_at:d(4,13),updated_at:d(3,10),resolved_at:d(3,10)},
  {id:15,ticket_no:'INC-2026-0015',title:'メール誤送信（添付ファイル）',description:'機密ファイルを誤って外部に送信。DLP連携で要調査。',priority:'high',status:'in_progress',category:'セキュリティ',assignee_id:1,site:'本社',system_name:'Microsoft365',due_at:f(0,17),created_at:d(0,10),updated_at:d(0,12),resolved_at:null},
  {id:16,ticket_no:'INC-2026-0016',title:'現場B 回線断（光ケーブル工事）',description:'近隣工事の影響で現場Bの光回線が不通。',priority:'high',status:'waiting',category:'ネットワーク',assignee_id:3,site:'現場B',system_name:'WAN',due_at:f(1,12),created_at:d(1,8),updated_at:d(0,15),resolved_at:null},
  {id:17,ticket_no:'INC-2026-0017',title:'Windows Update後 起動不可',description:'更新適用後に複数PCがブルースクリーンで起動しない。',priority:'critical',status:'in_progress',category:'PC',assignee_id:3,site:'本社',system_name:'Windows',due_at:f(0,14),created_at:d(0,9),updated_at:d(0,13),resolved_at:null},
  {id:18,ticket_no:'INC-2026-0018',title:'共有プリンタ トナー切れ',description:'2F複合機のトナーが切れて印刷不可。',priority:'low',status:'resolved',category:'プリンタ',assignee_id:2,site:'本社',system_name:'プリンタ',due_at:d(0,15),created_at:d(2,11),updated_at:d(2,13),resolved_at:d(2,13)},
  {id:19,ticket_no:'INC-2026-0019',title:'VPN同時接続数 上限超過',description:'リモート勤務集中でVPN接続が上限に達し新規接続不可。',priority:'medium',status:'open',category:'ネットワーク',assignee_id:3,site:'全拠点',system_name:'VPN',due_at:f(1),created_at:d(0,8),updated_at:d(0,8),resolved_at:null},
  {id:20,ticket_no:'INC-2026-0020',title:'バックアップジョブ 失敗',description:'夜間のファイルサーバ自動バックアップが3夜連続失敗。',priority:'high',status:'in_progress',category:'サーバ',assignee_id:3,site:'本社',system_name:'BackupServer',due_at:f(0,20),created_at:d(1,7),updated_at:d(0,9),resolved_at:null},
];

const PROBLEMS = [
  {id:1,ticket_no:'PRB-2026-0001',title:'VPN接続タイムアウト反復',status:'investigating',priority:'high',root_cause:'',workaround:'再接続で一時復旧',related_incident_ids:[2],created_at:d(1),updated_at:d(0)},
  {id:2,ticket_no:'PRB-2026-0002',title:'Exchange Onlineメール遅延',status:'known_error',priority:'critical',root_cause:'MS側リージョン障害',workaround:'OWA経由で送信',related_incident_ids:[1],created_at:d(2),updated_at:d(0)},
  {id:3,ticket_no:'PRB-2026-0003',title:'プリンタドライバ互換性問題',status:'open',priority:'medium',root_cause:'',workaround:'旧ドライバ使用',related_incident_ids:[3],created_at:d(3),updated_at:d(1)},
  {id:4,ticket_no:'PRB-2026-0004',title:'Teams音声品質劣化（帯域）',status:'resolved',priority:'high',root_cause:'QoS未設定',workaround:'',related_incident_ids:[4],created_at:d(5),updated_at:d(1)},
];

const CHANGES = [
  {id:1,ticket_no:'CHG-2026-0001',title:'VPNクライアントバージョンアップ',change_type:'normal',risk_level:'medium',status:'review',scheduled_at:f(7),created_at:d(3),updated_at:d(1)},
  {id:2,ticket_no:'CHG-2026-0002',title:'ファイルサーバ ストレージ増設',change_type:'normal',risk_level:'low',status:'approved',scheduled_at:f(14),created_at:d(5),updated_at:d(2)},
  {id:3,ticket_no:'CHG-2026-0003',title:'Entra ID 条件付きアクセスポリシー変更',change_type:'emergency',risk_level:'high',status:'implementing',scheduled_at:f(0),created_at:d(1),updated_at:d(0)},
  {id:4,ticket_no:'CHG-2026-0004',title:'Wi-Fi AP追加設置（2F）',change_type:'standard',risk_level:'low',status:'draft',scheduled_at:f(21),created_at:d(0),updated_at:d(0)},
  {id:5,ticket_no:'CHG-2026-0005',title:'Microsoft365 E5ライセンス移行',change_type:'normal',risk_level:'high',status:'closed',scheduled_at:d(2),created_at:d(14),updated_at:d(2)},
];

const CMDB_ITEMS = [
  {id:1,ci_id:'CI-2026-0001',name:'AD-DC01',ci_type:'server',environment:'production',site:'本社',status:'active',owner:'インフラ課',created_at:d(90)},
  {id:2,ci_id:'CI-2026-0002',name:'FILE-SV01',ci_type:'server',environment:'production',site:'本社',status:'active',owner:'インフラ課',created_at:d(90)},
  {id:3,ci_id:'CI-2026-0003',name:'VPN-GW01',ci_type:'network',environment:'production',site:'本社',status:'active',owner:'インフラ課',created_at:d(60)},
  {id:4,ci_id:'CI-2026-0004',name:'SW-CORE-01',ci_type:'network',environment:'production',site:'本社',status:'active',owner:'インフラ課',created_at:d(90)},
  {id:5,ci_id:'CI-2026-0005',name:'Microsoft365',ci_type:'service',environment:'cloud',site:'全拠点',status:'active',owner:'IT管理課',created_at:d(180)},
  {id:6,ci_id:'CI-2026-0006',name:'AP-2F-01',ci_type:'network',environment:'production',site:'本社',status:'maintenance',owner:'インフラ課',created_at:d(30)},
  {id:7,ci_id:'CI-2026-0007',name:'PRINTER-3F',ci_type:'other',environment:'production',site:'本社',status:'active',owner:'ヘルプデスク',created_at:d(120)},
  {id:8,ci_id:'CI-2026-0008',name:'CAD-LIC-SV',ci_type:'server',environment:'production',site:'本社',status:'active',owner:'インフラ課',created_at:d(60)},
];

const KNOWLEDGE = [
  {id:1,ticket_no:'KA-2026-0001',title:'VPN接続トラブルシューティング手順',category:'FAQ',status:'published',view_count:142,helpful_count:38,created_at:d(30)},
  {id:2,ticket_no:'KA-2026-0002',title:'プリンタ障害 初動対応マニュアル',category:'障害対応手順',status:'published',view_count:87,helpful_count:21,created_at:d(45)},
  {id:3,ticket_no:'KA-2026-0003',title:'Teams チーム作成申請手順',category:'FAQ',status:'published',view_count:201,helpful_count:56,created_at:d(60)},
  {id:4,ticket_no:'KA-2026-0004',title:'新入社員PC セットアップ手順書',category:'運用手順',status:'published',view_count:95,helpful_count:32,created_at:d(20)},
  {id:5,ticket_no:'KA-2026-0005',title:'現場VPN接続ガイド',category:'現場向け手順',status:'review',view_count:12,helpful_count:3,created_at:d(5)},
  {id:6,ticket_no:'KA-2026-0006',title:'OneDrive同期エラー復旧手順',category:'FAQ',status:'draft',view_count:0,helpful_count:0,created_at:d(1)},
];

const ASSETS = [
  {id:1,asset_no:'AST-2026-0001',name:'ThinkPad T14s (田中)',asset_type:'pc',site:'本社',status:'in_use',assignee:'田中 太郎',purchase_date:d(365),warranty_end:f(365),created_at:d(365)},
  {id:2,asset_no:'AST-2026-0002',name:'ThinkPad T14s (佐藤)',asset_type:'pc',site:'本社',status:'in_use',assignee:'佐藤 花子',purchase_date:d(200),warranty_end:f(530),created_at:d(200)},
  {id:3,asset_no:'AST-2026-0003',name:'Dell U2722D モニタ',asset_type:'monitor',site:'本社',status:'in_use',assignee:'田中 太郎',purchase_date:d(300),warranty_end:f(65),created_at:d(300)},
  {id:4,asset_no:'AST-2026-0004',name:'iPhone 15 (山田)',asset_type:'smartphone',site:'本社',status:'in_use',assignee:'山田 美咲',purchase_date:d(180),warranty_end:f(550),created_at:d(180)},
  {id:5,asset_no:'AST-2026-0005',name:'HP LaserJet Pro (3F)',asset_type:'printer',site:'本社',status:'maintenance',assignee:'',purchase_date:d(500),warranty_end:d(10),created_at:d(500)},
  {id:6,asset_no:'AST-2026-0006',name:'Synology NAS DS920+',asset_type:'nas',site:'本社',status:'in_use',assignee:'インフラ課',purchase_date:d(400),warranty_end:f(330),created_at:d(400)},
];

const PATCHES = [
  {id:1,patch_no:'PTH-2026-0001',title:'Windows 11 24H2 累積更新 (KB5040XXX)',severity:'critical',patch_type:'windows_update',status:'deploying',target_count:186,applied_count:169,scheduled_at:f(3),created_at:d(5)},
  {id:2,patch_no:'PTH-2026-0002',title:'Office 365 セキュリティパッチ 2026-05',severity:'high',patch_type:'office',status:'completed',target_count:186,applied_count:186,scheduled_at:d(3),created_at:d(10)},
  {id:3,patch_no:'PTH-2026-0003',title:'FortiClient VPN 7.4.1',severity:'medium',patch_type:'vpn',status:'testing',target_count:45,applied_count:5,scheduled_at:f(7),created_at:d(3)},
  {id:4,patch_no:'PTH-2026-0004',title:'AutoCAD 2026 Hotfix 3',severity:'low',patch_type:'cad',status:'planned',target_count:28,applied_count:0,scheduled_at:f(14),created_at:d(1)},
  {id:5,patch_no:'PTH-2026-0005',title:'Dell BIOS Update A15',severity:'medium',patch_type:'bios',status:'completed',target_count:92,applied_count:88,scheduled_at:d(7),created_at:d(14)},
];

const SECURITY_EVENTS = [
  {id:1,event_no:'SEC-2026-0001',title:'不審ログイン検知（海外IP）',event_type:'suspicious_login',severity:'critical',status:'investigating',target:'user: yamada@example.com',action_taken:'アカウント一時停止',created_at:d(0,6)},
  {id:2,event_no:'SEC-2026-0002',title:'USB デバイスブロック',event_type:'usb_block',severity:'medium',status:'resolved',target:'PC: DESKTOP-A1234',action_taken:'ポリシー通りブロック',created_at:d(1,14)},
  {id:3,event_no:'SEC-2026-0003',title:'MFA未設定アカウント検出',event_type:'mfa_failure',severity:'high',status:'detected',target:'3アカウント',action_taken:'',created_at:d(2,10)},
  {id:4,event_no:'SEC-2026-0004',title:'DLP: 機密ファイル外部共有',event_type:'dlp',severity:'critical',status:'contained',target:'SharePoint: 設計図共有リンク',action_taken:'リンク無効化済',created_at:d(0,11)},
  {id:5,event_no:'SEC-2026-0005',title:'VPN認証連続失敗（10回超）',event_type:'vpn_failure',severity:'medium',status:'closed',target:'user: guest-site-b',action_taken:'パスワードリセット',created_at:d(3,8)},
];

const SERVICE_REQUESTS = [
  {id:1,req_no:'REQ-2026-0001',title:'新入社員用 PC 手配（5台）',category:'pc',requester:'高橋 健太',priority:'medium',status:'in_progress',approver:'山田 美咲',created_at:d(3)},
  {id:2,req_no:'REQ-2026-0002',title:'Teams チーム作成依頼「DX推進室」',category:'teams',requester:'田中 太郎',priority:'low',status:'completed',approver:'山田 美咲',created_at:d(5)},
  {id:3,req_no:'REQ-2026-0003',title:'VPN権限追加（現場B 5名）',category:'permission',requester:'鈴木 一郎',priority:'high',status:'approving',approver:'山田 美咲',created_at:d(1)},
  {id:4,req_no:'REQ-2026-0004',title:'AutoCAD ライセンス追加購入',category:'software',requester:'高橋 健太',priority:'medium',status:'pending',approver:'',created_at:d(0)},
  {id:5,req_no:'REQ-2026-0005',title:'退職者アカウント削除（3名）',category:'account',requester:'山田 美咲',priority:'high',status:'in_progress',approver:'田中 太郎',created_at:d(2)},
];

/* ── API Abstraction Layer ── */
let _useApi = false;
let _baseUrl = '/api';
let _token = null;

const store = {
  incidents: [...INCIDENTS],
  problems: [...PROBLEMS],
  changes: [...CHANGES],
  cmdb: [...CMDB_ITEMS],
  knowledge: [...KNOWLEDGE],
  assets: [...ASSETS],
  patches: [...PATCHES],
  security: [...SECURITY_EVENTS],
  requests: [...SERVICE_REQUESTS],
  users: [...USERS],
};

function nextId(arr) { return Math.max(0,...arr.map(x=>x.id))+1; }

const MockAPI = {
  setApiMode(use, baseUrl, token) { _useApi=use; if(baseUrl) _baseUrl=baseUrl; _token=token; },
  isApiMode() { return _useApi; },
  getUsers() { return store.users; },

  async list(module, params={}) {
    const data = store[module] || [];
    let items = [...data];
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      items = items.filter(x => JSON.stringify(x).toLowerCase().includes(kw));
    }
    Object.entries(params).forEach(([k,v]) => {
      if (k==='keyword'||k==='skip'||k==='limit'||k==='sortKey'||k==='sortDir'||!v||v==='all') return;
      items = items.filter(x => String(x[k])===String(v));
    });
    if (params.sortKey) {
      const dir = params.sortDir === 'desc' ? -1 : 1;
      items.sort((a,b) => {
        const va=a[params.sortKey]||'', vb=b[params.sortKey]||'';
        return va < vb ? -dir : va > vb ? dir : 0;
      });
    }
    const total = items.length;
    const skip = params.skip||0, limit = params.limit||50;
    items = items.slice(skip, skip+limit);
    return { items, total, page: Math.floor(skip/limit)+1, size: limit };
  },

  async get(module, id) {
    return (store[module]||[]).find(x => x.id===id) || null;
  },

  async create(module, data) {
    const arr = store[module]; if(!arr) return null;
    const item = { id: nextId(arr), ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    arr.unshift(item);
    return item;
  },

  async update(module, id, data) {
    const arr = store[module]||[];
    const idx = arr.findIndex(x=>x.id===id); if(idx<0) return null;
    Object.assign(arr[idx], data, { updated_at: new Date().toISOString() });
    return arr[idx];
  },

  async remove(module, id) {
    const arr = store[module]||[];
    const idx = arr.findIndex(x=>x.id===id); if(idx<0) return false;
    arr.splice(idx,1); return true;
  },

  getDashboardSummary() {
    const inc = store.incidents;
    const open = inc.filter(x=>x.status==='open'||x.status==='in_progress'||x.status==='waiting').length;
    const overdue = inc.filter(x=> !['resolved','closed'].includes(x.status) && new Date(x.due_at)<new Date()).length;
    const resolved = inc.filter(x=>x.resolved_at);
    const avgH = resolved.length ? resolved.reduce((s,x)=>(new Date(x.resolved_at)-new Date(x.created_at))/3600000+s,0)/resolved.length : 0;
    const slaOk = inc.filter(x=>x.resolved_at && new Date(x.resolved_at)<=new Date(x.due_at)).length;
    const slaRate = resolved.length ? Math.round(slaOk/resolved.length*100) : 100;
    return { total:inc.length, open, overdue, resolved:resolved.length, avgHours:Math.round(avgH*10)/10, slaRate, problems:store.problems.length, changes:store.changes.length, assets:store.assets.length };
  }
};

window.MockAPI = MockAPI;
window.ITSM_USERS = USERS;
})();
