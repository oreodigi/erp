import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, truckStatus, truckLocation, distKm, isDiesel, dieselTypeId, defLedger } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, Check, Stat, EmptyState, Tabs, Progress, Segmented } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Modal } from '../components/overlays';
import { CrudPage, EntityForm, EntityDef } from './masters';
import { ChartCard, Lines, Bars } from '../components/charts';
import { fmtDate, ymd, hm, sum, inr, num, cls, daysBetween, groupBy, addDays } from '../lib/util';
import { Plus, Truck, Eye, Pencil, Trash2, Printer, Route, Flag, Fuel, ShieldAlert, Wrench, CheckCircle2, ScrollText, Gauge, IndianRupee, Siren, MapPin } from 'lucide-react';

const cityOpts = (db: any) => db.cities.map((c: any) => ({ value: c.id, label: c.name }));
const docState = (d: string) => { const n = daysBetween(ymd(), d); return n < 0 ? 'Expired' : n <= 15 ? 'Expiring' : 'Valid'; };

export const TRUCK_DEF: EntityDef = {
  key: 'truck', coll: 'trucks', title: 'Fleet', singular: 'Truck', group: 'Fleet', eyebrow: 'Road Fleet', record: 'truck', legacy: ['MasterPages/TruckList', 'TruckDetail'], desc: '',
  defaults: () => ({ type: 'Own', capacity: '32 HQ', tyres: 10, odometer: 0, transTruckType: 'Market', isActive: true }),
  fields: [
    { k: 'number', l: 'Truck no.', req: true, section: 'Registration' }, { k: 'type', l: 'Ownership', t: 'radio', opts: ['Own', 'Market'], req: true, section: 'Registration' },
    { k: 'capacity', l: 'Truck capacity', t: 'select', opts: ['32 LQ', '32 HQ', '34 LQ', '34 HQ', '36 LQ', '36 HQ', '38 LQ', '38 HQ', '40 LQ', '40 HQ', '407', '18 Feet Truck', '19 Feet Truck', 'DCM', 'DI', '6 Wheeler', '10 Wheeler', '12 Wheeler', '9 MT', '16 MT', '20 MT'], section: 'Registration' },
    { k: 'make', l: 'Make', section: 'Registration' }, { k: 'chassis', l: 'Chassis number', section: 'Registration' }, { k: 'engine', l: 'Engine number', section: 'Registration' }, { k: 'purchaseDate', l: 'Purchase date', t: 'date', section: 'Registration' }, { k: 'tyres', l: 'Tyres', t: 'number', section: 'Registration' },
    { k: 'transporterId', l: 'Transporter', t: 'select', opts: (db) => db.transporters.map((t: any) => ({ value: t.id, label: t.name })), section: 'Registration', show: (f) => f.type === 'Market' }, { k: 'transTruckType', l: 'Transporter truck type', t: 'radio', opts: ['Market', 'Union'], section: 'Registration', show: (f) => f.type === 'Market' },
    { k: 'driverId', l: 'Assigned driver', t: 'select', opts: (db) => db.drivers.map((d: any) => ({ value: d.id, label: d.name })), section: 'Registration', show: (f) => f.type === 'Own' },
    { k: 'insNo', l: 'Insurance number', section: 'Insurance' }, { k: 'insCompany', l: 'Insurance company', section: 'Insurance' }, { k: 'insDate', l: 'Insurance date', t: 'date', section: 'Insurance' }, { k: 'insDue', l: 'Insurance due date', t: 'date', section: 'Insurance' }, { k: 'insAmt', l: 'Insurance amount (₹)', t: 'number', section: 'Insurance' },
    { k: 'fitNo', l: 'Fitness no.', section: 'Permits & tax' }, { k: 'fitDate', l: 'Fitness date', t: 'date', section: 'Permits & tax' }, { k: 'fitDue', l: 'Fitness due date', t: 'date', section: 'Permits & tax' }, { k: 'fitnessAmt', l: 'Fitness amount', t: 'number', section: 'Permits & tax' },
    { k: 'gpNo', l: 'Goods permit no.', section: 'Permits & tax' }, { k: 'gpDate', l: 'GP date', t: 'date', section: 'Permits & tax' }, { k: 'gpDue', l: 'GP due date', t: 'date', section: 'Permits & tax' },
    { k: 'npNo', l: 'National permit no.', section: 'Permits & tax' }, { k: 'npDate', l: 'NP date', t: 'date', section: 'Permits & tax' }, { k: 'npDue', l: 'NP due date', t: 'date', section: 'Permits & tax' },
    { k: 'taxNo', l: 'Tax no.', section: 'Permits & tax' }, { k: 'taxDate', l: 'Tax date', t: 'date', section: 'Permits & tax' }, { k: 'taxDue', l: 'Tax due date', t: 'date', section: 'Permits & tax' }, { k: 'taxAmt', l: 'Tax amount', t: 'number', section: 'Permits & tax' }, { k: 'rpNo', l: 'RP no.', section: 'Permits & tax' },
    { k: 'cft', l: 'CFT', t: 'number', section: 'Capacity & cost' }, { k: 'volume', l: 'Volume (m³)', t: 'number', section: 'Capacity & cost' }, { k: 'stdAvg', l: 'Standard average (km/l)', t: 'number', section: 'Capacity & cost' }, { k: 'extraDiesel', l: 'Extra diesel allowed', t: 'bool', section: 'Capacity & cost' },
    { k: 'monthlyExp', l: 'Monthly fixed expenses', t: 'number', section: 'Capacity & cost' }, { k: 'emi', l: 'EMI', t: 'number', section: 'Capacity & cost' }, { k: 'salary', l: 'Driver salary', t: 'number', section: 'Capacity & cost' }, { k: 'permitAmt', l: 'Permit amount', t: 'number', section: 'Capacity & cost' }, { k: 'odometer', l: 'Current odometer (km)', t: 'number', section: 'Capacity & cost' }, { k: 'remarks', l: 'Remark', t: 'textarea', span: 2, section: 'Capacity & cost' },
  ],
  cols: () => [],
};

