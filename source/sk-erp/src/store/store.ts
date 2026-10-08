import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { buildSeed, SEED_VERSION, type DB } from './seed';
import { loadLegacy, idbGet, idbSet, idbDel, getSourcePref, setSourcePref, hasLegacy, LEGACY_VERSION, type Source } from './dataset';
import { iso, ymd, hm, uid, sum, round2, now, setAsOf, fy } from '../lib/util';
import { fetchERPState, saveERPState } from '../lib/api';
import { NAV, ROLE_GROUPS } from '../nav';

const safeLS = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* quota/blocked */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

// ---------------- UI store ----------------
export type Toast = { id: string; tone: 'ok' | 'bad' | 'info' | 'warn'; title: string; body?: string };
type Confirm = { title: string; body?: string; confirmLabel?: string; tone?: 'bad' | 'primary'; onConfirm: () => void } | null;
type UI = {
  route: string; params: Record<string, any>; history: string[];
  userId: string; theme: 'system' | 'light' | 'dark'; collapsed: boolean; mobileNav: boolean; palette: boolean;
  toasts: Toast[]; drawer: { type: string; id: string; tab?: string } | null; print: { doc: string; id: string; variant?: string } | null; confirm: Confirm;
  savedViews: Record<string, { name: string; q: string; filters: any }[]>; signedIn: boolean;
  guide: boolean; simple: boolean; lang: 'en' | 'hi' | 'mr'; voice: boolean; voiceRate: number; toursDone: Record<string, boolean>; tour: string | null; help: boolean; quick: { action: string; ids: string[] } | null;
  doQuick: (action: string, ids: string[]) => void;
  nav: (r: string, params?: Record<string, any>) => void; back: () => void;
  toast: (title: string, tone?: Toast['tone'], body?: string) => void; dismiss: (id: string) => void;
  openRecord: (type: string, id: string, tab?: string) => void; closeRecord: () => void;
  openPrint: (doc: string, id: string, variant?: string) => void; closePrint: () => void;
  ask: (c: Confirm) => void; set: (p: Partial<UI>) => void;
};
export const useUI = create<UI>()(persist((set, get) => ({
  route: 'dashboard', params: {}, history: [], userId: 'us1', theme: 'system', collapsed: false, mobileNav: false, palette: false,
  toasts: [], drawer: null, print: null, confirm: null, savedViews: {}, signedIn: false,
  guide: true, simple: true, lang: 'en', voice: true, voiceRate: 0.95, toursDone: {}, tour: null, help: false, quick: null,
  doQuick: (action, ids) => set({ quick: { action, ids } }),
  nav: (r, params = {}) => { set({ history: [...get().history.slice(-20), get().route], route: r, params, mobileNav: false, palette: false, drawer: null }); try { document.getElementById('main-scroll')?.scrollTo({ top: 0 }); } catch { /* */ } },
  back: () => { const h = get().history; if (h.length) set({ route: h[h.length - 1], history: h.slice(0, -1), params: {} }); },
  toast: (title, tone = 'ok', body) => { const id = uid(); set({ toasts: [...get().toasts, { id, tone, title, body }] }); setTimeout(() => get().dismiss(id), 4200); },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  openRecord: (type, id, tab) => set({ drawer: { type, id, tab } }), closeRecord: () => set({ drawer: null }),
  openPrint: (doc, id, variant) => set({ print: { doc, id, variant } }), closePrint: () => set({ print: null }),
  ask: (c) => set({ confirm: c }), set: (p) => set(p as any),
}), {
  name: 'skt-erp-ui', storage: createJSONStorage(() => safeLS),
  partialize: (s) => ({ route: s.route, params: s.params, userId: s.userId, theme: s.theme, collapsed: s.collapsed, savedViews: s.savedViews, signedIn: s.signedIn, guide: s.guide, simple: s.simple, lang: s.lang, voice: s.voice, voiceRate: s.voiceRate, toursDone: s.toursDone }) as any,
}));


// ---------------- Data store ----------------
// The working dataset lives in memory and is saved to IndexedDB (debounced) per data source.
type Store = { db: DB; ready: boolean; source: Source; loading: string; mutate: (fn: (db: DB) => void) => void; reset: () => Promise<void>; switchSource: (s: Source) => Promise<void>; boot: () => Promise<void> };
const keyFor = (src: Source) => `db-${src}`;
const versionFor = (src: Source) => (src === 'legacy' ? LEGACY_VERSION : SEED_VERSION);
async function freshDB(src: Source): Promise<any> { return src === 'legacy' ? loadLegacy() : buildSeed(); }
let saveTimer: any = null;
let remoteVersion = 0;
let authenticatedPrincipal: { username: string; role: string } | null = null;
export function setAuthenticatedPrincipal(principal: { username: string; role: string } | null) {
  authenticatedPrincipal = principal;
}
export function getAuthenticatedRoleCode() { return localRoleCode(String(authenticatedPrincipal?.role || '')); }
function localRoleCode(role: string) {
  const key = String(role || '').trim().toLowerCase();
  return ({ superadmin: 'SA', 'super-admin': 'SA', admin: 'AD', administrator: 'AD', manager: 'AD', operator: 'OP', operations: 'OP', dispatcher: 'OP', finance: 'AC', accounts: 'AC', accountant: 'AC', finance_approver: 'AC', customer_care: 'CC', 'customer-care': 'CC', customerrelations: 'CC', fleet: 'CO', fleetmanager: 'CO', workshop: 'SI', workshopmanager: 'SI', inventory: 'SI', warehousemanager: 'SI', store: 'SI', storeincharge: 'SI', storedirector: 'SI', hr: 'HR', onboarding: 'HR', branch_admin: 'BU', branch_user: 'BU', container: 'BU' } as Record<string, string>)[key] || String(role || '').toUpperCase();
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { db, ready } = useStore.getState();
    if (!ready || !remoteVersion) return;
    try { const saved = await saveERPState(db, remoteVersion); remoteVersion = Number(saved.version); }
    catch (e) { console.error('ERP state save failed', e); useUI.getState().toast('Save failed', 'bad', e instanceof Error ? e.message : 'The shared record changed or the API is unavailable.'); }
  }, 900);
}
function activate(db: any) {
  setAsOf(db?.asOf || null);
  indexCache = new WeakMap();
  if (Array.isArray(db.roles)) {
    db.roles = db.roles.map((r: any) => ({ ...r, menus: NAV.filter((g) => (ROLE_GROUPS[r.code] || []).includes(g.key)).flatMap((g) => g.items.map((i) => i.key)) }));
  }
  const ui = useUI.getState();
  const roles = new Map<string, string>((db.roles || []).map((r: any) => [String(r.id), String(r.code)]));
  const principal = authenticatedPrincipal;
  const principalRole = localRoleCode(String(principal?.role || ''));
  const matched = principal && db.users.find((u: any) => u.active && String(u.username || '').toLowerCase() === principal.username.toLowerCase());
  const roleMatched = principalRole && db.users.find((u: any) => u.active && roles.get(String(u.roleId)) === principalRole);
  if (matched || roleMatched) ui.set({ userId: (matched || roleMatched).id });
  else if (!db.users.some((u: any) => u.id === ui.userId && u.active)) {
    const admin = db.users.find((u: any) => u.active && ['SA', 'AD'].includes(roles.get(String(u.roleId)) || ''));
    if (admin) ui.set({ userId: admin.id });
  }
}
export const useStore = create<Store>()((set, get) => ({
  db: buildSeed() as any, ready: false, source: getSourcePref(), loading: 'Loading data…',
  mutate: (fn) => { const db: any = { ...get().db }; for (const k of Object.keys(db)) if (Array.isArray(db[k])) db[k] = [...db[k]]; fn(db); set({ db }); scheduleSave(); },
  reset: async () => { const src = get().source; set({ ready: false, loading: src === 'legacy' ? 'Restoring SK Logistics data…' : 'Restoring sample data…' }); const db = await freshDB(src); activate(db); set({ db, ready: true }); await idbSet(keyFor(src), db); },
  switchSource: async (src) => {
    setSourcePref(src); set({ ready: false, source: src, loading: src === 'legacy' ? 'Loading SK Logistics data…' : 'Loading sample data…' });
    let db: any = await idbGet(keyFor(src));
    if (!db || db.version !== versionFor(src)) { db = await freshDB(src); idbSet(keyFor(src), db); }
    activate(db); set({ db, ready: true });
  },
  boot: async () => {
    set({ ready: false, source: 'legacy', loading: 'Loading shared PostgreSQL ERP data…' });
    const remote = await fetchERPState();
    remoteVersion = Number(remote.version);
    const db: any = { ...remote.data, source: 'legacy' };
    activate(db);
    set({ db, ready: true, source: 'legacy', loading: '' });
  },
}));
export { hasLegacy };
export type { Source };

