/* ITSM v2 — Shared UI Components */
const { useState, useRef, useEffect, useCallback, useMemo, createContext, useContext } = React;

/* ── Toast Context ── */
const ToastCtx = createContext(null);
function ToastProvider({ children }) {
  const [toasts, set] = useState([]);
  const add = useCallback((msg, type='info') => {
    const id = Date.now() + Math.random();
    set(p => [...p, { id, msg, type }]);
    setTimeout(() => set(p => p.filter(t => t.id !== id)), 3200);
  }, []);
  return React.createElement(ToastCtx.Provider, { value: add },
    children,
    React.createElement('div', {
      style: { position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8 },
      'aria-live': 'polite'
    }, toasts.map(t =>
      React.createElement('div', {
        key: t.id,
        style: {
          padding:'12px 20px', borderRadius:'var(--r-md)', background: t.type==='error'?'var(--c-danger-600)':t.type==='success'?'var(--c-success-600)':'var(--c-text)',
          color:'#fff', fontSize:'var(--fs-sm)', boxShadow:'var(--shadow-lg)', animation:'toastIn .3s var(--ease) both', minWidth:240, maxWidth:400
        }
      }, t.msg)
    ))
  );
}
function useToast() { return useContext(ToastCtx); }

/* ── Badge / Chip ── */
const BADGE_COLORS = {
  critical: { bg:'var(--c-danger-50)', color:'var(--c-danger-600)', border:'var(--c-danger-100)' },
  high: { bg:'var(--c-warn-50)', color:'var(--c-warn-600)', border:'var(--c-warn-100)' },
  medium: { bg:'var(--c-primary-50)', color:'var(--c-primary-600)', border:'var(--c-primary-100)' },
  low: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  open: { bg:'var(--c-primary-50)', color:'var(--c-primary-600)', border:'var(--c-primary-100)' },
  in_progress: { bg:'var(--c-warn-50)', color:'var(--c-warn-700)', border:'var(--c-warn-100)' },
  waiting: { bg:'var(--c-info-50)', color:'var(--c-info-600)', border:'var(--c-info-100)' },
  resolved: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  closed: { bg:'var(--c-bg)', color:'var(--c-text-3)', border:'var(--c-border)' },
  active: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  maintenance: { bg:'var(--c-warn-50)', color:'var(--c-warn-600)', border:'var(--c-warn-100)' },
  draft: { bg:'var(--c-bg)', color:'var(--c-text-3)', border:'var(--c-border)' },
  review: { bg:'var(--c-info-50)', color:'var(--c-info-600)', border:'var(--c-info-100)' },
  approved: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  implementing: { bg:'var(--c-warn-50)', color:'var(--c-warn-700)', border:'var(--c-warn-100)' },
  rejected: { bg:'var(--c-danger-50)', color:'var(--c-danger-600)', border:'var(--c-danger-100)' },
  published: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  archived: { bg:'var(--c-bg)', color:'var(--c-text-4)', border:'var(--c-border)' },
  investigating: { bg:'var(--c-warn-50)', color:'var(--c-warn-700)', border:'var(--c-warn-100)' },
  known_error: { bg:'var(--c-danger-50)', color:'var(--c-danger-600)', border:'var(--c-danger-100)' },
  detected: { bg:'var(--c-danger-50)', color:'var(--c-danger-600)', border:'var(--c-danger-100)' },
  contained: { bg:'var(--c-warn-50)', color:'var(--c-warn-600)', border:'var(--c-warn-100)' },
  pending: { bg:'var(--c-primary-50)', color:'var(--c-primary-600)', border:'var(--c-primary-100)' },
  approving: { bg:'var(--c-info-50)', color:'var(--c-info-600)', border:'var(--c-info-100)' },
  in_use: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  stock: { bg:'var(--c-bg)', color:'var(--c-text-3)', border:'var(--c-border)' },
  retired: { bg:'var(--c-warn-50)', color:'var(--c-warn-600)', border:'var(--c-warn-100)' },
  disposed: { bg:'var(--c-bg)', color:'var(--c-text-4)', border:'var(--c-border)' },
  planned: { bg:'var(--c-primary-50)', color:'var(--c-primary-600)', border:'var(--c-primary-100)' },
  testing: { bg:'var(--c-info-50)', color:'var(--c-info-600)', border:'var(--c-info-100)' },
  deploying: { bg:'var(--c-warn-50)', color:'var(--c-warn-700)', border:'var(--c-warn-100)' },
  completed: { bg:'var(--c-success-50)', color:'var(--c-success-600)', border:'var(--c-success-100)' },
  failed: { bg:'var(--c-danger-50)', color:'var(--c-danger-600)', border:'var(--c-danger-100)' },
  cancelled: { bg:'var(--c-bg)', color:'var(--c-text-4)', border:'var(--c-border)' },
};

