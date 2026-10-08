import React, { useMemo, useState } from 'react';
import { useDB, useUI, lookup, railGodownId } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Select, Card, DocNo, Progress, Tabs, Segmented } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { CrudPage, DEFS } from './masters';
import { ChartCard, Bars } from '../components/charts';
import { fmtDate, sum, num, daysBetween, groupBy, cls, pct } from '../lib/util';
import { Warehouse, Package, Clock, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, ListChecks } from 'lucide-react';

export function Godowns() {
  const db = useDB();
  const stockAt = (gid: string) => { const g = db.godowns.find((x: any) => x.id === gid); const grn = gid === railGodownId(db) ? sum(db.grns, (r: any) => sum(r.items, (i: any) => i.pending * (lookup.goods(db, db.lrs.find((l: any) => l.id === r.lrId)?.items[i.idx]?.goodsId)?.weight || 0))) : 0; const dgrn = sum(db.dgrns.filter((d: any) => lookup.branch(db, lookup.sched(db, d.scheduleId)?.destId)?.godown === gid), (d: any) => sum(d.items, (i: any) => i.pending * (lookup.goods(db, db.lrs.find((l: any) => l.id === i.lrId)?.items[i.idx]?.goodsId)?.weight || 0))); return (grn + dgrn) / 1000; };
  const def = { ...DEFS.godown, title: 'Godowns', desc: 'Owned and leased warehouses with capacity, gates, rent and agreement expiry. Occupancy is computed from GRN/DGRN stock waiting for loading or delivery.', kpis: (d: any, rows: any[]) => <><KPI label="Godowns" value={rows.length} icon={Warehouse} /><KPI label="Total capacity" value={`${num(sum(rows, (r: any) => r.capacity))} MT`} /><KPI label="Stock held" value={`${num(sum(rows, (r: any) => stockAt(r.id)), 1)} MT`} tone="info" /><KPI label="Monthly rent" value={`₹${num(sum(rows, (r: any) => r.rent))}`} /></>, cols: (d: any) => [...DEFS.godown.cols(d), { key: 'occ', label: 'Occupancy', render: (r: any) => { const s = stockAt(r.id); return <div className="w-28"><div className="text-[11px] text-muted tnum mb-0.5">{num(s, 1)} / {r.capacity} MT</div><Progress value={(s / r.capacity) * 100} tone={s / r.capacity > 0.8 ? 'bad' : 'violet'} /></div>; } }] };
  return <CrudPage def={def} />;
}

function useStockRows(db: any) {
  return useMemo(() => [
    ...db.grns.flatMap((g: any) => g.items.filter((i: any) => i.pending > 0).map((i: any) => { const l = db.lrs.find((x: any) => x.id === g.lrId); return { id: g.id + i.idx, kind: 'Rail head (GRN)', ref: g.grnNo, godown: 'Jalgaon Rail Head Godown', gate: g.gateNo, branch: 'JL', l, item: l?.items[i.idx]?.name, received: i.received, pending: i.pending, inDate: g.inDate, toBranch: l?.toBranchId, railHead: 'Jalgaon' }; })),
    ...db.dgrns.flatMap((g: any) => g.items.filter((i: any) => i.pending > 0).map((i: any) => { const l = db.lrs.find((x: any) => x.id === i.lrId); const s = lookup.sched(db, g.scheduleId); return { id: g.id + i.lrId + i.idx, kind: 'Branch (DGRN)', ref: g.dgrnNo, godown: db.godowns.find((x: any) => x.id === lookup.branch(db, s?.destId)?.godown)?.name || s?.destId, gate: '—', branch: s?.destId, l, item: l?.items[i.idx]?.name, received: i.received, pending: i.pending, inDate: g.inDate, toBranch: s?.destId, railHead: lookup.branch(db, s?.destId)?.name }; })),
  ], [db]);
}

