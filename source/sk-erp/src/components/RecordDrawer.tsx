import { useT } from '../lib/useT';
import React, { useState } from 'react';
import { useUI, useDB, lookup, lrStage, truckStatus, truckLocation, outstanding, A, isDiesel } from '../store/store';
import { Drawer, Modal, Timeline, WorkflowStepper } from './overlays';
import { Tabs, KV, StatusBadge, Card, Money, DocNo, Progress, Field, Input, Select, Stat, EmptyState } from './ui';
import { fmtDate, fmtDT, inr, sum, compactINR, daysBetween, ymd, hm, cls, num, now } from '../lib/util';
import { Printer, Mail, MessageSquare, Pencil, Send, Truck, CheckCircle2, Inbox, Receipt, FileText, Download, Barcode, MapPin } from 'lucide-react';
import { ResponsiveContainer } from 'recharts';
import { Bars, AreaTrend } from './charts';

export function RecordDrawer() {
  const d = useUI((s) => s.drawer);
  const close = useUI((s) => s.closeRecord);
  if (!d) return null;
  const M: any = { lr: LRView, order: OrderView, customer: CustomerView, truck: TruckView, trip: TripView, rake: RakeView, bill: BillView, dc: DCView, jobcard: JobCardView, po: POView, driver: DriverView };
  const V = M[d.type];
  if (!V) return null;
  return <V id={d.id} tab={d.tab} onClose={close} />;
}

export const ROAD_STEPS = ['Booked', 'Finalised', 'In Transit', 'Delivered', 'POD', 'Billed', 'Paid'];
export const RAIL_STEPS = ['Booked', 'GRN', 'VP Loaded', 'Rake', 'DGRN', 'LDC', 'Delivered', 'POD', 'Billed', 'Paid'];
export function lrStepIndex(db: any, l: any) {
  const st = lrStage(db, l);
  if (l.mode === 'Road') return { steps: ROAD_STEPS, i: { Draft: 0, Finalised: 1, 'In Transit': 2, Delivered: 3, 'POD Received': 4, Billed: 5, Paid: 7 }[st] ?? 0 };
  return { steps: RAIL_STEPS, i: { Draft: 0, Finalised: 0, 'In Transit': 0, 'At Rail Head': 1, Loaded: 2, 'Rake In Transit': 3, 'At Branch': 4, 'Out for Delivery': 5, Delivered: 6, 'POD Received': 7, Billed: 8, Paid: 10 }[st] ?? 0 };
}

function EmailSMS({ open, onClose, to, subject, kind }: { open: boolean; onClose: () => void; to: string; subject: string; kind: string }) {
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(true);
  return (
    <Modal open={open} onClose={onClose} title={`Send ${kind}`} size="sm" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { onClose(); toast(`${kind} queued for delivery`, 'ok', [email && `Email → ${to}`, sms && 'SMS → registered mobile'].filter(Boolean).join(' · ')); }}><Send size={14} /> Send</button></>}>
      <div className="grid gap-3">
        <Field label="Email to"><Input defaultValue={to} /></Field>
        <Field label="Subject"><Input defaultValue={subject} /></Field>
        <div className="flex gap-4 text-[13px]"><label className="flex items-center gap-2"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email with PDF</label><label className="flex items-center gap-2"><input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} /> SMS tracking link</label></div>
        <p className="text-[12px] text-muted">Prototype: messages are simulated and not actually sent.</p>
      </div>
    </Modal>
  );
}

