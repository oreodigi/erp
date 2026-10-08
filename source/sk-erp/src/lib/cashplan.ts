// Cash plan: week-by-week forecast of money coming in and going out, built from open bills, unbilled LRs,
// transporter / DC payment slips, truck paper renewals, salaries and recent spending run-rates.
import { byId, isDiesel, lookup } from '../store/store';
import { addDays, now, ymd } from './util';
import { DEFAULT_SLA } from './stages';
import { tNow } from './i18n';

export type CashSettings = {
  opening: number; minBalance: number; weeks: number; recoveryPct: number; tpDays: number; supplierDays: number;
  officeMonthly: number; runRates: boolean; driverPayDay: number; maxOverdueDays: number;
};
export const DEFAULT_CASH: CashSettings = { opening: 0, minBalance: 0, weeks: 8, recoveryPct: 5, tpDays: 7, supplierDays: 30, officeMonthly: 0, runRates: true, driverPayDay: 7, maxOverdueDays: 90 };

export type CashItem = { label: string; sub?: string; date: string; amount: number; ref?: { type: string; id: string } };
export type CashRow = { key: string; label: string; dir: 'in' | 'out'; how: string; weeks: number[]; items: CashItem[][]; total: number };
export type Week = { start: string; end: string; label: string };

const weekOf = (weeks: Week[], d: string) => {
  if (d < weeks[0].start) return 0; // already due → first week
  return weeks.findIndex((w) => d >= w.start && d <= w.end);
};

function runRate(list: { date: string; amount: number }[], weeksBack = 8) {
  const to = ymd(now()), from = ymd(addDays(now(), -7 * weeksBack + 1));
  let s = 0;
  for (const x of list) if (x.date >= from && x.date <= to) s += x.amount;
  return Math.round(s / weeksBack);
}

