import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, outstanding, unbilledLRs, defLedger, firstId } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Stat, EmptyState, Tabs, Segmented, Progress } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Modal, WorkflowStepper } from '../components/overlays';
import { ChartCard, Bars, AreaTrend } from '../components/charts';
import { fmtDate, fmtDT, ymd, hm, sum, inr, num, cls, daysBetween, groupBy, compactINR, addDays, downloadText, downloadCSV, saveMsg, now, fy } from '../lib/util';
import { Receipt, Printer, Eye, Trash2, FilePlus2, HandCoins, Wallet, Banknote, BadgeCheck, Stamp, Hammer, BookOpen, Database, Download, Send, CheckCircle2, XCircle, ArrowRight, AlertTriangle, IndianRupee, Clock, FileSpreadsheet } from 'lucide-react';

const bankOpts = (db: any) => db.ledgers.map((l: any) => ({ value: l.id, label: l.name }));
function PayFields({ f, setF, db, showTds = true, showDiscount = false }: any) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Paid date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="Amount (₹)" required><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
      {showTds && <Field label="TDS (₹)"><Input type="number" value={f.tds} onChange={(e) => setF({ ...f, tds: Number(e.target.value) })} /></Field>}
      {showDiscount && <Field label="Discount (₹)"><Input type="number" value={f.discount} onChange={(e) => setF({ ...f, discount: Number(e.target.value) })} /></Field>}
      <Field label="Paid by"><Select value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })} options={bankOpts(db)} /></Field>
      <Field label="Payment mode" className="col-span-2"><Radio options={['Cash', 'Cheque', 'Bank']} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} /></Field>
      {f.mode !== 'Cash' && <><Field label="Bank name"><Input value={f.bank || ''} onChange={(e) => setF({ ...f, bank: e.target.value })} /></Field><Field label={f.mode === 'Cheque' ? 'Cheque no.' : 'UTR / ref'}><Input value={f.ref || ''} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field></>}
      <Field label="Remark" className="col-span-2"><Input value={f.remark || ''} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
    </div>
  );
}

// ---------------- Customer billing ----------------
const ADDS = [['dtnWH', 'Detention (WH)'], ['dtnDB', 'Detention (DB)'], ['toll', 'Toll tax'], ['unload', 'Unloading / hamali'], ['multi', 'Multi load-unload'], ['incentive', 'Incentive'], ['adjAdd', 'Freight adj. add']] as const;
const SUBS = [['latePenalty', 'Late penalty'], ['damage', 'Damage'], ['adjSub', 'Freight adj. less']] as const;

