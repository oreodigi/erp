import React, { useMemo, useState } from 'react';
import { useDB, useUI, lookup, lrStage, truckStatus, outstanding, stockQty } from '../store/store';
import { PageHeader, KPI, Card, StatusBadge, Progress, Segmented, DocNo } from '../components/ui';
import { ChartCard, AreaTrend, Bars, Lines, Donut, LegendList, C } from '../components/charts';
import { ActivityFeed } from '../components/overlays';
import { useRole } from '../components/AppShell';
import { addDays, ymd, sum, compactINR, daysBetween, fmtDate, cls, groupBy, now } from '../lib/util';
import { Package, Truck, IndianRupee, Wallet, ClipboardList, CheckCircle2, Inbox, Gauge, Wrench, TrainFront, Boxes, Warehouse, Banknote, Stamp, AlertTriangle, PackagePlus, FileText, Route, Receipt, ArrowRight, Clock, ShieldAlert, FileWarning, PackageX, CalendarClock } from 'lucide-react';

export function useMetrics() {
  const db = useDB();
  return useMemo(() => {
    const today = ymd();
    const lrs = db.lrs.filter((l: any) => l.isFinal);
    const stage = (l: any) => lrStage(db, l);
    const active = lrs.filter((l: any) => !['Delivered'].includes(l.status));
    const inTransit = lrs.filter((l: any) => ['In Transit', 'Rake In Transit', 'Out for Delivery'].includes(l.status));
    const deliveredToday = lrs.filter((l: any) => l.delivery?.date === today);
    const pendingPOD = lrs.filter((l: any) => l.status === 'Delivered' && !l.ack);
    const own = db.trucks.filter((t: any) => t.type === 'Own');
    const ts = own.map((t: any) => truckStatus(db, t));
    const onTrip = ts.filter((s) => s === 'On Trip').length, ws = ts.filter((s) => s === 'Workshop').length, avail = ts.filter((s) => s === 'Available').length;
    const activeRakes = db.schedules.filter((s: any) => !s.isCompleted && s.status !== 'Planned');
    const wagonsTotal = sum(activeRakes, (s: any) => sum(s.wagons, (w: any) => w.count));
    const wagonsUsed = sum(activeRakes, (s: any) => new Set(s.loads.map((l: any) => l.vpNo)).size);
    const monthStart = ymd(new Date(now().getFullYear(), now().getMonth(), 1));
    const revenueMTD = sum(lrs.filter((l: any) => l.placeDate >= monthStart), (l: any) => l.freight);
    const rev30 = sum(lrs.filter((l: any) => daysBetween(l.placeDate) <= 30), (l: any) => l.freight);
    const recv = outstanding(db);
    const overdue = sum(db.bills.filter((b: any) => !b.deleted && b.pending > 0 && daysBetween(b.date) > (lookup.cust(db, b.clientId)?.creditDays || 30)), (b: any) => b.pending);
    const tpPayable = sum(db.tpSlips, (s: any) => s.pending) + sum(db.dcPayslips, (s: any) => s.pending) + sum(db.dcs.filter((d: any) => d.ackSupervisor && !d.payslipId), (d: any) => d.freight - d.advance);
    const approvals = db.orders.filter((o: any) => o.status === 'Pending').length + db.jobcards.filter((j: any) => j.status === 'Pending Approval').length + db.pos.filter((p: any) => p.status === 'Pending Approval').length + db.tpSlips.filter((s: any) => s.status === 'Pending').length + db.dcs.filter((d: any) => d.ackCollection && !d.approval).length;
    const inbound = db.grns.filter((g: any) => daysBetween(g.inDate) <= 7).length + db.dgrns.filter((g: any) => daysBetween(g.inDate) <= 7).length;
    const outbound = sum(db.schedules, (s: any) => s.loads.filter((l: any) => daysBetween(l.date) <= 7).length) + db.dcs.filter((d: any) => daysBetween(d.loadingDate) <= 7).length;
    const days = (n: number) => Array.from({ length: n }, (_, i) => ymd(addDays(now(), -(n - 1 - i))));
    const series = (n: number) => days(n).map((d) => ({ x: fmtDate(d).slice(0, 6), Booked: lrs.filter((l: any) => l.placeDate === d).length, Delivered: lrs.filter((l: any) => l.delivery?.date === d).length, Revenue: sum(lrs.filter((l: any) => l.placeDate === d), (l: any) => l.freight) }));
    const delivered = lrs.filter((l: any) => l.delivery);
    const onTime = delivered.filter((l: any) => l.delivery.date <= l.dueDate).length;
    return { db, lrs, active, inTransit, deliveredToday, pendingPOD, own, onTrip, ws, avail, activeRakes, wagonsTotal, wagonsUsed, revenueMTD, rev30, recv, overdue, tpPayable, approvals, inbound, outbound, series, onTimePct: delivered.length ? (onTime / delivered.length) * 100 : 0, ordersToday: db.orders.filter((o: any) => o.createdAt.slice(0, 10) === today).length, stage, delivered };
  }, [db]);
}

