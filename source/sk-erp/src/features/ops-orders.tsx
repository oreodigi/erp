import React, { useEffect, useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, lrStage } from '../store/store';
import { PageHeader, KPI, StatusBadge, Field, Input, Select, Textarea, Radio, FormSection, DocNo, Card, EmptyState, KV, Progress } from '../components/ui';
import { DataTable } from '../components/DataTable';
import { Drawer, Timeline } from '../components/overlays';
import { fmtDate, ymd, addDays, sum, cls, daysBetween, now } from '../lib/util';
import { Plus, Trash2, ClipboardList, CheckCircle2, Clock, PackageCheck, Eye, Pencil, PackagePlus, XCircle, Ban, FileText, AlertTriangle } from 'lucide-react';

export function ItemsEditor({ items, onChange, goods, units, showRemaining, max }: { items: any[]; onChange: (x: any[]) => void; goods: any[]; units: any[]; showRemaining?: boolean; max?: Record<number, number> }) {
  const [g, setG] = useState('');
  const [q, setQ] = useState<number | ''>('');
  const add = () => { if (!g || !q) return; const gd = goods.find((x) => x.id === g); onChange([...items, { goodsId: g, name: gd.name, unit: units.find((u) => u.id === gd.unit)?.name, qty: Number(q), remaining: Number(q) }]); setG(''); setQ(''); };
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[1fr_96px_auto] gap-2 items-end">
        <Field label="Item"><Select value={g} onChange={(e) => setG(e.target.value)} placeholder="Select goods" options={goods.map((x) => ({ value: x.id, label: x.name }))} /></Field>
        <Field label="Qty"><Input type="number" min={1} value={q} onChange={(e) => setQ(e.target.value === '' ? '' : Number(e.target.value))} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} /></Field>
        <button type="button" className="btn-violet h-9" onClick={add} disabled={!g || !q}><Plus size={14} /> Add item</button>
      </div>
      {items.length > 0 && (
        <div className="border border-line rounded-lg overflow-hidden">
          <table className="w-full text-[12.75px]">
            <thead className="bg-surface2"><tr className="text-[11px] text-muted uppercase"><th className="text-left px-3 py-1.5">Item</th><th className="text-left px-2">Unit</th><th className="text-right px-2 w-24">Qty</th>{showRemaining && <th className="text-right px-2">Pending</th>}<th className="w-9" /></tr></thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-1.5 font-medium">{it.name}</td><td className="px-2 text-muted">{it.unit}</td>
                  <td className="px-2"><input type="number" className="input h-7 text-right" value={it.qty} max={max?.[i]} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} aria-label="Quantity" /></td>
                  {showRemaining && <td className="px-2 text-right tnum text-muted">{it.pending ?? it.remaining}</td>}
                  <td className="pr-2"><button type="button" className="btn-icon h-7 w-7 hover:text-bad" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove item"><Trash2 size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderForm({ init, onClose }: { init?: any; onClose: () => void }) {
  const db = useDB();
  const [f, setF] = useState<any>(() => init || { clientId: useUI.getState().params.clientId || '', fromBranchId: 'JL', fromAddr: lookup.branch(db, 'JL').address, toBranchId: 'JL', toAddr: lookup.branch(db, 'JL').address, cityId: 'jalgaon', pickupDate: ymd(addDays(now(), 1)), instructions: '', orderBy: 'Truck', truckQty: 1, items: [], personName: '', personEmail: '', personPhone: '' });
  const [err, setErr] = useState('');
  const cust = lookup.cust(db, f.clientId);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const save = () => {
    if (!f.clientId) return setErr('Select a client');
    if (cust?.disallowLR) return setErr(`${cust.name} is on credit hold – new bookings are disallowed. Clear outstanding or lift the hold in Customer 360.`);
    if (!f.items.length) return setErr('Add at least one item');
    if (f.orderBy === 'Truck' && !f.truckQty) return setErr('Enter number of trucks');
    if (init?.id) A.updateOrder(init.id, f); else A.createOrder({ ...f, personName: f.personName || cust?.contactPerson || cust?.contact, personEmail: f.personEmail || cust?.email, personPhone: f.personPhone || cust?.phone });
    onClose();
  };
  return (
    <Drawer open onClose={onClose} title={init ? `Edit ${init.orderNo}` : 'Customer order booking'} subtitle="Legacy: Transactions/InitiateOrder.aspx" footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>{init ? 'Save changes' : 'Submit order'}</button></>}>
      <div className="p-4 sm:p-5 grid gap-5">
        {err && <div className="flex gap-2 items-start bg-bad/10 text-bad rounded-lg px-3 py-2 text-[12.5px]"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{err}</div>}
        <FormSection title="Client" cols={2}>
          <Field label="Client" required className="sm:col-span-2"><Select value={f.clientId} onChange={(e) => set('clientId', e.target.value)} placeholder="Select client" options={db.customers.map((c: any) => ({ value: c.id, label: `${c.name}${c.disallowLR ? ' (credit hold)' : ''}` }))} /></Field>
          {cust && <div className="sm:col-span-2 text-[12px] text-muted -mt-1">Credit {cust.creditDays} days · limit ₹{cust.creditLimit.toLocaleString('en-IN')} · {cust.billFormat}</div>}
        </FormSection>
        <FormSection title="Branches & pickup" cols={2}>
          <Field label="From branch" required><Select value={f.fromBranchId} onChange={(e) => setF({ ...f, fromBranchId: e.target.value, fromAddr: lookup.branch(db, e.target.value).address })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="To branch" required><Select value={f.toBranchId} onChange={(e) => setF({ ...f, toBranchId: e.target.value, toAddr: lookup.branch(db, e.target.value).address })} options={db.branches.map((b: any) => ({ value: b.id, label: b.name }))} /></Field>
          <Field label="From branch address"><Textarea rows={2} value={f.fromAddr} onChange={(e) => set('fromAddr', e.target.value)} /></Field>
          <Field label="To branch address"><Textarea rows={2} value={f.toAddr} onChange={(e) => set('toAddr', e.target.value)} /></Field>
          <Field label="Pick-up location" required><Select value={f.cityId} onChange={(e) => set('cityId', e.target.value)} options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} /></Field>
          <Field label="Pick-up date" required><Input type="date" value={f.pickupDate} onChange={(e) => set('pickupDate', e.target.value)} /></Field>
          <Field label="Instructions to pick-up branch" className="sm:col-span-2"><Textarea rows={2} value={f.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="Gate, timing, packing or vehicle notes" /></Field>
        </FormSection>
        <FormSection title="Order by" cols={2}>
          <Field label="Book by"><Radio options={['Truck', 'Item']} value={f.orderBy} onChange={(v) => set('orderBy', v)} /></Field>
          {f.orderBy === 'Truck' && <Field label="No. of trucks" required><Input type="number" min={1} value={f.truckQty} onChange={(e) => set('truckQty', Number(e.target.value))} /></Field>}
        </FormSection>
        <FormSection title="Item details" cols={1}><ItemsEditor items={f.items} onChange={(x) => set('items', x)} goods={db.goods} units={db.units} /></FormSection>
      </div>
    </Drawer>
  );
}