export function Stock() {
  const db = useDB();
  const { openRecord } = useUI.getState();
  const rows = useStockRows(db);
  const [view, setView] = useState('detail');
  const byClient = Object.entries(groupBy(rows, (r: any) => r.l?.consignorId)).map(([k, v]) => ({ x: lookup.cust(db, k)?.short || k, Packages: sum(v, (r: any) => r.pending) })).sort((a, b) => b.Packages - a.Packages);
  return (
    <div>
      <PageHeader eyebrow="Warehouse" title="Godown stock" subtitle="Live stock in rail-head and branch godowns: GRN quantities not yet loaded on VPs and DGRN quantities not yet put on delivery challans." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Packages in stock" value={num(sum(rows, (r: any) => r.pending))} icon={Package} />
        <KPI label="At Jalgaon rail head" value={num(sum(rows.filter((r: any) => r.branch === 'JL'), (r: any) => r.pending))} icon={Warehouse} tone="info" />
        <KPI label="At destination branches" value={num(sum(rows.filter((r: any) => r.branch !== 'JL'), (r: any) => r.pending))} icon={Warehouse} tone="violet" />
        <KPI label="Ageing > 5 days" value={rows.filter((r: any) => daysBetween(r.inDate) > 5).length} sub="lines" icon={Clock} tone="bad" />
      </div>
      <Segmented options={[{ key: 'detail', label: 'Stock detail' }, { key: 'summary', label: 'Stock summary' }]} value={view} onChange={setView} />
      <div className="mt-4">
        {view === 'detail' ? <DataTable id="stock" rows={rows} onRow={(r) => openRecord('lr', r.l?.id)} cols={[
          { key: 'lr', label: 'LR no.', value: (r) => r.l?.lrNo, render: (r) => <DocNo>{r.l?.lrNo}</DocNo>, mobile: 'title' }, { key: 'client', label: 'Client', value: (r) => lookup.custName(db, r.l?.consignorId), filter: true, mobile: 'sub' },
          { key: 'item', label: 'Item' }, { key: 'kind', label: 'Location', filter: true }, { key: 'godown', label: 'Godown', filter: true }, { key: 'gate', label: 'Gate no.', filter: true },
          { key: 'railHead', label: 'Rail head', filter: true, hidden: true }, { key: 'toBranch', label: 'To branch', filter: true }, { key: 'ref', label: 'GRN', render: (r) => <span className="docno">{r.ref}</span> },
          { key: 'inDate', label: 'In date', render: (r) => fmtDate(r.inDate) }, { key: 'age', label: 'Age', align: 'right', value: (r) => daysBetween(r.inDate), render: (r) => <span className={cls(daysBetween(r.inDate) > 5 && 'text-bad font-semibold')}>{daysBetween(r.inDate)}d</span> },
          { key: 'received', label: 'Received', align: 'right' }, { key: 'pending', label: 'In stock', align: 'right', mobile: 'right' },
        ]} /> : <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
          <ChartCard title="Stock by client" subtitle="Packages held" height={260}><Bars data={byClient} keys={[{ key: 'Packages', label: 'Packages' }]} horizontal /></ChartCard>
          <DataTable id="stock-summary" rows={Object.entries(groupBy(rows, (r: any) => `${r.godown}|${r.l?.consignorId}`)).map(([k, v]) => ({ id: k, godown: v[0].godown, client: lookup.custName(db, v[0].l?.consignorId), lrs: new Set(v.map((r: any) => r.l?.id)).size, pkgs: sum(v, (r: any) => r.pending), oldest: Math.max(...v.map((r: any) => daysBetween(r.inDate))) }))} cols={[{ key: 'godown', label: 'Godown', filter: true, mobile: 'sub' }, { key: 'client', label: 'Client', mobile: 'title' }, { key: 'lrs', label: 'LRs', align: 'right' }, { key: 'pkgs', label: 'Packages', align: 'right', mobile: 'right' }, { key: 'oldest', label: 'Oldest (days)', align: 'right' }]} />
        </div>}
      </div>
    </div>
  );
}

