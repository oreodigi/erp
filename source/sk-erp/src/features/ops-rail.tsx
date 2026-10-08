import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, lrStage, defLedger } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Segmented, Stat, EmptyState, Progress, Tabs, Toggle } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Modal, Timeline, WorkflowStepper } from '../components/overlays';
import { fmtDate, fmtDT, ymd, hm, addDays, sum, inr, num, cls, daysBetween, iso, now } from '../lib/util';
import { Plus, Pencil, Trash2, Printer, Eye, TrainFront, Layers, Boxes, Play, FileText, Warehouse, PackageCheck, CheckCircle2, Clock, Send, Upload, Lock, Activity, Scale, AlertTriangle, ArrowRight } from 'lucide-react';

const dtLocal = (s?: string) => (s ? s.slice(0, 16) : '');
const fromLocal = (s: string) => (s ? new Date(s).toISOString() : '');
export const FREE_HOURS = 5;
export const dcHours = (a?: string, b?: string) => (a && b ? Math.max(0, Math.round(((+new Date(b) - +new Date(a)) / 36e5 - FREE_HOURS) * 10) / 10) : 0);

function SchedulePicker({ value, onChange, filter, label = 'Schedule' }: { value: string; onChange: (v: string) => void; filter?: (s: any) => boolean; label?: string }) {
  const db = useDB();
  const list = db.schedules.filter(filter || (() => true));
  return <Field label={label} required><Select value={value} onChange={(e) => onChange(e.target.value)} placeholder="Select schedule" options={list.map((s: any) => ({ value: s.id, label: `${fmtDate(s.date)} · ${s.rakeNo} · JL→${s.destId} · ${s.status}` }))} /></Field>;
}
function SchedInfo({ s }: { s: any }) {
  const db = useDB();
  if (!s) return null;
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-surface2 border border-line p-3 text-[12.5px]">{[['From branch', lookup.branch(db, s.fromBranchId)?.name], ['To branch', lookup.branch(db, s.toBranchId)?.name], ['Source', lookup.branch(db, s.sourceId)?.name], ['Destination', lookup.branch(db, s.destId)?.name]].map(([k, v]) => <div key={k}><div className="text-[11px] text-muted font-semibold">{k}</div><div className="font-medium">{v}</div></div>)}</div>;
}