export function Orders() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const { nav, openRecord, ask } = useUI.getState();
  const [form, setForm] = useState<any>(params.new ? {} : null);
  useEffect(() => { if (params.new) setForm({}); }, [params.new]);
  const rows = db.orders.slice().reverse().map((o: any) => {
    const lrs = db.lrs.filter((l: any) => l.orderId === o.id);
    return { ...o, client: lookup.custName(db, o.clientId), lrTotal: lrs.length, lrFinal: lrs.filter((l: any) => l.isFinal).length, lrProcess: lrs.filter((l: any) => !['Delivered'].includes(l.status) && l.isFinal).length, lrPending: lrs.filter((l: any) => !l.isFinal).length, fulfil: o.items.length ? (sum(o.items, (i: any) => i.qty - i.remaining) / sum(o.items, (i: any) => i.qty)) * 100 : 0 };
  });
  const pending = db.orders.filter((o: any) => o.status === 'Pending').length;
  const ready = db.orders.filter((o: any) => ['Confirmed', 'In Process'].includes(o.status));
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Orders" subtitle="Customer bookings from initiation to LR. Confirmed orders flow into Generate LR; quantities are drawn down as LRs are created." actions={<button className="btn-primary" onClick={() => setForm({})}><Plus size={15} /> New order</button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KPI label="Awaiting confirmation" value={pending} icon={Clock} tone="warn" onClick={() => nav('ops/order-confirmation')} />
        <KPI label="Ready for LR" value={ready.length} icon={PackagePlus} tone="info" sub={`${sum(ready, (o: any) => (o.orderBy === 'Truck' ? o.remainingTruckQty : 0))} trucks to place`} />
        <KPI label="In process" value={db.orders.filter((o: any) => o.status === 'In Process').length} icon={ClipboardList} />
        <KPI label="Completed" value={db.orders.filter((o: any) => o.status === 'Completed').length} icon={PackageCheck} tone="ok" />
      </div>
      <DataTable id="orders" rows={rows} onRow={(r) => openRecord('order', r.id)}
        quickFilters={[{ key: 'p', label: 'Pending', fn: (r: any) => r.status === 'Pending' }, { key: 'r', label: 'Ready for LR', fn: (r: any) => ['Confirmed', 'In Process'].includes(r.status) }, { key: 'c', label: 'Closed', fn: (r: any) => ['Completed', 'Preclosed', 'Rejected'].includes(r.status) }]}
        cols={[
          { key: 'orderNo', label: 'Order Id', render: (r) => <DocNo>{r.orderNo}</DocNo>, mobile: 'title' },
          { key: 'client', label: 'Customer', filter: true, mobile: 'sub' },
          { key: 'from', label: 'From branch', value: (r) => lookup.branch(db, r.fromBranchId)?.short, filter: true },
          { key: 'to', label: 'To branch', value: (r) => lookup.branch(db, r.toBranchId)?.short, filter: true },
          { key: 'city', label: 'Pickup', value: (r) => lookup.cityName(db, r.cityId), render: (r) => <span>{lookup.cityName(db, r.cityId)}<span className="text-muted"> · {fmtDate(r.pickupDate)}</span></span>, mobile: 'sub' },
          { key: 'createdAt', label: 'IO date', render: (r) => fmtDate(r.createdAt) },
          { key: 'orderBy', label: 'By', render: (r) => (r.orderBy === 'Truck' ? `${r.truckQty} truck` : 'Item') },
          { key: 'lrTotal', label: 'LRs (total / final / pending)', align: 'right', render: (r) => <span className="tnum">{r.lrTotal} / {r.lrFinal} / {r.lrPending}</span> },
          { key: 'fulfil', label: 'Fulfilled', render: (r) => <div className="w-20"><Progress value={r.fulfil} tone="ok" /></div> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge s={r.status} />, filter: true, mobile: 'meta' },
        ]}
        rowActions={(r: any) => [
          { label: 'View', icon: Eye, onClick: () => openRecord('order', r.id) },
          { label: 'Edit', icon: Pencil, onClick: () => setForm(r), hidden: r.status !== 'Pending' },
          { label: 'Confirm / reject', icon: CheckCircle2, onClick: () => nav('ops/order-confirmation', { id: r.id }), hidden: r.status !== 'Pending' },
          { label: 'Create LR', icon: PackagePlus, onClick: () => nav('ops/lr-new', { orderId: r.id }), hidden: !['Confirmed', 'In Process'].includes(r.status) },
          { label: 'Show LRs', icon: FileText, onClick: () => nav('ops/lr', { q: r.orderNo }), hidden: !r.lrTotal },
          { label: 'Pre-close', icon: Ban, onClick: () => ask({ title: `Pre-close ${r.orderNo}?`, body: 'Remaining quantity will be cancelled and the order closed. LRs already created are not affected.', confirmLabel: 'Pre-close', tone: 'bad', onConfirm: () => A.precloseOrder(r.id) }), hidden: !['Confirmed', 'In Process'].includes(r.status) },
          { label: 'Delete', icon: Trash2, tone: 'bad', onClick: () => ask({ title: `Delete ${r.orderNo}?`, body: 'This order has no LRs and will be permanently removed.', confirmLabel: 'Delete', tone: 'bad', onConfirm: () => A.remove('orders', r.id, 'Order') }), hidden: r.lrTotal > 0 },
        ]}
      />
      {form && <OrderForm init={form.id ? form : undefined} onClose={() => { setForm(null); useUI.getState().set({ params: {} }); }} />}
    </div>
  );
}