export function Trucks() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, nav, ask } = useUI.getState();
  const [tab, setTab] = useState('fleet');
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (params.edit) setForm(db.trucks.find((t: any) => t.id === params.edit)); }, [params.edit]);
  const rows = db.trucks.map((t: any) => { const docs = [t.insDue, t.fitDue, t.npDue, t.gpDue, t.taxDue]; const worst = docs.some((d) => d && d < ymd()) ? 'Expired' : docs.some((d) => d && daysBetween(ymd(), d) <= 15) ? 'Expiring' : 'Valid'; return { ...t, status: truckStatus(db, t), loc: truckLocation(db, t), compliance: worst, trans: t.transporterId ? lookup.transName(db, t.transporterId) : 'Own' }; });
  const own = rows.filter((r: any) => r.type === 'Own');
  return (
    <div>
      <PageHeader eyebrow="Road Fleet" title="Fleet" subtitle="Own and market trucks with live status, current lane, compliance (insurance, fitness, permits, tax) and workshop state." actions={<button className="btn-primary" onClick={() => setForm({})}><Plus size={15} /> Add truck</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <KPI label="Own trucks" value={own.length} sub={`${rows.length - own.length} market on record`} icon={Truck} />
        <KPI label="On trip" value={own.filter((r: any) => r.status === 'On Trip').length} icon={Route} tone="info" />
        <KPI label="Available" value={own.filter((r: any) => r.status === 'Available').length} icon={CheckCircle2} tone="ok" />
        <KPI label="In workshop" value={own.filter((r: any) => r.status === 'Workshop').length} icon={Wrench} tone="warn" onClick={() => nav('ws/jobcards')} />
        <KPI label="Compliance alerts" value={rows.filter((r: any) => r.compliance !== 'Valid').length} icon={ShieldAlert} tone="bad" onClick={() => setTab('compliance')} />
      </div>
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'fleet', label: 'Fleet register' }, { key: 'compliance', label: 'Trucks monitoring', count: rows.filter((r: any) => r.compliance !== 'Valid').length }, { key: 'board', label: 'Status board' }]} />
      {tab === 'fleet' && <DataTable id="trucks" rows={rows} onRow={(r) => openRecord('truck', r.id)} quickFilters={[{ key: 'own', label: 'Own', fn: (r: any) => r.type === 'Own' }, { key: 'mkt', label: 'Market', fn: (r: any) => r.type === 'Market' }, { key: 'alert', label: 'Compliance alerts', fn: (r: any) => r.compliance !== 'Valid' }]} cols={[
        { key: 'number', label: 'Truck no.', render: (r) => <DocNo>{r.number}</DocNo>, mobile: 'title' },
        { key: 'type', label: 'Type', filter: true, render: (r) => <StatusBadge s={r.type} dot={false} /> },
        { key: 'capacity', label: 'Capacity', filter: true, mobile: 'sub' }, { key: 'make', label: 'Make', hidden: true },
        { key: 'trans', label: 'Owner / transporter', filter: true },
        { key: 'driver', label: 'Driver', value: (r) => (r.driverId ? lookup.driverName(db, r.driverId) : '—') },
        { key: 'loc', label: 'Location / lane', render: (r) => <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-faint" />{r.loc}</span> },
        { key: 'odometer', label: 'Odometer', align: 'right', render: (r) => (r.odometer ? num(r.odometer) : '—') },
        { key: 'chassis', label: 'Chassis no.', hidden: true }, { key: 'engine', label: 'Engine no.', hidden: true }, { key: 'gpNo', label: 'GP no.', hidden: true }, { key: 'taxNo', label: 'Tax no.', hidden: true },
        { key: 'compliance', label: 'Compliance', filter: true, render: (r) => <StatusBadge s={r.compliance} /> },
        { key: 'status', label: 'Status', filter: true, render: (r) => (r.type === 'Own' ? <StatusBadge s={r.status} /> : <span className="text-faint">—</span>), mobile: 'meta' },
      ]} rowActions={(r: any) => [
        { label: 'Open 360', icon: Eye, onClick: () => openRecord('truck', r.id) }, { label: 'Edit', icon: Pencil, onClick: () => setForm(r) },
        { label: 'Start trip', icon: Route, onClick: () => nav('fleet/trips', { new: 1, truckId: r.id }), hidden: r.type !== 'Own' || r.status !== 'Available' },
        { label: 'Open job card', icon: Wrench, onClick: () => nav('ws/jobcards', { new: 1, truckId: r.id }), hidden: r.type !== 'Own' },
        { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => ask({ title: `Delete ${r.number}?`, tone: 'bad', confirmLabel: 'Delete', body: 'Trips and LRs keep their history.', onConfirm: () => A.remove('trucks', r.id, 'Truck') }) },
      ]} />}
      {tab === 'compliance' && <Card pad={false} title="Trucks monitoring chart" subtitle="Legacy DashboardCO – GP, NP, tax, insurance and fitness due dates">
        <div className="overflow-x-auto"><table className="w-full text-[12.5px] min-w-[760px]"><thead><tr className="text-[11px] text-muted uppercase border-b border-line"><th className="text-left px-4 py-2">Truck no.</th>{['GP date', 'NP date', 'Tax date', 'Ins. date', 'Fitness date'].map((h) => <th key={h} className="text-left px-2">{h}</th>)}</tr></thead>
          <tbody>{rows.filter((r: any) => r.type === 'Own').sort((a: any, b: any) => (a.compliance === 'Valid' ? 1 : 0) - (b.compliance === 'Valid' ? 1 : 0)).map((t: any) => <tr key={t.id} className="border-b border-line/60 hover:bg-surface2 cursor-pointer" onClick={() => openRecord('truck', t.id)}><td className="px-4 py-2 docno">{t.number}</td>{[t.gpDue, t.npDue, t.taxDue, t.insDue, t.fitDue].map((d: string, i: number) => { const s = docState(d); return <td key={i} className="px-2"><span className={cls('inline-flex px-2 py-0.5 rounded-md tnum', s === 'Expired' ? 'bg-bad/[.12] text-bad font-semibold' : s === 'Expiring' ? 'bg-warn/15 text-warn font-semibold' : 'text-muted')}>{fmtDate(d)}</span></td>; })}</tr>)}</tbody></table></div>
      </Card>}
      {tab === 'board' && <div className="grid md:grid-cols-3 gap-4">{['Available', 'On Trip', 'Workshop'].map((s) => <Card key={s} title={<span className="flex items-center gap-2">{s} <span className="text-muted tnum font-normal">{own.filter((r: any) => r.status === s).length}</span></span>} pad={false}><ul className="divide-y divide-line">{own.filter((r: any) => r.status === s).map((t: any) => <li key={t.id}><button onClick={() => openRecord('truck', t.id)} className="w-full text-left px-4 py-2.5 hover:bg-surface2"><div className="flex justify-between"><span className="docno font-semibold">{t.number}</span><span className="text-[11.5px] text-muted">{t.capacity}</span></div><div className="text-[12px] text-muted truncate">{t.loc} · {lookup.driverName(db, t.driverId)}</div></button></li>)}</ul></Card>)}</div>}
      {form && <EntityForm def={TRUCK_DEF} init={form} onClose={() => { setForm(null); useUI.getState().set({ params: {} }); }} />}
    </div>
  );
}

