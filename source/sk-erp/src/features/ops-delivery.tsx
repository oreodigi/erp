import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, lrStage, defLedger } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Segmented, Stat, EmptyState, Tabs } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Modal } from '../components/overlays';
import { fmtDate, fmtDT, ymd, hm, sum, inr, num, cls, daysBetween } from '../lib/util';
import { Plus, Printer, Eye, MessageSquare, Link2, Truck, CheckCircle2, Inbox, Upload, Download, Pencil, Trash2, Mail, Clock, PackageCheck, MapPinned } from 'lucide-react';

// ---------------- Delivery Challan ----------------
export function DeliveryChallans() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint } = useUI.getState();
  const [form, setForm] = useState<any>(params.new ? {} : null);
  const [remark, setRemark] = useState<any>(null);
  const stock = db.dgrns.flatMap((g: any) => g.items.filter((i: any) => i.pending > 0).map((i: any) => ({ ...i, g })));
  const rows = db.dcs.slice().reverse();
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Delivery challans (LDC)" subtitle="Lorry delivery challans move DGRN stock from the destination branch to consignees on market or own trucks. Acknowledgments, approval and DC payment follow from here." actions={<><button className="btn-ghost" onClick={() => openPrint('dc', rows[0]?.id)} disabled={!rows.length}><Printer size={15} /> DC report</button><button className="btn-primary" onClick={() => setForm({})}><Plus size={15} /> Create LDC</button></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Branch stock to deliver" value={num(sum(stock, (s: any) => s.pending))} sub={`${new Set(stock.map((s: any) => s.lrId)).size} LRs`} icon={PackageCheck} tone="warn" />
        <KPI label="Open challans" value={db.dcs.filter((d: any) => d.status === 'Open').length} icon={Truck} tone="info" />
        <KPI label="Delivered, approval pending" value={db.dcs.filter((d: any) => d.ackSupervisor && !d.approval).length} icon={Clock} />
        <KPI label="Freight on LDCs (30d)" value={inr(sum(db.dcs.filter((d: any) => daysBetween(d.loadingDate) <= 30), (d: any) => d.freight))} icon={MapPinned} tone="ok" />
      </div>
      <DataTable id="dc" rows={rows} onRow={(r) => openRecord('dc', r.id)} quickFilters={[{ key: 'o', label: 'Open', fn: (r: any) => r.status === 'Open' }, { key: 'd', label: 'Delivered', fn: (r: any) => r.status === 'Delivered' }, { key: 'a', label: 'Approved / paid', fn: (r: any) => ['Approved', 'Payslip Generated', 'Paid'].includes(r.status) }]} cols={[
        { key: 'dcNo', label: 'Challan no.', render: (r) => <DocNo>{r.dcNo}</DocNo>, mobile: 'title' },
        { key: 'rakeNo', label: 'Rake no.', render: (r) => <span className="docno">{r.rakeNo || '—'}</span> },
        { key: 'loadingDate', label: 'Loading date', render: (r) => fmtDate(r.loadingDate) },
        { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.truckId), mobile: 'sub' },
        { key: 'driverName', label: 'Driver' }, { key: 'mobile', label: 'Mobile', hidden: true },
        { key: 'dest', label: 'Destination', value: (r) => lookup.cityName(db, r.destCity), filter: true },
        { key: 'lrs', label: 'LRs', value: (r) => r.items.map((i: any) => db.lrs.find((l: any) => l.id === i.lrId)?.lrNo).join(', '), hidden: true },
        { key: 'trans', label: 'Broker', value: (r) => lookup.transName(db, r.transporterId), filter: true },
        { key: 'freight', label: 'Freight', align: 'right', render: (r) => inr(r.freight), mobile: 'right' },
        { key: 'createdAt', label: 'Created', render: (r) => fmtDate(r.createdAt), hidden: true },
        { key: 'status', label: 'Status', filter: true, render: (r) => <StatusBadge s={r.status} />, mobile: 'meta' },
      ]} rowActions={(r: any) => [
        { label: 'Open', icon: Eye, onClick: () => openRecord('dc', r.id) },
        { label: 'Print LDC', icon: Printer, onClick: () => openPrint('dc', r.id) },
        { label: 'Email LDC', icon: Mail, onClick: () => useUI.getState().toast('LDC emailed', 'ok', 'Sent to consignee & broker') },
        { label: 'Add remark', icon: MessageSquare, onClick: () => setRemark(r) },
        { label: 'Create connected LDC', icon: Link2, onClick: () => setForm({ connected: r }), hidden: r.status !== 'Open' },
      ]} />
      {form && <DCForm connected={form.connected} onClose={() => { setForm(null); useUI.getState().set({ params: {} }); }} />}
      {remark && <RemarkModal dc={remark} onClose={() => setRemark(null)} />}
    </div>
  );
}
function RemarkModal({ dc, onClose }: any) {
  const [t, setT] = useState('');
  return <Modal open onClose={onClose} title={`Remark · ${dc.dcNo}`} size="sm" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!t} onClick={() => { A.addDCComment(dc.id, t); onClose(); }}>Submit</button></>}>
    <div className="grid gap-3">{dc.comments.map((c: any, k: number) => <div key={k} className="text-[12.5px] bg-surface2 rounded-lg px-3 py-2"><b>{c.by}</b> · {fmtDT(c.at)}<div>{c.text}</div></div>)}<Field label="Remark"><Textarea rows={3} value={t} onChange={(e) => setT(e.target.value)} placeholder="e.g. Consignee closed on Sunday, re-attempt Monday" /></Field></div>
  </Modal>;
}
function DCForm({ connected, onClose }: { connected?: any; onClose: () => void }) {
  const db = useDB();
  const scheds = db.schedules.filter((s: any) => db.dgrns.some((g: any) => g.scheduleId === s.id && g.items.some((i: any) => i.pending > 0)));
  const [sid, setSid] = useState(connected?.scheduleId || scheds[0]?.id || '');
  const s = lookup.sched(db, sid);
  const branchId = s?.destId || connected?.branchId || 'GH';
  const [f, setF] = useState<any>(() => ({ sourceCity: lookup.branch(db, branchId)?.city, destCity: '', deliveryAddress: '', selfDelivery: false, truckType: 'Market', tripId: '', transporterId: '', truckId: '', capacity: '', driverName: '', mobile: '', freight: '', advance: '', advancePaidBy: defLedger(db, 'l3'), paymentMode: 'Cash', loadingDate: ymd(), loadingTime: hm(), email: true, supervisorId: db.labours.find((l: any) => l.type === 'Supervisor' && l.branchId === branchId)?.id || '', remark: '', items: connected ? connected.items.map((i: any) => ({ ...i })) : [] }));
  const [vp, setVp] = useState('');
  const avail = db.dgrns.filter((g: any) => g.scheduleId === sid && (!vp || g.vpNo === vp)).flatMap((g: any) => g.items.filter((i: any) => i.pending > 0).map((i: any) => ({ ...i, dgrnId: g.id, vpNo: g.vpNo })));
  const [pick, setPick] = useState<Record<string, number>>({});
  const addItems = () => {
    const add = avail.filter((a: any) => pick[a.dgrnId + a.lrId + a.idx]).map((a: any) => ({ lrId: a.lrId, idx: a.idx, qty: pick[a.dgrnId + a.lrId + a.idx], vpNo: a.vpNo, dgrnId: a.dgrnId }));
    if (!add.length) return;
    const first = db.lrs.find((l: any) => l.id === add[0].lrId);
    setF({ ...f, items: [...f.items, ...add], destCity: f.destCity || first?.destCity, deliveryAddress: f.deliveryAddress || first?.deliveryAt });
    setPick({});
  };
  const trucks = db.trucks.filter((t: any) => t.type === f.truckType);
  const weight = sum(f.items, (it: any) => { const l = db.lrs.find((x: any) => x.id === it.lrId); return (lookup.goods(db, l?.items[it.idx]?.goodsId)?.weight || 0) * it.qty; });
  const rateHint = db.transRates.find((r: any) => r.source === f.sourceCity && r.dest === f.destCity);
  const save = () => {
    if (!f.items.length) return useUI.getState().toast('Add items from DGRN stock', 'bad');
    if (!f.selfDelivery && !f.truckId) return useUI.getState().toast('Select a truck', 'bad');
    A.createDC({ ...f, scheduleId: sid, rakeNo: s?.rakeNo || '', branchId, freight: Number(f.freight || 0), advance: Number(f.advance || 0), weight, connectedTo: connected?.id || '', items: f.items.map((i: any) => ({ ...i, qty: Number(i.qty) })) });
    onClose();
  };
  return (
    <Drawer open onClose={onClose} title={connected ? `Connected LDC from ${connected.dcNo}` : 'Create delivery challan'} subtitle="Legacy: Transactions/DeliveryChallan.aspx · CreateConnectedLDC.aspx" width="max-w-4xl" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}><Truck size={15} /> Create LDC</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        {!connected && <FormSection title="Schedule & stock" cols={3}>
          <Field label="Schedule date" required className="sm:col-span-2"><Select value={sid} onChange={(e) => setSid(e.target.value)} placeholder="Select schedule with branch stock" options={scheds.map((x: any) => ({ value: x.id, label: `${fmtDate(x.date)} · ${x.rakeNo} · ${x.destId}` }))} /></Field>
          <Field label="VP no."><Select value={vp} onChange={(e) => setVp(e.target.value)} placeholder="All VPs" options={[...new Set(db.dgrns.filter((g: any) => g.scheduleId === sid).map((g: any) => g.vpNo))] as string[]} /></Field>
        </FormSection>}
        {!connected && avail.length > 0 && <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.75px] min-w-[620px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">LR no.</th><th className="text-left px-2">Client</th><th className="text-left px-2">Item</th><th className="text-left px-2">VP</th><th className="text-right px-2">Received</th><th className="text-right px-2">Pending</th><th className="px-3 w-24">Qty</th></tr></thead>
          <tbody>{avail.map((a: any) => { const l = db.lrs.find((x: any) => x.id === a.lrId); const k = a.dgrnId + a.lrId + a.idx; const used = sum(f.items.filter((i: any) => i.dgrnId === a.dgrnId && i.lrId === a.lrId && i.idx === a.idx), (i: any) => i.qty); return <tr key={k} className="border-t border-line"><td className="px-3 py-1.5 docno">{l?.lrNo}</td><td className="px-2">{lookup.cust(db, l?.consigneeId)?.short}</td><td className="px-2">{l?.items[a.idx]?.name}</td><td className="px-2 docno text-muted">{a.vpNo}</td><td className="px-2 text-right tnum">{a.received}</td><td className="px-2 text-right tnum">{a.pending - used}</td><td className="px-3"><input type="number" className="input h-8 text-right" aria-label="Quantity" max={a.pending - used} value={pick[k] ?? ''} placeholder="0" onChange={(e) => setPick({ ...pick, [k]: Math.min(a.pending - used, Number(e.target.value)) })} /></td></tr>; })}</tbody></table>
          <div className="p-2 flex justify-end border-t border-line"><button className="btn-violet btn-sm" onClick={addItems}><Plus size={13} /> Add items</button></div></div>}
        {f.items.length > 0 && <FormSection title={`Challan items (${f.items.length})`} cols={1}><div className="border border-line rounded-lg overflow-hidden"><table className="w-full text-[12.75px]"><tbody>{f.items.map((it: any, k: number) => { const l = db.lrs.find((x: any) => x.id === it.lrId); return <tr key={k} className="border-b border-line/60 last:border-0"><td className="px-3 py-1.5 docno">{l?.lrNo}</td><td className="px-2">{l?.items[it.idx]?.name}</td><td className="px-2 docno text-muted">{it.vpNo}</td><td className="px-2 w-24"><input type="number" className="input h-8 text-right" aria-label="Quantity" value={it.qty} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, qty: Number(e.target.value) } : x)) })} /></td><td className="pr-2 w-10"><button className="btn-icon h-7 w-7 hover:text-bad" aria-label="Delete item" onClick={() => setF({ ...f, items: f.items.filter((_: any, j: number) => j !== k) })}><Trash2 size={13} /></button></td></tr>; })}</tbody></table></div><div className="text-[12px] text-muted">Qty {num(sum(f.items, (i: any) => i.qty))} · weight {num(weight)} kg</div></FormSection>}
        <FormSection title="Route & delivery" cols={3}>
          <Field label="Source"><Select value={f.sourceCity} onChange={(e) => setF({ ...f, sourceCity: e.target.value })} options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
          <Field label="Destination" required><Select value={f.destCity} onChange={(e) => setF({ ...f, destCity: e.target.value })} placeholder="Select" options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
          <div className="flex items-end"><Check label="Self delivery (consignee pick-up)" checked={f.selfDelivery} onChange={(v) => setF({ ...f, selfDelivery: v })} /></div>
          <Field label="Delivery address" className="sm:col-span-3"><Input value={f.deliveryAddress} onChange={(e) => setF({ ...f, deliveryAddress: e.target.value })} /></Field>
        </FormSection>
        {!f.selfDelivery && <FormSection title="Truck" cols={3}>
          <Field label="Truck type"><Radio options={['Own', 'Market']} value={f.truckType} onChange={(v) => setF({ ...f, truckType: v, truckId: '' })} /></Field>
          {f.truckType === 'Own' && <Field label="Trip"><Select value={f.tripId} onChange={(e) => setF({ ...f, tripId: e.target.value })} placeholder="New trip" options={db.trips.filter((t: any) => !t.completed).map((t: any) => ({ value: t.id, label: t.name }))} /></Field>}
          {f.truckType === 'Market' && <Field label="Transporter / broker"><Select value={f.transporterId} onChange={(e) => setF({ ...f, transporterId: e.target.value })} placeholder="Select" options={db.transporters.filter((t: any) => !t.blacklisted).map((t: any) => ({ value: t.id, label: t.name }))} /></Field>}
          <Field label="Truck no." required><Select value={f.truckId} onChange={(e) => { const t = lookup.truck(db, e.target.value); setF({ ...f, truckId: e.target.value, capacity: t?.capacity, transporterId: t?.transporterId || f.transporterId, driverName: t?.driverId ? lookup.driverName(db, t.driverId) : f.driverName }); }} placeholder="Select" options={trucks.filter((t: any) => f.truckType === 'Own' || !f.transporterId || t.transporterId === f.transporterId).map((t: any) => ({ value: t.id, label: t.number }))} /></Field>
          <Field label="Truck capacity"><Input value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field>
          <Field label="Driver name"><Input value={f.driverName} onChange={(e) => setF({ ...f, driverName: e.target.value })} /></Field>
          <Field label="Mobile no."><Input value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} /></Field>
        </FormSection>}
        <FormSection title="Freight & loading" cols={4}>
          <Field label="Freight (₹)" hint={rateHint ? `Matrix ${inr(rateHint.rate)}` : undefined}><Input type="number" value={f.freight} onChange={(e) => setF({ ...f, freight: e.target.value })} /></Field>
          <Field label="Advance (₹)"><Input type="number" value={f.advance} onChange={(e) => setF({ ...f, advance: e.target.value })} /></Field>
          <Field label="Advance paid by"><Select value={f.advancePaidBy} onChange={(e) => setF({ ...f, advancePaidBy: e.target.value })} options={db.ledgers.map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
          <Field label="Payment mode"><Select value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })} options={['Cash', 'Bank']} /></Field>
          <Field label="Loading date"><Input type="date" value={f.loadingDate} onChange={(e) => setF({ ...f, loadingDate: e.target.value })} /></Field>
          <Field label="Loading time"><Input type="time" value={f.loadingTime} onChange={(e) => setF({ ...f, loadingTime: e.target.value })} /></Field>
          <Field label="Supervisor"><Select value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })} options={db.labours.filter((l: any) => l.type === 'Supervisor').map((l: any) => ({ value: l.id, label: `${l.name} (${l.branchId})` }))} /></Field>
          <div className="flex items-end"><Check label="Email challan" checked={f.email} onChange={(v) => setF({ ...f, email: v })} /></div>
          <Field label="Remark" className="col-span-2 lg:col-span-4"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
        </FormSection>
      </div>
    </Drawer>
  );
}

