// New Booking – the short way to make an LR: 3 questions, smart defaults from the customer's history.
import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, byId, truckStatus, distKm, railGodownId } from '../store/store';
import { useRole } from '../components/AppShell';
import { Field, Input, Select, Segmented } from '../components/ui';
import { ymd, hm, inr, cls, addDays, now, groupBy } from '../lib/util';
import { useT } from '../lib/useT';
import { Check, ChevronLeft, ChevronRight, Truck, TrainFront, Minus, Plus, Sparkles, Printer, PackagePlus, Columns3, History, Info } from 'lucide-react';

type F = {
  orderId: string; customerId: string; fromBranchId: string; sourceCity: string; destCity: string; consigneeId: string; deliveryAt: string; mode: 'Road' | 'Rail'; toBranchId: string;
  goodsId: string; qty: number; invoice: string; value: string; freight: string; payment: string; vehicle: 'Own' | 'Market' | 'Later'; truckId: string; driverId: string; advance: number;
};

const Q = ({ n, title, hint, guide }: { n: number; title: string; hint?: string; guide: boolean }) => {
  const t = useT();
  return <div className="mb-3"><div className="text-[12px] font-semibold text-violet">{t('Step {n} of 3', { n })}</div><h2 className="font-display text-[22px] font-semibold leading-tight">{title}</h2>{guide && hint && <p className="text-[13px] text-muted mt-1 flex gap-1.5"><Info size={14} className="mt-0.5 shrink-0" />{hint}</p>}</div>;
};