const DRIVER_DEF: EntityDef = {
  key: 'driver', coll: 'drivers', title: 'Drivers', singular: 'Driver', group: 'Fleet', eyebrow: 'Road Fleet', record: 'driver', legacy: ['MasterPages/DriverList', 'DriverDetail'], desc: 'Driver records with licence validity, leave and blacklist status, statutory IDs and references.',
  defaults: () => ({ type: 'Own', onLeave: false, blacklisted: false, rating: 4 }),
  quick: [{ key: 'leave', label: 'On leave', fn: (r) => r.onLeave }, { key: 'lic', label: 'Licence expiring', fn: (r) => daysBetween(ymd(), r.licenseExpiry) <= 30 }, { key: 'bl', label: 'Blacklisted', fn: (r) => r.blacklisted }],
  fields: [
    { k: 'name', l: 'Driver name', req: true, section: 'Personal' }, { k: 'type', l: 'Driver type', t: 'radio', opts: ['Own', 'Market'], section: 'Personal' }, { k: 'dob', l: 'Birth date', t: 'date', section: 'Personal' }, { k: 'anniversary', l: 'Anniversary date', t: 'date', section: 'Personal' }, { k: 'mobile', l: 'Mobile no.', req: true, section: 'Personal' }, { k: 'altMobile', l: 'Alternate mobile', section: 'Personal' }, { k: 'bloodGroup', l: 'Blood group', t: 'select', opts: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'], section: 'Personal' }, { k: 'salary', l: 'Salary (₹)', t: 'number', section: 'Personal' },
    { k: 'license', l: 'Licence no.', req: true, section: 'Licence' }, { k: 'licenseCity', l: 'Licence city', t: 'select', opts: cityOpts, section: 'Licence' }, { k: 'licenseDate', l: 'Licence date', t: 'date', section: 'Licence' }, { k: 'licenseExpiry', l: 'Expiry date', t: 'date', req: true, section: 'Licence' },
    { k: 'address', l: 'Permanent address', t: 'textarea', span: 2, section: 'Address' }, { k: 'city', l: 'Permanent city', t: 'select', opts: cityOpts, section: 'Address' }, { k: 'landline', l: 'Landline (permanent)', section: 'Address' }, { k: 'corrAddress', l: 'Correspondence address', t: 'textarea', span: 2, section: 'Address' },
    { k: 'refName', l: 'Reference person', section: 'Reference & statutory' }, { k: 'refContact', l: 'Reference contact', section: 'Reference & statutory' }, { k: 'pan', l: 'PAN', section: 'Reference & statutory' }, { k: 'aadhaar', l: 'Aadhaar card no.', section: 'Reference & statutory' }, { k: 'tdsRate', l: 'TDS rate (%)', t: 'number', section: 'Reference & statutory' }, { k: 'noTdsAmt', l: 'No-TDS up to (₹)', t: 'number', section: 'Reference & statutory' }, { k: 'particulars', l: 'Particulars', span: 2, section: 'Reference & statutory' }, { k: 'onLeave', l: 'On leave', t: 'bool', section: 'Reference & statutory' }, { k: 'blacklisted', l: 'Blacklisted', t: 'bool', section: 'Reference & statutory' },
  ],
  cols: (db) => [{ key: 'name', label: 'Driver', mobile: 'title' }, { key: 'type', label: 'Type', filter: true }, { key: 'mobile', label: 'Mobile', mobile: 'sub' }, { key: 'city', label: 'City', value: (r) => lookup.cityName(db, r.city) }, { key: 'license', label: 'Licence no.', render: (r) => <span className="docno">{r.license}</span> }, { key: 'licenseExpiry', label: 'Licence expiry', render: (r) => <StatusBadge s={fmtDate(r.licenseExpiry)} tone={r.licenseExpiry < ymd() ? 'bad' : daysBetween(ymd(), r.licenseExpiry) <= 30 ? 'warn' : 'muted'} dot={false} /> }, { key: 'truck', label: 'Truck', value: (r) => db.trucks.find((t: any) => t.driverId === r.id)?.number || '—' }, { key: 'rating', label: 'Rating', align: 'right' }, { key: 'st', label: 'Status', value: (r) => (r.blacklisted ? 'Blacklisted' : r.onLeave ? 'On leave' : 'Active'), render: (r) => <StatusBadge s={r.blacklisted ? 'Blacklisted' : r.onLeave ? 'On leave' : 'Active'} tone={r.blacklisted ? 'bad' : r.onLeave ? 'warn' : 'ok'} />, filter: true, mobile: 'meta' }],
  kpis: (db, rows) => <><KPI label="Drivers" value={rows.length} /><KPI label="On trip" value={new Set(db.trips.filter((t: any) => !t.completed).map((t: any) => t.driverId)).size} tone="info" /><KPI label="On leave" value={rows.filter((r: any) => r.onLeave).length} tone="warn" /><KPI label="Licence ≤ 30 days" value={rows.filter((r: any) => daysBetween(ymd(), r.licenseExpiry) <= 30).length} tone="bad" /></>,
};
export const Drivers = () => <CrudPage def={DRIVER_DEF} />;

// ---------------- Trips ----------------
export function Trips() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint, nav } = useUI.getState();
  const [form, setForm] = useState<any>(params.new ? { truckId: params.truckId } : null);
  const rows = db.trips.slice().reverse().map((t: any) => ({ ...t, truck: lookup.truckNo(db, t.truckId), ls: t.logslipId ? db.logslips.find((l: any) => l.id === t.logslipId)?.no : '' }));
  return (
    <div>
      <PageHeader eyebrow="Road Fleet" title="Trips" subtitle="Own-fleet trips for client LRs and rake delivery challans: advance, onward freight, opening/closing km. Completed trips roll into log slips." actions={<button className="btn-primary" onClick={() => setForm({})}><Plus size={15} /> Start trip</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Running trips" value={rows.filter((r: any) => !r.completed).length} icon={Route} tone="info" />
        <KPI label="Completed (30d)" value={rows.filter((r: any) => r.completed && daysBetween(r.endDate) <= 30).length} icon={Flag} tone="ok" />
        <KPI label="Advances out" value={inr(sum(rows.filter((r: any) => !r.completed), (r: any) => r.advance))} icon={IndianRupee} tone="warn" />
        <KPI label="Awaiting log slip" value={rows.filter((r: any) => r.completed && !r.logslipId).length} icon={ScrollText} onClick={() => nav('fleet/logslips')} />
      </div>
      <DataTable id="trips" rows={rows} onRow={(r) => openRecord('trip', r.id)} quickFilters={[{ key: 'run', label: 'Running', fn: (r: any) => !r.completed }, { key: 'done', label: 'Completed', fn: (r: any) => r.completed }, { key: 'nols', label: 'No log slip', fn: (r: any) => r.completed && !r.logslipId }]} cols={[
        { key: 'name', label: 'Trip name', render: (r) => <DocNo>{r.name}</DocNo>, mobile: 'title' },
        { key: 'for', label: 'Trip for', filter: true }, { key: 'cr', label: 'Client / rake date', value: (r) => (r.clientId ? lookup.cust(db, r.clientId)?.short : r.scheduleId ? fmtDate(lookup.sched(db, r.scheduleId)?.date) : '—') },
        { key: 'truck', label: 'Truck no.', render: (r) => <span className="docno">{r.truck}</span>, filter: true, mobile: 'sub' },
        { key: 'from', label: 'From', value: (r) => lookup.cityName(db, r.fromCity) }, { key: 'to', label: 'To', value: (r) => lookup.cityName(db, r.toCity) },
        { key: 'ls', label: 'Log slip', render: (r) => (r.ls ? <span className="docno">{r.ls}</span> : <span className="text-faint">—</span>) },
        { key: 'startDate', label: 'Start', render: (r) => fmtDate(r.startDate) }, { key: 'openingKm', label: 'Opening km', align: 'right', render: (r) => num(r.openingKm) },
        { key: 'advance', label: 'Advance', align: 'right', render: (r) => inr(r.advance) },
        { key: 'st', label: 'Status', value: (r) => (r.completed ? 'Completed' : 'On Trip'), render: (r) => <StatusBadge s={r.completed ? 'Completed' : 'On Trip'} />, mobile: 'meta' },
      ]} rowActions={(r: any) => [{ label: 'View', icon: Eye, onClick: () => openRecord('trip', r.id) }, { label: 'Edit', icon: Pencil, onClick: () => setForm(r), hidden: !!r.logslipId }, { label: 'Print trip advance', icon: Printer, onClick: () => openPrint('tripadvance', r.id) }, { label: 'Diesel slip', icon: Fuel, onClick: () => openPrint('diesel', r.id) }, { label: 'Complete trip', icon: Flag, onClick: () => nav('fleet/trip-completion', { id: r.id }), hidden: r.completed }]} />
      {form && <TripForm init={form} onClose={() => { setForm(null); useUI.getState().set({ params: {} }); }} />}
    </div>
  );
}
function TripForm({ init, onClose }: { init: any; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState<any>(() => ({ for: 'Client (LR)', clientId: '', scheduleId: '', truckId: '', driverId: '', fromCity: 'jalgaon', toCity: '', name: '', startDate: ymd(), startTime: hm(), openingKm: '', isEmpty: false, onwardFreight: '', advance: 10000, payType: 'Cash', paidBy: defLedger(db, 'l4'), description: '', ...init }));
  useEffect(() => { if (init.truckId && !init.id) { const t = lookup.truck(db, init.truckId); setF((p: any) => ({ ...p, driverId: t?.driverId, openingKm: t?.odometer })); } }, []);
  const avail = db.trucks.filter((t: any) => t.type === 'Own' && (truckStatus(db, t) === 'Available' || t.id === f.truckId));
  const km = f.toCity ? distKm(f.fromCity, f.toCity) : 0;
  const truck = lookup.truck(db, f.truckId);
  return (
    <Drawer open onClose={onClose} title={init.id ? `Edit ${init.name}` : 'Start trip'} subtitle="Legacy: Container/TripDetail.aspx" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.truckId || !f.toCity) return useUI.getState().toast('Select truck and destination', 'bad'); A.saveTrip({ ...f, openingKm: Number(f.openingKm), advance: Number(f.advance), onwardFreight: Number(f.onwardFreight || 0) }); onClose(); }}>Save trip</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        <FormSection title="Trip for" cols={2}>
          <Field label="Trip for" className="sm:col-span-2"><Radio options={['Client (LR)', 'Rake (DC)']} value={f.for} onChange={(v) => setF({ ...f, for: v })} /></Field>
          {f.for === 'Client (LR)' ? <Field label="Client"><Select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })} placeholder="Select client" options={db.customers.map((c: any) => ({ value: c.id, label: c.name }))} /></Field> : <Field label="Rake date"><Select value={f.scheduleId} onChange={(e) => setF({ ...f, scheduleId: e.target.value })} placeholder="Select rake" options={db.schedules.map((s: any) => ({ value: s.id, label: `${fmtDate(s.date)} · ${s.rakeNo}` }))} /></Field>}
          <Field label="Trip name" hint="Auto-numbered if blank"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={`TRP/${db.counters.trip + 1}`} /></Field>
        </FormSection>
        <FormSection title="Vehicle" cols={2}>
          <Field label="Truck number" required><Select value={f.truckId} onChange={(e) => { const t = lookup.truck(db, e.target.value); setF({ ...f, truckId: e.target.value, driverId: t?.driverId, openingKm: t?.odometer }); }} placeholder="Available own trucks" options={avail.map((t: any) => ({ value: t.id, label: `${t.number} · ${t.capacity}` }))} /></Field>
          <Field label="Driver name"><Select value={f.driverId} onChange={(e) => setF({ ...f, driverId: e.target.value })} placeholder="Select" options={db.drivers.filter((d: any) => !d.blacklisted && !d.onLeave).map((d: any) => ({ value: d.id, label: d.name }))} /></Field>
          <Field label="Opening KM"><Input type="number" value={f.openingKm} onChange={(e) => setF({ ...f, openingKm: e.target.value })} /></Field>
          <Field label="Vehicle"><Input value={truck ? `${truck.make} · ${truck.capacity}` : ''} disabled /></Field>
          <div className="flex items-end"><Check label="Empty run" checked={f.isEmpty} onChange={(v) => setF({ ...f, isEmpty: v })} /></div>
        </FormSection>
        <FormSection title="Route" cols={2}>
          <Field label="From city"><Select value={f.fromCity} onChange={(e) => setF({ ...f, fromCity: e.target.value })} options={cityOpts(db)} /></Field>
          <Field label="To city" required><Select value={f.toCity} onChange={(e) => setF({ ...f, toCity: e.target.value })} placeholder="Select" options={cityOpts(db)} /></Field>
          <Field label="Start date"><Input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label="Start time"><Input type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /></Field>
          {km > 0 && <div className="sm:col-span-2 text-[12.5px] text-muted">≈ {num(km)} km one way · est. diesel {truck ? Math.round(km / truck.stdAvg) : '—'} L at std average</div>}
        </FormSection>
        <FormSection title="Money" cols={2}>
          <Field label="Onward freight (₹)"><Input type="number" value={f.onwardFreight} onChange={(e) => setF({ ...f, onwardFreight: e.target.value })} /></Field>
          <Field label="Advance (₹)"><Input type="number" value={f.advance} onChange={(e) => setF({ ...f, advance: e.target.value })} /></Field>
          <Field label="Payment type"><Radio options={['Cash', 'Bank', 'Card']} value={f.payType} onChange={(v) => setF({ ...f, payType: v })} /></Field>
          <Field label="Paid by"><Select value={f.paidBy} onChange={(e) => setF({ ...f, paidBy: e.target.value })} options={db.ledgers.map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </FormSection>
      </div>
    </Drawer>
  );
}

