import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download, ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, Filter, X, Bookmark, Check as CheckI } from 'lucide-react';
import { cls, downloadCSV, saveMsg } from '../lib/util';
import { useUI } from '../store/store';
import { EmptyState } from './ui';

export type Col<T = any> = {
  key: string; label: string; render?: (r: T) => React.ReactNode; value?: (r: T) => any; align?: 'right' | 'center';
  filter?: boolean; hidden?: boolean; mobile?: 'title' | 'sub' | 'meta' | 'right' | 'hide'; className?: string; sortable?: boolean;
};
export type RowAction<T> = { label: string; icon?: any; onClick: (r: T) => void; tone?: 'bad'; hidden?: boolean };

export function DataTable<T = any>({
  id, rows, cols, onRow, rowActions, bulkActions, expand, toolbar, pageSize = 10, empty, quickFilters, dense, initialSort, selectable, title, compact, initialQ, initialQuick,
}: {
  id: string; rows: any[]; cols: Col<any>[]; onRow?: (r: any) => void; rowActions?: (r: any) => RowAction<any>[]; bulkActions?: { label: string; icon?: any; onClick: (rows: any[]) => void; tone?: string }[];
  expand?: (r: any) => React.ReactNode; toolbar?: React.ReactNode; pageSize?: number; empty?: React.ReactNode; quickFilters?: { key: string; label: string; fn: (r: any) => boolean }[];
  dense?: boolean; initialSort?: { key: string; dir: 1 | -1 }; selectable?: boolean; title?: React.ReactNode; compact?: boolean; initialQ?: string; initialQuick?: string;
}) {
  const [q, setQ] = useState(initialQ || '');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(initialSort || null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);
  const [hidden, setHidden] = useState<Set<string>>(new Set(cols.filter((c) => c.hidden).map((c) => c.key)));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [quick, setQuick] = useState(initialQuick || 'all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<'' | 'cols' | 'views' | 'filters'>('');
  const savedViews = useUI((s) => s.savedViews[id] || []);
  const setUI = useUI((s) => s.set);
  const toast = useUI((s) => s.toast);

  const val = (c: Col<T>, r: T) => (c.value ? c.value(r) : (r as any)[c.key]);
  const visible = cols.filter((c) => !hidden.has(c.key));
  const filterCols = cols.filter((c) => c.filter);

  const filtered = useMemo(() => {
    let out = rows;
    const qf = quickFilters?.find((x) => x.key === quick);
    if (qf) out = out.filter(qf.fn);
    for (const [k, v] of Object.entries(filters)) if (v) { const c = cols.find((x) => x.key === k)!; out = out.filter((r) => String(val(c, r) ?? '') === v); }
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((r) => cols.some((c) => String(val(c, r) ?? '').toLowerCase().includes(s)));
    }
    if (sort) {
      const c = cols.find((x) => x.key === sort.key);
      if (c) out = [...out].sort((a, b) => { const x = val(c, a), y = val(c, b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), 'en', { numeric: true })) * sort.dir; });
    }
    return out;
  }, [rows, q, sort, filters, quick, cols]);

  useEffect(() => setPage(0), [q, filters, quick, rows.length]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const pg = Math.min(page, pages - 1);
  const slice = filtered.slice(pg * size, pg * size + size);
  const rid = (r: T, i: number) => (r as any).id || String(i);
  const allSel = slice.length > 0 && slice.every((r, i) => sel.has(rid(r, i)));
  const selRows = filtered.filter((r, i) => sel.has(rid(r, i)));
  const canSelect = selectable || !!bulkActions?.length;

  const exportCSV = () => {
    const data = filtered.map((r) => Object.fromEntries(visible.map((c) => [c.label, val(c, r)])));
    downloadCSV(`${id}_${new Date().toISOString().slice(0, 10)}`, data).then((o) => { const [t, tone] = saveMsg(o, 'Excel export ready'); toast(t, tone, o === 'saved' ? `${data.length} rows · .csv` : undefined); });
  };
  const saveView = () => {
    const name = `View ${savedViews.length + 1}${q ? ` · "${q}"` : ''}`;
    setUI({ savedViews: { ...useUI.getState().savedViews, [id]: [...savedViews, { name, q, filters: { ...filters, __quick: quick } }] } });
    toast('View saved', 'ok', name);
  };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const hasTitle = !!title;

  return (
    <div className="card min-w-0 overflow-hidden">
      {/* toolbar */}
      <div className="flex flex-col gap-2.5 p-3 border-b border-line">
        {(hasTitle || quickFilters) && (
          <div className="flex flex-wrap items-center gap-2 justify-between">
            {hasTitle && <div className="font-semibold text-[13.5px]">{title}</div>}
            {quickFilters && (
              <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-full">
                {[{ key: 'all', label: 'All' }, ...quickFilters].map((f) => {
                  const n = f.key === 'all' ? rows.length : rows.filter((quickFilters.find((x) => x.key === f.key) as any).fn).length;
                  return <button key={f.key} onClick={() => setQuick(f.key)} className={cls('h-7 px-2.5 rounded-full text-[12px] font-semibold border whitespace-nowrap transition', quick === f.key ? 'bg-ink text-surface border-ink' : 'border-line text-muted hover:text-ink bg-surface')}>{f.label} <span className="opacity-60 tnum">{n}</span></button>;
                })}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all columns…" className="input pl-8 h-8" aria-label="Search table" />
            {q && <button onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Clear search"><X size={13} /></button>}
          </div>
          {toolbar}
          <div className="flex items-center gap-1 ml-auto relative">
            {filterCols.length > 0 && <button className={cls('btn-ghost btn-sm', activeFilterCount && 'border-violet text-violet')} onClick={() => setMenu(menu === 'filters' ? '' : 'filters')}><Filter size={13} /> <span className="hidden sm:inline">Filters</span>{activeFilterCount > 0 && <span className="tnum">({activeFilterCount})</span>}</button>}
            <button className="btn-ghost btn-sm" onClick={() => setMenu(menu === 'views' ? '' : 'views')} title="Saved views"><Bookmark size={13} /><span className="hidden md:inline">Views</span></button>
            <button className="btn-ghost btn-sm hidden md:inline-flex" onClick={() => setMenu(menu === 'cols' ? '' : 'cols')} title="Columns"><Columns3 size={13} /></button>
            <button className="btn-ghost btn-sm" onClick={exportCSV} title="Export"><Download size={13} /><span className="hidden sm:inline">Export</span></button>
            {menu && <div className="fixed inset-0 z-30" onClick={() => setMenu('')} />}
            {menu === 'cols' && (
              <div className="absolute right-0 top-9 z-40 card shadow-pop p-2 w-56 max-h-80 overflow-auto animate-in">
                <div className="eyebrow px-2 py-1">Visible columns</div>
                {cols.map((c) => (
                  <button key={c.key} onClick={() => { const n = new Set(hidden); n.has(c.key) ? n.delete(c.key) : n.add(c.key); setHidden(n); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface2 text-[12.5px]">
                    <span className={cls('w-4 h-4 rounded border grid place-items-center', !hidden.has(c.key) ? 'bg-violet border-violet text-white' : 'border-line')}>{!hidden.has(c.key) && <CheckI size={10} strokeWidth={3} />}</span>{c.label}
                  </button>
                ))}
              </div>
            )}
            {menu === 'views' && (
              <div className="absolute right-0 top-9 z-40 card shadow-pop p-2 w-64 animate-in">
                <div className="eyebrow px-2 py-1">Saved views</div>
                {savedViews.length === 0 && <div className="text-[12px] text-muted px-2 py-2">No saved views yet. Set search & filters, then save.</div>}
                {savedViews.map((v, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <button onClick={() => { setQ(v.q); const { __quick, ...f } = v.filters || {}; setFilters(f); setQuick(__quick || 'all'); setMenu(''); }} className="flex-1 text-left px-2 py-1.5 rounded-md hover:bg-surface2 text-[12.5px] truncate">{v.name}</button>
                    <button className="btn-icon h-7 w-7" aria-label="Delete view" onClick={() => setUI({ savedViews: { ...useUI.getState().savedViews, [id]: savedViews.filter((_, j) => j !== i) } })}><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => { saveView(); setMenu(''); }} className="btn-violet btn-sm w-full mt-2">Save current view</button>
              </div>
            )}
            {menu === 'filters' && (
              <div className="absolute right-0 top-9 z-40 card shadow-pop p-3 w-72 animate-in">
                <div className="grid gap-2.5">
                  {filterCols.map((c) => {
                    const opts = [...new Set(rows.map((r) => String(val(c, r) ?? '')).filter(Boolean))].sort();
                    return (
                      <label key={c.key} className="block">
                        <span className="label">{c.label}</span>
                        <select value={filters[c.key] || ''} onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })} className="input h-8">
                          <option value="">All</option>
                          {opts.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </label>
                    );
                  })}
                  <button className="btn-subtle btn-sm" onClick={() => setFilters({})}>Clear filters</button>
                </div>
              </div>
            )}
          </div>
        </div>
        {(activeFilterCount > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => <span key={k} className="chip bg-violet/10 text-violet">{cols.find((c) => c.key === k)?.label}: {v}<button onClick={() => setFilters({ ...filters, [k]: '' })} aria-label="Remove filter"><X size={11} /></button></span>)}
          </div>
        )}
        {canSelect && sel.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 bg-violet/[.08] border border-violet/25 rounded-lg px-3 py-1.5 animate-in">
            <span className="text-[12.5px] font-semibold text-violet">{sel.size} selected</span>
            {bulkActions?.map((b) => { const I = b.icon; return <button key={b.label} className={cls('btn-sm', b.tone === 'bad' ? 'btn-bad' : 'btn-violet')} onClick={() => { b.onClick(selRows); setSel(new Set()); }}>{I && <I size={13} />}{b.label}</button>; })}
            <button className="btn-subtle btn-sm ml-auto" onClick={() => setSel(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (empty || <EmptyState title="No matching records" body={q || activeFilterCount ? 'Try clearing search or filters.' : 'Records will appear here once created.'} />) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block overflow-auto max-h-[68vh] scrollbar-thin">
            <table className="w-full text-[12.75px]">
              <thead className="sticky top-0 z-10 bg-surface2/95 backdrop-blur">
                <tr className="border-b border-line">
                  {canSelect && <th className="w-9 px-3"><input type="checkbox" aria-label="Select page" checked={allSel} onChange={() => { const n = new Set(sel); slice.forEach((r, i) => (allSel ? n.delete(rid(r, i)) : n.add(rid(r, i)))); setSel(n); }} className="accent-[rgb(var(--violet))]" /></th>}
                  {expand && <th className="w-8" />}
                  {visible.map((c) => (
                    <th key={c.key} className={cls('px-3 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-[.04em] whitespace-nowrap', c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left')}>
                      {c.sortable === false ? c.label : (
                        <button className={cls('inline-flex items-center gap-1 hover:text-ink', sort?.key === c.key && 'text-ink')} onClick={() => setSort(sort?.key === c.key ? (sort.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 })}>
                          {c.label}{sort?.key === c.key ? (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="opacity-30" />}
                        </button>
                      )}
                    </th>
                  ))}
                  {rowActions && <th className="w-10" />}
                </tr>
              </thead>
              <tbody>
                {slice.map((r, i) => {
                  const k = rid(r, i);
                  const isOpen = open.has(k);
                  return (
                    <React.Fragment key={k}>
                      <tr onClick={() => onRow?.(r)} className={cls('border-b border-line/60 transition-colors group', onRow && 'cursor-pointer hover:bg-violet/[.035]', sel.has(k) && 'bg-violet/[.06]')}>
                        {canSelect && <td className="px-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="Select row" checked={sel.has(k)} onChange={() => { const n = new Set(sel); n.has(k) ? n.delete(k) : n.add(k); setSel(n); }} className="accent-[rgb(var(--violet))]" /></td>}
                        {expand && <td className="pl-2" onClick={(e) => { e.stopPropagation(); const n = new Set(open); n.has(k) ? n.delete(k) : n.add(k); setOpen(n); }}><button className="btn-icon h-6 w-6" aria-label="Expand row"><ChevronDown size={14} className={cls('transition', isOpen && 'rotate-180')} /></button></td>}
                        {visible.map((c) => <td key={c.key} className={cls('px-3', dense || compact ? 'py-1.5' : 'py-2.5', c.align === 'right' ? 'text-right tnum' : c.align === 'center' ? 'text-center' : '', c.className)}>{c.render ? c.render(r) : String(val(c, r) ?? '—')}</td>)}
                        {rowActions && <td className="pr-2 text-right" onClick={(e) => e.stopPropagation()}><RowMenu actions={rowActions(r).filter((a) => !a.hidden)} row={r} /></td>}
                      </tr>
                      {expand && isOpen && <tr className="bg-surface2/60 border-b border-line"><td colSpan={visible.length + 3} className="px-4 py-3">{expand(r)}</td></tr>}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* mobile cards */}
          <ul className="md:hidden divide-y divide-line">
            {slice.map((r, i) => {
              const k = rid(r, i);
              const title = cols.find((c) => c.mobile === 'title') || cols[0];
              const sub = cols.filter((c) => c.mobile === 'sub');
              const right = cols.find((c) => c.mobile === 'right');
              const meta = cols.filter((c) => c.mobile === 'meta');
              const rest = sub.length || meta.length ? [] : cols.slice(1, 3);
              return (
                <li key={k} onClick={() => onRow?.(r)} className={cls('px-3.5 py-3 flex gap-3 active:bg-surface2', sel.has(k) && 'bg-violet/[.06]')}>
                  {canSelect && <input type="checkbox" checked={sel.has(k)} onClick={(e) => e.stopPropagation()} onChange={() => { const n = new Set(sel); n.has(k) ? n.delete(k) : n.add(k); setSel(n); }} className="mt-1 accent-[rgb(var(--violet))]" aria-label="Select row" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[13.5px] min-w-0 truncate">{title.render ? title.render(r) : String(val(title, r) ?? '')}</div>
                      {right && <div className="shrink-0 text-[13px] font-semibold tnum">{right.render ? right.render(r) : val(right, r)}</div>}
                    </div>
                    {[...sub, ...rest].map((c) => <div key={c.key} className="text-[12px] text-muted truncate mt-0.5">{c.render ? c.render(r) : String(val(c, r) ?? '')}</div>)}
                    {meta.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">{meta.map((c) => <span key={c.key} className="text-[11.5px]">{c.render ? c.render(r) : String(val(c, r) ?? '')}</span>)}</div>}
                    {expand && open.has(k) && <div className="mt-2 pt-2 border-t border-line" onClick={(e) => e.stopPropagation()}>{expand(r)}</div>}
                  </div>
                  <div className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {rowActions && <RowMenu actions={rowActions(r).filter((a) => !a.hidden)} row={r} />}
                    {expand && <button className="btn-icon h-7 w-7" aria-label="Expand" onClick={() => { const n = new Set(open); n.has(k) ? n.delete(k) : n.add(k); setOpen(n); }}><ChevronDown size={14} className={cls(open.has(k) && 'rotate-180')} /></button>}
                  </div>
                </li>
              );
            })}
          </ul>
          {/* pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-line text-[12px] text-muted">
            <div className="flex items-center gap-2">
              <span className="tnum">{pg * size + 1}–{Math.min(filtered.length, pg * size + size)} of {filtered.length}</span>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="input h-7 w-[72px] text-[12px] py-0" aria-label="Rows per page">{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <div className="flex items-center gap-1">
              <button className="btn-icon h-7 w-7" disabled={pg === 0} onClick={() => setPage(pg - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>
              <span className="tnum px-1">Page {pg + 1} / {pages}</span>
              <button className="btn-icon h-7 w-7" disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)} aria-label="Next page"><ChevronRight size={15} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu<T>({ actions, row }: { actions: RowAction<T>[]; row: T }) {
  const [o, setO] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!actions.length) return null;
  return (
    <div className="relative inline-block" ref={ref}>
      <button className="btn-icon h-7 w-7" onClick={() => setO(!o)} aria-label="Row actions"><MoreHorizontal size={15} /></button>
      {o && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setO(false)} />
          <div className="absolute right-0 top-8 z-40 card shadow-pop py-1 w-48 animate-in text-left">
            {actions.map((a) => { const I = a.icon; return <button key={a.label} onClick={() => { setO(false); a.onClick(row); }} className={cls('w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] hover:bg-surface2', a.tone === 'bad' && 'text-bad')}>{I && <I size={13} />}{a.label}</button>; })}
          </div>
        </>
      )}
    </div>
  );
}
