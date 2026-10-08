import React, { useEffect, useState } from 'react';
import { useUI, useDB, lookup, getDB, isDiesel } from '../store/store';
import { LOGO } from '../assets';
import { fmtDate, inr, num, sum, toWords, ymd, fmtDT, daysBetween, saveFile, saveMsg } from '../lib/util';
import { X, Printer, Download, Mail, ZoomIn, ZoomOut } from 'lucide-react';
import { Segmented } from './ui';

export const PRINT_DOCS: { key: string; label: string; legacy: string; source: string }[] = [
  { key: 'lr', label: 'Lorry Receipt (LR)', legacy: 'Prints/LRPrintNewFormat.aspx, LRPrint.aspx, Print.aspx', source: 'lrs' },
  { key: 'lr-preprint', label: 'LR – pre-printed stationery', legacy: 'Prints/LRPrePrint.aspx', source: 'lrs' },
  { key: 'freight', label: 'Freight Slip', legacy: 'Prints/FreightSlipPrint.aspx', source: 'lrs' },
  { key: 'barcode', label: 'LR Barcode Label', legacy: 'GenerateBarcode/GenerateLRBarcode.aspx', source: 'lrs' },
  { key: 'ack', label: 'Acknowledgment', legacy: 'Prints/AcknowledgmentPrint.aspx', source: 'lrs' },
  { key: 'dc', label: 'Delivery Challan (LDC)', legacy: 'Prints/DCPrint.aspx, EmailDC.aspx', source: 'dcs' },
  { key: 'grn', label: 'Goods Received Note', legacy: 'Prints/GRNPrint.aspx', source: 'grns' },
  { key: 'bill', label: 'Freight Bill (GST)', legacy: 'Prints/BillPrint.aspx, BillA–IPrint.aspx', source: 'bills' },
  { key: 'supplementary', label: 'Supplementary Bill', legacy: 'Prints/SupplementaryBill.aspx, SupplementaryA/BBill.aspx', source: 'bills' },
  { key: 'jobcard', label: 'Job Card', legacy: 'Prints/JobCard.aspx', source: 'jobcards' },
  { key: 'gatepass', label: 'Job Card Gate Pass', legacy: 'Prints/JCGatePass.aspx', source: 'jobcards' },
  { key: 'rpgatepass', label: 'Replacement Gate Pass', legacy: 'Prints/RPGatePass.aspx', source: 'replacements' },
  { key: 'po', label: 'Purchase Order', legacy: 'Prints/POPrint.aspx', source: 'pos' },
  { key: 'payslip', label: 'Transporter Payment Slip', legacy: 'Prints/TransporterPaySlip.aspx', source: 'tpSlips' },
  { key: 'dcpayslip', label: 'DC Payment Slip', legacy: 'Accounts/DCPaymentSlip.aspx', source: 'dcPayslips' },
  { key: 'tripadvance', label: 'Trip Advance', legacy: 'Prints/TripAdvance.aspx', source: 'trips' },
  { key: 'diesel', label: 'Diesel Expense Slip', legacy: 'Prints/DieselExpenseSlip.aspx', source: 'trips' },
  { key: 'logslip', label: 'Log Slip', legacy: 'Prints/LogSlipPrint.aspx', source: 'logslips' },
  { key: 'loadsummary', label: 'VP Loading Summary', legacy: 'Prints/VPLoadSummary.aspx', source: 'schedules' },
  { key: 'maintenance', label: 'Truck Maintenance Checklist', legacy: 'Prints/MaintenancePrint.aspx', source: 'checklists' },
  { key: 'hamali', label: 'Hamali Payment Slip', legacy: 'Accounts/HamaliPayment*.aspx (lnkPrint)', source: 'hamaliPayments' },
  { key: 'voucher', label: 'Ledger Voucher', legacy: 'Accounts/LedgerPaymentEntry.aspx (lnkPrint)', source: 'ledger' },
];

function Head({ title, no, date, right }: { title: string; no?: string; date?: string; right?: React.ReactNode }) {
  const db = getDB();
  return (
    <div style={{ borderBottom: '2px solid #d6252d', paddingBottom: 8, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <img src={LOGO} alt="S.K. Translines Pvt. Ltd." style={{ height: 34 }} />
          <div style={{ fontSize: 9.5, color: '#555', marginTop: 4, maxWidth: 380, lineHeight: 1.35 }}>Corp. Off.: {db.company.address}<br />Tel.: {db.company.phone} · {db.company.email}<br />GSTIN {db.company.gst} · PAN {db.company.pan} · Code {db.company.code}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#2c1a5c', margin: 0, letterSpacing: '.02em' }}>{title}</h1>
          {no && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, marginTop: 4 }}>No: <b>{no}</b></div>}
          {date && <div style={{ fontSize: 11 }}>Date: <b>{date}</b></div>}
          {right}
        </div>
      </div>
    </div>
  );
}
const Sig = ({ labels }: { labels: string[] }) => <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 34, gap: 16 }}>{labels.map((l) => <div key={l} style={{ flex: 1, textAlign: 'center', borderTop: '1px dotted #333', paddingTop: 4, fontSize: 10 }}>{l}</div>)}</div>;
const Box = ({ title, children }: any) => <div style={{ border: '1px solid #1a1726', padding: 6, minWidth: 0 }}><div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#522e9c', marginBottom: 3 }}>{title}</div>{children}</div>;