function LRView({ id, tab: t0, onClose }: any) {
  const db = useDB();
  const l = db.lrs.find((x: any) => x.id === id);
  const [tab, setTab] = useState(t0 || 'overview');
  const [mail, setMail] = useState(false);
  const [disp, setDisp] = useState(false);
  const [deliver, setDeliver] = useState(false);
  const { openPrint, nav, openRecord } = useUI.getState();
  if (!l) return null;
  const st = lrStage(db, l);
  const loadPlan=((db as any).loadPlans||[]).find((p:any)=>p.id===l.loadPlanId||(p.orderIds||[]).includes(l.orderId));
  const dispatchReady=!loadPlan||['Loading Confirmed','Dispatched','Delivered','POD Received','Billed','Payment Partial','Paid'].includes(loadPlan.status);
  const { steps, i } = lrStepIndex(db, l);
  const bill = l.billId ? db.bills.find((b: any) => b.id === l.billId) : null;
  const grn = db.grns.find((g: any) => g.lrId === l.id);
  const sched = l.scheduleId ? lookup.sched(db, l.scheduleId) : null;
  const dcs = db.dcs.filter((d: any) => d.items.some((it: any) => it.lrId === l.id));
  const trip = db.trips.find((t: any) => t.id === l.tripId);
  const payments = bill ? db.clientPayments.filter((p: any) => p.billId === bill.id) : [];
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{l.lrNo}</span>} subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge s={st} /><span>{l.source} → {l.destination}</span><span className="text-faint">·</span><span>{l.mode}</span>{l.priority !== 'Normal' && <StatusBadge s={l.priority} />}</span>}
      footer={<>
        <button className="btn-ghost" onClick={() => setMail(true)}><Mail size={14} /> Email/SMS</button>
        <button className="btn-ghost" onClick={() => openPrint('lr', l.id)}><Printer size={14} /> Print LR</button>
        {!l.billId && <button className="btn-ghost" onClick={() => { onClose(); nav('ops/lr-new', { id: l.id }); }}><Pencil size={14} /> Edit</button>}
        {l.status === 'Finalised' && <button className="btn-primary" disabled={!dispatchReady} title={!dispatchReady?'Confirm Smart Load Plan loading first':''} onClick={() => dispatchReady&&setDisp(true)}><Truck size={14} /> {dispatchReady?'Dispatch':'Awaiting load confirmation'}</button>}
        {l.status === 'Draft' && <button className="btn-primary" onClick={() => { onClose(); nav('ops/lr-new', { id: l.id }); }}>Finalise LR</button>}
        {['In Transit', 'Out for Delivery'].includes(l.status) && l.mode === 'Road' && <button className="btn-primary" onClick={() => setDeliver(true)}><CheckCircle2 size={14} /> Mark delivered</button>}
        {l.status === 'Delivered' && !l.ack && <button className="btn-primary" onClick={() => { onClose(); nav('ops/pod', { lrId: l.id }); }}><Inbox size={14} /> Record POD</button>}
        {!l.billId && l.status === 'Delivered' && (l.ack || lookup.cust(db, l.consignorId)?.billWithoutAck) && <button className="btn-violet" onClick={() => { onClose(); nav('fin/billing', { clientId: l.billHead === 'Consignee' ? l.consigneeId : l.consignorId }); }}><Receipt size={14} /> Bill</button>}
      </>}>
      <div className="px-4 sm:px-5 pt-4 bg-surface border-b border-line">
        <WorkflowStepper steps={steps} current={i} />
        <Tabs className="mt-3" value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'items', label: 'Items' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'docs', label: 'Documents' }, { key: 'pod', label: 'POD' }, { key: 'billing', label: 'Billing' }, { key: 'activity', label: 'Activity' }]} />
      </div>
      <div className="p-4 sm:p-5 grid gap-4">
        {tab === 'overview' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><Stat label="Freight" value={inr(l.freight)} /></Card>
            <Card><Stat label="Packages" value={num(l.packages)} /></Card>
            <Card><Stat label="Weight" value={`${num(l.weight)} kg`} /></Card>
            <Card><Stat label="Due" value={fmtDate(l.dueDate)} tone={l.dueDate < ymd() && !l.delivery ? 'bad' : undefined} /></Card>
          </div>
          <Card title="Parties & route">
            <KV cols={2} items={[
              ['Consignor', <button className="link text-left" onClick={() => openRecord('customer', l.consignorId)}>{lookup.custName(db, l.consignorId)}</button>], ['Consignee', <button className="link text-left" onClick={() => openRecord('customer', l.consigneeId)}>{lookup.custName(db, l.consigneeId)}</button>],
              ['Consignor address', l.consignorAddr], ['Delivery at', l.deliveryAt],
              ['From branch', lookup.branch(db, l.fromBranchId)?.name], ['To branch', lookup.branch(db, l.toBranchId)?.name],
              ['Order', l.orderNo ? <button className="link docno" onClick={() => openRecord('order', l.orderId)}>{l.orderNo}</button> : 'Direct LR'], ['Via HO / rail head', `${l.via}${l.toRailHead ? ' · ' + lookup.branch(db, l.toRailHead)?.name : ''}`],
              ['Place date', `${fmtDate(l.placeDate)} ${l.placeTime}`], ['Out date', `${fmtDate(l.outDate)} ${l.outTime}`],
              ['Payment mode', l.paymentMode], ['Bill head', l.billHead], ['GST paid by', l.gstPayBy], ['Risk', `${l.risk}'s risk`],
              ['Delivery type', l.deliveryType], ['Smart Load Plan', loadPlan ? <button className="link docno" onClick={()=>{onClose();nav('ops/smart-load',{planId:loadPlan.id})}}>{loadPlan.planNo} · {loadPlan.status}</button> : 'Not linked'], ['Seal no.', l.seal], ['Invoices', l.invoices], ['Goods value', inr(l.goodsValue)],
            ]} />
          </Card>
          <Card title="Lifecycle"><Timeline items={[...l.events].reverse().slice(0, 6).reverse()} /></Card>
        </>}
        {tab === 'items' && <Card title="Goods" pad={false}>
          <table className="w-full text-[12.75px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">Item</th><th className="text-left px-2">Unit</th><th className="text-right px-2">Qty</th><th className="text-right px-2">GRN recd</th><th className="text-right px-2">Pending</th><th className="text-right px-4">Damage</th></tr></thead>
            <tbody>{l.items.map((it: any, k: number) => { const gi = grn?.items.find((x: any) => x.idx === k); return <tr key={k} className="border-b border-line/60"><td className="px-4 py-2 font-medium">{it.name}</td><td className="px-2">{it.unit}</td><td className="px-2 text-right tnum">{num(it.qty)}</td><td className="px-2 text-right tnum">{gi ? num(gi.received) : '—'}</td><td className="px-2 text-right tnum">{gi ? num(gi.pending) : '—'}</td><td className={cls('px-4 text-right tnum', it.damage && 'text-bad font-semibold')}>{it.damage || 0}</td></tr>; })}</tbody>
          </table>
          <div className="px-4 py-3 grid grid-cols-3 gap-3 border-t border-line"><Stat label="Chargeable weight" value={`${num(l.chargeableWeight)} kg`} /><Stat label="Billing unit" value={l.billingUnit} /><Stat label="Insurance" value={l.insurance?.on ? l.insurance.no : 'Owner risk'} /></div>
        </Card>}
        {tab === 'vehicle' && <>
          <Card title={l.vehicle === 'Own' ? 'Own vehicle' : 'Market vehicle'}>
            <KV cols={2} items={[['Truck', l.truckId ? <button className="link docno" onClick={() => openRecord('truck', l.truckId)}>{lookup.truckNo(db, l.truckId)}</button> : 'Not assigned'], ['Driver', l.driverId ? lookup.driverName(db, l.driverId) : l.driverName || '—'], ['Trip', trip ? <button className="link docno" onClick={() => openRecord('trip', trip.id)}>{trip.name}</button> : '—'], ['Opening KM', l.openingKm ? num(l.openingKm) : '—'], ['Transporter', l.transporterId ? lookup.transName(db, l.transporterId) : '—'], ['RP number', l.rpNo || '—']]} />
          </Card>
          {l.mkt && <Card title="Market truck freight">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">{[['Freight', l.mkt.freight], ['Hamali', l.mkt.hamali], ['Advance', l.mkt.advance], ['TDS', l.mkt.tds], ['Commission', l.mkt.commission], ['Net balance', l.mkt.net]].map(([k, v]: any) => <Stat key={k} label={k} value={inr(v)} />)}</div>
          </Card>}
          {sched && <Card title="Rail movement">
            <KV cols={2} items={[['Rake', <button className="link docno" onClick={() => openRecord('rake', sched.id)}>{sched.rakeNo}</button>], ['Schedule', sched.title], ['VP', sched.loads.filter((x: any) => x.lrId === l.id).map((x: any) => x.vpNo).join(', ') || '—'], ['Rake status', <StatusBadge s={sched.status} />], ['GRN', grn ? `${grn.grnNo} · Gate ${grn.gateNo}` : '—'], ['LDC', dcs.map((d: any) => d.dcNo).join(', ') || '—']]} />
          </Card>}
        </>}
        {tab === 'docs' && <Card title="Documents & prints" pad={false}>
          <ul className="divide-y divide-line">
            {[['Lorry receipt (LR)', 'lr', l.id, true], ['LR – pre-printed stationery', 'lr', l.id, true, 'preprint'], ['Freight slip', 'freight', l.id, true], ['Consignment barcode', 'barcode', l.id, true], ...(grn ? [[`GRN slip ${grn.grnNo}`, 'grn', grn.id, true]] : []), ...dcs.map((d: any) => [`Delivery challan ${d.dcNo}`, 'dc', d.id, true]), ...(l.ack ? [['Acknowledgment', 'ack', l.id, true]] : []), ...(bill ? [[`Bill ${bill.billNo}`, 'bill', bill.id, true]] : []), ...(l.ack?.uploads || []).map((u: any) => [`${u.name} (${u.size})`, '', '', false])].map(([n, doc, rid, pr, v]: any, k) => (
              <li key={k} className="flex items-center gap-3 px-4 py-2.5"><FileText size={16} className="text-violet" /><span className="flex-1 text-[13px]">{n}</span>{pr ? <button className="btn-ghost btn-sm" onClick={() => openPrint(doc, rid, v)}><Printer size={13} /> Preview</button> : <button className="btn-ghost btn-sm" onClick={() => useUI.getState().toast('Download started', 'ok', n)}><Download size={13} /> Download</button>}</li>
            ))}
          </ul>
        </Card>}
        {tab === 'pod' && (l.ack ? <Card title="Acknowledgment received">
          <KV cols={2} items={[['Received', `${fmtDate(l.ack.receivedDate)} ${l.ack.receivedTime}`], ['Courier', `${l.ack.courier} ${l.ack.docket}`], ['Courier charge', inr(l.ack.courierCharge)], ['Detention', `${l.ack.detentionDays} day(s) · ${inr(l.ack.detentionAmt)}`], ['Damage amount', inr(l.ack.damageAmt)], ['Remark', l.ack.remark], ['Recorded by', l.ack.by]]} />
          {l.delivery && <div className="mt-4 pt-3 border-t border-line"><KV cols={2} items={[['Delivered', `${fmtDate(l.delivery.date)} ${l.delivery.time}`], ['Delivery remark', l.delivery.remark]]} /></div>}
        </Card> : <Card><EmptyState icon={Inbox} title={l.delivery ? 'POD not received yet' : 'Not delivered yet'} body={l.delivery ? `Delivered ${fmtDate(l.delivery.date)} – ${daysBetween(l.delivery.date)} days ago.` : 'POD can be recorded once the consignment is delivered.'} action={l.delivery && <button className="btn-primary" onClick={() => { onClose(); nav('ops/pod', { lrId: l.id }); }}>Record POD</button>} /></Card>)}
        {tab === 'billing' && (bill ? <Card title={<button className="link docno" onClick={() => openRecord('bill', bill.id)}>{bill.billNo}</button>} subtitle={`${fmtDate(bill.date)} · ${lookup.custName(db, bill.clientId)}`}>
          <div className="grid grid-cols-3 gap-3 mb-3"><Stat label="Bill value" value={inr(bill.net)} /><Stat label="Received" value={inr(sum(payments, (p: any) => p.received + p.tds))} /><Stat label="Pending" value={inr(bill.pending)} tone={bill.pending ? 'bad' : 'ok'} /></div>
          {payments.map((p: any) => <div key={p.id} className="flex justify-between text-[12.5px] py-1.5 border-t border-line"><span className="docno">{p.voucherNo}</span><span>{fmtDate(p.date)} · {p.mode}</span><span className="tnum font-semibold">{inr(p.received)}</span></div>)}
        </Card> : <Card><EmptyState icon={Receipt} title="Not billed" body={l.paymentMode === 'To Pay' ? 'To-Pay LR – freight collected at destination.' : l.status !== 'Delivered' ? 'Becomes billable after delivery.' : l.ack || lookup.cust(db, l.consignorId)?.billWithoutAck ? 'Eligible for billing now.' : 'Waiting for POD before billing.'} /></Card>)}
        {tab === 'activity' && <Card title="Audit history"><Timeline items={l.events} /></Card>}
      </div>
      <EmailSMS open={mail} onClose={() => setMail(false)} to={l.email || lookup.cust(db, l.consignorId)?.email} subject={`Lorry Receipt ${l.lrNo} – ${l.source} to ${l.destination}`} kind="LR by email/SMS" />
      {disp && <DispatchModal lr={l} onClose={() => setDisp(false)} />}
      {deliver && <DeliverModal lr={l} onClose={() => setDeliver(false)} />}
    </Drawer>
  );
}