export function TripCompletion() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord } = useUI.getState();
  const open = db.trips.filter((t: any) => !t.completed);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const get = (t: any) => edits[t.id] || { endDate: ymd(), hh: '18', mm: '00', ampm: 'PM', closingKm: t.openingKm + distKm(t.fromCity, t.toCity) * 2 };
  return (
    <div>
      <PageHeader eyebrow="Road Fleet" title="Trip completion" subtitle="Close running trips with end date/time and closing odometer. The truck becomes available and the trip is ready for its log slip." />
      {open.length === 0 ? <Card><EmptyState icon={Flag} title="No running trips" /></Card> : (
        <div className="grid gap-3">{open.map((t: any) => { const e = get(t); const set = (p: any) => setEdits({ ...edits, [t.id]: { ...e, ...p } }); const hr = (Number(e.hh) % 12) + (e.ampm === 'PM' ? 12 : 0); return (
          <Card key={t.id} className={cls(params.id === t.id && 'ring-2 ring-violet/40')}>
            <div className="grid lg:grid-cols-[1.2fr_2fr_auto] gap-4 items-end">
              <button className="text-left" onClick={() => openRecord('trip', t.id)}><div className="docno font-semibold">{t.name}</div><div className="text-[12.5px] text-muted">{lookup.truckNo(db, t.truckId)} · {lookup.driverName(db, t.driverId)}</div><div className="text-[12.5px]">{lookup.cityName(db, t.fromCity)} → {lookup.cityName(db, t.toCity)} · since {fmtDate(t.startDate)}</div></button>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Field label="End date"><Input type="date" value={e.endDate} onChange={(x) => set({ endDate: x.target.value })} /></Field>
                <Field label="Time"><div className="flex gap-1"><select className="input px-1.5" value={e.hh} onChange={(x) => set({ hh: x.target.value })} aria-label="Hour">{Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => <option key={h}>{h}</option>)}</select><select className="input px-1.5" value={e.mm} onChange={(x) => set({ mm: x.target.value })} aria-label="Minute">{['00', '15', '30', '45'].map((m) => <option key={m}>{m}</option>)}</select></div></Field>
                <Field label="AM/PM"><Select value={e.ampm} onChange={(x) => set({ ampm: x.target.value })} options={['AM', 'PM']} /></Field>
                <Field label="Closing KM"><Input type="number" value={e.closingKm} onChange={(x) => set({ closingKm: Number(x.target.value) })} /></Field>
              </div>
              <div className="flex flex-col items-end gap-1"><span className="text-[11.5px] text-muted tnum">{num(e.closingKm - t.openingKm)} km run</span><button className="btn-primary" onClick={() => { if (e.closingKm <= t.openingKm) return useUI.getState().toast('Closing km must exceed opening km', 'bad'); A.completeTrip(t.id, { endDate: e.endDate, endTime: `${String(hr).padStart(2, '0')}:${e.mm}`, closingKm: e.closingKm }); }}><Flag size={14} /> Trip close</button></div>
            </div>
          </Card>); })}</div>
      )}
    </div>
  );
}