// ---------------- VP Schedule ----------------
export function VPSchedule() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint, ask } = useUI.getState();
  const [form, setForm] = useState<any>(params.new ? {} : null);
  const rows = db.schedules.slice().reverse();
  return (
    <div>
      <PageHeader eyebrow="Operations · Rail" title="VP scheduling" subtitle="Plan parcel-van rakes: date, route between rail heads and the wagon mix. A final schedule unlocks load planning, MR/RR and VP loading." actions={<button className="btn-primary" onClick={() => setForm({})}><Plus size={15} /> New schedule</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Planned" value={db.schedules.filter((s: any) => s.status === 'Planned').length} icon={Clock} tone="muted" />
        <KPI label="Loading" value={db.schedules.filter((s: any) => s.status === 'Loading').length} icon={Boxes} tone="warn" />
        <KPI label="In transit" value={db.schedules.filter((s: any) => s.status === 'In Transit').length} icon={TrainFront} tone="info" />
        <KPI label="Completed" value={db.schedules.filter((s: any) => s.isCompleted).length} icon={CheckCircle2} tone="ok" />
      </div>
      <DataTable id="vp-schedule" rows={rows} onRow={(r) => openRecord('rake', r.id)} cols={[
        { key: 'rakeNo', label: 'Rake no.', render: (r) => <DocNo>{r.rakeNo}</DocNo>, mobile: 'title' },
        { key: 'title', label: 'Schedule name', mobile: 'sub' },
        { key: 'date', label: 'Schedule date', render: (r) => fmtDate(r.date) },
        { key: 'src', label: 'Source', value: (r) => lookup.branch(db, r.sourceId)?.short },
        { key: 'dst', label: 'Destination', value: (r) => lookup.branch(db, r.destId)?.name, filter: true },
        { key: 'wagons', label: 'Wagons', value: (r) => r.wagons.map((w: any) => `${lookup.wagon(db, w.wagonId)}×${w.count}`).join(', ') },
        { key: 'lrs', label: 'LRs', align: 'right', value: (r) => db.lrs.filter((l: any) => l.scheduleId === r.id).length },
        { key: 'isFinal', label: 'Final', render: (r) => (r.isFinal ? <Lock size={13} className="text-violet" /> : <span className="text-faint">—</span>) },
        { key: 'status', label: 'Status', filter: true, render: (r) => <StatusBadge s={r.status} />, mobile: 'meta' },
      ]} rowActions={(r: any) => [
        { label: 'Open rake 360', icon: Eye, onClick: () => openRecord('rake', r.id) },
        { label: 'Edit', icon: Pencil, onClick: () => setForm(r), hidden: r.isCompleted },
        { label: 'Print loading summary', icon: Printer, onClick: () => openPrint('loadsummary', r.id) },
        { label: 'Close rake', icon: Lock, onClick: () => ask({ title: `Close ${r.rakeNo}?`, body: 'Marks the rake completed. Further loading/unloading entries will be locked.', onConfirm: () => A.closeRake(r.id) }), hidden: r.isCompleted || !['Unloading', 'Arrived'].includes(r.status) },
        { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => ask({ title: `Delete ${r.rakeNo}?`, body: 'Only planned schedules without loading can be deleted.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.remove('schedules', r.id, 'Schedule') }), hidden: r.loads.length > 0 },
      ]} />
      {form && <ScheduleForm init={form.id ? form : null} onClose={() => setForm(null)} />}
    </div>
  );
}
function ScheduleForm({ init, onClose }: { init: any; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState<any>(init ? structuredClone(init) : { date: ymd(addDays(now(), 3)), fromBranchId: 'JL', toBranchId: 'GH', sourceId: 'JL', destId: 'GH', title: '', isFinal: false, isCompleted: false, wagons: db.wagons.filter((w: any) => w.active !== false).slice(0, 2).map((w: any, i: number) => ({ wagonId: w.id, count: i ? 2 : 4 })) });
  const rh = db.branches.filter((b: any) => b.isRailHead);
  const title = f.title || `${f.date} ${f.sourceId}→${f.destId} Parcel Rake`;
  return (
    <Drawer open onClose={onClose} title={init ? `Edit ${init.rakeNo}` : 'New VP schedule'} subtitle="Legacy: Transactions/VPSchedule.aspx" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { A.saveSchedule({ ...f, title, vps: f.vps?.length ? f.vps : f.wagons.flatMap((w: any) => Array.from({ length: w.count }, (_, k) => ({ wagonId: w.wagonId, vpNo: `${lookup.wagon(db, w.wagonId)}-${k + 1}` }))) }); onClose(); }}>Save schedule</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        <FormSection title="Schedule" cols={2}>
          <Field label="Planning date" required><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Schedule title"><Input value={f.title} placeholder={title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="From branch"><Select value={f.fromBranchId} onChange={(e) => setF({ ...f, fromBranchId: e.target.value })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="To branch"><Select value={f.toBranchId} onChange={(e) => setF({ ...f, toBranchId: e.target.value, destId: rh.some((b: any) => b.id === e.target.value) ? e.target.value : f.destId })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="Source rail head"><Select value={f.sourceId} onChange={(e) => setF({ ...f, sourceId: e.target.value })} options={rh.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="Destination rail head"><Select value={f.destId} onChange={(e) => setF({ ...f, destId: e.target.value })} options={rh.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <div className="flex gap-5 sm:col-span-2"><Check label="Schedule is final" checked={f.isFinal} onChange={(v) => setF({ ...f, isFinal: v })} /><Check label="Completed" checked={f.isCompleted} onChange={(v) => setF({ ...f, isCompleted: v })} /></div>
        </FormSection>
        <FormSection title="Wagon count by type" cols={1}>
          <div className="border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">Wagon type</th><th className="text-left px-2">Description</th><th className="px-3 w-28 text-right">Count</th></tr></thead>
              <tbody>{db.wagons.map((w: any) => { const row = f.wagons.find((x: any) => x.wagonId === w.id); return <tr key={w.id} className="border-t border-line"><td className="px-3 py-1.5 font-semibold">{w.name}</td><td className="px-2 text-muted">{w.type} · {w.description}</td><td className="px-3"><input type="number" min={0} className="input h-8 text-right" value={row?.count || 0} aria-label={`${w.name} count`} onChange={(e) => { const c = Number(e.target.value); const others = f.wagons.filter((x: any) => x.wagonId !== w.id); setF({ ...f, wagons: c ? [...others, { wagonId: w.id, count: c }] : others }); }} /></td></tr>; })}</tbody>
            </table>
          </div>
          <div className="text-[12px] text-muted">Total VPs: <b className="text-ink">{sum(f.wagons, (w: any) => w.count)}</b> · capacity {num(sum(f.wagons, (w: any) => (db.wagons.find((x: any) => x.id === w.wagonId)?.weight || 0) * w.count) / 1000)} t</div>
        </FormSection>
      </div>
    </Drawer>
  );
}

// ---------------- VP Planning (load optimisation) ----------------
export function VPPlanning() {
  const db = useDB();
  const { openPrint, openRecord } = useUI.getState();
  const cands = db.schedules.filter((s: any) => !s.isCompleted && ['Planned', 'Loading'].includes(s.status));
  const [sid, setSid] = useState(cands[0]?.id || '');
  const [running, setRunning] = useState(false);
  const s = lookup.sched(db, sid);
  const lrs = s ? db.lrs.filter((l: any) => (l.scheduleId === s.id || (!l.scheduleId && l.mode !== 'Road' && l.toBranchId === s.destId)) && ['Finalised', 'In Transit', 'At Rail Head', 'Loaded'].includes(l.status)) : [];
  const cargo = lrs.map((l: any) => { const g = lookup.goods(db, l.items[0].goodsId); const grn = db.grns.find((x: any) => x.lrId === l.id); return { l, g, qty: grn ? grn.items[0].received : l.items[0].qty, vol: g ? (g.length * g.width * g.height) / 1e6 : 0, wt: g?.weight || 0 }; });
  const totVol = sum(cargo, (c: any) => c.vol * c.qty), totWt = sum(cargo, (c: any) => c.wt * c.qty);
  const capVol = s ? sum(s.wagons, (w: any) => { const wg = db.wagons.find((x: any) => x.id === w.wagonId); return (wg.length * wg.width * wg.height * w.count) / 1e6; }) : 0;
  const capWt = s ? sum(s.wagons, (w: any) => db.wagons.find((x: any) => x.id === w.wagonId).weight * w.count) : 0;
  const run = () => { setRunning(true); setTimeout(() => { A.runPlan(sid); setRunning(false); }, 1400); };
  return (
    <div>
      <PageHeader eyebrow="Operations · Rail" title="Vehicle planning" subtitle="Load optimisation for a VP schedule: cargo dimensions, orientation and stacking rules from the Goods master are sent to the optimiser, which returns loading instruction, diagram, solution and summary reports." />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="grid gap-4 min-w-0">
          <Card><div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end"><SchedulePicker value={sid} onChange={setSid} filter={(x) => !x.isCompleted} /><button className="btn-primary h-9" disabled={!s || running || !cargo.length} onClick={run}>{running ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Optimising…</> : <><Play size={15} /> Run load optimisation</>}</button></div>{s && <div className="mt-3"><SchedInfo s={s} /></div>}</Card>
          {s && <Card title="Cargo for this rake" subtitle={`${cargo.length} LRs · stacking rule: higher stack value bottom first · weight limited`} pad={false}>
            {running ? <div className="p-4 grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-9" />)}</div> : (
              <div className="overflow-x-auto"><table className="w-full text-[12.5px] min-w-[720px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">LR</th><th className="text-left px-2">Goods</th><th className="text-right px-2">Qty</th><th className="text-right px-2">L×W×H (cm)</th><th className="text-right px-2">Volume m³</th><th className="text-right px-2">Weight t</th><th className="text-left px-2">Orientation</th><th className="text-left px-4">Stacking</th></tr></thead>
                <tbody>{cargo.map(({ l, g, qty, vol, wt }: any) => <tr key={l.id} className="border-b border-line/60 hover:bg-surface2 cursor-pointer" onClick={() => openRecord('lr', l.id)}><td className="px-4 py-2"><DocNo>{l.lrNo}</DocNo></td><td className="px-2">{g?.name}</td><td className="px-2 text-right tnum">{num(qty)}</td><td className="px-2 text-right tnum">{g?.length}×{g?.width}×{g?.height}</td><td className="px-2 text-right tnum">{(vol * qty).toFixed(1)}</td><td className="px-2 text-right tnum">{((wt * qty) / 1000).toFixed(1)}</td><td className="px-2">{g?.storagePosition}</td><td className="px-4">{g?.stacking ? `Yes · ${g.layer} layers` : 'No'}</td></tr>)}</tbody>
              </table></div>)}
            {!cargo.length && <EmptyState icon={Boxes} title="No cargo assigned" body="Rail LRs booked to this destination appear here once finalised." />}
          </Card>}
        </div>
        {s && <div className="grid gap-4">
          <Card title="Capacity">
            <div className="grid gap-3">
              <div><div className="flex justify-between text-[12.5px] mb-1"><span className="text-muted">Volume</span><span className="tnum font-semibold">{totVol.toFixed(0)} / {capVol.toFixed(0)} m³</span></div><Progress value={(totVol / capVol) * 100} tone={totVol > capVol ? 'bad' : 'violet'} className="h-2" /></div>
              <div><div className="flex justify-between text-[12.5px] mb-1"><span className="text-muted">Weight</span><span className="tnum font-semibold">{(totWt / 1000).toFixed(1)} / {(capWt / 1000).toFixed(0)} t</span></div><Progress value={(totWt / capWt) * 100} tone={totWt > capWt ? 'bad' : 'info'} className="h-2" /></div>
              <div className="flex flex-wrap gap-1.5 pt-1">{s.wagons.map((w: any) => <span key={w.wagonId} className="chip bg-surface2 border border-line">{lookup.wagon(db, w.wagonId)} × {w.count}</span>)}</div>
            </div>
          </Card>
          <Card title="Optimisation reports" subtitle={s.plan ? `Last run ${fmtDT(s.plan.runAt)}` : 'Not run yet'}>
            {s.plan ? <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3"><Stat label="Space utilisation" value={`${s.plan.utilisation}%`} tone="ok" /><Stat label="Weight utilisation" value={`${s.plan.weightUtil}%`} /></div>
              <div className="grid gap-1.5">{s.plan.reports.map((r: string, i: number) => <button key={r} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line hover:border-violet/40 text-[13px] text-left" onClick={() => openPrint('loadsummary', s.id, r)}><span className="w-5 h-5 rounded bg-violet/10 text-violet grid place-items-center text-[11px] font-bold">{i + 1}</span>{r}<ArrowRight size={13} className="ml-auto text-faint" /></button>)}</div>
              <WagonDiagram s={s} />
            </div> : <EmptyState icon={Layers} title="Run the optimiser" body="Generates loading instruction, diagram, solution and summary for the supervisor." />}
          </Card>
        </div>}
      </div>
      <div className="mt-6"><div className="eyebrow mb-2">Planned schedules</div>
        <DataTable id="vp-planning" rows={db.schedules.filter((x: any) => x.plan).slice().reverse()} onRow={(r) => setSid(r.id)} cols={[{ key: 'rakeNo', label: 'Rake', render: (r) => <DocNo>{r.rakeNo}</DocNo>, mobile: 'title' }, { key: 'title', label: 'Schedule name', mobile: 'sub' }, { key: 'date', label: 'Schedule date', render: (r) => fmtDate(r.date) }, { key: 'src', label: 'Source', value: (r) => r.sourceId }, { key: 'dst', label: 'Destination', value: (r) => r.destId }, { key: 'util', label: 'Utilisation', render: (r) => `${r.plan.utilisation}%` }, { key: 'rep', label: 'Reports', sortable: false, render: (r) => <div className="flex gap-1">{r.plan.reports.map((x: string) => <button key={x} title={x} onClick={(e) => { e.stopPropagation(); openPrint('loadsummary', r.id, x); }} className="btn-icon h-7 w-7"><FileText size={13} /></button>)}</div> }]} />
      </div>
    </div>
  );
}
function WagonDiagram({ s }: { s: any }) {
  const db = useDB();
  const vps = s.mrrr?.rows || s.vps;
  return (
    <div>
      <div className="eyebrow mb-1.5">Rake diagram</div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
        <div className="w-7 h-12 rounded-l-xl bg-ink/80 shrink-0" title="Locomotive" />
        {vps.map((v: any, i: number) => { const q = sum(s.loads.filter((l: any) => l.vpNo === v.vpNo), (l: any) => sum(l.items, (x: any) => x.qty)); const fill = Math.min(100, q / 4); return <div key={i} title={`${v.vpNo} · ${q} qty`} className="w-10 h-12 rounded border border-line bg-surface2 relative overflow-hidden shrink-0"><div className="absolute bottom-0 inset-x-0 bg-violet/70" style={{ height: `${fill}%` }} /><span className="absolute inset-x-0 top-0.5 text-[9px] text-center font-semibold">{lookup.wagon(db, v.wagonId)}</span></div>; })}
      </div>
    </div>
  );
}

// ---------------- VP Loading ----------------
export function VPLoading() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openPrint, ask, openRecord } = useUI.getState();
  const cands = db.schedules.filter((s: any) => !s.isCompleted && s.isFinal && ['Planned', 'Loading'].includes(s.status));
  const [sid, setSid] = useState(params.id || cands[0]?.id || '');
  const s = lookup.sched(db, sid);
  const [f, setF] = useState<any>({ vpNo: '', gateNo: '', lrId: '', items: [], labourCharge: '', labourId: '', supervisorId: 'lb1', date: ymd() });
  const avail = db.lrs.filter((l: any) => l.grnId && s && l.toBranchId === s.destId && (!l.scheduleId || l.scheduleId === s.id) && db.grns.find((g: any) => g.id === l.grnId)?.items.some((i: any) => i.pending > 0));
  const grn = db.grns.find((g: any) => g.lrId === f.lrId);
  const lr = db.lrs.find((l: any) => l.id === f.lrId);
  const vps = s ? (s.mrrr?.rows || s.vps) : [];
  const wagon = vps.find((v: any) => v.vpNo === f.vpNo);
  const wg = wagon && db.wagons.find((w: any) => w.id === wagon.wagonId);
  const loadedInVP = s ? s.loads.filter((l: any) => l.vpNo === f.vpNo) : [];
  const usedCFT = sum(loadedInVP, (ld: any) => { const l = db.lrs.find((x: any) => x.id === ld.lrId); const g = lookup.goods(db, l?.items[0].goodsId); return g ? (g.length * g.width * g.height * sum(ld.items, (i: any) => i.qty)) / 28316.8 : 0; });
  const usedWt = sum(loadedInVP, (ld: any) => { const l = db.lrs.find((x: any) => x.id === ld.lrId); const g = lookup.goods(db, l?.items[0].goodsId); return (g?.weight || 0) * sum(ld.items, (i: any) => i.qty); });
  const totCFT = wg ? (wg.length * wg.width * wg.height) / 28316.8 : 0;
  const lrG = lr && lookup.goods(db, lr.items[0].goodsId);
  const loadQty = sum(f.items, (i: any) => Number(i.qty || 0));
  const lrCFT = lrG ? (lrG.length * lrG.width * lrG.height * loadQty) / 28316.8 : 0;
  const lrWt = (lrG?.weight || 0) * loadQty;
  const pickLR = (id: string) => { const g = db.grns.find((x: any) => x.lrId === id); setF({ ...f, lrId: id, gateNo: g?.gateNo || '', items: g ? g.items.map((i: any) => ({ idx: i.idx, total: i.total, received: i.received, pending: i.pending, qty: i.pending, damage: 0 })) : [], labourCharge: g ? Math.round(sum(g.items, (i: any) => i.pending) * (db.hamaliRates.find((h: any) => h.goodsId === lr?.items[0].goodsId && h.use === 'VP Loading')?.rate || 1.8)) : '' }); };
  const save = () => {
    if (!f.vpNo || !f.lrId || !loadQty) return useUI.getState().toast('Select VP, LR and load quantity', 'bad');
    if (f.items.some((i: any) => Number(i.qty) + Number(i.damage || 0) > i.pending)) return useUI.getState().toast('Load + damage cannot exceed pending quantity', 'bad');
    A.addVPLoad(sid, { vpNo: f.vpNo, wagonId: wagon?.wagonId, gateNo: f.gateNo, lrId: f.lrId, items: f.items.map((i: any) => ({ idx: i.idx, qty: Number(i.qty), damage: Number(i.damage || 0) })), labourCharge: Number(f.labourCharge || 0), labourId: f.labourId, supervisorId: f.supervisorId, date: f.date });
    setF({ ...f, lrId: '', items: [], labourCharge: '' });
  };
  return (
    <div>
      <PageHeader eyebrow="Operations · Rail" title="VP loading" subtitle="Load GRN stock from the rail-head godown into parcel vans. Capacity per VP is tracked in CFT and weight; loading hamali flows to Hamali Payments." actions={s && <button className="btn-ghost" onClick={() => openPrint('loadsummary', s.id)}><Printer size={15} /> Loading summary</button>} />
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        <Card>
          <div className="grid gap-5">
            <SchedulePicker value={sid} onChange={(v) => { setSid(v); setF({ ...f, vpNo: '', lrId: '', items: [] }); }} filter={(x) => !x.isCompleted && x.isFinal} />
            {s && <SchedInfo s={s} />}
            {s && <>
              <FormSection title="Wagon & consignment" cols={3}>
                <Field label="VP no." required><Select value={f.vpNo} onChange={(e) => setF({ ...f, vpNo: e.target.value })} placeholder="Select VP" options={vps.map((v: any) => ({ value: v.vpNo, label: `${v.vpNo} · ${lookup.wagon(db, v.wagonId)}` }))} /></Field>
                <Field label="LR no." required><Select value={f.lrId} onChange={(e) => pickLR(e.target.value)} placeholder={avail.length ? 'Select LR with GRN stock' : 'No GRN stock pending'} options={avail.map((l: any) => ({ value: l.id, label: `${l.lrNo} · ${lookup.cust(db, l.consignorId)?.short} · ${db.grns.find((g: any) => g.id === l.grnId)?.items[0].pending} pending` }))} /></Field>
                <Field label="Gate no."><Select value={String(f.gateNo)} onChange={(e) => setF({ ...f, gateNo: e.target.value })} placeholder="Select" options={Array.from({ length: 15 }, (_, i) => String(i + 1))} /></Field>
              </FormSection>
              {f.items.length > 0 && <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.75px] min-w-[560px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">Item</th><th className="text-right px-2">Total</th><th className="text-right px-2">Received</th><th className="text-right px-2">Pending</th><th className="px-2 w-24">Load qty</th><th className="px-3 w-24">Damage</th></tr></thead>
                <tbody>{f.items.map((it: any, k: number) => <tr key={k} className="border-t border-line"><td className="px-3 py-1.5 font-medium">{lr?.items[it.idx]?.name}</td><td className="px-2 text-right tnum">{it.total}</td><td className="px-2 text-right tnum">{it.received}</td><td className="px-2 text-right tnum">{it.pending}</td><td className="px-2"><input className="input h-8 text-right" type="number" value={it.qty} aria-label="Load quantity" onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, qty: e.target.value } : x)) })} /></td><td className="px-3"><input className="input h-8 text-right" type="number" value={it.damage} aria-label="Damage quantity" onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, damage: e.target.value } : x)) })} /></td></tr>)}</tbody></table></div>}
              <FormSection title="Labour" cols={3}>
                <Field label="Labour charge (₹)"><Input type="number" value={f.labourCharge} onChange={(e) => setF({ ...f, labourCharge: e.target.value })} /></Field>
                <Field label="Hamal / labour"><Select value={f.labourId} onChange={(e) => setF({ ...f, labourId: e.target.value })} placeholder="Select" options={db.labours.filter((l: any) => l.type === 'Hamal').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
                <Field label="Supervisor"><Select value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })} options={db.labours.filter((l: any) => l.type === 'Supervisor').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
              </FormSection>
              <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF({ ...f, lrId: '', items: [] })}>Clear</button><button className="btn-primary" onClick={save}><Boxes size={15} /> Save loading</button></div>
            </>}
          </div>
        </Card>
        {s && <Card title={f.vpNo ? `VP ${f.vpNo}` : 'Wagon capacity'} subtitle={wg ? `${wg.name} · ${wg.type}` : 'Select a VP'}>
          {wg ? <div className="grid gap-3 text-[12.5px]">
            <div className="grid grid-cols-2 gap-3"><Stat label="Total CFT" value={num(totCFT)} /><Stat label="Total weight" value={`${num(wg.weight / 1000, 1)} t`} /><Stat label="Remaining CFT" value={num(totCFT - usedCFT - lrCFT)} tone={totCFT - usedCFT - lrCFT < 0 ? 'bad' : 'ok'} /><Stat label="Remaining weight" value={`${num((wg.weight - usedWt - lrWt) / 1000, 1)} t`} tone={wg.weight - usedWt - lrWt < 0 ? 'bad' : 'ok'} /><Stat label="This LR CFT" value={num(lrCFT)} /><Stat label="This LR weight" value={`${num(lrWt)} kg`} /></div>
            <div><div className="text-muted mb-1">Space after this load</div><Progress value={((usedCFT + lrCFT) / totCFT) * 100} tone={usedCFT + lrCFT > totCFT ? 'bad' : 'violet'} className="h-2.5" /></div>
            {loadedInVP.length > 0 && <div><div className="eyebrow mb-1">Already in this VP</div>{loadedInVP.map((ld: any) => <div key={ld.id} className="flex justify-between py-1 border-b border-line/60"><span className="docno">{db.lrs.find((l: any) => l.id === ld.lrId)?.lrNo}</span><span className="tnum">{sum(ld.items, (i: any) => i.qty)}</span></div>)}</div>}
          </div> : <div className="text-[12.5px] text-muted">Pick a VP to see live CFT and weight headroom.</div>}
          <div className="mt-4"><WagonDiagram s={s} /></div>
        </Card>}
      </div>
      {s && <div className="mt-6"><DataTable id="vp-loads" title={`Loading entries · ${s.rakeNo}`} rows={s.loads.map((x: any) => ({ ...x, lr: db.lrs.find((l: any) => l.id === x.lrId) }))} cols={[
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'vpNo', label: 'VP no.', render: (r) => <DocNo>{r.vpNo}</DocNo>, mobile: 'title' }, { key: 'w', label: 'Wagon', value: (r) => lookup.wagon(db, r.wagonId) },
        { key: 'lrNo', label: 'LR number', value: (r) => r.lr?.lrNo, render: (r) => <DocNo onClick={() => openRecord('lr', r.lrId)}>{r.lr?.lrNo}</DocNo>, mobile: 'sub' }, { key: 'item', label: 'Item', value: (r) => r.lr?.items[0]?.name },
        { key: 'qty', label: 'Load qty', align: 'right', value: (r) => sum(r.items, (i: any) => i.qty) }, { key: 'dmg', label: 'Damage', align: 'right', value: (r) => sum(r.items, (i: any) => i.damage || 0) }, { key: 'gateNo', label: 'Gate' },
        { key: 'labourCharge', label: 'Hamali', align: 'right', render: (r) => inr(r.labourCharge) }, { key: 'paid', label: 'Hamali paid', render: (r) => <StatusBadge s={r.hamaliPaymentId ? 'Paid' : 'Pending'} />, mobile: 'meta' },
      ]} rowActions={(r: any) => [{ label: 'Delete entry', icon: Trash2, tone: 'bad', hidden: !!r.hamaliPaymentId || s.status !== 'Loading' && s.status !== 'Planned', onClick: () => ask({ title: 'Delete loading entry?', body: 'Quantity returns to GRN pending stock.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.removeVPLoad(s.id, r.id) }) }]} /></div>}
    </div>
  );
}

// ---------------- GRN at Rail Head ----------------
export function GRNPage() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openPrint, openRecord, ask } = useUI.getState();
  const [form, setForm] = useState<boolean>(!!params.new);
  const rows = db.grns.slice().reverse().map((g: any) => ({ ...g, lr: db.lrs.find((l: any) => l.id === g.lrId) }));
  const awaiting = db.lrs.filter((l: any) => l.mode !== 'Road' && l.isFinal && !l.grnId && ['Finalised', 'In Transit'].includes(l.status));
  return (
    <div>
      <PageHeader eyebrow="Operations · Rail" title="GRN at rail head" subtitle="Receive feeder trucks at the Jalgaon rail-head godown: verify documents, record received/damaged quantities, settle lorry freight and unloading hamali. GRN stock becomes available for VP loading." actions={<button className="btn-primary" onClick={() => setForm(true)}><Plus size={15} /> Generate GRN</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Awaiting GRN" value={awaiting.length} icon={Clock} tone="warn" />
        <KPI label="GRNs (7 days)" value={db.grns.filter((g: any) => daysBetween(g.inDate) <= 7).length} icon={Warehouse} />
        <KPI label="Stock pending loading" value={num(sum(db.grns, (g: any) => sum(g.items, (i: any) => i.pending)))} sub="packages in godown" icon={Boxes} tone="info" />
        <KPI label="Damage reported" value={db.grns.filter((g: any) => g.items.some((i: any) => i.damage > 0)).length} icon={AlertTriangle} tone="bad" />
      </div>
      <DataTable id="grn" rows={rows} cols={[
        { key: 'grnNo', label: 'GRN no.', render: (r) => <DocNo>{r.grnNo}</DocNo>, mobile: 'title' },
        { key: 'lrNo', label: 'LR no.', value: (r) => r.lr?.lrNo, render: (r) => <DocNo onClick={() => openRecord('lr', r.lrId)}>{r.lr?.lrNo}</DocNo>, mobile: 'sub' },
        { key: 'consignor', label: 'Consignor', value: (r) => lookup.custName(db, r.lr?.consignorId), filter: true },
        { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.lr?.truckId) },
        { key: 'source', label: 'Source', value: (r) => r.lr?.source }, { key: 'destination', label: 'Destination', value: (r) => r.lr?.destination },
        { key: 'inDate', label: 'Date', render: (r) => fmtDate(r.inDate) }, { key: 'gateNo', label: 'Gate', align: 'center' },
        { key: 'recv', label: 'Received', align: 'right', value: (r) => sum(r.items, (i: any) => i.received) }, { key: 'pend', label: 'Pending', align: 'right', value: (r) => sum(r.items, (i: any) => i.pending) },
        { key: 'dmg', label: 'Damage', render: (r) => (sum(r.items, (i: any) => i.damage) ? <StatusBadge s={`${sum(r.items, (i: any) => i.damage)} dmg`} tone="bad" /> : <span className="text-faint">—</span>), mobile: 'meta' },
        { key: 'net', label: 'Net freight', align: 'right', render: (r) => inr(r.net) },
      ]} rowActions={(r: any) => [{ label: 'Print GRN slip', icon: Printer, onClick: () => openPrint('grn', r.id) }, { label: 'Open LR', icon: Eye, onClick: () => openRecord('lr', r.lrId) }, { label: 'Delete GRN', icon: Trash2, tone: 'bad', hidden: sum(r.items, (i: any) => i.pending) !== sum(r.items, (i: any) => i.received), onClick: () => ask({ title: `Delete ${r.grnNo}?`, body: 'The LR returns to in-transit and stock is removed from the godown.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.deleteGRN(r.id) }) }]} />
      {form && <GRNForm lrId={params.lrId} onClose={() => { setForm(false); useUI.getState().set({ params: {} }); }} />}
    </div>
  );
}
function GRNForm({ lrId, onClose }: { lrId?: string; onClose: () => void }) {
  const db = useDB();
  const cands = db.lrs.filter((l: any) => l.mode !== 'Road' && l.isFinal && !l.grnId && ['Finalised', 'In Transit'].includes(l.status));
  const [f, setF] = useState<any>({ lrId: lrId || '', inDate: ymd(), inTime: '08:00', outDate: ymd(), outTime: hm(), unloadingTime: '', gateNo: '1', totalFreight: 0, freightPMT: 0, detentionDays: 0, detentionAmt: 0, less: { advance: 0, tds: 0, damage: 0, hamali: 0, stationery: 50 }, docs: { lrCopy: { ok: true, rmk: '' }, invoice: { ok: true, rmk: '' }, wayBill: { ok: true, rmk: '' }, seal: { ok: true, rmk: '' }, kata: { ok: false, rmk: '' } }, damageBy: 'No Damage', labourId: '', labourCount: '4', labourCharge: 0, supervisorId: 'lb1', remark: '', items: [], uploads: [] as any[] });
  const lr = db.lrs.find((l: any) => l.id === f.lrId);
  useEffect(() => { if (lr) { const km = Math.max(30, Math.round(Math.hypot(1, 1))); setF((p: any) => ({ ...p, items: lr.items.map((it: any, idx: number) => ({ idx, total: it.qty, received: it.qty, damage: 0, pending: it.qty })), totalFreight: lr.mkt?.freight || 0, less: { ...p.less, advance: lr.mkt?.advance || 0, tds: lr.mkt?.tds || 0 }, labourCharge: Math.round(sum(lr.items, (i: any) => i.qty) * (db.hamaliRates.find((h: any) => h.goodsId === lr.items[0].goodsId && h.use === 'GRN Station')?.rate || 2.5)) })); } }, [f.lrId]);
  const gross = Number(f.totalFreight) + Number(f.detentionAmt);
  const net = gross - sum(Object.values(f.less), (v: any) => Number(v));
  const save = () => {
    if (!lr) return useUI.getState().toast('Select an LR', 'bad');
    if (!f.docs.kata.ok) return useUI.getState().ask({ title: 'Kata receipt missing', body: 'Branch policy requires a kata (weighbridge) receipt before releasing lorry freight. Save GRN anyway?', confirmLabel: 'Save GRN', onConfirm: () => { doSave(); } });
    doSave();
  };
  const doSave = () => { A.createGRN({ ...f, gateNo: Number(f.gateNo), labourCount: Number(f.labourCount), gross, net, items: f.items.map((i: any) => ({ ...i, received: Number(i.received), damage: Number(i.damage), pending: Number(i.received) })), less: Object.fromEntries(Object.entries(f.less).map(([k, v]) => [k, Number(v)])) }); onClose(); };
  return (
    <Drawer open onClose={onClose} title="Generate GRN" subtitle="Legacy: Transactions/GRN.aspx · GRN at rail head" width="max-w-4xl" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}><Warehouse size={15} /> Generate GRN</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        <FormSection title="Consignment" cols={3}>
          <Field label="LR no." required className="sm:col-span-2"><Select value={f.lrId} onChange={(e) => setF({ ...f, lrId: e.target.value })} placeholder="Select LR arriving at rail head" options={cands.map((l: any) => ({ value: l.id, label: `${l.lrNo} · ${lookup.cust(db, l.consignorId)?.short} · ${lookup.truckNo(db, l.truckId)}` }))} /></Field>
          <Field label="Gate no."><Select value={f.gateNo} onChange={(e) => setF({ ...f, gateNo: e.target.value })} options={Array.from({ length: 15 }, (_, i) => String(i + 1))} /></Field>
          {lr && <div className="sm:col-span-3 text-[12.5px] text-muted">{lookup.custName(db, lr.consignorId)} → {lookup.custName(db, lr.consigneeId)} · {lr.source} → {lr.destination} · truck {lookup.truckNo(db, lr.truckId)}</div>}
        </FormSection>
        <FormSection title="Timings" cols={4}>
          <Field label="In date"><Input type="date" value={f.inDate} onChange={(e) => setF({ ...f, inDate: e.target.value })} /></Field><Field label="In time"><Input type="time" value={f.inTime} onChange={(e) => setF({ ...f, inTime: e.target.value })} /></Field>
          <Field label="Out date"><Input type="date" value={f.outDate} onChange={(e) => setF({ ...f, outDate: e.target.value })} /></Field><Field label="Out time"><Input type="time" value={f.outTime} onChange={(e) => setF({ ...f, outTime: e.target.value })} /></Field>
          <Field label="Unloading time"><Input value={f.unloadingTime} placeholder="e.g. 3h 10m" onChange={(e) => setF({ ...f, unloadingTime: e.target.value })} /></Field>
        </FormSection>
        {f.items.length > 0 && <FormSection title="Received quantities" cols={1}><div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.75px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">Item</th><th className="text-right px-2">Total</th><th className="px-2 w-28">Received</th><th className="px-3 w-28">Damage</th></tr></thead><tbody>{f.items.map((it: any, k: number) => <tr key={k} className="border-t border-line"><td className="px-3 py-1.5">{lr?.items[it.idx]?.name}</td><td className="px-2 text-right tnum">{it.total}</td><td className="px-2"><input className="input h-8 text-right" type="number" aria-label="Received" value={it.received} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, received: e.target.value } : x)) })} /></td><td className="px-3"><input className="input h-8 text-right" type="number" aria-label="Damage" value={it.damage} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, damage: e.target.value } : x)), damageBy: Number(e.target.value) > 0 && f.damageBy === 'No Damage' ? 'Road' : f.damageBy })} /></td></tr>)}</tbody></table></div></FormSection>}
        <FormSection title="Freight settlement (lorry)" cols={4}>
          <Field label="Total freight"><Input type="number" value={f.totalFreight} onChange={(e) => setF({ ...f, totalFreight: e.target.value })} /></Field>
          <Field label="Freight / MT"><Input type="number" value={lr ? Math.round(Number(f.totalFreight) / Math.max(0.1, lr.weight / 1000)) : 0} disabled /></Field>
          <Field label="Detention days"><Input type="number" value={f.detentionDays} onChange={(e) => setF({ ...f, detentionDays: e.target.value, detentionAmt: Number(e.target.value) * 1200 })} /></Field>
          <Field label="Detention amount"><Input type="number" value={f.detentionAmt} onChange={(e) => setF({ ...f, detentionAmt: e.target.value })} /></Field>
          {[['advance', 'Less advance'], ['tds', 'Less TDS'], ['stationery', 'Less printing'], ['damage', 'Less damages'], ['hamali', 'Less hamali']].map(([k, l]) => <Field key={k} label={l}><Input type="number" value={f.less[k]} onChange={(e) => setF({ ...f, less: { ...f.less, [k]: e.target.value } })} /></Field>)}
          <div className="col-span-2 lg:col-span-1 rounded-lg bg-surface2 border border-line px-3 py-2"><div className="text-[11px] text-muted font-semibold">Gross {inr(gross)} · Net freight</div><div className="font-display text-[18px] font-semibold tnum">{inr(net)}</div></div>
        </FormSection>
        <FormSection title="Documents check list" cols={1}>
          <div className="grid gap-2">{[['lrCopy', 'LR copy'], ['invoice', 'Invoice no.'], ['wayBill', 'Way bill'], ['seal', 'Seal no.'], ['kata', 'Kata receipt']].map(([k, l]) => <div key={k} className="grid grid-cols-[130px_auto_1fr] gap-3 items-center"><span className="text-[13px] font-medium">{l}</span><Toggle checked={f.docs[k].ok} onChange={(v) => setF({ ...f, docs: { ...f.docs, [k]: { ...f.docs[k], ok: v } } })} /><Input placeholder="Remark" value={f.docs[k].rmk} onChange={(e) => setF({ ...f, docs: { ...f.docs, [k]: { ...f.docs[k], rmk: e.target.value } } })} /></div>)}</div>
        </FormSection>
        <FormSection title="Unloading labour" cols={3}>
          <Field label="Damage by"><Select value={f.damageBy} onChange={(e) => setF({ ...f, damageBy: e.target.value })} options={['No Damage', 'Labour', 'Accidently', 'Road']} /></Field>
          <Field label="Labour"><Select value={f.labourId} onChange={(e) => setF({ ...f, labourId: e.target.value })} placeholder="Select hamal" options={db.labours.filter((l: any) => l.type === 'Hamal').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
          <Field label="Labour count"><Select value={f.labourCount} onChange={(e) => setF({ ...f, labourCount: e.target.value })} options={Array.from({ length: 15 }, (_, i) => String(i + 1))} /></Field>
          <Field label="Labour charges (₹)"><Input type="number" value={f.labourCharge} onChange={(e) => setF({ ...f, labourCharge: Number(e.target.value) })} /></Field>
          <Field label="Unloading supervisor"><Select value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })} options={db.labours.filter((l: any) => l.type === 'Supervisor').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
          <Field label="Damage photos"><label className="btn-ghost h-9 cursor-pointer w-full"><Upload size={14} /> {f.uploads.length ? `${f.uploads.length} file(s)` : 'Upload'}<input type="file" multiple className="sr-only" onChange={(e) => setF({ ...f, uploads: Array.from(e.target.files || []).map((x: any) => ({ name: x.name, size: `${Math.round(x.size / 1024)} KB` })) })} /></label></Field>
          <Field label="Remark" className="sm:col-span-3"><Textarea rows={2} value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
        </FormSection>
      </div>
    </Drawer>
  );
}

// ---------------- DGRN at Branch ----------------
export function DGRNPage() {
  const db = useDB();
  const { openRecord } = useUI.getState();
  const cands = db.schedules.filter((s: any) => ['In Transit', 'Arrived', 'Unloading'].includes(s.status));
  const [sid, setSid] = useState(cands[0]?.id || '');
  const s = lookup.sched(db, sid);
  const vps = s ? (s.mrrr?.rows || s.vps) : [];
  const doneVPs = new Set(db.dgrns.filter((g: any) => g.scheduleId === sid).map((g: any) => g.vpNo));
  const [f, setF] = useState<any>({ vpNo: '', items: [], inDate: ymd(), inTime: '06:00', outDate: ymd(), outTime: hm(), damageBy: 'No Damage', labourCount: '6', supervisorId: '', labourCharge: '', labourId: '', remark: '', uploads: [] as any[] });
  const pickVP = (vp: string) => { const loads = s.loads.filter((l: any) => l.vpNo === vp); setF({ ...f, vpNo: vp, wagonId: loads[0]?.wagonId, supervisorId: db.labours.find((l: any) => l.type === 'Supervisor' && l.branchId === s.destId)?.id || '', items: loads.flatMap((ld: any) => ld.items.map((it: any) => ({ lrId: ld.lrId, idx: it.idx, total: it.qty, received: it.qty, damage: 0 }))), labourCharge: Math.round(sum(loads, (ld: any) => sum(ld.items, (i: any) => i.qty)) * 2.1) }); };
  const save = () => { if (!f.vpNo || !f.items.length) return useUI.getState().toast('Select a VP with loaded consignments', 'bad'); A.createDGRN({ ...f, scheduleId: sid, labourCount: Number(f.labourCount), labourCharge: Number(f.labourCharge), items: f.items.map((i: any) => ({ ...i, received: Number(i.received), damage: Number(i.damage), pending: Number(i.received) })) }); setF({ ...f, vpNo: '', items: [] }); };
  return (
    <div>
      <PageHeader eyebrow="Operations · Rail" title="DGRN at branch station" subtitle="Unload each parcel van at the destination rail head. Received quantities become branch stock for delivery challans; unloading hamali flows to Hamali Payments." />
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <Card><div className="grid gap-5">
          <SchedulePicker value={sid} onChange={(v) => { setSid(v); setF({ ...f, vpNo: '', items: [] }); }} filter={(x) => ['In Transit', 'Arrived', 'Unloading'].includes(x.status)} />
          {s && <SchedInfo s={s} />}
          {s && <>
            <FormSection title="Parcel van" cols={3}>
              <Field label="VP no." required><Select value={f.vpNo} onChange={(e) => pickVP(e.target.value)} placeholder="Select VP" options={vps.filter((v: any) => s.loads.some((l: any) => l.vpNo === v.vpNo)).map((v: any) => ({ value: v.vpNo, label: `${v.vpNo}${doneVPs.has(v.vpNo) ? ' · DGRN done' : ''}` }))} /></Field>
              <Field label="In date / time"><div className="flex gap-1.5"><Input type="date" value={f.inDate} onChange={(e) => setF({ ...f, inDate: e.target.value })} /><Input type="time" value={f.inTime} onChange={(e) => setF({ ...f, inTime: e.target.value })} className="w-28" /></div></Field>
              <Field label="Out date / time"><div className="flex gap-1.5"><Input type="date" value={f.outDate} onChange={(e) => setF({ ...f, outDate: e.target.value })} /><Input type="time" value={f.outTime} onChange={(e) => setF({ ...f, outTime: e.target.value })} className="w-28" /></div></Field>
            </FormSection>
            {f.items.length > 0 && <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.75px] min-w-[560px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">LR no.</th><th className="text-left px-2">Client</th><th className="text-left px-2">Item</th><th className="text-right px-2">Total</th><th className="px-2 w-24">Received</th><th className="px-3 w-24">Damage</th></tr></thead><tbody>{f.items.map((it: any, k: number) => { const l = db.lrs.find((x: any) => x.id === it.lrId); return <tr key={k} className="border-t border-line"><td className="px-3 py-1.5 docno">{l?.lrNo}</td><td className="px-2">{lookup.cust(db, l?.consignorId)?.short}</td><td className="px-2">{l?.items[it.idx]?.name}</td><td className="px-2 text-right tnum">{it.total}</td><td className="px-2"><input className="input h-8 text-right" type="number" aria-label="Received" value={it.received} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, received: e.target.value } : x)) })} /></td><td className="px-3"><input className="input h-8 text-right" type="number" aria-label="Damage" value={it.damage} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, damage: e.target.value } : x)) })} /></td></tr>; })}</tbody></table></div>}
            <FormSection title="Unloading" cols={3}>
              <Field label="Damage by"><Select value={f.damageBy} onChange={(e) => setF({ ...f, damageBy: e.target.value })} options={['No Damage', 'Labour', 'Accidently', 'Road']} /></Field>
              <Field label="Labour count"><Select value={f.labourCount} onChange={(e) => setF({ ...f, labourCount: e.target.value })} options={Array.from({ length: 15 }, (_, i) => String(i + 1))} /></Field>
              <Field label="Supervisor"><Select value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })} placeholder="Select" options={db.labours.filter((l: any) => l.type === 'Supervisor').map((l: any) => ({ value: l.id, label: `${l.name} (${l.branchId})` }))} /></Field>
              <Field label="Labour charges (₹)"><Input type="number" value={f.labourCharge} onChange={(e) => setF({ ...f, labourCharge: e.target.value })} /></Field>
              <Field label="Labour"><Select value={f.labourId} onChange={(e) => setF({ ...f, labourId: e.target.value })} placeholder="Select" options={db.labours.filter((l: any) => l.type === 'Hamal').map((l: any) => ({ value: l.id, label: `${l.name} (${l.branchId})` }))} /></Field>
              <Field label="Photos"><label className="btn-ghost h-9 cursor-pointer w-full"><Upload size={14} /> {f.uploads.length ? `${f.uploads.length} file(s)` : 'Upload'}<input type="file" multiple className="sr-only" onChange={(e) => setF({ ...f, uploads: Array.from(e.target.files || []).map((x: any) => ({ name: x.name, size: `${Math.round(x.size / 1024)} KB` })) })} /></label></Field>
              <Field label="Remark" className="sm:col-span-3"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
            </FormSection>
            <div className="flex justify-end"><button className="btn-primary" onClick={save}><PackageCheck size={15} /> Generate DGRN</button></div>
          </>}
        </div></Card>
        {s && <Card title="Unloading progress"><div className="grid gap-2">{vps.map((v: any) => <div key={v.vpNo} className="flex items-center gap-2 text-[12.5px]"><span className="docno flex-1">{v.vpNo}</span>{doneVPs.has(v.vpNo) ? <StatusBadge s="Unloaded" tone="ok" /> : s.loads.some((l: any) => l.vpNo === v.vpNo) ? <StatusBadge s="Pending" /> : <span className="text-faint">empty</span>}</div>)}</div></Card>}
      </div>
      <div className="mt-6"><DataTable id="dgrn" title="DGRN register" rows={db.dgrns.slice().reverse().flatMap((g: any) => g.items.map((it: any, k: number) => ({ id: g.id + k, g, it, l: db.lrs.find((x: any) => x.id === it.lrId) })))} cols={[
        { key: 'no', label: 'GRN no.', value: (r) => r.g.dgrnNo, render: (r) => <DocNo>{r.g.dgrnNo}</DocNo>, mobile: 'title' },
        { key: 'sched', label: 'Schedule date', value: (r) => fmtDate(lookup.sched(db, r.g.scheduleId)?.date) },
        { key: 'from', label: 'From branch', value: (r) => lookup.sched(db, r.g.scheduleId)?.fromBranchId }, { key: 'to', label: 'To branch', value: (r) => lookup.sched(db, r.g.scheduleId)?.toBranchId, filter: true },
        { key: 'vp', label: 'VP no.', value: (r) => r.g.vpNo }, { key: 'lr', label: 'LR no.', value: (r) => r.l?.lrNo, render: (r) => <DocNo onClick={() => openRecord('lr', r.l?.id)}>{r.l?.lrNo}</DocNo>, mobile: 'sub' },
        { key: 'client', label: 'Client', value: (r) => lookup.cust(db, r.l?.consignorId)?.short, filter: true }, { key: 'item', label: 'Item', value: (r) => r.l?.items[r.it.idx]?.name },
        { key: 'total', label: 'Total', align: 'right', value: (r) => r.it.total }, { key: 'recv', label: 'Received', align: 'right', value: (r) => r.it.received }, { key: 'dmg', label: 'Damage', align: 'right', value: (r) => r.it.damage }, { key: 'pend', label: 'In stock', align: 'right', value: (r) => r.it.pending, mobile: 'meta' },
        { key: 'files', label: 'Files', value: (r) => r.g.uploads?.length || 0, hidden: true },
      ]} /></div>
    </div>
  );
}

// ---------------- MR / RR ----------------
export function MRRRPage() {
  const db = useDB();
  const cands = db.schedules.filter((s: any) => s.isFinal);
  const [sid, setSid] = useState(cands.find((s: any) => !s.mrrr)?.id || cands[0]?.id || '');
  const s = lookup.sched(db, sid);
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (s) setF(s.mrrr ? structuredClone(s.mrrr) : { fromDate: ymd(addDays(s.date, -2)), toDate: s.date, rakeType: 'Indent', rows: (s.vps.length ? s.vps : s.wagons.flatMap((w: any) => Array.from({ length: w.count }, () => ({ wagonId: w.wagonId, vpNo: '' })))).map((v: any, k: number) => ({ seq: k + 1, wagonId: v.wagonId, vpNo: v.vpNo?.includes('-') ? '' : v.vpNo, mrrrNo: '', seal: '', railFreight: db.railFreight.find((r: any) => r.wagonId === v.wagonId && r.dest === lookup.branch(db, s.destId).city)?.rate || 0 })) }); }, [sid]);
  const [all, setAll] = useState(false);
  return (
    <div>
      <PageHeader eyebrow="Rail & Rake" title="MR / RR numbers" subtitle="Record the railway receipt (RR) and money receipt (MR) for each parcel van, with VP numbers, seals and railway freight from the freight matrix." />
      <Card><div className="grid gap-5">
        <SchedulePicker value={sid} onChange={setSid} filter={(x) => x.isFinal} />
        {s && <SchedInfo s={s} />}
        {s && f && <>
          <FormSection title="Indent" cols={4}>
            <Field label="From date"><Input type="date" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value })} /></Field>
            <Field label="To date"><Input type="date" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></Field>
            <Field label="Total wagons"><Input value={f.rows.length} disabled /></Field>
            <Field label="Rake type"><Select value={f.rakeType} onChange={(e) => setF({ ...f, rakeType: e.target.value })} options={['Indent', 'Lease']} /></Field>
          </FormSection>
          <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.75px] min-w-[720px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="px-3 py-2 w-8"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} aria-label="Select all" /></th><th className="text-left px-2">Wagon type</th><th className="text-left px-2 w-16">Seq</th><th className="px-2">VP no.</th><th className="px-2">MR/RR no.</th><th className="px-2">Seal no.</th><th className="px-3 text-right">Rail freight</th></tr></thead>
            <tbody>{f.rows.map((r: any, k: number) => <tr key={k} className="border-t border-line"><td className="px-3"><input type="checkbox" checked={all} readOnly aria-label="Row selected" /></td><td className="px-2 font-semibold">{lookup.wagon(db, r.wagonId)}</td><td className="px-2 tnum">{r.seq}</td>{['vpNo', 'mrrrNo', 'seal'].map((c) => <td key={c} className="px-2 py-1"><input className="input h-8 font-mono" value={r[c]} aria-label={c} onChange={(e) => setF({ ...f, rows: f.rows.map((x: any, j: number) => (j === k ? { ...x, [c]: e.target.value } : x)) })} /></td>)}<td className="px-3"><input className="input h-8 text-right" type="number" aria-label="Rail freight" value={r.railFreight} onChange={(e) => setF({ ...f, rows: f.rows.map((x: any, j: number) => (j === k ? { ...x, railFreight: Number(e.target.value) } : x)) })} /></td></tr>)}</tbody>
          </table></div>
          <div className="flex flex-wrap justify-between items-center gap-2"><span className="text-[12.5px] text-muted">Total railway freight <b className="text-ink tnum">{inr(sum(f.rows, (r: any) => r.railFreight))}</b></span><button className="btn-primary" onClick={() => { if (f.rows.some((r: any) => !r.vpNo)) return useUI.getState().toast('Enter VP number for every wagon', 'bad'); A.saveMRRR(sid, f); }}><CheckCircle2 size={15} /> Save MR/RR</button></div>
        </>}
      </div></Card>
      <div className="mt-6"><DataTable id="mrrr" rows={db.schedules.filter((x: any) => x.mrrr).slice().reverse()} onRow={(r) => setSid(r.id)} cols={[{ key: 'title', label: 'Schedule name', mobile: 'title' }, { key: 'date', label: 'Schedule date', render: (r) => fmtDate(r.date) }, { key: 'sourceId', label: 'Source' }, { key: 'destId', label: 'Destination' }, { key: 'tw', label: 'Total wagons', align: 'right', value: (r) => r.mrrr.rows.length }, { key: 'rt', label: 'Rake type', value: (r) => r.mrrr.rakeType }, { key: 'rf', label: 'Rail freight', align: 'right', value: (r) => sum(r.mrrr.rows, (x: any) => x.railFreight), render: (r) => inr(sum(r.mrrr.rows, (x: any) => x.railFreight)), mobile: 'right' }]} /></div>
    </div>
  );
}