export function DispatchModal({ lr, onClose }: { lr: any; onClose: () => void }) {
  const db = useDB();
  const [truckId, setTruck] = useState(lr.truckId || '');
  const truck = lookup.truck(db, truckId);
  const [driverId, setDriver] = useState(lr.driverId || truck?.driverId || '');
  const [km, setKm] = useState<number>(truck?.odometer || 0);
  const [adv, setAdv] = useState(10000);
  const own = db.trucks.filter((t: any) => (lr.vehicle === 'Own' ? t.type === 'Own' : t.type === 'Market'));
  const loadPlan=((db as any).loadPlans||[]).find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));
  const plannedTruck=loadPlan?.vehicle?.truckId||'';
  const checks=[
    {label:'LR finalised',ok:lr.status==='Finalised'},
    {label:'Smart Load Plan confirmed',ok:!loadPlan||['Loading Confirmed','Dispatched','Delivered','POD Received','Billed','Payment Partial','Paid'].includes(loadPlan.status)},
    {label:'Physical quantities reconciled',ok:!loadPlan||!!loadPlan.loadingVerification?.confirmedAt&&Number(loadPlan.loadingVerification?.variance||0)===0},
    {label:'Vehicle matches load plan',ok:!plannedTruck||truckId===plannedTruck},
    {label:'Driver assigned',ok:lr.vehicle!=='Own'||!!driverId},
  ];
  const dispatchReady=!!truckId&&checks.every(x=>x.ok);
  const t = useT();
  return (
    <Modal open onClose={onClose} title={t('Dispatch {no}', { no: lr.lrNo })} size="sm" footer={<><button className="btn-ghost" onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" disabled={!dispatchReady} onClick={() => { A.dispatchLR(lr.id, { truckId, driverId, openingKm: km, advance: adv }); onClose(); }}><Truck size={14} /> {t('Dispatch & start trip')}</button></>}>
      <div className="grid gap-3">
        {loadPlan&&<div className="rounded-lg border border-line p-3"><div className="flex justify-between gap-2 mb-2"><b className="text-[12.5px]">Dispatch readiness</b><StatusBadge s={dispatchReady?'Ready':'Blocked'} tone={dispatchReady?'ok':'bad'}/></div><div className="space-y-1">{checks.map((c:any)=><div key={c.label} className={c.ok?'text-[12px] text-ok':'text-[12px] text-bad'}>{c.ok?'✓':'✕'} {c.label}</div>)}</div>{plannedTruck&&truckId!==plannedTruck&&<div className="text-[11px] text-bad mt-2">Selected truck does not match the vehicle approved in {loadPlan.planNo}.</div>}</div>}
        <Field label={t('Truck')} required><Select value={truckId} onChange={(e) => { setTruck(e.target.value); const tk = lookup.truck(db, e.target.value); setDriver(tk?.driverId || ''); setKm(tk?.odometer || 0); }} placeholder={t('Select truck')} options={own.map((tk: any) => ({ value: tk.id, label: `${tk.number} · ${tk.capacity} · ${t(truckStatus(db, tk))}` }))} /></Field>
        {lr.vehicle === 'Own' && <><Field label={t('Driver')}><Select value={driverId} onChange={(e) => setDriver(e.target.value)} placeholder={t('Select driver')} options={db.drivers.filter((d: any) => !d.blacklisted).map((d: any) => ({ value: d.id, label: d.name }))} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label={t('Opening KM')}><Input type="number" value={km} onChange={(e) => setKm(Number(e.target.value))} /></Field><Field label={t('Trip advance (₹)')}><Input type="number" value={adv} onChange={(e) => setAdv(Number(e.target.value))} /></Field></div></>}
      </div>
    </Modal>
  );
}
export function DeliverModal({ lr, onClose }: { lr: any; onClose: () => void }) {
  const t = useT();
  const [f, setF] = useState({ date: ymd(), time: hm(), remark: t('Delivered in good condition'), unloading: 0 });
  return (
    <Modal open onClose={onClose} title={t('Deliver {no}', { no: lr.lrNo })} size="sm" footer={<><button className="btn-ghost" onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" onClick={() => { A.deliverLR(lr.id, f); onClose(); }}><CheckCircle2 size={14} /> {t('Confirm delivery')}</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('Delivery date')}><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label={t('Time')}><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
        <Field label={t('Unloading charges (₹)')} className="col-span-2"><Input type="number" value={f.unloading} onChange={(e) => setF({ ...f, unloading: Number(e.target.value) })} /></Field>
        <Field label={t('Remark')} className="col-span-2"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function OrderView({ id, onClose }: any) {
  const db = useDB();
  const o = db.orders.find((x: any) => x.id === id);
  const { nav, openRecord } = useUI.getState();
  if (!o) return null;
  const lrs = db.lrs.filter((l: any) => l.orderId === o.id);
  const loadPlan=((db as any).loadPlans||[]).find((p:any)=>p.id===o.loadPlanId||(p.orderIds||[]).includes(o.id));
  const planLR=lrs.find((l:any)=>l.loadPlanId===loadPlan?.id)||lrs[0];
  const planBill=planLR?.billId?(db.bills||[]).find((b:any)=>b.id===planLR.billId):null;
  const steps = ['Initiated', 'Confirmed', 'LR in process', 'Completed'];
  const idx = { Pending: 0, Rejected: 0, Confirmed: 1, 'In Process': 2, Completed: 4, Preclosed: 4 }[o.status] ?? 0;
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{o.orderNo}</span>} subtitle={<span className="flex gap-2 items-center"><StatusBadge s={o.status} /> {lookup.custName(db, o.clientId)}</span>}
      footer={<>
        {o.status === 'Pending' && <button className="btn-primary" onClick={() => { onClose(); nav('ops/order-confirmation', { id: o.id }); }}>Review & confirm</button>}
        {['Confirmed', 'In Process'].includes(o.status) && <><button className="btn-ghost" onClick={() => { A.precloseOrder(o.id); }}>Pre-close</button><button className="btn-primary" onClick={() => { onClose(); nav('ops/lr-new', { orderId: o.id }); }}>Create LR</button></>}
      </>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <Card><WorkflowStepper steps={steps} current={idx} /></Card>
        {loadPlan&&<Card title="ERP walkthrough" subtitle="Smart Load Planning to financial closure"><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">{[['Load plan',loadPlan.planNo],['Loading',loadPlan.loadingVerification?.confirmedAt?'Confirmed':loadPlan.status],['LR',planLR?.lrNo||'Pending'],['Finance',loadPlan.paymentStatus==='Paid'?'Paid':planBill?.billNo||loadPlan.billingStatus||'Pending']].map(([k,v])=><div key={k} className="rounded-lg border border-line bg-surface2 p-2.5"><div className="text-[10px] uppercase tracking-wide text-muted">{k}</div><b className="text-[11.5px] block mt-1">{v}</b></div>)}</div><div className="flex flex-wrap gap-2"><button className="btn-ghost btn-sm" onClick={()=>{onClose();nav('ops/smart-load',{planId:loadPlan.id})}}>Open Smart Load Plan</button>{planLR&&<button className="btn-ghost btn-sm" onClick={()=>openRecord('lr',planLR.id)}>Open LR 360</button>}{planBill&&<button className="btn-ghost btn-sm" onClick={()=>openRecord('bill',planBill.id)}>Open Bill</button>}</div></Card>}
        <Card title="Order details"><KV cols={2} items={[['Client', lookup.custName(db, o.clientId)], ['Pickup', `${lookup.cityName(db, o.cityId)} · ${fmtDate(o.pickupDate)}`], ['From branch', lookup.branch(db, o.fromBranchId)?.name], ['To branch', lookup.branch(db, o.toBranchId)?.name], ['Order by', o.orderBy === 'Truck' ? `${o.truckQty} trucks (${o.remainingTruckQty} remaining)` : 'Item quantity'], ['Contact', `${o.personName || '—'} · ${o.personPhone || ''}`], ['Instructions', o.instructions]]} /></Card>
        <Card title="Items" pad={false}><table className="w-full text-[12.75px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">Item</th><th className="text-right px-2">Qty</th><th className="text-right px-2">Remaining</th><th className="px-4 w-32">Fulfilled</th></tr></thead><tbody>{o.items.map((it: any, k: number) => <tr key={k} className="border-b border-line/60"><td className="px-4 py-2">{it.name} <span className="text-muted">({it.unit})</span></td><td className="px-2 text-right tnum">{num(it.qty)}</td><td className="px-2 text-right tnum">{num(it.remaining)}</td><td className="px-4"><Progress value={((it.qty - it.remaining) / it.qty) * 100} tone="ok" /></td></tr>)}</tbody></table></Card>
        <Card title={`LRs against this order (${lrs.length})`} pad={false}>{lrs.length ? <ul className="divide-y divide-line">{lrs.map((l: any) => <li key={l.id}><button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface2 text-left" onClick={() => openRecord('lr', l.id)}><span className="docno flex-1">{l.lrNo}</span><span className="text-[12px] text-muted">{l.destination}</span><StatusBadge s={lrStage(db, l)} /></button></li>)}</ul> : <div className="p-4 text-[13px] text-muted">No LR generated yet.</div>}</Card>
        <Card title="History"><Timeline items={o.events} /></Card>
      </div>
    </Drawer>
  );
}

function CustomerView({ id, onClose }: any) {
  const db = useDB();
  const c = db.customers.find((x: any) => x.id === id);
  const [tab, setTab] = useState('overview');
  const { openRecord, nav } = useUI.getState();
  if (!c) return null;
  const lrs = db.lrs.filter((l: any) => l.consignorId === c.id || l.consigneeId === c.id);
  const bills = db.bills.filter((b: any) => b.clientId === c.id && !b.deleted);
  const os = outstanding(db, c.id);
  const months = Array.from({ length: 6 }, (_, i) => { const d = now(); d.setMonth(d.getMonth() - (5 - i)); const k = ymd(d).slice(0, 7); return { x: d.toLocaleString('en', { month: 'short' }), Freight: sum(lrs.filter((l: any) => l.placeDate.startsWith(k) && l.consignorId === c.id), (l: any) => l.freight) }; });
  return (
    <Drawer open onClose={onClose} title={c.name} subtitle={<span className="flex flex-wrap gap-2 items-center">{lookup.cityName(db, c.city)} · GSTIN <span className="docno">{c.gst}</span>{c.disallowLR && <StatusBadge s="Credit hold" tone="bad" />}</span>} footer={<><button className="btn-ghost" onClick={() => { onClose(); nav('cust/360', { edit: c.id }); }}><Pencil size={14} /> Edit</button><button className="btn-primary" onClick={() => { onClose(); nav('ops/orders', { new: 1, clientId: c.id }); }}>New order</button></>}>
      <div className="px-4 sm:px-5 pt-3 bg-surface border-b border-line"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'lrs', label: 'Consignments', count: lrs.length }, { key: 'bills', label: 'Bills', count: bills.length }, { key: 'contracts', label: 'Contracts' }, { key: 'support', label: 'Support' }]} /></div>
      <div className="p-4 sm:p-5 grid gap-4">
        {tab === 'overview' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><Stat label="Outstanding" value={compactINR(os)} tone={os ? 'bad' : undefined} /></Card><Card><Stat label="Credit limit" value={compactINR(c.creditLimit)} /></Card>
            <Card><Stat label="Credit days" value={c.creditDays} /></Card><Card><Stat label="LRs (all time)" value={lrs.length} /></Card>
          </div>
          <Card title="Credit utilisation"><Progress value={(os / c.creditLimit) * 100} tone={os / c.creditLimit > 0.8 ? 'bad' : 'violet'} className="h-2" /><div className="text-[12px] text-muted mt-1.5">{Math.round((os / c.creditLimit) * 100)}% of {inr(c.creditLimit)}</div></Card>
          <Card title="Business trend" subtitle="Freight booked by month"><div className="h-44"><ResponsiveContainer><Bars data={months} keys={[{ key: 'Freight', label: 'Freight' }]} money /></ResponsiveContainer></div></Card>
          <Card title="Profile"><KV cols={2} items={[['Short name', c.short], ['PAN', c.pan], ['Contact', `${c.contact} · ${c.phone}`], ['Company contact', `${c.contactPerson || '—'} ${c.contactMobile || ''}`], ['Primary email', c.email], ['Billing email', c.billingEmail || '—'], ['Bill format', c.billFormat], ['LR format', c.lrFormat], ['TDS rate', `${c.tds}%`], ['Late payment interest', `${c.interest}% p.a.`], ['Bill without ack', c.billWithoutAck ? 'Allowed' : 'No'], ['Detention billing', c.detentionBill ? 'Yes' : 'No'], ['Address', c.address]]} /></Card>
        </>}
        {tab === 'lrs' && <Card pad={false}><ul className="divide-y divide-line">{lrs.slice().reverse().map((l: any) => <li key={l.id}><button onClick={() => openRecord('lr', l.id)} className="w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-surface2"><span className="docno w-36 shrink-0">{l.lrNo}</span><span className="flex-1 text-[12.5px] truncate">{l.source} → {l.destination}</span><span className="text-[12px] tnum">{inr(l.freight)}</span><StatusBadge s={lrStage(db, l)} /></button></li>)}</ul></Card>}
        {tab === 'bills' && <Card pad={false}><ul className="divide-y divide-line">{bills.map((b: any) => <li key={b.id}><button onClick={() => openRecord('bill', b.id)} className="w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-surface2"><span className="docno flex-1">{b.billNo}</span><span className="text-[12px] text-muted">{fmtDate(b.date)}</span><span className="tnum text-[12.5px] w-24 text-right">{inr(b.net)}</span><StatusBadge s={b.pending <= 0 ? 'Paid' : daysBetween(b.date) > c.creditDays ? 'Overdue' : 'Due'} /></button></li>)}</ul></Card>}
        {tab === 'contracts' && <>
          {db.rateContracts.filter((r: any) => r.customerId === c.id).map((r: any) => <Card key={r.id} title={`Rate contract ${fmtDate(r.from)} – ${fmtDate(r.to)}`} subtitle={r.remark} pad={false}><table className="w-full text-[12.5px]"><tbody>{r.routes.map((rt: any) => <tr key={rt.id} className="border-b border-line/60"><td className="px-4 py-2">{lookup.cityName(db, rt.source)} → {lookup.cityName(db, rt.dest)}</td><td className="px-2">{lookup.goods(db, rt.goodsId)?.name}</td><td className="px-2">{rt.mode}</td><td className="px-4 text-right tnum font-semibold">{inr(rt.rate)}</td></tr>)}</tbody></table></Card>)}
          {db.agreements.filter((a: any) => a.clientId === c.id).map((a: any) => <Card key={a.id} title="Agreement"><KV cols={3} items={[['Rate type', a.rateType], ['Rate', inr(a.rate)], ['Committed trips', a.committedTrips], ['Valid', `${fmtDate(a.start)} – ${fmtDate(a.expiry)}`], ['Detention rate', inr(a.detentionRate)], ['Capacity', a.carryingCapacity]]} /></Card>)}
        </>}
        {tab === 'support' && <Card pad={false}>{db.complaints.filter((x: any) => x.customerId === c.id).map((x: any) => <div key={x.id} className="px-4 py-3 border-b border-line"><div className="flex justify-between gap-2"><span className="docno">{x.ticketNo}</span><StatusBadge s={x.status} /></div><div className="text-[13px] mt-1">{x.detail}</div></div>)}</Card>}
      </div>
    </Drawer>
  );
}

function TruckView({ id, onClose }: any) {
  const db = useDB();
  const t = db.trucks.find((x: any) => x.id === id);
  const [tab, setTab] = useState('overview');
  const { openRecord, nav } = useUI.getState();
  if (!t) return null;
  const trips = db.trips.filter((x: any) => x.truckId === t.id);
  const exps = db.tripExpenses.filter((e: any) => e.truckId === t.id);
  const jcs = db.jobcards.filter((j: any) => j.truckId === t.id);
  const st = truckStatus(db, t);
  const docs = [['Insurance', t.insNo, t.insDue], ['Fitness', t.fitNo, t.fitDue], ['National permit', t.npNo, t.npDue], ['Goods permit', t.gpNo, t.gpDue], ['Road tax', t.taxNo, t.taxDue]];
  const km = sum(trips.filter((x: any) => x.completed), (x: any) => x.closingKm - x.openingKm);
  const diesel = exps.filter((e: any) => isDiesel(db, e.typeId));
  const avg = km && sum(diesel, (e: any) => e.qty) ? km / sum(diesel, (e: any) => e.qty) : 0;
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{t.number}</span>} subtitle={<span className="flex gap-2 items-center flex-wrap"><StatusBadge s={st} /><StatusBadge s={t.type} />{t.make} · {t.capacity}</span>} footer={<><button className="btn-ghost" onClick={() => { onClose(); nav('fleet/trucks', { edit: t.id }); }}><Pencil size={14} /> Edit</button>{t.type === 'Own' && <><button className="btn-ghost" onClick={() => { onClose(); nav('ws/jobcards', { new: 1, truckId: t.id }); }}>Job card</button><button className="btn-primary" disabled={st !== 'Available'} onClick={() => { onClose(); nav('fleet/trips', { new: 1, truckId: t.id }); }}>Start trip</button></>}</>}>
      <div className="px-4 sm:px-5 pt-3 bg-surface border-b border-line"><Tabs value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'trips', label: 'Trips', count: trips.length }, { key: 'docs', label: 'Compliance' }, { key: 'expenses', label: 'Expenses' }, { key: 'workshop', label: 'Workshop', count: jcs.length }]} /></div>
      <div className="p-4 sm:p-5 grid gap-4">
        {tab === 'overview' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Card><Stat label="Odometer" value={`${num(t.odometer)} km`} /></Card><Card><Stat label="Trips" value={trips.length} /></Card><Card><Stat label="Avg (km/l)" value={avg ? avg.toFixed(2) : '—'} tone={avg && avg < t.stdAvg ? 'warn' : undefined} /></Card><Card><Stat label="Std avg" value={t.stdAvg} /></Card></div>
          <Card title="Current position"><div className="flex items-center gap-2 text-[13px]"><MapPin size={15} className="text-brand" />{truckLocation(db, t)}</div></Card>
          <Card title="Vehicle"><KV cols={3} items={[['Chassis', t.chassis], ['Engine', t.engine], ['Tyres', t.tyres], ['Driver', t.driverId ? lookup.driverName(db, t.driverId) : '—'], ['Transporter', t.transporterId ? lookup.transName(db, t.transporterId) : 'SK Translines (own)'], ['Purchase', fmtDate(t.purchaseDate)], ['CFT / Volume', `${t.cft} / ${t.volume} m³`], ['Monthly fixed exp.', inr(t.monthlyExp)], ['EMI', inr(t.emi)]]} /></Card>
        </>}
        {tab === 'trips' && <Card pad={false}><ul className="divide-y divide-line">{trips.slice().reverse().map((x: any) => <li key={x.id}><button onClick={() => openRecord('trip', x.id)} className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-surface2"><span className="docno w-24">{x.name}</span><span className="flex-1 text-[12.5px] truncate">{lookup.cityName(db, x.fromCity)} → {lookup.cityName(db, x.toCity)}</span><span className="text-[12px] text-muted">{fmtDate(x.startDate)}</span><StatusBadge s={x.completed ? 'Completed' : 'On Trip'} /></button></li>)}</ul></Card>}
        {tab === 'docs' && <Card pad={false}><ul className="divide-y divide-line">{docs.map(([n, no, due]: any) => { const d = daysBetween(ymd(), due); return <li key={n} className="flex items-center gap-3 px-4 py-3"><span className="flex-1"><span className="block font-medium text-[13px]">{n}</span><span className="block text-[12px] text-muted docno">{no}</span></span><span className="text-[12.5px] tnum">{fmtDate(due)}</span><StatusBadge s={d < 0 ? 'Expired' : d <= 15 ? 'Expiring' : 'Valid'} /></li>; })}</ul></Card>}
        {tab === 'expenses' && <Card pad={false}><table className="w-full text-[12.5px]"><tbody>{exps.slice(-20).reverse().map((e: any) => <tr key={e.id} className="border-b border-line/60"><td className="px-4 py-2">{fmtDate(e.date)}</td><td className="px-2">{db.expenseTypes.find((x: any) => x.id === e.typeId)?.name}</td><td className="px-2 text-muted">{e.qty > 1 ? `${e.qty} × ${e.rate}` : ''}</td><td className="px-4 text-right tnum">{inr(e.amount)}</td></tr>)}</tbody></table></Card>}
        {tab === 'workshop' && <Card pad={false}><ul className="divide-y divide-line">{jcs.map((j: any) => <li key={j.id}><button onClick={() => openRecord('jobcard', j.id)} className="w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-surface2"><span className="docno">{j.no}</span><span className="flex-1 text-[12.5px] truncate">{j.remark}</span><span className="tnum text-[12.5px]">{inr(j.net)}</span><StatusBadge s={j.status} /></button></li>)}</ul></Card>}
      </div>
    </Drawer>
  );
}

function TripView({ id, onClose }: any) {
  const db = useDB();
  const t = db.trips.find((x: any) => x.id === id);
  const { openRecord, openPrint, nav } = useUI.getState();
  if (!t) return null;
  const exps = db.tripExpenses.filter((e: any) => e.tripId === t.id);
  const diesel = exps.filter((e: any) => isDiesel(db, e.typeId));
  const km = t.completed ? t.closingKm - t.openingKm : 0;
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{t.name}</span>} subtitle={<span className="flex gap-2 items-center"><StatusBadge s={t.completed ? 'Completed' : 'On Trip'} />{lookup.cityName(db, t.fromCity)} → {lookup.cityName(db, t.toCity)}</span>} footer={<><button className="btn-ghost" onClick={() => openPrint('tripadvance', t.id)}><Printer size={14} /> Trip advance slip</button><button className="btn-ghost" onClick={() => { onClose(); nav('fleet/fuel', { tripId: t.id }); }}>Add expense</button>{!t.completed && <button className="btn-primary" onClick={() => { onClose(); nav('fleet/trip-completion', { id: t.id }); }}>Complete trip</button>}</>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Card><Stat label="Onward freight" value={inr(t.onwardFreight)} /></Card><Card><Stat label="Advance" value={inr(t.advance)} /></Card><Card><Stat label="Expenses" value={inr(sum(exps, (e: any) => e.amount))} /></Card><Card><Stat label="Distance" value={km ? `${num(km)} km` : 'Running'} /></Card></div>
        <Card title="Trip"><KV cols={2} items={[['Trip for', t.for], ['Client / rake', t.clientId ? lookup.custName(db, t.clientId) : t.scheduleId ? lookup.sched(db, t.scheduleId)?.rakeNo : '—'], ['Truck', <button className="link docno" onClick={() => openRecord('truck', t.truckId)}>{lookup.truckNo(db, t.truckId)}</button>], ['Driver', lookup.driverName(db, t.driverId)], ['Start', `${fmtDate(t.startDate)} ${t.startTime}`], ['End', t.completed ? `${fmtDate(t.endDate)} ${t.endTime}` : '—'], ['Opening KM', num(t.openingKm)], ['Closing KM', t.completed ? num(t.closingKm) : '—'], ['Empty run', t.isEmpty ? 'Yes' : 'No'], ['LR', t.lrId ? <button className="link docno" onClick={() => openRecord('lr', t.lrId)}>{db.lrs.find((l: any) => l.id === t.lrId)?.lrNo}</button> : '—'], ['Log slip', t.logslipId ? db.logslips.find((x: any) => x.id === t.logslipId)?.no : 'Pending'], ['Diesel', `${num(sum(diesel, (e: any) => e.qty))} L · ${km && sum(diesel, (e: any) => e.qty) ? (km / sum(diesel, (e: any) => e.qty)).toFixed(2) + ' km/l' : ''}`]]} /></Card>
        <Card title="Expenses" pad={false}><table className="w-full text-[12.5px]"><tbody>{exps.map((e: any) => <tr key={e.id} className="border-b border-line/60"><td className="px-4 py-2">{db.expenseTypes.find((x: any) => x.id === e.typeId)?.name}</td><td className="px-2 text-muted">{e.pumpId ? db.pumps.find((p: any) => p.id === e.pumpId)?.name : lookup.cityName(db, e.city)}</td><td className="px-2 text-muted tnum">{e.qty > 1 ? `${e.qty} × ₹${e.rate}` : ''}</td><td className="px-4 text-right tnum font-semibold">{inr(e.amount)}</td></tr>)}</tbody></table></Card>
      </div>
    </Drawer>
  );
}