export function StockMovement() {
  const db = useDB();
  const { openRecord, nav } = useUI.getState();
  const roadPlans:any[]=((db as any).loadPlans||[]).filter((p:any)=>['Approved','Loading Confirmed'].includes(p.status));
  const [sid, setSid] = useState('');
  const mv: any[] = [];
  db.grns.forEach((g: any) => { const l = db.lrs.find((x: any) => x.id === g.lrId); if (sid && l?.scheduleId !== sid) return; mv.push({ id: g.id, at: g.createdAt, dir: 'In', stage: 'GRN at rail head', ref: g.grnNo, l, qty: sum(g.items, (i: any) => i.received), where: 'Jalgaon godown · gate ' + g.gateNo }); });
  db.schedules.filter((s: any) => !sid || s.id === sid).forEach((s: any) => s.loads.forEach((ld: any) => { const l = db.lrs.find((x: any) => x.id === ld.lrId); mv.push({ id: ld.id, at: ld.createdAt, dir: 'Out', stage: 'Loaded to VP', ref: ld.vpNo, l, qty: sum(ld.items, (i: any) => i.qty), where: `${s.rakeNo} · ${ld.vpNo}` }); }));
  db.dgrns.filter((g: any) => !sid || g.scheduleId === sid).forEach((g: any) => g.items.forEach((i: any, k: number) => { const l = db.lrs.find((x: any) => x.id === i.lrId); mv.push({ id: g.id + k, at: g.createdAt, dir: 'In', stage: 'DGRN at branch', ref: g.dgrnNo, l, qty: i.received, where: `${lookup.sched(db, g.scheduleId)?.destId} godown` }); }));
  db.dcs.filter((d: any) => !sid || d.scheduleId === sid).forEach((d: any) => d.items.forEach((i: any, k: number) => { const l = db.lrs.find((x: any) => x.id === i.lrId); mv.push({ id: d.id + k, at: d.createdAt, dir: 'Out', stage: 'Delivery challan', ref: d.dcNo, l, qty: i.qty, where: lookup.truckNo(db, d.truckId) }); }));
  mv.sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div>
      <PageHeader eyebrow="Warehouse" title="Stock movement" subtitle="Every inward and outward movement of rail consignments: GRN → VP loading → DGRN → delivery challan." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Inward (qty)" value={num(sum(mv.filter((m) => m.dir === 'In'), (m) => m.qty))} icon={ArrowDownToLine} tone="ok" />
        <KPI label="Outward (qty)" value={num(sum(mv.filter((m) => m.dir === 'Out'), (m) => m.qty))} icon={ArrowUpFromLine} tone="info" />
        <KPI label="Movements" value={mv.length} />
        <Card><Field label="VP schedule"><Select value={sid} onChange={(e) => setSid(e.target.value)} placeholder="All schedules" options={db.schedules.map((s: any) => ({ value: s.id, label: `${s.rakeNo} · ${fmtDate(s.date)}` }))} /></Field></Card>
      </div>
      <DataTable id="stock-move" rows={mv} onRow={(r) => r.l && openRecord('lr', r.l.id)} cols={[
        { key: 'at', label: 'Date', render: (r) => fmtDate(r.at) }, { key: 'dir', label: 'Dir', filter: true, render: (r) => <StatusBadge s={r.dir} tone={r.dir === 'In' ? 'ok' : 'info'} dot={false} />, mobile: 'meta' },
        { key: 'stage', label: 'Movement', filter: true, mobile: 'title' }, { key: 'ref', label: 'Reference', render: (r) => <span className="docno">{r.ref}</span> },
        { key: 'lr', label: 'LR no.', value: (r) => r.l?.lrNo, mobile: 'sub' }, { key: 'client', label: 'Client', value: (r) => lookup.cust(db, r.l?.consignorId)?.short, filter: true },
        { key: 'item', label: 'Item', value: (r) => r.l?.items[0]?.name }, { key: 'where', label: 'Location / vehicle' }, { key: 'qty', label: 'Qty', align: 'right', mobile: 'right' },
      ]} />
    </div>
  );
}