export function OrderConfirmation() {
  const db = useDB();
  const params = useUI((s) => s.params);
  const openRecord = useUI((s) => s.openRecord);
  const nav = useUI((s) => s.nav);
  const [tab, setTab] = useState('Pending');
  const list = db.orders.filter((o: any) => (tab === 'Pending' ? o.status === 'Pending' : ['Confirmed', 'Rejected', 'In Process'].includes(o.status))).slice().reverse();
  const [sel, setSel] = useState<string>(params.id || list[0]?.id || '');
  const o = db.orders.find((x: any) => x.id === sel);
  const [f, setF] = useState<any>(null);
  useEffect(() => { if (o) setF({ pickupDate: o.pickupDate, cityId: o.cityId, instructions: o.instructions, status: 'Confirmed', billingAmt: o.billingAmt || '', personName: o.personName, personEmail: o.personEmail, personPhone: o.personPhone, truckQty: o.truckQty, items: o.items.map((i: any) => ({ ...i })), reason: '' }); }, [sel, o?.status]);
  const cust = o && lookup.cust(db, o.clientId);
  const rc = o && db.rateContracts.find((r: any) => r.customerId === o.clientId);
  return (
    <div>
      <PageHeader eyebrow="Operations" title="Order confirmation" subtitle="Review customer orders, adjust pickup and quantities, then confirm or reject. Confirmed orders become selectable in Generate LR." />
      <div className="grid lg:grid-cols-[360px_1fr] gap-4 items-start">
        <Card pad={false}>
          <div className="flex border-b border-line">{['Pending', 'Reviewed'].map((t) => <button key={t} onClick={() => setTab(t)} className={cls('tab flex-1', tab === t && 'tab-active')}>{t} <span className="text-faint tnum">({db.orders.filter((o: any) => (t === 'Pending' ? o.status === 'Pending' : ['Confirmed', 'Rejected', 'In Process'].includes(o.status))).length})</span></button>)}</div>
          {list.length === 0 ? <EmptyState icon={CheckCircle2} title="All caught up" body="No orders waiting for confirmation." /> : (
            <ul className="divide-y divide-line max-h-[70vh] overflow-auto">
              {list.map((x: any) => (
                <li key={x.id}><button onClick={() => setSel(x.id)} className={cls('w-full text-left px-4 py-3 hover:bg-surface2 transition', sel === x.id && 'bg-violet/[.06] shadow-[inset_3px_0_0_rgb(var(--brand))]')}>
                  <div className="flex justify-between gap-2"><DocNo>{x.orderNo}</DocNo><StatusBadge s={x.status} /></div>
                  <div className="font-semibold text-[13px] mt-1 truncate">{lookup.custName(db, x.clientId)}</div>
                  <div className="text-[12px] text-muted">{lookup.cityName(db, x.cityId)} · pickup {fmtDate(x.pickupDate)} · {x.orderBy === 'Truck' ? `${x.truckQty} trucks` : `${sum(x.items, (i: any) => i.qty)} qty`}</div>
                </button></li>
              ))}
            </ul>
          )}
        </Card>
        {o && f ? (
          <Card title={<span className="flex items-center gap-2"><DocNo>{o.orderNo}</DocNo> · {cust?.name}</span>} subtitle={`Initiated ${fmtDate(o.createdAt)} by ${o.createdBy}`} actions={<button className="btn-subtle btn-sm" onClick={() => openRecord('order', o.id)}>Open 360</button>}>
            <div className="grid gap-5">
              {cust && <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface2 rounded-lg p-3 text-[12.5px]">
                <div><div className="text-muted text-[11px] font-semibold">Credit</div>{cust.creditDays} days</div>
                <div><div className="text-muted text-[11px] font-semibold">Outstanding</div>₹{sum(db.bills.filter((b: any) => b.clientId === cust.id && !b.deleted), (b: any) => b.pending).toLocaleString('en-IN')}</div>
                <div><div className="text-muted text-[11px] font-semibold">Rate contract</div>{rc ? `till ${fmtDate(rc.to)}` : 'None'}</div>
                <div><div className="text-muted text-[11px] font-semibold">Booking</div>{cust.disallowLR ? <span className="text-bad font-semibold">Credit hold</span> : 'Allowed'}</div>
              </div>}
              <FormSection title="Pickup" cols={3}>
                <Field label="Pick-up date"><Input type="date" value={f.pickupDate} onChange={(e) => setF({ ...f, pickupDate: e.target.value })} disabled={o.status !== 'Pending'} /></Field>
                <Field label="Pick-up location"><Select value={f.cityId} onChange={(e) => setF({ ...f, cityId: e.target.value })} options={db.cities.map((c: any) => ({ value: c.id, label: c.name }))} disabled={o.status !== 'Pending'} /></Field>
                {o.orderBy === 'Truck' && <Field label="Truck quantity"><Input type="number" value={f.truckQty} onChange={(e) => setF({ ...f, truckQty: Number(e.target.value) })} disabled={o.status !== 'Pending'} /></Field>}
                <Field label="Instructions to pick-up branch" className="sm:col-span-3"><Textarea rows={2} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} disabled={o.status !== 'Pending'} /></Field>
              </FormSection>
              <FormSection title="Customer contact" cols={3}>
                <Field label="Person name"><Input value={f.personName} onChange={(e) => setF({ ...f, personName: e.target.value })} /></Field>
                <Field label="Person email"><Input value={f.personEmail} onChange={(e) => setF({ ...f, personEmail: e.target.value })} /></Field>
                <Field label="Phone number"><Input value={f.personPhone} onChange={(e) => setF({ ...f, personPhone: e.target.value })} /></Field>
              </FormSection>
              <FormSection title="Items" cols={1}>
                {o.status === 'Pending' ? <ItemsEditor items={f.items} onChange={(x) => setF({ ...f, items: x })} goods={db.goods} units={db.units} /> : <KV cols={3} items={o.items.map((i: any) => [i.name, `${i.qty} ${i.unit} · ${i.remaining} pending`])} />}
              </FormSection>
              {o.status === 'Pending' ? (
                <FormSection title="Decision" cols={3}>
                  <Field label="Order status"><Radio options={['Confirmed', 'Rejected']} value={f.status} onChange={(v) => setF({ ...f, status: v })} /></Field>
                  <Field label="Billing amount (₹)" hint={rc ? 'Pre-filled from rate contract where possible' : undefined}><Input type="number" value={f.billingAmt} onChange={(e) => setF({ ...f, billingAmt: Number(e.target.value) })} /></Field>
                  {f.status === 'Rejected' && <Field label="Reason"><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. vehicle not available" /></Field>}
                  <div className="sm:col-span-3 flex flex-wrap gap-2 justify-end pt-1">
                    <button className="btn-ghost" onClick={() => setSel('')}>Cancel</button>
                    {f.status === 'Confirmed' ? <button className="btn-ok" onClick={() => { A.confirmOrder(o.id, f, 'Confirmed'); }}><CheckCircle2 size={15} /> Confirm order</button> : <button className="btn-bad" onClick={() => A.confirmOrder(o.id, f, 'Rejected')}><XCircle size={15} /> Reject order</button>}
                  </div>
                </FormSection>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 bg-surface2 rounded-lg p-3"><span className="text-[13px]">This order is <b>{o.status.toLowerCase()}</b>.</span>{['Confirmed', 'In Process'].includes(o.status) && <button className="btn-primary" onClick={() => nav('ops/lr-new', { orderId: o.id })}><PackagePlus size={15} /> Generate LR</button>}</div>
              )}
              <div><div className="eyebrow mb-2">History</div><Timeline items={o.events} /></div>
            </div>
          </Card>
        ) : <Card><EmptyState title="Select an order" body="Choose an order from the list to review it." /></Card>}
      </div>
    </div>
  );
}