function Barcode({ value, h = 46 }: { value: string; h?: number }) {
  const bars: number[] = [];
  const s = value.replace(/\W/g, '');
  for (const ch of `*${s}*`) { const c = ch.charCodeAt(0); for (let k = 0; k < 5; k++) bars.push(((c >> k) & 1) + 1, ((c >> (k + 2)) & 1) + 1); }
  let x = 0;
  const rects = bars.map((w, i) => { const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={w * 1.4} height={h} fill="#000" /> : null; x += w * 1.4; return r; });
  return <svg viewBox={`0 0 ${x} ${h + 14}`} style={{ width: '100%', maxWidth: 300, height: h + 14 }}>{rects}<text x={x / 2} y={h + 11} textAnchor="middle" fontSize="10" fontFamily="IBM Plex Mono, monospace">{value}</text></svg>;
}

function LRDoc({ l, preprint }: { l: any; preprint?: boolean }) {
  const db = getDB();
  const cn = lookup.cust(db, l.consignorId), ce = lookup.cust(db, l.consigneeId);
  return (
    <div>
      {!preprint ? <Head title="CONSIGNMENT NOTE" no={l.lrNo} date={fmtDate(l.placeDate)} right={<div style={{ fontSize: 10, marginTop: 4 }}>{l.mode} · {l.paymentMode}</div>} /> : <div style={{ height: 70 }} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 6 }}>
        <Box title="Schedule of demurrage charges"><div style={{ fontSize: 9.5 }}>Demurrage chargeable after <b>3</b> days from today @ Rs. <b>2</b> per day per Qtl. on weight charged.</div></Box>
        <Box title="At carrier's / owner's risk"><b>{l.risk === 'Owner' ? "OWNER'S RISK" : "CARRIER'S RISK"}</b><div style={{ fontSize: 9.5 }}>Insurance: {l.insurance?.on ? `${l.insurance.company} · ${l.insurance.no}` : 'Not insured by consignor'}</div></Box>
        <Box title="Truck / vehicle"><b style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{lookup.truckNo(db, l.truckId)}</b><div style={{ fontSize: 9.5 }}>From BR: {lookup.branch(db, l.fromBranchId)?.code} · To BR: {lookup.branch(db, l.toBranchId)?.code}</div></Box>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        <Box title="Consignor's name & address"><b>{cn?.name}</b><div>{l.consignorAddr}</div><div>GSTIN: {cn?.gst}</div></Box>
        <Box title="Consignee's name & address"><b>{ce?.name}</b><div>{l.deliveryAt}</div><div>GSTIN: {ce?.gst}</div></Box>
      </div>
      <table style={{ marginBottom: 6 }}>
        <tbody>
          <tr><th>From</th><td>{l.source}</td><th>To</th><td>{l.destination}</td><th>Invoice(s)</th><td>{l.invoices}</td></tr>
          <tr><th>Goods value</th><td>{inr(l.goodsValue)}</td><th>Seal no.</th><td>{l.seal}</td><th>Delivery</th><td>{l.deliveryType}</td></tr>
        </tbody>
      </table>
      <table>
        <thead><tr><th>Packages</th><th>Description (said to contain)</th><th className="r">Actual wt (kg)</th><th className="r">Charged wt</th><th className="r">Basis</th><th className="r">Amount</th><th>To pay / Paid</th></tr></thead>
        <tbody>
          {l.items.map((it: any, k: number) => <tr key={k}><td>{num(it.qty)} {it.unit}</td><td>{it.name}</td><td className="r">{k === 0 ? num(l.weight) : ''}</td><td className="r">{k === 0 ? num(l.chargeableWeight) : ''}</td><td className="r">{k === 0 ? l.billingUnit : ''}</td><td className="r">{k === 0 ? inr(l.freight) : ''}</td><td>{k === 0 ? l.paymentMode : ''}</td></tr>)}
          <tr><td colSpan={5} style={{ fontWeight: 700 }}>Total freight</td><td className="r" style={{ fontWeight: 700 }}>{inr(l.freight)}</td><td>GST payable by {l.gstPayBy}</td></tr>
        </tbody>
      </table>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6, marginTop: 6 }}>
        <Box title="Notice"><div style={{ fontSize: 9, lineHeight: 1.4 }}>This consignment covered by this Lorry Receipt shall be stored at the destination under the control of the Transport Operator and shall be delivered to or to the order of the Consignee Bank whose name is mentioned in the Lorry Receipt. It will under no circumstances be delivered to anyone without the written authority from the Consignee Bank or its order, endorsed on the Consignee Copy.</div></Box>
        <Box title="Barcode"><Barcode value={l.lrNo.replace(/\//g, '').replace('SKT', '')} h={34} /></Box>
      </div>
      <Sig labels={['Signature of consignor', 'Booking clerk', 'For S.K. Translines Pvt. Ltd.']} />
      <div style={{ fontSize: 9, color: '#666', marginTop: 10 }}>Copies: Consignor · Consignee · Transporter · Office. Subject to Jalgaon jurisdiction.</div>
    </div>
  );
}