export function LogSlips() {
  const db = useDB();
  const { openPrint, openRecord } = useUI.getState();
  const pendingTrucks = [...new Set(db.trips.filter((t: any) => t.completed && !t.logslipId).map((t: any) => t.truckId))];
  const [truckId, setTruck] = useState(pendingTrucks[0] || '');
  const trips = db.trips.filter((t: any) => t.truckId === truckId && t.completed && !t.logslipId).sort((a: any, b: any) => a.startDate.localeCompare(b.startDate));
  const [f, setF] = useState({ prevDieselQty: 40, dieselRate: (db.pumps.find((p: any) => p.dieselRate > 0) || db.pumps[0])?.dieselRate || 0, date: ymd(), time: hm(), remark: '' });
  const ex = db.tripExpenses.filter((e: any) => trips.some((t: any) => t.id === e.tripId));
  const km = trips.length ? trips[trips.length - 1].closingKm - trips[0].openingKm : 0;
  const diesel = sum(ex.filter((e: any) => isDiesel(db, e.typeId)), (e: any) => e.qty);
  const truck = lookup.truck(db, truckId);
  const avg = diesel ? km / diesel : 0;
  const [preview, setPreview] = useState(false);
  return (
    <div>
      <PageHeader eyebrow="Road Fleet" title="Log slips" subtitle="Consolidate completed trips per truck into a log slip: km run, diesel consumed and average against standard. Posting creates the journal for Tally." />
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <Card title="Generate log slip"><div className="grid gap-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Truck number" required className="sm:col-span-1"><Select value={truckId} onChange={(e) => setTruck(e.target.value)} placeholder={pendingTrucks.length ? 'Trucks with pending trips' : 'No pending trips'} options={pendingTrucks.map((t: any) => ({ value: t, label: `${lookup.truckNo(db, t)} (${db.trips.filter((x: any) => x.truckId === t && x.completed && !x.logslipId).length} trips)` }))} /></Field>
            <Field label="Previous diesel qty (L)"><Input type="number" value={f.prevDieselQty} onChange={(e) => setF({ ...f, prevDieselQty: Number(e.target.value) })} /></Field>
            <Field label="Diesel rate (₹/L)"><Input type="number" value={f.dieselRate} onChange={(e) => setF({ ...f, dieselRate: Number(e.target.value) })} /></Field>
            <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Time"><Input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
            <Field label="Remark"><Input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></Field>
          </div>
          {trips.length > 0 && <div className="border border-line rounded-lg overflow-x-auto"><table className="w-full text-[12.5px] min-w-[560px]"><thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-2">Trip</th><th className="text-left px-2">Route</th><th className="text-right px-2">Opening</th><th className="text-right px-2">Closing</th><th className="text-right px-2">KM</th><th className="text-right px-3">Diesel L</th></tr></thead><tbody>{trips.map((t: any) => <tr key={t.id} className="border-t border-line"><td className="px-3 py-1.5 docno">{t.name}</td><td className="px-2">{lookup.cityName(db, t.fromCity)} → {lookup.cityName(db, t.toCity)}</td><td className="px-2 text-right tnum">{num(t.openingKm)}</td><td className="px-2 text-right tnum">{num(t.closingKm)}</td><td className="px-2 text-right tnum">{num(t.closingKm - t.openingKm)}</td><td className="px-3 text-right tnum">{num(sum(ex.filter((e: any) => e.tripId === t.id && e.typeId === 'e1'), (e: any) => e.qty))}</td></tr>)}</tbody></table></div>}
          <div className="flex justify-end gap-2"><button className="btn-ghost" disabled={!trips.length} onClick={() => setPreview(true)}>Preview</button><button className="btn-primary" disabled={!trips.length} onClick={() => { const ls = A.generateLogslip({ truckId, driverId: truck?.driverId, tripIds: trips.map((t: any) => t.id), openingKm: trips[0].openingKm, closingKm: trips[trips.length - 1].closingKm, startDate: trips[0].startDate, endDate: trips[trips.length - 1].endDate, ...f }); openPrint('logslip', ls.id); }}><ScrollText size={15} /> Submit</button></div>
        </div></Card>
        <Card title="Performance">{trips.length ? <div className="grid grid-cols-2 gap-3"><Stat label="Total km" value={num(km)} /><Stat label="Diesel" value={`${num(diesel)} L`} /><Stat label="Average" value={avg ? `${avg.toFixed(2)} km/l` : '—'} tone={avg && truck && avg < truck.stdAvg ? 'bad' : 'ok'} /><Stat label="Standard" value={`${truck?.stdAvg} km/l`} /><Stat label="Expenses" value={inr(sum(ex, (e: any) => e.amount))} /><Stat label="Excess diesel" value={avg && truck ? `${num(Math.max(0, diesel - km / truck.stdAvg))} L` : '—'} /></div> : <div className="text-[13px] text-muted">Select a truck with completed trips.</div>}</Card>
      </div>
      <div className="mt-6"><DataTable id="logslips" rows={db.logslips.slice().reverse()} cols={[{ key: 'no', label: 'Log slip no.', render: (r) => <DocNo>{r.no}</DocNo>, mobile: 'title' }, { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.truckId), filter: true, mobile: 'sub' }, { key: 'driver', label: 'Driver name', value: (r) => lookup.driverName(db, r.driverId) }, { key: 'startDate', label: 'Start date', render: (r) => fmtDate(r.startDate) }, { key: 'endDate', label: 'Return date', render: (r) => fmtDate(r.endDate) }, { key: 'km', label: 'Total km', align: 'right', value: (r) => r.closingKm - r.openingKm, render: (r) => num(r.closingKm - r.openingKm), mobile: 'right' }, { key: 'trips', label: 'Trips', align: 'right', value: (r) => r.tripIds.length }, { key: 'isOpen', label: 'Status', render: (r) => <StatusBadge s={r.isOpen ? 'Open' : 'Closed'} />, mobile: 'meta' }]} rowActions={(r: any) => [{ label: 'Print log slip', icon: Printer, onClick: () => openPrint('logslip', r.id) }]} /></div>
      {preview && <Modal open onClose={() => setPreview(false)} title="Log slip preview" size="sm" footer={<button className="btn-primary" onClick={() => setPreview(false)}>Close</button>}><div className="grid grid-cols-2 gap-3"><Stat label="Truck" value={truck?.number} /><Stat label="Trips" value={trips.length} /><Stat label="Opening km" value={num(trips[0]?.openingKm)} /><Stat label="Closing km" value={num(trips[trips.length - 1]?.closingKm)} /><Stat label="Diesel" value={`${num(diesel)} L`} /><Stat label="Average" value={avg.toFixed(2)} /></div></Modal>}
    </div>
  );
}