// ---------------- Rake at rail head / branch ----------------
export function RakeEvents({ side }: { side: 'src' | 'dst' }) {
  const db = useDB();
  const cands = db.schedules.filter((s: any) => (side === 'src' ? s.isFinal : ['In Transit', 'Arrived', 'Unloading', 'Completed'].includes(s.status)));
  const [sid, setSid] = useState(cands.find((s: any) => (side === 'src' ? ['Loading', 'Planned'].includes(s.status) : ['In Transit', 'Arrived'].includes(s.status)))?.id || cands[0]?.id || '');
  const s = lookup.sched(db, sid);
  const [f, setF] = useState<any>({});
  useEffect(() => { setF({ ...(s?.[side] || {}) }); }, [sid, s?.[side]]);
  const fields = [['arrival', 'Arrival'], ['dispatch', side === 'src' ? 'Dispatch' : 'Release / dispatch'], ['place1', 'Placement – 1st rake'], ['removal1', 'Removal – 1st rake'], ['place2', 'Placement – 2nd rake'], ['removal2', 'Removal – 2nd rake'], ...(side === 'dst' ? [['reach', 'Reached destination'], ['unload', 'Unloading complete']] : [])];
  const h1 = dcHours(f.place1, f.removal1), h2 = dcHours(f.place2, f.removal2);
  return (
    <div>
      <PageHeader eyebrow="Rail & Rake" title={side === 'src' ? 'Rake at rail head' : 'Rake at branch'} subtitle={`Record placement and removal times at ${side === 'src' ? 'the loading rail head (Jalgaon)' : 'the destination rail head'}. Hours beyond the ${FREE_HOURS}-hour free time become demurrage (DC) hours for the demurrage & wharfage entry.`} />
      <Card><div className="grid gap-5">
        <SchedulePicker value={sid} onChange={setSid} filter={(x) => cands.includes(x)} />
        {s && <SchedInfo s={s} />}
        {s && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">{fields.map(([k, l]) => <Field key={k} label={l}><Input type="datetime-local" value={dtLocal(f[k])} onChange={(e) => setF({ ...f, [k]: fromLocal(e.target.value) })} /></Field>)}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Card><Stat label="DC hrs – 1st rake" value={h1} tone={h1 ? 'warn' : undefined} /></Card><Card><Stat label="DC hrs – 2nd rake" value={h2} tone={h2 ? 'warn' : undefined} /></Card><Card><Stat label="Total DC hrs" value={h1 + h2} /></Card><Card><Stat label="Status" value={<StatusBadge s={s.status} />} /></Card></div>
          {side === 'src' && !s.src?.dispatch && f.dispatch && <div className="text-[12.5px] rounded-lg bg-info/10 text-info px-3 py-2">Saving a dispatch time marks the rake <b>In Transit</b> and moves all loaded LRs to <b>Rake In Transit</b>.</div>}
          <div className="flex justify-end"><button className="btn-primary" onClick={() => A.saveRakeEvents(sid, side, { ...f, dcHrs1: h1, dcHrs2: h2 })}>Save timings</button></div>
        </>}
      </div></Card>
      <div className="mt-6"><DataTable id={`rake-${side}`} rows={db.schedules.filter((x: any) => x[side]).slice().reverse()} onRow={(r) => setSid(r.id)} cols={[{ key: 'rakeNo', label: 'Rake no.', render: (r) => <DocNo>{r.rakeNo}</DocNo>, mobile: 'title' }, { key: 'title', label: 'Schedule name', mobile: 'sub' }, { key: 'date', label: 'Schedule date', render: (r) => fmtDate(r.date) }, { key: 'arr', label: 'Arrival', render: (r) => fmtDT(r[side].arrival) }, { key: 'dis', label: 'Dispatch', render: (r) => fmtDT(r[side].dispatch) }, { key: 'h1', label: 'DC hrs (1st)', align: 'right', value: (r) => dcHours(r[side].place1, r[side].removal1) }, { key: 'h2', label: 'DC hrs (2nd)', align: 'right', value: (r) => dcHours(r[side].place2, r[side].removal2) }, { key: 'st', label: 'Status', render: (r) => <StatusBadge s={r.status} />, mobile: 'meta' }]} /></div>
    </div>
  );
}

