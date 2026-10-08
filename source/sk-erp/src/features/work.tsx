// "My Work" – one inbox of everything waiting on the signed-in person, with the action button on each row.
import React, { useMemo, useState } from 'react';
import { useDB, useUI, A, lookup, byId } from '../store/store';
import { useRole } from '../components/AppShell';
import { allCards, Card } from '../lib/stages';
import { runStep } from '../components/QuickActions';
import { useT } from '../lib/useT';
import { PageHeader, EmptyState, Segmented } from '../components/ui';
import { inr, fmtDate, daysBetween, cls, compactINR } from '../lib/util';
import { CheckCircle2, Truck, FileText, MapPinned, TrainFront, Inbox, Receipt, IndianRupee, Wrench, ShoppingCart, BadgeCheck, Stamp, Route, FileWarning, ChevronRight, PartyPopper } from 'lucide-react';

type Item = { id: string; title: string; sub: string; age: number; amount?: number; stuck?: boolean; act: () => void; refId: string };
type Group = { key: string; title: string; why: string; icon: any; roles: string[]; action: string; bulk?: 'pod' | 'bill'; items: Item[] };

const ALL = ['SA', 'AD'];
export function buildGroups(db: any): Group[] {
  const cards = allCards(db);
  const ui = useUI.getState();
  const fromCards = (pred: (c: Card) => boolean) => cards.filter(pred).sort((a, b) => b.age - a.age).map((c) => ({ id: c.id, refId: c.refId, title: `${c.no} · ${c.customer}`, sub: `${c.route}${c.vehicle ? ' · ' + c.vehicle : ''}${c.reason ? ' · ' + c.reason : ''}`, age: c.age, amount: c.amount, stuck: c.health === 'stuck', act: () => c.next && runStep(c.next.action, c.refId) }));
  const in30 = (d: string) => d && daysBetween(d) >= -30;
  const own = db.trucks.filter((t: any) => t.type === 'Own' && t.isActive !== false);
  const docDue = own.map((t: any) => { const due = [['Insurance', t.insDue], ['Fitness', t.fitDue], ['Permit', t.npDue], ['Tax', t.taxDue]].filter(([, d]) => d && in30(d as string)); return { t, due }; }).filter((x: any) => x.due.length);
  return [
    { key: 'confirm', title: 'Confirm customer orders', why: 'Customers are waiting to hear that their truck is booked.', icon: CheckCircle2, roles: ['OP', 'BU'], action: 'Confirm', items: fromCards((c) => c.kind === 'order' && c.stage === 'booked') },
    { key: 'makelr', title: 'Make LR for confirmed orders', why: 'Order is confirmed but no LR has been made yet.', icon: FileText, roles: ['OP', 'BU'], action: 'Make LR', items: fromCards((c) => c.kind === 'order' && c.stage === 'vehicle') },
    { key: 'drafts', title: 'Finish draft LRs', why: 'Draft LRs cannot be dispatched or billed.', icon: FileText, roles: ['OP', 'BU'], action: 'Finish', items: fromCards((c) => c.kind === 'lr' && c.stage === 'vehicle' && c.sub === 'LR in draft') },
    { key: 'dispatch', title: 'Assign a truck', why: 'LR is ready but no vehicle is attached.', icon: Truck, roles: ['OP', 'BU', 'CO'], action: 'Assign truck', items: fromCards((c) => c.kind === 'lr' && c.stage === 'vehicle' && c.sub !== 'LR in draft') },
    { key: 'deliver', title: 'Confirm delivery of late trucks', why: 'These trucks are past their due date. Call the driver and mark delivered.', icon: MapPinned, roles: ['OP', 'BU', 'CC'], action: 'Mark delivered', items: fromCards((c) => c.stage === 'transit' && c.health === 'stuck' && c.next?.action === 'deliver') },
    { key: 'rail', title: 'Rail loads not moving', why: 'Goods waiting at the rail head or destination branch.', icon: TrainFront, roles: ['OP', 'BU'], action: 'Open', items: fromCards((c) => c.stage === 'transit' && c.health === 'stuck' && ['rake', 'dc'].includes(c.next?.action || '')) },
    { key: 'pod', title: 'Collect POD copies', why: 'Without the signed POD we cannot bill the customer.', icon: Inbox, roles: ['CC', 'BU', 'OP'], action: 'POD received', bulk: 'pod', items: fromCards((c) => c.stage === 'delivered') },
    { key: 'bill', title: 'Make bills', why: 'POD is in hand – bill today so payment starts sooner.', icon: Receipt, roles: ['AC'], action: 'Make bill', bulk: 'bill', items: fromCards((c) => c.stage === 'pod') },
    { key: 'collect', title: 'Follow up on overdue payments', why: 'Bills past the customer’s credit days.', icon: IndianRupee, roles: ['AC'], action: 'Payment received', items: fromCards((c) => c.stage === 'billed' && c.health === 'stuck') },
    { key: 'dcapprove', title: 'Approve delivery challans for payment', why: 'Transporter delivered and acknowledgments are in.', icon: Stamp, roles: ['AC'], action: 'Approve', items: db.dcs.filter((d: any) => (d.ackSupervisor || d.ackCollection) && !d.approval).slice().reverse().map((d: any) => ({ id: d.id, refId: d.id, title: `${d.dcNo} · ${lookup.transName(db, d.transporterId)}`, sub: `${lookup.cityName(db, d.destCity)} · freight ${inr(d.freight)}`, age: daysBetween(d.loadingDate || d.createdAt), amount: d.freight, act: () => ui.nav('fin/dc-approval') })) },
    { key: 'tpapprove', title: 'Approve transporter payment slips', why: 'Market truck owners are waiting for payment.', icon: BadgeCheck, roles: ['AC'], action: 'Approve', items: db.tpSlips.filter((t: any) => t.status === 'Pending').map((t: any) => ({ id: t.id, refId: t.id, title: `${t.slipNo} · ${lookup.transName(db, t.transporterId)}`, sub: `${t.rows.length} LR`, age: daysBetween(t.date), amount: t.payable, act: () => A.approveTPSlip([t.id]) })) },
    { key: 'jobcards', title: 'Approve job cards', why: 'Truck is waiting in the workshop.', icon: Wrench, roles: ['SI', 'CO'], action: 'Approve', items: db.jobcards.filter((j: any) => j.status === 'Pending Approval').map((j: any) => ({ id: j.id, refId: j.id, title: `${j.no} · ${lookup.truckNo(db, j.truckId)}`, sub: j.remark, age: daysBetween(j.inDate), amount: j.net, act: () => A.approveJobCard(j.id) })) },
    { key: 'pos', title: 'Approve spare purchases', why: 'Purchase order is waiting for approval.', icon: ShoppingCart, roles: ['SI'], action: 'Approve', items: db.pos.filter((p: any) => p.status === 'Pending Approval').map((p: any) => ({ id: p.id, refId: p.id, title: `${p.no} · ${lookup.supplier(db, p.supplierId)}`, sub: `${p.items.length} item(s)`, age: daysBetween(p.date), amount: p.net, act: () => A.approvePO(p.id) })) },
    { key: 'trips', title: 'Close finished trips', why: 'Open trips block the log slip and diesel settlement.', icon: Route, roles: ['CO'], action: 'Close trip', items: db.trips.filter((t: any) => !t.completed && daysBetween(t.startDate) > 5).sort((a: any, b: any) => (a.startDate || '').localeCompare(b.startDate || '')).map((t: any) => ({ id: t.id, refId: t.id, title: `${lookup.truckNo(db, t.truckId)} · ${t.name}`, sub: `${lookup.cityName(db, t.fromCity)} → ${lookup.cityName(db, t.toCity)}`, age: daysBetween(t.startDate), stuck: true, act: () => ui.nav('fleet/trip-completion') })) },
    { key: 'docs', title: 'Renew truck documents', why: 'Insurance, fitness, permit or tax expiring within 30 days (or already expired).', icon: FileWarning, roles: ['CO'], action: 'Open truck', items: docDue.map(({ t, due }: any) => ({ id: t.id, refId: t.id, title: t.number, sub: due.map(([k, d]: any) => `${k} ${daysBetween(d) > 0 ? 'expired' : 'due'} ${fmtDate(d)}`).join(' · '), age: Math.max(...due.map(([, d]: any) => daysBetween(d))), stuck: due.some(([, d]: any) => daysBetween(d) > 0), act: () => ui.openRecord('truck', t.id) })) },
  ];
}

