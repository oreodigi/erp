import { addDays, iso, rng, ymd, hm, round2, sum } from '../lib/util';
import {
  CITIES, STATES, COUNTRIES, COMPANY, BRANCHES, GODOWNS, UNITS, GOODS, WAGONS, CUSTOMERS, TRANSPORTERS, PUMPS, LEDGERS, EXPENSE_TYPES, NAMES, LABOURS_SEED,
  SPARE_CATEGORIES, SPARES, SERVICES, SUPPLIERS, CHECKLIST_PARTICULARS, ROLE_DEFS, TRUCK_CAPACITIES,
} from './masters';
import { NAV, ROLE_GROUPS } from '../nav';

export const SEED_VERSION = 8;

const cityById = Object.fromEntries(CITIES.map((c) => [c.id, c]));
export function distKm(a: string, b: string) {
  const A = cityById[a], B = cityById[b];
  if (!A || !B || a === b) return 35;
  const R = 6371, toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(B.lat - A.lat), dLng = toR(B.lng - A.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(A.lat)) * Math.cos(toR(B.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.24);
}
const branchCity = (b: string) => BRANCHES.find((x) => x.id === b)!.city;
const custCity = (c: string) => CUSTOMERS.find((x) => x.id === c)!.city;
const cityName = (c: string) => cityById[c]?.name || c;

export function buildSeed() {
  const R = rng(20261007);
  const NOW = new Date();
  const at = (daysAgo: number, h = 10, m = 0) => { const d = addDays(NOW, -daysAgo); d.setHours(h, m, 0, 0); return iso(d); };
  const users = ['Prakash Wagh', 'Swapnil Patil', 'Meena Chaudhari', 'Rahul Bendale', 'Bhaskar Kalita', 'Subhajit Ghosh', 'Kavita Joshi', 'Javed Shaikh'];
  const by = () => R.pick(users);

  const counters: Record<string, number> = { lr: 10418, order: 1000, grn: 301, dgrn: 118, dc: 540, bill: 181, rv: 411, tps: 71, dcps: 30, ham: 52, jv: 905, pv: 610, trip: 2240, ls: 152, jc: 91, po: 41, inw: 60, rep: 8, sb: 21, courier: 330, acc: 12, ticket: 1040, rake: 113, chk: 40 };
  const next = (k: string) => ++counters[k];

  // ---------- Masters ----------
  const drivers = Array.from({ length: 26 }, (_, i) => {
    const name = `${NAMES.firstNames[i % NAMES.firstNames.length]} ${NAMES.lastNames[(i * 7) % NAMES.lastNames.length]}`;
    const city = R.pick(['jalgaon', 'bhusawal', 'dhule', 'jalgaon', 'aurangabad']);
    return {
      id: 'd' + (i + 1), name, type: i < 22 ? 'Own' : 'Market', mobile: '9' + String(R.int(100000000, 999999999)), altMobile: R.chance(0.5) ? '9' + String(R.int(100000000, 999999999)) : '',
      license: `MH19 ${2008 + (i % 14)}000${R.int(1000, 9999)}`, licenseCity: city, licenseDate: `${2008 + (i % 14)}-0${(i % 9) + 1}-12`, licenseExpiry: ymd(addDays(NOW, i === 3 ? 12 : i === 9 ? -6 : R.int(60, 1600))),
      dob: `${1972 + (i % 20)}-0${(i % 9) + 1}-1${i % 9}`, anniversary: '', bloodGroup: R.pick(['A+', 'B+', 'O+', 'AB+', 'O-', 'B-']), pan: `AB${'CDEFGHJK'[i % 8]}P${R.int(1000, 9999)}${'ABCDE'[i % 5]}`,
      aadhaar: `${R.int(2000, 9999)} ${R.int(1000, 9999)} ${R.int(1000, 9999)}`, salary: R.pick([16000, 17500, 18000, 19500, 21000]), onLeave: i === 7 || i === 15, blacklisted: i === 24,
      address: `${R.int(10, 220)}, ${R.pick(['Shivaji Nagar', 'Mehrun', 'Pimprala', 'Ram Nagar', 'Station Road'])}`, city, state: 'Maharashtra', country: 'India', corrAddress: '', landline: '',
      refName: `${R.pick(NAMES.firstNames)} ${R.pick(NAMES.lastNames)}`, refContact: '9' + String(R.int(100000000, 999999999)), particulars: '', tdsRate: 0, noTdsAmt: 0, remarks: '', rating: round2(3.4 + R.r() * 1.5),
    };
  });

  const ownTruckNos = Array.from({ length: 22 }, (_, i) => `MH19 ${['CY', 'CX', 'BM', 'Z', 'CV'][i % 5]} ${String(1200 + i * 317).slice(-4)}`);
  const mktTruckNos = ['MH18 BG 4471', 'MH20 EL 2290', 'MH04 KF 8812', 'AS01 NC 3307', 'AS01 PC 9184', 'WB25 J 6610', 'WB23 E 1148', 'MH15 HH 7021', 'TN04 AX 5521', 'MH12 TV 3940', 'GJ05 BZ 7718', 'MP09 HG 2205', 'AS25 C 6619', 'WB11 F 2290'];
  const trucks = [...ownTruckNos.map((n, i) => ({ n, own: true, i })), ...mktTruckNos.map((n, i) => ({ n, own: false, i }))].map(({ n, own, i }, k) => {
    const cap = own ? R.pick(['32 HQ', '32 LQ', '20 MT', '16 MT', '10 Wheeler', '12 Wheeler', '34 HQ']) : R.pick(TRUCK_CAPACITIES.slice(0, 10).concat(['9 MT', '16 MT']));
    const due = (base: number) => ymd(addDays(NOW, base));
    const mktTrans = own ? '' : ['t1', 't2', 't3', 't4', 't4', 't5', 't5', 't7', 't8', 't3', 't2', 't1', 't4', 't5'][i];
    return {
      id: 'tr' + (k + 1), number: n, type: own ? 'Own' : 'Market', capacity: cap, make: R.pick(['Tata Signa 3118.T', 'Ashok Leyland 3120', 'BharatBenz 2823R', 'Eicher Pro 6028', 'Tata LPT 2518']),
      chassis: `MAT${R.int(100000, 999999)}${['K', 'L', 'M'][k % 3]}${R.int(10000, 99999)}`, engine: `${['B5.9', 'H6', 'OM926'][k % 3]}-${R.int(100000, 999999)}`, tyres: R.pick([10, 12, 14]),
      transporterId: mktTrans, transTruckType: own ? '' : (mktTrans === 't6' ? 'Union' : 'Market'),
      purchaseDate: own ? `${2016 + (k % 9)}-0${(k % 9) + 1}-15` : '',
      insNo: `OG-${R.int(24, 26)}-1801-${R.int(10000000, 99999999)}`, insCompany: R.pick(['New India Assurance', 'ICICI Lombard', 'Bajaj Allianz', 'United India Insurance']), insDate: due(-R.int(30, 300)), insDue: due(k === 2 ? 9 : k === 11 ? -3 : R.int(40, 330)), insAmt: R.int(42000, 78000),
      fitNo: `FT${R.int(100000, 999999)}`, fitDate: due(-R.int(100, 300)), fitDue: due(k === 5 ? 14 : R.int(60, 360)), fitnessAmt: 3500,
      gpNo: `GP/${R.int(1000, 9999)}`, gpDate: due(-R.int(60, 300)), gpDue: due(k === 7 ? 21 : R.int(45, 340)),
      npNo: `NP/MH/${R.int(10000, 99999)}`, npDate: due(-R.int(60, 300)), npDue: due(k === 4 ? -1 : R.int(30, 360)),
      taxNo: `TX${R.int(100000, 999999)}`, taxDate: due(-R.int(10, 80)), taxDue: due(k === 1 ? 6 : R.int(20, 90)), taxAmt: R.int(9000, 16000),
      cft: R.pick([1450, 1650, 1800, 2100]), volume: R.pick([42, 48, 55, 62]), extraDiesel: R.chance(0.2), monthlyExp: own ? R.int(16000, 26000) : 0, emi: own && k % 3 !== 0 ? R.int(14000, 24000) : 0,
      stdAvg: round2(3.4 + R.r() * 1.2), salary: own ? 18000 : 0, permitAmt: own ? R.int(12000, 22000) : 0, rpNo: `RP${R.int(10000, 99999)}`, remarks: '',
      odometer: own ? R.int(180000, 640000) : 0, driverId: own ? 'd' + (k + 1) : '', isTransit: false, isActive: true,
    };
  });

  const labours = LABOURS_SEED.map(([type, name, branchId], i) => ({
    id: 'lb' + (i + 1), type, name, branchId, city: branchCity(branchId), address: '', contact: name.split('– ').pop(), phone: '', mobile: '9' + String(R.int(100000000, 999999999)),
    refName: '', refContact: '', startDate: ymd(addDays(NOW, -R.int(200, 2400))), pan: type === 'Hamal' ? `A${'BCDFG'[i % 5]}KPK${R.int(1000, 9999)}Q` : '', tdsRate: type === 'Hamal' ? 1 : 0, noTdsAmt: 30000,
  }));
  const sup = (b: string) => labours.filter((l) => l.type === 'Supervisor' && l.branchId === b)[0]?.id || 'lb1';
  const hamal = (b: string) => R.pick(labours.filter((l) => l.type === 'Hamal' && l.branchId === b).concat(labours.filter((l) => l.type === 'Hamal' && l.branchId === 'JL')).slice(0, 2)).id;
  const mechanics = labours.filter((l) => l.type === 'Mechanic');

  const departments = ['Operations', 'Rail Operations', 'Accounts', 'Fleet', 'Workshop', 'Customer Care', 'HR & Admin'].map((n, i) => ({ id: 'dp' + (i + 1), name: n, branchId: 'JL', company: 'skt', description: '' }));
  const designations = [['General Manager', true, 500000], ['Branch Manager', true, 200000], ['Accounts Manager', true, 150000], ['Operations Executive', false, 25000], ['Supervisor', false, 10000], ['Fleet Coordinator', false, 50000], ['Workshop Head', false, 75000], ['Customer Care Executive', false, 0], ['Clerk', false, 0]].map(([n, s, l]: any, i) => ({ id: 'dg' + (i + 1), name: n, seniorMgmt: s, approvalLimit: l, powered: i > 0 ? 'General Manager' : '', description: '' }));
  const employees = [
    ['Mr.', 'Prakash', 'Wagh', 'dp1', 'dg1', 'JL'], ['Mr.', 'Swapnil', 'Patil', 'dp1', 'dg4', 'JL'], ['Mrs.', 'Meena', 'Chaudhari', 'dp3', 'dg3', 'JL'], ['Mr.', 'Rahul', 'Bendale', 'dp4', 'dg6', 'JL'],
    ['Mr.', 'Bhaskar', 'Kalita', 'dp2', 'dg2', 'GH'], ['Mr.', 'Subhajit', 'Ghosh', 'dp2', 'dg2', 'KL'], ['Ms.', 'Kavita', 'Joshi', 'dp6', 'dg8', 'JL'], ['Mr.', 'Javed', 'Shaikh', 'dp5', 'dg7', 'JL'],
    ['Mr.', 'Sachin', 'Kadam', 'dp1', 'dg2', 'MB'], ['Mr.', 'Amol', 'Deshmukh', 'dp1', 'dg2', 'PN'], ['Mr.', 'Yogesh', 'Bhamre', 'dp1', 'dg2', 'NS'], ['Ms.', 'Pooja', 'Nemade', 'dp7', 'dg9', 'JL'],
  ].map(([sal, f, l, dep, des, b], i) => ({
    id: 'em' + (i + 1), salutation: sal, firstName: f, middleName: '', lastName: l, gender: sal === 'Mr.' ? 'Male' : 'Female', dob: `198${i % 10}-0${(i % 9) + 1}-1${i % 9}`, maritalStatus: 'Married', bloodGroup: R.pick(['A+', 'B+', 'O+']),
    payrollNo: `SKT${String(101 + i)}`, departmentId: dep, designationId: des, branchId: b, joiningDate: `20${String(8 + (i % 14)).padStart(2, '0')}-04-01`, mobile: '9' + String(R.int(100000000, 999999999)),
    workEmail: `${String(f).toLowerCase()}.${String(l).toLowerCase()}@sktranslines.in`, personalEmail: '', landline: '', facebook: '', address: '', city: branchCity(b), pin: '', totalExp: 4 + (i % 15), prevEmployer: '', promotion: '', blacklisted: 'No', appearance: '',
  }));

  const roles = ROLE_DEFS.map((r) => ({ ...r, menus: NAV.filter((g) => ROLE_GROUPS[r.code].includes(g.key)).flatMap((g) => g.items.map((i) => i.key)) }));
  const userRows = [
    ['prakash.w', 'Prakash', 'Wagh', 'JL', 'r1'], ['swapnil.p', 'Swapnil', 'Patil', 'JL', 'r3'], ['meena.c', 'Meena', 'Chaudhari', 'JL', 'r5'], ['rahul.b', 'Rahul', 'Bendale', 'JL', 'r7'],
    ['bhaskar.k', 'Bhaskar', 'Kalita', 'GH', 'r4'], ['subhajit.g', 'Subhajit', 'Ghosh', 'KL', 'r4'], ['kavita.j', 'Kavita', 'Joshi', 'JL', 'r6'], ['javed.s', 'Javed', 'Shaikh', 'JL', 'r8'],
    ['pooja.n', 'Pooja', 'Nemade', 'JL', 'r9'], ['admin', 'System', 'Administrator', 'JL', 'r2'], ['sachin.k', 'Sachin', 'Kadam', 'MB', 'r4'], ['amol.d', 'Amol', 'Deshmukh', 'PN', 'r4'],
  ];
  const usersM = userRows.map(([u, f, l, b, r], i) => ({ id: 'us' + (i + 1), username: u, firstName: f, middleName: '', lastName: l, email: `${u}@sktranslines.in`, branchId: b, company: 'skt', roleId: r, active: i !== 11, loginCount: R.int(20, 900), lastLogin: at(R.int(0, 6), R.int(8, 19)), extraMenus: [] as string[], deniedMenus: [] as string[] }));

  // ---------- Transactions ----------
  const orders: any[] = [], lrs: any[] = [], grns: any[] = [], schedules: any[] = [], dgrns: any[] = [], dcs: any[] = [], bills: any[] = [], clientPayments: any[] = [];
  const tpSlips: any[] = [], dcPayslips: any[] = [], hamaliPayments: any[] = [], ledger: any[] = [], trips: any[] = [], tripExpenses: any[] = [], logslips: any[] = [];

  const ownTrucks = trucks.filter((t) => t.type === 'Own');
  const busyTruck = new Set<string>();
  const pickOwnTruck = () => { const free = ownTrucks.filter((t) => !busyTruck.has(t.id)); return R.pick(free.length ? free : ownTrucks); };
  const mktFor = (b: string) => { const pool = trucks.filter((t) => t.type === 'Market' && (b === 'GH' ? ['t4'].includes(t.transporterId) : b === 'KL' ? ['t5'].includes(t.transporterId) : !['t4', 't5', 't7'].includes(t.transporterId))); return R.pick(pool.length ? pool : trucks.filter((t) => t.type === 'Market')); };

  const ledgerAdd = (e: any) => ledger.push({ id: 'le' + (ledger.length + 1), tally: e.tally ?? (Date.parse(e.date) < +addDays(NOW, -7)), ...e });

  const mkOrder = (o: any) => { const id = 'o' + (orders.length + 1); const rec = { id, orderNo: `ORD-${next('order')}`, ...o }; orders.push(rec); return rec; };

  // goods-based rates for rail (per carton / per unit)
  const railRate: Record<string, number> = { g1: 410, g2: 560, g3: 330, g4: 160, g5: 290, g6: 150, g7: 120, g8: 130, g10: 62, g12: 70, g9: 780 };

  function mkLR(p: any) {
    const id = 'lr' + (lrs.length + 1);
    const fromB = p.fromBranchId;
    const lrNo = `SKT/${fromB}/${next('lr')}`;
    const consignor = CUSTOMERS.find((c) => c.id === p.consignorId)!;
    const consignee = CUSTOMERS.find((c) => c.id === p.consigneeId) || consignor;
    const goods = GOODS.find((g) => g.id === p.goodsId)!;
    const weight = Math.round(p.qty * goods.weight);
    const rec: any = {
      id, lrNo, orderId: p.order?.id || '', orderNo: p.order?.orderNo || '', mode: p.mode || 'Road', via: p.via || 'None', toRailHead: p.toRailHead || '',
      consignorId: consignor.id, consignorAddr: consignor.address, consigneeId: consignee.id, consigneeAddr: p.deliveryAt || consignee.address,
      source: cityName(p.sourceCity || branchCity(fromB)), sourceCity: p.sourceCity || branchCity(fromB), destination: cityName(p.destCity), destCity: p.destCity,
      fromBranchId: fromB, toBranchId: p.toBranchId || fromB, cityId: p.sourceCity || branchCity(fromB), email: consignor.email, godownId: p.godownId || '',
      placeDate: p.placeDate, placeTime: '10:30', outDate: p.outDate || p.placeDate, outTime: '18:00', invoices: `INV/${consignor.short}/${R.int(2400, 9900)}${R.chance(0.4) ? ', ' + R.int(2400, 9900) : ''}`,
      deliveryAt: p.deliveryAt || consignee.address, goodsValue: Math.round(p.qty * R.int(4500, 24000) / (goods.id === 'g10' ? 30 : 1) / 1000) * 1000, destinationParty: consignee.name,
      risk: R.chance(0.8) ? 'Owner' : 'Carrier', deliveryType: R.chance(0.75) ? 'Door Delivery' : 'Godown Delivery', seal: `SL${R.int(100000, 999999)}`, priority: p.priority || (R.chance(0.15) ? 'Urgent' : R.chance(0.3) ? 'High' : 'Normal'),
      vehicle: p.vehicle || 'Own', tripId: '', truckId: p.truckId || '', driverId: p.driverId || '', openingKm: p.openingKm || 0, rpNo: '',
      insurance: { on: R.chance(0.3), no: R.chance(0.3) ? `MC-${R.int(100000, 999999)}` : '', company: 'New India Assurance', start: p.placeDate, end: ymd(addDays(p.placeDate, 30)) },
      chargeableWeight: Math.max(weight, p.mode === 'Road' ? 9000 : weight), weight, packages: p.qty, billingUnit: p.billingUnit || (p.mode === 'Road' ? 'Truck' : 'Cartons'),
      paymentMode: p.paymentMode || (R.chance(0.88) ? 'To Be Billed' : 'To Pay'), freight: p.freight, gstPayBy: R.pick(['Consignor', 'Consignee', 'Consignor']), billHead: p.billHead || 'Consignor', toPayTax: false, freightReturn: false,
      transporterId: p.transporterId || '', mkt: p.mkt || null, remark: p.remark || '', isUrgent: false,
      items: [{ goodsId: goods.id, name: goods.name, unit: UNITS.find((u) => u.id === goods.unit)!.name, qty: p.qty, pending: 0, damage: 0, shortage: 0 }, ...(p.extraItems || [])],
      status: p.status, isFinal: p.status !== 'Draft', createdAt: at(p.age, 10, 30), createdBy: p.createdBy || by(), branchId: fromB, stdDays: Math.max(1, Math.ceil(distKm(p.sourceCity || branchCity(fromB), p.destCity) / 380)),
      events: [] as any[], grnId: '', scheduleId: p.scheduleId || '', dcIds: [] as string[], delivery: null, ack: null, billId: '', tpSlipId: '',
    };
    rec.dueDate = ymd(addDays(rec.placeDate, rec.stdDays));
    rec.events.push({ at: rec.createdAt, label: rec.isFinal ? 'LR generated & finalised' : 'LR saved as draft', by: rec.createdBy });
    lrs.push(rec);
    return rec;
  }

  function startTrip(lr: any, truck: any, age: number, completed: boolean) {
    const km = distKm(lr.sourceCity, lr.destCity);
    const opening = truck.odometer;
    truck.odometer += km * (completed ? 2 : 1);
    const t: any = {
      id: 'tp' + (trips.length + 1), name: `TRP/${next('trip')}`, for: 'Client (LR)', clientId: lr.consignorId, scheduleId: '', truckId: truck.id, driverId: truck.driverId,
      fromCity: lr.sourceCity, toCity: lr.destCity, startDate: ymd(lr.outDate), startTime: '18:30', openingKm: opening, isEmpty: false, onwardFreight: lr.freight, advance: R.pick([8000, 10000, 12000, 15000]),
      payType: 'Cash', paidBy: 'l4', description: `${lr.lrNo} ${lr.source} → ${lr.destination}`, lrId: lr.id, dcId: '', completed, endDate: completed ? ymd(addDays(lr.outDate, Math.ceil(km / 380) + 1)) : '', endTime: completed ? '14:00' : '',
      closingKm: completed ? opening + km * 2 : 0, logslipId: '', createdAt: lr.createdAt,
    };
    trips.push(t); lr.tripId = t.id; lr.truckId = truck.id; lr.driverId = truck.driverId; lr.openingKm = opening;
    if (!completed) busyTruck.add(truck.id);
    const pump = R.pick(PUMPS);
    const litres = Math.round((km * (completed ? 2 : 1)) / truck.stdAvg);
    const exps = [['e1', litres, pump.dieselRate], ['e2', 1, Math.round(km * 2.6)], ['e3', 1, Math.ceil(km / 380) * 450]];
    if (R.chance(0.4)) exps.push(['e9', 1, 250]);
    exps.forEach(([typeId, qty, rate]: any, j) => tripExpenses.push({ id: 'te' + (tripExpenses.length + 1), tripId: t.id, truckId: truck.id, typeId, cardNo: typeId === 'e1' ? 'l5' : '', city: j === 0 ? lr.sourceCity : lr.destCity, pumpId: typeId === 'e1' ? pump.id : '', qty, rate, amount: Math.round(qty * rate), mode: typeId === 'e1' ? 'Credit' : 'Cash', date: at(age - (j ? 1 : 0), 19), branchId: lr.fromBranchId }));
    return t;
  }

  // ---------------- ORDERS ----------------
  const orderPlans: any[] = [
    // [client, fromB, toB, cityPickup, goods, qty, truckQty, ageDays, status]
    ['c2', 'JL', 'MB', 'jalgaon', 'g1', 600, 3, 40, 'Completed'], ['c1', 'PN', 'PN', 'pune', 'g3', 900, 4, 36, 'Completed'], ['c3', 'PN', 'PN', 'pune', 'g6', 1600, 4, 30, 'Completed'],
    ['c2', 'JL', 'GH', 'jalgaon', 'g1', 1200, 0, 38, 'Completed'], ['c5', 'JL', 'GH', 'jalgaon', 'g10', 2400, 0, 12, 'In Process'], ['c4', 'NS', 'NS', 'nashik', 'g8', 900, 3, 16, 'In Process'],
    ['c6', 'JL', 'JL', 'jalgaon', 'g9', 120, 2, 7, 'In Process'], ['c1', 'PN', 'KL', 'pune', 'g4', 1400, 0, 6, 'In Process'], ['c3', 'PN', 'PN', 'pune', 'g7', 800, 2, 3, 'In Process'],
    ['c2', 'JL', 'GH', 'jalgaon', 'g3', 700, 0, 2, 'Confirmed'], ['c8', 'MB', 'MB', 'mumbai', 'g12', 1500, 2, 1, 'Confirmed'], ['c7', 'JL', 'JL', 'dhule', 'g11', 60, 1, 1, 'Pending'],
    ['c4', 'NS', 'NS', 'nashik', 'g8', 450, 2, 0, 'Pending'], ['c13', 'JL', 'JL', 'jalgaon', 'g13', 600, 2, 0, 'Pending'], ['c14', 'JL', 'JL', 'jalgaon', 'g14', 18, 1, 9, 'Rejected'], ['c6', 'JL', 'JL', 'jalgaon', 'g9', 60, 1, 26, 'Preclosed'],
  ];
  const orderObjs = orderPlans.map(([client, fromB, toB, city, g, qty, tq, age, status]) => {
    const goods = GOODS.find((x) => x.id === g)!;
    const cust = CUSTOMERS.find((c) => c.id === client)!;
    return mkOrder({
      clientId: client, fromBranchId: fromB, fromAddr: BRANCHES.find((b) => b.id === fromB)!.address, toBranchId: toB, toAddr: BRANCHES.find((b) => b.id === toB)!.address, cityId: city,
      pickupDate: ymd(addDays(NOW, -age + 1)), instructions: R.pick(['Pick up from factory gate 2 after 2 PM', 'Shrink-wrapped pallets; no top loading', 'Carry 2 tarpaulins; monsoon packing', 'Call warehouse in-charge before arrival', 'Hydraulic tail-lift preferred']),
      orderBy: tq ? 'Truck' : 'Item', truckQty: tq, remainingTruckQty: tq, items: [{ goodsId: g, name: goods.name, unit: UNITS.find((u) => u.id === goods.unit)!.name, qty, remaining: qty }],
      status, personName: cust.contactPerson || cust.contact, personEmail: cust.email, personPhone: cust.phone, billingAmt: 0, createdAt: at(age, 9, 15), createdBy: by(),
      confirmedAt: ['Pending'].includes(status) ? '' : at(age, 13), events: [{ at: at(age, 9, 15), label: 'Order initiated', by: 'Customer portal' }, ...(status !== 'Pending' ? [{ at: at(age, 13), label: status === 'Rejected' ? 'Order rejected – credit limit exceeded' : 'Order confirmed', by: 'Swapnil Patil' }] : [])],
    });
  });
  const takeOrder = (o: any, qty: number) => { o.items[0].remaining = Math.max(0, o.items[0].remaining - qty); if (o.orderBy === 'Truck') o.remainingTruckQty = Math.max(0, o.remainingTruckQty - 1); };

  // ---------------- ROAD LRs ----------------
  type RoadPlan = [string, string, string, string | null, string, number, number, string?];
  const roadPlans: RoadPlan[] = [
    // fromB, destCity, consignor, consignee, goods, qty, age
    ['JL', 'mumbai', 'c2', 'c8', 'g1', 200, 39], ['JL', 'mumbai', 'c2', 'c8', 'g1', 200, 38], ['JL', 'mumbai', 'c2', 'c8', 'g1', 200, 37],
    ['PN', 'hyderabad', 'c1', null, 'g3', 240, 35], ['PN', 'bengaluru', 'c1', null, 'g3', 230, 34], ['PN', 'chennai', 'c1', 'c12', 'g3', 220, 33], ['PN', 'hyderabad', 'c1', null, 'g3', 210, 32],
    ['PN', 'bengaluru', 'c3', null, 'g6', 400, 29], ['PN', 'hyderabad', 'c3', null, 'g6', 400, 28], ['PN', 'chennai', 'c3', 'c12', 'g6', 400, 27], ['PN', 'delhi', 'c3', null, 'g6', 400, 27],
    ['JL', 'indore', 'c14', null, 'g14', 18, 70], ['JL', 'indore', 'c14', null, 'g14', 16, 66], ['JL', 'surat', 'c7', null, 'g11', 55, 31], ['JL', 'raipur', 'c13', null, 'g13', 400, 30],
    ['NS', 'delhi', 'c4', null, 'g8', 300, 15], ['NS', 'ahmedabad', 'c4', null, 'g8', 300, 14], ['NS', 'delhi', 'c4', null, 'g8', 300, 4],
    ['JL', 'nagpur', 'c6', null, 'g9', 60, 6], ['JL', 'indore', 'c6', null, 'g9', 40, 2],
    ['PN', 'hyderabad', 'c3', null, 'g7', 400, 2], ['PN', 'bengaluru', 'c3', null, 'g7', 350, 1],
    ['MB', 'pondicherry', 'c8', null, 'g12', 1000, 22], ['MB', 'nashik', 'c8', 'c4', 'g12', 600, 19], ['JL', 'delhi', 'c5', null, 'g10', 1400, 18], ['JL', 'raipur', 'c5', null, 'g10', 1200, 13],
    ['GH', 'shillong', 'c9', 'c11', 'g3', 120, 24], ['GH', 'agartala', 'c9', null, 'g1', 90, 11], ['KL', 'patna', 'c10', null, 'g6', 260, 10], ['KL', 'siliguri', 'c10', null, 'g7', 300, 8],
    ['PY', 'chennai', 'c12', null, 'g7', 180, 20], ['PY', 'bengaluru', 'c12', null, 'g7', 160, 5],
    ['JL', 'mumbai', 'c2', 'c8', 'g2', 120, 9], ['PN', 'jalgaon', 'c1', 'c2', 'g4', 500, 8], ['JL', 'pune', 'c2', 'c1', 'g5', 260, 7], ['JL', 'ahmedabad', 'c6', null, 'g9', 50, 5],
    ['PN', 'chennai', 'c1', 'c12', 'g3', 220, 4], ['JL', 'surat', 'c7', null, 'g11', 50, 3], ['NS', 'mumbai', 'c4', 'c8', 'g8', 260, 1], ['JL', 'nagpur', 'c13', null, 'g13', 380, 1],
    ['JL', 'mumbai', 'c2', 'c8', 'g1', 180, 0], ['PN', 'hyderabad', 'c1', null, 'g3', 200, 0],
  ];
  const orderFor = (client: string, fromB: string, age: number, rail = false) => orderObjs.find((o) => o.clientId === client && o.fromBranchId === fromB && ['Completed', 'In Process'].includes(o.status) && (rail ? o.toBranchId !== fromB : o.toBranchId === fromB || o.orderBy === 'Truck') && age <= Number((NOW.getTime() - Date.parse(o.createdAt)) / 864e5) + 0.5 && o.items[0].remaining > 0);

  roadPlans.forEach(([fromB, dest, cnor, cnee, g, qty, age], idx) => {
    const src = branchCity(fromB);
    const km = distKm(src, dest);
    const freight = Math.round(Math.max(9500, km * R.int(44, 56)) / 500) * 500;
    const own = idx % 3 !== 1;
    const truck = own ? pickOwnTruck() : mktFor(fromB);
    const transitDays = Math.ceil(km / 380);
    let status = 'Delivered';
    const deliveredAge = age - transitDays;
    if (age === 0) status = idx % 2 ? 'Draft' : 'Finalised';
    else if (deliveredAge > 0) status = 'Delivered';
    else status = 'In Transit';
    const order = orderFor(cnor, fromB, age);
    const placeDate = ymd(addDays(NOW, -age));
    const mkt = own ? null : (() => { const f = Math.round(freight * 0.86 / 100) * 100, adv = Math.round(f * 0.7 / 100) * 100, ham = R.pick([0, 500, 800]), tds = Math.round(f * 0.01), com = R.pick([0, 500, 1000]); return { freight: f, hamali: ham, advance: adv, tds, commission: com, net: f - adv - tds - com + ham, totalAdv: adv }; })();
    const lr = mkLR({ fromBranchId: fromB, destCity: dest, consignorId: cnor, consigneeId: cnee || cnor, goodsId: g, qty, age, placeDate, status, order, freight, vehicle: own ? 'Own' : 'Market', transporterId: own ? '' : truck.transporterId, truckId: status === 'Draft' ? '' : truck.id, driverId: own ? truck.driverId : '', mkt, deliveryAt: cnee ? undefined : `${R.pick(['Depot', 'Warehouse', 'C&F Agent', 'Distributor'])}, ${cityName(dest)}` });
    if (order) takeOrder(order, qty);
    if (!own && status !== 'Draft') { lr.driverName = `${R.pick(NAMES.firstNames)} ${R.pick(NAMES.lastNames)}`; lr.driverMobile = '9' + R.int(100000000, 999999999); }
    if (own && status !== 'Draft') startTrip(lr, truck, age, status === 'Delivered');
    if (status !== 'Draft' && status !== 'Finalised') lr.events.push({ at: at(age, 18), label: `Dispatched – ${truck.number}`, by: lr.createdBy });
    if (status === 'In Transit') lr.progress = Math.min(0.92, Math.max(0.12, age / transitDays));
    if (status === 'Delivered') {
      const dd = addDays(NOW, -deliveredAge);
      lr.delivery = { date: ymd(dd), time: R.pick(['11:20', '13:45', '15:10', '09:40']), remark: R.pick(['Delivered in good condition', 'Received by stores in-charge', 'Unloaded at dock 3', 'Delivered; 2 cartons dented, noted on POD']), unloading: R.pick([0, 0, 600, 1200]) };
      lr.events.push({ at: iso(dd), label: 'Delivered at consignee', by: 'Driver app' });
      if (deliveredAge > 4 && !(idx % 7 === 0 && deliveredAge < 12)) {
        const rd = addDays(NOW, -Math.max(1, deliveredAge - R.int(2, 5)));
        const dmg = lr.delivery.remark.includes('dented') ? 2 : 0;
        lr.items[0].damage = dmg;
        lr.ack = { receivedDate: ymd(rd), receivedTime: '12:00', docket: `${R.pick(['DTDC', 'Professional', 'Tirupati'])}-${R.int(10000000, 99999999)}`, courier: R.pick(['DTDC', 'The Professional Couriers', 'Shree Tirupati Courier']), courierCharge: R.pick([60, 80, 120]), detentionDays: R.chance(0.2) ? 1 : 0, detentionAmt: 0, damageAmt: dmg * 900, remark: 'POD received with seal & sign', items: [{ idx: 0, total: qty, received: qty - dmg, damage: dmg }], uploads: [{ name: `POD_${lr.lrNo.replace(/\//g, '')}.pdf`, size: '412 KB' }], by: 'Kavita Joshi', at: iso(rd) };
        lr.ack.detentionAmt = lr.ack.detentionDays * 1500;
        lr.events.push({ at: iso(rd), label: 'POD / acknowledgment received', by: 'Kavita Joshi' });
      }
    }
  });

  // ---------------- RAIL: Schedules ----------------
  const schedPlans = [
    { dest: 'GH', age: 34, state: 'Completed' }, { dest: 'KL', age: 22, state: 'Completed' }, { dest: 'GH', age: 9, state: 'Unloading' },
    { dest: 'KL', age: 3, state: 'In Transit' }, { dest: 'GH', age: -1, state: 'Loading' }, { dest: 'GH', age: -6, state: 'Planned' },
  ];
  const vpNo = () => `${R.int(10, 99)}${R.int(100, 999)} ${R.pick(['CR', 'WR', 'ER', 'NFR'])}`;
  schedPlans.forEach((sp, si) => {
    const dB = BRANCHES.find((b) => b.id === sp.dest)!;
    const date = addDays(NOW, -sp.age);
    const wagons = [{ wagonId: 'w1', count: si % 2 ? 3 : 4 }, { wagonId: 'w2', count: 2 }];
    const vps = wagons.flatMap((w) => Array.from({ length: w.count }, () => ({ wagonId: w.wagonId, vpNo: vpNo() })));
    const s: any = {
      id: 'sc' + (si + 1), rakeNo: `RK-${NOW.getFullYear()}-${next('rake')}`, title: `${ymd(date)} JL→${dB.short} ${['Parcel Rake', 'Express Parcel'][si % 2]}`, date: ymd(date), sourceId: 'JL', destId: sp.dest, fromBranchId: 'JL', toBranchId: sp.dest,
      isFinal: sp.state !== 'Planned', isCompleted: sp.state === 'Completed', status: sp.state, wagons, vps, plan: null, mrrr: null, src: null, dst: null, statusLog: [] as any[], dcwcSrc: null, dcwcDst: null, loads: [] as any[], createdAt: at(Math.max(sp.age, 0) + 6, 11), createdBy: 'Swapnil Patil',
    };
    if (sp.state !== 'Planned') {
      s.plan = { runAt: at(Math.max(sp.age, 0) + 3, 16), utilisation: R.int(82, 96), weightUtil: R.int(64, 88), reports: ['Loading Instruction', 'Loading Diagram', 'Loading Solution', 'Loading Summary'] };
      s.mrrr = { fromDate: ymd(addDays(date, -2)), toDate: ymd(date), rakeType: si % 3 ? 'Indent' : 'Lease', rows: vps.map((v, k) => ({ seq: k + 1, wagonId: v.wagonId, vpNo: v.vpNo, mrrrNo: `RR ${R.int(8100000, 8199999)}`, seal: `SR${R.int(10000, 99999)}`, railFreight: v.wagonId === 'w1' ? (sp.dest === 'GH' ? 142000 : 98000) : sp.dest === 'GH' ? 158000 : 112000 })) };
    }
    schedules.push(s);
  });

  // Rail LRs per schedule
  const railLRplan: [number, string, string, string, number][] = [
    // sched idx, consignor, consignee, goods, qty
    [0, 'c2', 'c9', 'g1', 260], [0, 'c2', 'c11', 'g3', 300], [0, 'c4', 'c9', 'g8', 420], [0, 'c6', 'c9', 'g9', 30],
    [1, 'c1', 'c10', 'g4', 700], [1, 'c3', 'c10', 'g6', 650], [1, 'c2', 'c10', 'g1', 240],
    [2, 'c2', 'c9', 'g1', 280], [2, 'c5', 'c9', 'g10', 1200], [2, 'c3', 'c11', 'g6', 500], [2, 'c4', 'c9', 'g8', 380],
    [3, 'c1', 'c10', 'g4', 700], [3, 'c3', 'c10', 'g7', 600], [3, 'c2', 'c10', 'g3', 320],
    [4, 'c5', 'c9', 'g10', 1200], [4, 'c2', 'c9', 'g1', 300], [4, 'c4', 'c11', 'g8', 360], [4, 'c6', 'c9', 'g9', 28],
    [5, 'c2', 'c9', 'g3', 350], [5, 'c3', 'c9', 'g6', 420],
  ];
  railLRplan.forEach(([si, cnor, cnee, g, qty], k) => {
    const s = schedules[si];
    const sp = schedPlans[si];
    const age = Math.max(sp.age + 3, 1);
    const srcCity = custCity(cnor);
    const freight = Math.round((qty * (railRate[g] || 200) * (s.destId === 'GH' ? 1.18 : 1)) / 100) * 100;
    const order = orderFor(cnor, 'JL', age, true) || orderFor(cnor, 'PN', age, true);
    const consigneeCity = custCity(cnee);
    let status = 'Delivered';
    if (sp.state === 'Planned') status = k % 2 ? 'Finalised' : 'In Transit';
    else if (sp.state === 'Loading') status = 'At Rail Head';
    else if (sp.state === 'In Transit') status = 'Rake In Transit';
    else if (sp.state === 'Unloading') status = ['Delivered', 'Out for Delivery', 'At Branch', 'Delivered'][k % 4];
    const fromB = srcCity === 'pune' ? 'PN' : srcCity === 'nashik' ? 'NS' : 'JL';
    const lr = mkLR({ fromBranchId: fromB, sourceCity: srcCity, destCity: consigneeCity, toBranchId: s.destId, toRailHead: 'JL', mode: fromB === 'JL' ? 'Railway' : 'Both', via: fromB === 'JL' ? 'None' : 'To HO', consignorId: cnor, consigneeId: cnee, goodsId: g, qty, age, placeDate: ymd(addDays(NOW, -age)), status, order, freight, vehicle: 'Own', scheduleId: s.id, godownId: 'gd1', billingUnit: 'Cartons' });
    if (order) takeOrder(order, qty);
    // road leg to rail head with own truck (trip)
    const truck = pickOwnTruck();
    if (status !== 'Finalised') {
      const t = startTrip({ ...lr, sourceCity: srcCity, destCity: 'jalgaon' }, truck, age, status !== 'In Transit');
      t.toCity = 'jalgaon'; t.description = `${lr.lrNo} feeder to Jalgaon rail head`; lr.tripId = t.id; lr.truckId = truck.id; lr.driverId = truck.driverId;
      lr.events.push({ at: at(age, 18), label: `Feeder dispatched to Jalgaon rail head – ${truck.number}`, by: lr.createdBy });
    }
    if (['In Transit', 'Finalised'].includes(status)) return;
    // GRN at rail head
    const grnAge = age - 1;
    const dmg = k % 5 === 2 ? 3 : 0;
    const totalFreight = Math.round(distKm(srcCity, 'jalgaon') * 46 / 100) * 100 + 2500;
    const det = k % 6 === 1 ? 1 : 0;
    const gross = totalFreight + det * 1200;
    const grn: any = {
      id: 'gr' + (grns.length + 1), grnNo: `GRN/JL/${next('grn')}`, lrId: lr.id, gateNo: R.int(1, 15), inDate: ymd(addDays(NOW, -grnAge)), inTime: '07:40', outDate: ymd(addDays(NOW, -grnAge)), outTime: '12:10', unloadingTime: '3h 10m',
      docs: { lrCopy: { ok: true, rmk: '' }, invoice: { ok: true, rmk: '' }, wayBill: { ok: true, rmk: 'E-way bill verified' }, seal: { ok: k % 7 !== 3, rmk: k % 7 === 3 ? 'Seal tampered – noted' : '' }, kata: { ok: true, rmk: '' } },
      totalFreight, freightPMT: Math.round(totalFreight / Math.max(1, lr.weight / 1000)), detentionDays: det, detentionAmt: det * 1200, gross, less: { advance: 0, tds: 0, damage: dmg * 600, hamali: 0, stationery: 0 }, net: gross - dmg * 600,
      damageBy: dmg ? 'Road' : 'No Damage', labourId: hamal('JL'), labourCount: R.int(4, 8), labourCharge: Math.round(qty * 2.4), supervisorId: sup('JL'), remark: dmg ? `${dmg} cartons damaged in transit` : 'Unloaded in godown bay ' + R.int(1, 6),
      items: [{ idx: 0, total: qty, received: qty - dmg, damage: dmg, pending: qty - dmg }], uploads: dmg ? [{ name: 'damage_photo_1.jpg', size: '1.2 MB' }] : [], branchId: 'JL', createdAt: at(grnAge, 12, 15), createdBy: 'Prashant Nemade', hamaliPaymentId: '',
    };
    grns.push(grn); lr.grnId = grn.id; lr.items[0].damage = dmg;
    lr.events.push({ at: grn.createdAt, label: `GRN ${grn.grnNo} at Jalgaon rail head`, by: grn.createdBy });
    if (sp.state === 'Loading') {
      // partial loading on first two LRs
      if (k % 4 < 2) {
        const vp = s.vps[k % s.vps.length];
        const loadQty = k % 4 === 0 ? grn.items[0].received : Math.round(grn.items[0].received * 0.55);
        s.loads.push({ id: 'ld' + R.int(1000, 9999) + k, vpNo: vp.vpNo, wagonId: vp.wagonId, gateNo: grn.gateNo, lrId: lr.id, items: [{ idx: 0, qty: loadQty, damage: 0 }], labourCharge: Math.round(loadQty * 1.8), labourId: hamal('JL'), supervisorId: sup('JL'), date: ymd(NOW), hamaliPaymentId: '', createdAt: iso(NOW) });
        grn.items[0].pending -= loadQty;
        if (grn.items[0].pending === 0) { lr.status = 'Loaded'; lr.events.push({ at: iso(NOW), label: `Loaded on VP ${vp.vpNo}`, by: 'Prashant Nemade' }); }
      }
      return;
    }
    // loaded fully onto VP
    const vp = s.vps[k % s.vps.length];
    const loadAge = sp.age + 1;
    s.loads.push({ id: 'ld' + (k + 1) + si, vpNo: vp.vpNo, wagonId: vp.wagonId, gateNo: grn.gateNo, lrId: lr.id, items: [{ idx: 0, qty: grn.items[0].received, damage: 0 }], labourCharge: Math.round(grn.items[0].received * 1.8), labourId: hamal('JL'), supervisorId: sup('JL'), date: ymd(addDays(NOW, -loadAge)), hamaliPaymentId: '', createdAt: at(loadAge, 15) });
    grn.items[0].pending = 0;
    lr.events.push({ at: at(loadAge, 15), label: `Loaded on VP ${vp.vpNo}`, by: 'Prashant Nemade' });
    lr.events.push({ at: at(sp.age, 21), label: `Rake ${s.rakeNo} dispatched from Jalgaon`, by: 'Swapnil Patil' });
    if (sp.state === 'In Transit') return;
    // DGRN at destination per VP (one per LR for simplicity)
    const dAge = sp.age - 4;
    const dg: any = {
      id: 'dg' + (dgrns.length + 1), dgrnNo: `DGRN/${s.destId}/${next('dgrn')}`, scheduleId: s.id, vpNo: vp.vpNo, wagonId: vp.wagonId, inDate: ymd(addDays(NOW, -dAge)), inTime: '06:30', outDate: ymd(addDays(NOW, -dAge)), outTime: '11:00',
      damageBy: 'No Damage', labourCount: R.int(4, 8), labourId: hamal(s.destId), labourCharge: Math.round(grn.items[0].received * 2.1), supervisorId: sup(s.destId), remark: 'Unloaded to transit warehouse',
      items: [{ lrId: lr.id, idx: 0, total: grn.items[0].received, received: grn.items[0].received, damage: 0, pending: 0 }], uploads: [], createdAt: at(dAge, 11, 30), createdBy: s.destId === 'GH' ? 'Bijoy Saikia' : 'Sourav Pal', hamaliPaymentId: '',
    };
    dgrns.push(dg);
    lr.events.push({ at: dg.createdAt, label: `DGRN ${dg.dgrnNo} at ${BRANCHES.find((b) => b.id === s.destId)!.name}`, by: dg.createdBy });
    if (status === 'At Branch') { dg.items[0].pending = dg.items[0].received; return; }
    // Delivery challan (LDC)
    const mt = mktFor(s.destId);
    const dcAge = dAge - 1;
    const dcFreight = Math.round(Math.max(6000, distKm(BRANCHES.find((b) => b.id === s.destId)!.city, lr.destCity) * 52) / 100) * 100;
    const dc: any = {
      id: 'dc' + (dcs.length + 1), dcNo: `DC/${s.destId}/${next('dc')}`, scheduleId: s.id, rakeNo: s.rakeNo, branchId: s.destId, sourceCity: BRANCHES.find((b) => b.id === s.destId)!.city, destCity: lr.destCity, deliveryAddress: lr.deliveryAt,
      selfDelivery: false, truckType: 'Market', tripId: '', transporterId: mt.transporterId, truckId: mt.id, capacity: mt.capacity, driverName: `${R.pick(NAMES.firstNames)} ${R.pick(['Das', 'Bora', 'Kalita', 'Mondal', 'Sarkar'])}`, mobile: '9' + R.int(100000000, 999999999),
      freight: dcFreight, advance: Math.round(dcFreight * 0.5 / 100) * 100, advancePaidBy: 'l3', paymentMode: 'Cash', loadingDate: ymd(addDays(NOW, -dcAge)), loadingTime: '14:00', email: true, supervisorId: sup(s.destId), remark: '',
      items: [{ lrId: lr.id, idx: 0, qty: dg.items[0].received, vpNo: vp.vpNo, dgrnId: dg.id }], weight: lr.weight, comments: [] as any[], ackSupervisor: null, ackCollection: null, ackClient: null, approval: null, payslipId: '', status: 'Open', connectedTo: '', createdAt: at(dcAge, 14), createdBy: dg.createdBy,
    };
    dcs.push(dc); lr.dcIds.push(dc.id);
    lr.events.push({ at: dc.createdAt, label: `Delivery challan ${dc.dcNo} – ${mt.number}`, by: dc.createdBy });
    if (status === 'Out for Delivery') return;
    // delivered
    const delAge = Math.max(0, dcAge - 1);
    lr.delivery = { date: ymd(addDays(NOW, -delAge)), time: '13:30', remark: 'Delivered to consignee warehouse', unloading: 0 };
    lr.events.push({ at: at(delAge, 13, 30), label: 'Delivered at consignee', by: dc.createdBy });
    dc.status = 'Delivered';
    dc.ackSupervisor = { deliveryDate: ymd(addDays(NOW, -delAge)), deliveryTime: '13:30', reportingDate: ymd(addDays(NOW, -delAge)), reportingTime: '09:00', detentionDays: 0, detentionAmt: 0, parking: 200, other: 0, supervisorId: dc.supervisorId, remark: 'OK', items: [{ lrId: lr.id, idx: 0, total: dc.items[0].qty, received: dc.items[0].qty, damage: 0, shortage: 0 }], at: at(delAge, 18) };
    if (sp.state === 'Completed' || k % 2 === 0) {
      dc.ackCollection = { collectionDate: ymd(addDays(NOW, -delAge + 1)), transporterId: dc.transporterId, deliveryDate: dc.ackSupervisor.deliveryDate, deliveryTime: '13:30', reportingDate: dc.ackSupervisor.reportingDate, reportingTime: '09:00', detentionDays: 0, detentionAmt: 0, damageAmt: 0, shortageAmt: 0, parking: 200, other: 0, labour: 300, paymentMode: 'Bank', scan: `LDC_${dc.dcNo.replace(/\//g, '')}.jpg`, remark: '', items: dc.ackSupervisor.items, at: at(Math.max(0, delAge - 1), 12) };
    }
    if (sp.state === 'Completed') {
      dc.ackClient = { reportingDate: dc.ackSupervisor.reportingDate, reportingTime: '09:00', unloadingDate: dc.ackSupervisor.deliveryDate, unloadingTime: '13:30', detentionDays: 0, detentionAmt: 0, damageAmt: 0, shortageAmt: 0, complaint: '', suggestion: '', items: dc.ackSupervisor.items, at: at(delAge - 2, 12) };
      const payable = dc.freight - dc.advance + 200 + 300;
      dc.approval = { transporterId: dc.transporterId, freight: dc.freight, advance: dc.advance, shortage: 0, damage: 0, parking: 200, detAmt: 0, detDays: 0, other: 0, labour: 300, payable, mode: 'Bank', by: 'Meena Chaudhari', at: at(delAge - 3, 15) };
      dc.status = 'Approved';
      const rd = addDays(NOW, -(delAge - 2));
      lr.ack = { receivedDate: ymd(rd), receivedTime: '11:00', docket: `DTDC-${R.int(10000000, 99999999)}`, courier: 'DTDC', courierCharge: 90, detentionDays: 0, detentionAmt: 0, damageAmt: 0, remark: 'Client acknowledged LDC', items: [{ idx: 0, total: lr.items[0].qty, received: lr.items[0].qty - lr.items[0].damage, damage: lr.items[0].damage }], uploads: [{ name: `POD_${lr.lrNo.replace(/\//g, '')}.pdf`, size: '388 KB' }], by: 'Kavita Joshi', at: iso(rd) };
      lr.events.push({ at: iso(rd), label: 'POD / acknowledgment received', by: 'Kavita Joshi' });
    } else if (k % 2 === 0) {
      dc.ackClient = { reportingDate: dc.ackSupervisor.reportingDate, reportingTime: '09:00', unloadingDate: dc.ackSupervisor.deliveryDate, unloadingTime: '13:30', detentionDays: 0, detentionAmt: 0, damageAmt: 0, shortageAmt: 0, complaint: '', suggestion: 'Please share vehicle details 1 day in advance', items: dc.ackSupervisor.items, at: at(Math.max(0, delAge - 1), 12) };
    }
  });

  // schedule events
  schedules.forEach((s, si) => {
    const sp = schedPlans[si];
    if (['Planned', 'Loading'].includes(sp.state)) {
      if (sp.state === 'Loading') s.src = { arrival: '', dispatch: '', place1: at(0, 6), removal1: '', place2: '', removal2: '' };
      return;
    }
    const d = sp.age;
    s.src = { arrival: at(d + 1, 22), dispatch: at(d, 21), place1: at(d + 1, 6), removal1: at(d, 19), place2: '', removal2: '' };
    s.dcwcSrc = { dcPerHr: 1800, hours: 4, amount: 7200, letterDate: ymd(addDays(NOW, -d + 1)), paidBy: 'l1', mode: 'Bank', waiver: { on: si === 0, sentDate: si === 0 ? ymd(addDays(NOW, -d + 2)) : '', approved: si === 0, receivedDate: si === 0 ? ymd(addDays(NOW, -d + 10)) : '', per: si === 0 ? 50 : 0, amount: si === 0 ? 3600 : 0 }, dcwlReceivedDate: '', wc: { amount: si === 1 ? 2400 : 0, paidBy: 'l1', mode: 'Bank' }, wf: { amount: 0, paidBy: '', mode: '' } };
    s.statusLog = [
      { at: at(d, 22), remark: 'Rake departed Jalgaon. Path via Bhusawal–Nagpur–Raipur', email: true, by: 'Swapnil Patil' },
      { at: at(d - 1, 14), remark: s.destId === 'GH' ? 'Crossed Bilaspur Jn. Running on time' : 'Crossed Raipur. Running 2h late', email: true, by: 'Swapnil Patil' },
    ];
    if (sp.state === 'In Transit') { s.statusLog.push({ at: at(Math.max(0, d - 2), 9), remark: s.destId === 'KL' ? 'At Tatanagar yard, expected Shalimar tonight' : 'Crossed New Jalpaiguri', email: false, by: 'Swapnil Patil' }); s.progress = 0.68; return; }
    s.statusLog.push({ at: at(d - 3, 8), remark: s.destId === 'GH' ? 'Crossed New Jalpaiguri; expected Amingaon tomorrow' : 'Arrived Shalimar yard', email: true, by: 'Swapnil Patil' });
    s.dst = { arrival: at(d - 4, 4), dispatch: at(d - 4, 20), place1: at(d - 4, 6), removal1: at(d - 4, 13), place2: at(d - 4, 14), removal2: at(d - 4, 19), reach: at(d - 4, 4), unload: at(d - 4, 18) };
    s.dcwcDst = { dcPerHr: 1500, hours: 2, amount: 3000, letterDate: ymd(addDays(NOW, -d + 4)), paidBy: 'l3', mode: 'Bank', waiver: { on: false, sentDate: '', approved: false, receivedDate: '', per: 0, amount: 0 }, dcwlReceivedDate: '', wc: { amount: 1800, paidBy: 'l3', mode: 'Cash' }, wf: { amount: 0, paidBy: '', mode: '' } };
    if (sp.state === 'Completed') { s.isCompleted = true; s.status = 'Completed'; } else s.status = 'Unloading';
  });

  // ---------------- Billing ----------------
  const billable = lrs.filter((l) => l.status === 'Delivered' && l.paymentMode === 'To Be Billed' && (l.ack || CUSTOMERS.find((c) => c.id === l.consignorId)!.billWithoutAck) && Date.parse(l.delivery?.date || '') < +addDays(NOW, -6));
  const byClient: Record<string, any[]> = {};
  billable.forEach((l) => (byClient[l.consignorId] ||= []).push(l));
  Object.entries(byClient).forEach(([cid, list]) => {
    list.sort((a, b) => a.placeDate.localeCompare(b.placeDate));
    for (let i = 0; i < list.length; i += 3) {
      const chunk = list.slice(i, i + 3);
      if (cid === 'c3' && i >= 3) continue; // leave some pending billing
      const lastDel = chunk.map((l) => l.delivery.date).sort().pop();
      const billDate = addDays(lastDel, R.int(3, 6));
      if (+billDate > +NOW) continue;
      const cust = CUSTOMERS.find((c) => c.id === cid)!;
      const intra = cityById[cust.city].state === 'Maharashtra';
      const rows = chunk.map((l) => {
        const dtnWH = l.ack?.detentionAmt || 0, unload = l.delivery?.unloading || 0, damage = l.ack?.damageAmt || 0;
        const add = dtnWH + unload, sub = damage;
        return { lrId: l.id, freight: l.freight, deliveryDate: l.delivery.date, dtnWH, dtnDB: 0, toll: 0, unload, multi: 0, incentive: 0, adjAdd: 0, latePenalty: 0, damage, adjSub: 0, add, sub, net: l.freight + add - sub };
      });
      const taxable = sum(rows, (r) => r.net);
      const tax = Math.round(taxable * 0.05);
      const b: any = {
        id: 'bl' + (bills.length + 1), billNo: `SKT/B/${next('bill')}/26-27`, billHead: 'Consignor', transportType: chunk.some((l) => l.mode !== 'Road') ? 'Road+Rail' : 'Road', clientId: cid, thirdPartyId: '', date: ymd(billDate),
        rows, totalFreight: sum(rows, (r) => r.freight), add: sum(rows, (r) => r.add), sub: sum(rows, (r) => r.sub), taxable, supplyState: cityById[cust.city].state, cgst: intra ? 2.5 : 0, sgst: intra ? 2.5 : 0, igst: intra ? 0 : 5,
        tax, net: taxable + tax, pending: taxable + tax, remark: '', format: cust.billFormat, deleted: false, createdAt: iso(billDate), createdBy: 'Meena Chaudhari', supplementary: [] as any[],
      };
      bills.push(b);
      chunk.forEach((l) => { l.billId = b.id; l.events.push({ at: b.createdAt, label: `Billed on ${b.billNo}`, by: 'Meena Chaudhari' }); });
      ledgerAdd({ voucherNo: `SV/${b.billNo.split('/')[2]}`, date: b.date, voucherType: 'Sales', party: 'Client', clientId: cid, ledgerName: cust.name, particular: `Freight bill ${b.billNo}`, debit: b.net, credit: 0, refType: 'Bill', refNo: b.billNo, branchId: 'JL', by: 'Meena Chaudhari' });
      // payments
      const age = (Date.now() - +billDate) / 864e5;
      const payFull = age > cust.creditDays * 0.8 && cid !== 'c14';
      const payPart = !payFull && age > 12 && R.chance(0.5) && cid !== 'c14';
      if (payFull || payPart) {
        const tds = Math.round(taxable * (cust.tds / 100));
        const recvd = payFull ? b.net - tds : Math.round((b.net - tds) * 0.5);
        const pd = addDays(billDate, Math.min(Math.round(age) - 1, payFull ? R.int(cust.creditDays - 10, cust.creditDays + 5) : 10));
        const cp = { id: 'cp' + (clientPayments.length + 1), voucherNo: `RV/${next('rv')}`, billId: b.id, clientId: cid, netAmt: b.net, received: recvd, tds: payFull ? tds : 0, damage: 0, rateDiff: 0, date: ymd(pd), paidBy: 'l1', mode: R.pick(['Bank', 'Cheque']), bank: R.pick(['HDFC Bank', 'ICICI Bank', 'SBI']), chequeNo: `${R.int(100000, 999999)}`, chequeDate: ymd(pd), remark: payFull ? 'Full settlement' : 'Part payment', createdAt: iso(pd), by: 'Meena Chaudhari' };
        clientPayments.push(cp);
        b.pending = Math.max(0, b.net - recvd - cp.tds);
        ledgerAdd({ voucherNo: cp.voucherNo, date: cp.date, voucherType: 'Bank Receipt', party: 'Client', clientId: cid, ledgerName: cust.name, particular: `Receipt against ${b.billNo}`, debit: 0, credit: recvd + cp.tds, refType: 'Receipt', refNo: b.billNo, branchId: 'JL', by: 'Meena Chaudhari' });
      }
    }
  });

  // ---------------- Transporter payment slips (market LRs) ----------------
  const mktLRs = lrs.filter((l) => l.vehicle === 'Market' && l.status === 'Delivered' && l.ack);
  const byTrans: Record<string, any[]> = {};
  mktLRs.forEach((l) => (byTrans[l.transporterId] ||= []).push(l));
  Object.entries(byTrans).forEach(([tid, list], ti) => {
    const rows = list.map((l) => ({ lrId: l.id, freight: l.mkt.freight, detention: l.ack?.detentionAmt || 0, advance: l.mkt.advance, hamali: l.mkt.hamali, commission: l.mkt.commission, tds: l.mkt.tds, damage: l.ack?.damageAmt || 0, stationery: 50, balance: 0 }));
    rows.forEach((r) => (r.balance = r.freight + r.detention + r.hamali - r.advance - r.commission - r.tds - r.damage - r.stationery));
    const date = addDays(NOW, -R.int(2, 14));
    const payable = sum(rows, (r) => r.balance);
    const status = ti % 3 === 0 ? 'Pending' : 'Approved';
    const paid = status === 'Approved' && ti % 2 === 1 ? payable : 0;
    const s: any = { id: 'ts' + (tpSlips.length + 1), slipNo: `TPS/${next('tps')}`, transporterId: tid, date: ymd(date), rows, totals: { freight: sum(rows, (r) => r.freight), detention: sum(rows, (r) => r.detention), advance: sum(rows, (r) => r.advance), hamali: sum(rows, (r) => r.hamali), commission: sum(rows, (r) => r.commission), tds: sum(rows, (r) => r.tds), damage: sum(rows, (r) => r.damage), stationery: sum(rows, (r) => r.stationery) }, payable, status, approvedBy: status === 'Approved' ? 'Prakash Wagh' : '', approvedAt: status === 'Approved' ? iso(addDays(date, 1)) : '', pending: payable - paid, payments: paid ? [{ id: 'tpp1' + ti, date: ymd(addDays(date, 2)), amount: paid, tds: 0, mode: 'Bank', paidBy: 'l2', bank: 'HDFC Bank', ref: `NEFT${R.int(1000000, 9999999)}`, remark: '', voucherNo: `PV/${next('pv')}` }] : [], createdAt: iso(date), createdBy: 'Meena Chaudhari' };
    tpSlips.push(s);
    list.forEach((l) => (l.tpSlipId = s.id));
    if (paid) ledgerAdd({ voucherNo: s.payments[0].voucherNo, date: s.payments[0].date, voucherType: 'Bank Payment', party: 'Transporter', transporterId: tid, ledgerName: TRANSPORTERS.find((t) => t.id === tid)!.name, particular: `Payment slip ${s.slipNo}`, debit: paid, credit: 0, refType: 'Transporter Payment', refNo: s.slipNo, branchId: 'JL', by: 'Meena Chaudhari' });
  });

  // ---------------- DC payslips ----------------
  const approvedDCs = dcs.filter((d) => d.approval);
  const byDT: Record<string, any[]> = {};
  approvedDCs.forEach((d) => (byDT[d.transporterId] ||= []).push(d));
  Object.entries(byDT).forEach(([tid, list], i) => {
    const total = sum(list, (d) => d.approval.payable);
    const tdsAmt = Math.round(total * 0.01);
    const date = addDays(NOW, -R.int(4, 12));
    const paid = i === 0 ? total - tdsAmt : 0;
    const ps: any = { id: 'dps' + (i + 1), no: `DCPS/${next('dcps')}`, transporterId: tid, dcIds: list.map((d) => d.id), total, tdsAmt, net: total - tdsAmt, pending: total - tdsAmt - paid, date: ymd(date), remark: '', payments: paid ? [{ id: 'dpp' + i, date: ymd(addDays(date, 3)), amount: paid, mode: 'Bank', paidBy: 'l3', remark: 'NEFT', voucherNo: `PV/${next('pv')}` }] : [], createdAt: iso(date), by: 'Meena Chaudhari' };
    dcPayslips.push(ps);
    list.forEach((d) => { d.payslipId = ps.id; d.status = paid ? 'Paid' : 'Payslip Generated'; });
    if (paid) ledgerAdd({ voucherNo: ps.payments[0].voucherNo, date: ps.payments[0].date, voucherType: 'Bank Payment', party: 'Transporter', transporterId: tid, ledgerName: TRANSPORTERS.find((t) => t.id === tid)!.name, particular: `DC payslip ${ps.no}`, debit: paid, credit: 0, refType: 'DC Payment', refNo: ps.no, branchId: 'GH', by: 'Meena Chaudhari' });
  });

  // ---------------- Hamali payments ----------------
  const oldGrns = grns.filter((g) => Date.parse(g.createdAt) < +addDays(NOW, -15));
  const byLab: Record<string, any[]> = {};
  oldGrns.forEach((g) => (byLab[g.labourId] ||= []).push(g));
  Object.entries(byLab).forEach(([lab, list]) => {
    const total = sum(list, (g) => g.labourCharge);
    const tdsPer = 1, tdsAmt = Math.round(total * 0.01);
    const hp = { id: 'hp' + (hamaliPayments.length + 1), no: `HP/${next('ham')}`, type: 'GRN', labourId: lab, refIds: list.map((g) => g.id), total, tdsPer, tdsAmt, net: total - tdsAmt, date: ymd(addDays(NOW, -R.int(5, 12))), paidBy: 'l4', mode: 'Cash', by: 'Meena Chaudhari' };
    hamaliPayments.push(hp); list.forEach((g) => (g.hamaliPaymentId = hp.id));
    ledgerAdd({ voucherNo: `CP/${hp.no.split('/')[1]}`, date: hp.date, voucherType: 'Cash Payment', party: 'Other', ledgerName: labours.find((l) => l.id === lab)!.name, particular: `Hamali – GRN station unloading (${list.length} GRN)`, debit: hp.net, credit: 0, refType: 'Hamali', refNo: hp.no, branchId: 'JL', by: 'Meena Chaudhari' });
  });

  // ---------------- Log slips ----------------
  const completedTrips = trips.filter((t) => t.completed && Date.parse(t.endDate) < +addDays(NOW, -8));
  const byTruck: Record<string, any[]> = {};
  completedTrips.forEach((t) => (byTruck[t.truckId] ||= []).push(t));
  Object.entries(byTruck).forEach(([tid, list], i) => {
    if (i % 4 === 3) return; // leave some pending
    list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    const truck = trucks.find((t) => t.id === tid)!;
    const ls: any = { id: 'ls' + (logslips.length + 1), no: `LS/${next('ls')}`, truckId: tid, driverId: truck.driverId, tripIds: list.map((t) => t.id), openingKm: list[0].openingKm, closingKm: list[list.length - 1].closingKm, startDate: list[0].startDate, endDate: list[list.length - 1].endDate, prevDieselQty: R.int(20, 80), dieselRate: 90.48, remark: '', date: ymd(addDays(list[list.length - 1].endDate, 1)), time: '17:00', isOpen: false, createdAt: iso(addDays(list[list.length - 1].endDate, 1)), by: 'Rahul Bendale' };
    logslips.push(ls); list.forEach((t) => (t.logslipId = ls.id));
    const diesel = sum(tripExpenses.filter((e) => ls.tripIds.includes(e.tripId) && e.typeId === 'e1'), (e) => e.amount);
    ledgerAdd({ voucherNo: `JV/${next('jv')}`, date: ls.date, voucherType: 'Logslip', party: 'Other', ledgerName: 'Diesel Expenses', particular: `Log slip ${ls.no} – ${truck.number}`, debit: diesel, credit: 0, refType: 'Logslip', refNo: ls.no, branchId: 'JL', by: 'Rahul Bendale' });
  });

  // misc journal & bank entries
  [['Office rent – Jalgaon HO', 'Cash Payment', 65000, 0, 18], ['Bank charges', 'Journal', 1180, 0, 9], ['Telephone & internet', 'Bank Payment', 8400, 0, 12], ['Cash withdrawn for branch', 'Bank Payment', 50000, 0, 6], ['Interest received FD', 'Bank Receipt', 0, 14200, 4]].forEach(([p, vt, dr, cr, a]: any) =>
    ledgerAdd({ voucherNo: `${vt === 'Journal' ? 'JV' : vt.includes('Receipt') ? 'RV' : 'PV'}/${next(vt === 'Journal' ? 'jv' : 'pv')}`, date: ymd(addDays(NOW, -a)), voucherType: vt, party: 'Other', ledgerName: vt === 'Journal' ? 'Bank Charges' : 'State Bank of India – CA 30412', particular: p, debit: dr, credit: cr, refType: 'Ledger Entry', refNo: '', branchId: 'JL', by: 'Meena Chaudhari', ledgerId: 'l1' }));

  // ---------------- Fleet: misc ----------------
  const monthlyExpenses = Array.from({ length: 16 }, (_, i) => ({ id: 'mx' + (i + 1), date: ymd(addDays(NOW, -R.int(1, 40))), truckId: R.pick(ownTrucks).id, typeId: R.pick(['e7', 'e10', 'e6', 'e8']), amount: R.pick([1200, 2400, 3500, 5600, 8200, 12500]), person: R.pick(['Rahul Bendale', 'Driver', 'Javed Shaikh']), description: R.pick(['Puncture repair at Dhule', 'RTO challan – overload', 'Radiator top-up & hose', 'Night parking Nagpur', 'Spring U-bolt replacement on road']) }));
  const accidents = [
    { id: 'ac1', no: `ACC/${next('acc')}`, date: ymd(addDays(NOW, -48)), truckId: ownTrucks[6].id, driverId: ownTrucks[6].driverId, location: 'aurangabad', partLoss: 85000, partLossDesc: 'Front bumper, cabin left side, windshield', humanLoss: 0, humanLossDesc: 'No injuries', otherLoss: 12000, otherLossDesc: '6 cartons damaged', reason: 'Skidded on wet road near Ajanta ghat', responsible: 'Road condition', totalLoss: 97000, remark: 'Insurance claim filed – OG-25-1801' },
    { id: 'ac2', no: `ACC/${next('acc')}`, date: ymd(addDays(NOW, -19)), truckId: ownTrucks[12].id, driverId: ownTrucks[12].driverId, location: 'nagpur', partLoss: 22000, partLossDesc: 'Rear light assembly, tail board', humanLoss: 0, humanLossDesc: '', otherLoss: 0, otherLossDesc: '', reason: 'Hit from behind at toll plaza', responsible: 'Third party', totalLoss: 22000, remark: 'FIR lodged, recovery from third party' },
    { id: 'ac3', no: `ACC/${next('acc')}`, date: ymd(addDays(NOW, -4)), truckId: ownTrucks[3].id, driverId: ownTrucks[3].driverId, location: 'dhule', partLoss: 6500, partLossDesc: 'Side mirror & indicator', humanLoss: 0, humanLossDesc: '', otherLoss: 0, otherLossDesc: '', reason: 'Brushed against bus while overtaking', responsible: 'Driver', totalLoss: 6500, remark: 'Deduct 50% from driver bhatta' },
  ];
  const couriers = Array.from({ length: 14 }, (_, i) => { const from = R.pick(['GH', 'KL', 'MB', 'PN', 'PY']); const sent = addDays(NOW, -R.int(1, 30)); const recv = i % 4 !== 0; return { id: 'cr' + (i + 1), fromBranchId: from, toBranchId: 'JL', sentDate: ymd(sent), sentTime: '16:00', docket: `${R.pick(['DTDC', 'PRO'])}${R.int(10000000, 99999999)}`, courierName: R.pick(['DTDC', 'The Professional Couriers', 'Shree Tirupati Courier', 'Blue Dart']), charges: R.pick([60, 90, 120, 180]), particular: R.pick(['LR acknowledgments (PODs)', 'LDC copies & collection slips', 'Original bills for submission', 'Cheques from clients']), remark: '', received: recv, receivedDate: recv ? ymd(addDays(sent, R.int(2, 4))) : '', receivedTime: recv ? '12:30' : '', receivedBy: recv ? 'Pooja Nemade' : '' }; });

  // ---------------- Workshop ----------------
  const spares = [...SPARES, ...SERVICES];
  const pos: any[] = [], inwards: any[] = [], stock: any[] = [], jobcards: any[] = [], checklists: any[] = [], replacements: any[] = [], serviceBills: any[] = [];
  const poPlans = [
    ['su1', 34, 'Inwarded', [['sp2', 20], ['sp3', 10], ['sp4', 12], ['sp10', 10]]], ['su2', 28, 'Inwarded', [['sp7', 12], ['sp8', 12]]], ['su3', 20, 'Inwarded', [['sp1', 210], ['sp12', 40], ['sp13', 60]]],
    ['su4', 14, 'Inwarded', [['sp9', 4]]], ['su1', 6, 'Approved', [['sp5', 6], ['sp11', 6], ['sp16', 8]]], ['su2', 2, 'Pending Approval', [['sp7', 8], ['sp8', 8]]], ['su1', 1, 'Pending Approval', [['sp6', 2], ['sp15', 2]]],
  ];
  poPlans.forEach(([sid, age, status, items]: any, i) => {
    const its = items.map(([sp, q]: any) => ({ spareId: sp, qty: q, rate: spares.find((s) => s.id === sp)!.rate }));
    const po: any = { id: 'po' + (i + 1), no: `PO/${next('po')}`, supplierId: sid, date: ymd(addDays(NOW, -age)), items: its, net: sum(its, (x: any) => x.qty * x.rate), remark: '', status, approvedBy: status !== 'Pending Approval' ? 'Prakash Wagh' : '', createdAt: at(age, 11), by: 'Javed Shaikh' };
    pos.push(po);
    if (status === 'Inwarded') {
      const inw: any = { id: 'in' + (inwards.length + 1), no: `INW/${next('inw')}`, poId: po.id, supplierId: sid, billNo: `${R.int(1000, 9999)}`, billDate: ymd(addDays(NOW, -age + 3)), items: its.map((x: any) => ({ ...x, batch: `B${R.int(1000, 9999)}`, warranty: ['sp7', 'sp9'].includes(x.spareId), wExp: ymd(addDays(NOW, 300)), guarantee: false, gExp: '' })), net: po.net, discount: Math.round(po.net * 0.02), payable: 0, pending: 0, remark: '', isReplacement: false, createdAt: at(age - 3, 15), by: 'Javed Shaikh', payments: [] as any[] };
      inw.payable = inw.net - inw.discount; inw.pending = inw.payable;
      if (i < 2) { inw.payments.push({ id: 'ip' + i, date: ymd(addDays(NOW, -age + 15)), amount: inw.payable - Math.round(inw.payable * 0.01), tds: Math.round(inw.payable * 0.01), discount: 0, mode: 'Bank', paidBy: 'l2', remark: '' }); inw.pending = 0; }
      inwards.push(inw);
      inw.items.forEach((x: any) => stock.push({ id: 'sk' + (stock.length + 1), spareId: x.spareId, inwardId: inw.id, batch: x.batch, qty: x.qty, rate: x.rate, isNew: true }));
    }
  });
  stock.push({ id: 'sk' + (stock.length + 1), spareId: 'sp7', inwardId: '', batch: 'RET-02', qty: 3, rate: 6200, isNew: false });
  const consume = (spareId: string, qty: number) => { const lot = stock.find((s) => s.spareId === spareId && s.qty >= qty); if (lot) lot.qty -= qty; return lot; };
  const jcPlans = [
    [ownTrucks[2], 22, 'Finalised', [['sp1', 14], ['sp2', 1], ['sp3', 1]], [['su6', 'sv1', 1]]], [ownTrucks[8], 18, 'Finalised', [['sp7', 2], ['sp8', 2]], [['su2', 'sv2', 2]]],
    [ownTrucks[5], 12, 'Finalised', [['sp9', 1], ['sp14', 0]], [['su5', 'sv3', 1]]], [ownTrucks[14], 8, 'Approved', [['sp1', 12], ['sp4', 1]], [['su5', 'sv6', 1]]],
    [ownTrucks[6], 5, 'Approved', [['sp12', 3]], [['su7', 'sv4', 1], ['su7', 'sv5', 1]]], [ownTrucks[17], 2, 'Pending Approval', [['sp1', 14], ['sp2', 1], ['sp10', 1]], []],
    [ownTrucks[19], 1, 'Pending Approval', [['sp5', 1], ['sp16', 2]], [['su5', 'sv7', 1]]], [ownTrucks[20], 0, 'Draft', [['sp13', 5]], []],
  ];
  jcPlans.forEach(([truck, age, status, parts, svcs]: any, i) => {
    const pr = parts.filter(([, q]: any) => q > 0).map(([sp, q]: any) => { const lot = status === 'Finalised' ? consume(sp, q) : stock.find((s) => s.spareId === sp); return { spareId: sp, stockId: lot?.id || '', batch: lot?.batch || '', qty: q, rate: lot?.rate || spares.find((s) => s.id === sp)!.rate, mechanicId: R.pick(mechanics).id, description: '', disposal: spares.find((s) => s.id === sp)!.recyclable ? R.pick(['Recycle', 'Scrap']) : '' }; });
    const sv = svcs.map(([su, s, q]: any) => ({ supplierId: su, spareId: s, qty: q, rate: spares.find((x) => x.id === s)!.rate, mechanicId: R.pick(mechanics).id, description: '', serviceBillId: '' }));
    const net = sum(pr, (x: any) => x.qty * x.rate) + sum(sv, (x: any) => x.qty * x.rate);
    const jc: any = { id: 'jc' + (i + 1), no: `JC/${next('jc')}`, truckId: truck.id, driverId: truck.driverId, truckStatus: i % 3 === 2 ? 'In Transit' : 'At Jalgaon', inDate: ymd(addDays(NOW, -age)), inTime: '09:30', outDate: ['Finalised'].includes(status) ? ymd(addDays(NOW, -age + 1)) : '', outTime: status === 'Finalised' ? '18:00' : '', openingKm: truck.odometer - R.int(100, 3000), parts: pr, services: sv, net, status, approvedBy: ['Approved', 'Finalised'].includes(status) ? 'Prakash Wagh' : '', finalisedBy: status === 'Finalised' ? 'Javed Shaikh' : '', remark: R.pick(['Periodic 20,000 km service', 'Tyre change – rear axle', 'Battery not holding charge', 'Brake noise reported by driver', 'Accident repair (ACC/13)']), createdAt: at(age, 10), by: 'Javed Shaikh' };
    jobcards.push(jc);
  });
  // service bills for finalised job card services
  const sbGroups: Record<string, any[]> = {};
  jobcards.filter((j) => j.status === 'Finalised').forEach((j) => j.services.forEach((s: any, si: number) => (sbGroups[s.supplierId] ||= []).push({ jcId: j.id, si, amt: s.qty * s.rate })));
  Object.entries(sbGroups).forEach(([su, list], i) => {
    const total = sum(list, (x) => x.amt), disc = Math.round(total * 0.03);
    const sb: any = { id: 'sb' + (i + 1), no: `SB/${next('sb')}`, supplierId: su, billNo: `${R.int(100, 999)}`, billDate: ymd(addDays(NOW, -R.int(3, 10))), items: list.map((x) => ({ jobCardId: x.jcId, serviceIdx: x.si })), total, discount: disc, net: total - disc, pending: total - disc, remark: '', payments: [] as any[], createdAt: iso(addDays(NOW, -3)), by: 'Javed Shaikh' };
    if (i === 0) { sb.payments.push({ id: 'sp' + i, date: ymd(addDays(NOW, -1)), amount: sb.net, tds: 0, discount: 0, mode: 'Cash', paidBy: 'l4', remark: '' }); sb.pending = 0; }
    serviceBills.push(sb);
    list.forEach((x) => (jobcards.find((j) => j.id === x.jcId).services[x.si].serviceBillId = sb.id));
  });
  [[ownTrucks[17], 2], [ownTrucks[2], 22], [ownTrucks[14], 8], [ownTrucks[19], 1]].forEach(([t, age]: any, i) => {
    checklists.push({ id: 'ck' + (i + 1), no: `TMC/${next('chk')}`, truckId: t.id, driverId: t.driverId, openingKm: t.odometer - 500, date: ymd(addDays(NOW, -age)), jobCardNo: jobcards.find((j) => j.truckId === t.id)?.no || '', items: CHECKLIST_PARTICULARS.map((p, k) => ({ particular: p, ok: (k + i) % 6 !== 0, status: (k + i) % 6 === 0 ? R.pick(['Worn out', 'Low', 'Not working', 'Loose']) : 'OK', action: (k + i) % 6 === 0 ? R.pick(['Replace', 'Top-up', 'Repair', 'Tighten']) : '', remark: '' })), preparedBy: 'Sudam Marathe', checkedBy: 'Javed Shaikh', authorisedBy: 'Prakash Wagh', createdAt: at(age, 9) });
  });
  replacements.push({ id: 'rp1', no: `RPL/${next('rep')}`, supplierId: 'su2', date: ymd(addDays(NOW, -9)), payable: false, items: [{ inwardId: inwards[1]?.id, spareId: 'sp8', batch: inwards[1]?.items[1]?.batch, qty: 2 }], remark: 'Tubes leaking at valve – warranty replacement', status: 'Sent', inward: null, createdAt: at(9, 12), by: 'Javed Shaikh' });
  replacements.push({ id: 'rp2', no: `RPL/${next('rep')}`, supplierId: 'su4', date: ymd(addDays(NOW, -25)), payable: false, items: [{ inwardId: inwards[3]?.id, spareId: 'sp9', batch: inwards[3]?.items[0]?.batch, qty: 1 }], remark: 'Battery dead cell under warranty', status: 'Received', inward: { billNo: 'RPL-0042', billDate: ymd(addDays(NOW, -18)), qty: 1, rate: 0, batch: 'B7781' }, createdAt: at(25, 12), by: 'Javed Shaikh' });

  // ---------------- Customers / contracts ----------------
  const rateContracts = [
    { id: 'rc1', customerId: 'c2', from: ymd(addDays(NOW, -200)), to: ymd(addDays(NOW, 165)), remark: 'FY 26-27 annual contract', routes: [['jalgaon', 'mumbai', 'g1', 'u7', 'Road', 21500, 2], ['jalgaon', 'pune', 'g3', 'u7', 'Road', 19800, 2], ['jalgaon', 'guwahati', 'g1', 'u2', 'Railway', 485, 7], ['jalgaon', 'guwahati', 'g3', 'u2', 'Railway', 390, 7], ['jalgaon', 'kolkata', 'g1', 'u2', 'Railway', 410, 5]] },
    { id: 'rc2', customerId: 'c1', from: ymd(addDays(NOW, -120)), to: ymd(addDays(NOW, 245)), remark: '', routes: [['pune', 'hyderabad', 'g3', 'u7', 'Road', 36500, 3], ['pune', 'bengaluru', 'g3', 'u7', 'Road', 41000, 3], ['pune', 'chennai', 'g3', 'u7', 'Road', 52000, 4], ['pune', 'kolkata', 'g4', 'u2', 'Both', 185, 6]] },
    { id: 'rc3', customerId: 'c3', from: ymd(addDays(NOW, -60)), to: ymd(addDays(NOW, 20)), remark: 'Renewal due – revised diesel escalation clause', routes: [['pune', 'bengaluru', 'g6', 'u7', 'Road', 42000, 3], ['pune', 'hyderabad', 'g6', 'u7', 'Road', 37000, 3], ['pune', 'delhi', 'g6', 'u7', 'Road', 78000, 5], ['pune', 'kolkata', 'g6', 'u2', 'Both', 165, 6]] },
    { id: 'rc4', customerId: 'c5', from: ymd(addDays(NOW, -90)), to: ymd(addDays(NOW, 275)), remark: 'Perishable – priority loading', routes: [['jalgaon', 'guwahati', 'g10', 'u2', 'Railway', 74, 6], ['jalgaon', 'delhi', 'g10', 'u7', 'Road', 64000, 3]] },
    { id: 'rc5', customerId: 'c4', from: ymd(addDays(NOW, -30)), to: ymd(addDays(NOW, 335)), remark: '', routes: [['nashik', 'delhi', 'g8', 'u7', 'Road', 71000, 4], ['nashik', 'ahmedabad', 'g8', 'u7', 'Road', 28500, 2]] },
  ].map((rc) => ({ ...rc, routes: rc.routes.map(([s, d, g, u, mode, rate, days]: any, i) => ({ id: rc.id + 'r' + i, source: s, dest: d, goodsId: g, unitId: u, mode, rate, stdDays: days, truckCapacity: u === 'u7' ? '32 HQ' : '', slabs: u === 'u3' ? [{ from: 0, to: 9, rate }, { from: 9, to: 20, rate: rate * 0.9 }] : [] })), history: [] as any[] }));
  const ownRates = [{ id: 'ov1', customerId: 'c2', from: ymd(addDays(NOW, -200)), to: ymd(addDays(NOW, 165)), remark: 'Own vehicle dedicated fleet', routes: [{ id: 'ov1a', source: 'jalgaon', dest: 'mumbai', truckType: 'High Cube', tyres: 10, rate: 23500 }, { id: 'ov1b', source: 'jalgaon', dest: 'pune', truckType: 'Both', tyres: 12, rate: 21800 }, { id: 'ov1c', source: 'jalgaon', dest: 'nashik', truckType: 'Low Cube', tyres: 10, rate: 12500 }] }];
  const transRates = [['jalgaon', 'mumbai', 'Market', 18500], ['jalgaon', 'mumbai', 'Union', 19500], ['jalgaon', 'pune', 'Market', 17000], ['pune', 'hyderabad', 'Market', 31000], ['pune', 'bengaluru', 'Market', 35500], ['pune', 'chennai', 'Market', 44500], ['guwahati', 'shillong', 'Market', 9500], ['guwahati', 'agartala', 'Market', 26000], ['kolkata', 'patna', 'Market', 24500], ['kolkata', 'siliguri', 'Market', 21000], ['nashik', 'delhi', 'Market', 61000], ['jalgaon', 'indore', 'Union', 16500]].map(([s, d, t, r]: any, i) => ({ id: 'trm' + i, source: s, dest: d, truckType: t, rate: r }));
  const railFreight = [['w1', 'jalgaon', 'guwahati', 142000], ['w2', 'jalgaon', 'guwahati', 158000], ['w1', 'jalgaon', 'kolkata', 98000], ['w2', 'jalgaon', 'kolkata', 112000], ['w3', 'jalgaon', 'guwahati', 214000], ['w4', 'jalgaon', 'guwahati', 176000]].map(([w, s, d, r]: any, i) => ({ id: 'rf' + i, wagonId: w, source: s, dest: d, rate: r }));
  const agreements = [
    { id: 'ag1', company: 'skt', clientId: 'c2', city: 'jalgaon', agreementDate: ymd(addDays(NOW, -210)), start: ymd(addDays(NOW, -200)), expiry: ymd(addDays(NOW, 165)), rateType: 'Per Truck', rate: 21500, rateInclTax: false, detentionRate: 1500, branchId: 'JL', committedTrips: 60, applyRateIfNotAchieved: true, carryingCapacity: '9 MT', approvedBy: 'Prakash Wagh' },
    { id: 'ag2', company: 'skt', clientId: 'c1', city: 'pune', agreementDate: ymd(addDays(NOW, -130)), start: ymd(addDays(NOW, -120)), expiry: ymd(addDays(NOW, 245)), rateType: 'Per Truck', rate: 36500, rateInclTax: false, detentionRate: 1800, branchId: 'PN', committedTrips: 40, applyRateIfNotAchieved: false, carryingCapacity: '16 MT', approvedBy: 'Prakash Wagh' },
    { id: 'ag3', company: 'skt', clientId: 'c3', city: 'pune', agreementDate: ymd(addDays(NOW, -70)), start: ymd(addDays(NOW, -60)), expiry: ymd(addDays(NOW, 20)), rateType: 'Per Truck', rate: 42000, rateInclTax: false, detentionRate: 2000, branchId: 'PN', committedTrips: 30, applyRateIfNotAchieved: true, carryingCapacity: '32 HQ', approvedBy: 'Prakash Wagh' },
    { id: 'ag4', company: 'skt', clientId: 'c5', city: 'jalgaon', agreementDate: ymd(addDays(NOW, -95)), start: ymd(addDays(NOW, -90)), expiry: ymd(addDays(NOW, 275)), rateType: 'Per Carton', rate: 74, rateInclTax: false, detentionRate: 0, branchId: 'JL', committedTrips: 0, applyRateIfNotAchieved: false, carryingCapacity: '', approvedBy: 'Prakash Wagh' },
    { id: 'ag5', company: 'skt', clientId: 'c4', city: 'nashik', agreementDate: ymd(addDays(NOW, -35)), start: ymd(addDays(NOW, -30)), expiry: ymd(addDays(NOW, 335)), rateType: 'Per Truck', rate: 71000, rateInclTax: true, detentionRate: 1500, branchId: 'NS', committedTrips: 24, applyRateIfNotAchieved: false, carryingCapacity: '32 HQ', approvedBy: 'Prakash Wagh' },
  ];
  const hamaliRates = [['g1', 'c2', 'JL', 'u2', 4.5, 'GRN Station'], ['g1', 'c2', 'GH', 'u2', 5, 'Branch GRN'], ['g3', 'c2', 'JL', 'u2', 4, 'GRN Station'], ['g10', 'c5', 'JL', 'u2', 1.6, 'VP Loading'], ['g6', 'c3', 'JL', 'u2', 2.2, 'VP Loading'], ['g8', 'c4', 'JL', 'u2', 2, 'GRN Station'], ['g9', 'c6', 'JL', 'u1', 12, 'GRN Station'], ['g4', 'c1', 'KL', 'u2', 2.5, 'Branch GRN']].map(([g, c, b, u, r, use]: any, i) => ({ id: 'hr' + i, goodsId: g, clientId: c, branchId: b, unitId: u, rate: r, use }));
  const documents = [['ISO 9001:2015 Certificate', 'Certificate', 'docs/iso-9001.pdf'], ['GST Registration – Maharashtra', 'Statutory', 'docs/gst-27.pdf'], ['Company PAN Card', 'Statutory', 'docs/pan.pdf'], ['Transport Operator Licence', 'Licence', 'docs/tol.pdf'], ['Goods-in-transit Insurance Policy', 'Insurance', 'docs/git-policy.pdf'], ['Standard Rate Card 26-27', 'Commercial', 'docs/ratecard.xlsx'], ['Railway Parcel Lease Agreement', 'Contract', 'docs/rail-lease.pdf'], ['Driver Code of Conduct', 'HR Policy', 'docs/driver-coc.pdf']].map(([n, t, p], i) => ({ id: 'doc' + i, name: n, type: t, path: p, remarks: '', updated: ymd(addDays(NOW, -R.int(5, 300))) }));
  const complaintCategories = ['Delay in delivery', 'Damage / shortage', 'Billing discrepancy', 'POD not received', 'Driver behaviour', 'Other'].map((n, i) => ({ id: 'cc' + i, name: n }));
  const complaints = [
    ['cc0', 'c9', 'High', 'Consignment SKT/JL/10446 not received even after 9 days. Please share current location.', 6, 'In Progress'], ['cc1', 'c11', 'High', '6 washing machine cartons received in damaged condition – photos attached.', 18, 'Resolved'],
    ['cc2', 'c3', 'Medium', 'Bill SKT/B/183 shows detention charge which was not agreed.', 11, 'Pending'], ['cc3', 'c1', 'Low', 'POD copies for September not received for reconciliation.', 4, 'Pending'],
    ['cc4', 'c10', 'Medium', 'Driver refused to unload at dock without extra payment.', 2, 'Pending'], ['cc0', 'c12', 'Medium', 'Delay in Pondicherry → Chennai shipment.', 24, 'Resolved'],
  ].map(([cat, cust, pri, detail, age, status]: any, i) => ({ id: 'cm' + i, ticketNo: `TKT-${next('ticket')}`, categoryId: cat, customerId: cust, priority: pri, detail, date: at(age, 11), status, closed: status === 'Resolved', closedBy: status === 'Resolved' ? 'Kavita Joshi' : '', attachment: i === 1 ? 'damage_photos.zip' : '', replies: status !== 'Pending' ? [{ by: 'Kavita Joshi', msg: status === 'Resolved' ? 'Issue resolved. Credit note processed / shipment delivered. Closing ticket.' : 'Checking with Guwahati branch; will update in 2 hours.', date: at(age - 1, 12) }] : [] }));
  const announcements = [
    { id: 'an1', title: 'Diwali dispatch cut-off', description: 'Last rake booking for Guwahati before Diwali closes on 25 Oct. Plan GRNs accordingly.', expiry: ymd(addDays(NOW, 18)), viewers: 'All', targets: [], createdAt: at(2, 10), by: 'Prakash Wagh' },
    { id: 'an2', title: 'New GRN document checklist', description: 'Kata receipt is now mandatory for every GRN at rail head. Do not release freight without it.', expiry: ymd(addDays(NOW, 40)), viewers: 'Branch', targets: ['JL', 'GH', 'KL'], createdAt: at(8, 10), by: 'Swapnil Patil' },
    { id: 'an3', title: 'Month-end Tally sync', description: 'All payment entries for September must be posted by 5 Oct for Tally export.', expiry: ymd(addDays(NOW, -2)), viewers: 'Roles', targets: ['r5'], createdAt: at(12, 10), by: 'Meena Chaudhari' },
  ];
  const custAnnouncements = [
    { id: 'ca1', title: 'Festive season rake schedule', description: 'Additional parcel rakes Jalgaon → Guwahati every Tuesday & Friday till 15 Nov.', start: ymd(addDays(NOW, -3)), end: ymd(addDays(NOW, 39)), viewers: 'All', targets: [] },
    { id: 'ca2', title: 'Live tracking on customer portal', description: 'Track LRs and download PODs from the customer portal.', start: ymd(addDays(NOW, -20)), end: ymd(addDays(NOW, 60)), viewers: 'Select Customers', targets: ['c1', 'c2', 'c3'] },
  ];

  const pumpHistory = PUMPS.flatMap((p) => [0, 15, 30, 45].map((a, i) => ({ id: p.id + 'h' + i, pumpId: p.id, rate: round2(p.dieselRate - i * 0.18), date: ymd(addDays(NOW, -a)) })));

  // ---------------- Activity feed ----------------
  const activity: any[] = [];
  lrs.forEach((l) => l.events.forEach((e: any) => activity.push({ id: 'ev' + activity.length, at: e.at, by: e.by, text: `${e.label}`, ref: l.lrNo, refType: 'lr', refId: l.id, module: 'Operations' })));
  orders.forEach((o) => o.events.forEach((e: any) => activity.push({ id: 'ev' + activity.length, at: e.at, by: e.by, text: e.label, ref: o.orderNo, refType: 'order', refId: o.id, module: 'Operations' })));
  bills.forEach((b) => activity.push({ id: 'ev' + activity.length, at: b.createdAt, by: b.createdBy, text: `Bill generated – ${b.rows.length} LR`, ref: b.billNo, refType: 'bill', refId: b.id, module: 'Finance' }));
  clientPayments.forEach((p) => activity.push({ id: 'ev' + activity.length, at: p.createdAt, by: p.by, text: `Payment received ₹${p.received.toLocaleString('en-IN')}`, ref: p.voucherNo, refType: 'bill', refId: p.billId, module: 'Finance' }));
  jobcards.forEach((j) => activity.push({ id: 'ev' + activity.length, at: j.createdAt, by: j.by, text: `Job card opened – ${j.remark}`, ref: j.no, refType: 'jobcard', refId: j.id, module: 'Workshop' }));
  activity.sort((a, b) => b.at.localeCompare(a.at));

  const notifications = [
    { id: 'n1', at: at(0, 9), title: '3 orders awaiting confirmation', body: 'Customer orders from Satpuda, Voyager and Purvanchal need review.', link: 'ops/order-confirmation', read: false, tone: 'warn' },
    { id: 'n2', at: at(0, 8), title: 'Rake RK-' + NOW.getFullYear() + '-117 unloading at Amingaon', body: 'DGRN completed for 4 VPs. Create LDCs for pending stock.', link: 'ops/dc', read: false, tone: 'info' },
    { id: 'n3', at: at(1, 17), title: 'Insurance expiring', body: `${trucks[2].number} insurance due in 9 days.`, link: 'fleet/trucks', read: false, tone: 'bad' },
    { id: 'n4', at: at(1, 12), title: '2 job cards pending approval', body: 'Estimated ₹' + sum(jobcards.filter((j) => j.status === 'Pending Approval'), (j) => j.net).toLocaleString('en-IN'), link: 'ws/jobcard-approval', read: true, tone: 'warn' },
    { id: 'n5', at: at(2, 15), title: 'Narmada Steel Tubes – credit hold', body: 'Outstanding beyond 60 days. New LR booking disallowed.', link: 'cust/360', read: true, tone: 'bad' },
  ];

  return {
    version: SEED_VERSION, seededAt: iso(NOW),
    company: COMPANY, companiesList: [{ ...COMPANY }], branches: BRANCHES, cities: CITIES, states: STATES, countries: COUNTRIES, godowns: GODOWNS, units: UNITS, goods: GOODS, wagons: WAGONS,
    customers: CUSTOMERS, transporters: TRANSPORTERS, trucks, drivers, pumps: PUMPS, pumpHistory, ledgers: LEDGERS, expenseTypes: EXPENSE_TYPES, labours, departments, designations, employees,
    roles, users: usersM, containers: [{ id: 'ct1', name: '20 ft Dry', description: 'ISO 20 GP', height: 239, width: 235, length: 590, weight: 2200 }, { id: 'ct2', name: '40 ft High Cube', description: 'ISO 40 HC', height: 269, width: 235, length: 1203, weight: 3900 }],
    spareCategories: SPARE_CATEGORIES, spares, suppliers: SUPPLIERS, checklistParticulars: CHECKLIST_PARTICULARS,
    orders, lrs, grns, schedules, dgrns, dcs, bills, clientPayments, tpSlips, dcPayslips, hamaliPayments, ledger, trips, tripExpenses, logslips, monthlyExpenses, accidents, couriers,
    pos, inwards, stock, jobcards, checklists, replacements, serviceBills, inventoryPayments: [],
    rateContracts, ownRates, transRates, railFreight, agreements, hamaliRates, documents, complaintCategories, complaints, announcements, custAnnouncements,
    tallyBatches: [{ id: 'tb1', at: at(8, 18), from: ymd(addDays(NOW, -40)), to: ymd(addDays(NOW, -8)), types: ['Sale', 'Bank Receipt', 'Bank Payment', 'Journal', 'Logslip', 'Cash Payment'], mode: 'Create', count: ledger.filter((l) => l.tally).length, by: 'Meena Chaudhari' }],
    activity, notifications, counters, deletedLog: [] as any[],
  };
}
export type DB = ReturnType<typeof buildSeed>;