export const useDB = () => useStore((s) => s.db);
export const getDB = () => useStore.getState().db;
const toast = (t: string, tone: Toast['tone'] = 'ok', body?: string) => useUI.getState().toast(t, tone, body);
const me = () => { const db = getDB(); const u = db.users.find((x: any) => x.id === useUI.getState().userId) || db.users[0]; return `${u.firstName} ${u.lastName}`; };

// helpers that work on a mutable db copy
function rep(db: any, coll: string, id: string, fn: (r: any) => any) {
  const i = db[coll].findIndex((x: any) => x.id === id);
  if (i < 0) return null;
  const r = fn(structuredClone(db[coll][i])) ?? null;
  db[coll][i] = r || db[coll][i];
  return db[coll][i];
}
function nextNo(db: any, k: string) { db.counters = { ...db.counters, [k]: (db.counters[k] || 0) + 1 }; return db.counters[k]; }
function act(db: any, text: string, ref: string, refType: string, refId: string, module = 'Operations') { db.activity = [{ id: uid(), at: iso(), by: me(), text, ref, refType, refId, module }, ...db.activity].slice(0, 600); }
function lrEvent(db: any, lrId: string, label: string) { rep(db, 'lrs', lrId, (l) => { l.events.push({ at: iso(), label, by: me() }); return l; }); }
function notify(db: any, title: string, body: string, link: string, tone = 'info') { db.notifications = [{ id: uid(), at: iso(), title, body, link, read: false, tone }, ...db.notifications].slice(0, 40); }
function ledgerAdd(db: any, e: any) { db.ledger = [...db.ledger, { id: uid(), tally: false, branchId: 'JL', by: me(), date: ymd(), ...e }]; }