export function workCount(db: any, code?: string) {
  try { return buildGroups(db).filter((g) => !code || ALL.includes(code) || g.roles.includes(code)).reduce((a, g) => a + g.items.length, 0); } catch { return 0; }
}

export function MyWork() {
  const t = useT();
  const db = useDB();
  const { role, user } = useRole();
  const guide = useUI((s) => s.guide);
  const [scope, setScope] = useState<'mine' | 'all'>(ALL.includes(role.code) ? 'all' : 'mine');
  const groups = useMemo(() => buildGroups(db), [db]);
  const shown = groups.filter((g) => g.items.length && (scope === 'all' || ALL.includes(role.code) || g.roles.includes(role.code)));
  const total = shown.reduce((a, g) => a + g.items.length, 0);
  return (
    <div>
      <PageHeader eyebrow={`${t(role.name)} · ${user.firstName}`} title={t('My Work')} subtitle={total ? t('{n} things need you. Oldest first – clear the red ones before anything else.', { n: total.toLocaleString('en-IN') }) : t('Nothing is waiting on you.')}
        actions={!ALL.includes(role.code) && <Segmented options={[{ key: 'mine', label: t('My tasks') }, { key: 'all', label: t('Everyone') }]} value={scope} onChange={(v: any) => setScope(v)} />} />
      {!shown.length && <EmptyState icon={PartyPopper} title={t('All clear')} body={t('No pending work for your role right now.')} />}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-2 items-start">
        {shown.map((g) => <WorkGroup key={g.key} g={g} guide={guide} />)}
      </div>
    </div>
  );
}