function RakeView({ id, onClose }: any) {
  const db = useDB();
  const s = db.schedules.find((x: any) => x.id === id);
  const [tab, setTab] = useState('overview');
  const { openRecord, nav, openPrint } = useUI.getState();
  if (!s) return null;
  const lrs = db.lrs.filter((l: any) => l.scheduleId === s.id);
  const steps = ['Scheduled', 'Planned', 'MR/RR', 'Loading', 'Dispatched', 'Arrived', 'DGRN', 'Completed'];
  const idx = s.isCompleted ? 8 : s.status === 'Unloading' ? 6 : s.status === 'Arrived' ? 5 : s.status === 'In Transit' ? 4 : s.loads.length ? 3 : s.mrrr ? 2 : s.plan ? 1 : 0;
  const rev = sum(lrs, (l: any) => l.freight);
  const rail = sum(s.mrrr?.rows || [], (r: any) => r.railFreight);
  const dcCost = sum(db.dcs.filter((d: any) => d.scheduleId === s.id), (d: any) => d.freight);
  const ham = sum(s.loads, (l: any) => l.labourCharge) + sum(db.grns.filter((g: any) => lrs.some((l: any) => l.id === g.lrId)), (g: any) => g.labourCharge) + sum(db.dgrns.filter((g: any) => g.scheduleId === s.id), (g: any) => g.labourCharge);
  const dc = (s.dcwcSrc?.amount || 0) - (s.dcwcSrc?.waiver?.amount || 0) + (s.dcwcDst?.amount || 0) + (s.dcwcSrc?.wc?.amount || 0) + (s.dcwcDst?.wc?.amount || 0);
  const profit = rev - rail - dcCost - ham - dc;
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{s.rakeNo}</span>} subtitle={<span className="flex gap-2 items-center flex-wrap"><StatusBadge s={s.status} />{s.title}</span>} footer={<><button className="btn-ghost" onClick={() => openPrint('loadsummary', s.id)}><Printer size={14} /> Loading summary</button><button className="btn-ghost" onClick={() => { onClose(); nav('rail/status', { id: s.id }); }}>Update status</button><button className="btn-primary" onClick={() => { onClose(); nav('ops/vp-loading', { id: s.id }); }}>VP loading</button></>}>
      <div className="px-4 sm:px-5 pt-4 bg-surface border-b border-line"><WorkflowStepper steps={steps} current={idx} /><Tabs className="mt-3" value={tab} onChange={setTab} tabs={[{ key: 'overview', label: 'Overview' }, { key: 'wagons', label: 'Wagons / VPs' }, { key: 'lrs', label: 'LRs', count: lrs.length }, { key: 'pnl', label: 'Profitability' }, { key: 'status', label: 'Status log' }]} /></div>
      <div className="p-4 sm:p-5 grid gap-4">
        {tab === 'overview' && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Card><Stat label="LRs" value={lrs.length} /></Card><Card><Stat label="VPs" value={sum(s.wagons, (w: any) => w.count)} /></Card><Card><Stat label="Weight" value={`${num(sum(lrs, (l: any) => l.weight) / 1000, 1)} t`} /></Card><Card><Stat label="Space utilisation" value={s.plan ? `${s.plan.utilisation}%` : '—'} /></Card></div>
          <Card title="Schedule"><KV cols={2} items={[['Schedule date', fmtDate(s.date)], ['Route', `${lookup.branch(db, s.sourceId)?.name} → ${lookup.branch(db, s.destId)?.name}`], ['Rake type', s.mrrr?.rakeType || '—'], ['Final', s.isFinal ? 'Yes' : 'No'], ['Rail head arrival', fmtDT(s.src?.arrival)], ['Rail head dispatch', fmtDT(s.src?.dispatch)], ['Destination arrival', fmtDT(s.dst?.arrival)], ['Unloaded', fmtDT(s.dst?.unload)]]} /></Card>
          {s.plan && <Card title="Load optimisation reports"><div className="flex flex-wrap gap-2">{s.plan.reports.map((r: string) => <button key={r} className="btn-ghost btn-sm" onClick={() => openPrint('loadsummary', s.id, r)}><FileText size={13} /> {r}</button>)}</div></Card>}
        </>}
        {tab === 'wagons' && <Card pad={false}><table className="w-full text-[12.5px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">#</th><th className="text-left px-2">Wagon</th><th className="text-left px-2">VP no.</th><th className="text-left px-2">MR/RR</th><th className="text-left px-2">Seal</th><th className="text-right px-4">Loaded qty</th></tr></thead><tbody>{(s.mrrr?.rows || s.vps.map((v: any, k: number) => ({ seq: k + 1, ...v }))).map((r: any) => <tr key={r.vpNo} className="border-b border-line/60"><td className="px-4 py-2">{r.seq}</td><td className="px-2">{lookup.wagon(db, r.wagonId)}</td><td className="px-2 docno">{r.vpNo}</td><td className="px-2 docno">{r.mrrrNo || '—'}</td><td className="px-2">{r.seal || '—'}</td><td className="px-4 text-right tnum">{num(sum(s.loads.filter((l: any) => l.vpNo === r.vpNo), (l: any) => sum(l.items, (i: any) => i.qty)))}</td></tr>)}</tbody></table></Card>}
        {tab === 'lrs' && <Card pad={false}><ul className="divide-y divide-line">{lrs.map((l: any) => <li key={l.id}><button onClick={() => openRecord('lr', l.id)} className="w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-surface2"><span className="docno w-36">{l.lrNo}</span><span className="flex-1 text-[12.5px] truncate">{lookup.cust(db, l.consignorId)?.short} → {l.destination}</span><span className="tnum text-[12px]">{num(l.packages)} pkg</span><StatusBadge s={lrStage(db, l)} /></button></li>)}</ul></Card>}
        {tab === 'pnl' && <Card title="Rake P&L">
          <table className="w-full text-[13px]"><tbody>{[['Freight revenue (LRs)', rev], ['Railway freight (MR/RR)', -rail], ['Delivery challan freight', -dcCost], ['Hamali (GRN, loading, DGRN)', -ham], ['Demurrage & wharfage (net of waiver)', -dc]].map(([k, v]: any) => <tr key={k} className="border-b border-line/60"><td className="py-2">{k}</td><td className={cls('text-right tnum', v < 0 && 'text-bad')}>{inr(v)}</td></tr>)}<tr><td className="py-2 font-semibold">Net contribution</td><td className={cls('text-right tnum font-bold', profit >= 0 ? 'text-ok' : 'text-bad')}>{inr(profit)}</td></tr></tbody></table>
          <div className="text-[12px] text-muted mt-2">Margin {rev ? Math.round((profit / rev) * 100) : 0}%</div>
        </Card>}
        {tab === 'status' && <Card title="In-transit status updates">{s.statusLog.length ? <Timeline items={s.statusLog.map((x: any) => ({ at: x.at, label: x.remark + (x.email ? ' · emailed' : ''), by: x.by }))} /> : <div className="text-muted text-[13px]">No updates yet.</div>}</Card>}
      </div>
    </Drawer>
  );
}