// ---------------- LDC Acknowledgment (Supervisor / Collection / Client) ----------------
export function LDCAck() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord } = useUI.getState();
  const [kind, setKind] = useState<'ackSupervisor' | 'ackCollection' | 'ackClient'>('ackSupervisor');
  const prev = { ackSupervisor: null, ackCollection: 'ackSupervisor', ackClient: 'ackSupervisor' }[kind];
  const cands = db.dcs.filter((d: any) => !d[kind] && (!prev || d[prev]));
  const [dcId, setDcId] = useState(params.dcId || cands[0]?.id || '');
  const dc = db.dcs.find((d: any) => d.id === dcId);
  const [f, setF] = useState<any>({});
  useEffect(() => {
    if (!dc) return;
    const base = dc[kind] ? structuredClone(dc[kind]) : { reportingDate: ymd(), reportingTime: '09:00', deliveryDate: ymd(), deliveryTime: hm(), unloadingDate: ymd(), unloadingTime: hm(), collectionDate: ymd(), transporterId: dc.transporterId, detentionDays: 0, detentionAmt: 0, parking: 0, other: 0, labour: 0, damageAmt: 0, shortageAmt: 0, paymentMode: 'Bank', supervisorId: dc.supervisorId, remark: '', complaint: '', suggestion: '', scan: '', items: dc.items.map((i: any) => ({ lrId: i.lrId, idx: i.idx, total: i.qty, received: i.qty, damage: 0, shortage: 0 })) };
    setF(base);
  }, [dcId, kind]);
  const titles = { ackSupervisor: 'by supervisor', ackCollection: 'of challan collection', ackClient: 'by client' };
  const listRows = db.dcs.filter((d: any) => d[kind]).slice().reverse();
  return (
    <div>
      <PageHeader eyebrow="Operations" title="LDC acknowledgment" subtitle="Three acknowledgments close each lorry delivery challan: the branch supervisor confirms delivery, the broker returns the signed challan (collection) and the client confirms receipt. Approval for payment needs all three." />
      <Segmented options={[{ key: 'ackSupervisor', label: 'Supervisor' }, { key: 'ackCollection', label: 'Challan collection' }, { key: 'ackClient', label: 'Client' }]} value={kind} onChange={(v: any) => { setKind(v); setDcId(''); }} />
      <div className="grid lg:grid-cols-[1fr_300px] gap-4 mt-4 items-start">
        <Card title={`LDC acknowledgment ${titles[kind]}`}>
          <div className="grid gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Rake no."><Select value={dc?.scheduleId || ''} onChange={(e) => setDcId(cands.find((d: any) => d.scheduleId === e.target.value)?.id || '')} placeholder="All" options={[...new Set(cands.map((d: any) => d.scheduleId))].map((x: any) => ({ value: x, label: lookup.sched(db, x)?.rakeNo || 'Road' }))} /></Field>
              <Field label="Truck no."><Select value={dcId} onChange={(e) => setDcId(e.target.value)} placeholder="Select" options={cands.map((d: any) => ({ value: d.id, label: lookup.truckNo(db, d.truckId) }))} /></Field>
              <Field label="Challan no." required><Select value={dcId} onChange={(e) => setDcId(e.target.value)} placeholder={cands.length ? 'Select challan' : 'Nothing pending'} options={cands.map((d: any) => ({ value: d.id, label: d.dcNo }))} /></Field>
            </div>
            {dc && f.items && <>
              <div className="text-[12.5px] text-muted">Driver {dc.driverName} · {dc.mobile} · freight {inr(dc.freight)} · {lookup.transName(db, dc.transporterId)}</div>
              <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.75px] min-w-[560px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">LR no.</th><th className="text-left px-2">Item</th><th className="text-right px-2">Total</th><th className="px-2 w-24">Received</th><th className="px-2 w-24">Damage</th><th className="px-3 w-24">Shortage</th></tr></thead><tbody>{f.items.map((it: any, k: number) => { const l = db.lrs.find((x: any) => x.id === it.lrId); return <tr key={k} className="border-t border-line"><td className="px-3 py-1.5 docno">{l?.lrNo}</td><td className="px-2">{l?.items[it.idx]?.name}</td><td className="px-2 text-right tnum">{it.total}</td>{['received', 'damage', 'shortage'].map((c) => <td key={c} className="px-2"><input className="input h-8 text-right" type="number" aria-label={c} value={it[c]} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, [c]: Number(e.target.value) } : x)) })} /></td>)}</tr>; })}</tbody></table></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kind === 'ackCollection' && <><Field label="Collection date"><Input type="date" value={f.collectionDate} onChange={(e) => setF({ ...f, collectionDate: e.target.value })} /></Field><Field label="Transporter"><Select value={f.transporterId} onChange={(e) => setF({ ...f, transporterId: e.target.value })} options={db.transporters.map((t: any) => ({ value: t.id, label: t.name }))} /></Field></>}
                <Field label="Reporting date"><Input type="date" value={f.reportingDate} onChange={(e) => setF({ ...f, reportingDate: e.target.value })} /></Field>
                <Field label="Reporting time"><Input type="time" value={f.reportingTime} onChange={(e) => setF({ ...f, reportingTime: e.target.value })} /></Field>
                {kind !== 'ackClient' ? <><Field label="Delivery date"><Input type="date" value={f.deliveryDate} onChange={(e) => setF({ ...f, deliveryDate: e.target.value })} /></Field><Field label="Delivery time"><Input type="time" value={f.deliveryTime} onChange={(e) => setF({ ...f, deliveryTime: e.target.value })} /></Field></> : <><Field label="Unloading date"><Input type="date" value={f.unloadingDate} onChange={(e) => setF({ ...f, unloadingDate: e.target.value })} /></Field><Field label="Unloading time"><Input type="time" value={f.unloadingTime} onChange={(e) => setF({ ...f, unloadingTime: e.target.value })} /></Field></>}
                <Field label="Detention days"><Input type="number" value={f.detentionDays} onChange={(e) => setF({ ...f, detentionDays: Number(e.target.value), detentionAmt: Number(e.target.value) * 1500 })} /></Field>
                <Field label="Detention amount"><Input type="number" value={f.detentionAmt} onChange={(e) => setF({ ...f, detentionAmt: Number(e.target.value) })} /></Field>
                {kind !== 'ackClient' && <><Field label="Parking"><Input type="number" value={f.parking} onChange={(e) => setF({ ...f, parking: Number(e.target.value) })} /></Field><Field label="Other expenses"><Input type="number" value={f.other} onChange={(e) => setF({ ...f, other: Number(e.target.value) })} /></Field></>}
                {kind !== 'ackSupervisor' && <><Field label="Damage amount"><Input type="number" value={f.damageAmt} onChange={(e) => setF({ ...f, damageAmt: Number(e.target.value) })} /></Field><Field label="Shortage amount"><Input type="number" value={f.shortageAmt} onChange={(e) => setF({ ...f, shortageAmt: Number(e.target.value) })} /></Field></>}
                {kind === 'ackCollection' && <><Field label="Labour charge"><Input type="number" value={f.labour} onChange={(e) => setF({ ...f, labour: Number(e.target.value) })} /></Field><Field label="Payment mode"><Select value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })} options={['Cash', 'Bank']} /></Field><Field label="LDC scan"><label className="btn-ghost h-9 cursor-pointer w-full"><Upload size={14} /> {f.scan || 'Upload'}<input type="file" className="sr-only" onChange={(e) => setF({ ...f, scan: e.target.files?.[0]?.name || '' })} /></label></Field></>}
                {kind === 'ackSupervisor' && <Field label="Supervisor"><Select value={f.supervisorId} onChange={(e) => setF({ ...f, supervisorId: e.target.value })} options={db.labours.filter((l: any) => l.type === 'Supervisor').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>}
                {kind === 'ackClient' ? <><Field label="Complaint" className="col-span-2"><Input value={f.complaint} onChange={(e) => setF({ ...f, complaint: e.target.value })} /></Field><Field label="Suggestion" className="col-span-2"><Input value={f.suggestion} onChange={(e) => setF({ ...f, suggestion: e.target.value })} /></Field></> : <Field label="Remark" className="col-span-2"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>}
              </div>
              <div className="flex justify-end"><button className="btn-primary" onClick={() => A.ackDC(dc.id, kind, f)}><CheckCircle2 size={15} /> Save acknowledgment</button></div>
            </>}
            {!cands.length && !dc && <EmptyState icon={CheckCircle2} title="Nothing pending" body={prev ? 'Challans appear here after the supervisor acknowledgment.' : 'All challans are acknowledged.'} />}
          </div>
        </Card>
        <Card title="Acknowledgment status" pad={false}><ul className="divide-y divide-line max-h-[520px] overflow-auto">{db.dcs.slice().reverse().map((d: any) => <li key={d.id}><button onClick={() => openRecord('dc', d.id)} className="w-full text-left px-4 py-2.5 hover:bg-surface2"><div className="flex justify-between"><span className="docno">{d.dcNo}</span><span className="text-[11px] text-muted">{lookup.truckNo(db, d.truckId)}</span></div><div className="flex gap-1 mt-1.5">{[['S', d.ackSupervisor], ['C', d.ackCollection], ['Cl', d.ackClient], ['A', d.approval]].map(([l, v]: any) => <span key={l} className={cls('chip', v ? 'bg-ok/10 text-ok' : 'bg-surface2 text-faint border border-line')}>{l}</span>)}</div></button></li>)}</ul></Card>
      </div>
      <div className="mt-6"><DataTable id={`ldc-${kind}`} title={`Acknowledged ${titles[kind]}`} rows={listRows} onRow={(r) => openRecord('dc', r.id)} cols={[{ key: 'dcNo', label: 'Challan no.', render: (r) => <DocNo>{r.dcNo}</DocNo>, mobile: 'title' }, { key: 'rake', label: 'Rake no.', value: (r) => r.rakeNo }, { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.truckId), mobile: 'sub' }, { key: 'driverName', label: 'Driver name' }, { key: 'mobile', label: 'Mobile no.' }, { key: 'freight', label: 'Freight', align: 'right', render: (r) => inr(r.freight) }, { key: 'who', label: kind === 'ackSupervisor' ? 'Supervisor' : 'Broker', value: (r) => (kind === 'ackSupervisor' ? lookup.labour(db, r.ackSupervisor.supervisorId) : lookup.transName(db, r.transporterId)) }, { key: 'at', label: 'Acknowledged', render: (r) => fmtDT(r[kind].at), mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Edit acknowledgment', icon: Pencil, onClick: () => setDcId(r.id), hidden: !!r.approval }]} /></div>
    </div>
  );
}

