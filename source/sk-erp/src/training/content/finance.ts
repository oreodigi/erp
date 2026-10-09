// Training Academy content – Finance (module 'fin').
// Every rule below was checked against src/features/finance.tsx, detention.tsx, cashplan.tsx, lib/cashplan.ts,
// components/QuickActions.tsx and the store actions in src/store/store.ts (generateBill, clientPayment, deleteReceipt,
// deleteBill, removeBillLR, removeAck, createTPSlip, approveTPSlip, payTPSlip, approveDC, createDCPayslip, payDCPayslip,
// payHamali, ledgerEntry, updateFreight, tallyExport).
import type { Exercise, Lesson, Question, ScreenTraining, Workflow } from '../types';
import { before, changed, created, fieldChanged, notYet, pass } from '../check';

// ---------------------------------------------------------------------------------------------------------------
// Small read-only helpers for checkers (never mutate db).
// ---------------------------------------------------------------------------------------------------------------
const list = (db: any, coll: string): any[] => (Array.isArray(db?.[coll]) ? db[coll] : []);
const rs = (n: any) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const custName = (db: any, id: string) => list(db, 'customers').find((c) => c.id === id)?.name || id || '—';
const transName = (db: any, id: string) => list(db, 'transporters').find((t) => t.id === id)?.name || id || '—';
const lrOf = (db: any, id: string) => list(db, 'lrs').find((l) => l.id === id);
const billOf = (db: any, id: string) => list(db, 'bills').find((b) => b.id === id);
const settles = (p: any) => Number(p?.received || 0) + Number(p?.tds || 0) + Number(p?.damage || 0) + Number(p?.rateDiff || 0);
const newBills = (db: any, base: any) => created(db, base, 'bills', (b) => !b.deleted);
const newReceipts = (db: any, base: any, billId?: string) => created(db, base, 'clientPayments', (p) => !billId || p.billId === billId);
/** LRs whose POD (ack) was recorded during this exercise. */
const podDuringExercise = (db: any, base: any) =>
  fieldChanged(db, base, 'lrs', 'ack', (l) => !!l.ack).filter((l) => { const b = before(base, 'lrs', l.id); return !!b && !b.ack; });
/** Delivery challans whose detention verification was saved during this exercise. */
const detentionSaved = (db: any, base: any, statuses: string[]) =>
  list(db, 'dcs').filter((d) => {
    const det = d?.detention;
    if (!det || !statuses.includes(det.status)) return false;
    const b = before(base, 'dcs', d.id);
    return !b || !b.detention || String(det.verifiedAt || '') > String(base.startedAt || '');
  });

