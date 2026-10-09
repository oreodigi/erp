// Training Academy content — Rail & Rake (module 'rail').
// Every statement below was checked against src/features/ops-rail.tsx, src/features/ops-delivery.tsx,
// src/features/finance.tsx (DC approval / payslips), the masters CrudPage defs and the store actions in src/store/store.ts.
import type { Exercise, Lesson, Question, ScreenTraining, Workflow, PracticeBaseline } from '../types';
import { created, changed, fieldChanged, before, pass, notYet } from '../check';

// ---------------------------------------------------------------------------------------------
// Checker helpers (read-only)
// ---------------------------------------------------------------------------------------------
const list = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);
const lrNo = (db: any, id: string) => list(db, 'lrs').find((l) => l.id === id)?.lrNo || id;
const sched = (db: any, id: string) => list(db, 'schedules').find((s) => s.id === id);

/** Rail LR status order as implemented by the store actions. */
const LR_FLOW = ['Finalised', 'In Transit', 'At Rail Head', 'Loaded', 'Rake In Transit', 'At Branch', 'Out for Delivery', 'Delivered'];
/** Schedule (rake) status order. */
const RAKE_FLOW = ['Planned', 'Loading', 'In Transit', 'Arrived', 'Unloading', 'Completed'];
const atLeast = (flow: string[], status: string, min: string) => flow.indexOf(status) >= flow.indexOf(min);

/** GRNs generated during the exercise for rail LRs (mode Railway / Both). */
const newRailGRNs = (db: any, base: PracticeBaseline) =>
  created(db, base, 'grns', (g) => { const l = list(db, 'lrs').find((x) => x.id === g.lrId); return !!l && l.mode !== 'Road'; });

/** The LR the employee took through the exercise: the LR of the first rail GRN created during it. */
const e2eLR = (db: any, base: PracticeBaseline) => { const g = newRailGRNs(db, base)[0]; return g ? list(db, 'lrs').find((l) => l.id === g.lrId) : undefined; };

/** Rake loading entries saved after the exercise started (loads are nested in schedules, so use their createdAt). */
const newLoads = (db: any, base: PracticeBaseline) =>
  list(db, 'schedules').flatMap((s) => (Array.isArray(s.loads) ? s.loads : []).filter((ld: any) => ld?.createdAt && ld.createdAt > base.startedAt).map((ld: any) => ({ ...ld, s })));