export function QuickBooking() {
  const t = useT();
  const db = useDB();
  const { user } = useRole();
  const params = useUI((s) => s.params);
  const guide = useUI((s) => s.guide);
  const { nav, openPrint, toast, openRecord } = useUI.getState();
  const order = params.orderId ? byId(db.orders, params.orderId) : null;
  const home = byId(db.branches, user.branchId)?.id || 'JL';
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<any>(null);
  const [f, setF] = useState<F>(() => ({
    orderId: order?.id || '', customerId: order?.clientId || params.customerId || '', fromBranchId: order?.fromBranchId || home, sourceCity: order?.cityId || '', destCity: '', consigneeId: '', deliveryAt: '',
    mode: order && order.toBranchId !== order.fromBranchId && byId(db.branches, order.toBranchId)?.isRailHead ? 'Rail' : 'Road', toBranchId: order?.toBranchId || home,
    goodsId: order?.items?.[0]?.goodsId || '', qty: order?.items?.[0]?.remaining || order?.items?.[0]?.qty || 1, invoice: '', value: '', freight: order?.billingAmt ? String(order.billingAmt) : '', payment: 'To Be Billed',
    vehicle: 'Own', truckId: '', driverId: '', advance: 10000,
  }));
  const set = (p: Partial<F>) => setF((x) => ({ ...x, ...p }));
  const cust = byId(db.customers, f.customerId);

  // customer history → smart defaults
  const hist = useMemo(() => db.lrs.filter((l: any) => l.consignorId === f.customerId).slice(-60).reverse(), [db, f.customerId]);
  const last = hist[0];
  useEffect(() => {
    if (!f.customerId) return;
    const c = byId(db.customers, f.customerId);
    if (last) set({ sourceCity: f.sourceCity || last.sourceCity, destCity: last.destCity, consigneeId: last.consigneeId, deliveryAt: last.deliveryAt, goodsId: f.goodsId || last.items[0]?.goodsId || '', payment: last.paymentMode || 'To Be Billed', mode: last.mode === 'Road' ? 'Road' : 'Rail', toBranchId: last.toBranchId || f.toBranchId });
    else set({ sourceCity: f.sourceCity || c?.city || byId(db.branches, f.fromBranchId)?.city || '', consigneeId: f.customerId, deliveryAt: c?.address || '' });
  }, [f.customerId]);

  const topGoods = useMemo(() => { const g = groupBy(hist.flatMap((l: any) => l.items), (i: any) => i.goodsId); return Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k, v.length] as [string, number]); }, [hist]);
  const goodsOpts = useMemo(() => { const used = new Map(topGoods); return [...db.goods.filter((g: any) => used.has(g.id)).sort((a: any, b: any) => (used.get(b.id) || 0) - (used.get(a.id) || 0)), ...db.goods.filter((g: any) => !used.has(g.id) && g.active !== false)].map((g: any) => ({ value: g.id, label: g.name, sub: used.has(g.id) ? t('Used {n} times by this customer', { n: used.get(g.id) }) : g.category || '' })); }, [db, topGoods, t]);
  const destOpts = useMemo(() => { const used = new Map<string, number>(); hist.forEach((l: any) => used.set(l.destCity, (used.get(l.destCity) || 0) + 1)); const pop = new Map<string, number>(); db.lrs.forEach((l: any) => pop.set(l.destCity, (pop.get(l.destCity) || 0) + 1)); return [...db.cities].sort((a: any, b: any) => (used.get(b.id) || 0) - (used.get(a.id) || 0) || (pop.get(b.id) || 0) - (pop.get(a.id) || 0)).map((c: any) => ({ value: c.id, label: c.name, sub: [c.state, used.get(c.id) ? t('{n} earlier loads', { n: used.get(c.id) }) : ''].filter(Boolean).join(' · ') })); }, [db, hist, t]);
  const custOpts = useMemo(() => { const n = new Map<string, number>(); db.lrs.forEach((l: any) => n.set(l.consignorId, (n.get(l.consignorId) || 0) + 1)); return db.customers.filter((c: any) => c.active !== false || n.has(c.id)).sort((a: any, b: any) => (n.get(b.id) || 0) - (n.get(a.id) || 0)).map((c: any) => ({ value: c.id, label: c.name, sub: [lookup.cityName(db, c.city), n.get(c.id) ? t('{n} LRs', { n: n.get(c.id) }) : ''].filter(Boolean).join(' · ') })); }, [db, t]);
  const consigneeOpts = useMemo(() => db.customers.map((c: any) => ({ value: c.id, label: c.name, sub: lookup.cityName(db, c.city) })), [db]);
  const goods = byId(db.goods, f.goodsId);

  // freight suggestion
  const sugg = useMemo(() => {
    const same = hist.find((l: any) => l.destCity === f.destCity && (l.items[0]?.goodsId === f.goodsId || !f.goodsId) && l.freight >= 500);
    if (same) return { amt: same.freight, why: t('same as last LR {no} on this route', { no: same.lrNo }) };
    const rc = db.rateContracts.find((r: any) => r.customerId === f.customerId && (!r.to || r.to >= ymd()));
    const rt = rc?.routes.find((r: any) => r.dest === f.destCity && (!r.goodsId || r.goodsId === f.goodsId));
    if (rt && rt.rate >= 100) return { amt: rt.rate, why: t('from the customer’s rate contract') };
    const km = f.sourceCity && f.destCity ? distKm(f.sourceCity, f.destCity) : 0;
    if (km > 0) return { amt: Math.round(Math.max(9500, km * 48) / 500) * 500, why: t('estimate for about {km} km', { km }) };
    return null;
  }, [hist, f.destCity, f.goodsId, f.customerId, f.sourceCity, db, t]);
  useEffect(() => { if (sugg && !f.freight) set({ freight: String(sugg.amt) }); }, [sugg?.amt]);

  const trucks = useMemo(() => db.trucks.filter((t: any) => t.isActive !== false && (f.vehicle === 'Market' ? t.type === 'Market' : t.type === 'Own')).map((t: any) => ({ t, st: truckStatus(db, t) })).sort((a: any, b: any) => (a.st === 'Available' ? 0 : 1) - (b.st === 'Available' ? 0 : 1)), [db, f.vehicle]);
  const railBranches = db.branches.filter((b: any) => b.isRailHead && b.id !== 'JL' && b.active !== false);

  const ok1 = f.customerId && f.destCity && f.consigneeId;
  const ok2 = f.goodsId && f.qty > 0 && Number(f.freight) >= 0;
  const ok3 = f.vehicle === 'Later' || !!f.truckId;

  const save = (dispatch: boolean) => {
    const c = cust, g = goods, cnee = byId(db.customers, f.consigneeId);
    const rail = f.mode === 'Rail';
    const weight = Math.round((g?.weight || 0) * f.qty);
    const lr = A.saveLR({
      lrNo: '', orderId: f.orderId, mode: rail ? (f.fromBranchId === 'JL' ? 'Railway' : 'Both') : 'Road', via: rail && f.fromBranchId !== 'JL' ? 'To HO' : 'None', toRailHead: rail ? 'JL' : '',
      consignorId: f.customerId, consignorAddr: c?.address || '', consigneeId: f.consigneeId, consigneeAddr: cnee?.address || '', sourceCity: f.sourceCity, destCity: f.destCity,
      source: lookup.cityName(db, f.sourceCity), destination: lookup.cityName(db, f.destCity), fromBranchId: f.fromBranchId, toBranchId: rail ? f.toBranchId : f.fromBranchId, cityId: f.sourceCity, email: c?.email || '',
      godownId: rail ? railGodownId(db) : '', placeDate: ymd(), placeTime: hm(), outDate: ymd(), outTime: '18:00', invoices: f.invoice, deliveryAt: f.deliveryAt || cnee?.address || '', goodsValue: Number(f.value || 0),
      destinationParty: cnee?.name || '', risk: 'Owner', deliveryType: 'Door Delivery', seal: '', priority: 'Normal', vehicle: f.vehicle === 'Market' ? 'Market' : 'Own', tripId: '', truckId: '', driverId: '',
      openingKm: 0, rpNo: '', insurance: { on: false, no: '', company: '', start: ymd(), end: ymd(addDays(now(), 30)) }, chargeableWeight: weight, weight, packages: f.qty,
      billingUnit: byId(db.units, g?.unit)?.name || 'Nos', paymentMode: f.payment, freight: Number(f.freight || 0), gstPayBy: 'Consignor', billHead: 'Consignor',
      toPayTax: false, freightReturn: false, transporterId: f.vehicle === 'Market' ? byId(db.trucks, f.truckId)?.transporterId || '' : '', mkt: null, remark: 'Booked with quick booking', isUrgent: false,
      stdDays: Math.max(1, Math.ceil((distKm(f.sourceCity, f.destCity) || 400) / 380)),
      items: [{ goodsId: f.goodsId, name: g?.name || 'Goods', unit: byId(db.units, g?.unit)?.name || 'Nos', qty: f.qty, pending: 0, damage: 0, shortage: 0 }],
    }, true);
    if (dispatch && f.vehicle !== 'Later' && f.truckId) A.dispatchLR(lr.id, { truckId: f.truckId, driverId: f.driverId, advance: f.vehicle === 'Own' ? f.advance : 0 });
    setDone(lr);
  };

  if (done) {
    const l = byId(db.lrs, done.id) || done;
    return (
      <div className="max-w-xl mx-auto text-center py-6">
        <div className="w-16 h-16 rounded-full bg-ok/15 text-ok grid place-items-center mx-auto"><Check size={34} strokeWidth={2.5} /></div>
        <h1 className="font-display text-[26px] font-semibold mt-4">{t('Booked! LR {no}', { no: l.lrNo })}</h1>
        <p className="text-muted mt-1">{lookup.custName(db, l.consignorId)} · {l.source} → {l.destination} · {inr(l.freight)}<br />{t('Status:')} <b className="text-ink">{l.status === 'In Transit' ? t('On the way with {truck}', { truck: lookup.truckNo(db, l.truckId) }) : t('Waiting for vehicle')}</b></p>
        <div className="grid sm:grid-cols-2 gap-2 mt-6">
          <button className="btn-primary h-12 text-[15px]" onClick={() => openPrint('lr', l.id)}><Printer size={17} /> {t('Print LR')}</button>
          <button className="btn-ghost h-12 text-[15px]" onClick={() => { setDone(null); setStep(2); set({ qty: 1, invoice: '', value: '', truckId: '', driverId: '', orderId: '' }); }}><PackagePlus size={17} /> {t('Book again for same customer')}</button>
          <button className="btn-ghost h-12 text-[15px]" onClick={() => nav('board')}><Columns3 size={17} /> {t('See it on the Order Board')}</button>
          <button className="btn-ghost h-12 text-[15px]" onClick={() => openRecord('lr', l.id)}>{t('Open LR details')}</button>
        </div>
      </div>
    );
  }

  const Steps = (
    <ol className="flex items-center gap-2 mb-5" aria-label={t('Progress')}>
      {['Customer & place', 'Goods & freight', 'Truck'].map((s, i) => (
        <li key={s} className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => i + 1 < step && setStep(i + 1)} className={cls('w-8 h-8 rounded-full grid place-items-center text-[13px] font-bold shrink-0', step > i + 1 ? 'bg-ok text-white' : step === i + 1 ? 'bg-brand text-white' : 'bg-surface2 text-muted')} aria-current={step === i + 1 ? 'step' : undefined}>{step > i + 1 ? <Check size={15} /> : i + 1}</button>
          <span className={cls('text-[12.5px] font-semibold truncate hidden sm:block', step === i + 1 ? 'text-ink' : 'text-muted')}>{t(s)}</span>
          {i < 2 && <span className="flex-1 h-px bg-line hidden sm:block" />}
        </li>
      ))}
    </ol>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div><div className="eyebrow">{t('Bookings')}</div><h1 className="font-display text-[24px] font-semibold">{t('New booking')}</h1></div>
        <button className="text-[12.5px] link" onClick={() => nav('ops/lr-new', f.orderId ? { orderId: f.orderId } : {})}>{t('Need every field? Open full LR form')}</button>
      </div>
      {order && <div className="rounded-lg bg-violet/10 text-[13px] px-3 py-2 mb-4">{t('Making LR for order')} <b>{order.orderNo}</b> – {t('customer and goods filled from the order.')}</div>}
      {Steps}
      <div className="card p-4 sm:p-6">
        {step === 1 && <>
          <Q n={1} title={t('Who is sending, and where to?')} hint={t('Start typing the customer’s name. We fill the rest from their last booking – just check it.')} guide={guide} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <Field label={t('Customer (sender)')} required><Select value={f.customerId} onChange={(e) => set({ customerId: e.target.value, destCity: '', consigneeId: '', goodsId: '', freight: '' })} placeholder={t('Type customer name')} options={custOpts} aria-label={t('Customer')} /></Field>
            {last && <div className="rounded-lg bg-surface2 px-3 py-2 text-[12.5px] flex items-center gap-2"><History size={14} className="text-violet shrink-0" /><span>{t('Filled from last booking')} <b>{last.lrNo}</b> ({last.source} → {last.destination}). {t('Change anything below.')}</span></div>}
            <Field label={t('Going by')}><Segmented options={[{ key: 'Road', label: t('🚚 Road') }, { key: 'Rail', label: t('🚆 Rail') }]} value={f.mode} onChange={(v: any) => set({ mode: v })} /></Field>
            <Field label={t('Destination city')} required><Select value={f.destCity} onChange={(e) => set({ destCity: e.target.value, freight: '' })} placeholder={t('Type city name')} options={destOpts} aria-label={t('Destination city')} /></Field>
            {f.mode === 'Rail' && <Field label={t('Rail destination branch')} hint={t('Goods go by rake from Jalgaon rail head to this branch')}><Segmented options={railBranches.map((b: any) => ({ key: b.id, label: b.name }))} value={f.toBranchId} onChange={(v: any) => set({ toBranchId: v })} /></Field>}
            <Field label={t('Receiver (consignee)')} required hint={guide ? t('Who will receive the goods? Often a branch or depot of the same customer.') : undefined}><Select value={f.consigneeId} onChange={(e) => set({ consigneeId: e.target.value, deliveryAt: byId(db.customers, e.target.value)?.address || '' })} placeholder={t('Type receiver name')} options={consigneeOpts} aria-label={t('Receiver')} /></Field>
          </div>
        </>}
        {step === 2 && <>
          <Q n={2} title={t('What goods, and how much?')} hint={t('Pick the goods and number of pieces. Freight is suggested from the last load on this route – change it if the rate is different.')} guide={guide} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <Field label={t('Goods')} required><Select value={f.goodsId} onChange={(e) => set({ goodsId: e.target.value })} placeholder={t('Type goods name')} options={goodsOpts} aria-label={t('Goods')} /></Field>
            <Field label={t('Number of pieces / cartons')} required>
              <div className="flex items-center gap-2">
                <button type="button" className="btn-ghost h-11 w-11 p-0 justify-center" onClick={() => set({ qty: Math.max(1, f.qty - 1) })} aria-label={t('Less')}><Minus size={16} /></button>
                <Input type="number" inputMode="numeric" className="text-center text-[18px] font-semibold h-11" value={f.qty} onChange={(e) => set({ qty: Math.max(0, Number(e.target.value)) })} />
                <button type="button" className="btn-ghost h-11 w-11 p-0 justify-center" onClick={() => set({ qty: f.qty + 1 })} aria-label={t('More')}><Plus size={16} /></button>
              </div>
            </Field>
            <Field label={t('Freight (₹)')} required hint={sugg ? t('Suggested {amt} – {why}', { amt: inr(sugg.amt), why: sugg.why }) : undefined}>
              <div className="flex gap-2"><Input type="number" inputMode="numeric" className="text-[18px] font-semibold h-11" value={f.freight} onChange={(e) => set({ freight: e.target.value })} />{sugg && Number(f.freight) !== sugg.amt && <button type="button" className="btn-ghost h-11 shrink-0" onClick={() => set({ freight: String(sugg.amt) })}><Sparkles size={15} /> {t('Use {amt}', { amt: inr(sugg.amt) })}</button>}</div>
            </Field>
            <Field label={t('Who pays the freight?')}><Segmented options={[{ key: 'To Be Billed', label: t('We bill later') }, { key: 'To Pay', label: t('Receiver pays') }, { key: 'Paid', label: t('Paid now') }]} value={f.payment} onChange={(v: any) => set({ payment: v })} /></Field>
            <details className="rounded-lg border border-line px-3 py-2"><summary className="text-[13px] font-semibold cursor-pointer">{t('Optional: invoice no. and goods value')}</summary>
              <div className="grid sm:grid-cols-2 gap-3 mt-3"><Field label={t('Customer invoice no.')}><Input value={f.invoice} onChange={(e) => set({ invoice: e.target.value })} /></Field><Field label={t('Goods value (₹)')}><Input type="number" value={f.value} onChange={(e) => set({ value: e.target.value })} /></Field></div>
            </details>
          </div>
        </>}
        {step === 3 && <>
          <Q n={3} title={t('Which truck?')} hint={t("Pick one of our trucks (free trucks are shown first), a market truck, or decide later – the LR will wait on the Order Board under 'Waiting for vehicle'.")} guide={guide} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
            <Segmented options={[{ key: 'Own', label: t('Our truck') }, { key: 'Market', label: t('Market truck') }, { key: 'Later', label: t('Decide later') }]} value={f.vehicle} onChange={(v: any) => set({ vehicle: v, truckId: '', driverId: '' })} />
            {f.vehicle !== 'Later' && <Field label={t('Truck number')} required><Select value={f.truckId} onChange={(e) => { const t = byId(db.trucks, e.target.value); set({ truckId: e.target.value, driverId: t?.driverId || '' }); }} placeholder={t('Type truck number')} options={trucks.map(({ t: tk, st }: any) => ({ value: tk.id, label: tk.number, sub: `${tk.capacity || ''}${f.vehicle === 'Market' ? ' · ' + lookup.transName(db, tk.transporterId) : ''} · ${t(st)}` }))} aria-label={t('Truck')} /></Field>}
            {f.vehicle === 'Own' && f.truckId && <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('Driver')}><Select value={f.driverId} onChange={(e) => set({ driverId: e.target.value })} placeholder={t('Type driver name')} options={db.drivers.filter((d: any) => !d.blacklisted && d.active !== false).map((d: any) => ({ value: d.id, label: d.name, sub: d.mobile }))} aria-label={t('Driver')} /></Field>
              <Field label={t('Trip advance (₹)')}><Input type="number" value={f.advance} onChange={(e) => set({ advance: Number(e.target.value) })} /></Field>
            </div>}
            <div className="rounded-xl bg-surface2 p-3.5 text-[13.5px] grid gap-1.5">
              <div className="font-semibold mb-1">{t('Check before booking')}</div>
              {[['Customer', cust?.name], ['Route', `${lookup.cityName(db, f.sourceCity)} → ${lookup.cityName(db, f.destCity)} (${t(f.mode)})`], ['Receiver', lookup.custName(db, f.consigneeId)], ['Goods', `${f.qty} × ${goods?.name || '—'}`], ['Freight', `${inr(Number(f.freight || 0))} · ${f.payment === 'To Be Billed' ? t('we bill later') : f.payment === 'To Pay' ? t('receiver pays') : t('paid now')}`], ['Truck', f.vehicle === 'Later' ? t('Decide later') : lookup.truckNo(db, f.truckId)]].map(([k, v]) => <div key={k} className="grid grid-cols-[80px_1fr] gap-2"><span className="text-muted">{t(k as string)}</span><span className="min-w-0 break-words">{v}</span></div>)}
              {cust?.disallowLR && <div className="text-bad text-[12.5px] font-semibold mt-1">{t('This customer is on credit hold – check with accounts.')}</div>}
            </div>
          </div>
        </>}
        <div className="flex items-center gap-2 mt-6">
          {step > 1 && <button className="btn-ghost h-12 px-4" onClick={() => setStep(step - 1)}><ChevronLeft size={17} /> {t('Back')}</button>}
          {step < 3 && <button className="btn-primary h-12 flex-1 text-[15px]" disabled={step === 1 ? !ok1 : !ok2} onClick={() => setStep(step + 1)}>{t('Next')} <ChevronRight size={17} /></button>}
          {step === 3 && <button className="btn-primary h-12 flex-1 text-[15px]" disabled={!ok3} onClick={() => save(true)}>{f.vehicle === 'Later' ? <><Check size={17} /> {t('Book LR')}</> : <><Truck size={17} /> {t('Book & send truck')}</>}</button>}
        </div>
      </div>
    </div>
  );
}
