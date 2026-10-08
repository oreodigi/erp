// Consignment stage engine: puts every open order / LR into one pipeline stage, measures how long it
// has been there against a time limit (SLA), and explains why it is stuck and who it is waiting on.
import { byId, lookup } from '../store/store';
import { daysBetween, now } from './util';

export type StageKey = 'booked' | 'vehicle' | 'transit' | 'delivered' | 'pod' | 'billed' | 'paid';
export const STAGES: { key: StageKey; label: string; short: string; help: string; owner: string }[] = [
  { key: 'booked', label: 'Booked', short: 'Booked', help: 'Order received from the customer and waiting for confirmation.', owner: 'Branch manager' },
  { key: 'vehicle', label: 'Waiting for vehicle', short: 'Vehicle', help: 'Confirmed – a truck or rake has to be assigned and the LR made.', owner: 'Branch operations' },
  { key: 'transit', label: 'On the way', short: 'Moving', help: 'Goods are moving by road or rail.', owner: 'Operations / rail team' },
  { key: 'delivered', label: 'Delivered – POD pending', short: 'POD', help: 'Goods delivered. The signed POD copy must come back before billing.', owner: 'Customer care' },
  { key: 'pod', label: 'Ready to bill', short: 'To bill', help: 'POD received. Accounts can raise the bill.', owner: 'Accounts' },
  { key: 'billed', label: 'Billed – awaiting payment', short: 'Billed', help: 'Bill sent to the customer. Waiting for payment.', owner: 'Accounts' },
  { key: 'paid', label: 'Paid / closed', short: 'Paid', help: 'Payment received or freight collected. Nothing pending.', owner: '—' },
];
export const stageIdx = (k: StageKey) => STAGES.findIndex((s) => s.key === k);

export type DefaultSLA = Record<StageKey, number>; // days
export const DEFAULT_SLA: DefaultSLA = { booked: 0.25, vehicle: 1, transit: 0, delivered: 7, pod: 3, billed: 0, paid: 9999 };

export type Card = {
  id: string; kind: 'order' | 'lr'; refId: string; no: string; stage: StageKey; sub: string; customer: string; customerId: string; route: string;
  vehicle: string; amount: number; since: string; age: number; limit: number; health: 'ok' | 'warn' | 'stuck'; reason: string; owner: string;
  mode: string; branchId: string; date: string; next: { label: string; action: string } | null;
};

const ago = (d?: string) => (d ? Math.max(0, daysBetween(d.slice(0, 10))) : 0);

// an LR's share of what is still pending on its bill (a bill usually covers several LRs)
function lrShare(bill: any, l: any) {
  const rows = bill.rows || [];
  const tot = rows.reduce((a: number, r: any) => a + (r.net || r.freight || 0), 0);
  const mine = rows.find((r: any) => r.lrId === l.id);
  if (!tot || !mine) return rows.length ? bill.pending / rows.length : bill.pending;
  return Math.round(bill.pending * ((mine.net || mine.freight || 0) / tot));
}