const proj = (lat: number, lng: number) => [((lng - 71.5) / (96 - 71.5)) * 560 + 20, ((29.5 - lat) / (29.5 - 10.5)) * 330 + 15];

export function ControlTowerMap({ lrs, schedules }: { lrs: any[]; schedules: any[] }) {
  const db = useDB();
  const openRecord = useUI((s) => s.openRecord);
  const [hover, setHover] = useState<any>(null);
  const city = (id: string) => { const c = lookup.city(db, id); return c && c.lat != null && c.lng != null ? c : undefined; };
  const routes = [...lrs].sort((x: any, y: any) => (y.placeDate || '').localeCompare(x.placeDate || '')).map((l: any) => {
    const a = city(l.status === 'Out for Delivery' ? lookup.branch(db, l.toBranchId)?.city : l.sourceCity), b = city(l.status === 'In Transit' && l.mode !== 'Road' ? 'jalgaon' : l.destCity);
    if (!a || !b) return null;
    if (a.id === b.id) return null;
    return { l, a: proj(a.lat, a.lng), b: proj(b.lat, b.lng), p: l.progress ?? 0.5, rail: false, ends: [a.id, b.id] };
  }).filter(Boolean).slice(0, 18) as any[];
  const rakes = schedules.filter((s: any) => s.status === 'In Transit').map((s: any) => { const a = city(lookup.branch(db, s.sourceId)?.city || 'jalgaon'), b = city(lookup.branch(db, s.destId)?.city); if (!a || !b) return null; return { s, a: proj(a.lat, a.lng), b: proj(b.lat, b.lng), p: s.progress ?? 0.6, rail: true, ends: [a.id, b.id] }; }).filter(Boolean) as any[];
  const curve = (a: number[], b: number[]) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.18; return { d: `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`, at: (t: number) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mx + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * my + t * t * b[1]] }; };
  // dots: active branch cities (labelled, de-cluttered) plus route end points
  const branchCities = new Set(db.branches.filter((b: any) => b.active !== false).map((b: any) => b.city));
  const dotIds = new Set<string>([...branchCities, ...[...routes, ...rakes].flatMap((r: any) => r.ends)] as string[]);
  const dots = [...dotIds].map((id) => city(id)).filter(Boolean) as any[];
  const placed: number[][] = [];
  const labelled = new Set<string>();
  dots.filter((c) => branchCities.has(c.id)).forEach((c) => { const [x, y] = proj(c.lat, c.lng); if (placed.every(([px, py]) => Math.hypot(px - x, py - y) > 26)) { placed.push([x, y]); labelled.add(c.id); } });
  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-surface2 border border-line" style={{ aspectRatio: '600 / 360', maxWidth: '100%' }}>
      <svg viewBox="0 0 600 360" className="absolute inset-0 w-full h-full">
        <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="var(--grid)" strokeWidth="1" /></pattern></defs>
        <rect width="600" height="360" fill="url(#grid)" />
        {[...routes, ...rakes].map((r: any, i) => { const c = curve(r.a, r.b); const [x, y] = c.at(r.p); return (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)} onClick={() => (r.rail ? openRecord('rake', r.s.id) : openRecord('lr', r.l.id))}>
            <path d={c.d} fill="none" stroke={r.rail ? 'rgb(var(--brand))' : 'rgb(var(--violet))'} strokeOpacity={hover && hover !== r ? 0.15 : 0.55} strokeWidth={r.rail ? 2.2 : 1.6} strokeDasharray={r.rail ? '5 5' : undefined} className={r.rail ? 'route-dash' : ''} />
            <path d={c.d} fill="none" stroke="transparent" strokeWidth="12" />
            <circle cx={x} cy={y} r={r.rail ? 6 : 4.5} fill={r.rail ? 'rgb(var(--brand))' : 'rgb(var(--violet))'} stroke="rgb(var(--surface))" strokeWidth="2" />
          </g>); })}
        {dots.map((c: any) => { const [x, y] = proj(c.lat, c.lng); const br = branchCities.has(c.id); return (
          <g key={c.id}>
            <circle cx={x} cy={y} r={br ? 4.5 : 2.5} fill={br ? 'rgb(var(--ink))' : 'rgb(var(--faint))'} stroke="rgb(var(--surface))" strokeWidth={br ? 2 : 1} />
            {labelled.has(c.id) && <text x={x + 7} y={y + 3.5} fontSize="10.5" fontWeight="600" fill="rgb(var(--ink))" style={{ paintOrder: 'stroke', stroke: 'rgb(var(--surface-2))', strokeWidth: 3 }}>{c.name}</text>}
          </g>); })}
      </svg>
      <div className="absolute left-2.5 bottom-2.5 flex gap-3 text-[11px] bg-surface/90 rounded-md px-2 py-1 border border-line">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet rounded" />Road ({routes.length})</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand rounded" />Rail rake ({rakes.length})</span>
      </div>
      {hover && (
        <div className="absolute right-2.5 top-2.5 card shadow-pop px-3 py-2 text-[12px] max-w-[240px] animate-in pointer-events-none">
          {hover.rail ? <><div className="docno font-semibold">{hover.s.rakeNo}</div><div className="text-muted">{hover.s.title}</div><div className="mt-1">{hover.s.statusLog.at(-1)?.remark}</div></> : <><div className="docno font-semibold">{hover.l.lrNo}</div><div className="text-muted">{hover.l.source} → {hover.l.destination}</div><div className="mt-1">{lookup.custName(db, hover.l.consignorId)}</div><div className="text-muted">{lookup.truckNo(db, hover.l.truckId)} · ETA {fmtDate(hover.l.dueDate)}</div></>}
        </div>
      )}
    </div>
  );
}