// ---------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------
export const screens: ScreenTraining[] = [
  // ---------------- Rake Planning board ----------------
  {
    id: 'rail/rakes',
    module: 'rail',
    title: 'Rake Planning (board)',
    purpose: 'One board with every parcel rake, grouped by stage: Planned, Loading, In transit, At destination and Completed.',
    why: 'You see at a glance which rake is waiting for loading, which is moving and which is unloading at Guwahati or Kolkata.',
    when: 'Start of every shift at the rail desk, and whenever someone asks "where is my rake?".',
    roles: ['OP', 'BU'],
    upstream: ['ops/vp-schedule'],
    downstream: ['ops/vp-loading', 'rail/source', 'rail/status', 'ops/dgrn'],
    before: 'A rake appears here as soon as a VP schedule is saved on VP Scheduling.',
    after: 'Open a card for the rake 360 view (wagons, LRs, status log, P&L), then go to the screen for the next step.',
    prerequisites: ['At least one VP schedule exists.'],
    actions: [
      'Read the cards in each column: rake number, schedule date, Jalgaon → destination branch.',
      'Check LRs, VPs loaded / total VPs and weight on each card.',
      'Read the last rake status remark on in-transit rakes.',
      'Click a card to open the rake 360.',
      'Click "New schedule" to open VP Scheduling with a new schedule form.',
    ],
    records: ['schedules (read only on this screen)'],
    validations: ['The board is read only. Status changes come from other screens: VP loading, Rake at Rail Head, Rake at Branch, DGRN and Close rake.'],
    mistakes: [
      'Expecting to drag a card to the next column — cards cannot be moved here; the status changes only when the real work is saved on its screen.',
      'Reading "VPs 2/6" as two VPs full — it counts VPs that have at least one loading entry, not VPs that are full.',
    ],
    statuses: [
      { status: 'Planned', meaning: 'Schedule saved, no loading entry yet.' },
      { status: 'Loading', meaning: 'At least one VP loading entry saved at Jalgaon.' },
      { status: 'In Transit', meaning: 'Dispatch time saved on Rake at Rail Head.' },
      { status: 'Arrived / Unloading', meaning: 'Shown together in "At destination". Arrived = arrival time saved at branch; Unloading = first DGRN saved.' },
      { status: 'Completed', meaning: 'Rake closed from VP Scheduling. Entries are locked.' },
    ],
    example: 'RK-2026-6 to Guwahati sits in "Loading" with VPs 2/6 — four parcel vans still have no loading entry.',
    walkthrough: [
      { title: 'Scan the columns', body: 'Each column is a stage. The number next to the column name is how many rakes are in it.' },
      { title: 'Check loading progress', body: 'On a Loading card, VPs x/y and the progress bar show how many parcel vans have loading entries.' },
      { title: 'Read the latest status', body: 'In-transit cards show the last remark posted on Rake Status, for example "Crossed Bilaspur Jn.".' },
      { title: 'Open the rake 360', body: 'Click a card to see its wagons, LRs, status log and rake P&L in one drawer.' },
    ],
    related: ['ops/vp-schedule', 'rail/status', 'ops/vp-loading'],
    audio: [
      'यह Rake Planning board है। हर parcel rake यहाँ एक card है।',
      'Columns बताते हैं rake किस stage पर है — Planned, Loading, In transit, destination पर, या Completed।',
      'Card पर LR की गिनती, कितने VP load हुए, और कुल weight दिखता है।',
      'Card को आप खींच कर आगे नहीं कर सकते। Status तभी बदलता है जब असली काम उसकी screen पर save होता है।',
      'Card पर click कीजिए, rake 360 खुलेगा — wagons, LR, status log और P&L सब एक जगह।',
    ],
    quiz: ['q.rail.rake-vp-wagon', 'q.rail.lr-status-order'],
    minutes: 3,
  },

  // ---------------- Rake at Rail Head (source) ----------------
  {
    id: 'rail/source',
    module: 'rail',
    title: 'Rake at Rail Head (Jalgaon)',
    purpose: 'Record arrival, placement, removal and dispatch times of a rake at the Jalgaon loading rail head.',
    why: 'The dispatch time is what puts the rake and its LRs in transit. Placement and removal times calculate demurrage (DC) hours.',
    when: 'When the railway places the rake for loading, when it is removed, and when it leaves Jalgaon.',
    roles: ['OP', 'BU'],
    upstream: ['ops/vp-loading', 'rail/mrrr'],
    downstream: ['rail/status', 'rail/dcwc', 'rail/destination'],
    before: 'The schedule is final and wagons are loaded on VP Loading.',
    after: 'The rake becomes In Transit; post position updates on Rake Status and enter demurrage on Demurrage & Wharfage.',
    prerequisites: ['Schedule marked "Schedule is final" (only final schedules are listed).'],
    actions: [
      'Pick the schedule (the list shows final schedules).',
      'Enter Arrival, Placement – 1st rake, Removal – 1st rake and, if the rake was placed twice, Placement/Removal – 2nd rake.',
      'Enter the Dispatch time when the rake leaves Jalgaon.',
      'Click "Save timings".',
    ],
    records: ['schedules.src (timings, dcHrs1, dcHrs2)', 'schedules.status', 'lrs.status'],
    validations: [
      'No field is mandatory; you can save placement first and dispatch later.',
      'Saving a dispatch time on a Planned or Loading rake changes it to In Transit.',
      'At the same time every LR on the rake with status Loaded or At Rail Head changes to Rake In Transit.',
      'DC hours = hours between placement and removal minus 5 free hours, per placement, never below 0.',
    ],
    mistakes: [
      'Saving dispatch while some GRN stock is still in the godown — LRs that are only partly loaded (still At Rail Head) are also moved to Rake In Transit, so the LR shows in transit while cartons are still at Jalgaon.',
      'Typing removal time before placement time — DC hours then show 0 and demurrage is under-reported.',
      'Entering dispatch on the wrong schedule — every loaded LR on that rake changes status.',
    ],
    warnings: ['Finish all VP loading for the rake before you save the dispatch time.'],
    fields: [
      { name: 'Placement – 1st rake', help: 'Time the railway placed the rake at the siding for loading.' },
      { name: 'Removal – 1st rake', help: 'Time the railway removed it. Hours above 5 become DC hours.' },
      { name: 'Dispatch', help: 'Departure from Jalgaon. Saving it starts the transit.' },
    ],
    example: 'Placed 06:00, removed 14:00 → 8 hours − 5 free hours = 3 DC hrs shown in "DC hrs – 1st rake".',
    walkthrough: [
      { title: 'Choose the rake', body: 'Select the schedule. The four-box strip shows from/to branch and source/destination rail heads.' },
      { title: 'Enter placement and removal', body: 'Use the date-time fields. DC hours update immediately in the cards below.' },
      { title: 'Check loading is complete', body: 'Before dispatch, confirm on VP Loading that no GRN stock for this rake is pending.' },
      { title: 'Enter dispatch and save', body: 'A blue note warns that saving dispatch marks the rake In Transit and moves loaded LRs to Rake In Transit.' },
    ],
    related: ['rail/dcwc', 'rail/status', 'ops/vp-loading'],
    audio: [
      'यह screen Jalgaon rail head पर rake का समय लिखने के लिए है।',
      'Placement और removal का समय डालिए। पाँच घंटे free हैं, उसके ऊपर के घंटे DC hours बनते हैं।',
      'Dispatch time save करते ही rake In Transit हो जाता है।',
      'उसी समय rake के सारे loaded LR भी Rake In Transit हो जाते हैं।',
      'इसलिए dispatch से पहले देख लीजिए कि godown में इस rake का कोई माल बाकी तो नहीं।',
    ],
    quiz: ['q.rail.dispatch-effect', 'q.rail.dispatch-partial', 'q.rail.dc-hours'],
    minutes: 4,
  },

  // ---------------- Rake at Branch (destination) ----------------
  {
    id: 'rail/destination',
    module: 'rail',
    title: 'Rake at Branch (destination)',
    purpose: 'Record arrival, placement, removal, release, reached and unloading-complete times at the destination rail head (Guwahati or Kolkata).',
    why: 'Saving the arrival marks the rake Arrived, and placement/removal times give destination demurrage hours.',
    when: 'When the rake reaches the destination rail head and while it is placed for unloading.',
    roles: ['OP', 'BU'],
    upstream: ['rail/source', 'rail/status'],
    downstream: ['ops/dgrn', 'rail/dcwc'],
    before: 'The rake was dispatched from Jalgaon (status In Transit).',
    after: 'Unload each parcel van on DGRN at Branch.',
    prerequisites: ['Rake status In Transit, Arrived, Unloading or Completed (others are not listed).'],
    actions: [
      'Pick the schedule.',
      'Enter Arrival, Placement/Removal for 1st and 2nd rake, Release / dispatch, Reached destination and Unloading complete.',
      'Click "Save timings".',
    ],
    records: ['schedules.dst', 'schedules.status'],
    validations: [
      'Saving an arrival time on an In Transit rake changes it to Arrived.',
      '"Unloading complete" is stored as a time only; it does not close the rake. Close the rake from VP Scheduling.',
      'DC hours use the same 5-hour free time per placement as the rail head.',
    ],
    mistakes: [
      'Starting DGRN without recording arrival — the DGRN screen also lists In Transit rakes, so the arrival time can be skipped by mistake and the rake jumps from In Transit to Unloading.',
      'Expecting "Unloading complete" to finish the rake — it stays Unloading until someone uses Close rake.',
    ],
    example: 'RK-2026-4 reaches Kolkata at 04:10. Save Arrival → status becomes Arrived; the Kolkata team then starts DGRN per VP.',
    walkthrough: [
      { title: 'Pick the arriving rake', body: 'The default selection is a rake that is In Transit or Arrived.' },
      { title: 'Save arrival first', body: 'Enter Arrival and save. The status card shows Arrived.' },
      { title: 'Add placement and removal', body: 'Enter them as the railway places and removes the rake; DC hours appear below.' },
      { title: 'Move to DGRN', body: 'Open DGRN at Branch and unload each VP.' },
    ],
    related: ['ops/dgrn', 'rail/dcwc', 'rail/status'],
    audio: [
      'यह destination rail head की screen है — Guwahati या Kolkata।',
      'Rake पहुँचते ही Arrival time डालिए और save कीजिए। Rake Arrived हो जाता है।',
      'Placement और removal डालिए, ताकि destination का demurrage सही बने।',
      'Arrival save करने के बाद ही DGRN शुरू कीजिए, हर VP के लिए अलग।',
    ],
    quiz: ['q.rail.dgrn-after-arrival', 'q.rail.dc-hours'],
    minutes: 3,
  },

  // ---------------- Rake Status ----------------
  {
    id: 'rail/status',
    module: 'rail',
    title: 'In-transit Rake Status',
    purpose: 'Post position updates for a moving rake and optionally notify every consignee on it.',
    why: 'Customers and branches ask where the rake is. One update here is visible on the rake card, the rake 360 and the timeline.',
    when: 'Whenever the railway or the guard gives a position, at least once a day while the rake is moving.',
    roles: ['OP', 'BU'],
    upstream: ['rail/source'],
    downstream: ['rail/destination'],
    before: 'The rake was dispatched (In Transit). Loading, Arrived and Unloading rakes are also listed.',
    after: 'When the rake arrives, record arrival on Rake at Branch.',
    prerequisites: ['Rake status Loading, In Transit, Arrived or Unloading.'],
    actions: [
      'Pick the rake number.',
      'Set date and time of the position.',
      'Type the status remark, e.g. "Crossed Bilaspur Jn., running 2 hrs late".',
      'Choose "Send email to consignees" Yes or No and click "Update status".',
    ],
    records: ['schedules.statusLog'],
    validations: [
      '"Update status" stays disabled until a rake and a remark are entered.',
      'With email Yes, the recipient list shows the consignees of LRs on this rake; the ERP records an in-app notification and shows "Email sent to consignees on this rake". Actual email delivery is not done by this screen.',
    ],
    mistakes: [
      'Writing a vague remark such as "on the way" — consignees and branches need a station name and delay.',
      'Posting an update on the wrong rake — every consignee of that rake sees it if email is Yes.',
    ],
    walkthrough: [
      { title: 'Select the rake', body: 'The default is a rake that is In Transit.' },
      { title: 'Write the position', body: 'Station name, time and any delay. Set the date and time of the position, not the time you type it.' },
      { title: 'Decide on email', body: 'Choose Yes to notify consignees; the list of recipients appears below.' },
      { title: 'Post it', body: 'Click Update status. The timeline on the right shows the new entry.' },
    ],
    related: ['rail/rakes', 'rail/destination'],
    audio: [
      'Rake चल रहा है, तो उसकी position यहाँ लिखिए।',
      'Station का नाम और delay साफ़ लिखिए, जैसे — Bilaspur पार किया, दो घंटे late।',
      'Email Yes रखेंगे तो इस rake के सारे consignee की list दिखती है।',
      'Remark के बिना Update status का button नहीं चलता।',
    ],
    quiz: ['q.rail.dgrn-after-arrival', 'q.rail.lr-status-order'],
    minutes: 2,
  },

  // ---------------- Demurrage & Wharfage ----------------
  {
    id: 'rail/dcwc',
    module: 'rail',
    title: 'Demurrage & Wharfage (DC-WC)',
    purpose: 'Record demurrage (DC) for wagon detention beyond free time and wharfage (WC) for goods left on railway premises, with waiver letters, at the source and at the destination.',
    why: 'These are real railway charges. They are deducted in the rake profit (rake 360 and rail reports).',
    when: 'After the railway raises the DC letter for a rake, and again when a waiver is approved or refunded.',
    roles: ['OP', 'BU'],
    upstream: ['rail/source', 'rail/destination'],
    downstream: ['rail/rakes'],
    before: 'Placement and removal times are saved on Rake at Rail Head (source) or Rake at Branch (destination).',
    after: 'The DC-WC record is stored on the rake and used in rake profitability.',
    prerequisites: ['The rake has timings saved for the chosen side (only those rakes are listed).'],
    actions: [
      'Choose "At rail head (source)" or "At branch (destination)".',
      'Pick the schedule date.',
      'Check DC per hour (default ₹1,800 at source, ₹1,500 at destination) and Total DC hours (pre-filled from timings).',
      'Fill DC letter date, Paid by bank ledger and payment mode.',
      'Tick "Apply for waiver" to record WL sent date, approval, waiver % and refund date.',
      'Enter Wharfage charge (WC) and Welfare charge (WF), then click "Save DC-WC".',
    ],
    records: ['schedules.dcwcSrc', 'schedules.dcwcDst'],
    validations: [
      'Total DC amount = DC per hour × Total DC hours (read only).',
      'Waiver amount = DC amount × waiver % (read only).',
      'Net cost to rake = DC amount − waiver + wharfage + welfare.',
      'Saving stores the record on the rake only; it does not post a ledger voucher.',
    ],
    mistakes: [
      'Overwriting Total DC hours by hand without the railway letter — the hours should match placement/removal timings.',
      'Forgetting the waiver % after approval — the rake profit keeps showing the full demurrage.',
      'Saving on the wrong side tab — source and destination are separate records.',
    ],
    fields: [
      { name: 'DC per hour', help: 'Railway demurrage rate per wagon-detention hour.' },
      { name: 'Total DC hours', help: 'Pre-filled: hours beyond 5 free hours for each placement.' },
      { name: 'Waiver %', help: 'Part of demurrage waived by the railway in the waiver letter (WL).' },
      { name: 'Wharfage charge', help: 'Charge for goods kept on the railway platform/goods shed beyond free time.' },
    ],
    example: '4 DC hours × ₹1,800 = ₹7,200. Waiver approved at 50% → ₹3,600 waived. Net cost to rake ₹3,600 + wharfage.',
    walkthrough: [
      { title: 'Pick the side', body: 'Source = Jalgaon rail head, destination = Guwahati/Kolkata.' },
      { title: 'Confirm hours and rate', body: 'Hours come from timings. Check the rate against the railway letter.' },
      { title: 'Record payment', body: 'Letter date, paid-by bank ledger and mode.' },
      { title: 'Record waiver', body: 'Tick Apply for waiver and fill dates and % as the letter progresses.' },
      { title: 'Add wharfage and save', body: 'Enter WC and WF, check Net cost to rake, click Save DC-WC.' },
    ],
    related: ['rail/source', 'rail/destination'],
    audio: [
      'Demurrage मतलब — wagon free time से ज़्यादा रुका, उसका railway charge।',
      'हर placement पर पाँच घंटे free हैं, बाकी घंटे DC hours हैं।',
      'Wharfage मतलब — माल railway platform पर ज़्यादा देर पड़ा रहा, उसका charge।',
      'Waiver मिले तो waiver percent ज़रूर डालिए, नहीं तो rake का profit कम दिखेगा।',
      'Source और destination के records अलग हैं, सही tab चुनिए।',
    ],
    quiz: ['q.rail.demurrage-meaning', 'q.rail.wharfage-meaning', 'q.rail.dc-hours'],
    minutes: 4,
  },

  // ---------------- Wagons master ----------------
  {
    id: 'rail/wagons',
    module: 'rail',
    title: 'Wagons (master)',
    purpose: 'Master list of wagon types (VPU, VPH, BCN, NMG, BCNHL) with internal dimensions and payload.',
    why: 'VP Scheduling uses these types for the wagon mix; VP Planning and VP Loading use length × width × height and payload for CFT and weight capacity.',
    when: 'When the railway offers a new wagon type or dimensions change. Rarely used day to day.',
    roles: ['OP', 'AD'],
    upstream: [],
    downstream: ['ops/vp-schedule', 'ops/vp-planning', 'ops/vp-loading', 'rail/freight'],
    before: 'Nothing — this is a master.',
    after: 'The wagon type is available in the VP schedule "Wagon count by type" table and in the railway freight matrix.',
    prerequisites: [],
    actions: ['Add a wagon type: Wagon name, Wagon type, Description, Width, Height, Length (cm) and Payload (kg).', 'Edit dimensions or payload of an existing type.'],
    records: ['wagons'],
    validations: ['Wagon name is required.', 'Dimensions are in centimetres and payload in kilograms.'],
    mistakes: [
      'Entering dimensions in metres or feet — CFT and m³ capacity on VP Loading and VP Planning become wrong.',
      'Entering payload in tonnes (23 instead of 23000) — every VP shows almost no weight headroom.',
    ],
    example: 'VPU — Parcel Van, 2200 × 300 × 290 cm, payload 23,000 kg.',
    walkthrough: [
      { title: 'Open the list', body: 'Each row shows wagon, type, description, dimensions and payload.' },
      { title: 'Add or edit', body: 'Fill all dimensions in cm and payload in kg, then save.' },
      { title: 'Check usage', body: 'Open VP Scheduling — the new type appears in the wagon count table.' },
    ],
    related: ['rail/freight', 'ops/vp-schedule'],
    audio: [
      'यह wagon types की master list है — VPU, VPH, BCN जैसे।',
      'Length, width, height centimetre में, और payload kilogram में डालिए।',
      'VP loading पर CFT और weight इन्हीं numbers से निकलते हैं, इसलिए गलत unit बहुत नुकसान करता है।',
    ],
    quiz: ['q.rail.rake-vp-wagon'],
    minutes: 2,
  },

  // ---------------- MR / RR ----------------
  {
    id: 'rail/mrrr',
    module: 'rail',
    title: 'MR / RR numbers',
    purpose: 'Record, for each parcel van of a rake, the actual VP number, the MR/RR number, the seal number and the railway freight.',
    why: 'The RR (railway receipt) is the railway\'s document for the consignment in each VP and the MR (money receipt) proves freight was paid. The rail freight entered here is the main cost in rake profit.',
    when: 'When the railway issues RRs for the indented rake, normally around loading at Jalgaon.',
    roles: ['OP', 'BU'],
    upstream: ['ops/vp-schedule'],
    downstream: ['ops/vp-loading', 'rail/source', 'ops/dgrn'],
    before: 'A final VP schedule exists with its wagon mix.',
    after: 'The VP numbers saved here replace the schedule\'s VP list. VP Loading, DGRN and the rake diagram use these numbers.',
    prerequisites: ['Schedule marked final (only final schedules are listed).'],
    actions: [
      'Pick the schedule.',
      'Set Indent From/To date and Rake type (Indent or Lease).',
      'For each wagon row type VP no., MR/RR no. and Seal no.; check Rail freight.',
      'Click "Save MR/RR".',
    ],
    records: ['schedules.mrrr', 'schedules.vps'],
    validations: [
      'Save is blocked with "Enter VP number for every wagon" if any row has no VP number.',
      'Rail freight is pre-filled from the Railway Freight matrix for the wagon type and destination city; you can change it.',
      'Placeholder VP numbers created by a new schedule (like "VPU-1") are cleared here so you type the real number.',
    ],
    mistakes: [
      'Changing VP numbers after loading entries exist — loading entries keep the old VP number, so they no longer match a row in the rake diagram and DGRN VP list.',
      'Leaving rail freight at 0 because the route is missing in the freight matrix — rake profit is overstated.',
    ],
    warnings: ['If the schedule was created with placeholder VP numbers, save real VP numbers here before VP loading.'],
    fields: [
      { name: 'MR/RR no.', help: 'Railway receipt / money receipt number for that VP.' },
      { name: 'Seal no.', help: 'Seal fixed on the VP door after loading.' },
      { name: 'Rake type', help: 'Indent (rake requested per trip) or Lease.' },
    ],
    example: 'Row 1: VPU, VP 45213 CR, RR 8123456, seal SR40211, rail freight ₹1,42,000 (Jalgaon → Guwahati).',
    walkthrough: [
      { title: 'Pick the rake', body: 'The first schedule without MR/RR is selected by default.' },
      { title: 'Fill indent details', body: 'Dates and rake type. Total wagons comes from the schedule.' },
      { title: 'Enter each VP', body: 'VP no., MR/RR no., seal and freight for every row.' },
      { title: 'Save', body: 'Total railway freight is shown at the bottom. Save MR/RR.' },
    ],
    related: ['rail/freight', 'ops/vp-loading', 'ops/vp-schedule'],
    audio: [
      'हर parcel van के लिए railway RR देती है। उसका number, seal और freight यहाँ डालिए।',
      'हर wagon की row में VP number ज़रूरी है, नहीं तो save नहीं होगा।',
      'Rail freight, freight matrix से अपने आप आता है। railway की receipt से मिला लीजिए।',
      'यहाँ के VP numbers ही VP loading और DGRN में दिखते हैं। Loading के बाद इन्हें मत बदलिए।',
    ],
    quiz: ['q.rail.mrrr-meaning', 'q.rail.mrrr-vp-required'],
    minutes: 3,
  },

  // ---------------- Railway Freight matrix ----------------
  {
    id: 'rail/freight',
    module: 'rail',
    title: 'Railway Freight (matrix)',
    purpose: 'Master of railway freight per wagon type and route (source city → destination city).',
    why: 'MR/RR pre-fills rail freight from this matrix, and the rail freight drives rake profit.',
    when: 'When railway parcel tariffs change or a new wagon type or destination starts.',
    roles: ['OP', 'AD'],
    upstream: ['rail/wagons'],
    downstream: ['rail/mrrr'],
    before: 'The wagon type exists in the Wagons master.',
    after: 'New MR/RR entries for that wagon type and destination are pre-filled with this amount.',
    prerequisites: ['Wagon type in Wagons master.'],
    actions: ['Add a row: Wagon type, Source, Destination, Amount (₹).', 'Edit the amount when the tariff changes.'],
    records: ['railFreight'],
    validations: ['Wagon type, Source, Destination and Amount are required.', 'MR/RR looks up the amount by wagon type and the destination branch city.'],
    mistakes: [
      'Missing a wagon type/destination row — MR/RR shows ₹0 rail freight and someone must type it by hand.',
      'Editing the matrix and expecting old rakes to change — saved MR/RR rows keep the amount entered at that time.',
    ],
    example: 'VPU, Jalgaon → Guwahati, ₹1,42,000 per VP.',
    walkthrough: [
      { title: 'Find the route', body: 'Filter by wagon type and read source, destination and rate.' },
      { title: 'Add or update', body: 'Fill all four required fields and save.' },
      { title: 'Verify in MR/RR', body: 'Open MR/RR for a new rake; the rail freight column is pre-filled.' },
    ],
    related: ['rail/mrrr', 'rail/wagons'],
    audio: [
      'यह railway freight की rate list है — wagon type और route के हिसाब से।',
      'MR RR screen पर rail freight यहीं से अपने आप भरता है।',
      'नई rate आए तो यहाँ बदलिए। पुराने rake की entry नहीं बदलती।',
    ],
    quiz: ['q.rail.freight-matrix'],
    minutes: 2,
  },

  // ---------------- VP Scheduling ----------------
  {
    id: 'ops/vp-schedule',
    module: 'rail',
    title: 'VP Scheduling',
    purpose: 'Create the parcel rake schedule: date, from/to branch, source and destination rail heads, and the wagon count by type.',
    why: 'Every rail step hangs on the schedule. A final schedule unlocks MR/RR, VP Loading and Rake at Rail Head.',
    when: 'As soon as a rake is indented with the railway, usually a few days before loading.',
    roles: ['OP', 'BU'],
    upstream: ['ops/lr-new'],
    downstream: ['ops/vp-planning', 'rail/mrrr', 'ops/vp-loading', 'rail/rakes'],
    before: 'Rail LRs are being booked to Guwahati or Kolkata.',
    after: 'Mark the schedule final, then do MR/RR, load optimisation and VP loading.',
    prerequisites: ['Wagon types in the Wagons master.', 'Destination branch marked as rail head (Jalgaon, Kolkata, Guwahati).'],
    actions: [
      'Click "New schedule".',
      'Set Planning date, From/To branch, Source and Destination rail head; title is suggested automatically.',
      'Enter the count for each wagon type; Total VPs and capacity in tonnes update.',
      'Tick "Schedule is final" when the rake is confirmed.',
      'Use row actions: Open rake 360, Edit, Print loading summary, Close rake, Delete.',
    ],
    records: ['schedules'],
    validations: [
      'A new schedule gets rake number RK-<year>-<n> and status Planned.',
      'Only final schedules appear on VP Loading, MR/RR and Rake at Rail Head.',
      'Close rake is offered only when status is Arrived or Unloading; it sets Completed and locks further entries.',
      'Delete is offered only while the schedule has no loading entries.',
      'Edit is hidden on completed schedules.',
    ],
    mistakes: [
      'Forgetting to tick "Schedule is final" — the rake never appears on VP Loading or MR/RR.',
      'Ticking "Completed" in the edit form instead of using Close rake — it sets the completed flag but does not change the status to Completed.',
      'Choosing a To branch that is not a rail head — destination rail head stays on the previous value.',
    ],
    statuses: [
      { status: 'Planned', meaning: 'Created, nothing loaded yet.' },
      { status: 'Loading', meaning: 'First VP loading entry saved.' },
      { status: 'In Transit', meaning: 'Dispatch saved at Jalgaon.' },
      { status: 'Arrived', meaning: 'Arrival saved at destination.' },
      { status: 'Unloading', meaning: 'First DGRN saved.' },
      { status: 'Completed', meaning: 'Closed with Close rake.' },
    ],
    example: '12-Oct, Jalgaon → Guwahati, VPU × 4 + VPH × 2 = 6 VPs, capacity 140 t, Schedule is final ✓.',
    walkthrough: [
      { title: 'Start a schedule', body: 'Click New schedule. Default route is Jalgaon → Guwahati, three days ahead.' },
      { title: 'Set the wagon mix', body: 'Type counts per wagon type. Watch Total VPs and capacity.' },
      { title: 'Make it final', body: 'Tick Schedule is final when the railway confirms the rake, then save.' },
      { title: 'Close after unloading', body: 'When all VPs are unloaded at destination, use the Close rake row action.' },
    ],
    related: ['rail/rakes', 'rail/mrrr', 'ops/vp-loading', 'ops/vp-planning'],
    audio: [
      'हर rake की शुरुआत यहीं से होती है — VP schedule।',
      'Date, route और हर wagon type की गिनती डालिए।',
      'Railway से rake confirm हो जाए, तब Schedule is final पर tick कीजिए।',
      'Final के बिना rake, VP loading और MR RR में दिखेगा ही नहीं।',
      'Destination पर unloading पूरा हो जाए, तो Close rake से rake बंद कीजिए।',
    ],
    quiz: ['q.rail.vp-loading-final', 'q.rail.close-rake'],
    minutes: 4,
  },

  // ---------------- Vehicle Planning (load optimisation) ----------------
  {
    id: 'ops/vp-planning',
    module: 'rail',
    title: 'Vehicle Planning (load optimisation)',
    purpose: 'Check cargo against rake capacity and generate loading instruction, diagram, solution and summary reports for a VP schedule.',
    why: 'You see before loading whether the booked cargo fits the rake by volume (m³) and weight, and the supervisor gets loading instructions.',
    when: 'After rail LRs are booked to the rake\'s destination and before VP loading starts.',
    roles: ['OP', 'BU'],
    upstream: ['ops/vp-schedule', 'ops/grn'],
    downstream: ['ops/vp-loading'],
    before: 'A schedule exists and rail LRs are booked to its destination branch.',
    after: 'Use the reports at the rail head and record actual loading on VP Loading.',
    prerequisites: ['Schedule not completed.', 'At least one rail LR (Finalised, In Transit, At Rail Head or Loaded) on this schedule or unassigned to the same destination.'],
    actions: [
      'Pick the schedule.',
      'Review the cargo table: LR, goods, qty (GRN received qty if GRN exists), dimensions, volume, weight, orientation, stacking.',
      'Read the capacity bars for volume and weight.',
      'Click "Run load optimisation".',
      'Open Loading Instruction, Loading Diagram, Loading Solution or Loading Summary.',
    ],
    records: ['schedules.plan'],
    validations: [
      '"Run load optimisation" is disabled when no cargo is assigned.',
      'Capacity bars turn red when cargo volume or weight is above rake capacity.',
      'Running the optimiser saves utilisation figures and report links only. It does not load any LR or change any status.',
    ],
    mistakes: [
      'Treating the optimiser result as loading done — actual loading must be entered on VP Loading.',
      'Ignoring a red weight bar — the rake is over its payload; split cargo to the next rake.',
    ],
    walkthrough: [
      { title: 'Choose the schedule', body: 'The strip shows branches and rail heads of the rake.' },
      { title: 'Check the cargo', body: 'Each row is an LR. Click a row to open the LR.' },
      { title: 'Check capacity', body: 'Volume and weight bars compare cargo with the wagon mix.' },
      { title: 'Run and print', body: 'Run load optimisation, then open the four reports for the loading supervisor.' },
    ],
    related: ['ops/vp-loading', 'ops/vp-schedule', 'rail/wagons'],
    audio: [
      'यह screen बताती है कि booked माल rake में आएगा या नहीं।',
      'Volume और weight की bar लाल हो, तो माल ज़्यादा है।',
      'Run load optimisation से loading instruction, diagram और summary बनते हैं।',
      'ध्यान रखिए — इससे असली loading नहीं होती। Loading, VP loading screen पर ही डालनी है।',
    ],
    quiz: ['q.rail.vp-planning-advisory', 'q.rail.rake-vp-wagon'],
    minutes: 3,
  },

  // ---------------- VP Loading ----------------
  {
    id: 'ops/vp-loading',
    module: 'rail',
    title: 'VP Loading',
    purpose: 'Load GRN stock from the Jalgaon rail-head godown into parcel vans (VPs) of a final schedule, with load qty, damage, gate and loading hamali.',
    why: 'Loading entries reduce GRN pending stock, tie each LR to the rake and create loading hamali for Hamali Payments.',
    when: 'While the rake is placed at Jalgaon, for each LR loaded into each VP.',
    roles: ['OP', 'BU'],
    upstream: ['ops/grn', 'ops/vp-schedule', 'rail/mrrr', 'ops/vp-planning'],
    downstream: ['rail/source', 'fin/hamali'],
    before: 'The LR has a GRN with pending quantity, and the schedule is final.',
    after: 'When all GRN stock for the rake is loaded, save the dispatch time on Rake at Rail Head.',
    prerequisites: ['Final schedule with status Planned or Loading.', 'GRN at rail head with pending qty for an LR whose To branch = the schedule destination.'],
    actions: [
      'Pick the schedule.',
      'Select VP no. — the right panel shows total/remaining CFT and weight for that VP.',
      'Select LR no. (only LRs with GRN stock pending are listed); gate, quantities and hamali are pre-filled.',
      'Adjust Load qty and Damage per item.',
      'Set labour charge, hamal and supervisor; click "Save loading".',
    ],
    records: ['schedules.loads', 'grns.items.pending', 'lrs.scheduleId', 'lrs.status', 'schedules.status'],
    validations: [
      '"Select VP, LR and load quantity" if VP, LR or quantity is missing.',
      '"Load + damage cannot exceed pending quantity" per item.',
      'First loading entry changes a Planned schedule to Loading.',
      'The LR becomes Loaded only when all its GRN stock is loaded (pending 0); a partial load leaves it At Rail Head.',
      'The LR list shows only LRs with a GRN, pending stock, To branch equal to the rake destination and no other rake assigned.',
      'CFT/weight over capacity turns the remaining figures red but does not block saving.',
    ],
    mistakes: [
      'Looking for an LR that has no GRN — it is not listed. Generate the GRN first.',
      'Loading more than the VP holds because the red "Remaining CFT" was ignored — the save is not blocked.',
      'Deleting a loading entry after hamali was paid — the Delete entry action is hidden once hamali is paid or the rake has left.',
    ],
    warnings: ['A saved entry can be deleted only while the rake is Planned or Loading and hamali is unpaid; the quantity returns to GRN pending stock and the LR goes back to At Rail Head.'],
    fields: [
      { name: 'VP no.', help: 'Parcel van number from MR/RR (or the schedule VP list if MR/RR is not saved).' },
      { name: 'Load qty', help: 'Packages put into this VP now. Pre-filled with GRN pending qty.' },
      { name: 'Damage', help: 'Packages found damaged while loading; also reduces GRN pending.' },
      { name: 'Labour charge', help: 'Pre-filled: pending qty × VP Loading hamali rate for the goods (₹1.8 if no rate).' },
    ],
    example: 'LR JL/1043, 300 cartons pending → load 300 into VP 45213 CR. GRN pending becomes 0 and the LR becomes Loaded.',
    walkthrough: [
      { title: 'Choose the rake', body: 'Only final, not completed schedules appear.' },
      { title: 'Choose the VP', body: 'Check total and remaining CFT and weight on the right.' },
      { title: 'Choose the LR', body: 'The list shows "pending" cartons from GRN. Quantities fill in automatically.' },
      { title: 'Check qty and damage', body: 'Load + damage must not exceed pending.' },
      { title: 'Save loading', body: 'The entry appears in "Loading entries" with Hamali Pending.' },
    ],
    related: ['ops/grn', 'rail/source', 'rail/mrrr', 'fin/hamali'],
    practice: 'ex.rail.rake-load',
    audio: [
      'यहाँ godown का GRN वाला माल parcel van में चढ़ाया जाता है।',
      'पहले rake चुनिए, फिर VP। दाईं तरफ़ दिखेगा कि VP में कितनी जगह बची है।',
      'LR की list में सिर्फ़ वही LR आते हैं जिनका GRN हुआ है और माल बाकी है।',
      'Load और damage मिलाकर pending से ज़्यादा नहीं हो सकते।',
      'LR का पूरा माल चढ़ जाए, तभी LR Loaded बनता है।',
    ],
    quiz: ['q.rail.grn-before-loading', 'q.rail.load-over-pending', 'q.rail.vp-loading-final'],
    minutes: 5,
  },

  // ---------------- GRN at Rail Head ----------------
  {
    id: 'ops/grn',
    module: 'rail',
    title: 'GRN at Rail Head (Goods in)',
    purpose: 'Receive feeder trucks at the Jalgaon rail-head godown: check documents, record received and damaged quantity, settle lorry freight and unloading hamali.',
    why: 'GRN stock is the only stock that can be loaded into a VP. It also closes the feeder trip and records damage at the right point.',
    when: 'Every time a feeder truck with a rail LR is unloaded at the Jalgaon godown.',
    roles: ['OP', 'BU'],
    upstream: ['ops/lr-new'],
    downstream: ['ops/vp-loading', 'ops/vp-planning', 'fin/hamali'],
    before: 'A rail LR (mode Railway or Both) is finalised and the feeder truck has reached Jalgaon.',
    after: 'The LR becomes At Rail Head and its received qty is pending stock for VP Loading.',
    prerequisites: ['Rail LR is final, has no GRN yet and has status Finalised or In Transit.'],
    actions: [
      'Click "Generate GRN" and pick the LR arriving at the rail head.',
      'Set gate no., in/out date and time and unloading time.',
      'Enter Received and Damage per item.',
      'Check lorry freight settlement: total freight, detention, less advance, TDS, printing, damages, hamali → Net freight.',
      'Tick the documents check list (LR copy, invoice, way bill, seal, kata receipt) with remarks.',
      'Fill damage by, labour, labour count and charges, supervisor, photos and remark; click "Generate GRN".',
    ],
    records: ['grns', 'lrs.grnId', 'lrs.status', 'lrs.items.damage', 'trips (feeder trip completed)'],
    validations: [
      '"Select an LR" if no LR is chosen.',
      'If "Kata receipt" is off, the ERP asks "Kata receipt missing — Save GRN anyway?" because branch policy needs a weighbridge receipt before releasing lorry freight. Kata is off by default.',
      'GRN number GRN/JL/<n>. LR status becomes At Rail Head; the open feeder trip for the LR is completed.',
      'Pending stock = Received quantity. Received is not reduced automatically when you type damage.',
      'Detention amount = detention days × ₹1,200 (editable).',
      'Delete GRN is offered only while nothing has been loaded (pending = received); the LR goes back to In Transit.',
    ],
    mistakes: [
      'Typing Damage 3 but leaving Received at the full qty — 3 damaged cartons are counted as loadable stock.',
      'Saving without the kata receipt and releasing full lorry freight.',
      'GRN on the wrong LR after loading started — the Delete action is hidden; first remove the loading entries on VP Loading.',
    ],
    fields: [
      { name: 'Received', help: 'Good packages actually unloaded. Becomes pending stock for loading.' },
      { name: 'Damage', help: 'Damaged packages. Also set "Damage by" (Road, Labour, Accidently).' },
      { name: 'Net freight', help: 'Gross (freight + detention) minus advance, TDS, printing, damages and hamali.' },
      { name: 'Kata receipt', help: 'Weighbridge slip. Missing kata triggers a confirmation.' },
    ],
    example: 'LR JL/1052, 350 cartons, 2 crushed → Received 348, Damage 2, Damage by Road. Pending stock 348.',
    walkthrough: [
      { title: 'Open Generate GRN', body: 'Only final rail LRs without GRN are listed with consignor and truck number.' },
      { title: 'Count the goods', body: 'Enter Received and Damage for each item. Reduce Received yourself if cartons are damaged.' },
      { title: 'Settle lorry freight', body: 'Freight, advance and TDS come from the LR market details; add detention and deductions.' },
      { title: 'Check documents', body: 'Switch on each document received. Turn Kata on only if the slip is in hand.' },
      { title: 'Generate', body: 'Click Generate GRN. The LR becomes At Rail Head and the stock shows as pending loading.' },
    ],
    related: ['ops/vp-loading', 'fin/hamali', 'ops/lr'],
    practice: 'ex.rail.grn',
    audio: [
      'Jalgaon rail head पर feeder truck आए, तो माल यहाँ GRN में चढ़ता है।',
      'LR चुनिए, pieces गिनिए। Damage हो तो Damage में लिखिए और Received उतना कम कीजिए।',
      'Kata receipt हाथ में न हो, तो system पूछेगा — फिर भी save करना है क्या।',
      'GRN के बाद LR At Rail Head हो जाता है, और माल VP loading के लिए तैयार है।',
      'GRN के बिना कोई LR wagon में load नहीं हो सकता।',
    ],
    quiz: ['q.rail.grn-before-loading', 'q.rail.kata-missing', 'q.rail.grn-delete'],
    minutes: 5,
  },

  // ---------------- DGRN at Branch ----------------
  {
    id: 'ops/dgrn',
    module: 'rail',
    title: 'DGRN at Branch',
    purpose: 'Unload each parcel van at the destination rail head and record received and damaged quantity per LR.',
    why: 'DGRN stock is the branch stock that delivery challans (LDC) are made from. It also books unloading hamali.',
    when: 'At Guwahati or Kolkata, as each VP is unloaded after the rake arrives.',
    roles: ['OP', 'BU'],
    upstream: ['rail/destination', 'rail/source'],
    downstream: ['ops/dc', 'fin/hamali'],
    before: 'The rake was dispatched and its arrival saved on Rake at Branch.',
    after: 'Received quantity is "In stock" for delivery challans; LRs on the VP become At Branch.',
    prerequisites: ['Rake status In Transit, Arrived or Unloading.', 'The VP has loading entries.'],
    actions: [
      'Pick the schedule.',
      'Select VP no. (only VPs with loading entries; done VPs are labelled "DGRN done").',
      'Check Received and Damage for every LR in the VP.',
      'Set in/out date and time, damage by, labour count, supervisor, charges, labour, photos and remark.',
      'Click "Generate DGRN".',
    ],
    records: ['dgrns', 'schedules.status', 'lrs.status'],
    validations: [
      '"Select a VP with loaded consignments" if no VP or no items.',
      'DGRN number DGRN/<branch>/<n>. Rake status changes from In Transit or Arrived to Unloading.',
      'Every LR in the VP becomes At Branch.',
      'In-stock qty = Received. Labour charge is pre-filled at ₹2.1 per package; supervisor defaults to the destination branch supervisor.',
    ],
    mistakes: [
      'Generating a second DGRN for a VP already marked "DGRN done" — the ERP does not block it and branch stock is counted twice.',
      'Starting DGRN before saving arrival — the screen allows an In Transit rake, so the arrival time is lost.',
      'Leaving Received at full qty when cartons are short — the LDC can then dispatch stock that does not exist.',
    ],
    walkthrough: [
      { title: 'Pick the rake', body: 'Rakes In Transit, Arrived or Unloading are listed. Record arrival first.' },
      { title: 'Pick the VP', body: 'The Unloading progress panel shows Unloaded, Pending or empty per VP.' },
      { title: 'Count per LR', body: 'Each row is an LR in that VP. Correct Received and Damage.' },
      { title: 'Labour and remark', body: 'Supervisor, labour and charges for hamali.' },
      { title: 'Generate DGRN', body: 'The DGRN register shows the rows with In stock qty.' },
    ],
    related: ['ops/dc', 'rail/destination', 'fin/hamali'],
    practice: 'ex.rail.dgrn-dc',
    audio: [
      'Destination पर हर parcel van खाली करने के बाद यहाँ DGRN बनाइए।',
      'पहले Rake at Branch पर arrival save कीजिए, फिर DGRN।',
      'VP चुनिए। उस VP के सारे LR, उनकी quantity के साथ आ जाते हैं।',
      'जो VP DGRN done दिखे, उसका दोबारा DGRN मत बनाइए। System रोकता नहीं, stock दोगुना हो जाएगा।',
      'DGRN के बाद LR At Branch हो जाते हैं, और delivery challan बन सकता है।',
    ],
    quiz: ['q.rail.dgrn-after-arrival', 'q.rail.dgrn-before-dc'],
    minutes: 4,
  },

  // ---------------- Delivery Challans (LDC) ----------------
  {
    id: 'ops/dc',
    module: 'rail',
    title: 'Delivery Challans (LDC)',
    purpose: 'Create lorry delivery challans that move DGRN branch stock from the destination branch to consignees on market or own trucks.',
    why: 'The LDC is the delivery leg document. It carries truck, driver, freight and advance, and starts the acknowledgment → approval → payment chain.',
    when: 'After DGRN, when a truck is arranged for one or more LRs in branch stock.',
    roles: ['OP', 'BU'],
    upstream: ['ops/dgrn'],
    downstream: ['ops/ldc', 'fin/dc-approval'],
    before: 'DGRN stock exists with "In stock" quantity for the LR.',
    after: 'LRs become Out for Delivery. The branch supervisor acknowledges delivery on LDC Acknowledgment.',
    prerequisites: ['DGRN with pending (in stock) qty for the schedule.', 'A truck (unless Self delivery).'],
    actions: [
      'Click "Create LDC" and pick the schedule (only schedules with DGRN stock); optionally filter by VP.',
      'Type quantities against stock rows and click "Add items".',
      'Set Source, Destination, delivery address or tick "Self delivery (consignee pick-up)".',
      'Choose truck type Own (with trip) or Market (with transporter/broker), truck no., capacity, driver and mobile.',
      'Enter freight (matrix hint shown), advance, advance paid by, payment mode, loading date/time, supervisor, email, remark; click "Create LDC".',
      'Row actions: Open, Print LDC, Email LDC, Add remark, Create connected LDC (Open challans only).',
    ],
    records: ['dcs', 'dgrns.items.pending', 'lrs.status', 'lrs.dcIds'],
    validations: [
      '"Add items from DGRN stock" if no item is added.',
      '"Select a truck" unless Self delivery is ticked.',
      'Quantity per row is capped at the remaining in-stock qty.',
      'Challan number DC/<branch>/<n>, status Open. DGRN in-stock qty is reduced and each LR becomes Out for Delivery.',
      'Email LDC only shows a confirmation ("LDC emailed"); it is simulated.',
    ],
    mistakes: [
      'Saving with no truck for a market delivery — blocked with "Select a truck".',
      'Using "Create connected LDC" to split a load without checking quantities — the copied items are deducted from DGRN stock again.',
      'Wrong freight with no matrix hint — check Transporter rates before you type it.',
    ],
    statuses: [
      { status: 'Open', meaning: 'Challan created, truck out for delivery.' },
      { status: 'Delivered', meaning: 'Supervisor acknowledgment saved.' },
      { status: 'Approved / Rejected', meaning: 'Decision on DC Approval.' },
      { status: 'Payslip Generated', meaning: 'Included in a DC payment slip.' },
      { status: 'Paid', meaning: 'Payment slip fully paid.' },
    ],
    example: 'Guwahati branch: LR JL/1043, 300 cartons from VP 45213 CR → market truck AS01 BC 4410, freight ₹14,000, advance ₹7,000.',
    walkthrough: [
      { title: 'Pick schedule and stock', body: 'Only schedules with DGRN stock appear. Filter by VP if needed.' },
      { title: 'Add items', body: 'Type qty per LR row and click Add items. Destination and address fill from the first LR.' },
      { title: 'Choose the truck', body: 'Own (with trip) or Market (broker). Truck no. is required unless Self delivery.' },
      { title: 'Freight and advance', body: 'Enter freight and advance with ledger and mode; set loading date and supervisor.' },
      { title: 'Create LDC', body: 'The challan appears as Open; KPIs show branch stock left to deliver.' },
    ],
    related: ['ops/ldc', 'ops/dgrn', 'fin/dc-approval'],
    practice: 'ex.rail.dgrn-dc',
    audio: [
      'Branch में DGRN वाला माल consignee तक भेजने के लिए यहाँ LDC बनाइए।',
      'Schedule चुनिए, stock की rows में quantity डालिए, और Add items दबाइए।',
      'Truck ज़रूरी है — सिर्फ़ Self delivery में नहीं।',
      'LDC बनते ही LR Out for Delivery हो जाता है और branch stock कम हो जाता है।',
      'इसके बाद supervisor, collection और client की acknowledgment आती है।',
    ],
    quiz: ['q.rail.dgrn-before-dc', 'q.rail.ldc-order'],
    minutes: 5,
  },

  // ---------------- LDC Acknowledgment ----------------
  {
    id: 'ops/ldc',
    module: 'rail',
    title: 'LDC Acknowledgment',
    purpose: 'Record the three acknowledgments of a lorry delivery challan: by the branch supervisor, challan collection from the broker, and by the client.',
    why: 'The supervisor acknowledgment marks the LRs Delivered. The client acknowledgment records the POD if none exists. Finance approves the DC payment from these acknowledgments.',
    when: 'Supervisor: when the truck has delivered. Collection: when the broker returns the signed LDC. Client: when the client confirms receipt.',
    roles: ['OP', 'BU'],
    upstream: ['ops/dc'],
    downstream: ['fin/dc-approval', 'ops/pod', 'fin/billing'],
    before: 'An LDC exists (status Open).',
    after: 'With acknowledgments in place, accounts approves the challan on DC Approval.',
    prerequisites: ['Supervisor acknowledgment must exist before a challan appears on the Challan collection and Client tabs.'],
    actions: [
      'Choose the tab: Supervisor, Challan collection or Client.',
      'Pick Rake no., Truck no. or Challan no.',
      'Correct Received, Damage and Shortage per LR.',
      'Fill dates/times, detention (₹1,500/day pre-fill), parking and other expenses (supervisor/collection), damage and shortage amounts (collection/client), labour, payment mode and LDC scan (collection), complaint and suggestion (client).',
      'Click "Save acknowledgment".',
    ],
    records: ['dcs.ackSupervisor', 'dcs.ackCollection', 'dcs.ackClient', 'dcs.status', 'lrs.status', 'lrs.delivery', 'lrs.ack'],
    validations: [
      'Collection and Client tabs list only challans that already have the supervisor acknowledgment.',
      'Supervisor acknowledgment sets the challan to Delivered and each LR on it to Delivered with the delivery date and time.',
      'Client acknowledgment records a POD on each LR that has none (courier "Client LDC ack"), so To Be Billed LRs become billable.',
      '"Edit acknowledgment" is hidden once the challan is approved.',
    ],
    mistakes: [
      'Waiting for the client before doing the supervisor acknowledgment — the client tab stays empty until the supervisor acknowledgment is saved.',
      'Skipping shortage/damage amounts on collection or client — DC Approval deducts only what is recorded here, so the broker is overpaid.',
      'Entering detention days on the wrong tab — DC Approval takes detention from the collection acknowledgment first, then the supervisor one.',
    ],
    walkthrough: [
      { title: 'Supervisor first', body: 'On the Supervisor tab pick the challan, confirm quantities and delivery date/time, save.' },
      { title: 'Collect the LDC', body: 'When the broker returns the signed LDC, use Challan collection: collection date, labour, payment mode, scan.' },
      { title: 'Client confirmation', body: 'On the Client tab record unloading date/time, damage, shortage, complaint and suggestion.' },
      { title: 'Watch the chips', body: 'The status panel shows S, C, Cl and A (approval) chips in green when done.' },
    ],
    related: ['ops/dc', 'fin/dc-approval', 'ops/pod'],
    practice: 'ex.rail.dgrn-dc',
    audio: [
      'हर LDC की तीन acknowledgment होती हैं — supervisor, challan collection, और client।',
      'Supervisor की acknowledgment सबसे पहले। उसी से LR Delivered होता है।',
      'उसके बाद ही collection और client के tab में challan दिखता है।',
      'Client की acknowledgment से LR का POD भी अपने आप बन जाता है।',
      'Shortage और damage यहाँ ज़रूर लिखिए, DC approval में यही कटता है।',
    ],
    quiz: ['q.rail.ack-prereq', 'q.rail.supervisor-ack-effect', 'q.rail.client-ack-pod'],
    minutes: 5,
  },
];