export function lrCard(db: any, l: any, sla: DefaultSLA = DEFAULT_SLA): Card | null {
  if (l.status === 'Cancelled') return null;
  const cust = byId(db.customers, l.consignorId);
  const bill = l.billId ? byId(db.bills, l.billId) : null;
  const route = `${lookup.cityName(db, l.sourceCity)} → ${lookup.cityName(db, l.destCity)}`;
  const tbb = (l.paymentMode || 'To Be Billed') === 'To Be Billed';
  let stage: StageKey, since = l.createdAt, limit = 1, reason = '', sub = l.status, next: Card['next'] = null;
  const vehicle = l.truckId ? lookup.truckNo(db, l.truckId) : l.scheduleId ? byId(db.schedules, l.scheduleId)?.rakeNo || 'Rake' : '';
  if (bill && !bill.deleted) {
    if (bill.pending <= 0) { stage = 'paid'; since = bill.date; limit = 9999; sub = 'Paid'; }
    else { stage = 'billed'; since = bill.date; limit = sla.billed || cust?.creditDays || 30; sub = `Bill ${bill.billNo}`; reason = 'Payment overdue'; next = { label: 'Record payment', action: 'pay' }; }
  } else if (l.ack) {
    if (!tbb) { stage = 'paid'; since = l.ack.at || l.ack.receivedDate; limit = 9999; sub = l.paymentMode; }
    else { stage = 'pod'; since = l.ack.receivedDate || l.ack.at; limit = sla.pod; sub = 'POD received'; reason = 'Bill not generated'; next = { label: 'Make bill', action: 'bill' }; }
  } else if (l.status === 'Delivered') {
    stage = 'delivered'; since = l.delivery?.date || l.createdAt; limit = sla.delivered; sub = 'POD pending'; reason = 'POD not received'; next = { label: 'Record POD', action: 'pod' };
    if (!tbb) { reason = 'POD not received'; }
  } else if (l.status === 'Draft' || (!l.truckId && !l.tripId && !l.scheduleId && !l.grnId && l.mode === 'Road')) {
    stage = 'vehicle'; since = l.createdAt; limit = sla.vehicle; sub = l.status === 'Draft' ? 'LR in draft' : 'No truck';
    reason = l.status === 'Draft' ? 'LR not finalised' : 'No vehicle assigned'; next = l.status === 'Draft' ? { label: 'Finish LR', action: 'open' } : { label: 'Assign truck', action: 'dispatch' };
  } else {
    stage = 'transit'; since = l.placeDate || l.createdAt; limit = (l.stdDays || 2) + 1 + (sla.transit || 0);
    const R: Record<string, [string, string, string]> = {
      'In Transit': ['On road', 'Delivery not confirmed', 'deliver'], Finalised: ['Ready to move', 'Not dispatched yet', 'dispatch'],
      'At Rail Head': ['At rail head', 'Waiting for wagon loading', 'rake'], Loaded: ['Loaded on wagon', 'Rake not dispatched', 'rake'],
      'Rake In Transit': ['Rake moving', 'Rake running late', 'rake'], 'At Branch': ['At destination branch', 'Delivery challan not made', 'dc'],
      'Out for Delivery': ['Out for delivery', 'Delivery not confirmed', 'deliver'],
    };
    const r = R[l.status] || [l.status, 'Not moving', 'open'];
    sub = r[0]; reason = r[1];
    next = { label: { deliver: 'Mark delivered', dispatch: 'Dispatch', rake: 'Open rake', dc: 'Make challan', open: 'Open' }[r[2]] || 'Open', action: r[2] };
  }
  if (cust?.disallowLR && stage !== 'paid') reason = reason ? `${reason} · customer on credit hold` : 'Customer on credit hold';
  const age = ago(since);
  const health: Card['health'] = stage === 'paid' ? 'ok' : age > limit ? 'stuck' : age >= limit * 0.8 ? 'warn' : 'ok';
  return {
    id: 'lr:' + l.id, kind: 'lr', refId: l.id, no: l.lrNo, stage, sub, customer: cust?.name || '—', customerId: l.consignorId, route, vehicle,
    amount: bill && stage === 'billed' ? lrShare(bill, l) : l.freight || 0, since, age, limit, health, reason: health === 'ok' && stage !== 'paid' ? '' : reason,
    owner: STAGES[stageIdx(stage)].owner, mode: l.mode, branchId: l.fromBranchId, date: l.placeDate || (l.createdAt || '').slice(0, 10), next,
  };
}

export function orderCard(db: any, o: any, sla: DefaultSLA = DEFAULT_SLA): Card | null {
  const open = o.status === 'Pending' || ((o.status === 'Confirmed' || o.status === 'In Process') && !db.lrs.some((l: any) => l.orderId === o.id));
  if (!open) return null;
  const cust = byId(db.customers, o.clientId);
  const stage: StageKey = o.status === 'Pending' ? 'booked' : 'vehicle';
  const since = stage === 'booked' ? o.createdAt : o.confirmedAt || o.createdAt;
  const limit = stage === 'booked' ? sla.booked : sla.vehicle;
  const age = ago(since);
  const health: Card['health'] = age > limit ? 'stuck' : age >= limit * 0.8 ? 'warn' : 'ok';
  let reason = stage === 'booked' ? 'Waiting for confirmation' : 'No LR / vehicle yet';
  if (cust?.disallowLR) reason = 'Customer on credit hold';
  return {
    id: 'ord:' + o.id, kind: 'order', refId: o.id, no: o.orderNo, stage, sub: stage === 'booked' ? 'New order' : 'Confirmed', customer: cust?.name || '—', customerId: o.clientId,
    route: `${lookup.branch(db, o.fromBranchId)?.name || ''} → ${lookup.branch(db, o.toBranchId)?.name || ''}`, vehicle: o.orderBy === 'Truck' ? `${o.truckQty || 1} truck(s)` : `${(o.items || []).length} item(s)`,
    amount: o.billingAmt || 0, since, age, limit, health, reason: health === 'ok' ? '' : reason, owner: STAGES[stageIdx(stage)].owner, mode: 'Road', branchId: o.fromBranchId,
    date: (o.createdAt || '').slice(0, 10), next: stage === 'booked' ? { label: 'Confirm', action: 'confirm' } : { label: 'Make LR', action: 'makelr' },
  };
}

const cache = new WeakMap<any, Card[]>();
export function allCards(db: any): Card[] {
  const hit = cache.get(db);
  if (hit) return hit;
  const sla = { ...DEFAULT_SLA, ...(db.slaDays || {}) };
  const cards = [...db.orders.map((o: any) => orderCard(db, o, sla)), ...db.lrs.map((l: any) => lrCard(db, l, sla))].filter(Boolean) as Card[];
  cache.set(db, cards);
  return cards;
}

export function stageSummary(cards: Card[]) {
  return STAGES.map((s) => {
    const list = cards.filter((c) => c.stage === s.key);
    const stuck = list.filter((c) => c.health === 'stuck');
    return { ...s, count: list.length, value: list.reduce((a, c) => a + (c.amount || 0), 0), stuck: stuck.length, stuckValue: stuck.reduce((a, c) => a + (c.amount || 0), 0), warn: list.filter((c) => c.health === 'warn').length };
  });
}

export const todayStr = () => { const d = now(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