// ---------------- Rake status ----------------
export function RakeStatusPage() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const cands = db.schedules.filter((s: any) => ['In Transit', 'Arrived', 'Unloading', 'Loading'].includes(s.status));
  const [sid, setSid] = useState(params.id || cands.find((s: any) => s.status === 'In Transit')?.id || cands[0]?.id || '');
  const s = lookup.sched(db, sid);
  const [f, setF] = useState({ date: ymd(), time: hm(), remark: '', email: true });
  const consignees = s ? [...new Set(db.lrs.filter((l: any) => l.scheduleId === s.id).map((l: any) => lookup.custName(db, l.consigneeId)))] : [];
  return (
    <div>
      <PageHeader eyebrow="Rail & Rake" title="In-transit rake status" subtitle="Post position updates for moving rakes. Optionally email every consignee on the rake." />
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title="Post update"><div className="grid gap-4">
          <Field label="Rake no." required><Select value={sid} onChange={(e) => setSid(e.target.value)} options={cands.map((x: any) => ({ value: x.id, label: `${x.rakeNo} · ${x.title} · ${x.status}` }))} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field><Field label="Time"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field></div>
          <Field label="Rake status" required><Textarea rows={3} value={f.remark} placeholder="e.g. Crossed Bilaspur Jn., running 2 hrs late" onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
          <Field label="Send email to consignees"><Radio options={['Yes', 'No']} value={f.email ? 'Yes' : 'No'} onChange={(v) => setF({ ...f, email: v === 'Yes' })} /></Field>
          {f.email && consignees.length > 0 && <div className="text-[12px] text-muted">Recipients: {consignees.join(', ')}</div>}
          <div className="flex justify-end"><button className="btn-primary" disabled={!sid || !f.remark} onClick={() => { A.addRakeStatus(sid, { at: new Date(`${f.date}T${f.time}`).toISOString(), remark: f.remark, email: f.email }); setF({ ...f, remark: '' }); }}><Send size={15} /> Update status</button></div>
        </div></Card>
        {s && <Card title={<span className="docno">{s.rakeNo}</span>} subtitle={s.title}>
          <div className="mb-4"><div className="flex justify-between text-[12px] text-muted mb-1"><span>Jalgaon</span><span>{lookup.branch(db, s.destId)?.name}</span></div><Progress value={s.status === 'In Transit' ? (s.progress || 0.5) * 100 : ['Arrived', 'Unloading', 'Completed'].includes(s.status) ? 100 : 5} tone="brand" className="h-2" /></div>
          {s.statusLog.length ? <Timeline items={s.statusLog.map((x: any) => ({ at: x.at, label: x.remark + (x.email ? ' · emailed' : ''), by: x.by }))} /> : <div className="text-[13px] text-muted">No updates yet.</div>}
        </Card>}
      </div>
    </div>
  );
}

