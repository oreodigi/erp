// Order Board – every open order / LR as a card in its pipeline stage. Late cards turn amber then red,
// with the reason and who it is waiting on. One button (or drag to the next column) runs the next step.
import React, { useMemo, useState } from 'react';
import { useDB, useUI, lookup } from '../store/store';
import { allCards, stageSummary, STAGES, stageIdx, Card, StageKey } from '../lib/stages';
import { runStep } from '../components/QuickActions';
import { useT } from '../lib/useT';
import { PageHeader, Select, Segmented } from '../components/ui';
import { compactINR, cls, daysBetween } from '../lib/util';
import { Timer, Truck, TrainFront, ClipboardList, AlertTriangle, Search, Clock, User, ChevronRight, Filter, X } from 'lucide-react';

const PAGE = 25;
const sortCards = (a: Card, b: Card) => {
  const r = (c: Card) => (c.health === 'stuck' ? 2 : c.health === 'warn' ? 1 : 0);
  return r(b) - r(a) || (b.age - b.limit) - (a.age - a.limit) || b.age - a.age;
};

export function OrderBoard() {
  const t = useT();
  const db = useDB();
  const params = useUI((s) => s.params);
  const openRecord = useUI((s) => s.openRecord);
  const guide = useUI((s) => s.guide);
  const toast = useUI((s) => s.toast);
  const doQuick = useUI((s) => s.doQuick);
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState(params.branch || '');
  const [cust, setCust] = useState(params.customer || '');
  const [mode, setMode] = useState('all');
  const [late, setLate] = useState(params.late === '1');
  const [period, setPeriod] = useState('open');
  const [mobileStage, setMobileStage] = useState<StageKey>((params.stage as StageKey) || 'transit');
  const [focus, setFocus] = useState<StageKey | ''>((params.stage as StageKey) || '');
  const [more, setMore] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<Record<string, Set<string>>>({});
  const [drag, setDrag] = useState<Card | null>(null);
  const all = allCards(db);
  const cards = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all.filter((c) => {
      if (branch && c.branchId !== branch) return false;
      if (cust && c.customerId !== cust) return false;
      if (mode === 'road' && c.mode !== 'Road') return false;
      if (mode === 'rail' && c.mode === 'Road') return false;
      if (late && c.health !== 'stuck') return false;
      if (c.stage === 'paid' && daysBetween(c.since?.slice(0, 10) || c.date) > 30) return false;
      if (period !== 'open' && daysBetween(c.date) > Number(period)) return false;
      if (qq && !`${c.no} ${c.customer} ${c.route} ${c.vehicle}`.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [all, q, branch, cust, mode, late, period]);
  const sums = stageSummary(cards);
  const worst = [...sums].filter((s) => s.key !== 'paid').sort((a, b) => b.stuckValue - a.stuckValue || b.stuck - a.stuck)[0];
  const custOpts = useMemo(() => { const ids = new Set(all.map((c) => c.customerId)); return db.customers.filter((c: any) => ids.has(c.id)).map((c: any) => ({ value: c.id, label: c.name })); }, [db, all]);
  const branchOpts = db.branches.filter((b: any) => b.active !== false).map((b: any) => ({ value: b.id, label: b.name }));
  const filtersOn = !!(branch || cust || mode !== 'all' || late || period !== 'open' || q);

  const onDrop = (stage: StageKey) => {
    const c = drag; setDrag(null);
    if (!c || c.stage === stage) return;
    if (stageIdx(stage) !== stageIdx(c.stage) + 1 && !(c.stage === 'transit' && stage === 'delivered')) return toast('Move one step at a time', 'warn', `Next step for ${c.no}: ${c.next?.label || 'open the record'}`);
    if (c.next) runStep(c.next.action, c.refId);
  };

  const Column = (s: (typeof sums)[number]) => {
    const list = cards.filter((c) => c.stage === s.key).sort(sortCards);
    const n = more[s.key] || PAGE;
    const bulk = s.key === 'delivered' ? 'pod' : s.key === 'pod' ? 'bill' : '';
    const picked = sel[s.key] || new Set<string>();
    return (
      <section key={s.key} aria-label={t(s.label)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(s.key)}
        className={cls('flex flex-col min-h-0 rounded-xl bg-surface2/70 border border-line w-full lg:w-[292px] shrink-0', focus && focus !== s.key && 'lg:opacity-60', drag && stageIdx(s.key) === stageIdx(drag.stage) + 1 && 'ring-2 ring-violet/50')}>
        <header className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[13.5px] flex-1 truncate">{t(s.label)}</h2>
            <span className="text-[12px] tnum font-semibold text-muted">{s.count.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11.5px]">
            <span className="tnum text-muted">{compactINR(s.value)}</span>
            {s.stuck > 0 && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-bad/10 text-bad px-2 py-0.5 font-semibold"><AlertTriangle size={11} /> {t('{n} late', { n: s.stuck.toLocaleString('en-IN') })}</span>}
            {s.stuck === 0 && s.warn > 0 && <span className="ml-auto rounded-full bg-warn/10 text-warn px-2 py-0.5 font-semibold">{t('{n} due soon', { n: s.warn })}</span>}
          </div>
          {guide && <p className="text-[11.5px] text-muted mt-1.5 leading-snug">{t(s.help)}</p>}
          {bulk && list.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {picked.size > 0 ? <>
                <button className="btn-primary h-8 text-[12px] flex-1" onClick={() => { doQuick(bulk, list.filter((c) => picked.has(c.id)).map((c) => c.refId)); setSel({ ...sel, [s.key]: new Set() }); }}>{bulk === 'pod' ? t('POD received · {n}', { n: picked.size }) : t('Make bill · {n}', { n: picked.size })}</button>
                <button className="btn-ghost h-8 text-[12px]" onClick={() => setSel({ ...sel, [s.key]: new Set() })} aria-label={t('Clear selection')}><X size={13} /></button>
              </> : <button className="btn-ghost h-8 text-[12px] w-full" onClick={() => setSel({ ...sel, [s.key]: new Set(list.slice(0, n).filter((c) => c.kind === 'lr').map((c) => c.id)) })}>{t('Select {n} shown', { n: Math.min(n, list.length) })}</button>}
            </div>
          )}
        </header>
        <div className="flex-1 overflow-y-auto px-2 pb-2 grid gap-2 content-start lg:max-h-[calc(100vh-330px)]">
          {list.slice(0, n).map((c) => <BoardCard key={c.id} c={c} selectable={!!bulk && c.kind === 'lr'} selected={picked.has(c.id)} onSelect={() => { const p = new Set(picked); p.has(c.id) ? p.delete(c.id) : p.add(c.id); setSel({ ...sel, [s.key]: p }); }} onOpen={() => openRecord(c.kind === 'lr' ? 'lr' : 'order', c.refId)} onDrag={() => setDrag(c)} />)}
          {!list.length && <p className="text-center text-[12px] text-faint py-8">{t('Nothing here')}</p>}
          {list.length > n && <button className="h-9 rounded-lg border border-dashed border-line text-[12px] font-semibold text-violet" onClick={() => setMore({ ...more, [s.key]: n + PAGE })}>{t('Show {n} more of {total}', { n: Math.min(PAGE, list.length - n), total: (list.length - n).toLocaleString('en-IN') })}</button>}
        </div>
      </section>
    );
  };

  return (
    <div>
      <PageHeader eyebrow={t('Track every consignment')} title={t('Order Board')} subtitle={t('Each card is an order or LR in its current stage. Red = late, amber = due soon. Press the button on a card (or drag it to the next column) to do the next step.')} actions={<button className="btn-ghost h-9" onClick={() => useUI.getState().nav('admin/time-limits')}><Timer size={15} /> {t('Time limits')}</button>} />
      {/* Stage strip */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-3" role="tablist" aria-label={t('Stages')}>
        {sums.map((s) => (
          <button key={s.key} role="tab" aria-selected={focus === s.key} onClick={() => { setFocus(focus === s.key ? '' : s.key); setMobileStage(s.key); }}
            className={cls('card px-3 py-2 text-left transition hover:border-violet/40', focus === s.key && 'border-violet ring-1 ring-violet/30')}>
            <div className="text-[11.5px] text-muted truncate">{t(s.short)}</div>
            <div className="flex items-baseline gap-1.5"><span className="font-display text-[19px] font-semibold tnum">{s.count.toLocaleString('en-IN')}</span>{s.stuck > 0 && <span className="text-[11.5px] font-bold text-bad tnum">{t('{n} late', { n: s.stuck.toLocaleString('en-IN') })}</span>}</div>
          </button>
        ))}
      </div>
      {worst && worst.stuck > 0 && (
        <div className="rounded-xl border border-bad/30 bg-bad/[.06] px-4 py-3 mb-3 flex flex-wrap items-center gap-3" role="status">
          <AlertTriangle size={18} className="text-bad shrink-0" />
          <div className="flex-1 min-w-[220px] text-[13.5px]"><b>{t('Biggest blockage: {stage}', { stage: t(worst.label) })}</b> – {t('{n} late', { n: worst.stuck.toLocaleString('en-IN') })}{worst.stuckValue ? ` · ${t('{amount} held up', { amount: compactINR(worst.stuckValue) })}` : ''}. <span className="text-muted">{t('Waiting on {owner}.', { owner: t(worst.owner).toLowerCase() })}</span></div>
          <button className="btn-primary h-9" onClick={() => { setFocus(worst.key); setMobileStage(worst.key); setLate(true); }}>{t('Show only these')}</button>
        </div>
      )}
      {/* Filters */}
      <div className="card p-2.5 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-8" placeholder={t('Search LR, customer, truck, city…')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Search board')} /></div>
        <div className="w-full sm:w-48"><Select value={branch} onChange={(e) => setBranch(e.target.value)} placeholder={t('All branches')} options={branchOpts} native={branchOpts.length <= 8} aria-label={t('Branch')} /></div>
        <div className="w-full sm:w-56"><Select value={cust} onChange={(e) => setCust(e.target.value)} placeholder={t('All customers')} options={custOpts} aria-label={t('Customer')} /></div>
        <Segmented size="sm" options={[{ key: 'all', label: t('All') }, { key: 'road', label: t('Road') }, { key: 'rail', label: t('Rail') }]} value={mode} onChange={setMode} />
        <Segmented size="sm" options={[{ key: 'open', label: t('All open') }, { key: '30', label: t('30 days') }, { key: '90', label: t('90 days') }]} value={period} onChange={setPeriod} />
        <button onClick={() => setLate(!late)} aria-pressed={late} className={cls('h-9 px-3 rounded-lg border text-[12.5px] font-semibold inline-flex items-center gap-1.5', late ? 'bg-bad text-white border-bad' : 'border-line text-muted')}><AlertTriangle size={14} /> {t('Late only')}</button>
        {filtersOn && <button className="text-[12.5px] link" onClick={() => { setQ(''); setBranch(''); setCust(''); setMode('all'); setLate(false); setPeriod('open'); setFocus(''); }}>{t('Clear')}</button>}
      </div>
      {/* Mobile: one stage at a time */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">{sums.map((s) => <button key={s.key} onClick={() => setMobileStage(s.key)} className={cls('h-9 px-3 rounded-full border text-[12.5px] font-semibold whitespace-nowrap shrink-0', mobileStage === s.key ? 'bg-ink text-surface border-ink' : 'border-line')}>{t(s.short)} {s.count}{s.stuck ? <span className="text-bad"> · {s.stuck}</span> : ''}</button>)}</div>
        {Column(sums.find((s) => s.key === mobileStage)!)}
      </div>
      <div className="hidden lg:flex gap-3 overflow-x-auto pb-3 items-start" style={{ scrollbarGutter: 'stable' }}>
        {sums.map((s) => Column(s))}
      </div>
    </div>
  );
}

function BoardCard({ c, selectable, selected, onSelect, onOpen, onDrag }: { c: Card; selectable: boolean; selected: boolean; onSelect: () => void; onOpen: () => void; onDrag: () => void }) {
  const t = useT();
  // reason/sub may be joined with ' · ' (e.g. 'X · customer on credit hold') – translate each fixed part.
  const tp = (s: string) => s.split(' · ').map((x) => t(x)).join(' · ');
  const MI = c.kind === 'order' ? ClipboardList : c.mode === 'Road' ? Truck : TrainFront;
  return (
    <article draggable onDragStart={onDrag} className={cls('rounded-lg bg-surface border shadow-[0_1px_0_rgb(0_0_0/.03)] relative overflow-hidden', c.health === 'stuck' ? 'border-bad/40' : c.health === 'warn' ? 'border-warn/50' : 'border-line', selected && 'ring-2 ring-violet')}>
      <span className={cls('absolute left-0 inset-y-0 w-1', c.health === 'stuck' ? 'bg-bad' : c.health === 'warn' ? 'bg-warn' : 'bg-transparent')} />
      <button className="w-full text-left px-3 pt-2.5 pb-2 pl-3.5" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <MI size={13} className="shrink-0" /><span className="docno text-[11.5px] text-ink truncate">{c.no}</span>
          <span className={cls('ml-auto shrink-0 rounded px-1.5 py-px font-semibold tnum', c.health === 'stuck' ? 'bg-bad/10 text-bad' : c.health === 'warn' ? 'bg-warn/10 text-warn' : 'bg-surface2 text-muted')}>
            {c.stage === 'paid' ? t('Done') : c.health === 'stuck' ? t('Late {n}d', { n: Math.max(1, Math.round(c.age - c.limit)) }) : t('{n}d', { n: c.age })}
          </span>
        </div>
        <div className="font-semibold text-[13px] mt-1 leading-snug line-clamp-2">{c.customer}</div>
        <div className="text-[12px] text-muted truncate">{c.route}</div>
        <div className="flex items-center gap-2 mt-1 text-[11.5px] text-muted"><span className="truncate">{tp(c.sub)}{c.vehicle ? ` · ${c.vehicle}` : ''}</span>{c.amount ? <span className="ml-auto tnum font-semibold text-ink shrink-0">{compactINR(c.amount)}</span> : null}</div>
        {c.reason && <div className={cls('mt-1.5 text-[11.5px] font-semibold flex items-center gap-1', c.health === 'stuck' ? 'text-bad' : 'text-warn')}><Clock size={11} className="shrink-0" /><span className="truncate">{tp(c.reason)}</span></div>}
        {c.health !== 'ok' && c.stage !== 'paid' && <div className="text-[11px] text-faint mt-0.5 flex items-center gap-1"><User size={11} /> {t('Waiting on {owner}', { owner: t(c.owner) })}</div>}
      </button>
      {(c.next || selectable) && (
        <div className="flex items-center gap-2 px-3 pb-2.5 pl-3.5">
          {selectable && <input type="checkbox" checked={selected} onChange={onSelect} aria-label={t('Select {name}', { name: c.no })} className="w-4 h-4 accent-[rgb(var(--violet))]" />}
          {c.next && <button onClick={() => runStep(c.next!.action, c.refId)} className={cls('ml-auto h-8 px-3 rounded-md text-[12px] font-semibold inline-flex items-center gap-1', c.health === 'stuck' ? 'bg-brand text-white' : 'bg-violet/10 text-violet hover:bg-violet/15')}>{t(c.next.label)}<ChevronRight size={13} /></button>}
        </div>
      )}
    </article>
  );
}