// ---------------- Delivered (road) ----------------
export function Delivery() {
  const db = useDB();
  const { openRecord } = useUI.getState();
  const [client, setClient] = useState('');
  const cands = db.lrs.filter((l: any) => ['In Transit', 'Out for Delivery', 'Finalised'].includes(l.status) && (l.mode === 'Road' || l.status === 'Out for Delivery') && (!client || l.consignorId === client));
  const [lrId, setLrId] = useState('');
  const lr = db.lrs.find((l: any) => l.id === lrId);
  const [f, setF] = useState({ date: ymd(), time: hm(), remark: 'Delivered in good condition', unloading: 0 });
  return (
    <div>
      <PageHeader eyebrow="Operations" title="LR delivery at consignee" subtitle="Close the road leg: record delivery date, time and unloading charges. The trip stays open until the truck completes it in Road Fleet." />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4 items-start">
        <Card title="Record delivery"><div className="grid gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Client"><Select value={client} onChange={(e) => { setClient(e.target.value); setLrId(''); }} placeholder="All clients" options={[...new Set(db.lrs.map((l: any) => l.consignorId))].map((c: any) => ({ value: c, label: lookup.custName(db, c) }))} /></Field>
            <Field label="LR number" required><Select value={lrId} onChange={(e) => setLrId(e.target.value)} placeholder={`${cands.length} LRs in transit`} options={cands.map((l: any) => ({ value: l.id, label: `${l.lrNo} · ${l.destination}` }))} /></Field>
          </div>
          {lr && <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg bg-surface2 border border-line p-3 text-[12.5px]">{[['Source', lr.source], ['Destination', lr.destination], ['LR date', `${fmtDate(lr.placeDate)} ${lr.placeTime}`], ['Truck', lookup.truckNo(db, lr.truckId)], ['Consignee', lookup.custName(db, lr.consigneeId)], ['Due', fmtDate(lr.dueDate)]].map(([k, v]) => <div key={k}><div className="text-[11px] text-muted font-semibold">{k}</div><div>{v}</div></div>)}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Delivery time"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
            <Field label="Unloading charges (₹)"><Input type="number" value={f.unloading} onChange={(e) => setF({ ...f, unloading: Number(e.target.value) })} /></Field>
            <Field label="Remark"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => { setClient(''); setLrId(''); }}>Clear</button><button className="btn-primary" disabled={!lr} onClick={() => { A.deliverLR(lr.id, f); setLrId(''); }}><CheckCircle2 size={15} /> Mark delivered</button></div>
        </div></Card>
        <Card title="In transit" subtitle="Tap to select" pad={false}><ul className="divide-y divide-line max-h-[460px] overflow-auto">{cands.map((l: any) => <li key={l.id}><button onClick={() => setLrId(l.id)} className={cls('w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-surface2', lrId === l.id && 'bg-violet/[.06]')}><span className="docno w-36 shrink-0">{l.lrNo}</span><span className="flex-1 min-w-0 text-[12.5px] truncate">{l.source} → {l.destination}</span><span className={cls('text-[12px] tnum', l.dueDate < ymd() && 'text-bad font-semibold')}>{fmtDate(l.dueDate).slice(0, 6)}</span></button></li>)}{!cands.length && <li className="p-6 text-center text-muted text-[13px]">No consignments in transit.</li>}</ul></Card>
      </div>
      <div className="mt-6"><DataTable id="delivered" title="Recently delivered" rows={db.lrs.filter((l: any) => l.delivery).sort((a: any, b: any) => b.delivery.date.localeCompare(a.delivery.date))} onRow={(r) => openRecord('lr', r.id)} cols={[{ key: 'lrNo', label: 'LR no.', render: (r) => <DocNo>{r.lrNo}</DocNo>, mobile: 'title' }, { key: 'c', label: 'Client', value: (r) => lookup.custName(db, r.consignorId), filter: true, mobile: 'sub' }, { key: 'route', label: 'Route', value: (r) => `${r.source} → ${r.destination}` }, { key: 'd', label: 'Delivered', render: (r) => `${fmtDate(r.delivery.date)} ${r.delivery.time}` }, { key: 'ontime', label: 'On time', render: (r) => <StatusBadge s={r.delivery.date <= r.dueDate ? 'On time' : `${daysBetween(r.dueDate, r.delivery.date)}d late`} tone={r.delivery.date <= r.dueDate ? 'ok' : 'bad'} dot={false} />, mobile: 'meta' }, { key: 'u', label: 'Unloading', align: 'right', render: (r) => inr(r.delivery.unloading) }, { key: 'pod', label: 'POD', render: (r) => <StatusBadge s={r.ack ? 'Received' : 'Not Received'} /> }]} /></div>
    </div>
  );
}