export function Billing() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint, ask } = useUI.getState();
  const [tab, setTab] = useState('generate');
  const [step, setStep] = useState(0);
  const [head, setHead] = useState<'Consignor' | 'Consignee'>('Consignor');
  const [tt, setTT] = useState('All');
  const [client, setClient] = useState(params.clientId || '');
  const [third, setThird] = useState(false);
  const [thirdParty, setThirdParty] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ billNo: '', date: ymd(), remark: '', supplyState: '', cgst: 2.5, sgst: 2.5, igst: 5 });
  const [supp, setSupp] = useState<any>(null);
  const eligible = unbilledLRs(db).filter((l: any) => (head === 'Consignor' ? l.consignorId : l.consigneeId) === client || !client).filter((l: any) => tt === 'All' || (tt === 'Road' ? l.mode === 'Road' : l.mode !== 'Road'));
  const clients = [...new Set(unbilledLRs(db).map((l: any) => (head === 'Consignor' ? l.consignorId : l.consigneeId)))];
  const cust = lookup.cust(db, third ? thirdParty : client);
  const intra = cust && lookup.city(db, cust.city)?.state === 'Maharashtra';
  const proceed = () => {
    const ls = eligible.filter((l: any) => sel.has(l.id));
    if (!ls.length) return useUI.getState().toast('Select at least one LR', 'bad');
    if (!client) { setClient(head === 'Consignor' ? ls[0].consignorId : ls[0].consigneeId); }
    setRows(ls.map((l: any) => ({ lrId: l.id, freight: l.freight, deliveryDate: l.delivery?.date || '', dtnWH: l.ack?.detentionAmt || 0, dtnDB: 0, toll: 0, unload: l.delivery?.unloading || 0, multi: 0, incentive: 0, adjAdd: 0, latePenalty: l.delivery && l.delivery.date > l.dueDate && lookup.cust(db, l.consignorId)?.detentionBill ? 0 : 0, damage: l.ack?.damageAmt || 0, adjSub: 0 })));
    setMeta({ ...meta, supplyState: lookup.city(db, lookup.cust(db, client || (head === 'Consignor' ? ls[0].consignorId : ls[0].consigneeId))?.city)?.state });
    setStep(1);
  };
  const calc = rows.map((r) => { const add = sum(ADDS as any, ([k]: any) => Number(r[k] || 0)); const sub = sum(SUBS as any, ([k]: any) => Number(r[k] || 0)); return { ...r, add, sub, net: Number(r.freight) + add - sub }; });
  const taxable = sum(calc, (r) => r.net);
  const isIntra = meta.supplyState === 'Maharashtra';
  const tax = Math.round(taxable * ((isIntra ? meta.cgst + meta.sgst : meta.igst) / 100));
  const generate = () => {
    const b = A.generateBill({ billNo: meta.billNo || undefined, billHead: head, transportType: calc.some((r) => db.lrs.find((l: any) => l.id === r.lrId)?.mode !== 'Road') ? 'Road+Rail' : 'Road', clientId: third ? thirdParty : client, thirdPartyId: third ? thirdParty : '', date: meta.date, rows: calc, totalFreight: sum(calc, (r) => r.freight), add: sum(calc, (r) => r.add), sub: sum(calc, (r) => r.sub), taxable, supplyState: meta.supplyState, cgst: isIntra ? meta.cgst : 0, sgst: isIntra ? meta.sgst : 0, igst: isIntra ? 0 : meta.igst, tax, net: taxable + tax, remark: meta.remark, format: cust?.billFormat });
    setStep(2); setMeta({ ...meta, last: b.id }); setSel(new Set());
  };
  const bills = db.bills.slice().reverse();
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Customer billing" subtitle="Turn delivered, acknowledged LRs into GST freight bills in the client's bill format. Detention and unloading from POD and delivery are pulled in automatically; adjustments are editable per LR." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Ready to bill" value={unbilledLRs(db).length} sub={compactINR(sum(unbilledLRs(db), (l: any) => l.freight))} icon={Receipt} tone="ok" />
        <KPI label="Waiting for POD" value={db.lrs.filter((l: any) => l.status === 'Delivered' && !l.ack && !l.billId && l.paymentMode === 'To Be Billed' && !lookup.cust(db, l.consignorId)?.billWithoutAck).length} icon={Clock} tone="warn" />
        <KPI label="Billed this month" value={compactINR(sum(db.bills.filter((b: any) => !b.deleted && b.date.slice(0, 7) === ymd().slice(0, 7)), (b: any) => b.net))} icon={IndianRupee} />
        <KPI label="Bills issued" value={db.bills.filter((b: any) => !b.deleted).length} icon={FileSpreadsheet} />
      </div>
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'generate', label: 'LR to bill' }, { key: 'register', label: 'Bill register', count: bills.filter((b: any) => !b.deleted).length }]} />
      {tab === 'generate' && <>
        <Card className="mb-4"><WorkflowStepper steps={['Select LRs', 'Adjust & tax', 'Bill generated']} current={step} /></Card>
        {step === 0 && <Card>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Bill head"><Radio options={['Consignor', 'Consignee']} value={head} onChange={(v: any) => { setHead(v); setClient(''); setSel(new Set()); }} /></Field>
              <Field label="Transportation type"><Radio options={['All', 'Road', 'Road+Rail']} value={tt} onChange={setTT} /></Field>
              <Field label="Client"><Select value={client} onChange={(e) => { setClient(e.target.value); setSel(new Set()); }} placeholder="All clients" options={clients.map((c: any) => ({ value: c, label: lookup.custName(db, c) }))} /></Field>
              <div className="grid gap-1.5"><Check label="Bill to third party" checked={third} onChange={setThird} />{third && <Select value={thirdParty} onChange={(e) => setThirdParty(e.target.value)} placeholder="Third party" options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} />}</div>
            </div>
            <DataTable id="bill-eligible" rows={eligible} selectable bulkActions={[{ label: 'Select for bill', onClick: (rs) => setSel(new Set(rs.map((r: any) => r.id))) }]} cols={[{ key: 'pick', label: '', sortable: false, render: (r) => <input type="checkbox" aria-label="Include" checked={sel.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => { const n = new Set(sel); n.has(r.id) ? n.delete(r.id) : n.add(r.id); setSel(n); }} className="accent-[rgb(var(--violet))]" /> }, { key: 'lrNo', label: 'LR no.', render: (r) => <DocNo>{r.lrNo}</DocNo>, mobile: 'title' }, { key: 'from', label: 'From branch', value: (r) => r.fromBranchId }, { key: 'c', label: 'Consignor', value: (r) => lookup.cust(db, r.consignorId)?.short, mobile: 'sub' }, { key: 'ce', label: 'Consignee', value: (r) => lookup.cust(db, r.consigneeId)?.short }, { key: 'placeDate', label: 'LR date', render: (r) => fmtDate(r.placeDate) }, { key: 'dd', label: 'Del. date', render: (r) => fmtDate(r.delivery?.date) }, { key: 'pod', label: 'POD', render: (r) => <StatusBadge s={r.ack ? 'Received' : 'Without ack'} tone={r.ack ? 'ok' : 'warn'} dot={false} /> }, { key: 'freight', label: 'Freight', align: 'right', render: (r) => inr(r.freight), mobile: 'right' }]} />
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[13px] text-muted">{sel.size} LR selected · {inr(sum(eligible.filter((l: any) => sel.has(l.id)), (l: any) => l.freight))}</span><button className="btn-primary" onClick={proceed}>Proceed to next <ArrowRight size={15} /></button></div>
          </div>
        </Card>}
        {step === 1 && <div className="grid gap-4">
          <Card title={`Bill to ${lookup.custName(db, third ? thirdParty : client)}`} subtitle={`Bill format: ${cust?.billFormat} · credit ${cust?.creditDays} days`} pad={false}>
            <div className="overflow-x-auto"><table className="w-full text-[12.25px] min-w-[1180px]"><thead className="bg-surface2 sticky top-0"><tr className="text-[10.5px] text-muted uppercase"><th className="text-left px-3 py-2">LR no.</th><th className="text-left px-1">Consignee</th><th className="text-right px-1">Freight</th><th className="px-1">Del. date</th>{[...ADDS, ...SUBS].map(([, l]) => <th key={l} className="px-1 font-semibold">{l}</th>)}<th className="text-right px-1">Add</th><th className="text-right px-1">Less</th><th className="text-right px-3">Net</th></tr></thead>
              <tbody>{calc.map((r, i) => { const l = db.lrs.find((x: any) => x.id === r.lrId); return <tr key={r.lrId} className="border-t border-line"><td className="px-3 py-1.5 docno">{l?.lrNo}</td><td className="px-1 truncate max-w-[110px]">{lookup.cust(db, l?.consigneeId)?.short}</td><td className="px-1 text-right tnum">{num(r.freight)}</td><td className="px-1"><input type="date" className="input h-7 px-1 w-[124px] text-[12px]" aria-label="Delivery date" value={r.deliveryDate} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, deliveryDate: e.target.value } : x)))} /></td>{[...ADDS, ...SUBS].map(([k]) => <td key={k} className="px-1"><input type="number" aria-label={k} className="input h-7 px-1.5 w-[78px] text-right text-[12px]" value={r[k]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: Number(e.target.value) } : x)))} /></td>)}<td className="px-1 text-right tnum text-ok">{num(r.add)}</td><td className="px-1 text-right tnum text-bad">{num(r.sub)}</td><td className="px-3 text-right tnum font-semibold">{num(r.net)}</td></tr>; })}</tbody></table></div>
          </Card>
          <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
            <Card title="Bill details"><div className="grid sm:grid-cols-2 gap-3">
              <Field label="Bill number" hint="Leave blank to auto-number"><Input value={meta.billNo} placeholder={`SKT/B/${db.counters.bill + 1}/${fy()}`} onChange={(e) => setMeta({ ...meta, billNo: e.target.value })} className="font-mono" /></Field>
              <Field label="Bill date"><Input type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} /></Field>
              <Field label="Place of supply (state)"><Select value={meta.supplyState} onChange={(e) => setMeta({ ...meta, supplyState: e.target.value })} options={db.states.map((s: any) => s.name)} /></Field>
              {isIntra ? <div className="grid grid-cols-2 gap-2"><Field label="CGST %"><Select value={String(meta.cgst)} onChange={(e) => setMeta({ ...meta, cgst: Number(e.target.value) })} options={['0', '2.5', '6']} /></Field><Field label="SGST %"><Select value={String(meta.sgst)} onChange={(e) => setMeta({ ...meta, sgst: Number(e.target.value) })} options={['0', '2.5', '6']} /></Field></div> : <Field label="IGST %"><Select value={String(meta.igst)} onChange={(e) => setMeta({ ...meta, igst: Number(e.target.value) })} options={['0', '5', '12']} /></Field>}
              <Field label="Remark" className="sm:col-span-2"><Textarea rows={2} value={meta.remark} onChange={(e) => setMeta({ ...meta, remark: e.target.value })} /></Field>
            </div></Card>
            <Card title="Totals"><div className="grid gap-2 text-[13px]">
              {[['Total freight', sum(calc, (r) => r.freight)], ['Total add', sum(calc, (r) => r.add)], ['Total less', -sum(calc, (r) => r.sub)], ['Taxable value', taxable], [isIntra ? `CGST ${meta.cgst}% + SGST ${meta.sgst}%` : `IGST ${meta.igst}%`, tax]].map(([k, v]: any) => <div key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="tnum">{inr(v)}</span></div>)}
              <div className="flex justify-between border-t border-line pt-2 mt-1"><span className="font-semibold">Total bill</span><span className="font-display text-[20px] font-semibold tnum">{inr(taxable + tax)}</span></div>
              <div className="flex gap-2 mt-2"><button className="btn-ghost flex-1" onClick={() => setStep(0)}>Back to LR list</button><button className="btn-primary flex-1" onClick={generate}><Receipt size={15} /> Generate bill</button></div>
            </div></Card>
          </div>
        </div>}
        {step === 2 && meta.last && (() => { const b = db.bills.find((x: any) => x.id === meta.last); return <Card><div className="flex flex-col items-center text-center py-6"><div className="w-14 h-14 rounded-2xl bg-ok/10 text-ok grid place-items-center mb-3"><CheckCircle2 size={28} /></div><div className="docno text-[24px] font-semibold">{b.billNo}</div><div className="text-muted mt-1">{lookup.custName(db, b.clientId)} · {inr(b.net)} · {b.rows.length} LRs</div><div className="text-[12.5px] text-muted mt-2">Receivable created · sales voucher posted to ledger · queued for Tally</div><div className="flex flex-wrap gap-2 mt-5 justify-center"><button className="btn-ghost" onClick={() => openPrint('bill', b.id)}><Printer size={15} /> Print bill</button><button className="btn-ghost" onClick={() => openRecord('bill', b.id)}><Eye size={15} /> Open bill</button><button className="btn-ghost" onClick={() => useUI.getState().nav('fin/client-payments', { billId: b.id })}><HandCoins size={15} /> Record payment</button><button className="btn-primary" onClick={() => { setStep(0); setRows([]); }}>Next bill</button></div></div></Card>; })()}
      </>}
      {tab === 'register' && <DataTable id="bills" rows={bills} onRow={(r) => openRecord('bill', r.id)} quickFilters={[{ key: 'p', label: 'Pending', fn: (r: any) => !r.deleted && r.pending > 0 }, { key: 'o', label: 'Overdue', fn: (r: any) => !r.deleted && r.pending > 0 && daysBetween(r.date) > (lookup.cust(db, r.clientId)?.creditDays || 30) }, { key: 'd', label: 'Deleted', fn: (r: any) => r.deleted }]} cols={[
        { key: 'billNo', label: 'Bill no.', render: (r) => <DocNo>{r.billNo}</DocNo>, mobile: 'title' }, { key: 'transportType', label: 'Type', filter: true }, { key: 'c', label: 'Client', value: (r) => lookup.custName(db, r.clientId), filter: true, mobile: 'sub' },
        { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'lrs', label: 'LRs', align: 'right', value: (r) => r.rows.length }, { key: 'net', label: 'Total amt.', align: 'right', render: (r) => inr(r.net), mobile: 'right' }, { key: 'pending', label: 'Pending', align: 'right', render: (r) => inr(r.pending) },
        { key: 'st', label: 'Status', value: (r) => (r.deleted ? 'Deleted' : r.pending <= 0 ? 'Paid' : daysBetween(r.date) > (lookup.cust(db, r.clientId)?.creditDays || 30) ? 'Overdue' : 'Due'), render: (r) => <StatusBadge s={r.deleted ? 'Deleted' : r.pending <= 0 ? 'Paid' : daysBetween(r.date) > (lookup.cust(db, r.clientId)?.creditDays || 30) ? 'Overdue' : 'Due'} tone={r.deleted ? 'bad' : undefined} />, filter: true, mobile: 'meta' },
      ]} rowActions={(r: any) => [{ label: 'Print bill', icon: Printer, onClick: () => openPrint('bill', r.id) }, { label: 'Supplementary bill', icon: FilePlus2, onClick: () => setSupp(r), hidden: r.deleted }, { label: 'Print supplementary', icon: Printer, onClick: () => openPrint('supplementary', r.id), hidden: !r.supplementary?.length }]} />}
      {supp && <SupplementaryModal bill={supp} onClose={() => setSupp(null)} />}
    </div>
  );
}
function SupplementaryModal({ bill, onClose }: any) {
  const [f, setF] = useState({ reason: 'Detention charges – 2 days at consignee', amount: 3000 });
  return <Modal open onClose={onClose} title={`Supplementary bill · ${bill.billNo}`} size="sm" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { A.addSupplementary(bill.id, f); onClose(); }}>Add supplementary</button></>}><div className="grid gap-3"><Field label="Reason"><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field><Field label="Amount (₹)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field><p className="text-[12px] text-muted">Formats A/B (legacy SupplementaryA/BBill) differ only in layout; the amount is added to the bill's receivable.</p></div></Modal>;
}