// ---------------------------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------------------------
export const screens: ScreenTraining[] = [
  {
    id: 'fin/billing',
    module: 'fin',
    title: 'Customer Billing',
    purpose: 'Turns delivered "To Be Billed" LRs into a GST freight bill for one client, in that client\'s bill format.',
    why: 'Generating the bill creates the receivable (bill pending = bill total), posts a Sales voucher to the ledger and moves each LR to the Billed stage.',
    when: 'Every day, after the POD of delivered LRs reaches the office. Clients marked "Allow bill without acknowledgment" can be billed as soon as the LR is delivered.',
    roles: ['AC', 'SA'],
    upstream: ['ops/pod', 'ops/delivery', 'fin/freight-update'],
    downstream: ['fin/receivables', 'fin/client-payments', 'fin/ledger', 'fin/tally'],
    before: 'Operations delivered the LR and recorded the POD with any detention days and damage. If the freight was wrong, Accounts corrected it in Update LR freight.',
    after: 'The bill appears in the Bill register as Due. It is printed and sent to the client, then followed up in Receivables until receipts make it Paid.',
    prerequisites: [
      'LR is finalised, Delivered and has payment mode "To Be Billed".',
      'LR is not already on a bill.',
      'POD is recorded – unless the bill-head client has "Allow bill without acknowledgment" in the customer master.',
      'Freight on the LR is correct. After billing, freight can no longer be changed in Update LR freight.',
    ],
    actions: [
      'Choose Bill head (Consignor or Consignee) and Transportation type (All, Road, Road+Rail).',
      'Choose the Client, tick the LRs and click "Proceed to next".',
      'Check the per-LR additions (detention, toll, unloading, multi load-unload, incentive, freight adj. add) and deductions (late penalty, damage, freight adj. less).',
      'Check Place of supply and the GST %, enter a bill number or leave it blank for auto-numbering, and click "Generate bill".',
      'Print the bill, open it, or go straight to "Record payment".',
      'In the Bill register: print a bill, add a Supplementary bill, or print the supplementary.',
    ],
    records: [
      'bills – new bill with rows, taxable value, CGST/SGST/IGST %, tax, net (bill total) and pending = net.',
      'lrs – billId is set on every LR on the bill and an event "Billed on <bill no.>" is added.',
      'ledger – Sales voucher SV/<n> debiting the client for the bill total (Tally status: Not Synced).',
      'Linked load plan / order (if any) – billing status Billed.',
    ],
    validations: [
      'Only eligible LRs are listed: finalised, Delivered, To Be Billed, not billed, and POD received (or client allows billing without acknowledgment).',
      '"Proceed to next" with no LR ticked shows "Select at least one LR".',
      'Place of supply Maharashtra → CGST + SGST (2.5% + 2.5% by default). Any other state → IGST (5% by default).',
      'Bill number left blank → auto number SKT/B/<next no.>/<financial year>.',
    ],
    mistakes: [
      'Leaving Client on "All clients" and ticking LRs of different consignors: the screen does not stop it, and the whole bill goes to the first LR\'s client. Always pick the Client first.',
      'Setting GST to 0% by mistake: the bill is generated with no tax and must be deleted (after any receipts are deleted) and made again.',
      'Ignoring the "Waiting for POD" count: those LRs are not missing, they only need the POD recorded on the POD screen.',
      'Billing with wrong freight: once billed, Update LR freight no longer shows the LR. Use a Supplementary bill for extra charges, or delete the bill to re-bill.',
    ],
    warnings: [
      'A Supplementary bill adds its amount to the bill total and pending only. It does not add GST and does not post a separate ledger voucher – tell the accounts head when you use it.',
      'Supplementary bill is also allowed on a bill that is already Paid; it makes the bill pending again.',
    ],
    shortcuts: [
      'From a card on the Order Board or My Work, "Make bill" opens a quick dialog: it groups the selected LRs by consignor, makes one bill per consignor and offers GST 5% (GTA), 12% or Exempt/RCM.',
      'After generating, "Record payment" opens Client Payments with this bill already selected.',
    ],
    fields: [
      { name: 'Bill head', help: 'Who the bill is made for: the Consignor (default) or the Consignee of the LRs.' },
      { name: 'Bill to third party', help: 'Tick to raise the bill on another customer (for example the buyer who pays freight).' },
      { name: 'Detention (WH)', help: 'Pre-filled from the POD detention amount (detention days × agreement rate). Charged to the client.' },
      { name: 'Unloading / hamali', help: 'Pre-filled from the unloading charge entered at delivery.' },
      { name: 'Damage', help: 'Pre-filled from the POD damage amount and deducted from the LR net.' },
      { name: 'Freight adj. add / less', help: 'Manual corrections per LR when the agreed amount differs from the LR freight.' },
      { name: 'Place of supply (state)', help: 'Defaults to the client city\'s state. Decides CGST+SGST (Maharashtra) or IGST (other states).' },
      { name: 'Bill number', help: 'Leave blank to auto-number. Type one only when the client needs a specific series.' },
    ],
    statuses: [
      { status: 'Due', meaning: 'Pending amount left, bill age within the client\'s credit days.' },
      { status: 'Overdue', meaning: 'Pending amount left and the bill is older than the client\'s credit days (30 if not set).' },
      { status: 'Paid', meaning: 'Pending is zero – receipts (received + TDS + damage + rate difference) cover the bill total.' },
      { status: 'Deleted', meaning: 'Bill deleted in Admin → Data corrections. LRs went back to the billing queue and the sales voucher was removed.' },
    ],
    example: 'LR SKT/PN/10429 for a Pune client: freight ₹40,000 + detention ₹1,500 + unloading ₹600 − damage ₹900 = taxable ₹41,200. Place of supply Maharashtra, so CGST 2.5% + SGST 2.5% = ₹2,060. Bill total ₹43,260, pending ₹43,260.',
    walkthrough: [
      { title: 'Pick bill head and client', body: 'Keep Bill head on Consignor unless the consignee pays. Choose the Client so only that client\'s LRs show.' },
      { title: 'Tick the LRs', body: 'Check the POD column says Received. Tick each LR to bill and click "Proceed to next".' },
      { title: 'Check additions and deductions', body: 'Detention, unloading and damage come from POD and delivery. Change only what the client agreed to.' },
      { title: 'Check tax', body: 'Maharashtra client → CGST + SGST. Out-of-state client → IGST. Check the bill total in the Totals card.' },
      { title: 'Generate and send', body: 'Click "Generate bill". Print it and send it to the client. The receivable and the sales voucher are created at once.' },
    ],
    related: ['fin/receivables', 'fin/client-payments', 'ops/pod', 'fin/freight-update'],
    practice: 'ex.fin.generate-bill',
    audio: [
      'यह Customer Billing screen है। यहाँ delivered LRs का GST bill बनता है।',
      'पहले Client चुनिए, फिर सिर्फ़ उन LRs को tick कीजिए जिनका POD Received दिख रहा है।',
      'Detention, unloading और damage, POD से अपने आप भर जाते हैं। सिर्फ़ वही बदलिए जो client ने माना है।',
      'Maharashtra का client है तो CGST और SGST लगेगा, बाहर के state का है तो IGST।',
      'Generate bill दबाते ही receivable बनता है और ledger में sales voucher post हो जाता है।',
      'Bill बनने के बाद LR का freight नहीं बदलता, इसलिए freight पहले ही check कर लीजिए।',
    ],
    quiz: ['q.fin.bill-needs-pod', 'q.fin.gst-intra', 'q.fin.billing-spot'],
    minutes: 6,
  },
  {
    id: 'fin/receivables',
    module: 'fin',
    title: 'Receivables',
    purpose: 'Client-wise outstanding of all open bills, aged by days since the bill date and compared with each client\'s credit days and credit limit.',
    why: 'It shows who owes money, how old the dues are and which clients should be followed up or put on credit hold.',
    when: 'Daily for follow-up calls, and before confirming new business with a client who has large or old dues.',
    roles: ['AC', 'SA'],
    upstream: ['fin/billing', 'fin/client-payments'],
    downstream: ['fin/client-payments', 'fin/cash-plan', 'cust/360'],
    before: 'Bills were generated in Customer Billing. Each open bill has a pending amount.',
    after: 'Receipts are recorded in Client Payments. Clients beyond limits may be put on credit hold, which blocks new orders and LRs for them.',
    prerequisites: ['Bills exist with a pending amount above zero.', 'Customer master has credit days and credit limit filled in.'],
    actions: [
      'Set "As on date" to see the outstanding on any past date.',
      'Expand a client row to see each open bill with its pending amount and age; click a bill to open it.',
      'Row action "Record payment" opens Client Payments for that client.',
      'Row action "Put on credit hold" / "Lift credit hold".',
    ],
    records: ['customers.disallowLR – set or cleared by the credit hold action. Nothing else is changed on this screen.'],
    validations: [
      'Only bills that are not deleted, have pending > 0 and are dated on or before the As on date are counted.',
      'Ageing buckets are by days since bill date: 0–30, 31–60, 61–90 and 90+.',
      'Overdue = pending of bills older than the client\'s credit days (30 days when credit days are blank).',
      'Limit used bar turns red above 80% of the credit limit.',
    ],
    mistakes: [
      'Reading the 0–30 bucket as "not due": a client with 21 credit days is already overdue at day 22. Use the Overdue column.',
      'Putting a client on credit hold and forgetting to lift it after payment: Orders and LR booking stay blocked for that client.',
      'Expecting ageing from the due date: buckets count from the bill date, not from bill date + credit days.',
    ],
    warnings: ['Credit hold blocks new orders (Orders screen) and new LRs (Generate LR). Order confirmation and New booking show a warning only.'],
    fields: [
      { name: 'As on date', help: 'Outstanding and ageing are worked out as on this date.' },
      { name: 'Overdue', help: 'Pending of bills older than the client\'s credit days.' },
      { name: 'Limit used', help: 'Total outstanding ÷ credit limit.' },
    ],
    statuses: [{ status: 'Credit hold', meaning: 'Client has "Disallow new LR" set. New orders and LRs for this client are blocked until the hold is lifted.' }],
    example: 'Deccan Home Appliances has 45 credit days. A ₹52,500 bill dated 40 days ago sits in the 31–60 bucket but is not overdue. A bill dated 50 days ago is in the same bucket and is overdue.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Total outstanding, Overdue, 90+ days and amount Collected in the last 30 days.' },
      { title: 'Work from the top', body: 'The table is sorted by total outstanding. Start with the biggest Overdue amounts.' },
      { title: 'Open the bills', body: 'Expand a client to see each pending bill and its age before you call.' },
      { title: 'Act', body: 'Record payment when money has come, or put the client on credit hold if accounts have decided so.' },
    ],
    related: ['fin/client-payments', 'fin/cash-plan', 'cust/360'],
    practice: 'ex.fin.credit-hold',
    audio: [
      'यह Receivables screen है। यहाँ हर client का बकाया, कितने दिन पुराना है, वह दिखता है।',
      'Ageing bill की date से गिनी जाती है — शून्य से तीस, इकतीस से साठ, साठ से नब्बे, और नब्बे से ऊपर।',
      'Overdue column ज़्यादा ज़रूरी है। Client के credit days पार हो गए तो वह bill overdue है।',
      'Row खोलिए, हर pending bill देखिए, फिर client को call कीजिए।',
      'Credit hold लगाने से उस client के नए orders और LR रुक जाते हैं। Payment आने के बाद hold हटाना मत भूलिए।',
    ],
    quiz: ['q.fin.ageing', 'q.fin.credit-hold'],
    minutes: 4,
  },
  {
    id: 'fin/client-payments',
    module: 'fin',
    title: 'Client Payments',
    purpose: 'Records a customer receipt against one bill, with TDS, damage deduction and rate difference, and reduces the bill\'s pending amount.',
    why: 'Every receipt posts a Cash/Bank Receipt voucher and moves the bill towards Paid. Partial receipts leave the bill (and its load plan/order) in Payment Partial.',
    when: 'The same day money is received by NEFT, cheque or cash, or when the client\'s remittance advice arrives.',
    roles: ['AC', 'SA'],
    upstream: ['fin/billing', 'fin/receivables'],
    downstream: ['fin/receivables', 'fin/ledger', 'fin/tally', 'fin/cash-plan'],
    before: 'The bill was generated and sent. The client paid all or part of it, usually after deducting TDS.',
    after: 'The bill\'s pending drops. When pending reaches zero the bill shows Paid; otherwise it stays Due/Overdue and the load plan/order shows Payment Partial.',
    prerequisites: ['Bill exists, is not deleted and has pending above zero.', 'You have the amount received, TDS deducted by the client, and bank/cheque/UTR details.'],
    actions: [
      'Filter by Client and pick a pending bill from the list.',
      'Check Received amount and TDS (both pre-filled), enter Damage & deduction and Rate difference if the client cut them.',
      'Choose received date, Payment by (ledger), mode (Cash, Cheque, Bank), bank name and cheque/UTR no.',
      'Click "Confirm payment".',
      'In the Receipts table: open the bill, or "Delete receipt" to reverse a wrong entry.',
    ],
    records: [
      'clientPayments – receipt RV/<n> with received, TDS, damage, rate difference, mode and bank details.',
      'bills.pending – reduced by received + TDS + damage + rate difference (never below zero).',
      'ledger – Cash Receipt (mode Cash) or Bank Receipt (Cheque/Bank) crediting the client for the full settled amount.',
      'Linked load plan / order – Payment Partial (pending left) or Paid (pending zero).',
    ],
    validations: [
      'Confirm is disabled until Received amount is above zero.',
      'Confirm is disabled when received + TDS + damage + rate difference is more than the pending amount (+₹1); the box turns red with "exceeds pending".',
      'TDS is pre-filled as the client\'s TDS % of the bill\'s taxable value (before GST); Received is pre-filled as pending − TDS.',
    ],
    mistakes: [
      'Taking TDS twice: every time a bill is picked, TDS is filled again for the whole bill. If the client already deducted TDS in an earlier receipt, set TDS to 0 on the next one.',
      'Typing the gross amount in Received and also entering TDS: the bill is over-settled. Received is only the money that reached the bank.',
      'Choosing Cash mode for a bank transfer: the voucher becomes a Cash Receipt and the cash book will not match.',
      'Deleting a receipt that was already transferred to Tally: the ERP removes it, but the Tally voucher must be altered separately.',
    ],
    warnings: [
      'The quick "Payment received" dialog from a card (Order Board / My Work) checks only that the amount is above zero; it does not warn when the amount is more than pending. Use this screen for anything other than a simple full payment.',
      'Deleting a receipt restores the bill pending (capped at the bill total), removes its voucher from the ledger and recalculates the status to Paid, Payment Partial or Billed.',
    ],
    fields: [
      { name: 'Received amount', help: 'Money actually received in bank or cash.' },
      { name: 'TDS', help: 'Tax deducted at source by the client. Counts towards settling the bill.' },
      { name: 'Damage & deduction', help: 'Amount the client cut for damage or shortage.' },
      { name: 'Rate difference', help: 'Amount the client cut because they pay a lower rate than billed.' },
      { name: 'Payment by (ledger)', help: 'Our bank or cash ledger where the money came in.' },
    ],
    statuses: [
      { status: 'Payment Partial', meaning: 'At least one receipt is recorded and pending is still above zero (shown on the linked load plan/order; bill shows Due or Overdue).' },
      { status: 'Paid', meaning: 'Pending is zero.' },
    ],
    example: 'Bill total ₹52,500 (taxable ₹50,000 + GST ₹2,500). Client TDS 2% → TDS ₹1,000 on ₹50,000. Received pre-fills ₹51,500. If the client sends only ₹20,000 now, enter Received ₹20,000 and TDS 0: pending becomes ₹32,500 (Payment Partial). When ₹31,500 arrives with TDS ₹1,000, pending becomes ₹0 (Paid).',
    walkthrough: [
      { title: 'Pick the bill', body: 'Filter the client and click the bill. The right panel shows the pending amount.' },
      { title: 'Match the remittance', body: 'Received = money in bank. TDS, damage and rate difference = what the client cut.' },
      { title: 'Check the balance line', body: '"Settles … balance after receipt" must match what the client says is still due.' },
      { title: 'Confirm', body: 'Choose mode and ledger, add UTR/cheque no., and click "Confirm payment".' },
    ],
    related: ['fin/receivables', 'fin/billing', 'fin/ledger'],
    practice: 'ex.fin.partial-payment',
    audio: [
      'यहाँ customer का payment record होता है, हमेशा किसी एक bill के against।',
      'Received में सिर्फ़ वह पैसा डालिए जो bank में आया। TDS अलग box में।',
      'TDS अपने आप भरता है — taxable value का client वाला TDS percent।',
      'अगर पिछली receipt में TDS कट चुका है, तो अगली receipt में TDS शून्य कर दीजिए।',
      'Pending बचा तो bill Payment Partial रहता है, pending शून्य हुआ तो Paid।',
      'गलत receipt delete करने से bill का pending वापस आ जाता है और voucher ledger से हट जाता है।',
    ],
    quiz: ['q.fin.tds-default-amount', 'q.fin.partial-status', 'q.fin.second-receipt-tds'],
    minutes: 6,
  },
  {
    id: 'fin/cash-plan',
    module: 'fin',
    title: 'Cash Plan',
    purpose: 'A week-by-week forecast of money coming in and going out for the next 4, 8 or 12 weeks, with the cash balance at each week end.',
    why: 'It warns early when cash will fall below the minimum balance, so collections can be pushed or payments moved.',
    when: 'Weekly (for example every Monday) and before committing large payments.',
    roles: ['AC', 'SA'],
    upstream: ['fin/receivables', 'fin/billing', 'fin/tp-approval', 'fin/dc-payslip'],
    downstream: ['fin/receivables', 'fin/tp-approval'],
    before: 'Bills, unbilled LRs, transporter and DC payment slips, purchase orders, truck papers, driver salaries and expenses are already in the ERP.',
    after: 'If a week runs short, the red banner\'s "Chase payments" opens Receivables to follow up overdue bills.',
    prerequisites: ['Enter today\'s total cash + bank balance in Assumptions – without it every week starts from zero.'],
    actions: [
      'Choose 4, 8 or 12 weeks.',
      'Open Assumptions and set opening balance, minimum balance, overdue recovery % per week, cut-off for old overdue bills, office salaries & rent, payment days for transporters and suppliers, driver salary day and recurring spending.',
      'Click "Save assumptions" to keep them, or "Default values" to reset.',
      'Click any amount in the table to see the bills, LRs or slips inside it, and open them.',
    ],
    records: ['cashPlan settings saved with the data when you click "Save assumptions". The plan itself is calculated and not stored.'],
    validations: [
      'Customer bills fall due on bill date + client credit days. Bills already overdue are not placed on their due date; instead the recovery % of the overdue total is assumed collected each week.',
      'Bills overdue for more than the cut-off days (default 90) are left out and shown as "older bills left out".',
      'Unbilled delivered "To Be Billed" LRs are assumed billed after the POD time limit (default 3 days) and paid after the client\'s credit days.',
      'Transporter slips are paid "Pay transporters after" days (default 7) after approval; DC payment slips the same number of days after the slip date.',
      'Diesel, trip expenses and cash freight use the average of the last 8 weeks when Recurring spending is on.',
    ],
    mistakes: [
      'Not entering the opening balance: the plan looks short every week.',
      'Changing assumptions and leaving without "Save assumptions": the plan goes back to the saved values next time.',
      'Treating the plan as a bank statement: it is a forecast built from the assumptions above.',
    ],
    warnings: ['Office salaries and rent are not in the ERP. Enter a monthly figure or they are not counted.'],
    fields: [
      { name: 'Overdue collected per week (%)', help: 'Share of the overdue total expected each week. Default 5%.' },
      { name: 'Leave out bills overdue more than (days)', help: 'Very old bills are excluded from the forecast. 0 counts all. Default 90.' },
      { name: 'Minimum balance to keep', help: 'Weeks ending below this are highlighted and trigger the red warning.' },
    ],
    example: 'Overdue counted = ₹10,00,000 at 5% per week: week 1 expects ₹50,000, week 2 ₹47,500 (5% of the ₹9,50,000 left), and so on.',
    walkthrough: [
      { title: 'Enter today\'s balance', body: 'Add up all bank accounts and cash in hand and type it in Assumptions.' },
      { title: 'Set your minimum', body: 'Enter the balance you never want to go below.' },
      { title: 'Read the chart', body: 'Green bars are money in, red bars money out, the line is cash at week end.' },
      { title: 'Drill into a week', body: 'Click an amount to see exactly which bills or slips are in it.' },
      { title: 'Act on shortfalls', body: 'Use "Chase payments" to work the overdue list, or move payment days.' },
    ],
    related: ['fin/receivables', 'fin/tp-approval', 'fin/dc-payslip'],
    practice: 'ex.fin.cash-plan',
    audio: [
      'Cash plan बताता है कि आने वाले हर हफ़्ते हमारे पास काफ़ी पैसा होगा या नहीं।',
      'सबसे पहले Assumptions में आज का cash और bank balance डालिए, वरना हर हफ़्ता शून्य से शुरू होगा।',
      'Bills, bill date और client के credit days के हिसाब से due होते हैं।',
      'पुराने overdue का सिर्फ़ कुछ percent हर हफ़्ते आएगा, ऐसा माना जाता है।',
      'किसी भी amount पर click कीजिए, अंदर के bills और slips दिख जाएँगे।',
      'Settings बदलने के बाद Save assumptions ज़रूर दबाइए।',
    ],
    quiz: ['q.fin.cashplan-overdue'],
    minutes: 5,
  },
  {
    id: 'fin/detention',
    module: 'fin',
    title: 'Detention Management',
    purpose: 'Workbench that checks each delivery challan\'s reporting and unloading dates, applies the broker/vehicle detention slab and records the detention amount Accounts approves for the transporter.',
    why: 'Transporters claim detention when a truck waits. This screen calculates what is admissible, records the approved amount and shows the deduction where the claim is higher.',
    when: 'Before approving DCs for broker payment, and whenever a transporter raises a detention claim.',
    roles: ['AC', 'SA'],
    upstream: ['ops/dc', 'ops/ldc', 'fin/detention-rules'],
    downstream: ['fin/dc-approval', 'fin/dc-payslip'],
    before: 'The DC (LDC) was created and acknowledged by the supervisor, collection and client with reporting and unloading dates.',
    after: '"Send to DC approval" marks detention Approved and opens DC Approval, where the DC payable is approved.',
    prerequisites: ['DC has a reporting date and an unloading date, and a broker (transporter). Otherwise it is an Exception.'],
    actions: [
      'Use the DC Detention Workbench tab for all DCs, or Exceptions for DCs with missing dates.',
      'Click a DC to open the detention drawer.',
      'Check final reporting (earliest of loading date, DC report date, LR report dates) and final unloading (latest LR unloading date).',
      'Check the detention rule and the system admissible amount; enter the Accounts approved amount.',
      'Click "Save verification" (status Accounts Verified) or "Send to DC approval" (status Approved, opens DC Approval).',
    ],
    records: ['dcs.detention – final dates, days, calculated amount, claimed, approved, deduction (claimed − approved), rule, status and verified time.'],
    validations: [
      '"Send to DC approval" is disabled while a DC has missing reporting date, unloading date or broker.',
      'Chargeable days = elapsed days − free first days − free last days (never below zero).',
      'Slab amount = first tier days × tier rate + remaining days × next-day rate (or all days × rate when no tier).',
      'Approved defaults to the lower of claim and system amount. Deduction = claimed − approved.',
      'Rule chosen automatically: a rule for the DC\'s broker first, then a vehicle-type rule whose freight range matches, then the first active rule.',
    ],
    mistakes: [
      'Approving detention with wrong dates: fix the reporting/unloading dates on the LDC acknowledgment first, the workbench only reads them.',
      'Typing the transporter\'s claim in the drawer and expecting it to be saved: only the approved amount is saved; the claimed amount saved is the one on the client/collection acknowledgment.',
      'Using "Send to DC approval" right after typing a new approved amount: it sends the amount the row had when opened. Click "Save verification" first, reopen the DC, then send.',
      'Assuming the approved detention flows into DC Approval: the DC Approval drawer reads detention from the acknowledgments – type the approved amount in "Detention amt" there.',
    ],
    warnings: ['Detention here is what we pay the transporter. Detention we charge the client comes from the POD and appears on the customer bill as Detention (WH).'],
    fields: [
      { name: 'Final reporting · earliest', help: 'Earliest of LDC loading date, DC report date and LR report dates.' },
      { name: 'Final unloading · latest', help: 'Latest unloading date across the DC\'s LRs.' },
      { name: 'System admissible detention', help: 'Amount from the slab for the chargeable days.' },
      { name: 'Accounts approved', help: 'Amount Accounts accepts. Saved on the DC.' },
      { name: 'Deduction', help: 'Claimed minus approved – the part of the claim not accepted.' },
    ],
    statuses: [
      { status: 'Pending Verification', meaning: 'Not yet verified by Accounts.' },
      { status: 'Exception', meaning: 'Reporting date, unloading date or broker is missing.' },
      { status: 'Accounts Verified', meaning: 'Saved with "Save verification".' },
      { status: 'Approved', meaning: 'Sent to DC approval. Drops out of the "DCs to verify" count.' },
    ],
    example: 'Rule "Bipin Singh standard": first 1 day and last 1 day free, first 2 chargeable days ₹1,000, then ₹1,500. Truck waits 5 days → 3 chargeable days → 2 × ₹1,000 + 1 × ₹1,500 = ₹3,500. Claim ₹6,000, approved ₹3,500 → deduction ₹2,500.',
    walkthrough: [
      { title: 'Clear exceptions first', body: 'Open the Exceptions tab. Ask operations to complete the missing dates on the LDC acknowledgment.' },
      { title: 'Open a DC', body: 'Click a row to see each LR\'s reporting and unloading dates.' },
      { title: 'Check the slab', body: 'See the rule, free days and chargeable days, and the system amount.' },
      { title: 'Approve', body: 'Enter Accounts approved and click "Save verification".' },
      { title: 'Send for payment', body: 'Reopen the DC and click "Send to DC approval".' },
    ],
    related: ['fin/detention-rules', 'fin/dc-approval', 'fin/dc-payslip', 'ops/ldc'],
    practice: 'ex.fin.detention-review',
    audio: [
      'यह Detention Management है। यहाँ transporter के detention claim की जाँच होती है।',
      'Reporting date सबसे पहली ली जाती है और unloading date सबसे आख़िरी।',
      'Rule के free days घटाकर जितने दिन बचते हैं, उन पर slab का rate लगता है।',
      'Claim ज़्यादा है और approved कम, तो फ़र्क deduction बनता है।',
      'Date missing हो तो DC Exception में जाता है, और DC approval पर नहीं भेजा जा सकता।',
      'पहले Save verification कीजिए, फिर DC खोलकर Send to DC approval।',
    ],
    quiz: ['q.fin.detention-slab', 'q.fin.detention-deduction', 'q.fin.detention-exception'],
    minutes: 7,
  },
  {
    id: 'fin/detention-rules',
    module: 'fin',
    title: 'Detention Rules',
    purpose: 'Master list of detention slabs by broker, party and vehicle type: free days, tier days, tier rate and next-day rate.',
    why: 'The Detention workbench picks a rule automatically for every DC, so the slab decides how much detention is admissible.',
    when: 'When a new broker agreement or vehicle-type rate is agreed, or an old rate changes.',
    roles: ['AC', 'SA'],
    upstream: [],
    downstream: ['fin/detention'],
    before: 'The commercial team agreed detention terms with the broker or for a vehicle type.',
    after: 'The workbench uses the rule for every DC that matches it.',
    prerequisites: ['Agreed free days and per-day rates.'],
    actions: ['Click "New rule" or a row to edit.', 'Fill rule name, broker, party, vehicle type, freight range, free first/last days, tier-1 days, tier-1 rate, next-day rate and calculation mode.', 'Click "Save rule".'],
    records: ['detentionRules – one record per rule.'],
    validations: [
      'Matching order in the workbench: broker name equal to the DC\'s transporter → vehicle rule whose vehicle text contains the truck capacity and whose freight range covers the DC freight → first active rule.',
      'Broker must be typed exactly as the transporter name in the master to match.',
    ],
    mistakes: [
      'Typing the broker name differently from the transporter master (for example a short name): the rule never matches and the fallback rule is used.',
      'Leaving Tier-1 days at 0 when there are two rates: the whole period is charged at the next-day rate.',
    ],
    warnings: [
      'Until the first rule is saved, the screen shows three built-in default rules that are not stored.',
      'The "24 Hours" calculation mode only changes how free time is shown in the list; the calculation still counts days.',
    ],
    fields: [
      { name: 'Free first / last days', help: 'Days not charged at the start and end of the wait.' },
      { name: 'Tier-1 days / rate', help: 'How many chargeable days are charged at the first rate.' },
      { name: 'Next-day rate', help: 'Rate for every chargeable day after tier 1.' },
    ],
    example: 'Big truck 32/36 HQ & 38 LQ: freight ₹9,000–₹11,000, first and last day free, ₹1,500 per chargeable day.',
    walkthrough: [
      { title: 'Check existing rules', body: 'Look for a rule for the same broker or vehicle before adding one.' },
      { title: 'Add or edit', body: 'Use the transporter\'s exact name in Broker. Set the freight range for vehicle rules.' },
      { title: 'Set the slab', body: 'Enter free days, tier-1 days and both rates.' },
      { title: 'Save and verify', body: 'Open a DC of that broker in the Detention workbench and confirm the rule is picked.' },
    ],
    related: ['fin/detention'],
    audio: [
      'यहाँ detention के rules रखे जाते हैं — broker के हिसाब से या truck के type के हिसाब से।',
      'Broker का नाम बिलकुल वैसा लिखिए जैसा transporter master में है, वरना rule match नहीं होगा।',
      'Free days, फिर पहले tier के दिन और rate, फिर बाकी दिनों का rate।',
      'Rule save करने के बाद, उस broker का एक DC workbench में खोलकर check कीजिए।',
    ],
    quiz: ['q.fin.detention-slab'],
    minutes: 3,
  },
  {
    id: 'fin/tp-slips',
    module: 'fin',
    title: 'Transporter Payables',
    purpose: 'Makes a payment slip for a market-truck transporter: freight plus detention and hamali, less advance, commission, TDS, damage and stationery.',
    why: 'The slip fixes the balance freight owed per LR and sends it for approval before any payment.',
    when: 'After market-truck LRs are delivered, usually weekly per transporter.',
    roles: ['AC', 'SA'],
    upstream: ['ops/delivery', 'ops/pod'],
    downstream: ['fin/tp-approval', 'fin/cash-plan'],
    before: 'The LR was moved by a market truck with a transporter and was delivered. Advance was paid at loading.',
    after: 'The slip waits in Transporter Approval with status Pending.',
    prerequisites: ['LR vehicle is Market, has market freight details, is Delivered and is not on another slip.'],
    actions: [
      'Choose the Transporter (count of ready LRs shown) and the slip date.',
      'Untick LRs not to be paid now; edit freight, detention, advance, hamali, commission, TDS, damage or stationery per LR.',
      'Click "Generate payment slip" – the printable slip opens.',
      'Print any slip again from the table.',
    ],
    records: ['tpSlips – slip TPS/<n>, rows, totals, payable, pending = payable, status Pending.', 'lrs.tpSlipId set on each LR.', 'Notification "<slip> awaiting approval".'],
    validations: [
      'Balance per LR = freight + detention + hamali − advance − commission − TDS − damage − stationery (₹50 default).',
      'Generate is disabled when no LR is ticked.',
      'Detention and damage are pre-filled from the POD when it exists.',
      'The header shows PAN, TDS rate and whether a PAN declaration is on file.',
    ],
    mistakes: [
      'Generating a slip before the POD is in: POD is not required here, so detention and damage default to 0. Check the POD first or edit the amounts.',
      'Ignoring "no PAN declaration": TDS must then be deducted; check the TDS column before generating.',
    ],
    fields: [
      { name: 'Advance', help: 'Paid at loading, deducted from freight.' },
      { name: 'Commission', help: 'Our commission deducted from the transporter.' },
      { name: 'Stationery', help: 'Fixed ₹50 per LR by default.' },
      { name: 'Bal. freight', help: 'What is still to be paid for the LR.' },
    ],
    statuses: [{ status: 'Pending', meaning: 'Generated, waiting for approval.' }, { status: 'Approved', meaning: 'Approved, can be paid.' }, { status: 'Paid', meaning: 'Pending reached zero.' }],
    example: 'Freight ₹30,000 + hamali ₹500 − advance ₹21,000 − TDS ₹300 − commission ₹500 − stationery ₹50 = balance ₹8,650.',
    walkthrough: [
      { title: 'Pick transporter', body: 'Only delivered market LRs without a slip are listed.' },
      { title: 'Check every column', body: 'Especially advance and TDS. Untick LRs on hold.' },
      { title: 'Generate', body: 'Click "Generate payment slip" and print it.' },
    ],
    related: ['fin/tp-approval', 'fin/cash-plan'],
    practice: 'ex.fin.transporter-payment',
    audio: [
      'यहाँ market truck वाले transporter का payment slip बनता है।',
      'Freight में detention और hamali जुड़ते हैं, advance, commission, TDS, damage और stationery घटते हैं।',
      'POD नहीं आया हो तो detention और damage शून्य रहेंगे, इसलिए पहले check कीजिए।',
      'Slip बनते ही approval के लिए Pending में चला जाता है।',
    ],
    quiz: ['q.fin.tp-flow'],
    minutes: 4,
  },
  {
    id: 'fin/tp-approval',
    module: 'fin',
    title: 'Transporter Approval',
    purpose: 'Approves transporter payment slips and records payments against approved slips.',
    why: 'No transporter is paid without an approved slip. Each payment posts a Cash or Bank Payment voucher.',
    when: 'Approval: by the approver after slips are generated. Payment entry: when the bank transfer or cash payment is made.',
    roles: ['AC', 'SA'],
    upstream: ['fin/tp-slips'],
    downstream: ['fin/ledger', 'fin/tally', 'fin/cash-plan'],
    before: 'A payment slip was generated in Transporter Payables and is Pending.',
    after: 'Approved slips appear in Payment entry; when pending reaches zero the slip shows Paid.',
    prerequisites: ['Slip status Pending (for approval) or Approved with pending > 0 (for payment).'],
    actions: [
      'Payment approval tab: filter Pending/Approved/All, expand a slip to see LR rows, "Approve" one slip or select several and use "Approve payment".',
      'Payment entry tab: click an approved slip or "Record payment", enter date, amount, TDS, paid by, mode and bank/ref, then "Confirm payment".',
    ],
    records: [
      'tpSlips – status Approved with approved by/at; payments added with voucher PV/<n>; pending reduced by amount + TDS.',
      'ledger – Cash Payment or Bank Payment for the amount paid.',
    ],
    validations: [
      'Only Approved slips are listed in Payment entry – Pending slips cannot be paid.',
      'Confirm payment is disabled when amount is empty or more than pending.',
      'Bulk "Approve payment" only approves rows that are Pending.',
    ],
    mistakes: [
      'Entering TDS again on payment when it was already deducted on the slip rows: pending drops by amount + TDS, so the slip closes short.',
      'Paying by cash and choosing a bank ledger: the voucher type follows the mode, the ledger follows "Paid by" – keep them consistent.',
    ],
    statuses: [{ status: 'Pending', meaning: 'Awaiting approval.' }, { status: 'Approved', meaning: 'Ready for payment entry.' }, { status: 'Paid', meaning: 'Pending is zero (stored status remains Approved).' }],
    walkthrough: [
      { title: 'Review', body: 'Expand each Pending slip and check freight, advance, TDS and balance per LR.' },
      { title: 'Approve', body: 'Approve single slips or select many and click "Approve payment".' },
      { title: 'Pay', body: 'In Payment entry, record the amount actually transferred with UTR.' },
    ],
    related: ['fin/tp-slips', 'fin/ledger'],
    practice: 'ex.fin.transporter-payment',
    audio: [
      'यहाँ transporter slips approve होते हैं, और फिर payment record होता है।',
      'Pending slip को खोलकर हर LR का balance देखिए, फिर Approve कीजिए।',
      'Payment entry में सिर्फ़ approved slips आते हैं।',
      'Payment करने पर ledger में payment voucher बनता है।',
    ],
    quiz: ['q.fin.tp-flow'],
    minutes: 4,
  },
  {
    id: 'fin/dc-approval',
    module: 'fin',
    title: 'DC Approval',
    purpose: 'Approves lorry delivery challans (LDC) for broker payment after supervisor, collection and client acknowledgments, deducting shortage and damage.',
    why: 'The approved payable is what the broker will be paid through a DC payment slip.',
    when: 'After the branch supervisor acknowledges delivery – ideally after collection and client acknowledgments too.',
    roles: ['AC', 'SA'],
    upstream: ['ops/ldc', 'fin/detention'],
    downstream: ['fin/dc-payslip'],
    before: 'The DC was delivered and acknowledged; detention was verified in Detention Management.',
    after: 'Approved DCs appear in DC Payment Slips for that broker.',
    prerequisites: ['Supervisor acknowledgment is recorded; DC is not yet approved or rejected.'],
    actions: [
      'Filter "All acks received" or "Waiting for acks"; the S / C / Cl chips show supervisor, collection and client acknowledgments.',
      'Click a DC, check transporter, payment mode, freight, advance, shortage, damage, parking, detention amount/days, other expenses and labour.',
      'Click "Approve ₹…" or "Reject".',
    ],
    records: ['dcs.approval – amounts, payable, approved by/at; dcs.status Approved (or Rejected with approval cleared).'],
    validations: [
      'Freight payable = freight − advance + detention + parking + other + labour − shortage − damage.',
      'Shortage and damage are pre-filled from the collection and client acknowledgments.',
      'A warning shows when collection or client acknowledgment is missing; approval is still possible on the supervisor acknowledgment alone.',
      'Rejected DCs leave the approval list.',
    ],
    mistakes: [
      'Approving while acknowledgments are missing: later shortage or damage reported by the client will not be deducted.',
      'Forgetting detention: the drawer reads detention from the acknowledgments, not from the Detention workbench – type the approved detention in "Detention amt".',
    ],
    statuses: [{ status: 'Delivered', meaning: 'Acknowledged, waiting for approval.' }, { status: 'Approved', meaning: 'Payable fixed.' }, { status: 'Rejected', meaning: 'Not approved for payment.' }, { status: 'Payslip Generated', meaning: 'Added to a DC payment slip.' }, { status: 'Paid', meaning: 'DC payment slip fully paid.' }],
    example: 'Freight ₹12,000 − advance ₹6,000 + parking ₹200 + labour ₹300 + detention ₹1,500 − damage ₹500 = payable ₹7,500.',
    walkthrough: [
      { title: 'Check acknowledgments', body: 'Prefer DCs with all three chips green.' },
      { title: 'Open the DC', body: 'Compare advance and deductions with the acknowledgments.' },
      { title: 'Add detention', body: 'Type the detention approved in Detention Management.' },
      { title: 'Approve or reject', body: 'The payable shown on the button is what will be paid.' },
    ],
    related: ['fin/detention', 'fin/dc-payslip', 'ops/ldc'],
    practice: 'ex.fin.dc-payment',
    audio: [
      'यहाँ delivery challan को broker payment के लिए approve किया जाता है।',
      'S, C और Cl — supervisor, collection और client की acknowledgment। तीनों हरे हों तो अच्छा।',
      'Payable है freight minus advance, plus detention, parking, labour, minus shortage और damage।',
      'Detention workbench का approved amount यहाँ खुद नहीं आता, Detention amt में डालिए।',
    ],
    quiz: ['q.fin.dc-payable'],
    minutes: 4,
  },
  {
    id: 'fin/dc-payslip',
    module: 'fin',
    title: 'DC Payment Slips',
    purpose: 'Groups approved delivery challans of one broker into a payment slip with TDS, then records DC payments.',
    why: 'Brokers are paid per slip, not per DC. Payment posts a Cash/Bank Payment voucher and marks the DCs Paid when the slip is cleared.',
    when: 'After DCs are approved, usually weekly per broker.',
    roles: ['AC', 'SA'],
    upstream: ['fin/dc-approval'],
    downstream: ['fin/ledger', 'fin/tally', 'fin/cash-plan'],
    before: 'DCs were approved in DC Approval with a payable amount.',
    after: 'The slip shows Pending until paid; full payment marks all its DCs Paid.',
    prerequisites: ['Approved DCs without a payment slip.'],
    actions: [
      'Generate tab: choose broker, TDS % (default 1) and remark, tick DCs, click "Generate slip" (print opens).',
      'DC payment entry tab: click a slip or "Record payment", enter date, amount, paid by, mode and reference, then "Confirm payment".',
    ],
    records: [
      'dcPayslips – slip DCPS/<n> with total, TDS, net and pending = net.',
      'dcs – payslipId set, status Payslip Generated; status Paid when the slip pending reaches zero.',
      'ledger – Cash Payment / Bank Payment voucher PV/<n> for each payment.',
    ],
    validations: ['Net = total payable − TDS (TDS % × total, rounded).', 'Payment amount must be above zero and not more than pending.', 'Generate is disabled until at least one DC is ticked.'],
    mistakes: ['Mixing brokers: pick the broker first – the list shows only that broker\'s DCs.', 'Recording part payments without a reference: later reconciliation with the bank is hard.'],
    statuses: [{ status: 'Pending', meaning: 'Amount left to pay on the slip.' }, { status: 'Paid', meaning: 'Pending reached zero; DCs marked Paid.' }],
    example: 'Three DCs payable ₹7,500 + ₹6,700 + ₹8,800 = ₹23,000. TDS 1% = ₹230. Net slip ₹22,770.',
    walkthrough: [
      { title: 'Choose broker', body: 'Only approved DCs without a slip are shown.' },
      { title: 'Set TDS', body: 'Use the broker\'s TDS rate.' },
      { title: 'Generate and print', body: 'Tick DCs and click "Generate slip".' },
      { title: 'Pay', body: 'Record the payment in DC payment entry.' },
    ],
    related: ['fin/dc-approval', 'fin/ledger'],
    practice: 'ex.fin.dc-payment',
    audio: [
      'यहाँ एक broker के approved DCs मिलाकर payment slip बनता है।',
      'TDS percent डालिए, net अपने आप निकलता है।',
      'Payment record करने पर ledger में payment voucher बनता है।',
      'पूरा payment होते ही उस slip के सारे DCs Paid हो जाते हैं।',
    ],
    quiz: ['q.fin.dc-payable'],
    minutes: 3,
  },
  {
    id: 'fin/hamali',
    module: 'fin',
    title: 'Hamali Payments',
    purpose: 'Pays loading/unloading gangs (hamals) for GRN at the rail head, branch GRN (DGRN) and VP loading, with TDS.',
    why: 'Each entry\'s labour charge is paid once; paid entries are marked so they cannot be paid again.',
    when: 'Weekly or at the end of a work period, per hamal or gang.',
    roles: ['AC', 'SA'],
    upstream: ['ops/grn', 'ops/dgrn', 'ops/vp-loading'],
    downstream: ['fin/ledger', 'fin/tally'],
    before: 'GRN, DGRN or VP loading entries were saved with a labour (hamal) and labour charge.',
    after: 'Paid entries disappear from the unpaid list and the payment appears under "Payments made".',
    prerequisites: ['Unpaid entries with a labour charge in the chosen date range.'],
    actions: ['Pick type: GRN station, Branch GRN or VP loading.', 'Set from/to dates and Labour.', 'Tick entries, set payment date, TDS %, paid by and mode.', 'Click "Pay hamali" – the payment print opens.'],
    records: ['hamaliPayments – HP/<n> with entries, total, TDS, net.', 'grns / dgrns / schedule loads – hamaliPaymentId set.', 'ledger – Cash Payment (CP/<n>) or Bank Payment for the net amount.'],
    validations: ['TDS = total × TDS % (default 1%), rounded. Net = total − TDS.', 'Pay hamali is disabled until an entry is ticked.'],
    mistakes: ['Leaving Labour on "All hamals" and ticking entries of different hamals: the payment is recorded against the first ticked entry\'s hamal. Filter one hamal at a time.'],
    example: 'Entries ₹3,000 + ₹2,500 + ₹2,500 = ₹8,000. TDS 1% = ₹80. Net cash paid ₹7,920.',
    walkthrough: [
      { title: 'Choose type and period', body: 'Select GRN, Branch GRN or VP loading and the dates.' },
      { title: 'Filter the hamal', body: 'Pick one labour so the payment goes to the right person.' },
      { title: 'Pay', body: 'Tick entries, check TDS and net, choose mode, click "Pay hamali".' },
    ],
    related: ['fin/ledger'],
    practice: 'ex.fin.hamali',
    audio: [
      'यहाँ hamali, यानी loading और unloading gang का payment होता है।',
      'पहले type चुनिए — GRN station, branch GRN या VP loading।',
      'एक बार में एक ही hamal चुनिए, ताकि payment सही नाम पर जाए।',
      'TDS घटाकर net payment ledger में post होता है, और वह entry दोबारा pay नहीं होती।',
    ],
    quiz: ['q.fin.hamali-tds'],
    minutes: 3,
  },
  {
    id: 'fin/ledger',
    module: 'fin',
    title: 'Ledger',
    purpose: 'Manual vouchers, party-wise ledger statements and the audit list of every voucher posted by billing, receipts, payments, hamali and log slips.',
    why: 'It is the single place to see a client\'s or transporter\'s running balance and to check which vouchers are not yet in Tally.',
    when: 'For entries that have no screen of their own (rent, bank charges, interest), for statements to clients/transporters, and before Tally export.',
    roles: ['AC', 'SA'],
    upstream: ['fin/billing', 'fin/client-payments', 'fin/tp-approval', 'fin/dc-payslip', 'fin/hamali'],
    downstream: ['fin/tally'],
    before: 'Other finance screens post their vouchers here automatically.',
    after: 'Vouchers are exported to Tally from Tally Export.',
    prerequisites: ['For a manual voucher: ledger, amount, debit/credit and narration.'],
    actions: [
      'Ledger entry: choose ledger type (Client, Transporter, Other) and ledger, date, time, amount, Debit or Credit, payment by, mode and narration, then "Post voucher".',
      'Account ledger: choose party and ledger and a date range to see debit, credit and running balance.',
      'Ledger audit: all vouchers with type, party, posted by and Tally status (Synced / Not Synced); print any voucher.',
    ],
    records: ['ledger – Debit entry → PV/<n> (Bank or Cash Payment); Credit entry → RV/<n> (Bank or Cash Receipt). Cheque counts as Bank.'],
    validations: ['Post voucher is disabled until a ledger is chosen and amount is above zero.', 'Running balance = cumulative debit − credit for the period shown.'],
    mistakes: [
      'Posting a manual receipt for a client payment: it does not reduce any bill. Client receipts must be recorded in Client Payments.',
      'Choosing Cash mode for a bank entry: the voucher type becomes Cash Payment/Receipt.',
    ],
    statuses: [{ status: 'Synced', meaning: 'Voucher already transferred to Tally.' }, { status: 'Not Synced', meaning: 'Voucher not yet transferred.' }],
    example: 'Client statement: Sales voucher ₹52,500 debit, Bank Receipt ₹21,000 credit (₹20,000 + ₹1,000 TDS) → closing balance ₹31,500.',
    walkthrough: [
      { title: 'Manual voucher', body: 'Use only for entries without their own screen.' },
      { title: 'Statement', body: 'Pick the party and period; read debit, credit and balance.' },
      { title: 'Audit', body: 'Filter Tally = Not Synced before an export.' },
    ],
    related: ['fin/tally', 'fin/client-payments'],
    practice: 'ex.fin.ledger-entry',
    audio: [
      'Ledger में हर voucher दिखता है — bill, receipt, payment, hamali, सब।',
      'Ledger entry सिर्फ़ उन खर्चों के लिए है जिनकी अपनी screen नहीं है, जैसे rent या bank charges।',
      'Client का payment यहाँ नहीं, Client Payments में record कीजिए, तभी bill का pending घटेगा।',
      'Ledger audit में देखिए कौन से voucher अभी Tally में नहीं गए।',
    ],
    quiz: ['q.fin.receipt-delete-effect'],
    minutes: 4,
  },
  {
    id: 'fin/freight-update',
    module: 'fin',
    title: 'Update LR Freight',
    purpose: 'Changes the freight on unbilled, finalised LRs in bulk, for example after a rate revision.',
    why: 'The bill takes the LR freight, so it must be right before billing. Each change is logged on the LR.',
    when: 'Before billing, when the agreed rate changed or an LR was booked with a wrong freight.',
    roles: ['AC', 'SA'],
    upstream: ['ops/lr-new', 'cust/rate-contracts'],
    downstream: ['fin/billing'],
    before: 'LRs were finalised with a freight amount.',
    after: 'The new freight is used when the LR is billed.',
    prerequisites: ['LR is finalised and not billed.'],
    actions: ['Filter the Client.', 'Enter the New freight.', 'Tick the LRs and click "Update <n> LR".'],
    records: ['lrs.freight, freightUpdatedBy, freightUpdatedAt; LR event "Freight updated to ₹…".'],
    validations: ['Only finalised LRs without a bill are listed.', 'The button is disabled until LRs are ticked and a non-zero freight is entered.', 'The same new freight is applied to every ticked LR.'],
    mistakes: ['Ticking LRs with different routes or loads: all of them get the same freight. Update one rate group at a time.', 'Trying to fix a billed LR here: it is not listed. Use a Supplementary bill, or delete receipts and the bill first.'],
    example: 'Five Jalgaon → Pune LRs booked at ₹21,000 after the rate contract changed to ₹23,500: tick all five, enter 23500, update.',
    walkthrough: [
      { title: 'Filter client', body: 'Show only that client\'s unbilled LRs.' },
      { title: 'Enter new freight', body: 'The New freight column previews it for ticked LRs.' },
      { title: 'Update', body: 'Click the button; check the LR history shows the change.' },
    ],
    related: ['fin/billing'],
    practice: 'ex.fin.freight-update',
    audio: [
      'यहाँ बिना bill वाले LR का freight बदला जाता है।',
      'जितने LR tick करेंगे, सब पर एक ही नया freight लगेगा।',
      'Bill बन चुका है तो LR यहाँ दिखेगा ही नहीं।',
    ],
    quiz: ['q.fin.freight-after-bill'],
    minutes: 2,
  },
  {
    id: 'fin/tally',
    module: 'fin',
    title: 'Tally Export',
    purpose: 'Creates Tally XML and Excel files of ledger vouchers for a period and marks transferred vouchers as Synced.',
    why: 'Books are finalised in Tally. Marking vouchers Synced stops them being exported twice.',
    when: 'Daily or weekly, after billing, receipts and payments are entered.',
    roles: ['AC', 'SA'],
    upstream: ['fin/ledger'],
    downstream: [],
    before: 'Vouchers were posted by finance screens and are Not Synced.',
    after: 'Transferred vouchers show Synced in Ledger audit and a batch is added to Transfer history.',
    prerequisites: ['Vouchers in the date range for the chosen voucher types.'],
    actions: [
      'Set from/to dates and Action (Create or Alter).',
      'Tick voucher types: Journal, Sales, Logslip, Cash Payment, Cash Receipt, Bank Receipt, Bank Payment.',
      'Keep "Only vouchers not yet synced" ticked for normal export.',
      '"Download Excel" or "Submit (generate XML)" downloads files; "Transfer to Tally" marks the vouchers Synced.',
    ],
    records: ['ledger.tally = true for transferred vouchers.', 'tallyBatches – period, action, voucher types, count, by.'],
    validations: ['"Transfer to Tally" is disabled when no voucher matches.', 'In Alter mode, already-synced vouchers are included even with "Only vouchers not yet synced" ticked.'],
    mistakes: [
      'Clicking "Transfer to Tally" before importing the XML into Tally: vouchers are marked Synced but are not in Tally.',
      'Un-ticking "Only vouchers not yet synced" in Create mode: old vouchers are exported again and duplicated in Tally.',
      'Deleting a receipt or bill after it was synced: the ERP removes the voucher but Tally keeps it – export an Alter or correct Tally manually.',
    ],
    statuses: [{ status: 'Synced', meaning: 'Marked as transferred.' }, { status: 'Not Synced', meaning: 'Not yet transferred.' }],
    walkthrough: [
      { title: 'Choose period and types', body: 'Check the voucher count, debit and credit totals.' },
      { title: 'Generate XML', body: 'Click "Submit (generate XML)" and import the file into Tally.' },
      { title: 'Mark synced', body: 'After a successful import, click "Transfer to Tally".' },
    ],
    related: ['fin/ledger'],
    practice: 'ex.fin.tally',
    audio: [
      'यहाँ ERP के vouchers Tally के लिए XML file में निकलते हैं।',
      'Submit से file download होती है, उसे Tally में import कीजिए।',
      'Import होने के बाद Transfer to Tally दबाइए, तो voucher Synced हो जाते हैं।',
      'Only vouchers not yet synced को tick रखिए, वरना Tally में double entry हो जाएगी।',
    ],
    quiz: ['q.fin.tally-sync'],
    minutes: 3,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------------------
const TF = [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }];

