/** UI 共通コンポーネント */
import { useEffect, type ReactNode, type CSSProperties } from 'react';
import { STATUS_LABEL, PRIORITY_LABEL, TONE } from '../types';

/* ── Pill（ステータス/優先度バッジ） ── */
export function Pill({ value }: { value: string }) {
  const tone = TONE[value] ?? 'neutral';
  const label = STATUS_LABEL[value] ?? PRIORITY_LABEL[value] ?? value;
  return <span className={`pill pill--${tone}`}>{label}</span>;
}

/* ── KPI カード ── */
export function KPI({ icon, label, value, sub, tone = 'info' }: { icon: string; label: string; value: string; sub?: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'accent' }) {
  return (
    <div className="kpi">
      <div className={`kpi__icon kpi__icon--${tone}`}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div className="kpi__label">{label}</div>
        <div className="kpi__value">{value}</div>
        {sub && <div className="kpi__sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── モーダル ── */
export function Modal({ open, onClose, title, children, footer, width = 640 }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: `min(${width}px, 100%)` }}>
        <div className="modal__head">
          <h3>{title}</h3>
          <button className="modal__close" onClick={onClose} aria-label="閉じる">✕</button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ── 確認ダイアログ ── */
export function ConfirmDialog({ open, onClose, onConfirm, title = '確認', message, confirmLabel = '実行', danger }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={440}
      footer={<>
        <button className="btn btn--outline" onClick={onClose}>キャンセル</button>
        <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </>}>
      <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.8 }}>{message}</p>
    </Modal>
  );
}

/* ── テーブル ── */
export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  cls?: string;
}

export function DataTable<T extends { id: string }>({ columns, data, loading, sortKey, sortDir, onSort, onRowClick, emptyMsg = 'データがありません' }: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  emptyMsg?: string;
}) {
  if (loading) {
    return <div className="card" style={{ padding: 16 }}><div className="skeleton" style={{ height: 200 }} /></div>;
  }
  if (!data.length) {
    return <div className="empty"><p>{emptyMsg}</p></div>;
  }
  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={col.sortable ? 'sortable' : ''}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {col.label}
                  {col.sortable && sortKey === col.key && <span className="sort-ind">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className={onRowClick ? 'row-click' : ''} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                {columns.map((col) => (
                  <td key={col.key} className={col.cls}>
                    {col.render ? col.render((row as Record<string, unknown>)[col.key], row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── ページネーション ── */
export function Pagination({ page, total, size, onChange }: { page: number; total: number; size: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <span className="count">全 {total} 件中 {(page - 1) * size + 1}–{Math.min(page * size, total)} 件</span>
      <div className="pages">
        <button className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>前へ</button>
        <span className="page-info">{page} / {pages}</span>
        <button className="btn btn--outline btn--sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>次へ</button>
      </div>
    </div>
  );
}

/* ── フォームフィールド ── */
export function Field({ label, required, children, full, error }: { label: string; required?: boolean; children: ReactNode; full?: boolean; error?: string }) {
  return (
    <div className={`field ${full ? 'field--full' : ''}`}>
      <label>{label}{required && <span className="req">*</span>}</label>
      {children}
      {error && <span className="err">{error}</span>}
    </div>
  );
}

/* ── 空状態 ── */
export function Empty({ message = 'データがありません' }: { message?: string }) {
  return <div className="empty"><p>{message}</p></div>;
}

/* ── チャート（SVG） ── */
export function BarChart({ data, height = 150 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return null;
  const W = 460, H = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pad = { top: 14, bottom: 26, left: 4, right: 4 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
  const barW = Math.min(42, (cw / data.length) * 0.55);
  const step = cw / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="バーチャート">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.left} x2={W - pad.right} y1={pad.top + ch * (1 - f)} y2={pad.top + ch * (1 - f)}
          stroke="var(--border)" strokeDasharray="3 4" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const x = pad.left + step * i + (step - barW) / 2;
        const bh = (d.value / max) * ch;
        return (
          <g key={i}>
            <rect x={x} y={pad.top + ch - bh} width={barW} height={bh} rx="4" fill="var(--accent)" opacity="0.9" />
            <text x={x + barW / 2} y={pad.top + ch - bh - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{d.value}</text>
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--muted-2)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ data, height = 190 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return null;
  const W = 620, H = height;
  const max = Math.max(1, ...data.map((d) => d.value));
  const pad = { top: 16, bottom: 30, left: 28, right: 16 };
  const cw = W - pad.left - pad.right, ch = H - pad.top - pad.bottom;
  const pts = data.map((d, i) => ({
    x: pad.left + (i / Math.max(1, data.length - 1)) * cw,
    y: pad.top + ch - (d.value / max) * ch,
    ...d,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${pad.top + ch} L${pts[0].x},${pad.top + ch} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="ラインチャート">
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={pad.left} x2={W - pad.right} y1={pad.top + ch * (1 - f)} y2={pad.top + ch * (1 - f)}
          stroke="var(--border)" strokeDasharray="3 4" strokeWidth="1" />
      ))}
      <path d={area} fill="var(--accent)" opacity="0.1" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fill="var(--fg-2)">{p.value}</text>
          <text x={p.x} y={H - 10} textAnchor="middle" fontSize="10.5" fill="var(--muted-2)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function DonutChart({ data, size = 150, thickness = 18, centerLabel, centerSub }: {
  data: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel: string;
  centerSub?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  const circum = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="ドーナツチャート">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const pct = d.value / total;
        const dash = pct * circum;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
            strokeDasharray={`${dash} ${circum - dash}`} strokeDashoffset={-offset} strokeLinecap="round" />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - (centerSub ? 8 : 0)} textAnchor="middle" dominantBaseline="central"
        fontSize="24" fontWeight="700" fill="var(--fg)">{centerLabel}</text>
      {centerSub && <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10.5" fill="var(--muted-2)">{centerSub}</text>}
    </svg>
  );
}

/* ── トースト ── */
export function Toast({ toasts }: { toasts: { id: number; msg: string; type: string }[] }) {
  return (
    <div className="toast-wrap" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type === 'success' ? 'toast--success' : t.type === 'error' ? 'toast--error' : ''}`}>{t.msg}</div>
      ))}
    </div>
  );
}

export type { CSSProperties };
