// Training Academy glossary – words employees hear and see in SK Translines ERP, in plain English.
// Meanings follow what the ERP screens do (see the area content files); `screens` are PAGES route keys.
import type { ModuleId } from '../types';

export type GlossaryTerm = { term: string; meaning: string; module: ModuleId; screens?: string[] };

export const glossary: GlossaryTerm[] = [
  // ---------------- Road operations ----------------
  { term: 'LR (Lorry Receipt)', meaning: 'The main document for one consignment: sender, receiver, goods, freight and truck. Its status goes Draft → Finalised → In Transit → Delivered → POD Received → Billed → Paid.', module: 'ops', screens: ['ops/lr', 'ops/lr-new', 'book'] },
  { term: 'Draft LR', meaning: 'A saved but unfinished LR. It cannot be dispatched or billed. Finish it or cancel it.', module: 'ops', screens: ['ops/lr', 'work'] },
  { term: 'Order', meaning: 'A customer request noted before the LR, with pickup date and number of trucks. It is confirmed or rejected, and then becomes one or more LRs.', module: 'ops', screens: ['ops/orders', 'ops/order-confirmation'] },
  { term: 'Dispatch', meaning: 'Sending a finalised road LR out on a truck. The LR becomes In Transit; for our own truck a trip opens. After dispatch the route and truck cannot be changed.', module: 'ops', screens: ['board', 'ops/lr'] },
  { term: 'POD (Proof of Delivery)', meaning: 'The signed delivery copy from the receiver. Record it once it is in hand, with damaged pieces and detention. A To Be Billed LR can be billed only after POD.', module: 'ops', screens: ['ops/pod', 'work'] },
  { term: 'TBB (To Be Billed)', meaning: 'Payment mode where SK Translines sends the customer a bill later. After POD the LR goes to Customer Billing. In New booking it is "We bill later".', module: 'ops', screens: ['book', 'fin/billing'] },
  { term: 'To Pay', meaning: 'Payment mode where the receiver pays the freight at delivery. The LR is never billed; it closes as Paid after POD. In New booking it is "Receiver pays".', module: 'ops', screens: ['book', 'board'] },
  { term: 'Paid', meaning: 'Payment mode where freight was paid at booking. Like To Pay, it is not billed and closes after POD. In New booking it is "Paid now". Also the last stage on the Order Board.', module: 'ops', screens: ['book', 'board'] },
  { term: 'Consignor / Consignee', meaning: 'Consignor is the sender of the goods (the customer who books). Consignee is the receiver at the destination.', module: 'ops', screens: ['book', 'ops/lr-new'] },
  { term: 'Courier', meaning: 'Register of documents sent between branches – PODs, LDC copies, bills, cheques – and their receipt at the other branch.', module: 'ops', screens: ['ops/courier'] },
  { term: 'Stage time limit', meaning: 'How long a consignment may stay in one stage before it is shown as late (red). Amber means 80% of the time is used. Admins set the limits.', module: 'admin', screens: ['admin/time-limits', 'board', 'dashboard'] },

  // ---------------- Smart Load Planning ----------------
  { term: 'Smart Load Plan', meaning: 'A 3D plan of how an order\'s packages fit inside one truck, checking space, payload, stacking and stop order. It is geometric planning only – NOT certified axle-load, stability or securement analysis.', module: 'smartload', screens: ['ops/smart-load'] },
  { term: 'Payload', meaning: 'The total weight a truck or wagon may carry. A package is placed only if the loaded weight stays within Max payload. Payload utilization shows loaded kg against it.', module: 'smartload', screens: ['ops/smart-load', 'rail/wagons'] },
  { term: 'Stacking', meaning: 'Putting packages on top of each other. Stackable off means one layer and nothing on top. Max layers and Top kg limit how high and how heavy the stack may be.', module: 'smartload', screens: ['ops/smart-load'] },
  { term: 'Multi-stop / LIFO', meaning: 'Last in, first out. Each cargo line gets a delivery stop. Stop 1 is unloaded first, so it is loaded last, nearest the rear door. Later-stop cargo must not block it.', module: 'smartload', screens: ['ops/smart-load'] },
  { term: 'Physical loading reconciliation', meaning: 'After loading, enter Loaded, Damage and Shortage for each cargo line. Variance (Loaded + Damage + Shortage − Planned) must be 0 on every line before loading can be confirmed and the truck dispatched.', module: 'smartload', screens: ['ops/smart-load', 'wh/verification'] },

  // ---------------- Rail & rake ----------------
  { term: 'Rake', meaning: 'The parcel train SK Translines books, for example from Jalgaon to Guwahati or Kolkata. In the ERP it is one VP schedule with a number like RK-<year>-<n>.', module: 'rail', screens: ['rail/rakes', 'ops/vp-schedule', 'rail/status'] },
  { term: 'VP (Parcel Van)', meaning: 'One wagon on the rake, with its own railway number. Loading and DGRN are done VP by VP.', module: 'rail', screens: ['ops/vp-loading', 'ops/dgrn', 'rail/mrrr'] },
  { term: 'Wagon type', meaning: 'The kind of wagon, like VPU, VPH, BCN, NMG or BCNHL. Its size and payload decide how much it can carry.', module: 'rail', screens: ['rail/wagons', 'rail/freight'] },
  { term: 'GRN (Goods Receipt Note)', meaning: 'Goods counted in at the Jalgaon rail-head godown before loading on the rake, with received and damaged quantity. Without GRN the LR cannot be loaded on a VP.', module: 'rail', screens: ['ops/grn'] },
  { term: 'DGRN', meaning: 'Goods counted in at the destination branch after a VP is unloaded. DGRN stock is what you can put on a delivery challan.', module: 'rail', screens: ['ops/dgrn'] },
  { term: 'LDC / DC (Delivery Challan)', meaning: 'The lorry delivery challan for the truck that takes DGRN goods from the destination branch to the consignee. It needs supervisor, collection and client acknowledgments.', module: 'rail', screens: ['ops/dc', 'ops/ldc', 'fin/dc-approval'] },
  { term: 'MR / RR', meaning: 'Railway money receipt and railway receipt for each VP. Recorded with the real VP number, seal number and railway freight.', module: 'rail', screens: ['rail/mrrr'] },
  { term: 'Demurrage', meaning: 'Railway charge when a wagon is held beyond its free time. Recorded with any waiver letter, at the source or destination.', module: 'rail', screens: ['rail/dcwc'] },
  { term: 'Wharfage', meaning: 'Railway charge for goods left too long on railway premises. Recorded with demurrage on the same screen.', module: 'rail', screens: ['rail/dcwc'] },

  // ---------------- Warehouse ----------------
  { term: 'Godown', meaning: 'A warehouse where goods are held, with its capacity and rent.', module: 'wh', screens: ['wh/godowns', 'wh/stock'] },
  { term: 'Damage / Shortage', meaning: 'Goods found broken or missing. It is recorded where it is found – GRN, DGRN, LDC acknowledgments or POD – and listed in one register.', module: 'wh', screens: ['wh/damage', 'ops/pod'] },

  // ---------------- Fleet ----------------
  { term: 'Own truck / Market truck', meaning: 'An own truck belongs to SK Translines and runs on trips. A market truck is hired from a transporter, who is paid through a transporter payment slip.', module: 'fleet', screens: ['fleet/trucks', 'fin/tp-slips'] },
  { term: 'Trip', meaning: 'One journey of our own truck, with driver, route, opening km, freight and advance. Diesel and expenses are booked against it.', module: 'fleet', screens: ['fleet/trips', 'fleet/trip-completion'] },
  { term: 'Trip advance', meaning: 'Cash or bank money given to the driver when the trip starts (default ₹10,000). Print the trip advance slip; saving the trip does not post it to the ledger.', module: 'fleet', screens: ['fleet/trips'] },
  { term: 'Log slip', meaning: 'Settlement of all completed trips of one truck: total km, diesel used, average against standard and expenses. Submitting it posts the diesel journal.', module: 'fleet', screens: ['fleet/logslips'] },
  { term: 'Truck journey', meaning: 'Where each own truck went in a period, which km were loaded or empty, what it earned and spent, and its profit and idle days.', module: 'fleet', screens: ['fleet/journeys'] },
  { term: 'Truck papers', meaning: 'Insurance, fitness, permit and tax of a truck. Papers due within 30 days show on Home and My Work.', module: 'fleet', screens: ['fleet/trucks', 'work'] },

  // ---------------- Workshop & inventory ----------------
  { term: 'Job card', meaning: 'The repair order for one own truck: parts from our stock and outside services. It needs approval, and is finalised when the truck leaves.', module: 'ws', screens: ['ws/jobcards', 'ws/jobcard-approval'] },
  { term: 'PO (Purchase Order)', meaning: 'An order for spare parts to a supplier, with quantity and rate. Every PO needs approval before parts can be inwarded against it.', module: 'ws', screens: ['ws/po', 'ws/po-approval'] },
  { term: 'Inward', meaning: 'Receiving parts into stock against an approved PO, with the supplier bill, batch numbers and warranty dates.', module: 'ws', screens: ['ws/inward', 'ws/stock'] },
  { term: 'Spare replacement', meaning: 'Sending a defective part back to the seller, free under warranty or paid, with an RP gate pass, and receiving the replacement back into stock.', module: 'ws', screens: ['ws/replacement'] },

  // ---------------- Finance ----------------
  { term: 'Hamali', meaning: 'Loading and unloading labour charges paid to hamals (labour gangs) for GRN, DGRN and VP loading. Rates are kept per goods.', module: 'fin', screens: ['fin/hamali', 'cust/hamali-rates'] },
  { term: 'Detention', meaning: 'Waiting time of a truck. It is charged to the client from the POD and paid to the transporter after checking dates and the detention slab.', module: 'fin', screens: ['fin/detention', 'fin/detention-rules', 'ops/pod'] },
  { term: 'Credit days', meaning: 'The number of days a customer gets to pay a bill. After that the bill is overdue and shows red in Receivables.', module: 'fin', screens: ['fin/receivables', 'cust/360'] },
  { term: 'Credit hold', meaning: 'A block on a customer who must not get new bookings. The Full LR form and Customer orders stop the booking; New booking only warns, so check with Accounts.', module: 'cust', screens: ['cust/360', 'fin/receivables'] },
  { term: 'Receivable', meaning: 'Money customers still owe on bills, shown customer by customer and by how old the bills are.', module: 'fin', screens: ['fin/receivables'] },
  { term: 'Partial payment', meaning: 'A receipt that does not clear the whole bill. The pending amount stays above zero; the bill is fully Paid only when pending reaches zero.', module: 'fin', screens: ['fin/client-payments'] },
  { term: 'TDS', meaning: 'Tax Deducted at Source. Customers deduct it on the taxable value of a bill; we deduct it from transporter, hamali and salary payments.', module: 'fin', screens: ['fin/client-payments', 'fin/tp-slips', 'payroll/tds'] },
  { term: 'GST', meaning: 'Goods and Services Tax on freight bills. The ERP adds CGST + SGST or IGST to the taxable value of the bill.', module: 'fin', screens: ['fin/billing'] },
  { term: 'CGST / SGST', meaning: 'Central and State GST, used when the client is in Maharashtra (default 2.5% + 2.5%).', module: 'fin', screens: ['fin/billing'] },
  { term: 'IGST', meaning: 'Integrated GST, used when the client is in another state (default 5%).', module: 'fin', screens: ['fin/billing'] },
  { term: 'Transporter slip', meaning: 'Payment slip for a market-truck transporter: freight plus detention and hamali, less advance, commission, TDS, damage and stationery. It is approved, then paid.', module: 'fin', screens: ['fin/tp-slips', 'fin/tp-approval'] },
  { term: 'DC approval', meaning: 'Accounts approves a delivery challan for broker payment after its acknowledgments, deducting shortage and damage. Then a DC payment slip pays it.', module: 'fin', screens: ['fin/dc-approval', 'fin/dc-payslip'] },
  { term: 'Ledger', meaning: 'The record of all vouchers – sales from bills, receipts, payments, hamali and log slips – with party-wise statements.', module: 'fin', screens: ['fin/ledger'] },
  { term: 'Tally export', meaning: 'Creates Tally XML and Excel files of ledger vouchers for a period and marks them Synced. Deleting a voucher in the ERP later does not change Tally.', module: 'fin', screens: ['fin/tally'] },
  { term: 'Cash plan', meaning: 'Week-by-week forecast of money coming in and going out, with the cash balance at each week end. Red weeks run short.', module: 'fin', screens: ['fin/cash-plan'] },

  // ---------------- Customers & contracts ----------------
  { term: 'Rate contract', meaning: 'Agreed client rates by route, goods, unit and mode. An active contract fills the suggested freight in New booking and the Full LR form.', module: 'cust', screens: ['cust/rate-contracts', 'book'] },
  { term: 'Agreement', meaning: 'Client agreement with rate type, committed trips, detention rate per day, capacity and validity.', module: 'cust', screens: ['cust/agreements'] },
  { term: 'Transporter rate matrix', meaning: 'What we expect to pay a hired market truck from a source to a destination.', module: 'cust', screens: ['cust/transporter-rates'] },
  { term: 'Customer 360', meaning: 'One page per customer with LRs, bills, outstanding, credit limit, credit hold, contracts and complaints.', module: 'cust', screens: ['cust/360'] },

  // ---------------- Marketing & CRM ----------------
  { term: 'Lead', meaning: 'A possible new customer with contact, transport need, source and owner. It moves New → Contacted → Qualified → Proposal → Negotiation → Won. Kept in this browser only.', module: 'crm', screens: ['marketing/leads', 'marketing/lead-pipeline'] },
  { term: 'Deal', meaning: 'A business opportunity with a company, lane, value and expected close date. A won lead does not create a deal by itself – create it in Deals.', module: 'crm', screens: ['marketing/deals', 'marketing/deal-pipeline'] },
  { term: 'Quotation', meaning: 'A freight offer linked to a deal: lane, rate, basis (per vehicle, per MT, per trip, per container), validity and status.', module: 'crm', screens: ['marketing/quotations'] },
  { term: 'Hand-off (Won Deal Handoff)', meaning: 'Turns a won deal into ERP records in four steps: Deal Won → Customer 360 → Rate Contract → first Booking. This is how sales work reaches Operations and Accounts.', module: 'crm', screens: ['marketing/handoff'] },

  // ---------------- Home, communication & training ----------------
  { term: 'My Work', meaning: 'Your list of everything waiting on you, grouped by job, oldest first, with an action button on each row.', module: 'home', screens: ['work'] },
  { term: 'Order Board', meaning: 'Every open order and LR as a card in its stage, from Booked to Paid. A red card is late and says why and who it waits on.', module: 'home', screens: ['board'] },
  { term: 'ERP reference', meaning: 'A link to a record, such as an LR number, attached to a chat message so the reader knows what it is about.', module: 'comms', screens: ['communication'] },
  { term: 'Practice mode', meaning: 'Working on sample data kept only in this browser. Nothing is saved to the company data and real records are not changed.', module: 'home', screens: ['help'] },
  { term: 'Readiness', meaning: 'Your training status: Not Started → Learning → Practising → Assessment Pending → Ready. Ready means you may work without supervision.', module: 'home', screens: ['help'] },
  { term: 'Temporary password', meaning: 'A one-time password from the administrator for your first sign-in. Change it at once in Change Password.', module: 'access', screens: ['access/password', 'access/users'] },
];