const LABEL_MAP = {
  critical:'緊急',high:'高',medium:'中',low:'低',
  open:'新規',in_progress:'対応中',waiting:'保留',resolved:'解決済',closed:'クローズ',
  active:'稼働中',maintenance:'保守中',draft:'下書き',review:'レビュー中',approved:'承認済',
  implementing:'実施中',rejected:'却下',published:'公開済',archived:'アーカイブ',
  investigating:'調査中',known_error:'既知エラー',detected:'検知',contained:'封じ込め',
  pending:'未処理',approving:'承認待ち',in_use:'使用中',stock:'在庫',retired:'退役',
  disposed:'廃棄',planned:'計画中',testing:'テスト中',deploying:'展開中',
  completed:'完了',failed:'失敗',cancelled:'取消',
  normal:'通常',standard:'標準',emergency:'緊急',
  server:'サーバ',network:'ネットワーク',software:'ソフトウェア',service:'サービス',storage:'ストレージ',other:'その他',
  pc:'PC',monitor:'モニタ',ups:'UPS',nas:'NAS',printer:'プリンタ',smartphone:'スマホ',
  windows_update:'Windows Update',office:'Office',bios:'BIOS',vpn:'VPN',antivirus:'AV',cad:'CAD',
  suspicious_login:'不審ログイン',usb_block:'USBブロック',mfa_failure:'MFA失敗',dlp:'DLP',vpn_failure:'VPN失敗',unauthorized_access:'不正アクセス',
  account:'アカウント',teams:'Teams',permission:'権限',
};

function Badge({ value, size='sm' }) {
  const c = BADGE_COLORS[value] || BADGE_COLORS.open;
  const label = LABEL_MAP[value] || value;
  const s = size==='sm' ? { fontSize:12,padding:'3px 10px' } : { fontSize:13,padding:'4px 12px' };
  return React.createElement('span', {
    style: { display:'inline-flex',alignItems:'center',borderRadius:'var(--r-full)',...s,fontWeight:600,background:c.bg,color:c.color,border:`1px solid ${c.border}`,whiteSpace:'nowrap',lineHeight:1.4 }
  }, label);
}

/* ── SLA Pill ── */
function SLAPill({ dueAt, resolvedAt }) {
  if (!dueAt) return React.createElement('span', { style:{color:'var(--c-text-4)',fontSize:12} }, '—');
  const due = new Date(dueAt);
  if (resolvedAt) {
    const ok = new Date(resolvedAt) <= due;
    return React.createElement(Badge, { value: ok ? 'resolved' : 'critical' });
  }
  const remaining = due - new Date();
  if (remaining < 0) return React.createElement('span', { style:{display:'inline-flex',alignItems:'center',gap:4,borderRadius:'var(--r-full)',padding:'3px 10px',fontSize:12,fontWeight:600,background:'var(--c-danger-50)',color:'var(--c-danger-600)',border:'1px solid var(--c-danger-100)'} }, '🔴 超過');
  if (remaining < 2*3600000) return React.createElement('span', { style:{display:'inline-flex',alignItems:'center',gap:4,borderRadius:'var(--r-full)',padding:'3px 10px',fontSize:12,fontWeight:600,background:'var(--c-warn-50)',color:'var(--c-warn-600)',border:'1px solid var(--c-warn-100)'} }, '🟡 注意');
  return React.createElement('span', { style:{display:'inline-flex',alignItems:'center',gap:4,borderRadius:'var(--r-full)',padding:'3px 10px',fontSize:12,fontWeight:600,background:'var(--c-success-50)',color:'var(--c-success-600)',border:'1px solid var(--c-success-100)'} }, '🟢 安全');
}

