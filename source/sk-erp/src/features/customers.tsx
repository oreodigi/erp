import React, { useState , useMemo } from 'react';
import { useDB, useUI, A, lookup, outstanding, isTruckUnit } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Stat, EmptyState, Tabs, Progress, Segmented, Avatar } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Modal, Timeline } from '../components/overlays';
import { CrudPage, EntityForm, EntityDef, DEFS } from './masters';
import { fmtDate, fmtDT, ymd, sum, inr, num, cls, daysBetween, compactINR, addDays, ago, now , groupBy } from '../lib/util';
import { Plus, Building2, Upload, Pencil, Eye, Trash2, Table2, History, LifeBuoy, Send, CheckCircle2, FileSpreadsheet, AlertTriangle } from 'lucide-react';

const CUST_DEF: EntityDef = { key: 'customer', coll: 'customers', title: 'Customers', singular: 'Customer', group: 'Parties', legacy: ['MasterPages/CustomerDetail'], desc: '', record: 'customer', defaults: () => ({ creditDays: 30, creditLimit: 1000000, interest: 18, tds: 2, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, shipper: true }),
  fields: [
    { k: 'name', l: 'Customer name', req: true, section: 'Company' }, { k: 'short', l: 'Short name', req: true, section: 'Company' }, { k: 'pan', l: 'Customer PAN', section: 'Company' }, { k: 'gst', l: 'GST no.', section: 'Company' }, { k: 'address', l: 'Address', t: 'textarea', span: 2, section: 'Company' }, { k: 'city', l: 'City', t: 'select', opts: (db) => db.cities.map((c: any) => ({ value: c.id, label: c.name })), req: true, section: 'Company' }, { k: 'website', l: 'Company website', section: 'Company' }, { k: 'cst', l: 'CST no.', section: 'Company' }, { k: 'bst', l: 'BST no.', section: 'Company' }, { k: 'vat', l: 'VAT no.', section: 'Company' },
    { k: 'contact', l: 'Contact name', section: 'Contacts' }, { k: 'phone', l: 'Contact phone', section: 'Contacts' }, { k: 'contactPerson', l: 'Company contact person', section: 'Contacts' }, { k: 'contactMobile', l: 'Company contact mobile', section: 'Contacts' }, { k: 'email', l: 'Primary email', t: 'email', section: 'Contacts' }, { k: 'secondaryEmail', l: 'Secondary email', t: 'email', section: 'Contacts' }, { k: 'billingEmail', l: 'Billing email', t: 'email', section: 'Contacts' }, { k: 'notiEmail', l: 'Notification email', t: 'email', section: 'Contacts' },
    { k: 'creditDays', l: 'Credit days', t: 'number', section: 'Credit & billing' }, { k: 'creditLimit', l: 'Credit limit (₹)', t: 'number', section: 'Credit & billing' }, { k: 'interest', l: 'Interest rate for late payment (%)', t: 'number', section: 'Credit & billing' }, { k: 'tds', l: 'Our TDS deduction rate (%)', t: 'number', section: 'Credit & billing' },
    { k: 'billFormat', l: 'Bill format', t: 'select', opts: ['Standard Format A', 'Standard Fromat B', 'Godrej Bill Format', 'Reliance Bill Format', 'Whirlpool Bill Format', 'Hier Bill Format', 'LG Bill Format', 'Samsonite Bill Format'], section: 'Credit & billing' }, { k: 'lrFormat', l: 'LR format', t: 'select', opts: ['Standard Format A', 'Reliance'], section: 'Credit & billing' },
    { k: 'billWithoutAck', l: 'Allow bill without acknowledgment', t: 'bool', section: 'Credit & billing' }, { k: 'detentionBill', l: 'Detention bill', t: 'bool', section: 'Credit & billing' }, { k: 'disallowLR', l: 'Disallow new LR booking (credit hold)', t: 'bool', section: 'Credit & billing' }, { k: 'portal', l: 'Customer portal account created', t: 'bool', section: 'Credit & billing' },
  ], cols: () => [] };

