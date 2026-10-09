// Training Academy content: Workshop & Inventory (module 'ws').
// Every statement below was checked against src/features/workshop.tsx, src/store/store.ts (A.* workshop actions,
// truckStatus, stockQty) and the sample data in src/store/seed.ts buildSeed().
import type { ScreenTraining, Question, Exercise, Workflow, Lesson, PracticeBaseline } from '../types';
import { created, changed, pass, notYet } from '../check';

// ---------------------------------------------------------------------------------------------------------------
// Small read-only helpers for checkers (never mutate db).
// ---------------------------------------------------------------------------------------------------------------
const last = <T,>(a: T[]): T | undefined => a[a.length - 1];
const list = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);
const spareName = (db: any, id: string) => list(db, 'spares').find((s) => s.id === id)?.name || id;
const supplierName = (db: any, id: string) => list(db, 'suppliers').find((s) => s.id === id)?.name || id;
const truckNo = (db: any, id: string) => list(db, 'trucks').find((t) => t.id === id)?.number || id || '—';
const stockNow = (db: any, spareId: string) => list(db, 'stock').filter((s) => s.spareId === spareId).reduce((a, s) => a + Number(s.qty || 0), 0);
const stockAtStart = (base: PracticeBaseline, spareId: string) =>
  Object.values(base.snap?.stock || {}).filter((s: any) => s.spareId === spareId).reduce((a: number, s: any) => a + Number(s.qty || 0), 0);
const RANK: Record<string, number> = { Draft: 0, 'Pending Approval': 1, Approved: 2, Finalised: 3, Inwarded: 3 };
/** The most advanced matching record created during the exercise (latest wins on a tie). */
const best = (rows: any[]) => rows.reduce((b: any, r: any) => (!b || (RANK[r.status] ?? 0) >= (RANK[b.status] ?? 0) ? r : b), null);

/** Job cards the employee opened in this exercise that have at least one part and one outside service. */
const myJobCards = (db: any, base: PracticeBaseline) => created(db, base, 'jobcards', (j) => (j.parts?.length || 0) > 0 && (j.services?.length || 0) > 0);
const myPOs = (db: any, base: PracticeBaseline) => created(db, base, 'pos');