function BillDoc({ b, supp }: { b: any; supp?: boolean }) {
  const db = getDB();
  const c = lookup.cust(db, b.clientId);
  const lrs = b.rows.map((r: any) => ({ r, l: db.lrs.find((x: any) => x.id === r.lrId) }));
  const total = supp ? sum(b.supplementary || [], (s: any) => s.amount) : b.net;
  return (
    <div>
      <Head title={supp ? 'SUPPLEMENTARY BILL' : 'TAX INVOICE – FREIGHT'} no={supp ? `${b.billNo}/S` : b.billNo} date={fmtDate(b.date)} right={<div style={{ fontSize: 10 }}>(Subject to Jalgaon Jurisdiction Only)<br />Format: {b.format}</div>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        <Box title="Billed to"><b>{c?.name}</b><div>{c?.address}</div><div>State: {b.supplyState} · GSTIN: {c?.gst}</div><div>PAN: {c?.pan}</div></Box>
        <Box title="Supply details"><div>Place of supply: <b>{b.supplyState}</b></div><div>Dispatch mode: {b.transportType}</div><div>Bill head: {b.billHead}</div><div>HSN/SAC: 996511 – Road transport of goods (GTA)</div></Box>
      </div>
      <table>
        <thead><tr><th>Sr.</th><th>Vehicle no.</th><th>LR no.</th><th>LR date</th><th>From</th><th>To</th><th className="r">Qty</th><th className="r">Freight</th><th className="r">Detention</th><th className="r">Unloading</th><th className="r">Less</th><th className="r">Total</th></tr></thead>
        <tbody>
          {(supp ? [] : lrs).map(({ r, l }: any, k: number) => <tr key={k}><td>{k + 1}</td><td>{lookup.truckNo(db, l?.truckId)}</td><td style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{l?.lrNo}</td><td>{fmtDate(l?.placeDate)}</td><td>{l?.source}</td><td>{l?.destination}</td><td className="r">{num(l?.packages)}</td><td className="r">{num(r.freight)}</td><td className="r">{num(r.dtnWH + r.dtnDB)}</td><td className="r">{num(r.unload)}</td><td className="r">{num(r.sub)}</td><td className="r">{num(r.net)}</td></tr>)}
          {supp && (b.supplementary || []).map((s: any, k: number) => <tr key={k}><td>{k + 1}</td><td colSpan={9}>{s.reason}</td><td className="r">—</td><td className="r">{num(s.amount)}</td></tr>)}
        </tbody>
      </table>
      {!supp && <table style={{ marginTop: 6, width: '52%', marginLeft: 'auto' }}><tbody>
        <tr><td>Total taxable value</td><td className="r">{inr(b.taxable)}</td></tr>
        {b.cgst > 0 && <tr><td>Add: CGST @ {b.cgst}%</td><td className="r">{inr(b.tax / 2)}</td></tr>}
        {b.sgst > 0 && <tr><td>Add: SGST @ {b.sgst}%</td><td className="r">{inr(b.tax / 2)}</td></tr>}
        {b.igst > 0 && <tr><td>Add: IGST @ {b.igst}%</td><td className="r">{inr(b.tax)}</td></tr>}
        <tr><th>Total invoice value</th><th className="r">{inr(b.net)}</th></tr>
      </tbody></table>}
      <div style={{ marginTop: 6, fontSize: 11 }}><b>In words:</b> Rupees {toWords(total)} only</div>
      <div style={{ marginTop: 4, fontSize: 9.5 }}>Tax payable under reverse charge: {b.billHead === 'Consignor' ? 'Yes – by recipient' : 'No'} · Declaration: Input tax credit on goods/services used for supplying GTA service has not been taken.</div>
      <Sig labels={['Prepared by', 'Checked by', 'For S.K. Translines Pvt. Ltd. – Authorised signatory']} />
    </div>
  );
}

function DCDoc({ d }: { d: any }) {
  const db = getDB();
  const t = lookup.truck(db, d.truckId);
  const tr = lookup.trans(db, d.transporterId);
  const copy = (label: string) => (
    <div style={{ marginBottom: 14 }}>
      <Head title={`LORRY DELIVERY CHALLAN · ${label}`} no={d.dcNo} date={fmtDate(d.loadingDate)} right={<div style={{ fontSize: 10 }}>Rake No: <b>{d.rakeNo || '—'}</b></div>} />
      <table><tbody>
        <tr><th>Branch</th><td>{lookup.branch(db, d.branchId)?.name}</td><th>Source</th><td>{lookup.cityName(db, d.sourceCity)}</td><th>Destination</th><td>{lookup.cityName(db, d.destCity)}</td></tr>
        <tr><th>Vehicle no.</th><td style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{t?.number}</td><th>Truck type (capacity)</th><td>{d.capacity}</td><th>Unload addr.</th><td>{d.deliveryAddress}</td></tr>
        <tr><th>Owner name</th><td>{tr?.name}</td><th>Owner addr.</th><td>{tr?.address}</td><th>Contact no.</th><td>{tr?.mobile}</td></tr>
        <tr><th>Driver</th><td>{d.driverName}</td><th>Driver mob.</th><td>{d.mobile}</td><th>Supervisor</th><td>{lookup.labour(db, d.supervisorId)}</td></tr>
        <tr><th>Engine no.</th><td>{t?.engine}</td><th>Chassis no.</th><td>{t?.chassis}</td><th>Pay mode</th><td>{d.paymentMode}</td></tr>
        <tr><th>Loading</th><td>{fmtDate(d.loadingDate)} {d.loadingTime}</td><th>Freight</th><td>{inr(d.freight)}</td><th>Advance</th><td>{inr(d.advance)}</td></tr>
      </tbody></table>
      <table style={{ marginTop: 6 }}><thead><tr><th>LR no.</th><th>Consignee</th><th>Item</th><th>VP no.</th><th className="r">Qty</th></tr></thead><tbody>
        {d.items.map((it: any, k: number) => { const l = db.lrs.find((x: any) => x.id === it.lrId); return <tr key={k}><td>{l?.lrNo}</td><td>{lookup.custName(db, l?.consigneeId)}</td><td>{l?.items[it.idx]?.name}</td><td>{it.vpNo}</td><td className="r">{num(it.qty)}</td></tr>; })}
      </tbody></table>
      <div style={{ fontSize: 9.5, marginTop: 6 }}>Truck driver & owner will be liable if other goods are loaded which are not mentioned in our lorry challan & consignment. Note: No risk for unload on Sunday & holiday. Payment hours 1 PM to 5 PM; no payment on Sunday & holiday. Truckers should take in-time & date and unload date with seal & sign for detention purpose, otherwise no detention charge will be paid.</div>
      <Sig labels={['Signature of owner/driver', 'Signature of guarantor', 'Signature of issuing officer']} />
    </div>
  );
  return <div>{copy('ORIGINAL')}<div style={{ borderTop: '1px dashed #999', margin: '6px 0 12px' }} />{copy('DUPLICATE')}</div>;
}

function GRNDoc({ g }: { g: any }) {
  const db = getDB();
  const l = db.lrs.find((x: any) => x.id === g.lrId);
  return (
    <div>
      <Head title="GOODS RECEIVED NOTE" no={g.grnNo} date={fmtDate(g.inDate)} />
      <table><tbody>
        <tr><th>Vehicle no.</th><td>{lookup.truckNo(db, l?.truckId)}</td><th>LR no.</th><td>{l?.lrNo}</td><th>LR date</th><td>{fmtDate(l?.placeDate)}</td></tr>
        <tr><th>Consignor</th><td>{lookup.custName(db, l?.consignorId)}</td><th>Consignee</th><td>{lookup.custName(db, l?.consigneeId)}</td><th>Gate</th><td>{g.gateNo}</td></tr>
        <tr><th>Source</th><td>{l?.source}</td><th>Destination</th><td>{l?.destination}</td><th>Unloading</th><td>{g.unloadingTime}</td></tr>
        <tr><th>In</th><td>{fmtDate(g.inDate)} {g.inTime}</td><th>Out</th><td>{fmtDate(g.outDate)} {g.outTime}</td><th>Damage by</th><td>{g.damageBy}</td></tr>
      </tbody></table>
      <table style={{ marginTop: 6 }}><thead><tr><th>LR items</th><th className="r">Total</th><th className="r">Received</th><th className="r">Damage</th><th className="r">Pending</th></tr></thead><tbody>{g.items.map((it: any, k: number) => <tr key={k}><td>{l?.items[it.idx]?.name}</td><td className="r">{it.total}</td><td className="r">{it.received}</td><td className="r">{it.damage}</td><td className="r">{it.pending}</td></tr>)}</tbody></table>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
        <table><tbody>
          <tr><th colSpan={2}>Freight & detention</th></tr>
          <tr><td>Total freight</td><td className="r">{inr(g.totalFreight)}</td></tr><tr><td>Detention ({g.detentionDays} days)</td><td className="r">{inr(g.detentionAmt)}</td></tr><tr><td>Gross total</td><td className="r">{inr(g.gross)}</td></tr>
          <tr><td>Less: Advance</td><td className="r">{inr(g.less.advance)}</td></tr><tr><td>Less: TDS</td><td className="r">{inr(g.less.tds)}</td></tr><tr><td>Less: Damages</td><td className="r">{inr(g.less.damage)}</td></tr><tr><td>Less: Hamali</td><td className="r">{inr(g.less.hamali)}</td></tr><tr><td>Less: Printing & stationery</td><td className="r">{inr(g.less.stationery)}</td></tr>
          <tr><th>Net freight</th><th className="r">{inr(g.net)}</th></tr>
        </tbody></table>
        <table><tbody>
          <tr><th>Documents</th><th>Yes/No</th><th>Remark</th></tr>
          {[['LR copy', 'lrCopy'], ['Invoice no.', 'invoice'], ['Way bill', 'wayBill'], ['Seal no.', 'seal'], ['Kata receipt', 'kata']].map(([n, k]) => <tr key={k}><td>{n}</td><td>{g.docs[k].ok ? 'Yes' : 'No'}</td><td>{g.docs[k].rmk}</td></tr>)}
          <tr><td>No. of labour</td><td colSpan={2}>{g.labourCount}</td></tr><tr><td>Labour charge</td><td colSpan={2}>{inr(g.labourCharge)}</td></tr><tr><td>Labour name</td><td colSpan={2}>{lookup.labour(db, g.labourId)}</td></tr><tr><td>Supervisor</td><td colSpan={2}>{lookup.labour(db, g.supervisorId)}</td></tr>
        </tbody></table>
      </div>
      <div style={{ fontSize: 9.5, marginTop: 6 }}>Note: गाडी भाडा मिलने का समय ३.०० से ७.०० तक. काटा पावती, रोड परमिट, पॅन कार्ड, आर.सी.बुक इसके सिवा भाडा नही मिलेगा.</div>
      <Sig labels={['Signature (labour)', 'Signature (unloading supervisor)']} />
    </div>
  );
}

function JobCardDoc({ j, gate }: { j: any; gate?: boolean }) {
  const db = getDB();
  return (
    <div>
      <Head title={gate ? 'GATE PASS – WORKSHOP' : 'REPAIR ORDER / JOB CARD'} no={j.no} date={fmtDate(j.inDate)} right={<div style={{ fontSize: 10 }}>({j.truckStatus})</div>} />
      <table><tbody><tr><th>Vehicle no.</th><td>{lookup.truckNo(db, j.truckId)}</td><th>Driver</th><td>{lookup.driverName(db, j.driverId)}</td><th>Opening KM</th><td>{num(j.openingKm)}</td></tr><tr><th>In date-time</th><td>{fmtDate(j.inDate)} {j.inTime}</td><th>Out date-time</th><td>{j.outDate ? `${fmtDate(j.outDate)} ${j.outTime}` : '—'}</td><th>Complaint</th><td>{j.remark}</td></tr></tbody></table>
      {!gate && <>
        <table style={{ marginTop: 6 }}><thead><tr><th>Part</th><th>Batch</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th><th>Mechanic</th><th>Disposal</th></tr></thead><tbody>{j.parts.map((p: any, k: number) => <tr key={k}><td>{lookup.spare(db, p.spareId)?.name}</td><td>{p.batch}</td><td className="r">{p.qty}</td><td className="r">{num(p.rate)}</td><td className="r">{num(p.qty * p.rate)}</td><td>{lookup.labour(db, p.mechanicId)}</td><td>{p.disposal}</td></tr>)}</tbody></table>
        <table style={{ marginTop: 6 }}><thead><tr><th>Service</th><th>Service provider</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead><tbody>{j.services.map((p: any, k: number) => <tr key={k}><td>{lookup.spare(db, p.spareId)?.name}</td><td>{lookup.supplier(db, p.supplierId)}</td><td className="r">{p.qty}</td><td className="r">{num(p.qty * p.rate)}</td></tr>)}<tr><th colSpan={3}>Total estimate</th><th className="r">{inr(j.net)}</th></tr></tbody></table>
      </>}
      {gate && <div style={{ margin: '14px 0', fontSize: 12 }}>Vehicle <b>{lookup.truckNo(db, j.truckId)}</b> is permitted to leave the workshop after completion of job card <b>{j.no}</b>. Parts replaced: {j.parts.map((p: any) => lookup.spare(db, p.spareId)?.name).join(', ') || '—'}.</div>}
      <Sig labels={['Prepared by', 'Checked by', 'Authorised signatory']} />
    </div>
  );
}

function SimpleDoc({ title, no, date, rows, table, total, sig, note }: any) {
  return (
    <div>
      <Head title={title} no={no} date={date} />
      {rows && <table><tbody>{rows.map((r: any[], k: number) => <tr key={k}>{r.map((c, i) => (i % 2 === 0 ? <th key={i}>{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody></table>}
      {table && <table style={{ marginTop: 6 }}><thead><tr>{table.head.map((h: string) => <th key={h} className={/amt|amount|rate|qty|freight|₹|km|total|net|tds/i.test(h) ? 'r' : ''}>{h}</th>)}</tr></thead><tbody>{table.rows.map((r: any[], k: number) => <tr key={k}>{r.map((c, i) => <td key={i} className={typeof c === 'number' ? 'r' : ''}>{typeof c === 'number' ? num(c) : c}</td>)}</tr>)}</tbody></table>}
      {total !== undefined && <div style={{ marginTop: 8, fontSize: 12, textAlign: 'right' }}>Total: <b>{inr(total)}</b><div style={{ fontSize: 10.5 }}>Rupees {toWords(total)} only</div></div>}
      {note && <div style={{ fontSize: 9.5, marginTop: 8 }}>{note}</div>}
      <Sig labels={sig || ['Prepared by', 'Checked by', 'Authorised signatory']} />
    </div>
  );
}

export function renderDoc(doc: string, id: string, variant?: string) {
  const db = getDB();
  const f = (coll: string) => (db as any)[coll].find((x: any) => x.id === id);
  switch (doc) {
    case 'lr': return <LRDoc l={f('lrs')} preprint={variant === 'preprint'} />;
    case 'lr-preprint': return <LRDoc l={f('lrs')} preprint />;
    case 'freight': { const l = f('lrs'); return <SimpleDoc title="FREIGHT SLIP" no={l.lrNo} date={fmtDate(l.placeDate)} rows={[['Consignor', lookup.custName(db, l.consignorId), 'Consignee', lookup.custName(db, l.consigneeId)], ['From', l.source, 'To', l.destination], ['Truck', lookup.truckNo(db, l.truckId), 'Transporter', l.transporterId ? lookup.transName(db, l.transporterId) : 'Own vehicle']]} table={{ head: ['Head', 'Amount (₹)'], rows: l.mkt ? [['Lorry freight', l.mkt.freight], ['Hamali', l.mkt.hamali], ['Advance paid', l.mkt.advance], ['TDS', l.mkt.tds], ['Commission', l.mkt.commission], ['Net balance freight', l.mkt.net]] : [['Client freight', l.freight], ['Trip advance', db.trips.find((t: any) => t.id === l.tripId)?.advance || 0]] }} total={l.mkt ? l.mkt.net : l.freight} sig={['Truck owner / driver', 'Booking clerk', 'Branch manager']} />; }
    case 'barcode': { const l = f('lrs'); return <div><Head title="CONSIGNMENT LABELS" no={l.lrNo} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{Array.from({ length: 8 }, (_, k) => <div key={k} style={{ border: '1px solid #1a1726', padding: 8 }}><div style={{ fontSize: 10, fontWeight: 700 }}>S.K. TRANSLINES · {l.source} → {l.destination}</div><Barcode value={l.lrNo.replace(/\//g, '').replace('SKT', '')} /><div style={{ fontSize: 10 }}>Pkg {k + 1} of {l.packages} · {lookup.custName(db, l.consigneeId)}</div></div>)}</div></div>; }
    case 'ack': { const l = f('lrs'); const a = l.ack || {}; return <SimpleDoc title="ACKNOWLEDGMENT" no={l.lrNo} date={fmtDate(a.receivedDate)} rows={[['Client', lookup.custName(db, l.consignorId), 'Consignee', lookup.custName(db, l.consigneeId)], ['Delivered on', fmtDate(l.delivery?.date), 'Received at office', `${fmtDate(a.receivedDate)} ${a.receivedTime || ''}`], ['Courier', `${a.courier || '—'} ${a.docket || ''}`, 'Courier charge', inr(a.courierCharge)], ['Detention', `${a.detentionDays || 0} day(s) · ${inr(a.detentionAmt)}`, 'Damage amount', inr(a.damageAmt)]]} table={{ head: ['Item', 'Total qty', 'Received', 'Damage'], rows: l.items.map((it: any) => [it.name, it.qty, it.qty - (it.damage || 0), it.damage || 0]) }} note={a.remark} sig={['Consignee seal & sign', 'Received by (SKT)']} />; }
    case 'dc': return <DCDoc d={f('dcs')} />;
    case 'grn': return <GRNDoc g={f('grns')} />;
    case 'bill': return <BillDoc b={f('bills')} />;
    case 'supplementary': return <BillDoc b={f('bills')} supp />;
    case 'jobcard': return <JobCardDoc j={f('jobcards')} />;
    case 'gatepass': return <JobCardDoc j={f('jobcards')} gate />;
    case 'rpgatepass': { const r = f('replacements'); return <SimpleDoc title="REPLACEMENT GATE PASS" no={r.no} date={fmtDate(r.date)} rows={[['Supplier', lookup.supplier(db, r.supplierId), 'Type', r.payable ? 'Payable' : 'Free (warranty)']]} table={{ head: ['Part', 'Batch', 'Qty'], rows: r.items.map((it: any) => [lookup.spare(db, it.spareId)?.name, it.batch, it.qty]) }} note={r.remark} sig={['Store keeper', 'Security', 'Authorised signatory']} />; }
    case 'po': { const p = f('pos'); return <SimpleDoc title="PURCHASE ORDER" no={p.no} date={fmtDate(p.date)} rows={[['Supplier', lookup.supplier(db, p.supplierId), 'Status', p.status], ['Approved by', p.approvedBy || 'Pending', 'Remark', p.remark || '—']]} table={{ head: ['Part', 'Qty', 'Rate', 'Amount'], rows: p.items.map((it: any) => [lookup.spare(db, it.spareId)?.name, it.qty, it.rate, it.qty * it.rate]) }} total={p.net} note="Please supply the above parts with invoice quoting this PO number. Goods subject to inspection at Jalgaon workshop." />; }
    case 'payslip': { const s = f('tpSlips'); return <SimpleDoc title="TRANSPORTER PAYMENT SLIP" no={s.slipNo} date={fmtDate(s.date)} rows={[['Transporter', lookup.transName(db, s.transporterId), 'Status', s.status], ['PAN', lookup.trans(db, s.transporterId)?.pan, 'Approved by', s.approvedBy || '—']]} table={{ head: ['LR no.', 'Truck', 'Freight', 'Detention', 'Advance', 'Hamali', 'Commission', 'TDS', 'Damage', 'Stationery', 'Balance'], rows: s.rows.map((r: any) => { const l = db.lrs.find((x: any) => x.id === r.lrId); return [l?.lrNo, lookup.truckNo(db, l?.truckId), r.freight, r.detention, r.advance, r.hamali, r.commission, r.tds, r.damage, r.stationery, r.balance]; }) }} total={s.payable} sig={['Prepared by', 'Accounts', 'Transporter signature']} />; }
    case 'dcpayslip': { const s = f('dcPayslips'); return <SimpleDoc title="DC PAYMENT SLIP" no={s.no} date={fmtDate(s.date)} rows={[['Transporter / broker', lookup.transName(db, s.transporterId), 'TDS', inr(s.tdsAmt)]]} table={{ head: ['Challan no.', 'Truck', 'Freight payable'], rows: s.dcIds.map((x: string) => { const d = db.dcs.find((y: any) => y.id === x); return [d?.dcNo, lookup.truckNo(db, d?.truckId), d?.approval?.payable || 0]; }) }} total={s.net} />; }
    case 'tripadvance': { const t = f('trips'); return <SimpleDoc title="TRIP ADVANCE VOUCHER" no={t.name} date={fmtDate(t.startDate)} rows={[['Truck', lookup.truckNo(db, t.truckId), 'Driver', lookup.driverName(db, t.driverId)], ['From', lookup.cityName(db, t.fromCity), 'To', lookup.cityName(db, t.toCity)], ['Opening KM', num(t.openingKm), 'Payment', `${t.payType} · ${lookup.ledgerName(db, t.paidBy)}`]]} total={t.advance} sig={['Driver signature', 'Cashier', 'Fleet coordinator']} />; }
    case 'diesel': { const t = f('trips'); const e = db.tripExpenses.filter((x: any) => x.tripId === t.id && isDiesel(db, x.typeId)); return <SimpleDoc title="DIESEL EXPENSE SLIP" no={t.name} date={fmtDate(t.startDate)} rows={[['Truck', lookup.truckNo(db, t.truckId), 'Driver', lookup.driverName(db, t.driverId)]]} table={{ head: ['Date', 'Pump', 'Card', 'Qty (L)', 'Rate', 'Amount'], rows: e.map((x: any) => [fmtDate(x.date), db.pumps.find((p: any) => p.id === x.pumpId)?.name, lookup.ledgerName(db, x.cardNo), x.qty, x.rate, x.amount]) }} total={sum(e, (x: any) => x.amount)} sig={['Pump attendant', 'Driver', 'Fleet coordinator']} />; }
    case 'logslip': { const ls = f('logslips'); const trips = db.trips.filter((t: any) => ls.tripIds.includes(t.id)); const ex = db.tripExpenses.filter((e: any) => ls.tripIds.includes(e.tripId)); const km = ls.closingKm - ls.openingKm; const dq = sum(ex.filter((e: any) => isDiesel(db, e.typeId)), (e: any) => e.qty); return <SimpleDoc title="LOG SLIP" no={ls.no} date={fmtDate(ls.date)} rows={[['Truck', lookup.truckNo(db, ls.truckId), 'Driver', lookup.driverName(db, ls.driverId)], ['Opening KM', num(ls.openingKm), 'Closing KM', num(ls.closingKm)], ['Total KM', num(km), 'Diesel', `${num(dq)} L · avg ${dq ? (km / dq).toFixed(2) : '—'} km/l`], ['Period', `${fmtDate(ls.startDate)} – ${fmtDate(ls.endDate)}`, 'Previous diesel', `${ls.prevDieselQty} L`]]} table={{ head: ['Trip', 'From', 'To', 'Start', 'End', 'KM', 'Advance', 'Freight'], rows: trips.map((t: any) => [t.name, lookup.cityName(db, t.fromCity), lookup.cityName(db, t.toCity), fmtDate(t.startDate), fmtDate(t.endDate), t.closingKm - t.openingKm, t.advance, t.onwardFreight]) }} total={sum(ex, (e: any) => e.amount)} note="Total = trip expenses booked against this log slip (diesel, toll, bhatta, misc)." />; }
    case 'loadsummary': { const s = f('schedules'); const rows = s.loads.map((ld: any) => { const l = db.lrs.find((x: any) => x.id === ld.lrId); return [ld.vpNo, lookup.wagon(db, ld.wagonId), l?.lrNo, lookup.cust(db, l?.consignorId)?.short, l?.items[0]?.name, sum(ld.items, (i: any) => i.qty), ld.gateNo]; }); return <SimpleDoc title={(variant || 'VP LOADING SUMMARY').toUpperCase()} no={s.rakeNo} date={fmtDate(s.date)} rows={[['Schedule', s.title, 'Route', `${s.sourceId} → ${s.destId}`], ['Wagons', s.wagons.map((w: any) => `${lookup.wagon(db, w.wagonId)} × ${w.count}`).join(', '), 'Space utilisation', s.plan ? `${s.plan.utilisation}% (weight ${s.plan.weightUtil}%)` : 'Plan not run']]} table={{ head: ['VP no.', 'Wagon', 'LR', 'Client', 'Item', 'Qty', 'Gate'], rows }} sig={['Loading supervisor', 'Rail head in-charge', 'Operations head']} note={variant === 'Loading Diagram' ? 'Stacking rule: higher stack value at bottom; upright cartons max 2 layers; no top loading on frost-free refrigerators.' : undefined} />; }
    case 'maintenance': { const c = f('checklists'); return <SimpleDoc title="TRUCK MAINTENANCE CHECK LIST" no={c.no} date={fmtDate(c.date)} rows={[['Truck', lookup.truckNo(db, c.truckId), 'Driver', lookup.driverName(db, c.driverId)], ['Opening KM', num(c.openingKm), 'Job card', c.jobCardNo || '—']]} table={{ head: ['Check point', 'OK', 'Status', 'Action', 'Remark'], rows: c.items.map((i: any) => [i.particular, i.ok ? '✓' : '✗', i.status, i.action, i.remark]) }} sig={[`Prepared by ${c.preparedBy}`, `Checked by ${c.checkedBy}`, `Authorised by ${c.authorisedBy}`]} />; }
    case 'hamali': { const h = f('hamaliPayments'); return <SimpleDoc title="HAMALI PAYMENT SLIP" no={h.no} date={fmtDate(h.date)} rows={[['Hamal / labour', lookup.labour(db, h.labourId), 'Type', h.type === 'GRN' ? 'Jalgaon station unloading' : h.type === 'DGRN' ? 'Branch station unloading' : 'VP loading'], ['Total hamali', inr(h.total), 'TDS', `${h.tdsPer}% · ${inr(h.tdsAmt)}`]]} total={h.net} sig={['Hamal signature', 'Supervisor', 'Accounts']} />; }
    case 'voucher': { const e = f('ledger'); return <SimpleDoc title={`${(e.voucherType || 'Ledger').toUpperCase()} VOUCHER`} no={e.voucherNo} date={fmtDate(e.date)} rows={[['Ledger', e.ledgerName, 'Party type', e.party], ['Particular', e.particular, 'Reference', `${e.refType} ${e.refNo || ''}`]]} table={{ head: ['Debit (₹)', 'Credit (₹)'], rows: [[e.debit, e.credit]] }} total={e.debit || e.credit} />; }
    default: return <div>Unknown document</div>;
  }
}

function saveDoc(label: string, id: string) {
  const paper = document.querySelector('[aria-label="Print preview"] .paper');
  let css = '';
  for (const sh of Array.from(document.styleSheets)) { try { css += Array.from(sh.cssRules).map((r) => r.cssText).join('\n'); } catch { /* cross-origin */ } }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${label} ${id}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>${css}\nbody{background:#eee;padding:24px 0}.paper{margin:0 auto}@media print{body{background:#fff;padding:0}}</style></head><body data-theme="light">${paper ? paper.outerHTML : ''}</body></html>`;
  return saveFile(`SKT_${label.replace(/[^\w]+/g, '_')}_${String(id || '').replace(/[^\w-]+/g, '_')}.html`, paper ? html : '', 'text/html');
}

export function PrintHost() {
  const p = useUI((s) => s.print);
  const close = useUI((s) => s.closePrint);
  const toast = useUI((s) => s.toast);
  useDB();
  const [zoom, setZoom] = useState(1);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => { const r = () => setVw(window.innerWidth); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);
  useEffect(() => { if (!p) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [p, close]);
  if (!p) return null;
  const meta = PRINT_DOCS.find((d) => d.key === p.doc || (p.doc === 'lr' && p.variant === 'preprint' && d.key === 'lr-preprint'));
  const fit = Math.min(1, (vw - 24) / 794);
  const scale = fit * zoom;
  let body: React.ReactNode;
  try { body = renderDoc(p.doc, p.id, p.variant); } catch { body = <div>Document data not available.</div>; }
  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[rgb(var(--side))]" role="dialog" aria-modal="true" aria-label="Print preview">
      <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5 pt-[calc(env(safe-area-inset-top,0px)+10px)] text-white border-b border-white/10">
        <div className="min-w-0 flex-1"><div className="font-semibold text-[14px] truncate">{meta?.label || 'Print preview'}{p.variant && p.variant !== 'preprint' ? ` · ${p.variant}` : ''}</div><div className="text-[11px] text-white/60 truncate">A4 · legacy {meta?.legacy}</div></div>
        <button className="btn-icon text-white/80 hover:text-white hover:bg-white/10 hidden sm:inline-flex" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} aria-label="Zoom out"><ZoomOut size={16} /></button>
        <button className="btn-icon text-white/80 hover:text-white hover:bg-white/10 hidden sm:inline-flex" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} aria-label="Zoom in"><ZoomIn size={16} /></button>
        <button className="btn h-8 px-2.5 text-white/90 hover:bg-white/10" onClick={() => toast('Emailed as PDF', 'ok', 'Simulated – sent to the party on record')}><Mail size={15} /><span className="hidden sm:inline">Email</span></button>
        <button className="btn h-8 px-2.5 text-white/90 hover:bg-white/10" title="Save a printable copy (open it and print or save as PDF)" onClick={() => saveDoc(meta?.label || 'document', p.id).then((o) => { const [t, tone] = saveMsg(o, 'Printable copy saved'); toast(t, tone, o === 'saved' ? 'Open the .html file and print or save as PDF' : undefined); })}><Download size={15} /><span className="hidden sm:inline">Download</span></button>
        <button className="btn-primary h-8" onClick={() => { try { window.print(); } catch { /* */ } toast('Sent to printer', 'info', 'If no dialog opens, printing is disabled in this preview window'); }}><Printer size={15} /><span className="hidden sm:inline">Print</span></button>
        <button className="btn-icon text-white/80 hover:text-white hover:bg-white/10" onClick={close} aria-label="Close preview"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-auto py-5">
        <div className="w-fit mx-auto" style={{ zoom: scale } as any}>
          <div className="paper">{body}</div>
        </div>
      </div>
    </div>
  );
}