export function attentionItems(db: any) {
  const out: { tone: string; icon: any; title: string; detail: string; link: string; params?: any; rec?: [string, string] }[] = [];
  db.lrs.filter((l: any) => ['In Transit', 'Out for Delivery'].includes(l.status) && l.dueDate < ymd()).forEach((l: any) => out.push({ tone: 'bad', icon: Clock, title: `${l.lrNo} delayed ${daysBetween(l.dueDate)}d`, detail: `${l.source} → ${l.destination} · ${lookup.custName(db, l.consignorId)}`, link: 'ops/lr', rec: ['lr', l.id] }));
  const pod = db.lrs.filter((l: any) => l.status === 'Delivered' && !l.ack && daysBetween(l.delivery?.date) > 4);
  if (pod.length) out.push({ tone: 'warn', icon: Inbox, title: `${pod.length} PODs pending over 4 days`, detail: 'Billing is blocked until POD is received', link: 'ops/pod' });
  const po = db.orders.filter((o: any) => o.status === 'Pending');
  if (po.length) out.push({ tone: 'warn', icon: ClipboardList, title: `${po.length} orders awaiting confirmation`, detail: po.map((o: any) => o.orderNo).join(', '), link: 'ops/order-confirmation' });
  const soon = (d: string) => d && daysBetween(ymd(), d) <= 15;
  db.trucks.forEach((t: any) => { [['Insurance', t.insDue], ['Fitness', t.fitDue], ['National permit', t.npDue], ['Road tax', t.taxDue], ['Goods permit', t.gpDue]].forEach(([n, d]) => { if (soon(d as string)) out.push({ tone: (d as string) < ymd() ? 'bad' : 'warn', icon: FileWarning, title: `${t.number} – ${n} ${(d as string) < ymd() ? 'expired' : 'due'} ${fmtDate(d as string)}`, detail: `${t.type} truck · ${t.capacity}`, link: 'fleet/trucks', rec: ['truck', t.id] }); }); });
  db.drivers.forEach((d: any) => { if (soon(d.licenseExpiry)) out.push({ tone: d.licenseExpiry < ymd() ? 'bad' : 'warn', icon: ShieldAlert, title: `Driver licence ${d.licenseExpiry < ymd() ? 'expired' : 'expiring'} – ${d.name}`, detail: `${d.license} · ${fmtDate(d.licenseExpiry)}`, link: 'fleet/drivers' }); });
  const jc = db.jobcards.filter((j: any) => j.status === 'Pending Approval');
  if (jc.length) out.push({ tone: 'warn', icon: Wrench, title: `${jc.length} job cards need approval`, detail: `Estimate ₹${sum(jc, (j: any) => j.net).toLocaleString('en-IN')}`, link: 'ws/jobcard-approval' });
  db.bills.filter((b: any) => !b.deleted && b.pending > 0 && daysBetween(b.date) > (lookup.cust(db, b.clientId)?.creditDays || 30)).forEach((b: any) => out.push({ tone: 'bad', icon: Wallet, title: `${lookup.custName(db, b.clientId)} overdue ${compactINR(b.pending)}`, detail: `${b.billNo} · ${daysBetween(b.date)} days`, link: 'fin/receivables', rec: ['bill', b.id] }));
  const low = db.spares.filter((s: any) => s.type === 'Item' && stockQty(db, s.id) < s.minStock);
  if (low.length) out.push({ tone: 'warn', icon: PackageX, title: `${low.length} spares below minimum stock`, detail: low.slice(0, 3).map((s: any) => s.name).join(', '), link: 'ws/stock' });
  const ldc = db.dcs.filter((d: any) => d.status === 'Open' && daysBetween(d.loadingDate) > 2);
  if (ldc.length) out.push({ tone: 'warn', icon: Truck, title: `${ldc.length} LDCs without supervisor acknowledgment`, detail: ldc.map((d: any) => d.dcNo).join(', '), link: 'ops/ldc' });
  db.rateContracts.filter((r: any) => daysBetween(ymd(), r.to) <= 30).forEach((r: any) => out.push({ tone: 'info', icon: CalendarClock, title: `Rate contract expiring – ${lookup.custName(db, r.customerId)}`, detail: `Valid till ${fmtDate(r.to)}`, link: 'cust/rate-contracts' }));
  return out;
}

