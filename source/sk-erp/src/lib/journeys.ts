// Truck journeys: turns trips + trip expenses + fixed costs into per-truck and per-trip numbers
// (km run, loaded vs empty, freight earned, diesel, other costs, profit, idle days).
import { byId, distKm, isDiesel } from '../store/store';
import { addDays, now, ymd } from './util';

export type Period = '30' | '90' | 'fy' | 'all';
export const PERIODS: { key: Period; label: string }[] = [
  { key: '30', label: 'Last 30 days' }, { key: '90', label: 'Last 90 days' }, { key: 'fy', label: 'This year (FY)' }, { key: 'all', label: 'All' },
];
export function periodFrom(p: Period) {
  const d = now();
  if (p === '30') return ymd(addDays(d, -29));
  if (p === '90') return ymd(addDays(d, -89));
  if (p === 'fy') return `${d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1}-04-01`;
  return '2000-01-01';
}

export type Leg = {
  trip: any; start: string; end: string; open: boolean; loaded: boolean; km: number; kmEst: boolean;
  freight: number; diesel: number; dieselQty: number; other: number; profit: number; lr: any | null;
};
export type TruckStat = {
  truck: any; legs: Leg[]; trips: number; loadedTrips: number; km: number; loadedKm: number; emptyKm: number; emptyPct: number;
  freight: number; diesel: number; dieselQty: number; other: number; tripProfit: number; fixed: number; profit: number; perKm: number; kmpl: number;
  activeDays: number; idleDays: number; days: number; last: Leg | null;
};

const expIdx = new WeakMap<any[], Map<string, any[]>>();
function expensesByTrip(db: any) {
  let m = expIdx.get(db.tripExpenses);
  if (!m) { m = new Map(); for (const e of db.tripExpenses) { if (!e.tripId) continue; const a = m.get(e.tripId); a ? a.push(e) : m.set(e.tripId, [e]); } expIdx.set(db.tripExpenses, m); }
  return m;
}
const tripIdx = new WeakMap<any[], Map<string, any[]>>();
export function tripsByTruck(db: any) {
  let m = tripIdx.get(db.trips);
  if (!m) { m = new Map(); for (const t of db.trips) { const a = m.get(t.truckId); a ? a.push(t) : m.set(t.truckId, [t]); } tripIdx.set(db.trips, m); }
  return m;
}

export function legOf(db: any, t: any): Leg {
  const ex = expensesByTrip(db).get(t.id) || [];
  let diesel = 0, dieselQty = 0, other = 0;
  for (const e of ex) { if (isDiesel(db, e.typeId)) { diesel += e.amount || 0; dieselQty += e.qty || 0; } else other += e.amount || 0; }
  const lr = t.lrId ? byId(db.lrs, t.lrId) : null;
  const loaded = !t.isEmpty;
  const freight = loaded ? (t.onwardFreight || lr?.freight || 0) : 0;
  const odo = t.completed && t.closingKm > t.openingKm ? t.closingKm - t.openingKm : 0;
  const ok = odo > 0 && odo < 4000;
  const km = ok ? odo : t.completed ? distKm(t.fromCity, t.toCity) || 0 : 0;
  return {
    trip: t, start: `${t.startDate || ''}${t.startTime ? 'T' + t.startTime : ''}`, end: t.completed ? `${t.endDate || t.startDate || ''}${t.endTime ? 'T' + t.endTime : ''}` : '',
    open: !t.completed, loaded, km, kmEst: !ok && km > 0, freight, diesel, dieselQty, other, profit: freight - diesel - other, lr,
  };
}

