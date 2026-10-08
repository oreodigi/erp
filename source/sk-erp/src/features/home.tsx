// Home – simple, role-based dashboard: today in 4 numbers, the consignment pipeline with late items,
// what needs doing now, and only the panels that role cares about.
import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, lookup, truckStatus, outstanding } from '../store/store';
import { useRole } from '../components/AppShell';
import { allCards, stageSummary, STAGES } from '../lib/stages';
import { buildGroups } from './work';
import { useT } from '../lib/useT';
import { ControlTowerMap } from './dashboard';
import { runStep } from '../components/QuickActions';
import { ChartCard, Bars } from '../components/charts';
import { Segmented, Avatar } from '../components/ui';
import { compactINR, daysBetween, fmtDate, cls, sum, ymd, addDays, now, groupBy, inr } from '../lib/util';
import { ArrowRight, AlertTriangle, PackagePlus, ListChecks, Truck, TrainFront, IndianRupee, Wrench, Sparkles, ChevronRight, Clock, CheckCircle2, Columns3, Eraser, CalendarClock, Settings2, RotateCcw, ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';
import { fetchDashboardLayout, saveDashboardLayout, type DashboardLayoutItem } from '../lib/api';

type View = 'mgmt' | 'ops' | 'acc' | 'fleet';
const viewFor = (code: string): View => (['AC'].includes(code) ? 'acc' : ['CO', 'SI'].includes(code) ? 'fleet' : ['OP', 'BU', 'CC'].includes(code) ? 'ops' : 'mgmt');
const DEFAULT_LAYOUT: DashboardLayoutItem[] = [{ id: 'today', span: 4 }, { id: 'pipeline', span: 4 }, { id: 'operations', span: 4 }, { id: 'management', span: 4 }, { id: 'trend', span: 4 }, { id: 'cleanup', span: 4 }];
const SPAN_CLASS: Record<number, string> = { 1: 'lg:col-span-1', 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4' };

function DashboardFrame({ id, layout, editing, children, onMove, onResize }: { id: string; layout: DashboardLayoutItem[]; editing: boolean; children: React.ReactNode; onMove: (id: string, direction: -1 | 1) => void; onResize: (id: string, amount: -1 | 1) => void }) {
  const item = layout.find(x => x.id === id) || DEFAULT_LAYOUT.find(x => x.id === id)!;
  const index = layout.findIndex(x => x.id === id);
  return <div className={cls('min-w-0', SPAN_CLASS[item.span])} style={{ order: index < 0 ? 99 : index }}>
    {editing && <div className="flex items-center gap-1 mb-1.5 rounded-lg border border-dashed border-violet/50 bg-violet/[.05] px-2 py-1 text-[11px] text-violet"><Settings2 size={12} /><span className="flex-1 font-semibold capitalize">{id.replace('-', ' ')}</span><button className="btn-icon !h-6 !w-6" title="Move up" onClick={() => onMove(id, -1)}><ChevronUp size={13} /></button><button className="btn-icon !h-6 !w-6" title="Move down" onClick={() => onMove(id, 1)}><ChevronDown size={13} /></button><button className="btn-icon !h-6 !w-6" title="Make narrower" onClick={() => onResize(id, -1)} disabled={item.span <= 1}><Minus size={13} /></button><span className="w-5 text-center">{item.span}/4</span><button className="btn-icon !h-6 !w-6" title="Make wider" onClick={() => onResize(id, 1)} disabled={item.span >= 4}><Plus size={13} /></button></div>}
    {children}
  </div>;
}

export default function Home() {
  const t = useT();
  const db = useDB();
  const { user, role } = useRole();
  const nav = useUI((s) => s.nav);
  const guide = useUI((s) => s.guide);
  const admin = ['SA', 'AD'].includes(role.code);
  const [view, setView] = useState<View>(viewFor(role.code));
  const [layout, setLayout] = useState<DashboardLayoutItem[]>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);
  useEffect(() => { let live = true; fetchDashboardLayout().then(r => { if (!live) return; setLayout(r.layout?.length ? r.layout : DEFAULT_LAYOUT); setLayoutLoaded(true); }).catch(() => { if (live) setLayoutLoaded(true); }); return () => { live = false; }; }, [user.id]);
  const updateLayout = (next: DashboardLayoutItem[]) => { setLayout(next); if (layoutLoaded) void saveDashboardLayout(next).catch(() => useUI.getState().toast('Dashboard layout was not saved', 'bad')); };
  const moveWidget = (id: string, direction: -1 | 1) => { const next = [...layout], index = next.findIndex(x => x.id === id), target = index + direction; if (index < 0 || target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; updateLayout(next); };
  const resizeWidget = (id: string, amount: -1 | 1) => updateLayout(layout.map(x => x.id === id ? { ...x, span: Math.max(1, Math.min(4, x.span + amount)) as 1 | 2 | 3 | 4 } : x));
  const frame = (id: string, content: React.ReactNode) => <DashboardFrame id={id} layout={layout} editing={editingLayout} onMove={moveWidget} onResize={resizeWidget}>{content}</DashboardFrame>;
  const cards = allCards(db);
  const sums = useMemo(() => stageSummary(cards.filter((c) => !(c.stage === 'paid' && daysBetween(c.date) > 30))), [cards]);
  const today = ymd();
  const m = useMemo(() => {
    const lrs = db.lrs.filter((l: any) => l.status !== 'Cancelled');
    const monthStart = today.slice(0, 8) + '01';
    const bills = db.bills.filter((b: any) => !b.deleted);
    const ageing = [[0, 30, '0–30 days'], [31, 60, '31–60'], [61, 90, '61–90'], [91, 99999, '90+ days']].map(([a, z, l]: any) => ({ l, v: sum(bills.filter((b: any) => b.pending > 0 && daysBetween(b.date) >= a && daysBetween(b.date) <= z), (b: any) => b.pending) }));
    const own = db.trucks.filter((t: any) => t.type === 'Own' && t.isActive !== false);
    const st = groupBy(own, (t: any) => truckStatus(db, t));
    const docs = own.filter((t: any) => ['insDue', 'fitDue', 'npDue', 'taxDue'].some((k) => t[k] && daysBetween(t[k]) >= -30));
    return {
      bookedToday: lrs.filter((l: any) => l.placeDate === today).length, revenueToday: sum(lrs.filter((l: any) => l.placeDate === today), (l: any) => l.freight),
      moving: cards.filter((c) => c.stage === 'transit').length, movingLate: cards.filter((c) => c.stage === 'transit' && c.health === 'stuck').length,
      deliveredToday: lrs.filter((l: any) => l.delivery?.date === today).length,
      revenueMTD: sum(lrs.filter((l: any) => l.placeDate >= monthStart), (l: any) => l.freight), billedMTD: sum(bills.filter((b: any) => b.date >= monthStart), (b: any) => b.net),
      collectedMTD: sum(db.clientPayments.filter((p: any) => p.date >= monthStart), (p: any) => p.received + p.tds), outstanding: outstanding(db),
      overdue: sum(cards.filter((c) => c.stage === 'billed' && c.health === 'stuck'), (c) => c.amount), toBill: cards.filter((c) => c.stage === 'pod'), ageing,
      own, st, docs, openTrips: db.trips.filter((t: any) => !t.completed && daysBetween(t.startDate) > 5).length,
      payables: sum(db.tpSlips, (s: any) => s.pending) + sum(db.dcPayslips, (s: any) => s.pending) + sum(db.inwards, (i: any) => i.pending || 0),
      late: cards.filter((c) => c.health === 'stuck' && c.stage !== 'billed' && c.stage !== 'paid').length,
    };
  }, [db, cards, today]);
  const groups = useMemo(() => buildGroups(db), [db]);
  const myGroups = groups.filter((g) => g.items.length && (admin && view === 'mgmt' ? true : g.roles.includes({ ops: 'OP', acc: 'AC', fleet: 'CO', mgmt: 'SA' }[view]) || (view === 'fleet' && g.roles.includes('SI'))));
  const workTotal = myGroups.reduce((a, g) => a + g.items.length, 0);
  const worst = [...sums].filter((s) => s.key !== 'paid').sort((a, b) => b.stuckValue - a.stuckValue || b.stuck - a.stuck)[0];
  const hour = now().getHours();

  const tiles: Record<View, [string, React.ReactNode, string, () => void][]> = {
    mgmt: [[t('Booked today'), m.bookedToday, t('{amt} freight', { amt: compactINR(m.revenueToday) }), () => nav('ops/lr')], [t('On the way'), m.moving, m.movingLate ? t('{n} running late', { n: m.movingLate }) : t('all on time'), () => nav('board', { stage: 'transit' })], [t('Revenue this month'), compactINR(m.revenueMTD), t('billed {amt}', { amt: compactINR(m.billedMTD) }), () => nav('reports')], [t('To collect'), compactINR(m.outstanding), t('{amt} overdue', { amt: compactINR(m.overdue) }), () => nav('fin/receivables')]],
    ops: [[t('Booked today'), m.bookedToday, t('new LRs'), () => nav('ops/lr')], [t('On the way'), m.moving, m.movingLate ? t('{n} running late', { n: m.movingLate }) : t('all on time'), () => nav('board', { stage: 'transit' })], [t('Delivered today'), m.deliveredToday, t('confirmed'), () => nav('board', { stage: 'delivered' })], [t('POD pending'), sums.find((s) => s.key === 'delivered')?.count || 0, t('{n} over 7 days', { n: sums.find((s) => s.key === 'delivered')?.stuck || 0 }), () => nav('board', { stage: 'delivered' })]],
    acc: [[t('Ready to bill'), m.toBill.length, compactINR(sum(m.toBill, (c) => c.amount)), () => nav('board', { stage: 'pod' })], [t('Billed this month'), compactINR(m.billedMTD), t('GST bills'), () => nav('fin/billing')], [t('Collected this month'), compactINR(m.collectedMTD), t('receipts'), () => nav('fin/client-payments')], [t('Overdue'), compactINR(m.overdue), t('past credit days'), () => nav('fin/receivables')]],
    fleet: [[t('Free trucks'), m.st['Available']?.length || 0, t('of {n} own trucks', { n: m.own.length }), () => nav('fleet/trucks')], [t('On trip'), m.st['On Trip']?.length || 0, t('{n} open > 5 days', { n: m.openTrips }), () => nav('fleet/trips')], [t('In workshop'), m.st['Workshop']?.length || 0, t('job cards open'), () => nav('ws/jobcards')], [t('Papers due'), m.docs.length, t('within 30 days'), () => nav('fleet/trucks')]],
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-4 gap-5">
      {/* Greeting */}
      <div className="flex flex-wrap items-end gap-3 lg:col-span-4">
        <div className="flex-1 min-w-[240px]">
          <div className="eyebrow">{fmtDate(today)} · {t(role.name)}</div>
          <h1 className="font-display text-[26px] sm:text-[30px] font-semibold leading-tight">{hour < 12 ? t('Good morning, {name}', { name: user.firstName }) : hour < 17 ? t('Good afternoon, {name}', { name: user.firstName }) : t('Good evening, {name}', { name: user.firstName })}</h1>
          <p className="text-muted text-[14px] mt-0.5">{workTotal ? <>{t('You have')} <button className="link font-semibold" onClick={() => nav('work')}>{t('{n} things to do', { n: workTotal.toLocaleString('en-IN') })}</button>{m.late ? <>{t(', and')} <b className="text-bad">{t('{n} consignments are late', { n: m.late.toLocaleString('en-IN') })}</b></> : ''}.</> : t('Nothing is waiting on you.')}</p>
        </div>
        {admin && <Segmented size="sm" options={[{ key: 'mgmt', label: t('Owner') }, { key: 'ops', label: t('Operations') }, { key: 'acc', label: t('Accounts') }, { key: 'fleet', label: t('Fleet') }]} value={view} onChange={(v: any) => setView(v)} />}
        <div className="flex gap-2">
          <button className={cls('btn-ghost h-11', editingLayout && 'text-violet border-violet/40')} onClick={() => setEditingLayout(v => !v)}><Settings2 size={17} /> {editingLayout ? t('Done') : t('Customize')}</button>
          {editingLayout && <button className="btn-ghost h-11" onClick={() => updateLayout(DEFAULT_LAYOUT)}><RotateCcw size={16} /> {t('Reset dashboard')}</button>}
          <button className="btn-ghost h-11" onClick={() => nav('work')}><ListChecks size={17} /> {t('My Work')}</button>
          <button className="btn-primary h-11" onClick={() => nav('book')}><PackagePlus size={17} /> {t('New booking')}</button>
        </div>
      </div>

      {/* Today */}
      {frame('today', <section aria-label={t('Today')}className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-tour="today">
        {tiles[view].map(([l, v, sub, go]) => (
          <button key={l} onClick={go} className="card p-4 text-left hover:border-violet/40 hover:-translate-y-px transition group">
            <div className="text-[12.5px] text-muted font-semibold">{l}</div>
            <div className="font-display text-[26px] sm:text-[30px] font-semibold tnum leading-tight mt-1">{v}</div>
            <div className="text-[12px] text-muted mt-0.5 flex items-center gap-1">{sub}<ArrowRight size={13} className="ml-auto opacity-0 group-hover:opacity-100 transition" /></div>
          </button>
        ))}
      </section>)}

      {/* Pipeline */}
      {frame('pipeline', <section className="card p-4" aria-label={t('Consignment pipeline')} data-tour="pipeline">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="font-semibold text-[15px] flex-1">{t('Where every consignment is right now')}</h2>
          <button className="btn-ghost h-9" onClick={() => nav('board')}><Columns3 size={15} /> {t('Open Order Board')}</button>
        </div>
        {guide && <p className="text-[12.5px] text-muted -mt-1 mb-3">{t('Each box is a stage. Red numbers are late against the time limit for that stage. Click a box to see those consignments.')}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {sums.map((s, i) => (
            <button key={s.key} onClick={() => nav('board', { stage: s.key })} className={cls('relative rounded-xl border p-3 text-left transition hover:border-violet/50', s.stuck ? 'border-bad/30 bg-bad/[.04]' : 'border-line bg-surface2/50')}>
              <div className="text-[11.5px] font-semibold text-muted truncate">{i + 1}. {t(s.short)}</div>
              <div className="font-display text-[22px] font-semibold tnum leading-tight">{s.count.toLocaleString('en-IN')}</div>
              <div className="text-[11.5px] text-muted tnum truncate">{compactINR(s.value)}</div>
              {s.stuck > 0 ? <div className="text-[11.5px] font-bold text-bad mt-1 flex items-center gap-1"><AlertTriangle size={11} /> {t('{n} late', { n: s.stuck.toLocaleString('en-IN') })}</div> : <div className="text-[11.5px] text-ok font-semibold mt-1 flex items-center gap-1"><CheckCircle2 size={11} /> {t('on time')}</div>}
            </button>
          ))}
        </div>
        {worst && worst.stuck > 0 && (
          <div className="mt-3 rounded-lg bg-bad/[.06] border border-bad/25 px-3 py-2.5 flex flex-wrap items-center gap-2 text-[13px]">
            <AlertTriangle size={16} className="text-bad shrink-0" />
            <span className="flex-1 min-w-[200px]"><b>{t('Biggest blockage:')}</b> {worst.stuckValue ? t('{stage} – {n} late, {amt} held up.', { stage: t(worst.label), n: worst.stuck.toLocaleString('en-IN'), amt: compactINR(worst.stuckValue) }) : t('{stage} – {n} late.', { stage: t(worst.label), n: worst.stuck.toLocaleString('en-IN') })} {t('Waiting on {owner}.', { owner: t(worst.owner).toLowerCase() })}</span>
            <button className="btn-primary h-8 text-[12.5px]" onClick={() => nav('board', { stage: worst.key, late: '1' })}>{t('Fix these')}</button>
          </div>
        )}
      </section>)}

      {frame('operations', <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 items-start">
        {/* Needs action */}
        <section className="card overflow-hidden" aria-label={t('Needs action')} data-tour="actions">
          <div className="flex items-center px-4 py-3 border-b border-line"><h2 className="font-semibold text-[15px] flex-1">{t('Do these next')}</h2><button className="text-[12.5px] link" onClick={() => nav('work')}>{t('All my work')}</button></div>
          <ul className="divide-y divide-line">
            {myGroups.slice(0, 6).map((g) => {
              const I = g.icon, late = g.items.filter((i) => i.stuck).length, first = g.items[0];
              return (
                <li key={g.key} className="flex items-center gap-3 px-4 py-3">
                  <span className={cls('w-10 h-10 rounded-xl grid place-items-center shrink-0', late ? 'bg-bad/10 text-bad' : 'bg-violet/10 text-violet')}><I size={18} /></span>
                  <div className="min-w-0 flex-1"><div className="font-semibold text-[14px] truncate">{t(g.title)}</div><div className="text-[12px] text-muted truncate">{late ? t('{n} waiting · {late} late · next: {title}', { n: g.items.length.toLocaleString('en-IN'), late, title: first.title }) : t('{n} waiting · next: {title}', { n: g.items.length.toLocaleString('en-IN'), title: first.title })}</div></div>
                  <button className={cls('h-9 px-3 rounded-lg text-[12.5px] font-semibold shrink-0', late ? 'bg-brand text-white' : 'border border-line')} onClick={first.act}>{t(g.action)}</button>
                </li>
              );
            })}
            {!myGroups.length && <li className="px-4 py-8 text-center text-muted text-[13px]">{t('All clear – nothing waiting.')}</li>}
          </ul>
        </section>

        {/* Role panel */}
        {view === 'acc' ? <MoneyPanel m={m} nav={nav} db={db} /> : view === 'fleet' ? <FleetPanel m={m} nav={nav} db={db} /> : <LivePanel db={db} cards={cards} nav={nav} />}
      </div>)}

      {view === 'mgmt' && frame('management', <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-5 items-start"><MoneyPanel m={m} nav={nav} db={db} /><BranchPanel db={db} cards={cards} /></div>)}
      {view === 'mgmt' && frame('trend', <TrendPanel db={db} />)}
      {view === 'ops' && frame('management', <FleetPanel m={m} nav={nav} db={db} compact />)}
      {(view === 'mgmt' || view === 'ops') && frame('cleanup', <CleanupPanel cards={cards} nav={nav} />)}
    </div>
  );
}

function LivePanel({ db, cards, nav }: any) {
  const t = useT();
  const moving = cards.filter((c: any) => c.stage === 'transit' && c.kind === 'lr').map((c: any) => db.lrs.find((l: any) => l.id === c.refId)).filter(Boolean);
  const late = cards.filter((c: any) => c.stage === 'transit' && c.health === 'stuck').sort((a: any, b: any) => (b.age - b.limit) - (a.age - a.limit)).slice(0, 5);
  return (
    <section className="card p-4" aria-label={t('Live movement')}>
      <div className="flex items-center mb-3"><h2 className="font-semibold text-[15px] flex-1">{t('Moving now')}</h2><span className="text-[12px] text-muted">{t('{n} consignments', { n: moving.length })}</span></div>
      <ControlTowerMap lrs={moving} schedules={db.schedules} />
      {late.length > 0 && <>
        <div className="text-[12.5px] font-semibold text-bad mt-4 mb-1.5 flex items-center gap-1"><Clock size={13} /> {t('Running late')}</div>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
          {late.map((c: any) => <li key={c.id} className="flex items-center gap-2 text-[12.5px]"><span className="docno text-[12px]">{c.no}</span><span className="truncate text-muted flex-1 min-w-0">{c.route}</span><span className="text-bad font-semibold tnum shrink-0">+{Math.round(c.age - c.limit)}d</span><button className="text-violet font-semibold shrink-0" onClick={() => runStep(c.next?.action || 'open', c.refId)}>{t(c.next?.label || 'Open')}</button></li>)}
        </ul>
      </>}
    </section>
  );
}

function MoneyPanel({ m, nav, db }: any) {
  const t = useT();
  const max = Math.max(1, ...m.ageing.map((a: any) => a.v));
  const top = Object.entries(groupBy(db.bills.filter((b: any) => !b.deleted && b.pending > 0), (b: any) => b.clientId)).map(([k, v]: any) => ({ k, v: sum(v, (b: any) => b.pending) })).sort((a, b) => b.v - a.v).slice(0, 4);
  return (
    <section className="card p-4" aria-label={t('Money')}>
      <div className="flex items-center mb-3"><h2 className="font-semibold text-[15px] flex-1">{t('Money')}</h2><button className="text-[12.5px] link mr-3" onClick={() => nav('fin/cash-plan')}>{t('Cash plan')}</button><button className="text-[12.5px] link" onClick={() => nav('fin/receivables')}>{t('Receivables')}</button></div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[['To collect', m.outstanding], ['Ready to bill', sum(m.toBill, (c: any) => c.amount)], ['We must pay', m.payables]].map(([l, v]: any) => <div key={l} className="rounded-lg bg-surface2 py-2"><div className="text-[11.5px] text-muted">{t(l)}</div><div className="font-semibold tnum text-[15px]">{compactINR(v)}</div></div>)}
      </div>
      <div className="text-[12.5px] font-semibold mb-1.5">{t('How old are unpaid bills?')}</div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        {m.ageing.map((a: any, i: number) => <div key={a.l} className="grid grid-cols-[72px_1fr_70px] items-center gap-2 text-[12px]"><span className="text-muted">{t(a.l)}</span><div className="h-3 rounded bg-surface2 overflow-hidden"><div className={cls('h-full rounded', i === 3 ? 'bg-bad' : i === 2 ? 'bg-warn' : 'bg-violet')} style={{ width: `${(a.v / max) * 100}%` }} /></div><span className="tnum text-right font-semibold">{compactINR(a.v)}</span></div>)}
      </div>
      <div className="text-[12.5px] font-semibold mt-4 mb-1.5">{t('Biggest dues')}</div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">{top.map((t) => <li key={t.k} className="flex items-center gap-2 text-[12.5px]"><Avatar name={lookup.custName(db, t.k)} size={22} /><span className="truncate flex-1 min-w-0">{lookup.custName(db, t.k)}</span><span className="tnum font-semibold">{compactINR(t.v)}</span></li>)}</ul>
      {db.source === 'legacy' && <p className="text-[11.5px] text-faint mt-3">{t('Old ERP: payments were entered in Tally, so most old bills still show as unpaid.')}</p>}
    </section>
  );
}

function FleetPanel({ m, nav, db, compact }: any) {
  const t = useT();
  const tot = Math.max(1, m.own.length);
  const parts = [['Available', 'bg-ok'], ['On Trip', 'bg-violet'], ['Workshop', 'bg-warn']] as const;
  return (
    <section className="card p-4" aria-label={t('Our trucks')}>
      <div className="flex items-center mb-3"><h2 className="font-semibold text-[15px] flex-1">{t('Our trucks')}</h2><button className="text-[12.5px] link mr-3" onClick={() => nav('fleet/journeys')}>{t('Journeys')}</button><button className="text-[12.5px] link" onClick={() => nav('fleet/trucks')}>{t('All trucks')}</button></div>
      <div className="flex h-4 rounded-full overflow-hidden bg-surface2">{parts.map(([k, c]) => <div key={k} className={c} style={{ width: `${((m.st[k]?.length || 0) / tot) * 100}%` }} title={t(k)} />)}</div>
      <div className="flex flex-wrap gap-4 mt-2 text-[12.5px]">{parts.map(([k, c]) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cls('w-2.5 h-2.5 rounded-sm', c)} />{k === 'On Trip' ? t('On trip') : k === 'Workshop' ? t('In workshop') : t('Free')} <b className="tnum">{m.st[k]?.length || 0}</b></span>)}</div>
      {!compact && <>
        <div className="text-[12.5px] font-semibold mt-4 mb-1.5 flex items-center gap-1"><CalendarClock size={13} /> {t('Papers expiring in 30 days')}</div>
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">{m.docs.slice(0, 6).map((t: any) => { const d = [['Insurance', t.insDue], ['Fitness', t.fitDue], ['Permit', t.npDue], ['Tax', t.taxDue]].filter(([, x]) => x && daysBetween(x) >= -30); return <li key={t.id}><button className="w-full flex items-center gap-2 text-[12.5px] text-left" onClick={() => useUI.getState().openRecord('truck', t.id)}><span className="docno text-[12px] shrink-0">{t.number}</span><span className="truncate text-muted flex-1 min-w-0">{d.map(([k, x]: any) => t('{doc} {date}', { doc: t(k), date: fmtDate(x) })).join(' · ')}</span></button></li>; })}{!m.docs.length && <li className="text-[12.5px] text-muted">{t('None')}</li>}</ul>
      </>}
    </section>
  );
}

function BranchPanel({ db, cards }: any) {
  const t = useT();
  const since = ymd(addDays(now(), -30));
  const rows = db.branches.filter((b: any) => b.active !== false).map((b: any) => {
    const l = db.lrs.filter((x: any) => x.fromBranchId === b.id && x.placeDate >= since && x.status !== 'Cancelled');
    const late = cards.filter((c: any) => c.branchId === b.id && c.health === 'stuck' && c.stage !== 'billed' && c.stage !== 'paid').length;
    return { b, n: l.length, rev: sum(l, (x: any) => x.freight), late };
  }).filter((r: any) => r.n || r.late).sort((a: any, b: any) => b.rev - a.rev);
  const max = Math.max(1, ...rows.map((r: any) => r.rev));
  return (
    <section className="card p-4" aria-label={t('Branches')}>
      <h2 className="font-semibold text-[15px] mb-3">{t('Branches – last 30 days')}</h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {rows.map((r: any) => <div key={r.b.id} className="grid grid-cols-[minmax(0,110px)_1fr_auto] items-center gap-2 text-[12.5px]"><span className="truncate font-semibold">{r.b.name.replace(' (Head Office)', '')}</span><div className="h-3 rounded bg-surface2 overflow-hidden"><div className="h-full rounded bg-violet" style={{ width: `${(r.rev / max) * 100}%` }} /></div><span className="tnum text-right whitespace-nowrap">{compactINR(r.rev)} · {t('{n} LR', { n: r.n })}{r.late ? <span className="text-bad font-semibold"> · {t('{n} late', { n: r.late })}</span> : ''}</span></div>)}
        {!rows.length && <p className="text-[12.5px] text-muted">{t('No bookings in the last 30 days.')}</p>}
      </div>
    </section>
  );
}

function TrendPanel({ db }: any) {
  const t = useT();
  const weeks = Array.from({ length: 10 }, (_, i) => { const end = addDays(now(), -7 * (9 - i)), start = addDays(end, -6); const a = ymd(start), z = ymd(end); const l = db.lrs.filter((x: any) => x.placeDate >= a && x.placeDate <= z && x.status !== 'Cancelled'); return { x: fmtDate(z).slice(0, 6), Booked: l.length, Delivered: db.lrs.filter((x: any) => x.delivery?.date >= a && x.delivery?.date <= z).length }; });
  return (
    <ChartCard title={t('Bookings and deliveries – last 10 weeks')} subtitle={t('Number of LRs per week')} height={220} legend={[{ label: t('Booked'), color: 'var(--chart-1)' }, { label: t('Delivered'), color: 'var(--chart-3)' }]}>
      <Bars data={weeks} keys={[{ key: 'Booked', label: t('Booked'), color: 'var(--chart-1)' }, { key: 'Delivered', label: t('Delivered'), color: 'var(--chart-3)' }]} />
    </ChartCard>
  );
}

function CleanupPanel({ cards, nav }: any) {
  const t = useT();
  const rows = [
    ['On the road for more than 30 days', cards.filter((c: any) => c.stage === 'transit' && c.age > 30).length, 'transit', 'Usually delivered long ago but never marked. Confirm with the branch and mark delivered.'],
    ['POD pending for more than 15 days', cards.filter((c: any) => c.stage === 'delivered' && c.age > 15).length, 'delivered', 'Chase the courier or mark POD received in bulk.'],
    ['Draft LRs older than 7 days', cards.filter((c: any) => c.sub === 'LR in draft' && c.age > 7).length, 'vehicle', 'Finish or cancel them.'],
  ].filter((r: any) => r[1] > 0);
  if (!rows.length) return null;
  return (
    <section className="card p-4" aria-label={t('Clean-up')}>
      <div className="flex items-center gap-2 mb-2"><Eraser size={17} className="text-warn" /><h2 className="font-semibold text-[15px] flex-1">{t('Old records to clean up')}</h2></div>
      <p className="text-[12.5px] text-muted mb-3">{t('These came from the old system and were never closed. Cleaning them makes every number on this page true.')}</p>
      <ul className="grid sm:grid-cols-3 gap-2">
        {rows.map(([l, n, st, tip]: any) => <li key={l}><button className="w-full card p-3 text-left hover:border-warn/50" onClick={() => nav('board', { stage: st, late: '1' })}><div className="font-display text-[22px] font-semibold tnum">{n.toLocaleString('en-IN')}</div><div className="text-[13px] font-semibold">{t(l)}</div><div className="text-[12px] text-muted mt-0.5">{t(tip)}</div></button></li>)}
      </ul>
    </section>
  );
}