export default function CommandCenter() {
  const m = useMetrics();
  const db = m.db;
  const nav = useUI((s) => s.nav);
  const openRecord = useUI((s) => s.openRecord);
  const { user, role } = useRole();
  const [range, setRange] = useState('30');
  const series = m.series(Number(range));
  const weeks = Array.from({ length: 8 }, (_, i) => { const end = addDays(now(), -7 * (7 - i)); const start = addDays(end, -6); const inR = (d: string) => d >= ymd(start) && d <= ymd(end); const del = m.delivered.filter((l: any) => inR(l.delivery.date)); return { x: fmtDate(ymd(end)).slice(0, 6), Road: sum(m.lrs.filter((l: any) => inR(l.placeDate) && l.mode === 'Road'), (l: any) => l.weight) / 1000, Rail: sum(m.lrs.filter((l: any) => inR(l.placeDate) && l.mode !== 'Road'), (l: any) => l.weight) / 1000, Revenue: sum(m.lrs.filter((l: any) => inR(l.placeDate)), (l: any) => l.freight), OnTime: del.length ? Math.round((del.filter((l: any) => l.delivery.date <= l.dueDate).length / del.length) * 100) : null }; });
  weeks.forEach((w) => { w.Road = Math.round(w.Road); w.Rail = Math.round(w.Rail); });
  const cust = Object.entries(groupBy(m.lrs.filter((l: any) => daysBetween(l.placeDate) <= 60), (l: any) => l.consignorId)).map(([k, v]) => ({ name: lookup.cust(db, k)?.short || k, value: sum(v, (l: any) => l.freight) })).sort((a, b) => b.value - a.value);
  const custTop = [...cust.slice(0, 5), { name: 'Others', value: sum(cust.slice(5), (c) => c.value), color: 'rgb(var(--faint))' }].filter((c) => c.value > 0);
  const ageing = [['0–30', 0, 30], ['31–60', 31, 60], ['61–90', 61, 90], ['90+', 91, 9999]].map(([x, a, b]: any) => ({ x, Outstanding: sum(db.bills.filter((bl: any) => !bl.deleted && bl.pending > 0 && daysBetween(bl.date) >= a && daysBetween(bl.date) <= b), (bl: any) => bl.pending) }));
  const lanes = Object.entries(groupBy(m.lrs, (l: any) => `${l.source} → ${l.destination}`)).map(([k, v]) => { const del = v.filter((l: any) => l.delivery); return { lane: k, n: v.length, freight: sum(v, (l: any) => l.freight), ontime: del.length ? Math.round((del.filter((l: any) => l.delivery.date <= l.dueDate).length / del.length) * 100) : null }; }).sort((a, b) => b.freight - a.freight).slice(0, 6);
  const rakeProfit = db.schedules.filter((s: any) => s.mrrr).map((s: any) => { const rev = sum(db.lrs.filter((l: any) => l.scheduleId === s.id), (l: any) => l.freight); const cost = sum(s.mrrr.rows, (r: any) => r.railFreight) + (s.dcwcSrc?.amount || 0) + (s.dcwcDst?.amount || 0) + sum(db.dcs.filter((d: any) => d.scheduleId === s.id), (d: any) => d.freight); return { x: s.rakeNo.slice(-3), Revenue: rev, Cost: cost }; });
  const att = attentionItems(db);
  const live = m.inTransit.concat(m.lrs.filter((l: any) => ['At Rail Head', 'Loaded', 'At Branch'].includes(l.status))).slice(0, 12);
  const toneCls: any = { bad: 'text-bad bg-bad/10', warn: 'text-warn bg-warn/10', info: 'text-info bg-info/10' };
  const last7 = m.series(14).map((d) => d.Booked);
  const rev7 = m.series(14).map((d) => d.Revenue);
  const hour = now().getHours();

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow={`${fmtDate(ymd())} · ${role.name}`} title={`Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${user.firstName}`} subtitle={`${m.inTransit.length} consignments moving, ${m.activeRakes.length} rakes active and ${att.length} items need attention.`}
        actions={<div className="hidden md:flex gap-2"><button className="btn-ghost" onClick={() => nav('reports')}><FileText size={15} /> MIS</button><button className="btn-primary" onClick={() => nav('ops/lr-new')}><PackagePlus size={15} /> Generate LR</button></div>} />

      {/* Quick actions */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {[['New Order', ClipboardList, 'ops/orders', { new: 1 }], ['Generate LR', PackagePlus, 'ops/lr-new', {}], ['Vehicle Planning', Boxes, 'ops/vp-planning', {}], ['Delivery Challan', Truck, 'ops/dc', { new: 1 }], ['GRN', Warehouse, 'ops/grn', { new: 1 }], ['Start Trip', Route, 'fleet/trips', { new: 1 }], ['Job Card', Wrench, 'ws/jobcards', { new: 1 }], ['Generate Bill', Receipt, 'fin/billing', {}]].map(([l, I, r, p]: any) => (
          <button key={l} onClick={() => nav(r, p)} className="shrink-0 flex items-center gap-2 h-10 pl-2 pr-3.5 rounded-xl bg-surface border border-line hover:border-violet/40 hover:-translate-y-px transition text-[12.5px] font-semibold">
            <span className="w-7 h-7 rounded-lg bg-violet/10 text-violet grid place-items-center"><I size={14} /></span>{l}
          </button>
        ))}
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPI label="Active consignments" value={m.active.length} sub={`${m.ordersToday} orders today`} icon={Package} spark={last7} onClick={() => nav('ops/lr')} />
        <KPI label="In transit" value={m.inTransit.length} sub={`${m.deliveredToday.length} delivered today`} icon={Truck} tone="info" onClick={() => nav('ops/lr', { stage: 'moving' })} />
        <KPI label="Revenue (month to date)" value={compactINR(m.revenueMTD)} sub={`${compactINR(m.rev30)} last 30d`} icon={IndianRupee} tone="ok" spark={rev7} onClick={() => nav('reports/sale-bill')} />
        <KPI label="Receivables" value={compactINR(m.recv)} sub={<span className="text-bad font-semibold">{compactINR(m.overdue)} overdue</span>} icon={Wallet} tone="brand" onClick={() => nav('fin/receivables')} />
      </div>
      <div className="card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line overflow-hidden">
        {[
          ['Pending POD', m.pendingPOD.length, 'ops/pod', m.pendingPOD.length > 5 ? 'text-warn' : ''], ['Fleet utilisation', `${Math.round((m.onTrip / m.own.length) * 100)}%`, 'fleet/trucks', ''], ['Available trucks', m.avail, 'fleet/trucks', 'text-ok'],
          ['In workshop', m.ws, 'ws/jobcards', ''], ['Active rakes', m.activeRakes.length, 'rail/rakes', ''], ['Wagon utilisation', m.wagonsTotal ? `${Math.round((m.wagonsUsed / m.wagonsTotal) * 100)}%` : '—', 'ops/vp-loading', ''],
          ['WH inbound 7d', m.inbound, 'wh/stock', ''], ['WH outbound 7d', m.outbound, 'wh/movement', ''], ['Outstanding', compactINR(m.recv), 'fin/receivables', ''], ['Transporter payable', compactINR(m.tpPayable), 'fin/tp-slips', ''],
          ['Pending approvals', m.approvals, 'ops/order-confirmation', m.approvals ? 'text-brand' : ''], ['On-time delivery', `${Math.round(m.onTimePct)}%`, 'reports/vehicle-performance', m.onTimePct > 80 ? 'text-ok' : 'text-warn'],
        ].map(([l, v, r, c]: any) => (
          <button key={l} onClick={() => nav(r)} className="text-left px-3.5 py-3 bg-surface hover:bg-surface2 transition min-w-0">
            <div className="text-[11px] text-muted font-semibold truncate">{l}</div>
            <div className={cls('font-display text-[18px] font-semibold tnum mt-0.5', c)}>{v}</div>
          </button>
        ))}
      </div>

      {/* Control tower + attention */}
      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-4">
        <Card title={<span className="flex items-center gap-2">Live consignment control tower <span className="w-2 h-2 rounded-full bg-ok live-dot" /></span>} subtitle="Road trips and parcel rakes currently moving" actions={<button className="btn-subtle btn-sm" onClick={() => nav('ops/lr')}>All LRs <ArrowRight size={13} /></button>}>
          <ControlTowerMap lrs={m.inTransit} schedules={db.schedules} />
          <div className="mt-3 -mx-4 overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[640px]">
              <thead><tr className="text-[11px] text-muted uppercase tracking-[.04em] border-b border-line"><th className="text-left font-semibold px-4 py-2">LR</th><th className="text-left font-semibold px-2">Lane</th><th className="text-left font-semibold px-2">Vehicle / rake</th><th className="text-left font-semibold px-2">Status</th><th className="text-left font-semibold px-2 w-32">Progress</th><th className="text-right font-semibold px-4">ETA</th></tr></thead>
              <tbody>
                {live.map((l: any) => { const late = l.dueDate < ymd(); const prog = l.status === 'Out for Delivery' ? 85 : l.status === 'Rake In Transit' ? (lookup.sched(db, l.scheduleId)?.progress || 0.6) * 100 : l.status === 'In Transit' ? (l.progress || 0.4) * 100 : l.status === 'At Branch' ? 75 : l.status === 'Loaded' ? 35 : 25; return (
                  <tr key={l.id} className="border-b border-line/60 hover:bg-violet/[.03] cursor-pointer" onClick={() => openRecord('lr', l.id)}>
                    <td className="px-4 py-2"><DocNo>{l.lrNo}</DocNo><div className="text-[11px] text-muted truncate max-w-[160px]">{lookup.cust(db, l.consignorId)?.short}</div></td>
                    <td className="px-2">{l.source} → {l.destination}</td>
                    <td className="px-2 docno">{l.scheduleId && ['Rake In Transit', 'Loaded', 'At Branch'].includes(l.status) ? lookup.sched(db, l.scheduleId)?.rakeNo : lookup.truckNo(db, l.truckId)}</td>
                    <td className="px-2"><StatusBadge s={l.status} /></td>
                    <td className="px-2"><Progress value={prog} tone={late ? 'bad' : 'violet'} /></td>
                    <td className={cls('px-4 text-right tnum', late && 'text-bad font-semibold')}>{fmtDate(l.dueDate).slice(0, 6)}</td>
                  </tr>); })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Attention required" subtitle={`${att.length} operational exceptions`} icon={AlertTriangle} pad={false}>
          <ul className="divide-y divide-line max-h-[640px] overflow-y-auto scrollbar-thin">
            {att.slice(0, 14).map((a, i) => { const I = a.icon; return (
              <li key={i}><button onClick={() => (a.rec ? openRecord(a.rec[0], a.rec[1]) : nav(a.link, a.params))} className="w-full text-left flex gap-3 px-4 py-2.5 hover:bg-surface2 transition">
                <span className={cls('w-8 h-8 rounded-lg grid place-items-center shrink-0', toneCls[a.tone])}><I size={15} /></span>
                <span className="min-w-0 flex-1"><span className="block text-[12.75px] font-semibold leading-snug">{a.title}</span><span className="block text-[11.5px] text-muted truncate">{a.detail}</span></span>
                <ArrowRight size={14} className="text-faint mt-2 shrink-0" />
              </button></li>); })}
          </ul>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="Shipment volume" subtitle="LRs booked vs delivered" actions={<Segmented size="sm" options={[{ key: '7', label: '7D' }, { key: '30', label: '30D' }]} value={range} onChange={setRange} />} legend={[{ label: 'Booked', color: C[0] }, { label: 'Delivered', color: C[2] }]}>
          <AreaTrend data={series} keys={[{ key: 'Booked', label: 'Booked' }, { key: 'Delivered', label: 'Delivered', color: C[2] }]} />
        </ChartCard>
        <ChartCard title="Revenue trend" subtitle="Freight booked per week">
          <Bars data={weeks} keys={[{ key: 'Revenue', label: 'Revenue' }]} money />
        </ChartCard>
        <ChartCard title="Road vs rail movement" subtitle="Tonnes booked per week" legend={[{ label: 'Road', color: C[0] }, { label: 'Rail', color: C[1] }]}>
          <Bars data={weeks} keys={[{ key: 'Road', label: 'Road (t)' }, { key: 'Rail', label: 'Rail (t)' }]} stacked />
        </ChartCard>
        <ChartCard title="On-time delivery" subtitle="% delivered within standard transit days">
          <Lines data={weeks} keys={[{ key: 'OnTime', label: 'On-time %' }]} domain={[0, 100]} />
        </ChartCard>
        <Card title="Customer contribution" subtitle="Freight share, last 60 days">
          <div className="grid grid-cols-[110px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)] gap-4 items-center">
            <div className="h-[150px]"><ResponsiveDonut data={custTop} total={compactINR(sum(cust, (c) => c.value))} /></div>
            <LegendList data={custTop} money />
          </div>
        </Card>
        <Card title="Fleet utilisation" subtitle={`${m.own.length} own trucks`}>
          <div className="grid gap-3">
            {[['On trip', m.onTrip, 'violet'], ['Available', m.avail, 'ok'], ['In workshop', m.ws, 'warn']].map(([l, v, t]: any) => (
              <div key={l}><div className="flex justify-between text-[12.5px] mb-1"><span className="text-muted">{l}</span><span className="font-semibold tnum">{v} <span className="text-faint font-normal">· {Math.round((v / m.own.length) * 100)}%</span></span></div><Progress value={(v / m.own.length) * 100} tone={t} className="h-2" /></div>
            ))}
            <div className="text-[12px] text-muted pt-1">Market trucks engaged this month: <b className="text-ink tnum">{new Set(db.lrs.filter((l: any) => l.vehicle === 'Market' && daysBetween(l.placeDate) <= 30).map((l: any) => l.truckId)).size}</b></div>
          </div>
        </Card>
        <Card title="Route performance" subtitle="Top lanes by freight" pad={false}>
          <table className="w-full text-[12.5px]"><tbody>
            {lanes.map((r) => (
              <tr key={r.lane} className="border-b border-line/60 last:border-0"><td className="px-4 py-2"><div className="font-medium">{r.lane}</div><div className="text-[11px] text-muted">{r.n} LRs</div></td><td className="px-2 text-right tnum font-semibold">{compactINR(r.freight)}</td><td className="px-4 text-right w-24">{r.ontime === null ? <span className="text-faint">—</span> : <StatusBadge s={`${r.ontime}%`} tone={r.ontime >= 80 ? 'ok' : r.ontime >= 60 ? 'warn' : 'bad'} dot={false} />}</td></tr>
            ))}
          </tbody></table>
        </Card>
        <ChartCard title="Receivable ageing" subtitle={`${compactINR(m.recv)} outstanding`}>
          <Bars data={ageing} keys={[{ key: 'Outstanding', label: 'Outstanding', color: 'var(--chart-2)' }]} money />
        </ChartCard>
        <ChartCard title="Rake profitability" subtitle="Freight earned vs rail + delivery cost" legend={[{ label: 'Revenue', color: C[0] }, { label: 'Cost', color: C[3] }]}>
          <Bars data={rakeProfit} keys={[{ key: 'Revenue', label: 'Revenue' }, { key: 'Cost', label: 'Cost', color: C[3] }]} money />
        </ChartCard>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <Card title="Recent activity" subtitle="Across all modules"><ActivityFeed items={db.activity} limit={9} /></Card>
        <Card title="Rakes" subtitle="Parcel rake pipeline" pad={false} actions={<button className="btn-subtle btn-sm" onClick={() => nav('rail/rakes')}>Board <ArrowRight size={13} /></button>}>
          <ul className="divide-y divide-line">
            {db.schedules.slice().reverse().map((s: any) => { const lrs = db.lrs.filter((l: any) => l.scheduleId === s.id); return (
              <li key={s.id}><button onClick={() => openRecord('rake', s.id)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface2">
                <span className="w-9 h-9 rounded-lg bg-brand/10 text-brand grid place-items-center shrink-0"><TrainFront size={16} /></span>
                <span className="flex-1 min-w-0"><span className="block docno font-semibold">{s.rakeNo}</span><span className="block text-[11.5px] text-muted truncate">JL → {s.destId} · {fmtDate(s.date)} · {lrs.length} LRs · {sum(s.wagons, (w: any) => w.count)} VPs</span></span>
                <StatusBadge s={s.status} />
              </button></li>); })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

import { ResponsiveContainer } from 'recharts';
function ResponsiveDonut({ data, total }: { data: any[]; total: string }) {
  return <ResponsiveContainer width="100%" height="100%"><Donut data={data} money center={{ label: 'Total', value: total }} /></ResponsiveContainer>;
}