export function FuelExpenses() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { openRecord, openPrint } = useUI.getState();
  const [tab, setTab] = useState('entry');
  const [f, setF] = useState<any>({ truckId: '', tripId: params.tripId || '', typeId: dieselTypeId(db), cardNo: defLedger(db, 'l5'), city: 'jalgaon', pumpId: '', qty: '', rate: '', mode: 'Credit', amount: '', date: ymd() });
  useEffect(() => { if (params.tripId) { const t = db.trips.find((x: any) => x.id === params.tripId); if (t) setF((p: any) => ({ ...p, truckId: t.truckId })); } }, [params.tripId]);
  const trips = db.trips.filter((t: any) => t.truckId === f.truckId && !t.logslipId);
  const pump = db.pumps.find((p: any) => p.id === f.pumpId);
  const amount = isDiesel(db, f.typeId) ? Math.round(Number(f.qty || 0) * Number(f.rate || 0)) : Number(f.amount || 0);
  const et = db.expenseTypes.find((e: any) => e.id === f.typeId);
  const overLimit = et && amount > et.l1;
  const rows = db.tripExpenses.slice().reverse().map((e: any) => ({ ...e, trip: db.trips.find((t: any) => t.id === e.tripId) }));
  const pumps = db.pumps.map((p: any) => ({ x: p.name.split(' ')[0], Litres: sum(db.tripExpenses.filter((e: any) => e.pumpId === p.id), (e: any) => e.qty) }));
  const hist = [...new Set(db.pumpHistory.map((h: any) => h.date))].sort().map((d: any) => ({ x: fmtDate(d).slice(0, 6), ...Object.fromEntries(db.pumps.slice(0, 3).map((p: any) => [p.name.split(' ')[0], db.pumpHistory.find((h: any) => h.pumpId === p.id && h.date === d)?.rate])) }));
  return (
    <div>
      <PageHeader eyebrow="Road Fleet" title="Fuel & trip expenses" subtitle="Book diesel on fleet cards at credit pumps, tolls, bhatta and on-road costs against a trip. Expense-type limits flag entries needing approval." />
      <Tabs value={tab} onChange={setTab} className="mb-4" tabs={[{ key: 'entry', label: 'Trip expenses' }, { key: 'pumps', label: 'Pumps & diesel rate' }]} />
      {tab === 'entry' && <>
        <Card title="Add expense"><div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Truck" required><Select value={f.truckId} onChange={(e) => setF({ ...f, truckId: e.target.value, tripId: '' })} placeholder="Select truck" options={db.trucks.filter((t: any) => t.type === 'Own').map((t: any) => ({ value: t.id, label: t.number }))} /></Field>
            <Field label="Trip name" required><Select value={f.tripId} onChange={(e) => setF({ ...f, tripId: e.target.value })} placeholder="Select trip" options={trips.map((t: any) => ({ value: t.id, label: `${t.name} · ${lookup.cityName(db, t.toCity)}` }))} /></Field>
            <Field label="Expense type"><Select value={f.typeId} onChange={(e) => setF({ ...f, typeId: e.target.value })} options={db.expenseTypes.map((x: any) => ({ value: x.id, label: x.name }))} /></Field>
            <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            {isDiesel(db, f.typeId) ? <>
              <Field label="Card no."><Select value={f.cardNo} onChange={(e) => setF({ ...f, cardNo: e.target.value })} options={db.ledgers.filter((l: any) => l.type === 'Card').map((l: any) => ({ value: l.id, label: l.name }))} /></Field>
              <Field label="City"><Select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value, pumpId: '' })} options={cityOpts(db)} /></Field>
              <Field label="Pump"><Select value={f.pumpId} onChange={(e) => { const p = db.pumps.find((x: any) => x.id === e.target.value); const last = [...db.tripExpenses].reverse().find((x: any) => x.pumpId === e.target.value && x.rate > 0); setF({ ...f, pumpId: e.target.value, rate: p?.dieselRate || last?.rate || '' }); }} placeholder="Select pump" options={db.pumps.map((p: any) => ({ value: p.id, label: `${p.name} (₹${p.dieselRate})` }))} /></Field>
              <Field label="Qty (L)"><Input type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></Field>
              <Field label="Rate (₹/L)"><Input type="number" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>
            </> : <Field label="Amount (₹)"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>}
            <Field label="Payment mode"><Radio options={['Cash', 'Credit']} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} /></Field>
            <div className="rounded-lg bg-surface2 border border-line px-3 py-2"><div className="text-[11px] text-muted font-semibold">Expense amount</div><div className="font-display text-[18px] font-semibold tnum">{inr(amount)}</div></div>
          </div>
          {overLimit && <div className="text-[12.5px] rounded-lg bg-warn/10 text-warn px-3 py-2">Above limit 1 for {et.name} ({inr(et.l1)}) – will be flagged for approval.</div>}
          <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setF({ ...f, qty: '', amount: '' })}>Cancel</button><button className="btn-primary" onClick={() => { if (!f.tripId || !amount) return useUI.getState().toast('Select trip and enter amount', 'bad'); A.addExpense({ ...f, qty: Number(f.qty || 1), rate: Number(f.rate || amount), amount, branchId: 'JL' }); setF({ ...f, qty: '', amount: '' }); }}>Save</button></div>
        </div></Card>
        <div className="mt-6"><DataTable id="trip-expenses" rows={rows} cols={[{ key: 'trip', label: 'Trip name', value: (r) => r.trip?.name, render: (r) => <DocNo onClick={() => openRecord('trip', r.tripId)}>{r.trip?.name}</DocNo>, mobile: 'title' }, { key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'truck', label: 'Truck no.', value: (r) => lookup.truckNo(db, r.truckId), filter: true, mobile: 'sub' }, { key: 'type', label: 'Expense type', value: (r) => db.expenseTypes.find((e: any) => e.id === r.typeId)?.name, filter: true }, { key: 'src', label: 'Source', value: (r) => lookup.cityName(db, r.trip?.fromCity) }, { key: 'dst', label: 'Destination', value: (r) => lookup.cityName(db, r.trip?.toCity) }, { key: 'qty', label: 'Qty', align: 'right', render: (r) => (isDiesel(db, r.typeId) ? num(r.qty) : '—') }, { key: 'mode', label: 'Payment mode', filter: true }, { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r.amount), mobile: 'right' }, { key: 'branchId', label: 'Branch', hidden: true }]} rowActions={(r: any) => [{ label: 'Diesel slip', icon: Printer, onClick: () => openPrint('diesel', r.tripId), hidden: !isDiesel(db, r.typeId) }, { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => A.remove('tripExpenses', r.id, 'Expense') }]} /></div>
      </>}
      {tab === 'pumps' && <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Diesel rate history" subtitle="₹ per litre, last 45 days"><Lines data={hist} keys={db.pumps.slice(0, 3).map((p: any) => ({ key: p.name.split(' ')[0], label: p.name }))} domain={[89, 93]} /></ChartCard>
        <ChartCard title="Litres by pump" subtitle="All trip diesel"><Bars data={pumps} keys={[{ key: 'Litres', label: 'Litres' }]} /></ChartCard>
        <div className="lg:col-span-2"><CrudInline /></div>
      </div>}
    </div>
  );
}
import { DEFS } from './masters';
function CrudInline() { return <CrudPage def={{ ...DEFS.pump, title: 'Pumps', desc: '' }} />; }

