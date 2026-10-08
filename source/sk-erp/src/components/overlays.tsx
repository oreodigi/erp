import { useT } from '../lib/useT';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, XCircle, Search, CornerDownLeft, ArrowRight, Check } from 'lucide-react';
import { useUI, useDB, lookup, lrStage } from '../store/store';
import { cls, fmtDT, ago } from '../lib/util';
import { ALL_ITEMS } from '../nav';

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-3xl', headerExtra }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: string; headerExtra?: React.ReactNode }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgb(var(--side)/.45)] backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div className={cls('relative w-full h-full bg-bg flex flex-col shadow-pop animate-slide sm:border-l border-line', width)}>
        <header className="bg-surface border-b border-line px-4 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[19px] font-semibold leading-tight truncate">{title}</div>
            {subtitle && <div className="text-[12.5px] text-muted mt-0.5">{subtitle}</div>}
          </div>
          {headerExtra}
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <footer className="bg-surface border-t border-line px-4 sm:px-5 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] flex flex-wrap gap-2 justify-end">{footer}</footer>}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[rgb(var(--side)/.5)] backdrop-blur-[2px] animate-in" onClick={onClose} />
      <div className={cls('relative w-full bg-surface rounded-t-2xl sm:rounded-xl shadow-pop flex flex-col max-h-[92vh] animate-up sm:animate-in', w)}>
        <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
          <div className="font-display text-[17px] font-semibold">{title}</div>
          <button onClick={onClose} className="btn-icon" aria-label="Close"><X size={17} /></button>
        </header>
        <div className="p-5 overflow-y-auto scrollbar-thin">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-line flex flex-wrap justify-end gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function ConfirmHost() {
  const c = useUI((s) => s.confirm);
  const set = useUI((s) => s.set);
  const tt = useT();
  if (!c) return null;
  return (
    <Modal open onClose={() => set({ confirm: null })} title={tt(c.title)} size="sm" footer={<>
      <button className="btn-ghost" onClick={() => set({ confirm: null })}>{tt('Cancel')}</button>
      <button className={c.tone === 'bad' ? 'btn-bad' : 'btn-primary'} onClick={() => { c.onConfirm(); set({ confirm: null }); }}>{tt(c.confirmLabel || 'Confirm')}</button>
    </>}>
      <p className="text-[13.5px] text-muted">{typeof c.body === 'string' ? tt(c.body) : c.body}</p>
    </Modal>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  const tt = useT();
  const I = { ok: CheckCircle2, bad: XCircle, warn: AlertTriangle, info: Info };
  const C = { ok: 'text-ok', bad: 'text-bad', warn: 'text-warn', info: 'text-info' };
  return (
    <div className="fixed z-[80] bottom-[calc(env(safe-area-inset-bottom,0px)+76px)] md:bottom-5 right-3 left-3 md:left-auto md:w-96 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => { const Ic = I[t.tone]; return (
        <div key={t.id} className="pointer-events-auto card shadow-pop px-3.5 py-3 flex gap-3 items-start animate-up">
          <Ic size={18} className={cls('shrink-0 mt-px', C[t.tone])} />
          <div className="flex-1 min-w-0"><div className="font-semibold text-[13px]">{tt(t.title)}</div>{t.body && <div className="text-[12px] text-muted mt-0.5">{typeof t.body === 'string' ? tt(t.body) : t.body}</div>}</div>
          <button onClick={() => dismiss(t.id)} className="text-faint hover:text-ink" aria-label="Dismiss"><X size={14} /></button>
        </div>); })}
    </div>
  );
}

