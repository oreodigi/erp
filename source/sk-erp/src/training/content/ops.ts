// Training Academy content – Operations (modules 'home' and 'ops').
// Every statement here was checked against the ERP code: features/{home,dashboard,work,board,book,ops-orders,ops-lr,ops-delivery}.tsx,
// store/store.ts (A.createOrder, confirmOrder, saveLR, dispatchLR, deliverLR, receiveAck, generateBill, clientPayment),
// lib/stages.ts (Order Board stages and time limits), components/QuickActions.tsx and components/RecordDrawer.tsx.
import type { ScreenTraining, Question, Exercise, Workflow, Lesson, PracticeBaseline, CheckResult } from '../types';
import { created, changed, fieldChanged, pass, notYet } from '../check';

// ---------------------------------------------------------------------------------------------------------------
// Checker helpers (read-only – they never change the practice data)
// ---------------------------------------------------------------------------------------------------------------
const list = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);
const truckNo = (db: any, id: string) => list(db, 'trucks').find((t) => t.id === id)?.number || 'no truck';
const custName = (db: any, id: string) => list(db, 'customers').find((c) => c.id === id)?.name || 'customer';
const last = <T,>(a: T[]): T | undefined => a[a.length - 1];
const QUICK_REMARK = 'Booked with quick booking';
const CONFIRMED = ['Confirmed', 'In Process', 'Completed'];
const MOVED = ['In Transit', 'Delivered'];

/** Orders the employee created during this exercise. */
const myOrders = (db: any, base: PracticeBaseline) => created(db, base, 'orders');
/** LRs created during this exercise against an order also created during this exercise. */
const myOrderLRs = (db: any, base: PracticeBaseline) => {
  const ids = new Set(myOrders(db, base).map((o) => o.id));
  return created(db, base, 'lrs', (l) => !!l.orderId && ids.has(l.orderId));
};
/** Road LRs that were Draft/Finalised (or new) at the start and have now been dispatched. */
const dispatchedNow = (db: any, base: PracticeBaseline) =>
  changed(db, base, 'lrs', (l, old) => l.mode === 'Road' && MOVED.includes(l.status) && (old === undefined || old === 'Finalised' || old === 'Draft'));
const billOf = (db: any, l: any) => (l?.billId ? list(db, 'bills').find((b) => b.id === l.billId && !b.deleted) : undefined);

