import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, lrStage, truckStatus, unbilledLRs, distKm, railGodownId, isTruckUnit } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Segmented, Money, Stat } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { WorkflowStepper } from '../components/overlays';
import { DispatchModal, DeliverModal, lrStepIndex } from '../components/RecordDrawer';
import { ItemsEditor } from './ops-orders';
import { fmtDate, ymd, hm, addDays, sum, inr, num, cls, daysBetween, compactINR, now } from '../lib/util';
import { Save, CheckCircle2, Printer, Mail, PackagePlus, Truck, Eye, Pencil, Trash2, Inbox, FileText, AlertTriangle, Sparkles, ListOrdered, Receipt, Clock, Route, Package } from 'lucide-react';

const blank = (db: any) => ({
  lrNo: '', orderId: '', mode: 'Road', via: 'None', toRailHead: '', sendEmail: true, sendSMS: false,
  consignorId: '', consignorAddr: '', consigneeId: '', consigneeAddr: '', sourceCity: 'jalgaon', destCity: '', fromBranchId: 'JL', toBranchId: 'JL', cityId: 'jalgaon', email: '', godownId: '',
  placeDate: ymd(), placeTime: hm(), outDate: ymd(), outTime: '18:00', invoices: '', deliveryAt: '', goodsValue: '', destinationParty: '', risk: 'Owner', deliveryType: 'Door Delivery', seal: '', priority: 'Normal',
  vehicle: 'Own', tripId: '', truckId: '', driverId: '', openingKm: '', rpNo: '', insurance: { on: false, no: '', company: '', start: ymd(), end: ymd(addDays(now(), 30)) },
  chargeableWeight: '', weight: '', packages: '', billingUnit: 'Truck', paymentMode: 'To Be Billed', freight: '', gstPayBy: 'Consignor', billHead: 'Consignor', toPayTax: false, freightReturn: false,
  transporterId: '', mkt: { freight: '', hamali: 0, advance: '', tds: '', commission: 0, net: 0, totalAdv: 0 }, remark: '', items: [] as any[],
});