function BillView({ id, onClose }: any) {
  const db = useDB();
  const b = db.bills.find((x: any) => x.id === id);
  const { openRecord, openPrint, nav } = useUI.getState();
  if (!b) return null;
  const pays = db.clientPayments.filter((p: any) => p.billId === b.id);
  const cust = lookup.cust(db, b.clientId);
  const age = daysBetween(b.date);
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{b.billNo}</span>} subtitle={<span className="flex items-center gap-2 flex-wrap">{b.deleted ? <StatusBadge s="Deleted" tone="bad" /> : <StatusBadge s={b.pending <= 0 ? 'Paid' : age > (cust?.creditDays || 30) ? 'Overdue' : 'Due'} />}{cust?.name} · {fmtDate(b.date)}</span>}
      footer={<><button className="btn-ghost" onClick={() => openPrint('bill', b.id)}><Printer size={14} /> Print bill</button><button className="btn-ghost" onClick={() => openPrint('supplementary', b.id)}>Supplementary</button>{b.pending > 0 && !b.deleted && <button className="btn-primary" onClick={() => { onClose(); nav('fin/client-payments', { billId: b.id }); }}>Record payment</button>}</>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Card><Stat label="Taxable" value={inr(b.taxable)} /></Card><Card><Stat label="GST" value={inr(b.tax)} /></Card><Card><Stat label="Bill value" value={inr(b.net)} /></Card><Card><Stat label="Pending" value={inr(b.pending)} tone={b.pending ? 'bad' : 'ok'} /></Card></div>
        <Card title="LRs on this bill" pad={false}><div className="overflow-x-auto"><table className="w-full text-[12.5px] min-w-[520px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">LR</th><th className="text-left px-2">Delivered</th><th className="text-right px-2">Freight</th><th className="text-right px-2">Add</th><th className="text-right px-2">Less</th><th className="text-right px-4">Net</th></tr></thead><tbody>{b.rows.map((r: any) => { const l = db.lrs.find((x: any) => x.id === r.lrId); return <tr key={r.lrId} className="border-b border-line/60"><td className="px-4 py-2"><button className="link docno" onClick={() => openRecord('lr', r.lrId)}>{l?.lrNo}</button></td><td className="px-2">{fmtDate(r.deliveryDate)}</td><td className="px-2 text-right tnum">{inr(r.freight)}</td><td className="px-2 text-right tnum">{inr(r.add)}</td><td className="px-2 text-right tnum">{inr(r.sub)}</td><td className="px-4 text-right tnum font-semibold">{inr(r.net)}</td></tr>; })}</tbody></table></div></Card>
        <Card title="Tax"><KV cols={3} items={[['Place of supply', b.supplyState], ['CGST', `${b.cgst}%`], ['SGST', `${b.sgst}%`], ['IGST', `${b.igst}%`], ['Bill head', b.billHead], ['Format', b.format]]} /></Card>
        {b.supplementary?.length > 0 && <Card title="Supplementary bills">{b.supplementary.map((s: any) => <div key={s.id} className="flex justify-between text-[12.5px] py-1"><span className="docno">{s.no}</span><span>{s.reason}</span><span className="tnum">{inr(s.amount)}</span></div>)}</Card>}
        <Card title="Receipts" pad={false}>{pays.length ? <table className="w-full text-[12.5px]"><tbody>{pays.map((p: any) => <tr key={p.id} className="border-b border-line/60"><td className="px-4 py-2 docno">{p.voucherNo}</td><td className="px-2">{fmtDate(p.date)}</td><td className="px-2">{p.mode}</td><td className="px-2 text-right tnum">TDS {inr(p.tds)}</td><td className="px-4 text-right tnum font-semibold">{inr(p.received)}</td></tr>)}</tbody></table> : <div className="p-4 text-[13px] text-muted">No receipts yet – {age} days since billing.</div>}</Card>
      </div>
    </Drawer>
  );
}