const MONTHLY_DEF: EntityDef = { key: 'monthly', coll: 'monthlyExpenses', title: 'Monthly variable expenses', singular: 'Expense', group: 'Fleet', eyebrow: 'Road Fleet', legacy: ['Container/MonthlyVariableExpensesList', 'MonthlyVariableExpensesDetail'], desc: 'Vehicle costs outside trips – repairs on road, RTO, parking, punctures – for vehicle performance and P&L.', defaults: () => ({ date: ymd() }),
  fields: [{ k: 'date', l: 'Date', t: 'date', req: true }, { k: 'truckId', l: 'Vehicle no.', t: 'select', opts: (db) => db.trucks.filter((t: any) => t.type === 'Own').map((t: any) => ({ value: t.id, label: t.number })), req: true }, { k: 'typeId', l: 'Expense type', t: 'select', opts: (db) => db.expenseTypes.map((e: any) => ({ value: e.id, label: e.name })), req: true }, { k: 'amount', l: 'Expense amount (₹)', t: 'number', req: true }, { k: 'person', l: 'Responsible person' }, { k: 'description', l: 'Description', t: 'textarea', span: 2 }],
  cols: (db) => [{ key: 'date', label: 'Date', render: (r) => fmtDate(r.date) }, { key: 'truck', label: 'Vehicle no.', value: (r) => lookup.truckNo(db, r.truckId), filter: true, mobile: 'title' }, { key: 'type', label: 'Expense', value: (r) => db.expenseTypes.find((e: any) => e.id === r.typeId)?.name || r.typeName || '—', filter: true, mobile: 'sub' }, { key: 'amount', label: 'Amount', align: 'right', render: (r) => inr(r.amount), mobile: 'right' }, { key: 'person', label: 'Responsible' }, { key: 'description', label: 'Description' }],
  kpis: (db, rows) => <><KPI label="This month" value={inr(sum(rows.filter((r: any) => r.date.slice(0, 7) === ymd().slice(0, 7)), (r: any) => r.amount))} /><KPI label="Entries" value={rows.length} /><KPI label="Highest vehicle" value={(() => { const g = groupBy(rows, (r: any) => r.truckId); const top = Object.entries(g).sort((a, b) => sum(b[1], (r: any) => r.amount) - sum(a[1], (r: any) => r.amount))[0]; return top ? lookup.truckNo(db, top[0]) : '—'; })()} /><KPI label="Avg / entry" value={inr(rows.length ? sum(rows, (r: any) => r.amount) / rows.length : 0)} /></> };