function WorkGroup({ g, guide }: { g: Group; guide: boolean }) {
  const t = useT();
  const [n, setN] = useState(5);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const doQuick = useUI((s) => s.doQuick);
  const I = g.icon;
  const stuck = g.items.filter((i) => i.stuck).length;
  const list = g.items.slice(0, n);
  const toggle = (id: string) => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s); };
  const refIds = (ids: string[]) => g.items.filter((i) => ids.includes(i.id)).map((i) => i.refId);
  return (
    <section className="card overflow-hidden" aria-label={t(g.title)}>
      <header className="flex items-start gap-3 px-4 py-3 border-b border-line">
        <span className={cls('w-10 h-10 rounded-xl grid place-items-center shrink-0', stuck ? 'bg-bad/10 text-bad' : 'bg-violet/10 text-violet')}><I size={19} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[15px] leading-tight">{t(g.title)}</h2>
          <p className="text-[12.5px] text-muted mt-0.5">{t('{n} waiting', { n: g.items.length.toLocaleString('en-IN') })}{stuck ? <> · <b className="text-bad">{t('{n} late', { n: stuck })}</b></> : ''}{guide ? ` · ${t(g.why)}` : ''}</p>
        </div>
        {g.bulk && sel.size > 0 && <button className="btn-primary h-9 shrink-0" onClick={() => { doQuick(g.bulk!, refIds([...sel])); setSel(new Set()); }}>{g.bulk === 'pod' ? t('POD for {n}', { n: sel.size }) : t('Bill {n}', { n: sel.size })}</button>}
      </header>
      <ul className="divide-y divide-line">
        {list.map((it) => (
          <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
            {g.bulk && <input type="checkbox" aria-label={t('Select {name}', { name: it.title })} className="w-4 h-4 accent-[rgb(var(--violet))] shrink-0" checked={sel.has(it.id)} onChange={() => toggle(it.id)} />}
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold truncate">{it.title}</div>
              <div className="text-[12px] text-muted truncate">{String(it.sub || '').split(' · ').map((p) => t(p)).join(' · ')}</div>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              {it.amount ? <div className="text-[12.5px] tnum font-semibold">{compactINR(it.amount)}</div> : null}
              <div className={cls('text-[11.5px] tnum', it.stuck ? 'text-bad font-semibold' : 'text-faint')}>{it.age > 0 ? t('{n}d', { n: it.age }) : t('today')}</div>
            </div>
            <button className={cls('h-9 px-3 rounded-lg text-[12.5px] font-semibold shrink-0 border', it.stuck ? 'bg-brand text-white border-brand' : 'border-line hover:border-violet/50')} onClick={it.act}>{t(g.action)}</button>
          </li>
        ))}
      </ul>
      {g.items.length > n && <button className="w-full h-10 border-t border-line text-[12.5px] font-semibold text-violet flex items-center justify-center gap-1" onClick={() => setN(n + 15)}>{t('Show more ({n} left)', { n: (g.items.length - n).toLocaleString('en-IN') })} <ChevronRight size={14} /></button>}
    </section>
  );
}