function DCView({ id, onClose }: any) {
  const db = useDB();
  const d = db.dcs.find((x: any) => x.id === id);
  const { openRecord, openPrint, nav } = useUI.getState();
  if (!d) return null;
  const steps = ['Created', 'Supervisor ack', 'Collection ack', 'Client ack', 'Approved', 'Payslip', 'Paid'];
  const idx = d.status === 'Paid' ? 7 : d.payslipId ? 5 : d.approval ? 4 : d.ackClient ? 3 : d.ackCollection ? 2 : d.ackSupervisor ? 1 : 0;
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{d.dcNo}</span>} subtitle={<span className="flex gap-2 items-center flex-wrap"><StatusBadge s={d.status} />{d.rakeNo && <span className="docno">{d.rakeNo}</span>} · {lookup.truckNo(db, d.truckId)}</span>} footer={<><button className="btn-ghost" onClick={() => openPrint('dc', d.id)}><Printer size={14} /> Print LDC</button><button className="btn-primary" onClick={() => { onClose(); nav('ops/ldc', { dcId: d.id }); }}>Acknowledge</button></>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <Card><WorkflowStepper steps={steps} current={idx} /></Card>
        <Card title="Challan"><KV cols={2} items={[['Branch', lookup.branch(db, d.branchId)?.name], ['Delivery address', d.deliveryAddress], ['Transporter / broker', lookup.transName(db, d.transporterId)], ['Truck', `${lookup.truckNo(db, d.truckId)} · ${d.capacity}`], ['Driver', `${d.driverName} · ${d.mobile}`], ['Loading', `${fmtDate(d.loadingDate)} ${d.loadingTime}`], ['Freight', inr(d.freight)], ['Advance', `${inr(d.advance)} (${d.paymentMode})`], ['Supervisor', lookup.labour(db, d.supervisorId)]]} /></Card>
        <Card title="Items" pad={false}><table className="w-full text-[12.5px]"><tbody>{d.items.map((it: any, k: number) => { const l = db.lrs.find((x: any) => x.id === it.lrId); return <tr key={k} className="border-b border-line/60"><td className="px-4 py-2"><button className="link docno" onClick={() => openRecord('lr', it.lrId)}>{l?.lrNo}</button></td><td className="px-2">{l?.items[it.idx]?.name}</td><td className="px-2 docno text-muted">{it.vpNo}</td><td className="px-4 text-right tnum">{num(it.qty)}</td></tr>; })}</tbody></table></Card>
        {d.approval && <Card title="Approval"><KV cols={3} items={[['Freight', inr(d.approval.freight)], ['Advance', inr(d.approval.advance)], ['Detention', inr(d.approval.detAmt)], ['Labour', inr(d.approval.labour)], ['Deductions', inr(d.approval.shortage + d.approval.damage)], ['Payable', <b>{inr(d.approval.payable)}</b>], ['Approved by', d.approval.by]]} /></Card>}
        {d.comments.length > 0 && <Card title="Remarks">{d.comments.map((c: any, k: number) => <div key={k} className="text-[12.5px] py-1"><b>{c.by}</b>: {c.text} <span className="text-muted">· {fmtDT(c.at)}</span></div>)}</Card>}
      </div>
    </Drawer>
  );
}