// ---------------- DC-WC (demurrage & wharfage) ----------------
export function DCWCPage() {
  const db = useDB();
  const [side, setSide] = useState<'dcwcSrc' | 'dcwcDst'>('dcwcSrc');
  const ev = side === 'dcwcSrc' ? 'src' : 'dst';
  const cands = db.schedules.filter((s: any) => s[ev]);
  const [sid, setSid] = useState(cands[0]?.id || '');
  const s = lookup.sched(db, sid);
  const hours = s ? dcHours(s[ev]?.place1, s[ev]?.removal1) + dcHours(s[ev]?.place2, s[ev]?.removal2) : 0;
  const blank = { dcPerHr: side === 'dcwcSrc' ? 1800 : 1500, hours, amount: 0, letterDate: ymd(), paidBy: defLedger(db, 'l1'), mode: 'Bank', waiver: { on: false, sentDate: '', approved: false, receivedDate: '', per: 0, amount: 0 }, dcwlReceivedDate: '', wc: { amount: 0, paidBy: defLedger(db, 'l1'), mode: 'Bank' }, wf: { amount: 0, paidBy: '', mode: '' } };
  const [f, setF] = useState<any>(blank);
  useEffect(() => { setF(s?.[side] ? structuredClone(s[side]) : { ...blank, hours }); }, [sid, side]);
  const amount = Number(f.dcPerHr) * Number(f.hours);
  const waiverAmt = f.waiver.on ? Math.round((amount * Number(f.waiver.per)) / 100) : 0;
  return (
    <div>
      <PageHeader eyebrow="Rail & Rake" title="Demurrage & wharfage" subtitle="Demurrage (DC) for wagon detention beyond free time and wharfage (WC) for goods left on the platform, with waiver letters. Costs feed rake profitability." />
      <Segmented options={[{ key: 'dcwcSrc', label: 'At rail head (source)' }, { key: 'dcwcDst', label: 'At branch (destination)' }]} value={side} onChange={(v: any) => { setSide(v); setSid(db.schedules.find((x: any) => x[v === 'dcwcSrc' ? 'src' : 'dst'])?.id || ''); }} />
      <Card className="mt-4"><div className="grid gap-5">
        <SchedulePicker label="Schedule date" value={sid} onChange={setSid} filter={(x) => !!x[ev]} />
        {s && <SchedInfo s={s} />}
        {s && <>
          <FormSection title="Demurrage (DC)" cols={4}>
            <Field label="DC per hour (₹)"><Input type="number" value={f.dcPerHr} onChange={(e) => setF({ ...f, dcPerHr: e.target.value })} /></Field>
            <Field label="Total DC hours" hint="From placement/removal timings"><Input type="number" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field>
            <Field label="Total DC amount"><Input value={amount} disabled /></Field>
            <Field label="DC letter date"><Input type="date" value={f.letterDate} onChange={(e) => setF({ ...f, letterDate: e.target.value })} /></Field>
            <Field label="Paid by"><Select value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })} options={db.ledgers.filter((l: any) => l.type === 'Bank').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
            <Field label="Payment mode"><Radio options={['Cash', 'Cheque', 'Bank']} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} /></Field>
          </FormSection>
          <FormSection title="Waiver letter" cols={4}>
            <div className="flex items-center"><Check label="Apply for waiver" checked={f.waiver.on} onChange={(v) => setF({ ...f, waiver: { ...f.waiver, on: v } })} /></div>
            {f.waiver.on && <>
              <Field label="WL sent date"><Input type="date" value={f.waiver.sentDate} onChange={(e) => setF({ ...f, waiver: { ...f.waiver, sentDate: e.target.value } })} /></Field>
              <div className="flex items-center"><Check label="Waiver approved" checked={f.waiver.approved} onChange={(v) => setF({ ...f, waiver: { ...f.waiver, approved: v } })} /></div>
              <Field label="WL received date"><Input type="date" value={f.waiver.receivedDate} onChange={(e) => setF({ ...f, waiver: { ...f.waiver, receivedDate: e.target.value } })} /></Field>
              <Field label="Waiver %"><Input type="number" value={f.waiver.per} onChange={(e) => setF({ ...f, waiver: { ...f.waiver, per: e.target.value } })} /></Field>
              <Field label="Waiver amount"><Input value={waiverAmt} disabled /></Field>
              <Field label="DC-WL refund received"><Input type="date" value={f.dcwlReceivedDate} onChange={(e) => setF({ ...f, dcwlReceivedDate: e.target.value })} /></Field>
            </>}
          </FormSection>
          <FormSection title="Wharfage (WC) & welfare (WF)" cols={4}>
            <Field label="Wharfage charge (₹)"><Input type="number" value={f.wc.amount} onChange={(e) => setF({ ...f, wc: { ...f.wc, amount: Number(e.target.value) } })} /></Field>
            <Field label="WC paid by"><Select value={f.wc.paidBy} onChange={(e) => setF({ ...f, wc: { ...f.wc, paidBy: e.target.value } })} options={db.ledgers.filter((l: any) => l.type === 'Bank').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
            <Field label="WC mode"><Radio options={['Cash', 'Cheque', 'Bank']} value={f.wc.mode} onChange={(v) => setF({ ...f, wc: { ...f.wc, mode: v } })} /></Field>
            <Field label="Welfare charge (₹)"><Input type="number" value={f.wf.amount} onChange={(e) => setF({ ...f, wf: { ...f.wf, amount: Number(e.target.value) } })} /></Field>
          </FormSection>
          <div className="flex flex-wrap justify-between items-center gap-2"><span className="text-[13px]">Net cost to rake: <b className="tnum">{inr(amount - waiverAmt + Number(f.wc.amount) + Number(f.wf.amount))}</b></span><button className="btn-primary" onClick={() => A.saveDCWC(sid, side, { ...f, amount, hours: Number(f.hours), dcPerHr: Number(f.dcPerHr), waiver: { ...f.waiver, amount: waiverAmt, per: Number(f.waiver.per) } })}>Save DC-WC</button></div>
        </>}
      </div></Card>
      <div className="mt-6"><DataTable id={`dcwc-${side}`} rows={db.schedules.filter((x: any) => x[side])} onRow={(r) => setSid(r.id)} cols={[{ key: 'rakeNo', label: 'Rake no.', render: (r) => <DocNo>{r.rakeNo}</DocNo>, mobile: 'title' }, { key: 'title', label: 'Schedule name' }, { key: 'date', label: 'Schedule date', render: (r) => fmtDate(r.date) }, { key: 'rate', label: 'DC/Hr', align: 'right', value: (r) => r[side].dcPerHr }, { key: 'h', label: 'Total DC hrs', align: 'right', value: (r) => r[side].hours }, { key: 'amt', label: 'Total DC amount', align: 'right', render: (r) => inr(r[side].amount), mobile: 'right' }, { key: 'wp', label: 'Waiver %', align: 'right', value: (r) => r[side].waiver.per }, { key: 'wa', label: 'Waiver amt', align: 'right', render: (r) => inr(r[side].waiver.amount) }]} /></div>
    </div>
  );
}