// ---------------- POD / LR Acknowledgment ----------------
export function POD() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint, ask, toast } = useUI.getState();
  const cands = db.lrs.filter((l: any) => l.status === 'Delivered' && !l.ack);
  const [lrId, setLrId] = useState(params.lrId || '');
  const lr = db.lrs.find((l: any) => l.id === lrId);
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (lr) setF(lr.ack ? structuredClone(lr.ack) : { receivedDate: ymd(), receivedTime: hm(), detentionDays: 0, detentionAmt: 0, docket: '', courier: '', courierCharge: 0, damageAmt: 0, remark: '', items: lr.items.map((it: any, idx: number) => ({ idx, total: it.qty, received: it.qty - (it.damage || 0), damage: it.damage || 0 })), uploads: [] }); }, [lrId]);
  const rate = lr ? (db.agreements.find((a: any) => a.clientId === lr.consignorId)?.detentionRate || 1500) : 1500;
  return (
    <div>
      <PageHeader eyebrow="Operations" title="POD / acknowledgment" subtitle="Record the signed consignee copy when it reaches the office. Detention and damage captured here flow into the bill; billing is blocked until POD arrives (unless the client allows billing without acknowledgment)." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Pending POD" value={cands.length} icon={Inbox} tone="warn" />
        <KPI label="Pending > 7 days" value={cands.filter((l: any) => daysBetween(l.delivery?.date) > 7).length} icon={Clock} tone="bad" />
        <KPI label="Received (30d)" value={db.lrs.filter((l: any) => l.ack && daysBetween(l.ack.receivedDate) <= 30).length} icon={CheckCircle2} tone="ok" />
        <KPI label="Avg turnaround" value={`${Math.round(sum(db.lrs.filter((l: any) => l.ack && l.delivery), (l: any) => daysBetween(l.delivery.date, l.ack.receivedDate)) / Math.max(1, db.lrs.filter((l: any) => l.ack && l.delivery).length))} d`} icon={Clock} />
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <Card title="LR acknowledgment">
          <div className="grid gap-4">
            <Field label="LR no." required><Select value={lrId} onChange={(e) => setLrId(e.target.value)} placeholder={`${cands.length} delivered LRs awaiting POD`} options={(lr?.ack ? [lr, ...cands] : cands).map((l: any) => ({ value: l.id, label: `${l.lrNo} · ${lookup.cust(db, l.consignorId)?.short} · delivered ${fmtDate(l.delivery?.date)}` }))} /></Field>
            {lr && f && <>
              <div className="border border-line rounded-lg overflow-hidden"><table className="w-full text-[12.75px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">Item</th><th className="text-right px-2">Total</th><th className="px-2 w-24">Received</th><th className="px-3 w-24">Damage</th></tr></thead><tbody>{f.items.map((it: any, k: number) => <tr key={k} className="border-t border-line"><td className="px-3 py-1.5">{lr.items[it.idx]?.name}</td><td className="px-2 text-right tnum">{it.total}</td><td className="px-2"><input className="input h-8 text-right" type="number" aria-label="Received" value={it.received} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, received: Number(e.target.value) } : x)) })} /></td><td className="px-3"><input className="input h-8 text-right" type="number" aria-label="Damage" value={it.damage} onChange={(e) => setF({ ...f, items: f.items.map((x: any, j: number) => (j === k ? { ...x, damage: Number(e.target.value) } : x)) })} /></td></tr>)}</tbody></table></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="Received date"><Input type="date" value={f.receivedDate} onChange={(e) => setF({ ...f, receivedDate: e.target.value })} /></Field>
                <Field label="Received time"><Input type="time" value={f.receivedTime} onChange={(e) => setF({ ...f, receivedTime: e.target.value })} /></Field>
                <Field label="Detention days"><Input type="number" value={f.detentionDays} onChange={(e) => setF({ ...f, detentionDays: Number(e.target.value), detentionAmt: Number(e.target.value) * rate })} /></Field>
                <Field label="Detention amount" hint={`@ ₹${rate}/day`}><Input type="number" value={f.detentionAmt} onChange={(e) => setF({ ...f, detentionAmt: Number(e.target.value) })} /></Field>
                <Field label="Docket no."><Input value={f.docket} onChange={(e) => setF({ ...f, docket: e.target.value })} /></Field>
                <Field label="Courier name"><Select value={f.courier} onChange={(e) => setF({ ...f, courier: e.target.value })} placeholder="Select" options={['DTDC', 'The Professional Couriers', 'Shree Tirupati Courier', 'Blue Dart', 'By hand']} /></Field>
                <Field label="Courier charge"><Input type="number" value={f.courierCharge} onChange={(e) => setF({ ...f, courierCharge: Number(e.target.value) })} /></Field>
                <Field label="Damage amount"><Input type="number" value={f.damageAmt} onChange={(e) => setF({ ...f, damageAmt: Number(e.target.value) })} /></Field>
                <Field label="Remark" className="col-span-2 lg:col-span-3"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
                <Field label="POD scan"><label className="btn-ghost h-9 cursor-pointer w-full"><Upload size={14} /> {f.uploads?.length ? `${f.uploads.length} file(s)` : 'Upload'}<input type="file" multiple accept="image/*,.pdf" className="sr-only" onChange={(e) => setF({ ...f, uploads: Array.from(e.target.files || []).map((x: any) => ({ name: x.name, size: `${Math.round(x.size / 1024)} KB` })) })} /></label></Field>
              </div>
              <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setLrId('')}>Cancel</button><button className="btn-primary" onClick={() => { A.receiveAck(lr.id, { ...f, damageAmt: Number(f.damageAmt) }); setLrId(''); }}><Inbox size={15} /> Submit</button></div>
            </>}
          </div>
        </Card>
        <Card title="Pending PODs" subtitle="Oldest first" pad={false}><ul className="divide-y divide-line max-h-[520px] overflow-auto">{cands.sort((a: any, b: any) => (a.delivery?.date || '').localeCompare(b.delivery?.date || '')).map((l: any) => { const d = daysBetween(l.delivery?.date); return <li key={l.id}><button onClick={() => setLrId(l.id)} className={cls('w-full text-left px-4 py-2.5 hover:bg-surface2', lrId === l.id && 'bg-violet/[.06]')}><div className="flex justify-between gap-2"><span className="docno">{l.lrNo}</span><span className={cls('text-[11.5px] font-semibold tnum', d > 7 ? 'text-bad' : d > 4 ? 'text-warn' : 'text-muted')}>{d}d</span></div><div className="text-[12px] text-muted truncate">{lookup.custName(db, l.consigneeId)} · {l.destination}</div></button></li>; })}</ul></Card>
      </div>
      <div className="mt-6"><DataTable id="pod" title="Acknowledgments received" rows={db.lrs.filter((l: any) => l.ack).sort((a: any, b: any) => b.ack.receivedDate.localeCompare(a.ack.receivedDate))} onRow={(r) => openRecord('lr', r.id, 'pod')} cols={[
        { key: 'c', label: 'Client', value: (r) => lookup.custName(db, r.consignorId), filter: true, mobile: 'sub' }, { key: 'lrNo', label: 'LR no.', render: (r) => <DocNo>{r.lrNo}</DocNo>, mobile: 'title' }, { key: 'source', label: 'Source' }, { key: 'destination', label: 'Destination' },
        { key: 'rd', label: 'Received date', render: (r) => fmtDate(r.ack.receivedDate), mobile: 'meta' }, { key: 'tb', label: 'To branch', value: (r) => lookup.branch(db, r.toBranchId)?.short, filter: true }, { key: 'dk', label: 'Docket no.', value: (r) => r.ack.docket },
        { key: 'det', label: 'Detention', align: 'right', render: (r) => inr(r.ack.detentionAmt) }, { key: 'dmg', label: 'Damage', align: 'right', render: (r) => inr(r.ack.damageAmt) },
      ]} rowActions={(r: any) => [
        { label: 'Download POD', icon: Download, onClick: () => toast('Download started', 'ok', r.ack.uploads?.[0]?.name || 'POD scan') },
        { label: 'Print acknowledgment', icon: Printer, onClick: () => openPrint('ack', r.id) },
        { label: 'Edit', icon: Pencil, onClick: () => setLrId(r.id), hidden: !!r.billId },
        { label: 'Delete', icon: Trash2, tone: 'bad', hidden: !!r.billId, onClick: () => ask({ title: `Delete POD for ${r.lrNo}?`, body: 'The LR will go back to “awaiting POD” and drop out of the billing queue.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.removeAck(r.id) }) },
      ]} /></div>
    </div>
  );
}

// ---------------- Courier ----------------
export function Courier() {
  const db = useDB();
  const { ask } = useUI.getState();
  const [tab, setTab] = useState('sent');
  const [form, setForm] = useState<any>(null);
  const rows = db.couriers.slice().reverse();
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Courier" subtitle="Inter-branch dispatch of PODs, LDC copies, bills and cheques, with receipt confirmation at the destination branch." actions={<button className="btn-primary" onClick={() => setForm({ fromBranchId: 'GH', toBranchId: 'JL', sentDate: ymd(), sentTime: hm(), docket: '', courierName: 'DTDC', charges: 90, particular: '', remark: '' })}><Plus size={15} /> Send courier</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'sent', label: 'Sent courier', count: rows.length }, { key: 'recv', label: 'Received courier', count: rows.filter((c: any) => !c.received).length }]} className="mb-4" />
      {tab === 'sent' ? <DataTable id="courier-sent" rows={rows} cols={[
        { key: 'docket', label: 'Docket no.', render: (r) => <DocNo>{r.docket}</DocNo>, mobile: 'title' }, { key: 'from', label: 'From branch', value: (r) => lookup.branch(db, r.fromBranchId)?.name, filter: true }, { key: 'to', label: 'To branch', value: (r) => lookup.branch(db, r.toBranchId)?.name, filter: true },
        { key: 'sent', label: 'Sent', render: (r) => `${fmtDate(r.sentDate)} ${r.sentTime}`, mobile: 'sub' }, { key: 'recv', label: 'Received', render: (r) => (r.received ? `${fmtDate(r.receivedDate)} ${r.receivedTime}` : '—') },
        { key: 'particular', label: 'Particular' }, { key: 'courierName', label: 'Courier', filter: true }, { key: 'charges', label: 'Charges', align: 'right', render: (r) => inr(r.charges) },
        { key: 'status', label: 'Status', value: (r) => (r.received ? 'Received' : 'Sent'), render: (r) => <StatusBadge s={r.received ? 'Received' : 'Sent'} />, mobile: 'meta', filter: true },
      ]} rowActions={(r: any) => [{ label: 'Edit', icon: Pencil, onClick: () => setForm(r), hidden: r.received }, { label: 'Delete', icon: Trash2, tone: 'bad', hidden: r.received, onClick: () => ask({ title: 'Delete courier entry?', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.remove('couriers', r.id, 'Courier') }) }]} />
        : <DataTable id="courier-recv" rows={rows.filter((c: any) => !c.received)} bulkActions={[{ label: 'Mark received', icon: CheckCircle2, onClick: (rs) => A.courierReceived(rs.map((r: any) => r.id)) }]} cols={[{ key: 'docket', label: 'Docket no.', render: (r) => <DocNo>{r.docket}</DocNo>, mobile: 'title' }, { key: 'from', label: 'From branch', value: (r) => lookup.branch(db, r.fromBranchId)?.name, mobile: 'sub' }, { key: 'to', label: 'To branch', value: (r) => lookup.branch(db, r.toBranchId)?.name }, { key: 'sent', label: 'Sent date', render: (r) => `${fmtDate(r.sentDate)} ${r.sentTime}` }, { key: 'age', label: 'In transit', value: (r) => `${daysBetween(r.sentDate)} days`, mobile: 'meta' }, { key: 'particular', label: 'Particular' }]} rowActions={(r: any) => [{ label: 'Mark received', icon: CheckCircle2, onClick: () => A.courierReceived([r.id]) }]} empty={<EmptyState icon={CheckCircle2} title="All couriers received" />} />}
      {form && <Modal open onClose={() => setForm(null)} title={form.id ? 'Edit courier' : 'Send courier'} footer={<><button className="btn-ghost" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" onClick={() => { A.save('couriers', { received: false, receivedDate: '', receivedTime: '', ...form, charges: Number(form.charges) }, 'Courier'); setForm(null); }}>Save</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From branch"><Select value={form.fromBranchId} onChange={(e) => setForm({ ...form, fromBranchId: e.target.value })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="To branch"><Select value={form.toBranchId} onChange={(e) => setForm({ ...form, toBranchId: e.target.value })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="Sent date"><Input type="date" value={form.sentDate} onChange={(e) => setForm({ ...form, sentDate: e.target.value })} /></Field>
          <Field label="Sent time"><Input type="time" value={form.sentTime} onChange={(e) => setForm({ ...form, sentTime: e.target.value })} /></Field>
          <Field label="Docket no." required><Input value={form.docket} onChange={(e) => setForm({ ...form, docket: e.target.value })} /></Field>
          <Field label="Courier name"><Input value={form.courierName} onChange={(e) => setForm({ ...form, courierName: e.target.value })} /></Field>
          <Field label="Charges (₹)"><Input type="number" value={form.charges} onChange={(e) => setForm({ ...form, charges: e.target.value })} /></Field>
          <Field label="Particular"><Input value={form.particular} onChange={(e) => setForm({ ...form, particular: e.target.value })} placeholder="e.g. 14 PODs for Sept" /></Field>
          <Field label="Remark" className="col-span-2"><Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
        </div>
      </Modal>}
    </div>
  );
}