export const questions: Question[] = [
  {
    id: 'q.fin.bill-needs-pod', module: 'fin', type: 'scenario', difficulty: 1,
    prompt: 'What should you do?',
    scenario: 'An LR for Deccan Home Appliances was delivered three days ago. It is not in the "LR to bill" list; the "Waiting for POD" count shows 1. Deccan does not have "Allow bill without acknowledgment".',
    options: [
      { id: 'a', text: 'Ask operations to record the POD on the POD screen; the LR will then appear for billing.' },
      { id: 'b', text: 'Change the LR payment mode to To Pay so it can be billed.' },
      { id: 'c', text: 'Use Update LR freight to push it into billing.' },
      { id: 'd', text: 'Make a manual Sales voucher in Ledger.' },
    ],
    answer: 'a',
    explanation: 'Billing lists only delivered To Be Billed LRs that have a POD, unless the client is allowed billing without acknowledgment. Record the POD on ops/pod; the LR then moves to "Ready to bill".',
    screens: ['fin/billing', 'ops/pod'],
  },
  {
    id: 'q.fin.bill-without-ack', module: 'fin', type: 'tf', difficulty: 1,
    prompt: 'Some clients can be billed as soon as the LR is delivered, before the POD arrives.',
    options: TF, answer: 't',
    explanation: 'True. If the bill-head client has "Allow bill without acknowledgment" in the customer master, delivered To Be Billed LRs are eligible without POD. For everyone else POD is required.',
    screens: ['fin/billing'],
  },
  {
    id: 'q.fin.gst-intra', module: 'fin', type: 'mcq', difficulty: 1,
    prompt: 'A bill for a Pune client has place of supply Maharashtra. Which tax does the ERP apply by default?',
    options: [
      { id: 'a', text: 'IGST 5%' },
      { id: 'b', text: 'CGST 2.5% + SGST 2.5%' },
      { id: 'c', text: 'No GST, freight is exempt' },
      { id: 'd', text: 'CGST 6% + SGST 6%' },
    ],
    answer: 'b',
    explanation: 'Place of supply Maharashtra is intra-state, so the screen shows CGST and SGST (default 2.5% each). Any other state shows IGST (default 5%).',
    screens: ['fin/billing'],
  },
  {
    id: 'q.fin.gst-inter', module: 'fin', type: 'scenario', difficulty: 2,
    prompt: 'How will GST appear on this bill?',
    scenario: 'You bill Brahmaputra Distributors, Guwahati (Assam). Taxable value after adjustments is ₹80,000. You keep the default rate.',
    options: [
      { id: 'a', text: 'IGST 5% = ₹4,000; bill total ₹84,000' },
      { id: 'b', text: 'CGST 2.5% + SGST 2.5% = ₹4,000; bill total ₹84,000' },
      { id: 'c', text: 'IGST 12% = ₹9,600; bill total ₹89,600' },
      { id: 'd', text: 'No tax because the client is out of state' },
    ],
    answer: 'a',
    explanation: 'Place of supply defaults to the client city\'s state. Assam is not Maharashtra, so IGST applies (default 5%): ₹80,000 × 5% = ₹4,000.',
    screens: ['fin/billing'],
  },
  {
    id: 'q.fin.tds-default-amount', module: 'fin', type: 'scenario', difficulty: 2,
    prompt: 'Which amounts does Client Payments pre-fill when you pick this bill?',
    scenario: 'Bill total ₹52,500 = taxable ₹50,000 + GST ₹2,500. No receipts yet. The client\'s TDS is 2%.',
    options: [
      { id: 'a', text: 'TDS ₹1,050, Received ₹51,450' },
      { id: 'b', text: 'TDS ₹1,000, Received ₹51,500' },
      { id: 'c', text: 'TDS ₹0, Received ₹52,500' },
      { id: 'd', text: 'TDS ₹1,000, Received ₹52,500' },
    ],
    answer: 'b',
    explanation: 'TDS is pre-filled as the client\'s TDS % of the taxable value (before GST): 2% × ₹50,000 = ₹1,000. Received is pre-filled as pending − TDS = ₹51,500.',
    screens: ['fin/client-payments'],
  },
  {
    id: 'q.fin.partial-status', module: 'fin', type: 'scenario', difficulty: 2,
    prompt: 'What is the result after you confirm this receipt?',
    scenario: 'Bill pending ₹52,500. The client sends ₹20,000 now and promises the rest next month. You enter Received ₹20,000 and TDS 0.',
    options: [
      { id: 'a', text: 'Bill pending ₹32,500; the linked order/load plan shows Payment Partial; the bill stays Due or Overdue.' },
      { id: 'b', text: 'Bill becomes Paid because a receipt exists.' },
      { id: 'c', text: 'The screen blocks it because partial payments are not allowed.' },
      { id: 'd', text: 'Bill pending ₹52,500 until the second receipt.' },
    ],
    answer: 'a',
    explanation: 'Each receipt reduces pending by received + TDS + damage + rate difference. Pending above zero means Payment Partial on the linked load plan/order; the bill shows Paid only when pending reaches zero.',
    screens: ['fin/client-payments', 'fin/billing'],
  },
  {
    id: 'q.fin.paid-rule', module: 'fin', type: 'tf', difficulty: 1,
    prompt: 'TDS, damage deduction and rate difference recorded on a receipt also count towards settling the bill.',
    options: TF, answer: 't',
    explanation: 'True. Pending is reduced by received + TDS + damage + rate difference. A bill with ₹51,500 received and ₹1,000 TDS on a ₹52,500 total is Paid.',
    screens: ['fin/client-payments'],
  },
  {
    id: 'q.fin.second-receipt-tds', module: 'fin', type: 'scenario', difficulty: 3,
    prompt: 'What should you change before confirming?',
    scenario: 'The first receipt on a bill recorded ₹30,000 received and ₹1,000 TDS. Now the balance ₹21,500 arrives in the bank. When you pick the bill, TDS shows ₹1,000 again and Received shows ₹20,500.',
    options: [
      { id: 'a', text: 'Nothing – confirm as shown.' },
      { id: 'b', text: 'Set TDS to 0 and Received to ₹21,500.' },
      { id: 'c', text: 'Enter the ₹1,000 as Rate difference.' },
      { id: 'd', text: 'Delete the first receipt and enter one combined receipt.' },
    ],
    answer: 'b',
    explanation: 'The screen pre-fills TDS for the whole bill every time a bill is picked, even if TDS was already deducted. TDS was taken on the first receipt, so this one is ₹21,500 received with TDS 0, which settles the bill exactly.',
    screens: ['fin/client-payments'],
  },
  {
    id: 'q.fin.delete-bill-guard', module: 'fin', type: 'scenario', difficulty: 2,
    prompt: 'What happens when you try to delete this bill?',
    scenario: 'A bill was generated with the wrong client. The client already paid part of it and the receipt RV/418 is recorded. You open Admin → Data corrections → Delete bill.',
    options: [
      { id: 'a', text: 'The bill is deleted and the receipt moves to another bill.' },
      { id: 'b', text: 'It is blocked with "Delete linked receipts before deleting this bill".' },
      { id: 'c', text: 'The bill is deleted and the receipt stays as an advance.' },
      { id: 'd', text: 'Only the LRs are removed and the bill total becomes zero.' },
    ],
    answer: 'b',
    explanation: 'A bill (or one LR on it) cannot be deleted while any receipt is linked. Delete the receipt first; then deleting the bill returns its LRs to the billing queue and removes the sales voucher.',
    screens: ['fin/billing', 'fin/client-payments', 'admin/corrections'],
  },
  {
    id: 'q.fin.rollback-order', module: 'fin', type: 'order', difficulty: 3,
    prompt: 'A paid-in-part bill has the wrong freight on one LR. Put the correction steps in order.',
    items: [
      { id: 'r', text: 'Delete the receipt(s) on the bill' },
      { id: 'b', text: 'Delete the bill (Admin → Data corrections)' },
      { id: 'f', text: 'Correct the freight in Update LR freight' },
      { id: 'n', text: 'Generate the bill again and re-enter the receipt' },
    ],
    answer: ['r', 'b', 'f', 'n'],
    explanation: 'Rollback goes backwards: receipts block bill deletion, and a billed LR is not listed in Update LR freight. After the bill is deleted the LR is unbilled again, so its freight can be fixed and billed afresh.',
    screens: ['fin/client-payments', 'fin/freight-update', 'fin/billing', 'admin/corrections'],
  },
  {
    id: 'q.fin.receipt-delete-effect', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'What does deleting a client receipt do?',
    options: [
      { id: 'a', text: 'Only hides it from the Receipts table.' },
      { id: 'b', text: 'Adds the receipt\'s received + TDS + damage + rate difference back to the bill pending (up to the bill total), removes its voucher from the ledger and recalculates the status.' },
      { id: 'c', text: 'Deletes the bill as well.' },
      { id: 'd', text: 'Reverses the voucher in Tally automatically.' },
    ],
    answer: 'b',
    explanation: 'deleteReceipt restores pending (capped at the bill total), removes the RV voucher from the ledger and sets the load plan/order to Paid, Payment Partial or Billed depending on what is left. Tally is not changed automatically.',
    screens: ['fin/client-payments', 'fin/ledger'],
  },
  {
    id: 'q.fin.pod-delete-billed', module: 'fin', type: 'tf', difficulty: 2,
    prompt: 'You can delete the POD of an LR that is already on a bill.',
    options: TF, answer: 'f',
    explanation: 'False. The Delete action is hidden for billed LRs and the store blocks it with "Delete the bill before removing POD".',
    screens: ['ops/pod', 'fin/billing'],
  },
  {
    id: 'q.fin.freight-after-bill', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'The client agrees to pay ₹2,000 more freight on an LR that is already billed and unpaid. What is the quickest correct way?',
    options: [
      { id: 'a', text: 'Update LR freight – the bill updates itself.' },
      { id: 'b', text: 'Add a Supplementary bill of ₹2,000 on that bill from the Bill register.' },
      { id: 'c', text: 'Post a manual Credit voucher in Ledger.' },
      { id: 'd', text: 'Record a negative receipt.' },
    ],
    answer: 'b',
    explanation: 'Billed LRs are not listed in Update LR freight. A Supplementary bill adds the amount to the bill total and pending. Note it adds no GST and posts no separate voucher; if tax must be charged, delete and re-bill instead.',
    screens: ['fin/freight-update', 'fin/billing'],
  },
  {
    id: 'q.fin.ageing', module: 'fin', type: 'scenario', difficulty: 2,
    prompt: 'Where does this bill appear in Receivables?',
    scenario: 'Bill dated 40 days before the As on date, pending ₹52,500. Client credit days: 45.',
    options: [
      { id: 'a', text: '31–60 bucket, not overdue' },
      { id: 'b', text: '31–60 bucket and overdue' },
      { id: 'c', text: '0–30 bucket, not overdue' },
      { id: 'd', text: '61–90 bucket and overdue' },
    ],
    answer: 'a',
    explanation: 'Buckets count days since the bill date (40 → 31–60). Overdue means older than the client\'s credit days; 40 is within 45, so it is not overdue yet.',
    screens: ['fin/receivables'],
  },
  {
    id: 'q.fin.credit-hold', module: 'fin', type: 'next', difficulty: 2,
    prompt: 'A client has crossed its credit limit with large 90+ day dues, and accounts decide to stop new business. What is the next step in the ERP?',
    options: [
      { id: 'a', text: 'Receivables → row action "Put on credit hold".' },
      { id: 'b', text: 'Delete the client\'s open bills.' },
      { id: 'c', text: 'Set the client\'s TDS to 0.' },
      { id: 'd', text: 'Change the client\'s credit days to 0 in Cash Plan.' },
    ],
    answer: 'a',
    explanation: 'Credit hold sets "Disallow new LR" on the customer. New orders and new LRs for that client are then blocked; booking and order confirmation show a warning. Lift the hold after payment.',
    screens: ['fin/receivables'],
  },
  {
    id: 'q.fin.detention-slab', module: 'fin', type: 'scenario', difficulty: 3,
    prompt: 'What is the system admissible detention?',
    scenario: 'Rule: first 1 day free, last 1 day free, tier-1 = 2 days at ₹1,000, then ₹1,500 per day. Final reporting to final unloading = 5 days.',
    options: [
      { id: 'a', text: '₹7,500' },
      { id: 'b', text: '₹3,500' },
      { id: 'c', text: '₹5,000' },
      { id: 'd', text: '₹3,000' },
    ],
    answer: 'b',
    explanation: 'Chargeable days = 5 − 1 − 1 = 3. First 2 days × ₹1,000 = ₹2,000, remaining 1 day × ₹1,500 = ₹1,500. Total ₹3,500.',
    screens: ['fin/detention', 'fin/detention-rules'],
  },
  {
    id: 'q.fin.detention-deduction', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'The transporter claimed ₹6,000 detention. The slab allows ₹3,500 and Accounts approves ₹3,500. What does the workbench show as deduction?',
    options: [
      { id: 'a', text: '₹0' },
      { id: 'b', text: '₹2,500' },
      { id: 'c', text: '₹3,500' },
      { id: 'd', text: '₹6,000' },
    ],
    answer: 'b',
    explanation: 'Deduction = claimed − approved = ₹6,000 − ₹3,500 = ₹2,500. Only the approved amount is payable to the transporter.',
    screens: ['fin/detention'],
  },
  {
    id: 'q.fin.detention-exception', module: 'fin', type: 'spot', difficulty: 2,
    prompt: 'Which DC cannot be sent to DC approval from the Detention workbench?',
    options: [
      { id: 'a', text: 'A DC whose claim is higher than the system amount' },
      { id: 'b', text: 'A DC with no unloading date on its LRs or acknowledgments' },
      { id: 'c', text: 'A DC whose broker has no own rule (a vehicle or default rule is used)' },
      { id: 'd', text: 'A DC where Accounts approved less than claimed' },
    ],
    answer: 'b',
    explanation: 'Missing reporting date, unloading date or broker makes the DC an Exception and disables "Send to DC approval". Higher claims and partial approvals are normal – they create a deduction.',
    screens: ['fin/detention'],
  },
  {
    id: 'q.fin.dc-payable', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'Freight ₹12,000, advance ₹6,000, parking ₹200, labour ₹300, detention ₹1,500, damage ₹500. What is the DC freight payable?',
    options: [
      { id: 'a', text: '₹7,500' },
      { id: 'b', text: '₹8,500' },
      { id: 'c', text: '₹6,500' },
      { id: 'd', text: '₹13,500' },
    ],
    answer: 'a',
    explanation: 'Payable = freight − advance + detention + parking + other + labour − shortage − damage = 12,000 − 6,000 + 1,500 + 200 + 300 − 500 = ₹7,500.',
    screens: ['fin/dc-approval', 'fin/dc-payslip'],
  },
  {
    id: 'q.fin.tp-flow', module: 'fin', type: 'order', difficulty: 1,
    prompt: 'Put the market-truck transporter payment steps in order.',
    items: [
      { id: 'g', text: 'Generate payment slip (Transporter Payables)' },
      { id: 'a', text: 'Approve the slip (Transporter Approval)' },
      { id: 'p', text: 'Record the payment (Payment entry)' },
      { id: 't', text: 'Export the payment voucher (Tally Export)' },
    ],
    answer: ['g', 'a', 'p', 't'],
    explanation: 'Slips start Pending; only Approved slips appear in Payment entry. The payment posts a Cash/Bank Payment voucher, which is then exported to Tally.',
    screens: ['fin/tp-slips', 'fin/tp-approval', 'fin/tally'],
  },
  {
    id: 'q.fin.tally-sync', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'What does "Transfer to Tally" do?',
    options: [
      { id: 'a', text: 'Posts the vouchers directly into Tally over the network.' },
      { id: 'b', text: 'Marks the listed vouchers as Synced and adds a batch to Transfer history.' },
      { id: 'c', text: 'Deletes the vouchers from the ERP ledger.' },
      { id: 'd', text: 'Downloads the Excel file.' },
    ],
    answer: 'b',
    explanation: 'The XML file comes from "Submit (generate XML)" and is imported into Tally. "Transfer to Tally" marks the vouchers Synced so "Only vouchers not yet synced" skips them next time.',
    screens: ['fin/tally', 'fin/ledger'],
  },
  {
    id: 'q.fin.cashplan-overdue', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'With default Cash Plan assumptions, how are already-overdue customer bills counted?',
    options: [
      { id: 'a', text: 'All overdue money is expected in week 1.' },
      { id: 'b', text: '5% of the overdue total is expected each week; bills overdue more than 90 days are left out.' },
      { id: 'c', text: 'Overdue bills are ignored completely.' },
      { id: 'd', text: 'They are expected on bill date + 90 days.' },
    ],
    answer: 'b',
    explanation: 'Overdue bills are not placed on their past due date. The plan assumes "Overdue collected per week" (default 5%) of what is still overdue, and leaves out bills overdue longer than the cut-off (default 90 days).',
    screens: ['fin/cash-plan'],
  },
  {
    id: 'q.fin.billing-spot', module: 'fin', type: 'spot', difficulty: 2,
    prompt: 'Which statement about Customer Billing is WRONG?',
    options: [
      { id: 'a', text: 'A blank bill number is auto-numbered as SKT/B/<n>/<financial year>.' },
      { id: 'b', text: 'Detention and damage from the POD are pre-filled on the LR row.' },
      { id: 'c', text: 'A delivered LR with payment mode "To Pay" can be selected for a bill.' },
      { id: 'd', text: 'Generating the bill posts a Sales voucher to the ledger.' },
    ],
    answer: 'c',
    explanation: 'Only "To Be Billed" LRs are listed for billing. "To Pay" freight is collected at delivery, so it is never billed. The other three statements are how the screen works.',
    screens: ['fin/billing'],
  },
  {
    id: 'q.fin.hamali-tds', module: 'fin', type: 'mcq', difficulty: 1,
    prompt: 'You pay ₹8,000 of GRN hamali by cash with TDS 1%. What is posted?',
    options: [
      { id: 'a', text: 'Cash Payment of ₹8,000; TDS is ignored.' },
      { id: 'b', text: 'Cash Payment of ₹7,920; the entries are marked paid and leave the unpaid list.' },
      { id: 'c', text: 'Bank Payment of ₹8,080.' },
      { id: 'd', text: 'Nothing until the payment is approved.' },
    ],
    answer: 'b',
    explanation: 'TDS = ₹8,000 × 1% = ₹80, net ₹7,920. Pay hamali posts a Cash Payment (mode Cash) for the net and marks each entry with the payment so it cannot be paid again.',
    screens: ['fin/hamali'],
  },
  {
    id: 'q.fin.overpay', module: 'fin', type: 'mcq', difficulty: 2,
    prompt: 'On Client Payments, pending is ₹10,000. You enter Received ₹10,000 and TDS ₹200. What happens?',
    options: [
      { id: 'a', text: 'The bill is settled and ₹200 is kept as advance.' },
      { id: 'b', text: 'The balance line turns red ("exceeds pending") and Confirm payment is disabled.' },
      { id: 'c', text: 'The ERP reduces TDS to 0 automatically.' },
      { id: 'd', text: 'The receipt is saved and pending becomes −₹200.' },
    ],
    answer: 'b',
    explanation: 'Received + TDS + damage + rate difference may not exceed pending (+₹1 rounding). Correct the received amount or TDS to match the remittance.',
    screens: ['fin/client-payments'],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Practice exercises (sample data from buildSeed())
// ---------------------------------------------------------------------------------------------------------------
export const exercises: Exercise[] = [
  {
    id: 'ex.fin.generate-bill', title: 'Bill a POD-received LR', module: 'fin', roles: ['AC', 'SA'], minutes: 6,
    summary: 'Generate a GST bill for a delivered LR whose POD is in, and check the tax split and sales voucher.',
    watch: ['bills', 'lrs', 'ledger'],
    steps: [
      {
        id: 'bill', screen: 'fin/billing',
        task: 'Open Customer Billing → LR to bill. Choose a Client, tick at least one LR whose POD column says Received, click "Proceed to next", then "Generate bill".',
        expected: 'A new bill exists and its LRs carry the bill number.',
        check: (db, base) => {
          const nb = newBills(db, base);
          if (!nb.length) return notYet('No new bill generated yet');
          const ok = nb.find((b) => (b.rows || []).some((r: any) => lrOf(db, r.lrId)?.ack));
          if (!ok) return notYet(`${nb[0].billNo} was generated, but none of its LRs has a POD. Bill an LR whose POD column says Received.`);
          return pass(`${ok.billNo} · ${custName(db, ok.clientId)} · ${(ok.rows || []).length} LR · total ${rs(ok.net)}`);
        },
      },
      {
        id: 'tax', screen: 'fin/billing',
        task: 'Check the tax on the new bill: Maharashtra place of supply must use CGST + SGST, any other state IGST, and the Sales voucher must be in the ledger.',
        expected: 'Tax split matches the place of supply, tax is above zero, and voucher SV/<n> exists.',
        check: (db, base) => {
          const nb = newBills(db, base);
          if (!nb.length) return notYet('Generate a bill first');
          const b = nb[nb.length - 1];
          const intra = b.supplyState === 'Maharashtra';
          const split = intra ? Number(b.igst) === 0 && Number(b.cgst) + Number(b.sgst) > 0 : Number(b.cgst) === 0 && Number(b.sgst) === 0 && Number(b.igst) > 0;
          if (!split || !(Number(b.tax) > 0)) return notYet(`${b.billNo}: place of supply ${b.supplyState || '—'}, CGST ${b.cgst}% SGST ${b.sgst}% IGST ${b.igst}% – tax ${rs(b.tax)}. Tax is missing or does not match the state.`);
          const v = list(db, 'ledger').find((e) => e.refType === 'Bill' && e.refNo === b.billNo);
          if (!v) return notYet(`${b.billNo}: no sales voucher found in the ledger`);
          return pass(`${b.billNo}: ${intra ? `CGST ${b.cgst}% + SGST ${b.sgst}%` : `IGST ${b.igst}%`} = ${rs(b.tax)} · voucher ${v.voucherNo} (${v.voucherType})`);
        },
      },
    ],
  },
  {
    id: 'ex.fin.partial-payment', title: 'Record a partial receipt', module: 'fin', roles: ['AC', 'SA'], minutes: 5,
    summary: 'Record a receipt that settles only part of a bill, so the bill stays outstanding (Payment Partial).',
    watch: ['bills', 'clientPayments', 'ledger'],
    steps: [
      {
        id: 'receipt', screen: 'fin/client-payments',
        task: 'Open Client Payments, pick a pending bill, change Received to about half of the pending amount, set TDS to 0, choose Bank mode with a UTR and click "Confirm payment".',
        expected: 'A new receipt exists and the bill still has a pending amount above zero.',
        check: (db, base) => {
          const ps = newReceipts(db, base);
          if (!ps.length) return notYet('No receipt recorded yet');
          const hit = ps.find((p) => { const start = Number(before(base, 'bills', p.billId)?.pending ?? 0); return settles(p) > 0 && settles(p) < start; });
          if (!hit) return notYet(`${ps[0].voucherNo} settled the whole bill. For this exercise record less than the pending amount.`);
          const b = billOf(db, hit.billId);
          return pass(`${hit.voucherNo} on ${b?.billNo}: received ${rs(hit.received)} + TDS ${rs(hit.tds)} · pending now ${rs(b?.pending)}`);
        },
      },
      {
        id: 'voucher', screen: 'fin/ledger',
        task: 'Open Ledger → Ledger audit and find the receipt voucher you just created.',
        expected: 'The receipt is posted as a Bank Receipt (or Cash Receipt) voucher for the settled amount.',
        check: (db, base) => {
          const ps = newReceipts(db, base);
          const v = ps.map((p) => list(db, 'ledger').find((e) => e.voucherNo === p.voucherNo && e.refType === 'Receipt')).find(Boolean);
          if (!v) return notYet('No receipt voucher found yet');
          return pass(`${v.voucherNo} · ${v.voucherType} · credit ${rs(v.credit)} · ${v.ledgerName}`);
        },
      },
    ],
  },
  {
    id: 'ex.fin.full-payment', title: 'Settle a bill fully', module: 'fin', roles: ['AC', 'SA'], minutes: 5,
    summary: 'Record the receipt (with TDS) that brings a bill\'s pending to zero so it shows Paid.',
    watch: ['bills', 'clientPayments', 'ledger'],
    steps: [
      {
        id: 'settle', screen: 'fin/client-payments',
        task: 'Pick a pending bill in Client Payments. Keep the pre-filled TDS if the client deducted it (set 0 if TDS was already taken in an earlier receipt) and confirm the receipt so the balance after receipt is ₹0.',
        expected: 'The bill\'s pending is zero and it shows Paid.',
        check: (db, base) => {
          const hit = list(db, 'bills').find((b) => !b.deleted && Number(before(base, 'bills', b.id)?.pending ?? 0) > 0 && Number(b.pending) <= 0 && newReceipts(db, base, b.id).length > 0);
          if (!hit) return notYet('No bill settled to ₹0 yet');
          return pass(`${hit.billNo} · ${custName(db, hit.clientId)} · total ${rs(hit.net)} · now Paid`);
        },
      },
      {
        id: 'tds', screen: 'fin/client-payments',
        task: 'Make sure the client\'s TDS is recorded on the bill (in this receipt or an earlier one).',
        expected: 'The settled bill has a receipt with TDS above zero.',
        check: (db, base) => {
          const hit = list(db, 'bills').find((b) => !b.deleted && Number(before(base, 'bills', b.id)?.pending ?? 0) > 0 && Number(b.pending) <= 0 && newReceipts(db, base, b.id).length > 0);
          if (!hit) return notYet('Settle a bill first');
          const all = list(db, 'clientPayments').filter((p) => p.billId === hit.billId || p.billId === hit.id);
          const tds = all.reduce((s, p) => s + Number(p.tds || 0), 0);
          if (!(tds > 0)) return notYet(`${hit.billNo} was settled without any TDS. The client normally deducts TDS on the taxable value.`);
          return pass(`${hit.billNo}: TDS recorded ${rs(tds)} across ${all.length} receipt(s)`);
        },
      },
    ],
  },
  {
    id: 'ex.fin.detention-review', title: 'Verify and approve detention', module: 'fin', roles: ['AC', 'SA'], minutes: 7,
    summary: 'Verify a delivery challan\'s detention in the workbench, send it to DC approval and approve the DC payable.',
    watch: ['dcs'],
    steps: [
      {
        id: 'verify', screen: 'fin/detention',
        task: 'Open Detention Management, click a DC that is not an Exception, check the dates and slab, enter the Accounts approved amount and click "Save verification".',
        expected: 'The DC\'s detention status is Accounts Verified.',
        check: (db, base) => {
          const d = detentionSaved(db, base, ['Accounts Verified', 'Approved'])[0];
          if (!d) return notYet('No detention verification saved yet');
          return pass(`${d.dcNo}: ${d.detention.days} day(s), system ${rs(d.detention.calculated)}, approved ${rs(d.detention.approved)}, deduction ${rs(d.detention.deduction)}`);
        },
      },
      {
        id: 'send', screen: 'fin/detention',
        task: 'Reopen the same DC and click "Send to DC approval".',
        expected: 'Detention status becomes Approved and DC Approval opens.',
        check: (db, base) => {
          const d = detentionSaved(db, base, ['Approved'])[0];
          if (!d) return notYet('No DC sent to DC approval yet');
          return pass(`${d.dcNo}: detention Approved ${rs(d.detention.approved)}`);
        },
      },
      {
        id: 'approve', screen: 'fin/dc-approval',
        task: 'In DC Approval, open a DC whose status is Delivered (not yet approved), type the approved detention in "Detention amt", check deductions and click "Approve".',
        expected: 'The DC status changes to Approved with a freight payable.',
        check: (db, base) => {
          const d = changed(db, base, 'dcs', (x, old) => x.status === 'Approved' && !!x.approval && old !== 'Approved')[0];
          if (!d) return notYet('No DC approved yet');
          return pass(`${d.dcNo} approved · payable ${rs(d.approval.payable)} · detention ${rs(d.approval.detAmt)}`);
        },
      },
    ],
  },
  {
    id: 'ex.fin.e2e', title: 'POD to Paid – end to end', module: 'fin', roles: ['AC', 'SA'], minutes: 15, workflow: true,
    summary: 'Take one delivered LR from POD to bill, part payment and final payment.',
    watch: ['lrs', 'bills', 'clientPayments', 'ledger'],
    steps: [
      {
        id: 'pod', screen: 'ops/pod',
        task: 'On the POD screen pick a delivered "To Be Billed" LR awaiting POD and save the POD (received date, pieces, any detention days or damage).',
        expected: 'The LR has a POD recorded.',
        check: (db, base) => {
          const l = podDuringExercise(db, base)[0];
          return l ? pass(`POD recorded on ${l.lrNo} (${custName(db, l.consignorId)})`) : notYet('No POD recorded yet');
        },
      },
      {
        id: 'bill', screen: 'fin/billing',
        task: 'Bill that LR in Customer Billing (choose its client first).',
        expected: 'The LR from step 1 is on a new bill.',
        check: (db, base) => {
          const bills = newBills(db, base);
          const l = podDuringExercise(db, base).find((x) => bills.some((b) => b.id === x.billId));
          if (!l) return notYet('The LR with the new POD is not billed yet');
          const b = billOf(db, l.billId);
          return pass(`${l.lrNo} billed on ${b.billNo} · total ${rs(b.net)}`);
        },
      },
      {
        id: 'partial', screen: 'fin/client-payments',
        task: 'Record a first receipt on that bill for part of the amount.',
        expected: 'A receipt smaller than the bill total exists on the bill.',
        check: (db, base) => {
          const bills = newBills(db, base).filter((b) => podDuringExercise(db, base).some((l) => l.billId === b.id));
          for (const b of bills) {
            const first = newReceipts(db, base, b.id)[0];
            if (first && settles(first) < Number(b.net)) return pass(`${first.voucherNo}: ${rs(settles(first))} of ${rs(b.net)} on ${b.billNo}`);
          }
          return notYet('No part receipt on the new bill yet');
        },
      },
      {
        id: 'full', screen: 'fin/client-payments',
        task: 'Record the balance (with TDS if the client deducted it, and not twice) so the bill becomes Paid.',
        expected: 'The bill pending is ₹0 after at least two receipts.',
        check: (db, base) => {
          const bills = newBills(db, base).filter((b) => podDuringExercise(db, base).some((l) => l.billId === b.id));
          const b = bills.find((x) => Number(x.pending) <= 0 && newReceipts(db, base, x.id).length >= 2);
          if (!b) return notYet('The bill is not settled by two or more receipts yet');
          return pass(`${b.billNo} Paid with ${newReceipts(db, base, b.id).length} receipts`);
        },
      },
    ],
  },
  {
    id: 'ex.fin.transporter-payment', title: 'Pay a market-truck transporter', module: 'fin', roles: ['AC', 'SA'], minutes: 8,
    summary: 'Generate a transporter payment slip, approve it and record the payment.',
    watch: ['tpSlips', 'lrs', 'ledger'],
    steps: [
      {
        id: 'slip', screen: 'fin/tp-slips',
        task: 'In Transporter Payables choose a transporter with ready LRs, check advance and TDS, and click "Generate payment slip".',
        expected: 'A new slip TPS/<n> with status Pending.',
        check: (db, base) => {
          const s = created(db, base, 'tpSlips')[0];
          return s ? pass(`${s.slipNo} · ${transName(db, s.transporterId)} · ${(s.rows || []).length} LR · payable ${rs(s.payable)}`) : notYet('No payment slip generated yet');
        },
      },
      {
        id: 'approve', screen: 'fin/tp-approval',
        task: 'In Transporter Approval → Payment approval, approve the slip.',
        expected: 'Slip status Approved.',
        check: (db, base) => {
          const s = changed(db, base, 'tpSlips', (x) => x.status === 'Approved')[0];
          return s ? pass(`${s.slipNo} approved by ${s.approvedBy || '—'}`) : notYet('No slip approved yet');
        },
      },
      {
        id: 'pay', screen: 'fin/tp-approval',
        task: 'In Payment entry, record the payment for the approved slip.',
        expected: 'A Bank/Cash Payment voucher for the slip is in the ledger.',
        check: (db, base) => {
          const v = created(db, base, 'ledger', (e) => e.refType === 'Transporter Payment')[0];
          return v ? pass(`${v.voucherNo} · ${v.voucherType} · ${rs(v.debit)} · ${v.refNo}`) : notYet('No transporter payment recorded yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.dc-payment', title: 'Approve and pay delivery challans', module: 'fin', roles: ['AC', 'SA'], minutes: 7,
    summary: 'Approve a DC for broker payment, group it into a DC payment slip and record the payment.',
    watch: ['dcs', 'dcPayslips', 'ledger'],
    steps: [
      {
        id: 'approve', screen: 'fin/dc-approval',
        task: 'Open DC Approval, click a DC waiting for approval, check deductions and click "Approve".',
        expected: 'DC status Approved with a payable.',
        check: (db, base) => {
          const d = changed(db, base, 'dcs', (x, old) => x.status === 'Approved' && !!x.approval && old !== 'Approved')[0];
          return d ? pass(`${d.dcNo} approved · payable ${rs(d.approval.payable)}`) : notYet('No DC approved yet');
        },
      },
      {
        id: 'slip', screen: 'fin/dc-payslip',
        task: 'In DC Payment Slips → Generate, choose the broker, tick the approved DC, keep TDS 1% and click "Generate slip".',
        expected: 'A new DC payment slip DCPS/<n>.',
        check: (db, base) => {
          const p = created(db, base, 'dcPayslips')[0];
          return p ? pass(`${p.no} · ${transName(db, p.transporterId)} · total ${rs(p.total)} − TDS ${rs(p.tdsAmt)} = net ${rs(p.net)}`) : notYet('No DC payment slip generated yet');
        },
      },
      {
        id: 'pay', screen: 'fin/dc-payslip',
        task: 'In DC payment entry, record the payment of the new slip.',
        expected: 'A DC Payment voucher is in the ledger.',
        check: (db, base) => {
          const v = created(db, base, 'ledger', (e) => e.refType === 'DC Payment')[0];
          return v ? pass(`${v.voucherNo} · ${v.voucherType} · ${rs(v.debit)} · ${v.refNo}`) : notYet('No DC payment recorded yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.hamali', title: 'Pay hamali for GRN entries', module: 'fin', roles: ['AC', 'SA'], minutes: 4,
    summary: 'Pay one hamal for unpaid GRN unloading entries with TDS.',
    watch: ['hamaliPayments', 'grns', 'ledger'],
    steps: [
      {
        id: 'pay', screen: 'fin/hamali',
        task: 'In Hamali Payments → GRN station, choose one Labour, tick the unpaid entries, keep TDS 1%, choose Cash and click "Pay hamali".',
        expected: 'A hamali payment HP/<n> with TDS deducted.',
        check: (db, base) => {
          const h = created(db, base, 'hamaliPayments')[0];
          return h ? pass(`${h.no} · ${(h.refIds || []).length} entries · total ${rs(h.total)} − TDS ${rs(h.tdsAmt)} = ${rs(h.net)}`) : notYet('No hamali payment yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.ledger-entry', title: 'Post a manual voucher', module: 'fin', roles: ['AC', 'SA'], minutes: 3,
    summary: 'Post an "Other" ledger expense such as bank charges.',
    watch: ['ledger'],
    steps: [
      {
        id: 'post', screen: 'fin/ledger',
        task: 'In Ledger → Ledger entry choose type Other, ledger "Bank Charges", amount 250, Debit, mode Bank, write a narration and click "Post voucher".',
        expected: 'A new manual voucher (PV/<n>, Bank Payment).',
        check: (db, base) => {
          const v = created(db, base, 'ledger', (e) => e.refType === 'Ledger Entry')[0];
          return v ? pass(`${v.voucherNo} · ${v.voucherType} · ${v.ledgerName} · ${rs(v.debit || v.credit)}`) : notYet('No manual voucher posted yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.tally', title: 'Transfer vouchers to Tally', module: 'fin', roles: ['AC', 'SA'], minutes: 3,
    summary: 'Generate the Tally XML and mark the vouchers as synced.',
    watch: ['tallyBatches', 'ledger'],
    steps: [
      {
        id: 'transfer', screen: 'fin/tally',
        task: 'In Tally Export keep "Only vouchers not yet synced" ticked, click "Submit (generate XML)", then "Transfer to Tally".',
        expected: 'A new batch in Transfer history; vouchers show Synced.',
        check: (db, base) => {
          const t = created(db, base, 'tallyBatches')[0];
          return t ? pass(`${t.count} vouchers · ${t.mode} · ${t.from} to ${t.to}`) : notYet('No transfer done yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.freight-update', title: 'Correct freight before billing', module: 'fin', roles: ['AC', 'SA'], minutes: 3,
    summary: 'Change the freight on an unbilled LR.',
    watch: ['lrs'],
    steps: [
      {
        id: 'update', screen: 'fin/freight-update',
        task: 'In Update LR freight choose a client, enter a new freight, tick one LR and click "Update 1 LR".',
        expected: 'The LR\'s freight changed and it is still unbilled.',
        check: (db, base) => {
          const l = fieldChanged(db, base, 'lrs', 'freight', (x) => !x.billId).find((x) => !!before(base, 'lrs', x.id));
          return l ? pass(`${l.lrNo}: ${rs(before(base, 'lrs', l.id)?.freight)} → ${rs(l.freight)}`) : notYet('No LR freight changed yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.credit-hold', title: 'Put a client on credit hold', module: 'fin', roles: ['AC', 'SA'], minutes: 3,
    summary: 'Use Receivables to put a client with old dues on credit hold.',
    watch: ['customers'],
    steps: [
      {
        id: 'hold', screen: 'fin/receivables',
        task: 'In Receivables find a client with 90+ day or overdue dues and use the row action "Put on credit hold". (Lift it again afterwards.)',
        expected: 'The client shows the Credit hold badge.',
        check: (db, base) => {
          const c = fieldChanged(db, base, 'customers', 'disallowLR', (x) => !!x.disallowLR).find((x) => !!before(base, 'customers', x.id));
          return c ? pass(`${c.name} is on credit hold`) : notYet('No client put on credit hold yet');
        },
      },
    ],
  },
  {
    id: 'ex.fin.cash-plan', title: 'Set up the cash plan', module: 'fin', roles: ['AC', 'SA'], minutes: 4,
    summary: 'Enter today\'s cash + bank balance and a minimum balance, and save the assumptions.',
    watch: [],
    steps: [
      {
        id: 'save', screen: 'fin/cash-plan',
        task: 'Open Cash Plan → Assumptions, enter a cash + bank balance and a minimum balance, and click "Save assumptions".',
        expected: 'Saved settings with an opening balance above zero.',
        check: (db) => {
          const c = db?.cashPlan;
          return c && Number(c.opening) > 0 ? pass(`Opening ${rs(c.opening)} · minimum ${rs(c.minBalance)} · ${c.weeks} weeks`) : notYet('Assumptions not saved with an opening balance yet');
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
    id: 'wf.finance',
    title: 'POD to cash: billing and collection',
    module: 'fin',
    roles: ['AC', 'SA', 'OP'],
    summary: 'A delivered LR becomes money in the bank: POD → bill with GST → receivable → part payment with TDS → full payment → ledger and Tally. Includes detention and the rules for undoing a step.',
    steps: [
      { screen: 'ops/pod', title: 'Record POD', does: 'Operations records the signed POD with detention days and damage. The LR becomes eligible for billing (unless the client already allows billing without acknowledgment). Detention amount = days × the client agreement rate (₹1,500 if none).' },
      { screen: 'fin/freight-update', title: 'Correct freight (if needed)', does: 'Fix freight on unbilled LRs before billing. Billed LRs are not listed here.' },
      { screen: 'fin/billing', title: 'Generate the bill', does: 'Pick client and LRs, check detention (WH), unloading and damage, and GST: Maharashtra → CGST+SGST, other states → IGST. Generating creates the receivable, sets billId on each LR and posts a Sales voucher.', lesson: 'ls.fin.gst-billing' },
      { screen: 'fin/receivables', title: 'Follow up dues', does: 'Track pending by age and against credit days. Put clients beyond limits on credit hold.' },
      { screen: 'fin/client-payments', title: 'Record part payment', does: 'Enter the money received and TDS (client TDS % of taxable value). Pending stays above zero → Payment Partial.' },
      { screen: 'fin/client-payments', title: 'Record final payment', does: 'Enter the balance. Do not take TDS twice. Pending reaches zero → Paid.' },
      { screen: 'fin/ledger', title: 'Check the ledger', does: 'The client ledger shows the Sales voucher (debit) and each Bank/Cash Receipt (credit).' },
      { screen: 'fin/tally', title: 'Export to Tally', does: 'Generate the XML, import it into Tally, then "Transfer to Tally" to mark vouchers Synced.' },
    ],
    exercise: 'ex.fin.e2e',
    lesson: 'ls.fin.receipts-rollback',
    notes: [
      'Client detention (charged to the client) comes from the POD and is billed as Detention (WH); a late detention claim can be added to an existing bill as a Supplementary bill (no GST, no separate voucher).',
      'Transporter detention (paid to the broker) is verified in Detention Management; claimed minus approved is the deduction, and the approved amount must be typed in DC Approval.',
      'Undo in reverse order: receipts block bill deletion ("Delete linked receipts before deleting this bill") and removing an LR from a bill; a billed LR\'s POD cannot be removed ("Delete the bill before removing POD"); billed or delivered LRs cannot be edited.',
      'Deleting a receipt restores bill pending (up to the bill total), removes its ledger voucher and sets the status back to Payment Partial or Billed. Deleting a bill returns its LRs to the billing queue and removes the Sales voucher.',
      'Vouchers already transferred to Tally are not reversed in Tally when deleted in the ERP – correct Tally too.',
    ],
  },
  {
    id: 'wf.payables',
    title: 'Paying transporters and brokers',
    module: 'fin',
    roles: ['AC', 'SA'],
    summary: 'Market-truck LRs are paid through transporter payment slips; rail-delivery challans are paid through DC approval and DC payment slips; detention is verified before approval.',
    steps: [
      { screen: 'fin/tp-slips', title: 'Transporter payment slip', does: 'For delivered market-truck LRs: freight + detention + hamali − advance − commission − TDS − damage − stationery. Slip starts Pending.' },
      { screen: 'fin/tp-approval', title: 'Approve and pay slip', does: 'Approve Pending slips, then record payments (Cash/Bank Payment voucher). Pending reduces by amount + TDS.' },
      { screen: 'fin/detention', title: 'Verify DC detention', does: 'Check dates and slab, save the approved amount, send to DC approval.', lesson: 'ls.fin.detention' },
      { screen: 'fin/dc-approval', title: 'Approve DC', does: 'Payable = freight − advance + detention + parking + other + labour − shortage − damage.' },
      { screen: 'fin/dc-payslip', title: 'DC payment slip and payment', does: 'Group approved DCs per broker with TDS, pay the slip; DCs become Paid when the slip is cleared.' },
      { screen: 'fin/tally', title: 'Export payments', does: 'Payment vouchers go to Tally with the other vouchers.' },
    ],
    exercise: 'ex.fin.transporter-payment',
    lesson: 'ls.fin.detention',
    notes: ['Unpaid approved slips feed the Cash Plan as "Pay market truck owners" and "Pay delivery challan trucks".'],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Concept lessons
// ---------------------------------------------------------------------------------------------------------------
export const lessons: Lesson[] = [
  {
    id: 'ls.fin.gst-billing', title: 'GST on freight bills', module: 'fin', kind: 'concept', roles: ['AC', 'SA'],
    screens: ['fin/billing', 'fin/client-payments'],
    summary: 'How the ERP decides CGST+SGST or IGST, how the bill total is built, and why TDS is on the taxable value.',
    sections: [
      { heading: 'Taxable value', body: 'Per LR: freight + additions − deductions = LR net. The bill\'s taxable value is the sum of LR nets.', bullets: ['Additions: detention (WH/DB), toll, unloading/hamali, multi load-unload, incentive, freight adj. add.', 'Deductions: late penalty, damage, freight adj. less.'] },
      { heading: 'Intra-state or inter-state', body: 'Place of supply defaults to the state of the client\'s city. Maharashtra → CGST + SGST (default 2.5% + 2.5%). Any other state → IGST (default 5%). Other rates (6%+6%, 12%, 0%) can be chosen when the client\'s GST treatment needs it.', bullets: ['Quick "Make bill" dialog offers 5% (GTA), 12% or Exempt / RCM.'] },
      { heading: 'Bill total and TDS', body: 'Bill total = taxable value + tax (rounded). Clients deduct TDS on the taxable value, so Client Payments pre-fills TDS = client TDS % × taxable value.' },
      { heading: 'What is posted', body: 'A Sales voucher SV/<n> debits the client for the bill total. Each receipt posts a Bank or Cash Receipt crediting received + TDS + damage + rate difference.' },
    ],
    audio: [
      'Bill की taxable value है — हर LR का freight, plus extra charges, minus deductions।',
      'Client Maharashtra का है तो CGST और SGST, बाहर का है तो IGST।',
      'Client TDS हमेशा taxable value पर काटता है, GST पर नहीं।',
      'Bill बनते ही sales voucher, और हर payment पर receipt voucher ledger में जाता है।',
    ],
    minutes: 4,
    quiz: ['q.fin.gst-intra', 'q.fin.gst-inter', 'q.fin.tds-default-amount'],
  },
  {
    id: 'ls.fin.detention', title: 'Detention: client side and transporter side', module: 'fin', kind: 'concept', roles: ['AC', 'SA'],
    screens: ['fin/detention', 'fin/detention-rules', 'fin/dc-approval', 'ops/pod', 'fin/billing'],
    summary: 'Detention is waiting time of a truck. We charge it to the client from the POD and pay it to the transporter after verification.',
    sections: [
      { heading: 'Charged to the client', body: 'On the POD screen, detention days × the client agreement rate (₹1,500 if none) gives the detention amount. Billing pre-fills it as Detention (WH) on that LR.' },
      { heading: 'Paid to the transporter', body: 'The Detention workbench takes the earliest reporting date and latest unloading date of a DC, removes free first/last days and applies the slab of the matching rule.', bullets: ['Rule match: broker → vehicle type + freight range → first active rule.', 'Approved defaults to the lower of claim and system amount; deduction = claimed − approved.', 'Missing dates or broker = Exception; cannot be sent to DC approval.'] },
      { heading: 'Into the payment', body: 'Type the approved detention in DC Approval\'s "Detention amt"; it is added to the DC payable and paid through the DC payment slip.' },
    ],
    audio: [
      'Detention मतलब truck का इंतज़ार।',
      'Client से detention POD के ज़रिए bill में लिया जाता है।',
      'Transporter को detention, workbench में slab से check करके दिया जाता है।',
      'Claim और approved का फ़र्क deduction है।',
    ],
    minutes: 5,
    quiz: ['q.fin.detention-slab', 'q.fin.detention-deduction', 'q.fin.dc-payable'],
  },
  {
    id: 'ls.fin.receipts-rollback', title: 'Partial, paid and undoing a finance step', module: 'fin', kind: 'concept', roles: ['AC', 'SA'],
    screens: ['fin/client-payments', 'fin/billing', 'admin/corrections', 'ops/pod'],
    summary: 'How bill status moves with receipts, and the safe order for correcting a mistake.',
    sections: [
      { heading: 'Status follows pending', body: 'Every receipt lowers pending by received + TDS + damage + rate difference. Pending above zero after a receipt = Payment Partial on the linked load plan/order; pending zero = Paid. The bill register shows Due, Overdue or Paid.' },
      { heading: 'Guards', body: 'The ERP blocks steps that would leave money without a document.', bullets: ['Bill with receipts: "Delete linked receipts before deleting this bill".', 'Removing an LR from a bill with receipts: "Delete linked receipts before removing an LR from this bill".', 'POD of a billed LR: "Delete the bill before removing POD".', 'Delivered or billed LR: operational fields locked.'] },
      { heading: 'Undo order', body: 'Delete receipts → delete the bill (Admin → Data corrections) → correct POD or freight → bill again → record receipts again.' },
      { heading: 'What deletion recalculates', body: 'Deleting a receipt restores pending (up to the bill total), removes its RV voucher and resets status to Paid, Payment Partial or Billed. Deleting a bill marks it Deleted, frees its LRs and removes the Sales voucher. Tally is not changed automatically.' },
    ],
    audio: [
      'हर receipt bill का pending घटाती है। Pending बचा तो Payment Partial, शून्य तो Paid।',
      'जिस bill पर receipt है, वह delete नहीं होता। पहले receipt delete कीजिए।',
      'Bill बने LR का POD भी delete नहीं होता। पहले bill हटाइए।',
      'उल्टे क्रम में चलिए — receipt, फिर bill, फिर सुधार, फिर नया bill।',
    ],
    minutes: 5,
    quiz: ['q.fin.delete-bill-guard', 'q.fin.rollback-order', 'q.fin.receipt-delete-effect'],
  },
];