export function LoadingVerification() {
  const db = useDB();
  const { openRecord, nav } = useUI.getState();
  const roadPlans:any[]=((db as any).loadPlans||[]).filter((p:any)=>['Approved','Loading Confirmed'].includes(p.status));
  const [sid, setSid] = useState(db.schedules.find((s: any) => s.loads.length)?.id || '');
  const lrs = db.lrs.filter((l: any) => l.grnId && (!sid || l.scheduleId === sid || (!l.scheduleId && l.toBranchId === lookup.sched(db, sid)?.destId)));
  const rows = lrs.map((l: any) => { const g = db.grns.find((x: any) => x.id === l.grnId); const s = db.schedules.find((x: any) => x.loads.some((ld: any) => ld.lrId === l.id)); const loaded = s ? sum(s.loads.filter((ld: any) => ld.lrId === l.id), (ld: any) => sum(ld.items, (i: any) => i.qty)) : 0; const dmg = s ? sum(s.loads.filter((ld: any) => ld.lrId === l.id), (ld: any) => sum(ld.items, (i: any) => i.damage || 0)) : 0; const recv = sum(g.items, (i: any) => i.received); const diff = recv - loaded - dmg - sum(g.items, (i: any) => i.pending); return { id: l.id, l, booked: sum(l.items, (i: any) => i.qty), recv, loaded, dmg, pending: sum(g.items, (i: any) => i.pending), vps: s ? [...new Set(s.loads.filter((ld: any) => ld.lrId === l.id).map((ld: any) => ld.vpNo))].join(', ') : '', status: diff !== 0 ? 'Mismatch' : sum(g.items, (i: any) => i.pending) > 0 ? 'Partially loaded' : 'Verified' }; });
  return (
    <div>
      <PageHeader eyebrow="Warehouse" title="Stock loading verification" subtitle="Reconcile booked, received at GRN, loaded on VPs, damaged and pending quantities for each LR on a schedule." />
      {roadPlans.length>0 && <Card title="Road load-plan queue" subtitle="Approved Smart Load Plans awaiting or completing physical loading" pad={false}><div className="overflow-x-auto"><table className="w-full text-[12.5px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">Plan</th><th className="text-left px-2">Order</th><th className="text-left px-2">Vehicle</th><th className="text-right px-2">Planned</th><th className="text-right px-2">Loaded</th><th className="text-right px-2">Variance</th><th className="text-left px-4">Status</th></tr></thead><tbody>{roadPlans.map((p:any)=>{const oid=p.orderIds?.[0];const o=db.orders.find((x:any)=>x.id===oid);const planned=sum(p.lines||[],(x:any)=>Number(x.qty||0));const linked=db.lrs.filter((l:any)=>l.orderId===oid&&l.loadPlanId===p.id);const loaded=Number(p.loadingVerification?.actualLoaded||0);return <tr key={p.id} className="border-b border-line/60 hover:bg-surface2 cursor-pointer" onClick={()=>nav('ops/smart-load',{planId:p.id})}><td className="px-4 py-2"><DocNo>{p.planNo}</DocNo></td><td className="px-2"><DocNo>{o?.orderNo||oid}</DocNo></td><td className="px-2">{p.vehicle?.name||'—'}</td><td className="px-2 text-right tnum">{num(planned)}</td><td className="px-2 text-right tnum">{num(loaded)}</td><td className={cls('px-2 text-right tnum',loaded&&loaded!==planned?'text-warn':'')}>{p.loadingVerification?num(loaded-planned):'—'}</td><td className="px-4"><StatusBadge s={p.status} tone={p.status==='Loading Confirmed'?'ok':'warn'}/></td></tr>})}</tbody></table></div></Card>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card><Field label="VP schedule"><Select value={sid} onChange={(e) => setSid(e.target.value)} placeholder="All" options={db.schedules.map((s: any) => ({ value: s.id, label: `${s.rakeNo} · ${s.status}` }))} /></Field></Card>
        <KPI label="Verified" value={rows.filter((r: any) => r.status === 'Verified').length} icon={ListChecks} tone="ok" />
        <KPI label="Partially loaded" value={rows.filter((r: any) => r.status === 'Partially loaded').length} tone="warn" />
        <KPI label="Mismatches" value={rows.filter((r: any) => r.status === 'Mismatch').length} tone="bad" icon={AlertTriangle} />
      </div>
      <DataTable id="verify" rows={rows} onRow={(r) => openRecord('lr', r.id)} cols={[{ key: 'lr', label: 'LR no.', value: (r) => r.l.lrNo, render: (r) => <DocNo>{r.l.lrNo}</DocNo>, mobile: 'title' }, { key: 'client', label: 'Client', value: (r) => lookup.cust(db, r.l.consignorId)?.short, filter: true, mobile: 'sub' }, { key: 'vps', label: 'VP no.' }, { key: 'booked', label: 'Booked', align: 'right' }, { key: 'recv', label: 'GRN received', align: 'right' }, { key: 'loaded', label: 'Loaded', align: 'right' }, { key: 'dmg', label: 'Damage', align: 'right' }, { key: 'pending', label: 'Pending', align: 'right' }, { key: 'status', label: 'Status', filter: true, render: (r) => <StatusBadge s={r.status} tone={r.status === 'Verified' ? 'ok' : r.status === 'Mismatch' ? 'bad' : 'warn'} />, mobile: 'meta' }]} />
    </div>
  );
}

export function DamageShortage() {
  const db = useDB();
  const { openRecord } = useUI.getState();
  const rows: any[] = [];
  db.grns.forEach((g: any) => g.items.forEach((i: any) => { if (i.damage) { const l = db.lrs.find((x: any) => x.id === g.lrId); rows.push({ id: g.id + 'g', l, stage: 'GRN at rail head', ref: g.grnNo, date: g.inDate, damage: i.damage, shortage: 0, by: g.damageBy, amt: g.less.damage }); } }));
  db.dgrns.forEach((g: any) => g.items.forEach((i: any, k: number) => { if (i.damage) { const l = db.lrs.find((x: any) => x.id === i.lrId); rows.push({ id: g.id + k, l, stage: 'DGRN at branch', ref: g.dgrnNo, date: g.inDate, damage: i.damage, shortage: 0, by: g.damageBy, amt: 0 }); } }));
  db.dcs.forEach((d: any) => ['ackSupervisor', 'ackCollection', 'ackClient'].forEach((k) => (d[k]?.items || []).forEach((i: any, j: number) => { if (i.damage || i.shortage) rows.push({ id: d.id + k + j, l: db.lrs.find((x: any) => x.id === i.lrId), stage: `LDC ${k === 'ackSupervisor' ? 'supervisor' : k === 'ackCollection' ? 'collection' : 'client'} ack`, ref: d.dcNo, date: d[k].at?.slice(0, 10), damage: i.damage, shortage: i.shortage, by: '—', amt: (d[k].damageAmt || 0) + (d[k].shortageAmt || 0) }); })));
  db.lrs.filter((l: any) => l.ack && (l.ack.damageAmt || (l.ack.items || []).some((i: any) => i.damage))).forEach((l: any) => rows.push({ id: l.id + 'pod', l, stage: 'POD', ref: l.lrNo, date: l.ack.receivedDate, damage: sum(l.ack.items || [], (i: any) => i.damage), shortage: 0, by: '—', amt: l.ack.damageAmt }));
  rows.forEach((r) => (r.status = r.damage && r.shortage ? 'Damage and Shortage' : r.damage ? 'Damage' : 'Shortage'));
  return (
    <div>
      <PageHeader eyebrow="Warehouse" title="Damage / shortage" subtitle="All damage and shortage recorded at GRN, DGRN, LDC acknowledgments and POD – with the stage it was found and the amount recovered or deducted." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Incidents" value={rows.length} icon={AlertTriangle} tone="bad" />
        <KPI label="Damaged qty" value={sum(rows, (r) => r.damage)} />
        <KPI label="Shortage qty" value={sum(rows, (r) => r.shortage)} />
        <KPI label="Amount" value={`₹${num(sum(rows, (r) => r.amt))}`} />
      </div>
      <DataTable id="damage" rows={rows} onRow={(r) => r.l && openRecord('lr', r.l.id)} cols={[{ key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'lr', label: 'LR no.', value: (r) => r.l?.lrNo, render: (r) => <DocNo>{r.l?.lrNo}</DocNo>, mobile: 'title' }, { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.l?.truckId), filter: true }, { key: 'client', label: 'Client', value: (r) => lookup.cust(db, r.l?.consignorId)?.short, filter: true, mobile: 'sub' }, { key: 'stage', label: 'Found at', filter: true }, { key: 'ref', label: 'Reference', render: (r) => <span className="docno">{r.ref}</span> }, { key: 'damage', label: 'Damage', align: 'right' }, { key: 'shortage', label: 'Shortage', align: 'right' }, { key: 'by', label: 'Damage by', filter: true }, { key: 'amt', label: 'Amount', align: 'right', render: (r) => `₹${num(r.amt)}` }, { key: 'status', label: 'Status', filter: true, render: (r) => <StatusBadge s={r.status} tone="bad" dot={false} />, mobile: 'meta' }]} />
    </div>
  );
}