function JobCardView({ id, onClose }: any) {
  const db = useDB();
  const j = db.jobcards.find((x: any) => x.id === id);
  const { openPrint, nav } = useUI.getState();
  if (!j) return null;
  const steps = ['Draft', 'Pending Approval', 'Approved', 'Finalised'];
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{j.no}</span>} subtitle={<span className="flex gap-2 items-center"><StatusBadge s={j.status} />{lookup.truckNo(db, j.truckId)} · {j.remark}</span>} footer={<><button className="btn-ghost" onClick={() => openPrint('jobcard', j.id)}><Printer size={14} /> Job card</button><button className="btn-ghost" onClick={() => openPrint('gatepass', j.id)}>Gate pass</button>{j.status === 'Pending Approval' && <button className="btn-ok" onClick={() => A.approveJobCard(j.id)}>Approve</button>}{j.status !== 'Finalised' && <button className="btn-primary" onClick={() => { onClose(); nav('ws/jobcards', { id: j.id }); }}>Open</button>}</>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <Card><WorkflowStepper steps={steps} current={steps.indexOf(j.status) + (j.status === 'Finalised' ? 1 : 0)} /></Card>
        <Card title="Details"><KV cols={3} items={[['Truck', lookup.truckNo(db, j.truckId)], ['Driver', lookup.driverName(db, j.driverId)], ['Truck status', j.truckStatus], ['In', `${fmtDate(j.inDate)} ${j.inTime}`], ['Out', j.outDate ? `${fmtDate(j.outDate)} ${j.outTime}` : '—'], ['Opening KM', num(j.openingKm)], ['Approved by', j.approvedBy || '—'], ['Finalised by', j.finalisedBy || '—'], ['Estimate', inr(j.net)]]} /></Card>
        <Card title="Parts" pad={false}><table className="w-full text-[12.5px]"><tbody>{j.parts.map((p: any, k: number) => <tr key={k} className="border-b border-line/60"><td className="px-4 py-2">{lookup.spare(db, p.spareId)?.name}</td><td className="px-2 text-muted">{p.batch}</td><td className="px-2 text-right tnum">{p.qty} × {inr(p.rate)}</td><td className="px-2">{lookup.labour(db, p.mechanicId)}</td><td className="px-4 text-right tnum">{inr(p.qty * p.rate)}</td></tr>)}</tbody></table></Card>
        <Card title="Services" pad={false}><table className="w-full text-[12.5px]"><tbody>{j.services.map((p: any, k: number) => <tr key={k} className="border-b border-line/60"><td className="px-4 py-2">{lookup.spare(db, p.spareId)?.name}</td><td className="px-2 text-muted">{lookup.supplier(db, p.supplierId)}</td><td className="px-2 text-right tnum">{inr(p.qty * p.rate)}</td><td className="px-4">{p.serviceBillId ? <StatusBadge s="Billed" /> : <StatusBadge s="Pending" />}</td></tr>)}</tbody></table></Card>
      </div>
    </Drawer>
  );
}

