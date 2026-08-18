/** 汎用モジュールビュー（一覧・検索・フィルタ・CRUD・詳細） */
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, buildQuery, type ListResult } from '../api';
import { DataTable, Pagination, Modal, ConfirmDialog, Field, type Column } from '../components/ui.tsx';
import { PRIORITY_LABEL, fmtDate } from '../types.ts';
import { useAuth } from '../auth.tsx';

export interface ModuleConfig<T> {
  key: string;
  label: string;
  sub: string;
  apiPath: string;
  titleField: string;
  columns: Column<T>[];
  filters: { key: string; label: string; options: (string | { value: string; label: string })[] }[];
  fields: { key: string; label: string; type?: 'text' | 'textarea' | 'select' | 'date' | 'number'; options?: (string | { value: string; label: string })[]; required?: boolean; full?: boolean }[];
  defaults: Record<string, string | number>;
  kpis?: (items: T[], total: number) => { icon: string; label: string; value: string; tone: 'info' | 'success' | 'warning' | 'danger' | 'accent' }[];
}

const PAGE_SIZE = 10;

function optLabel(o: string | { value: string; label: string }): string {
  return typeof o === 'object' ? o.label : (PRIORITY_LABEL[o] ?? o);
}
function optValue(o: string | { value: string; label: string }): string {
  return typeof o === 'object' ? o.value : o;
}

export function ModuleView<T extends { id: string }>({ cfg }: { cfg: ModuleConfig<T> }) {
  const { user } = useAuth();
  const canWrite = user ? ['operator', 'manager', 'admin'].includes(user.role) : false;
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [detailItem, setDetailItem] = useState<T | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);

  const toast = (msg: string, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3400);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = buildQuery({ skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE, keyword: keyword || undefined, ...filters });
      const res = await api.get<ListResult<T>>(`${cfg.apiPath}${q}`);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      toast(e instanceof Error ? e.message : '読み込みに失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  }, [cfg.apiPath, page, keyword, filters]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditItem(null);
    setFormData({ ...cfg.defaults });
    setFormError('');
    setModalOpen(true);
  };
  const openEdit = (row: T) => {
    setEditItem(row);
    setFormData({ ...(row as Record<string, unknown>) });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    // 必須チェック
    for (const f of cfg.fields) {
      if (f.required && !formData[f.key]) {
        setFormError(`${f.label}は必須です`);
        return;
      }
    }
    try {
      if (editItem) {
        await api.put(`${cfg.apiPath}/${editItem.id}`, formData);
        toast(`${cfg.label}を更新しました`, 'success');
      } else {
        await api.post(cfg.apiPath, formData);
        toast(`${cfg.label}を登録しました`, 'success');
      }
      setModalOpen(false);
      void load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '保存に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`${cfg.apiPath}/${deleteTarget.id}`);
      toast('削除しました', 'success');
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : '削除に失敗しました', 'error');
    }
    setDeleteTarget(null);
  };

  const kpis = useMemo(() => (cfg.kpis ? cfg.kpis(items, total) : []), [cfg, items, total]);

  const actionsColumn: Column<T> = {
    key: '_actions',
    label: '',
    render: (_, row) => (
      <div className="td-actions" onClick={(e) => e.stopPropagation()}>
        <button className="row-btn" aria-label="編集" disabled={!canWrite} onClick={() => openEdit(row)}>✏️</button>
        <button className="row-btn" aria-label="削除" disabled={!canWrite} onClick={() => setDeleteTarget(row)}>🗑️</button>
      </div>
    ),
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{cfg.label}</h1>
          <div className="sub">{cfg.sub}</div>
        </div>
        <div className="page-head__actions">
          {canWrite && <button className="btn btn--primary" onClick={openCreate}>＋ 新規作成</button>}
        </div>
      </div>

      {kpis.length > 0 && (
        <div className="kpi-grid" style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length, 4)}, minmax(0,1fr))` }}>
          {kpis.map((k, i) => (
            <div key={i} className="kpi">
              <div className={`kpi__icon kpi__icon--${k.tone}`}>{k.icon}</div>
              <div>
                <div className="kpi__label">{k.label}</div>
                <div className="kpi__value">{k.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <div className="search">
          <input type="search" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} placeholder={`${cfg.label}を検索...`} aria-label="検索" />
        </div>
        {cfg.filters.map((f) => (
          <div className="filter" key={f.key}>
            <label htmlFor={`f-${f.key}`}>{f.label}</label>
            <select id={`f-${f.key}`} value={filters[f.key] ?? 'all'}
              onChange={(e) => { const v = e.target.value; setFilters((p) => ({ ...p, [f.key]: v === 'all' ? '' : v })); setPage(1); }}>
              <option value="all">すべて</option>
              {f.options.map((o) => (
                <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>
              ))}
            </select>
          </div>
        ))}
        <span className="spacer" />
        {(keyword || Object.values(filters).some(Boolean)) && (
          <button className="btn btn--ghost btn--sm" onClick={() => { setKeyword(''); setFilters({}); setPage(1); }}>クリア</button>
        )}
      </div>

      <DataTable<T> columns={[...cfg.columns, actionsColumn]} data={items} loading={loading}
        onRowClick={(row) => setDetailItem(row)} emptyMsg={`${cfg.label}のデータがありません`} />

      <Pagination page={page} total={total} size={PAGE_SIZE} onChange={setPage} />

      {/* 作成/編集モーダル */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? `${cfg.label} 編集` : `${cfg.label} 新規作成`}
        footer={<>
          <button className="btn btn--outline" onClick={() => setModalOpen(false)}>キャンセル</button>
          <button className="btn btn--primary" onClick={() => void handleSave()}>{editItem ? '更新' : '作成'}</button>
        </>}>
        {formError && <div className="login-error" role="alert">{formError}</div>}
        <div className="form-grid">
          {cfg.fields.map((f) => (
            <Field key={f.key} label={f.label} required={f.required} full={f.full}>
              {f.type === 'textarea' ? (
                <textarea value={String(formData[f.key] ?? '')} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} />
              ) : f.type === 'select' ? (
                <select value={String(formData[f.key] ?? '')} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}>
                  <option value="">選択してください</option>
                  {(f.options ?? []).map((o) => (
                    <option key={optValue(o)} value={optValue(o)}>{optLabel(o)}</option>
                  ))}
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'datetime-local' : 'text'}
                  value={String(formData[f.key] ?? '')} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </Modal>

      {/* 削除確認 */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()}
        title="削除確認" message={`「${String((deleteTarget as Record<string, unknown> | null)?.[cfg.titleField] ?? '')}」を削除しますか？この操作は取り消せません。`} confirmLabel="削除" danger />

      {/* 詳細モーダル */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} width={560}
        title={`${String((detailItem as Record<string, unknown> | null)?.[cfg.titleField] ?? '')} 詳細`}
        footer={<button className="btn btn--primary" onClick={() => setDetailItem(null)}>閉じる</button>}>
        {detailItem && (
          <dl className="dl">
            {Object.entries(detailItem as Record<string, unknown>)
              .filter(([k]) => !['id', 'password_hash'].includes(k))
              .map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v === null || v === undefined || v === '' ? '—' : String(v)}</dd>
                </Fragment>
              ))}
          </dl>
        )}
      </Modal>

      {/* トースト */}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type === 'success' ? 'toast--success' : t.type === 'error' ? 'toast--error' : ''}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  );
}

/** 詳細モーダル用共通フォーマッタ */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

export { fmtDate };