export function Customer360() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord } = useUI.getState();
  const [form, setForm] = useState<any>(params.edit ? db.customers.find((c: any) => c.id === params.edit) : null);
  const [imp, setImp] = useState(false);
  const rows = useMemo(() => {
    const lrBy = groupBy(db.lrs, (l: any) => l.consignorId);
    const osBy: Record<string, number> = {};
    for (const b of db.bills) if (!b.deleted) osBy[b.clientId] = (osBy[b.clientId] || 0) + (b.pending || 0);
    return db.customers.map((c: any) => { const lrs = lrBy[c.id] || []; const os = osBy[c.id] || 0; return { ...c, lrs: lrs.length, rev90: sum(lrs.filter((l: any) => daysBetween(l.placeDate) <= 90), (l: any) => l.freight), os, util: c.creditLimit > 0 ? (os / c.creditLimit) * 100 : 0, active: lrs.filter((l: any) => !['Delivered', 'Cancelled'].includes(l.status) && l.isFinal).length, lastLR: lrs.map((l: any) => l.placeDate).sort().pop() }; });
  }, [db]);
  return (
    <div>
      <PageHeader eyebrow="Customers" title="Customer 360" subtitle="Every shipper and consignee with live consignments, revenue, outstanding against credit limit, contracts and support history." actions={<><button className="btn-ghost" onClick={() => setImp(true)}><Upload size={15} /> Import customers</button><button className="btn-primary" onClick={() => setForm({})}><Plus size={15} /> Add customer</button></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Active customers (90d)" value={rows.filter((r: any) => r.rev90 > 0).length} icon={Building2} />
        <KPI label="Revenue (90d)" value={compactINR(sum(rows, (r: any) => r.rev90))} tone="ok" />
        <KPI label="Outstanding" value={compactINR(sum(rows, (r: any) => r.os))} tone="brand" />
        <KPI label="On credit hold" value={rows.filter((r: any) => r.disallowLR).length} icon={AlertTriangle} tone="bad" />
      </div>
      <DataTable id="customers" rows={rows} initialSort={{ key: 'lrs', dir: -1 }} onRow={(r) => openRecord('customer', r.id)} quickFilters={[{ key: 's', label: 'Shippers', fn: (r: any) => r.shipper }, { key: 'c', label: 'Consignees', fn: (r: any) => !r.shipper }, { key: 'h', label: 'Credit hold', fn: (r: any) => r.disallowLR }, { key: 'o', label: 'Over 80% limit', fn: (r: any) => r.util > 80 }]} cols={[
        { key: 'name', label: 'Name', mobile: 'title', render: (r) => <span className="flex items-center gap-2.5"><Avatar name={r.short} size={26} /><span><span className="block font-medium">{r.name}</span><span className="block text-[11px] text-muted">{r.short}</span></span></span> },
        { key: 'city', label: 'City', value: (r) => lookup.cityName(db, r.city), filter: true, mobile: 'sub' }, { key: 'state', label: 'State', value: (r) => lookup.city(db, r.city)?.state, filter: true, hidden: true },
        { key: 'gst', label: 'GST no.', render: (r) => <span className="docno">{r.gst}</span>, hidden: true }, { key: 'contact', label: 'Contact', hidden: true }, { key: 'phone', label: 'Phone', hidden: true },
        { key: 'lrs', label: 'LRs', align: 'right' }, { key: 'active', label: 'In motion', align: 'right' }, { key: 'rev90', label: 'Revenue 90d', align: 'right', render: (r) => compactINR(r.rev90), mobile: 'right' },
        { key: 'os', label: 'Outstanding', align: 'right', render: (r) => inr(r.os) }, { key: 'util', label: 'Credit used', render: (r) => <div className="w-20"><Progress value={r.util} tone={r.util > 80 ? 'bad' : 'violet'} /></div> },
        { key: 'billFormat', label: 'Bill format', filter: true, hidden: true }, { key: 'st', label: 'Status', value: (r) => (r.disallowLR ? 'Credit hold' : 'Active'), render: (r) => <StatusBadge s={r.disallowLR ? 'Credit hold' : 'Active'} tone={r.disallowLR ? 'bad' : 'ok'} />, filter: true, mobile: 'meta' },
      ]} rowActions={(r: any) => [{ label: 'Open 360', icon: Eye, onClick: () => openRecord('customer', r.id) }, { label: 'Edit', icon: Pencil, onClick: () => setForm(r) }, { label: 'Delete', icon: Trash2, tone: 'bad', hidden: r.lrs > 0, onClick: () => A.remove('customers', r.id, 'Customer') }]} />
      {form && <EntityForm def={CUST_DEF} init={form} onClose={() => { setForm(null); useUI.getState().set({ params: {} }); }} />}
      {imp && <ImportModal title="Import customers" sample="CustomerName, ShortName, City, GSTNo, ContactName, ContactPhone, PrimaryEmail, CreditDays, CreditLimit" onClose={() => setImp(false)} onImport={(n) => { for (let i = 0; i < n; i++) A.save('customers', { name: `Imported Customer ${db.customers.length + i + 1}`, short: `IMP${i + 1}`, city: 'jalgaon', creditDays: 30, creditLimit: 500000, tds: 2, interest: 18, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', address: '', gst: '', email: '' }, 'Customer'); }} />}
    </div>
  );
}

export function ImportModal({ title, sample, onClose, onImport }: { title: string; sample: string; onClose: () => void; onImport: (n: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<string[][]>([]);
  const read = (f: File) => { setFile(f); if (/\.(csv|txt)$/i.test(f.name)) { const r = new FileReader(); r.onload = () => setRows(String(r.result).split(/\r?\n/).filter(Boolean).slice(0, 6).map((l) => l.split(','))); r.readAsText(f); } else setRows([sample.split(', '), ['(Excel preview available after upload in deployed app)']]); };
  return (
    <Modal open onClose={onClose} title={title} size="lg" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={!file} onClick={() => { const n = Math.max(1, rows.length - 1); onImport(Math.min(n, 3)); useUI.getState().toast(`Imported ${Math.min(n, 3)} records`, 'ok', file?.name); onClose(); }}><Upload size={15} /> Import</button></>}>
      <div className="grid gap-4">
        <label className="border-2 border-dashed border-line rounded-xl p-8 text-center cursor-pointer hover:border-violet/50 transition" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) read(f); }}>
          <FileSpreadsheet size={28} className="mx-auto text-violet" />
          <div className="font-semibold mt-2">{file ? file.name : 'Drop an Excel or CSV file, or click to browse'}</div>
          <div className="text-[12px] text-muted mt-1">Expected columns: {sample}</div>
          <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        </label>
        {rows.length > 0 && <div className="border border-line rounded-lg overflow-auto"><table className="w-full text-[12px]"><tbody>{rows.map((r, i) => <tr key={i} className={cls('border-b border-line', i === 0 && 'bg-surface2 font-semibold')}>{r.map((c, j) => <td key={j} className="px-2 py-1.5 whitespace-nowrap">{c}</td>)}</tr>)}</tbody></table></div>}
      </div>
    </Modal>
  );
}

export const Agreements = () => <CrudPage def={{ ...DEFS.agreement, title: 'Agreements', kpis: (db: any, rows: any[]) => <><KPI label="Agreements" value={rows.length} /><KPI label="Active" value={rows.filter((r: any) => r.expiry >= ymd()).length} tone="ok" /><KPI label="Expiring ≤ 30d" value={rows.filter((r: any) => r.expiry >= ymd() && daysBetween(ymd(), r.expiry) <= 30).length} tone="warn" /><KPI label="Committed trips" value={sum(rows, (r: any) => r.committedTrips)} /></> }} />;
export const TransporterRates = () => <CrudPage def={DEFS.transrate} />;
export const HamaliRates = () => <CrudPage def={DEFS.hamali} />;
export const Documents = () => <CrudPage def={DEFS.document} />;

export function RateContracts() {
  const db = useDB();
  const [tab, setTab] = useState('client');
  const [edit, setEdit] = useState<any>(null);
  const [own, setOwn] = useState<any>(null);
  const [matrixClient, setMatrixClient] = useState(() => (db.rateContracts.find((r: any) => r.customerId === 'c2') ? 'c2' : db.rateContracts[0]?.customerId || ''));
  return (
    <div>
      <PageHeader eyebrow="Customers" title="Rate contracts" subtitle="Client rate matrices by route, goods, unit and mode (with slab rates for weight units), own-vehicle dedicated rates, and the rate matrix report. Contract rates pre-fill freight on Generate LR." actions={<button className="btn-primary" onClick={() => (tab === 'own' ? setOwn({ customerId: '', from: ymd(), to: ymd(addDays(now(), 365)), remark: '', routes: [] }) : setEdit({ customerId: '', from: ymd(), to: ymd(addDays(now(), 365)), remark: '', routes: [], history: [] }))}><Plus size={15} /> New contract</button>} />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'client', label: 'Rate matrix contracts', count: db.rateContracts.length }, { key: 'own', label: 'Own vehicle rate contracts', count: db.ownRates.length }, { key: 'matrix', label: 'Client rate matrix report' }]} />
      {tab === 'client' && <DataTable id="rate-contracts" rows={db.rateContracts} onRow={(r) => setEdit(structuredClone(r))} cols={[{ key: 'c', label: 'Client', value: (r) => lookup.custName(db, r.customerId), mobile: 'title' }, { key: 'from', label: 'From date', render: (r) => fmtDate(r.from) }, { key: 'to', label: 'To date', render: (r) => fmtDate(r.to), mobile: 'sub' }, { key: 'routes', label: 'Routes', align: 'right', value: (r) => r.routes.length }, { key: 'remark', label: 'Remark' }, { key: 'st', label: 'Status', value: (r) => (r.to < ymd() ? 'Expired' : daysBetween(ymd(), r.to) <= 30 ? 'Expiring' : 'Active'), render: (r) => <StatusBadge s={r.to < ymd() ? 'Expired' : daysBetween(ymd(), r.to) <= 30 ? 'Expiring' : 'Active'} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Edit', icon: Pencil, onClick: () => setEdit(structuredClone(r)) }, { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => A.remove('rateContracts', r.id, 'Rate contract') }]} />}
      {tab === 'own' && <DataTable id="own-rates" rows={db.ownRates} onRow={(r) => setOwn(structuredClone(r))} cols={[{ key: 'c', label: 'Client', value: (r) => lookup.custName(db, r.customerId), mobile: 'title' }, { key: 'from', label: 'From date', render: (r) => fmtDate(r.from) }, { key: 'to', label: 'To date', render: (r) => fmtDate(r.to), mobile: 'sub' }, { key: 'routes', label: 'Routes', align: 'right', value: (r) => r.routes.length }, { key: 'remark', label: 'Remark' }]} rowActions={(r: any) => [{ label: 'Edit', icon: Pencil, onClick: () => setOwn(structuredClone(r)) }]} />}
      {tab === 'matrix' && <>
        <Card className="mb-4"><div className="grid sm:grid-cols-3 gap-3"><Field label="Client"><Select value={matrixClient} onChange={(e) => setMatrixClient(e.target.value)} options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} /></Field></div></Card>
        <DataTable id="rate-matrix" rows={db.rateContracts.filter((r: any) => r.customerId === matrixClient).flatMap((r: any) => r.routes.map((rt: any) => ({ ...rt, contract: r })))} cols={[{ key: 's', label: 'Source', value: (r) => lookup.cityName(db, r.source), mobile: 'title' }, { key: 'd', label: 'Destination', value: (r) => lookup.cityName(db, r.dest), mobile: 'sub' }, { key: 'g', label: 'Goods', value: (r) => lookup.goods(db, r.goodsId)?.name, filter: true }, { key: 'u', label: 'Unit', value: (r) => db.units.find((u: any) => u.id === r.unitId)?.name }, { key: 'mode', label: 'Mode', filter: true }, { key: 'rate', label: 'Rate', align: 'right', render: (r) => inr(r.rate), mobile: 'right' }, { key: 'stdDays', label: 'Del. days', align: 'right' }, { key: 'valid', label: 'Valid till', render: (r) => fmtDate(r.contract.to) }]} empty={<EmptyState icon={Table2} title="No contract for this client" />} />
      </>}
      {edit && <ContractEditor init={edit} onClose={() => setEdit(null)} />}
      {own && <OwnEditor init={own} onClose={() => setOwn(null)} />}
    </div>
  );
}
function ContractEditor({ init, onClose }: any) {
  const db = useDB();
  const [f, setF] = useState<any>(init);
  const [r, setR] = useState<any>({ source: 'jalgaon', dest: '', goodsId: '', mode: 'Road', unitId: (db.units.find((u: any) => isTruckUnit(db, u.id)) || db.units[0])?.id || '', rate: '', stdDays: 2, slabs: [] });
  const [slab, setSlab] = useState({ from: 0, to: 9, rate: '' });
  const unit = db.units.find((u: any) => u.id === r.unitId);
  const [q, setQ] = useState('');
  const routes = f.routes.filter((x: any) => !q || `${lookup.cityName(db, x.source)} ${lookup.cityName(db, x.dest)} ${lookup.goods(db, x.goodsId)?.name}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Drawer open onClose={onClose} title={f.id ? `Rate contract · ${lookup.custName(db, f.customerId)}` : 'New rate matrix contract'} subtitle="Legacy: MasterPages/RateContract.aspx" width="max-w-5xl" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.customerId || !f.routes.length) return useUI.getState().toast('Select client and add at least one route', 'bad'); A.save('rateContracts', { ...f, history: f.id ? [...(f.history || []), { at: now().toISOString(), routes: init.routes.length }] : [] }, 'Rate contract'); onClose(); }}>Save contract</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        <FormSection title="Contract" cols={4}>
          <Field label="Client" required className="col-span-2"><Select value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })} placeholder="Select" options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
          <Field label="From date"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="To date"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
          <Field label="Remark" className="col-span-2 lg:col-span-3"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
          <div className="flex items-end"><button className="btn-ghost w-full" onClick={() => { const old = db.rateContracts.find((x: any) => x.customerId === f.customerId && x.id !== f.id); if (!old) return useUI.getState().toast('No previous contract for this client', 'info'); setF({ ...f, routes: old.routes.map((x: any) => ({ ...x, id: x.id + 'n' })) }); useUI.getState().toast('Old contract routes copied', 'ok'); }}><History size={14} /> Get old contract</button></div>
        </FormSection>
        <FormSection title="Route details" cols={1}>
          <div className="grid grid-cols-2 lg:grid-cols-8 gap-2 items-end">
            <Field label="From city"><Select value={r.source} onChange={(e) => setR({ ...r, source: e.target.value })} options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="To city"><Select value={r.dest} onChange={(e) => setR({ ...r, dest: e.target.value })} placeholder="Select" options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="Item" className="lg:col-span-2"><Select value={r.goodsId} onChange={(e) => setR({ ...r, goodsId: e.target.value })} placeholder="Select" options={db.goods.map((g: any) => ({ value: g.id, label: g.name }))} /></Field>
            <Field label="Mode"><Select value={r.mode} onChange={(e) => setR({ ...r, mode: e.target.value })} options={['Road', 'Railway', 'Both']} /></Field>
            <Field label="Unit"><Select value={r.unitId} onChange={(e) => setR({ ...r, unitId: e.target.value, slabs: [] })} options={db.units.map((u: any) => ({ value: u.id, label: u.name }))} /></Field>
            <Field label="Rate"><Input type="number" value={r.rate} onChange={(e) => setR({ ...r, rate: e.target.value })} /></Field>
            <Field label="Std. days"><Input type="number" value={r.stdDays} onChange={(e) => setR({ ...r, stdDays: Number(e.target.value) })} /></Field>
          </div>
          {unit?.slab && <div className="rounded-lg border border-line p-3 bg-surface2"><div className="eyebrow mb-2">Slab rates ({unit.name})</div><div className="grid grid-cols-4 gap-2 items-end"><Field label="Range from"><Input type="number" value={slab.from} onChange={(e) => setSlab({ ...slab, from: Number(e.target.value) })} /></Field><Field label="Range to"><Input type="number" value={slab.to} onChange={(e) => setSlab({ ...slab, to: Number(e.target.value) })} /></Field><Field label="Rate"><Input type="number" value={slab.rate} onChange={(e) => setSlab({ ...slab, rate: e.target.value })} /></Field><button className="btn-ghost h-9" onClick={() => { setR({ ...r, slabs: [...r.slabs, { ...slab, rate: Number(slab.rate) }] }); setSlab({ from: slab.to, to: slab.to + 10, rate: '' }); }}>Add</button></div>{r.slabs.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{r.slabs.map((s: any, i: number) => <span key={i} className="chip bg-surface border border-line">{s.from}–{s.to}: ₹{s.rate}</span>)}</div>}</div>}
          <div className="flex justify-end"><button className="btn-violet" disabled={!r.dest || !r.goodsId || !r.rate} onClick={() => { setF({ ...f, routes: [...f.routes, { ...r, id: Math.random().toString(36).slice(2), rate: Number(r.rate) }] }); setR({ ...r, dest: '', rate: '', slabs: [] }); }}><Plus size={14} /> Add item</button></div>
          <div className="flex items-center gap-2"><Input placeholder="Search routes…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" /><span className="text-[12px] text-muted">{f.routes.length} routes</span></div>
          <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.5px] min-w-[640px]"><thead className="bg-surface2"><tr className="text-[10.5px] text-muted uppercase"><th className="text-left px-3 py-2">Source</th><th className="text-left px-2">Destination</th><th className="text-left px-2">Goods</th><th className="text-left px-2">Unit</th><th className="text-left px-2">Mode</th><th className="text-right px-2">Rate</th><th className="text-right px-2">Del. days</th><th className="w-9" /></tr></thead><tbody>{routes.map((x: any) => <tr key={x.id} className="border-t border-line"><td className="px-3 py-1.5">{lookup.cityName(db, x.source)}</td><td className="px-2">{lookup.cityName(db, x.dest)}</td><td className="px-2">{lookup.goods(db, x.goodsId)?.name}</td><td className="px-2">{db.units.find((u: any) => u.id === x.unitId)?.name}</td><td className="px-2">{x.mode}</td><td className="px-2 text-right"><input className="input h-7 w-24 text-right ml-auto" type="number" aria-label="Rate" value={x.rate} onChange={(e) => setF({ ...f, routes: f.routes.map((y: any) => (y.id === x.id ? { ...y, rate: Number(e.target.value) } : y)) })} /></td><td className="px-2 text-right tnum">{x.stdDays}</td><td className="pr-2"><button className="btn-icon h-7 w-7 hover:text-bad" aria-label="Delete route" onClick={() => setF({ ...f, routes: f.routes.filter((y: any) => y.id !== x.id) })}><Trash2 size={13} /></button></td></tr>)}</tbody></table></div>
          {(f.history || []).length > 0 && <div className="text-[12px] text-muted">Revision history: {f.history.map((h: any) => fmtDT(h.at)).join(' · ')}</div>}
        </FormSection>
      </div>
    </Drawer>
  );
}
function OwnEditor({ init, onClose }: any) {
  const db = useDB();
  const [f, setF] = useState<any>(init);
  const [r, setR] = useState<any>({ source: 'jalgaon', dest: '', truckType: 'High Cube', tyres: 10, rate: '' });
  return (
    <Drawer open onClose={onClose} title="Own vehicle rate contract" subtitle="Legacy: MasterPages/OwnVehicleRateContract.aspx" width="max-w-4xl" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.customerId) return; A.save('ownRates', f, 'Own vehicle contract'); onClose(); }}>Save</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Field label="Client" className="col-span-2"><Select value={f.customerId} onChange={(e) => setF({ ...f, customerId: e.target.value })} placeholder="Select" options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} /></Field><Field label="From date"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field><Field label="To date"><Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field><Field label="Remark" className="col-span-2 lg:col-span-4"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field></div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 items-end"><Field label="From city"><Select value={r.source} onChange={(e) => setR({ ...r, source: e.target.value })} options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field><Field label="To city"><Select value={r.dest} onChange={(e) => setR({ ...r, dest: e.target.value })} placeholder="Select" options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field><Field label="Truck type" className="col-span-2"><Radio options={['Low Cube', 'High Cube', 'Both']} value={r.truckType} onChange={(v) => setR({ ...r, truckType: v })} /></Field><Field label="Tyres"><Select value={String(r.tyres)} onChange={(e) => setR({ ...r, tyres: Number(e.target.value) })} options={['6', '10', '12', '14']} /></Field><Field label="Rate"><div className="flex gap-1"><Input type="number" value={r.rate} onChange={(e) => setR({ ...r, rate: e.target.value })} /><button className="btn-violet h-9 px-2" aria-label="Add route" disabled={!r.dest || !r.rate} onClick={() => { setF({ ...f, routes: [...f.routes, { ...r, id: Math.random().toString(36).slice(2), rate: Number(r.rate) }] }); setR({ ...r, dest: '', rate: '' }); }}><Plus size={14} /></button></div></Field></div>
        <div className="border border-line rounded-lg overflow-hidden"><table className="w-full text-[12.5px]"><thead className="bg-surface2"><tr className="text-[10.5px] text-muted uppercase"><th className="text-left px-3 py-2">Source</th><th className="text-left px-2">Destination</th><th className="text-left px-2">Truck type</th><th className="text-right px-2">Tyres</th><th className="text-right px-2">Rate</th><th className="w-9" /></tr></thead><tbody>{f.routes.map((x: any) => <tr key={x.id} className="border-t border-line"><td className="px-3 py-1.5">{lookup.cityName(db, x.source)}</td><td className="px-2">{lookup.cityName(db, x.dest)}</td><td className="px-2">{x.truckType}</td><td className="px-2 text-right">{x.tyres}</td><td className="px-2 text-right tnum">{inr(x.rate)}</td><td className="pr-2"><button className="btn-icon h-7 w-7 hover:text-bad" aria-label="Delete" onClick={() => setF({ ...f, routes: f.routes.filter((y: any) => y.id !== x.id) })}><Trash2 size={13} /></button></td></tr>)}</tbody></table></div>
      </div>
    </Drawer>
  );
}

export function Support() {
  const db = useDB();
  const [status, setStatus] = useState('Pending & In Progress');
  const [ticket, setTicket] = useState('');
  const list = db.complaints.filter((c: any) => status === 'All' || (status === 'Pending & In Progress' ? ['Pending', 'In Progress'].includes(c.status) : c.status === status)).filter((c: any) => !ticket || c.ticketNo.toLowerCase().includes(ticket.toLowerCase())).slice().reverse();
  const [sel, setSel] = useState<string>(list[0]?.id || '');
  const c = db.complaints.find((x: any) => x.id === sel);
  const [msg, setMsg] = useState('');
  const [close, setClose] = useState(false);
  const [st, setSt] = useState('');
  return (
    <div>
      <PageHeader eyebrow="Customers" title="Customer complaint support" subtitle="Tickets raised by customers on the portal: delays, damage, billing and POD queries. Replies are emailed to the customer." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Open tickets" value={db.complaints.filter((x: any) => !x.closed).length} icon={LifeBuoy} tone="warn" />
        <KPI label="High priority" value={db.complaints.filter((x: any) => !x.closed && x.priority === 'High').length} tone="bad" />
        <KPI label="Resolved" value={db.complaints.filter((x: any) => x.closed).length} tone="ok" />
        <KPI label="Avg age (open)" value={`${Math.round(sum(db.complaints.filter((x: any) => !x.closed), (x: any) => daysBetween(x.date)) / Math.max(1, db.complaints.filter((x: any) => !x.closed).length))} d`} />
      </div>
      <div className="grid lg:grid-cols-[380px_1fr] gap-4 items-start">
        <Card pad={false}>
          <div className="p-3 grid gap-2 border-b border-line"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={['All', 'Pending & In Progress', 'Pending', 'In Progress', 'Resolved']} aria-label="Status" /><Input placeholder="Ticket no." value={ticket} onChange={(e) => setTicket(e.target.value)} /></div>
          <ul className="divide-y divide-line max-h-[560px] overflow-auto">{list.map((x: any) => <li key={x.id}><button onClick={() => { setSel(x.id); setClose(false); setSt(''); }} className={cls('w-full text-left px-4 py-3 hover:bg-surface2', sel === x.id && 'bg-violet/[.06] shadow-[inset_3px_0_0_rgb(var(--brand))]')}><div className="flex justify-between gap-2"><span className="docno">{x.ticketNo}</span><StatusBadge s={x.status} /></div><div className="font-semibold text-[13px] mt-1">{lookup.custName(db, x.customerId)}</div><div className="text-[12px] text-muted line-clamp-2">{x.detail}</div><div className="flex gap-2 mt-1.5 text-[11px] text-faint"><StatusBadge s={x.priority} dot={false} /><span>{db.complaintCategories.find((k: any) => k.id === x.categoryId)?.name}</span><span>· {ago(x.date)}</span></div></button></li>)}</ul>
        </Card>
        {c ? <Card title={<span className="flex items-center gap-2"><DocNo>{c.ticketNo}</DocNo> · {lookup.custName(db, c.customerId)}</span>} subtitle={`${db.complaintCategories.find((k: any) => k.id === c.categoryId)?.name} · ${fmtDT(c.date)} · ${c.priority} priority`}>
          <div className="grid gap-4">
            <div className="rounded-xl bg-surface2 border border-line p-3.5"><div className="flex items-center gap-2 mb-1.5"><Avatar name={lookup.custName(db, c.customerId)} size={24} /><b className="text-[13px]">{lookup.custName(db, c.customerId)}</b><span className="text-[11.5px] text-muted">{fmtDT(c.date)}</span></div><p className="text-[13.5px]">{c.detail}</p>{c.attachment && <div className="text-[12px] text-violet mt-2">📎 {c.attachment}</div>}</div>
            {c.replies.map((r: any, i: number) => <div key={i} className="rounded-xl border border-line p-3.5 ml-6"><div className="flex items-center gap-2 mb-1.5"><Avatar name={r.by} size={24} /><b className="text-[13px]">{r.by}</b><span className="text-[11.5px] text-muted">{fmtDT(r.date)}</span></div><p className="text-[13.5px]">{r.msg}</p></div>)}
            {!c.closed ? <div className="grid gap-3 border-t border-line pt-4">
              <Field label="Reply message"><Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a reply to the customer" /></Field>
              <div className="flex flex-wrap items-center gap-4"><Field label="Status"><Select value={st} onChange={(e) => setSt(e.target.value)} placeholder="Keep current" options={['Pending', 'In Progress']} /></Field><Check label="Close ticket (resolved)" checked={close} onChange={setClose} /><div className="ml-auto flex gap-2"><button className="btn-ghost" onClick={() => setMsg('')}>Cancel</button><button className="btn-primary" disabled={!msg && !close} onClick={() => { A.replyComplaint(c.id, msg, close, st); setMsg(''); setClose(false); }}><Send size={14} /> Reply</button></div></div>
            </div> : <div className="flex items-center gap-2 text-ok text-[13px]"><CheckCircle2 size={16} /> Resolved by {c.closedBy}</div>}
          </div>
        </Card> : <Card><EmptyState icon={LifeBuoy} title="No ticket selected" /></Card>}
      </div>
    </div>
  );
}