export function buildCashPlan(db: any, cfg: CashSettings) {
  const today = ymd(now());
  const weeks: Week[] = Array.from({ length: cfg.weeks }, (_, i) => {
    const a = addDays(now(), 7 * i), z = addDays(a, 6);
    return { start: ymd(a), end: ymd(z), label: `${a.getDate()} ${a.toLocaleString('en-IN', { month: 'short' })}` };
  });
  const horizon = weeks[weeks.length - 1].end;
  const rows: CashRow[] = [];
  const row = (key: string, label: string, dir: 'in' | 'out', how: string): CashRow => {
    const r: CashRow = { key, label, dir, how, weeks: weeks.map(() => 0), items: weeks.map(() => []), total: 0 };
    rows.push(r); return r;
  };
  const put = (r: CashRow, i: number, it: CashItem) => { if (i < 0 || i >= weeks.length || !it.amount) return; r.weeks[i] += it.amount; r.items[i].push(it); r.total += it.amount; };
  const sla = { ...DEFAULT_SLA, ...(db.slaDays || {}) };

  // ---------- money in ----------
  const due = row('bills-due', tNow('Customer bills falling due'), 'in', tNow('Open bills, on bill date + the customer’s credit days.'));
  const rec = row('overdue', tNow('Recovery of overdue bills'), 'in', cfg.maxOverdueDays > 0 ? tNow('Assumes {p}% of the overdue amount is collected each week (bills overdue more than {d} days are left out).', { p: cfg.recoveryPct, d: cfg.maxOverdueDays }) : tNow('Assumes {p}% of the overdue amount is collected each week.', { p: cfg.recoveryPct }));
  let overdue = 0, ignored = 0, ignoredN = 0; const overdueList: CashItem[] = [];
  const oldest = cfg.maxOverdueDays > 0 ? ymd(addDays(now(), -cfg.maxOverdueDays)) : '';
  for (const b of db.bills) {
    if (b.deleted || !(b.pending > 0)) continue;
    const c = byId(db.customers, b.clientId);
    const dd = ymd(addDays(b.date, c?.creditDays || 30));
    const it: CashItem = { label: c?.name || '—', sub: tNow('Bill {no} · due {date}', { no: b.billNo, date: dd }), date: dd, amount: b.pending, ref: { type: 'bill', id: b.id } };
    if (dd < today) { if (oldest && dd < oldest) { ignored += b.pending; ignoredN++; } else { overdue += b.pending; overdueList.push(it); } } else if (dd <= horizon) put(due, weekOf(weeks, dd), it);
  }
  overdueList.sort((a, b) => b.amount - a.amount);
  let left = overdue;
  for (let i = 0; i < weeks.length; i++) {
    const amt = Math.round(left * (cfg.recoveryPct / 100)); left -= amt;
    if (amt) { put(rec, i, { label: tNow('{p}% of overdue', { p: cfg.recoveryPct }), sub: tNow('Biggest: {names}', { names: overdueList.slice(0, 3).map((x) => x.label).join(', ') }), date: weeks[i].start, amount: amt }); rec.items[i] = [rec.items[i][0], ...overdueList.slice(0, 15)]; }
  }
  const unb = row('unbilled', tNow('LRs not billed yet'), 'in', tNow('Delivered "we bill later" LRs: billed in {n} days, then paid after the customer’s credit days.', { n: sla.pod }));
  for (const l of db.lrs) {
    if (l.billId || l.status === 'Cancelled' || l.status !== 'Delivered' || (l.paymentMode || 'To Be Billed') !== 'To Be Billed' || !(l.freight > 0)) continue;
    const c = byId(db.customers, l.billHead === 'Consignee' ? l.consigneeId : l.consignorId);
    const billOn = addDays(l.ack?.receivedDate && l.ack.receivedDate > today ? l.ack.receivedDate : now(), sla.pod);
    const dd = ymd(addDays(billOn, c?.creditDays || 30));
    if (dd <= horizon) put(unb, weekOf(weeks, dd), { label: c?.name || '—', sub: tNow('LR {no} · expected {date}', { no: l.lrNo, date: dd }), date: dd, amount: l.freight, ref: { type: 'lr', id: l.id } });
  }
  if (cfg.runRates) {
    const cashLR = row('cashfreight', tNow('Freight paid at booking / delivery'), 'in', tNow('"Paid now" and "Receiver pays" LRs – average of the last 8 weeks.'));
    const w = runRate(db.lrs.filter((l: any) => ['Paid', 'To Pay'].includes(l.paymentMode) && l.status !== 'Cancelled').map((l: any) => ({ date: l.placeDate || (l.createdAt || '').slice(0, 10), amount: l.freight || 0 })));
    weeks.forEach((wk, i) => put(cashLR, i, { label: tNow('Weekly average'), date: wk.start, amount: w }));
  }

  // ---------- money out ----------
  const tp = row('transporters', tNow('Pay market truck owners'), 'out', tNow('Transporter payment slips, paid {n} days after approval.', { n: cfg.tpDays }));
  for (const s of db.tpSlips) {
    if (!(s.pending > 0) || s.status === 'Rejected') continue;
    const dd = ymd(addDays((s.approvedAt || s.date || today).slice(0, 10), cfg.tpDays));
    if (dd <= horizon) put(tp, weekOf(weeks, dd), { label: lookup.transName(db, s.transporterId), sub: tNow('Slip {no} · {status}', { no: s.slipNo, status: tNow(s.status) }), date: dd, amount: s.pending });
  }
  const dcp = row('dcpay', tNow('Pay delivery challan trucks'), 'out', tNow('DC payment slips, paid {n} days after the slip.', { n: cfg.tpDays }));
  for (const s of db.dcPayslips) {
    if (!(s.pending > 0)) continue;
    const dd = ymd(addDays(s.date || today, cfg.tpDays));
    if (dd <= horizon) put(dcp, weekOf(weeks, dd), { label: lookup.transName(db, s.transporterId), sub: tNow('DC slip {no}', { no: s.no }), date: dd, amount: s.pending });
  }
  const sup = row('suppliers', tNow('Pay spare-part suppliers'), 'out', tNow('Purchase orders from the last 60 days, paid {n} days after the PO.', { n: cfg.supplierDays }));
  const paidPO = new Set((db.inventoryPayments || []).flatMap((p: any) => p.poIds || [p.poId]));
  for (const p of db.pos) {
    if (paidPO.has(p.id) || !['Approved', 'Inwarded'].includes(p.status) || p.date < ymd(addDays(now(), -60))) continue;
    const dd = ymd(addDays(p.date, cfg.supplierDays));
    if (dd <= horizon) put(sup, weekOf(weeks, dd), { label: lookup.supplier(db, p.supplierId), sub: tNow('PO {no}', { no: p.no }), date: dd, amount: p.net || 0, ref: { type: 'po', id: p.id } });
  }
  const papers = row('papers', tNow('Truck papers to renew'), 'out', tNow('Insurance, road tax, fitness and permits falling due on our own trucks.'));
  for (const t of db.trucks) {
    if (t.type !== 'Own' || t.isActive === false) continue;
    for (const [k, amt, name] of [['insDue', t.insAmt, 'Insurance'], ['taxDue', t.taxAmt, 'Road tax'], ['fitDue', t.fitnessAmt, 'Fitness'], ['npDue', t.permitAmt, 'National permit']] as const) {
      const d = t[k]; if (!d || !(amt > 0) || d > horizon || d < ymd(addDays(now(), -30))) continue;
      put(papers, weekOf(weeks, d), { label: t.number, sub: tNow('{name} due {date}', { name: tNow(name), date: d }), date: d, amount: amt, ref: { type: 'truck', id: t.id } });
    }
  }
  const drv = row('drivers', tNow('Driver salaries'), 'out', tNow('Monthly salary of own drivers who drove in the last 60 days, paid on the {n}th.', { n: cfg.driverPayDay }));
  const since = ymd(addDays(now(), -60));
  const drove = new Set(db.trips.filter((t: any) => (t.startDate || '') >= since).map((t: any) => t.driverId));
  const drivers = db.drivers.filter((d: any) => d.type === 'Own' && !d.blacklisted && drove.has(d.id));
  const drvTotal = drivers.reduce((a: number, d: any) => a + (d.salary || 0), 0);
  const office = cfg.officeMonthly > 0 ? row('office', tNow('Office salaries & rent'), 'out', tNow('The monthly amount you entered, paid on the 1st.')) : null;
  weeks.forEach((wk, i) => {
    for (let d = new Date(wk.start); ymd(d) <= wk.end; d = addDays(d, 1)) {
      if (d.getDate() === cfg.driverPayDay && drvTotal) put(drv, i, { label: tNow('All own drivers'), sub: tNow('{n} drivers', { n: drivers.length }), date: ymd(d), amount: drvTotal });
      if (office && d.getDate() === 1) put(office, i, { label: tNow('Office salaries & rent'), date: ymd(d), amount: cfg.officeMonthly });
    }
  });
  if (cfg.runRates) {
    const dsl = row('diesel', tNow('Diesel'), 'out', tNow('Average weekly diesel of the last 8 weeks.'));
    const trp = row('tripexp', tNow('Trip expenses (bhatta, toll, hamali)'), 'out', tNow('Average weekly trip expenses of the last 8 weeks.'));
    const ex = db.tripExpenses.map((e: any) => ({ date: (e.date || '').slice(0, 10), amount: e.amount || 0, d: isDiesel(db, e.typeId) }));
    const wd = runRate(ex.filter((e: any) => e.d)), wt = runRate(ex.filter((e: any) => !e.d));
    const months = [...new Set(db.fixedExpenses.map((f: any) => f.month))].sort().slice(-3) as string[];
    const fixedM = months.length ? db.fixedExpenses.filter((f: any) => months.includes(f.month)).reduce((a: number, f: any) => a + (f.emi || 0) + (f.permit || 0) + (f.tax || 0), 0) / months.length : 0;
    const fx = fixedM ? row('truckfixed', tNow('Truck EMI, tax & permit (monthly)'), 'out', tNow('Average monthly truck costs of the last 3 months, spread over the weeks.')) : null;
    weeks.forEach((wk, i) => {
      put(dsl, i, { label: tNow('Weekly average'), date: wk.start, amount: wd });
      put(trp, i, { label: tNow('Weekly average'), date: wk.start, amount: wt });
      if (fx) put(fx, i, { label: tNow('Monthly average ÷ 4.3'), date: wk.start, amount: Math.round(fixedM / 4.33) });
    });
  }

  const inW = weeks.map((_, i) => rows.filter((r) => r.dir === 'in').reduce((a, r) => a + r.weeks[i], 0));
  const outW = weeks.map((_, i) => rows.filter((r) => r.dir === 'out').reduce((a, r) => a + r.weeks[i], 0));
  let bal = cfg.opening;
  const closing = weeks.map((_, i) => (bal += inW[i] - outW[i]));
  const short = closing.findIndex((c) => c < cfg.minBalance);
  return { weeks, rows: rows.filter((r) => r.total > 0), inW, outW, closing, overdue, overdueList, short, ignored, ignoredN };
}