/* ── KPI Card ── */
function KPICard({ title, value, subtitle, color='primary', icon }) {
  const colors = { primary:'var(--c-primary-600)', success:'var(--c-success-600)', warning:'var(--c-warn-600)', danger:'var(--c-danger-600)', info:'var(--c-info-600)' };
  const bgs = { primary:'var(--c-primary-50)', success:'var(--c-success-50)', warning:'var(--c-warn-50)', danger:'var(--c-danger-50)', info:'var(--c-info-50)' };
  return React.createElement('div', {
    className: 'animate-slide-u',
    style: { background:'var(--c-surface)',borderRadius:'var(--r-lg)',padding:'24px',border:'1px solid var(--c-border)',display:'flex',alignItems:'center',gap:20,transition:'box-shadow var(--dur-base) var(--ease),transform var(--dur-base) var(--ease)',cursor:'default' },
    onMouseEnter: e => { e.currentTarget.style.boxShadow='var(--shadow-md)'; e.currentTarget.style.transform='translateY(-2px)'; },
    onMouseLeave: e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; },
  },
    icon && React.createElement('div', { style: { width:48,height:48,borderRadius:'var(--r-lg)',background:bgs[color],color:colors[color],display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0 }, 'aria-hidden':'true' }, icon),
    React.createElement('div', { style:{flex:1,minWidth:0} },
      React.createElement('div', { style:{fontSize:'var(--fs-sm)',color:'var(--c-text-3)',marginBottom:4,fontWeight:500} }, title),
      React.createElement('div', { style:{fontSize:28,fontWeight:700,color:colors[color],lineHeight:1.2} }, value),
      subtitle && React.createElement('div', { style:{fontSize:12,color:'var(--c-text-4)',marginTop:4} }, subtitle),
    )
  );
}

/* ── Empty State ── */
function EmptyState({ message='データがありません', icon='📋' }) {
  return React.createElement('div', { style:{textAlign:'center',padding:'48px 24px',color:'var(--c-text-3)'} },
    React.createElement('div', { style:{fontSize:40,marginBottom:12,opacity:0.5},'aria-hidden':'true' }, icon),
    React.createElement('p', { style:{fontSize:'var(--fs-base)'} }, message)
  );
}

/* ── Loading Skeleton ── */
function Skeleton({ width='100%', height=16, style:s={} }) {
  return React.createElement('div', { className:'skeleton', style:{width,height,display:'inline-block',...s} });
}

function TableSkeleton({ rows=5, cols=5 }) {
  return React.createElement('div', { style:{display:'flex',flexDirection:'column',gap:8,padding:16} },
    ...Array.from({length:rows}, (_,i) =>
      React.createElement('div', { key:i, style:{display:'flex',gap:12} },
        ...Array.from({length:cols}, (_,j) =>
          React.createElement(Skeleton, { key:j, height:20, style:{borderRadius:'var(--r-sm)'} })
        )
      )
    )
  );
}