// Monthly truck costs (EMI, tax, permit, insurance, fitness, salary) + repairs, prorated to the days in the period.
// A single cost head above ₹1 lakh a month is a data-entry slip in the old ERP (e.g. sum insured typed as premium) and is skipped.
const CAP = 100000;
function fixedCost(db: any, truckId: string, from: string, to: string) {
  const fm = from.slice(0, 7), tm = to.slice(0, 7);
  let s = 0;
  for (const f of db.fixedExpenses) {
    if (f.truckId !== truckId || f.month < fm || f.month > tm) continue;
    const [y, mo] = f.month.split('-').map(Number), dim = new Date(y, mo, 0).getDate();
    const a = f.month === fm ? Number(from.slice(8, 10)) : 1, z = f.month === tm ? Number(to.slice(8, 10)) : dim;
    const share = Math.max(0, z - a + 1) / dim;
    const heads = [f.tax, f.salary, f.permit, f.emi, f.insurance, f.fitness].map((v) => (v > 0 && v <= CAP ? v : 0));
    s += heads.reduce((x, v) => x + v, 0) * share;
  }
  for (const m of db.monthlyExpenses) if (m.truckId === truckId && (m.date || '') >= from && (m.date || '').slice(0, 10) <= to) s += m.amount || 0;
  return Math.round(s);
}

export function truckStat(db: any, truck: any, from: string, to = ymd(now())): TruckStat {
  const trips = (tripsByTruck(db).get(truck.id) || []).filter((t: any) => (t.startDate || '') >= from && (t.startDate || '') <= to);
  const legs = trips.map((t: any) => legOf(db, t)).sort((a: Leg, b: Leg) => b.start.localeCompare(a.start));
  const s = { trips: legs.length, loadedTrips: 0, km: 0, loadedKm: 0, emptyKm: 0, freight: 0, diesel: 0, dieselQty: 0, other: 0 };
  const busy = new Set<string>();
  for (const l of legs) {
    if (l.loaded) { s.loadedTrips++; s.loadedKm += l.km; } else s.emptyKm += l.km;
    s.km += l.km; s.freight += l.freight; s.diesel += l.diesel; s.dieselQty += l.dieselQty; s.other += l.other;
    const a = l.trip.startDate, z = l.open ? ymd(now()) : l.trip.endDate || a;
    if (a) for (let d = new Date(a), n = 0; ymd(d) <= z && n < 60; d = addDays(d, 1), n++) busy.add(ymd(d));
  }
  const first = legs.length ? legs[legs.length - 1].trip.startDate : from;
  const startDay = from > '2000-01-01' ? from : first;
  const days = Math.max(1, Math.round((+new Date(to) - +new Date(startDay)) / 864e5) + 1);
  const fixed = fixedCost(db, truck.id, startDay, to);
  const activeDays = Math.min(days, busy.size);
  return {
    truck, legs, ...s, tripProfit: s.freight - s.diesel - s.other, fixed, profit: s.freight - s.diesel - s.other - fixed,
    emptyPct: s.km ? Math.round((s.emptyKm / s.km) * 100) : 0, perKm: s.km ? (s.freight - s.diesel - s.other - fixed) / s.km : 0,
    kmpl: s.dieselQty ? s.km / s.dieselQty : 0, activeDays, idleDays: days - activeDays, days, last: legs[0] || null,
  };
}

const fleetCache = new WeakMap<any, Map<string, TruckStat[]>>();
export function fleetStats(db: any, p: Period): TruckStat[] {
  let m = fleetCache.get(db); if (!m) { m = new Map(); fleetCache.set(db, m); }
  const hit = m.get(p); if (hit) return hit;
  const from = periodFrom(p);
  const idx = tripsByTruck(db);
  const out = db.trucks.filter((t: any) => t.type === 'Own' && idx.has(t.id)).map((t: any) => truckStat(db, t, from)).filter((s: TruckStat) => s.trips > 0);
  m.set(p, out);
  return out;
}

// Lanes our trucks keep running empty – each one is a back-load to find.
export function emptyLanes(stats: TruckStat[]) {
  const m = new Map<string, { from: string; to: string; trips: number; km: number; trucks: Set<string> }>();
  for (const s of stats) for (const l of s.legs) if (!l.loaded && l.trip.fromCity && l.trip.toCity && l.trip.fromCity !== l.trip.toCity) {
    const k = l.trip.fromCity + '>' + l.trip.toCity;
    const x = m.get(k) || { from: l.trip.fromCity, to: l.trip.toCity, trips: 0, km: 0, trucks: new Set<string>() };
    x.trips++; x.km += l.km; x.trucks.add(s.truck.id); m.set(k, x);
  }
  return [...m.values()].sort((a, b) => b.km - a.km);
}