export function GenerateLR() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { nav, openRecord, openPrint, toast } = useUI.getState();
  const editing = params.id ? db.lrs.find((l: any) => l.id === params.id) : null;
  const [kind, setKind] = useState<'order' | 'direct' | 'truck'>(params.orderId ? 'order' : editing && !editing.orderId ? 'direct' : 'order');
  const [f, setF] = useState<any>(() => editing ? { ...blank(db), ...structuredClone(editing), mkt: editing.mkt || blank(db).mkt } : blank(db));
  const [done, setDone] = useState<any>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const [disp, setDisp] = useState(false);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const orders = db.orders.filter((o: any) => ['Confirmed', 'In Process'].includes(o.status));
  const orderPlan = f.orderId ? ((db as any).loadPlans||[]).find((p:any)=>(p.orderIds||[]).includes(f.orderId)) : null;
  useEffect(()=>{if(orderPlan?.status==='Loading Confirmed'&&orderPlan.vehicle?.truckId&&!editing)setF((p:any)=>({...p,truckId:p.truckId||orderPlan.vehicle.truckId}));},[orderPlan?.id,orderPlan?.status]);

  const pickOrder = (id: string) => {
    const o = db.orders.find((x: any) => x.id === id);
    if (!o) return set('orderId', '');
    const c = lookup.cust(db, o.clientId);
    const toB = lookup.branch(db, o.toBranchId);
    const rail = o.toBranchId !== o.fromBranchId && toB.isRailHead && o.fromBranchId !== o.toBranchId;
    setF((p: any) => ({
      ...p, orderId: o.id, consignorId: o.clientId, consignorAddr: c.address, email: c.email, fromBranchId: o.fromBranchId, toBranchId: o.toBranchId, sourceCity: o.cityId, cityId: o.cityId,
      mode: rail ? (o.fromBranchId === 'JL' ? 'Railway' : 'Both') : 'Road', toRailHead: rail ? 'JL' : '', destCity: rail ? toB.city : p.destCity, godownId: rail ? railGodownId(db) : '',
      items: o.items.filter((i: any) => i.remaining > 0).map((i: any, k: number) => ({ goodsId: i.goodsId, name: i.name, unit: i.unit, qty: o.orderBy === 'Truck' ? Math.ceil(i.remaining / Math.max(1, o.remainingTruckQty)) : i.remaining, pending: i.remaining, damage: 0, shortage: 0 })),
      billingUnit: o.orderBy === 'Truck' ? 'Truck' : 'Cartons', remark: o.instructions,
    }));
  };
  useEffect(() => { if (params.orderId && !editing) pickOrder(params.orderId); }, [params.orderId]);

  // derived
  const weight = sum(f.items, (it: any) => (lookup.goods(db, it.goodsId)?.weight || 0) * Number(it.qty || 0));
  const pkgs = sum(f.items, (it: any) => Number(it.qty || 0));
  useEffect(() => { setF((p: any) => ({ ...p, weight: Math.round(weight), packages: pkgs, chargeableWeight: p.chargeableWeight && Number(p.chargeableWeight) > weight ? p.chargeableWeight : Math.round(weight) })); }, [weight, pkgs]);
  const cust = lookup.cust(db, f.consignorId);
  const contract = db.rateContracts.find((r: any) => r.customerId === f.consignorId && r.to >= ymd());
  const route = contract?.routes.find((r: any) => r.source === f.sourceCity && r.dest === f.destCity && (!f.items[0] || r.goodsId === f.items[0].goodsId));
  const suggested = route ? (isTruckUnit(db, route.unitId) ? route.rate : route.rate * pkgs) : f.destCity ? Math.round(Math.max(9500, distKm(f.sourceCity, f.destCity) * 48) / 500) * 500 : 0;
  const km = f.destCity ? distKm(f.sourceCity, f.destCity) : 0;
  const m = f.mkt;
  const mNet = Number(m.freight || 0) + Number(m.hamali || 0) - Number(m.advance || 0) - Number(m.tds || 0) - Number(m.commission || 0);
  const trips = db.trips.filter((t: any) => !t.completed && !t.lrId);
  const ownTrucks = db.trucks.filter((t: any) => t.type === 'Own');
  const mktTrucks = db.trucks.filter((t: any) => t.type === 'Market');

  const validate = (fin: boolean) => {
    const e: string[] = [];
    if (kind === 'order' && !f.orderId && !editing) e.push('Select an order, or switch to Instant LR');
    if (!f.consignorId) e.push('Consignor is required');
    if (!f.consigneeId) e.push('Consignee is required');
    if (!f.destCity) e.push('Destination is required');
    if (!f.items.length) e.push('Add at least one item');
    if (cust?.disallowLR) e.push(`${cust.name} is on credit hold – LR booking disallowed`);
    if (fin) {
      if (!Number(f.freight)) e.push('Total freight is required to finalise');
      if (f.mode === 'Road' && !f.truckId) e.push('Assign a truck to finalise a road LR');
      if (f.mode === 'Road' && orderPlan && orderPlan.status !== 'Loading Confirmed') e.push(`Smart Load Plan ${orderPlan.planNo} must be loading-confirmed before finalising this LR`);
      if (f.mode !== 'Road' && !f.toRailHead) e.push('Select the rail head');
      if (f.vehicle === 'Market' && f.truckId && !Number(m.freight)) e.push('Enter market truck freight');
      f.items.forEach((it: any) => { if (it.pending !== undefined && Number(it.qty) > it.pending && kind === 'order') e.push(`${it.name}: quantity exceeds pending ${it.pending}`); });
    }
    setErrs(e);
    return !e.length;
  };
  const save = (fin: boolean) => {
    if (!validate(fin)) { document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const o = db.orders.find((x: any) => x.id === f.orderId);
    const payload = {
      ...f, id: editing?.id, orderNo: o?.orderNo || '', freight: Number(f.freight), goodsValue: Number(f.goodsValue || 0), weight: Number(f.weight), packages: Number(f.packages), chargeableWeight: Number(f.chargeableWeight), openingKm: Number(f.openingKm || 0),
      source: lookup.cityName(db, f.sourceCity), destination: lookup.cityName(db, f.destCity), items: f.items.map((i: any) => ({ ...i, qty: Number(i.qty), pending: 0, damage: i.damage || 0 })),
      stdDays: route?.stdDays || Math.max(1, Math.ceil(km / 380)), destinationParty: f.destinationParty || lookup.custName(db, f.consigneeId), deliveryAt: f.deliveryAt || f.consigneeAddr,
      mkt: f.vehicle === 'Market' ? { ...m, freight: Number(m.freight || 0), advance: Number(m.advance || 0), tds: Number(m.tds || 0), hamali: Number(m.hamali || 0), commission: Number(m.commission || 0), net: mNet, totalAdv: Number(m.advance || 0) } : null,
      loadPlanId: orderPlan?.id || f.loadPlanId || '', loadPlanNo: orderPlan?.planNo || f.loadPlanNo || '', loadPlanStatus: orderPlan?.status || f.loadPlanStatus || '',
      transporterId: f.vehicle === 'Market' ? lookup.truck(db, f.truckId)?.transporterId || f.transporterId : '',
      driverId: f.vehicle === 'Own' ? f.driverId || lookup.truck(db, f.truckId)?.driverId : '',
      status: editing?.status && editing.status !== 'Draft' ? editing.status : undefined,
    };
    const rec = A.saveLR(payload, fin);
    if (fin && (f.sendEmail || f.sendSMS)) setTimeout(() => toast('LR sent to consignor', 'info', [f.sendEmail && `Email: ${f.email || cust?.email}`, f.sendSMS && 'SMS with tracking link'].filter(Boolean).join(' · ')), 400);
    setDone(rec);
  };

  if (done) {
    const l = db.lrs.find((x: any) => x.id === done.id) || done;
    const { steps, i } = lrStepIndex(db, l);
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-ok/10 text-ok grid place-items-center mb-3"><CheckCircle2 size={28} /></div>
            <div className="eyebrow">{l.isFinal ? 'LR finalised' : 'LR saved as draft'}</div>
            <div className="font-display text-[28px] font-semibold docno mt-1">{l.lrNo}</div>
            <div className="text-muted mt-1">{lookup.custName(db, l.consignorId)} · {l.source} → {l.destination} · {inr(l.freight)}</div>
            <div className="mt-5 w-full"><WorkflowStepper steps={steps} current={i} /></div>
            <div className="text-[12.5px] text-muted mt-3 max-w-md">Now visible in LR Register, Customer 360{l.mode !== 'Road' ? ', GRN at Rail Head and VP Loading' : ', Dispatch and Delivery'}, and – after POD – in Customer Billing.</div>
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              <button className="btn-ghost" onClick={() => openPrint('lr', l.id)}><Printer size={15} /> Print LR</button>
              <button className="btn-ghost" onClick={() => openPrint('freight', l.id)}><Receipt size={15} /> Freight slip</button>
              <button className="btn-ghost" onClick={() => openPrint('barcode', l.id)}>Barcode labels</button>
              <button className="btn-ghost" onClick={() => toast('LR emailed & SMS sent', 'ok', lookup.cust(db, l.consignorId)?.email)}><Mail size={15} /> Email/SMS</button>
              {l.status === 'Finalised' && l.mode === 'Road' && <button className="btn-violet" onClick={() => setDisp(true)}><Truck size={15} /> Dispatch now</button>}
              {l.mode !== 'Road' && l.isFinal && <button className="btn-violet" onClick={() => nav('ops/grn', { new: 1, lrId: l.id })}>GRN at rail head</button>}
              <button className="btn-ghost" onClick={() => openRecord('lr', l.id)}><Eye size={15} /> Open LR 360</button>
              <button className="btn-primary" onClick={() => { setDone(null); setF(blank(db)); setErrs([]); useUI.getState().set({ params: {} }); }}><PackagePlus size={15} /> New LR</button>
            </div>
          </div>
        </Card>
        {disp && <DispatchModal lr={l} onClose={() => setDisp(false)} />}
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Operations" title={editing ? `Edit ${editing.lrNo}` : 'Generate LR'} subtitle="Lorry receipt from a confirmed order, an instant (direct) booking, or a full-truck LR. Finalised LRs feed dispatch, GRN, delivery, POD and billing."
        actions={<><button className="btn-ghost" onClick={() => nav('ops/orders')}><ListOrdered size={15} /> Order list</button><button className="btn-ghost" onClick={() => nav('ops/lr')}><FileText size={15} /> LR register</button></>}>
        {!editing && <Segmented options={[{ key: 'order', label: 'From order' }, { key: 'direct', label: 'Instant LR' }, { key: 'truck', label: 'Truck LR' }]} value={kind} onChange={(v: any) => { setKind(v); if (v !== 'order') setF((p: any) => ({ ...p, orderId: '' })); }} />}
      </PageHeader>
      {errs.length > 0 && <div className="mb-4 rounded-xl border border-bad/30 bg-bad/[.06] p-3"><div className="flex items-center gap-2 font-semibold text-bad text-[13px]"><AlertTriangle size={15} /> Fix {errs.length} issue{errs.length > 1 && 's'} before saving</div><ul className="list-disc ml-6 mt-1 text-[12.5px] text-bad">{errs.map((e) => <li key={e}>{e}</li>)}</ul></div>}
      <div className="grid xl:grid-cols-[1fr_330px] gap-4 items-start">
        <div className="grid gap-4 min-w-0">
          <Card>
            <div className="grid gap-5">
              <FormSection title="Booking" cols={3}>
                <Field label="LR number" hint="Auto-generated on save; enter only for pre-printed stationery"><Input value={f.lrNo} onChange={(e) => set('lrNo', e.target.value)} placeholder={`SKT/${lookup.branch(db, f.fromBranchId)?.short}/${db.counters.lr + 1}`} disabled={!!editing} className="font-mono" /></Field>
                {kind === 'order' && <Field label="Order Id" required><Select value={f.orderId} onChange={(e) => pickOrder(e.target.value)} placeholder="Select confirmed order" options={orders.map((o: any) => ({ value: o.id, label: `${o.orderNo} · ${lookup.cust(db, o.clientId)?.short} · ${o.items.map((i: any) => `${i.remaining} ${i.unit}`).join(', ')}` }))} disabled={!!editing} /></Field>}
                <Field label="Transport mode"><Radio options={['Road', 'Railway', 'Both']} value={f.mode} onChange={(v) => setF({ ...f, mode: v, toRailHead: v === 'Road' ? '' : f.toRailHead || 'JL', godownId: v === 'Road' ? f.godownId : railGodownId(db) })} /></Field>
                <Field label="Via HO"><Radio options={['None', 'To HO', 'From HO']} value={f.via} onChange={(v) => set('via', v)} /></Field>
                {f.mode !== 'Road' && <Field label="To rail head" required><Select value={f.toRailHead} onChange={(e) => set('toRailHead', e.target.value)} options={db.branches.filter((b: any) => b.isRailHead).map((b: any) => ({ value: b.id, label: b.name }))} /></Field>}
                <Field label="Notify consignor"><div className="flex gap-4 h-9 items-center"><Check label="Email" checked={f.sendEmail} onChange={(v) => set('sendEmail', v)} /><Check label="SMS" checked={f.sendSMS} onChange={(v) => set('sendSMS', v)} /></div></Field>
              </FormSection>
              <FormSection title="Consignor & consignee" cols={2}>
                <Field label="Consignor" required><Select value={f.consignorId} onChange={(e) => { const c = lookup.cust(db, e.target.value); setF({ ...f, consignorId: e.target.value, consignorAddr: c?.address || '', email: c?.email || '' }); }} placeholder="Select consignor" options={db.customers.map((c: any) => ({ value: c.id, label: `${c.name}${c.disallowLR ? ' (credit hold)' : ''}` }))} /></Field>
                <Field label="Consignee" required><Select value={f.consigneeId} onChange={(e) => { const c = lookup.cust(db, e.target.value); setF({ ...f, consigneeId: e.target.value, consigneeAddr: c?.address || '', destCity: f.destCity || c?.city || '', deliveryAt: c?.address || '' }); }} placeholder="Select consignee" options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
                <Field label="Consignor address"><Textarea rows={2} value={f.consignorAddr} onChange={(e) => set('consignorAddr', e.target.value)} /></Field>
                <Field label="Consignee address"><Textarea rows={2} value={f.consigneeAddr} onChange={(e) => set('consigneeAddr', e.target.value)} /></Field>
              </FormSection>
              <FormSection title="Route" cols={3}>
                <Field label="Source" required><Select value={f.sourceCity} onChange={(e) => setF({ ...f, sourceCity: e.target.value, cityId: e.target.value })} options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
                <Field label="Destination" required><Select value={f.destCity} onChange={(e) => set('destCity', e.target.value)} placeholder="Select destination" options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
                <Field label="Godown"><Select value={f.godownId} onChange={(e) => set('godownId', e.target.value)} placeholder="Not via godown" options={db.godowns.map((g: any) => ({ value: g.id, label: g.name }))} /></Field>
                <Field label="From branch"><Select value={f.fromBranchId} onChange={(e) => set('fromBranchId', e.target.value)} options={db.branches.filter((b: any) => b.allowLR).map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
                <Field label="To branch"><Select value={f.toBranchId} onChange={(e) => set('toBranchId', e.target.value)} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
                <Field label="Email id"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
              </FormSection>
              <FormSection title="Schedule & documents" cols={4}>
                <Field label="LR place date"><Input type="date" value={f.placeDate} onChange={(e) => set('placeDate', e.target.value)} /></Field>
                <Field label="Place time"><Input type="time" value={f.placeTime} onChange={(e) => set('placeTime', e.target.value)} /></Field>
                <Field label="LR out date"><Input type="date" value={f.outDate} onChange={(e) => set('outDate', e.target.value)} /></Field>
                <Field label="Out time"><Input type="time" value={f.outTime} onChange={(e) => set('outTime', e.target.value)} /></Field>
                <Field label="Invoice no(s)." className="col-span-2"><Input value={f.invoices} onChange={(e) => set('invoices', e.target.value)} placeholder="INV/2401, INV/2402" /></Field>
                <Field label="Goods total value (₹)"><Input type="number" value={f.goodsValue} onChange={(e) => set('goodsValue', e.target.value)} /></Field>
                <Field label="Seal number"><Input value={f.seal} onChange={(e) => set('seal', e.target.value)} /></Field>
                <Field label="Delivery at address" className="col-span-2"><Input value={f.deliveryAt} onChange={(e) => set('deliveryAt', e.target.value)} /></Field>
                <Field label="Destination party name" className="col-span-2"><Input value={f.destinationParty} onChange={(e) => set('destinationParty', e.target.value)} /></Field>
                <Field label="Risk"><Radio options={['Owner', 'Carrier']} value={f.risk} onChange={(v) => set('risk', v)} /></Field>
                <Field label="Delivery type"><Select value={f.deliveryType} onChange={(e) => set('deliveryType', e.target.value)} options={['Door Delivery', 'Godown Delivery', 'Self Pick-up']} /></Field>
                <Field label="Priority"><Select value={f.priority} onChange={(e) => set('priority', e.target.value)} options={['Normal', 'High', 'Urgent']} /></Field>
              </FormSection>
            </div>
          </Card>

          <Card title="Item details" subtitle={f.orderId ? 'Quantities drawn from the order; pending shows what remains' : 'Add goods for this consignment'}>
            <div className="grid gap-4">
              <ItemsEditor items={f.items} onChange={(x) => set('items', x)} goods={db.goods} units={db.units} showRemaining={!!f.orderId} />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="Packages"><Input type="number" value={f.packages} onChange={(e) => set('packages', e.target.value)} /></Field>
                <Field label="Weight (kg)"><Input type="number" value={f.weight} onChange={(e) => set('weight', e.target.value)} /></Field>
                <Field label="Chargeable weight (kg)"><Input type="number" value={f.chargeableWeight} onChange={(e) => set('chargeableWeight', e.target.value)} /></Field>
                <Field label="Billing unit"><Select value={f.billingUnit} onChange={(e) => set('billingUnit', e.target.value)} options={db.units.map((u: any) => u.name)} /></Field>
              </div>
            </div>
          </Card>

          <Card title="Truck details" subtitle="Own fleet links a trip; market vehicles carry transporter freight for the payment slip">
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-4 items-end">
                <Field label="Vehicle"><Radio options={['Own', 'Market']} value={f.vehicle} onChange={(v) => setF({ ...f, vehicle: v, truckId: '', tripId: '', driverId: '' })} /></Field>
                <Check label="Insured by consignor" checked={f.insurance.on} onChange={(v) => set('insurance', { ...f.insurance, on: v })} className="h-9" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {f.vehicle === 'Own' ? <>
                  <Field label="Existing trip"><Select value={f.tripId} onChange={(e) => { const t = db.trips.find((x: any) => x.id === e.target.value); setF({ ...f, tripId: e.target.value, truckId: t?.truckId || f.truckId, driverId: t?.driverId || f.driverId, openingKm: t?.openingKm || f.openingKm }); }} placeholder="New trip on dispatch" options={trips.map((t: any) => ({ value: t.id, label: `${t.name} · ${lookup.truckNo(db, t.truckId)}` }))} /></Field>
                  <Field label="Own truck"><Select value={f.truckId} onChange={(e) => { const t = lookup.truck(db, e.target.value); setF({ ...f, truckId: e.target.value, driverId: t?.driverId || '', openingKm: t?.odometer || '' }); }} placeholder="Select truck" options={ownTrucks.map((t: any) => ({ value: t.id, label: `${t.number} · ${t.capacity} · ${truckStatus(db, t)}` }))} /></Field>
                  <Field label="Driver"><Select value={f.driverId} onChange={(e) => set('driverId', e.target.value)} placeholder="Select driver" options={db.drivers.filter((d: any) => d.type === 'Own' && !d.blacklisted).map((d: any) => ({ value: d.id, label: d.name + (d.onLeave ? ' (on leave)' : '') }))} /></Field>
                  <Field label="Opening KM"><Input type="number" value={f.openingKm} onChange={(e) => set('openingKm', e.target.value)} /></Field>
                </> : <>
                  <Field label="Market truck" className="sm:col-span-2"><Select value={f.truckId} onChange={(e) => { const t = lookup.truck(db, e.target.value); setF({ ...f, truckId: e.target.value, transporterId: t?.transporterId || '' }); }} placeholder="Select market truck" options={mktTrucks.map((t: any) => ({ value: t.id, label: `${t.number} · ${lookup.transName(db, t.transporterId)}${lookup.trans(db, t.transporterId)?.blacklisted ? ' (blacklisted)' : ''}` }))} /></Field>
                  <Field label="Transporter"><Input value={lookup.transName(db, f.transporterId)} disabled /></Field>
                </>}
                <Field label="RP number"><Input value={f.rpNo} onChange={(e) => set('rpNo', e.target.value)} /></Field>
                {f.insurance.on && <>
                  <Field label="Insurance no."><Input value={f.insurance.no} onChange={(e) => set('insurance', { ...f.insurance, no: e.target.value })} /></Field>
                  <Field label="Insurance company"><Input value={f.insurance.company} onChange={(e) => set('insurance', { ...f.insurance, company: e.target.value })} /></Field>
                  <Field label="Start date"><Input type="date" value={f.insurance.start} onChange={(e) => set('insurance', { ...f.insurance, start: e.target.value })} /></Field>
                  <Field label="End date"><Input type="date" value={f.insurance.end} onChange={(e) => set('insurance', { ...f.insurance, end: e.target.value })} /></Field>
                </>}
              </div>
            </div>
          </Card>

          <Card title="Freight" subtitle={route ? `Rate contract: ${inr(route.rate)} per ${db.units.find((u: any) => u.id === route.unitId)?.name}` : 'No rate contract match – suggested from lane distance'}>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="Payment mode"><Select value={f.paymentMode} onChange={(e) => set('paymentMode', e.target.value)} options={['To Be Billed', 'To Pay', 'Paid']} /></Field>
                <Field label="Total freight (₹)" required><div className="flex gap-1.5"><Input type="number" value={f.freight} onChange={(e) => set('freight', e.target.value)} />{suggested > 0 && <button type="button" className="btn-ghost h-9 px-2 shrink-0" title="Apply suggested freight" onClick={() => set('freight', suggested)}><Sparkles size={14} /></button>}</div></Field>
                <Field label="GST payable by"><Select value={f.gstPayBy} onChange={(e) => set('gstPayBy', e.target.value)} options={['Consignor', 'Consignee', 'Transporter']} /></Field>
                <Field label="Bill head"><Radio options={['Consignor', 'Consignee']} value={f.billHead} onChange={(v) => set('billHead', v)} /></Field>
              </div>
              <div className="flex flex-wrap gap-5"><Check label="To-pay tax" checked={f.toPayTax} onChange={(v) => set('toPayTax', v)} /><Check label="Freight return" checked={f.freightReturn} onChange={(v) => set('freightReturn', v)} /></div>
              {f.vehicle === 'Market' && (
                <div className="rounded-lg border border-line bg-surface2 p-3">
                  <div className="eyebrow mb-2">Market truck freight (lorry hire)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[['freight', 'Lorry freight'], ['hamali', 'Hamali'], ['advance', 'Advance'], ['tds', 'TDS'], ['commission', 'Commission']].map(([k, l]) => <Field key={k} label={l}><Input type="number" value={m[k]} onChange={(e) => set('mkt', { ...m, [k]: e.target.value, ...(k === 'freight' ? { tds: Math.round(Number(e.target.value) * ((lookup.trans(db, f.transporterId)?.tdsRate ?? 1) / 100)), advance: m.advance || Math.round(Number(e.target.value) * 0.7 / 100) * 100 } : {}) })} /></Field>)}
                    <Field label="Net balance freight"><Input value={mNet} disabled className="font-semibold" /></Field>
                  </div>
                  {Number(f.freight) > 0 && Number(m.freight) > 0 && <div className="text-[12px] text-muted mt-2">Margin on this LR: <b className={cls(Number(f.freight) - Number(m.freight) > 0 ? 'text-ok' : 'text-bad')}>{inr(Number(f.freight) - Number(m.freight))}</b> ({Math.round(((Number(f.freight) - Number(m.freight)) / Number(f.freight)) * 100)}%)</div>}
                </div>
              )}
              <Field label="Remark"><Textarea rows={2} value={f.remark} onChange={(e) => set('remark', e.target.value)} /></Field>
            </div>
          </Card>
        </div>

        {/* Summary rail */}
        <div className="grid gap-4 xl:sticky xl:top-2">
          <Card title="Summary">
            <div className="grid gap-3 text-[13px]">
              <div className="flex items-center gap-2"><Route size={15} className="text-violet" /><b>{lookup.cityName(db, f.sourceCity)}</b> → <b>{f.destCity ? lookup.cityName(db, f.destCity) : '—'}</b></div>
              <div className="grid grid-cols-2 gap-3"><Stat label="Distance" value={km ? `${num(km)} km` : '—'} /><Stat label="Transit" value={km ? `${route?.stdDays || Math.max(1, Math.ceil(km / 380))} days` : '—'} /><Stat label="Packages" value={num(pkgs)} /><Stat label="Weight" value={`${num(weight)} kg`} /></div>
              <div className="border-t border-line pt-3"><div className="text-[11px] text-muted font-semibold">Freight</div><div className="font-display text-[24px] font-semibold tnum">{inr(Number(f.freight || 0))}</div>{suggested > 0 && Number(f.freight) !== suggested && <button className="text-[12px] link" onClick={() => set('freight', suggested)}>Apply {route ? 'contract' : 'suggested'} {inr(suggested)}</button>}</div>
              {cust && <div className={cls('rounded-lg px-3 py-2 text-[12px]', cust.disallowLR ? 'bg-bad/10 text-bad' : 'bg-ok/10 text-ok')}>{cust.disallowLR ? 'Credit hold – booking blocked' : `Credit OK · ${cust.creditDays} days · outstanding ${compactINR(sum(db.bills.filter((b: any) => b.clientId === cust.id && !b.deleted), (b: any) => b.pending))}`}</div>}
              {f.orderId && (() => { const o = db.orders.find((x: any) => x.id === f.orderId); return o && <div className="text-[12px] text-muted">Order <b className="docno text-ink">{o.orderNo}</b>: {o.orderBy === 'Truck' ? `${o.remainingTruckQty} of ${o.truckQty} trucks remaining` : o.items.map((i: any) => `${i.remaining} ${i.unit}`).join(', ') + ' pending'}</div>; })()}
            </div>
          </Card>
          <Card title="What happens next">
            <ol className="text-[12.5px] text-muted grid gap-1.5 list-decimal ml-4">
              {f.mode === 'Road' ? <><li>Finalise → dispatch opens a trip for own trucks</li><li>Mark delivered at consignee</li><li>Record POD → LR becomes billable</li><li>Generate bill → receivable & ledger</li></> : <><li>Finalise → feeder truck to {lookup.branch(db, f.toRailHead || 'JL')?.name}</li><li>GRN at rail head creates godown stock</li><li>VP loading on the next rake to {lookup.branch(db, f.toBranchId)?.name}</li><li>DGRN → LDC → delivery → POD → bill</li></>}
            </ol>
          </Card>
        </div>
      </div>
      {/* sticky actions */}
      <div className="sticky bottom-[64px] lg:bottom-0 z-20 mt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-surface/95 backdrop-blur border-t border-line flex flex-wrap gap-2 justify-end">
        <button className="btn-ghost" onClick={() => { setF(blank(db)); setErrs([]); }}>Cancel</button>
        <button className="btn-ghost" onClick={() => save(false)}><Save size={15} /> Save draft</button>
        <button className="btn-primary" onClick={() => save(true)}><CheckCircle2 size={15} /> Finalise LR</button>
      </div>
    </div>
  );
}