export const MonthlyExpenses = () => <CrudPage def={MONTHLY_DEF} />;

const ACC_DEF: EntityDef = { key: 'accident', coll: 'accidents', title: 'Accidents', singular: 'Accident', group: 'Fleet', eyebrow: 'Road Fleet', legacy: ['Container/AccidentList', 'AccidentDetail'], desc: 'Accident register with vehicle, human and other losses, responsibility and insurance follow-up.', defaults: (db) => ({ no: `ACC/${db.counters.acc + 1}`, date: ymd(), partLoss: 0, humanLoss: 0, otherLoss: 0 }),
  fields: [{ k: 'no', l: 'Accident no.', req: true }, { k: 'date', l: 'Accident date', t: 'date', req: true }, { k: 'truckId', l: 'Vehicle no.', t: 'select', opts: (db) => db.trucks.map((t: any) => ({ value: t.id, label: t.number })), req: true }, { k: 'driverId', l: 'Driver', t: 'select', opts: (db) => db.drivers.map((d: any) => ({ value: d.id, label: d.name })) }, { k: 'location', l: 'Location', t: 'select', opts: cityOpts }, { k: 'reason', l: 'Reason of accident', span: 2 },
    { k: 'partLoss', l: 'Vehicle part loss (₹)', t: 'number', section: 'Losses' }, { k: 'partLossDesc', l: 'Part loss description', section: 'Losses' }, { k: 'humanLoss', l: 'Human loss (₹)', t: 'number', section: 'Losses' }, { k: 'humanLossDesc', l: 'Human loss description', section: 'Losses' }, { k: 'otherLoss', l: 'Other loss (₹)', t: 'number', section: 'Losses' }, { k: 'otherLossDesc', l: 'Other loss description', section: 'Losses' }, { k: 'responsible', l: 'Accident responsible person', section: 'Losses' }, { k: 'totalLoss', l: 'Total loss (₹)', t: 'number', section: 'Losses' }, { k: 'remark', l: 'Remark', t: 'textarea', span: 2, section: 'Losses' }],
  cols: (db) => [{ key: 'no', label: 'Accident no.', render: (r) => <DocNo>{r.no}</DocNo>, mobile: 'title' }, { key: 'date', label: 'Accident date', render: (r) => fmtDate(r.date) }, { key: 'truck', label: 'Vehicle no.', value: (r) => lookup.truckNo(db, r.truckId), mobile: 'sub' }, { key: 'driver', label: 'Driver', value: (r) => lookup.driverName(db, r.driverId) }, { key: 'loc', label: 'Location', value: (r) => lookup.cityName(db, r.location) }, { key: 'responsible', label: 'Responsible', filter: true }, { key: 'totalLoss', label: 'Total loss', align: 'right', render: (r) => inr(r.totalLoss), mobile: 'right' }],
  kpis: (db, rows) => <><KPI label="Accidents (90d)" value={rows.filter((r: any) => daysBetween(r.date) <= 90).length} icon={Siren} tone="bad" /><KPI label="Total loss" value={inr(sum(rows, (r: any) => r.totalLoss))} /><KPI label="Driver responsible" value={rows.filter((r: any) => r.responsible === 'Driver').length} tone="warn" /><KPI label="Days since last" value={rows.length ? daysBetween(rows.map((r: any) => r.date).sort().pop()) : '—'} tone="ok" /></> };
export const Accidents = () => <CrudPage def={ACC_DEF} />;
