// Training Academy content: Smart Load Planning (module 'smartload') and Warehouse (module 'wh').
// Every statement below was checked against src/features/smart-load-planning.tsx, src/lib/load-planning*.ts,
// src/features/warehouse.tsx, the Godown master in src/features/masters.tsx and the store actions in src/store/store.ts.
import type { ScreenTraining, Question, Exercise, Workflow, Lesson, QOption } from '../types';
import { created, changed, touched, fieldChanged, pass, notYet } from '../check';

const TF: QOption[] = [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }];

// ---------- small read-only helpers for checkers ----------
const list = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);
const orderNo = (db: any, plan: any): string => {
  const oid = plan?.orderIds?.[0];
  if (!oid) return 'no order';
  return list(db, 'orders').find((o: any) => o.id === oid)?.orderNo || oid;
};
const unplacedQty = (p: any): number => (Array.isArray(p?.unplaced) ? p.unplaced.reduce((n: number, x: any) => n + Number(x?.qty || 0), 0) : 0);
const placedCount = (p: any): number => (Array.isArray(p?.placed) ? p.placed.length : 0);
const POST_APPROVAL = ['Approved', 'Loading Confirmed', 'Dispatched', 'Delivered', 'POD Received', 'Billed', 'Payment Partial', 'Paid'];
const POST_CONFIRM = ['Loading Confirmed', 'Dispatched', 'Delivered', 'POD Received', 'Billed', 'Payment Partial', 'Paid'];
const hasDamageOrShortage = (p: any): boolean =>
  Object.values(p?.loadingVerification?.items || {}).some((x: any) => Number(x?.damage || 0) > 0 || Number(x?.shortage || 0) > 0);