// ---------------- Receivables ----------------
export function Receivables() {
  const db = useDB();
  const { openRecord, nav } = useUI.getState();
  const [asOf, setAsOf] = useState(ymd());
  const open = db.bills.filter((b: any) => !b.deleted && b.pending > 0 && b.date <= asOf);
  const by = Object.entries(groupBy(open, (b: any) => b.clientId)).map(([k, v]) => { const c = lookup.cust(db, k); const bucket = (a: number, z: number) => sum(v.filter((b: any) => daysBetween(b.date, asOf) >= a && daysBetween(b.date, asOf) <= z), (b: any) => b.pending); return { id: k, name: c?.name, credit: c?.creditDays, limit: c?.creditLimit, total: sum(v, (b: any) => b.pending), b0: bucket(0, 30), b1: bucket(31, 60), b2: bucket(61, 90), b3: bucket(91, 9999), overdue: sum(v.filter((b: any) => daysBetween(b.date, asOf) > (c?.creditDays || 30)), (b: any) => b.pending), bills: v.length, hold: c?.disallowLR }; }).sort((a, b) => b.total - a.total);
  const trend = Array.from({ length: 10 }, (_, i) => { const d = ymd(addDays(now(), -7 * (9 - i))); const billed = sum(db.bills.filter((b: any) => !b.deleted && b.date <= d), (b: any) => b.net); const recd = sum(db.clientPayments.filter((p: any) => p.date <= d), (p: any) => p.received + p.tds); return { x: fmtDate(d).slice(0, 6), Outstanding: billed - recd }; });
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Receivables" subtitle="Client outstanding with ageing against credit days. Clients beyond limits can be put on credit hold, which blocks new orders and LRs." actions={<Field label="As on date"><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Total outstanding" value={compactINR(sum(by, (r) => r.total))} icon={Wallet} tone="brand" />
        <KPI label="Overdue" value={compactINR(sum(by, (r) => r.overdue))} icon={AlertTriangle} tone="bad" />
        <KPI label="90+ days" value={compactINR(sum(by, (r) => r.b3))} tone="bad" />
        <KPI label="Collected (30d)" value={compactINR(sum(db.clientPayments.filter((p: any) => daysBetween(p.date) <= 30), (p: any) => p.received))} icon={HandCoins} tone="ok" onClick={() => nav('fin/client-payments')} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Ageing" subtitle="Outstanding by days since bill"><Bars data={[{ x: '0–30', v: sum(by, (r) => r.b0) }, { x: '31–60', v: sum(by, (r) => r.b1) }, { x: '61–90', v: sum(by, (r) => r.b2) }, { x: '90+', v: sum(by, (r) => r.b3) }]} keys={[{ key: 'v', label: 'Outstanding', color: 'var(--chart-2)' }]} money /></ChartCard>
        <ChartCard title="Outstanding trend" subtitle="Billed minus received, weekly"><AreaTrend data={trend} keys={[{ key: 'Outstanding', label: 'Outstanding', color: 'var(--chart-2)' }]} money /></ChartCard>
      </div>
      <DataTable id="receivables" rows={by} onRow={(r) => openRecord('customer', r.id)} expand={(r: any) => <div className="grid gap-1">{open.filter((b: any) => b.clientId === r.id).map((b: any) => <button key={b.id} onClick={() => openRecord('bill', b.id)} className="flex gap-3 items-center text-[12.5px] py-1 hover:text-violet text-left"><span className="docno w-40">{b.billNo}</span><span className="text-muted w-24">{fmtDate(b.date)}</span><span className="tnum w-24 text-right">{inr(b.pending)}</span><span className="text-muted">{daysBetween(b.date, asOf)} days</span></button>)}</div>} cols={[
        { key: 'name', label: 'Client', mobile: 'title', render: (r) => <span className="flex items-center gap-2">{r.name}{r.hold && <StatusBadge s="Credit hold" tone="bad" dot={false} />}</span> }, { key: 'credit', label: 'Credit days', align: 'right' }, { key: 'bills', label: 'Bills', align: 'right' },
        { key: 'b0', label: '0–30', align: 'right', render: (r) => inr(r.b0) }, { key: 'b1', label: '31–60', align: 'right', render: (r) => inr(r.b1) }, { key: 'b2', label: '61–90', align: 'right', render: (r) => inr(r.b2) }, { key: 'b3', label: '90+', align: 'right', render: (r) => <span className={cls(r.b3 && 'text-bad font-semibold')}>{inr(r.b3)}</span> },
        { key: 'overdue', label: 'Overdue', align: 'right', render: (r) => inr(r.overdue), mobile: 'sub' }, { key: 'total', label: 'Total', align: 'right', render: (r) => <b className="tnum">{inr(r.total)}</b>, mobile: 'right' },
        { key: 'util', label: 'Limit used', render: (r) => <div className="w-20"><Progress value={(r.total / r.limit) * 100} tone={r.total / r.limit > 0.8 ? 'bad' : 'violet'} /></div> },
      ]} rowActions={(r: any) => [{ label: 'Record payment', icon: HandCoins, onClick: () => nav('fin/client-payments', { clientId: r.id }) }, { label: r.hold ? 'Lift credit hold' : 'Put on credit hold', icon: AlertTriangle, onClick: () => A.patch('customers', r.id, { disallowLR: !r.hold }) }]} />
    </div>
  );
}

// ---------------- Client payments ----------------
export function ClientPayments() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, ask } = useUI.getState();
  const pre = params.billId ? db.bills.find((b: any) => b.id === params.billId) : null;
  const [client, setClient] = useState(pre?.clientId || params.clientId || '');
  const [billId, setBillId] = useState(params.billId || '');
  const bills = db.bills.filter((b: any) => !b.deleted && b.pending > 0 && (!client || b.clientId === client));
  const b = db.bills.find((x: any) => x.id === billId);
  const c = b && lookup.cust(db, b.clientId);
  const [f, setF] = useState<any>({ received: '', tds: 0, damage: 0, rateDiff: 0, date: ymd(), paidBy: defLedger(db, 'l1'), mode: 'Bank', bank: '', chequeNo: '', chequeDate: ymd(), remark: '' });
  useEffect(() => { if (b) { const tds = Math.round(b.taxable * ((c?.tds || 2) / 100)); setF((p: any) => ({ ...p, tds, received: Math.max(0, b.pending - tds) })); } }, [billId]);
  const settle = Number(f.received || 0) + Number(f.tds || 0) + Number(f.damage || 0) + Number(f.rateDiff || 0);
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Client payment receivable" subtitle="Record receipts against bills with TDS, damage deductions and rate differences. Each receipt posts a receipt voucher and reduces the outstanding." />
      <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
        <Card title="Pending bills" pad={false}>
          <div className="p-3 border-b border-line"><Field label="Client"><Select value={client} onChange={(e) => { setClient(e.target.value); setBillId(''); }} placeholder="All clients" options={[...new Set(db.bills.filter((x: any) => !x.deleted && x.pending > 0).map((x: any) => x.clientId))].map((x: any) => ({ value: x, label: lookup.custName(db, x) }))} /></Field></div>
          <ul className="divide-y divide-line max-h-[460px] overflow-auto">{bills.map((x: any) => <li key={x.id}><button onClick={() => setBillId(x.id)} className={cls('w-full text-left px-4 py-2.5 flex gap-3 items-center hover:bg-surface2', billId === x.id && 'bg-violet/[.06] shadow-[inset_3px_0_0_rgb(var(--brand))]')}><span className="flex-1 min-w-0"><span className="block docno">{x.billNo}</span><span className="block text-[12px] text-muted truncate">{lookup.custName(db, x.clientId)} · {fmtDate(x.date)} · {daysBetween(x.date)}d</span></span><span className="text-right"><span className="block tnum font-semibold text-[13px]">{inr(x.pending)}</span><span className="block text-[11px] text-muted tnum">of {inr(x.net)}</span></span></button></li>)}{!bills.length && <li><EmptyState icon={CheckCircle2} title="No pending bills" /></li>}</ul>
        </Card>
        <Card title={b ? <span className="docno">{b.billNo}</span> : 'Confirm payment'} subtitle={b ? `${c?.name} · pending ${inr(b.pending)}` : 'Select a bill'}>
          {b ? <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Received amount" required><Input type="number" value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} /></Field>
              <Field label={`TDS (${c?.tds}%)`}><Input type="number" value={f.tds} onChange={(e) => setF({ ...f, tds: e.target.value })} /></Field>
              <Field label="Damage & deduction"><Input type="number" value={f.damage} onChange={(e) => setF({ ...f, damage: e.target.value })} /></Field>
              <Field label="Rate difference"><Input type="number" value={f.rateDiff} onChange={(e) => setF({ ...f, rateDiff: e.target.value })} /></Field>
              <Field label="Received date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="Payment by (ledger)"><Select value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })} options={bankOpts(db)} /></Field>
              <Field label="Payment mode" className="col-span-2"><Radio options={['Cash', 'Cheque', 'Bank']} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} /></Field>
              {f.mode !== 'Cash' && <><Field label="Bank name"><Input value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} /></Field><Field label={f.mode === 'Cheque' ? 'Cheque / acc. no.' : 'UTR no.'}><Input value={f.chequeNo} onChange={(e) => setF({ ...f, chequeNo: e.target.value })} /></Field></>}
              <Field label="Remark" className="col-span-2"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
            </div>
            <div className={cls('rounded-lg px-3 py-2 text-[12.5px]', settle > b.pending ? 'bg-bad/10 text-bad' : 'bg-surface2')}>Settles {inr(settle)} · balance after receipt <b className="tnum">{inr(Math.max(0, b.pending - settle))}</b>{settle > b.pending && ' – exceeds pending'}</div>
            <div className="flex gap-2"><button className="btn-ghost flex-1" onClick={() => setBillId('')}>Back to bill list</button><button className="btn-primary flex-1" disabled={!Number(f.received) || settle > b.pending + 1} onClick={() => { A.clientPayment({ billId: b.id, clientId: b.clientId, netAmt: b.net, received: Number(f.received), tds: Number(f.tds), damage: Number(f.damage), rateDiff: Number(f.rateDiff), date: f.date, paidBy: f.paidBy, mode: f.mode, bank: f.bank, chequeNo: f.chequeNo, chequeDate: f.chequeDate, remark: f.remark }); setBillId(''); }}><CheckCircle2 size={15} /> Confirm payment</button></div>
          </div> : <EmptyState icon={HandCoins} title="Pick a bill" body="Choose a pending bill on the left to record a receipt." />}
        </Card>
      </div>
      <div className="mt-6"><DataTable id="receipts" title="Receipts" rows={db.clientPayments.slice().reverse()} onRow={(r) => openRecord('bill', r.billId)} cols={[{ key: 'voucherNo', label: 'Voucher', render: (r) => <DocNo>{r.voucherNo}</DocNo>, mobile: 'title' }, { key: 'bill', label: 'Bill no.', value: (r) => db.bills.find((b: any) => b.id === r.billId)?.billNo }, { key: 'c', label: 'Client', value: (r) => lookup.custName(db, r.clientId), filter: true, mobile: 'sub' }, { key: 'date', label: 'Received date', render: (r) => fmtDate(r.date) }, { key: 'netAmt', label: 'Net amt.', align: 'right', render: (r) => inr(r.netAmt) }, { key: 'received', label: 'Received amt.', align: 'right', render: (r) => inr(r.received), mobile: 'right' }, { key: 'tds', label: 'TDS amt.', align: 'right', render: (r) => inr(r.tds) }, { key: 'damage', label: 'Damage amt.', align: 'right', render: (r) => inr(r.damage) }, { key: 'rateDiff', label: 'Rate diff', align: 'right', render: (r) => inr(r.rateDiff) }, { key: 'mode', label: 'Mode', filter: true }]} rowActions={(r: any) => [{ label: 'Delete receipt', icon: Trash2, tone: 'bad', onClick: () => ask({ title: `Delete ${r.voucherNo}?`, body: 'The bill outstanding is restored and the voucher is removed from the ledger.', tone: 'bad', confirmLabel: 'Delete', onConfirm: () => A.deleteReceipt(r.voucherNo) }) }]} /></div>
    </div>
  );
}

