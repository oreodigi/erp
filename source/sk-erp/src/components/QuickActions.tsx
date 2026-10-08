// One place that runs the "next step" for any card: small dialogs with sensible defaults instead of full screens.
import React, { useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, byId, defLedger } from '../store/store';
import { Modal } from './overlays';
import { DispatchModal, DeliverModal } from './RecordDrawer';
import { Field, Input, Select, Segmented } from './ui';
import { ymd, hm, inr, sum, groupBy, fmtDate } from '../lib/util';
import { useT } from '../lib/useT';
import { CheckCircle2, Receipt, IndianRupee, Inbox, XCircle, Camera } from 'lucide-react';

/** Run a card's next action. ids are LR ids, order ids or bill ids depending on the action. */
export function runStep(action: string, refId: string) {
  const ui = useUI.getState();
  const db: any = (window as any).__skt?.useStore?.getState().db;
  switch (action) {
    case 'open': return ui.openRecord('lr', refId);
    case 'makelr': return ui.nav('book', { orderId: refId });
    case 'rake': { const l = db && byId(db.lrs, refId); return l?.scheduleId ? ui.openRecord('rake', l.scheduleId) : ui.nav('rail/rakes'); }
    case 'dc': { const l = db && byId(db.lrs, refId); return ui.nav('ops/dc', l?.scheduleId ? { scheduleId: l.scheduleId } : {}); }
    default: return ui.doQuick(action, [refId]);
  }
}

export function QuickActionHost() {
  const q = useUI((s) => s.quick);
  const set = useUI((s) => s.set);
  const db = useDB();
  if (!q) return null;
  const close = () => set({ quick: null });
  const lr = byId(db.lrs, q.ids[0]);
  switch (q.action) {
    case 'confirm': return <ConfirmOrderModal ids={q.ids} onClose={close} />;
    case 'dispatch': return lr ? <DispatchModal lr={lr} onClose={close} /> : null;
    case 'deliver': return lr ? <DeliverModal lr={lr} onClose={close} /> : null;
    case 'pod': return <PODModal ids={q.ids} onClose={close} />;
    case 'bill': return <BillModal ids={q.ids} onClose={close} />;
    case 'pay': return <PayModal ids={q.ids} onClose={close} />;
    default: return null;
  }
}

function ConfirmOrderModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const t = useT();
  const db = useDB();
  const o = byId(db.orders, ids[0]);
  if (!o) return null;
  const c = lookup.cust(db, o.clientId);
  return (
    <Modal open onClose={onClose} title={t('Confirm order {no}', { no: o.orderNo })} size="sm" footer={<>
      <button className="btn-ghost" onClick={() => { A.confirmOrder(o.id, { reason: 'Rejected from board' }, 'Rejected'); onClose(); }}><XCircle size={15} /> {t('Reject')}</button>
      <button className="btn-primary" onClick={() => { A.confirmOrder(o.id, {}, 'Confirmed'); onClose(); }}><CheckCircle2 size={15} /> {t('Confirm order')}</button></>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 text-[13.5px]">
        <Row k={t('Customer')} v={c?.name} /><Row k={t('Route')} v={`${lookup.branch(db, o.fromBranchId)?.name} → ${lookup.branch(db, o.toBranchId)?.name}`} />
        <Row k={t('Pickup')} v={fmtDate(o.pickupDate)} /><Row k={t('Load')} v={o.orderBy === 'Truck' ? t('{n} truck(s)', { n: o.truckQty }) : o.items.map((i: any) => `${i.qty} ${i.unit} ${i.name}`).join(', ')} />
        {c?.disallowLR && <div className="rounded-lg bg-bad/10 text-bad px-3 py-2 text-[12.5px]">{t('This customer is on credit hold. Confirm only if accounts have approved.')}</div>}
      </div>
    </Modal>
  );
}

function PODModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const t = useT();
  const db = useDB();
  const selected = ids.map((id) => byId(db.lrs, id)).filter(Boolean);
  const lrs = selected.filter((l: any) => l.status === 'Delivered' && !l.ack);
  const ineligible = selected.length - lrs.length;
  const [date, setDate] = useState(ymd());
  const [damage, setDamage] = useState(0);
  const [docket, setDocket] = useState('');
  const [photo, setPhoto] = useState('');
  const one = lrs.length === 1 ? lrs[0] : null;
  const save = () => {
    lrs.forEach((l: any) => A.receiveAck(l.id, {
      receivedDate: date, receivedTime: hm(), docket, courier: docket ? 'Courier' : 'By hand', courierCharge: 0, detentionDays: 0, detentionAmt: 0, damageAmt: 0, remark: damage ? `${damage} damaged` : 'Received OK',
      items: l.items.map((it: any, idx: number) => ({ idx, total: it.qty, received: Math.max(0, it.qty - (one && idx === 0 ? damage : 0)), damage: one && idx === 0 ? damage : 0 })),
      uploads: photo ? [{ name: photo, size: '' }] : [],
    }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={one ? t('POD received – {no}', { no: one.lrNo }) : t('POD received for {n} LRs', { n: lrs.length })} size="sm"
      footer={<><button className="btn-ghost" onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" onClick={save}><Inbox size={15} /> {t('Save POD')}</button></>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {ineligible>0 && <div className="rounded-lg bg-warn/10 text-warn px-3 py-2 text-[12.5px]">{t('{n} selected LR(s) skipped because POD is only accepted after delivery and only once.', { n: ineligible })}</div>}
        {!one && <p className="text-[13px] text-muted">{t('All goods marked as received in full. Open an LR to record damage on it.')}</p>}
        <Field label={t('POD received on')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        {one && <Field label={t('Damaged pieces (if any)')} hint={t('Total {n} pieces', { n: one.items.reduce((a: number, i: any) => a + Number(i.qty || 0), 0) })}><Input type="number" min={0} value={damage} onChange={(e) => setDamage(Number(e.target.value))} /></Field>}
        <Field label={t('Courier docket no. (optional)')}><Input value={docket} onChange={(e) => setDocket(e.target.value)} placeholder={t('e.g. DTDC 12345678')} /></Field>
        <label className="btn-ghost justify-center cursor-pointer"><Camera size={15} /> {photo ? photo : t('Add POD photo')}<input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0]?.name || '')} /></label>
      </div>
    </Modal>
  );
}

function billRows(db: any, lrs: any[]) {
  return lrs.map((l: any) => {
    const dtnWH = l.ack?.detentionAmt || 0, unload = l.delivery?.unloading || 0, damage = l.ack?.damageAmt || 0;
    const add = dtnWH + unload, sub = damage;
    return { lrId: l.id, freight: l.freight || 0, deliveryDate: l.delivery?.date || '', dtnWH, dtnDB: 0, toll: 0, unload, multi: 0, incentive: 0, adjAdd: 0, latePenalty: 0, damage, adjSub: 0, add, sub, net: (l.freight || 0) + add - sub };
  });
}

function BillModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const t = useT();
  const db = useDB();
  const lrs = ids.map((id) => byId(db.lrs, id)).filter((l: any) => l && !l.billId);
  const groups = Object.entries(groupBy(lrs, (l: any) => l.consignorId));
  const [rate, setRate] = useState('5');
  const plan = useMemo(() => groups.map(([cid, list]) => {
    const c = lookup.cust(db, cid);
    const intra = (lookup.city(db, c?.city)?.state || 'Maharashtra') === 'Maharashtra';
    const rows = billRows(db, list as any[]);
    const taxable = sum(rows, (r) => r.net);
    const tax = Math.round(taxable * Number(rate) / 100);
    return { cid, c, intra, rows, taxable, tax, net: taxable + tax };
  }), [ids.join(), rate, db]);
  const zero = plan.some((p) => p.rows.some((r) => !r.freight));
  const go = () => {
    plan.forEach((p) => A.generateBill({ billHead: 'Consignor', transportType: (p.rows.some((r) => byId(db.lrs, r.lrId)?.mode !== 'Road') ? 'Road+Rail' : 'Road'), clientId: p.cid, thirdPartyId: '', date: ymd(), rows: p.rows,
      totalFreight: sum(p.rows, (r) => r.freight), add: sum(p.rows, (r) => r.add), sub: sum(p.rows, (r) => r.sub), taxable: p.taxable, supplyState: lookup.city(db, p.c?.city)?.state || '', cgst: p.intra ? Number(rate) / 2 : 0, sgst: p.intra ? Number(rate) / 2 : 0, igst: p.intra ? 0 : Number(rate),
      tax: p.tax, net: p.net, remark: '', format: p.c?.billFormat || 'Standard Format A' }));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={plan.length > 1 ? t('Make {n} bills', { n: plan.length }) : t('Make bill – {name}', { name: plan[0]?.c?.name || '' })} size="md"
      footer={<><button className="btn-ghost" onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" disabled={!plan.length} onClick={go}><Receipt size={15} /> {plan.length > 1 ? t('Generate {n} bills', { n: plan.length }) : t('Generate bill')}</button></>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <Field label={t('GST rate')}><Segmented options={[{ key: '5', label: t('5% (GTA)') }, { key: '12', label: '12%' }, { key: '0', label: t('Exempt / RCM') }]} value={rate} onChange={(v: any) => setRate(v)} /></Field>
        {plan.map((p) => (
          <div key={p.cid} className="rounded-lg border border-line p-3 text-[13px] grid gap-1">
            <div className="font-semibold">{p.c?.name}</div>
            <div className="text-muted">{t('{n} LR · freight {amt}', { n: p.rows.length, amt: inr(sum(p.rows, (r) => r.freight)) })}{sum(p.rows, (r) => r.add) ? ' · ' + t('extra {amt}', { amt: inr(sum(p.rows, (r) => r.add)) }) : ''}{sum(p.rows, (r) => r.sub) ? ' · ' + t('less {amt}', { amt: inr(sum(p.rows, (r) => r.sub)) }) : ''}</div>
            <div className="flex justify-between"><span className="text-muted">{p.intra ? t('CGST + SGST {pct}% each', { pct: Number(rate) / 2 }) : t('IGST {pct}%', { pct: rate })}</span><span className="tnum">{inr(p.tax)}</span></div>
            <div className="flex justify-between font-semibold"><span>{t('Bill total')}</span><span className="tnum">{inr(p.net)}</span></div>
          </div>
        ))}
        {zero && <div className="rounded-lg bg-warn/10 text-warn px-3 py-2 text-[12.5px]">{t('Some LRs have ₹0 freight. Update freight first from Money → Ledger & Tally → Update LR freight, or bill them later.')}</div>}
      </div>
    </Modal>
  );
}

function PayModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const t = useT();
  const db = useDB();
  const l = byId(db.lrs, ids[0]);
  const b = l?.billId ? byId(db.bills, l.billId) : byId(db.bills, ids[0]);
  const c = b && lookup.cust(db, b.clientId);
  const tds0 = b ? Math.round(b.taxable * ((c?.tds ?? 2) / 100)) : 0;
  const [mode, setMode] = useState('Bank');
  const [amt, setAmt] = useState<number>(b ? Math.max(0, b.pending - tds0) : 0);
  const [tds, setTds] = useState<number>(Math.min(tds0, b?.pending || 0));
  const [ref, setRef] = useState('');
  if (!b) return null;
  return (
    <Modal open onClose={onClose} title={t('Payment received – bill {no}', { no: b.billNo })} size="sm"
      footer={<><button className="btn-ghost" onClick={onClose}>{t('Cancel')}</button><button className="btn-primary" disabled={!amt} onClick={() => { A.clientPayment({ billId: b.id, clientId: b.clientId, netAmt: b.net, received: Number(amt), tds: Number(tds), damage: 0, rateDiff: 0, date: ymd(), paidBy: defLedger(db, mode === 'Cash' ? 'l4' : 'l1'), mode, bank: '', chequeNo: ref, chequeDate: ymd(), remark: '' }); onClose(); }}><IndianRupee size={15} /> {t('Save payment')}</button></>}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <div className="text-[13px] text-muted">{c?.name} · {t('pending')} <b className="text-ink">{inr(b.pending)}</b></div>
        <Field label={t('Received by')}><Segmented options={[{ key: 'Bank', label: t('Bank / NEFT') }, { key: 'Cheque', label: t('Cheque') }, { key: 'Cash', label: t('Cash') }]} value={mode} onChange={(v: any) => setMode(v)} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label={t('Amount received (₹)')}><Input type="number" value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></Field><Field label={t('TDS cut by customer (₹)')}><Input type="number" value={tds} onChange={(e) => setTds(Number(e.target.value))} /></Field></div>
        {mode !== 'Cash' && <Field label={mode === 'Cheque' ? t('Cheque no.') : t('UTR / reference (optional)')}><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>}
      </div>
    </Modal>
  );
}

const Row = ({ k, v }: { k: string; v: any }) => <div className="grid grid-cols-[90px_1fr] gap-2"><span className="text-muted">{k}</span><span className="min-w-0 break-words">{v || '—'}</span></div>;