// ---------------------------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------------------------
export const screens: ScreenTraining[] = [
  {
    id: 'ws/checklist',
    module: 'ws',
    title: 'Truck Checklist',
    purpose: 'A 20-point maintenance checklist for one of our own trucks. You tick each point OK or note what is wrong and what action is needed.',
    why: 'It records the condition of the truck before a trip or at periodic service, so problems are found in the yard and not on the highway.',
    when: 'When an own truck comes back to Jalgaon, before it is sent on a new trip, or at its periodic service.',
    roles: ['SI', 'CO'],
    upstream: ['fleet/trucks', 'fleet/trip-completion'],
    downstream: ['ws/jobcards'],
    before: 'The truck is back in the yard. The driver and mechanic are available to go round the truck.',
    after: 'If any point is not OK, open a job card for the truck so the repair is approved, done and recorded.',
    prerequisites: ['The truck exists in Trucks as an Own truck (market trucks are not listed).', 'The driver exists in Drivers.'],
    actions: [
      'New checklist – opens the 20 check points, all ticked OK.',
      'Untick OK on a point, then write the Status (for example "Worn out") and choose an Action (Replace, Repair, Top-up, Tighten, Adjust, Clean).',
      'Save checklist – saves it with a number TMC/n.',
      'Create job card – shown only when at least one point is not OK; opens a new job card with the same truck.',
      'Print, Edit or Delete a saved checklist from the row menu.',
    ],
    records: ['Checklist TMC/n with truck, driver, opening KM, date, the 20 points, and Prepared / Checked / Authorised by.'],
    validations: [
      'Truck no. is required – saving without it shows "Select truck".',
      'Only Own trucks appear in the Truck no. list.',
      'Choosing the truck fills Driver and Opening KM from the truck master (you can change them).',
    ],
    mistakes: [
      'Pressing "Create job card" before "Save checklist" – the checklist is closed without saving and its points are lost. Save first, then open the job card from Job Cards.',
      'Unticking OK but leaving Status and Action blank – the job card team does not know what to fix.',
      'Typing a wrong number in "Job card no." – this field is plain text and is not checked or linked to the job card.',
    ],
    warnings: ['The checklist does not change the truck status. The truck shows "Workshop" in Fleet only after a job card is opened for it.'],
    fields: [
      { name: 'Truck no.', help: 'Own truck being checked. Required.' },
      { name: 'Opening KM', help: 'Odometer reading today. Filled from the truck master; correct it from the meter.' },
      { name: 'OK', help: 'Tick when the point is fine. Untick to mark an issue; the row turns yellow.' },
      { name: 'Status / Action / Remark', help: 'What is wrong, what should be done, and any note for the mechanic.' },
      { name: 'Job card no.', help: 'Free text reference to the job card, if one was opened.' },
      { name: 'Prepared / Checked / Authorised by', help: 'Names of the people who did, checked and approved the inspection.' },
    ],
    statuses: [
      { status: 'All OK', meaning: 'Every point is ticked OK.' },
      { status: 'n issues', meaning: 'n points are not OK and need a job card.' },
    ],
    example: 'Truck MH19 returns from Guwahati. Sudam checks it: "Tyre tread & sidewall" is Worn out (Replace) and "Wheel nuts torque" is Loose (Tighten). He saves the checklist (2 issues) and then opens a job card for the same truck.',
    walkthrough: [
      { title: 'Start a checklist', body: 'Press New checklist and select the truck. Driver and Opening KM fill in; check the KM on the meter.' },
      { title: 'Go through the 20 points', body: 'Leave OK ticked for good points. For a problem, untick OK and fill Status, Action and Remark.' },
      { title: 'Sign off', body: 'Fill Prepared by, Checked by and Authorised by.' },
      { title: 'Save', body: 'Press Save checklist. The list shows the number of issues for this truck.' },
      { title: 'Open the job card', body: 'If there are issues, go to Job Cards and open a job card for this truck (or use Create job card after saving, from Edit).' },
    ],
    related: ['ws/jobcards', 'fleet/trucks'],
    practice: 'ex.ws.checklist',
    audio: [
      'यह Truck Checklist है — truck के बीस points की जाँच।',
      'Truck चुनते ही driver और opening km अपने आप भर जाते हैं।',
      'जो point ठीक नहीं है, उसका OK हटाइए और लिखिए क्या खराब है और क्या action करना है।',
      'पहले Save checklist दबाइए। बिना save किए Create job card दबाया, तो checklist save नहीं होगी।',
      'Issues हैं, तो उसी truck का job card खोलिए।',
    ],
    quiz: ['q.ws.checklist-save-first'],
    minutes: 4,
  },
  {
    id: 'ws/jobcards',
    module: 'ws',
    title: 'Job Cards',
    purpose: 'The repair order for one own truck: parts taken from our spares stock and work done by outside service providers, with the estimated amount.',
    why: 'It gets the repair approved, keeps the truck marked "Workshop" while it is being repaired, takes the parts out of stock and gives the gate pass when the truck leaves.',
    when: 'When an own truck comes in for repair or service, and again when the work is complete and the truck is ready to leave.',
    roles: ['SI', 'CO'],
    upstream: ['ws/checklist', 'fleet/trucks', 'ws/stock'],
    downstream: ['ws/jobcard-approval', 'ws/service-bills', 'ws/stock'],
    before: 'The truck is inspected (Truck Checklist) or the driver reports a complaint. Parts needed should be in stock; if not, raise a PO first.',
    after: 'The job card goes for approval. After approval you finalise it: stock is reduced, the truck is released and the gate pass prints. Outside services are then billed in Service Bills.',
    prerequisites: [
      'Truck is an Own truck.',
      'Parts exist in Spares & Services as type Item and have stock; services exist as type Service.',
      'Service providers exist in Suppliers with type Service.',
      'Mechanics exist in Labour with type Mechanic.',
    ],
    actions: [
      'New job card – choose truck; Driver and Opening KM fill from the truck.',
      'Add part – part, qty, rate and mechanic; for recyclable parts choose what happens to the old part (Recycle or Scrap).',
      'Add service – service provider, service, qty and rate.',
      'Save draft – keeps the card as Draft.',
      'Submit for approval – status becomes Pending Approval and the approver gets a notification.',
      'Finalise & gate pass – only on an Approved card; sets Out date/time, issues parts from stock and opens the gate pass print.',
      'Print job card, View, and Gate pass (only for Finalised cards) from the row menu.',
    ],
    records: ['Job card JC/n with truck, driver, in/out date and time, opening KM, complaint, parts, services, net amount, approved by and finalised by.'],
    validations: [
      'Save draft needs a truck ("Select truck").',
      'Submit for approval needs a truck and at least one part or service ("Select truck and add parts or services").',
      'Add part checks current stock: if the qty is more than stock you see "Only N in stock" with the hint "Raise a purchase order or reduce quantity".',
      'Add service needs both a service provider and a service.',
      'After approval the truck, parts and services are locked. Only Approved cards show "Finalise & gate pass".',
      'Finalised cards cannot be opened for editing.',
    ],
    mistakes: [
      'Adding the same part twice: the stock check looks at stock only, not at the qty already on this card or on other open cards, so the card can ask for more than the store has.',
      'Leaving a card in Draft after the work is decided – the approver never sees it (Draft is not in Job Card Approval).',
      'Changing the complaint or driver on an Approved card before finalising – finalise saves only the Out date and Out time; other edits on an approved card are not saved.',
      'Typing an Out date on an open card early – the truck stops showing "Workshop" in Fleet although the work is not finished.',
      'Forgetting to finalise – stock is never reduced and the truck stays "Workshop" in Fleet, so it cannot be put on a new trip.',
    ],
    warnings: [
      'Stock is reduced only at Finalise, not when you add a part or when the card is approved.',
      'At finalise the ERP takes stock lot by lot in the order lots were received. If stock fell meanwhile, it issues only what is left – it does not stop you or warn you – so check Spares Stock before finalising.',
    ],
    fields: [
      { name: 'Truck status', help: 'Where the truck was when the card was opened: At Jalgaon or In Transit (a record only).' },
      { name: 'Truck no.', help: 'Own truck. The list shows each truck\'s current status (Available, On Trip, Workshop).' },
      { name: 'In date / In time', help: 'When the truck came in. Defaults to now.' },
      { name: 'Out date / Out time', help: 'When the truck leaves. Filled with now at finalise if left blank.' },
      { name: 'Part (stock n)', help: 'Only Items are listed, with their current stock in brackets.' },
      { name: 'Rate', help: 'Defaults to the standard rate of the part or service; you can change it.' },
      { name: 'Old part (Recycle / Scrap)', help: 'Shown for recyclable parts such as tyres, batteries, clutch plates and leaf springs.' },
      { name: 'Net amount', help: 'Sum of qty × rate of all parts and services – the estimate the approver sees.' },
    ],
    statuses: [
      { status: 'Draft', meaning: 'Saved but not sent for approval, or returned by the approver. Can be edited.' },
      { status: 'Pending Approval', meaning: 'Waiting in Job Card Approval and in the approver\'s My Work.' },
      { status: 'Approved', meaning: 'Work can go ahead. Parts and services are locked. Ready to finalise.' },
      { status: 'Finalised', meaning: 'Work done, parts issued from stock, truck released with gate pass.' },
    ],
    example: 'Truck MH19 has brake noise. Javed opens a job card: Brake Liner Set × 1 from stock and Radiator Repair by Ganesh Diesel Works. He submits it (Pending Approval). After approval and repair, he presses Finalise & gate pass; one Brake Liner Set leaves stock and the truck shows Available again in Fleet.',
    walkthrough: [
      { title: 'Open the card', body: 'Press New job card (or Create job card from a saved checklist). Select the truck and write the complaint.' },
      { title: 'Add parts from stock', body: 'Pick the part – its stock shows in brackets – enter qty and mechanic, and press Add part. For a recyclable part choose Recycle or Scrap for the old part.' },
      { title: 'Add outside services', body: 'Pick the service provider and the service, check qty and rate, press Add service.' },
      { title: 'Submit for approval', body: 'Check the Net amount and press Submit for approval. The truck now shows "Workshop" in Fleet.' },
      { title: 'Finalise when the truck leaves', body: 'After approval, open the card, check Out date and time, and press Finalise & gate pass. Stock is reduced and the gate pass prints.' },
    ],
    related: ['ws/jobcard-approval', 'ws/stock', 'ws/service-bills', 'fleet/trucks'],
    practice: 'ex.ws.jobcard',
    audio: [
      'Truck repair का पूरा काम job card में लिखा जाता है।',
      'Stock से parts जोड़िए — हर part के आगे उसका stock दिखता है।',
      'बाहर की service, जैसे wheel alignment, service provider के साथ जोड़िए।',
      'Submit for approval दबाइए। तब तक truck Fleet में Workshop दिखेगा।',
      'Approval के बाद Finalise and gate pass दबाइए — तभी parts stock से कम होते हैं और truck free होता है।',
    ],
    quiz: ['q.ws.stock-at-finalise', 'q.ws.submit-needs-lines', 'q.ws.not-enough-stock'],
    minutes: 7,
  },
  {
    id: 'ws/jobcard-approval',
    module: 'ws',
    title: 'Job Card Approval',
    purpose: 'The list of job cards waiting for approval (status Pending Approval), with the estimate, parts with current stock, and services.',
    why: 'Repair money is spent only after a responsible person checks the work and cost.',
    when: 'Every time a job card is submitted – the truck is standing in the workshop until you decide.',
    roles: ['SI', 'CO'],
    upstream: ['ws/jobcards'],
    downstream: ['ws/jobcards', 'ws/service-bills'],
    before: 'The workshop has submitted a job card with parts and/or services.',
    after: 'Approved cards go back to the workshop for the work and Finalise. Returned cards go back to Draft for correction.',
    prerequisites: ['Job card in status Pending Approval.'],
    actions: [
      'Expand a row to see each part with qty, amount and current stock, and each service with its provider.',
      'Approve – status becomes Approved and your name is saved as Approved by.',
      'Return to workshop – status goes back to Draft and Approved by is cleared.',
      'Select several rows and use the bulk Approve.',
      'View or Print the job card.',
    ],
    records: ['Job card status and Approved by.'],
    validations: [
      'Only Pending Approval cards are listed; Draft cards are not.',
      'Approval does not move stock – stock is taken only at Finalise.',
    ],
    mistakes: [
      'Approving without opening the row – you may miss a part whose stock is 0 or lower than the qty asked.',
      'Returning a card without telling the workshop why – the ERP has no reason field, so phone or message them.',
    ],
    warnings: ['Job cards can also be approved from My Work ("Approve job cards") and from the job card View drawer. All three do the same thing.'],
    statuses: [
      { status: 'Pending Approval', meaning: 'Shown here, waiting for you.' },
      { status: 'Approved', meaning: 'Leaves this list; the workshop can finalise.' },
      { status: 'Draft', meaning: 'After Return to workshop; the workshop edits and submits again.' },
    ],
    example: 'A job card asks for Brake Liner Set × 1 but the expanded row shows "(stock 0)". The approver approves only after the store confirms a PO has been inwarded, or returns it to the workshop to change the part.',
    walkthrough: [
      { title: 'Open the list', body: 'Open Job Card Approval (or My Work). Each row shows truck, complaint and estimated amount.' },
      { title: 'Check the detail', body: 'Expand the row. Check each part qty against the stock shown in brackets, and each service and provider.' },
      { title: 'Decide', body: 'Press Approve, or Return to workshop if something must change.' },
      { title: 'Tell the workshop', body: 'If you returned it, tell the workshop what to correct. If approved, they can start work and finalise.' },
    ],
    related: ['ws/jobcards', 'ws/stock'],
    practice: 'ex.ws.jobcard',
    audio: [
      'यहाँ वो job cards हैं जो approval का इंतज़ार कर रहे हैं।',
      'Row खोलिए — हर part के आगे अभी का stock दिखता है।',
      'सब ठीक है, तो Approve। कुछ बदलना है, तो Return to workshop — card फिर Draft बन जाता है।',
      'Return का कारण system में नहीं लिखा जाता, इसलिए workshop को बता दीजिए।',
      'Approve करने से stock कम नहीं होता। Stock finalise पर कम होता है।',
    ],
    quiz: ['q.ws.return-to-workshop', 'q.ws.approval-before-finalise'],
    minutes: 4,
  },
  {
    id: 'ws/stock',
    module: 'ws',
    title: 'Spares Stock',
    purpose: 'Current stock of every part (type Item): quantity, minimum level, value, quantity consumed on finalised job cards, and batches.',
    why: 'To know what is in the store, what is running low, and to order before a truck waits for a part.',
    when: 'Daily, before approving or finalising job cards, and before raising purchase orders.',
    roles: ['SI', 'CO'],
    upstream: ['ws/inward', 'ws/jobcards', 'ws/replacement'],
    downstream: ['ws/po'],
    before: 'Stock comes in through Stock Inward (and replacement inward) and goes out when a job card is finalised or a part is sent for replacement.',
    after: 'Low or out-of-stock parts are ordered with Raise PO.',
    prerequisites: ['Parts exist in Spares & Services with a Min stock count.'],
    actions: [
      'Read Stock qty, Min stock, Value, Consumed and Status for each part.',
      'Use the "Below minimum" quick filter.',
      'Expand a part to see its batches: batch no., qty and rate; old lots are marked "(retreaded / recycled)".',
      'Raise PO – opens a new purchase order already filled with up to 3 parts that are below minimum.',
    ],
    records: ['Read-only. Stock is a list of lots (batches) created by inward; there is no manual stock edit on this screen.'],
    validations: [
      'Status is "Out of stock" when qty is 0, "Low" when qty is below Min stock, otherwise "OK".',
      'Stock qty is the total of all batches of the part.',
    ],
    mistakes: [
      'Assuming a part on an approved job card is already out of stock – it is still counted here until the job card is finalised.',
      'Ignoring "Low" parts until a job card needs them – the job card cannot add a part beyond stock.',
    ],
    warnings: ['"Under warranty" counts inward lines with warranty whose expiry date is today or later.'],
    fields: [
      { name: 'Stock qty', help: 'Total quantity across all batches, with the unit.' },
      { name: 'Value', help: 'Sum of qty × rate of each batch.' },
      { name: 'Consumed', help: 'Total qty issued on Finalised job cards.' },
    ],
    statuses: [
      { status: 'OK', meaning: 'Stock is at or above the minimum.' },
      { status: 'Low', meaning: 'Stock is above 0 but below Min stock – order soon.' },
      { status: 'Out of stock', meaning: 'Nothing in store – job cards cannot use this part until it is inwarded.' },
    ],
    example: 'Brake Liner Set shows 0 (Out of stock). The PO for it is Approved but not yet inwarded, so the store keeper follows up with the supplier and does the inward as soon as the parts arrive.',
    walkthrough: [
      { title: 'Check the KPIs', body: 'Stock value, Parts below minimum, Batches and Under warranty at the top.' },
      { title: 'Filter low parts', body: 'Press "Below minimum" to see only Low and Out of stock parts.' },
      { title: 'Look at batches', body: 'Expand a part to see which batches are in store and at what rate.' },
      { title: 'Order', body: 'Press Raise PO. Check the pre-filled parts and quantities, choose the supplier and save.' },
    ],
    related: ['ws/po', 'ws/inward', 'ws/jobcards'],
    practice: 'ex.ws.po-inward',
    audio: [
      'यह Spares Stock है — store में हर part कितना है।',
      'Min stock से कम हो, तो Low; ज़ीरो हो, तो Out of stock।',
      'Part खोलिए, उसके batches और rate दिखेंगे।',
      'Raise PO दबाइए — कम stock वाले parts PO में पहले से भरे मिलेंगे।',
      'याद रखिए, job card finalise होने पर ही stock कम होता है।',
    ],
    quiz: ['q.ws.low-stock', 'q.ws.stock-at-finalise'],
    minutes: 4,
  },
  {
    id: 'ws/spares',
    module: 'ws',
    title: 'Spares & Services',
    purpose: 'Master list of parts (type Item, kept in stock) and outside services (type Service), with categories, standard rate, unit and minimum stock.',
    why: 'Job cards, purchase orders and stock all pick from this list, and the rate here is the default rate everywhere.',
    when: 'When a new part or service is used for the first time, or when a standard rate or minimum stock changes.',
    roles: ['SI'],
    upstream: [],
    downstream: ['ws/jobcards', 'ws/po', 'ws/stock'],
    before: 'Check the list (search) so you do not create the same part twice.',
    after: 'The part can be ordered on a PO and used on job cards; a service can be added to job cards.',
    prerequisites: ['The category exists in the Categories tab with the right type (Item or Service).'],
    actions: [
      'Tab "Parts & services": Add part / service, View, Edit, Delete.',
      'Quick filters Parts and Services.',
      'Tab "Categories": add or edit categories with type Item or Service.',
    ],
    records: ['Part or service: name, type, category, rate, min stock count, unit, is recyclable, track batch no., description.'],
    validations: [
      'Part / service name, Category and Rate are required ("Required: …").',
      'Delete asks for confirmation; records that already use the part keep their history.',
    ],
    mistakes: [
      'Creating a service with type Item – it then appears in the part list and in stock, not in the Service list of the job card.',
      'Leaving Min stock count at 0 – the part never shows as Low, so nobody orders it in time.',
      'Not ticking "Is recyclable" for tyres, batteries and similar parts – the job card will not ask Recycle or Scrap for the old part.',
    ],
    fields: [
      { name: 'Type', help: 'Item = stocked part; Service = outside work billed by a service provider.' },
      { name: 'Rate (₹)', help: 'Standard rate, used as the default on job cards and POs.' },
      { name: 'Min stock count', help: 'Below this the part shows Low in Spares Stock and is pre-filled in new POs.' },
      { name: 'Unit', help: 'Nos, Ltr, Kg, Set or Job.' },
      { name: 'Is recyclable', help: 'Job card asks Recycle or Scrap for the removed old part.' },
    ],
    walkthrough: [
      { title: 'Search first', body: 'Search the list for the part name so you do not add a duplicate.' },
      { title: 'Add', body: 'Press Add part / service. Enter name, choose Item or Service, the category and the rate.' },
      { title: 'Set stock rules', body: 'For parts enter Min stock count and unit, and tick Is recyclable if the old part has value.' },
      { title: 'Save', body: 'Save. The part now appears in PO and job card lists.' },
    ],
    related: ['ws/stock', 'ws/po', 'ws/jobcards'],
    audio: [
      'यहाँ सारे parts और बाहर की services की list है।',
      'Part का type Item रखिए, service का type Service।',
      'Rate यहाँ से job card और PO में अपने आप आता है।',
      'Min stock ज़रूर भरिए, तभी कम stock पर Low दिखेगा।',
    ],
    quiz: ['q.ws.supplier-type'],
    minutes: 3,
  },
  {
    id: 'ws/suppliers',
    module: 'ws',
    title: 'Suppliers',
    purpose: 'Master list of spare-part sellers and workshop service providers, with contact and tax details and the amount we still owe each one.',
    why: 'POs, replacements, job card services and service bills all pick the supplier from here, filtered by supplier type.',
    when: 'When we buy from a new shop or use a new outside workshop, or when contact or GST details change.',
    roles: ['SI'],
    upstream: [],
    downstream: ['ws/po', 'ws/replacement', 'ws/jobcards', 'ws/service-bills'],
    before: 'Search first so the same supplier is not added twice.',
    after: 'Sellers can be chosen on POs and replacements; Service providers on job card services and service bills.',
    prerequisites: [],
    actions: ['Add supplier, View, Edit, Delete.', 'Quick filters Sellers and Service providers.', 'Read the Payable column.'],
    records: ['Supplier: name, type (Seller or Service), shop name, city, address, contact person, contact, mobile, email, VAT / TIN / GST no., PAN no.'],
    validations: ['Supplier name and Supplier type are required.'],
    mistakes: [
      'Saving a workshop as type Seller – it will not appear as Service provider on job cards or in Service Bills.',
      'Saving a parts shop as type Service – it will not appear in Purchase Orders or Spare Replacement.',
    ],
    fields: [
      { name: 'Supplier type', help: 'Seller = sells parts (PO, inward, replacement). Service = does outside work (job card services, service bills).' },
      { name: 'Payable', help: 'Pending amount of this supplier\'s stock inward bills plus service bills.' },
    ],
    walkthrough: [
      { title: 'Search', body: 'Search by name or shop to avoid duplicates.' },
      { title: 'Add', body: 'Press Add supplier, enter name and choose the right Supplier type.' },
      { title: 'Details', body: 'Fill shop, city, contact person, mobile, GST and PAN.' },
      { title: 'Check payable', body: 'Use the Payable column to see how much we still owe each supplier.' },
    ],
    related: ['ws/po', 'ws/service-bills'],
    audio: [
      'यहाँ spare बेचने वाले और बाहर काम करने वाले workshops की list है।',
      'Parts की दुकान का type Seller, और बाहर की service वाले का type Service रखिए।',
      'गलत type चुना, तो वो supplier PO या job card की list में नहीं दिखेगा।',
      'Payable column बताता है कि उसका कितना पैसा बाकी है।',
    ],
    quiz: ['q.ws.supplier-type'],
    minutes: 3,
  },
  {
    id: 'ws/po',
    module: 'ws',
    title: 'Purchase Orders',
    purpose: 'Orders for spare parts to a seller, with qty and rate per part. Every PO needs approval before the parts can be inwarded against it.',
    why: 'Parts are bought only with an approved order, and the inward later checks against this order.',
    when: 'When a part is Low or Out of stock, or a job card needs a part we do not have.',
    roles: ['SI'],
    upstream: ['ws/stock', 'ws/spares', 'ws/suppliers'],
    downstream: ['ws/po-approval', 'ws/inward'],
    before: 'Check Spares Stock. The supplier must exist with type Seller.',
    after: 'The PO waits in PO Approval. When approved, receive the goods in Stock Inward.',
    prerequisites: ['Supplier with type Seller.', 'Parts of type Item in Spares & Services.'],
    actions: [
      'Generate PO – a new PO opens pre-filled with up to 3 parts that are below minimum stock (qty = 2 × min stock − current stock, at least 1).',
      'Choose supplier and date; add parts by category and part; change qty and rate in the table; remove lines.',
      'Save & send for approval – creates PO/n with status Pending Approval and notifies the approver.',
      'Edit or Delete – only while the PO is Pending Approval.',
      'Print PO.',
    ],
    records: ['PO/n with supplier, date, parts (qty, rate), remark, net amount, status and approved by.'],
    validations: [
      'Supplier and at least one part are required ("Select supplier and add parts").',
      'Only suppliers of type Seller are listed.',
      'Edit and Delete are hidden once the PO is Approved or Inwarded.',
    ],
    mistakes: [
      'Saving the pre-filled parts without checking them – remove parts the chosen supplier does not sell.',
      'Raising one PO for two suppliers – a PO has one supplier; make one PO per supplier.',
      'Expecting to receive part of a PO now and the rest later – after one inward the PO becomes Inwarded and is not offered again.',
    ],
    fields: [
      { name: 'Supplier name', help: 'Seller you are buying from. Required.' },
      { name: 'Qty / Rate', help: 'Rate defaults to the part\'s standard rate; enter the quoted rate.' },
      { name: 'Net amount', help: 'Sum of qty × rate – the estimate the approver sees.' },
    ],
    statuses: [
      { status: 'Pending Approval', meaning: 'Saved and waiting in PO Approval. Can still be edited or deleted.' },
      { status: 'Approved', meaning: 'Can be inwarded in Stock Inward. Cannot be edited.' },
      { status: 'Inwarded', meaning: 'Goods received against it; the supplier bill now waits for payment.' },
    ],
    example: 'Spares Stock shows Brake Liner Set, Wheel Bearing and Hydraulic Brake Hose below minimum. Generate PO fills all three; Javed chooses Mahavir Auto Spares, corrects the rates to the quotation and saves – the new PO goes for approval.',
    walkthrough: [
      { title: 'Generate PO', body: 'Press Generate PO (or Raise PO in Spares Stock). Low parts are already filled.' },
      { title: 'Supplier', body: 'Choose the seller and the date.' },
      { title: 'Parts', body: 'Add or remove parts, and correct qty and rate to the supplier\'s quotation.' },
      { title: 'Send', body: 'Press Save & send for approval. The PO shows Pending Approval.' },
      { title: 'Follow up', body: 'After approval, receive the goods in Stock Inward.' },
    ],
    related: ['ws/po-approval', 'ws/inward', 'ws/stock'],
    practice: 'ex.ws.po-inward',
    audio: [
      'Spare parts खरीदने के लिए यहाँ purchase order बनाइए।',
      'Generate PO दबाते ही कम stock वाले parts पहले से भरे होते हैं।',
      'Supplier चुनिए, qty और rate quotation के हिसाब से ठीक कीजिए।',
      'Save and send for approval — PO approval के बिना माल inward नहीं होगा।',
      'Approve होने के बाद PO बदला या delete नहीं किया जा सकता।',
    ],
    quiz: ['q.ws.po-edit-after-approval', 'q.ws.po-before-inward'],
    minutes: 5,
  },
  {
    id: 'ws/po-approval',
    module: 'ws',
    title: 'PO Approval',
    purpose: 'The list of purchase orders waiting for approval (status Pending Approval), with supplier, date and estimated amount.',
    why: 'Money is committed to a supplier only after approval, and only approved POs can be inwarded.',
    when: 'When a PO is raised – the notification and My Work ("Approve spare purchases") show it.',
    roles: ['SI'],
    upstream: ['ws/po'],
    downstream: ['ws/inward'],
    before: 'The store has saved a PO.',
    after: 'The approved PO appears in the PO number list of Stock Inward.',
    prerequisites: ['PO in status Pending Approval.'],
    actions: ['Approve a row, or select several rows and use bulk Approve.', 'View the PO (parts, qty, rate) or Print it.'],
    records: ['PO status Approved and Approved by.'],
    validations: ['There is no Reject button here. If a PO is wrong, the buyer edits or deletes it in Purchase Orders while it is still Pending Approval.'],
    mistakes: [
      'Approving from the list without opening View – the list shows only the total, not the parts and rates.',
      'Approving a PO that should be cancelled – after approval it can no longer be edited or deleted.',
    ],
    statuses: [
      { status: 'Pending Approval', meaning: 'Waiting for you.' },
      { status: 'Approved', meaning: 'Leaves this list and is ready for Stock Inward.' },
    ],
    walkthrough: [
      { title: 'Open the list', body: 'Open PO Approval or My Work.' },
      { title: 'Check', body: 'Press View to see each part, qty and rate. Compare with Spares Stock and the quotation.' },
      { title: 'Approve', body: 'Press Approve. If it is wrong, ask the buyer to edit or delete it instead.' },
    ],
    related: ['ws/po', 'ws/inward'],
    practice: 'ex.ws.po-inward',
    audio: [
      'यहाँ वो purchase orders हैं जो approval का इंतज़ार कर रहे हैं।',
      'Approve से पहले View खोलकर parts, qty और rate देखिए।',
      'यहाँ reject का button नहीं है। गलत PO को बनाने वाला ही edit या delete करे।',
      'Approve होते ही PO, Stock Inward में दिखने लगता है।',
    ],
    quiz: ['q.ws.po-before-inward', 'q.ws.po-edit-after-approval'],
    minutes: 3,
  },
  {
    id: 'ws/inward',
    module: 'ws',
    title: 'Stock Inward',
    purpose: 'Receive parts against an approved PO with the supplier\'s bill, batch numbers and warranty/guarantee dates, and pay the supplier bills (Inventory payment entry tab).',
    why: 'This is the only normal way stock goes up. It also creates the supplier bill that accounts must pay.',
    when: 'When parts arrive at the store with the supplier\'s bill, and when the supplier is paid.',
    roles: ['SI'],
    upstream: ['ws/po-approval'],
    downstream: ['ws/stock', 'ws/jobcards', 'ws/replacement'],
    before: 'The PO must be Approved. Keep the supplier bill in hand.',
    after: 'Stock goes up by one batch per line, the PO becomes Inwarded, and the bill appears in Inventory payment entry until it is paid.',
    prerequisites: ['Approved PO.', 'Supplier bill number.'],
    actions: [
      'Inward stock entry: choose the PO number (only Approved POs are listed); supplier fills in.',
      'Enter Bill no. and Bill date. Lines come from the PO; correct qty, rate and batch no., and tick Warranty or Guarantee with the expiry date.',
      'Enter Discount; Payable = Net − Discount. Press Save inward.',
      'Inventory payment entry: click a bill with pending amount, check paid amount, TDS, discount, ledger and mode, then Confirm payment.',
    ],
    records: [
      'Inward INW/n with PO, supplier, bill no., bill date, items, net, discount, payable and pending.',
      'One stock batch per inward line.',
      'PO status Inwarded.',
      'On payment: payment line on the inward and a ledger payment voucher PV/n (Cash Payment for Cash, Bank Payment for Cheque or Bank).',
    ],
    validations: [
      'Save inward stays disabled until a PO and a Bill no. are entered.',
      'Only POs with status Approved appear – Pending Approval and Inwarded POs are not listed.',
      'Payment reduces pending by paid amount + TDS + discount; pending never goes below 0.',
    ],
    mistakes: [
      'Not changing the qty when the supplier sent fewer parts – stock would show parts that never arrived. Enter the received qty.',
      'Short supply: after one inward the PO is Inwarded and cannot be inwarded again; raise a new PO for the balance.',
      'Leaving the auto batch number when the part has its own batch – change it so replacements can be traced to the bill.',
      'Ticking Warranty without an expiry date – the part will not count in "Under warranty".',
    ],
    warnings: ['The payment form suggests 1% TDS and pays the rest; change it to what is actually deducted and paid.'],
    fields: [
      { name: 'PO number', help: 'Approved POs only. Required.' },
      { name: 'Bill no. / Bill date', help: 'Supplier invoice number and date. Bill no. is required.' },
      { name: 'Batch no.', help: 'Pre-filled with a random B-number; replace with the supplier batch if there is one.' },
      { name: 'Warranty / Guarantee + expiry', help: 'Needed later for free replacement of defective parts.' },
      { name: 'Payable amount', help: 'Net amount − discount. This becomes the pending amount to pay.' },
    ],
    statuses: [
      { status: 'Pending > 0', meaning: 'Bill not fully paid – listed in Inventory payment entry.' },
      { status: 'Pending 0', meaning: 'Bill fully paid – removed from the payment list.' },
    ],
    example: 'Mahavir Auto Spares delivers the approved PO for 6 Brake Liner Sets, 6 Wheel Bearings and 8 Hydraulic Brake Hoses with bill 4471. The store chooses that PO, enters bill 4471 and ₹500 discount, and saves. Brake Liner Set stock goes from 0 to 6 and the PO shows Inwarded.',
    walkthrough: [
      { title: 'Pick the PO', body: 'Choose the approved PO. The supplier and the lines fill in.' },
      { title: 'Enter the bill', body: 'Type the supplier Bill no. and Bill date.' },
      { title: 'Check each line', body: 'Match qty and rate with the bill, set batch no., and tick Warranty/Guarantee with expiry dates.' },
      { title: 'Save', body: 'Enter any discount and press Save inward. Stock goes up immediately.' },
      { title: 'Pay later', body: 'In Inventory payment entry, click the bill, check amount, TDS and mode, and Confirm payment.' },
    ],
    related: ['ws/po', 'ws/stock', 'ws/replacement', 'fin/ledger'],
    practice: 'ex.ws.po-inward',
    audio: [
      'Supplier से parts आएँ, तो यहाँ inward कीजिए।',
      'सिर्फ़ approved PO ही list में आते हैं।',
      'Bill number डालिए, और qty, rate, batch bill से मिलाइए।',
      'Save inward दबाते ही stock बढ़ जाता है और PO Inwarded हो जाता है।',
      'Supplier का payment, Inventory payment entry tab से कीजिए।',
    ],
    quiz: ['q.ws.po-before-inward', 'q.ws.inward-payable', 'q.ws.short-supply'],
    minutes: 6,
  },
  {
    id: 'ws/replacement',
    module: 'ws',
    title: 'Spare Replacement',
    purpose: 'Send defective parts back to the seller – free under warranty or as a paid replacement – with an RP gate pass, then receive the replacement back into stock.',
    why: 'Warranty parts are replaced without paying again, and stock stays correct while the part is away.',
    when: 'When a part bought from us fails and the seller agrees to replace it.',
    roles: ['SI'],
    upstream: ['ws/inward'],
    downstream: ['ws/stock', 'ws/inward'],
    before: 'The part must have come in through Stock Inward, so you can pick the supplier bill and batch.',
    after: 'When the seller returns the part, use Receive replacement. Stock goes up again; a paid replacement also creates a bill to pay.',
    prerequisites: ['Supplier with type Seller.', 'A stock inward bill of that supplier containing the part.'],
    actions: [
      'New replacement: choose supplier, date, the supplier bill, and type Free or Payable.',
      'Enter the qty to send against the part line (the table shows batch, rate and stock left in that bill\'s batch).',
      'Write the defect in Remark and press Add & print gate pass.',
      'Replacement list: Gate pass print, and Receive replacement for rows with status Sent.',
      'Receive replacement: bill no. (blank = FREE), bill date, qty, batch no. and – for Payable – rate; Save inward.',
    ],
    records: [
      'Replacement RPL/n with supplier, bill, items, type and status.',
      'On sending: stock of that bill\'s batch is reduced by the qty sent (never below 0).',
      'On receiving: a replacement inward with new stock batch, payable = rate × qty for Payable or 0 for Free; replacement status Received.',
    ],
    validations: [
      'Add & print gate pass is disabled until a qty is entered on at least one line.',
      'Only suppliers of type Seller and only that supplier\'s inward bills are listed.',
      'Receive replacement is shown only while the status is Sent.',
    ],
    mistakes: [
      'Choosing Free for a part whose warranty has expired – the ERP does not check the expiry; check it in Stock Inward first.',
      'Sending two different parts on one replacement – the receive form takes one qty and applies it to every line. Make one replacement per part.',
      'Forgetting to receive the replacement – stock stays reduced and the row stays Sent.',
    ],
    statuses: [
      { status: 'Sent', meaning: 'Part has left with the RP gate pass; stock reduced.' },
      { status: 'Received', meaning: 'Replacement received and inwarded into stock.' },
    ],
    example: 'Two tubes from Shree Tyres leak at the valve. The store chooses Shree Tyres, the bill, type Free, qty 2, remark "Tubes leaking at valve", and prints the gate pass. When new tubes come back, Receive replacement adds 2 tubes to stock at rate 0.',
    walkthrough: [
      { title: 'New replacement', body: 'Open the New replacement tab and choose supplier and the bill the part came on.' },
      { title: 'Free or Payable', body: 'Choose Free for warranty, Payable if the seller charges.' },
      { title: 'Qty and defect', body: 'Enter the qty to send and describe the defect in Remark.' },
      { title: 'Gate pass', body: 'Press Add & print gate pass and give it to security with the part.' },
      { title: 'Receive back', body: 'When the part returns, use Receive replacement in the list, enter bill, qty and batch, and save.' },
    ],
    related: ['ws/inward', 'ws/stock'],
    practice: 'ex.ws.replacement',
    audio: [
      'खराब part supplier को वापस भेजना हो, तो यहाँ replacement बनाइए।',
      'Supplier और वो bill चुनिए जिस पर part आया था।',
      'Warranty में है तो Free, वरना Payable।',
      'Gate pass print होते ही उस batch का stock कम हो जाता है।',
      'नया part वापस आए, तो Receive replacement से stock में चढ़ाइए।',
    ],
    quiz: ['q.ws.replacement-stock', 'q.ws.free-replacement'],
    minutes: 5,
  },
  {
    id: 'ws/service-bills',
    module: 'ws',
    title: 'Service Bills',
    purpose: 'Record the bill of an outside service provider against the services written on approved or finalised job cards.',
    why: 'It links each provider bill to the job card work, so we pay only for work that was approved, and never bill the same service twice.',
    when: 'When a service provider (wheel alignment, retreading, welding, body work) gives the bill for work on our trucks.',
    roles: ['SI'],
    upstream: ['ws/jobcards', 'ws/jobcard-approval'],
    downstream: ['ws/service-payments'],
    before: 'The service is on a job card that is Approved or Finalised.',
    after: 'The bill appears in Service Payments with its pending amount.',
    prerequisites: ['Job card with services, status Approved or Finalised.', 'Provider bill number.'],
    actions: [
      'Choose the Service provider (or tick a line – the provider is then set from that line).',
      'Tick the job-card services covered by the bill.',
      'Enter Bill no., Bill date and Discount; check "Total … net payable".',
      'Submit – creates the service bill and marks each ticked service as Billed on its job card.',
    ],
    records: ['Service bill SB/n with provider, bill no., bill date, job-card services, total, discount, net and pending.'],
    validations: [
      'Only services of Approved or Finalised job cards that are not yet billed are listed.',
      'Submit is disabled until at least one service is ticked and Bill no. is entered.',
      'Net payable = total of ticked services − discount.',
    ],
    mistakes: [
      'Billing a service on an approved job card that is not finished – the work may still change; prefer billing after the job card is finalised.',
      'Ticking services when "All" providers is selected and the wrong provider gets set – check the Service provider box before Submit.',
      'Changing the amount in your head – the bill amount comes from the job card qty × rate; if the provider charged differently, use Discount for a lower bill or correct the job card before approval.',
    ],
    statuses: [
      { status: 'Pending', meaning: 'Bill recorded, not fully paid.' },
      { status: 'Paid', meaning: 'Pending is 0.' },
      { status: 'Billed (on job card)', meaning: 'The service line is covered by a service bill and leaves the unbilled list.' },
    ],
    walkthrough: [
      { title: 'Choose provider', body: 'Select the service provider from the bill.' },
      { title: 'Tick the work', body: 'Tick each job-card service on that bill. Check job card no. and truck no.' },
      { title: 'Bill details', body: 'Enter Bill no., Bill date and any Discount.' },
      { title: 'Submit', body: 'Press Submit. The bill moves to the list below and to Service Payments.' },
    ],
    related: ['ws/service-payments', 'ws/jobcards'],
    practice: 'ex.ws.jobcard',
    audio: [
      'बाहर के workshop का bill यहाँ job card की services से जोड़ा जाता है।',
      'सिर्फ़ approved या finalised job card की services दिखती हैं।',
      'Provider चुनिए, bill वाली services tick कीजिए, bill number डालिए।',
      'Submit करते ही service, job card पर Billed हो जाती है और bill payment के लिए चला जाता है।',
    ],
    quiz: ['q.ws.service-bill-source', 'q.ws.after-finalise-next'],
    minutes: 4,
  },
  {
    id: 'ws/service-payments',
    module: 'ws',
    title: 'Service Payments',
    purpose: 'Pay service providers against the service bills recorded in Service Bills.',
    why: 'It clears what we owe the provider and posts the payment voucher in the ledger.',
    when: 'When a service provider is paid in cash, by cheque or by bank transfer.',
    roles: ['SI'],
    upstream: ['ws/service-bills'],
    downstream: ['fin/ledger'],
    before: 'The provider bill is recorded in Service Bills.',
    after: 'Pending goes down; when it reaches 0 the bill shows Paid. A ledger payment voucher is created.',
    prerequisites: ['Service bill with pending amount.'],
    actions: [
      'The list opens on the Pending filter. Click a bill or use Record payment.',
      'Check Paid date, Paid amount (defaults to the full pending), Discount, TDS, Payment by (ledger) and Mode (Cash, Cheque, Bank).',
      'Confirm payment.',
    ],
    records: ['Payment line on the service bill.', 'Ledger voucher PV/n – Cash Payment for Cash, Bank Payment for Cheque or Bank – in the provider\'s name.'],
    validations: [
      'Only bills with pending above 0 can be paid.',
      'Pending is reduced by paid amount + TDS + discount and never goes below 0.',
    ],
    mistakes: [
      'Leaving Mode on Cash for a bank transfer – the ledger voucher is posted as Cash Payment.',
      'Entering TDS but leaving the full amount in Paid amount – pending is reduced by both, so the bill looks over-paid; reduce Paid amount by the TDS.',
      'Choosing the wrong Payment by ledger – the payment is posted from that cash or bank account.',
    ],
    statuses: [
      { status: 'Pending', meaning: 'Some amount is still due.' },
      { status: 'Paid', meaning: 'Pending is 0.' },
    ],
    example: 'A service bill for Ganesh Diesel Works has ₹1,455 pending. It is paid by bank: Paid amount 1,455, TDS 0, Mode Bank, Payment by the bank ledger. Pending becomes 0 and the bill shows Paid.',
    walkthrough: [
      { title: 'Find the bill', body: 'Open Service Payments; Pending bills are shown first.' },
      { title: 'Open payment', body: 'Click the bill or press Record payment.' },
      { title: 'Fill amounts', body: 'Enter what is actually paid, plus TDS and discount if any.' },
      { title: 'Mode and ledger', body: 'Choose Cash, Cheque or Bank and the matching Payment by ledger.' },
      { title: 'Confirm', body: 'Confirm payment. Pending reduces and the ledger voucher is created.' },
    ],
    related: ['ws/service-bills', 'fin/ledger'],
    practice: 'ex.ws.jobcard',
    audio: [
      'Service provider का payment यहाँ होता है।',
      'Pending bill पर click कीजिए — पूरा pending amount पहले से भरा होता है।',
      'TDS या discount हो, तो paid amount उतना कम कीजिए।',
      'Cash, cheque या bank सही चुनिए, उसी से ledger में entry बनती है।',
    ],
    quiz: ['q.ws.service-payment-pending'],
    minutes: 3,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------------------
export const questions: Question[] = [
  {
    id: 'q.ws.stock-at-finalise',
    module: 'ws',
    type: 'mcq',
    prompt: 'A job card has Oil Filter × 2. At which moment does the Oil Filter stock go down by 2?',
    options: [
      { id: 'a', text: 'When you press Add part on the job card' },
      { id: 'b', text: 'When the job card is submitted for approval' },
      { id: 'c', text: 'When the job card is approved' },
      { id: 'd', text: 'When the job card is finalised (Finalise & gate pass)' },
    ],
    answer: 'd',
    explanation: 'Add part only checks that stock is enough. Submit and approval do not move stock. Finalise & gate pass issues the parts from stock, batch by batch, and the qty then shows as Consumed in Spares Stock.',
    screens: ['ws/jobcards', 'ws/stock'],
    difficulty: 1,
  },
  {
    id: 'q.ws.approval-before-finalise',
    module: 'ws',
    type: 'tf',
    prompt: 'The workshop can finalise a Draft job card directly to release the truck quickly, and get approval later.',
    options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }],
    answer: 'false',
    explanation: 'The "Finalise & gate pass" button appears only on an Approved job card. A Draft must be submitted (Pending Approval) and approved in Job Card Approval or My Work first.',
    screens: ['ws/jobcards', 'ws/jobcard-approval'],
    difficulty: 1,
  },
  {
    id: 'q.ws.truck-in-workshop',
    module: 'ws',
    type: 'scenario',
    prompt: 'What is the reason, and what releases the truck?',
    scenario: 'Fleet wants to start a trip on truck MH19 but the truck is not in the Truck list of the trip form. Fleet > Trucks shows it as "Workshop". Its job card JC/12 is Approved and the mechanic says the work is done.',
    options: [
      { id: 'a', text: 'The truck master is wrong; change the truck type to Market.' },
      { id: 'b', text: 'JC/12 is still open. Finalise it (Finalise & gate pass); the truck then shows Available and can be put on a trip.' },
      { id: 'c', text: 'Approve JC/12 again in Job Card Approval.' },
      { id: 'd', text: 'Delete the truck checklist for MH19.' },
    ],
    answer: 'b',
    explanation: 'A truck shows "Workshop" while it has a Draft, Pending Approval or Approved job card without an Out date. The trip form lists only Available own trucks. Finalising the job card sets the Out date, issues the parts and releases the truck.',
    screens: ['ws/jobcards', 'fleet/trucks'],
    difficulty: 2,
  },
  {
    id: 'q.ws.workshop-order',
    module: 'ws',
    type: 'order',
    prompt: 'Put the workshop steps for one repair in the correct order.',
    items: [
      { id: 'chk', text: 'Save the truck checklist with the failed points' },
      { id: 'jc', text: 'Open the job card with parts and services and submit for approval' },
      { id: 'appr', text: 'Approve the job card' },
      { id: 'fin', text: 'Finalise & gate pass – parts leave stock, truck released' },
      { id: 'sb', text: 'Record the service provider\'s bill in Service Bills' },
      { id: 'pay', text: 'Pay the service bill in Service Payments' },
    ],
    answer: ['chk', 'jc', 'appr', 'fin', 'sb', 'pay'],
    explanation: 'Inspection finds the problem, the job card estimates it, approval allows the spend, finalise issues stock and releases the truck, and then the outside provider\'s bill is recorded and paid.',
    screens: ['ws/checklist', 'ws/jobcards', 'ws/jobcard-approval', 'ws/service-bills', 'ws/service-payments'],
    difficulty: 2,
  },
  {
    id: 'q.ws.not-enough-stock',
    module: 'ws',
    type: 'scenario',
    prompt: 'What should the workshop do?',
    scenario: 'On a new job card Javed adds Brake Liner Set, qty 1. The part list shows "(stock 0)" and the ERP shows "Only 0 in stock – Raise a purchase order or reduce quantity". The PO for brake liners is Approved but the parts have not arrived.',
    options: [
      { id: 'a', text: 'Submit the job card anyway; stock will go negative at finalise.' },
      { id: 'b', text: 'Ask a manager to approve the job card so the part is added.' },
      { id: 'c', text: 'Get the parts inwarded against the approved PO in Stock Inward, then add the part to the job card.' },
      { id: 'd', text: 'Add the brake liner as an outside service instead.' },
    ],
    answer: 'c',
    explanation: 'A part can be added only up to current stock. Stock goes up only through Stock Inward (or replacement inward). Once the approved PO is inwarded, the part can be added and the job card submitted.',
    screens: ['ws/jobcards', 'ws/inward', 'ws/stock'],
    difficulty: 2,
  },
  {
    id: 'q.ws.submit-needs-lines',
    module: 'ws',
    type: 'mcq',
    prompt: 'What does the ERP need before a job card can be submitted for approval?',
    options: [
      { id: 'a', text: 'Only the truck' },
      { id: 'b', text: 'The truck and at least one part or one service' },
      { id: 'c', text: 'The truck, a saved checklist and an Out date' },
      { id: 'd', text: 'At least one part and one service, and a mechanic on every line' },
    ],
    answer: 'b',
    explanation: 'Submit for approval shows "Select truck and add parts or services" if either is missing. Save draft needs only the truck. A checklist and an Out date are not required.',
    screens: ['ws/jobcards'],
    difficulty: 1,
  },
  {
    id: 'q.ws.return-to-workshop',
    module: 'ws',
    type: 'next',
    prompt: 'The approver presses "Return to workshop" on JC/14. What happens next?',
    options: [
      { id: 'a', text: 'JC/14 is deleted and a new job card must be made.' },
      { id: 'b', text: 'JC/14 goes back to Draft; the workshop corrects it and presses Submit for approval again.' },
      { id: 'c', text: 'JC/14 becomes Finalised without stock issue.' },
      { id: 'd', text: 'JC/14 stays Pending Approval with a rejection reason.' },
    ],
    answer: 'b',
    explanation: 'Return to workshop sets the status to Draft and clears Approved by. The ERP stores no reason, so the approver must tell the workshop what to change. The workshop edits the card and submits it again.',
    screens: ['ws/jobcard-approval', 'ws/jobcards'],
    difficulty: 1,
  },
  {
    id: 'q.ws.po-before-inward',
    module: 'ws',
    type: 'mcq',
    prompt: 'Parts from Mahavir Auto Spares arrived. Which POs can you choose in the "PO number" list of Stock Inward?',
    options: [
      { id: 'a', text: 'All POs of the supplier' },
      { id: 'b', text: 'POs with status Pending Approval or Approved' },
      { id: 'c', text: 'Only POs with status Approved' },
      { id: 'd', text: 'Only POs created today' },
    ],
    answer: 'c',
    explanation: 'Only Approved POs are listed. A Pending Approval PO must be approved in PO Approval first; an Inwarded PO has already been received and is not offered again.',
    screens: ['ws/inward', 'ws/po-approval'],
    difficulty: 1,
  },
  {
    id: 'q.ws.spares-purchase-order',
    module: 'ws',
    type: 'order',
    prompt: 'Put the spare-purchase steps in order.',
    items: [
      { id: 'low', text: 'See the part as Low in Spares Stock' },
      { id: 'po', text: 'Generate PO and Save & send for approval' },
      { id: 'appr', text: 'Approve the PO in PO Approval' },
      { id: 'inw', text: 'Save inward with the supplier bill – stock goes up' },
      { id: 'pay', text: 'Pay the supplier bill in Inventory payment entry' },
    ],
    answer: ['low', 'po', 'appr', 'inw', 'pay'],
    explanation: 'The PO must be approved before it appears in Stock Inward. The inward creates the stock batches and the supplier bill; the bill is then paid from the Inventory payment entry tab.',
    screens: ['ws/stock', 'ws/po', 'ws/po-approval', 'ws/inward'],
    difficulty: 1,
  },
  {
    id: 'q.ws.po-edit-after-approval',
    module: 'ws',
    type: 'tf',
    prompt: 'After a PO is approved, the store can still edit its quantities or delete it from Purchase Orders.',
    options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }],
    answer: 'false',
    explanation: 'Edit and Delete are shown only while the PO is Pending Approval. Check the PO before approval; PO Approval has no reject button, so a wrong PO should be corrected or deleted before it is approved.',
    screens: ['ws/po', 'ws/po-approval'],
    difficulty: 2,
  },
  {
    id: 'q.ws.short-supply',
    module: 'ws',
    type: 'scenario',
    prompt: 'What is the correct way to record this?',
    scenario: 'PO/9 is for 8 tubes. The supplier delivers only 5 tubes with bill 2290 and says the other 3 will come next week.',
    options: [
      { id: 'a', text: 'Inward PO/9 with qty 8 now, so the PO is closed.' },
      { id: 'b', text: 'Inward PO/9 with qty 5. PO/9 becomes Inwarded, so raise a new PO for the 3 tubes and inward it when they arrive.' },
      { id: 'c', text: 'Do not inward anything until all 8 arrive, but let the workshop use the 5 tubes.' },
      { id: 'd', text: 'Inward 5 now and inward PO/9 again next week for 3.' },
    ],
    answer: 'b',
    explanation: 'Enter the qty actually received so stock is true. After one inward the PO status is Inwarded and it no longer appears in the PO list, so the balance needs a new PO. Parts not inwarded cannot be added to job cards.',
    screens: ['ws/inward', 'ws/po'],
    difficulty: 3,
  },
  {
    id: 'q.ws.inward-payable',
    module: 'ws',
    type: 'mcq',
    prompt: 'An inward has Net amount ₹20,000 and Discount ₹400. What pending amount will appear in Inventory payment entry?',
    options: [
      { id: 'a', text: '₹20,000' },
      { id: 'b', text: '₹19,600' },
      { id: 'c', text: '₹19,800 (after 1% TDS)' },
      { id: 'd', text: '₹0 until the PO is paid' },
    ],
    answer: 'b',
    explanation: 'Payable = Net − Discount = ₹19,600, and this becomes the pending amount. TDS is entered only at payment time (the form suggests 1%); pending then reduces by paid amount + TDS + discount.',
    screens: ['ws/inward'],
    difficulty: 2,
  },
  {
    id: 'q.ws.service-bill-source',
    module: 'ws',
    type: 'mcq',
    prompt: 'Which job-card services are listed for billing in Service Bills?',
    options: [
      { id: 'a', text: 'All services on all job cards' },
      { id: 'b', text: 'Services on Approved or Finalised job cards that are not billed yet' },
      { id: 'c', text: 'Only services on Draft job cards' },
      { id: 'd', text: 'Only services that have a PO' },
    ],
    answer: 'b',
    explanation: 'Draft and Pending Approval work is not billable. Once a service is put on a service bill it is marked Billed on the job card and disappears from the list, so it cannot be billed twice.',
    screens: ['ws/service-bills'],
    difficulty: 1,
  },
  {
    id: 'q.ws.after-finalise-next',
    module: 'ws',
    type: 'next',
    prompt: 'JC/4 is finalised. It had "Wheel Alignment & Balancing" by Precision Wheel Alignment, and their bill has arrived. What is the next step?',
    options: [
      { id: 'a', text: 'Enter it in Stock Inward against a PO' },
      { id: 'b', text: 'Record it in Service Bills by ticking the JC/4 service, then pay it in Service Payments' },
      { id: 'c', text: 'Add the amount as a new part on JC/4' },
      { id: 'd', text: 'Nothing – finalising the job card pays the provider' },
    ],
    answer: 'b',
    explanation: 'Outside services are paid through Service Bills → Service Payments. Stock Inward is only for parts bought on a PO. Finalising does not create any bill or payment.',
    screens: ['ws/service-bills', 'ws/service-payments'],
    difficulty: 1,
  },
  {
    id: 'q.ws.service-payment-pending',
    module: 'ws',
    type: 'scenario',
    prompt: 'What will the pending amount of the bill be after Confirm payment?',
    scenario: 'Service bill SB/3 has pending ₹10,000. The accountant enters Paid amount ₹10,000 and TDS ₹200, Discount 0, Mode Bank.',
    options: [
      { id: 'a', text: '₹200' },
      { id: 'b', text: '₹0 – pending is reduced by paid amount + TDS + discount and never goes below 0; the bill shows Paid but ₹200 too much was paid' },
      { id: 'c', text: '-₹200 (advance to the provider)' },
      { id: 'd', text: '₹10,000 until the bank confirms' },
    ],
    answer: 'b',
    explanation: 'Pending = 10,000 − (10,000 + 200 + 0), stopped at 0. When TDS is deducted, Paid amount must be pending − TDS (₹9,800). The ERP does not block over-payment, so check before confirming.',
    screens: ['ws/service-payments'],
    difficulty: 3,
  },
  {
    id: 'q.ws.checklist-save-first',
    module: 'ws',
    type: 'spot',
    prompt: 'Sudam did these steps on a new truck checklist. Which step was the mistake?',
    options: [
      { id: 'a', text: 'Selected the own truck; Driver and Opening KM filled in' },
      { id: 'b', text: 'Unticked OK on "Tyre tread & sidewall" and chose Action Replace' },
      { id: 'c', text: 'Pressed "Create job card" straight away, without pressing Save checklist' },
      { id: 'd', text: 'Opened the job card for the same truck' },
    ],
    answer: 'c',
    explanation: '"Create job card" closes the checklist and opens a job card, but it does not save the checklist – the inspection is lost. Press Save checklist first, then open the job card.',
    screens: ['ws/checklist'],
    difficulty: 2,
  },
  {
    id: 'q.ws.add-part-check',
    module: 'ws',
    type: 'spot',
    prompt: 'Which statement about the stock check on a job card is WRONG?',
    options: [
      { id: 'a', text: 'Add part refuses a qty larger than the current stock of that part.' },
      { id: 'b', text: 'The Part list shows each part\'s current stock in brackets.' },
      { id: 'c', text: 'Add part also counts the qty of the same part already added on this card and on other open job cards.' },
      { id: 'd', text: 'The approver sees each part\'s current stock when expanding the row in Job Card Approval.' },
    ],
    answer: 'c',
    explanation: 'The check compares the qty you type with total stock only. Parts already on this card or reserved on other open cards are not counted, so adding the same part twice can ask for more than the store has. At finalise the ERP then issues only what is left.',
    screens: ['ws/jobcards', 'ws/jobcard-approval'],
    difficulty: 3,
  },
  {
    id: 'q.ws.low-stock',
    module: 'ws',
    type: 'mcq',
    prompt: 'Air Filter Element has Min stock count 6 and 4 in stock. What does Spares Stock show, and what does Generate PO do with it?',
    options: [
      { id: 'a', text: 'Status OK; it is not added to a new PO' },
      { id: 'b', text: 'Status Low; a new PO can pre-fill it with qty 8 (2 × 6 − 4)' },
      { id: 'c', text: 'Status Out of stock; the PO is created automatically' },
      { id: 'd', text: 'Status Low; the PO is approved automatically' },
    ],
    answer: 'b',
    explanation: 'Below Min stock but above 0 is Low. A new PO is pre-filled with up to 3 parts below minimum, qty = 2 × min − current stock. Nothing is created or approved automatically – you save it and it goes for approval.',
    screens: ['ws/stock', 'ws/po'],
    difficulty: 2,
  },
  {
    id: 'q.ws.replacement-stock',
    module: 'ws',
    type: 'mcq',
    prompt: 'You send 2 leaking tubes back to Shree Tyres on a Free replacement. What happens to stock?',
    options: [
      { id: 'a', text: 'Nothing until the new tubes arrive' },
      { id: 'b', text: 'Stock of that bill\'s tube batch goes down by 2 now; when the replacement is received, a new batch of tubes is added at rate 0' },
      { id: 'c', text: 'Stock goes up by 2 because the supplier owes us tubes' },
      { id: 'd', text: 'A purchase order is created for 2 tubes' },
    ],
    answer: 'b',
    explanation: 'Add & print gate pass reduces the batch from that inward bill. Receive replacement saves a replacement inward that adds a new batch; for Free it is rate 0 and payable 0, and the replacement becomes Received.',
    screens: ['ws/replacement', 'ws/stock'],
    difficulty: 2,
  },
  {
    id: 'q.ws.free-replacement',
    module: 'ws',
    type: 'tf',
    prompt: 'The ERP checks the warranty expiry date before allowing a Free replacement.',
    options: [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }],
    answer: 'false',
    explanation: 'Free or Payable is your choice; the ERP does not compare it with the warranty expiry. Check the warranty date on the inward line (Stock Inward list) before choosing Free.',
    screens: ['ws/replacement', 'ws/inward'],
    difficulty: 2,
  },
  {
    id: 'q.ws.supplier-type',
    module: 'ws',
    type: 'scenario',
    prompt: 'Why is the provider missing, and how do you fix it?',
    scenario: 'Royal Body Builders did chassis welding on a truck, but when the workshop opens the job card "Service provider" list, Royal Body Builders is not there. It does appear in the Purchase Orders supplier list.',
    options: [
      { id: 'a', text: 'Its Supplier type is Seller. Edit it in Suppliers and set Supplier type to Service.' },
      { id: 'b', text: 'Its city is missing. Add the city.' },
      { id: 'c', text: 'Approve a PO for it first.' },
      { id: 'd', text: 'Add chassis welding as a part with type Item.' },
    ],
    answer: 'a',
    explanation: 'Job card services and Service Bills list only suppliers with type Service; POs and replacements list only type Seller. Correct the Supplier type in Suppliers.',
    screens: ['ws/suppliers', 'ws/jobcards', 'ws/spares'],
    difficulty: 2,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Practice exercises (sample data from buildSeed(); checkers only read db)
// ---------------------------------------------------------------------------------------------------------------
export const exercises: Exercise[] = [
  {
    id: 'ex.ws.jobcard',
    title: 'Repair a truck: job card to service payment',
    module: 'ws',
    roles: ['SI', 'CO', 'SA'],
    summary: 'Open a job card with one part from stock and one outside service, get it approved, finalise it (stock goes down, truck released), then bill and pay the service provider.',
    minutes: 12,
    workflow: true,
    watch: ['jobcards', 'stock', 'serviceBills'],
    steps: [
      {
        id: 'open',
        task: 'In Job Cards press New job card. Choose an own truck, write a complaint, add one part that has stock (for example Engine Oil 15W-40, qty 2) and one service (for example Wheel Alignment & Balancing by Precision Wheel Alignment). Press Submit for approval.',
        expected: 'A new job card JC/n with at least one part and one service, status Pending Approval.',
        screen: 'ws/jobcards',
        check: (db, base) => {
          const mine = best(myJobCards(db, base));
          if (!mine) {
            const any = last(created(db, base, 'jobcards'));
            if (any) return notYet(`${any.no} has ${any.parts?.length || 0} part(s) and ${any.services?.length || 0} service(s). Add at least one of each.`);
            return notYet('No new job card yet.');
          }
          if (mine.status === 'Draft') return notYet(`${mine.no} is saved as Draft. Open it and press Submit for approval.`);
          return pass(`${mine.no} for truck ${truckNo(db, mine.truckId)} – ${mine.parts.length} part(s), ${mine.services.length} service(s), status ${mine.status}.${mine.status === 'Finalised' ? '' : ' The truck now shows Workshop in Fleet.'}`);
        },
      },
      {
        id: 'approve',
        task: 'Open Job Card Approval, expand your job card to check the stock of each part, and press Approve.',
        expected: 'Your job card status is Approved.',
        screen: 'ws/jobcard-approval',
        check: (db, base) => {
          const mine = best(myJobCards(db, base));
          if (!mine) return notYet('Do step 1 first.');
          if (mine.status === 'Approved' || mine.status === 'Finalised') return pass(`${mine.no} approved${mine.approvedBy ? ` by ${mine.approvedBy}` : ''}.`);
          return notYet(`${mine.no} is ${mine.status}.`);
        },
      },
      {
        id: 'finalise',
        task: 'Back in Job Cards, open your approved job card and press Finalise & gate pass.',
        expected: 'Status Finalised; the part quantity is taken out of Spares Stock and the gate pass opens.',
        screen: 'ws/jobcards',
        check: (db, base) => {
          const mine = best(myJobCards(db, base));
          if (!mine) return notYet('Do step 1 first.');
          if (mine.status !== 'Finalised') return notYet(`${mine.no} is ${mine.status}. Finalise is available only after approval.`);
          const moves = [...new Set(mine.parts.map((p: any) => p.spareId))].map((sid: any) => `${spareName(db, sid)} ${stockAtStart(base, sid)} → ${stockNow(db, sid)}`);
          return pass(`${mine.no} finalised on ${mine.outDate || '—'}. Stock: ${moves.join('; ')}.`);
        },
      },
      {
        id: 'bill',
        task: 'In Service Bills choose the service provider, tick the service from your job card, enter a Bill no. and press Submit.',
        expected: 'A new service bill that includes the service of your job card; the service shows Billed on the job card.',
        screen: 'ws/service-bills',
        check: (db, base) => {
          const ids = new Set(myJobCards(db, base).map((j: any) => j.id));
          if (!ids.size) return notYet('Do step 1 first.');
          const sb = last(created(db, base, 'serviceBills', (b) => (b.items || []).some((i: any) => ids.has(i.jobCardId))));
          if (!sb) return notYet('No service bill for your job card yet.');
          return pass(`${sb.no} – bill ${sb.billNo} from ${supplierName(db, sb.supplierId)}, net ₹${Number(sb.net || 0).toLocaleString('en-IN')}.`);
        },
      },
      {
        id: 'pay',
        task: 'In Service Payments click your service bill, check amount, mode and ledger, and press Confirm payment.',
        expected: 'Your service bill has a payment and its pending amount has gone down (Paid when 0).',
        screen: 'ws/service-payments',
        check: (db, base) => {
          const ids = new Set(myJobCards(db, base).map((j: any) => j.id));
          const sb = last(created(db, base, 'serviceBills', (b) => (b.items || []).some((i: any) => ids.has(i.jobCardId))));
          if (!sb) return notYet('Do step 4 first.');
          if (!(sb.payments || []).length) return notYet(`${sb.no} has no payment yet (pending ₹${Number(sb.pending || 0).toLocaleString('en-IN')}).`);
          return pass(`${sb.no} paid – pending now ₹${Number(sb.pending || 0).toLocaleString('en-IN')}${sb.pending <= 0 ? ' (Paid)' : ''}.`);
        },
      },
    ],
  },
  {
    id: 'ex.ws.po-inward',
    title: 'Buy spares: PO, approval and inward',
    module: 'ws',
    roles: ['SI', 'SA'],
    summary: 'Raise a purchase order for parts below minimum, approve it, receive the parts with the supplier bill (stock goes up) and pay the supplier.',
    minutes: 10,
    workflow: true,
    watch: ['pos', 'inwards', 'stock'],
    steps: [
      {
        id: 'po',
        task: 'In Purchase Orders press Generate PO. Choose a seller (for example Mahavir Auto Spares), check the pre-filled parts, qty and rate, and press Save & send for approval.',
        expected: 'A new PO/n with status Pending Approval.',
        screen: 'ws/po',
        check: (db, base) => {
          const po = best(myPOs(db, base));
          if (!po) return notYet('No new purchase order yet.');
          return pass(`${po.no} to ${supplierName(db, po.supplierId)} – ${po.items?.length || 0} part(s), ₹${Number(po.net || 0).toLocaleString('en-IN')}, status ${po.status}.`);
        },
      },
      {
        id: 'approve',
        task: 'Open PO Approval, View your PO to check parts and rates, and press Approve.',
        expected: 'Your PO status is Approved.',
        screen: 'ws/po-approval',
        check: (db, base) => {
          const po = best(myPOs(db, base));
          if (!po) return notYet('Do step 1 first.');
          if (po.status === 'Approved' || po.status === 'Inwarded') return pass(`${po.no} approved${po.approvedBy ? ` by ${po.approvedBy}` : ''}.`);
          return notYet(`${po.no} is ${po.status}.`);
        },
      },
      {
        id: 'inward',
        task: 'In Stock Inward choose your PO, enter a Bill no., check qty, rate and batch, and press Save inward.',
        expected: 'A new inward against your PO; the PO becomes Inwarded and stock goes up.',
        screen: 'ws/inward',
        check: (db, base) => {
          const poIds = new Set(myPOs(db, base).map((p: any) => p.id));
          if (!poIds.size) return notYet('Do step 1 first.');
          const inw = last(created(db, base, 'inwards', (i) => poIds.has(i.poId)));
          if (!inw) return notYet('No inward saved against your PO yet. Only Approved POs appear in the PO number list.');
          const moves = (inw.items || []).map((x: any) => `${spareName(db, x.spareId)} ${stockAtStart(base, x.spareId)} → ${stockNow(db, x.spareId)}`);
          return pass(`${inw.no} – bill ${inw.billNo}, payable ₹${Number(inw.payable || 0).toLocaleString('en-IN')}. Stock: ${moves.join('; ')}.`);
        },
      },
      {
        id: 'pay',
        task: 'Open the Inventory payment entry tab, click your bill, check paid amount, TDS and mode, and press Confirm payment.',
        expected: 'Your inward has a payment and its pending amount has gone down.',
        screen: 'ws/inward',
        check: (db, base) => {
          const poIds = new Set(myPOs(db, base).map((p: any) => p.id));
          const inw = last(created(db, base, 'inwards', (i) => poIds.has(i.poId)));
          if (!inw) return notYet('Do step 3 first.');
          if (!(inw.payments || []).length) return notYet(`${inw.no} has no payment yet (pending ₹${Number(inw.pending || 0).toLocaleString('en-IN')}).`);
          return pass(`${inw.no} paid – pending now ₹${Number(inw.pending || 0).toLocaleString('en-IN')}.`);
        },
      },
    ],
  },
  {
    id: 'ex.ws.checklist',
    title: 'Inspect a truck and open its job card',
    module: 'ws',
    roles: ['SI', 'CO', 'SA'],
    summary: 'Save a truck checklist with at least one failed point, then open a job card for the same truck.',
    minutes: 5,
    watch: ['checklists', 'jobcards'],
    steps: [
      {
        id: 'checklist',
        task: 'In Truck Checklist press New checklist, select an own truck, untick OK on at least one point, fill Status and Action, and press Save checklist.',
        expected: 'A new checklist TMC/n with at least one issue.',
        screen: 'ws/checklist',
        check: (db, base) => {
          const all = created(db, base, 'checklists');
          const ck = last(all.filter((c) => (c.items || []).some((i: any) => !i.ok)));
          if (!ck) return all.length ? notYet(`${last(all).no} is saved but every point is OK. Untick OK on the failed point.`) : notYet('No new checklist saved yet. Remember: Create job card does not save the checklist.');
          const n = ck.items.filter((i: any) => !i.ok).length;
          return pass(`${ck.no} for truck ${truckNo(db, ck.truckId)} – ${n} issue(s).`);
        },
      },
      {
        id: 'jobcard',
        task: 'Open a job card for the same truck (Job Cards > New job card, or Edit the checklist and press Create job card). Save it as draft or submit it.',
        expected: 'A new job card for the same truck as your checklist.',
        screen: 'ws/jobcards',
        check: (db, base) => {
          const trucks = new Set(created(db, base, 'checklists', (c) => (c.items || []).some((i: any) => !i.ok)).map((c: any) => c.truckId));
          if (!trucks.size) return notYet('Do step 1 first.');
          const jc = last(created(db, base, 'jobcards', (j) => trucks.has(j.truckId)));
          if (!jc) return notYet('No new job card for that truck yet.');
          return pass(`${jc.no} for truck ${truckNo(db, jc.truckId)}, status ${jc.status}.`);
        },
      },
    ],
  },
  {
    id: 'ex.ws.replacement',
    title: 'Send a defective part for replacement and receive it back',
    module: 'ws',
    roles: ['SI', 'SA'],
    summary: 'Create a Free replacement against a supplier bill (stock of that batch goes down), then receive the replacement back into stock.',
    minutes: 6,
    watch: ['replacements', 'inwards', 'stock'],
    steps: [
      {
        id: 'send',
        task: 'In Spare Replacement open New replacement. Choose Shree Tyres & Retreads, pick one of its bills, type Free, enter qty 1 on a tube or tyre line, write the defect in Remark, and press Add & print gate pass.',
        expected: 'A new replacement RPL/n with status Sent; the stock of that batch goes down.',
        screen: 'ws/replacement',
        check: (db, base) => {
          const r = last(created(db, base, 'replacements'));
          if (!r) return notYet('No new replacement yet.');
          const moves = (r.items || []).map((i: any) => `${spareName(db, i.spareId)} ${stockAtStart(base, i.spareId)} → ${stockNow(db, i.spareId)}`);
          return pass(`${r.no} to ${supplierName(db, r.supplierId)} (${r.payable ? 'Payable' : 'Free'}), status ${r.status}. Stock: ${moves.join('; ')}.`);
        },
      },
      {
        id: 'receive',
        task: 'In the Replacement list press Receive replacement on a row with status Sent (yours, or the sample tube replacement from Shree Tyres), enter bill no. (or leave blank for FREE), qty and batch, and press Save inward.',
        expected: 'The replacement becomes Received and a replacement inward adds the part back to stock.',
        screen: 'ws/replacement',
        check: (db, base) => {
          const r = last(changed(db, base, 'replacements', (x) => x.status === 'Received'));
          if (!r) return notYet('No replacement received yet.');
          const inw = last(created(db, base, 'inwards', (i) => i.isReplacement && i.replacementId === r.id));
          return pass(`${r.no} Received${inw ? ` via ${inw.no} (bill ${inw.billNo}, payable ₹${Number(inw.payable || 0).toLocaleString('en-IN')})` : ''}.`);
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------------------------------------------
export const workflows: Workflow[] = [
  {
    id: 'wf.workshop',
    title: 'Truck repair: checklist to service payment',
    module: 'ws',
    roles: ['SI', 'CO'],
    summary: 'How an own truck is inspected, repaired with parts from stock and outside services, approved, released with a gate pass, and how the outside provider is billed and paid – and how Fleet sees the truck as "Workshop" until the job card is finalised.',
    steps: [
      { screen: 'ws/checklist', title: 'Inspect the truck', does: 'Save the 20-point checklist. Failed points (not OK) with status and action show what must be repaired.' },
      { screen: 'ws/jobcards', title: 'Open the job card', does: 'Choose the own truck, add parts from stock (stock is checked, not yet reduced) and outside services, then Submit for approval. Status Pending Approval.' },
      { screen: 'fleet/trucks', title: 'Truck shows Workshop', does: 'While the truck has a Draft, Pending Approval or Approved job card without an Out date, Fleet shows it as Workshop and the trip form does not offer it.' },
      { screen: 'ws/jobcard-approval', title: 'Approve the estimate', does: 'The approver checks parts against stock and the services, then Approves (or Returns to workshop → Draft). Approval does not move stock.' },
      { screen: 'ws/jobcards', title: 'Finalise & gate pass', does: 'When the work is done, finalise the Approved card: Out date/time set, parts issued from stock, truck released (Available in Fleet), gate pass printed.' },
      { screen: 'ws/stock', title: 'Stock reduced', does: 'Spares Stock shows the lower quantity and the parts under Consumed. Low parts can be re-ordered with Raise PO.' },
      { screen: 'ws/service-bills', title: 'Record the provider bill', does: 'Tick the job-card services on the provider\'s bill, enter bill no. and discount, and Submit. The services show Billed.' },
      { screen: 'ws/service-payments', title: 'Pay the provider', does: 'Record the payment (amount, TDS, discount, ledger, mode). Pending reduces and a ledger payment voucher is posted.' },
    ],
    exercise: 'ex.ws.jobcard',
    lesson: 'ls.ws.stock-movements',
    notes: [
      'Stock goes down only at Finalise. A part on an Approved card is still counted in stock.',
      'Finalise is possible only on an Approved job card.',
      'Entering an Out date on an open job card also makes the truck show Available in Fleet – enter it only when the truck actually leaves.',
      'Service bills can be made for Approved or Finalised job cards; billing after finalise is safer.',
    ],
  },
  {
    id: 'wf.spares-purchase',
    title: 'Buying spares: PO to stock and replacement',
    module: 'ws',
    roles: ['SI'],
    summary: 'How a part is ordered on a PO, approved, received into stock with the supplier bill, paid, and – if defective – returned for replacement and received back.',
    steps: [
      { screen: 'ws/stock', title: 'Find low parts', does: 'Parts below Min stock show Low or Out of stock. Raise PO opens a PO pre-filled with up to 3 of them.' },
      { screen: 'ws/po', title: 'Raise the PO', does: 'Choose the seller, check parts, qty and rate, and Save & send for approval. Status Pending Approval; editable until approved.' },
      { screen: 'ws/po-approval', title: 'Approve the PO', does: 'The approver checks and Approves. Only Approved POs can be inwarded.' },
      { screen: 'ws/inward', title: 'Inward the parts', does: 'Choose the approved PO, enter the supplier bill no., qty, rate, batch and warranty, and Save inward. One stock batch per line; PO becomes Inwarded.' },
      { screen: 'ws/inward', title: 'Pay the supplier', does: 'In Inventory payment entry, pay the bill (amount, TDS, discount, ledger, mode). A ledger payment voucher is posted.' },
      { screen: 'ws/replacement', title: 'Replace a defective part', does: 'Send the part back against its bill (Free or Payable) with the RP gate pass – that batch is reduced – and Receive replacement when it returns to add stock again.' },
    ],
    exercise: 'ex.ws.po-inward',
    lesson: 'ls.ws.stock-movements',
    notes: [
      'A PO is inwarded once. Enter the qty actually received; raise a new PO for any balance.',
      'Payable replacement inwards create a supplier bill (rate × qty) that is paid in Inventory payment entry; Free ones have payable 0.',
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------------------------------------------
export const lessons: Lesson[] = [
  {
    id: 'ls.ws.stock-movements',
    title: 'How spares stock moves',
    module: 'ws',
    kind: 'concept',
    roles: ['SI', 'CO'],
    screens: ['ws/stock', 'ws/inward', 'ws/jobcards', 'ws/replacement'],
    summary: 'Stock is a set of batches. Four actions change it – two add stock and two take it away. Nothing else does.',
    sections: [
      {
        heading: 'Stock is kept in batches',
        body: 'Every inward line becomes one batch with part, batch no., qty and rate. Spares Stock adds the batches of a part to show its stock qty and value.',
      },
      {
        heading: 'What adds stock',
        body: 'Only receiving goods adds stock.',
        bullets: [
          'Stock Inward against an Approved PO – one new batch per line, PO becomes Inwarded.',
          'Receive replacement in Spare Replacement – a new batch for the part that came back (rate 0 when Free).',
        ],
      },
      {
        heading: 'What reduces stock',
        body: 'Stock goes down only when parts physically leave the store.',
        bullets: [
          'Finalise & gate pass on an Approved job card – each part qty is taken from the batches, oldest received first.',
          'Add & print gate pass in Spare Replacement – the qty is taken from the batch of the chosen supplier bill.',
        ],
      },
      {
        heading: 'What does NOT change stock',
        body: 'These steps are only plans or approvals.',
        bullets: [
          'Adding a part to a job card (it only checks stock is enough).',
          'Submitting or approving a job card.',
          'Raising or approving a PO.',
          'Recording or paying service bills and supplier bills.',
        ],
      },
      {
        heading: 'Keeping stock true',
        body: 'Inward the qty actually received, finalise job cards the day the truck leaves, and receive replacements as soon as they come back. Check Spares Stock before approving and finalising – the ERP issues only what is left if stock has fallen.',
      },
    ],
    audio: [
      'Spares का stock batches में रखा जाता है — हर inward line एक batch है।',
      'Stock सिर्फ़ दो तरह से बढ़ता है: PO का inward, और replacement का inward।',
      'Stock सिर्फ़ दो तरह से घटता है: job card finalise, और replacement का gate pass।',
      'Part जोड़ना, approve करना या PO बनाना — इनसे stock नहीं बदलता।',
      'इसलिए truck निकलते ही job card finalise कीजिए, ताकि stock सही रहे।',
    ],
    minutes: 4,
    quiz: ['q.ws.stock-at-finalise', 'q.ws.replacement-stock', 'q.ws.po-before-inward'],
  },
];