export function Timeline({ items }: { items: { at: string; label: string; by?: string; tone?: string }[] }) {
  return (
    <ol className="relative">
      {items.map((e, i) => (
        <li key={i} className="flex gap-3 pb-4 last:pb-0 relative">
          {i < items.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-line" />}
          <span className={cls('w-[15px] h-[15px] rounded-full border-[3px] shrink-0 mt-0.5 bg-surface', i === items.length - 1 ? 'border-brand' : 'border-violet/60')} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium">{e.label}</div>
            <div className="text-[11.5px] text-muted">{fmtDT(e.at)}{e.by && ` · ${e.by}`}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WorkflowStepper({ steps, current, compact }: { steps: string[]; current: number; compact?: boolean }) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <ol className="flex items-center min-w-max gap-0">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1 w-[76px]">
              <span className={cls('w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold border-2 transition', i < current ? 'bg-violet border-violet text-white' : i === current ? 'border-brand text-brand bg-brand/10' : 'border-line text-faint bg-surface')}>{i < current ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
              {!compact && <span className={cls('text-[10.5px] text-center leading-tight font-semibold', i <= current ? 'text-ink' : 'text-faint')}>{s}</span>}
            </div>
            {i < steps.length - 1 && <span className={cls('h-0.5 w-6 -mx-3 mb-4 rounded', i < current ? 'bg-violet' : 'bg-line')} />}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CommandPalette() {
  const open = useUI((s) => s.palette);
  const set = useUI((s) => s.set);
  const nav = useUI((s) => s.nav);
  const openRecord = useUI((s) => s.openRecord);
  const db = useDB();
  const t = useT();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); set({ palette: !useUI.getState().palette }); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [set]);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => ref.current?.focus(), 30); } }, [open]);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const actions = [
      { label: 'New Order', hint: 'Operations', run: () => nav('ops/orders', { new: 1 }) }, { label: 'Generate LR', hint: 'Operations', run: () => nav('ops/lr-new') },
      { label: 'New Delivery Challan', hint: 'Operations', run: () => nav('ops/dc', { new: 1 }) }, { label: 'Generate GRN', hint: 'Rail head', run: () => nav('ops/grn', { new: 1 }) },
      { label: 'Start Trip', hint: 'Fleet', run: () => nav('fleet/trips', { new: 1 }) }, { label: 'New Job Card', hint: 'Workshop', run: () => nav('ws/jobcards', { new: 1 }) },
      { label: 'Generate Bill', hint: 'Finance', run: () => nav('fin/billing') }, { label: 'Record client payment', hint: 'Finance', run: () => nav('fin/client-payments') },
    ].map((a) => ({ ...a, group: 'Actions', fixed: true }));
    const pages = ALL_ITEMS.map((p) => ({ label: p.label, hint: p.groupLabel, run: () => nav(p.key), group: 'Pages', fixed: true }));
    const recs: { label: string; hint: string; run: () => void; group: string; fixed?: boolean }[] = [
      ...db.lrs.map((l: any) => ({ label: l.lrNo, hint: `${lookup.custName(db, l.consignorId)} · ${l.source} → ${l.destination} · ${lrStage(db, l)}`, run: () => openRecord('lr', l.id), group: 'LRs' })),
      ...db.orders.map((o: any) => ({ label: o.orderNo, hint: `${lookup.custName(db, o.clientId)} · ${o.status}`, run: () => openRecord('order', o.id), group: 'Orders' })),
      ...db.customers.map((c: any) => ({ label: c.name, hint: t('Customer · {city}', { city: lookup.cityName(db, c.city) }), run: () => openRecord('customer', c.id), group: 'Customers' })),
      ...db.trucks.map((tk: any) => ({ label: tk.number, hint: t('{type} truck · {capacity}', { type: tk.type, capacity: tk.capacity }), run: () => openRecord('truck', tk.id), group: 'Trucks' })),
      ...db.schedules.map((s: any) => ({ label: s.rakeNo, hint: `${s.title} · ${s.status}`, run: () => openRecord('rake', s.id), group: 'Rakes' })),
      ...db.bills.filter((b: any) => !b.deleted).map((b: any) => ({ label: b.billNo, hint: `${lookup.custName(db, b.clientId)} · ₹${b.net.toLocaleString('en-IN')}`, run: () => openRecord('bill', b.id), group: 'Bills' })),
      ...db.dcs.map((d: any) => ({ label: d.dcNo, hint: t('Delivery challan · {status}', { status: d.status }), run: () => openRecord('dc', d.id), group: 'Challans' })),
      ...db.jobcards.map((j: any) => ({ label: j.no, hint: t('Job card · {truck} · {status}', { truck: lookup.truckNo(db, j.truckId), status: j.status }), run: () => openRecord('jobcard', j.id), group: 'Job cards' })),
      ...db.trips.map((tp: any) => ({ label: tp.name, hint: t('Trip · {truck}', { truck: lookup.truckNo(db, tp.truckId) }), run: () => openRecord('trip', tp.id), group: 'Trips' })),
      ...db.pos.map((p: any) => ({ label: p.no, hint: t('Purchase order · {status}', { status: p.status }), run: () => openRecord('po', p.id), group: 'Purchase orders' })),
    ];
    if (!s) return [...actions, ...pages.slice(0, 8)];
    const match = (x: any) => (x.label + ' ' + x.hint + (x.fixed ? ' ' + t(x.label) + ' ' + t(x.hint) : '')).toLowerCase().includes(s);
    return [...actions.filter(match), ...pages.filter(match), ...recs.filter(match)].slice(0, 40);
  }, [q, db, t]);
  if (!open) return null;
  const go = (r: any) => { set({ palette: false }); r.run(); };
  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 pt-[10vh]" role="dialog" aria-modal="true" aria-label={t('Command palette')}>
      <div className="absolute inset-0 bg-[rgb(var(--side)/.5)] backdrop-blur-[2px]" onClick={() => set({ palette: false })} />
      <div className="relative w-full max-w-xl card shadow-pop overflow-hidden animate-in">
        <div className="flex items-center gap-2 px-4 border-b border-line">
          <Search size={16} className="text-muted" />
          <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, results.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); } if (e.key === 'Enter' && results[i]) go(results[i]); if (e.key === 'Escape') set({ palette: false }); }} placeholder={t('Search LR, order, truck, customer, page… or run an action')} className="flex-1 h-12 bg-transparent outline-none text-[14px]" />
          <span className="kbd">Esc</span>
        </div>
        <ul className="max-h-[56vh] overflow-y-auto py-1.5 scrollbar-thin">
          {results.length === 0 && <li className="px-4 py-6 text-center text-muted text-[13px]">{t('No results for “{q}”.', { q })}</li>}
          {results.map((r, k) => {
            const head = r.group !== lastGroup ? (lastGroup = r.group) : null;
            return (
              <React.Fragment key={k}>
                {head && <li className="eyebrow px-4 pt-2 pb-1">{t(head)}</li>}
                <li><button onMouseEnter={() => setI(k)} onClick={() => go(r)} className={cls('w-full flex items-center gap-3 px-4 py-2 text-left', i === k && 'bg-violet/[.08]')}>
                  <span className={cls('font-semibold text-[13px]', ['LRs', 'Orders', 'Bills', 'Challans', 'Job cards', 'Trips', 'Rakes', 'Purchase orders'].includes(r.group) && 'docno')}>{r.fixed ? t(r.label) : r.label}</span>
                  <span className="text-[12px] text-muted truncate flex-1">{r.fixed ? t(r.hint) : r.hint}</span>
                  {i === k ? <CornerDownLeft size={13} className="text-muted" /> : <ArrowRight size={13} className="text-faint opacity-0" />}
                </button></li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function ActivityFeed({ items, limit = 10 }: { items: any[]; limit?: number }) {
  const openRecord = useUI((s) => s.openRecord);
  return (
    <ul className="divide-y divide-line/70">
      {items.slice(0, limit).map((a) => (
        <li key={a.id} className="py-2.5 flex gap-3 items-start">
          <span className="w-1.5 h-1.5 rounded-full bg-violet mt-2 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[12.75px]"><span className="font-medium">{a.text}</span>{a.ref && <> · <button className="docno text-violet hover:underline" onClick={() => a.refId && ['lr', 'order', 'bill', 'rake', 'dc', 'jobcard', 'trip', 'po'].includes(a.refType) && openRecord(a.refType, a.refId)}>{a.ref}</button></>}</div>
            <div className="text-[11.5px] text-muted">{a.by} · {ago(a.at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