// ---------------------------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------------------------
export const screens: ScreenTraining[] = [
  {
    id: 'dashboard',
    module: 'home',
    title: 'Home',
    purpose: 'Your start page. It shows today in four numbers, where every consignment is in the pipeline, and the next jobs for your role.',
    why: 'You see in one minute what is late and what you must do first, without opening many screens.',
    when: 'At the start of the shift and whenever you come back to your desk.',
    roles: ['SA', 'AD', 'OP', 'BU', 'AC', 'CC', 'CO', 'SI', 'HR'],
    upstream: [],
    downstream: ['work', 'board', 'book'],
    before: 'Nothing. Home is the first page after sign-in.',
    after: 'You open My Work or the Order Board, or press New booking.',
    prerequisites: ['Signed in. Your role decides which view you get: Operations (OP, BU, CC), Accounts (AC), Fleet (CO, SI) or Owner (SA, AD).'],
    actions: [
      'Click a "Today" tile (for example "On the way" or "POD pending") to open the list behind the number.',
      'Click a stage box in "Where every consignment is right now" to open the Order Board on that stage.',
      'Press the button on a "Do these next" row to do that job straight away (confirm order, assign truck, POD received, make bill…).',
      'Press "Fix these" on the "Biggest blockage" bar to see only the late cards of the worst stage.',
      'Admins (SA, AD) can switch the view: Owner, Operations, Accounts or Fleet.',
      'Press "Customize" to move or resize panels; "Reset dashboard" brings back the default layout.',
    ],
    records: ['Reads orders, LRs, bills, trips and trucks. Home itself does not create records; the buttons open the screens or quick forms that do.'],
    validations: ['The stage counts use the time limits from Stage Time Limits (admin/time-limits). A card is late when its days in the stage are more than the limit.'],
    mistakes: [
      'Reading "To collect" as money due today – it is the total pending on all bills; "overdue" is the part past the customer\'s credit days.',
      'Ignoring "Old records to clean up" – old LRs never marked delivered or POD received make every number on Home wrong.',
    ],
    warnings: ['Paid consignments older than 30 days are left out of the pipeline boxes.'],
    statuses: [
      { status: 'Late (red number)', meaning: 'Items that stayed in that stage longer than the time limit.' },
      { status: 'On time (green)', meaning: 'No item in that stage is past its time limit.' },
    ],
    example: 'Ritesh (Operations, Jalgaon) opens Home: "POD pending 14 · 3 over 7 days". He clicks the tile, lands on the Order Board column "Delivered – POD pending" and chases the three late PODs first.',
    walkthrough: [
      { title: 'Read the four tiles', body: 'They change with your role. Operations sees Booked today, On the way, Delivered today and POD pending.', target: 'today' },
      { title: 'Check the pipeline', body: 'Seven boxes from Booked to Paid. A red number means late items in that stage.', target: 'pipeline' },
      { title: 'Work the "Do these next" list', body: 'Each row is a type of job with the oldest item first. The button runs the job for that first item.', target: 'actions' },
      { title: 'Fix the biggest blockage', body: 'The red bar names the stage holding most late money and who it is waiting on. "Fix these" opens those cards.' },
    ],
    related: ['work', 'board', 'admin/time-limits'],
    audio: [
      'यह Home है — आपके दिन का पूरा हाल एक नज़र में।',
      'ऊपर के चार numbers आपके role के हिसाब से बदलते हैं, किसी पर भी click कीजिए तो उसकी list खुल जाती है।',
      'बीच में सात stage boxes हैं, Booked से Paid तक। लाल number का मतलब है उस stage में कुछ consignments late हैं।',
      'Do these next में आपका सबसे ज़रूरी काम है, सबसे पुराना पहले। दाईं तरफ़ का button दबाइए, काम वहीं से हो जाएगा।',
      'Biggest blockage वाली लाल पट्टी बताती है कि सबसे ज़्यादा पैसा कहाँ अटका है। Fix these दबाकर वही cards खोलिए।',
    ],
    quiz: ['q.home.board-red-card', 'q.home.pod-time-limit'],
    minutes: 4,
  },
  {
    id: 'dashboard/classic',
    module: 'home',
    title: 'Command Center (classic dashboard)',
    purpose: 'A detailed management dashboard: KPIs, a live map of moving consignments, an "Attention required" list and charts for volume, revenue, fleet, lanes, receivables and rakes.',
    why: 'Managers use it to review the whole business and find exceptions across operations, fleet, workshop and finance.',
    when: 'Daily or weekly review by managers and admins; not needed for routine booking work.',
    roles: ['SA', 'AD'],
    upstream: [],
    downstream: ['ops/lr', 'ops/pod', 'ops/order-confirmation', 'fin/receivables'],
    before: 'Data comes from LRs, bills, trucks, rakes and job cards entered on other screens.',
    after: 'You open the screen behind a KPI or an attention item and act there.',
    prerequisites: ['Access to the Home menu group. LR counts and revenue use only finalised LRs; drafts are not counted.'],
    actions: [
      'Use the quick-action buttons (New Order, Generate LR, Vehicle Planning, Delivery Challan, GRN, Start Trip, Job Card, Generate Bill) to jump to the form.',
      'Click a KPI (Active consignments, In transit, Revenue, Receivables) or a small tile (Pending POD, Pending approvals, On-time delivery…) to open the related screen.',
      'Work the "Attention required" list: delayed LRs, PODs pending over 4 days, orders awaiting confirmation, expiring truck papers and driver licences, job cards for approval, overdue bills, low spares, LDCs without supervisor ack, expiring rate contracts.',
      'Switch the "Shipment volume" chart between 7 and 30 days.',
    ],
    records: ['Read-only. Uses LRs, orders, bills, trucks, drivers, schedules (rakes), job cards, spares and rate contracts.'],
    validations: [
      '"Delayed" means an LR In Transit or Out for Delivery whose due date has passed.',
      '"On-time delivery" is the share of delivered LRs whose delivery date is on or before the due date.',
    ],
    mistakes: ['Treating "Active consignments" as road trucks on the road – it counts every finalised LR not yet delivered, including rail LRs at the rail head or branch.'],
    statuses: [
      { status: 'Red attention item', meaning: 'Already late or expired (delayed LR, expired document, overdue bill).' },
      { status: 'Amber attention item', meaning: 'Needs action soon (POD pending over 4 days, orders to confirm, papers due within 15 days).' },
    ],
    walkthrough: [
      { title: 'Scan the four KPIs', body: 'Active consignments, In transit, Revenue month-to-date and Receivables with the overdue part.' },
      { title: 'Open "Attention required"', body: 'Red items first. Clicking an item opens the LR, bill or screen behind it.' },
      { title: 'Look at the control tower', body: 'The map shows road trips and parcel rakes moving now.' },
      { title: 'Review charts', body: 'On-time %, route performance and receivable ageing show where the business is slipping.' },
    ],
    related: ['dashboard', 'board', 'reports'],
    audio: [
      'यह Command Center है — managers के लिए पूरे business की detailed तस्वीर।',
      'ऊपर के KPI पर click कीजिए, उसकी पूरी list खुल जाती है।',
      'Attention required में हर exception है — late LR, पुराने POD, expire होते papers और overdue bills।',
      'लाल items पहले निपटाइए, फिर पीले वाले।',
      'रोज़ की booking के लिए Home और My Work काफ़ी हैं, यह screen review के लिए है।',
    ],
    quiz: ['q.home.board-red-card'],
    minutes: 3,
  },
  {
    id: 'work',
    module: 'home',
    title: 'My Work',
    purpose: 'One inbox of everything waiting on you, grouped by type of job, oldest first, with the action button on each row.',
    why: 'You do not have to search screens for pending work – confirmations, trucks to assign, late deliveries, PODs and bills are all listed here.',
    when: 'Many times a day. Start the day here and clear the red (late) rows first.',
    roles: ['SA', 'AD', 'OP', 'BU', 'AC', 'CC', 'CO', 'SI'],
    upstream: ['dashboard'],
    downstream: ['ops/order-confirmation', 'book', 'ops/lr-new', 'ops/pod', 'fin/billing'],
    before: 'Orders, LRs, bills and workshop records are created on other screens.',
    after: 'Each button opens a small form (confirm order, dispatch, deliver, POD, bill, payment) or the right screen.',
    prerequisites: ['Your role decides "My tasks". Admins (SA, AD) always see everyone\'s work; others can switch to "Everyone".'],
    actions: [
      'Confirm customer orders (opens the quick Confirm / Reject dialog).',
      'Make LR for confirmed orders (opens New booking filled from the order).',
      'Finish draft LRs, and Assign a truck to finalised LRs without a vehicle (opens the Dispatch dialog).',
      'Confirm delivery of late trucks, and open rail loads that are not moving.',
      'Collect POD copies – tick several rows and press "POD for n" to record them together.',
      'Accounts: Make bills (tick rows, "Bill n"), follow up overdue payments, approve DCs and transporter slips.',
      'Fleet and workshop: approve job cards and spare POs, close trips open more than 5 days, renew truck papers due within 30 days.',
    ],
    records: ['Rows come from the Order Board stages (lib/stages.ts) plus DCs, transporter slips, job cards, POs, trips and truck documents.'],
    validations: [
      'Bulk POD accepts only LRs that are Delivered and have no POD yet; others are skipped with a warning.',
      'Bulk bill accepts only unbilled "To Be Billed" LRs with POD (or customers allowed to bill without acknowledgment).',
    ],
    mistakes: [
      'Pressing "Approve" on a transporter payment slip or job card row – it approves immediately, there is no second confirmation.',
      'Recording POD in bulk for an LR with damage – bulk POD marks all goods received in full. Record damaged loads one by one on the POD screen.',
    ],
    warnings: ['A row turns red when its age is past the time limit for that stage (Stage Time Limits).'],
    example: 'Kavita (Customer Care) opens My Work: "Collect POD copies – 9 waiting · 2 late". She ticks the 6 LRs whose signed copies arrived by courier and presses "POD for 6".',
    walkthrough: [
      { title: 'Pick your scope', body: '"My tasks" shows only your role\'s groups; "Everyone" shows all.' },
      { title: 'Start with red rows', body: 'Late rows show the age in red. They are already past the stage time limit.' },
      { title: 'Press the row button', body: 'A short form opens with sensible defaults. Check and save.' },
      { title: 'Use bulk for PODs and bills', body: 'Tick rows in "Collect POD copies" or "Make bills" and press the bulk button.' },
    ],
    related: ['board', 'dashboard', 'ops/pod'],
    practice: 'ex.ops.record-pod',
    audio: [
      'यह My Work है। जो भी काम आपका इंतज़ार कर रहा है, सब यहाँ है।',
      'हर box एक तरह का काम है — orders confirm करना, truck देना, POD लेना, bill बनाना।',
      'सबसे पुराना काम सबसे ऊपर है। पहले लाल वाले, यानी late rows, निपटाइए।',
      'Row का button दबाइए, एक छोटा form खुलेगा। Approve वाले buttons तुरंत approve कर देते हैं, ध्यान से दबाइए।',
      'POD या billing के लिए एक साथ कई rows tick कर सकते हैं।',
    ],
    quiz: ['q.home.assign-truck', 'q.home.bulk-pod-damage'],
    minutes: 4,
  },
  {
    id: 'board',
    module: 'home',
    title: 'Order Board',
    purpose: 'Every open order and LR as a card in its pipeline stage: Booked, Waiting for vehicle, On the way, Delivered – POD pending, Ready to bill, Billed – awaiting payment, Paid / closed.',
    why: 'You see where each consignment is stuck, why, and who it is waiting on – and you can do the next step from the card.',
    when: 'Whenever you need to chase work: late deliveries, missing PODs, unbilled loads, unpaid bills.',
    roles: ['SA', 'AD', 'OP', 'BU', 'CC', 'AC'],
    upstream: ['ops/orders', 'book', 'ops/lr-new'],
    downstream: ['ops/order-confirmation', 'ops/pod', 'fin/billing', 'fin/client-payments'],
    before: 'Orders and LRs are created in Orders, New booking or Generate LR.',
    after: 'The card button runs the next step; the card moves to the next column.',
    prerequisites: ['Order Board is open to every signed-in user.'],
    actions: [
      'Press the button on a card: Confirm, Make LR, Finish LR, Assign truck, Dispatch, Mark delivered, Record POD, Make bill, Record payment.',
      'Drag a card to the next column to run the same next step.',
      'In "Delivered – POD pending" and "Ready to bill", tick cards (or "Select n shown") and press "POD received · n" or "Make bill · n".',
      'Filter by branch, customer, Road/Rail, period, "Late only", or search LR, customer, truck or city.',
      'Click a card to open the LR 360 or order view.',
    ],
    records: [
      'Cards are built from orders and LRs (lib/stages.ts). Orders show only while Pending, or Confirmed/In Process with no LR yet.',
      'Running a step changes the order or LR exactly as the full screen would (A.confirmOrder, A.dispatchLR, A.deliverLR, A.receiveAck, A.generateBill, A.clientPayment).',
    ],
    validations: [
      'Drag works one column at a time; a bigger jump shows "Move one step at a time".',
      'Default time limits: Booked 0.25 day, Waiting for vehicle 1 day, On the way = standard transit days + 1, POD pending 7 days, Ready to bill 3 days, Billed = customer credit days. Admins change them in Stage Time Limits.',
      'To Pay and Paid LRs go straight to "Paid / closed" once POD is recorded – they are never billed.',
      'A customer on credit hold shows "Customer on credit hold" in the card reason.',
    ],
    mistakes: [
      'Confirming an order of a credit-hold customer from the board – the dialog only warns ("Confirm only if accounts have approved"), it does not block.',
      'Making a bill from the board for many customers at once without checking the GST rate – the dialog uses one rate (5% GTA, 12% or Exempt/RCM) for all bills it creates.',
    ],
    warnings: ['The "Make bill" button on the board works for any role that can open the board, even without the Finance menu.'],
    statuses: [
      { status: 'Booked', meaning: 'Order received, waiting for confirmation. Owner: branch manager.' },
      { status: 'Waiting for vehicle', meaning: 'Order confirmed with no LR yet, LR still in draft, or road LR finalised without a truck.' },
      { status: 'On the way', meaning: 'Finalised with a truck (not yet dispatched), in transit, or in the rail chain (rail head, wagon, rake, branch, out for delivery).' },
      { status: 'Delivered – POD pending', meaning: 'Delivered; the signed POD must come back before billing.' },
      { status: 'Ready to bill', meaning: 'POD received on a To Be Billed LR. Owner: Accounts.' },
      { status: 'Billed – awaiting payment', meaning: 'Bill made, money pending; late after the customer\'s credit days.' },
      { status: 'Paid / closed', meaning: 'Bill fully paid, or a To Pay / Paid LR with POD received.' },
    ],
    example: 'A red card "SKT/PN/10461 · Late 2d · Delivery not confirmed · Waiting on Operations / rail team" sits in "On the way". The dispatcher calls the driver, then presses "Mark delivered" on the card.',
    walkthrough: [
      { title: 'Read the stage strip', body: 'Counts per stage with the number late. Click a stage to focus it.' },
      { title: 'Look for the "Biggest blockage" bar', body: '"Show only these" filters to the late cards of the worst stage.' },
      { title: 'Read a card', body: 'LR or order number, customer, route, vehicle, amount, days in stage, reason and who it waits on.' },
      { title: 'Do the next step', body: 'Press the card button or drag it one column right.' },
      { title: 'Use bulk in POD and billing columns', body: 'Tick cards and press "POD received · n" or "Make bill · n".' },
    ],
    related: ['work', 'admin/time-limits', 'ops/lr'],
    practice: 'ex.ops.record-pod',
    audio: [
      'यह Order Board है। हर order और LR, booking से payment तक, बाएँ से दाएँ।',
      'लाल card late है, पीला card जल्दी due होने वाला है।',
      'Card पर लिखा है कि क्यों अटका है, और किसके पास अटका है।',
      'Card का button दबाइए, या उसे अगले column में खींचिए। एक बार में सिर्फ़ एक column आगे जा सकता है।',
      'To Pay वाले LR का bill नहीं बनता, POD आते ही वो सीधे Paid में चला जाता है।',
    ],
    quiz: ['q.home.board-red-card', 'q.home.board-drag', 'q.ops.to-pay-board'],
    minutes: 5,
  },
  {
    id: 'book',
    module: 'ops',
    title: 'New Booking (quick LR)',
    purpose: 'The short way to make an LR in 3 steps – Customer & place, Goods & freight, Truck – with defaults filled from the customer\'s last booking.',
    why: 'Most bookings repeat the same route, consignee and goods. Quick booking makes a finalised LR in under a minute and can send the truck at once.',
    when: 'For everyday road or rail bookings, and from "Make LR" on an order card. Use Generate LR when you need every field (several items, insurance, market-truck hire, via HO).',
    roles: ['OP', 'BU', 'CC'],
    upstream: ['ops/order-confirmation', 'board'],
    downstream: ['ops/lr', 'board', 'ops/delivery'],
    before: 'Customer, consignee and goods exist in masters. For an order, it is Confirmed or In Process.',
    after: 'The LR is finalised. With a truck it is dispatched at once (status In Transit; own truck opens a trip). With "Decide later" it waits under "Waiting for vehicle".',
    prerequisites: ['Customer (sender), destination city and receiver (consignee) are required to go to step 2.', 'Goods and a quantity above 0 are required to go to step 3.'],
    actions: [
      'Step 1: choose the customer (defaults load from the last LR), Road or Rail, destination city and consignee. For Rail choose the destination rail branch.',
      'Step 2: choose goods and pieces; check the suggested freight (last LR on this route, else rate contract, else distance estimate); choose who pays: "We bill later" (To Be Billed), "Receiver pays" (To Pay) or "Paid now".',
      'Step 3: choose "Our truck", "Market truck" or "Decide later". For our truck pick driver and trip advance (default ₹10,000).',
      'Press "Book & send truck" (or "Book LR" with Decide later).',
      'After saving: Print LR, Book again for same customer, See it on the Order Board, Open LR details.',
    ],
    records: [
      'Creates one LR (lrs) with status Finalised, one item line and remark "Booked with quick booking".',
      'If a truck was chosen it then runs dispatch: LR becomes In Transit; an own truck also opens a trip (TRP/…) in Road Fleet.',
      'From an order: draws the quantity down on the order and sets it In Process or Completed.',
    ],
    validations: [
      'Dispatch after booking follows the normal gates: if the order has a Smart Load Plan that is not loading-confirmed, or the truck differs from the plan, dispatch is refused and the LR stays Finalised without a truck.',
      'For Rail, the truck chosen in step 3 is the feeder truck to the Jalgaon rail head; after it arrives the LR continues at GRN at rail head.',
    ],
    mistakes: [
      'Booking for a customer on credit hold – New booking only shows "This customer is on credit hold – check with accounts". It does not block, unlike Orders and Generate LR. Check with Accounts first.',
      'Leaving freight at ₹0 – New booking accepts it and the LR is finalised with zero freight. Billing will then show a ₹0 warning.',
      'Booking an order with several items here – only the first item of the order is used. Use Generate LR for multi-item orders.',
    ],
    warnings: ['New booking does not check the Smart Load Plan before finalising the LR (Generate LR does). For orders with a load plan, confirm loading first.'],
    shortcuts: ['"Need every field? Open full LR form" switches to Generate LR with the same order.'],
    fields: [
      { name: 'Who pays the freight?', help: 'We bill later = To Be Billed (goes to Customer Billing after POD). Receiver pays = To Pay (collected at destination). Paid now = Paid.' },
      { name: 'Decide later', help: 'LR is finalised without a truck. It appears in My Work "Assign a truck" and on the board under "Waiting for vehicle".' },
      { name: 'Trip advance (₹)', help: 'Cash given to the driver of our truck; saved on the trip opened at dispatch.' },
    ],
    example: 'Indus Cool calls for one more truck to Mumbai. Ritesh picks the customer – route, consignee Konkan Consumer Products and goods fill from LR SKT/JL/10458. He sets 200 pieces, keeps freight ₹27,500, chooses our truck MH19 CY 4417 and presses "Book & send truck".',
    walkthrough: [
      { title: 'Customer and place', body: 'Type the customer name. Check the filled destination and consignee.' },
      { title: 'Goods and freight', body: 'Set pieces. Accept or change the suggested freight. Choose who pays.' },
      { title: 'Truck', body: 'Pick a free truck (free trucks are listed first) or Decide later.' },
      { title: 'Check and book', body: 'Read the "Check before booking" box, then press Book & send truck.' },
    ],
    related: ['ops/lr-new', 'board', 'ops/lr'],
    practice: 'ex.ops.quick-booking',
    audio: [
      'यहाँ तीन छोटे steps में LR बनता है।',
      'पहले customer का नाम लिखिए। Destination, consignee और goods पिछली booking से भर जाते हैं, बस check कीजिए।',
      'फिर pieces और freight देखिए, और चुनिए कि freight कौन देगा — We bill later, Receiver pays या Paid now।',
      'आख़िर में truck चुनिए और Book and send truck दबाइए। Truck तुरंत dispatch हो जाता है।',
      'Credit hold वाले customer पर यहाँ सिर्फ़ warning आती है, booking से पहले accounts से ज़रूर पूछिए।',
    ],
    quiz: ['q.ops.quick-decide-later', 'q.ops.credit-hold'],
    minutes: 4,
  },
  {
    id: 'ops/orders',
    module: 'ops',
    title: 'Orders',
    purpose: 'Customer bookings (orders) from initiation to LR. Each order records client, from/to branch, pickup place and date, and either number of trucks or item quantities.',
    why: 'An order is the customer\'s request. Confirmed orders feed Generate LR, and the order shows how much is still pending as LRs are made.',
    when: 'When a customer asks for trucks or for goods to be moved and you are not making the LR immediately.',
    roles: ['OP', 'BU', 'CC'],
    upstream: [],
    downstream: ['ops/order-confirmation', 'ops/smart-load', 'ops/lr-new', 'book'],
    before: 'The customer exists in Customer 360 and is not on credit hold.',
    after: 'The order is Pending and appears in Order Confirmation and on the board under "Booked".',
    prerequisites: ['Client selected.', 'At least one item added.', 'For "Book by Truck", number of trucks entered.'],
    actions: [
      'Press "New order", fill Client, From/To branch, Pick-up location and date, instructions, Book by Truck or Item, and add items. Press "Submit order".',
      'Row actions: View, Edit (Pending only), Confirm / reject (Pending only), Smart Load Plan, Create LR (Confirmed or In Process), Show LRs, Pre-close (Confirmed or In Process), Delete (only orders with no LR).',
      'Use quick filters: Pending, Ready for LR, Closed.',
    ],
    records: [
      'Creates an order ORD-n with status Pending, items with "remaining" = quantity, and remaining trucks = truck quantity.',
      'Sends a notification "ORD-n awaiting confirmation" linked to Order Confirmation.',
    ],
    validations: [
      '"Select a client", "Add at least one item", "Enter number of trucks".',
      'Credit hold: "<client> is on credit hold – new bookings are disallowed. Clear outstanding or lift the hold in Customer 360."',
      'Once a Smart Load Plan for the order is approved, client, branches, city, order-by, truck quantity and items are locked: "Operational order fields are locked by approved load plan SLP-…".',
    ],
    mistakes: [
      'Making an order with To branch different from From branch when the To branch is a rail head – the LR from it becomes a Railway/Both LR, not a road LR.',
      'Pre-closing an order by mistake – the remaining quantity is cancelled and the order is closed. LRs already made are not affected.',
    ],
    statuses: [
      { status: 'Pending', meaning: 'Initiated, waiting for confirmation. Can be edited.' },
      { status: 'Confirmed', meaning: 'Accepted; selectable in Generate LR.' },
      { status: 'In Process', meaning: 'At least one LR made; quantity still pending.' },
      { status: 'Completed', meaning: 'All items (or all trucks) covered by LRs.' },
      { status: 'Rejected', meaning: 'Refused at confirmation.' },
      { status: 'Preclosed', meaning: 'Closed early; remaining quantity cancelled.' },
    ],
    fields: [
      { name: 'Book by', help: 'Truck = the order is for a number of trucks (each LR uses one truck). Item = the order is for quantities of goods.' },
      { name: 'Fulfilled', help: 'Share of the ordered quantity already covered by LRs.' },
      { name: 'LRs (total / final / pending)', help: 'All LRs on the order / finalised LRs / draft LRs.' },
    ],
    example: 'Voyager Luggage orders 2 trucks of luggage sets from Nashik, pickup tomorrow. Book by Truck, No. of trucks 2, item 450 sets. The order becomes ORD-1017, Pending.',
    walkthrough: [
      { title: 'Open New order', body: 'Press "New order". Choose the client – credit-hold clients are marked "(credit hold)".' },
      { title: 'Branches and pickup', body: 'From/To branch, pick-up location and date, and instructions for the pick-up branch.' },
      { title: 'Order by and items', body: 'Truck with number of trucks, or Item. Add each item with quantity.' },
      { title: 'Submit', body: 'Press "Submit order". The order goes to Order Confirmation.' },
    ],
    related: ['ops/order-confirmation', 'ops/smart-load', 'cust/360'],
    practice: 'ex.ops.create-order',
    audio: [
      'यह Orders screen है, जहाँ customer की booking दर्ज होती है।',
      'New order दबाइए, client, branch, pickup की जगह और तारीख भरिए, फिर items add कीजिए।',
      'Truck से book करें तो trucks की संख्या ज़रूरी है।',
      'Credit hold वाले client का order यहाँ नहीं बनता, पहले accounts से hold हटवाइए।',
      'Submit करते ही order Pending बनता है और confirmation के लिए चला जाता है।',
    ],
    quiz: ['q.ops.credit-hold', 'q.ops.order-edit-pending', 'q.ops.order-quantity'],
    minutes: 5,
  },
  {
    id: 'ops/order-confirmation',
    module: 'ops',
    title: 'Order Confirmation',
    purpose: 'Review pending orders, adjust pickup date, place, truck quantity, items and contact, then Confirm or Reject.',
    why: 'Only confirmed orders can be used in Generate LR. Confirmation is where the branch checks credit, rate contract and vehicle availability.',
    when: 'As soon as an order arrives – the board marks a Booked order late after 0.25 day (in practice, from the next day).',
    roles: ['OP', 'BU', 'AD'],
    upstream: ['ops/orders'],
    downstream: ['ops/smart-load', 'ops/lr-new', 'book'],
    before: 'The order is Pending.',
    after: 'Confirmed: the order appears under "Ready for LR" and in the Generate LR order list. Rejected: it is closed.',
    prerequisites: ['Order status Pending (only Pending orders can be changed here).'],
    actions: [
      'Pick an order in the Pending tab. Check Credit days, Outstanding, Rate contract and Booking (Allowed or Credit hold).',
      'Adjust pick-up date, location, truck quantity, instructions, contact and items if the customer changed them.',
      'Choose Order status Confirmed (optionally enter Billing amount) and press "Confirm order", or choose Rejected, enter a reason and press "Reject order".',
      'For a confirmed order press "Generate LR".',
    ],
    records: ['Updates the order: status Confirmed or Rejected, confirmedAt, edited fields, and a history event "Order confirmed" or "Order rejected – <reason>".'],
    validations: ['Fields are editable only while the order is Pending.'],
    mistakes: [
      'Confirming a credit-hold customer – the screen shows "Credit hold" in red but does not stop confirmation. The LR will still be blocked in Generate LR.',
      'Rejecting without a reason – the reason is optional, but without it nobody knows why the customer was refused.',
    ],
    statuses: [
      { status: 'Pending tab', meaning: 'Orders waiting for a decision.' },
      { status: 'Reviewed tab', meaning: 'Confirmed, In Process and Rejected orders.' },
    ],
    fields: [{ name: 'Billing amount (₹)', help: 'Expected freight. New booking uses it as the default freight when you make the LR from this order.' }],
    example: 'ORD-1013 from Voyager Luggage: outstanding ₹3.2 L, rate contract till 31 Mar, booking Allowed. The branch changes pickup to the next day, enters billing amount ₹38,000 and confirms.',
    walkthrough: [
      { title: 'Select the order', body: 'Oldest orders first. The header shows who initiated it and when.' },
      { title: 'Check credit', body: 'Outstanding and "Credit hold" tell you whether Accounts must approve first.' },
      { title: 'Adjust details', body: 'Pickup, truck quantity, items and contact as agreed with the customer.' },
      { title: 'Decide', body: 'Confirm order, or Reject order with a reason.' },
    ],
    related: ['ops/orders', 'board', 'cust/rate-contracts'],
    practice: 'ex.ops.create-order',
    audio: [
      'यहाँ नए orders confirm या reject होते हैं।',
      'बाईं list से order चुनिए। ऊपर customer का outstanding, credit days और rate contract दिखता है।',
      'Customer ने कुछ बदला है तो pickup date, trucks या items यहीं ठीक कीजिए।',
      'Confirm order दबाते ही order Generate LR में दिखने लगता है।',
      'Reject करें तो reason ज़रूर लिखिए।',
    ],
    quiz: ['q.ops.order-flow', 'q.ops.confirm-credit-hold'],
    minutes: 4,
  },
  {
    id: 'ops/lr-new',
    module: 'ops',
    title: 'Generate LR',
    purpose: 'The full lorry receipt form: From order, Instant LR (direct) or Truck LR. Covers parties, route, documents, items, truck, freight and market-truck hire.',
    why: 'The LR is the legal consignment note. A finalised LR is what can be dispatched, delivered, acknowledged and billed.',
    when: 'For every consignment that needs fields New booking does not have: several items, insurance, via HO, rail head, market lorry hire, pre-printed LR number.',
    roles: ['OP', 'BU'],
    upstream: ['ops/order-confirmation', 'ops/smart-load'],
    downstream: ['ops/lr', 'ops/delivery', 'ops/grn'],
    before: 'From order: the order is Confirmed or In Process. If the order has a Smart Load Plan, loading must be confirmed before you finalise.',
    after: 'Draft: the LR waits for completion. Finalised: road LRs can be dispatched ("Dispatch now"); rail LRs go to GRN at rail head.',
    prerequisites: ['Consignor, consignee, destination and at least one item for any save.', 'For Finalise: total freight; a truck for road LRs; rail head for rail LRs; market lorry freight for a market truck.'],
    actions: [
      'Choose From order / Instant LR / Truck LR. From order: pick the order – consignor, branches, pickup city, items (with pending quantity) and remarks fill in.',
      'Fill Consignor & consignee, Route, Schedule & documents (invoice nos., goods value, seal, delivery type, priority).',
      'Truck details: Own (existing trip or own truck, driver, opening KM) or Market (market truck; transporter fills in).',
      'Freight: payment mode (To Be Billed, To Pay, Paid), total freight (apply the contract or suggested freight), GST payable by, bill head. For market trucks enter lorry freight, hamali, advance, TDS, commission.',
      'Press "Save draft" or "Finalise LR". On the success page: Print LR, Freight slip, Barcode labels, Email/SMS, Dispatch now, Open LR 360.',
    ],
    records: [
      'Creates an LR SKT/<branch>/<n> (or your pre-printed number) with status Draft or Finalised, due date = place date + standard transit days.',
      'From an order, even a draft LR reduces the order\'s remaining quantity (and remaining trucks for truck orders) and sets the order In Process or Completed.',
      'Links the Smart Load Plan number on the LR when the order has one.',
    ],
    validations: [
      '"Select an order, or switch to Instant LR", "Consignor is required", "Consignee is required", "Destination is required", "Add at least one item".',
      'Credit hold: "<consignor> is on credit hold – LR booking disallowed" (blocks drafts too).',
      'Finalise only: "Total freight is required to finalise", "Assign a truck to finalise a road LR", "Select the rail head", "Enter market truck freight", "<item>: quantity exceeds pending <n>".',
      'Smart Load gate: "Smart Load Plan SLP-… must be loading-confirmed before finalising this LR" for road LRs on an order with a load plan.',
      'Editing: a dispatched, delivered, POD-received or billed LR cannot be saved ("Dispatched/delivered/billed LR operational fields are locked"). With an approved load plan, order, items, vehicle, truck and route are locked.',
    ],
    mistakes: [
      'Saving a draft from an order and forgetting it – the order quantity is already drawn down, so the order looks fulfilled while nothing moves.',
      'Choosing To Pay when the customer is billed monthly – To Pay LRs never reach Customer Billing.',
      'Trying to correct a dispatched LR here – the save is refused with a red message even though the success page may still appear. Ask an admin to use Data Corrections.',
    ],
    warnings: ['"Email/SMS" and "Notify consignor" are simulated in this ERP: a confirmation message appears, nothing is actually sent.'],
    fields: [
      { name: 'LR number', help: 'Leave blank for the automatic number. Enter only when using pre-printed stationery.' },
      { name: 'Payment mode', help: 'To Be Billed (TBB) = billed later from Customer Billing after POD. To Pay = consignee pays freight at delivery. Paid = paid at booking.' },
      { name: 'Bill head', help: 'Whose name the bill is raised in: Consignor or Consignee.' },
      { name: 'Existing trip', help: 'Attach the LR to an open trip that has no LR; otherwise a new trip opens at dispatch.' },
    ],
    statuses: [
      { status: 'Draft', meaning: 'Saved but not final. Cannot be dispatched or billed. Can be deleted from the LR register.' },
      { status: 'Finalised', meaning: 'Complete and locked for dispatch. Road: dispatch next. Rail: GRN at rail head next.' },
    ],
    example: 'Order ORD-1011 (Konkan, 2 trucks of detergent). The order is picked, items fill with pending quantity; truck MH04 GR 2261, freight ₹31,000 To Be Billed. Finalise → SKT/MB/10461, then "Dispatch now".',
    walkthrough: [
      { title: 'Choose the LR type', body: 'From order for confirmed orders. Instant LR or Truck LR for bookings without an order (same form, no order is linked).' },
      { title: 'Check parties and route', body: 'From order these are filled. Confirm consignee and destination.' },
      { title: 'Items and weight', body: 'Quantities cannot exceed the order\'s pending quantity when you finalise.' },
      { title: 'Truck and freight', body: 'A road LR needs a truck to finalise. Apply the contract freight or enter it.' },
      { title: 'Finalise', body: 'Fix any red issues listed at the top, then Finalise LR and dispatch.' },
    ],
    related: ['book', 'ops/lr', 'ops/smart-load', 'fin/freight-update'],
    practice: 'ex.ops.road-e2e',
    audio: [
      'यह Generate LR है — LR का पूरा form।',
      'From order चुनें तो order की जानकारी अपने आप भर जाती है। Walk-in booking के लिए Instant LR चुनिए।',
      'Draft save करने से LR पूरा नहीं होता। Draft LR न dispatch होता है, न bill।',
      'Finalise के लिए freight और road LR में truck ज़रूरी है। Order पर Smart Load Plan है तो पहले loading confirm होनी चाहिए।',
      'ऊपर लाल box में जो गलतियाँ दिखें, उन्हें ठीक करके फिर Finalise LR दबाइए।',
    ],
    quiz: ['q.ops.finalise-requirements', 'q.ops.slp-finalise-gate', 'q.ops.draft-order-qty'],
    minutes: 7,
  },
  {
    id: 'ops/lr',
    module: 'ops',
    title: 'LR & Consignments (LR register)',
    purpose: 'Every LR across road and rail with its live stage, due date and freight. Open a row for the LR 360: items, vehicle, documents, POD, billing and audit trail.',
    why: 'This is where you find any LR and do its next step: finalise, dispatch, deliver, record POD, print.',
    when: 'To look up an LR, chase delayed ones, dispatch finalised road LRs and clean up drafts.',
    roles: ['OP', 'BU', 'CC'],
    upstream: ['ops/lr-new', 'book'],
    downstream: ['ops/delivery', 'ops/pod', 'fin/billing'],
    before: 'LRs are made in Generate LR or New booking.',
    after: 'Dispatched LRs move to In Transit; delivered ones go to POD; POD-received To Be Billed LRs go to billing.',
    prerequisites: ['None to view. Dispatch needs a Finalised road LR.'],
    actions: [
      'KPIs: Booked (30d), Moving, Delayed, Awaiting POD (opens POD), Ready to bill (opens Customer Billing).',
      'Quick filters: Drafts, Moving, At rail / branch, Delayed, Awaiting POD, Billed.',
      'Row actions: Open 360, Edit LR (not billed), Print LR, Print freight slip, Dispatch (Finalised road LR), Mark delivered (In Transit road LR), Record POD (Delivered, no POD), Delete draft.',
      'In the LR 360 footer: Email/SMS, Print LR, Edit, Dispatch, Finalise LR (drafts), Mark delivered, Record POD, Bill.',
    ],
    records: [
      'Dispatch (A.dispatchLR): status In Transit, out date/time, truck and driver; own truck opens a trip TRP/n with the advance. Linked load plan and order are marked Dispatched.',
      'Mark delivered (A.deliverLR): status Delivered with delivery date, time, unloading charges and remark.',
      'Delete draft removes the LR permanently.',
    ],
    validations: [
      'Dispatch dialog: needs a truck; for own vehicles a driver. With a Smart Load Plan it shows a readiness checklist – LR finalised, plan confirmed, physical quantities reconciled (variance 0), vehicle matches plan, driver assigned – and blocks "Dispatch & start trip" until all are ticked.',
      'Store guards: "Only a finalised LR can be dispatched", "LR is already dispatched", "Smart Load Plan is not ready for dispatch", "Selected truck does not match the approved load plan".',
      'Delivery guard: "Dispatch the LR before recording delivery".',
      '"Delayed" = finalised, not delivered, due date before today.',
    ],
    mistakes: [
      'Deleting a draft LR made from an order – the order quantity drawn by the draft is not given back. Check the order afterwards.',
      'Using bulk "Print LRs" for many rows – it opens the preview of the first LR only and queues the rest as a message.',
    ],
    statuses: [
      { status: 'Draft / Finalised', meaning: 'Not yet moving.' },
      { status: 'In Transit', meaning: 'Road LR dispatched.' },
      { status: 'At Rail Head / Loaded / Rake In Transit / At Branch / Out for Delivery', meaning: 'Rail chain: GRN, VP loading, rake dispatch, DGRN, LDC.' },
      { status: 'Delivered', meaning: 'Delivered at consignee; POD pending.' },
      { status: 'POD Received / Billed / Paid', meaning: 'Stage shown after POD, after billing, and when the bill is fully paid.' },
    ],
    example: 'Customer care gets a call about SKT/NS/10454. Search the LR, open 360: stage In Transit, due yesterday, truck MH15 HH 7710. The Lifecycle shows "Dispatched – MH15 HH 7710" two days ago.',
    walkthrough: [
      { title: 'Find the LR', body: 'Search by LR number, consignor, route or truck, or use a quick filter.' },
      { title: 'Open the 360', body: 'The stepper shows Booked → Finalised → In Transit → Delivered → POD → Billed → Paid for road LRs.' },
      { title: 'Do the next step', body: 'Use the footer button: Dispatch, Mark delivered, Record POD or Bill.' },
      { title: 'Clean up drafts', body: 'Finalise or delete drafts so they do not sit in "Waiting for vehicle".' },
    ],
    related: ['ops/lr-new', 'ops/delivery', 'ops/pod', 'fleet/trips'],
    practice: 'ex.ops.dispatch-deliver',
    audio: [
      'यह LR register है — हर LR, road और rail, उसके stage के साथ।',
      'LR number या customer का नाम search कीजिए और row खोलिए, पूरा 360 view दिखेगा।',
      'सिर्फ़ Finalised LR dispatch होता है। Draft को पहले finalise कीजिए।',
      'Smart Load Plan वाले LR में dispatch तभी होगा जब loading confirm हो और truck plan वाला ही हो।',
      'Dispatch के बाद LR के route और truck बदले नहीं जा सकते।',
    ],
    quiz: ['q.ops.dispatch-draft', 'q.ops.slp-truck-mismatch', 'q.ops.locked-after-dispatch'],
    minutes: 6,
  },
  {
    id: 'ops/delivery',
    module: 'ops',
    title: 'Delivery',
    purpose: 'Close the road leg: record delivery date, time, unloading charges and remark for an LR in transit.',
    why: 'Delivery moves the LR to "Delivered – POD pending" and starts the POD clock. Unloading charges are added to the bill later.',
    when: 'As soon as the driver or consignee confirms the goods are unloaded.',
    roles: ['OP', 'BU', 'CC'],
    upstream: ['ops/lr'],
    downstream: ['ops/pod'],
    before: 'The road LR is dispatched (In Transit).',
    after: 'Status Delivered. The LR waits for POD; the trip of an own truck stays open until it is completed in Road Fleet.',
    prerequisites: ['LR status In Transit.'],
    actions: [
      'Filter by client (optional), pick the LR from "LR number" or tap it in the "In transit" list (late due dates in red).',
      'Enter delivery date, time, unloading charges (₹) and remark. Press "Mark delivered".',
      'Check "Recently delivered": On time or "n d late" against the due date, unloading and POD status.',
    ],
    records: ['A.deliverLR: LR status Delivered and delivery {date, time, remark, unloading}; event "Delivered at consignee"; linked load plan and order marked Delivered.'],
    validations: [
      '"Dispatch the LR before recording delivery" – only In Transit LRs can be delivered.',
      '"LR is already delivered".',
    ],
    mistakes: [
      'Selecting an LR that is only Finalised – the list shows them, but saving is refused. Dispatch it first.',
      'Trying to deliver a rail LR that is Out for Delivery – rail deliveries are closed by the supervisor acknowledgment on the LDC (LDC Acknowledgment), not here.',
      'Forgetting unloading charges – they are copied into the bill row; if left 0 they are not billed.',
    ],
    warnings: ['Marking delivered does not close the truck trip. Close it in Road Fleet → Trip Completion.'],
    example: 'Driver of MH19 CY 4417 calls at 13:45: unloaded at Konkan, Taloja, ₹600 unloading paid. Select SKT/JL/10459, enter 13:45 and ₹600, Mark delivered.',
    walkthrough: [
      { title: 'Pick the LR', body: 'Use the dropdown or the "In transit" list on the right.' },
      { title: 'Check the summary', body: 'Source, destination, truck, consignee and due date are shown.' },
      { title: 'Enter delivery details', body: 'Actual date and time, unloading charges and remark.' },
      { title: 'Mark delivered', body: 'The LR moves to POD pending.' },
    ],
    related: ['ops/pod', 'fleet/trip-completion', 'ops/ldc'],
    practice: 'ex.ops.dispatch-deliver',
    audio: [
      'यहाँ road LR की delivery दर्ज होती है।',
      'List से LR चुनिए। लाल तारीख वाले LR अपनी due date पार कर चुके हैं।',
      'Delivery की असली तारीख, समय और unloading charges भरिए, फिर Mark delivered दबाइए।',
      'सिर्फ़ In Transit वाला LR deliver होता है। Finalised LR को पहले dispatch कीजिए।',
      'Truck की trip अपने आप बंद नहीं होती, उसे Trip Completion में बंद कीजिए।',
    ],
    quiz: ['q.ops.deliver-needs-dispatch', 'q.ops.delivery-trip-open'],
    minutes: 3,
  },
  {
    id: 'ops/pod',
    module: 'ops',
    title: 'POD / Acknowledgment',
    purpose: 'Record the signed consignee copy (POD) when it reaches the office: received and damaged quantities, detention, courier docket, damage amount and scan.',
    why: 'Billing is blocked until POD is recorded, unless the customer is allowed to bill without acknowledgment. Detention and damage entered here flow into the bill.',
    when: 'The day the POD copy arrives by courier or by hand.',
    roles: ['CC', 'BU', 'OP'],
    upstream: ['ops/delivery', 'ops/ldc', 'ops/courier'],
    downstream: ['fin/billing'],
    before: 'The LR is Delivered and has no POD yet.',
    after: 'Stage "POD Received". To Be Billed LRs appear in Customer Billing; To Pay / Paid LRs close on the board.',
    prerequisites: ['LR status Delivered without POD.'],
    actions: [
      'Pick the LR (or tap it in "Pending PODs", oldest first, age turns amber after 4 days and red after 7).',
      'Per item, enter Received and Damage. Enter received date and time, detention days (amount fills at the agreement rate, default ₹1,500/day), docket no., courier, courier charge, damage amount, remark, and upload the POD scan.',
      'Press "Submit".',
      'In "Acknowledgments received": Download POD, Print acknowledgment, Delete (not billed).',
    ],
    records: ['A.receiveAck: LR ack {received date/time, docket, courier, detention days/amount, damage amount, items, uploads}; item damage copied to the LR; event "POD / acknowledgment received"; linked load plan and order marked POD Received.'],
    validations: [
      '"Record delivery before POD" – only Delivered LRs.',
      '"POD is already recorded" – one POD per LR.',
      'Delete POD: hidden for billed LRs; the store refuses with "Delete the bill before removing POD".',
    ],
    mistakes: [
      'Recording detention or damage only in the remark – only the Detention amount and Damage amount fields go into the bill (detention added, damage deducted).',
      'Using "Edit" on a received POD to correct it – saving is refused with "POD is already recorded". Delete the POD (if not billed) and record it again.',
      'Deleting a POD by mistake – the LR goes back to "awaiting POD" and drops out of the billing queue.',
    ],
    fields: [
      { name: 'Detention days / amount', help: 'Days the truck waited at the consignee. Amount = days × agreement detention rate; it is added to the bill row.' },
      { name: 'Damage amount', help: 'Value of damaged goods to be deducted from the bill.' },
      { name: 'Docket no. / Courier name', help: 'How the POD copy came to the office; used to trace lost PODs.' },
    ],
    example: 'POD for SKT/PN/10449 arrives by DTDC: 2 cartons damaged, truck held 1 day. Enter Damage 2, detention 1 day (₹1,500 at the default rate), damage amount ₹1,800, docket DTDC 48810234, upload the scan, Submit.',
    walkthrough: [
      { title: 'Choose the LR', body: 'Oldest pending POD first – red ones are over 7 days old.' },
      { title: 'Check quantities', body: 'Received and damaged quantity for each item, as written on the POD.' },
      { title: 'Charges and courier', body: 'Detention, damage amount, docket and courier.' },
      { title: 'Upload and submit', body: 'Attach the scan and press Submit. The LR becomes eligible for billing.' },
    ],
    related: ['fin/billing', 'ops/courier', 'wh/damage'],
    practice: 'ex.ops.record-pod',
    audio: [
      'यहाँ signed POD copy दर्ज होती है।',
      'POD के बिना bill नहीं बनता, इसलिए POD आते ही उसी दिन record कीजिए।',
      'Damage और detention सही fields में भरिए। Detention bill में जुड़ता है और damage घटता है।',
      'एक LR का POD एक ही बार record होता है। गलती हो तो, bill बनने से पहले, POD delete करके दोबारा भरिए।',
      'Pending list में सबसे पुराने POD सबसे ऊपर हैं, लाल वाले सात दिन से ज़्यादा पुराने हैं।',
    ],
    quiz: ['q.ops.pod-before-billing', 'q.ops.pod-once', 'q.ops.pod-detention'],
    minutes: 5,
  },
  {
    id: 'ops/courier',
    module: 'ops',
    title: 'Courier',
    purpose: 'Register of documents sent between branches by courier – PODs, LDC copies, bills, cheques – and their receipt at the destination branch.',
    why: 'PODs travel from branches to head office by courier. Tracking dockets shows which PODs are still on the way before billing can start.',
    when: 'When a branch sends a courier packet, and when the receiving branch gets it.',
    roles: ['BU', 'CC', 'OP'],
    upstream: ['ops/pod'],
    downstream: ['ops/pod'],
    before: 'Documents are packed at the sending branch.',
    after: 'The packet shows "Sent" until the destination marks it "Received".',
    prerequisites: ['Docket number from the courier company.'],
    actions: [
      'Press "Send courier": From/To branch, sent date and time, docket no., courier name, charges (₹), particular (for example "14 PODs for Sept"), remark. Save.',
      'Sent courier tab: Edit or Delete entries not yet received.',
      'Received courier tab: "Mark received" on a row, or tick rows and use the bulk "Mark received".',
    ],
    records: ['Courier entries (couriers) with received flag, received date, time and receiver.'],
    validations: ['Edit and Delete are hidden once a courier is received.'],
    mistakes: [
      'Saving without a docket number – the field is marked required but the ERP still saves an empty docket, so the packet cannot be traced.',
      'Marking the packet received without recording each POD inside – Courier only tracks the packet; POD must still be recorded per LR on the POD screen.',
    ],
    statuses: [
      { status: 'Sent', meaning: 'Dispatched by the sending branch, not yet received.' },
      { status: 'Received', meaning: 'Received at the destination branch; locked.' },
    ],
    example: 'Pune sends 9 PODs to Jalgaon: docket DTDC 77120391, ₹90, particular "9 PODs – Deccan, Meridian". Jalgaon marks it received next day and records the 9 PODs.',
    walkthrough: [
      { title: 'Send', body: 'Fill branches, docket, courier, charges and what is inside.' },
      { title: 'Track', body: 'Received courier tab shows days in transit for each packet.' },
      { title: 'Receive', body: 'Mark received when the packet arrives, then record the PODs.' },
    ],
    related: ['ops/pod'],
    audio: [
      'यहाँ branches के बीच भेजे गए courier का हिसाब रहता है — POD, LDC copies, bills और cheques।',
      'Send courier दबाइए, docket number ज़रूर भरिए, और particular में लिखिए कि packet में क्या है।',
      'Packet आने पर Received courier tab में Mark received दबाइए।',
      'Received होने के बाद entry बदली या delete नहीं हो सकती।',
      'Packet में आए हर POD को POD screen पर अलग से record कीजिए।',
    ],
    quiz: ['q.ops.courier-received'],
    minutes: 2,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------------------
export const questions: Question[] = [
  {
    id: 'q.ops.dispatch-draft', module: 'ops', type: 'scenario', difficulty: 1,
    prompt: 'What happens if you try to dispatch this LR?',
    scenario: 'LR SKT/PN/10462 was saved with "Save draft". The truck is at the gate and the dispatcher wants to send it now.',
    options: [
      { id: 'a', text: 'It is dispatched; the draft is finalised automatically.' },
      { id: 'b', text: 'It is refused: only a finalised LR can be dispatched. Open the LR, fix any issues and press Finalise LR first.' },
      { id: 'c', text: 'It is dispatched but cannot be billed later.' },
      { id: 'd', text: 'Accounts must approve the draft before dispatch.' },
    ],
    answer: 'b',
    explanation: 'Dispatch is offered only for Finalised road LRs, and the store refuses others with "Only a finalised LR can be dispatched". Finalise in Generate LR (freight and truck are required for a road LR), then dispatch.',
    screens: ['ops/lr', 'ops/lr-new'],
  },
  {
    id: 'q.ops.finalise-requirements', module: 'ops', type: 'mcq', difficulty: 2,
    prompt: 'Which two things must a road LR have before Generate LR lets you finalise it (in addition to consignor, consignee, destination and items)?',
    options: [
      { id: 'a', text: 'Total freight and an assigned truck.' },
      { id: 'b', text: 'Goods value and insurance number.' },
      { id: 'c', text: 'Invoice number and seal number.' },
      { id: 'd', text: 'A POD scan and the driver\'s mobile.' },
    ],
    answer: 'a',
    explanation: 'Finalise checks "Total freight is required to finalise" and "Assign a truck to finalise a road LR". Invoice, seal, goods value and insurance are optional. A market truck also needs the lorry freight.',
    screens: ['ops/lr-new'],
  },
  {
    id: 'q.ops.slp-finalise-gate', module: 'ops', type: 'scenario', difficulty: 3,
    prompt: 'Why does Finalise LR fail, and what is the fix?',
    scenario: 'Order ORD-1018 has Smart Load Plan SLP-00004 with status Approved. The branch picks the order in Generate LR, assigns the truck and presses Finalise LR.',
    options: [
      { id: 'a', text: 'Approved plans lock the order; the order must be re-created.' },
      { id: 'b', text: 'The plan is not loading-confirmed. The supervisor must record the physical loading (loaded + damage + shortage = planned) and press "Confirm loading" in Smart Load Planning; then finalise.' },
      { id: 'c', text: 'The truck must be removed from the LR because the plan already has it.' },
      { id: 'd', text: 'Accounts must bill the plan first.' },
    ],
    answer: 'b',
    explanation: 'For a road LR on an order with a load plan, Generate LR blocks finalisation with "Smart Load Plan SLP-… must be loading-confirmed before finalising this LR". Loading confirmation needs an Approved plan, a supervisor and zero variance. The geometric plan is not certified axle-load, stability or securement analysis – the physical check is what confirms the load.',
    screens: ['ops/lr-new', 'ops/smart-load', 'wh/verification'],
  },
  {
    id: 'q.ops.slp-truck-mismatch', module: 'ops', type: 'scenario', difficulty: 3,
    prompt: 'The load plan was confirmed on truck MH19 CY 4417. At dispatch the dispatcher selects MH19 AX 2208 because it is free. What happens?',
    options: [
      { id: 'a', text: 'Dispatch works and the plan updates to the new truck.' },
      { id: 'b', text: 'Dispatch is blocked: the readiness check shows "Vehicle matches load plan" failed ("Selected truck does not match the approved load plan").' },
      { id: 'c', text: 'Dispatch works but a warning is emailed to the manager.' },
      { id: 'd', text: 'The LR goes back to Draft.' },
    ],
    answer: 'b',
    explanation: 'The cargo layout was planned for a specific vehicle. The Dispatch dialog shows a readiness checklist and the store refuses a different truck. Load the planned truck, or make a new plan revision for the other truck.',
    screens: ['ops/lr', 'ops/smart-load'],
  },
  {
    id: 'q.ops.pod-before-billing', module: 'ops', type: 'tf', difficulty: 1,
    prompt: 'True or false: a To Be Billed LR that is Delivered but has no POD appears in Customer Billing for a normal customer.',
    options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    answer: 'f',
    explanation: 'The billing queue needs a finalised, Delivered, To Be Billed LR with POD recorded. Only customers marked "Bill without ack" in Customer 360 can be billed before POD. Record the POD first.',
    screens: ['ops/pod', 'fin/billing'],
  },
  {
    id: 'q.ops.bill-without-ack', module: 'ops', type: 'scenario', difficulty: 2,
    prompt: 'Can Accounts bill this LR today?',
    scenario: 'Meridian Electronics (customer setting "Bill without ack: Allowed") – LR delivered yesterday, To Be Billed, POD not yet received.',
    options: [
      { id: 'a', text: 'Yes – this customer is allowed to be billed without acknowledgment, so the delivered LR is already in the billing queue.' },
      { id: 'b', text: 'No – POD is always required.' },
      { id: 'c', text: 'Only after the truck trip is completed.' },
      { id: 'd', text: 'Only as a To Pay LR.' },
    ],
    answer: 'a',
    explanation: 'Eligible for billing = Delivered + To Be Billed + (POD received OR customer allows billing without ack). Delivery is still required. Record the POD later anyway – detention and damage come from it.',
    screens: ['fin/billing', 'ops/pod'],
  },
  {
    id: 'q.ops.to-pay-board', module: 'ops', type: 'mcq', difficulty: 2,
    prompt: 'An LR is booked "To Pay" (receiver pays). After delivery the POD is recorded. Where is it on the Order Board?',
    options: [
      { id: 'a', text: 'Ready to bill' },
      { id: 'b', text: 'Billed – awaiting payment' },
      { id: 'c', text: 'Paid / closed' },
      { id: 'd', text: 'Delivered – POD pending' },
    ],
    answer: 'c',
    explanation: 'To Pay and Paid LRs are not billed through Customer Billing (only To Be Billed LRs are). Once POD is recorded the board closes them as Paid. Choose "We bill later" (To Be Billed) for customers billed monthly.',
    screens: ['board', 'book', 'ops/lr-new'],
  },
  {
    id: 'q.ops.draft-order-qty', module: 'ops', type: 'scenario', difficulty: 3,
    prompt: 'What does the order show after this draft is saved?',
    scenario: 'Order ORD-1009 (Item, 800 pieces) is Confirmed. In Generate LR you pick it, keep 800 pieces and press Save draft – not Finalise.',
    options: [
      { id: 'a', text: 'Still Confirmed, 800 pending – drafts do not count.' },
      { id: 'b', text: 'Completed, 0 pending – the draft already draws down the order. Finalise the draft or the load never moves.' },
      { id: 'c', text: 'Rejected.' },
      { id: 'd', text: 'Preclosed.' },
    ],
    answer: 'b',
    explanation: 'Creating any LR from an order, even a draft, reduces the order\'s remaining quantity and sets it In Process or Completed. A forgotten draft makes the order look fulfilled. Deleting the draft later does not give the quantity back.',
    screens: ['ops/lr-new', 'ops/orders'],
  },
  {
    id: 'q.ops.order-flow', module: 'ops', type: 'order', difficulty: 1,
    prompt: 'Put the road consignment steps in the order the ERP requires them.',
    items: [
      { id: 'pod', text: 'Record POD' },
      { id: 'order', text: 'Create order' },
      { id: 'dispatch', text: 'Dispatch the LR' },
      { id: 'bill', text: 'Generate bill' },
      { id: 'confirm', text: 'Confirm order' },
      { id: 'lr', text: 'Generate and finalise LR' },
      { id: 'deliver', text: 'Mark delivered' },
    ],
    answer: ['order', 'confirm', 'lr', 'dispatch', 'deliver', 'pod', 'bill'],
    explanation: 'Generate LR lists only Confirmed/In Process orders; dispatch needs a Finalised LR; delivery needs In Transit; POD needs Delivered; billing needs POD (unless the customer bills without ack).',
    screens: ['ops/orders', 'ops/order-confirmation', 'ops/lr-new', 'ops/lr', 'ops/delivery', 'ops/pod'],
  },
  {
    id: 'q.ops.credit-hold', module: 'ops', type: 'mcq', difficulty: 2,
    prompt: 'Narmada Steel Tubes is on credit hold. Which statement is correct in this ERP?',
    options: [
      { id: 'a', text: 'Every screen blocks bookings for them.' },
      { id: 'b', text: 'Orders and Generate LR block them, but New booking only shows a warning – so check with Accounts before using New booking.' },
      { id: 'c', text: 'Only billing is blocked.' },
      { id: 'd', text: 'Credit hold only changes the colour of the customer name.' },
    ],
    answer: 'b',
    explanation: 'The order form refuses with "…is on credit hold – new bookings are disallowed" and Generate LR with "…LR booking disallowed". New booking and the board\'s quick Confirm only warn. Accounts lifts the hold in Customer 360.',
    screens: ['ops/orders', 'ops/lr-new', 'book'],
  },
  {
    id: 'q.ops.confirm-credit-hold', module: 'ops', type: 'next', difficulty: 2,
    prompt: 'Order Confirmation shows "Booking: Credit hold" in red for this customer\'s pending order. What should you do next?',
    options: [
      { id: 'a', text: 'Confirm it – the LR will go through anyway.' },
      { id: 'b', text: 'Ask Accounts to clear outstanding or lift the hold in Customer 360 before confirming; otherwise reject with a reason.' },
      { id: 'c', text: 'Delete the order.' },
      { id: 'd', text: 'Pre-close the order.' },
    ],
    answer: 'b',
    explanation: 'Confirmation does not block credit hold, but Generate LR will refuse the LR. Confirming creates a card stuck in "Waiting for vehicle". Get Accounts\' decision first.',
    screens: ['ops/order-confirmation', 'cust/360'],
  },
  {
    id: 'q.ops.order-edit-pending', module: 'ops', type: 'mcq', difficulty: 1,
    prompt: 'From the Orders list, when can you still edit an order?',
    options: [
      { id: 'a', text: 'Any time before the bill.' },
      { id: 'b', text: 'Only while it is Pending. After confirmation, change pickup and quantities through a new order or pre-close.' },
      { id: 'c', text: 'Only after an LR exists.' },
      { id: 'd', text: 'Never.' },
    ],
    answer: 'b',
    explanation: 'The Edit row action and the editable fields in Order Confirmation are only for Pending orders. With an approved Smart Load Plan, operational order fields are locked anyway.',
    screens: ['ops/orders', 'ops/order-confirmation'],
  },
  {
    id: 'q.ops.order-quantity', module: 'ops', type: 'scenario', difficulty: 2,
    prompt: 'What is the order status after the first LR?',
    scenario: 'ORD-1005: Book by Item, 2,400 bags. An LR for 1,400 bags is finalised against it.',
    options: [
      { id: 'a', text: 'Completed' },
      { id: 'b', text: 'In Process, 1,000 pending' },
      { id: 'c', text: 'Confirmed, 2,400 pending' },
      { id: 'd', text: 'Preclosed' },
    ],
    answer: 'b',
    explanation: 'Each LR draws down the order. The order is Completed only when every item has 0 remaining (or, for truck orders, no trucks remain). Use Pre-close if the customer cancels the rest.',
    screens: ['ops/orders'],
  },
  {
    id: 'q.ops.deliver-needs-dispatch', module: 'ops', type: 'next', difficulty: 1,
    prompt: 'The consignee phones: goods received. In the ERP the LR is still "Finalised". What is the correct next step?',
    options: [
      { id: 'a', text: 'Mark delivered on the Delivery screen.' },
      { id: 'b', text: 'Record the POD.' },
      { id: 'c', text: 'Dispatch the LR with the truck that carried it, then mark it delivered.' },
      { id: 'd', text: 'Generate the bill.' },
    ],
    answer: 'c',
    explanation: 'Delivery is refused with "Dispatch the LR before recording delivery" unless the LR is In Transit. Dispatch first (it records truck, trip and out time), then mark delivered.',
    screens: ['ops/delivery', 'ops/lr'],
  },
  {
    id: 'q.ops.delivery-trip-open', module: 'ops', type: 'mcq', difficulty: 2,
    prompt: 'You mark an own-truck LR delivered. What happens to the truck trip opened at dispatch?',
    options: [
      { id: 'a', text: 'It closes automatically with the closing KM.' },
      { id: 'b', text: 'It stays open until the truck is closed in Road Fleet → Trip Completion.' },
      { id: 'c', text: 'It is deleted.' },
      { id: 'd', text: 'It moves to the next LR.' },
    ],
    answer: 'b',
    explanation: 'Delivery only updates the LR. Open trips block log slips and diesel settlement; My Work lists trips open more than 5 days under "Close finished trips".',
    screens: ['ops/delivery', 'fleet/trip-completion'],
  },
  {
    id: 'q.ops.pod-once', module: 'ops', type: 'tf', difficulty: 1,
    prompt: 'True or false: if you typed the wrong detention on a POD, you can open it with Edit and submit the corrected values.',
    options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    answer: 'f',
    explanation: 'A POD is recorded once – submitting again is refused with "POD is already recorded". If the LR is not billed, Delete the POD and record it again. If billed, the bill must be deleted first.',
    screens: ['ops/pod'],
  },
  {
    id: 'q.ops.pod-detention', module: 'ops', type: 'mcq', difficulty: 2,
    prompt: 'On the POD you enter detention ₹1,500 and damage amount ₹1,800. What does Customer Billing do with them?',
    options: [
      { id: 'a', text: 'Ignores both; they are for information only.' },
      { id: 'b', text: 'Adds the detention and deducts the damage on that LR\'s bill row.' },
      { id: 'c', text: 'Adds both.' },
      { id: 'd', text: 'Deducts both.' },
    ],
    answer: 'b',
    explanation: 'Bill rows take detention (dtnWH) and unloading from delivery as additions, and the POD damage amount as a deduction. Text written only in remarks is not billed.',
    screens: ['ops/pod', 'fin/billing'],
  },
  {
    id: 'q.ops.locked-after-dispatch', module: 'ops', type: 'spot', difficulty: 2,
    prompt: 'Spot the step that will NOT work in the ERP.',
    options: [
      { id: 'a', text: 'Edit a Finalised (not yet dispatched) LR to change the consignee address.' },
      { id: 'b', text: 'Delete a Draft LR from the LR register.' },
      { id: 'c', text: 'After dispatch, open Generate LR and change the destination city because the customer redirected the truck.' },
      { id: 'd', text: 'Print the freight slip of a delivered LR.' },
    ],
    answer: 'c',
    explanation: 'Once an LR is In Transit, Delivered, POD-received or billed, saving it is refused ("Dispatched/delivered/billed LR operational fields are locked"). Route corrections after dispatch go through an admin (Data Corrections).',
    screens: ['ops/lr-new', 'ops/lr'],
  },
  {
    id: 'q.ops.quick-decide-later', module: 'ops', type: 'mcq', difficulty: 2,
    prompt: 'In New booking you choose "Decide later" for the truck and press "Book LR". What is the result?',
    options: [
      { id: 'a', text: 'A draft LR.' },
      { id: 'b', text: 'A finalised LR without a truck. It waits in "Waiting for vehicle" with the button "Assign truck", which opens the Dispatch dialog.' },
      { id: 'c', text: 'An order, not an LR.' },
      { id: 'd', text: 'Nothing is saved until a truck is chosen.' },
    ],
    answer: 'b',
    explanation: 'New booking always finalises the LR. Without a truck it is listed in My Work "Assign a truck" and on the board under Waiting for vehicle until it is dispatched.',
    screens: ['book', 'work', 'board'],
  },
  {
    id: 'q.ops.courier-received', module: 'ops', type: 'mcq', difficulty: 1,
    prompt: 'A courier packet of PODs reaches Jalgaon. What should the receiving branch do?',
    options: [
      { id: 'a', text: 'Mark the courier received, then record each POD on the POD screen.' },
      { id: 'b', text: 'Only mark the courier received – the PODs inside are recorded automatically.' },
      { id: 'c', text: 'Delete the courier entry.' },
      { id: 'd', text: 'Edit the sent entry and change the To branch.' },
    ],
    answer: 'a',
    explanation: 'Courier only tracks the packet (docket, dates, charges). PODs are recorded per LR on the POD screen. After "Mark received" the courier entry can no longer be edited or deleted.',
    screens: ['ops/courier', 'ops/pod'],
  },
  {
    id: 'q.home.board-red-card', module: 'home', type: 'mcq', difficulty: 1,
    prompt: 'What does a red card on the Order Board mean?',
    options: [
      { id: 'a', text: 'The customer has not paid.' },
      { id: 'b', text: 'It has stayed in its stage longer than the time limit for that stage.' },
      { id: 'c', text: 'It is an urgent priority LR.' },
      { id: 'd', text: 'It is a rail consignment.' },
    ],
    answer: 'b',
    explanation: 'Each stage has a time limit (Stage Time Limits). Amber = 80% of the limit used, red = over the limit. The card shows the reason (for example "POD not received") and who it waits on.',
    screens: ['board', 'dashboard', 'admin/time-limits'],
  },
  {
    id: 'q.home.pod-time-limit', module: 'home', type: 'mcq', difficulty: 2,
    prompt: 'With the default time limits, after how many days does a delivered LR without POD turn red?',
    options: [
      { id: 'a', text: '1 day' },
      { id: 'b', text: '3 days' },
      { id: 'c', text: 'More than 7 days' },
      { id: 'd', text: '30 days' },
    ],
    answer: 'c',
    explanation: 'Default limits: Booked 0.25 day, Waiting for vehicle 1 day, On the way = transit days + 1, POD pending 7 days, Ready to bill 3 days, Billed = customer credit days. Admins can change them.',
    screens: ['board', 'dashboard'],
  },
  {
    id: 'q.home.board-drag', module: 'home', type: 'tf', difficulty: 1,
    prompt: 'True or false: you can drag an "On the way" card straight to "Ready to bill" to skip delivery and POD.',
    options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
    answer: 'f',
    explanation: 'Cards move one column at a time; a bigger jump shows "Move one step at a time". Dropping on the next column runs the card\'s next step (for example Mark delivered).',
    screens: ['board'],
  },
  {
    id: 'q.home.assign-truck', module: 'home', type: 'next', difficulty: 2,
    prompt: 'My Work shows LR SKT/JL/10470 under "Assign a truck". What does pressing "Assign truck" do?',
    options: [
      { id: 'a', text: 'Opens Fleet → Trucks.' },
      { id: 'b', text: 'Opens the Dispatch dialog: choose truck (and driver for our trucks), opening KM and advance, then "Dispatch & start trip".' },
      { id: 'c', text: 'Assigns the first free truck automatically.' },
      { id: 'd', text: 'Sends the LR back to draft.' },
    ],
    answer: 'b',
    explanation: 'A finalised road LR with no truck is in "Waiting for vehicle". Assign truck runs dispatch, which sets the truck, moves the LR to In Transit and opens a trip for our own trucks.',
    screens: ['work', 'board'],
  },
  {
    id: 'q.home.bulk-pod-damage', module: 'home', type: 'scenario', difficulty: 2,
    prompt: 'Six PODs arrived; one shows 3 damaged cartons. How should you record them?',
    options: [
      { id: 'a', text: 'Tick all six in My Work and press "POD for 6".' },
      { id: 'b', text: 'Bulk-record the five clean PODs, and record the damaged one alone (POD screen or the single-LR POD dialog) with the damage.' },
      { id: 'c', text: 'Record none until the damage is settled.' },
      { id: 'd', text: 'Write the damage in the courier remark.' },
    ],
    answer: 'b',
    explanation: 'Bulk POD marks all goods received in full ("Open an LR to record damage on it"). Damage on the POD flows into the LR items and the damage report, and the damage amount is deducted on the bill.',
    screens: ['work', 'board', 'ops/pod'],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Practice exercises
// ---------------------------------------------------------------------------------------------------------------
export const exercises: Exercise[] = [
  {
    id: 'ex.ops.create-order',
    title: 'Create a customer order and confirm it',
    module: 'ops',
    roles: ['OP', 'BU', 'CC', 'AD', 'SA'],
    summary: 'Book an order for a customer, then confirm it so it can be used in Generate LR.',
    minutes: 5,
    watch: ['orders'],
    steps: [
      {
        id: 'create',
        task: 'In Operations → Orders press "New order". Choose a client that is not on credit hold (for example Voyager Luggage Co.), keep From/To branch the same, set pickup tomorrow, Book by Truck with 1 truck, add one item with a quantity, and press "Submit order".',
        expected: 'A new order ORD-… with status Pending.',
        screen: 'ops/orders',
        check: (db, base) => {
          const o = last(myOrders(db, base));
          return o ? pass(`Order ${o.orderNo} created for ${custName(db, o.clientId)} (${o.status})`) : notYet('No new order yet');
        },
      },
      {
        id: 'confirm',
        task: 'Open Order Confirmation, select the order you created, check the credit box, keep Order status "Confirmed" and press "Confirm order".',
        expected: 'Your new order is Confirmed.',
        screen: 'ops/order-confirmation',
        check: (db, base) => {
          const mine = myOrders(db, base);
          const ok = mine.find((o) => CONFIRMED.includes(o.status));
          if (ok) return pass(`Order ${ok.orderNo} confirmed (${ok.status})`);
          const rej = mine.find((o) => o.status === 'Rejected');
          if (rej) return notYet(`Order ${rej.orderNo} was rejected – create a new order and confirm it`);
          const other = changed(db, base, 'orders', (o, old) => old === 'Pending' && o.status === 'Confirmed');
          if (other.length) return notYet(`You confirmed ${other[0].orderNo}, an older order – confirm the order you created`);
          return mine.length ? notYet(`Order ${mine[0].orderNo} is still ${mine[0].status}`) : notYet('Create the order first');
        },
      },
    ],
  },
  {
    id: 'ex.ops.quick-booking',
    title: 'Make an LR with New booking and send the truck',
    module: 'ops',
    roles: ['OP', 'BU', 'CC', 'AD', 'SA'],
    summary: 'Use the 3-step New booking to make a finalised road LR and dispatch it on one of our trucks.',
    minutes: 5,
    watch: ['lrs', 'trips'],
    steps: [
      {
        id: 'book',
        task: 'Open Operations → New booking. Step 1: pick a customer (for example Indus Cool Appliances), Road, check destination and consignee. Step 2: check goods, pieces and freight; keep "We bill later".',
        expected: 'After step 3 a new LR with remark "Booked with quick booking".',
        screen: 'book',
        check: (db, base) => {
          const l = last(created(db, base, 'lrs', (x) => x.remark === QUICK_REMARK));
          if (l) return pass(`LR ${l.lrNo} booked with New booking (${l.status})`);
          const other = last(created(db, base, 'lrs'));
          return other ? notYet(`LR ${other.lrNo} was made in Generate LR – use New booking for this exercise`) : notYet('No LR booked yet');
        },
      },
      {
        id: 'send',
        task: 'Step 3: choose "Our truck", pick a free truck and driver, keep the trip advance and press "Book & send truck".',
        expected: 'The new LR is In Transit with a truck; a trip is opened in Road Fleet.',
        screen: 'book',
        check: (db, base) => {
          const mine = created(db, base, 'lrs', (x) => x.remark === QUICK_REMARK);
          const moving = mine.find((x) => MOVED.includes(x.status) && x.truckId);
          if (moving) {
            const trip = list(db, 'trips').find((t) => t.lrId === moving.id);
            return pass(`LR ${moving.lrNo} on the way with ${truckNo(db, moving.truckId)}${trip ? ` – trip ${trip.name} opened` : ''}`);
          }
          const waiting = mine.find((x) => x.status === 'Finalised');
          if (waiting) return notYet(`LR ${waiting.lrNo} is waiting for a vehicle – choose a truck and use "Book & send truck" (or Assign truck in My Work)`);
          return notYet('Book an LR with a truck first');
        },
      },
    ],
  },
  {
    id: 'ex.ops.dispatch-deliver',
    title: 'Dispatch an LR and mark it delivered',
    module: 'ops',
    roles: ['OP', 'BU', 'AD', 'SA'],
    summary: 'Take a finalised road LR, dispatch it, then record its delivery at the consignee.',
    minutes: 5,
    watch: ['lrs', 'trips'],
    steps: [
      {
        id: 'dispatch',
        task: 'Open LR & Consignments, quick filter "Moving" or search for a Finalised road LR (or finalise the draft one first). Use the row action "Dispatch", check truck and driver, and press "Dispatch & start trip".',
        expected: 'An LR that was Finalised is now In Transit.',
        screen: 'ops/lr',
        check: (db, base) => {
          const l = last(dispatchedNow(db, base));
          return l ? pass(`LR ${l.lrNo} dispatched with ${truckNo(db, l.truckId)} (${l.status})`) : notYet('No LR dispatched yet');
        },
      },
      {
        id: 'deliver',
        task: 'Open Operations → Delivery, pick the LR you just dispatched, enter delivery time and unloading charges, and press "Mark delivered".',
        expected: 'The same LR is Delivered.',
        screen: 'ops/delivery',
        check: (db, base) => {
          const mine = dispatchedNow(db, base);
          const done = mine.find((l) => l.status === 'Delivered');
          if (done) return pass(`LR ${done.lrNo} delivered on ${done.delivery?.date || 'today'}${done.delivery?.unloading ? ` (unloading ₹${done.delivery.unloading})` : ''}`);
          const other = changed(db, base, 'lrs', (l, old) => old === 'In Transit' && l.status === 'Delivered');
          if (other.length) return notYet(`You delivered ${other[0].lrNo}, which was already on the road – deliver the LR you dispatched in step 1`);
          return mine.length ? notYet(`LR ${mine[0].lrNo} is still ${mine[0].status}`) : notYet('Dispatch an LR first');
        },
      },
    ],
  },
  {
    id: 'ex.ops.record-pod',
    title: 'Record PODs',
    module: 'ops',
    roles: ['CC', 'BU', 'OP', 'AD', 'SA'],
    summary: 'Record one POD with full details on the POD screen, then a second one from the Order Board.',
    minutes: 5,
    watch: ['lrs'],
    steps: [
      {
        id: 'pod-screen',
        task: 'Open Operations → POD / Acknowledgment. Pick the oldest LR in "Pending PODs", check received quantities, enter docket no. and courier, and press "Submit".',
        expected: 'The LR now has a POD (stage POD Received).',
        screen: 'ops/pod',
        check: (db, base) => {
          const l = last(fieldChanged(db, base, 'lrs', 'ack', (x) => !!x.ack));
          return l ? pass(`POD recorded for ${l.lrNo} (received ${l.ack?.receivedDate || 'today'})`) : notYet('No POD recorded yet');
        },
      },
      {
        id: 'pod-board',
        task: 'Open the Order Board, column "Delivered – POD pending". Press "Record POD" on a card (or tick a card and press "POD received · 1") and save.',
        expected: 'A second LR has a POD.',
        screen: 'board',
        check: (db, base) => {
          const all = fieldChanged(db, base, 'lrs', 'ack', (x) => !!x.ack);
          if (all.length >= 2) return pass(`PODs recorded for ${all.length} LRs: ${all.slice(-2).map((x) => x.lrNo).join(', ')}`);
          return all.length ? notYet(`1 POD recorded (${all[0].lrNo}) – record one more from the board`) : notYet('No POD recorded yet');
        },
      },
    ],
  },
  {
    id: 'ex.ops.road-e2e',
    title: 'Road consignment end to end: order to bill',
    module: 'ops',
    roles: ['OP', 'BU', 'AD', 'SA'],
    summary: 'Take one customer order all the way: create, confirm, LR, dispatch, delivery, POD and bill.',
    minutes: 15,
    workflow: true,
    watch: ['orders', 'lrs', 'bills', 'trips'],
    steps: [
      {
        id: 'order',
        task: 'Orders → New order. Choose a customer not on credit hold, keep From branch = To branch (so the LR is a road LR), Book by Truck, 1 truck, one item. Submit.',
        expected: 'New order, Pending.',
        screen: 'ops/orders',
        check: (db, base) => {
          const o = last(myOrders(db, base));
          return o ? pass(`Order ${o.orderNo} created (${o.status})`) : notYet('No new order yet');
        },
      },
      {
        id: 'confirm',
        task: 'Order Confirmation → select your order → Confirm order. (If you will use New booking for the LR, enter a billing amount – New booking uses it as the default freight.)',
        expected: 'Your order is Confirmed.',
        screen: 'ops/order-confirmation',
        check: (db, base) => {
          const o = myOrders(db, base).find((x) => CONFIRMED.includes(x.status));
          return o ? pass(`Order ${o.orderNo} confirmed (${o.status})`) : notYet('Your new order is not confirmed yet');
        },
      },
      {
        id: 'lr',
        task: 'Make the LR from the order: Generate LR → From order (or "Create LR" on the order). Choose consignee and destination, assign a truck, enter freight, keep To Be Billed and press "Finalise LR".',
        expected: 'A finalised LR linked to your order.',
        screen: 'ops/lr-new',
        check: (db, base) => {
          const lrs = myOrderLRs(db, base);
          const fin = lrs.find((l) => l.isFinal);
          if (fin) return pass(`LR ${fin.lrNo} finalised for order ${fin.orderNo} (${fin.status})`);
          return lrs.length ? notYet(`LR ${lrs[0].lrNo} is still a draft – finalise it`) : notYet('No LR made from your order yet');
        },
      },
      {
        id: 'dispatch',
        task: 'Dispatch the LR ("Dispatch now" on the success page, or Dispatch in the LR register).',
        expected: 'The LR is In Transit.',
        screen: 'ops/lr',
        check: (db, base) => {
          const l = myOrderLRs(db, base).find((x) => MOVED.includes(x.status));
          return l ? pass(`LR ${l.lrNo} dispatched with ${truckNo(db, l.truckId)} (${l.status})`) : notYet('Your LR is not dispatched yet');
        },
      },
      {
        id: 'deliver',
        task: 'Delivery → pick your LR → Mark delivered.',
        expected: 'The LR is Delivered.',
        screen: 'ops/delivery',
        check: (db, base) => {
          const l = myOrderLRs(db, base).find((x) => x.status === 'Delivered');
          return l ? pass(`LR ${l.lrNo} delivered on ${l.delivery?.date || 'today'}`) : notYet('Your LR is not delivered yet');
        },
      },
      {
        id: 'pod',
        task: 'POD / Acknowledgment → pick your LR → Submit the POD.',
        expected: 'POD recorded on your LR.',
        screen: 'ops/pod',
        check: (db, base) => {
          const l = myOrderLRs(db, base).find((x) => !!x.ack);
          return l ? pass(`POD recorded for ${l.lrNo} – now eligible for billing`) : notYet('No POD on your LR yet');
        },
      },
      {
        id: 'bill',
        task: 'Make the bill: Customer Billing (Accounts) or the "Make bill" button on the LR\'s card in the Order Board column "Ready to bill". Generate the bill.',
        expected: 'Your LR is billed on a new bill.',
        screen: 'fin/billing',
        check: (db, base) => {
          const l = myOrderLRs(db, base).find((x) => !!billOf(db, x));
          if (l) { const b = billOf(db, l); return pass(`LR ${l.lrNo} billed on ${b.billNo} (₹${Number(b.net || 0).toLocaleString('en-IN')})`); }
          const tp = myOrderLRs(db, base).find((x) => x.paymentMode !== 'To Be Billed');
          return tp ? notYet(`LR ${tp.lrNo} is ${tp.paymentMode} – only To Be Billed LRs are billed. Run the exercise again with To Be Billed`) : notYet('Your LR is not billed yet');
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------------------------------------------
export const workflows: Workflow[] = [
  {
    id: 'wf.road-transport',
    title: 'Road transport: booking to payment',
    module: 'ops',
    roles: ['OP', 'BU', 'CC', 'AC', 'AD', 'SA'],
    summary: 'How one road consignment moves through the ERP – from the customer order to the money in the bank – with the checks the system enforces at each gate.',
    exercise: 'ex.ops.road-e2e',
    lesson: 'ls.ops.lr-lifecycle',
    steps: [
      { screen: 'ops/orders', title: 'Booking / order', does: 'Branch records the customer order (client, branches, pickup, trucks or items). Credit-hold customers are refused. Order status Pending; notification sent to Order Confirmation. For a walk-in booking, New booking or Instant LR skips the order.' },
      { screen: 'ops/order-confirmation', title: 'Order confirmation', does: 'Branch checks credit, rate contract and vehicles, adjusts pickup and quantities and confirms (or rejects with a reason). Only Confirmed / In Process orders can be picked in Generate LR.' },
      { screen: 'fleet/trucks', title: 'Vehicle planning', does: 'Find a suitable own truck that is Available (not On Trip or in Workshop) with the right capacity, or arrange a market truck. The truck is attached in Smart Load Planning (vehicle selector) or, for loads without a plan, on the LR or at dispatch.' },
      { screen: 'ops/smart-load', title: 'Smart Load Planning', does: 'Open Smart Load Plan from the order, choose the vehicle, run optimisation and save the plan (SLP-…). The plan is a geometric placement aid; it is not certified axle-load, stability or securement analysis.' },
      { screen: 'ops/smart-load', title: 'Load approval', does: '"Approve load plan" works only on a saved Draft plan with no placement/accessibility exceptions and no unplaced cargo. Once approved, the order\'s client, branches, city, trucks and items are locked.' },
      { screen: 'wh/verification', title: 'Physical loading confirmation', does: 'Loading Verification lists approved plans awaiting loading. The supervisor opens the plan and records loaded, damage and shortage per line; "Confirm loading" needs an Approved plan, a supervisor name and zero variance. Linked LRs get the plan number and the planned truck.' },
      { screen: 'ops/lr-new', title: 'LR (finalise)', does: 'Generate LR from the order. Finalise needs consignor, consignee, destination, items within pending quantity, freight and a truck. Gate: if the order has a load plan, a road LR cannot be finalised until the plan is Loading Confirmed. Drafts already draw down the order quantity.' },
      { screen: 'ops/lr', title: 'Dispatch', does: 'Dispatch & start trip. Gates: LR Finalised and not already dispatched; with a load plan – plan Loading Confirmed, variance 0, supervisor recorded, and the selected truck must equal the planned truck; own vehicles need a driver. Result: LR In Transit; own truck opens a trip with the advance.' },
      { screen: 'ops/delivery', title: 'Delivery', does: 'Mark delivered with date, time, unloading charges and remark. Allowed only for In Transit LRs. The truck trip stays open until Trip Completion.' },
      { screen: 'ops/pod', title: 'POD', does: 'Record the signed POD once the copy arrives: quantities, damage, detention, docket, scan. Allowed only for Delivered LRs, once per LR. The LR becomes eligible for billing.' },
      { screen: 'fin/billing', title: 'Billing', does: 'Accounts bills finalised, Delivered, To Be Billed LRs with POD (or customers allowed to bill without ack). Bill rows add detention and unloading and deduct damage; GST is added. The bill posts a Sales entry to the ledger. To Pay / Paid LRs are not billed.' },
      { screen: 'fin/receivables', title: 'Receivable', does: 'The bill\'s pending amount is outstanding for the customer. It is overdue after the customer\'s credit days and shows red on the Order Board under "Billed – awaiting payment".' },
      { screen: 'fin/client-payments', title: 'Payment', does: 'Accounts records the receipt (amount, TDS, damage, rate difference). Pending reduces by all four; a receipt voucher RV/… is posted to the ledger. At zero pending the LR, order and load plan show Paid.' },
    ],
    notes: [
      'Rail loads follow a different path after the LR: GRN at rail head → VP loading → rake → DGRN → LDC → LDC acknowledgment (delivery) → POD → bill.',
      'New booking (book) finalises the LR without the Smart Load Plan check and only warns on credit hold – for planned or credit-sensitive loads use Generate LR.',
      'One load plan covers one dispatch: after the first LR on the order is dispatched the plan is "Dispatched", and a second LR on the same order is refused at finalise and dispatch. For multi-truck orders that use Smart Load Planning, make a separate order for each truck.',
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Concept lessons
// ---------------------------------------------------------------------------------------------------------------
export const lessons: Lesson[] = [
  {
    id: 'ls.ops.lr-lifecycle',
    title: 'The life of an LR',
    module: 'ops',
    kind: 'concept',
    roles: ['OP', 'BU', 'CC', 'AC'],
    screens: ['ops/lr-new', 'ops/lr', 'ops/delivery', 'ops/pod', 'board'],
    summary: 'Draft, Finalised, In Transit, Delivered, POD Received, Billed, Paid – what each status allows and which action moves the LR forward.',
    sections: [
      {
        heading: 'Draft and Finalised',
        body: 'A draft is a saved but incomplete LR. It cannot be dispatched or billed and can be deleted from the register. Finalising checks freight and (for road) the truck, and the Smart Load Plan gate when the order has a plan.',
        bullets: ['Drafts made from an order already reduce the order\'s pending quantity.', 'New booking always creates a finalised LR.'],
      },
      {
        heading: 'Moving',
        body: 'Dispatch turns a Finalised road LR into In Transit and opens a trip for own trucks. From now on the LR\'s operational fields cannot be saved again.',
        bullets: ['Dispatch needs a truck, and a driver for own trucks.', 'With a load plan: loading confirmed, zero variance, planned truck.'],
      },
      {
        heading: 'Delivered and POD',
        body: 'Mark delivered records date, time and unloading. The POD is recorded once when the signed copy arrives, with damage and detention.',
        bullets: ['Delivery needs In Transit.', 'POD needs Delivered.', 'Default limit for POD pending: 7 days.'],
      },
      {
        heading: 'Billing and payment',
        body: 'To Be Billed LRs with POD go to Customer Billing. To Pay and Paid LRs close after POD. The stage shows Billed until the bill is fully paid, then Paid.',
        bullets: ['Billing without POD only for customers allowed "Bill without ack".', 'A POD cannot be deleted while the LR is billed.'],
      },
    ],
    audio: [
      'हर LR कुछ तय stages से गुज़रता है — Draft, Finalised, In Transit, Delivered, POD, Billed और Paid।',
      'Draft LR न dispatch होता है, न bill। उसे finalise करना ज़रूरी है।',
      'Dispatch के बाद LR का route और truck बदला नहीं जा सकता।',
      'Delivery के बाद signed POD आते ही record कीजिए, तभी bill बनता है।',
      'To Pay वाले LR का bill नहीं बनता, POD के बाद वो बंद हो जाता है।',
    ],
    minutes: 5,
    quiz: ['q.ops.order-flow', 'q.ops.dispatch-draft', 'q.ops.pod-before-billing', 'q.ops.to-pay-board'],
  },
  {
    id: 'ls.ops.payment-modes',
    title: 'To Be Billed, To Pay and Paid',
    module: 'ops',
    kind: 'concept',
    roles: ['OP', 'BU', 'CC', 'AC'],
    screens: ['book', 'ops/lr-new', 'fin/billing', 'board'],
    summary: 'The payment mode on the LR decides whether the consignment is billed later by Accounts or collected at booking or delivery.',
    sections: [
      {
        heading: 'To Be Billed (TBB)',
        body: 'Freight is billed later. After POD the LR appears in Customer Billing and on the board under "Ready to bill". In New booking this is "We bill later".',
        bullets: ['Bill head (Consignor or Consignee) decides whose name is on the bill.', 'Detention and unloading are added, damage deducted.'],
      },
      {
        heading: 'To Pay',
        body: 'The consignee pays the freight at delivery. The LR never reaches Customer Billing; after POD the board shows it as Paid / closed. In New booking this is "Receiver pays".',
      },
      {
        heading: 'Paid',
        body: 'Freight was paid at booking. Like To Pay, it is not billed and closes after POD. In New booking this is "Paid now".',
      },
    ],
    audio: [
      'LR पर payment mode सोच-समझकर चुनिए।',
      'To Be Billed का मतलब है bill बाद में बनेगा — POD के बाद accounts bill बनाते हैं।',
      'To Pay में पैसा माल लेने वाला delivery पर देता है, और Paid में booking के समय ही मिल जाता है।',
      'To Pay और Paid वाले LR billing में नहीं आते। Monthly bill वाले customer के लिए हमेशा To Be Billed चुनिए।',
    ],
    minutes: 3,
    quiz: ['q.ops.to-pay-board', 'q.ops.pod-detention'],
  },
];