// ---------------- Rake board ----------------
export function RakeBoard() {
  const db = useDB();
  const { openRecord, nav } = useUI.getState();
  const cols = [['Planned', ['Planned']], ['Loading', ['Loading']], ['In transit', ['In Transit']], ['At destination', ['Arrived', 'Unloading']], ['Completed', ['Completed']]] as const;
  return (
    <div>
      <PageHeader eyebrow="Rail & Rake" title="Rake planning" subtitle="Every parcel rake on one board, from schedule to closure. Open a card for the rake 360 with wagons, LRs, status log and P&L." actions={<button className="btn-primary" onClick={() => nav('ops/vp-schedule', { new: 1 })}><Plus size={15} /> New schedule</button>} />
      <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
        {cols.map(([label, sts]) => { const list = db.schedules.filter((s: any) => (sts as readonly string[]).includes(s.status)); return (
          <div key={label} className="w-[280px] shrink-0 snap-start">
            <div className="flex items-center justify-between px-1 mb-2"><span className="font-semibold text-[13px]">{label}</span><span className="text-[11px] text-muted tnum bg-surface2 border border-line rounded-full px-2">{list.length}</span></div>
            <div className="grid gap-2 bg-surface2/60 border border-line rounded-xl p-2 min-h-[200px]">
              {list.map((s: any) => { const lrs = db.lrs.filter((l: any) => l.scheduleId === s.id); const vpN = sum(s.wagons, (w: any) => w.count); const loaded = new Set(s.loads.map((l: any) => l.vpNo)).size; return (
                <button key={s.id} onClick={() => openRecord('rake', s.id)} className="card p-3 text-left hover:border-violet/40 hover:-translate-y-px transition">
                  <div className="flex justify-between items-center"><span className="docno font-semibold">{s.rakeNo}</span><StatusBadge s={s.status} dot={false} /></div>
                  <div className="text-[12px] text-muted mt-1">{fmtDate(s.date)} · JL → {lookup.branch(db, s.destId)?.name}</div>
                  <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11.5px]"><div><div className="text-faint">LRs</div><b className="tnum">{lrs.length}</b></div><div><div className="text-faint">VPs</div><b className="tnum">{loaded}/{vpN}</b></div><div><div className="text-faint">Wt</div><b className="tnum">{num(sum(lrs, (l: any) => l.weight) / 1000, 1)}t</b></div></div>
                  <Progress value={(loaded / Math.max(1, vpN)) * 100} className="mt-2" tone={s.status === 'Completed' ? 'ok' : 'violet'} />
                  {s.statusLog.length > 0 && <div className="text-[11.5px] text-muted mt-2 line-clamp-2">“{s.statusLog[s.statusLog.length - 1].remark}”</div>}
                </button>); })}
              {!list.length && <div className="text-[12px] text-faint text-center py-8">No rakes</div>}
            </div>
          </div>); })}
      </div>
    </div>
  );
}