// =====================================================================================================
// SCREENS
// =====================================================================================================
export const screens: ScreenTraining[] = [
  {
    id: 'ops/smart-load',
    module: 'smartload',
    title: 'Smart Load Planning',
    purpose: 'Plans how the packages of an order fit inside one truck in 3D, checks space, payload, stacking and stop order, and carries the plan through approval and physical loading confirmation.',
    why: 'A road LR for an order that has a Smart Load Plan cannot be finalised or dispatched until the plan is approved, physically loaded, fully reconciled and confirmed by a loading supervisor. The plan also gives the loading crew a numbered loading sequence.',
    when: 'After the customer order is confirmed and before the truck is loaded – normally before you generate and finalise the road LR. Open it again at the loading bay to record what was really loaded.',
    roles: ['OP', 'BU', 'SA'],
    upstream: ['ops/orders', 'ops/order-confirmation', 'fleet/trucks', 'masters'],
    downstream: ['wh/verification', 'ops/lr-new', 'ops/lr'],
    before: 'The order exists in Orders with its goods and quantity. Package size, weight and stacking rules come from the Goods master; truck inside size and payload come from the truck master (Load planning section) or from a standard template.',
    after: 'Approval locks the plan and the linked order fields. After physical loading is confirmed, the LR can be finalised and dispatched with the same truck. Dispatch, delivery, POD, billing and payment then move the plan status forward automatically.',
    prerequisites: [
      'Order created (Orders) – the order list here shows the last 250 orders of every status, so pick the correct confirmed order yourself.',
      'Goods master has length, width, height (cm), weight (kg), storage position, max stacking layers and stacking allowed for the goods.',
      'For a fleet truck: Loading length/width/height and Max payload filled in the truck master, otherwise the planner uses estimates.',
    ],
    actions: [
      'Link an ERP order – its lines become cargo lines (quantity per line is capped at 100 packages).',
      'Choose a fleet truck or a body template (14 FT LCV to 32 FT Container) and check inside length, width, height and max payload.',
      'Edit cargo lines: Qty, L/W/H cm, kg per piece, Stackable, Rotate, Max layers, Top kg and delivery Stop.',
      'Optimize loading (best of two heuristics), review KPIs, 3D view, load and unload sequence and Planning exceptions.',
      'Select a package to move it by X/Y/Z or rotate it; the move is rejected if it breaks a rule.',
      'Save plan, Approve load plan, Print load plan, and after loading record Loaded/Damage/Shortage, supervisor and remarks, then Confirm loading.',
    ],
    records: [
      'Creates/updates a load plan (plan no. SLP-00001…) in shared ERP state: order link, vehicle, cargo lines, placed packages, unplaced lines, stats and status.',
      'Approval writes the plan no. and status to the linked order (loadPlanId, loadPlanNo, loadPlanStatus, plannedTruckId).',
      'Loading confirmation stores the reconciliation (items, supervisor, remarks, actual loaded, variance, confirmedAt) and adds a "Smart Load … confirmed" event to every existing LR of that order.',
    ],
    validations: [
      'Optimize: "Add cargo first" when there are no lines; "Enter positive cargo dimensions, quantity and weight" and "Enter valid vehicle dimensions" for zero or empty values.',
      'Save: "Run optimization first"; "Fix placement/accessibility exceptions before saving" when any package breaks a rule or a later-stop package blocks an earlier stop.',
      'Approve: "Save the plan before changing its status"; "Resolve exceptions and unplaced cargo before approval" – no unallocated packages allowed; "Only a draft plan can be approved".',
      'Confirm loading: "Approve the load plan before confirming loading"; "Select or enter the loading supervisor"; "Reconcile planned quantity with loaded + damage + shortage before confirmation".',
      'Approved and later plans: cargo, vehicle, placement, plan name and order link are locked ("Approved plan is locked; create a revision to re-optimize"). From Loading Confirmed onward even Save is blocked: "This plan is operationally locked".',
      'Manual move/rotate: rejected with "Invalid placement" / "Rotation blocked" for outside vehicle bounds, collision, payload exceeded, insufficient support, stacking on non-stackable cargo, top-load limit or max layers.',
    ],
    mistakes: [
      'Leaving the first truck in the list selected. A new plan starts with the first fleet truck; that truck becomes the approved truck and dispatch is blocked with any other truck.',
      'Trusting estimated sizes. Goods without dimensions get 100 × 80 × 80 cm and 150 kg; trucks without load-planning data get 975 × 235 × 245 cm and 16,000 kg (capacity text containing "16") or 32,000 kg. Measure and correct them.',
      'Moving a package after saving and then approving. Approve does not save – the saved placement is what gets approved. Save again after every manual change.',
      'Using the number shown on a box in the 3D view as the loading step. That number is only the list position; the loading step is in the Load sequence list and the print.',
      'Confirming loading with the default figures. Loaded is pre-filled with the planned qty, so variance shows 0 even if nobody counted. Enter the real count from the bay.',
      'Building a second plan for the same order while the first is approved. The ERP links the order and LR to the newest plan, so a new Draft plan will block LR finalisation and dispatch until it is confirmed.',
    ],
    warnings: [
      'The plan is geometric only. It is NOT certified axle-load, stability or load-securement analysis. The supervisor and driver remain responsible for weight distribution, lashing and safe loading.',
      'There is no Reopen button. To change an approved plan, click New plan, link the same order, plan again and approve the new plan.',
    ],
    shortcuts: [
      'Orders → row menu → Smart Load Plan opens this screen with the order already linked.',
      'Warehouse → Loading Verification → click a plan in the Road load-plan queue to open it here.',
      'LR 360 / Order 360 → Smart Load Plan link opens the saved plan directly.',
    ],
    fields: [
      { name: 'Open saved plan', help: 'Loads a saved plan with its cargo, vehicle, placement, status and loading figures.' },
      { name: 'Link ERP order', help: 'Copies the order lines into cargo lines using Goods master sizes. Locked once the plan is approved.' },
      { name: 'Vehicle / reusable template', help: 'A fleet truck (its id becomes the approved truck for dispatch) or a body template such as 24 FT Truck (no truck match is enforced).' },
      { name: 'Internal length / width / height (cm)', help: 'Inside loading space. Editable planning estimates, not certified fleet specifications.' },
      { name: 'Max payload (kg)', help: 'Total weight limit. The optimiser stops adding packages when the next one would exceed it.' },
      { name: 'Qty, L cm, W cm, H cm, kg/pc', help: 'Packages in the line and the size and weight of ONE package. All must be more than 0.' },
      { name: 'Stackable', help: 'Off = nothing may be placed on top (max layers 1). Comes from "Stacking allowed" in the Goods master.' },
      { name: 'Rotate', help: 'On = the optimiser may try all six orientations. On only when Goods master storage position is "Any" or blank; Upright and Flat goods are not rotated.' },
      { name: 'Max layers', help: 'How many layers high this cargo may be stacked. Blank = no limit for stackable cargo.' },
      { name: 'Top kg', help: 'Heaviest single package allowed directly on top of one package of this line. Blank = no limit for stackable cargo.' },
      { name: 'Stop', help: 'Delivery stop number 1–9. Stop 1 is unloaded first, so it is kept nearest the rear door.' },
      { name: 'X / Y / Z position (cm)', help: 'X = distance from the rear door along the length, Y = across the width, Z = height from the floor.' },
      { name: 'Loaded / Damage / Shortage', help: 'Physical loading count per cargo line. Planned must equal Loaded + Damage + Shortage (variance 0).' },
      { name: 'Loading supervisor / Loading remarks', help: 'Name of the person who checked the loading (required) and a note such as seal number or exception.' },
    ],
    statuses: [
      { status: 'Draft', meaning: 'Being planned. Cargo, vehicle and placement can be changed; Save and re-optimise freely.' },
      { status: 'Approved', meaning: 'Plan accepted for loading. Cargo, vehicle, placement and linked order fields are locked. Appears in the Warehouse road load-plan queue.' },
      { status: 'Loading Confirmed', meaning: 'Supervisor confirmed physical loading with zero variance. The LR can now be finalised and dispatched with the planned truck.' },
      { status: 'Dispatched', meaning: 'Set automatically when the linked LR is dispatched.' },
      { status: 'Delivered', meaning: 'Set automatically when delivery is recorded on the linked LR.' },
      { status: 'POD Received', meaning: 'Set automatically when the POD is recorded. Also the status a plan returns to if its bill is deleted.' },
      { status: 'Billed', meaning: 'Set automatically when the LR is put on a customer bill.' },
      { status: 'Payment Partial', meaning: 'A receipt was recorded but the bill still has a balance.' },
      { status: 'Paid', meaning: 'The bill is fully settled.' },
    ],
    example: 'Order ORD-1011 (Edible Oil Tins 15L) is confirmed. You open Orders → Smart Load Plan, choose truck MH19 CY 1200, check 24 × 24 × 36 cm and 15.5 kg per tin, click Optimize loading (100 placed, 0 unallocated), Save plan (SLP-00001) and Approve. At the bay the supervisor finds one dented tin: Loaded 99, Damage 1, supervisor name entered, Confirm loading. Now the LR can be finalised and dispatched on MH19 CY 1200.',
    walkthrough: [
      { title: 'Link the order', body: 'Choose the order in "Link ERP order" (or come from Orders → Smart Load Plan). Read the yellow note: sizes come from the Goods master; correct any estimate.' },
      { title: 'Pick the vehicle', body: 'Select the real fleet truck that will load, or a template. Check inside L/W/H and Max payload. Use Vehicle recommendation to see which body carries the full manifest.' },
      { title: 'Check cargo rules', body: 'For each line check Qty, size, kg/pc, Stackable, Rotate, Max layers, Top kg and Stop. Each change clears the result, so optimise after editing.' },
      { title: 'Optimize and review', body: 'Click Optimize loading. Check Packages placed, Space and Payload utilization, Unallocated, the 3D view, the load/unload sequence and Planning exceptions. Fix every exception.' },
      { title: 'Save, approve, print', body: 'Save plan, then Approve load plan. Print load plan gives the loading crew the top/side views, numbered loading sequence and signature lines.' },
      { title: 'Confirm physical loading', body: 'After loading, enter Loaded, Damage and Shortage for each line until variance is 0, enter the supervisor and remarks, and click Confirm loading.' },
    ],
    related: ['wh/verification', 'ops/lr-new', 'ops/lr', 'fleet/trucks', 'ops/orders'],
    practice: 'ex.smartload.plan-approve',
    audio: [
      'यह Smart Load Planning है। यहाँ हम देखते हैं कि order का माल truck में कैसे और किस क्रम में भरेगा।',
      'पहले order link कीजिए, फिर वही truck चुनिए जो सच में load होगा। Approve के बाद dispatch सिर्फ़ उसी truck से होगा।',
      'हर cargo line का size, weight, stacking और stop check कीजिए, फिर Optimize loading दबाइए।',
      'Unallocated zero होना चाहिए और Planning exceptions खाली। तभी plan save और approve होगा।',
      'Loading के बाद bay पर गिनती कीजिए। Planned बराबर Loaded plus Damage plus Shortage होना चाहिए, और supervisor का नाम ज़रूरी है।',
      'याद रखिए, यह plan सिर्फ़ जगह और वज़न का हिसाब है। Axle load, balance और lashing की ज़िम्मेदारी supervisor और driver की है।',
    ],
    quiz: ['q.smartload.save-before-approve', 'q.smartload.unplaced-approve', 'q.smartload.approved-lock'],
    minutes: 6,
  },
  {
    id: 'wh/godowns',
    module: 'wh',
    title: 'Godowns',
    purpose: 'The master list of owned, leased and rail-siding godowns with branch, contact, rent, agreement dates, size, storage capacity and gates, plus live occupancy.',
    why: 'GRN gate numbers, branch godowns for DGRN stock and the occupancy bar all depend on this list. Rent and agreement expiry help the branch renew leases on time.',
    when: 'When a new godown is taken, a lease is renewed, rent changes, or capacity or gates change. Check occupancy before accepting large inward stock.',
    roles: ['AD', 'OP', 'BU'],
    upstream: [],
    downstream: ['wh/stock', 'ops/grn', 'ops/dgrn'],
    before: 'The branch and city must already exist in the masters so they can be selected.',
    after: 'Stock at the godown is shown in Stock; GRN and DGRN quantities still in the godown fill the occupancy bar.',
    prerequisites: ['Branch and city available in the master lists.', 'Lease agreement details (rent, deposit, agreement and expiry dates) at hand for leased godowns.'],
    actions: ['Add godown', 'Edit a godown (row menu → Edit, or View → Edit)', 'Delete a godown (with confirmation)', 'Check occupancy, total capacity, stock held and monthly rent KPIs'],
    records: ['Godown master record (name, type, address, city, branch, contact, phone, rent, deposit, agreement date, expiry, length, breadth, width, capacity MT, gates).'],
    validations: [
      'Only "Godown" (name) is required – the form shows "Required: Godown" when it is empty. Every other field is optional, so check them yourself.',
      'Delete asks for confirmation; records that already reference the godown keep their history.',
    ],
    mistakes: [
      'Leaving Storage capacity (MT) empty – the occupancy bar then cannot show a correct percentage.',
      'Forgetting to update Expiry date after a lease renewal – the Agreement expiry column then shows the old date.',
      'Deleting a godown that is still in use instead of editing it.',
    ],
    fields: [
      { name: 'Godown', help: 'Name of the godown. Required.' },
      { name: 'Godown type', help: 'Owned, Leased or Rail siding.' },
      { name: 'Branch', help: 'Branch that runs this godown. Branch godowns hold DGRN stock for that branch.' },
      { name: 'Monthly rent / Security deposit', help: 'Lease money in ₹ (Agreement section). Monthly rent is totalled in the KPI.' },
      { name: 'Agreement date / Expiry date', help: 'Lease period. Expiry is shown as "Agreement expiry" in the list.' },
      { name: 'Storage capacity (MT)', help: 'Capacity in metric tonnes, used for the occupancy bar.' },
      { name: 'No. of gates', help: 'Number of gates; GRN records the gate where goods came in.' },
    ],
    statuses: [
      { status: 'Occupancy bar (violet)', meaning: 'Stock held is 80% of capacity or less.' },
      { status: 'Occupancy bar (red)', meaning: 'Stock held is more than 80% of capacity – plan outward movement before taking more stock.' },
    ],
    example: 'The Chakan Depot lease is renewed for two more years. Open Godowns, row menu → Edit on Chakan Depot, change Expiry date and Monthly rent, Save. The list shows the new expiry and the KPI shows the new monthly rent total.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Godowns, Total capacity (MT), Stock held (MT) and Monthly rent for all godowns in the list.' },
      { title: 'Check occupancy', body: 'The Occupancy column shows stock held / capacity in MT. Stock is GRN pending packages (rail head godown) and DGRN pending packages (branch godown) multiplied by goods weight. Red means above 80%.' },
      { title: 'Add or edit', body: 'Click Add godown, or row menu → Edit. Fill Details, Agreement and Capacity sections and click Save.' },
      { title: 'Review agreements', body: 'Sort or scan the Agreement expiry column and renew leases before they expire.' },
    ],
    related: ['wh/stock', 'ops/grn', 'ops/dgrn'],
    practice: 'ex.wh.godown-master',
    audio: [
      'यह Godowns की list है — अपने, किराए के और rail siding वाले, सब godowns यहाँ हैं।',
      'Occupancy column बताता है कि godown कितना भरा है। लाल bar मतलब अस्सी percent से ज़्यादा भरा।',
      'नया godown जोड़ते समय capacity MT में और gates ज़रूर भरिए, वरना occupancy सही नहीं दिखेगी।',
      'Lease renew हो तो Edit करके expiry date और rent बदलिए, फिर Save कीजिए।',
    ],
    quiz: ['q.wh.occupancy'],
    minutes: 3,
  },
  {
    id: 'wh/stock',
    module: 'wh',
    title: 'Godown Stock',
    purpose: 'Live list of rail consignment packages still lying in godowns: GRN quantity at the Jalgaon rail head not yet loaded on a VP, and DGRN quantity at destination branches not yet put on a delivery challan.',
    why: 'Shows what is waiting, where, for which client and for how long, so old stock is loaded or delivered first.',
    when: 'Daily, before VP planning at the rail head and before preparing delivery challans at branches.',
    roles: ['OP', 'BU', 'AD'],
    upstream: ['ops/grn', 'ops/dgrn'],
    downstream: ['ops/vp-loading', 'ops/dc', 'wh/movement'],
    before: 'Goods come into stock through GRN at Rail Head (rail head godown) or DGRN at Branch (destination godown).',
    after: 'Stock goes down when packages are loaded on a VP (GRN pending falls) or put on a delivery challan (DGRN pending falls).',
    prerequisites: ['GRN or DGRN recorded for the LR.'],
    actions: ['Switch between Stock detail and Stock summary', 'Filter by location, godown, gate, to branch or client', 'Click a row to open LR 360'],
    records: ['Read-only screen. Nothing is created or changed here.'],
    validations: ['Only lines with pending quantity above 0 are listed.', 'Age is counted from the GRN/DGRN in-date; more than 5 days is shown in red and counted in "Ageing > 5 days".'],
    mistakes: [
      'Trying to correct a stock quantity here – stock is changed only by GRN, VP loading, DGRN and delivery challans.',
      'Ignoring red (older than 5 days) lines – they are the first to plan for loading or delivery.',
      'Expecting road Smart Load cargo here – this screen only shows rail consignments in godowns.',
    ],
    fields: [
      { name: 'Location', help: 'Rail head (GRN) or Branch (DGRN).' },
      { name: 'Received / In stock', help: 'Packages received at GRN/DGRN and packages still pending in the godown.' },
      { name: 'Age', help: 'Days since the in-date of the GRN/DGRN.' },
    ],
    statuses: [{ status: 'Age in red', meaning: 'Stock older than 5 days.' }],
    example: 'At 9 am the Jalgaon supervisor opens Stock, filters Location = Rail head (GRN) and sorts by Age. Two LRs of 7 days are red; they go first into today\'s VP loading.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Packages in stock, At Jalgaon rail head, At destination branches and Ageing > 5 days.' },
      { title: 'Find old stock', body: 'In Stock detail, sort by Age. Red ages are older than 5 days.' },
      { title: 'See by client', body: 'Switch to Stock summary for a chart of packages by client and a table by godown and client with oldest age.' },
      { title: 'Open the LR', body: 'Click a row to open LR 360 and see the full history of that consignment.' },
    ],
    related: ['wh/movement', 'wh/verification', 'ops/vp-loading'],
    audio: [
      'यह Godown stock है — rail head और branch godowns में अभी कितना माल पड़ा है।',
      'GRN का माल जो अभी VP में load नहीं हुआ, और DGRN का माल जो अभी challan पर नहीं गया, वही यहाँ दिखता है।',
      'Age को sort कीजिए। पाँच दिन से पुराना माल लाल दिखता है, उसे पहले निकालिए।',
      'यहाँ कुछ edit नहीं होता। Stock GRN, VP loading, DGRN और challan से ही बदलता है।',
    ],
    quiz: ['q.wh.stock-meaning', 'q.wh.ageing'],
    minutes: 3,
  },
  {
    id: 'wh/movement',
    module: 'wh',
    title: 'Stock Movement',
    purpose: 'Every inward and outward movement of rail consignments in one list: GRN at rail head (In) → Loaded to VP (Out) → DGRN at branch (In) → Delivery challan (Out).',
    why: 'Traces where a consignment\'s packages moved and when, for disputes, audits and follow-up.',
    when: 'When a client or branch asks where packages went, or to review one rake (VP schedule) movement end to end.',
    roles: ['OP', 'BU', 'AD'],
    upstream: ['ops/grn', 'ops/vp-loading', 'ops/dgrn', 'ops/dc'],
    downstream: ['wh/verification', 'wh/damage'],
    before: 'Movements come from GRN, VP loads on a schedule, DGRN and delivery challans.',
    after: 'Mismatches found here are checked in Loading Verification and Damage / Shortage.',
    prerequisites: ['Rail consignments with GRN / VP loading / DGRN / DC entries.'],
    actions: ['Filter by VP schedule (rake)', 'Filter by direction, movement type or client', 'Click a row to open LR 360'],
    records: ['Read-only screen. Nothing is created or changed here.'],
    validations: ['Newest movement first.', 'Choosing a VP schedule shows only movements of LRs on that schedule.'],
    mistakes: [
      'Expecting road Smart Load plans here – this list covers rail consignments only; road load plans are in Loading Verification.',
      'Reading the Qty of a VP load as the whole LR – one LR can be split across several VPs and challans.',
    ],
    fields: [
      { name: 'Dir', help: 'In (GRN, DGRN) or Out (Loaded to VP, Delivery challan).' },
      { name: 'Reference', help: 'GRN no., VP no., DGRN no. or DC no.' },
      { name: 'Location / vehicle', help: 'Godown and gate, rake and VP, branch godown, or delivery truck.' },
    ],
    statuses: [{ status: 'In', meaning: 'Packages received into a godown (GRN or DGRN).' }, { status: 'Out', meaning: 'Packages loaded to a VP or put on a delivery challan.' }],
    example: 'A client says 10 cartons are missing at Guwahati. Choose the rake in VP schedule, filter the client, and compare GRN In, Loaded to VP Out, DGRN In and Delivery challan Out for that LR.',
    walkthrough: [
      { title: 'Choose the rake', body: 'Pick a VP schedule, or leave "All schedules" for every movement.' },
      { title: 'Read the totals', body: 'Inward (qty), Outward (qty) and number of movements for the filter.' },
      { title: 'Follow one LR', body: 'Filter by client and read the stages in date order: GRN → VP → DGRN → DC.' },
      { title: 'Open the LR', body: 'Click a row to open LR 360.' },
    ],
    related: ['wh/stock', 'wh/verification', 'rail/rakes'],
    audio: [
      'Stock movement में rail consignment का हर अंदर और बाहर जाना दिखता है।',
      'GRN पर माल आया, VP में load हुआ, branch पर DGRN हुआ, फिर delivery challan से निकला।',
      'ऊपर VP schedule चुनिए, तो उस rake की पूरी movement एक साथ दिखेगी।',
      'Road के Smart Load plans यहाँ नहीं, Loading Verification में दिखते हैं।',
    ],
    quiz: ['q.wh.movement-scope'],
    minutes: 3,
  },
  {
    id: 'wh/verification',
    module: 'wh',
    title: 'Loading Verification',
    purpose: 'Two checks in one screen: the Road load-plan queue of approved Smart Load Plans waiting for or completing physical loading, and rail LR reconciliation of booked, GRN received, loaded on VP, damage and pending quantities per schedule.',
    why: 'Catches packages that are neither loaded, damaged nor still in the godown before the rake or truck leaves, and shows which road plans still need loading confirmation.',
    when: 'During and after loading – at the rail head for each VP schedule, and at the road loading bay for approved Smart Load Plans.',
    roles: ['OP', 'BU', 'AD'],
    upstream: ['ops/smart-load', 'ops/grn', 'ops/vp-loading'],
    downstream: ['ops/smart-load', 'ops/lr', 'wh/damage'],
    before: 'Road: a Smart Load Plan is approved. Rail: the LR has a GRN and packages are loaded on VPs of a schedule.',
    after: 'Road: the supervisor confirms loading on the plan (opened from this queue), then the LR can be finalised and dispatched. Rail: mismatches are investigated before the rake closes.',
    prerequisites: ['Approved Smart Load Plan (road queue).', 'GRN and VP loads recorded (rail table).'],
    actions: [
      'Click a plan row in the Road load-plan queue to open it in Smart Load Planning and confirm loading there.',
      'Click the LR number in the queue to open LR 360.',
      'Choose a VP schedule and filter the rail table by status.',
    ],
    records: ['Read-only screen. Loading confirmation is saved on the Smart Load Plan, not here.'],
    validations: [
      'Road queue lists only plans with status Approved or Loading Confirmed. Planned = sum of cargo-line quantities; Loaded = actual loaded from the confirmation; Variance = Loaded − Planned ("—" until confirmed).',
      'Rail status: Mismatch when GRN received − loaded − damage − pending is not 0; otherwise Partially loaded while pending > 0; otherwise Verified.',
    ],
    mistakes: [
      'Reading a negative road Variance as an error after confirmation – damaged or short packages are not counted in Loaded here, so a plan with 1 damaged package shows −1 even though it was fully reconciled on the plan.',
      'Letting a rake leave with Mismatch rows – the difference means packages are unaccounted for.',
      'Looking for dispatched road plans here – once dispatched, a plan leaves the queue.',
    ],
    fields: [
      { name: 'Planned / Loaded / Variance (road)', help: 'Plan quantity, physically loaded count from the confirmation, and their difference.' },
      { name: 'Booked / GRN received / Loaded / Damage / Pending (rail)', help: 'LR quantity, packages received at GRN, loaded on VPs, damaged at loading, and still in the godown.' },
    ],
    statuses: [
      { status: 'Approved (road queue)', meaning: 'Plan approved, physical loading not yet confirmed.' },
      { status: 'Loading Confirmed (road queue)', meaning: 'Supervisor confirmed loading; ready for LR finalisation and dispatch.' },
      { status: 'Verified', meaning: 'Rail LR fully loaded and every received package accounted for.' },
      { status: 'Partially loaded', meaning: 'Some packages still pending in the godown; no unexplained difference.' },
      { status: 'Mismatch', meaning: 'Received ≠ loaded + damage + pending. Investigate before closing.' },
    ],
    example: 'Plan SLP-00003 shows Approved in the road queue. The bay supervisor clicks it, records 59 loaded and 1 short against 60 planned, enters his name and confirms. The queue now shows Loading Confirmed, Loaded 59, Variance −1.',
    walkthrough: [
      { title: 'Check the road queue', body: 'At the top, approved Smart Load Plans are listed with order, vehicle, LR, planned, loaded, variance and status.' },
      { title: 'Confirm loading on the plan', body: 'Click a plan row. Smart Load Planning opens it; record Loaded/Damage/Shortage and the supervisor, then Confirm loading.' },
      { title: 'Choose a rail schedule', body: 'Pick the VP schedule and read Verified, Partially loaded and Mismatches KPIs.' },
      { title: 'Investigate mismatches', body: 'Filter Status = Mismatch and click the LR to open LR 360 and see GRN and VP details.' },
    ],
    related: ['ops/smart-load', 'wh/damage', 'ops/vp-loading'],
    practice: 'ex.smartload.physical-loading',
    audio: [
      'Loading Verification में दो काम हैं — ऊपर road के approved load plans, और नीचे rail LRs का मिलान।',
      'Road queue में plan पर click कीजिए। Plan खुलेगा, वहाँ loaded, damage और shortage भरकर supervisor loading confirm करता है।',
      'Confirm के बिना LR finalise और dispatch नहीं होता।',
      'Rail में GRN पर आया माल, VP में load हुआ, damage और pending — सब मिलाकर बराबर होना चाहिए। नहीं तो Mismatch दिखता है।',
    ],
    quiz: ['q.wh.road-queue', 'q.wh.verification-mismatch', 'q.smartload.unreconciled'],
    minutes: 4,
  },
  {
    id: 'wh/damage',
    module: 'wh',
    title: 'Damage / Shortage',
    purpose: 'One register of every damage and shortage already recorded at GRN, DGRN, LDC acknowledgments (supervisor, collection, client) and POD, with the stage it was found and the amount.',
    why: 'Shows where in the chain goods get damaged or go short, who is responsible, and how much money is involved for recovery or deduction.',
    when: 'Weekly review, claim follow-up, or when a client complains about damage.',
    roles: ['OP', 'BU', 'AD'],
    upstream: ['ops/grn', 'ops/dgrn', 'ops/ldc', 'ops/pod'],
    downstream: ['wh/qc', 'cust/support'],
    before: 'Damage or shortage is entered on GRN, DGRN, LDC acknowledgment or POD.',
    after: 'Damage-free deliveries feed the QC score in Quality Control.',
    prerequisites: ['Damage/shortage entered on the source document.'],
    actions: ['Filter by truck, client, stage found, damage by, status', 'Click a row to open LR 360'],
    records: ['Read-only screen. To add or correct damage, change the GRN, DGRN, LDC acknowledgment or POD.'],
    validations: [
      'GRN rows show damage only (shortage 0); amount is the damage deduction on the GRN. DGRN rows show amount ₹0.',
      'LDC rows include both damage and shortage with damage + shortage amount.',
      'Status is Damage, Shortage, or Damage and Shortage.',
    ],
    mistakes: [
      'Expecting Smart Load loading damage/shortage here – the reconciliation on a load plan is stored on the plan and is not listed in this register.',
      'Trying to enter a new damage here – it must be recorded on the source document.',
    ],
    fields: [
      { name: 'Found at', help: 'GRN at rail head, DGRN at branch, LDC supervisor/collection/client ack, or POD.' },
      { name: 'Damage by', help: 'Party responsible as recorded on the GRN/DGRN.' },
      { name: 'Amount', help: 'Amount recovered or deducted for the incident.' },
    ],
    statuses: [
      { status: 'Damage', meaning: 'Only damaged packages recorded.' },
      { status: 'Shortage', meaning: 'Only short packages recorded.' },
      { status: 'Damage and Shortage', meaning: 'Both on the same acknowledgment line.' },
    ],
    example: 'Filter Found at = LDC client ack for last month to see which delivery trucks reached clients with damage or shortage, and the amount deducted.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Incidents, damaged qty, shortage qty and total amount.' },
      { title: 'Find the stage', body: 'Filter "Found at" to see whether damage happens at rail head, branch, delivery or POD.' },
      { title: 'Follow up', body: 'Filter by client or truck, then click a row to open LR 360.' },
    ],
    related: ['wh/qc', 'ops/pod', 'ops/ldc'],
    audio: [
      'यह Damage और Shortage का register है।',
      'GRN, DGRN, LDC acknowledgment और POD पर जो भी damage या कमी लिखी गई, सब यहाँ एक जगह दिखती है।',
      'Found at से पता चलता है कि माल कहाँ खराब हुआ, ताकि उसी जगह सुधार हो।',
      'यहाँ नई entry नहीं होती। Damage उसी document पर लिखिए जहाँ वह मिला।',
    ],
    quiz: ['q.wh.damage-source'],
    minutes: 3,
  },
  {
    id: 'wh/qc',
    module: 'wh',
    title: 'Quality Control',
    purpose: 'Service quality per client or per branch for delivered LRs: damage-free %, on-time %, POD received % and complaints, combined into a QC score.',
    why: 'Shows which clients or branches get poor service so managers can act before the client complains.',
    when: 'Monthly service review and before client meetings.',
    roles: ['AD', 'OP', 'BU'],
    upstream: ['ops/delivery', 'ops/pod', 'wh/damage'],
    downstream: ['cust/support'],
    before: 'LRs are delivered, PODs recorded and complaints logged.',
    after: 'Low scores are followed up with the branch or the client.',
    prerequisites: ['Delivered LRs (only LRs with a delivery record are assessed).'],
    actions: ['Switch By client / By branch', 'Sort by QC score (lowest first by default)'],
    records: ['Read-only screen.'],
    validations: [
      'QC score = 40% damage-free + 40% on-time + 20% POD received, rounded.',
      'Score 85 or more is green, 70–84 amber, below 70 red.',
      'On-time means delivery date on or before the LR due date.',
    ],
    mistakes: [
      'Reading Complaints in the By branch view – complaints are matched by customer, so the branch view shows 0 complaints.',
      'Comparing a client with 2 deliveries to one with 200 – check the Deliveries column first.',
    ],
    fields: [
      { name: 'Damage-free', help: 'Share of delivered LRs without any damaged item.' },
      { name: 'On-time', help: 'Share delivered on or before the due date.' },
      { name: 'POD received', help: 'Share of delivered LRs with POD recorded.' },
    ],
    statuses: [
      { status: 'QC score ≥ 85 (green)', meaning: 'Good service.' },
      { status: 'QC score 70–84 (amber)', meaning: 'Needs attention.' },
      { status: 'QC score < 70 (red)', meaning: 'Poor service – act now.' },
    ],
    example: 'A client shows 100% damage-free, 60% on-time and 50% POD: score = 40 + 24 + 10 = 74 (amber). The fix is faster delivery and POD collection, not packing.',
    walkthrough: [
      { title: 'Choose the view', body: 'By client or By branch in the top right.' },
      { title: 'Start with the lowest', body: 'The table is sorted by QC score with the lowest first.' },
      { title: 'Find the cause', body: 'See which part is low: Damage-free, On-time or POD received.' },
    ],
    related: ['wh/damage', 'ops/pod', 'cust/support'],
    audio: [
      'Quality control में हर client या branch की service का score दिखता है।',
      'Score में चालीस percent damage-free, चालीस percent on-time और बीस percent POD का हिस्सा है।',
      'पचासी से ऊपर हरा, सत्तर से नीचे लाल। सबसे नीचे वाले पहले दिखते हैं।',
      'देखिए कौन सा हिस्सा कम है — damage, देरी, या POD — और वहीं सुधार कीजिए।',
    ],
    quiz: ['q.wh.qc-score'],
    minutes: 3,
  },
];