export function QualityControl() {
  const db = useDB();
  const [dim, setDim] = useState('client');
  const del = db.lrs.filter((l: any) => l.delivery);
  const key = (l: any) => (dim === 'client' ? l.consignorId : l.fromBranchId);
  const rows: any[] = Object.entries(groupBy(del, key)).map(([k, v]) => { const dmg = v.filter((l: any) => l.items.some((i: any) => i.damage)).length; const ontime = v.filter((l: any) => l.delivery.date <= l.dueDate).length; const pod = v.filter((l: any) => l.ack).length; return { id: k, name: dim === 'client' ? lookup.custName(db, k) : lookup.branch(db, k)?.name, n: v.length, dmgFree: ((v.length - dmg) / v.length) * 100, ontime: (ontime / v.length) * 100, pod: (pod / v.length) * 100, complaints: db.complaints.filter((c: any) => c.customerId === k).length }; });
  rows.forEach((r: any) => ((r as any).score = Math.round(r.dmgFree * 0.4 + r.ontime * 0.4 + r.pod * 0.2)));
  return (
    <div>
      <PageHeader eyebrow="Warehouse" title="Quality control" subtitle="Service quality per client or branch: damage-free deliveries, on-time %, POD turnaround and complaints, combined into a QC score." actions={<Segmented options={[{ key: 'client', label: 'By client' }, { key: 'branch', label: 'By branch' }]} value={dim} onChange={setDim} />} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Deliveries assessed" value={del.length} icon={ShieldCheck} />
        <KPI label="Damage-free" value={pct((del.filter((l: any) => !l.items.some((i: any) => i.damage)).length / Math.max(1, del.length)) * 100)} tone="ok" />
        <KPI label="On-time" value={pct((del.filter((l: any) => l.delivery.date <= l.dueDate).length / Math.max(1, del.length)) * 100)} tone="info" />
        <KPI label="Open complaints" value={db.complaints.filter((c: any) => !c.closed).length} tone="warn" />
      </div>
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <DataTable id="qc" rows={rows} cols={[{ key: 'name', label: dim === 'client' ? 'Client' : 'Branch', mobile: 'title' }, { key: 'n', label: 'Deliveries', align: 'right' }, { key: 'dmgFree', label: 'Damage-free', align: 'right', render: (r) => pct(r.dmgFree) }, { key: 'ontime', label: 'On-time', align: 'right', render: (r) => pct(r.ontime) }, { key: 'pod', label: 'POD received', align: 'right', render: (r) => pct(r.pod) }, { key: 'complaints', label: 'Complaints', align: 'right' }, { key: 'score', label: 'QC score', align: 'right', render: (r) => <StatusBadge s={String(r.score)} tone={r.score >= 85 ? 'ok' : r.score >= 70 ? 'warn' : 'bad'} dot={false} />, mobile: 'right' }]} initialSort={{ key: 'score', dir: 1 }} />
        <ChartCard title="QC score" height={300}><Bars data={rows.map((r: any) => ({ x: (r.name || '').split(' ')[0], Score: r.score }))} keys={[{ key: 'Score', label: 'QC score' }]} horizontal /></ChartCard>
      </div>
    </div>
  );
}