// ---------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------
export const questions: Question[] = [
  {
    id: 'q.rail.grn-before-loading', module: 'rail', type: 'scenario', difficulty: 1,
    prompt: 'What do you do?',
    scenario: 'A feeder truck for rail LR JL/1052 has reached the Jalgaon godown. The rake is placed and the loading supervisor wants to load the LR into a VP now. The LR does not appear in the LR list on VP Loading.',
    options: [
      { id: 'a', text: 'Generate the GRN at rail head for the LR first; then it appears on VP Loading.' },
      { id: 'b', text: 'Add the LR to the VP schedule from VP Scheduling.' },
      { id: 'c', text: 'Run load optimisation on Vehicle Planning; that loads the LR.' },
      { id: 'd', text: 'Save the dispatch time; the LR will move with the rake.' },
    ],
    answer: 'a',
    explanation: 'VP Loading lists only LRs that have a GRN with pending stock and whose To branch matches the rake destination. No GRN means no stock to load. Generate the GRN on GRN at Rail Head.',
    screens: ['ops/vp-loading', 'ops/grn'],
  },
  {
    id: 'q.rail.kata-missing', module: 'rail', type: 'mcq', difficulty: 2,
    prompt: 'You click "Generate GRN" with the Kata receipt switch off. What happens?',
    options: [
      { id: 'a', text: 'The GRN is blocked until a kata receipt is uploaded.' },
      { id: 'b', text: 'The ERP asks "Kata receipt missing — Save GRN anyway?" and saves only if you confirm.' },
      { id: 'c', text: 'The GRN is saved and lorry freight is set to zero.' },
      { id: 'd', text: 'Nothing; kata is not checked.' },
    ],
    answer: 'b',
    explanation: 'Branch policy needs a weighbridge (kata) receipt before releasing lorry freight, so the ERP asks for confirmation. Kata is off by default — switch it on only when you have the slip.',
    screens: ['ops/grn'],
  },
  {
    id: 'q.rail.vp-loading-final', module: 'rail', type: 'tf', difficulty: 1,
    prompt: 'A VP schedule must be marked "Schedule is final" before it appears on VP Loading and MR/RR.',
    options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    answer: 't',
    explanation: 'VP Loading, MR/RR and Rake at Rail Head list only final schedules. Edit the schedule on VP Scheduling and tick "Schedule is final".',
    screens: ['ops/vp-schedule', 'ops/vp-loading', 'rail/mrrr'],
  },
  {
    id: 'q.rail.load-over-pending', module: 'rail', type: 'spot', difficulty: 2,
    prompt: 'GRN pending for LR JL/1043 is 120 cartons. Which loading entry will the ERP refuse?',
    options: [
      { id: 'a', text: 'Load 120, damage 0' },
      { id: 'b', text: 'Load 118, damage 2' },
      { id: 'c', text: 'Load 120, damage 3' },
      { id: 'd', text: 'Load 60, damage 0' },
    ],
    answer: 'c',
    explanation: 'Load + damage cannot exceed pending quantity. 120 + 3 = 123 is more than 120, so the ERP shows "Load + damage cannot exceed pending quantity". Partial loads (60) are allowed.',
    screens: ['ops/vp-loading'],
  },
  {
    id: 'q.rail.dispatch-effect', module: 'rail', type: 'mcq', difficulty: 2,
    prompt: 'On Rake at Rail Head you save a dispatch time for a rake that is Loading. What changes?',
    options: [
      { id: 'a', text: 'Only the time is stored; status changes when the rake arrives.' },
      { id: 'b', text: 'The rake becomes In Transit and its Loaded or At Rail Head LRs become Rake In Transit.' },
      { id: 'c', text: 'The rake becomes Completed.' },
      { id: 'd', text: 'The LRs become Delivered.' },
    ],
    answer: 'b',
    explanation: 'Saving dispatch on a Planned or Loading rake sets it In Transit, and every LR on that rake with status Loaded or At Rail Head is moved to Rake In Transit with a timeline event.',
    screens: ['rail/source'],
  },
  {
    id: 'q.rail.dispatch-partial', module: 'rail', type: 'scenario', difficulty: 3,
    prompt: 'What is the correct action before saving dispatch?',
    scenario: 'LR JL/1061 has 500 cartons in GRN. Only 275 were loaded on the rake; 225 are still in the godown. The railway is pulling the rake out now.',
    options: [
      { id: 'a', text: 'Save dispatch; the ERP keeps the LR At Rail Head because it is partly loaded.' },
      { id: 'b', text: 'Load the remaining cartons or plan them for the next rake before dispatch, because dispatch moves partly loaded LRs on this rake to Rake In Transit too.' },
      { id: 'c', text: 'Delete the GRN so the 225 cartons disappear.' },
      { id: 'd', text: 'Close the rake from VP Scheduling.' },
    ],
    answer: 'b',
    explanation: 'Dispatch changes every LR on the rake that is Loaded or At Rail Head to Rake In Transit. A partly loaded LR is At Rail Head, so it would show in transit while 225 cartons are still at Jalgaon. Finish loading first.',
    screens: ['rail/source', 'ops/vp-loading'],
  },
  {
    id: 'q.rail.dgrn-after-arrival', module: 'rail', type: 'next', difficulty: 1,
    prompt: 'The latest Rake Status update says the rake has reached Guwahati. What is the next step in the ERP?',
    options: [
      { id: 'a', text: 'Create the delivery challan.' },
      { id: 'b', text: 'Save the arrival time on Rake at Branch, then make a DGRN for each VP as it is unloaded.' },
      { id: 'c', text: 'Close the rake.' },
      { id: 'd', text: 'Record POD.' },
    ],
    answer: 'b',
    explanation: 'Arrival on Rake at Branch moves the rake from In Transit to Arrived. DGRN per VP then creates branch stock. A delivery challan can only take DGRN stock.',
    screens: ['rail/destination', 'ops/dgrn', 'rail/status'],
  },
  {
    id: 'q.rail.dgrn-before-dc', module: 'rail', type: 'tf', difficulty: 1,
    prompt: 'A delivery challan (LDC) can only take quantities from DGRN stock that is still in stock at the branch.',
    options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    answer: 't',
    explanation: 'Create LDC lists only schedules with DGRN in-stock quantity, caps each qty at the remaining stock and blocks saving with "Add items from DGRN stock" if no item is added.',
    screens: ['ops/dc', 'ops/dgrn'],
  },
  {
    id: 'q.rail.ldc-order', module: 'rail', type: 'order', difficulty: 2,
    prompt: 'Put the delivery-leg steps in the order the ERP allows.',
    items: [
      { id: 'dc', text: 'Create LDC from DGRN stock' },
      { id: 'sup', text: 'Supervisor acknowledgment' },
      { id: 'cl', text: 'Challan collection / client acknowledgment' },
      { id: 'appr', text: 'DC approval for payment' },
      { id: 'ps', text: 'DC payment slip' },
      { id: 'pay', text: 'DC payment entry' },
    ],
    answer: ['dc', 'sup', 'cl', 'appr', 'ps', 'pay'],
    explanation: 'Collection and client tabs need the supervisor acknowledgment. DC Approval lists challans with a supervisor acknowledgment. Payment slips take only approved challans, and payment is recorded against the slip.',
    screens: ['ops/dc', 'ops/ldc', 'fin/dc-approval', 'fin/dc-payslip'],
  },
  {
    id: 'q.rail.ack-prereq', module: 'rail', type: 'mcq', difficulty: 2,
    prompt: 'The broker has returned a signed LDC, but the challan is not in the Challan collection tab. Why?',
    options: [
      { id: 'a', text: 'The supervisor acknowledgment has not been saved yet.' },
      { id: 'b', text: 'DC approval is pending.' },
      { id: 'c', text: 'The client has not acknowledged yet.' },
      { id: 'd', text: 'The challan was not emailed.' },
    ],
    answer: 'a',
    explanation: 'Challan collection and Client tabs show only challans that already have the supervisor acknowledgment. Save that first on the Supervisor tab.',
    screens: ['ops/ldc'],
  },
  {
    id: 'q.rail.dc-approval-gate', module: 'rail', type: 'scenario', difficulty: 3,
    prompt: 'What should the accountant do?',
    scenario: 'On DC Approval, challan DC/GH/88 shows chip S in green but C and Cl grey. A yellow note says "Collection or client acknowledgment is still pending. Approving now relies on the supervisor acknowledgment only."',
    options: [
      { id: 'a', text: 'Approve now; the ERP will deduct shortage later automatically.' },
      { id: 'b', text: 'Wait for the collection and client acknowledgments (filter "All acks received"), because shortage and damage amounts come only from those.' },
      { id: 'c', text: 'Reject it so it comes back after the acknowledgments.' },
      { id: 'd', text: 'Generate the payment slip directly.' },
    ],
    answer: 'b',
    explanation: 'The ERP allows approval with only the supervisor acknowledgment but warns you. Shortage and damage deductions come from the collection and client acknowledgments, so approving early can overpay the broker. A rejected challan leaves the approval list and is not offered again.',
    screens: ['fin/dc-approval', 'ops/ldc'],
  },
  {
    id: 'q.rail.dc-payable', module: 'rail', type: 'mcq', difficulty: 3,
    prompt: 'Freight ₹14,000, advance ₹7,000, parking ₹200, labour ₹300, detention ₹0, other ₹0, shortage ₹800, damage ₹0. What freight payable does DC Approval show?',
    options: [
      { id: 'a', text: '₹7,000 (freight − advance only)' },
      { id: 'b', text: '₹7,500 (shortage not deducted)' },
      { id: 'c', text: '₹6,700' },
      { id: 'd', text: '₹6,200 (parking and labour also deducted)' },
    ],
    answer: 'c',
    explanation: 'Payable = freight − advance + detention + parking + other + labour − shortage − damage = 14,000 − 7,000 + 0 + 200 + 0 + 300 − 800 − 0 = ₹6,700. Parking, labour and detention are added; shortage and damage are deducted.',
    screens: ['fin/dc-approval'],
  },
  {
    id: 'q.rail.demurrage-meaning', module: 'rail', type: 'mcq', difficulty: 1,
    prompt: 'What is demurrage (DC) on the Demurrage & Wharfage screen?',
    options: [
      { id: 'a', text: 'Railway charge for keeping wagons placed beyond the free time; the ERP allows 5 free hours per placement.' },
      { id: 'b', text: 'Truck detention at the consignee.' },
      { id: 'c', text: 'Charge for goods left on the railway platform.' },
      { id: 'd', text: 'Freight paid to the railway for each VP.' },
    ],
    answer: 'a',
    explanation: 'DC hours = (removal − placement) − 5 free hours for each placement. Total DC amount = DC per hour × DC hours. Goods on the platform are wharfage; freight per VP is in MR/RR.',
    screens: ['rail/dcwc', 'rail/source'],
  },
  {
    id: 'q.rail.wharfage-meaning', module: 'rail', type: 'mcq', difficulty: 1,
    prompt: 'Which charge is wharfage (WC)?',
    options: [
      { id: 'a', text: 'Charge for goods kept on railway premises (platform/goods shed) beyond free time.' },
      { id: 'b', text: 'Charge for unloading labour at the branch.' },
      { id: 'c', text: 'Railway freight for a High Capacity Parcel Van.' },
      { id: 'd', text: 'Detention paid to a broker.' },
    ],
    answer: 'a',
    explanation: 'Wharfage is for goods left on railway premises. It is entered with WC paid by and mode, and it adds to the net cost to the rake.',
    screens: ['rail/dcwc'],
  },
  {
    id: 'q.rail.dc-hours', module: 'rail', type: 'mcq', difficulty: 2,
    prompt: 'At Jalgaon the rake was placed at 06:00 and removed at 14:00 the same day, with no 2nd placement. Default source rate ₹1,800/hr. What DC amount does the ERP calculate?',
    options: [
      { id: 'a', text: '8 h × ₹1,800 = ₹14,400' },
      { id: 'b', text: '3 h × ₹1,800 = ₹5,400' },
      { id: 'c', text: '5 h × ₹1,800 = ₹9,000' },
      { id: 'd', text: '₹0, because demurrage is only at destination' },
    ],
    answer: 'b',
    explanation: '8 hours placed − 5 free hours = 3 DC hours. 3 × ₹1,800 = ₹5,400. The destination default rate is ₹1,500/hr.',
    screens: ['rail/source', 'rail/destination', 'rail/dcwc'],
  },
  {
    id: 'q.rail.mrrr-meaning', module: 'rail', type: 'mcq', difficulty: 1,
    prompt: 'What do you record on the MR / RR screen for each wagon row?',
    options: [
      { id: 'a', text: 'VP no., MR/RR (railway receipt / money receipt) no., seal no. and railway freight.' },
      { id: 'b', text: 'LR numbers and consignee names.' },
      { id: 'c', text: 'Loading hamali and supervisor.' },
      { id: 'd', text: 'Demurrage hours.' },
    ],
    answer: 'a',
    explanation: 'MR/RR stores the railway documents per VP. The VP numbers saved here become the rake\'s VP list used by VP Loading and DGRN; rail freight drives rake profit.',
    screens: ['rail/mrrr'],
  },
  {
    id: 'q.rail.mrrr-vp-required', module: 'rail', type: 'spot', difficulty: 2,
    prompt: 'Which MR/RR entry makes "Save MR/RR" fail?',
    options: [
      { id: 'a', text: 'Row with VP no. filled but seal no. empty' },
      { id: 'b', text: 'Row with VP no. empty' },
      { id: 'c', text: 'Row with rail freight changed from the matrix value' },
      { id: 'd', text: 'Rake type set to Lease' },
    ],
    answer: 'b',
    explanation: 'Save is blocked with "Enter VP number for every wagon". Seal, MR/RR number and freight are not mandatory, and freight can be edited.',
    screens: ['rail/mrrr'],
  },
  {
    id: 'q.rail.rake-vp-wagon', module: 'rail', type: 'mcq', difficulty: 1,
    prompt: 'Which statement matches how the ERP uses rake, VP and wagon type?',
    options: [
      { id: 'a', text: 'A rake (VP schedule, RK-…) is the train of parcel vans; each VP is one van with its own number; the wagon type (VPU, VPH…) gives its size and payload.' },
      { id: 'b', text: 'A VP is a truck used for the feeder leg.' },
      { id: 'c', text: 'A wagon type is the rake number.' },
      { id: 'd', text: 'Each LR gets its own rake.' },
    ],
    answer: 'a',
    explanation: 'The schedule is the rake. Its wagon mix (type × count) creates the VP list; MR/RR records each real VP number. Capacity per VP comes from the Wagons master.',
    screens: ['rail/rakes', 'rail/wagons', 'ops/vp-planning'],
  },
  {
    id: 'q.rail.lr-status-order', module: 'rail', type: 'order', difficulty: 2,
    prompt: 'Put the rail LR statuses in the order the ERP sets them.',
    items: [
      { id: 'arh', text: 'At Rail Head (GRN)' },
      { id: 'ld', text: 'Loaded (all GRN stock in VPs)' },
      { id: 'rit', text: 'Rake In Transit (dispatch saved)' },
      { id: 'ab', text: 'At Branch (DGRN)' },
      { id: 'ofd', text: 'Out for Delivery (LDC)' },
      { id: 'del', text: 'Delivered (supervisor acknowledgment)' },
    ],
    answer: ['arh', 'ld', 'rit', 'ab', 'ofd', 'del'],
    explanation: 'GRN sets At Rail Head, full VP loading sets Loaded, rake dispatch sets Rake In Transit, DGRN sets At Branch, the LDC sets Out for Delivery and the supervisor LDC acknowledgment sets Delivered.',
    screens: ['rail/rakes', 'rail/status', 'ops/grn', 'ops/dgrn'],
  },
  {
    id: 'q.rail.vp-planning-advisory', module: 'rail', type: 'tf', difficulty: 1,
    prompt: '"Run load optimisation" on Vehicle Planning loads the LRs into parcel vans and changes their status to Loaded.',
    options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    answer: 'f',
    explanation: 'The optimiser saves utilisation figures and four reports (instruction, diagram, solution, summary). Actual loading is entered on VP Loading, which reduces GRN stock and changes LR status.',
    screens: ['ops/vp-planning', 'ops/vp-loading'],
  },
  {
    id: 'q.rail.close-rake', module: 'rail', type: 'next', difficulty: 2,
    prompt: 'All VPs of RK-2026-3 have DGRNs and "Unloading complete" is saved on Rake at Branch. The rake still shows Unloading. What next?',
    options: [
      { id: 'a', text: 'Nothing; it will complete automatically.' },
      { id: 'b', text: 'Use "Close rake" on VP Scheduling; it sets Completed and locks further loading/unloading entries.' },
      { id: 'c', text: 'Delete the schedule.' },
      { id: 'd', text: 'Save a new dispatch time.' },
    ],
    answer: 'b',
    explanation: '"Unloading complete" is only a time. Close rake is offered on VP Scheduling when the rake is Arrived or Unloading, and sets the status to Completed.',
    screens: ['ops/vp-schedule', 'rail/destination'],
  },
  {
    id: 'q.rail.grn-delete', module: 'rail', type: 'scenario', difficulty: 3,
    prompt: 'How do you correct it?',
    scenario: 'A GRN was made on the wrong LR, and 100 of its 300 cartons are already loaded on VP 45213 CR. The "Delete GRN" action is not visible.',
    options: [
      { id: 'a', text: 'Delete the loading entry on VP Loading first (stock returns to GRN pending); when pending equals received again, Delete GRN appears.' },
      { id: 'b', text: 'Edit the GRN and change the LR.' },
      { id: 'c', text: 'Delete the VP schedule.' },
      { id: 'd', text: 'Ask accounts to cancel the GRN in Finance.' },
    ],
    answer: 'a',
    explanation: 'Delete GRN is shown only while nothing is loaded (pending = received). Removing the loading entry returns the qty to GRN pending. Loading entries can be deleted only while the rake is Planned or Loading and hamali is unpaid.',
    screens: ['ops/grn', 'ops/vp-loading'],
  },
  {
    id: 'q.rail.freight-matrix', module: 'rail', type: 'mcq', difficulty: 1,
    prompt: 'MR/RR shows ₹0 rail freight for a BCN wagon to Kolkata. What is the likely cause?',
    options: [
      { id: 'a', text: 'No Railway Freight row exists for BCN to the Kolkata city.' },
      { id: 'b', text: 'The schedule is not final.' },
      { id: 'c', text: 'The rake has not been dispatched.' },
      { id: 'd', text: 'The GRN is missing.' },
    ],
    answer: 'a',
    explanation: 'MR/RR pre-fills rail freight from the Railway Freight matrix by wagon type and destination branch city. Add the route on Railway Freight or type the amount from the railway receipt.',
    screens: ['rail/freight', 'rail/mrrr'],
  },
  {
    id: 'q.rail.supervisor-ack-effect', module: 'rail', type: 'mcq', difficulty: 2,
    prompt: 'What does saving the Supervisor acknowledgment of an LDC change?',
    options: [
      { id: 'a', text: 'The challan becomes Delivered and each LR on it becomes Delivered with the delivery date and time.' },
      { id: 'b', text: 'The challan becomes Approved.' },
      { id: 'c', text: 'A payment slip is generated.' },
      { id: 'd', text: 'Only a remark is stored.' },
    ],
    answer: 'a',
    explanation: 'The supervisor acknowledgment is the delivery confirmation for rail LRs. It also makes the challan available on the Collection and Client tabs and on DC Approval.',
    screens: ['ops/ldc'],
  },
  {
    id: 'q.rail.client-ack-pod', module: 'rail', type: 'mcq', difficulty: 2,
    prompt: 'A To Be Billed rail LR is Delivered, but billing shows it under "Waiting for POD". Which LDC step records its POD automatically?',
    options: [
      { id: 'a', text: 'Client acknowledgment on LDC Acknowledgment.' },
      { id: 'b', text: 'Printing the LDC.' },
      { id: 'c', text: 'DC payment slip.' },
      { id: 'd', text: 'Rake status update.' },
    ],
    answer: 'a',
    explanation: 'Client acknowledgment writes a POD (courier "Client LDC ack") on each LR of the challan that has no POD yet. The LR then appears in Billing, unless you record the POD on POD / Acknowledgment instead.',
    screens: ['ops/ldc', 'ops/pod', 'fin/billing'],
  },
];