/* ── Search Input ── */
function SearchInput({ value, onChange, placeholder='検索...' }) {
  return React.createElement('div', { style:{position:'relative',maxWidth:280} },
    React.createElement('span', { style:{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--c-text-4)',fontSize:14,pointerEvents:'none'},'aria-hidden':'true' }, '🔍'),
    React.createElement('input', {
      type:'search', value, onChange:e=>onChange(e.target.value), placeholder,
      'aria-label': placeholder,
      style: { width:'100%',padding:'8px 12px 8px 36px',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',fontSize:'var(--fs-sm)',background:'var(--c-surface)',color:'var(--c-text)',outline:'none',transition:'border-color var(--dur-fast) var(--ease)' },
      onFocus: e => e.target.style.borderColor='var(--c-primary-500)',
      onBlur: e => e.target.style.borderColor='var(--c-border)',
    })
  );
}

/* ── Select Filter ── */
function FilterSelect({ label, value, options, onChange }) {
  return React.createElement('div', { style:{display:'flex',alignItems:'center',gap:8} },
    React.createElement('label', { style:{fontSize:'var(--fs-sm)',color:'var(--c-text-3)',whiteSpace:'nowrap',fontWeight:500} }, label),
    React.createElement('select', {
      value, onChange:e=>onChange(e.target.value),
      style: { padding:'7px 28px 7px 10px',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',fontSize:'var(--fs-sm)',background:'var(--c-surface)',color:'var(--c-text)',cursor:'pointer',outline:'none' }
    },
      React.createElement('option', { value:'all' }, 'すべて'),
      ...options.map(o => React.createElement('option', { key:o.value||o, value:o.value||o }, o.label || LABEL_MAP[o] || o))
    )
  );
}

/* ── Button ── */
function Btn({ children, variant='default', size='md', onClick, disabled, style:s={}, ...rest }) {
  const base = { display:'inline-flex',alignItems:'center',gap:8,fontWeight:600,borderRadius:'var(--r-md)',border:'1px solid transparent',cursor:'pointer',transition:'all var(--dur-fast) var(--ease)',whiteSpace:'nowrap',lineHeight:1.4 };
  const sizes = { sm:{padding:'6px 12px',fontSize:'var(--fs-xs)'},md:{padding:'8px 16px',fontSize:'var(--fs-sm)'},lg:{padding:'10px 20px',fontSize:'var(--fs-base)'} };
  const variants = {
    primary:{ background:'var(--c-primary-600)',color:'#fff',borderColor:'var(--c-primary-600)' },
    success:{ background:'var(--c-success-600)',color:'#fff' },
    danger:{ background:'var(--c-danger-600)',color:'#fff' },
    outline:{ background:'transparent',color:'var(--c-primary-600)',borderColor:'var(--c-border)' },
    ghost:{ background:'transparent',color:'var(--c-text-2)',borderColor:'transparent' },
    default:{ background:'var(--c-surface)',color:'var(--c-text-2)',borderColor:'var(--c-border)' },
  };
  return React.createElement('button', {
    onClick, disabled,
    style: { ...base, ...sizes[size], ...variants[variant], ...(disabled?{opacity:0.5,cursor:'not-allowed'}:{}), ...s },
    onMouseEnter: e => { if(!disabled) e.currentTarget.style.opacity='0.85'; },
    onMouseLeave: e => { e.currentTarget.style.opacity='1'; },
    ...rest
  }, children);
}

/* ── Modal ── */
function Modal({ open, onClose, title, children, footer, width=640 }) {
  const ref = useRef();
  useEffect(() => { if(open && ref.current) ref.current.focus(); }, [open]);
  if (!open) return null;
  return ReactDOM.createPortal(
    React.createElement('div', {
      role:'dialog','aria-modal':'true','aria-label':title,
      style:{ position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24 },
      onClick: e => { if(e.target===e.currentTarget) onClose(); },
      onKeyDown: e => { if(e.key==='Escape') onClose(); },
    },
      React.createElement('div', { style:{position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(2px)'}, 'aria-hidden':'true' }),
      React.createElement('div', {
        ref, tabIndex:-1,
        className:'animate-scale',
        style:{ position:'relative',width:`min(${width}px,100%)`,maxHeight:'85vh',display:'flex',flexDirection:'column',background:'var(--c-surface)',borderRadius:'var(--r-xl)',boxShadow:'var(--shadow-xl)',overflow:'hidden' }
      },
        React.createElement('div', { style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid var(--c-border)'} },
          React.createElement('h3', { style:{fontSize:'var(--fs-lg)',fontWeight:600} }, title),
          React.createElement('button', { onClick:onClose,'aria-label':'閉じる',style:{background:'none',border:'none',fontSize:20,color:'var(--c-text-3)',padding:4,borderRadius:'var(--r-sm)',lineHeight:1} }, '✕')
        ),
        React.createElement('div', { style:{padding:24,overflowY:'auto',flex:1} }, children),
        footer && React.createElement('div', { style:{display:'flex',justifyContent:'flex-end',gap:12,padding:'16px 24px',borderTop:'1px solid var(--c-border)'} }, footer)
      )
    ),
    document.body
  );
}

/* ── Form Field ── */
function FormField({ label, required, error, children, fullWidth, hint }) {
  return React.createElement('div', { style:{display:'flex',flexDirection:'column',gap:6,...(fullWidth?{gridColumn:'1/-1'}:{})} },
    React.createElement('label', { style:{fontSize:'var(--fs-sm)',fontWeight:500,color:'var(--c-text-2)',display:'flex',alignItems:'center',gap:4} },
      label,
      required && React.createElement('span', { style:{color:'var(--c-danger-600)'}, 'aria-hidden':'true' }, '*')
    ),
    children,
    hint && !error && React.createElement('span', { style:{fontSize:12,color:'var(--c-text-4)'} }, hint),
    error && React.createElement('span', { role:'alert', style:{fontSize:12,color:'var(--c-danger-600)'} }, error)
  );
}

const fieldStyle = { padding:'8px 12px',border:'1px solid var(--c-border)',borderRadius:'var(--r-md)',fontSize:'var(--fs-base)',background:'var(--c-surface)',color:'var(--c-text)',outline:'none',transition:'border-color var(--dur-fast) var(--ease)',width:'100%' };
const fieldFocus = e => e.target.style.borderColor='var(--c-primary-500)';
const fieldBlur = e => e.target.style.borderColor='var(--c-border)';

function TextInput(props) {
  return React.createElement('input', { ...props, style:{...fieldStyle,...(props.style||{})}, onFocus:fieldFocus, onBlur:fieldBlur });
}
function TextArea(props) {
  return React.createElement('textarea', { ...props, style:{...fieldStyle,minHeight:80,resize:'vertical',...(props.style||{})}, onFocus:fieldFocus, onBlur:fieldBlur });
}
function SelectInput({ options, ...props }) {
  return React.createElement('select', { ...props, style:{...fieldStyle,cursor:'pointer',...(props.style||{})} },
    React.createElement('option', { value:'' }, '選択してください'),
    ...options.map(o => React.createElement('option', { key:o.value||o, value:o.value||o }, o.label||LABEL_MAP[o]||o))
  );
}

/* ── Data Table ── */
function DataTable({ columns, data, loading, sortKey, sortDir, onSort, onRowClick, emptyMsg }) {
  if (loading) return React.createElement(TableSkeleton, { rows:6, cols:columns.length });
  if (!data || !data.length) return React.createElement(EmptyState, { message: emptyMsg || 'データがありません' });
  return React.createElement('div', { style:{overflowX:'auto',borderRadius:'var(--r-lg)',border:'1px solid var(--c-border)',background:'var(--c-surface)'} },
    React.createElement('table', {
      role:'grid',
      style:{ width:'100%',borderCollapse:'collapse',fontSize:'var(--fs-sm)' }
    },
      React.createElement('thead', null,
        React.createElement('tr', null,
          ...columns.map(col =>
            React.createElement('th', {
              key: col.key,
              onClick: col.sortable ? ()=>onSort && onSort(col.key) : undefined,
              'aria-sort': sortKey===col.key ? (sortDir==='asc'?'ascending':'descending') : undefined,
              style: {
                padding:'12px 16px',textAlign:'left',fontWeight:600,fontSize:'var(--fs-xs)',color:'var(--c-text-3)',
                textTransform:'uppercase',letterSpacing:'0.03em',borderBottom:'1px solid var(--c-border)',
                background:'var(--c-hover)',cursor:col.sortable?'pointer':'default',whiteSpace:'nowrap',
                userSelect:'none',position:'sticky',top:0,zIndex:1
              }
            },
              React.createElement('span', { style:{display:'flex',alignItems:'center',gap:4} },
                col.label,
                col.sortable && sortKey===col.key && React.createElement('span', { style:{fontSize:10},'aria-hidden':'true' }, sortDir==='asc'?'▲':'▼')
              )
            )
          )
        )
      ),
      React.createElement('tbody', null,
        ...data.map((row, i) =>
          React.createElement('tr', {
            key: row.id || i,
            onClick: onRowClick ? ()=>onRowClick(row) : undefined,
            style: { cursor:onRowClick?'pointer':'default',transition:'background var(--dur-fast) var(--ease)',borderBottom:'1px solid var(--c-border)' },
            onMouseEnter: e => e.currentTarget.style.background='var(--c-hover)',
            onMouseLeave: e => e.currentTarget.style.background='transparent',
          },
            ...columns.map(col =>
              React.createElement('td', {
                key: col.key,
                style: { padding:'12px 16px',color:'var(--c-text)',whiteSpace: col.nowrap ? 'nowrap':'normal',maxWidth:col.maxWidth||'none',overflow:'hidden',textOverflow:'ellipsis' }
              },
                col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')
              )
            )
          )
        )
      )
    )
  );
}

/* ── Pagination ── */
function Pagination({ page, total, size, onChange }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return React.createElement('div', { style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0'}, role:'navigation', 'aria-label':'ページナビゲーション' },
    React.createElement('span', { style:{fontSize:'var(--fs-sm)',color:'var(--c-text-3)'} }, `全 ${total} 件中 ${(page-1)*size+1}–${Math.min(page*size,total)} 件`),
    React.createElement('div', { style:{display:'flex',gap:4} },
      React.createElement(Btn, { size:'sm', variant:'outline', disabled:page<=1, onClick:()=>onChange(page-1) }, '← 前'),
      ...Array.from({length:Math.min(pages,7)}, (_,i) => {
        const p = i+1;
        return React.createElement(Btn, { key:p, size:'sm', variant:p===page?'primary':'outline', onClick:()=>onChange(p), 'aria-current':p===page?'page':undefined }, String(p));
      }),
      React.createElement(Btn, { size:'sm', variant:'outline', disabled:page>=pages, onClick:()=>onChange(page+1) }, '次 →')
    )
  );
}

/* ── Confirm Dialog ── */
function ConfirmDialog({ open, onClose, onConfirm, title='確認', message='この操作を実行しますか？', confirmLabel='実行', danger }) {
  return React.createElement(Modal, { open, onClose, title, width:440,
    footer: [
      React.createElement(Btn, { key:'c', variant:'outline', onClick:onClose }, 'キャンセル'),
      React.createElement(Btn, { key:'ok', variant:danger?'danger':'primary', onClick:()=>{onConfirm();onClose();} }, confirmLabel),
    ]
  }, React.createElement('p', { style:{fontSize:'var(--fs-base)',color:'var(--c-text-2)',lineHeight:1.6} }, message));
}

/* ── Format Helpers ── */
function fmtDate(v, short) {
  if (!v) return '—';
  const dt = new Date(v);
  if (isNaN(dt)) return '—';
  const mm = String(dt.getMonth()+1).padStart(2,'0');
  const dd = String(dt.getDate()).padStart(2,'0');
  const hh = String(dt.getHours()).padStart(2,'0');
  const mi = String(dt.getMinutes()).padStart(2,'0');
  return short ? `${mm}/${dd} ${hh}:${mi}` : `${dt.getFullYear()}/${mm}/${dd} ${hh}:${mi}`;
}

/* ── Export to window ── */
Object.assign(window, {
  ToastProvider, useToast, ToastCtx,
  Badge, SLAPill, KPICard, EmptyState, Skeleton, TableSkeleton,
  SearchInput, FilterSelect, Btn, Modal, ConfirmDialog,
  FormField, TextInput, TextArea, SelectInput,
  DataTable, Pagination,
  BADGE_COLORS, LABEL_MAP, fmtDate,
  fieldStyle, fieldFocus, fieldBlur,
});