export function LRRegister() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint, nav, ask, toast } = useUI.getState();
  const [disp, setDisp] = useState<any>(null);
  const [del, setDel] = useState<any>(null);
  const rows = useMemo(() => db.lrs.slice().reverse().map((l: any) => ({ ...l, stage: lrStage(db, l), consignor: lookup.custName(db, l.consignorId), consignee: lookup.custName(db, l.consigneeId), truck: lookup.truckNo(db, l.truckId), late: !l.delivery && l.isFinal && l.dueDate < ymd() })), [db]);
  const billable = unbilledLRs(db);
  return (
    <div>
      <PageHeader eyebrow="Operations" title="LR & consignments" subtitle="Every lorry receipt across road and rail with its live stage. Open a row for the 360° view: items, vehicle, documents, POD, billing and audit trail." actions={<button className="btn-primary" onClick={() => nav('ops/lr-new')}><PackagePlus size={15} /> Generate LR</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KPI label="Booked (30d)" value={db.lrs.filter((l: any) => daysBetween(l.placeDate) <= 30).length} icon={Package} />
        <KPI label="Moving" value={rows.filter((r: any) => ['In Transit', 'Rake In Transit', 'Out for Delivery'].includes(r.status)).length} icon={Truck} tone="info" />
        <KPI label="Delayed" value={rows.filter((r: any) => r.late).length} icon={Clock} tone="bad" />
        <KPI label="Awaiting POD" value={rows.filter((r: any) => r.status === 'Delivered' && !r.ack).length} icon={Inbox} tone="warn" onClick={() => nav('ops/pod')} />
        <KPI label="Ready to bill" value={billable.length} sub={compactINR(sum(billable, (l: any) => l.freight))} icon={Receipt} tone="ok" onClick={() => nav('fin/billing')} />
      </div>
      <DataTable id="lr-register" rows={rows} onRow={(r) => openRecord('lr', r.id)} initialQ={params.q} initialQuick={params.stage}
        quickFilters={[
          { key: 'draft', label: 'Drafts', fn: (r: any) => r.status === 'Draft' },
          { key: 'moving', label: 'Moving', fn: (r: any) => ['In Transit', 'Rake In Transit', 'Out for Delivery', 'Finalised'].includes(r.status) },
          { key: 'rail', label: 'At rail / branch', fn: (r: any) => ['At Rail Head', 'Loaded', 'At Branch'].includes(r.status) },
          { key: 'late', label: 'Delayed', fn: (r: any) => r.late },
          { key: 'pod', label: 'Awaiting POD', fn: (r: any) => r.status === 'Delivered' && !r.ack },
          { key: 'billed', label: 'Billed', fn: (r: any) => !!r.billId },
        ]}
        bulkActions={[{ label: 'Print LRs', icon: Printer, onClick: (rs) => { openPrint('lr', rs[0].id); toast(`${rs.length} LRs queued for printing`, 'info'); } }, { label: 'Email consignors', icon: Mail, onClick: (rs) => toast(`${rs.length} LRs emailed`, 'ok') }]}
        cols={[
          { key: 'lrNo', label: 'LR no.', render: (r) => <span className="flex items-center gap-1.5"><DocNo>{r.lrNo}</DocNo>{r.priority === 'Urgent' && <span className="w-1.5 h-1.5 rounded-full bg-bad" title="Urgent" />}</span>, mobile: 'title' },
          { key: 'placeDate', label: 'Date', render: (r) => fmtDate(r.placeDate) },
          { key: 'consignor', label: 'Consignor', filter: true, mobile: 'sub', render: (r) => <span className="block max-w-[180px] truncate">{r.consignor}</span> },
          { key: 'consignee', label: 'Consignee', hidden: true },
          { key: 'route', label: 'Route', value: (r) => `${r.source} → ${r.destination}`, mobile: 'sub' },
          { key: 'mode', label: 'Mode', filter: true },
          { key: 'truck', label: 'Truck', render: (r) => <span className="docno">{r.truck}</span> },
          { key: 'orderNo', label: 'Order', hidden: true },
          { key: 'packages', label: 'Pkgs', align: 'right' },
          { key: 'weight', label: 'Weight', align: 'right', hidden: true, render: (r) => num(r.weight) },
          { key: 'freight', label: 'Freight', align: 'right', render: (r) => inr(r.freight), mobile: 'right' },
          { key: 'paymentMode', label: 'Pay mode', filter: true, hidden: true },
          { key: 'fromBranchId', label: 'Branch', filter: true, hidden: true },
          { key: 'dueDate', label: 'Due', render: (r) => <span className={cls(r.late && 'text-bad font-semibold')}>{fmtDate(r.dueDate)}</span> },
          { key: 'priority', label: 'Priority', filter: true, hidden: true },
          { key: 'stage', label: 'Stage', filter: true, render: (r) => <StatusBadge s={r.stage} />, mobile: 'meta' },
        ]}
        rowActions={(r: any) => [
          { label: 'Open 360', icon: Eye, onClick: () => openRecord('lr', r.id) },
          { label: 'Edit LR', icon: Pencil, onClick: () => nav('ops/lr-new', { id: r.id }), hidden: !!r.billId },
          { label: 'Print LR', icon: Printer, onClick: () => openPrint('lr', r.id) },
          { label: 'Print freight slip', icon: Receipt, onClick: () => openPrint('freight', r.id) },
          { label: 'Dispatch', icon: Truck, onClick: () => setDisp(r), hidden: r.status !== 'Finalised' || r.mode !== 'Road' },
          { label: 'Mark delivered', icon: CheckCircle2, onClick: () => setDel(r), hidden: !(r.status === 'In Transit' && r.mode === 'Road') },
          { label: 'Record POD', icon: Inbox, onClick: () => nav('ops/pod', { lrId: r.id }), hidden: !(r.status === 'Delivered' && !r.ack) },
          { label: 'Delete draft', icon: Trash2, tone: 'bad', onClick: () => ask({ title: `Delete ${r.lrNo}?`, body: 'Draft LR will be removed permanently.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.remove('lrs', r.id, 'LR') }), hidden: r.status !== 'Draft' },
        ]}
      />
      {disp && <DispatchModal lr={disp} onClose={() => setDisp(null)} />}
      {del && <DeliverModal lr={del} onClose={() => setDel(null)} />}
    </div>
  );
}