// ---------------------------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------------------------
const RAIL_WATCH = ['lrs', 'grns', 'dgrns', 'dcs', 'schedules', 'trips'];

export const exercises: Exercise[] = [
  {
    id: 'ex.rail.grn',
    title: 'Goods in at the Jalgaon rail head (GRN)',
    module: 'rail',
    roles: ['OP', 'BU'],
    summary: 'A feeder truck has reached Jalgaon with a rail LR booked to Guwahati. Count the goods, record 2 crushed cartons and generate the GRN.',
    minutes: 8,
    watch: RAIL_WATCH,
    steps: [
      {
        id: 'grn',
        task: 'Open GRN at Rail Head, click "Generate GRN" and pick a rail LR from the list (sample data has LRs for the Planned Guwahati rake). Generate the GRN. If asked about the missing kata receipt, switch Kata on or confirm.',
        expected: 'A new GRN GRN/JL/… for a rail LR, and the LR is At Rail Head.',
        screen: 'ops/grn',
        check: (db, base) => {
          const g = newRailGRNs(db, base);
          if (!g.length) return notYet('No new GRN for a rail LR yet');
          const lr = list(db, 'lrs').find((l) => l.id === g[0].lrId);
          return lr?.status === 'At Rail Head' ? pass(`${g[0].grnNo} for LR ${lr.lrNo} — LR is At Rail Head`) : notYet(`${g[0].grnNo} saved, LR status is ${lr?.status}`);
        },
      },
      {
        id: 'damage',
        task: 'In the GRN, record 2 damaged cartons: Damage = 2, Received = total − 2, Damage by = Road. (If you already saved without damage, delete that GRN — allowed while nothing is loaded — and make it again.)',
        expected: 'The new GRN has damage 2 and received = total − 2, so only good cartons become pending stock.',
        screen: 'ops/grn',
        check: (db, base) => {
          const g = newRailGRNs(db, base).find((x) => (x.items || []).some((i: any) => Number(i.damage) > 0));
          if (!g) return notYet('No new GRN with damage recorded');
          const it = g.items.find((i: any) => Number(i.damage) > 0);
          if (Number(it.received) + Number(it.damage) > Number(it.total)) return notYet(`${g.grnNo}: damage ${it.damage} recorded but Received is still ${it.received} of ${it.total} — reduce Received`);
          return pass(`${g.grnNo}: received ${it.received}, damage ${it.damage} of ${it.total}`);
        },
      },
    ],
  },
  {
    id: 'ex.rail.rake-load',
    title: 'Load and dispatch a rake',
    module: 'rail',
    roles: ['OP', 'BU'],
    summary: 'The Guwahati rake that is Loading at Jalgaon still has GRN stock in the godown. Load an LR fully into a VP, dispatch the rake and post its first status update.',
    minutes: 12,
    watch: RAIL_WATCH,
    steps: [
      {
        id: 'load',
        task: 'Open VP Loading. Pick the Guwahati rake with status Loading, select a VP and an LR with pending GRN stock, keep Load qty = pending and click "Save loading". Repeat for every LR that still has pending stock.',
        expected: 'Loading entries saved; an LR whose GRN stock is fully loaded becomes Loaded.',
        screen: 'ops/vp-loading',
        check: (db, base) => {
          // LR status moves on to Rake In Transit after dispatch, so judge "fully loaded" by GRN pending stock.
          const lds = newLoads(db, base);
          if (!lds.length) return notYet('No loading entry saved yet');
          const full = [...new Set(lds.map((ld: any) => ld.lrId as string))].filter((id) => { const g = list(db, 'grns').find((x) => x.lrId === id); return !!g && (g.items || []).every((i: any) => Number(i.pending) <= 0); });
          if (full.length) return pass(`${full.map((id) => lrNo(db, id)).join(', ')} fully loaded — GRN pending 0`);
          return notYet(`${lds.length} loading entr${lds.length > 1 ? 'ies' : 'y'} saved, but no LR is fully loaded yet — load the full pending qty`);
        },
      },
      {
        id: 'dispatch',
        task: 'Open Rake at Rail Head, pick the same rake, enter Removal – 1st rake and Dispatch times and click "Save timings".',
        expected: 'The rake changes from Loading to In Transit and its loaded LRs become Rake In Transit.',
        screen: 'rail/source',
        check: (db, base) => {
          const s = changed(db, base, 'schedules', (r, old) => r.status === 'In Transit' && (old === 'Loading' || old === 'Planned'));
          if (!s.length) return notYet('No rake dispatched yet');
          const n = list(db, 'lrs').filter((l) => l.scheduleId === s[0].id && l.status === 'Rake In Transit').length;
          return pass(`${s[0].rakeNo} is In Transit with ${n} LR(s) Rake In Transit`);
        },
      },
      {
        id: 'status',
        task: 'Open Rake Status, pick the rake you dispatched, type a position such as "Departed Jalgaon, path via Bhusawal" and click "Update status".',
        expected: 'The rake\'s timeline shows the first status entry.',
        screen: 'rail/status',
        check: (db, base) => {
          const s = fieldChanged(db, base, 'schedules', 'statusLog', (r) => Array.isArray(r.statusLog) && r.statusLog.length > 0 && r.status === 'In Transit');
          if (s.length) return pass(`${s[0].rakeNo}: "${s[0].statusLog[s[0].statusLog.length - 1].remark}"`);
          return notYet('No status update on the dispatched rake yet');
        },
      },
    ],
  },
  {
    id: 'ex.rail.dgrn-dc',
    title: 'Unload at branch (DGRN) and make a delivery challan',
    module: 'rail',
    roles: ['OP', 'BU'],
    summary: 'The Kolkata rake is in transit. Record its arrival, unload one VP with a DGRN, put that stock on a delivery challan and confirm delivery with the supervisor acknowledgment.',
    minutes: 15,
    watch: RAIL_WATCH,
    steps: [
      {
        id: 'arrival',
        task: 'Open Rake at Branch, pick the Kolkata rake that is In Transit, enter the Arrival time and click "Save timings".',
        expected: 'The rake changes from In Transit to Arrived.',
        screen: 'rail/destination',
        check: (db, base) => {
          const s = changed(db, base, 'schedules', (r, old) => old === 'In Transit' && atLeast(RAKE_FLOW, r.status, 'Arrived') && !!r.dst?.arrival);
          return s.length ? pass(`${s[0].rakeNo} arrival saved — status ${s[0].status}`) : notYet('No arrival saved on an in-transit rake yet');
        },
      },
      {
        id: 'dgrn',
        task: 'Open DGRN at Branch, pick the same rake, select a VP, check Received and Damage for each LR and click "Generate DGRN".',
        expected: 'A new DGRN DGRN/KL/…; the rake becomes Unloading and the LRs in that VP become At Branch.',
        screen: 'ops/dgrn',
        check: (db, base) => {
          const g = created(db, base, 'dgrns');
          if (!g.length) return notYet('No DGRN generated yet');
          const lrs = [...new Set((g[0].items || []).map((i: any) => lrNo(db, i.lrId)))];
          return pass(`${g[0].dgrnNo} for VP ${g[0].vpNo} (${lrs.join(', ')})`);
        },
      },
      {
        id: 'ldc',
        task: 'Open Delivery Challans, click "Create LDC", pick the same schedule, type quantities for the stock from your DGRN, click "Add items", choose a Market truck and click "Create LDC".',
        expected: 'A new challan DC/… with status Open; DGRN stock reduced and the LR is Out for Delivery.',
        screen: 'ops/dc',
        check: (db, base) => {
          const myDgrns = new Set(created(db, base, 'dgrns').map((g) => g.id));
          const dc = created(db, base, 'dcs', (d) => (d.items || []).some((i: any) => myDgrns.has(i.dgrnId)));
          if (dc.length) return pass(`${dc[0].dcNo} created with ${dc[0].items.length} item(s) from your DGRN`);
          const other = created(db, base, 'dcs');
          return other.length ? notYet(`${other[0].dcNo} was created, but not from the DGRN you made in this exercise`) : notYet('No delivery challan created yet');
        },
      },
      {
        id: 'ack',
        task: 'Open LDC Acknowledgment, Supervisor tab, pick your new challan, confirm received quantity and delivery date/time and click "Save acknowledgment".',
        expected: 'The challan becomes Delivered and its LRs become Delivered.',
        screen: 'ops/ldc',
        check: (db, base) => {
          const mine = new Set(created(db, base, 'dcs').map((d) => d.id));
          const d = list(db, 'dcs').find((x) => mine.has(x.id) && x.ackSupervisor);
          return d ? pass(`${d.dcNo} acknowledged by supervisor — ${d.status}`) : notYet('Supervisor acknowledgment not saved on your new challan');
        },
      },
    ],
  },
  {
    id: 'ex.rail.e2e',
    title: 'Rail consignment end to end',
    module: 'rail',
    roles: ['OP', 'BU', 'AC'],
    summary: 'Take one rail LR booked on the Planned Guwahati rake from goods-in at Jalgaon to DC approval: GRN, final schedule, VP loading, MR/RR, dispatch, arrival, DGRN, LDC, acknowledgments and approval.',
    minutes: 35,
    workflow: true,
    watch: RAIL_WATCH,
    steps: [
      {
        id: 'grn',
        task: 'GRN at Rail Head: generate a GRN for a rail LR of the Planned Guwahati rake (the LR list shows its two LRs). Remember the LR number — you will follow it to the end.',
        expected: 'New GRN; the LR is At Rail Head.',
        screen: 'ops/grn',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          return lr ? pass(`GRN for ${lr.lrNo} — LR ${lr.status}`) : notYet('No new GRN for a rail LR yet');
        },
      },
      {
        id: 'final',
        task: 'VP Scheduling: edit the rake of that LR (Planned, Guwahati), tick "Schedule is final" and save.',
        expected: 'The schedule is final and appears on VP Loading and MR/RR.',
        screen: 'ops/vp-schedule',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          const s = lr?.scheduleId ? sched(db, lr.scheduleId) : undefined;
          if (s?.isFinal) return pass(`${s.rakeNo} is final${before(base, 'schedules', s.id)?.isFinal ? ' (was already final)' : ''}`);
          const f = fieldChanged(db, base, 'schedules', 'isFinal', (r) => r.isFinal === true);
          if (f.length && !lr?.scheduleId) return pass(`${f[0].rakeNo} marked final`);
          return notYet(s ? `${s.rakeNo} is not final yet` : 'Do the GRN step first');
        },
      },
      {
        id: 'load',
        task: 'VP Loading: pick that rake, choose a VP, choose your LR and load the full pending quantity. Save loading.',
        expected: 'GRN pending 0 and the LR is Loaded.',
        screen: 'ops/vp-loading',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          if (!lr) return notYet('Do the GRN step first');
          return atLeast(LR_FLOW, lr.status, 'Loaded') ? pass(`${lr.lrNo} is ${lr.status}`) : notYet(`${lr.lrNo} is ${lr.status} — load the full pending quantity`);
        },
      },
      {
        id: 'mrrr',
        task: 'MR / RR: pick the rake, keep the VP numbers, type MR/RR and seal numbers, check rail freight and click "Save MR/RR".',
        expected: 'MR/RR saved on the rake.',
        screen: 'rail/mrrr',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          const s = lr?.scheduleId ? sched(db, lr.scheduleId) : undefined;
          if (!s) return notYet('Do the GRN and loading steps first');
          return s.mrrr && !before(base, 'schedules', s.id)?.mrrr ? pass(`MR/RR saved for ${s.rakeNo} (${s.mrrr.rows?.length || 0} wagons)`) : s.mrrr ? pass(`${s.rakeNo} has MR/RR`) : notYet(`No MR/RR on ${s.rakeNo} yet`);
        },
      },
      {
        id: 'dispatch',
        task: 'Rake at Rail Head: enter placement, removal and Dispatch for the rake and save timings.',
        expected: 'Rake In Transit; your LR is Rake In Transit.',
        screen: 'rail/source',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          const s = lr?.scheduleId ? sched(db, lr.scheduleId) : undefined;
          if (!s) return notYet('Do the earlier steps first');
          return atLeast(RAKE_FLOW, s.status, 'In Transit') && s.src?.dispatch ? pass(`${s.rakeNo} dispatched — ${lr.lrNo} ${lr.status}`) : notYet(`${s.rakeNo} is ${s.status}`);
        },
      },
      {
        id: 'arrival',
        task: 'Rake at Branch: pick the rake and save its Arrival time at Guwahati.',
        expected: 'Rake Arrived.',
        screen: 'rail/destination',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          const s = lr?.scheduleId ? sched(db, lr.scheduleId) : undefined;
          if (!s) return notYet('Do the earlier steps first');
          return s.dst?.arrival && atLeast(RAKE_FLOW, s.status, 'Arrived') ? pass(`${s.rakeNo} arrival saved — ${s.status}`) : notYet(`No arrival saved on ${s.rakeNo}`);
        },
      },
      {
        id: 'dgrn',
        task: 'DGRN at Branch: pick the rake, select the VP your LR was loaded in and generate the DGRN.',
        expected: 'New DGRN with your LR; the LR is At Branch.',
        screen: 'ops/dgrn',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          if (!lr) return notYet('Do the GRN step first');
          const g = created(db, base, 'dgrns', (x) => (x.items || []).some((i: any) => i.lrId === lr.id));
          return g.length ? pass(`${g[0].dgrnNo} (VP ${g[0].vpNo}) — ${lr.lrNo} ${lr.status}`) : notYet(`No DGRN with ${lr.lrNo} yet`);
        },
      },
      {
        id: 'ldc',
        task: 'Delivery Challans: create an LDC for your LR from the DGRN stock with a market truck.',
        expected: 'New challan Open; the LR is Out for Delivery.',
        screen: 'ops/dc',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          if (!lr) return notYet('Do the GRN step first');
          const d = created(db, base, 'dcs', (x) => (x.items || []).some((i: any) => i.lrId === lr.id));
          return d.length ? pass(`${d[0].dcNo} for ${lr.lrNo}`) : notYet(`No delivery challan for ${lr.lrNo} yet`);
        },
      },
      {
        id: 'ack-sup',
        task: 'LDC Acknowledgment → Supervisor: acknowledge your challan with the delivery date and time.',
        expected: 'Challan Delivered; LR Delivered.',
        screen: 'ops/ldc',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          if (!lr) return notYet('Do the GRN step first');
          const d = created(db, base, 'dcs', (x) => (x.items || []).some((i: any) => i.lrId === lr.id) && !!x.ackSupervisor);
          return d.length ? pass(`${d[0].dcNo} acknowledged — ${lr.lrNo} ${lr.status}`) : notYet('Supervisor acknowledgment not saved yet');
        },
      },
      {
        id: 'ack-client',
        task: 'LDC Acknowledgment → Challan collection, then Client: save both acknowledgments for your challan (enter shortage or damage amounts if any).',
        expected: 'Collection and client acknowledgments saved; the LR has a POD.',
        screen: 'ops/ldc',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          if (!lr) return notYet('Do the GRN step first');
          const d = created(db, base, 'dcs', (x) => (x.items || []).some((i: any) => i.lrId === lr.id))[0];
          if (!d) return notYet('Create the challan first');
          if (!d.ackCollection) return notYet(`${d.dcNo}: collection acknowledgment pending`);
          if (!d.ackClient) return notYet(`${d.dcNo}: client acknowledgment pending`);
          return pass(`${d.dcNo}: collection and client acknowledged${lr.ack ? ' — POD recorded' : ''}`);
        },
      },
      {
        id: 'approve',
        task: 'DC Approval (accounts): open your challan, check freight, advance and deductions, and click Approve.',
        expected: 'Challan Approved with freight payable; it is ready for a DC payment slip.',
        screen: 'fin/dc-approval',
        check: (db, base) => {
          const lr = e2eLR(db, base);
          if (!lr) return notYet('Do the GRN step first');
          const d = created(db, base, 'dcs', (x) => (x.items || []).some((i: any) => i.lrId === lr.id))[0];
          if (!d) return notYet('Create the challan first');
          if (d.status === 'Rejected') return notYet(`${d.dcNo} was rejected — rejected challans are not offered for approval again`);
          return d.approval ? pass(`${d.dcNo} approved — payable ₹${Number(d.approval.payable || 0).toLocaleString('en-IN')}`) : notYet(`${d.dcNo} not approved yet`);
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------------------------
export const workflows: Workflow[] = [
  {
    id: 'wf.rail',
    title: 'Rail consignment: booking to billing',
    module: 'rail',
    roles: ['OP', 'BU', 'AC'],
    summary: 'How a rail LR moves through the ERP: booked by rail, received at the Jalgaon rail head (GRN), loaded into parcel vans of a VP schedule, dispatched as a rake, unloaded at Guwahati/Kolkata (DGRN), delivered by lorry delivery challan, acknowledged, approved for broker payment and billed.',
    exercise: 'ex.rail.e2e',
    lesson: 'ls.rail.rake-basics',
    steps: [
      { screen: 'ops/lr-new', title: 'Book the LR by rail', does: 'Transport mode Railway (booked at Jalgaon) or Both (feeder from Pune/Nashik etc. "To HO"), To branch = destination rail head (Guwahati or Kolkata). A finalised rail LR waits for GRN.' },
      { screen: 'ops/grn', title: 'GRN at Jalgaon rail head', does: 'Feeder truck unloaded: received/damaged qty, documents (kata), lorry freight and hamali. LR → At Rail Head, feeder trip closed, received qty becomes pending stock. Only GRN stock can be loaded.' },
      { screen: 'ops/vp-schedule', title: 'VP schedule (rake)', does: 'Create the rake RK-… with date, route and wagon mix; tick "Schedule is final". Only final schedules reach MR/RR, VP Loading and Rake at Rail Head.', lesson: 'ls.rail.rake-basics' },
      { screen: 'ops/vp-planning', title: 'Rake planning / load optimisation', does: 'Check cargo against rake volume and weight and print loading instruction, diagram, solution and summary. Advisory only — nothing is loaded.' },
      { screen: 'rail/mrrr', title: 'MR / RR', does: 'Enter real VP numbers, MR/RR and seal numbers and railway freight per wagon. Every wagon needs a VP number. Do this before loading if the schedule still has placeholder VP numbers.' },
      { screen: 'ops/vp-loading', title: 'Wagon / VP loading', does: 'Load GRN stock per LR into a VP. Load + damage ≤ pending. First entry makes the rake Loading; an LR with all stock loaded becomes Loaded. Hamali goes to Hamali Payments.' },
      { screen: 'rail/source', title: 'Rake dispatch at Jalgaon', does: 'Placement/removal give DC hours (5 free hours each). Saving Dispatch sets the rake In Transit and moves its Loaded / At Rail Head LRs to Rake In Transit.' },
      { screen: 'rail/status', title: 'Rake status', does: 'Post position updates; optionally notify consignees on the rake.' },
      { screen: 'rail/destination', title: 'Arrival at destination', does: 'Saving Arrival sets the rake Arrived. Placement/removal give destination DC hours.' },
      { screen: 'rail/dcwc', title: 'Demurrage & wharfage', does: 'Record DC (rate × hours), waiver letter and wharfage/welfare for source and destination; deducted in rake profit.' },
      { screen: 'ops/dgrn', title: 'DGRN at branch', does: 'One DGRN per unloaded VP. Rake → Unloading, LRs → At Branch, received qty becomes branch stock.' },
      { screen: 'ops/dc', title: 'Delivery challan (LDC)', does: 'Take DGRN stock onto a challan with a market or own truck (or self delivery). LR → Out for Delivery; challan Open.' },
      { screen: 'ops/ldc', title: 'LDC acknowledgments', does: 'Supervisor first (challan and LRs Delivered), then challan collection from the broker and client acknowledgment (records POD if missing).' },
      { screen: 'ops/pod', title: 'Delivery / POD', does: 'If the client acknowledgment did not record it, enter the signed consignee copy here. To Be Billed LRs need a POD unless the client allows billing without acknowledgment.' },
      { screen: 'fin/dc-approval', title: 'DC approval', does: 'Accounts approves challans with a supervisor acknowledgment; the ERP warns if collection or client acknowledgment is missing. Payable = freight − advance + detention + parking + other + labour − shortage − damage.' },
      { screen: 'fin/dc-payslip', title: 'DC payment slip and payment', does: 'Group approved challans per broker with TDS (status Payslip Generated), then record payment; fully paid slips mark challans Paid and post to the ledger.' },
      { screen: 'ops/vp-schedule', title: 'Close the rake', does: 'When unloading is done (Arrived or Unloading), use Close rake: status Completed, entries locked.' },
      { screen: 'fin/billing', title: 'Billing', does: 'Delivered To Be Billed rail LRs with POD (or billing-without-ack clients) appear in Billing; filter transport type Rail.' },
    ],
    notes: [
      'Gate: VP Loading lists only LRs with a GRN, pending stock, To branch = rake destination and no other rake.',
      'Gate: Rake at Rail Head, MR/RR and VP Loading list only final schedules.',
      'Gate: Collection and client acknowledgments need the supervisor acknowledgment first. DC Approval needs the supervisor acknowledgment; missing collection/client acknowledgments only show a warning.',
      'Caution: dispatch also moves partly loaded LRs (still At Rail Head) on the rake to Rake In Transit — finish loading first.',
      'Caution: DGRN screen lists In Transit rakes too and does not block a second DGRN for a VP marked "DGRN done".',
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Concept lessons
// ---------------------------------------------------------------------------------------------
export const lessons: Lesson[] = [
  {
    id: 'ls.rail.rake-basics',
    title: 'Rake, VP and wagon type',
    module: 'rail',
    kind: 'concept',
    roles: ['OP', 'BU'],
    screens: ['ops/vp-schedule', 'rail/wagons', 'rail/mrrr', 'rail/rakes'],
    summary: 'The words the rail screens use, and which ERP record each one is.',
    sections: [
      {
        heading: 'Rake = VP schedule',
        body: 'A rake is the parcel train SK Translines books from Jalgaon to Guwahati or Kolkata. In the ERP it is one VP schedule with a rake number RK-<year>-<n>, a date, source and destination rail heads and a status.',
        bullets: ['Created on VP Scheduling.', 'Seen as a card on Rake Planning.', 'Status: Planned → Loading → In Transit → Arrived → Unloading → Completed.'],
      },
      {
        heading: 'VP = one parcel van',
        body: 'Each wagon on the rake is a VP (parcel van) with its own railway number. The schedule\'s wagon mix creates the VP list; MR/RR replaces it with the real VP numbers, MR/RR numbers and seals.',
        bullets: ['VP Loading and DGRN work VP by VP.', 'One DGRN per unloaded VP.'],
      },
      {
        heading: 'Wagon type = size and payload',
        body: 'VPU, VPH, BCN, NMG and BCNHL are wagon types from the Wagons master. Their length, width, height (cm) and payload (kg) give the CFT and weight capacity shown on VP Loading and Vehicle Planning, and the Railway Freight matrix prices them per route.',
      },
      {
        heading: 'GRN and DGRN',
        body: 'GRN is goods in at the Jalgaon rail-head godown (stock for loading). DGRN is goods in at the destination branch after unloading a VP (stock for delivery challans).',
      },
    ],
    audio: [
      'Rake मतलब पूरी parcel train। ERP में यह एक VP schedule है, जिसका number RK से शुरू होता है।',
      'VP मतलब एक parcel van। हर VP का अपना railway number होता है, जो MR RR में डलता है।',
      'Wagon type, जैसे VPU या VPH, बताता है कि van कितना बड़ा है और कितना weight ले सकता है।',
      'GRN Jalgaon godown में माल आने पर बनता है, और DGRN destination branch पर VP खाली करने पर।',
    ],
    minutes: 4,
    quiz: ['q.rail.rake-vp-wagon', 'q.rail.mrrr-meaning'],
  },
  {
    id: 'ls.rail.status-path',
    title: 'Where is my rail LR? Status path and gates',
    module: 'rail',
    kind: 'concept',
    roles: ['OP', 'BU', 'CC'],
    screens: ['ops/grn', 'ops/vp-loading', 'rail/source', 'ops/dgrn', 'ops/dc', 'ops/ldc'],
    prerequisites: ['ls.rail.rake-basics'],
    summary: 'Each rail LR status is set by one screen. Knowing which screen sets it tells you what is pending.',
    sections: [
      {
        heading: 'Status by screen',
        body: 'Read the LR status, then look at the screen that moves it to the next one.',
        bullets: [
          'Finalised / In Transit (feeder) → GRN at Rail Head → At Rail Head.',
          'At Rail Head → VP Loading (all GRN stock loaded) → Loaded.',
          'Loaded → Rake at Rail Head, Dispatch saved → Rake In Transit.',
          'Rake In Transit → DGRN at Branch → At Branch.',
          'At Branch → Delivery Challan → Out for Delivery.',
          'Out for Delivery → LDC supervisor acknowledgment → Delivered.',
          'Delivered + POD (client LDC ack or POD screen) → POD Received → Billed → Paid.',
        ],
      },
      {
        heading: 'Gates the ERP enforces',
        body: 'These checks stop work that is out of order.',
        bullets: [
          'No GRN → the LR is not in the VP Loading list.',
          'Schedule not final → not on VP Loading, MR/RR or Rake at Rail Head.',
          'No DGRN stock → nothing to put on a delivery challan.',
          'No supervisor acknowledgment → challan not on collection/client tabs or DC Approval.',
        ],
      },
      {
        heading: 'Things the ERP does not stop',
        body: 'Take care here yourself.',
        bullets: [
          'Dispatch moves partly loaded LRs to Rake In Transit.',
          'DGRN can be made while the rake is still In Transit, and twice for the same VP.',
          'DC Approval is possible before collection and client acknowledgments (with a warning).',
        ],
      },
    ],
    audio: [
      'Rail LR का हर status एक ही screen से बदलता है।',
      'GRN से At Rail Head, VP loading से Loaded, dispatch से Rake In Transit।',
      'DGRN से At Branch, LDC से Out for Delivery, और supervisor acknowledgment से Delivered।',
      'Status देखिए, और उसकी अगली screen खोलिए — वहीं काम बाकी है।',
      'कुछ गलतियाँ system नहीं रोकता — जैसे आधे loaded LR के साथ dispatch। वहाँ आपको खुद ध्यान रखना है।',
    ],
    minutes: 5,
    quiz: ['q.rail.lr-status-order', 'q.rail.dispatch-partial', 'q.rail.ack-prereq'],
  },
];