// =====================================================================================================
// QUESTIONS
// =====================================================================================================
export const questions: Question[] = [
  {
    id: 'q.smartload.lifo-stop-order',
    module: 'smartload',
    type: 'mcq',
    prompt: 'A truck carries cargo for Stop 1, Stop 2 and Stop 3. In the Load sequence, which cargo is loaded first?',
    options: [
      { id: 'a', text: 'Stop 1 cargo, because it is delivered first' },
      { id: 'b', text: 'Stop 3 cargo, placed deepest inside, away from the rear door' },
      { id: 'c', text: 'The heaviest cargo, whatever its stop' },
      { id: 'd', text: 'Any order – the sequence is only a suggestion' },
    ],
    answer: 'b',
    explanation: 'The plan follows LIFO (last in, first out). The load sequence starts with the highest stop number, bottom layer first and deepest first; Stop 1 is loaded last so it sits nearest the rear door (X = 0) and comes out first.',
    screens: ['ops/smart-load'],
    difficulty: 1,
  },
  {
    id: 'q.smartload.access-blocked',
    module: 'smartload',
    type: 'spot',
    prompt: 'Your plan review shows these lines. Which one stops you from saving the plan?',
    options: [
      { id: 'a', text: 'Space utilization 38%' },
      { id: 'b', text: 'Payload utilization 92%' },
      { id: 'c', text: 'Industrial spare cartons (stop 1) is blocked toward rear door by later-stop cargo: Machinery wooden crates · stop 3' },
      { id: 'd', text: 'Unload sequence starts with Stop 1 packages' },
    ],
    answer: 'c',
    explanation: 'An accessibility exception means a later-stop package sits between an earlier-stop package and the rear door. Save is blocked with "Fix placement/accessibility exceptions before saving". Move or re-optimise until the Planning exceptions card is clear. Low space use or high payload use within the limit are not errors.',
    screens: ['ops/smart-load'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.workflow-order',
    module: 'smartload',
    type: 'order',
    prompt: 'Put the road Smart Load steps in the order the ERP allows them.',
    items: [
      { id: 'opt', text: 'Optimize loading' },
      { id: 'save', text: 'Save plan' },
      { id: 'appr', text: 'Approve load plan' },
      { id: 'conf', text: 'Confirm loading with supervisor and zero variance' },
      { id: 'lr', text: 'Finalise the road LR' },
      { id: 'disp', text: 'Dispatch the LR with the planned truck' },
    ],
    answer: ['opt', 'save', 'appr', 'conf', 'lr', 'disp'],
    explanation: 'Save needs an optimisation result; status changes need a saved plan; Confirm loading needs Approved; LR finalisation for a road LR needs the plan Loading Confirmed; dispatch needs a finalised LR and a ready plan.',
    screens: ['ops/smart-load', 'ops/lr-new', 'ops/lr'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.approved-lock',
    module: 'smartload',
    type: 'scenario',
    prompt: 'What is the correct way to handle this?',
    scenario: 'Plan SLP-00004 for order ORD-1012 is Approved. The customer calls and adds 8 more cotton bales.',
    options: [
      { id: 'a', text: 'Change Qty on the cargo line and click Optimize loading again' },
      { id: 'b', text: 'Edit the order items in Orders; the plan updates itself' },
      { id: 'c', text: 'Click New plan, link the order again with the new quantity, plan, save and approve the new plan' },
      { id: 'd', text: 'Confirm loading with 8 extra in Loaded' },
    ],
    answer: 'c',
    explanation: 'An approved plan locks cargo, vehicle and placement ("Approved plan is locked; create a revision to re-optimize"). The order\'s items, client, route and truck quantity are also locked by the approved plan in Orders. There is no Reopen button, so build a fresh plan for the order. Loaded cannot exceed the plan either – variance must be 0.',
    screens: ['ops/smart-load', 'ops/orders'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.unreconciled',
    module: 'smartload',
    type: 'scenario',
    prompt: 'What happens when you click Confirm loading?',
    scenario: 'Plan for 60 cartons is Approved. At the bay: Loaded 58, Damage 1, Shortage 0. Supervisor name is entered.',
    options: [
      { id: 'a', text: 'Loading is confirmed and the missing carton is ignored' },
      { id: 'b', text: 'Blocked: "Reconcile planned quantity with loaded + damage + shortage before confirmation" – find the carton or record it as Shortage' },
      { id: 'c', text: 'Loading is confirmed but dispatch shows a warning only' },
      { id: 'd', text: 'The plan goes back to Draft' },
    ],
    answer: 'b',
    explanation: 'Every planned package must be accounted for: Loaded + Damage + Shortage must equal Planned (variance 0) on every line. 58 + 1 + 0 = 59, variance −1, so confirmation is refused. Record the missing carton as Shortage (58 + 1 + 1 = 60) or load it. A loading supervisor name is also required ("Select or enter the loading supervisor").',
    screens: ['ops/smart-load', 'wh/verification'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.non-stackable',
    module: 'smartload',
    type: 'mcq',
    prompt: 'Refrigerator 260L FF has "Stacking allowed" off in the Goods master. What does Smart Load Planning do?',
    options: [
      { id: 'a', text: 'Allows one layer of light cartons on top' },
      { id: 'b', text: 'Never places anything on it; a manual move onto it is rejected with "Stacking on non-stackable cargo"' },
      { id: 'c', text: 'Ignores the setting during optimisation and only shows a warning' },
      { id: 'd', text: 'Lays the refrigerator flat to make room' },
    ],
    answer: 'b',
    explanation: 'Stackable off means max layers 1 and top load 0 kg. Placement validation rejects any package sitting on non-stackable cargo, both in the optimiser and in manual X/Y/Z moves. For stackable cargo, Top kg limits the weight of each single package placed directly on top ("Top-load weight limit exceeded").',
    screens: ['ops/smart-load', 'masters'],
    difficulty: 1,
  },
  {
    id: 'q.smartload.payload',
    module: 'smartload',
    type: 'mcq',
    prompt: 'Max payload is 10,000 kg. The cargo lines total 12,000 kg but fit easily by volume. What is the result after Optimize loading?',
    options: [
      { id: 'a', text: 'All packages are placed and payload shows 120%' },
      { id: 'b', text: 'Packages that would exceed 10,000 kg stay Unallocated, so the plan cannot be approved' },
      { id: 'c', text: 'The ERP raises the payload automatically' },
      { id: 'd', text: 'The plan is approved with a warning' },
    ],
    answer: 'b',
    explanation: 'Each package is placed only if total weight stays within Max payload. The rest appear in Unallocated with "Insufficient compatible space, support or payload". Approval needs zero unplaced cargo, so choose a bigger vehicle or split the load across vehicles.',
    screens: ['ops/smart-load'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.unplaced-approve',
    module: 'smartload',
    type: 'tf',
    prompt: 'A saved plan with 4 unallocated packages can be approved if space utilization is above 90%.',
    options: TF,
    answer: 'f',
    explanation: 'You can save a plan with unallocated packages, but approval is blocked: "Resolve exceptions and unplaced cargo before approval". Reduce the quantity on this plan and plan the rest on another vehicle, or change the vehicle.',
    screens: ['ops/smart-load'],
    difficulty: 1,
  },
  {
    id: 'q.smartload.not-certified',
    module: 'smartload',
    type: 'tf',
    prompt: 'An approved Smart Load Plan is a certified axle-load, stability and load-securement check, so the driver does not need to check lashing.',
    options: TF,
    answer: 'f',
    explanation: 'The planner checks only geometry and simple rules: fit inside the body, no collision, total payload, support, stacking, top-load, layers and stop access. It is not certified axle-load, stability or securement analysis, and truck sizes may be estimates. The supervisor and driver stay responsible for safe loading and lashing.',
    screens: ['ops/smart-load'],
    difficulty: 1,
  },
  {
    id: 'q.smartload.dispatch-truck',
    module: 'smartload',
    type: 'next',
    prompt: 'What should you do next?',
    scenario: 'The LR is Finalised and its plan is Loading Confirmed with supervisor and zero variance. The plan was approved with truck MH19 CY 1200. In the Dispatch form you select MH19 BM 1834 and the readiness check shows "Vehicle matches load plan ✕".',
    options: [
      { id: 'a', text: 'Dispatch anyway – the check is only advice' },
      { id: 'b', text: 'Select MH19 CY 1200, or if the truck really changed, make and confirm a new plan for that truck' },
      { id: 'c', text: 'Edit the LR and change the truck' },
      { id: 'd', text: 'Delete the load plan' },
    ],
    answer: 'b',
    explanation: 'Dispatch is blocked with "Selected truck does not match the approved load plan" when the plan was made on a fleet truck. The LR\'s truck is also locked by the approved plan. Use the planned truck, or plan and confirm again for the real truck.',
    screens: ['ops/lr', 'ops/smart-load'],
    difficulty: 3,
  },
  {
    id: 'q.smartload.lr-finalise-gate',
    module: 'smartload',
    type: 'scenario',
    prompt: 'Can you finalise this road LR now?',
    scenario: 'Order ORD-1011 has plan SLP-00002 with status Approved. Loading has started but nobody has clicked Confirm loading. You open Generate LR for the order, enter freight and truck and click Finalise.',
    options: [
      { id: 'a', text: 'Yes – Approved is enough' },
      { id: 'b', text: 'No – "Smart Load Plan SLP-00002 must be loading-confirmed before finalising this LR"' },
      { id: 'c', text: 'Yes, but dispatch will be blocked later' },
      { id: 'd', text: 'No – an LR cannot be made for an order with a plan' },
    ],
    answer: 'b',
    explanation: 'For a road LR whose order has a Smart Load Plan, finalisation needs the plan in Loading Confirmed. You can still save the LR as draft. Confirm loading on the plan first, then finalise.',
    screens: ['ops/lr-new', 'ops/smart-load'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.rotation',
    module: 'smartload',
    type: 'mcq',
    prompt: 'Which Goods master setting allows the optimiser to turn a carton on its side?',
    options: [
      { id: 'a', text: 'Storage position "Upright"' },
      { id: 'b', text: 'Storage position "Flat"' },
      { id: 'c', text: 'Storage position "Any" (or blank)' },
      { id: 'd', text: 'Stacking allowed = Yes' },
    ],
    answer: 'c',
    explanation: 'When an order is linked, Rotate is ticked only for goods with storage position "Any" or blank; then all six orientations are tried. Upright and Flat goods keep their L × W × H. You can still change the Rotate tick on the cargo line while the plan is Draft.',
    screens: ['ops/smart-load', 'masters'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.recommendation',
    module: 'smartload',
    type: 'mcq',
    prompt: 'In Vehicle recommendation a template shows the badge "Split load". What does it mean?',
    options: [
      { id: 'a', text: 'The ERP has already created two plans' },
      { id: 'b', text: 'That body cannot carry the whole manifest in one load' },
      { id: 'c', text: 'The cargo has two delivery stops' },
      { id: 'd', text: 'The truck is shared with another customer' },
    ],
    answer: 'b',
    explanation: '"Fits" means every package was placed in that template; "Split load" means some would be left. The box below shows how many loads of the current vehicle the manifest needs (checked up to 6). The ERP does not create the extra plans – you plan each vehicle yourself. Bodies that fit everything are listed first; compare space and payload % to pick the right size.',
    screens: ['ops/smart-load'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.save-before-approve',
    module: 'smartload',
    type: 'next',
    prompt: 'What is the next step?',
    scenario: 'You linked an order, optimised (all packages placed, no exceptions) and clicked Approve load plan. The ERP shows "Save the plan before changing its status".',
    options: [
      { id: 'a', text: 'Click Save plan, then Approve load plan' },
      { id: 'b', text: 'Click Optimize loading again' },
      { id: 'c', text: 'Click Confirm loading' },
      { id: 'd', text: 'Print the plan – printing saves it' },
    ],
    answer: 'a',
    explanation: 'Status changes work only on a saved plan (plan no. SLP-…). Save plan stores the plan; after that Approve works. Printing does not save – an unsaved print shows plan no. "UNSAVED".',
    screens: ['ops/smart-load'],
    difficulty: 1,
  },
  {
    id: 'q.smartload.qty-cap',
    module: 'smartload',
    type: 'tf',
    prompt: 'When you link an order line of 600 refrigerators, the cargo line shows Qty 600.',
    options: TF,
    answer: 'f',
    explanation: 'Linking an order caps each cargo line at 100 packages, because one plan is for one vehicle. Check the quantity this truck will really carry and edit Qty; plan the rest on other vehicles.',
    screens: ['ops/smart-load'],
    difficulty: 2,
  },
  {
    id: 'q.smartload.lifecycle-order',
    module: 'smartload',
    type: 'order',
    prompt: 'After Loading Confirmed, put the plan statuses in the order they are set automatically.',
    items: [
      { id: 'disp', text: 'Dispatched' },
      { id: 'del', text: 'Delivered' },
      { id: 'pod', text: 'POD Received' },
      { id: 'bill', text: 'Billed' },
      { id: 'paid', text: 'Paid' },
    ],
    answer: ['disp', 'del', 'pod', 'bill', 'paid'],
    explanation: 'LR dispatch sets Dispatched, delivery sets Delivered, POD sets POD Received, putting the LR on a bill sets Billed, and receipts set Payment Partial or Paid. Deleting the bill takes the plan back to POD Received.',
    screens: ['ops/smart-load', 'ops/lr', 'fin/billing'],
    difficulty: 1,
  },
  {
    id: 'q.smartload.default-loaded',
    module: 'smartload',
    type: 'spot',
    prompt: 'Which of these loading-bay habits is wrong?',
    options: [
      { id: 'a', text: 'Counting each line at the bay and changing Loaded to the real count' },
      { id: 'b', text: 'Clicking Confirm loading straight away because Loaded already equals Planned and variance is 0' },
      { id: 'c', text: 'Writing the seal number in Loading remarks' },
      { id: 'd', text: 'Recording a crushed carton as Damage and reducing Loaded by one' },
    ],
    answer: 'b',
    explanation: 'Loaded is pre-filled with the planned quantity, so variance shows 0 before anyone counts. The confirmation is your signature that the loading was checked – always enter the real count.',
    screens: ['ops/smart-load'],
    difficulty: 2,
  },
  {
    id: 'q.wh.stock-meaning',
    module: 'wh',
    type: 'mcq',
    prompt: 'What does Godown Stock list?',
    options: [
      { id: 'a', text: 'All LRs booked this month' },
      { id: 'b', text: 'GRN packages at the rail head not yet loaded on a VP, and DGRN packages at branches not yet on a delivery challan' },
      { id: 'c', text: 'Workshop spare parts' },
      { id: 'd', text: 'Road cargo in approved Smart Load Plans' },
    ],
    answer: 'b',
    explanation: 'Stock is the pending quantity of GRN (rail head) and DGRN (branch) lines. It falls only when packages are loaded on a VP or put on a delivery challan. Spares are under Workshop; road plans are in Loading Verification.',
    screens: ['wh/stock'],
    difficulty: 1,
  },
  {
    id: 'q.wh.ageing',
    module: 'wh',
    type: 'tf',
    prompt: 'In Godown Stock, lines older than 5 days are shown in red and counted in "Ageing > 5 days".',
    options: TF,
    answer: 't',
    explanation: 'Age is counted from the GRN/DGRN in-date. More than 5 days is shown in red – plan those packages for loading or delivery first.',
    screens: ['wh/stock'],
    difficulty: 1,
  },
  {
    id: 'q.wh.verification-mismatch',
    module: 'wh',
    type: 'scenario',
    prompt: 'What status does Loading Verification show for this LR?',
    scenario: 'GRN received 100 packages. 90 are loaded on VPs, 2 recorded as damaged at loading, and 5 are still pending in the godown.',
    options: [
      { id: 'a', text: 'Verified' },
      { id: 'b', text: 'Partially loaded' },
      { id: 'c', text: 'Mismatch – 3 packages are not accounted for' },
      { id: 'd', text: 'Pending' },
    ],
    answer: 'c',
    explanation: 'Received − loaded − damage − pending = 100 − 90 − 2 − 5 = 3. Any difference other than 0 is a Mismatch, even when packages are still pending. Find the 3 packages before the rake closes.',
    screens: ['wh/verification'],
    difficulty: 2,
  },
  {
    id: 'q.wh.road-queue',
    module: 'wh',
    type: 'mcq',
    prompt: 'Which Smart Load Plans appear in the Road load-plan queue in Loading Verification?',
    options: [
      { id: 'a', text: 'All plans, including Draft' },
      { id: 'b', text: 'Plans with status Approved or Loading Confirmed' },
      { id: 'c', text: 'Only Dispatched plans' },
      { id: 'd', text: 'Only plans without an LR' },
    ],
    answer: 'b',
    explanation: 'The queue shows approved plans waiting for physical loading and plans whose loading is confirmed. Clicking a row opens the plan in Smart Load Planning, where loading is confirmed. After dispatch the plan leaves the queue.',
    screens: ['wh/verification'],
    difficulty: 1,
  },
  {
    id: 'q.wh.damage-source',
    module: 'wh',
    type: 'mcq',
    prompt: 'A carton was found crushed when the client signed the LDC. Where do you record it so it appears in Damage / Shortage?',
    options: [
      { id: 'a', text: 'Directly on the Damage / Shortage screen' },
      { id: 'b', text: 'On the LDC acknowledgment (client ack) for that delivery challan' },
      { id: 'c', text: 'In Quality Control' },
      { id: 'd', text: 'In Godown Stock' },
    ],
    answer: 'b',
    explanation: 'Damage / Shortage is a read-only register. It collects damage and shortage from GRN, DGRN, LDC acknowledgments (supervisor, collection, client) and POD. Record the incident on the document where it was found.',
    screens: ['wh/damage', 'ops/ldc'],
    difficulty: 1,
  },
  {
    id: 'q.wh.qc-score',
    module: 'wh',
    type: 'mcq',
    prompt: 'A client has 100% damage-free, 50% on-time and 100% POD received. What is the QC score and colour?',
    options: [
      { id: 'a', text: '83 – amber' },
      { id: 'b', text: '80 – amber' },
      { id: 'c', text: '90 – green' },
      { id: 'd', text: '67 – red' },
    ],
    answer: 'b',
    explanation: 'QC score = 40% × 100 + 40% × 50 + 20% × 100 = 40 + 20 + 20 = 80. 85 and above is green, 70–84 amber, below 70 red. The weak part here is on-time delivery.',
    screens: ['wh/qc'],
    difficulty: 2,
  },
  {
    id: 'q.wh.occupancy',
    module: 'wh',
    type: 'mcq',
    prompt: 'How is the Occupancy bar on Godowns worked out?',
    options: [
      { id: 'a', text: 'It is typed in by the godown manager' },
      { id: 'b', text: 'Pending GRN/DGRN packages × goods weight, in MT, against Storage capacity (MT); red above 80%' },
      { id: 'c', text: 'Number of LRs against number of gates' },
      { id: 'd', text: 'Monthly rent against deposit' },
    ],
    answer: 'b',
    explanation: 'Stock held = packages still pending on GRN (rail head godown) and DGRN (branch godown) multiplied by the Goods master weight, in tonnes. It is compared with Storage capacity (MT). Keep capacity and goods weights correct for a true picture.',
    screens: ['wh/godowns'],
    difficulty: 2,
  },
  {
    id: 'q.wh.movement-scope',
    module: 'wh',
    type: 'tf',
    prompt: 'Stock Movement shows rail consignment movements: GRN at rail head, Loaded to VP, DGRN at branch and Delivery challan.',
    options: TF,
    answer: 't',
    explanation: 'Stock Movement lists rail movements only, newest first, and can be filtered by VP schedule. Road Smart Load plans are followed in Loading Verification and in the plan itself.',
    screens: ['wh/movement'],
    difficulty: 1,
  },
];

// =====================================================================================================
// PRACTICE EXERCISES
// =====================================================================================================
export const exercises: Exercise[] = [
  {
    id: 'ex.smartload.plan-approve',
    title: 'Plan and approve a truck load for an order',
    module: 'smartload',
    roles: ['OP', 'BU', 'SA'],
    summary: 'Link confirmed order ORD-1011 (Edible Oil Tins 15L), choose the truck, optimise, save and approve the plan, and see the approval on the order.',
    minutes: 8,
    watch: ['loadPlans', 'orders'],
    steps: [
      {
        id: 'plan',
        screen: 'ops/smart-load',
        task: 'Open Smart Load Planning (or Orders → ORD-1011 → Smart Load Plan). In "Link ERP order" choose ORD-1011. In "Vehicle / reusable template" choose truck MH19 CY 1200. Check the tin size (24 × 24 × 36 cm, 15.5 kg), click Optimize loading and then Save plan.',
        expected: 'A new load plan (SLP-…) linked to an ERP order, with packages placed.',
        check: (db, base) => {
          const mine = created(db, base, 'loadPlans');
          if (!mine.length) return notYet('No new load plan saved yet');
          const linked = mine.filter((p: any) => Array.isArray(p.orderIds) && p.orderIds.length > 0 && placedCount(p) > 0);
          if (!linked.length) return notYet(`${mine[0].planNo || 'Plan'} saved, but it is not linked to an ERP order – choose the order in "Link ERP order"`);
          const p = linked[0];
          return pass(`${p.planNo} saved for ${orderNo(db, p)} on ${p.vehicle?.name || 'vehicle'} – ${placedCount(p)} packages placed, ${unplacedQty(p)} unallocated`);
        },
      },
      {
        id: 'approve',
        screen: 'ops/smart-load',
        task: 'Check that Unallocated is 0 and the Planning exceptions card is empty, then click Approve load plan.',
        expected: 'The plan status becomes Approved (approval time recorded).',
        check: (db, base) => {
          const done = changed(db, base, 'loadPlans', (p: any) => POST_APPROVAL.includes(p.status) && !!p.approvedAt);
          if (done.length) return pass(`${done[0].planNo} is ${done[0].status} (approved ${String(done[0].approvedAt).slice(0, 16).replace('T', ' ')})`);
          const draft = created(db, base, 'loadPlans', (p: any) => p.status === 'Draft');
          if (draft.length) return notYet(`${draft[0].planNo} is still Draft${unplacedQty(draft[0]) ? ` with ${unplacedQty(draft[0])} unallocated packages – approval needs 0` : ''}`);
          return notYet();
        },
      },
      {
        id: 'order-sync',
        screen: 'ops/orders',
        task: 'Open Orders and open ORD-1011 (Order 360). Check that it now shows the Smart Load Plan number and status.',
        expected: 'The linked order carries the plan no. and status Approved.',
        check: (db, base) => {
          const approved = changed(db, base, 'loadPlans', (p: any) => POST_APPROVAL.includes(p.status) && Array.isArray(p.orderIds) && p.orderIds.length > 0);
          for (const p of approved) {
            const o = list(db, 'orders').find((x: any) => x.id === p.orderIds[0]);
            if (o && o.loadPlanId === p.id && o.loadPlanStatus) return pass(`${o.orderNo} shows plan ${o.loadPlanNo} · ${o.loadPlanStatus}`);
          }
          return notYet('No order is linked to a plan approved in this exercise yet');
        },
      },
    ],
  },
  {
    id: 'ex.smartload.physical-loading',
    title: 'Reconcile physical loading and confirm it',
    module: 'smartload',
    roles: ['OP', 'BU'],
    summary: 'Open an approved plan from the Warehouse queue, record the real loading count with one damaged package, enter the supervisor and confirm loading.',
    minutes: 6,
    watch: ['loadPlans', 'orders', 'lrs'],
    steps: [
      {
        id: 'open-approved',
        screen: 'wh/verification',
        task: 'Open Warehouse → Loading Verification. In the Road load-plan queue click a plan with status Approved. (No approved plan? Do the exercise "Plan and approve a truck load for an order" first.)',
        expected: 'An approved Smart Load Plan is available for loading.',
        check: (db) => {
          const ready = list(db, 'loadPlans').filter((p: any) => p?.status === 'Approved');
          if (ready.length) return pass(`${ready.length} approved plan(s) waiting for loading: ${ready.slice(0, 3).map((p: any) => p.planNo).join(', ')}`);
          const already = list(db, 'loadPlans').filter((p: any) => p?.status === 'Loading Confirmed');
          if (already.length) return pass(`${already[0].planNo} already loading-confirmed`);
          return notYet('No approved plan in the practice data yet');
        },
      },
      {
        id: 'reconcile-confirm',
        screen: 'ops/smart-load',
        task: 'In Physical loading confirmation, the crew found one crushed package: on one cargo line reduce Loaded by 1 and set Damage = 1, so Variance shows 0. Enter your name as Loading supervisor, add a remark (for example the seal number) and click Confirm loading.',
        expected: 'Plan status Loading Confirmed, supervisor recorded, variance 0, one package recorded as damage (or shortage).',
        check: (db, base) => {
          const conf = changed(db, base, 'loadPlans', (p: any) => POST_CONFIRM.includes(p.status) && !!p.loadingVerification?.supervisor);
          if (!conf.length) return notYet('Loading not confirmed yet');
          const p = conf[0];
          const lv = p.loadingVerification || {};
          if (Number(lv.variance || 0) !== 0) return notYet(`${p.planNo} confirmed with variance ${lv.variance}`);
          if (!conf.some(hasDamageOrShortage)) return notYet(`${p.planNo} confirmed by ${lv.supervisor}, but no damaged or short package was recorded`);
          const q = conf.find(hasDamageOrShortage);
          return pass(`${q.planNo} Loading Confirmed by ${q.loadingVerification.supervisor} · ${q.loadingVerification.actualLoaded} loaded · variance 0 · damage/shortage recorded`);
        },
      },
      {
        id: 'sync',
        screen: 'wh/verification',
        task: 'Go back to Loading Verification. Check the plan now shows Loading Confirmed with the loaded count, and open the linked order (Order 360) to see the same status.',
        expected: 'The linked order shows plan status Loading Confirmed.',
        check: (db, base) => {
          const conf = changed(db, base, 'loadPlans', (p: any) => POST_CONFIRM.includes(p.status) && Array.isArray(p.orderIds) && p.orderIds.length > 0);
          for (const p of conf) {
            const o = list(db, 'orders').find((x: any) => x.id === p.orderIds[0]);
            if (o && o.loadPlanStatus && POST_CONFIRM.includes(o.loadPlanStatus)) return pass(`${o.orderNo} shows ${o.loadPlanNo} · ${o.loadPlanStatus}`);
          }
          if (touched(db, base, 'loadPlans', (p: any) => p?.status === 'Loading Confirmed' && !(p.orderIds || []).length).length) return notYet('The confirmed plan is not linked to an order – use a plan made for an ERP order');
          return notYet('No order shows a confirmed load plan yet');
        },
      },
    ],
  },
  {
    id: 'ex.wh.godown-master',
    title: 'Add a godown and renew a lease',
    module: 'wh',
    roles: ['AD', 'OP', 'BU'],
    summary: 'Add a new leased godown with branch, capacity and gates, then update the agreement expiry of an existing godown.',
    minutes: 5,
    watch: ['godowns'],
    steps: [
      {
        id: 'add',
        screen: 'wh/godowns',
        task: 'Click Add godown. Name "Nagpur Transit Shed", type Leased, choose a branch, Monthly rent 45000, Storage capacity 600 MT, No. of gates 2. Save.',
        expected: 'A new godown with branch, capacity and gates.',
        check: (db, base) => {
          const mine = created(db, base, 'godowns');
          if (!mine.length) return notYet('No new godown saved yet');
          const ok = mine.find((g: any) => Number(g.capacity) > 0 && Number(g.gateNo) > 0 && !!g.branchId);
          if (!ok) return notYet(`${mine[0].name} saved, but capacity, gates or branch is missing`);
          return pass(`${ok.name} · ${ok.type || 'type not set'} · ${ok.capacity} MT · ${ok.gateNo} gate(s)`);
        },
      },
      {
        id: 'renew',
        screen: 'wh/godowns',
        task: 'The Chakan Depot lease is renewed. Row menu → Edit on Chakan Depot, change the Expiry date to two years later and Save.',
        expected: 'The expiry date of an existing godown is changed.',
        check: (db, base) => {
          const existing = new Set(base.ids.godowns || []);
          const ren = fieldChanged(db, base, 'godowns', 'expiry', (g: any) => existing.has(g.id));
          if (!ren.length) return notYet('No existing godown has a new expiry date yet');
          return pass(`${ren[0].name} agreement expiry is now ${ren[0].expiry}`);
        },
      },
    ],
  },
];

// =====================================================================================================
// WORKFLOWS
// =====================================================================================================
export const workflows: Workflow[] = [
  {
    id: 'wf.smart-load',
    title: 'Road load: order to dispatch with Smart Load Planning',
    module: 'smartload',
    roles: ['OP', 'BU', 'SA'],
    summary: 'How a confirmed order is planned in 3D, approved, physically loaded and reconciled, then released for LR finalisation and dispatch – and how the plan status follows the LR to payment.',
    exercise: 'ex.smartload.plan-approve',
    lesson: 'ls.smartload.approval-locks',
    steps: [
      { screen: 'ops/orders', title: 'Order', does: 'The confirmed order holds client, route, goods and quantity. Row menu → Smart Load Plan opens the planner with the order linked.' },
      { screen: 'ops/smart-load', title: 'Plan', does: 'Order lines become cargo lines from the Goods master (max 100 per line). Choose the real truck or a template and check inside size and payload.', lesson: 'ls.smartload.cargo-geometry' },
      { screen: 'ops/smart-load', title: 'Optimise', does: 'Optimize loading runs two placement methods and keeps the one that places more packages. Unallocated must be 0 to approve.', lesson: 'ls.smartload.optimisation' },
      { screen: 'ops/smart-load', title: 'Review 3D and sequence', does: 'Check the 3D view, the Load and Unload sequence and Planning exceptions; fix blocked stops or bad placements with manual moves or by re-optimising.', lesson: 'ls.smartload.multistop-lifo' },
      { screen: 'ops/smart-load', title: 'Save and approve', does: 'Save plan creates SLP-…; Approve load plan locks cargo, vehicle and placement and writes the plan to the order, which locks order client/route/items.', lesson: 'ls.smartload.approval-locks' },
      { screen: 'ops/smart-load', title: 'Print loading instructions', does: 'Print load plan opens a printable sheet: top and side views, numbered loading sequence with positions, cargo manifest and signature lines.' },
      { screen: 'wh/verification', title: 'Physical loading', does: 'The approved plan waits in the Road load-plan queue. The bay team loads in sequence and counts each line.', lesson: 'ls.smartload.physical-loading' },
      { screen: 'ops/smart-load', title: 'Supervisor confirmation', does: 'Enter Loaded, Damage, Shortage (variance 0 on every line), supervisor and remarks, then Confirm loading. Existing LRs of the order get a timeline event.' },
      { screen: 'ops/lr-new', title: 'LR finalisation', does: 'A road LR for the order can be finalised only when the plan is Loading Confirmed; the plan no. is stored on the LR.' },
      { screen: 'ops/lr', title: 'Dispatch readiness', does: 'In LR 360 the Dispatch form checks: LR finalised, plan confirmed, quantities reconciled, truck matches the plan, driver for own truck. Dispatch then moves the plan to Dispatched.', lesson: 'ls.smartload.dispatch-lifecycle' },
    ],
    notes: [
      'After dispatch the plan follows the LR automatically: Delivered → POD Received → Billed → Payment Partial / Paid.',
      'Orders without a Smart Load Plan are not gated – the checks apply only when a plan is linked.',
      'The plan is geometric planning only – not certified axle-load, stability or load-securement analysis.',
    ],
  },
  {
    id: 'wf.warehouse',
    title: 'Warehouse: goods in to dispatch and receipt',
    module: 'wh',
    roles: ['OP', 'BU', 'AD'],
    summary: 'How rail consignment stock is received, held, moved, verified at loading and checked for damage and shortage, and where road load plans are verified.',
    lesson: 'ls.smartload.physical-loading',
    steps: [
      { screen: 'wh/godowns', title: 'Godown set-up', does: 'Godowns with branch, capacity (MT) and gates must exist; occupancy is calculated from stock in them.' },
      { screen: 'ops/grn', title: 'Goods in at rail head', does: 'GRN records packages received at the Jalgaon rail head godown, the gate, and any damage.' },
      { screen: 'wh/stock', title: 'Stock', does: 'GRN pending packages show as rail-head stock; ageing above 5 days is red.' },
      { screen: 'ops/vp-loading', title: 'Load to VP', does: 'Packages are loaded on VPs of a schedule; GRN pending falls.' },
      { screen: 'wh/movement', title: 'Movement', does: 'Every GRN In, Loaded to VP Out, DGRN In and Delivery challan Out is listed by rake.' },
      { screen: 'wh/verification', title: 'Loading verification', does: 'Rail: received = loaded + damage + pending, otherwise Mismatch. Road: approved Smart Load Plans wait here for physical loading confirmation.' },
      { screen: 'ops/dgrn', title: 'Receipt at branch', does: 'DGRN records packages received at the destination branch godown; they show as branch stock.' },
      { screen: 'ops/dc', title: 'Dispatch to client', does: 'Delivery challans take DGRN stock out to clients; LDC acknowledgments record damage and shortage at delivery.' },
      { screen: 'wh/damage', title: 'Damage / shortage review', does: 'All damage and shortage from GRN, DGRN, LDC acknowledgments and POD in one register.' },
      { screen: 'wh/qc', title: 'Quality review', does: 'Damage-free, on-time and POD % per client or branch combine into the QC score.' },
    ],
    notes: [
      'Warehouse report screens are read-only: quantities change only through GRN, VP loading, DGRN, delivery challans, LDC acknowledgments and POD.',
      'Smart Load loading damage/shortage is stored on the load plan and is not listed on Damage / Shortage.',
    ],
  },
];

// =====================================================================================================
// CONCEPT LESSONS
// =====================================================================================================
export const lessons: Lesson[] = [
  {
    id: 'ls.smartload.cargo-geometry',
    title: 'Cargo dimensions and goods geometry',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load', 'masters'],
    summary: 'Where package sizes, weights and handling rules come from, what happens when they are missing, and why you must check them before optimising.',
    sections: [
      {
        heading: 'One package, not the whole line',
        body: 'Each cargo line describes ONE package: L, W and H in centimetres and kg per piece, plus Qty. The planner multiplies by Qty itself. All five values must be more than 0, otherwise Optimize shows "Enter positive cargo dimensions, quantity and weight".',
      },
      {
        heading: 'From the Goods master',
        body: 'When you link an order, each order line is turned into a cargo line using the Goods master:',
        bullets: [
          'Length, Width, Height (cm) and Weight (kg) → L, W, H and kg/pc.',
          'Stacking allowed → Stackable.',
          'Storage position "Any" or blank → Rotate ticked; Upright or Flat → Rotate off.',
          'Max stacking layers → Max layers; Max top load (kg) → Top kg.',
        ],
      },
      {
        heading: 'Missing values become estimates',
        body: 'If a goods record has no size or weight, the planner uses 100 × 80 × 80 cm and 150 kg. A yellow note in Planning exceptions reminds you to verify units, dimensions and weights. Correct the Goods master so the next plan is right.',
      },
      {
        heading: 'Quantity per plan',
        body: 'Linking an order caps each cargo line at 100 packages, because one plan is one vehicle. Set Qty to what this truck will carry and plan the rest on other vehicles.',
      },
    ],
    audio: [
      'हर cargo line एक package का size और weight बताती है — centimetre और kg में।',
      'Order link करते ही size, weight, stacking और rotation Goods master से आ जाते हैं।',
      'अगर Goods master में size नहीं है, तो system अंदाज़े से सौ बाय अस्सी बाय अस्सी और डेढ़ सौ kg ले लेता है। इसे ज़रूर सही कीजिए।',
      'एक line में ज़्यादा से ज़्यादा सौ packages आते हैं, क्योंकि एक plan एक truck का है।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.smartload.vehicles-payload',
    title: 'Vehicle dimensions, templates, payload and multi-vehicle split',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load', 'fleet/trucks'],
    summary: 'How the loading space and weight limit are set, how vehicle recommendations work, and what to do when one truck is not enough.',
    prerequisites: ['ls.smartload.cargo-geometry'],
    sections: [
      {
        heading: 'Fleet truck or template',
        body: 'The vehicle list has five body templates and every fleet truck. Choosing a fleet truck makes it the planned truck: after approval, dispatch is allowed only with that truck. A template (for example 24 FT Truck) has no truck number, so no truck match is checked.',
        bullets: [
          '14 FT LCV 426 × 200 × 200 cm, 4,000 kg',
          '17 FT LCV 518 × 210 × 215 cm, 7,000 kg',
          '20 FT Container 610 × 235 × 239 cm, 10,000 kg',
          '24 FT Truck 731 × 235 × 240 cm, 16,000 kg',
          '32 FT Container 975 × 235 × 245 cm, 32,000 kg',
        ],
      },
      {
        heading: 'Truck sizes are estimates unless filled in',
        body: 'For a fleet truck the planner uses Loading length/width/height and Max payload from the truck master (Load planning section). If they are empty it uses 975 × 235 × 245 cm, and 16,000 kg when the capacity text contains "16", otherwise 32,000 kg. A new plan starts with the first truck in the list – always change it to the real truck.',
      },
      {
        heading: 'Payload',
        body: 'Max payload is the total weight limit. A package is placed only if the loaded weight stays within it. Payload utilization shows loaded kg against Max payload, and "Available payload" shows what is left.',
      },
      {
        heading: 'Recommendation and split',
        body: 'Vehicle recommendation tries the five templates on your manifest and shows the top three with "Fits" or "Split load". Bodies that carry everything come first – compare their space and payload % and choose the right size yourself; the first is not always the smallest. The box below shows how many loads of the current vehicle the manifest needs (checked up to 6). The ERP does not create those plans; make one plan per truck with the quantity for that truck.',
      },
    ],
    audio: [
      'Truck चुनिए तो वही planned truck बन जाता है, और dispatch उसी truck से होगा।',
      'Truck master में loading size और payload नहीं भरा, तो system अंदाज़ा लगाता है। सही size भरवाइए।',
      'Payload से ज़्यादा weight वाले packages Unallocated में चले जाते हैं।',
      'Vehicle recommendation में Fits मतलब पूरा माल एक गाड़ी में, Split load मतलब एक से ज़्यादा गाड़ी लगेगी।',
      'हर truck के लिए अलग plan बनाइए। System खुद दूसरा plan नहीं बनाता।',
    ],
    minutes: 4,
    quiz: ['q.smartload.payload', 'q.smartload.recommendation'],
  },
  {
    id: 'ls.smartload.stacking-rotation',
    title: 'Stacking rules, top load, max layers and rotation',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load'],
    summary: 'The handling rules the planner enforces for every package, in optimisation and in manual moves.',
    prerequisites: ['ls.smartload.cargo-geometry'],
    sections: [
      {
        heading: 'Rules checked for every package',
        body: 'A position is accepted only if all these hold:',
        bullets: [
          'Inside the vehicle body ("Outside vehicle bounds").',
          'No overlap with another package ("Collision with another package").',
          'Total weight within Max payload ("Payload exceeded").',
          'If not on the floor: at least 99% of its base rests on packages directly below ("Insufficient support under package").',
          'Nothing below it is non-stackable ("Stacking on non-stackable cargo").',
          'Its weight is not more than the Top kg of each package below ("Top-load weight limit exceeded").',
          'The layer count does not exceed Max layers of the packages below ("Maximum stacking layers exceeded").',
        ],
      },
      {
        heading: 'Stackable, Top kg and Max layers',
        body: 'Stackable off means max 1 layer and 0 kg on top. For stackable cargo, empty Top kg and Max layers mean no limit. Top kg is checked per package placed directly on top, not as a total of the whole stack.',
      },
      {
        heading: 'Rotation',
        body: 'With Rotate on, the optimiser tries all six orientations. With Rotate off, it keeps L × W × H. In the 3D card, "Rotate on floor" swaps length and width and "Tip / rotate forward" swaps length and height – both are refused with "Rotation blocked" if the new shape breaks a rule.',
      },
    ],
    audio: [
      'हर package के लिए system देखता है — truck के अंदर है, किसी से टकरा नहीं रहा, और payload के अंदर है।',
      'ऊपर रखे package के नीचे पूरा सहारा होना चाहिए।',
      'Non-stackable माल के ऊपर कुछ नहीं रखा जाता। Top kg और Max layers से तय होता है कितना वज़न और कितनी परतें।',
      'Rotate tick हो तो system package को घुमा कर भी रख सकता है। Upright माल नहीं घुमाया जाता।',
    ],
    minutes: 3,
    quiz: ['q.smartload.non-stackable', 'q.smartload.rotation'],
  },
  {
    id: 'ls.smartload.optimisation',
    title: 'Optimisation results – and what the plan is not',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load'],
    summary: 'How Optimize loading works, how to read its result, and the safety limits of a geometric plan.',
    prerequisites: ['ls.smartload.stacking-rotation'],
    sections: [
      {
        heading: 'Dual heuristic',
        body: 'Optimize loading runs two placement methods on the same cargo and vehicle and keeps the result that leaves fewer packages unallocated (or places more). The second method is used only if its result passes the full placement check. Packages are placed by stop (Stop 1 first, nearest the door), then bigger and heavier first, filling floor level before going up. It is a fast rule-based method, not a guaranteed best packing.',
      },
      {
        heading: 'Reading the result',
        bullets: [
          'Packages placed – how many fitted.',
          'Space utilization – volume of placed packages ÷ inside volume.',
          'Payload utilization – loaded kg ÷ Max payload; Available payload shows what is left.',
          'Unallocated – packages that did not fit: "Insufficient compatible space, support or payload". Must be 0 to approve.',
          'Only the first 500 packages are evaluated; the rest are listed as "Evaluation limit of 500 packages".',
        ],
        body: 'Check these KPIs and the Planning exceptions card after every optimisation.',
      },
      {
        heading: 'NOT certified safety analysis',
        body: 'The Smart Load Plan is geometric planning only. It is NOT certified axle-load, stability or load-securement analysis. It does not calculate axle weights, centre of gravity, braking or cornering forces, or lashing. Package and truck sizes may be estimates. The loading supervisor and driver remain responsible for weight distribution, securing the load and road-legal axle limits. Never present the printout to a customer as a safety-approved loading instruction.',
      },
    ],
    audio: [
      'Optimize loading दो तरीकों से माल रखकर देखता है, और जिसमें ज़्यादा packages फिट हों, वही चुनता है।',
      'Space और Payload utilization देखिए, और Unallocated zero होना चाहिए।',
      'ध्यान रखिए, यह सिर्फ़ जगह और वज़न का हिसाब है। Axle load, balance और lashing का certified check नहीं है।',
      'माल को बाँधना और वज़न सही बाँटना supervisor और driver की ज़िम्मेदारी है।',
    ],
    minutes: 4,
    quiz: ['q.smartload.not-certified', 'q.smartload.unplaced-approve'],
  },
  {
    id: 'ls.smartload.3d-view',
    title: 'The 3D arrangement view and manual moves',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load'],
    summary: 'How to read the 3D loading plan, select a package, and move or rotate it safely.',
    prerequisites: ['ls.smartload.optimisation'],
    sections: [
      {
        heading: 'Reading the view',
        body: 'Drag to orbit and scroll to zoom. Colours show delivery stops. Use the Stop buttons to show one stop at a time. Coordinates: X runs along the length from the rear door (X = 0), Y across the width, Z up from the floor.',
      },
      {
        heading: 'Package numbers',
        body: 'The number on a box is its position in the list on screen (and it changes when you filter a stop). It is not the loading step. For the loading order use the Load sequence list or the printout – clicking a row there selects that package in 3D.',
      },
      {
        heading: 'Manual moves',
        body: 'Select a package to open the "Selected cargo" card. Change X, Y or Z position, or use Rotate on floor / Tip / rotate forward. Every change is checked against all rules and refused with "Invalid placement" or "Rotation blocked" if it breaks one.',
        bullets: [
          'A manual move is only on screen until you click Save plan again.',
          'Approve does not save – save after moving, then approve.',
          'Moves are not allowed once the plan is approved ("Approved placement is locked").',
        ],
      },
    ],
    audio: [
      '3D view को घुमा कर देखिए। हर रंग एक delivery stop है।',
      'X का मतलब पीछे के दरवाज़े से दूरी, Y चौड़ाई, और Z ऊँचाई।',
      'Box पर लिखा number loading का step नहीं है। Loading का क्रम Load sequence list या print में देखिए।',
      'Package हिलाने के बाद Save plan ज़रूर दबाइए, वरना approve पुराना plan होगा।',
    ],
    minutes: 3,
  },
  {
    id: 'ls.smartload.multistop-lifo',
    title: 'Multi-stop LIFO, loading and unloading sequence',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load'],
    summary: 'How stops decide where cargo goes, how accessibility is checked, and how to use the load and unload sequence and the printout.',
    prerequisites: ['ls.smartload.optimisation'],
    sections: [
      {
        heading: 'Last in, first out',
        body: 'Give every cargo line its delivery Stop (1–9). Stop 1 is delivered first, so it must be nearest the rear door. The optimiser places lower stops first at the door end.',
      },
      {
        heading: 'Accessibility check',
        body: 'If a package for a later stop sits between an earlier-stop package and the rear door, Planning exceptions shows "… (stop 1) is blocked toward rear door by later-stop cargo: …". Saving and approval are blocked until it is fixed by moving packages or re-optimising.',
      },
      {
        heading: 'Load and unload sequence',
        bullets: [
          'Load sequence: highest stop first; inside a stop, bottom layer first and deepest (far from the door) first.',
          'Unload sequence: Stop 1 first; inside a stop, nearest the door first and top layer first.',
          'Click a row to highlight the package in 3D.',
        ],
        body: 'Load the truck in the Load sequence order so the unloading crew at every stop finds its cargo at the door.',
      },
      {
        heading: 'Printed loading instruction',
        body: 'Print load plan opens a print window (allow pop-ups) with vehicle, package, space and payload boxes, top and side views with the rear door on the left, the numbered Loading sequence with X/Y/Z position and size, the cargo manifest, unplaced count, packages per stop, and signature lines for Loading supervisor and Operations. Box numbers in the printed views match the loading sequence table.',
      },
    ],
    audio: [
      'जो माल पहले उतरना है, यानी stop एक, वो दरवाज़े के पास होना चाहिए।',
      'अगर बाद वाले stop का माल रास्ता रोक रहा है, तो exception आता है और plan save नहीं होता।',
      'Load sequence में आख़िरी stop का माल सबसे पहले, सबसे अंदर भरा जाता है।',
      'Print load plan निकालिए। उसमें हर package का step number और जगह लिखी है।',
    ],
    minutes: 4,
    quiz: ['q.smartload.lifo-stop-order', 'q.smartload.access-blocked'],
  },
  {
    id: 'ls.smartload.approval-locks',
    title: 'Approval and the locks it creates',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'SA'],
    screens: ['ops/smart-load', 'ops/orders', 'ops/lr-new'],
    summary: 'What approval needs, what it changes in the order, and what you can no longer edit afterwards.',
    prerequisites: ['ls.smartload.multistop-lifo'],
    sections: [
      {
        heading: 'Before you can approve',
        bullets: [
          'The plan is saved ("Save the plan before changing its status").',
          'No placement or accessibility exceptions and no unallocated packages ("Resolve exceptions and unplaced cargo before approval").',
          'The plan is Draft ("Only a draft plan can be approved").',
        ],
        body: 'Approval records the approval time and moves the plan to Approved.',
      },
      {
        heading: 'Locks on the plan',
        body: 'From Approved, plan name, linked order, vehicle and its dimensions, cargo lines, Optimize, manual moves and rotation are locked. From Loading Confirmed, even Save is blocked ("This plan is operationally locked").',
      },
      {
        heading: 'Locks on the order and LR',
        body: 'Approval writes plan no., status and planned truck to the order. While a non-Draft plan is linked, Orders refuses changes to client, branches, city, order basis, truck quantity and items ("Operational order fields are locked by approved load plan …"). An LR of that order cannot change its order, items, vehicle/truck or route ("LR operational fields are locked by approved load plan …").',
      },
      {
        heading: 'Changing an approved plan',
        body: 'There is no Reopen button. Click New plan, link the same order, plan and approve again. Note that the order and LR then follow the newest plan for that order, so the new plan must be approved and confirmed before LR finalisation and dispatch.',
      },
    ],
    audio: [
      'Approve से पहले plan save होना चाहिए, और कोई exception या unallocated package नहीं होना चाहिए।',
      'Approve होते ही cargo, truck और packages की जगह lock हो जाती है।',
      'Order में client, route और items भी अब नहीं बदल सकते। LR में truck और route भी lock है।',
      'बदलाव चाहिए तो New plan बनाइए, वही order link कीजिए, और नया plan approve कीजिए।',
    ],
    minutes: 4,
    quiz: ['q.smartload.approved-lock', 'q.smartload.save-before-approve'],
  },
  {
    id: 'ls.smartload.physical-loading',
    title: 'Physical loading reconciliation and supervisor confirmation',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU'],
    screens: ['ops/smart-load', 'wh/verification'],
    summary: 'How the bay count is recorded against the plan and what Confirm loading checks and changes.',
    prerequisites: ['ls.smartload.approval-locks'],
    sections: [
      {
        heading: 'Planned = Loaded + Damage + Shortage',
        body: 'In Physical loading confirmation each cargo line shows Planned and three inputs: Loaded, Damage and Shortage. Variance = Loaded + Damage + Shortage − Planned and must be 0 on every line. Loaded starts equal to Planned, so always type the real count.',
      },
      {
        heading: 'Confirm loading checks',
        bullets: [
          'Plan is Approved ("Approve the load plan before confirming loading").',
          'Loading supervisor entered ("Select or enter the loading supervisor").',
          'No negative values and variance 0 on every line ("Reconcile planned quantity with loaded + damage + shortage before confirmation").',
        ],
        body: 'Loading remarks are optional – use them for the seal number or an exception.',
      },
      {
        heading: 'What confirmation writes',
        body: 'The plan becomes Loading Confirmed with the reconciliation, supervisor, remarks, actual loaded and confirmation time. The order status follows. Every existing LR of the order gets the plan no., status, the planned truck if it had none, and a timeline event "Smart Load … confirmed · Physical loading reconciled by …". The Warehouse road queue shows Loaded and Variance (Loaded − Planned, so damaged or short packages show as negative there).',
      },
    ],
    audio: [
      'Loading के बाद हर line पर Loaded, Damage और Shortage भरिए।',
      'तीनों का जोड़ planned के बराबर होना चाहिए, यानी variance zero।',
      'Loaded पहले से planned के बराबर भरा रहता है। असली गिनती डालिए, वरना confirm का कोई मतलब नहीं।',
      'Supervisor का नाम डालिए और Confirm loading दबाइए। Order और LR में भी यह दर्ज हो जाता है।',
    ],
    minutes: 4,
    quiz: ['q.smartload.unreconciled', 'q.smartload.default-loaded'],
  },
  {
    id: 'ls.smartload.dispatch-lifecycle',
    title: 'Dispatch readiness and the downstream lifecycle',
    module: 'smartload',
    kind: 'concept',
    roles: ['OP', 'BU', 'AC', 'SA'],
    screens: ['ops/lr-new', 'ops/lr', 'ops/delivery', 'ops/pod', 'fin/billing', 'fin/client-payments'],
    summary: 'What must be true before a planned load can leave, and how the plan status then follows the LR to payment.',
    prerequisites: ['ls.smartload.physical-loading'],
    sections: [
      {
        heading: 'LR finalisation',
        body: 'A road LR for an order with a Smart Load Plan cannot be finalised until the plan is Loading Confirmed ("Smart Load Plan … must be loading-confirmed before finalising this LR"). A road LR also needs a truck to be finalised.',
      },
      {
        heading: 'Dispatch readiness',
        body: 'In LR 360 the Dispatch button reads "Awaiting load confirmation" until the plan is confirmed. The Dispatch form shows a readiness checklist and the ERP refuses dispatch if any check fails:',
        bullets: [
          'LR finalised ("Only a finalised LR can be dispatched").',
          'Plan Loading Confirmed, variance 0 and supervisor recorded ("Smart Load Plan is not ready for dispatch").',
          'Truck matches the approved plan when the plan used a fleet truck ("Selected truck does not match the approved load plan").',
          'Driver assigned for an own-fleet truck.',
        ],
      },
      {
        heading: 'Lifecycle after dispatch',
        body: 'The plan and order follow the LR automatically: Dispatch → Dispatched (for an own truck a trip is opened in Road Fleet); Delivery → Delivered (only after dispatch); POD → POD Received (only after delivery); bill → Billed; receipts → Payment Partial or Paid. Deleting a bill, or removing the LR from it, returns the plan to POD Received. The "ERP walkthrough status" card on the plan shows Order, Plan, Loading, LR, Dispatch, Delivery, POD and Finance.',
      },
    ],
    audio: [
      'Road LR तभी finalise होगा जब load plan Loading Confirmed हो।',
      'Dispatch से पहले checklist देखिए — LR final, loading confirm, गिनती बराबर, वही truck, और अपने truck के लिए driver।',
      'कोई भी check fail हो तो dispatch नहीं होता।',
      'उसके बाद delivery, POD, bill और payment के साथ plan का status अपने आप आगे बढ़ता है।',
    ],
    minutes: 4,
    quiz: ['q.smartload.lr-finalise-gate', 'q.smartload.dispatch-truck', 'q.smartload.lifecycle-order'],
  },
];