// ---------------- Transporter payment slip ----------------
export function TPSlips() {
  const db = useDB();
  const { openPrint, openRecord } = useUI.getState();
  const eligible = db.lrs.filter((l: any) => l.vehicle === 'Market' && l.mkt && !l.tpSlipId && l.status === 'Delivered');
  const transporters = [...new Set(eligible.map((l: any) => l.transporterId))];
  const [tid, setTid] = useState(transporters[0] || '');
  const [rows, setRows] = useState<any[]>([]);
  const [date, setDate] = useState(ymd());
  useEffect(() => { setRows(eligible.filter((l: any) => l.transporterId === tid).map((l: any) => ({ lrId: l.id, pick: true, freight: l.mkt.freight, detention: l.ack?.detentionAmt || 0, advance: l.mkt.advance, hamali: l.mkt.hamali, commission: l.mkt.commission, tds: l.mkt.tds, damage: l.ack?.damageAmt || 0, stationery: 50 }))); }, [tid, db.lrs.length]);
  const calc = rows.map((r) => ({ ...r, balance: Number(r.freight) + Number(r.detention) + Number(r.hamali) - Number(r.advance) - Number(r.commission) - Number(r.tds) - Number(r.damage) - Number(r.stationery) }));
  const picked = calc.filter((r) => r.pick);
  const T = (k: string) => sum(picked, (r: any) => Number(r[k]));
  const tr = lookup.trans(db, tid);
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Transporter payment slip" subtitle="Settle market-truck LRs: freight plus detention and hamali, less advance, commission, TDS, damage and stationery. Slips go for approval before payment." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="LRs ready for slip" value={eligible.length} icon={Banknote} />
        <KPI label="Slips awaiting approval" value={db.tpSlips.filter((s: any) => s.status === 'Pending').length} tone="warn" onClick={() => useUI.getState().nav('fin/tp-approval')} />
        <KPI label="Approved, unpaid" value={compactINR(sum(db.tpSlips.filter((s: any) => s.status === 'Approved'), (s: any) => s.pending))} tone="info" />
        <KPI label="Paid (30d)" value={compactINR(sum(db.tpSlips.flatMap((s: any) => s.payments).filter((p: any) => daysBetween(p.date) <= 30), (p: any) => p.amount))} tone="ok" />
      </div>
      <Card>
        <div className="grid gap-4">
          <div className="grid sm:grid-cols-3 gap-3"><Field label="Transporter" required><Select value={tid} onChange={(e) => setTid(e.target.value)} placeholder="Select" options={transporters.map((t: any) => ({ value: t, label: `${lookup.transName(db, t)} (${eligible.filter((l: any) => l.transporterId === t).length})` }))} /></Field><Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>{tr && <div className="text-[12px] text-muted self-end pb-2">PAN {tr.pan} · TDS {tr.tdsRate}% · {tr.declaration ? 'declaration on file' : <span className="text-warn">no PAN declaration</span>}</div>}</div>
          {calc.length ? <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.5px] min-w-[1000px]"><thead className="bg-surface2"><tr className="text-[10.5px] text-muted uppercase"><th className="w-8 px-2" /><th className="text-left px-2 py-2">LR no. / truck</th>{['Freight', 'Detention', 'Advance', 'Hamali', 'Commission', 'TDS', 'Damage', 'Stationery'].map((h) => <th key={h} className="px-1">{h}</th>)}<th className="text-right px-3">Bal. freight</th></tr></thead>
            <tbody>{calc.map((r, i) => { const l = db.lrs.find((x: any) => x.id === r.lrId); return <tr key={r.lrId} className={cls('border-t border-line', !r.pick && 'opacity-50')}><td className="px-2"><input type="checkbox" aria-label="Include" checked={r.pick} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, pick: e.target.checked } : x)))} /></td><td className="px-2 py-1.5"><button className="docno link" onClick={() => openRecord('lr', l.id)}>{l?.lrNo}</button><div className="text-[11px] text-muted">{lookup.truckNo(db, l?.truckId)}</div></td>{['freight', 'detention', 'advance', 'hamali', 'commission', 'tds', 'damage', 'stationery'].map((k) => <td key={k} className="px-1"><input type="number" aria-label={k} className="input h-7 px-1.5 w-[84px] text-right text-[12px]" value={r[k]} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: Number(e.target.value) } : x)))} /></td>)}<td className="px-3 text-right tnum font-semibold">{num(r.balance)}</td></tr>; })}</tbody>
            <tfoot className="bg-surface2 font-semibold"><tr className="border-t border-line"><td /><td className="px-2 py-2">Totals</td>{['freight', 'detention', 'advance', 'hamali', 'commission', 'tds', 'damage', 'stationery'].map((k) => <td key={k} className="px-2 text-right tnum">{num(T(k))}</td>)}<td className="px-3 text-right tnum">{inr(sum(picked, (r: any) => r.balance))}</td></tr></tfoot></table></div> : <EmptyState icon={Banknote} title="No LRs pending" body="Delivered market-truck LRs without a payment slip appear here." />}
          <div className="flex justify-end"><button className="btn-primary" disabled={!picked.length} onClick={() => { const s = A.createTPSlip({ transporterId: tid, date, rows: picked.map(({ pick, ...r }) => r), totals: { freight: T('freight'), detention: T('detention'), advance: T('advance'), hamali: T('hamali'), commission: T('commission'), tds: T('tds'), damage: T('damage'), stationery: T('stationery') }, payable: sum(picked, (r: any) => r.balance) }); openPrint('payslip', s.id); }}>Generate payment slip <ArrowRight size={15} /></button></div>
        </div>
      </Card>
      <div className="mt-6"><DataTable id="tps" rows={db.tpSlips.slice().reverse()} cols={[{ key: 'slipNo', label: 'Payment slip no.', render: (r) => <DocNo>{r.slipNo}</DocNo>, mobile: 'title' }, { key: 't', label: 'Transporter', value: (r) => lookup.transName(db, r.transporterId), filter: true, mobile: 'sub' }, { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'lrs', label: 'LRs', align: 'right', value: (r) => r.rows.length }, { key: 'payable', label: 'Payable amt.', align: 'right', render: (r) => inr(r.payable), mobile: 'right' }, { key: 'pending', label: 'Pending', align: 'right', render: (r) => inr(r.pending) }, { key: 'status', label: 'Status', filter: true, render: (r) => <StatusBadge s={r.pending <= 0 ? 'Paid' : r.status} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Print payment slip', icon: Printer, onClick: () => openPrint('payslip', r.id) }]} /></div>
    </div>
  );
}

export function TPApproval() {
  const db = useDB();
  const { openPrint } = useUI.getState();
  const [tab, setTab] = useState('approve');
  const [status, setStatus] = useState('Pending');
  const [pay, setPay] = useState<any>(null);
  const [f, setF] = useState<any>({});
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Transporter approval & payment" subtitle="Approve generated payment slips, then record payments against approved slips. Payments post to the ledger as bank/cash payment vouchers." />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'approve', label: 'Payment approval', count: db.tpSlips.filter((s: any) => s.status === 'Pending').length }, { key: 'pay', label: 'Payment entry', count: db.tpSlips.filter((s: any) => s.status === 'Approved' && s.pending > 0).length }]} />
      {tab === 'approve' ? <DataTable id="tp-approve" rows={db.tpSlips.filter((s: any) => status === 'All' || s.status === status).slice().reverse()} toolbar={<Segmented size="sm" options={['Pending', 'Approved', 'All']} value={status} onChange={setStatus} />} bulkActions={[{ label: 'Approve payment', icon: BadgeCheck, onClick: (rs) => A.approveTPSlip(rs.filter((r: any) => r.status === 'Pending').map((r: any) => r.id)) }]} expand={(r: any) => <div className="grid gap-1 text-[12px]">{r.rows.map((x: any) => <div key={x.lrId} className="flex gap-4"><span className="docno w-36">{db.lrs.find((l: any) => l.id === x.lrId)?.lrNo}</span><span>Freight {inr(x.freight)}</span><span>Adv {inr(x.advance)}</span><span>TDS {inr(x.tds)}</span><span className="font-semibold">Bal {inr(x.balance)}</span></div>)}</div>} cols={[{ key: 'slipNo', label: 'Payment slip no.', render: (r) => <DocNo>{r.slipNo}</DocNo>, mobile: 'title' }, { key: 't', label: 'Transporter', value: (r) => lookup.transName(db, r.transporterId), mobile: 'sub' }, { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'payable', label: 'Payable', align: 'right', render: (r) => inr(r.payable), mobile: 'right' }, { key: 'status', label: 'Status', render: (r) => <StatusBadge s={r.status} />, mobile: 'meta' }, { key: 'approvedBy', label: 'Approved by' }]} rowActions={(r: any) => [{ label: 'Approve', icon: BadgeCheck, onClick: () => A.approveTPSlip([r.id]), hidden: r.status !== 'Pending' }, { label: 'Print slip', icon: Printer, onClick: () => openPrint('payslip', r.id) }]} />
        : <DataTable id="tp-pay" rows={db.tpSlips.filter((s: any) => s.status === 'Approved').slice().reverse()} onRow={(r) => { setPay(r); setF({ date: ymd(), amount: r.pending, tds: 0, paidBy: defLedger(db, 'l2'), mode: 'Bank' }); }} cols={[{ key: 'slipNo', label: 'Payment slip no.', render: (r) => <DocNo>{r.slipNo}</DocNo>, mobile: 'title' }, { key: 't', label: 'Transporter', value: (r) => lookup.transName(db, r.transporterId), filter: true, mobile: 'sub' }, { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'payable', label: 'Payable amt.', align: 'right', render: (r) => inr(r.payable) }, { key: 'paid', label: 'Paid amt.', align: 'right', value: (r) => sum(r.payments, (p: any) => p.amount), render: (r) => inr(sum(r.payments, (p: any) => p.amount)) }, { key: 'pending', label: 'Pending', align: 'right', render: (r) => inr(r.pending), mobile: 'right' }, { key: 'pd', label: 'Paid date', render: (r) => fmtDate(r.payments.at(-1)?.date) }, { key: 'st', label: 'Status', render: (r) => <StatusBadge s={r.pending <= 0 ? 'Paid' : 'Approved'} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Record payment', icon: Banknote, onClick: () => { setPay(r); setF({ date: ymd(), amount: r.pending, tds: 0, paidBy: 'l2', mode: 'Bank' }); }, hidden: r.pending <= 0 }]} />}
      {pay && <Modal open onClose={() => setPay(null)} title={`Pay ${pay.slipNo}`} footer={<><button className="btn-ghost" onClick={() => setPay(null)}>Back to list</button><button className="btn-primary" disabled={!f.amount || f.amount > pay.pending} onClick={() => { A.payTPSlip(pay.id, f); setPay(null); }}><CheckCircle2 size={15} /> Confirm payment</button></>}><div className="text-[13px] mb-3">{lookup.transName(db, pay.transporterId)} · pending <b>{inr(pay.pending)}</b></div><PayFields f={f} setF={setF} db={db} /></Modal>}
    </div>
  );
}

// ---------------- DC approval & payslips ----------------
export function DCApproval() {
  const db = useDB();
  const { openRecord } = useUI.getState();
  const cands = db.dcs.filter((d: any) => d.ackSupervisor && !d.approval && d.status !== 'Rejected');
  const [sel, setSel] = useState<any>(null);
  const [f, setF] = useState<any>({});
  const open = (d: any) => { const c = d.ackCollection || {}; const cl = d.ackClient || {}; setSel(d); setF({ transporterId: d.transporterId, freight: d.freight, advance: d.advance, shortage: (c.shortageAmt || 0) + (cl.shortageAmt || 0), damage: (c.damageAmt || 0) + (cl.damageAmt || 0), parking: c.parking ?? d.ackSupervisor.parking ?? 0, detAmt: c.detentionAmt ?? d.ackSupervisor.detentionAmt ?? 0, detDays: c.detentionDays ?? d.ackSupervisor.detentionDays ?? 0, other: c.other ?? d.ackSupervisor.other ?? 0, labour: c.labour || 0, mode: c.paymentMode || 'Bank' }); };
  const payable = sel ? Number(f.freight) - Number(f.advance) + Number(f.detAmt) + Number(f.parking) + Number(f.other) + Number(f.labour) - Number(f.shortage) - Number(f.damage) : 0;
  const ready = (d: any) => d.ackCollection && d.ackClient;
  return (
    <div>
      <PageHeader eyebrow="Finance" title="DC approval for payment" subtitle="Approve lorry delivery challans for broker payment after supervisor, collection and client acknowledgments. Shortage and damage reported in acknowledgments are deducted." />
      <DataTable id="dc-approval" rows={cands.slice().reverse()} onRow={open} quickFilters={[{ key: 'r', label: 'All acks received', fn: ready }, { key: 'w', label: 'Waiting for acks', fn: (d: any) => !ready(d) }]} cols={[{ key: 'dcNo', label: 'Challan no.', render: (r) => <DocNo>{r.dcNo}</DocNo>, mobile: 'title' }, { key: 'rakeNo', label: 'Rake no.' }, { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.truckId), mobile: 'sub' }, { key: 't', label: 'Transporter / broker', value: (r) => lookup.transName(db, r.transporterId), filter: true }, { key: 'acks', label: 'DC ack list', render: (r) => <span className="flex gap-1">{[['S', r.ackSupervisor], ['C', r.ackCollection], ['Cl', r.ackClient]].map(([l, v]: any) => <span key={l} className={cls('chip', v ? 'bg-ok/10 text-ok' : 'bg-surface2 text-faint border border-line')}>{l}</span>)}</span>, mobile: 'meta' }, { key: 'freight', label: 'Freight', align: 'right', render: (r) => inr(r.freight) }, { key: 'advance', label: 'Advance', align: 'right', render: (r) => inr(r.advance) }, { key: 'payable', label: 'Freight payable', align: 'right', value: (r) => r.freight - r.advance, render: (r) => inr(r.freight - r.advance), mobile: 'right' }]} empty={<EmptyState icon={Stamp} title="Nothing to approve" body="Challans appear after the branch supervisor acknowledges delivery." />} />
      <div className="mt-6"><DataTable id="dc-approved" title="Approved challans" rows={db.dcs.filter((d: any) => d.approval)} onRow={(r) => openRecord('dc', r.id)} cols={[{ key: 'dcNo', label: 'Challan no.', render: (r) => <DocNo>{r.dcNo}</DocNo>, mobile: 'title' }, { key: 'rakeNo', label: 'Rake no.' }, { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.truckId) }, { key: 't', label: 'Transporter / broker', value: (r) => lookup.transName(db, r.transporterId), mobile: 'sub' }, { key: 'p', label: 'Freight payable', align: 'right', render: (r) => inr(r.approval.payable), mobile: 'right' }, { key: 'by', label: 'Approved by', value: (r) => r.approval.by }, { key: 'status', label: 'Status', render: (r) => <StatusBadge s={r.status} />, mobile: 'meta' }]} /></div>
      {sel && <Drawer open onClose={() => setSel(null)} title={`Approve ${sel.dcNo}`} subtitle={`${lookup.transName(db, sel.transporterId)} · ${lookup.truckNo(db, sel.truckId)}`} footer={<><button className="btn-bad" onClick={() => { A.approveDC(sel.id, f, false); setSel(null); }}><XCircle size={15} /> Reject</button><button className="btn-ok" onClick={() => { A.approveDC(sel.id, { ...f, payable }, true); setSel(null); }}><BadgeCheck size={15} /> Approve {inr(payable)}</button></>}>
        <div className="p-4 sm:p-5 grid gap-4">
          {!ready(sel) && <div className="rounded-lg bg-warn/10 text-warn px-3 py-2 text-[12.5px] flex gap-2"><AlertTriangle size={15} />Collection or client acknowledgment is still pending. Approving now relies on the supervisor acknowledgment only.</div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Transporter"><Select value={f.transporterId} onChange={(e) => setF({ ...f, transporterId: e.target.value })} options={db.transporters.map((t: any) => ({ value: t.id, label: t.name }))} /></Field>
            <Field label="Payment mode"><Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} options={['Cash', 'Bank']} /></Field>
            {[['freight', 'Freight'], ['advance', 'Advance'], ['shortage', 'Shortage amt'], ['damage', 'Damage amt'], ['parking', 'Parking amt'], ['detAmt', 'Detention amt'], ['detDays', 'Detention days'], ['other', 'Other expenses'], ['labour', 'Labour charges']].map(([k, l]) => <Field key={k} label={l}><Input type="number" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></Field>)}
          </div>
          <Card><div className="flex justify-between items-center"><span className="text-muted text-[13px]">Freight payable</span><span className="font-display text-[22px] font-semibold tnum">{inr(payable)}</span></div></Card>
        </div>
      </Drawer>}
    </div>
  );
}

export function DCPayslips() {
  const db = useDB();
  const { openPrint } = useUI.getState();
  const [tab, setTab] = useState('generate');
  const eligible = db.dcs.filter((d: any) => d.approval && !d.payslipId);
  const trans = [...new Set(eligible.map((d: any) => d.transporterId))];
  const [tid, setTid] = useState(trans[0] || '');
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [tdsPer, setTdsPer] = useState(1);
  const [remark, setRemark] = useState('');
  const list = eligible.filter((d: any) => d.transporterId === tid);
  const total = sum(list.filter((d: any) => pick.has(d.id)), (d: any) => d.approval.payable);
  const tds = Math.round((total * tdsPer) / 100);
  const [pay, setPay] = useState<any>(null);
  const [f, setF] = useState<any>({});
  return (
    <div>
      <PageHeader eyebrow="Finance" title="DC payment slips" subtitle="Group approved challans per broker into a payment slip with TDS, then record DC payments." />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'generate', label: 'Generate DC payment slip', count: eligible.length }, { key: 'pay', label: 'DC payment entry', count: db.dcPayslips.filter((p: any) => p.pending > 0).length }]} />
      {tab === 'generate' ? <Card><div className="grid gap-4">
        <div className="grid sm:grid-cols-3 gap-3"><Field label="Transporter / broker"><Select value={tid} onChange={(e) => { setTid(e.target.value); setPick(new Set()); }} placeholder="Select" options={trans.map((t: any) => ({ value: t, label: lookup.transName(db, t) }))} /></Field><Field label="TDS %"><Input type="number" value={tdsPer} onChange={(e) => setTdsPer(Number(e.target.value))} /></Field><Field label="Remark"><Input value={remark} onChange={(e) => setRemark(e.target.value)} /></Field></div>
        {list.length ? <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.5px] min-w-[860px]"><thead className="bg-surface2"><tr className="text-[10.5px] text-muted uppercase"><th className="px-3 w-8"><input type="checkbox" aria-label="Select all" checked={pick.size === list.length} onChange={(e) => setPick(e.target.checked ? new Set(list.map((d: any) => d.id)) : new Set())} /></th><th className="text-left px-2 py-2">Challan no.</th><th className="px-2">Date</th><th className="px-2">Truck</th><th className="text-right px-2">Freight</th><th className="text-right px-2">Advance</th><th className="text-right px-2">Det.</th><th className="text-right px-2">Labour</th><th className="text-right px-2">Short./dmg</th><th className="text-right px-2">Parking</th><th className="text-right px-3">Payable</th></tr></thead>
          <tbody>{list.map((d: any) => <tr key={d.id} className="border-t border-line"><td className="px-3"><input type="checkbox" aria-label="Select" checked={pick.has(d.id)} onChange={() => { const n = new Set(pick); n.has(d.id) ? n.delete(d.id) : n.add(d.id); setPick(n); }} /></td><td className="px-2 py-1.5 docno">{d.dcNo}</td><td className="px-2">{fmtDate(d.loadingDate)}</td><td className="px-2 docno">{lookup.truckNo(db, d.truckId)}</td><td className="px-2 text-right tnum">{num(d.approval.freight)}</td><td className="px-2 text-right tnum">{num(d.approval.advance)}</td><td className="px-2 text-right tnum">{num(d.approval.detAmt)}</td><td className="px-2 text-right tnum">{num(d.approval.labour)}</td><td className="px-2 text-right tnum">{num(d.approval.shortage + d.approval.damage)}</td><td className="px-2 text-right tnum">{num(d.approval.parking)}</td><td className="px-3 text-right tnum font-semibold">{num(d.approval.payable)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Wallet} title="No approved challans" />}
        <div className="flex flex-wrap items-center justify-end gap-4"><span className="text-[13px]">Total {inr(total)} · TDS {inr(tds)} · <b>Net {inr(total - tds)}</b></span><button className="btn-primary" disabled={!pick.size} onClick={() => { const ps = A.createDCPayslip({ transporterId: tid, dcIds: [...pick], total, tdsAmt: tds, net: total - tds, pending: total - tds, date: ymd(), remark }); setPick(new Set()); openPrint('dcpayslip', ps.id); }}>Generate slip</button></div>
      </div></Card>
        : <DataTable id="dc-payslips" rows={db.dcPayslips.slice().reverse()} onRow={(r) => { setPay(r); setF({ date: ymd(), amount: r.pending, paidBy: defLedger(db, 'l3'), mode: 'Bank' }); }} cols={[{ key: 'no', label: 'Payment slip no.', render: (r) => <DocNo>{r.no}</DocNo>, mobile: 'title' }, { key: 't', label: 'Transporter / broker', value: (r) => lookup.transName(db, r.transporterId), mobile: 'sub' }, { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'dcs', label: 'Challans', align: 'right', value: (r) => r.dcIds.length }, { key: 'net', label: 'Net amt.', align: 'right', render: (r) => inr(r.net) }, { key: 'paid', label: 'Paid amt.', align: 'right', value: (r) => sum(r.payments, (p: any) => p.amount), render: (r) => inr(sum(r.payments, (p: any) => p.amount)) }, { key: 'pd', label: 'Paid date', render: (r) => fmtDate(r.payments.at(-1)?.date) }, { key: 'st', label: 'Status', render: (r) => <StatusBadge s={r.pending <= 0 ? 'Paid' : 'Pending'} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Print slip', icon: Printer, onClick: () => openPrint('dcpayslip', r.id) }, { label: 'Record payment', icon: Banknote, hidden: r.pending <= 0, onClick: () => { setPay(r); setF({ date: ymd(), amount: r.pending, paidBy: 'l3', mode: 'Bank' }); } }]} />}
      {pay && <Modal open onClose={() => setPay(null)} title={`DC payment · ${pay.no}`} footer={<><button className="btn-ghost" onClick={() => setPay(null)}>Back to bill list</button><button className="btn-primary" disabled={!f.amount || f.amount > pay.pending} onClick={() => { A.payDCPayslip(pay.id, f); setPay(null); }}>Confirm payment</button></>}><div className="text-[13px] mb-3">Pending <b>{inr(pay.pending)}</b></div><PayFields f={f} setF={setF} db={db} showTds={false} /></Modal>}
    </div>
  );
}

// ---------------- Hamali payments ----------------
export function Hamali() {
  const db = useDB();
  const { openPrint } = useUI.getState();
  const [type, setType] = useState<'GRN' | 'DGRN' | 'VP'>('GRN');
  const [from, setFrom] = useState(ymd(addDays(now(), -45)));
  const [to, setTo] = useState(ymd());
  const [lab, setLab] = useState('');
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [pay, setPay] = useState({ date: ymd(), tdsPer: 1, paidBy: defLedger(db, 'l4'), mode: 'Cash' });
  const entries: any[] = type === 'GRN' ? db.grns.map((g: any) => ({ id: g.id, date: g.inDate, ref: g.grnNo, lr: db.lrs.find((l: any) => l.id === g.lrId)?.lrNo, sup: g.supervisorId, lab: g.labourId, amt: g.labourCharge, paid: g.hamaliPaymentId, sched: '' }))
    : type === 'DGRN' ? db.dgrns.map((g: any) => ({ id: g.id, date: g.inDate, ref: g.dgrnNo, vp: g.vpNo, sup: g.supervisorId, lab: g.labourId, amt: g.labourCharge, paid: g.hamaliPaymentId, sched: lookup.sched(db, g.scheduleId)?.date }))
    : db.schedules.flatMap((s: any) => s.loads.map((ld: any) => ({ id: ld.id, date: ld.date, ref: ld.vpNo, vp: ld.vpNo, lr: db.lrs.find((l: any) => l.id === ld.lrId)?.lrNo, sup: ld.supervisorId, lab: ld.labourId, amt: ld.labourCharge, paid: ld.hamaliPaymentId, sched: s.date })));
  const unpaid = entries.filter((e) => !e.paid && e.date >= from && e.date <= to && (!lab || e.lab === lab));
  const total = sum(unpaid.filter((e) => pick.has(e.id)), (e) => e.amt);
  const tdsAmt = Math.round((total * pay.tdsPer) / 100);
  const labour = lab || unpaid.find((e) => pick.has(e.id))?.lab;
  const titles = { GRN: 'Jalgaon station unloading (GRN)', DGRN: 'Branch station loading/unloading (DGRN)', VP: 'VP loading' };
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Hamali payments" subtitle="Pay loading/unloading gangs for GRN at rail head, DGRN at branches and VP loading. Select entries by date range and labour, deduct TDS and post a cash/bank payment." />
      <Segmented options={[{ key: 'GRN', label: 'GRN station' }, { key: 'DGRN', label: 'Branch GRN' }, { key: 'VP', label: 'VP loading' }]} value={type} onChange={(v: any) => { setType(v); setPick(new Set()); }} />
      <Card className="mt-4" title={`Hamali payment entry – ${titles[type]}`}><div className="grid gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Field label="From date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field><Field label="Labour"><Select value={lab} onChange={(e) => { setLab(e.target.value); setPick(new Set()); }} placeholder="All hamals" options={db.labours.filter((l: any) => l.type === 'Hamal').map((l: any) => ({ value: l.id, label: l.name }))} /></Field><div className="self-end text-[12.5px] text-muted pb-2">{unpaid.length} unpaid entries · {inr(sum(unpaid, (e) => e.amt))}</div></div>
        {unpaid.length ? <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.5px] min-w-[680px]"><thead className="bg-surface2"><tr className="text-[10.5px] text-muted uppercase"><th className="px-3 w-8"><input type="checkbox" aria-label="Select all" checked={pick.size === unpaid.length} onChange={(e) => setPick(e.target.checked ? new Set(unpaid.map((x) => x.id)) : new Set())} /></th>{type !== 'GRN' && <th className="text-left px-2">Schedule dt.</th>}{type !== 'DGRN' && <th className="text-left px-2">LR no.</th>}{type !== 'GRN' && <th className="text-left px-2">VP no.</th>}<th className="text-left px-2 py-2">{type === 'VP' ? 'Date' : 'GRN no.'}</th><th className="text-left px-2">Supervisor</th><th className="text-left px-2">Hamal</th><th className="text-right px-3">Hamali amt</th></tr></thead>
          <tbody>{unpaid.map((e) => <tr key={e.id} className="border-t border-line"><td className="px-3"><input type="checkbox" aria-label="Select" checked={pick.has(e.id)} onChange={() => { const n = new Set(pick); n.has(e.id) ? n.delete(e.id) : n.add(e.id); setPick(n); }} /></td>{type !== 'GRN' && <td className="px-2">{fmtDate(e.sched)}</td>}{type !== 'DGRN' && <td className="px-2 docno">{e.lr}</td>}{type !== 'GRN' && <td className="px-2 docno">{e.vp}</td>}<td className="px-2 py-1.5">{type === 'VP' ? fmtDate(e.date) : <span className="docno">{e.ref}</span>}</td><td className="px-2">{lookup.labour(db, e.sup)}</td><td className="px-2">{lookup.labour(db, e.lab)}</td><td className="px-3 text-right tnum">{num(e.amt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={Hammer} title="No unpaid hamali in range" />}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <Stat label="Total amount" value={inr(total)} /><Field label="Date"><Input type="date" value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} /></Field><Field label="TDS %"><Input type="number" value={pay.tdsPer} onChange={(e) => setPay({ ...pay, tdsPer: Number(e.target.value) })} /></Field><Stat label="TDS amount" value={inr(tdsAmt)} /><Field label="Payment by"><Select value={pay.paidBy} onChange={(e) => setPay({ ...pay, paidBy: e.target.value })} options={bankOpts(db)} /></Field><Stat label="Net payable" value={inr(total - tdsAmt)} />
          <Field label="Payment mode" className="col-span-2 lg:col-span-3"><Radio options={['Cash', 'Cheque', 'Bank']} value={pay.mode} onChange={(v) => setPay({ ...pay, mode: v })} /></Field>
          <div className="col-span-2 lg:col-span-3 flex justify-end"><button className="btn-primary" disabled={!pick.size} onClick={() => { const h = A.payHamali({ type, labourId: labour, refIds: [...pick], total, tdsPer: pay.tdsPer, tdsAmt, net: total - tdsAmt, date: pay.date, paidBy: pay.paidBy, mode: pay.mode }); setPick(new Set()); openPrint('hamali', h.id); }}><Hammer size={15} /> Pay hamali</button></div>
        </div>
      </div></Card>
      <div className="mt-6"><DataTable id={`hamali-${type}`} title="Payments made" rows={db.hamaliPayments.filter((h: any) => h.type === type).slice().reverse()} cols={[{ key: 'no', label: 'Payment no.', render: (r) => <DocNo>{r.no}</DocNo>, mobile: 'title' }, { key: 'l', label: 'Labour name', value: (r) => lookup.labour(db, r.labourId), mobile: 'sub' }, { key: 'date', label: 'Payment date', render: (r) => fmtDate(r.date) }, { key: 'n', label: 'Entries', align: 'right', value: (r) => r.refIds.length }, { key: 'total', label: 'Total hamali', align: 'right', render: (r) => inr(r.total) }, { key: 'tdsAmt', label: 'TDS deducted', align: 'right', render: (r) => inr(r.tdsAmt) }, { key: 'net', label: 'Net paid hamali', align: 'right', render: (r) => inr(r.net), mobile: 'right' }]} rowActions={(r: any) => [{ label: 'Print', icon: Printer, onClick: () => openPrint('hamali', r.id) }]} /></div>
    </div>
  );
}

// ---------------- Ledger ----------------
export function Ledger() {
  const db = useDB();
  const { openPrint } = useUI.getState();
  const [tab, setTab] = useState('entry');
  const [f, setF] = useState<any>({ ledgerType: 'Other', ledger: '', date: ymd(), time: hm(), amount: '', type: 'Debit', paidBy: defLedger(db, 'l1'), mode: 'Bank', narration: '' });
  const ledgerChoices = f.ledgerType === 'Client' ? db.customers.map((c: any) => ({ value: c.id, label: c.name })) : f.ledgerType === 'Transporter' ? db.transporters.map((t: any) => ({ value: t.id, label: t.name })) : [...db.expenseTypes.map((e: any) => e.ledger), 'Office Rent', 'Salary', 'Telephone & Internet', 'Bank Charges', 'Interest Received', 'Staff Welfare'].filter((v, i, a) => a.indexOf(v) === i);
  const [party, setParty] = useState<'Client' | 'Transporter' | 'Other'>('Client');
  const [pid, setPid] = useState(() => firstId(db.customers, 'c1'));
  const [from, setFrom] = useState(ymd(addDays(now(), -90)));
  const [to, setTo] = useState(ymd());
  const stmt = db.ledger.filter((e: any) => e.date >= from && e.date <= to && (party === 'Client' ? e.clientId === pid : party === 'Transporter' ? e.transporterId === pid : e.party === 'Other' && (!pid || e.ledgerName === pid))).sort((a: any, b: any) => a.date.localeCompare(b.date));
  let bal = 0;
  const stmtRows = stmt.map((e: any) => { bal += (party === 'Client' ? e.debit - e.credit : e.debit - e.credit); return { ...e, bal }; });
  const [vq, setVq] = useState('');
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Ledger" subtitle="Manual ledger entries, party-wise ledger statements and the account ledger audit of every voucher posted by billing, receipts, payments, hamali and log slips." />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'entry', label: 'Ledger entry' }, { key: 'report', label: 'Account ledger' }, { key: 'audit', label: 'Ledger audit', count: db.ledger.length }]} />
      {tab === 'entry' && <div className="grid lg:grid-cols-[1fr_1fr] gap-4 items-start">
        <Card title="New voucher"><div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ledger type"><Select value={f.ledgerType} onChange={(e) => setF({ ...f, ledgerType: e.target.value, ledger: '' })} options={['Client', 'Transporter', 'Other']} /></Field>
          <Field label="Ledger" required><Select value={f.ledger} onChange={(e) => setF({ ...f, ledger: e.target.value })} placeholder="Select" options={ledgerChoices} /></Field>
          <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Time"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          <Field label="Amount (₹)" required><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Type"><Radio options={['Debit', 'Credit']} value={f.type} onChange={(v) => setF({ ...f, type: v })} /></Field>
          <Field label="Payment by"><Select value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })} options={bankOpts(db)} /></Field>
          <Field label="Payment mode"><Radio options={['Cash', 'Cheque', 'Bank']} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} /></Field>
          <Field label="Narration" className="sm:col-span-2"><Textarea rows={2} value={f.narration} onChange={(e) => setF({ ...f, narration: e.target.value })} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF({ ...f, amount: '', narration: '' })}>Cancel</button><button className="btn-primary" disabled={!f.ledger || !Number(f.amount)} onClick={() => { A.ledgerEntry({ ledgerType: f.ledgerType, clientId: f.ledgerType === 'Client' ? f.ledger : undefined, transporterId: f.ledgerType === 'Transporter' ? f.ledger : undefined, ledgerName: f.ledgerType === 'Client' ? lookup.custName(db, f.ledger) : f.ledgerType === 'Transporter' ? lookup.transName(db, f.ledger) : f.ledger, date: f.date, amount: Number(f.amount), type: f.type, paidBy: f.paidBy, mode: f.mode, narration: f.narration || `${f.type} entry` }); setF({ ...f, amount: '', narration: '' }); }}>Post voucher</button></div>
        </div></Card>
        <DataTable id="ledger-recent" title="Recent manual entries" rows={db.ledger.filter((e: any) => e.refType === 'Ledger Entry').slice().reverse()} cols={[{ key: 'voucherNo', label: 'Voucher no', render: (r) => <DocNo>{r.voucherNo}</DocNo>, mobile: 'title' }, { key: 'date', label: 'Entry date', render: (r) => fmtDate(r.date) }, { key: 'ledgerName', label: 'Ledger', mobile: 'sub' }, { key: 'debit', label: 'Debit amt', align: 'right', render: (r) => (r.debit ? inr(r.debit) : '—') }, { key: 'credit', label: 'Credit amt', align: 'right', render: (r) => (r.credit ? inr(r.credit) : '—') }]} rowActions={(r: any) => [{ label: 'Print voucher', icon: Printer, onClick: () => openPrint('voucher', r.id) }]} />
      </div>}
      {tab === 'report' && <>
        <Card className="mb-4"><div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Field label="Party"><Radio options={['Client', 'Transporter', 'Other']} value={party} onChange={(v: any) => { setParty(v); setPid(v === 'Client' ? firstId(db.customers, 'c1') : v === 'Transporter' ? firstId(db.transporters, 't1') : ''); }} /></Field>
          <Field label="Ledger" className="lg:col-span-2"><Select value={pid} onChange={(e) => setPid(e.target.value)} placeholder="All other ledgers" options={party === 'Client' ? db.customers.map((c: any) => ({ value: c.id, label: c.name })) : party === 'Transporter' ? db.transporters.map((t: any) => ({ value: t.id, label: t.name })) : [...new Set(db.ledger.filter((e: any) => e.party === 'Other').map((e: any) => e.ledgerName))] as string[]} /></Field>
          <Field label="From date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div></Card>
        <div className="grid grid-cols-3 gap-3 mb-4"><KPI label="Debit" value={inr(sum(stmt, (e: any) => e.debit))} /><KPI label="Credit" value={inr(sum(stmt, (e: any) => e.credit))} /><KPI label="Closing balance" value={inr(bal)} tone={bal > 0 ? 'brand' : 'ok'} /></div>
        <DataTable id="ledger-stmt" rows={stmtRows} pageSize={25} cols={[{ key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'voucherNo', label: 'Voucher', render: (r) => <DocNo>{r.voucherNo}</DocNo>, mobile: 'title' }, { key: 'voucherType', label: 'Type', filter: true }, { key: 'particular', label: 'Particular', mobile: 'sub' }, { key: 'debit', label: 'Debit', align: 'right', render: (r) => (r.debit ? inr(r.debit) : '') }, { key: 'credit', label: 'Credit', align: 'right', render: (r) => (r.credit ? inr(r.credit) : '') }, { key: 'bal', label: 'Balance', align: 'right', render: (r) => <b className="tnum">{inr(r.bal)}</b>, mobile: 'right' }]} />
      </>}
      {tab === 'audit' && <DataTable id="ledger-audit" rows={db.ledger.slice().sort((a: any, b: any) => b.date.localeCompare(a.date))} initialQ={vq} pageSize={25} cols={[{ key: 'voucherNo', label: 'Voucher no', render: (r) => <DocNo>{r.voucherNo}</DocNo>, mobile: 'title' }, { key: 'date', label: 'Entry date', render: (r) => fmtDate(r.date) }, { key: 'voucherType', label: 'Voucher type', filter: true }, { key: 'party', label: 'Party', filter: true }, { key: 'ledgerName', label: 'Ledger', mobile: 'sub' }, { key: 'particular', label: 'Particular' }, { key: 'debit', label: 'Debit', align: 'right', render: (r) => (r.debit ? inr(r.debit) : '') }, { key: 'credit', label: 'Credit', align: 'right', render: (r) => (r.credit ? inr(r.credit) : '') }, { key: 'by', label: 'Posted by', filter: true }, { key: 'tally', label: 'Tally', value: (r) => (r.tally ? 'Synced' : 'Not Synced'), render: (r) => <StatusBadge s={r.tally ? 'Synced' : 'Not Synced'} />, filter: true, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Print voucher', icon: Printer, onClick: () => openPrint('voucher', r.id) }]} />}
    </div>
  );
}

export function FreightUpdate() {
  const db = useDB();
  const [client, setClient] = useState('');
  const [freight, setFreight] = useState<number | ''>('');
  const [pick, setPick] = useState<Set<string>>(new Set());
  const lrs = db.lrs.filter((l: any) => !l.billId && l.isFinal && (!client || l.consignorId === client));
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Update LR freight" subtitle="Correct freight on unbilled LRs in bulk (e.g. after a rate revision). Changes are logged on each LR's audit trail." />
      <Card><div className="grid gap-4">
        <div className="grid sm:grid-cols-3 gap-3 items-end"><Field label="Client"><Select value={client} onChange={(e) => { setClient(e.target.value); setPick(new Set()); }} placeholder="All clients" options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} /></Field><Field label="New freight (₹)"><Input type="number" value={freight} onChange={(e) => setFreight(e.target.value === '' ? '' : Number(e.target.value))} /></Field><button className="btn-primary h-9" disabled={!pick.size || !freight} onClick={() => { A.updateFreight([...pick], Number(freight)); setPick(new Set()); }}>Update {pick.size} LR</button></div>
        <DataTable id="freight-upd" rows={lrs} cols={[{ key: 'p', label: '', sortable: false, render: (r) => <input type="checkbox" aria-label="Select" checked={pick.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => { const n = new Set(pick); n.has(r.id) ? n.delete(r.id) : n.add(r.id); setPick(n); }} /> }, { key: 'lrNo', label: 'LR no.', render: (r) => <DocNo>{r.lrNo}</DocNo>, mobile: 'title' }, { key: 'c', label: 'Consignor', value: (r) => lookup.cust(db, r.consignorId)?.short, mobile: 'sub' }, { key: 'ce', label: 'Consignee', value: (r) => lookup.cust(db, r.consigneeId)?.short }, { key: 'route', label: 'Route', value: (r) => `${r.source} → ${r.destination}` }, { key: 'freight', label: 'Current freight', align: 'right', render: (r) => inr(r.freight), mobile: 'right' }, { key: 'nf', label: 'New freight', align: 'right', render: (r) => (pick.has(r.id) && freight ? <b className="text-violet tnum">{inr(Number(freight))}</b> : '—') }]} />
      </div></Card>
    </div>
  );
}

export function Tally() {
  const db = useDB();
  const [from, setFrom] = useState(ymd(addDays(now(), -30)));
  const [to, setTo] = useState(ymd());
  const [mode, setMode] = useState('Create');
  const TYPES = [['Journal', 'Journal'], ['Sale', 'Sales'], ['Logslip', 'Logslip'], ['Cash Payment', 'Cash Payment'], ['Cash Receipt', 'Cash Receipt'], ['Bank Receipt', 'Bank Receipt'], ['Bank Payment', 'Bank Payment']];
  const [types, setTypes] = useState<Set<string>>(new Set(TYPES.map((t) => t[1])));
  const [onlyNew, setOnlyNew] = useState(true);
  const vouchers = db.ledger.filter((e: any) => e.date >= from && e.date <= to && types.has(e.voucherType) && (!onlyNew || !e.tally || mode === 'Alter'));
  const xml = `<ENVELOPE>\n <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>\n <BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>S.K. Translines Pvt. Ltd.</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>\n  <REQUESTDATA>\n${vouchers.slice(0, 3).map((v: any) => `   <TALLYMESSAGE xmlns:UDF="TallyUDF">\n    <VOUCHER VCHTYPE="${v.voucherType}" ACTION="${mode}">\n     <DATE>${v.date.replace(/-/g, '')}</DATE>\n     <VOUCHERNUMBER>${v.voucherNo}</VOUCHERNUMBER>\n     <NARRATION>${v.particular}</NARRATION>\n     <ALLLEDGERENTRIES.LIST><LEDGERNAME>${v.ledgerName}</LEDGERNAME><AMOUNT>${v.debit ? -v.debit : v.credit}</AMOUNT></ALLLEDGERENTRIES.LIST>\n    </VOUCHER>\n   </TALLYMESSAGE>`).join('\n')}\n   <!-- … ${Math.max(0, vouchers.length - 3)} more vouchers … -->\n  </REQUESTDATA></IMPORTDATA></BODY>\n</ENVELOPE>`;
  return (
    <div>
      <PageHeader eyebrow="Finance" title="Tally export" subtitle="Generate Tally XML for sales, receipts, payments, journals and log-slip vouchers. Transfer marks vouchers as synced so they are not exported twice." />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4 items-start">
        <Card title="Generate Tally XML"><div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3"><Field label="From date"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field label="To date"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>
          <Field label="Action"><Radio options={['Create', 'Alter']} value={mode} onChange={setMode} /></Field>
          <div><div className="label">Voucher types</div><div className="grid grid-cols-2 gap-2">{TYPES.map(([l, k]) => <Check key={k} label={`${l} (${db.ledger.filter((e: any) => e.voucherType === k && e.date >= from && e.date <= to).length})`} checked={types.has(k)} onChange={(v) => { const n = new Set(types); v ? n.add(k) : n.delete(k); setTypes(n); }} />)}</div></div>
          <Check label="Only vouchers not yet synced" checked={onlyNew} onChange={setOnlyNew} />
          <div className="rounded-lg bg-surface2 border border-line p-3 grid grid-cols-3 gap-3"><Stat label="Vouchers" value={vouchers.length} /><Stat label="Debit" value={compactINR(sum(vouchers, (v: any) => v.debit))} /><Stat label="Credit" value={compactINR(sum(vouchers, (v: any) => v.credit))} /></div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button className="btn-ghost" onClick={() => { downloadCSV('tally_vouchers', vouchers.map((v: any) => ({ Voucher: v.voucherNo, Date: v.date, Type: v.voucherType, Ledger: v.ledgerName, Particular: v.particular, Debit: v.debit, Credit: v.credit }))).then((o) => { const [t, tone] = saveMsg(o, 'Excel downloaded'); useUI.getState().toast(t, tone); }); }}><Download size={15} /> Download Excel</button>
            <button className="btn-ghost" onClick={() => { downloadText(`SKT_Tally_${from}_${to}.xml`, xml, 'application/xml').then((o) => { const [t, tone] = saveMsg(o, 'XML generated'); useUI.getState().toast(t, tone, o === 'saved' ? `${vouchers.length} vouchers · rename .xml.txt to .xml if needed` : undefined); }); }}><Database size={15} /> Submit (generate XML)</button>
            <button className="btn-primary" disabled={!vouchers.length} onClick={() => A.tallyExport({ from, to, types: [...types], mode }, vouchers.map((v: any) => v.id))}><Send size={15} /> Transfer to Tally</button>
          </div>
        </div></Card>
        <Card title="XML preview" subtitle="Tally ERP 9 / Prime import envelope"><pre className="text-[11px] leading-relaxed bg-surface2 border border-line rounded-lg p-3 overflow-auto max-h-[420px] font-mono whitespace-pre">{xml}</pre></Card>
      </div>
      <div className="mt-6"><DataTable id="tally-batches" title="Transfer history" rows={db.tallyBatches.slice().reverse()} cols={[{ key: 'at', label: 'Transferred', render: (r) => fmtDT(r.at), mobile: 'title' }, { key: 'range', label: 'Period', value: (r) => `${fmtDate(r.from)} – ${fmtDate(r.to)}`, mobile: 'sub' }, { key: 'mode', label: 'Action' }, { key: 'types', label: 'Voucher types', value: (r) => r.types.join(', ') }, { key: 'count', label: 'Vouchers', align: 'right', mobile: 'right' }, { key: 'by', label: 'By' }]} /></div>
    </div>
  );
}
