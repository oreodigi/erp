// Training Academy content – Road Fleet (module 'fleet').
// Every rule below is taken from src/features/fleet.tsx, src/features/journeys.tsx, src/lib/journeys.ts,
// src/components/RecordDrawer.tsx (truck / trip / LR dispatch drawers) and the store actions they call
// (A.saveTrip, A.completeTrip, A.addExpense, A.generateLogslip, A.dispatchLR, A.save, A.remove, A.openLogslip).
import type { ScreenTraining, Question, Exercise, Workflow, Lesson, CheckResult } from '../types';
import { created, before, pass, notYet } from '../check';

// ---------------- small read-only helpers for checkers ----------------
const list = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);
const isDieselType = (db: any, typeId: string) => {
  const t = list(db, 'expenseTypes').find((x) => x.id === typeId);
  return !!t && /dies|disel/i.test(String(t.name || ''));
};
const typeName = (db: any, typeId: string) => list(db, 'expenseTypes').find((x) => x.id === typeId)?.name || 'Expense';
const tripOf = (db: any, id: string) => list(db, 'trips').find((t) => t.id === id);
const tripName = (db: any, id: string) => tripOf(db, id)?.name || 'trip';
const truckNo = (db: any, id: string) => list(db, 'trucks').find((t) => t.id === id)?.number || 'truck';
const cityName = (db: any, id: string) => list(db, 'cities').find((c) => c.id === id)?.name || id || '—';
const rs = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const km = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('en-IN')} km`;

/** Trips that were running when the exercise started and are completed now. */
const closedNow = (db: any, base: any) =>
  list(db, 'trips').filter((t) => {
    const b = before(base, 'trips', t.id);
    return !!b && b.completed === false && t.completed === true;
  });

const dieselEntries = (db: any, base: any) => created(db, base, 'tripExpenses', (e) => isDieselType(db, e.typeId) && !!e.tripId);

function checkDiesel(db: any, base: any, onlyTrips?: string[]): CheckResult {
  const all = dieselEntries(db, base).filter((e) => !onlyTrips || onlyTrips.includes(e.tripId));
  if (!all.length) {
    const other = created(db, base, 'tripExpenses');
    return notYet(other.length ? `You saved ${typeName(db, other[0].typeId)}, not Diesel. Change Expense type to Diesel.` : 'No diesel entry saved yet');
  }
  const good = all.find((e) => e.pumpId && Number(e.qty) > 0 && Number(e.rate) > 0 && Number(e.amount) > 0);
  if (!good) return notYet(`Diesel saved for ${tripName(db, all[0].tripId)} without a pump or litres. Select the pump and enter Qty (L).`);
  const pump = list(db, 'pumps').find((p) => p.id === good.pumpId);
  return pass(`${good.qty} L × ₹${good.rate} = ${rs(good.amount)} diesel at ${pump?.name || 'pump'} for ${tripName(db, good.tripId)} (${truckNo(db, good.truckId)})`);
}

// ---------------- screens ----------------
export const screens: ScreenTraining[] = [
  {
    id: 'fleet/trucks',
    module: 'fleet',
    title: 'Fleet (our trucks)',
    purpose: 'The truck master for own and market trucks, with live status (Available, On Trip, Workshop), current lane, odometer and paper (compliance) dates.',
    why: 'Before you send a truck you must know it is free, its papers are valid and who drives it. Operations, Smart Load Planning and the trip screens all read the truck record from here.',
    when: 'At the start of the day to see free trucks, before starting a trip, when papers are renewed, and when a new truck joins or a driver changes.',
    roles: ['CO', 'OP', 'AD', 'SA'],
    upstream: [],
    downstream: ['fleet/trips', 'ws/jobcards', 'ws/checklist', 'ops/smart-load', 'fleet/journeys'],
    before: 'The truck is bought or a market truck is hired, and its RC, insurance, fitness, permits and tax papers are available.',
    after: 'An Available own truck can be sent on a trip (Start trip) or to the workshop (Open job card). Market trucks are used on LRs and Delivery Challans, not on Road Fleet trips.',
    prerequisites: ['Drivers are created in Drivers (fleet/drivers) so they can be assigned to own trucks.', 'Transporters exist in Masters for market trucks.'],
    actions: [
      'Add truck: Truck no. and Ownership (Own / Market) are required.',
      'For an Own truck pick the Assigned driver; for a Market truck pick the Transporter and Market / Union type.',
      'Enter insurance, fitness, goods permit (GP), national permit (NP) and tax due dates.',
      'Enter Load planning size (loading length, width, height in cm, max payload kg) used by Smart Load Planning.',
      'Enter Standard average (km/l) – log slips and journeys compare real diesel use with it.',
      'Row actions: Open 360, Edit, Start trip (own and Available only), Open job card (own only), Delete.',
    ],
    records: ['trucks'],
    validations: [
      'Save is refused with "Required: Truck no." when the truck number is empty (Ownership is required too but defaults to Own).',
      'Start trip is offered only for an Own truck whose status is Available.',
      'Delete asks for confirmation; trips and LRs keep their history.',
    ],
    mistakes: [
      'Leaving due dates blank: a blank date never turns red, so an expired paper is not flagged.',
      'Leaving Standard average empty: log slip and journey km/l comparisons have nothing to compare with.',
      'Not filling Load planning sizes: Smart Load Planning falls back to a default 32 ft container size, so the 3D plan may not match the real truck.',
      'Deleting a truck that still has a running trip – the delete is allowed, but the trip loses its truck number on screens.',
    ],
    warnings: ['Status is calculated, not typed: Workshop if a job card is Draft, Pending Approval or Approved with no out date; else On Trip if any trip is not completed; else Available.'],
    shortcuts: ['KPI "In workshop" opens Job Cards (ws/jobcards).', 'KPI "Compliance alerts" opens the Trucks monitoring tab.', 'Quick filters: Own, Market, Compliance alerts.'],
    fields: [
      { name: 'Ownership', help: 'Own = SK Translines truck, runs trips in Road Fleet. Market = hired truck of a transporter, used on LRs/DCs only.' },
      { name: 'Assigned driver', help: 'Own trucks only. Filled automatically as the driver when you start a trip.' },
      { name: 'Current odometer (km)', help: 'Becomes the Opening KM of the next trip. Trip close raises it to the closing km.' },
      { name: 'Standard average (km/l)', help: 'Expected km per litre. Log slip shows Average in red when the real average is below it.' },
      { name: 'Loading length / width / height, Max payload', help: 'Inside load space used by Smart Load Planning (ops/smart-load).' },
      { name: 'Insurance / Fitness / GP / NP / Tax due date', help: 'Drive the Compliance column: Expired when past, Expiring within 15 days.' },
    ],
    statuses: [
      { status: 'Available', meaning: 'Own truck with no running trip and no open job card. Can start a trip.' },
      { status: 'On Trip', meaning: 'A trip of this truck is not yet closed in Trip Completion.' },
      { status: 'Workshop', meaning: 'A job card is Draft, Pending Approval or Approved and has no out date. This wins over On Trip.' },
      { status: 'Valid / Expiring / Expired', meaning: 'Compliance: worst of insurance, fitness, NP, GP and tax. Expiring = due within 15 days.' },
    ],
    example: 'MH19 BM 1834 shows Compliance "Expiring" because insurance is due in 9 days. The fleet in-charge renews it, edits the truck, enters the new Insurance due date and the alert clears.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Own trucks, On trip, Available, In workshop and Compliance alerts give the day at a glance. Click In workshop to jump to Job Cards.' },
      { title: 'Check papers', body: 'Open the Trucks monitoring tab. Red dates are expired, amber dates are due within 15 days. Click a row to open the truck.' },
      { title: 'Use the Status board', body: 'Three columns – Available, On Trip, Workshop – show each own truck with its lane and driver.' },
      { title: 'Act on a truck', body: 'Use the row menu: Start trip for a free own truck, Open job card to send it to the workshop, or Edit to update papers.' },
      { title: 'Keep the master correct', body: 'When adding a truck fill ownership, driver, papers, standard average and load space so the other screens work.' },
    ],
    related: ['fleet/drivers', 'fleet/trips', 'ws/jobcards', 'ws/checklist', 'ops/smart-load', 'fleet/journeys'],
    audio: [
      'यह Fleet screen है — अपने और market के सारे trucks यहाँ हैं।',
      'Status अपने आप बनता है: job card खुला हो तो Workshop, trip चल रही हो तो On Trip, वरना Available।',
      'Trucks monitoring tab में insurance, fitness, permit और tax की dates दिखती हैं। लाल मतलब expire हो गया, पीला मतलब पंद्रह दिन के अंदर due।',
      'Paper renew होते ही truck edit करके नई due date डालिए, तभी alert हटेगा।',
      'Standard average और loading size ज़रूर भरिए — log slip और Smart Load Planning इन्हीं से चलते हैं।',
    ],
    quiz: ['q.fleet.papers-due', 'q.fleet.truck-status-workshop', 'q.fleet.start-trip-unavailable'],
    minutes: 6,
  },
  {
    id: 'fleet/journeys',
    module: 'fleet',
    title: 'Truck journeys',
    purpose: 'Shows, for every own truck, where it went in a period, which km were loaded or empty, the freight it earned, diesel and trip costs, monthly costs, profit and idle days.',
    why: 'Trucks lose money on empty running and idle days. This screen shows which trucks and which lanes need a return load or attention.',
    when: 'Weekly or monthly fleet review, before planning return loads, and when a truck looks unprofitable.',
    roles: ['CO', 'AD', 'SA', 'OP'],
    upstream: ['fleet/trips', 'fleet/fuel', 'fleet/trip-completion', 'fleet/expenses'],
    downstream: ['ops/orders', 'fleet/trucks'],
    before: 'Trips are started, diesel and trip expenses are booked, and trips are closed with real closing km.',
    after: 'Use the empty lanes to find back-loads, and open problem trucks to see their trip timeline.',
    prerequisites: ['Trips must be closed in Trip Completion – a running trip counts 0 km until it is closed.', 'Return or positioning trips must be started with "Empty run" ticked, or they count as loaded trips with no freight.'],
    actions: [
      'Pick a period: Last 30 days, Last 90 days (default), This year (FY) or All.',
      'Search by truck number or driver name.',
      'Sort by Trip profit, Net profit, ₹ per km, Empty km %, Idle days or Km run (highest first).',
      'Click a truck to open its journey: KPIs, km per week chart (loaded vs empty, last 12 weeks) and a timeline of trips, newest first.',
      'In the timeline open the LR or Trip details of any trip.',
    ],
    records: ['trips', 'tripExpenses', 'monthlyExpenses', 'lrs', 'trucks'],
    validations: ['Read-only screen – nothing is saved here.'],
    mistakes: [
      'Not ticking "Empty run" on a return trip: it is counted as a loaded trip with ₹0 freight and the empty-lane list misses it.',
      'Leaving trips open: open trips show "On the way" with no km, so km and km/l look too low.',
      'Booking diesel without litres: km/l cannot be calculated.',
    ],
    warnings: [
      'Km comes from closing km minus opening km. If that is missing, zero or 4,000 km or more, road distance is used and the trip shows "(est.)".',
      'A single monthly cost head above ₹1 lakh is treated as a typing mistake in old data and left out of Net profit.',
    ],
    fields: [
      { name: 'Empty', help: 'Km run on trips marked Empty run (going to pick up or coming back without load).' },
      { name: 'Freight', help: 'Onward freight of the trip, or the LR freight if onward freight is blank. Empty trips earn ₹0.' },
      { name: 'Trip profit', help: 'Freight minus diesel and trip expenses (toll, bhatta, hamali and others).' },
      { name: 'Monthly costs', help: 'EMI, tax, permit, insurance, fitness and salary for the days in the period, plus Monthly Expenses entries of the truck.' },
      { name: 'Net profit / Net ₹ per km', help: 'Trip profit minus monthly costs; per km divides it by km run.' },
      { name: 'Idle', help: 'Days in the period on which the truck had no trip.' },
    ],
    statuses: [
      { status: 'On the way', meaning: 'Trip not yet closed (blue dot).' },
      { status: 'Loaded', meaning: 'Trip not marked Empty run; its freight counts.' },
      { status: 'Empty', meaning: 'Trip marked Empty run; it appears in "Lanes we run empty".' },
      { status: 'Stood N days at <city>', meaning: 'Gap of 2 or more days between two trips of the truck.' },
    ],
    example: 'Sorting by Empty km % shows MH19 CY 1200 at 42 % empty. Its timeline shows every Hyderabad trip returns empty, and "Lanes we run empty" lists Hyderabad → Pune. Sales is asked to find a Hyderabad back-load.',
    walkthrough: [
      { title: 'Choose the period', body: 'Use the period buttons at the top right. The KPIs and the table recalculate.' },
      { title: 'Read the fleet totals', body: 'Trucks that ran, Km run with % empty (amber above 30 %), Freight, Trip profit and Net after monthly costs.' },
      { title: 'Find problem trucks', body: 'Sort by Net profit, Empty km % or Idle days. Red profit means loss; amber idle means idle on more than 40 % of days.' },
      { title: 'Check empty lanes', body: 'The "Lanes we run empty" card lists the lanes with the most empty km. A return load there pays the trip twice.' },
      { title: 'Open a truck', body: 'Click the row. Read the weekly loaded/empty chart and the timeline; open the LR or trip for details.' },
    ],
    related: ['fleet/trips', 'fleet/fuel', 'fleet/expenses', 'fleet/trucks'],
    audio: [
      'यहाँ दिखता है कि हमारा हर truck कहाँ गया, भरा हुआ या खाली, और उसने पैसा कमाया या नहीं।',
      'Trip profit मतलब freight में से diesel और trip के ख़र्चे घटाकर। Net profit में EMI, tax, insurance जैसे monthly ख़र्चे भी घटते हैं।',
      'Empty km % से sort कीजिए — जो truck ज़्यादा खाली चलता है, उसके लिए return load ढूँढना है।',
      'खाली वापसी वाली trip शुरू करते समय Empty run tick करना ज़रूरी है, वरना यहाँ हिसाब ग़लत दिखेगा।',
      'चलती trip का km, trip close होने के बाद ही जुड़ता है।',
    ],
    quiz: ['q.fleet.empty-km', 'q.fleet.trip-vs-net-profit'],
    minutes: 6,
  },
  {
    id: 'fleet/trips',
    module: 'fleet',
    title: 'Trips',
    purpose: 'Register of own-truck trips for client LRs and rake delivery challans: truck, driver, route, opening km, onward freight and trip advance.',
    why: 'Every rupee of diesel, toll and advance and every km of an own truck is booked against a trip. Without a trip nothing can be settled in a log slip.',
    when: 'When an own truck leaves. Trips for own-truck LRs open automatically on LR dispatch; start a trip here for other runs (rake DC work, positioning, empty return).',
    roles: ['CO', 'OP'],
    upstream: ['fleet/trucks', 'fleet/drivers', 'ops/lr', 'ops/smart-load'],
    downstream: ['fleet/fuel', 'fleet/trip-completion', 'fleet/logslips', 'fleet/journeys'],
    before: 'An own truck is Available and a driver is free. For client loads the LR is finalised (and the Smart Load Plan confirmed when one exists).',
    after: 'Add diesel and expenses on the way (fleet/fuel), close the trip with closing km (fleet/trip-completion), then include it in a log slip.',
    prerequisites: ['Own truck with status Available.', 'Driver not on leave and not blacklisted.'],
    actions: [
      'Start trip: choose Trip for (Client (LR) or Rake (DC)), client or rake date, truck, driver, from and to city, start date and time.',
      'Opening KM fills from the truck odometer; check it against the meter.',
      'Tick Empty run when the truck goes without load.',
      'Enter Onward freight, Advance (default ₹10,000), Payment type (Cash / Bank / Card) and Paid by.',
      'Row actions: View, Edit (until the trip is in a log slip), Print trip advance, Diesel slip, Complete trip (running trips).',
    ],
    records: ['trips'],
    validations: [
      'Save trip is refused with "Select truck and destination" when the truck or To city is empty.',
      'The truck list shows only own trucks that are Available (plus the trip’s own truck when editing).',
      'The driver list hides drivers who are on leave or blacklisted.',
      'Edit is hidden once the trip is in a log slip.',
      'Trip name is auto-numbered TRP/<next> when left blank.',
    ],
    mistakes: [
      'Starting a manual trip for an own-truck LR that will be dispatched – dispatch opens its own trip, so the truck gets two trips.',
      'Accepting a wrong Opening KM: the log slip km and average are calculated from it.',
      'Forgetting Empty run on a return trip – journeys show it as a loaded trip with no freight.',
      'Picking a driver whose licence has expired – the screen does not check licence expiry; check Drivers first.',
    ],
    warnings: ['Saving a trip does not post the advance to the ledger. Print the trip advance slip for the cash or bank voucher.'],
    shortcuts: ['KPI "Awaiting log slip" opens Log Slips.', 'Quick filters: Running, Completed, No log slip.', 'Fleet → row menu "Start trip" opens this form with the truck already selected.'],
    fields: [
      { name: 'Trip for', help: 'Client (LR) – pick the client. Rake (DC) – pick the rake date for rail delivery work.' },
      { name: 'Opening KM', help: 'Odometer at start. Closing km must be higher when the trip is closed.' },
      { name: 'Empty run', help: 'Tick for trips without load. Freight is not counted for empty trips in Truck journeys.' },
      { name: 'Onward freight (₹)', help: 'Freight the trip earns. LR dispatch fills it from the LR freight.' },
      { name: 'Advance (₹)', help: 'Cash/bank given to the driver for the trip. Running-trip advances add up in "Advances out".' },
    ],
    statuses: [
      { status: 'On Trip', meaning: 'Trip started and not yet closed. The truck shows On Trip.' },
      { status: 'Completed', meaning: 'Closed in Trip Completion (or automatically when a feeder trip’s GRN is made at the rail head). Ready for log slip.' },
    ],
    example: 'LR SKT/JL/10431 for Jalgaon → Pune is dispatched on own truck MH19 CX 1517. Road Fleet opens TRP/2287 with opening km from the odometer, onward freight = LR freight and advance ₹10,000. The controller prints the trip advance slip.',
    walkthrough: [
      { title: 'Check running trips', body: 'KPIs show Running trips, Completed (30 days), Advances out and Awaiting log slip.' },
      { title: 'Start a trip', body: 'Click Start trip. Pick the truck from the Available list; driver and opening km fill in.' },
      { title: 'Set route and money', body: 'Choose To city (the form shows one-way km and estimated diesel at standard average), then onward freight and advance.' },
      { title: 'Print the advance', body: 'Use Print trip advance from the row menu and hand it to the driver with the money.' },
      { title: 'Follow the trip', body: 'Open the trip (View) to see expenses; use Add expense and Complete trip from the drawer.' },
    ],
    related: ['fleet/trip-completion', 'fleet/fuel', 'fleet/logslips', 'ops/lr'],
    practice: 'ex.fleet.trip-cycle',
    audio: [
      'यह Trips screen है — हमारे truck की हर trip यहाँ है।',
      'Own truck पर LR dispatch होते ही trip अपने आप खुल जाती है। बाकी कामों के लिए यहाँ Start trip दबाइए।',
      'सिर्फ़ Available trucks दिखते हैं, और छुट्टी या blacklist वाले driver नहीं दिखते।',
      'Opening km meter से मिलाइए, और खाली गाड़ी जा रही हो तो Empty run tick कीजिए।',
      'Advance देने के बाद trip advance slip print कीजिए।',
    ],
    quiz: ['q.fleet.dispatch-opens-trip', 'q.fleet.driver-leave', 'q.fleet.market-truck-no-trip'],
    minutes: 7,
  },
  {
    id: 'fleet/logslips',
    module: 'fleet',
    title: 'Log slips',
    purpose: 'Consolidates all completed trips of one truck that are not yet in a log slip: total km, diesel used, average against standard, expenses. Submitting posts the diesel journal for Tally.',
    why: 'The log slip is the diesel settlement for a truck. It shows excess diesel, locks the trips and creates the accounting entry.',
    when: 'When a truck has completed trips waiting (Trips KPI "Awaiting log slip"), usually after it returns to base.',
    roles: ['CO', 'AD'],
    upstream: ['fleet/trip-completion', 'fleet/fuel'],
    downstream: ['fin/ledger', 'fin/tally', 'fleet/journeys'],
    before: 'All trips of the truck are closed with closing km, and all diesel and trip expenses are booked.',
    after: 'The trips are locked (no Edit, no new expenses). A Logslip journal (debit Diesel Expenses) appears in the ledger for transfer to Tally.',
    prerequisites: ['At least one completed trip of the truck without a log slip.', 'Diesel entries booked with litres in Fuel & Trip Expenses.'],
    actions: [
      'Pick the truck – only trucks with completed trips waiting are listed, with the trip count.',
      'Enter Previous diesel qty (L), Diesel rate (₹/L), date, time and remark.',
      'Check the trip table (opening, closing, km, diesel litres) and the Performance card.',
      'Preview, then Submit. The log slip number LS/<next> is created and the print opens.',
      'Print any earlier log slip from the list below.',
    ],
    records: ['logslips', 'trips', 'ledger'],
    validations: [
      'Preview and Submit are disabled until the selected truck has completed trips.',
      'Running trips are never included – only completed trips without a log slip.',
      'All waiting completed trips of the truck are included together; you cannot pick some of them.',
    ],
    mistakes: [
      'Submitting before the last trip is closed: that trip is left out and must go into a later log slip.',
      'Submitting before all diesel bills are entered: after submit the trips are no longer offered in Fuel & Trip Expenses.',
      'Wrong opening or closing km on a trip: total km = last closing km − first opening km, so the average is wrong.',
    ],
    warnings: [
      'To correct a submitted log slip an administrator must reopen it in Data Corrections (admin/corrections → Open log slip). This releases the trips but does not reverse the journal already posted – tell Accounts.',
      'Previous diesel qty is recorded on the log slip but is not used in the average or excess diesel figures.',
    ],
    fields: [
      { name: 'Total km', help: 'Closing km of the last trip minus opening km of the first trip.' },
      { name: 'Diesel', help: 'Litres of all diesel entries of the included trips.' },
      { name: 'Average', help: 'Total km ÷ diesel litres. Red when below the truck’s standard average.' },
      { name: 'Excess diesel', help: 'Diesel litres minus (km ÷ standard average), never below 0.' },
      { name: 'Expenses', help: 'All trip expenses (diesel and others) of the included trips.' },
    ],
    statuses: [
      { status: 'Closed', meaning: 'Normal state after Submit – trips locked, journal posted.' },
      { status: 'Open', meaning: 'Reopened by an administrator; its trips are released for correction.' },
    ],
    example: 'MH19 CY 1200 has 2 completed trips: 1,912 km and 520 L diesel. Average 3.68 km/l is red against standard 3.97 km/l; excess diesel 38 L. The controller submits LS/163 and discusses the excess with the driver.',
    walkthrough: [
      { title: 'Pick the truck', body: 'The list shows only trucks with completed trips waiting, e.g. "MH19 CX 1517 (2 trips)".' },
      { title: 'Check the trips', body: 'Each row shows route, opening, closing, km and diesel litres. A missing trip is still running – close it first.' },
      { title: 'Read the performance', body: 'Average in red means more diesel than standard. Excess diesel shows the litres to explain.' },
      { title: 'Submit', body: 'Click Submit. LS number is created, trips are locked, the diesel journal is posted and the print opens.' },
    ],
    related: ['fleet/trip-completion', 'fleet/fuel', 'fin/tally', 'admin/corrections'],
    practice: 'ex.fleet.logslip',
    audio: [
      'Log slip एक truck की सारी पूरी हुई trips को जोड़कर diesel का हिसाब बनाता है।',
      'सिर्फ़ completed trips आती हैं — चलती trip नहीं आती, इसलिए पहले Trip Completion में trip बंद कीजिए।',
      'Average लाल हो, मतलब standard से ज़्यादा diesel लगा है। Excess diesel driver से पूछिए।',
      'Submit करते ही trips lock हो जाती हैं और Tally के लिए diesel का journal बन जाता है।',
      'इसलिए submit से पहले सारे diesel bill entry हो जाने चाहिए।',
    ],
    quiz: ['q.fleet.open-trip-blocks-logslip', 'q.fleet.logslip-average', 'q.fleet.logslip-submit'],
    minutes: 6,
  },
  {
    id: 'fleet/drivers',
    module: 'fleet',
    title: 'Drivers',
    purpose: 'Driver master with mobile, licence number and expiry, leave and blacklist flags, salary, statutory IDs and references.',
    why: 'Trips and LR dispatch pick drivers from this list. Leave and blacklist flags keep the wrong driver off a trip, and licence expiry alerts protect the company.',
    when: 'When a driver joins, goes on leave, returns, renews a licence or is blacklisted.',
    roles: ['CO', 'AD'],
    upstream: [],
    downstream: ['fleet/trucks', 'fleet/trips', 'fleet/accidents'],
    before: 'Driver documents (licence, Aadhaar, PAN) and a reference are collected.',
    after: 'The driver can be assigned to an own truck and picked on trips.',
    prerequisites: [],
    actions: [
      'Add driver: Driver name, Mobile no., Licence no. and licence Expiry date are required.',
      'Mark On leave when the driver is away; untick when back.',
      'Mark Blacklisted to stop the driver being used.',
      'Use quick filters: On leave, Licence expiring (30 days or less), Blacklisted.',
    ],
    records: ['drivers'],
    validations: [
      'Save is refused with "Required: Driver name, Mobile no., Licence no., Expiry date" when any is missing.',
      'Start trip hides drivers who are on leave or blacklisted.',
      'LR dispatch hides blacklisted drivers only – a driver on leave can still be picked there.',
    ],
    mistakes: [
      'Not updating licence expiry after renewal: the driver keeps showing in Licence ≤ 30 days and in Home alerts.',
      'Forgetting to untick On leave: the driver cannot be picked in Start trip.',
      'Relying on the system to stop expired licences: trips do not check licence expiry.',
    ],
    statuses: [
      { status: 'Active', meaning: 'Not on leave and not blacklisted.' },
      { status: 'On leave', meaning: 'Hidden from Start trip.' },
      { status: 'Blacklisted', meaning: 'Hidden from Start trip and from LR dispatch.' },
    ],
    fields: [
      { name: 'Expiry date', help: 'Licence expiry. Red when expired, amber within 30 days.' },
      { name: 'Truck', help: 'Shown in the list: the own truck whose Assigned driver is this person (set in Fleet).' },
      { name: 'TDS rate / No-TDS up to', help: 'Used when the driver is paid as a party.' },
    ],
    example: 'Sunil Wagh goes on leave. The controller ticks On leave; he disappears from the Start trip driver list until it is unticked.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Drivers, On trip (drivers on running trips), On leave and Licence ≤ 30 days.' },
      { title: 'Filter', body: 'Use Licence expiring to plan renewals; Blacklisted to review.' },
      { title: 'Update a driver', body: 'Edit, change leave/blacklist or licence expiry, Save.' },
    ],
    related: ['fleet/trucks', 'fleet/trips', 'fleet/accidents'],
    practice: 'ex.fleet.driver-leave',
    audio: [
      'यहाँ सारे drivers की जानकारी है — mobile, licence और उसकी expiry।',
      'Driver छुट्टी पर जाए तो On leave tick कीजिए। तब वो Start trip में नहीं दिखेगा।',
      'Blacklisted driver किसी trip या dispatch में नहीं दिखता।',
      'Licence renew होते ही नई expiry date डालिए। System trip शुरू करते समय licence check नहीं करता, यह आपको देखना है।',
    ],
    quiz: ['q.fleet.driver-leave'],
    minutes: 4,
  },
  {
    id: 'fleet/fuel',
    module: 'fleet',
    title: 'Fuel & trip expenses',
    purpose: 'Books diesel (fleet card at credit pumps) and other trip costs – toll, driver bhatta, loading, RTO, kata, punctures – against a trip. A second tab manages pumps and diesel rates.',
    why: 'Diesel and trip costs decide trip profit and the log slip average. Each entry must sit on the right trip.',
    when: 'Whenever a diesel slip or expense bill of a trip arrives – during the trip or after it closes, but before its log slip.',
    roles: ['CO', 'OP'],
    upstream: ['fleet/trips'],
    downstream: ['fleet/logslips', 'fleet/journeys'],
    before: 'The trip exists (started manually or by LR dispatch).',
    after: 'The entry shows in the trip drawer, the log slip and Truck journeys.',
    prerequisites: ['A trip of the truck that is not yet in a log slip.', 'Pumps set up with their current diesel rate (Pumps & diesel rate tab).'],
    actions: [
      'Select the Truck, then the Trip (running or completed trips without a log slip).',
      'For Diesel: pick Card no., City, Pump (Rate fills from the pump), enter Qty (L). Amount = Qty × Rate.',
      'For other expense types: enter Amount (₹).',
      'Choose Payment mode Cash or Credit and Save.',
      'Print the Diesel slip from the list; Delete removes an entry.',
      'Pumps & diesel rate tab: rate history chart, litres by pump, and the pump master.',
    ],
    records: ['tripExpenses', 'pumps'],
    validations: [
      'Save is refused with "Select trip and enter amount" when no trip is chosen or the amount is 0.',
      'Trips already in a log slip are not offered.',
      'When the amount is above Expense limit 1 of the expense type, an amber warning says it will be flagged for approval.',
    ],
    mistakes: [
      'Booking diesel on the wrong trip of the same truck – the log slip and trip profit of both trips go wrong.',
      'Entering diesel without a pump or litres – km/l and excess diesel cannot be worked out.',
      'Deleting an entry by mistake – Delete in the list removes it at once, without a confirmation.',
      'Waiting until after the log slip – the trip is then locked and no longer listed.',
    ],
    warnings: ['The over-limit message is a warning only: the entry is saved and no approval request is created. Inform your approver yourself.'],
    shortcuts: ['From a trip drawer, "Add expense" opens this screen with the truck and trip filled.'],
    fields: [
      { name: 'Expense type', help: 'Diesel shows card, city, pump, litres and rate; other types show Amount only.' },
      { name: 'Pump', help: 'Credit pump. Selecting it fills Rate with the pump’s current diesel rate.' },
      { name: 'Qty (L) / Rate (₹/L)', help: 'Diesel amount = litres × rate, rounded to the rupee.' },
      { name: 'Payment mode', help: 'Credit (fleet card / pump credit) or Cash.' },
    ],
    example: 'Driver of TRP/2252 fills 300 L at Balaji Petroleum, Dhule. The controller selects the truck and trip, Expense type Diesel, pump Balaji Petroleum (rate ₹90.72 fills in), Qty 300 → amount ₹27,216. Above Diesel limit 1 (₹25,000), so the amber warning appears; the entry is saved.',
    walkthrough: [
      { title: 'Choose truck and trip', body: 'Pick the own truck; the Trip list shows its trips that are not yet in a log slip.' },
      { title: 'Enter diesel', body: 'Keep Expense type Diesel, choose the pump – rate fills in – and type the litres.' },
      { title: 'Check the amount', body: 'The Expense amount box shows litres × rate. Read any over-limit warning.' },
      { title: 'Save', body: 'Click Save. The entry appears in the list below with the trip name; print the Diesel slip if needed.' },
      { title: 'Add other costs', body: 'Change Expense type to Toll Tax, Driver Bhatta etc., enter Amount and Save.' },
    ],
    related: ['fleet/trips', 'fleet/logslips', 'fleet/journeys'],
    practice: 'ex.fleet.fuel-entry',
    audio: [
      'Diesel, toll, bhatta जैसे trip के ख़र्चे यहाँ लिखे जाते हैं।',
      'पहले truck चुनिए, फिर सही trip — एक truck की कई trips हो सकती हैं, ध्यान से चुनिए।',
      'Pump चुनते ही rate अपने आप आ जाता है; litres डालिए, amount ख़ुद बन जाएगा।',
      'Limit से ज़्यादा amount हो तो पीली warning आती है, पर entry save हो जाती है — अपने approver को बता दीजिए।',
      'Log slip बनने के बाद उस trip पर ख़र्चा नहीं जुड़ता, इसलिए bill आते ही entry कीजिए।',
    ],
    quiz: ['q.fleet.diesel-amount', 'q.fleet.expense-limit', 'q.fleet.expense-after-logslip'],
    minutes: 6,
  },
  {
    id: 'fleet/expenses',
    module: 'fleet',
    title: 'Monthly expenses',
    purpose: 'Records vehicle costs that are not part of a trip – road repairs, RTO challans, parking, punctures in the yard – per own truck and date.',
    why: 'These costs are part of the truck’s real cost. Truck journeys subtract them in Net profit.',
    when: 'When a cost is paid for a truck that is not on a trip, or that should not be charged to one trip.',
    roles: ['CO'],
    upstream: [],
    downstream: ['fleet/journeys'],
    before: 'A bill or cash voucher for a vehicle cost outside a trip.',
    after: 'The amount appears in the KPIs here and in Monthly costs / Net profit of Truck journeys for that date.',
    prerequisites: ['Expense type exists in the Expense types master.'],
    actions: [
      'Add expense: Date, Vehicle no. (own trucks), Expense type and Expense amount (₹) are required.',
      'Add Responsible person and Description.',
      'Edit or Delete entries from the list.',
    ],
    records: ['monthlyExpenses'],
    validations: ['Save is refused with "Required: Date, Vehicle no., Expense type, Expense amount (₹)" when any is missing.'],
    mistakes: [
      'Booking a trip cost here (diesel, toll on a trip): it then misses the trip and the log slip.',
      'Booking the same cost here and in Fuel & trip expenses: it is counted twice in Net profit.',
    ],
    fields: [
      { name: 'Responsible person', help: 'Who caused or approved the cost, e.g. Driver for an RTO challan.' },
    ],
    example: 'A tyre puncture repaired in the Jalgaon yard for ₹1,200 is entered here with type Tyre Puncture; it is not linked to any trip.',
    walkthrough: [
      { title: 'Read KPIs', body: 'This month total, number of entries, highest-cost vehicle and average per entry.' },
      { title: 'Add the cost', body: 'Click Add expense, fill date, vehicle, type and amount, then Save.' },
      { title: 'Review', body: 'Filter the list by vehicle or expense type to see where money goes.' },
    ],
    related: ['fleet/fuel', 'fleet/journeys'],
    audio: [
      'जो ख़र्चा किसी trip का नहीं है — जैसे yard में puncture, RTO challan, parking — वो यहाँ लिखिए।',
      'Trip का diesel या toll यहाँ मत डालिए, वो Fuel and trip expenses में जाता है।',
      'यह ख़र्चा Truck journeys के Net profit में घटता है।',
    ],
    quiz: ['q.fleet.monthly-vs-trip'],
    minutes: 3,
  },
  {
    id: 'fleet/trip-completion',
    module: 'fleet',
    title: 'Trip completion',
    purpose: 'Closes running trips with end date, time and closing odometer. The truck becomes free and the trip waits for its log slip.',
    why: 'An open trip keeps the truck "On Trip", hides its km from journeys and keeps it out of the log slip and diesel settlement.',
    when: 'As soon as the truck is back (or the trip ends). My Work lists trips open for more than 5 days under "Close finished trips".',
    roles: ['CO', 'OP'],
    upstream: ['fleet/trips', 'fleet/fuel'],
    downstream: ['fleet/logslips', 'fleet/journeys', 'fleet/trucks'],
    before: 'The trip is running and the driver reports the meter reading.',
    after: 'Trip shows Completed, the truck odometer is raised to the closing km, the truck is Available (unless a job card is open) and the trip appears in Log Slips.',
    prerequisites: ['A running trip.'],
    actions: [
      'Find the trip card (trip name, truck, driver, route, start date).',
      'Set End date, Time (hour, minute 00/15/30/45) and AM/PM.',
      'Type the Closing KM from the meter. The card shows "km run".',
      'Click Trip close.',
    ],
    records: ['trips', 'trucks'],
    validations: [
      'Trip close is refused with "Closing km must exceed opening km" when closing km is equal to or less than opening km.',
      'Closed trips leave this screen; when none are open it shows "No running trips".',
    ],
    mistakes: [
      'Accepting the suggested closing km without reading the meter – it is only an estimate (opening km + 2 × road distance).',
      'Typing an end date before the start date – the screen does not check it.',
      'Closing a trip before its last diesel is booked is allowed, but book it before the log slip.',
    ],
    warnings: ['Feeder trips to the Jalgaon rail head are closed automatically when the GRN is made (ops/grn) with an estimated closing km, and that does not update the truck odometer – check the odometer in Fleet.'],
    fields: [
      { name: 'Closing KM', help: 'Meter reading at the end. Must be more than opening km. Raises the truck odometer if higher.' },
      { name: 'km run', help: 'Closing km − opening km, shown live.' },
    ],
    example: 'TRP/2267 (Jalgaon → Nagpur) started at 241,045 km. The truck returns showing 241,912. The controller sets today, 06:30 PM, closing km 241,912 (867 km run) and clicks Trip close.',
    walkthrough: [
      { title: 'Find the trip', body: 'Running trips are listed as cards. Coming from Trips → Complete trip highlights the card.' },
      { title: 'Enter end time', body: 'Choose End date, hour, minute and AM/PM.' },
      { title: 'Enter closing km', body: 'Replace the suggested value with the real meter reading and check km run.' },
      { title: 'Close', body: 'Click Trip close. The card disappears and the toast says "Trip completed – Ready for log slip".' },
    ],
    related: ['fleet/trips', 'fleet/logslips', 'fleet/trucks'],
    practice: 'ex.fleet.complete-trip',
    audio: [
      'Truck वापस आते ही यहाँ trip बंद कीजिए।',
      'End date, time और meter की closing km डालिए। Closing km, opening km से ज़्यादा होनी चाहिए, वरना system मना कर देगा।',
      'जो km पहले से भरा दिखता है, वो सिर्फ़ अंदाज़ा है — असली meter reading डालिए।',
      'Trip close होते ही truck Available हो जाता है और trip log slip के लिए तैयार हो जाती है।',
      'खुली trip से log slip और diesel का हिसाब रुका रहता है।',
    ],
    quiz: ['q.fleet.closing-km-rule', 'q.fleet.after-close', 'q.fleet.grn-closes-feeder'],
    minutes: 4,
  },
  {
    id: 'fleet/accidents',
    module: 'fleet',
    title: 'Accidents',
    purpose: 'Accident register: vehicle, driver, place, reason, vehicle/human/other losses, responsible person and insurance follow-up remarks.',
    why: 'Losses must be recorded for insurance claims, driver recovery and fleet safety review.',
    when: 'As soon as an accident is reported, and again when the loss amounts are known.',
    roles: ['CO', 'AD'],
    upstream: ['fleet/trucks', 'fleet/drivers'],
    downstream: ['ws/jobcards'],
    before: 'The driver reports the accident; photos, FIR or surveyor details are collected.',
    after: 'Repairs go through a job card (ws/jobcards); the register shows total loss and driver-responsible cases.',
    prerequisites: [],
    actions: [
      'Add accident: Accident no. (pre-filled ACC/<next>), Accident date and Vehicle no. are required.',
      'Pick Driver and Location; write the reason.',
      'Enter Vehicle part loss, Human loss and Other loss with descriptions, Responsible person, Total loss and remark.',
    ],
    records: ['accidents'],
    validations: ['Save is refused with "Required: Accident no., Accident date, Vehicle no." when any is missing.'],
    mistakes: [
      'Assuming Total loss adds itself – it is typed by hand; enter part + human + other loss.',
      'Keeping the suggested accident number when it is already used – the number is not checked for duplicates; check the list.',
    ],
    fields: [
      { name: 'Accident responsible person', help: 'Free text, e.g. Driver, Third party, Road condition. KPI counts entries where it is exactly "Driver".' },
      { name: 'Total loss (₹)', help: 'Typed total of all losses. Used in the Total loss KPI.' },
    ],
    example: 'Truck brushed a bus while overtaking near Dhule: side mirror and indicator ₹6,500, responsible Driver, total loss ₹6,500, remark "Deduct 50 % from driver bhatta".',
    walkthrough: [
      { title: 'Read KPIs', body: 'Accidents (90 days), Total loss, Driver responsible and Days since last accident.' },
      { title: 'Record the accident', body: 'Click Add accident, check the number, fill date, vehicle, driver, place and reason.' },
      { title: 'Record losses', body: 'Fill each loss with description, the responsible person and the Total loss, then Save.' },
    ],
    related: ['fleet/trucks', 'fleet/drivers', 'ws/jobcards'],
    audio: [
      'Accident होते ही यहाँ entry कीजिए — truck, driver, जगह और कारण।',
      'Vehicle, human और other loss अलग-अलग लिखिए।',
      'Total loss अपने आप नहीं जुड़ता, उसे ख़ुद जोड़कर डालिए।',
      'Truck की repair job card से होगी, Workshop में।',
    ],
    quiz: ['q.fleet.accident-total'],
    minutes: 3,
  },
];

// ---------------- questions ----------------
const TF = [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }];

export const questions: Question[] = [
  {
    id: 'q.fleet.closing-km-rule',
    module: 'fleet',
    type: 'mcq',
    prompt: 'A trip started at 3,40,500 km. The driver says the meter now reads 3,40,500 because the meter is broken. What happens if you click Trip close with closing km 3,40,500?',
    options: [
      { id: 'a', text: 'The trip closes with 0 km run' },
      { id: 'b', text: 'The ERP refuses: "Closing km must exceed opening km"' },
      { id: 'c', text: 'The ERP uses road distance instead' },
      { id: 'd', text: 'The trip closes and the truck goes to Workshop' },
    ],
    answer: 'b',
    explanation: 'Trip Completion only closes a trip when closing km is greater than opening km. Get the real reading (or the workshop meter estimate) and enter a closing km above the opening km.',
    screens: ['fleet/trip-completion'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.open-trip-blocks-logslip',
    module: 'fleet',
    type: 'scenario',
    prompt: 'What is the right action?',
    scenario: 'MH19 CY 1200 made three trips this week. In Log Slips it shows "(2 trips)". The third trip, to Nagpur, is back in the yard but still shows On Trip.',
    options: [
      { id: 'a', text: 'Submit the log slip now; the Nagpur trip will be added automatically later' },
      { id: 'b', text: 'Close the Nagpur trip in Trip Completion with its closing km, then make the log slip' },
      { id: 'c', text: 'Book the Nagpur diesel under Monthly expenses' },
      { id: 'd', text: 'Delete the Nagpur trip' },
    ],
    answer: 'b',
    explanation: 'Log Slips include only completed trips without a log slip. A running trip is left out, so its km and diesel are not settled. Close it in Trip Completion first; then all three trips go into one log slip.',
    screens: ['fleet/logslips', 'fleet/trip-completion'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.truck-status-workshop',
    module: 'fleet',
    type: 'tf',
    prompt: 'True or false: a truck with a job card "Pending Approval" (no out date) shows status Workshop and is not offered in Start trip.',
    options: TF,
    answer: 't',
    explanation: 'Truck status is calculated: a Draft, Pending Approval or Approved job card without an out date makes the truck Workshop (this wins over On Trip). Start trip lists only Available own trucks. Finalise the job card in Workshop to free the truck.',
    screens: ['fleet/trucks', 'ws/jobcards'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.market-truck-no-trip',
    module: 'fleet',
    type: 'mcq',
    prompt: 'An LR is dispatched on a market truck. What does Road Fleet do?',
    options: [
      { id: 'a', text: 'Opens a trip with advance ₹10,000' },
      { id: 'b', text: 'Nothing – trips are opened only when the LR vehicle is Own' },
      { id: 'c', text: 'Opens a trip marked Empty run' },
      { id: 'd', text: 'Asks for closing km' },
    ],
    answer: 'b',
    explanation: 'LR dispatch opens a Road Fleet trip only for Own vehicle LRs. Market trucks are paid through transporter payments (TP slips), not trips, log slips or diesel entries.',
    screens: ['fleet/trips', 'fleet/trucks'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.dispatch-opens-trip',
    module: 'fleet',
    type: 'next',
    prompt: 'A finalised LR on own truck MH19 CX 1517 is dispatched with "Dispatch & start trip". What happens next in Road Fleet?',
    options: [
      { id: 'a', text: 'A trip TRP/<next> opens: opening km from the dispatch form, onward freight = LR freight, advance as entered (₹10,000 by default)' },
      { id: 'b', text: 'The controller must start the trip manually in Trips' },
      { id: 'c', text: 'A log slip is created' },
      { id: 'd', text: 'The truck goes to Workshop' },
    ],
    answer: 'a',
    explanation: 'Dispatching an own-truck LR creates the trip automatically and links it to the LR. Do not start a second trip by hand for the same load.',
    screens: ['fleet/trips', 'ops/lr'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.papers-due',
    module: 'fleet',
    type: 'mcq',
    prompt: 'In Fleet, when does a truck’s Compliance show "Expiring"?',
    options: [
      { id: 'a', text: 'When any of insurance, fitness, NP, GP or tax is due within 15 days' },
      { id: 'b', text: 'Only when insurance is due within 60 days' },
      { id: 'c', text: 'When the driver licence expires' },
      { id: 'd', text: 'When the truck is older than 15 years' },
    ],
    answer: 'a',
    explanation: 'Compliance takes the worst of the five due dates: Expired if any is past, Expiring if any is due within 15 days. After renewal edit the truck and enter the new due date to clear it.',
    screens: ['fleet/trucks'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.diesel-amount',
    module: 'fleet',
    type: 'mcq',
    prompt: 'You choose pump Khandesh Highway Fuels (₹90.48/L) and enter 250 L. What is the diesel expense amount?',
    options: [
      { id: 'a', text: '₹22,620 (250 × 90.48, rounded)' },
      { id: 'b', text: 'You must type the amount yourself' },
      { id: 'c', text: '₹25,000 (Diesel limit 1)' },
      { id: 'd', text: '₹250' },
    ],
    answer: 'a',
    explanation: 'For Diesel the amount is litres × rate, rounded to the rupee. The rate fills from the pump master. Only non-diesel types need a typed amount.',
    screens: ['fleet/fuel'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.expense-limit',
    module: 'fleet',
    type: 'tf',
    prompt: 'True or false: a diesel entry of ₹27,000 (above Diesel limit 1 of ₹25,000) cannot be saved until a manager approves it.',
    options: TF,
    answer: 'f',
    explanation: 'Fuel & trip expenses shows an amber "Above limit 1 … will be flagged for approval" warning, but the entry is saved and no approval request is created. Tell your approver about it.',
    screens: ['fleet/fuel'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.expense-after-logslip',
    module: 'fleet',
    type: 'scenario',
    prompt: 'What should you do?',
    scenario: 'A driver brings a toll receipt for TRP/2264 two days late. The trip is already in log slip LS/158, and it is not in the Trip list of Fuel & trip expenses.',
    options: [
      { id: 'a', text: 'Book it on the truck’s current running trip' },
      { id: 'b', text: 'Ask an administrator to reopen LS/158 in Data Corrections, book the toll, then submit a new log slip – and tell Accounts, because the old journal is not reversed' },
      { id: 'c', text: 'Enter it in Monthly expenses as Toll Tax' },
      { id: 'd', text: 'Edit TRP/2264 and add the toll to its advance' },
    ],
    answer: 'b',
    explanation: 'Trips in a log slip are locked (no Edit, no new expenses). Data Corrections → Open log slip releases the trips. Booking on another trip or in Monthly expenses puts the cost in the wrong place. Reopening does not reverse the posted diesel journal, so Accounts must check it.',
    screens: ['fleet/fuel', 'fleet/logslips'],
    difficulty: 3,
  },
  {
    id: 'q.fleet.empty-km',
    module: 'fleet',
    type: 'mcq',
    prompt: 'In Truck journeys, which trips count as "Empty" km?',
    options: [
      { id: 'a', text: 'Trips started with "Empty run" ticked' },
      { id: 'b', text: 'Any trip with no diesel entry' },
      { id: 'c', text: 'Trips longer than 4,000 km' },
      { id: 'd', text: 'Trips still running' },
    ],
    answer: 'a',
    explanation: 'Journeys treat a trip as empty only when Empty run was ticked when it was started. Empty trips earn no freight and appear in "Lanes we run empty". A return trip saved without the tick is counted as loaded with ₹0 freight.',
    screens: ['fleet/journeys', 'fleet/trips'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.trip-vs-net-profit',
    module: 'fleet',
    type: 'mcq',
    prompt: 'A truck earned ₹1,80,000 freight, used ₹95,000 diesel and ₹20,000 other trip costs, and has ₹40,000 monthly costs in the period. What do Trip profit and Net profit show?',
    options: [
      { id: 'a', text: 'Trip profit ₹65,000; Net profit ₹25,000' },
      { id: 'b', text: 'Trip profit ₹85,000; Net profit ₹65,000' },
      { id: 'c', text: 'Trip profit ₹25,000; Net profit ₹65,000' },
      { id: 'd', text: 'Both ₹1,80,000' },
    ],
    answer: 'a',
    explanation: 'Trip profit = freight − diesel − trip expenses = 1,80,000 − 95,000 − 20,000 = 65,000. Net profit also subtracts monthly truck costs (EMI, tax, permit, insurance, salary, Monthly expenses) = 25,000.',
    screens: ['fleet/journeys'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.trip-cycle-order',
    module: 'fleet',
    type: 'order',
    prompt: 'Put the own-truck trip steps in the order the ERP needs them.',
    items: [
      { id: 'disp', text: 'Dispatch the own-truck LR (trip opens with advance)' },
      { id: 'diesel', text: 'Book diesel and trip expenses on the trip' },
      { id: 'close', text: 'Close the trip with closing km' },
      { id: 'ls', text: 'Submit the log slip (diesel journal posted)' },
      { id: 'jour', text: 'Review profit and empty km in Truck journeys' },
    ],
    answer: ['disp', 'diesel', 'close', 'ls', 'jour'],
    explanation: 'Expenses need an open (or closed but unslipped) trip; the log slip takes only closed trips and locks them; journeys read the closed trips and their expenses.',
    screens: ['fleet/trips', 'fleet/fuel', 'fleet/trip-completion', 'fleet/logslips', 'fleet/journeys'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.spot-logslip',
    module: 'fleet',
    type: 'spot',
    prompt: 'Spot the wrong statement about log slips.',
    options: [
      { id: 'a', text: 'Only completed trips without a log slip are included' },
      { id: 'b', text: 'You can tick which of the waiting trips go into the log slip' },
      { id: 'c', text: 'Submitting posts a Logslip journal debiting Diesel Expenses' },
      { id: 'd', text: 'After submit the trips can no longer be edited' },
    ],
    answer: 'b',
    explanation: 'The log slip always takes all completed, unslipped trips of the selected truck together – there is no trip selection. The other three statements are how the ERP works.',
    screens: ['fleet/logslips'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.logslip-average',
    module: 'fleet',
    type: 'mcq',
    prompt: 'A log slip shows 1,600 km, 450 L diesel, standard average 4.0 km/l. What does the Performance card show?',
    options: [
      { id: 'a', text: 'Average 3.56 km/l in red, excess diesel 50 L' },
      { id: 'b', text: 'Average 4.0 km/l, excess 0 L' },
      { id: 'c', text: 'Average 0.28 km/l' },
      { id: 'd', text: 'Excess diesel 450 L' },
    ],
    answer: 'a',
    explanation: 'Average = km ÷ litres = 1,600 ÷ 450 = 3.56, red because it is below 4.0. Excess diesel = litres − km ÷ standard = 450 − 400 = 50 L.',
    screens: ['fleet/logslips'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.logslip-submit',
    module: 'fleet',
    type: 'next',
    prompt: 'You click Submit on a log slip for MH19 CX 1517. What happens?',
    options: [
      { id: 'a', text: 'LS/<next> is created, its trips are locked, a Logslip journal for diesel is posted for Tally and the log slip print opens' },
      { id: 'b', text: 'The trips are reopened' },
      { id: 'c', text: 'The driver’s salary is paid' },
      { id: 'd', text: 'Nothing is saved until Accounts approves' },
    ],
    answer: 'a',
    explanation: 'Submit saves the log slip, sets the log slip on each trip (Edit is hidden and the trips leave Fuel & trip expenses), posts a JV of type Logslip debiting Diesel Expenses and opens the print.',
    screens: ['fleet/logslips', 'fin/tally'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.driver-leave',
    module: 'fleet',
    type: 'mcq',
    prompt: 'Driver Sunil Wagh does not appear in the Start trip driver list. What is the most likely reason?',
    options: [
      { id: 'a', text: 'He is marked On leave or Blacklisted in Drivers' },
      { id: 'b', text: 'His licence expires in 20 days' },
      { id: 'c', text: 'He drove yesterday' },
      { id: 'd', text: 'His salary is blank' },
    ],
    answer: 'a',
    explanation: 'Start trip hides drivers who are on leave or blacklisted. Licence expiry is not checked there, so you must check it in Drivers (quick filter Licence expiring).',
    screens: ['fleet/drivers', 'fleet/trips'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.after-close',
    module: 'fleet',
    type: 'next',
    prompt: 'You close TRP/2267 at 2,41,912 km. The truck odometer was 2,41,045. What happens next?',
    options: [
      { id: 'a', text: 'Trip becomes Completed, truck odometer becomes 2,41,912, truck is Available (if no open job card) and the trip waits in Log Slips' },
      { id: 'b', text: 'The log slip is submitted automatically' },
      { id: 'c', text: 'The odometer stays 2,41,045 until the log slip' },
      { id: 'd', text: 'The trip is deleted' },
    ],
    answer: 'a',
    explanation: 'Trip close marks the trip completed and raises the truck odometer to the closing km (if higher). The next trip’s opening km starts from there. The log slip is a separate step.',
    screens: ['fleet/trip-completion', 'fleet/trucks'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.grn-closes-feeder',
    module: 'fleet',
    type: 'scenario',
    prompt: 'Why did the trip close, and what should you check?',
    scenario: 'An own truck carried rail cargo from Dhule to the Jalgaon rail head. When the GRN was made at Jalgaon, its trip disappeared from Trip Completion.',
    options: [
      { id: 'a', text: 'Making the GRN closes the feeder trip with an estimated closing km (opening + road distance) and does not update the odometer – check the closing km and the truck odometer' },
      { id: 'b', text: 'Someone deleted the trip' },
      { id: 'c', text: 'The log slip closed it' },
      { id: 'd', text: 'Trips close themselves after 24 hours' },
    ],
    answer: 'a',
    explanation: 'GRN at the rail head completes the open trip of that LR using road distance, not the meter. Compare with the real reading (correct opening km via Data Corrections if needed) and keep the truck odometer right in Fleet.',
    screens: ['fleet/trip-completion', 'ops/grn'],
    difficulty: 3,
  },
  {
    id: 'q.fleet.monthly-vs-trip',
    module: 'fleet',
    type: 'mcq',
    prompt: 'A truck standing in the Jalgaon yard gets a puncture repaired for ₹1,200. Where do you record it?',
    options: [
      { id: 'a', text: 'Monthly expenses (fleet/expenses)' },
      { id: 'b', text: 'Fuel & trip expenses on its last trip' },
      { id: 'c', text: 'Accidents' },
      { id: 'd', text: 'Nowhere' },
    ],
    answer: 'a',
    explanation: 'Costs outside a trip go to Monthly expenses; Truck journeys subtract them in Net profit. Booking them on a trip distorts that trip and its log slip.',
    screens: ['fleet/expenses', 'fleet/fuel'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.accident-total',
    module: 'fleet',
    type: 'tf',
    prompt: 'True or false: in Accidents, Total loss is calculated automatically from part, human and other loss.',
    options: TF,
    answer: 'f',
    explanation: 'Total loss is a typed field. Add the three losses yourself, otherwise the Total loss KPI is wrong.',
    screens: ['fleet/accidents'],
    difficulty: 1,
  },
  {
    id: 'q.fleet.smartload-truck-match',
    module: 'fleet',
    type: 'scenario',
    prompt: 'Why is dispatch blocked?',
    scenario: 'Order ORD-1012 has a Smart Load Plan with Loading Confirmed on MH19 BM 1834. At dispatch the operator picks MH19 CY 1200 because it is closer, and the button stays disabled with "Vehicle matches load plan ✕".',
    options: [
      { id: 'a', text: 'The truck must match the vehicle in the approved load plan; dispatch on MH19 BM 1834 or re-plan the load' },
      { id: 'b', text: 'MH19 CY 1200 has expired insurance' },
      { id: 'c', text: 'The driver is on leave' },
      { id: 'd', text: 'Road Fleet already has too many trips' },
    ],
    answer: 'a',
    explanation: 'When an LR has a Smart Load Plan, dispatch needs Loading Confirmed, zero quantity variance and the same truck as the plan ("Selected truck does not match the approved load plan"). Only then is the own-truck trip opened.',
    screens: ['ops/smart-load', 'fleet/trips'],
    difficulty: 2,
  },
  {
    id: 'q.fleet.start-trip-unavailable',
    module: 'fleet',
    type: 'mcq',
    prompt: 'MH19 BM 1834 is not in the Start trip truck list. Which reason is NOT possible?',
    options: [
      { id: 'a', text: 'It has a running trip' },
      { id: 'b', text: 'It has an open job card' },
      { id: 'c', text: 'It is a Market truck' },
      { id: 'd', text: 'Its insurance is expiring in 10 days' },
    ],
    answer: 'd',
    explanation: 'Start trip lists own trucks whose status is Available – no running trip and no open job card. Paper expiry does not hide a truck, so you must check Compliance in Fleet yourself.',
    screens: ['fleet/trips', 'fleet/trucks'],
    difficulty: 2,
  },
];

// ---------------- practice exercises ----------------
export const exercises: Exercise[] = [
  {
    id: 'ex.fleet.fuel-entry',
    title: 'Record diesel and a toll for a trip',
    module: 'fleet',
    roles: ['CO', 'OP'],
    summary: 'Book a diesel fill at a credit pump against a running trip, then a toll on the same trip.',
    minutes: 4,
    watch: ['trips', 'tripExpenses'],
    steps: [
      {
        id: 'diesel',
        task: 'Open Fuel & trip expenses. Select an own truck that is on a trip (for example one listed as Running in Trips), select its trip, keep Expense type Diesel, choose a pump and enter about 200 litres. Save.',
        expected: 'A new Diesel entry with pump, litres and rate on a trip that has no log slip. Amount = litres × pump rate.',
        screen: 'fleet/fuel',
        check: (db, base) => checkDiesel(db, base),
      },
      {
        id: 'toll',
        task: 'On the same trip, change Expense type to Toll Tax, enter an amount such as ₹1,850 and Save.',
        expected: 'A Toll Tax (or any non-diesel) entry on the same trip as your diesel entry.',
        screen: 'fleet/fuel',
        check: (db, base) => {
          const dieselTrips = new Set(dieselEntries(db, base).map((e) => e.tripId));
          const others = created(db, base, 'tripExpenses', (e) => !isDieselType(db, e.typeId) && Number(e.amount) > 0);
          if (!others.length) return notYet('No non-diesel expense saved yet');
          const same = others.find((e) => dieselTrips.has(e.tripId));
          if (!same) return notYet(`${typeName(db, others[0].typeId)} ${rs(others[0].amount)} was saved on ${tripName(db, others[0].tripId)}, not on the trip where you booked diesel.`);
          return pass(`${typeName(db, same.typeId)} ${rs(same.amount)} (${same.mode}) on ${tripName(db, same.tripId)}`);
        },
      },
    ],
  },
  {
    id: 'ex.fleet.complete-trip',
    title: 'Close a running trip',
    module: 'fleet',
    roles: ['CO', 'OP'],
    summary: 'Close a running trip with the real closing km, then book a late bhatta bill on it before the log slip.',
    minutes: 4,
    watch: ['trips', 'trucks', 'tripExpenses'],
    steps: [
      {
        id: 'close',
        task: 'Open Trip completion. Pick any running trip, set today as End date, a time, and a Closing KM higher than the opening km (for example opening km + 900). Click Trip close.',
        expected: 'The trip is Completed with closing km above opening km; the truck odometer rises to the closing km.',
        screen: 'fleet/trip-completion',
        check: (db, base) => {
          const done = closedNow(db, base);
          if (!done.length) return notYet('No running trip has been closed yet');
          const t = done.find((x) => Number(x.closingKm) > Number(x.openingKm)) || done[0];
          if (!(Number(t.closingKm) > Number(t.openingKm))) return notYet(`${t.name} closed without a valid closing km`);
          const truck = list(db, 'trucks').find((x) => x.id === t.truckId);
          return pass(`${t.name} (${truckNo(db, t.truckId)}) closed on ${t.endDate} at ${km(t.closingKm)} – ${km(t.closingKm - t.openingKm)} run; truck odometer now ${km(truck?.odometer)}`);
        },
      },
      {
        id: 'late-bill',
        task: 'The driver hands in a Driver Bhatta bill for the trip you just closed. In Fuel & trip expenses pick that truck and trip (it is still listed because it has no log slip), choose Driver Bhatta, enter ₹900 and Save.',
        expected: 'A non-diesel expense saved on the trip you closed in step 1.',
        screen: 'fleet/fuel',
        check: (db, base) => {
          const ids = new Set(closedNow(db, base).map((t) => t.id));
          const e = created(db, base, 'tripExpenses', (x) => ids.has(x.tripId) && !isDieselType(db, x.typeId) && Number(x.amount) > 0)[0];
          if (!e) {
            const any = created(db, base, 'tripExpenses')[0];
            return notYet(any ? `An expense was saved on ${tripName(db, any.tripId)}, not on the trip you closed` : 'No expense saved on the closed trip yet');
          }
          return pass(`${typeName(db, e.typeId)} ${rs(e.amount)} added to completed trip ${tripName(db, e.tripId)}`);
        },
      },
    ],
  },
  {
    id: 'ex.fleet.logslip',
    title: 'Generate a log slip',
    module: 'fleet',
    roles: ['CO', 'AD'],
    summary: 'Settle the completed trips of one truck in a log slip and post the diesel journal.',
    minutes: 4,
    watch: ['trips', 'logslips'],
    steps: [
      {
        id: 'submit',
        task: 'Open Log slips. Pick a truck from "Trucks with pending trips", read the trip table and Performance card, enter the diesel rate, then click Submit.',
        expected: 'A new log slip LS/<no> covering all waiting completed trips of that truck; each trip now carries the log slip and a Logslip journal is posted.',
        screen: 'fleet/logslips',
        check: (db, base) => {
          const ls = created(db, base, 'logslips', (x) => Array.isArray(x.tripIds) && x.tripIds.length > 0)[0];
          if (!ls) return notYet('No log slip submitted yet');
          const trips = ls.tripIds.map((id: string) => tripOf(db, id)).filter(Boolean);
          const notLinked = trips.filter((t: any) => t.logslipId !== ls.id);
          if (notLinked.length) return notYet(`${ls.no} saved but ${notLinked.length} trip(s) are not linked to it`);
          const jv = list(db, 'ledger').find((e) => e.refType === 'Logslip' && e.refNo === ls.no);
          return pass(`${ls.no} for ${truckNo(db, ls.truckId)}: ${trips.length} trip(s), ${km(ls.closingKm - ls.openingKm)}${jv ? `, diesel journal ${jv.voucherNo} ${rs(jv.debit)}` : ''}`);
        },
      },
    ],
  },
  {
    id: 'ex.fleet.driver-leave',
    title: 'Put a driver on leave',
    module: 'fleet',
    roles: ['CO', 'AD'],
    summary: 'Mark an active driver On leave in the driver master so he cannot be picked for a new trip.',
    minutes: 2,
    watch: ['drivers'],
    steps: [
      {
        id: 'leave',
        task: 'Open Drivers, edit an Active driver, tick On leave and Save. Then open Trips → Start trip and see that he is no longer in the driver list.',
        expected: 'A driver who was not on leave is now saved with On leave ticked.',
        screen: 'fleet/drivers',
        check: (db, base) => {
          const d = list(db, 'drivers').find((x) => { const b = before(base, 'drivers', x.id); return !!b && !b.onLeave && x.onLeave === true; });
          return d ? pass(`${d.name} is now On leave – hidden from Start trip`) : notYet('No driver has been put on leave yet');
        },
      },
    ],
  },
  {
    id: 'ex.fleet.trip-cycle',
    title: 'Full trip cycle: start, diesel, close, log slip',
    module: 'fleet',
    roles: ['CO'],
    summary: 'Run one own-truck trip through Road Fleet end to end on practice data.',
    minutes: 10,
    workflow: true,
    watch: ['trips', 'tripExpenses', 'logslips', 'trucks'],
    steps: [
      {
        id: 'start',
        task: 'Open Trips → Start trip. Trip for Client (LR), pick a client, an Available truck, From Jalgaon, To Pune, advance ₹10,000. Save trip.',
        expected: 'A new trip TRP/<no> on an own truck with a destination and opening km.',
        screen: 'fleet/trips',
        check: (db, base) => {
          const t = created(db, base, 'trips', (x) => !!x.truckId && !!x.toCity)[0];
          return t ? pass(`${t.name}: ${truckNo(db, t.truckId)} ${cityName(db, t.fromCity)} → ${cityName(db, t.toCity)}, opening ${km(t.openingKm)}, advance ${rs(t.advance)}`) : notYet('No new trip started yet');
        },
      },
      {
        id: 'diesel',
        task: 'In Fuel & trip expenses book diesel on the new trip: pick the pump and enter litres. Save.',
        expected: 'A diesel entry with pump and litres on the trip you started.',
        screen: 'fleet/fuel',
        check: (db, base) => {
          const ids = created(db, base, 'trips').map((t) => t.id);
          if (!ids.length) return notYet('Start the trip first');
          return checkDiesel(db, base, ids);
        },
      },
      {
        id: 'close',
        task: 'In Trip completion close the new trip with a closing km above its opening km.',
        expected: 'The new trip is Completed with closing km > opening km.',
        screen: 'fleet/trip-completion',
        check: (db, base) => {
          const t = created(db, base, 'trips', (x) => x.completed === true)[0];
          if (!t) return notYet('The new trip is still running');
          if (!(Number(t.closingKm) > Number(t.openingKm))) return notYet(`${t.name} has no valid closing km`);
          return pass(`${t.name} closed at ${km(t.closingKm)} (${km(t.closingKm - t.openingKm)} run)`);
        },
      },
      {
        id: 'logslip',
        task: 'In Log slips pick the same truck and Submit.',
        expected: 'A new log slip whose trips include the trip you started.',
        screen: 'fleet/logslips',
        check: (db, base) => {
          const ids = new Set(created(db, base, 'trips').map((t) => t.id));
          const ls = created(db, base, 'logslips', (x) => Array.isArray(x.tripIds) && x.tripIds.some((id: string) => ids.has(id)))[0];
          if (!ls) return notYet(created(db, base, 'logslips').length ? 'A log slip was made, but not for the truck of your new trip' : 'No log slip submitted yet');
          return pass(`${ls.no} for ${truckNo(db, ls.truckId)} with ${ls.tripIds.length} trip(s) – trips locked, diesel journal posted`);
        },
      },
    ],
  },
];

// ---------------- workflows ----------------
export const workflows: Workflow[] = [
  {
    id: 'wf.fleet-trip',
    title: 'Own-truck trip: from free truck to profit',
    module: 'fleet',
    roles: ['CO', 'OP', 'AD'],
    summary: 'How an own truck is checked, sent on a trip, fuelled, closed, settled in a log slip and reviewed for profit, with the workshop and Smart Load Planning links.',
    steps: [
      { screen: 'fleet/trucks', title: 'Check the truck', does: 'Pick an own truck with status Available and Valid papers. Workshop status means an open job card; On Trip means a trip is still open.' },
      { screen: 'ws/checklist', title: 'Pre-trip checklist (workshop)', does: 'The workshop records the truck checklist; any defect is raised as a job card.' },
      { screen: 'ws/jobcards', title: 'Clear open job cards', does: 'A Draft, Pending Approval or Approved job card without an out date keeps the truck in Workshop and out of Start trip. Finalise it with the out date to free the truck.' },
      { screen: 'fleet/drivers', title: 'Check the driver', does: 'Driver must not be on leave or blacklisted; check licence expiry yourself (trips do not check it).' },
      { screen: 'ops/smart-load', title: 'Plan the load (when used)', does: 'For planned orders the load plan must be Loading Confirmed with zero variance, and dispatch must use the planned truck. Plans are geometric only – not certified axle-load, stability or securement analysis.' },
      { screen: 'ops/lr', title: 'Dispatch the own-truck LR', does: '"Dispatch & start trip" on a finalised own-vehicle LR opens trip TRP/<next> with opening km, onward freight = LR freight and the advance entered.' },
      { screen: 'fleet/trips', title: 'Or start a trip manually', does: 'For rake DC work, positioning or empty return runs use Start trip. Tick Empty run for trips without load. Print the trip advance slip.' },
      { screen: 'fleet/fuel', title: 'Diesel and trip expenses', does: 'Book diesel (pump, litres – amount = litres × rate) and toll, bhatta, loading etc. on the trip while it runs or after it closes.' },
      { screen: 'fleet/trip-completion', title: 'Close the trip', does: 'Enter end date/time and closing km (must exceed opening km). Truck odometer is raised, truck becomes Available.' },
      { screen: 'fleet/logslips', title: 'Log slip and diesel settlement', does: 'Submit the log slip for the truck: all completed trips are settled, average vs standard is shown, trips are locked and the Logslip diesel journal is posted.' },
      { screen: 'fin/tally', title: 'Send to Tally', does: 'Accounts transfers the Logslip journal with the other vouchers.' },
      { screen: 'fleet/expenses', title: 'Monthly truck costs', does: 'Costs outside trips (yard repairs, RTO, parking) are booked per truck.' },
      { screen: 'fleet/journeys', title: 'Review journeys and profit', does: 'See loaded vs empty km, trip profit, net profit after monthly costs and idle days; use "Lanes we run empty" to find return loads.' },
    ],
    exercise: 'ex.fleet.trip-cycle',
    lesson: 'ls.fleet.trip-cycle',
    notes: [
      'Market-truck LRs never open Road Fleet trips; they are settled through transporter payments.',
      'An open trip blocks its log slip and diesel settlement – My Work lists trips open more than 5 days.',
      'Feeder trips to the Jalgaon rail head close automatically on GRN with an estimated closing km.',
      'Accidents are recorded in fleet/accidents; the repair goes through a workshop job card.',
    ],
  },
];

// ---------------- lessons ----------------
export const lessons: Lesson[] = [
  {
    id: 'ls.fleet.trip-cycle',
    title: 'The own-truck trip cycle',
    module: 'fleet',
    kind: 'workflow',
    roles: ['CO', 'OP', 'AD'],
    screens: ['fleet/trucks', 'fleet/trips', 'fleet/fuel', 'fleet/trip-completion', 'fleet/logslips'],
    summary: 'Every own-truck trip goes through the same five steps. Missing one step breaks the next.',
    sections: [
      { heading: 'Truck and driver must be free', body: 'Start trip shows only own trucks with status Available, and hides drivers on leave or blacklisted.', bullets: ['Workshop status comes from an open job card without out date.', 'On Trip comes from any trip that is not closed.', 'Papers and licence expiry are not checked by Start trip – check them in Fleet and Drivers.'] },
      { heading: 'How a trip opens', body: 'Dispatching a finalised own-vehicle LR opens the trip automatically. Start trip by hand only for work without such an LR, and tick Empty run when the truck goes without load.' },
      { heading: 'Money on the way', body: 'Book diesel with pump and litres, and other costs with an amount, against the right trip. Entries are allowed until the trip is in a log slip.' },
      { heading: 'Closing and settlement', body: 'Close the trip with the meter reading – closing km must exceed opening km. The log slip then settles all closed trips of the truck, locks them and posts the diesel journal.', bullets: ['Average = km ÷ litres; red below the standard average.', 'Excess diesel = litres − km ÷ standard average.'] },
    ],
    audio: [
      'हर own truck की trip पाँच steps में चलती है।',
      'Truck और driver free हों, फिर LR dispatch से या Start trip से trip खुलती है।',
      'रास्ते में diesel और ख़र्चे उसी trip पर लिखिए।',
      'वापस आते ही closing km डालकर trip बंद कीजिए।',
      'फिर log slip से diesel का हिसाब और journal बनता है।',
    ],
    minutes: 5,
    quiz: ['q.fleet.trip-cycle-order', 'q.fleet.open-trip-blocks-logslip', 'q.fleet.closing-km-rule'],
  },
  {
    id: 'ls.fleet.truck-profit',
    title: 'Reading truck profit and empty running',
    module: 'fleet',
    kind: 'manager',
    roles: ['CO', 'AD', 'SA'],
    screens: ['fleet/journeys', 'fleet/expenses'],
    summary: 'How Truck journeys calculates km, empty %, trip profit, net profit and idle days, and what data entry it depends on.',
    sections: [
      { heading: 'Km', body: 'Km of a closed trip = closing km − opening km. When that is missing, zero or 4,000 km or more, road distance is used and marked "(est.)". Running trips add no km.' },
      { heading: 'Loaded or empty', body: 'Only the Empty run tick decides it. Empty trips earn no freight and feed "Lanes we run empty".' },
      { heading: 'Profit', body: 'Trip profit = freight − diesel − trip expenses. Net profit also subtracts monthly truck costs (EMI, tax, permit, insurance, fitness, salary – prorated to the period) and Monthly expenses entries.', bullets: ['A single monthly cost head above ₹1 lakh is ignored as a data-entry slip.', 'Net ₹ per km = net profit ÷ km run.'] },
      { heading: 'Idle days', body: 'Days in the period without any trip. Gaps of 2 days or more show as "Stood N days at <city>" on the timeline.' },
    ],
    audio: [
      'Truck journeys में हर truck का km, खाली km, profit और idle days दिखते हैं।',
      'Trip profit में freight से diesel और trip के ख़र्चे घटते हैं।',
      'Net profit में EMI, tax, insurance और monthly ख़र्चे भी घटते हैं।',
      'हिसाब तभी सही होगा जब trips समय पर बंद हों और खाली trip पर Empty run tick हो।',
    ],
    minutes: 5,
    quiz: ['q.fleet.trip-vs-net-profit', 'q.fleet.empty-km'],
  },
];
