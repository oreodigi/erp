// Cash plan – will we have enough money each week? Money in vs money out for the next weeks.
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { useDB, useUI, useStore } from '../store/store';
import { buildCashPlan, CashSettings, DEFAULT_CASH, CashRow } from '../lib/cashplan';
import { PageHeader, KPI, Card, Segmented, Input, Field, Toggle } from '../components/ui';
import { ChartTip } from '../components/charts';
import { compactINR, inr, cls, fmtDate } from '../lib/util';
import { useT } from '../lib/useT';
import { Wallet, ArrowDownLeft, ArrowUpRight, AlertTriangle, TrendingDown, Save, RotateCcw, X, SlidersHorizontal, HandCoins } from 'lucide-react';

const axis = { fontSize: 11, fill: 'rgb(var(--muted))' };

export function CashPlan() {
  const t = useT();
  const lang = useUI((s) => s.lang);
  const db = useDB();
  const { nav, openRecord, toast } = useUI.getState();
  const legacy = useStore((s) => s.source) === 'legacy';
  const saved: CashSettings = { ...DEFAULT_CASH, ...((db as any).cashPlan || {}) };
  const [cfg, setCfg] = useState<CashSettings>(saved);
  const [cell, setCell] = useState<{ row: string; w: number } | null>(null);
  const [showSet, setShowSet] = useState(!saved.opening);
  const plan = useMemo(() => buildCashPlan(db, cfg), [db, cfg, lang]);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);
  const up = (p: Partial<CashSettings>) => setCfg({ ...cfg, ...p });
  const save = () => { useStore.getState().mutate((d: any) => { d.cashPlan = cfg; }); toast('Cash plan settings saved', 'ok'); };

  const totIn = plan.inW.reduce((a, b) => a + b, 0), totOut = plan.outW.reduce((a, b) => a + b, 0);
  const low = Math.min(...plan.closing), lowW = plan.closing.indexOf(low);
  const chart = plan.weeks.map((w, i) => ({ x: w.label, in: plan.inW[i], out: plan.outW[i], bal: plan.closing[i] }));
  const ins = plan.rows.filter((r) => r.dir === 'in'), outs = plan.rows.filter((r) => r.dir === 'out');
  const sel = cell ? plan.rows.find((r) => r.key === cell.row) : null;
  const custOver = useMemo(() => {
    const m = new Map<string, number>(); for (const it of plan.overdueList) m.set(it.label, (m.get(it.label) || 0) + it.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [plan.overdueList]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <PageHeader eyebrow={t('Money')} title={t('Cash plan')} subtitle={t('Money coming in and going out, week by week, for the next {n} weeks. Built from open bills, unbilled LRs, payment slips, truck renewals, salaries and recent spending.', { n: cfg.weeks })}
        actions={<div className="flex flex-wrap gap-2"><Segmented options={[{ key: '4', label: t('4 weeks') }, { key: '8', label: t('8 weeks') }, { key: '12', label: t('12 weeks') }]} value={String(cfg.weeks)} onChange={(v) => { up({ weeks: Number(v) }); setCell(null); }} /><button className="btn-ghost h-9" onClick={() => setShowSet(!showSet)}><SlidersHorizontal size={15} /> {t('Assumptions')}</button></div>} />

      {showSet && <Card title={t('Assumptions')} subtitle={t('Change these and the plan updates straight away. Save to keep them.')} actions={<button className="btn-icon" aria-label={t('Close assumptions')} onClick={() => setShowSet(false)}><X size={16} /></button>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={t('Cash + bank balance today (₹)')} hint={t('Add up all bank accounts and cash in hand.')}><Input type="number" inputMode="numeric" value={cfg.opening || ''} placeholder="0" onChange={(e) => up({ opening: Number(e.target.value) || 0 })} /></Field>
          <Field label={t('Minimum balance to keep (₹)')} hint={t('We warn you when a week falls below this.')}><Input type="number" inputMode="numeric" value={cfg.minBalance || ''} placeholder="0" onChange={(e) => up({ minBalance: Number(e.target.value) || 0 })} /></Field>
          <Field label={t('Overdue collected per week (%)')} hint={t('Of all overdue customer bills.')}><Input type="number" min={0} max={100} value={cfg.recoveryPct} onChange={(e) => up({ recoveryPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} /></Field>
          <Field label={t('Leave out bills overdue more than (days)')} hint={t('0 = count every overdue bill.')}><Input type="number" min={0} value={cfg.maxOverdueDays} onChange={(e) => up({ maxOverdueDays: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          <Field label={t('Office salaries & rent per month (₹)')} hint={t('Not in the ERP – enter your own figure.')}><Input type="number" inputMode="numeric" value={cfg.officeMonthly || ''} placeholder="0" onChange={(e) => up({ officeMonthly: Number(e.target.value) || 0 })} /></Field>
          <Field label={t('Pay transporters after (days)')}><Input type="number" min={0} value={cfg.tpDays} onChange={(e) => up({ tpDays: Number(e.target.value) || 0 })} /></Field>
          <Field label={t('Pay spare suppliers after (days)')}><Input type="number" min={0} value={cfg.supplierDays} onChange={(e) => up({ supplierDays: Number(e.target.value) || 0 })} /></Field>
          <Field label={t('Driver salary day')}><Input type="number" min={1} max={28} value={cfg.driverPayDay} onChange={(e) => up({ driverPayDay: Math.max(1, Math.min(28, Number(e.target.value) || 1)) })} /></Field>
          <div className="grid content-start gap-2"><span className="label">{t('Recurring spending')}</span><Toggle checked={cfg.runRates} onChange={(v) => up({ runRates: v })} label={t('Include diesel, trip costs and cash freight (8-week average)')} /></div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn-primary" disabled={!dirty} onClick={save}><Save size={15} /> {t('Save assumptions')}</button>
          <button className="btn-ghost" onClick={() => setCfg({ ...DEFAULT_CASH, opening: cfg.opening, weeks: cfg.weeks })}><RotateCcw size={15} /> {t('Default values')}</button>
        </div>
      </Card>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label={t('Cash summary')}>
        <KPI label={t('Cash + bank today')} value={cfg.opening ? compactINR(cfg.opening) : <button className="link text-[15px]" onClick={() => setShowSet(true)}>{t('Enter balance')}</button>} icon={Wallet} />
        <KPI label={t('Money in – {n} weeks', { n: cfg.weeks })} value={compactINR(totIn)} sub={t('{n} sources', { n: ins.length })} icon={ArrowDownLeft} tone="ok" />
        <KPI label={t('Money out – {n} weeks', { n: cfg.weeks })} value={compactINR(totOut)} sub={t('{n} types of payment', { n: outs.length })} icon={ArrowUpRight} tone="bad" />
        <KPI label={t('Lowest cash point')} value={<span className={low < cfg.minBalance ? 'text-bad' : ''}>{compactINR(low)}</span>} sub={t('week of {w}', { w: plan.weeks[lowW]?.label })} icon={TrendingDown} tone={low < cfg.minBalance ? 'bad' : 'violet'} />
      </section>

      {plan.short >= 0 && <div className="rounded-xl border border-bad/30 bg-bad/5 p-4 flex flex-wrap items-center gap-3">
        <AlertTriangle size={20} className="text-bad shrink-0" />
        <div className="flex-1 min-w-[220px] text-[13.5px]"><b>{t('Cash runs short in the week of {w}', { w: plan.weeks[plan.short].label })}</b> – {t('the balance falls to {amt}', { amt: inr(plan.closing[plan.short]) })}{cfg.minBalance ? ` ${t('(your minimum is {amt})', { amt: inr(cfg.minBalance) })}` : ''}. {t('Collect overdue bills sooner or move some payments.')}</div>
        <button className="btn-primary h-9" onClick={() => nav('fin/receivables')}><HandCoins size={15} /> {t('Chase payments')}</button>
      </div>}

      <Card title={t('Week by week')} subtitle={t('Bars: money in and out. Line: cash at the end of each week.')}>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11.5px] text-muted">{[['Money in', 'rgb(var(--ok))'], ['Money out', 'rgb(var(--bad))'], ['Cash at week end', 'rgb(var(--violet))']].map(([l, c]) => <span key={l} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{t(l)}</span>)}</div>
        <div style={{ height: 260 }} className="w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 6, right: 10, left: -8, bottom: 0 }} barGap={2} barCategoryGap="26%">
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="x" tick={axis} tickLine={false} axisLine={false} interval={0} minTickGap={4} />
              <YAxis tick={axis} tickLine={false} axisLine={false} width={62} tickFormatter={(v) => compactINR(v)} />
              <Tooltip content={<ChartTip money />} cursor={{ fill: 'rgb(var(--violet) / .06)' }} />
              <ReferenceLine y={cfg.minBalance} stroke="rgb(var(--bad))" strokeDasharray="4 4" />
              <Bar dataKey="in" name={t('Money in')} fill="rgb(var(--ok))" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Bar dataKey="out" name={t('Money out')} fill="rgb(var(--bad))" radius={[4, 4, 0, 0]} maxBarSize={26} />
              <Line type="monotone" dataKey="bal" name={t('Cash at week end')} stroke="rgb(var(--violet))" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, stroke: 'rgb(var(--surface))' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <section className="card overflow-hidden min-w-0" aria-label={t('Cash plan table')}>
        <div className="px-4 py-3 border-b border-line flex items-center gap-2"><h2 className="font-semibold text-[15px] flex-1">{t('Where the money comes from and goes')}</h2><span className="text-[12px] text-muted hidden sm:inline">{t('Tap any amount to see what is in it')}</span></div>
        <div className="overflow-x-auto">
          <table className="text-[12.5px] min-w-full">
            <thead><tr className="text-[11.5px] text-muted border-b border-line">
              <th className="sticky left-0 z-[1] bg-surface text-left px-3 py-2 font-semibold min-w-[170px]">{t('Week starting')}</th>
              {plan.weeks.map((w) => <th key={w.start} className="px-3 py-2 font-semibold text-right whitespace-nowrap">{w.label}</th>)}
              <th className="px-3 py-2 font-semibold text-right">{t('Total')}</th>
            </tr></thead>
            <tbody>
              <tr><td colSpan={plan.weeks.length + 2} className="sticky left-0 bg-surface2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ok">{t('Money in')}</td></tr>
              {ins.map((r) => <Row key={r.key} r={r} cell={cell} setCell={setCell} />)}
              <SumRow label={t('Total in')} vals={plan.inW} tone="ok" />
              <tr><td colSpan={plan.weeks.length + 2} className="sticky left-0 bg-surface2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-bad">{t('Money out')}</td></tr>
              {outs.map((r) => <Row key={r.key} r={r} cell={cell} setCell={setCell} />)}
              <SumRow label={t('Total out')} vals={plan.outW} tone="bad" />
              <SumRow label={t('Net for the week')} vals={plan.inW.map((x, i) => x - plan.outW[i])} signed />
              <SumRow label={t('Cash at week end')} vals={plan.closing} signed strong min={cfg.minBalance} />
            </tbody>
          </table>
        </div>
      </section>

      {sel && cell && <Card title={`${sel.label} – ${t('week of {w}', { w: plan.weeks[cell.w].label })}`} subtitle={sel.how} actions={<button className="btn-icon" aria-label={t('Close details')} onClick={() => setCell(null)}><X size={16} /></button>}>
        <ul className="divide-y divide-line">{sel.items[cell.w].slice(0, 40).map((it, i) => (
          <li key={i} className="py-2 flex items-center gap-3 text-[13px]">
            <div className="min-w-0 flex-1"><div className="font-semibold truncate">{it.label}</div>{it.sub && <div className="text-[12px] text-muted truncate">{it.sub}</div>}</div>
            <span className="tnum font-semibold">{inr(it.amount)}</span>
            {it.ref && <button className="text-[12px] link shrink-0" onClick={() => openRecord(it.ref!.type, it.ref!.id)}>{t('Open')}</button>}
          </li>))}
          {sel.items[cell.w].length > 40 && <li className="py-2 text-[12px] text-muted">{t('+ {n} more', { n: sel.items[cell.w].length - 40 })}</li>}
        </ul>
      </Card>}

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-5 items-start">
        <Card title={t('Biggest overdue customers')} subtitle={`${t('{amt} overdue and counted', { amt: compactINR(plan.overdue) })}${plan.ignored ? ` · ${t('{amt} in {n} older bills left out', { amt: compactINR(plan.ignored), n: plan.ignoredN })}` : ''}`} icon={HandCoins} actions={<button className="text-[12.5px] link" onClick={() => nav('fin/receivables')}>{t('All dues')}</button>}>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{custOver.map(([n, v]) => (
            <li key={n} className="flex items-center gap-3 text-[13px]"><span className="truncate flex-1 min-w-0">{n}</span><span className="tnum font-semibold">{compactINR(v)}</span></li>))}
          </ul>
          {legacy && <p className="text-[12px] text-muted mt-3">{t('Customer receipts were entered in Tally, not in the old ERP, so old bills still show as unpaid here. That is why bills overdue for more than {n} days are left out of the plan by default. Once receipts are recorded in this ERP the overdue figure becomes exact.', { n: cfg.maxOverdueDays })}</p>}
        </Card>
        <Card title={t('How this plan is made')}>
          <ul className="text-[12.5px] text-muted grid gap-1.5 list-disc pl-4">
            {plan.rows.map((r) => <li key={r.key}><b className="text-ink">{r.label}</b> – {r.how}</li>)}
          </ul>
          <p className="text-[12px] text-muted mt-3">{t('Plan date {date}.', { date: fmtDate(plan.weeks[0].start) })} {t('Change the assumptions at the top to match how you really pay and collect.')}</p>
        </Card>
      </div>
    </div>
  );
}

function Row({ r, cell, setCell }: { r: CashRow; cell: any; setCell: (c: any) => void }) {
  return (
    <tr className="border-b border-line/60">
      <td className="sticky left-0 z-[1] bg-surface px-3 py-2 min-w-[170px] max-w-[220px]"><div className="font-semibold leading-tight">{r.label}</div></td>
      {r.weeks.map((v, i) => <td key={i} className="px-1 py-1 text-right">
        {v ? <button className={cls('tnum rounded-md px-2 py-1 w-full text-right hover:bg-violet/10', cell?.row === r.key && cell?.w === i && 'bg-violet/15 text-violet font-semibold')} onClick={() => setCell(cell?.row === r.key && cell?.w === i ? null : { row: r.key, w: i })}>{compactINR(v)}</button> : <span className="text-faint px-2">–</span>}
      </td>)}
      <td className="px-3 text-right tnum font-semibold whitespace-nowrap">{compactINR(r.total)}</td>
    </tr>
  );
}

function SumRow({ label, vals, tone, signed, strong, min }: { label: string; vals: number[]; tone?: string; signed?: boolean; strong?: boolean; min?: number }) {
  const total = strong ? vals[vals.length - 1] : vals.reduce((a, b) => a + b, 0);
  return (
    <tr className={cls('border-b border-line', strong && 'bg-surface2')}>
      <td className={cls('sticky left-0 z-[1] px-3 py-2 font-bold', strong ? 'bg-surface2' : 'bg-surface')}>{label}</td>
      {vals.map((v, i) => <td key={i} className={cls('px-3 py-2 text-right tnum font-semibold whitespace-nowrap', tone && `text-${tone}`, signed && v < 0 && 'text-bad', min !== undefined && v < min && 'bg-bad/10')}>{compactINR(v)}</td>)}
      <td className={cls('px-3 text-right tnum font-bold whitespace-nowrap', signed && total < 0 && 'text-bad')}>{strong ? '' : compactINR(total)}</td>
    </tr>
  );
}