// derived helpers ------------------------------------------------
let indexCache = new WeakMap<any[], Map<string, number>>();
const buildIndex = (arr: any[]) => { const m = new Map<string, number>(); arr.forEach((r, i) => { if (r && r.id != null) m.set(r.id, i); }); indexCache.set(arr, m); return m; };
export function byId(arr: any[], id: string) {
  if (!arr || !id) return undefined;
  let m = indexCache.get(arr) || buildIndex(arr);
  let i = m.get(id);
  if (i === undefined || arr[i]?.id !== id) { m = buildIndex(arr); i = m.get(id); }
  return i === undefined ? undefined : arr[i];
}
const _cityLL = (db: any, id: string) => { const c = byId(db.cities, id); return c && c.lat != null && c.lng != null ? c : null; };
export function distKm(a: string, b: string) {
  const db: any = useStore.getState().db;
  const A = _cityLL(db, a), B = _cityLL(db, b);
  if (!A || !B) return a && b && a === b ? 35 : 0;
  if (a === b) return 35;
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(B.lat - A.lat), dLng = toR(B.lng - A.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(A.lat)) * Math.cos(toR(B.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.24);
}
// helpers for records whose ids differ between the sample and the converted legacy data
export const isDiesel = (db: any, typeId: string) => { const t = byId(db.expenseTypes, typeId); return !!t && /dies|disel/i.test(t.name); };
export const dieselTypeId = (db: any) => (db.expenseTypes.find((e: any) => /dies|disel/i.test(e.name) && e.active !== false) || db.expenseTypes[0])?.id || '';
export const isTruckUnit = (db: any, unitId: string) => { const u = byId(db.units, unitId); return !!u && /truck|\bftl\b|\bhq\b|\blq\b|wheeler|feet|\bft\b|dcm|lpt|canter|\b407\b/i.test(u.name); };
export const defLedger = (db: any, pref: string) => {
  if (byId(db.ledgers, pref)) return pref;
  const kind = ['l4'].includes(pref) ? 'Cash' : ['l5', 'l6'].includes(pref) ? 'Card' : 'Bank';
  return (db.ledgers.find((l: any) => l.type === kind) || db.ledgers[0])?.id || '';
};
export const railGodownId = (db: any) => byId(db.branches, 'JL')?.godown || db.godowns[0]?.id || '';
export const firstId = (arr: any[], pref?: string) => (pref && byId(arr, pref) ? pref : arr[0]?.id || '');

export const lookup = {
  branch: (db: any, id: string) => byId(db.branches, id),
  city: (db: any, id: string) => byId(db.cities, id),
  cityName: (db: any, id: string) => byId(db.cities, id)?.name || id || '—',
  cust: (db: any, id: string) => byId(db.customers, id),
  custName: (db: any, id: string) => byId(db.customers, id)?.name || '—',
  truck: (db: any, id: string) => byId(db.trucks, id),
  truckNo: (db: any, id: string) => byId(db.trucks, id)?.number || '—',
  driver: (db: any, id: string) => byId(db.drivers, id),
  driverName: (db: any, id: string) => byId(db.drivers, id)?.name || '—',
  trans: (db: any, id: string) => byId(db.transporters, id),
  transName: (db: any, id: string) => byId(db.transporters, id)?.name || '—',
  labour: (db: any, id: string) => byId(db.labours, id)?.name || '—',
  goods: (db: any, id: string) => byId(db.goods, id),
  spare: (db: any, id: string) => byId(db.spares, id),
  supplier: (db: any, id: string) => byId(db.suppliers, id)?.name || '—',
  sched: (db: any, id: string) => byId(db.schedules, id),
  ledgerName: (db: any, id: string) => byId(db.ledgers, id)?.name || '—',
  wagon: (db: any, id: string) => byId(db.wagons, id)?.name || '—',
  user: (db: any, id: string) => byId(db.users, id),
};

export function lrStage(db: any, l: any): string {
  if (l.billId) { const b = db.bills.find((x: any) => x.id === l.billId); if (b && !b.deleted) return b.pending <= 0 ? 'Paid' : 'Billed'; }
  if (l.ack) return 'POD Received';
  return l.status;
}
export function truckStatus(db: any, t: any) {
  if (db.jobcards.some((j: any) => j.truckId === t.id && ['Pending Approval', 'Approved', 'Draft'].includes(j.status) && !j.outDate)) return 'Workshop';
  if (db.trips.some((tr: any) => tr.truckId === t.id && !tr.completed)) return 'On Trip';
  return 'Available';
}
export function truckLocation(db: any, t: any) {
  const open = db.trips.find((tr: any) => tr.truckId === t.id && !tr.completed);
  if (open) return `${lookup.cityName(db, open.fromCity)} → ${lookup.cityName(db, open.toCity)}`;
  const last = [...db.trips].filter((tr: any) => tr.truckId === t.id).sort((a: any, b: any) => (b.endDate || '').localeCompare(a.endDate || ''))[0];
  if (!last) return t.type === 'Own' ? 'Jalgaon' : '—';
  if (db.source === 'legacy') return lookup.cityName(db, last.toCity || last.fromCity);
  return lookup.cityName(db, last.toCity === last.fromCity ? last.fromCity : 'jalgaon');
}
export const stockQty = (db: any, spareId: string) => sum(db.stock.filter((s: any) => s.spareId === spareId), (s: any) => s.qty);
export const outstanding = (db: any, clientId?: string) => sum(db.bills.filter((b: any) => !b.deleted && (!clientId || b.clientId === clientId)), (b: any) => b.pending);
export const unbilledLRs = (db: any) => db.lrs.filter((l: any) => !l.billId && l.isFinal && l.paymentMode === 'To Be Billed' && l.status === 'Delivered' && (l.ack || lookup.cust(db, l.billHead === 'Consignee' ? l.consigneeId : l.consignorId)?.billWithoutAck));

// ---------------- Actions ----------------
const M = (fn: (db: any) => void) => useStore.getState().mutate(fn);

export const A = {
  // generic CRUD
  save(coll: string, rec: any, label = 'Record') {
    let out = rec;
    M((db) => {
      if (rec.id && db[coll].some((x: any) => x.id === rec.id)) { rep(db, coll, rec.id, (r) => ({ ...r, ...rec })); }
      else { out = { ...rec, id: rec.id || uid() }; db[coll].push(out); }
      act(db, `${label} saved`, rec.name || rec.number || rec.title || rec.no || '', coll, out.id, 'Masters');
    });
    toast(`${label} saved`);
    return out;
  },
  remove(coll: string, id: string, label = 'Record') { M((db) => { db[coll] = db[coll].filter((x: any) => x.id !== id); db.deletedLog.push({ at: iso(), by: me(), coll, id }); }); toast(`${label} deleted`, 'info'); },
  patch(coll: string, id: string, p: any) { M((db) => rep(db, coll, id, (r) => ({ ...r, ...p }))); },
  markRead(id?: string) { M((db) => { db.notifications = db.notifications.map((n: any) => (!id || n.id === id ? { ...n, read: true } : n)); }); },

  // ---- Orders
  createOrder(d: any) {
    let rec: any;
    M((db) => {
      rec = { id: uid(), orderNo: `ORD-${nextNo(db, 'order')}`, ...d, remainingTruckQty: d.truckQty || 0, items: d.items.map((i: any) => ({ ...i, remaining: i.qty })), status: 'Pending', createdAt: iso(), createdBy: me(), confirmedAt: '', billingAmt: 0, events: [{ at: iso(), label: 'Order initiated', by: me() }] };
      db.orders.push(rec);
      act(db, 'Order initiated', rec.orderNo, 'order', rec.id);
      notify(db, `${rec.orderNo} awaiting confirmation`, `${lookup.custName(db, rec.clientId)} · pickup ${rec.pickupDate}`, 'ops/order-confirmation', 'warn');
    });
    toast(`${rec.orderNo} created`, 'ok', 'Sent to Order Confirmation');
    return rec;
  },
  updateOrder(id: string, d: any) { let blocked='';M((db) => {const o=db.orders.find((x:any)=>x.id===id);if(!o)return;const lp=(db as any).loadPlans?.find((p:any)=>p.id===o.loadPlanId||(p.orderIds||[]).includes(id));if(lp&&lp.status!=='Draft'){const keys=['clientId','fromBranchId','toBranchId','cityId','orderBy','truckQty','items'];if(keys.some(k=>JSON.stringify(o[k])!==JSON.stringify(d[k]))){blocked='Operational order fields are locked by approved load plan '+lp.planNo;return;}}rep(db,'orders',id,(x)=>({...x,...d}));});if(blocked)return toast(blocked,'bad');toast('Order updated'); },
  confirmOrder(id: string, d: any, status: 'Confirmed' | 'Rejected') {
    let no = '';
    M((db) => rep(db, 'orders', id, (o) => { no = o.orderNo; Object.assign(o, d, { status, confirmedAt: iso() }); if (d.items) o.items = d.items.map((i: any) => ({ ...i, remaining: i.remaining ?? i.qty })); if (d.truckQty != null) o.remainingTruckQty = d.truckQty; o.events.push({ at: iso(), label: status === 'Confirmed' ? 'Order confirmed' : `Order rejected${d.reason ? ' – ' + d.reason : ''}`, by: me() }); act(db, `Order ${status.toLowerCase()}`, o.orderNo, 'order', o.id); return o; }));
    toast(`${no} ${status === 'Confirmed' ? 'confirmed' : 'rejected'}`, status === 'Confirmed' ? 'ok' : 'warn', status === 'Confirmed' ? 'Now available in Generate LR' : undefined);
  },
  precloseOrder(id: string) { M((db) => rep(db, 'orders', id, (o) => { o.status = 'Preclosed'; o.events.push({ at: iso(), label: 'Order pre-closed', by: me() }); return o; })); toast('Order pre-closed', 'info'); },

  // ---- LR
  saveLR(d: any, finalise: boolean) {
    let rec: any; let blocked='';
    M((db) => {
      if(d.id){const old=db.lrs.find((x:any)=>x.id===d.id);const lp=old&&(db as any).loadPlans?.find((p:any)=>p.id===old.loadPlanId||(p.orderIds||[]).includes(old.orderId));if(old&&(old.status==='In Transit'||old.status==='Delivered'||old.ack||old.billId)){blocked='Dispatched/delivered/billed LR operational fields are locked';rec=old;return;}if(lp&&lp.status!=='Draft'){const keys=['orderId','items','vehicle','truckId','source','destination','sourceCity','destCity'];if(keys.some(k=>JSON.stringify(old?.[k])!==JSON.stringify(d[k]))){blocked='LR operational fields are locked by approved load plan '+lp.planNo;rec=old;return;}}}
      const isNew = !d.id;
      if (isNew) {
        const b = lookup.branch(db, d.fromBranchId);
        rec = { ...d, id: uid(), lrNo: d.lrNo || `SKT/${b.short}/${nextNo(db, 'lr')}`, createdAt: iso(), createdBy: me(), branchId: d.fromBranchId, events: [], grnId: '', dcIds: [], delivery: null, ack: null, billId: '', tpSlipId: '', tripId: '' };
        db.lrs.push(rec);
        if (d.orderId) rep(db, 'orders', d.orderId, (o) => {
          d.items.forEach((it: any) => { const oi = o.items.find((x: any) => x.goodsId === it.goodsId); if (oi) oi.remaining = Math.max(0, oi.remaining - Number(it.qty)); });
          if (o.orderBy === 'Truck') o.remainingTruckQty = Math.max(0, o.remainingTruckQty - 1);
          o.status = o.items.every((x: any) => x.remaining <= 0) || (o.orderBy === 'Truck' && o.remainingTruckQty <= 0) ? 'Completed' : 'In Process';
          o.events.push({ at: iso(), label: `LR ${rec.lrNo} created`, by: me() });
          return o;
        });
      } else {const old=db.lrs.find((x:any)=>x.id===d.id);const lp=old&&(db as any).loadPlans?.find((p:any)=>p.id===old.loadPlanId||(p.orderIds||[]).includes(old.orderId));if(old&&(old.status==='In Transit'||old.status==='Delivered'||old.ack||old.billId)){rec=old;return;}if(lp&&lp.status!=='Draft'){const keys=['orderId','items','vehicle','truckId','source','destination','sourceCity','destCity'];if(keys.some(k=>JSON.stringify(old?.[k])!==JSON.stringify(d[k]))){rec=old;return;}}rec = rep(db, 'lrs', d.id, (l) => ({ ...l, ...d }));}
      rep(db, 'lrs', rec.id, (l) => {
        l.isFinal = finalise || l.isFinal;
        l.status = l.isFinal ? (l.status === 'Draft' || !l.status ? 'Finalised' : l.status) : 'Draft';
        l.events.push({ at: iso(), label: finalise ? 'LR finalised' : isNew ? 'LR saved as draft' : 'LR updated', by: me() });
        l.dueDate = ymd(new Date(+new Date(l.placeDate) + (l.stdDays || 2) * 864e5));
        return l;
      });
      rec = db.lrs.find((x: any) => x.id === rec.id);
      act(db, finalise ? 'LR generated & finalised' : 'LR saved', rec.lrNo, 'lr', rec.id);
    });
    if(blocked){toast(blocked,'bad');return rec;}
    toast(finalise ? `${rec.lrNo} finalised` : `${rec.lrNo} saved`, 'ok', finalise ? 'Ready for dispatch, GRN and billing' : 'Draft – finalise to dispatch');
    return rec;
  },
  dispatchLR(id: string, d: { truckId?: string; driverId?: string; openingKm?: number; advance?: number }) {
    let lr: any; let blocked='';
    M((db) => {
      const existing=db.lrs.find((x:any)=>x.id===id);if(!existing){blocked='LR not found';return;}if(existing.status==='In Transit'||existing.tripId){blocked='LR is already dispatched';return;}if(existing.status!=='Finalised'){blocked='Only a finalised LR can be dispatched';return;}const linked=(db as any).loadPlans?.find((p:any)=>p.id===existing.loadPlanId||(p.orderIds||[]).includes(existing.orderId));if(linked&&(linked.status!=='Loading Confirmed'||Number(linked.loadingVerification?.variance||0)!==0||!linked.loadingVerification?.supervisor)){blocked='Smart Load Plan is not ready for dispatch';return;}if(linked?.vehicle?.truckId&&d.truckId!==linked.vehicle.truckId){blocked='Selected truck does not match the approved load plan';return;}
      lr = rep(db, 'lrs', id, (l) => { Object.assign(l, d); l.status = 'In Transit'; l.outDate = l.outDate || ymd(); l.outTime = hm(); return l; });
      if (lr.vehicle === 'Own' && lr.truckId) {
        const truck = lookup.truck(db, lr.truckId);
        const t = { id: uid(), name: `TRP/${nextNo(db, 'trip')}`, for: 'Client (LR)', clientId: lr.consignorId, scheduleId: '', truckId: lr.truckId, driverId: lr.driverId || truck?.driverId, fromCity: lr.sourceCity, toCity: lr.mode === 'Road' ? lr.destCity : 'jalgaon', startDate: ymd(), startTime: hm(), openingKm: d.openingKm || truck?.odometer || 0, isEmpty: false, onwardFreight: lr.freight, advance: d.advance || 10000, payType: 'Cash', paidBy: defLedger(db, 'l4'), description: `${lr.lrNo} ${lr.source} → ${lr.destination}`, lrId: lr.id, dcId: '', completed: false, endDate: '', endTime: '', closingKm: 0, logslipId: '', createdAt: iso() };
        db.trips.push(t);
        rep(db, 'lrs', id, (l) => { l.tripId = t.id; return l; });
      }
      const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));
      if(lp){lp.dispatchStatus='Dispatched';lp.dispatchedAt=iso();lp.dispatchedLrId=lr.id;lp.dispatchedTruckId=lr.truckId;lp.status='Dispatched';}
      if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'Dispatched':o.loadPlanStatus;o.dispatchStatus='Dispatched';o.dispatchedAt=iso();}}
      lrEvent(db, id, `Dispatched – ${lookup.truckNo(db, lr.truckId)}`);
      act(db, 'LR dispatched', lr.lrNo, 'lr', id);
    });
    if(blocked){toast(blocked,'bad');return false;}
    toast(`${lr.lrNo} dispatched`, 'ok', lr.vehicle === 'Own' ? 'Trip opened in Road Fleet' : undefined);
  },
  deliverLR(id: string, d: any) {
    let lr: any; let blocked='';
    M((db) => {
      const existing=db.lrs.find((x:any)=>x.id===id);if(!existing){blocked='LR not found';return;}if(existing.status==='Delivered'){blocked='LR is already delivered';return;}if(existing.status!=='In Transit'){blocked='Dispatch the LR before recording delivery';return;}
      lr = rep(db, 'lrs', id, (l) => { l.status = 'Delivered'; l.delivery = d; return l; });
      const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));
      if(lp){lp.status='Delivered';lp.deliveryStatus='Delivered';lp.deliveredAt=iso();lp.deliveryLrId=lr.id;}
      if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'Delivered':o.loadPlanStatus;o.deliveryStatus='Delivered';o.deliveredAt=iso();}}
      lrEvent(db, id, 'Delivered at consignee');
      act(db, 'LR delivered', lr.lrNo, 'lr', id);
    });
    if(blocked){toast(blocked,'bad');return false;}
    toast(`${lr.lrNo} marked delivered`, 'ok', 'Awaiting POD for billing');
  },
  receiveAck(id: string, d: any) {
    let lr: any; let blocked='';
    M((db) => {
      const existing=db.lrs.find((x:any)=>x.id===id);if(!existing){blocked='LR not found';return;}if(existing.ack){blocked='POD is already recorded';return;}if(existing.status!=='Delivered'){blocked='Record delivery before POD';return;}
      lr = rep(db, 'lrs', id, (l) => { l.ack = { ...d, at: iso(), by: me() }; if (l.status !== 'Delivered') { l.status = 'Delivered'; l.delivery = l.delivery || { date: d.receivedDate, time: d.receivedTime, remark: 'Delivered (per POD)', unloading: 0 }; } (d.items || []).forEach((it: any) => { if (l.items[it.idx]) l.items[it.idx].damage = it.damage; }); return l; });
      const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));
      if(lp){lp.status='POD Received';lp.podStatus='Received';lp.podReceivedAt=iso();lp.podLrId=lr.id;}
      if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'POD Received':o.loadPlanStatus;o.deliveryStatus='POD Received';o.podReceivedAt=iso();}}
      lrEvent(db, id, 'POD / acknowledgment received');
      act(db, 'POD received', lr.lrNo, 'lr', id, 'Operations');
    });
    if(blocked){toast(blocked,'bad');return false;}
    toast(`POD recorded for ${lr.lrNo}`, 'ok', 'LR is now eligible for billing');
  },
  removeAck(id: string) { let blocked='';M((db) => {const lr=db.lrs.find((x:any)=>x.id===id);if(!lr)return;if(lr.billId){blocked='Delete the bill before removing POD';return;}rep(db, 'lrs', id, (l) => { l.ack = null; return l; });const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));if(lp){lp.status='Delivered';lp.podStatus='Pending';lp.podReceivedAt='';lp.podLrId='';}if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'Delivered':o.loadPlanStatus;o.deliveryStatus='Delivered';o.podReceivedAt='';}}lrEvent(db, id, 'POD entry deleted'); });if(blocked)return toast(blocked,'bad');toast('Acknowledgment deleted', 'info'); },

  // ---- GRN (rail head)
  createGRN(d: any) {
    let g: any;
    M((db) => {
      g = { ...d, id: uid(), grnNo: `GRN/JL/${nextNo(db, 'grn')}`, createdAt: iso(), createdBy: me(), hamaliPaymentId: '', branchId: 'JL' };
      db.grns.push(g);
      rep(db, 'lrs', d.lrId, (l) => { l.grnId = g.id; l.status = 'At Rail Head'; g.items.forEach((it: any) => { if (l.items[it.idx]) l.items[it.idx].damage = it.damage; }); return l; });
      const trip = db.trips.find((t: any) => t.lrId === d.lrId && !t.completed);
      if (trip) rep(db, 'trips', trip.id, (t) => ({ ...t, completed: true, endDate: d.inDate, endTime: d.inTime, closingKm: t.openingKm + distKm(t.fromCity, 'jalgaon') }));
      lrEvent(db, d.lrId, `GRN ${g.grnNo} at Jalgaon rail head`);
      act(db, 'GRN generated', g.grnNo, 'lr', d.lrId);
    });
    toast(`${g.grnNo} generated`, 'ok', 'Stock is now available for VP loading');
    return g;
  },
  deleteGRN(id: string) { M((db) => { const g = db.grns.find((x: any) => x.id === id); db.grns = db.grns.filter((x: any) => x.id !== id); rep(db, 'lrs', g.lrId, (l) => { l.grnId = ''; l.status = 'In Transit'; return l; }); }); toast('GRN deleted', 'info'); },

  // ---- VP schedule / rake
  saveSchedule(d: any) {
    let s: any;
    M((db) => {
      if (d.id) s = rep(db, 'schedules', d.id, (x) => ({ ...x, ...d }));
      else { s = { plan: null, mrrr: null, src: null, dst: null, statusLog: [], dcwcSrc: null, dcwcDst: null, loads: [], vps: [], status: 'Planned', isCompleted: false, ...d, id: uid(), rakeNo: `RK-${now().getFullYear()}-${nextNo(db, 'rake')}`, createdAt: iso(), createdBy: me() }; db.schedules.push(s); }
      rep(db, 'schedules', s.id, (x) => { if (x.isFinal && x.status === 'Planned') x.status = 'Planned'; return x; });
      act(db, d.id ? 'VP schedule updated' : 'VP schedule created', s.rakeNo, 'rake', s.id, 'Rail');
    });
    toast(d.id ? 'Schedule updated' : `Schedule ${s.rakeNo} created`);
    return s;
  },
  runPlan(id: string) {
    M((db) => rep(db, 'schedules', id, (s) => {
      const lrs = db.lrs.filter((l: any) => l.scheduleId === id || (l.grnId && !l.scheduleId && l.toBranchId === s.destId));
      const vol = sum(lrs, (l: any) => { const g = lookup.goods(db, l.items[0].goodsId); return g ? (g.length * g.width * g.height * l.items[0].qty) / 1e6 : 0; });
      const cap = sum(s.wagons, (w: any) => { const wg = db.wagons.find((x: any) => x.id === w.wagonId); return (wg.length * wg.width * wg.height * w.count) / 1e6; });
      s.plan = { runAt: iso(), utilisation: Math.min(99, Math.round((vol / Math.max(cap, 1)) * 100)), weightUtil: Math.min(97, Math.round(sum(lrs, (l: any) => l.weight) / Math.max(1, sum(s.wagons, (w: any) => db.wagons.find((x: any) => x.id === w.wagonId).weight * w.count)) * 100)), reports: ['Loading Instruction', 'Loading Diagram', 'Loading Solution', 'Loading Summary'] };
      return s;
    }));
    toast('Load optimisation complete', 'ok', 'Loading instruction, diagram, solution and summary generated');
  },
  saveMRRR(id: string, d: any) {
    M((db) => { rep(db, 'schedules', id, (s) => { s.mrrr = d; s.vps = d.rows.map((r: any) => ({ wagonId: r.wagonId, vpNo: r.vpNo })); return s; }); act(db, 'MR/RR details saved', lookup.sched(db, id).rakeNo, 'rake', id, 'Rail'); });
    toast('MR/RR numbers saved');
  },
  addVPLoad(id: string, d: any) {
    M((db) => {
      const s = rep(db, 'schedules', id, (x) => { x.loads.push({ ...d, id: uid(), createdAt: iso(), hamaliPaymentId: '' }); if (['Planned'].includes(x.status)) x.status = 'Loading'; return x; });
      const g = db.grns.find((x: any) => x.lrId === d.lrId);
      if (g) rep(db, 'grns', g.id, (gr) => { d.items.forEach((it: any) => { const gi = gr.items.find((x: any) => x.idx === it.idx); if (gi) gi.pending = Math.max(0, gi.pending - it.qty - (it.damage || 0)); }); return gr; });
      const g2 = db.grns.find((x: any) => x.lrId === d.lrId);
      rep(db, 'lrs', d.lrId, (l) => { l.scheduleId = id; if (g2 && g2.items.every((x: any) => x.pending <= 0)) l.status = 'Loaded'; return l; });
      lrEvent(db, d.lrId, `Loaded on VP ${d.vpNo} (${sum(d.items, (x: any) => x.qty)} qty)`);
      act(db, `VP loading – ${d.vpNo}`, s.rakeNo, 'rake', id, 'Rail');
    });
    toast(`Loaded on VP ${d.vpNo}`);
  },
  removeVPLoad(id: string, loadId: string) {
    M((db) => {
      let ld: any;
      rep(db, 'schedules', id, (s) => { ld = s.loads.find((x: any) => x.id === loadId); s.loads = s.loads.filter((x: any) => x.id !== loadId); return s; });
      const g = db.grns.find((x: any) => x.lrId === ld.lrId);
      if (g) rep(db, 'grns', g.id, (gr) => { ld.items.forEach((it: any) => { const gi = gr.items.find((x: any) => x.idx === it.idx); if (gi) gi.pending += it.qty + (it.damage || 0); }); return gr; });
      rep(db, 'lrs', ld.lrId, (l) => { l.status = 'At Rail Head'; return l; });
    });
    toast('Loading entry removed', 'info');
  },
  saveRakeEvents(id: string, side: 'src' | 'dst', d: any) {
    M((db) => {
      const s = rep(db, 'schedules', id, (x) => {
        x[side] = { ...(x[side] || {}), ...d };
        if (side === 'src' && d.dispatch && ['Planned', 'Loading'].includes(x.status)) x.status = 'In Transit';
        if (side === 'dst' && d.arrival && x.status === 'In Transit') x.status = 'Arrived';
        return x;
      });
      if (side === 'src' && d.dispatch) db.lrs.filter((l: any) => l.scheduleId === id && ['Loaded', 'At Rail Head'].includes(l.status)).forEach((l: any) => { rep(db, 'lrs', l.id, (x) => ({ ...x, status: 'Rake In Transit' })); lrEvent(db, l.id, `Rake ${s.rakeNo} dispatched from Jalgaon`); });
      act(db, side === 'src' ? 'Rail head timings updated' : 'Destination timings updated', s.rakeNo, 'rake', id, 'Rail');
    });
    toast('Rake timings saved');
  },
  addRakeStatus(id: string, d: any) {
    M((db) => { const s = rep(db, 'schedules', id, (x) => { x.statusLog.push({ ...d, at: d.at || iso(), by: me() }); return x; }); act(db, `Status: ${d.remark}`, s.rakeNo, 'rake', id, 'Rail'); if (d.email) notify(db, `Rake ${s.rakeNo} status emailed`, d.remark, 'rail/status'); });
    toast('Rake status updated', 'ok', d.email ? 'Email sent to consignees on this rake' : undefined);
  },
  saveDCWC(id: string, side: 'dcwcSrc' | 'dcwcDst', d: any) { M((db) => rep(db, 'schedules', id, (s) => ({ ...s, [side]: d }))); toast('Demurrage & wharfage saved'); },
  closeRake(id: string) { M((db) => { const s = rep(db, 'schedules', id, (x) => ({ ...x, isCompleted: true, status: 'Completed' })); act(db, 'Rake closed', s.rakeNo, 'rake', id, 'Rail'); }); toast('Rake closed'); },

  // ---- DGRN
  createDGRN(d: any) {
    let g: any;
    M((db) => {
      const s = lookup.sched(db, d.scheduleId);
      g = { ...d, id: uid(), dgrnNo: `DGRN/${s.destId}/${nextNo(db, 'dgrn')}`, createdAt: iso(), createdBy: me(), hamaliPaymentId: '' };
      db.dgrns.push(g);
      rep(db, 'schedules', s.id, (x) => { if (['In Transit', 'Arrived'].includes(x.status)) x.status = 'Unloading'; return x; });
      [...new Set(d.items.map((i: any) => i.lrId))].forEach((lid: any) => { rep(db, 'lrs', lid, (l) => ({ ...l, status: 'At Branch' })); lrEvent(db, lid, `DGRN ${g.dgrnNo} at ${lookup.branch(db, s.destId).name}`); });
      act(db, 'DGRN generated', g.dgrnNo, 'rake', s.id, 'Operations');
    });
    toast(`${g.dgrnNo} generated`, 'ok', 'Stock available for delivery challan');
    return g;
  },

  // ---- Delivery Challan (LDC)
  createDC(d: any) {
    let dc: any;
    M((db) => {
      dc = { comments: [], ackSupervisor: null, ackCollection: null, ackClient: null, approval: null, payslipId: '', status: 'Open', ...d, id: uid(), dcNo: `DC/${d.branchId}/${nextNo(db, 'dc')}`, createdAt: iso(), createdBy: me() };
      db.dcs.push(dc);
      d.items.forEach((it: any) => {
        if (it.dgrnId) rep(db, 'dgrns', it.dgrnId, (g) => { const gi = g.items.find((x: any) => x.lrId === it.lrId && x.idx === it.idx); if (gi) gi.pending = Math.max(0, gi.pending - it.qty); return g; });
        rep(db, 'lrs', it.lrId, (l) => { l.dcIds = [...new Set([...(l.dcIds || []), dc.id])]; l.status = 'Out for Delivery'; return l; });
        lrEvent(db, it.lrId, `Delivery challan ${dc.dcNo} – ${lookup.truckNo(db, dc.truckId) || dc.truckNo || ''}`);
      });
      act(db, 'Delivery challan created', dc.dcNo, 'dc', dc.id);
    });
    toast(`${dc.dcNo} created`, 'ok', d.email ? 'Challan emailed to consignee' : undefined);
    return dc;
  },
  addDCComment(id: string, text: string) { M((db) => rep(db, 'dcs', id, (d) => { d.comments.push({ at: iso(), by: me(), text }); return d; })); toast('Remark added'); },
  ackDC(id: string, kind: 'ackSupervisor' | 'ackCollection' | 'ackClient', d: any) {
    let dc: any;
    M((db) => {
      dc = rep(db, 'dcs', id, (x) => { x[kind] = { ...d, at: iso(), by: me() }; if (kind === 'ackSupervisor') x.status = 'Delivered'; return x; });
      if (kind === 'ackSupervisor') dc.items.forEach((it: any) => { rep(db, 'lrs', it.lrId, (l) => { l.status = 'Delivered'; l.delivery = { date: d.deliveryDate, time: d.deliveryTime, remark: d.remark || 'Delivered (LDC supervisor ack)', unloading: 0 }; return l; }); lrEvent(db, it.lrId, 'Delivered at consignee (LDC ack)'); });
      if (kind === 'ackClient') dc.items.forEach((it: any) => { const l = db.lrs.find((x: any) => x.id === it.lrId); if (l && !l.ack) rep(db, 'lrs', it.lrId, (x) => { x.ack = { receivedDate: d.unloadingDate, receivedTime: d.unloadingTime, docket: '', courier: 'Client LDC ack', courierCharge: 0, detentionDays: d.detentionDays || 0, detentionAmt: d.detentionAmt || 0, damageAmt: d.damageAmt || 0, remark: 'Acknowledged by client on LDC', items: [], uploads: [], at: iso(), by: me() }; return x; }); });
      act(db, { ackSupervisor: 'LDC acknowledged by supervisor', ackCollection: 'LDC collection acknowledged', ackClient: 'LDC acknowledged by client' }[kind], dc.dcNo, 'dc', id);
    });
    toast('Acknowledgment saved');
  },
  approveDC(id: string, d: any, approve: boolean) {
    M((db) => { const dc = rep(db, 'dcs', id, (x) => { x.approval = approve ? { ...d, by: me(), at: iso() } : null; x.status = approve ? 'Approved' : 'Rejected'; return x; }); act(db, approve ? 'DC approved for payment' : 'DC approval rejected', dc.dcNo, 'dc', id, 'Finance'); });
    toast(approve ? 'DC approved for payment' : 'DC rejected', approve ? 'ok' : 'warn');
  },
  createDCPayslip(d: any) {
    let ps: any;
    M((db) => {
      ps = { ...d, id: uid(), no: `DCPS/${nextNo(db, 'dcps')}`, payments: [], createdAt: iso(), by: me() };
      db.dcPayslips.push(ps);
      d.dcIds.forEach((x: string) => rep(db, 'dcs', x, (dc) => ({ ...dc, payslipId: ps.id, status: 'Payslip Generated' })));
      act(db, 'DC payment slip generated', ps.no, 'dcps', ps.id, 'Finance');
    });
    toast(`${ps.no} generated`);
    return ps;
  },
  payDCPayslip(id: string, d: any) {
    M((db) => {
      const ps = rep(db, 'dcPayslips', id, (p) => { const v = `PV/${nextNo(db, 'pv')}`; p.payments.push({ ...d, id: uid(), voucherNo: v }); p.pending = Math.max(0, p.pending - d.amount); return p; });
      if (ps.pending <= 0) ps.dcIds.forEach((x: string) => rep(db, 'dcs', x, (dc) => ({ ...dc, status: 'Paid' })));
      ledgerAdd(db, { voucherNo: ps.payments[ps.payments.length - 1].voucherNo, date: d.date, voucherType: d.mode === 'Cash' ? 'Cash Payment' : 'Bank Payment', party: 'Transporter', transporterId: ps.transporterId, ledgerName: lookup.transName(db, ps.transporterId), particular: `DC payslip ${ps.no}`, debit: d.amount, credit: 0, refType: 'DC Payment', refNo: ps.no, ledgerId: d.paidBy });
      act(db, `DC payment ₹${d.amount.toLocaleString('en-IN')}`, ps.no, 'dcps', id, 'Finance');
    });
    toast('DC payment recorded', 'ok', 'Posted to ledger');
  },

  // ---- Billing
  generateBill(d: any) {
    let b: any;
    M((db) => {
      b = { ...d, id: uid(), billNo: d.billNo || `SKT/B/${nextNo(db, 'bill')}/${fy()}`, pending: d.net, deleted: false, createdAt: iso(), createdBy: me(), supplementary: [] };
      db.bills.push(b);
      d.rows.forEach((r: any) => { const lr=rep(db, 'lrs', r.lrId, (l) => ({ ...l, billId: b.id })); lrEvent(db, r.lrId, `Billed on ${b.billNo}`); const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId)); if(lp){lp.status='Billed';lp.billingStatus='Billed';lp.billId=b.id;lp.billNo=b.billNo;lp.billedAt=iso();} if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'Billed':o.loadPlanStatus;o.billingStatus='Billed';o.billId=b.id;o.billNo=b.billNo;o.billedAt=iso();}} });
      ledgerAdd(db, { voucherNo: `SV/${b.billNo.split('/')[2]}`, date: b.date, voucherType: 'Sales', party: 'Client', clientId: b.clientId, ledgerName: lookup.custName(db, b.clientId), particular: `Freight bill ${b.billNo}`, debit: b.net, credit: 0, refType: 'Bill', refNo: b.billNo });
      act(db, `Bill generated – ${d.rows.length} LR`, b.billNo, 'bill', b.id, 'Finance');
    });
    toast(`${b.billNo} generated`, 'ok', 'Receivable created and posted to ledger');
    return b;
  },
  addSupplementary(billId: string, d: any) {
    M((db) => rep(db, 'bills', billId, (b) => { b.supplementary.push({ ...d, id: uid(), no: `${b.billNo}/S${b.supplementary.length + 1}`, at: iso(), by: me() }); b.net += d.amount; b.pending += d.amount; return b; }));
    toast('Supplementary bill added');
  },
  deleteBill(id: string) {
    M((db) => {
      const b = rep(db, 'bills', id, (x) => ({ ...x, deleted: true, deletedAt: iso(), deletedBy: me(), pending: 0 }));
      b.rows.forEach((r: any) => { const lr=rep(db, 'lrs', r.lrId, (l) => ({ ...l, billId: '' })); const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));if(lp){lp.status='POD Received';lp.billingStatus='Unbilled';lp.billId='';lp.billNo='';lp.billedAt='';lp.paymentStatus='';lp.paidAt='';}if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'POD Received':o.loadPlanStatus;o.billingStatus='Unbilled';o.billId='';o.billNo='';o.billedAt='';o.paymentStatus='';o.paidAt='';}} });
      db.ledger = db.ledger.filter((e: any) => !(e.refType === 'Bill' && e.refNo === b.billNo));
      act(db, 'Bill deleted', b.billNo, 'bill', id, 'Admin');
    });
    toast('Bill deleted', 'info', 'LRs returned to billing queue');
  },
  removeBillLR(billId: string, lrId: string) {
    M((db) => {
      rep(db, 'bills', billId, (b) => { const r = b.rows.find((x: any) => x.lrId === lrId); b.rows = b.rows.filter((x: any) => x.lrId !== lrId); const taxRate = (b.cgst + b.sgst + b.igst) / 100; const less = r.net * (1 + taxRate); b.taxable -= r.net; b.tax = Math.round(b.taxable * taxRate); b.net = b.taxable + b.tax; b.pending = Math.max(0, b.pending - less); b.totalFreight -= r.freight; return b; });
      const lr=rep(db, 'lrs', lrId, (l) => ({ ...l, billId: '' }));const lp=(db as any).loadPlans?.find((p:any)=>p.id===lr.loadPlanId||(p.orderIds||[]).includes(lr.orderId));if(lp){lp.status='POD Received';lp.billingStatus='Unbilled';lp.billId='';lp.billNo='';lp.billedAt='';}if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'POD Received':o.loadPlanStatus;o.billingStatus='Unbilled';o.billId='';o.billNo='';o.billedAt='';}}
    });
    toast('LR removed from bill', 'info');
  },
  clientPayment(d: any) {
    let p: any;
    M((db) => {
      p = { ...d, id: uid(), voucherNo: `RV/${nextNo(db, 'rv')}`, createdAt: iso(), by: me() };
      db.clientPayments.push(p);
      const b = rep(db, 'bills', d.billId, (x) => ({ ...x, pending: Math.max(0, x.pending - d.received - d.tds - d.damage - d.rateDiff) }));
      const settled=b.pending<=0; for(const r of (b.rows||[])){const lr=db.lrs.find((x:any)=>x.id===r.lrId);if(!lr)continue;const lp=(db as any).loadPlans?.find((q:any)=>q.id===lr.loadPlanId||(q.orderIds||[]).includes(lr.orderId));if(lp){lp.status=settled?'Paid':'Payment Partial';lp.paymentStatus=settled?'Paid':'Partial';lp.paidAt=settled?iso():lp.paidAt;lp.lastReceiptNo=p.voucherNo;}if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?(settled?'Paid':'Payment Partial'):o.loadPlanStatus;o.paymentStatus=settled?'Paid':'Partial';o.paidAt=settled?iso():o.paidAt;}}}
      ledgerAdd(db, { voucherNo: p.voucherNo, date: d.date, voucherType: d.mode === 'Cash' ? 'Cash Receipt' : 'Bank Receipt', party: 'Client', clientId: b.clientId, ledgerName: lookup.custName(db, b.clientId), particular: `Receipt against ${b.billNo}`, debit: 0, credit: d.received + d.tds + d.damage + d.rateDiff, refType: 'Receipt', refNo: b.billNo, ledgerId: d.paidBy });
      act(db, `Payment received ₹${d.received.toLocaleString('en-IN')}`, b.billNo, 'bill', b.id, 'Finance');
    });
    toast(`Receipt ${p.voucherNo} recorded`, 'ok', 'Outstanding and ledger updated');
    return p;
  },
  deleteReceipt(voucherNo: string) {
    let ok = false;
    M((db) => { const p = db.clientPayments.find((x: any) => x.voucherNo === voucherNo); if (!p) return; ok = true; db.clientPayments = db.clientPayments.filter((x: any) => x.id !== p.id); const b=rep(db, 'bills', p.billId, (b) => ({ ...b, pending: b.pending + p.received + p.tds + p.damage + p.rateDiff }));for(const r of (b.rows||[])){const lr=db.lrs.find((x:any)=>x.id===r.lrId);if(!lr)continue;const lp=(db as any).loadPlans?.find((q:any)=>q.id===lr.loadPlanId||(q.orderIds||[]).includes(lr.orderId));if(lp){lp.status='Billed';lp.paymentStatus='Pending';lp.paidAt='';lp.lastReceiptNo='';}if(lr.orderId){const o=db.orders.find((x:any)=>x.id===lr.orderId);if(o){o.loadPlanStatus=lp?'Billed':o.loadPlanStatus;o.paymentStatus='Pending';o.paidAt='';}}} db.ledger = db.ledger.filter((e: any) => e.voucherNo !== voucherNo); act(db, 'Receipt deleted', voucherNo, 'bill', p.billId, 'Admin'); });
    ok ? toast(`${voucherNo} deleted`, 'info') : toast('Voucher not found', 'bad', 'Check the receipt voucher number (e.g. RV/412)');
    return ok;
  },
  updateFreight(ids: string[], freight: number) { M((db) => ids.forEach((id) => { rep(db, 'lrs', id, (l) => ({ ...l, freight, freightUpdatedBy: me(), freightUpdatedAt: iso() })); lrEvent(db, id, `Freight updated to ₹${freight.toLocaleString('en-IN')}`); })); toast(`Freight updated on ${ids.length} LR`); },

  // ---- Transporter payables
  createTPSlip(d: any) {
    let s: any;
    M((db) => { s = { ...d, id: uid(), slipNo: `TPS/${nextNo(db, 'tps')}`, status: 'Pending', approvedBy: '', pending: d.payable, payments: [], createdAt: iso(), createdBy: me() }; db.tpSlips.push(s); d.rows.forEach((r: any) => rep(db, 'lrs', r.lrId, (l) => ({ ...l, tpSlipId: s.id }))); act(db, 'Transporter payment slip generated', s.slipNo, 'tps', s.id, 'Finance'); notify(db, `${s.slipNo} awaiting approval`, lookup.transName(db, d.transporterId), 'fin/tp-approval', 'warn'); });
    toast(`${s.slipNo} generated`, 'ok', 'Sent for approval');
    return s;
  },
  approveTPSlip(ids: string[]) { M((db) => ids.forEach((id) => { const s = rep(db, 'tpSlips', id, (x) => ({ ...x, status: 'Approved', approvedBy: me(), approvedAt: iso() })); act(db, 'Transporter payment approved', s.slipNo, 'tps', id, 'Finance'); })); toast(`${ids.length} payment slip(s) approved`); },
  payTPSlip(id: string, d: any) {
    M((db) => {
      const s = rep(db, 'tpSlips', id, (x) => { x.payments.push({ ...d, id: uid(), voucherNo: `PV/${nextNo(db, 'pv')}` }); x.pending = Math.max(0, x.pending - d.amount - (d.tds || 0)); return x; });
      ledgerAdd(db, { voucherNo: s.payments[s.payments.length - 1].voucherNo, date: d.date, voucherType: d.mode === 'Cash' ? 'Cash Payment' : 'Bank Payment', party: 'Transporter', transporterId: s.transporterId, ledgerName: lookup.transName(db, s.transporterId), particular: `Payment slip ${s.slipNo}`, debit: d.amount, credit: 0, refType: 'Transporter Payment', refNo: s.slipNo, ledgerId: d.paidBy });
      act(db, `Transporter paid ₹${d.amount.toLocaleString('en-IN')}`, s.slipNo, 'tps', id, 'Finance');
    });
    toast('Payment recorded', 'ok', 'Posted to ledger');
  },

  // ---- Hamali
  payHamali(d: any) {
    let h: any;
    M((db) => {
      h = { ...d, id: uid(), no: `HP/${nextNo(db, 'ham')}`, by: me() };
      db.hamaliPayments.push(h);
      if (d.type === 'GRN') d.refIds.forEach((x: string) => rep(db, 'grns', x, (g) => ({ ...g, hamaliPaymentId: h.id })));
      if (d.type === 'DGRN') d.refIds.forEach((x: string) => rep(db, 'dgrns', x, (g) => ({ ...g, hamaliPaymentId: h.id })));
      if (d.type === 'VP') db.schedules.forEach((s: any) => { if (s.loads.some((l: any) => d.refIds.includes(l.id))) rep(db, 'schedules', s.id, (x) => { x.loads = x.loads.map((l: any) => (d.refIds.includes(l.id) ? { ...l, hamaliPaymentId: h.id } : l)); return x; }); });
      ledgerAdd(db, { voucherNo: `CP/${h.no.split('/')[1]}`, date: d.date, voucherType: d.mode === 'Cash' ? 'Cash Payment' : 'Bank Payment', party: 'Other', ledgerName: lookup.labour(db, d.labourId), particular: `Hamali – ${d.type === 'GRN' ? 'GRN station unloading' : d.type === 'DGRN' ? 'branch station unloading' : 'VP loading'} (${d.refIds.length})`, debit: d.net, credit: 0, refType: 'Hamali', refNo: h.no, ledgerId: d.paidBy });
      act(db, `Hamali paid ₹${d.net.toLocaleString('en-IN')}`, h.no, 'hamali', h.id, 'Finance');
    });
    toast(`${h.no} – hamali paid`);
    return h;
  },

  // ---- Ledger / Tally
  ledgerEntry(d: any) {
    let v = '';
    M((db) => { v = `${d.type === 'Debit' ? 'PV' : 'RV'}/${nextNo(db, d.type === 'Debit' ? 'pv' : 'rv')}`; ledgerAdd(db, { voucherNo: v, date: d.date, voucherType: d.mode === 'Cash' ? (d.type === 'Debit' ? 'Cash Payment' : 'Cash Receipt') : d.type === 'Debit' ? 'Bank Payment' : 'Bank Receipt', party: d.ledgerType, clientId: d.clientId, transporterId: d.transporterId, ledgerName: d.ledgerName, particular: d.narration, debit: d.type === 'Debit' ? d.amount : 0, credit: d.type === 'Credit' ? d.amount : 0, refType: 'Ledger Entry', refNo: '', ledgerId: d.paidBy }); act(db, `Ledger ${d.type.toLowerCase()} ₹${d.amount.toLocaleString('en-IN')}`, v, 'ledger', '', 'Finance'); });
    toast(`Voucher ${v} posted`);
  },
  deleteLedger(voucherNo: string) { let ok = false; M((db) => { ok = db.ledger.some((e: any) => e.voucherNo === voucherNo); db.ledger = db.ledger.filter((e: any) => e.voucherNo !== voucherNo); }); ok ? toast(`${voucherNo} deleted`, 'info') : toast('Voucher not found', 'bad'); return ok; },
  tallyExport(d: any, ids: string[]) { M((db) => { db.ledger = db.ledger.map((e: any) => (ids.includes(e.id) ? { ...e, tally: true } : e)); db.tallyBatches.push({ id: uid(), at: iso(), ...d, count: ids.length, by: me() }); act(db, `Tally XML transferred (${ids.length} vouchers)`, '', 'tally', '', 'Finance'); }); toast(`${ids.length} vouchers transferred to Tally`); },

  // ---- Fleet
  saveTrip(d: any) {
    let t: any;
    M((db) => {
      if (d.id) t = rep(db, 'trips', d.id, (x) => ({ ...x, ...d }));
      else { t = { completed: false, endDate: '', closingKm: 0, logslipId: '', lrId: '', dcId: '', ...d, id: uid(), name: d.name || `TRP/${nextNo(db, 'trip')}`, createdAt: iso() }; db.trips.push(t); }
      act(db, d.id ? 'Trip updated' : 'Trip started', t.name, 'trip', t.id, 'Fleet');
    });
    toast(d.id ? 'Trip updated' : `${t.name} started`);
    return t;
  },
  completeTrip(id: string, d: { endDate: string; endTime: string; closingKm: number }) {
    M((db) => { const t = rep(db, 'trips', id, (x) => ({ ...x, ...d, completed: true })); rep(db, 'trucks', t.truckId, (tr) => ({ ...tr, odometer: Math.max(tr.odometer, d.closingKm) })); act(db, `Trip closed at ${d.closingKm.toLocaleString('en-IN')} km`, t.name, 'trip', id, 'Fleet'); });
    toast('Trip completed', 'ok', 'Ready for log slip');
  },
  addExpense(d: any) { M((db) => { db.tripExpenses.push({ ...d, id: d.id || uid() }); act(db, `Trip expense ₹${Number(d.amount).toLocaleString('en-IN')}`, lookup.truckNo(db, d.truckId), 'trip', d.tripId, 'Fleet'); }); toast('Expense saved'); },
  generateLogslip(d: any) {
    let ls: any;
    M((db) => {
      ls = { ...d, id: uid(), no: `LS/${nextNo(db, 'ls')}`, isOpen: false, createdAt: iso(), by: me() };
      db.logslips.push(ls);
      d.tripIds.forEach((x: string) => rep(db, 'trips', x, (t) => ({ ...t, logslipId: ls.id })));
      const diesel = sum(db.tripExpenses.filter((e: any) => d.tripIds.includes(e.tripId) && isDiesel(db, e.typeId)), (e: any) => e.amount);
      ledgerAdd(db, { voucherNo: `JV/${nextNo(db, 'jv')}`, date: d.date, voucherType: 'Logslip', party: 'Other', ledgerName: 'Diesel Expenses', particular: `Log slip ${ls.no} – ${lookup.truckNo(db, d.truckId)}`, debit: diesel, credit: 0, refType: 'Logslip', refNo: ls.no });
      act(db, 'Log slip generated', ls.no, 'logslip', ls.id, 'Fleet');
    });
    toast(`${ls.no} generated`, 'ok', 'Journal posted for Tally');
    return ls;
  },
  openLogslip(no: string) { let ok = false; M((db) => { const ls = db.logslips.find((x: any) => x.no.toLowerCase() === no.trim().toLowerCase()); if (!ls) return; ok = true; rep(db, 'logslips', ls.id, (x) => ({ ...x, isOpen: true })); ls.tripIds.forEach((t: string) => rep(db, 'trips', t, (x) => ({ ...x, logslipId: '' }))); }); ok ? toast(`${no} reopened`, 'info', 'Trips released for correction') : toast('Log slip not found', 'bad'); return ok; },

  // ---- Workshop
  saveJobCard(d: any, submit: boolean) {
    let jc: any;
    M((db) => {
      const net = sum(d.parts, (x: any) => x.qty * x.rate) + sum(d.services, (x: any) => x.qty * x.rate);
      if (d.id) jc = rep(db, 'jobcards', d.id, (x) => ({ ...x, ...d, net, status: submit && x.status === 'Draft' ? 'Pending Approval' : x.status }));
      else { jc = { ...d, id: uid(), no: `JC/${nextNo(db, 'jc')}`, net, status: submit ? 'Pending Approval' : 'Draft', approvedBy: '', finalisedBy: '', createdAt: iso(), by: me() }; db.jobcards.push(jc); }
      if (submit) notify(db, `${jc.no} awaiting approval`, `${lookup.truckNo(db, jc.truckId)} · ₹${net.toLocaleString('en-IN')}`, 'ws/jobcard-approval', 'warn');
      act(db, submit ? 'Job card submitted for approval' : 'Job card saved', jc.no, 'jobcard', jc.id, 'Workshop');
    });
    toast(`${jc.no} ${submit ? 'sent for approval' : 'saved'}`);
    return jc;
  },
  approveJobCard(id: string, ok = true) { M((db) => { const j = rep(db, 'jobcards', id, (x) => ({ ...x, status: ok ? 'Approved' : 'Draft', approvedBy: ok ? me() : '' })); act(db, ok ? 'Job card approved' : 'Job card returned', j.no, 'jobcard', id, 'Workshop'); }); toast(ok ? 'Job card approved' : 'Job card returned to workshop', ok ? 'ok' : 'warn'); },
  finaliseJobCard(id: string, d: { outDate: string; outTime: string }) {
    M((db) => {
      const j = rep(db, 'jobcards', id, (x) => ({ ...x, ...d, status: 'Finalised', finalisedBy: me() }));
      j.parts.forEach((p: any) => { let need = p.qty; db.stock.filter((s: any) => s.spareId === p.spareId && s.qty > 0).forEach((s: any) => { if (need <= 0) return; const take = Math.min(need, s.qty); rep(db, 'stock', s.id, (x) => ({ ...x, qty: x.qty - take })); need -= take; }); });
      act(db, 'Job card finalised – stock issued', j.no, 'jobcard', id, 'Workshop');
    });
    toast('Job card finalised', 'ok', 'Parts issued from stock; truck released');
  },
  savePO(d: any, submit = true) { let po: any; M((db) => { const net = sum(d.items, (x: any) => x.qty * x.rate); if (d.id) po = rep(db, 'pos', d.id, (x) => ({ ...x, ...d, net })); else { po = { ...d, id: uid(), no: `PO/${nextNo(db, 'po')}`, net, status: 'Pending Approval', approvedBy: '', createdAt: iso(), by: me() }; db.pos.push(po); notify(db, `${po.no} awaiting approval`, `${lookup.supplier(db, po.supplierId)} · ₹${net.toLocaleString('en-IN')}`, 'ws/po-approval', 'warn'); } act(db, 'Purchase order saved', po.no, 'po', po.id, 'Workshop'); }); toast(`${po.no} saved`, 'ok', 'Sent for approval'); return po; },
  approvePO(id: string) { M((db) => { const p = rep(db, 'pos', id, (x) => ({ ...x, status: 'Approved', approvedBy: me() })); act(db, 'PO approved', p.no, 'po', id, 'Workshop'); }); toast('Purchase order approved'); },
  inward(d: any) {
    let inw: any;
    M((db) => {
      inw = { ...d, id: uid(), no: `INW/${nextNo(db, 'inw')}`, pending: d.payable, payments: [], createdAt: iso(), by: me() };
      db.inwards.push(inw);
      d.items.forEach((x: any) => db.stock.push({ id: uid(), spareId: x.spareId, inwardId: inw.id, batch: x.batch, qty: Number(x.qty), rate: Number(x.rate), isNew: true }));
      if (d.poId) rep(db, 'pos', d.poId, (p) => ({ ...p, status: 'Inwarded' }));
      if (d.replacementId) rep(db, 'replacements', d.replacementId, (r) => ({ ...r, status: 'Received', inward: { billNo: d.billNo, billDate: d.billDate, qty: sum(d.items, (x: any) => x.qty), rate: 0 } }));
      act(db, 'Stock inward recorded', inw.no, 'inward', inw.id, 'Workshop');
    });
    toast('Stock inward saved', 'ok', 'Stock updated');
    return inw;
  },
  payInward(id: string, d: any) { M((db) => { const i = rep(db, 'inwards', id, (x) => { x.payments.push({ ...d, id: uid() }); x.pending = Math.max(0, x.pending - d.amount - d.tds - d.discount); return x; }); ledgerAdd(db, { voucherNo: `PV/${nextNo(db, 'pv')}`, date: d.date, voucherType: d.mode === 'Cash' ? 'Cash Payment' : 'Bank Payment', party: 'Other', ledgerName: lookup.supplier(db, i.supplierId), particular: `Spares bill ${i.billNo}`, debit: d.amount, credit: 0, refType: 'Inventory Payment', refNo: i.no, ledgerId: d.paidBy }); }); toast('Supplier payment recorded'); },
  createReplacement(d: any) { let r: any; M((db) => { r = { ...d, id: uid(), no: `RPL/${nextNo(db, 'rep')}`, status: 'Sent', inward: null, createdAt: iso(), by: me() }; db.replacements.push(r); d.items.forEach((it: any) => { const lot = db.stock.find((s: any) => s.inwardId === it.inwardId && s.spareId === it.spareId); if (lot) rep(db, 'stock', lot.id, (x) => ({ ...x, qty: Math.max(0, x.qty - it.qty) })); }); act(db, 'Spare sent for replacement', r.no, 'replacement', r.id, 'Workshop'); }); toast(`${r.no} created`, 'ok', 'Gate pass ready'); return r; },
  createServiceBill(d: any) { let sb: any; M((db) => { sb = { ...d, id: uid(), no: `SB/${nextNo(db, 'sb')}`, pending: d.net, payments: [], createdAt: iso(), by: me() }; db.serviceBills.push(sb); d.items.forEach((it: any) => rep(db, 'jobcards', it.jobCardId, (j) => { j.services[it.serviceIdx].serviceBillId = sb.id; return j; })); act(db, 'Service bill recorded', sb.no, 'servicebill', sb.id, 'Workshop'); }); toast('Service bill saved'); return sb; },
  payServiceBill(id: string, d: any) { M((db) => { const sb = rep(db, 'serviceBills', id, (x) => { x.payments.push({ ...d, id: uid() }); x.pending = Math.max(0, x.pending - d.amount - d.tds - d.discount); return x; }); ledgerAdd(db, { voucherNo: `PV/${nextNo(db, 'pv')}`, date: d.date, voucherType: d.mode === 'Cash' ? 'Cash Payment' : 'Bank Payment', party: 'Other', ledgerName: lookup.supplier(db, sb.supplierId), particular: `Service bill ${sb.billNo}`, debit: d.amount, credit: 0, refType: 'Service Payment', refNo: sb.no, ledgerId: d.paidBy }); }); toast('Service payment recorded'); },
  saveChecklist(d: any) { let c: any; M((db) => { if (d.id) c = rep(db, 'checklists', d.id, (x) => ({ ...x, ...d })); else { c = { ...d, id: uid(), no: `TMC/${nextNo(db, 'chk')}`, createdAt: iso() }; db.checklists.push(c); } act(db, 'Truck checklist saved', c.no, 'checklist', c.id, 'Workshop'); }); toast('Checklist saved'); return c; },

  // ---- Support
  replyComplaint(id: string, msg: string, close: boolean, status?: string) { M((db) => rep(db, 'complaints', id, (c) => { if (msg) c.replies.push({ by: me(), msg, date: iso() }); c.status = close ? 'Resolved' : status || (c.status === 'Pending' ? 'In Progress' : c.status); c.closed = close; if (close) c.closedBy = me(); return c; })); toast(close ? 'Ticket resolved' : 'Reply sent', 'ok', 'Customer notified by email'); },
  courierReceived(ids: string[]) { M((db) => ids.forEach((id) => rep(db, 'couriers', id, (c) => ({ ...c, received: true, receivedDate: ymd(), receivedTime: hm(), receivedBy: me() })))); toast(`${ids.length} courier(s) marked received`); },
  deleteLR(lrNo: string) {
    let ok: any = 'Not found';
    M((db) => { const l = db.lrs.find((x: any) => x.lrNo.toLowerCase() === lrNo.trim().toLowerCase()); if (!l) return; if (l.billId) { ok = 'LR is billed – delete the bill first'; return; } ok = true; db.lrs = db.lrs.filter((x: any) => x.id !== l.id); db.deletedLog.push({ at: iso(), by: me(), coll: 'lrs', id: l.id, no: l.lrNo }); act(db, 'LR deleted', l.lrNo, 'lr', l.id, 'Admin'); });
    ok === true ? toast(`${lrNo} deleted`, 'info') : toast(String(ok), 'bad');
    return ok === true;
  },
};
export { round2 };