function POView({ id, onClose }: any) {
  const db = useDB();
  const p = db.pos.find((x: any) => x.id === id);
  const { openPrint, nav } = useUI.getState();
  if (!p) return null;
  const inw = db.inwards.find((i: any) => i.poId === p.id);
  return (
    <Drawer open onClose={onClose} title={<span className="docno text-[19px]">{p.no}</span>} subtitle={<span className="flex gap-2 items-center"><StatusBadge s={p.status} />{lookup.supplier(db, p.supplierId)} · {fmtDate(p.date)}</span>} footer={<><button className="btn-ghost" onClick={() => openPrint('po', p.id)}><Printer size={14} /> Print PO</button>{p.status === 'Pending Approval' && <button className="btn-ok" onClick={() => A.approvePO(p.id)}>Approve</button>}{p.status === 'Approved' && <button className="btn-primary" onClick={() => { onClose(); nav('ws/inward', { poId: p.id }); }}>Inward stock</button>}</>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <Card><WorkflowStepper steps={['Created', 'Approved', 'Inwarded', 'Paid']} current={p.status === 'Pending Approval' ? 1 : p.status === 'Approved' ? 2 : inw?.pending === 0 ? 4 : 3} /></Card>
        <Card title="Parts" pad={false}><table className="w-full text-[12.5px]"><tbody>{p.items.map((it: any, k: number) => <tr key={k} className="border-b border-line/60"><td className="px-4 py-2">{lookup.spare(db, it.spareId)?.name}</td><td className="px-2 text-right tnum">{it.qty}</td><td className="px-2 text-right tnum">{inr(it.rate)}</td><td className="px-4 text-right tnum font-semibold">{inr(it.qty * it.rate)}</td></tr>)}<tr><td className="px-4 py-2 font-semibold" colSpan={3}>Estimated total</td><td className="px-4 text-right tnum font-bold">{inr(p.net)}</td></tr></tbody></table></Card>
        {inw && <Card title={`Inward ${inw.no}`}><KV cols={3} items={[['Bill no.', inw.billNo], ['Bill date', fmtDate(inw.billDate)], ['Payable', inr(inw.payable)], ['Pending', inr(inw.pending)]]} /></Card>}
      </div>
    </Drawer>
  );
}

function DriverView({ id, onClose }: any) {
  const db = useDB();
  const d = db.drivers.find((x: any) => x.id === id);
  const { openRecord } = useUI.getState();
  if (!d) return null;
  const trips = db.trips.filter((t: any) => t.driverId === d.id);
  const km = sum(trips.filter((t: any) => t.completed), (t: any) => t.closingKm - t.openingKm);
  return (
    <Drawer open onClose={onClose} title={d.name} subtitle={<span className="flex gap-2 items-center"><StatusBadge s={d.blacklisted ? 'Blacklisted' : d.onLeave ? 'On leave' : 'Active'} tone={d.blacklisted ? 'bad' : d.onLeave ? 'warn' : 'ok'} /><StatusBadge s={d.type} /></span>}>
      <div className="p-4 sm:p-5 grid gap-4">
        <div className="grid grid-cols-3 gap-3"><Card><Stat label="Trips" value={trips.length} /></Card><Card><Stat label="KM driven" value={num(km)} /></Card><Card><Stat label="Rating" value={`${d.rating} / 5`} /></Card></div>
        <Card title="Profile"><KV cols={2} items={[['Mobile', d.mobile], ['Licence', d.license], ['Licence expiry', <StatusBadge s={fmtDate(d.licenseExpiry)} tone={d.licenseExpiry < ymd() ? 'bad' : daysBetween(ymd(), d.licenseExpiry) < 30 ? 'warn' : 'ok'} dot={false} />], ['Blood group', d.bloodGroup], ['Salary', inr(d.salary)], ['Aadhaar', d.aadhaar], ['PAN', d.pan], ['Address', `${d.address}, ${lookup.cityName(db, d.city)}`], ['Reference', `${d.refName} · ${d.refContact}`]]} /></Card>
        <Card title="Recent trips" pad={false}><ul className="divide-y divide-line">{trips.slice(-8).reverse().map((t: any) => <li key={t.id}><button onClick={() => openRecord('trip', t.id)} className="w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-surface2"><span className="docno">{t.name}</span><span className="flex-1 text-[12.5px]">{lookup.cityName(db, t.fromCity)} → {lookup.cityName(db, t.toCity)}</span><StatusBadge s={t.completed ? 'Completed' : 'On Trip'} /></button></li>)}</ul></Card>
      </div>
    </Drawer>
  );
}
