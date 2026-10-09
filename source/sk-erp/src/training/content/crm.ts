// Training Academy content: Customers (module 'cust') and Marketing & CRM (module 'crm').
// Written against src/features/customers.tsx, src/features/marketing.tsx, src/features/book.tsx,
// src/features/ops-lr.tsx, src/features/ops-orders.tsx and the store actions they call.
//
// Data note for practice checkers:
// - Customers, rate contracts, agreements, hamali/transporter rates, documents, complaints and LRs live in the shared
//   ERP `db` (practice = isolated buildSeed() sample data).
// - Leads, deals, follow-ups, campaigns and quotations do NOT live in `db`. marketing.tsx keeps them in component state
//   persisted to browser localStorage under the key 'sk-marketing-demo' (seeded with LD-1001…LD-1006, DL-501…DL-504).
//   That store is the same in practice mode and real mode and is not in the baseline, so CRM checkers read it read-only
//   from localStorage and detect new work by IDs that are not in the built-in sample set, or by the timestamp that is
//   part of new activity (AC<ms>) and quotation (QT-<ms>) IDs.
import type { Exercise, Lesson, PracticeBaseline, Question, ScreenTraining, Workflow } from '../types';
import { created, notYet, pass } from '../check';

// ---------------------------------------------------------------------------------------------------------------
// Read-only access to the browser-local CRM store used by src/features/marketing.tsx
// ---------------------------------------------------------------------------------------------------------------
const CRM_KEY = 'sk-marketing-demo';
const SEED_LEADS = ['LD-1001', 'LD-1002', 'LD-1003', 'LD-1004', 'LD-1005', 'LD-1006'];
const SEED_DEALS = ['DL-501', 'DL-502', 'DL-503', 'DL-504'];
type CrmState = { leads: any[]; deals: any[]; activities: any[]; quotes: any[]; campaigns: any[] };

function readCrm(): CrmState | null {
  try {
    const ls = (globalThis as any).localStorage;
    if (!ls) return null;
    const raw = ls.getItem(CRM_KEY);
    // No saved copy yet = the screens still show the built-in sample, so nothing new exists.
    if (!raw) return { leads: [], deals: [], activities: [], quotes: [], campaigns: [] };
    const s = JSON.parse(raw) || {};
    const a = (x: any) => (Array.isArray(x) ? x : []);
    return { leads: a(s.leads), deals: a(s.deals), activities: a(s.activities), quotes: a(s.quotes), campaigns: a(s.campaigns) };
  } catch {
    return null;
  }
}
const NO_CRM = 'CRM data could not be read in this browser';
const norm = (s: any) => String(s ?? '').trim().toLowerCase();
const startMs = (base: PracticeBaseline) => Date.parse(base.startedAt) || 0;
/** Activity IDs are 'AC' + Date.now(), quotation IDs are 'QT-' + Date.now(); built-in sample IDs are short numbers. */
const stampedAfter = (id: any, prefix: string, base: PracticeBaseline) => {
  const n = Number(String(id ?? '').slice(prefix.length));
  return Number.isFinite(n) && n > 1e12 && n >= startMs(base) - 5000;
};
const newLeads = (s: CrmState) => s.leads.filter((l) => l?.id && !SEED_LEADS.includes(l.id) && norm(l.company));
const newDeals = (s: CrmState) => s.deals.filter((d) => d?.id && !SEED_DEALS.includes(d.id) && norm(d.company));
const inr = (n: any) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// ---------------------------------------------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------------------------------------------
export const questions: Question[] = [
  {
    id: 'q.crm.lead-stages-order',
    module: 'crm',
    type: 'order',
    prompt: 'Put the lead stages in the order a lead normally moves on the Lead Pipeline.',
    items: [
      { id: 'new', text: 'New' },
      { id: 'contacted', text: 'Contacted' },
      { id: 'qualified', text: 'Qualified' },
      { id: 'proposal', text: 'Proposal' },
      { id: 'negotiation', text: 'Negotiation' },
      { id: 'won', text: 'Won' },
    ],
    answer: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'],
    explanation:
      'Leads move New → Contacted → Qualified → Proposal → Negotiation → Won (or Lost). The Lead Pipeline shows the first six as columns. A lead set to Lost leaves the board but stays in All Leads.',
    screens: ['marketing/lead-pipeline', 'marketing/leads'],
    difficulty: 1,
  },
  {
    id: 'q.crm.lead-won-no-deal',
    module: 'crm',
    type: 'tf',
    prompt: 'When you move a lead to "Won" on the Lead Pipeline, the ERP automatically creates a deal for it.',
    options: [
      { id: 't', text: 'True' },
      { id: 'f', text: 'False' },
    ],
    answer: 'f',
    explanation:
      'False. Leads and deals are separate lists. Changing a lead’s stage only changes that lead. Create the deal yourself in Deals → New deal, and type the company name exactly as on the lead.',
    screens: ['marketing/lead-pipeline', 'marketing/deals'],
    difficulty: 2,
  },
  {
    id: 'q.crm.deal-won-next',
    module: 'crm',
    type: 'next',
    prompt: 'You have just moved deal DL-505 to Won on the Deal Pipeline. What is the next step?',
    options: [
      { id: 'a', text: 'Click "Start ERP handoff" on the Won card and work through Won Deal Handoff' },
      { id: 'b', text: 'Open Full LR form and type the customer name, it will be created there' },
      { id: 'c', text: 'Wait – the customer and rate contract are created automatically overnight' },
      { id: 'd', text: 'Create a new lead for the same company so Operations can see it' },
    ],
    answer: 'a',
    explanation:
      'A Won card shows "Start ERP handoff", which opens Won Deal Handoff. There you create (or link) the customer, create the rate contract and then the first booking. Nothing happens automatically.',
    screens: ['marketing/deal-pipeline', 'marketing/handoff'],
    difficulty: 1,
  },
  {
    id: 'q.crm.handoff-creates',
    module: 'crm',
    type: 'mcq',
    prompt: 'On Won Deal Handoff you click "Create customer". What does the ERP do?',
    options: [
      { id: 'a', text: 'Creates a customer master from the deal: company name, contact, credit 30 days, credit limit of 2 × deal value (at least ₹5,00,000), linked to the deal' },
      { id: 'b', text: 'Sends the deal to Accounts for approval; the customer appears after approval' },
      { id: 'c', text: 'Creates a customer with GST, PAN and address copied from the lead' },
      { id: 'd', text: 'Creates a customer order in Customer orders' },
    ],
    answer: 'a',
    explanation:
      'Create customer saves a Customer 360 record from the deal (name, short name from the initials, contact, 30 credit days, credit limit = larger of ₹5,00,000 and 2 × deal value, 18% interest, 2% TDS, crmDealId). GST, PAN, address, phone and email are left blank – complete them in Customer 360 before billing. If a customer with exactly the same name already exists, it is linked instead.',
    screens: ['marketing/handoff', 'cust/360'],
    difficulty: 2,
  },
  {
    id: 'q.crm.handoff-booking-gate',
    module: 'crm',
    type: 'scenario',
    prompt: 'Why is "Create first booking" greyed out?',
    scenario:
      'On Won Deal Handoff for DL-505, step 2 shows the customer as Created. Step 3 still shows the "Create rate contract" button. Step 4 "Create first booking" cannot be clicked.',
    options: [
      { id: 'a', text: 'The first booking needs both a linked customer and an active rate contract – create the rate contract first' },
      { id: 'b', text: 'The deal probability is below 100%' },
      { id: 'c', text: 'Only Accounts can create the first booking' },
      { id: 'd', text: 'The customer must first be put on credit hold' },
    ],
    answer: 'a',
    explanation:
      'Create first booking is enabled only when the customer exists and an active rate contract for that customer is found. Create the rate contract in step 3; the button then opens New booking with the customer already selected.',
    screens: ['marketing/handoff'],
    difficulty: 1,
  },
  {
    id: 'q.crm.handoff-contract-rate',
    module: 'crm',
    type: 'mcq',
    prompt: 'The handoff creates a rate contract for a deal worth ₹9,60,000. What is in that contract, and what must you do?',
    options: [
      { id: 'a', text: 'One Road route at ₹48,000 (deal value ÷ 20) for the first goods item, Truck unit – a starting rate you must correct to the agreed quotation in Rate Contracts' },
      { id: 'b', text: 'The exact rate from the latest quotation for this deal – nothing to check' },
      { id: 'c', text: 'All lanes the customer may ever use, priced from the transporter rate matrix' },
      { id: 'd', text: 'No routes – you must add them before the contract can be saved' },
    ],
    answer: 'a',
    explanation:
      'The handoff builds one Road route from the deal lane: rate = deal value ÷ 20 (minimum ₹1,000), goods = the first item in the goods list, unit = Truck, 2 standard days, remark "Created from won CRM deal …". It does not read the quotation. Open Rate Contracts, delete or correct the route (goods, unit, rate, dates) to match what was agreed.',
    screens: ['marketing/handoff', 'cust/rate-contracts', 'marketing/quotations'],
    difficulty: 3,
  },
  {
    id: 'q.crm.handoff-name-match',
    module: 'crm',
    type: 'scenario',
    prompt: 'What will "Create customer" do here, and what should you do?',
    scenario:
      'The won deal company is typed as "Indus Cool Appliances". Customer 360 already has "Indus Cool Appliances Pvt Ltd" with a running rate contract.',
    options: [
      { id: 'a', text: 'It creates a second, duplicate customer. Correct the deal company to exactly "Indus Cool Appliances Pvt Ltd" first, so the handoff links the existing customer' },
      { id: 'b', text: 'It finds the existing customer because the first words match' },
      { id: 'c', text: 'It refuses to save and shows a duplicate warning' },
      { id: 'd', text: 'It merges the two customers' },
    ],
    answer: 'a',
    explanation:
      'The handoff looks for a customer whose name is exactly the deal company (only upper/lower case is ignored). Any difference creates a new customer, which splits LRs, bills and outstanding. Edit the deal in Deals so the company matches the customer master, then open the handoff again.',
    screens: ['marketing/handoff', 'marketing/deals', 'cust/360'],
    difficulty: 3,
  },
  {
    id: 'q.crm.lane-format',
    module: 'crm',
    type: 'spot',
    prompt: 'Spot the deal lane that will give a wrong route when the handoff creates the rate contract.',
    options: [
      { id: 'a', text: 'Jalgaon → Pune' },
      { id: 'b', text: 'Jalgaon -> Mumbai' },
      { id: 'c', text: 'Raipur to Nagpur' },
      { id: 'd', text: 'Nashik → New Delhi' },
    ],
    answer: 'c',
    explanation:
      'The handoff splits the lane at "→" or "->" and matches each side to the city list. "Raipur to Nagpur" has no arrow, so it is read as one place and the destination is lost. Also, a city that is not in the city master (for example Jharsuguda or NCR) falls back to the first city in the list (Jalgaon). Always write lanes as "From → To" using city names from the master, and check the route in Rate Contracts.',
    screens: ['marketing/deals', 'marketing/handoff'],
    difficulty: 3,
  },
  {
    id: 'q.crm.quote-not-contract',
    module: 'crm',
    type: 'tf',
    prompt: 'Saving a quotation on the Quotations screen updates the customer’s rate contract with the quoted rate.',
    options: [
      { id: 't', text: 'True' },
      { id: 'f', text: 'False' },
    ],
    answer: 'f',
    explanation:
      'False. A quotation is a CRM record linked to a deal (deal, lane, rate, basis, valid until). It is saved as Draft and is not copied anywhere. Freight on bookings comes from the rate contract, so after the deal is won put the agreed quotation rate into Rate Contracts.',
    screens: ['marketing/quotations', 'cust/rate-contracts'],
    difficulty: 2,
  },
  {
    id: 'q.crm.followup-status',
    module: 'crm',
    type: 'mcq',
    prompt: 'You add a follow-up call dated yesterday on Follow-ups & Activities. How does it appear?',
    options: [
      { id: 'a', text: 'As "Upcoming" – the status is not worked out from the date; it changes only when you click Mark done' },
      { id: 'b', text: 'As "Overdue", because the date has passed' },
      { id: 'c', text: 'As "Due" on today’s list' },
      { id: 'd', text: 'It is rejected because the date is in the past' },
    ],
    answer: 'a',
    explanation:
      'A new activity is saved as Upcoming whatever its date. The Due today / Overdue counters do not move dates for you, so read the Date column, do the calls in date order and click Mark done when finished.',
    screens: ['marketing/followups', 'marketing/dashboard'],
    difficulty: 2,
  },
  {
    id: 'q.crm.data-local',
    module: 'crm',
    type: 'mcq',
    prompt: 'Where are leads, deals, follow-ups, campaigns and quotations saved?',
    options: [
      { id: 'a', text: 'Only in this browser on this computer – colleagues do not see them. Customers and rate contracts made in the handoff go to the shared ERP data' },
      { id: 'b', text: 'In the shared ERP database, like LRs and bills' },
      { id: 'c', text: 'In Tally' },
      { id: 'd', text: 'They are not saved; they disappear on refresh' },
    ],
    answer: 'a',
    explanation:
      'In this version the Marketing & CRM screens keep their records in the browser (they survive a refresh but are not shared and are the same in practice and real mode). Anything that must reach Operations or Accounts – the customer master and the rate contract – is created through Won Deal Handoff, which saves into the ERP data.',
    screens: ['marketing/leads', 'marketing/deals', 'marketing/handoff'],
    difficulty: 2,
  },
  {
    id: 'q.crm.targets-calc',
    module: 'crm',
    type: 'mcq',
    prompt: 'How is "% achieved" on Sales Targets worked out?',
    options: [
      { id: 'a', text: 'Total value of that salesperson’s Won deals ÷ their monthly target' },
      { id: 'b', text: 'Freight of LRs booked for their customers ÷ target' },
      { id: 'c', text: 'Number of leads ÷ number of deals' },
      { id: 'd', text: 'Open pipeline value ÷ target' },
    ],
    answer: 'a',
    explanation:
      'Sales Targets adds the deal value of every deal with status Won owned by the person and divides it by the fixed target (₹30 L, ₹25 L, ₹20 L). It does not read LRs or bills, so deal owner and deal value must be correct.',
    screens: ['marketing/targets', 'marketing/performance'],
    difficulty: 2,
  },
  {
    id: 'q.cust.credit-hold-booking',
    module: 'cust',
    type: 'scenario',
    prompt: 'Which statement is correct?',
    scenario:
      'Narmada Steel Tubes has "Disallow new LR booking (credit hold)" ticked. A branch user wants to book a truck for them today.',
    options: [
      { id: 'a', text: 'Full LR form and Customer orders block it; New booking only shows a red warning – do not book until Accounts lifts the hold' },
      { id: 'b', text: 'Every booking screen allows it; credit hold only affects billing' },
      { id: 'c', text: 'New booking blocks it but Full LR form allows it' },
      { id: 'd', text: 'The customer disappears from all customer lists' },
    ],
    answer: 'a',
    explanation:
      'Credit hold stops Full LR form ("… is on credit hold – LR booking disallowed") and Customer orders ("… new bookings are disallowed. Clear outstanding or lift the hold in Customer 360"). New booking only warns "This customer is on credit hold – check with accounts", so the user must stop and check. Customer lists show "(credit hold)" after the name.',
    screens: ['cust/360', 'book', 'ops/lr-new', 'ops/orders'],
    difficulty: 3,
  },
  {
    id: 'q.cust.credit-hold-where',
    module: 'cust',
    type: 'mcq',
    prompt: 'Where can a customer be put on credit hold or released from it?',
    options: [
      { id: 'a', text: 'Customer 360 → Edit → "Disallow new LR booking (credit hold)", or Payments to collect → row action Put on / Lift credit hold' },
      { id: 'b', text: 'Only by deleting and re-creating the customer' },
      { id: 'c', text: 'In Rate Contracts, by expiring the contract' },
      { id: 'd', text: 'In Complaints & Support, by closing all tickets' },
    ],
    answer: 'a',
    explanation:
      'Credit hold is the customer field disallowLR. Change it in the customer form (Credit & billing section) or from Receivables with "Put on credit hold" / "Lift credit hold". Customer 360 counts held customers in the "On credit hold" KPI and the Credit hold quick filter.',
    screens: ['cust/360', 'fin/receivables'],
    difficulty: 1,
  },
  {
    id: 'q.cust.freight-suggestion-order',
    module: 'cust',
    type: 'order',
    prompt: 'New booking suggests freight from several sources. Put them in the order the ERP tries them.',
    items: [
      { id: 'last', text: 'Same as the customer’s last LR to this destination with these goods' },
      { id: 'rc', text: 'The customer’s active rate contract route for this destination and goods' },
      { id: 'km', text: 'Distance estimate (about ₹48 per km, minimum ₹9,500)' },
    ],
    answer: ['last', 'rc', 'km'],
    explanation:
      'New booking first copies the freight of the last LR on the same route and goods, then uses an active rate contract route (destination and goods match, rate ₹100 or more), and only then estimates from distance. The hint under Freight says which one was used; "Use ₹…" puts the suggestion back if you changed it.',
    screens: ['book', 'cust/rate-contracts'],
    difficulty: 2,
  },
  {
    id: 'q.cust.rc-expired',
    module: 'cust',
    type: 'spot',
    prompt: 'Spot the rate contract route that will NOT pre-fill freight on a booking made today.',
    options: [
      { id: 'a', text: 'Jalgaon → Mumbai, Refrigerator 190L, Truck, ₹21,500 – contract valid till next March' },
      { id: 'b', text: 'Jalgaon → Pune, Washing Machine 7kg, Truck, ₹19,800 – contract To date was last month' },
      { id: 'c', text: 'Nashik → New Delhi, Luggage Trolley Set, Truck, ₹71,000 – contract valid till next September' },
      { id: 'd', text: 'Pune → Bengaluru, LED TV 43", Truck, ₹42,000 – contract expiring in 20 days' },
    ],
    answer: 'b',
    explanation:
      'Only contracts whose To date is today or later are used for freight. An expired contract shows "Expired" in Rate Contracts and is ignored by New booking and Full LR form. "Expiring" (30 days or less) still works – renew it before it lapses.',
    screens: ['cust/rate-contracts', 'book'],
    difficulty: 2,
  },
  {
    id: 'q.cust.rc-save-rule',
    module: 'cust',
    type: 'scenario',
    prompt: 'Why did the contract not save?',
    scenario:
      'In New contract you selected the client and dates, typed a rate in the Rate box but never clicked "Add item". You clicked Save contract and saw a red message.',
    options: [
      { id: 'a', text: 'A contract needs a client and at least one route in the list – fill To city, Item and Rate, click Add item, then save' },
      { id: 'b', text: 'Rate contracts can only be saved by Accounts' },
      { id: 'c', text: 'The From date must be in the future' },
      { id: 'd', text: 'The client already has a contract, so a second one is never allowed' },
    ],
    answer: 'a',
    explanation:
      'Save contract checks for a client and at least one route and shows "Select client and add at least one route". The route row is only added when you click Add item, which stays disabled until To city, Item and Rate are filled.',
    screens: ['cust/rate-contracts'],
    difficulty: 1,
  },
  {
    id: 'q.cust.rc-unit-lr',
    module: 'cust',
    type: 'mcq',
    prompt: 'In the Full LR form, how is the suggested freight worked out from a matching rate contract route?',
    options: [
      { id: 'a', text: 'Truck unit: the route rate as it is. Other units (Cartons, Nos…): route rate × number of packages' },
      { id: 'b', text: 'Always route rate × weight in MT' },
      { id: 'c', text: 'Always the route rate, whatever the unit' },
      { id: 'd', text: 'The route rate plus GST' },
    ],
    answer: 'a',
    explanation:
      'Full LR form matches the route on source, destination and goods. For a truck unit the rate is the freight; for other units it multiplies by packages. Set the correct Unit on each contract route. (New booking uses the route rate as entered, so check the freight there for carton or piece rates.)',
    screens: ['cust/rate-contracts', 'ops/lr-new'],
    difficulty: 3,
  },
  {
    id: 'q.cust.agreement-detention',
    module: 'cust',
    type: 'mcq',
    prompt: 'Where does the per-day detention rate on the POD screen come from?',
    options: [
      { id: 'a', text: 'The client’s Agreement → "Detention rate (₹/day)"; if there is no agreement, ₹1,500' },
      { id: 'b', text: 'The rate contract route rate ÷ 10' },
      { id: 'c', text: 'The transporter rate matrix' },
      { id: 'd', text: 'It is always typed by hand' },
    ],
    answer: 'a',
    explanation:
      'POD / acknowledgment reads the consignor’s agreement detention rate to value detention days, with ₹1,500 per day as the fallback. Keep agreements current, especially the detention rate.',
    screens: ['cust/agreements', 'ops/pod'],
    difficulty: 2,
  },
  {
    id: 'q.cust.bill-without-ack',
    module: 'cust',
    type: 'scenario',
    prompt: 'Can Accounts bill this LR now?',
    scenario:
      'An LR for Meridian Electronics India is Delivered, To Be Billed, but the POD has not reached the office. In Customer 360, Meridian has "Allow bill without acknowledgment" ticked.',
    options: [
      { id: 'a', text: 'Yes – this customer may be billed before the POD arrives' },
      { id: 'b', text: 'No – every LR needs a POD before billing' },
      { id: 'c', text: 'Only after the rate contract is renewed' },
      { id: 'd', text: 'Only if the customer is on credit hold' },
    ],
    answer: 'a',
    explanation:
      'Normally a delivered LR waits for POD before billing. The customer setting "Allow bill without acknowledgment" makes delivered To Be Billed LRs billable without POD. Tick it only when the customer contract allows.',
    screens: ['cust/360', 'fin/billing'],
    difficulty: 2,
  },
  {
    id: 'q.cust.hamali-use',
    module: 'cust',
    type: 'mcq',
    prompt: 'GRN at rail head pre-fills the labour (hamali) charge. Which hamali rate does it use?',
    options: [
      { id: 'a', text: 'The first Hamali rate for the LR’s goods with use "GRN Station" (₹2.5 per unit if none)' },
      { id: 'b', text: 'The rate for the VP Loading use' },
      { id: 'c', text: 'The transporter rate matrix amount' },
      { id: 'd', text: 'A fixed ₹1,000 per GRN' },
    ],
    answer: 'a',
    explanation:
      'GRN looks up Hamali rates by goods and use "GRN Station"; VP loading uses "VP Loading" (fallback ₹1.8). The lookup does not filter by client or branch, so keep one clear rate per goods and use, and check the charge on the form.',
    screens: ['cust/hamali-rates', 'ops/grn', 'ops/vp-loading'],
    difficulty: 3,
  },
  {
    id: 'q.cust.support-reply',
    module: 'cust',
    type: 'next',
    prompt: 'A Pending ticket from Eastern Home Retail says the driver refused to unload without extra payment. You reply "Speaking to the driver and transporter, will update in 1 hour" and leave Status as "Keep current". What happens?',
    options: [
      { id: 'a', text: 'The reply is added to the ticket and the status moves to In Progress' },
      { id: 'b', text: 'The ticket is closed as Resolved' },
      { id: 'c', text: 'The ticket stays Pending' },
      { id: 'd', text: 'Nothing is saved without an attachment' },
    ],
    answer: 'a',
    explanation:
      'A reply on a Pending ticket moves it to In Progress automatically. Choose a status to set it yourself, or tick "Close ticket (resolved)" to mark it Resolved – after that no more replies can be added.',
    screens: ['cust/support'],
    difficulty: 1,
  },
  {
    id: 'q.cust.delete-customer',
    module: 'cust',
    type: 'tf',
    prompt: 'A customer who already has LRs can be deleted from Customer 360.',
    options: [
      { id: 't', text: 'True' },
      { id: 'f', text: 'False' },
    ],
    answer: 'f',
    explanation:
      'False. The Delete action is hidden for any customer with LRs, so history, bills and outstanding stay linked. To stop new business, use credit hold instead.',
    screens: ['cust/360'],
    difficulty: 1,
  },
  {
    id: 'q.cust.transporter-matrix',
    module: 'cust',
    type: 'mcq',
    prompt: 'What does an entry in the Transporter Rate Matrix (e.g. Kolkata → Siliguri, Market, ₹21,000) do?',
    options: [
      { id: 'a', text: 'Shows "Matrix ₹21,000" as a hint on the Freight field when making a delivery challan on that lane' },
      { id: 'b', text: 'Sets the customer’s freight on every LR for that lane' },
      { id: 'c', text: 'Pays the transporter automatically' },
      { id: 'd', text: 'Blocks DCs above ₹21,000' },
    ],
    answer: 'a',
    explanation:
      'The transporter matrix is what we pay market or union trucks per lane. The delivery challan form shows the first matching lane rate as a hint; it does not fill customer freight and does not block anything.',
    screens: ['cust/transporter-rates', 'ops/dc'],
    difficulty: 2,
  },
  {
    id: 'q.cust.document-file',
    module: 'cust',
    type: 'tf',
    prompt: 'On the Documents screen, choosing a file in "Document file" uploads it so anyone can download it from the ERP.',
    options: [
      { id: 't', text: 'True' },
      { id: 'f', text: 'False' },
    ],
    answer: 'f',
    explanation:
      'False in this version. The Document file field records the chosen file name only. Keep the actual file in the company document store and use this list to know which version is current (name, type, remarks).',
    screens: ['cust/documents'],
    difficulty: 1,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------------------------------------------
export const screens: ScreenTraining[] = [
  // ------------------------------------------------------------------ Customers
  {
    id: 'cust/360',
    module: 'cust',
    title: 'Customer 360',
    purpose:
      'The customer master: every shipper and consignee with LR count, consignments in motion, 90-day revenue, outstanding against credit limit and credit-hold status.',
    why: 'Bookings, LRs, bills and rate contracts all pick the customer from this list, and the credit settings here decide whether new LRs are allowed and when bills can be made.',
    when: 'When a new customer is won, when contact, GST or billing details change, and when Accounts asks you to check credit use or put a customer on hold.',
    roles: ['OP', 'AC', 'CC', 'AD', 'SA'],
    upstream: ['marketing/handoff'],
    downstream: ['cust/agreements', 'cust/rate-contracts', 'book', 'ops/orders', 'fin/billing', 'fin/receivables'],
    before: 'Sales wins the business, or the handoff creates the customer from a won deal.',
    after: 'Agreements and rate contracts are added for the customer, then Operations books LRs and Accounts bills them.',
    prerequisites: ['The customer’s city must exist in the city master.', 'GST no., PAN and billing email from the customer.'],
    actions: [
      'Add customer (Customer name, Short name and City are required).',
      'Import customers from a CSV/Excel file.',
      'Open 360 to see Overview, Consignments, Bills, Contracts and Support tabs.',
      'Edit credit days, credit limit, bill format, LR format and the credit-hold switch.',
      'Start a New order for the customer from the 360 drawer.',
    ],
    records: ['Customer master (customers)'],
    validations: [
      'Save shows "Required: …" until Customer name, Short name and City are filled.',
      'Delete is hidden for a customer who already has LRs.',
      '"Disallow new LR booking (credit hold)" blocks Full LR form and Customer orders for this customer.',
    ],
    mistakes: [
      'Creating a second customer with a slightly different name – LRs, bills and outstanding get split. Search first.',
      'Leaving GST no. or billing email blank – bills go out incomplete.',
      'Ticking "Allow bill without acknowledgment" without a contract that allows it – bills go out before POD.',
      'Expecting New booking to stop a credit-hold customer – it only shows a red warning.',
      'Delete in the row menu removes a customer without LRs at once, with no confirmation.',
    ],
    warnings: [
      'Import customers is a simplified import in this version: it shows a preview of the file but adds up to 3 placeholder customers ("Imported Customer N", city Jalgaon), not the file rows. Check and correct after import, or add customers by hand.',
    ],
    shortcuts: ['Quick filters: Shippers, Consignees, Credit hold, Over 80% limit.', 'Click any row to open the 360 drawer.'],
    fields: [
      { name: 'Customer name / Short name', help: 'Full legal name as on GST, and a short code shown in lists.' },
      { name: 'City', help: 'Home city. New booking uses it as the default pickup city when the customer has no LR history.' },
      { name: 'Credit days / Credit limit (₹)', help: 'Payment terms and the limit used for "Credit used". Defaults 30 days and ₹10,00,000.' },
      { name: 'Interest rate for late payment (%) / Our TDS deduction rate (%)', help: 'Defaults 18% and 2%.' },
      { name: 'Bill format / LR format', help: 'Print layout used for this customer’s bills and LRs.' },
      { name: 'Allow bill without acknowledgment', help: 'Delivered LRs can be billed before the POD arrives.' },
      { name: 'Detention bill', help: 'Customer is billed detention.' },
      { name: 'Disallow new LR booking (credit hold)', help: 'Puts the customer on credit hold.' },
    ],
    statuses: [
      { status: 'Active', meaning: 'Bookings allowed.' },
      { status: 'Credit hold', meaning: 'Disallow new LR booking is ticked; Full LR form and Customer orders are blocked, Order Board shows "Customer on credit hold".' },
    ],
    example:
      'Accounts says Narmada Steel Tubes is over its limit. Filter "Over 80% limit", open Narmada, Edit, tick "Disallow new LR booking (credit hold)" and Save. The KPI "On credit hold" goes up by one.',
    walkthrough: [
      { title: 'Search before adding', body: 'Type the name in the table search. Use Add customer only if the customer is really new.' },
      { title: 'Fill Company and Contacts', body: 'Customer name, Short name and City are required. Add GST no., PAN, address and the billing email.' },
      { title: 'Set Credit & billing', body: 'Set credit days, credit limit, bill format and LR format. Leave credit hold unticked for a new customer unless Accounts says otherwise.' },
      { title: 'Check the 360 drawer', body: 'Click the row. Overview shows outstanding and credit use; Contracts shows rate contracts and agreements; Support shows tickets.' },
      { title: 'Watch credit', body: 'Use the "Over 80% limit" filter weekly and agree any hold with Accounts.' },
    ],
    related: ['cust/rate-contracts', 'cust/agreements', 'fin/receivables', 'marketing/handoff'],
    audio: [
      'यह Customer 360 है — हर customer का पूरा हिसाब एक जगह।',
      'नया customer जोड़ने से पहले search कीजिए, ताकि एक ही customer दो बार न बने।',
      'Customer name, Short name और City ज़रूरी हैं। GST और billing email भी भरिए।',
      'Credit limit का कितना हिस्सा use हो गया, वो Credit used में दिखता है।',
      'Credit hold लगाने पर Full LR form और Customer order में booking रुक जाती है।',
      'New booking सिर्फ़ लाल warning देता है, इसलिए accounts से पूछे बिना book मत कीजिए।',
    ],
    quiz: ['q.cust.credit-hold-booking', 'q.cust.credit-hold-where', 'q.cust.delete-customer'],
    minutes: 6,
  },
  {
    id: 'cust/agreements',
    module: 'cust',
    title: 'Agreements',
    purpose: 'Client agreements: rate type and rate, committed trips, detention rate per day, carrying capacity and validity.',
    why: 'The agreement records what the client signed. Its detention rate is used on the POD screen to value detention days.',
    when: 'When a client signs or renews an agreement, and when the "Expiring ≤ 30d" KPI shows renewals due.',
    roles: ['AC', 'OP', 'AD'],
    upstream: ['cust/360'],
    downstream: ['cust/rate-contracts', 'ops/pod'],
    before: 'The customer exists in Customer 360.',
    after: 'Add the lane-wise freight in Rate Contracts. Detention on PODs uses the agreement rate.',
    prerequisites: ['Customer master created.', 'Signed agreement copy with dates, rate and detention terms.'],
    actions: ['Add agreement.', 'Edit or delete an agreement.', 'Open an agreement from the client’s 360 Contracts tab.'],
    records: ['Agreement (agreements)'],
    validations: ['Save shows "Required: Client, Start date, Expiry date" until those are filled.'],
    mistakes: [
      'Leaving Detention rate empty – POD then values detention at the fallback ₹1,500 per day.',
      'Not renewing an expired agreement – the Expiry date shows in red and it no longer counts as Active.',
    ],
    fields: [
      { name: 'Client / City', help: 'The customer and the city of the agreement.' },
      { name: 'Agreement date / Start date / Expiry date', help: 'Start and Expiry are required. Active = Expiry today or later.' },
      { name: 'Rate type / Rate (₹)', help: 'Per Truck, Per MT, Per Carton or Per KM, with the agreed rate. Tick "Rate inclusive of tax" if it includes GST.' },
      { name: 'Detention rate (₹/day)', help: 'Used on POD to value detention days.' },
      { name: 'Committed trips', help: 'Trips the client committed. "Apply rate if committed business not achieved" records the penalty clause.' },
      { name: 'Lead generated by branch / Approved by', help: 'Which branch brought the business and who approved it.' },
    ],
    statuses: [
      { status: 'Active', meaning: 'Expiry date is today or later.' },
      { status: 'Expiring ≤ 30d', meaning: 'Counted in the KPI when expiry is within 30 days – start renewal.' },
    ],
    example: 'Indus Cool Appliances: Per Truck ₹21,500, detention ₹1,500/day, 60 committed trips, approved by Prakash Wagh.',
    walkthrough: [
      { title: 'Check the KPIs', body: 'Look at Active and "Expiring ≤ 30d" to see renewals due.' },
      { title: 'Add agreement', body: 'Select Client, enter Start and Expiry dates, Rate type and Rate.' },
      { title: 'Enter detention and commitment', body: 'Fill Detention rate (₹/day), Committed trips and Carrying capacity.' },
      { title: 'Save and verify', body: 'Open the client in Customer 360 → Contracts to see the agreement card.' },
    ],
    related: ['cust/rate-contracts', 'cust/360', 'ops/pod'],
    audio: [
      'यहाँ customer के साथ हुए agreements रखे जाते हैं।',
      'Client, Start date और Expiry date ज़रूरी हैं।',
      'Detention rate ज़रूर भरिए — POD पर detention का पैसा इसी rate से बनता है।',
      'Rate न हो, तो system एक दिन का पंद्रह सौ रुपये मान लेता है।',
      'ऊपर Expiring वाला number देखिए और समय पर renewal कीजिए।',
    ],
    quiz: ['q.cust.agreement-detention'],
    minutes: 4,
  },
  {
    id: 'cust/rate-contracts',
    module: 'cust',
    title: 'Rate Contracts',
    purpose:
      'Client rate matrices by route, goods, unit and mode (with slab rates for MT/Kg), own-vehicle dedicated rates, and the client rate matrix report.',
    why: 'An active rate contract pre-fills freight in New booking and the Full LR form, so bookings are charged at the agreed rate.',
    when: 'When a deal is won, when a client agrees new lanes or rates, and before a contract expires.',
    roles: ['AC', 'OP', 'AD'],
    upstream: ['cust/360', 'cust/agreements', 'marketing/handoff', 'marketing/quotations'],
    downstream: ['book', 'ops/lr-new', 'ops/orders'],
    before: 'The customer exists. For CRM customers the handoff may already have created a starting contract.',
    after: 'Bookings for this customer show "Suggested ₹… – from the customer’s rate contract".',
    prerequisites: ['Customer in Customer 360.', 'Cities and goods in the master lists.', 'Agreed rates per lane (for example the accepted quotation).'],
    actions: [
      'New contract: select Client, From/To dates, Remark.',
      'Add route items: From city, To city, Item, Mode (Road / Railway / Both), Unit, Rate, Std. days – then Add item.',
      'Add slab rates when the unit is MT or Kg.',
      'Get old contract: copy routes from the client’s previous contract.',
      'Edit a route rate in the list; delete a route; Save contract (each re-save adds a revision time).',
      'Own vehicle rate contracts tab: rates by truck type and tyres.',
      'Client rate matrix report tab: all routes for one client.',
    ],
    records: ['Rate contract (rateContracts)', 'Own vehicle rate contract (ownRates)'],
    validations: [
      'Save contract: "Select client and add at least one route".',
      'Add item stays disabled until To city, Item and Rate are filled.',
      'Get old contract: "No previous contract for this client" if there is none.',
      'Only contracts whose To date is today or later are used for freight.',
    ],
    mistakes: [
      'Typing a rate but not clicking Add item – the route is not in the contract.',
      'Wrong Unit on a route – Full LR form multiplies non-truck units by packages.',
      'Letting a contract expire – freight falls back to last LR or a distance estimate.',
      'Leaving the handoff’s starting route (deal value ÷ 20, first goods item) instead of the agreed rate.',
      'Delete in the row menu removes a contract at once, without a confirmation – use Edit unless you really mean it.',
    ],
    warnings: ['New booking matches a route on destination and goods only, and takes the first active contract found for the customer – avoid overlapping contracts.'],
    shortcuts: ['Use "Get old contract" when renewing, then change only the rates that moved.'],
    fields: [
      { name: 'Client / From date / To date', help: 'Default validity is one year from today.' },
      { name: 'From city / To city / Item', help: 'The lane and goods. New booking matches on To city and Item.' },
      { name: 'Mode', help: 'Road, Railway or Both.' },
      { name: 'Unit / Rate', help: 'Truck = rate per truck. Other units = rate per unit (Full LR form multiplies by packages).' },
      { name: 'Std. days', help: 'Standard delivery days for the route.' },
      { name: 'Slab rates', help: 'Weight bands (Range from / to / Rate) for MT or Kg units.' },
    ],
    statuses: [
      { status: 'Active', meaning: 'To date more than 30 days away.' },
      { status: 'Expiring', meaning: 'To date within 30 days – still used, renew now. Home also shows an alert.' },
      { status: 'Expired', meaning: 'To date passed – not used for freight.' },
    ],
    example:
      'Tapti Pipes & Fittings agrees Jalgaon → Surat, PVC Pipes 110mm (bundle), Road, Truck, ₹24,500, 2 days. Add the route and save. In New booking, Tapti + Surat + PVC Pipes shows "Suggested ₹24,500 – from the customer’s rate contract".',
    walkthrough: [
      { title: 'New contract', body: 'Click New contract, select the Client, check From and To dates, add a Remark (e.g. "FY 26-27 annual").' },
      { title: 'Add each route', body: 'Choose From city, To city, Item, Mode, Unit; type Rate and Std. days; click Add item. Repeat for every lane.' },
      { title: 'Slabs for weight units', body: 'If Unit is MT or Kg, add slab ranges and rates before Add item.' },
      { title: 'Save contract', body: 'Click Save contract. The contract shows Active with the route count.' },
      { title: 'Verify', body: 'Open Client rate matrix report for the client, or the client’s 360 Contracts tab.' },
    ],
    related: ['cust/agreements', 'book', 'ops/lr-new', 'marketing/handoff'],
    practice: 'ex.cust.rate-contract',
    audio: [
      'यहाँ customer के साथ तय हुए freight rates रखे जाते हैं — route, goods और unit के हिसाब से।',
      'New contract दबाइए, client चुनिए, फिर हर route के लिए city, item, unit और rate भरकर Add item दबाइए।',
      'Add item दबाए बिना route contract में नहीं जुड़ता।',
      'Contract active हो, तो New booking में freight अपने आप भर जाता है।',
      'To date निकल जाए तो contract Expired हो जाता है और rate नहीं आता। समय पर renew कीजिए।',
      'Renewal के लिए Get old contract दबाइए, पुराने routes copy हो जाएँगे।',
    ],
    quiz: ['q.cust.rc-save-rule', 'q.cust.rc-expired', 'q.cust.freight-suggestion-order'],
    minutes: 7,
  },
  {
    id: 'cust/transporter-rates',
    module: 'cust',
    title: 'Transporter Rate Matrix',
    purpose: 'Market and union truck freight by lane – what we expect to pay a hired truck from a source to a destination.',
    why: 'It gives a reference amount when hiring trucks for delivery challans, so lorry hire is not agreed blindly.',
    when: 'When market or union rates change on a lane, or a new lane starts.',
    roles: ['OP', 'AC'],
    upstream: [],
    downstream: ['ops/dc'],
    before: 'Market enquiries or union rate cards give the current lane rate.',
    after: 'The delivery challan form shows "Matrix ₹…" under Freight for that lane.',
    prerequisites: ['Source and destination cities in the city master.'],
    actions: ['Add transporter rate.', 'Edit or delete a lane rate.'],
    records: ['Transporter rate (transRates)'],
    validations: ['Save shows "Required: Source, Destination, Amount (₹)" until filled.'],
    mistakes: [
      'Keeping old rates – the hint becomes misleading.',
      'Adding Market and Union for the same lane and expecting the hint to follow the truck type – the DC hint shows the first matching lane entry.',
      'Treating this as customer freight – customer rates belong in Rate Contracts.',
    ],
    fields: [
      { name: 'Source / Destination', help: 'Lane cities.' },
      { name: 'Truck type', help: 'Market or Union.' },
      { name: 'Amount (₹)', help: 'Expected lorry hire for one truck on the lane.' },
    ],
    example: 'Kolkata → Siliguri, Market, ₹21,000. On a DC from Kolkata to Siliguri the Freight field shows "Matrix ₹21,000".',
    walkthrough: [
      { title: 'Find the lane', body: 'Filter by Source to see existing lanes.' },
      { title: 'Add or edit', body: 'Click Add transporter rate, choose Source, Destination, Market/Union and Amount.' },
      { title: 'Save and use', body: 'Save. The next delivery challan on that lane shows the matrix amount as a hint.' },
    ],
    related: ['ops/dc', 'cust/rate-contracts'],
    audio: [
      'यहाँ market और union truck का lane-wise भाड़ा रखा जाता है।',
      'यह वो पैसा है जो हम truck वाले को देते हैं, customer का rate नहीं।',
      'Delivery challan बनाते समय Freight के नीचे Matrix rate दिखता है।',
      'Rate बदले तो यहाँ तुरंत update कीजिए, नहीं तो hint ग़लत रहेगा।',
    ],
    quiz: ['q.cust.transporter-matrix'],
    minutes: 3,
  },
  {
    id: 'cust/hamali-rates',
    module: 'cust',
    title: 'Hamali Rates',
    purpose: 'Loading/unloading labour (hamali) rates per goods, with client, branch, unit and use (GRN Station, Branch GRN, VP Loading).',
    why: 'Labour charges on GRN at rail head and VP loading are pre-filled from these rates.',
    when: 'When labour contracts change, or a new goods item starts moving through the rail head.',
    roles: ['OP', 'AC'],
    upstream: [],
    downstream: ['ops/grn', 'ops/vp-loading'],
    before: 'Labour rates are agreed with the hamali contractor.',
    after: 'GRN and VP loading forms show the labour charge = quantity × rate.',
    prerequisites: ['Goods item in the goods master.'],
    actions: ['Add hamali rate.', 'Edit or delete a rate.'],
    records: ['Hamali rate (hamaliRates)'],
    validations: ['Save shows "Required: Goods, Rate (₹)" until filled.'],
    mistakes: [
      'Two rates for the same goods and use – GRN and VP loading take the first one found; client and branch are not used to choose.',
      'No rate for a goods item – GRN uses ₹2.5 per unit and VP loading ₹1.8 per unit.',
    ],
    warnings: ['Rates with use "Branch GRN" are stored but not read by any form in this version.'],
    fields: [
      { name: 'Goods', help: 'Goods item the rate applies to (required).' },
      { name: 'Client / Branch / Unit', help: 'Recorded for reference.' },
      { name: 'Rate (₹)', help: 'Labour per unit (required).' },
      { name: 'Hamali use', help: 'GRN Station (GRN at rail head), VP Loading, or Branch GRN.' },
    ],
    example: 'Refrigerator 190L, Indus Cool, Jalgaon, Cartons, ₹4.50, GRN Station. A GRN of 200 cartons pre-fills ₹900 labour.',
    walkthrough: [
      { title: 'Check existing rates', body: 'Filter by Customer or Branch and look for the goods item.' },
      { title: 'Add hamali rate', body: 'Pick Goods, Client, Branch, Unit, Rate and Hamali use.' },
      { title: 'Verify on a form', body: 'On the next GRN or VP loading for that goods, check the pre-filled labour charge.' },
    ],
    related: ['ops/grn', 'ops/vp-loading'],
    audio: [
      'यहाँ माल चढ़ाने-उतारने की मज़दूरी, यानी hamali rate, रखा जाता है।',
      'Goods और rate ज़रूरी हैं, और use चुनिए — GRN Station या VP Loading।',
      'GRN और VP loading पर labour charge इसी rate से अपने आप भरता है।',
      'एक goods और एक use के लिए एक ही rate रखिए, वरना पहला वाला ले लिया जाता है।',
    ],
    quiz: ['q.cust.hamali-use'],
    minutes: 3,
  },
  {
    id: 'cust/documents',
    module: 'cust',
    title: 'Documents',
    purpose: 'Company certificates, licences, insurance policies, rate cards and templates shared with customers.',
    why: 'Customers and tenders ask for ISO, GST, PAN, transport licence and insurance copies; one list keeps the current version.',
    when: 'When a certificate or policy is renewed, or a customer asks for company documents.',
    roles: ['AD', 'CC', 'AC'],
    upstream: ['cust/rate-contracts'],
    downstream: ['cust/support'],
    before: 'The document is renewed or issued.',
    after: 'Customer care can find and share the right document.',
    prerequisites: ['The document file.'],
    actions: ['Add document: name, type, file, remarks.', 'View, edit or delete a document.'],
    records: ['Document (documents)'],
    validations: ['Save shows "Required: Document" until the name is filled.'],
    mistakes: [
      'Keeping an expired insurance policy as the only copy – add the renewed one and remove the old entry.',
      'Vague names – write the period, e.g. "Goods-in-transit Insurance Policy 26-27".',
    ],
    warnings: ['In this version the Document file field records the chosen file name; keep the actual file in the company document store.'],
    fields: [
      { name: 'Document', help: 'Name shown in the list (required).' },
      { name: 'Document type', help: 'Certificate, Statutory, Licence, Insurance, Commercial, Contract or HR Policy.' },
      { name: 'Document file', help: 'Choose the file.' },
      { name: 'Remarks', help: 'Validity, policy number or who to contact.' },
    ],
    example: 'Add "Goods-in-transit Insurance Policy 26-27", type Insurance, file git-policy-26-27.pdf, remark "valid till 31-03-2027".',
    walkthrough: [
      { title: 'Filter by type', body: 'Use the Type filter to find Insurance, Statutory and other groups.' },
      { title: 'Add document', body: 'Enter the name, choose type, choose the file and add remarks.' },
      { title: 'Retire old versions', body: 'Delete or rename the expired entry so nobody shares it.' },
    ],
    related: ['cust/agreements', 'cust/support'],
    audio: [
      'यहाँ company के certificates, licence, insurance और rate card रखे जाते हैं।',
      'Customer कोई document माँगे, तो यहीं से सही version दीजिए।',
      'नाम में साल लिखिए, जैसे insurance policy छब्बीस-सत्ताईस।',
      'पुराना expired document हटा दीजिए, ताकि ग़लत copy न जाए।',
    ],
    quiz: ['q.cust.document-file'],
    minutes: 2,
  },
  {
    id: 'cust/support',
    module: 'cust',
    title: 'Complaints & Support',
    purpose: 'Customer complaint tickets – delays, damage/shortage, billing discrepancy, POD not received, driver behaviour – with a reply thread.',
    why: 'Every complaint gets an owner, a status and a written reply, and the customer’s 360 Support tab shows the history.',
    when: 'Every day: work Pending and In Progress tickets, High priority first.',
    roles: ['CC', 'OP', 'AC'],
    upstream: ['cust/360'],
    downstream: [],
    before: 'The customer raises a ticket.',
    after: 'The ticket is replied to and closed as Resolved; the menu badge counts open tickets.',
    prerequisites: ['Know the LR or bill the customer is asking about (open it from the search bar).'],
    actions: [
      'Filter by status (All, Pending & In Progress, Pending, In Progress, Resolved) or ticket no.',
      'Open a ticket and read the detail and attachment.',
      'Write a reply, optionally set Status, or tick "Close ticket (resolved)", then Reply.',
    ],
    records: ['Complaint ticket (complaints) with replies'],
    validations: [
      'Reply is disabled until you type a message or tick Close ticket.',
      'A reply on a Pending ticket moves it to In Progress unless you choose a status.',
      'A closed ticket shows "Resolved by …" and cannot be replied to.',
    ],
    mistakes: [
      'Closing a ticket before the customer’s issue is actually fixed.',
      'Replying "checking" and never updating – the ticket sits In Progress and the "Avg age (open)" KPI grows.',
      'Billing complaints not passed to Accounts.',
    ],
    statuses: [
      { status: 'Pending', meaning: 'New ticket, not answered yet.' },
      { status: 'In Progress', meaning: 'Answered, work going on.' },
      { status: 'Resolved', meaning: 'Closed; shows who resolved it.' },
    ],
    example:
      'TKT for Brahmaputra Distributors: "Consignment not received after 9 days". Open the LR, check its stage, reply "Truck reached Guwahati, delivery tomorrow" and keep it In Progress; close after POD.',
    walkthrough: [
      { title: 'Start with open tickets', body: 'Keep the filter on "Pending & In Progress"; check the High priority KPI.' },
      { title: 'Read and investigate', body: 'Open the ticket, read the detail and attachment, then check the LR or bill.' },
      { title: 'Reply', body: 'Write a clear reply with the next step and time. Leave Status as is (Pending becomes In Progress) or pick one.' },
      { title: 'Close when fixed', body: 'Tick "Close ticket (resolved)" with a final reply. The ticket shows Resolved by your name.' },
    ],
    related: ['cust/360', 'ops/lr', 'fin/billing'],
    audio: [
      'यहाँ customers की complaints आती हैं — delay, damage, billing या POD की।',
      'पहले High priority वाले tickets खोलिए।',
      'LR या bill check कीजिए, फिर साफ़ reply लिखिए कि आगे क्या होगा और कब।',
      'Pending ticket पर reply करते ही वो In Progress हो जाता है।',
      'काम पूरा हो जाए, तभी Close ticket tick करके Resolved कीजिए।',
    ],
    quiz: ['q.cust.support-reply'],
    minutes: 4,
  },

  // ------------------------------------------------------------------ Marketing & CRM
  {
    id: 'marketing/dashboard',
    module: 'crm',
    title: 'Marketing Dashboard',
    purpose: 'One-page view of leads, qualified leads, open deals, pipeline value, won value, follow-ups pending and active campaigns.',
    why: 'Sales managers see at a glance where leads are stuck and how much business is in the pipeline.',
    when: 'At the start of the day and in weekly sales reviews.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/leads', 'marketing/deals', 'marketing/followups'],
    downstream: ['marketing/followups', 'marketing/lead-pipeline', 'marketing/deal-pipeline'],
    before: 'Leads, deals and activities are entered on their screens.',
    after: 'Work the priorities on Follow-ups and move stuck leads and deals.',
    prerequisites: ['Leads and deals kept up to date.'],
    actions: ['Read the KPIs.', 'Check the Sales funnel counts and Lead sources.', 'Read Today’s priorities.'],
    records: ['Reads leads, deals, activities and campaigns (no records created)'],
    validations: [],
    mistakes: [
      'Reading "Follow-ups due" as only today’s calls – it counts every activity not marked Done.',
      'Quoting the Conversion KPI – it is a fixed figure in this version, not calculated.',
    ],
    warnings: ['The funnel bar lengths are a fixed shape; the numbers next to each stage are the real lead counts.', 'CRM data is stored in this browser only.'],
    fields: [
      { name: 'Qualified', help: 'Leads at Qualified, Proposal or Negotiation.' },
      { name: 'Pipeline', help: 'Total value of deals with status Open.' },
      { name: 'Won', help: 'Total value of Won deals.' },
      { name: 'Follow-ups due', help: 'Activities not marked Done.' },
    ],
    example: 'Pipeline ₹37.7 L across 3 open deals, Won ₹9.6 L. Today’s priorities lists the Vedanta meeting and the Tata Projects call.',
    walkthrough: [
      { title: 'Read the KPIs', body: 'Check Open deals, Pipeline and Follow-ups due.' },
      { title: 'Check the funnel', body: 'Many leads in New or Contacted means follow-ups are not happening.' },
      { title: 'Act on priorities', body: 'Open Follow-ups & Activities and work the listed calls and meetings.' },
    ],
    related: ['marketing/followups', 'marketing/performance', 'marketing/reports'],
    audio: [
      'यह Marketing Dashboard है — leads, deals और follow-ups का पूरा हाल।',
      'Pipeline में open deals की कुल value है, और Won में जीता हुआ business।',
      'Follow-ups due में वो सारे काम हैं जो अभी Done नहीं हुए।',
      'Today’s priorities देखिए, और वहीं से दिन का काम शुरू कीजिए।',
    ],
    quiz: ['q.crm.followup-status', 'q.crm.data-local'],
    minutes: 3,
  },
  {
    id: 'marketing/leads',
    module: 'crm',
    title: 'All Leads',
    purpose: 'List of prospects with contact, transport requirement (mode, lane, cargo, volume), source, owner, expected value, next follow-up and stage.',
    why: 'Every enquiry is recorded once with its logistics requirement, so nothing is lost and the right person follows up.',
    when: 'As soon as an enquiry comes in (website, IndiaMART, referral, cold call, field sales) and whenever the requirement changes.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/campaigns'],
    downstream: ['marketing/followups', 'marketing/lead-pipeline', 'marketing/deals'],
    before: 'A prospect calls, mails or is met in the field.',
    after: 'Schedule a follow-up, move the lead along the pipeline and, when qualified, open a deal.',
    prerequisites: ['Company name (required).', 'Lane written as "From → To" using city names from the city master.'],
    actions: ['Add lead.', 'Search by company, contact, city, source or owner.', 'Open a lead to edit any field, including Stage.'],
    records: ['Lead (browser-local CRM store)'],
    validations: ['Save does nothing until Company is filled.', 'New leads default to Stage New, Owner Vikram Singh, Source Website, Mode Road if not chosen.'],
    mistakes: [
      'Saving without a Next follow-up date – the lead is forgotten.',
      'Writing the lane without an arrow or with a place not in the city master – the handoff later builds a wrong contract route.',
      'Entering the same company twice under different spellings.',
    ],
    warnings: ['Leads are kept in this browser only; colleagues on other computers do not see them.'],
    fields: [
      { name: 'Company / Contact person / Phone / Email / City', help: 'Who the prospect is. Use the legal company name – it is carried to the deal and the customer master.' },
      { name: 'Source', help: 'Website, Referral, Cold Call, IndiaMART, Field Sales, Existing Customer or Campaign.' },
      { name: 'Owner', help: 'Salesperson responsible.' },
      { name: 'Stage', help: 'New, Contacted, Qualified, Proposal, Negotiation, Won, Lost.' },
      { name: 'Expected monthly value', help: 'Expected monthly freight business in ₹.' },
      { name: 'Transport mode / Origin → Destination / Cargo / Volume', help: 'The requirement, e.g. Road, "Jalgaon → Pune", PVC pipes, 20 trucks/month.' },
      { name: 'Next follow-up', help: 'Date of the next contact.' },
    ],
    statuses: [
      { status: 'New', meaning: 'Enquiry recorded, not yet contacted.' },
      { status: 'Contacted', meaning: 'First conversation done.' },
      { status: 'Qualified', meaning: 'Real requirement and budget confirmed.' },
      { status: 'Proposal / Negotiation', meaning: 'Rates offered / being negotiated.' },
      { status: 'Won / Lost', meaning: 'Closed.' },
    ],
    example:
      'IndiaMART enquiry: Balaji Polymers, contact Sunil Patil, Road, "Jalgaon → Pune", PVC granules, 20 trucks/month, ₹4,00,000/month, next follow-up tomorrow, owner Priya Nair.',
    walkthrough: [
      { title: 'Search first', body: 'Search the company name to avoid duplicates.' },
      { title: 'Add lead', body: 'Fill Company, contact details, Source and Owner.' },
      { title: 'Record the requirement', body: 'Transport mode, Origin → Destination, Cargo, Volume and Expected monthly value.' },
      { title: 'Set the next step', body: 'Pick Next follow-up date and Stage, add Notes, then Save.' },
    ],
    related: ['marketing/followups', 'marketing/lead-pipeline', 'marketing/deals'],
    practice: 'ex.crm.lead-to-deal',
    audio: [
      'यहाँ हर नई enquiry, यानी lead, लिखी जाती है।',
      'पहले search कीजिए, कहीं company पहले से तो नहीं है।',
      'Company का पूरा सही नाम लिखिए — यही नाम आगे deal और customer में जाता है।',
      'Route ऐसे लिखिए — Jalgaon, arrow, Pune — city master वाले नाम से।',
      'Next follow-up की date ज़रूर डालिए, वरना lead भूल जाएगी।',
    ],
    quiz: ['q.crm.lead-stages-order', 'q.crm.data-local', 'q.crm.lane-format'],
    minutes: 5,
  },
  {
    id: 'marketing/lead-pipeline',
    module: 'crm',
    title: 'Lead Pipeline',
    purpose: 'Board of leads in columns New, Contacted, Qualified, Proposal, Negotiation and Won, with owner, source and value on each card.',
    why: 'Shows where each prospect stands and lets you move it to the next stage in one click.',
    when: 'After every conversation that changes the lead’s position.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/leads', 'marketing/followups'],
    downstream: ['marketing/deals'],
    before: 'The lead is added in All Leads.',
    after: 'Qualified leads are opened as deals in Deals.',
    prerequisites: ['Lead exists.'],
    actions: ['Change a card’s stage with the dropdown on the card.'],
    records: ['Lead stage (browser-local CRM store)'],
    validations: ['The stage dropdown also offers Lost; a Lost lead leaves the board but stays in All Leads.'],
    mistakes: [
      'Expecting Won to create a deal or customer – it does not. Create the deal in Deals.',
      'Moving leads forward without a real conversation – the funnel and targets become meaningless.',
    ],
    statuses: [
      { status: 'New → Won', meaning: 'Six board columns in sales order.' },
      { status: 'Lost', meaning: 'Hidden from the board; still in All Leads.' },
    ],
    example: 'After a site visit, Balaji Polymers confirms 20 trucks a month: move the card from Contacted to Qualified, then create a deal.',
    walkthrough: [
      { title: 'Scan the columns', body: 'Look for cards stuck in New or Contacted.' },
      { title: 'Move a card', body: 'Use the dropdown on the card to choose the new stage.' },
      { title: 'Open a deal', body: 'When a lead is Qualified, go to Deals → New deal with the same company name.' },
    ],
    related: ['marketing/leads', 'marketing/deals'],
    practice: 'ex.crm.lead-to-deal',
    audio: [
      'यह Lead Pipeline है — हर lead अपने stage के column में।',
      'Card पर dropdown से stage बदलिए।',
      'Lead को Won करने से deal अपने आप नहीं बनती, deal Deals screen पर बनाइए।',
      'Lost की हुई lead board से हट जाती है, पर All Leads में रहती है।',
    ],
    quiz: ['q.crm.lead-stages-order', 'q.crm.lead-won-no-deal'],
    minutes: 3,
  },
  {
    id: 'marketing/followups',
    module: 'crm',
    title: 'Follow-ups & Activities',
    purpose: 'Schedule of calls, meetings, emails, WhatsApp messages and site visits against leads, with Due today, Overdue and Upcoming counts.',
    why: 'Sales is won by timely follow-up; this list is the salesperson’s to-do list.',
    when: 'Every morning, and right after planning the next contact with a prospect.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/leads'],
    downstream: ['marketing/lead-pipeline', 'marketing/quotations'],
    before: 'A lead exists in All Leads.',
    after: 'Update the lead stage after the activity and mark the activity Done.',
    prerequisites: ['The lead (company) must exist – the Lead / company list comes from All Leads.'],
    actions: ['Add activity: Lead / company, Type, Date, Owner, Note.', 'Mark done.'],
    records: ['Activity (browser-local CRM store)'],
    validations: ['New activities are saved as Upcoming.', 'Mark done is shown only for activities not yet Done.'],
    mistakes: [
      'Saving without a date or owner – the form does not stop you, but the activity is useless.',
      'Expecting status to change with the date – it does not; read the Date column.',
      'Not marking done – Follow-ups due on the dashboard stays high.',
    ],
    statuses: [
      { status: 'Upcoming', meaning: 'Planned (all new activities start here).' },
      { status: 'Due / Overdue', meaning: 'Shown on activities flagged as due today or late.' },
      { status: 'Done', meaning: 'Completed via Mark done.' },
    ],
    example: 'Add a Site Visit for Balaji Polymers on Friday, owner Priya Nair, note "Check loading bay and monthly volume".',
    walkthrough: [
      { title: 'Check the counters', body: 'Look at Due today and Overdue first.' },
      { title: 'Do and close', body: 'Make the call or visit, then click Mark done.' },
      { title: 'Plan the next one', body: 'Add activity with Lead, Type, Date, Owner and a short Note.' },
      { title: 'Update the lead', body: 'Change the lead’s stage on Lead Pipeline if it moved.' },
    ],
    related: ['marketing/leads', 'marketing/lead-pipeline', 'marketing/dashboard'],
    practice: 'ex.crm.lead-to-deal',
    audio: [
      'यह salesperson की to-do list है — calls, meetings, emails और site visits।',
      'सुबह पहले Due today और Overdue देखिए।',
      'काम हो जाए तो Mark done दबाइए।',
      'नया काम जोड़ते समय lead, date, owner और छोटा note ज़रूर भरिए।',
      'नया activity हमेशा Upcoming में आता है, date से status अपने आप नहीं बदलता।',
    ],
    quiz: ['q.crm.followup-status'],
    minutes: 3,
  },
  {
    id: 'marketing/campaigns',
    module: 'crm',
    title: 'Campaigns',
    purpose: 'Outreach campaigns with channel, budget, dates, leads generated and deals won.',
    why: 'Shows which outreach brings business, so budget goes to channels that work.',
    when: 'When a campaign is planned, and at review time.',
    roles: ['CC', 'AD', 'SA'],
    upstream: [],
    downstream: ['marketing/leads', 'marketing/reports'],
    before: 'Management approves the campaign and budget.',
    after: 'Leads from the campaign are entered in All Leads with Source "Campaign".',
    prerequisites: ['Approved budget and dates.'],
    actions: ['New campaign: name, channel, budget, start and end.'],
    records: ['Campaign (browser-local CRM store)'],
    validations: ['New campaigns start Active with Leads 0 and Won 0.'],
    mistakes: [
      'Leaving Budget blank – the card shows an invalid amount.',
      'Expecting Leads and Won to count up from All Leads – they are not linked in this version.',
    ],
    warnings: ['There is no edit or close option for a campaign on this screen in this version.'],
    fields: [
      { name: 'Campaign name', help: 'e.g. "Q4 Industrial Logistics Outreach".' },
      { name: 'Channel', help: 'Digital, Email + Calling, Field Sales, Referral Drive, Industry Event.' },
      { name: 'Budget / Start / End', help: 'Spend and period.' },
    ],
    example: 'New campaign "Khandesh MIDC Referral Drive", Referral Drive, ₹40,000, 1 Nov – 15 Dec.',
    walkthrough: [
      { title: 'Review cards', body: 'Compare Budget against Leads and Won for each campaign.' },
      { title: 'Create a campaign', body: 'New campaign → name, channel, budget, start and end → Save.' },
      { title: 'Tag the leads', body: 'Add leads from the campaign with Source "Campaign" and mention the campaign in Notes.' },
    ],
    related: ['marketing/leads', 'marketing/reports'],
    audio: [
      'यहाँ marketing campaigns हैं — budget, channel और कितनी leads आईं।',
      'New campaign में नाम, channel, budget और dates भरिए।',
      'Budget खाली मत छोड़िए।',
      'Campaign से आई leads को All Leads में Source Campaign के साथ डालिए।',
    ],
    quiz: ['q.crm.data-local'],
    minutes: 2,
  },
  {
    id: 'marketing/deals',
    module: 'crm',
    title: 'Deals',
    purpose: 'Commercial opportunities with company, contact, owner, lane, value, probability, expected close date and stage.',
    why: 'A deal is the specific business being negotiated; Won deals feed targets and the handoff to Operations.',
    when: 'When a lead is qualified and you start discussing rates, and whenever the stage, value or close date changes.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/leads', 'marketing/lead-pipeline'],
    downstream: ['marketing/quotations', 'marketing/deal-pipeline', 'marketing/handoff'],
    before: 'The lead is Qualified.',
    after: 'Quotations are created against the deal; when Won, the handoff starts.',
    prerequisites: ['Company name exactly as it should appear on the customer master.', 'Lane as "From → To" with master city names.'],
    actions: ['New deal.', 'Open a deal to edit company, contact, owner, stage, value, probability, lane and expected close.'],
    records: ['Deal (browser-local CRM store)'],
    validations: [
      'New deals default to Stage Qualified, Probability 40%, Status Open.',
      'Choosing Won or Lost sets the deal status; other stages keep it Open.',
    ],
    mistakes: [
      'Typing the company differently from the customer master – the handoff then creates a duplicate customer.',
      'Lane without an arrow or with a city not in the master – the handoff route falls back to Jalgaon.',
      'Setting Won here leaves Probability as typed; use Deal Pipeline (which sets 100%) or change Probability yourself.',
    ],
    fields: [
      { name: 'Company / Contact', help: 'Carried to the customer master on handoff.' },
      { name: 'Owner', help: 'Salesperson; drives Sales Targets and Sales Performance.' },
      { name: 'Stage', help: 'Qualified, Proposal, Negotiation, Won, Lost.' },
      { name: 'Deal value', help: 'Expected business in ₹. The handoff uses it for credit limit (2 × value) and the starting contract rate (value ÷ 20).' },
      { name: 'Probability %', help: 'Chance of winning.' },
      { name: 'Lane / Expected close', help: 'e.g. "Jalgaon → Pune" and the target closing date.' },
    ],
    statuses: [
      { status: 'Open', meaning: 'Qualified, Proposal or Negotiation – counts in Pipeline.' },
      { status: 'Won', meaning: 'Counts in Won value and targets; available in Won Deal Handoff.' },
      { status: 'Lost', meaning: 'Closed without business.' },
    ],
    example: 'New deal: Balaji Polymers, Sunil Patil, owner Priya Nair, Qualified, ₹4,00,000, 50%, "Jalgaon → Pune", close 30 Oct.',
    walkthrough: [
      { title: 'New deal', body: 'Click New deal and type the company exactly as on the lead.' },
      { title: 'Commercials', body: 'Enter Deal value, Probability % and Expected close.' },
      { title: 'Lane', body: 'Write the lane as "From → To" with city master names.' },
      { title: 'Keep it current', body: 'Open the deal after each negotiation and update stage, value and probability.' },
    ],
    related: ['marketing/deal-pipeline', 'marketing/quotations', 'marketing/handoff'],
    practice: 'ex.crm.lead-to-deal',
    audio: [
      'Deal मतलब वो business जिसकी बात पक्की होने वाली है।',
      'Qualified lead के लिए New deal बनाइए, company का नाम बिल्कुल वही रखिए।',
      'Value, probability और expected close date भरिए।',
      'Lane ऐसे लिखिए — Jalgaon arrow Pune — ताकि handoff में सही route बने।',
      'Deal Won होते ही Won Deal Handoff में जाइए।',
    ],
    quiz: ['q.crm.lead-won-no-deal', 'q.crm.handoff-name-match', 'q.crm.lane-format'],
    minutes: 4,
  },
  {
    id: 'marketing/deal-pipeline',
    module: 'crm',
    title: 'Deal Pipeline',
    purpose: 'Board of deals in columns Qualified, Proposal, Negotiation, Won and Lost, with value, probability and lane.',
    why: 'Moves deals forward quickly and starts the ERP handoff from a Won card.',
    when: 'After each negotiation step, and when a deal is won or lost.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/deals'],
    downstream: ['marketing/handoff'],
    before: 'The deal exists in Deals.',
    after: 'Won deals go to Won Deal Handoff.',
    prerequisites: ['Deal exists.'],
    actions: ['Change stage with the card dropdown.', 'Start ERP handoff on a Won card.'],
    records: ['Deal stage, status and probability (browser-local CRM store)'],
    validations: ['Moving to Won sets status Won and probability 100%. Lost sets status Lost. Other stages set status Open.'],
    mistakes: [
      'Marking Won before the customer has accepted rates in writing.',
      'Marking Won and not doing the handoff – Operations never gets the customer or contract.',
    ],
    statuses: [
      { status: 'Qualified / Proposal / Negotiation', meaning: 'Open deal stages.' },
      { status: 'Won', meaning: 'Card shows "Start ERP handoff".' },
      { status: 'Lost', meaning: 'Closed.' },
    ],
    example: 'Vedanta Aluminium signs the rate letter: move DL-502 from Negotiation to Won, then click Start ERP handoff.',
    walkthrough: [
      { title: 'Review columns', body: 'Look at high-value deals in Negotiation.' },
      { title: 'Move the deal', body: 'Choose the new stage in the card dropdown.' },
      { title: 'Start handoff', body: 'On a Won card click "Start ERP handoff".' },
    ],
    related: ['marketing/deals', 'marketing/handoff'],
    practice: 'ex.crm.won-handoff',
    audio: [
      'यह Deal Pipeline है — हर deal अपने stage में।',
      'Dropdown से stage बदलिए। Won करते ही probability सौ percent हो जाती है।',
      'Won card पर Start ERP handoff दबाइए।',
      'Handoff के बिना operations को customer और rate नहीं मिलता।',
    ],
    quiz: ['q.crm.deal-won-next', 'q.crm.handoff-booking-gate'],
    minutes: 3,
  },
  {
    id: 'marketing/quotations',
    module: 'crm',
    title: 'Quotations',
    purpose: 'Freight quotations linked to deals: lane, rate, basis (per 32T vehicle, per MT, per trip, per container), validity and status.',
    why: 'Keeps a record of what rate was offered to whom and until when.',
    when: 'When the customer asks for rates during Proposal or Negotiation.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/deals'],
    downstream: ['marketing/deal-pipeline', 'cust/rate-contracts'],
    before: 'A deal exists for the customer.',
    after: 'When the deal is won, the agreed rate must be entered in Rate Contracts.',
    prerequisites: ['Deal exists (the Deal list comes from Deals).'],
    actions: ['Create quotation: choose Deal (Company and Lane fill in), edit Lane, enter Rate, Basis, Valid until.'],
    records: ['Quotation (browser-local CRM store)'],
    validations: ['New quotations are saved with status Draft.', 'Company is read-only and comes from the deal.'],
    mistakes: [
      'Leaving Rate blank – the row shows an invalid amount.',
      'Assuming the quotation becomes the rate contract – it does not; copy the agreed rate into Rate Contracts after handoff.',
      'Quoting a basis different from the contract unit (e.g. Per MT quote but Truck route).',
    ],
    warnings: ['Status cannot be changed on this screen in this version; track acceptance on the deal stage.'],
    fields: [
      { name: 'Deal', help: 'Fills Company and Lane.' },
      { name: 'Rate / Basis', help: 'Amount and what it is per: Per 32T vehicle, Per MT, Per trip, Per container.' },
      { name: 'Valid until', help: 'Last date the offer holds.' },
    ],
    statuses: [
      { status: 'Draft', meaning: 'Created on this screen.' },
      { status: 'Sent / Negotiation', meaning: 'Statuses on existing sample quotations.' },
    ],
    example: 'Quotation for DL-505 Balaji Polymers, Jalgaon → Pune, ₹21,000 Per 32T vehicle, valid till 31 Oct.',
    walkthrough: [
      { title: 'Create quotation', body: 'Click Create quotation and select the Deal.' },
      { title: 'Price it', body: 'Check Lane, enter Rate and Basis, set Valid until.' },
      { title: 'After winning', body: 'Use the same rate and basis when correcting the rate contract after handoff.' },
    ],
    related: ['marketing/deals', 'cust/rate-contracts', 'marketing/handoff'],
    practice: 'ex.crm.lead-to-deal',
    audio: [
      'यहाँ customer को दिए गए freight quotations रखे जाते हैं।',
      'Deal चुनिए, company और lane अपने आप आ जाएँगे।',
      'Rate, basis और valid until भरिए।',
      'Quotation से rate contract अपने आप नहीं बनता।',
      'Deal जीतने के बाद यही rate Rate Contracts में डालिए।',
    ],
    quiz: ['q.crm.quote-not-contract', 'q.crm.handoff-contract-rate'],
    minutes: 3,
  },
  {
    id: 'marketing/handoff',
    module: 'crm',
    title: 'Won Deal Handoff',
    purpose: 'Turns a Won deal into ERP records in four steps: Deal Won → Customer 360 → Rate Contract → first Booking.',
    why: 'This is the bridge from Sales to Operations: it creates (or links) the customer master and a rate contract in the ERP data and opens New booking for the customer.',
    when: 'Immediately after a deal is marked Won.',
    roles: ['CC', 'AD', 'SA'],
    upstream: ['marketing/deal-pipeline', 'marketing/deals'],
    downstream: ['cust/360', 'cust/rate-contracts', 'book'],
    before: 'The deal is Won (Deal Pipeline or Deals).',
    after: 'Complete the customer in Customer 360, correct the contract in Rate Contracts and book the first LR.',
    prerequisites: [
      'Deal company spelt exactly like the customer master if the customer already exists.',
      'Deal lane as "From → To" using city master names.',
    ],
    actions: [
      'Select the Won deal.',
      'Create customer (or it links an existing customer with the same name) / Open customer.',
      'Create rate contract / Open contract.',
      'Create first booking – opens New booking with the customer selected.',
    ],
    records: ['Customer master (customers, with crmDealId)', 'Rate contract (rateContracts, with crmDealId)'],
    validations: [
      'Only deals at stage Won are listed; with none, the screen says "Mark a deal as Won in Deal Pipeline to start the handoff."',
      'Create customer links an existing customer whose name equals the deal company (case ignored) and shows "Existing customer linked".',
      'Create rate contract is disabled until a customer is linked.',
      'Create first booking is disabled until both customer and an active rate contract exist.',
      'Handoff summary shows "Ready for operations" only when customer and contract both exist.',
    ],
    mistakes: [
      'Company spelt differently from the existing customer – a duplicate customer is created.',
      'Leaving the auto-created route as it is – the rate is deal value ÷ 20 for the first goods item, not the quoted rate.',
      'Not completing GST, PAN, address and billing email on the new customer before billing.',
    ],
    warnings: [
      'The new customer gets credit 30 days and credit limit = larger of ₹5,00,000 and 2 × deal value. Agree these with Accounts.',
      'The auto contract has one Road route (Truck unit, 2 days) from the deal lane; a city not in the master becomes Jalgaon. Its dates are fixed to 09-10-2026 → 08-10-2027 in this version – check them.',
      'The deal itself stays in this browser; only the customer and the contract go to the shared ERP data.',
    ],
    statuses: [
      { status: 'Completed (step 1)', meaning: 'Deal is Won.' },
      { status: 'Created (step 2)', meaning: 'Customer linked.' },
      { status: 'Active (step 3)', meaning: 'An active rate contract for the customer exists.' },
      { status: 'Ready for operations', meaning: 'Customer and contract both exist.' },
      { status: 'Onboarding', meaning: 'Something is still missing.' },
    ],
    example:
      'DL-504 Hindalco Industries, ₹9,60,000, "Renukoot → Delhi". Create customer → credit limit ₹19,20,000. Create rate contract → one route at ₹48,000. Renukoot is not in the city master, so the route starts at Jalgaon – open the contract and fix the route before booking.',
    walkthrough: [
      { title: 'Pick the Won deal', body: 'Select it in "Won deal". Check value, lane and sales owner.' },
      { title: 'Customer', body: 'Click Create customer. If the same name exists it is linked instead. Then Open customer and complete GST, PAN, address, emails.' },
      { title: 'Rate contract', body: 'Click Create rate contract, then Open contract and correct goods, unit, rate and dates to the agreed quotation.' },
      { title: 'First booking', body: 'Click Create first booking. New booking opens with the customer selected.' },
    ],
    related: ['marketing/deal-pipeline', 'cust/360', 'cust/rate-contracts', 'book'],
    practice: 'ex.crm.won-handoff',
    audio: [
      'यह Won Deal Handoff है — sales से operations तक का पुल।',
      'Won deal चुनिए, फिर Create customer दबाइए। उसी नाम का customer पहले से हो, तो वही link हो जाता है।',
      'नाम में ज़रा भी फ़र्क हो, तो नया duplicate customer बन जाता है — ध्यान रखिए।',
      'Create rate contract से एक शुरुआती rate बनता है, deal value का बीसवाँ हिस्सा।',
      'उसे Rate Contracts में खोलकर quotation वाला सही rate डालिए।',
      'Customer और contract दोनों बन जाएँ, तब Create first booking दबाइए।',
    ],
    quiz: ['q.crm.handoff-creates', 'q.crm.handoff-booking-gate', 'q.crm.handoff-name-match'],
    minutes: 6,
  },
  {
    id: 'marketing/targets',
    module: 'crm',
    title: 'Sales Targets',
    purpose: 'Monthly target and achievement for each salesperson (October 2026), from Won deal value.',
    why: 'Shows each person how far they are from target.',
    when: 'Weekly reviews and month end.',
    roles: ['AD', 'SA', 'CC'],
    upstream: ['marketing/deals', 'marketing/deal-pipeline'],
    downstream: ['marketing/performance'],
    before: 'Deals are marked Won with the correct owner and value.',
    after: 'Discuss gaps in the sales review.',
    prerequisites: ['Deal owner and value correct.'],
    actions: ['Read target, won value and % achieved per person.'],
    records: ['Reads deals (no records created)'],
    validations: [],
    mistakes: ['Wrong owner on a deal – achievement goes to the wrong person.', 'Expecting LR freight to count – only Won deal value counts.'],
    warnings: ['Targets are fixed in this version: Vikram Singh ₹30 L, Priya Nair ₹25 L, Rahul Das ₹20 L. Won deals are counted regardless of close date.'],
    example: 'Rahul Das: target ₹20,00,000, Won ₹9,60,000 (Hindalco) → 48% achieved.',
    walkthrough: [
      { title: 'Read each card', body: 'Target, Won and the progress bar.' },
      { title: 'Check the deals', body: 'If a number looks wrong, check deal owner and status in Deals.' },
    ],
    related: ['marketing/performance', 'marketing/deals'],
    audio: [
      'यहाँ हर salesperson का target और achievement है।',
      'Achievement सिर्फ़ Won deals की value से बनता है।',
      'Deal पर owner ग़लत हो, तो achievement ग़लत आदमी के नाम जाता है।',
    ],
    quiz: ['q.crm.targets-calc'],
    minutes: 2,
  },
  {
    id: 'marketing/performance',
    module: 'crm',
    title: 'Sales Performance',
    purpose: 'Table per salesperson: leads, open deals, pipeline value, won deals, activities and conversion.',
    why: 'Compares effort (leads, activities) with results (won deals) for coaching.',
    when: 'Weekly sales review.',
    roles: ['AD', 'SA', 'CC'],
    upstream: ['marketing/leads', 'marketing/deals', 'marketing/followups'],
    downstream: ['marketing/targets', 'marketing/reports'],
    before: 'Leads, deals and activities carry the right owner.',
    after: 'Agree actions per person.',
    prerequisites: ['Owner filled on leads, deals and activities.'],
    actions: ['Read the table.'],
    records: ['Reads leads, deals and activities (no records created)'],
    validations: [],
    mistakes: ['Activities without owner are not counted for anyone.'],
    fields: [
      { name: 'Pipeline value', help: 'Sum of the person’s Open deals.' },
      { name: 'Conversion', help: 'Won deals ÷ all deals of that person.' },
    ],
    example: 'Vikram Singh: 2 leads, 2 open deals, ₹19.7 L pipeline, 0 won, 2 activities, 0% conversion – focus on closing.',
    walkthrough: [
      { title: 'Compare rows', body: 'High activities but low conversion means deals are stuck – review pricing.' },
      { title: 'Drill down', body: 'Open Deal Pipeline filtered mentally by owner to see which deals are stuck.' },
    ],
    related: ['marketing/targets', 'marketing/reports'],
    audio: [
      'यहाँ हर salesperson का काम और नतीजा एक table में है।',
      'Conversion मतलब कुल deals में से कितनी Won हुईं।',
      'Leads, deals और activities पर owner सही रखिए, तभी यह report सही आती है।',
    ],
    quiz: ['q.crm.targets-calc'],
    minutes: 2,
  },
  {
    id: 'marketing/reports',
    module: 'crm',
    title: 'CRM Reports',
    purpose: 'Catalogue of sales and marketing MIS reports with a pipeline snapshot (total leads, deals, quotations, activities).',
    why: 'Management review of funnel, sources, forecast, activity, campaign ROI, lost deals and lanes.',
    when: 'Monthly management review.',
    roles: ['AD', 'SA'],
    upstream: ['marketing/leads', 'marketing/deals', 'marketing/campaigns'],
    downstream: [],
    before: 'CRM screens are kept up to date.',
    after: 'Decisions on campaigns, pricing and lanes.',
    prerequisites: [],
    actions: ['Read the Pipeline snapshot counts.'],
    records: ['Reads CRM data (no records created)'],
    validations: [],
    mistakes: ['Expecting the report cards to open – see the warning.'],
    warnings: ['The "View report" and "Export" buttons on the report cards do not open anything yet in this version; use Dashboard, Targets and Performance for figures.'],
    example: 'Snapshot: 6 leads, 4 deals, 2 quotations, 4 activities.',
    walkthrough: [
      { title: 'Read the snapshot', body: 'Totals for leads, deals, quotations and activities.' },
      { title: 'Use live screens', body: 'For details open Marketing Dashboard, Sales Performance and Sales Targets.' },
    ],
    related: ['marketing/dashboard', 'marketing/performance', 'marketing/targets'],
    audio: [
      'यहाँ sales और marketing की reports की list है।',
      'नीचे pipeline snapshot में कुल leads, deals, quotations और activities दिखती हैं।',
      'अभी report cards के buttons से report नहीं खुलती, figures के लिए Dashboard और Performance देखिए।',
    ],
    quiz: ['q.crm.data-local'],
    minutes: 2,
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Practice exercises
// ---------------------------------------------------------------------------------------------------------------
export const exercises: Exercise[] = [
  {
    id: 'ex.crm.lead-to-deal',
    title: 'From enquiry to deal and quotation',
    module: 'crm',
    roles: ['CC', 'AD', 'SA'],
    summary:
      'Record a new enquiry as a lead, plan a follow-up, qualify it, open a deal with the same company and lane, and send a quotation. Note: CRM records are kept in this browser, not in the practice data.',
    minutes: 10,
    watch: [],
    steps: [
      {
        id: 'lead',
        task: 'In All Leads, click Add lead. Company "Balaji Polymers Pvt Ltd", contact Sunil Patil, Source IndiaMART, Mode Road, Origin → Destination "Jalgaon → Pune", Cargo "PVC granules", Expected monthly value 400000, a Next follow-up date. Save.',
        expected: 'A new lead (ID LD-10xx beyond the sample list) with company and lane filled.',
        screen: 'marketing/leads',
        check: () => {
          const s = readCrm();
          if (!s) return notYet(NO_CRM);
          const ls = newLeads(s);
          if (!ls.length) return notYet('No new lead yet (only the sample leads are present)');
          const l = ls.find((x) => norm(x.lane)) || ls[0];
          if (!norm(l.lane)) return notYet(`Lead ${l.id} ${l.company} has no Origin → Destination – open it and fill the lane`);
          return pass(`Lead ${l.id} · ${l.company} · ${l.lane} · ${inr(l.value)} · stage ${l.stage}`);
        },
      },
      {
        id: 'activity',
        task: 'In Follow-ups & Activities, click Add activity for your new lead: Type Call, a Date, Owner, and a Note such as "Confirm monthly volume". Save.',
        expected: 'A new activity added after the exercise started.',
        screen: 'marketing/followups',
        check: (_db, base) => {
          const s = readCrm();
          if (!s) return notYet(NO_CRM);
          const leadNames = new Set(newLeads(s).map((l) => norm(l.company)));
          const acts = s.activities.filter((a) => stampedAfter(a?.id, 'AC', base));
          if (!acts.length) return notYet('No activity added since the exercise started');
          const a = acts.find((x) => leadNames.has(norm(x.lead))) || acts[0];
          if (!norm(a.lead)) return notYet('Activity saved without a Lead / company – add one that names your lead');
          return pass(`${a.type || 'Activity'} for ${a.lead}${a.date ? ' on ' + a.date : ''} · ${a.status}`);
        },
      },
      {
        id: 'qualify',
        task: 'In Lead Pipeline, move your lead to Qualified (use the dropdown on its card).',
        expected: 'Your lead is at Qualified, Proposal or Negotiation.',
        screen: 'marketing/lead-pipeline',
        check: () => {
          const s = readCrm();
          if (!s) return notYet(NO_CRM);
          const l = newLeads(s).find((x) => ['Qualified', 'Proposal', 'Negotiation', 'Won'].includes(x.stage));
          if (!l) {
            const any = newLeads(s)[0];
            return notYet(any ? `Lead ${any.company} is still at ${any.stage}` : 'No new lead found');
          }
          return pass(`${l.company} is now ${l.stage}`);
        },
      },
      {
        id: 'deal',
        task: 'In Deals, click New deal. Type the company exactly as on the lead, Stage Qualified or Proposal, Deal value 400000, Probability 50, Lane "Jalgaon → Pune", an Expected close date. Save.',
        expected: 'A new deal (DL-5xx beyond the sample list) whose company matches your lead.',
        screen: 'marketing/deals',
        check: () => {
          const s = readCrm();
          if (!s) return notYet(NO_CRM);
          const ds = newDeals(s);
          if (!ds.length) return notYet('No new deal yet');
          const leadNames = new Set(newLeads(s).map((l) => norm(l.company)));
          const d = ds.find((x) => leadNames.has(norm(x.company)));
          if (!d) return notYet(`Deal ${ds[0].id} “${ds[0].company}” does not match any new lead – the company must be spelt exactly the same`);
          if (!/→|->/.test(String(d.lane || ''))) return notYet(`Deal ${d.id} lane “${d.lane || ''}” has no arrow – write it as "Jalgaon → Pune"`);
          return pass(`Deal ${d.id} · ${d.company} · ${inr(d.value)} · ${d.prob}% · ${d.lane} · ${d.stage}`);
        },
      },
      {
        id: 'quote',
        task: 'In Quotations, click Create quotation, select your deal, enter Rate 21000, Basis "Per 32T vehicle" and a Valid until date. Save.',
        expected: 'A new Draft quotation linked to your new deal.',
        screen: 'marketing/quotations',
        check: (_db, base) => {
          const s = readCrm();
          if (!s) return notYet(NO_CRM);
          const dealIds = new Set(newDeals(s).map((d) => d.id));
          const qs = s.quotes.filter((q) => stampedAfter(q?.id, 'QT-', base));
          if (!qs.length) return notYet('No quotation created since the exercise started');
          const q = qs.find((x) => dealIds.has(x.deal));
          if (!q) return notYet(`Quotation ${qs[0].id} is linked to ${qs[0].deal || 'no deal'} – select your new deal`);
          if (!(Number(q.rate) > 0)) return notYet(`Quotation ${q.id} has no valid Rate`);
          return pass(`${q.id} · ${q.company} · ${inr(q.rate)} ${q.basis || ''} · valid ${q.valid || '—'} · ${q.status}`);
        },
      },
    ],
  },
  {
    id: 'ex.crm.won-handoff',
    title: 'Win a deal and hand it to Operations',
    module: 'crm',
    roles: ['CC', 'AD', 'SA'],
    summary:
      'Mark a deal Won, create the customer and rate contract through Won Deal Handoff, and make the first booking. Use your practice deal with lane "Jalgaon → Pune" so the contract route matches real cities.',
    minutes: 12,
    watch: ['customers', 'rateContracts', 'lrs'],
    workflow: true,
    steps: [
      {
        id: 'won',
        task: 'In Deal Pipeline, move your practice deal (e.g. Balaji Polymers, lane "Jalgaon → Pune") to Won. If you have none, create one in Deals first.',
        expected: 'A deal other than the sample DL-504 at stage Won.',
        screen: 'marketing/deal-pipeline',
        check: () => {
          const s = readCrm();
          if (!s) return notYet(NO_CRM);
          const won = s.deals.filter((d) => d?.stage === 'Won' && d.id !== 'DL-504');
          if (!won.length) return notYet('No deal moved to Won yet (DL-504 was already Won in the sample)');
          const d = won.find((x) => !SEED_DEALS.includes(x.id)) || won[0];
          return pass(`${d.id} · ${d.company} is Won · ${inr(d.value)} · ${d.lane || 'no lane'}`);
        },
      },
      {
        id: 'customer',
        task: 'Click "Start ERP handoff" (or open Won Deal Handoff), select the Won deal and click Create customer.',
        expected: 'A customer created from the deal (or an existing customer with exactly the same name linked).',
        screen: 'marketing/handoff',
        check: (db, base) => {
          const c = created(db, base, 'customers', (r) => !!r.crmDealId);
          if (c.length) {
            const r = c[c.length - 1];
            return pass(`Customer ${r.name} (${r.short}) created from deal ${r.crmDealId} · credit ${r.creditDays} days · limit ${inr(r.creditLimit)}`);
          }
          const s = readCrm();
          const wonNames = new Set((s?.deals || []).filter((d) => d?.stage === 'Won' && d.id !== 'DL-504').map((d) => norm(d.company)));
          const linked = (Array.isArray(db?.customers) ? db.customers : []).find((x: any) => wonNames.has(norm(x?.name)));
          if (linked) return pass(`Existing customer ${linked.name} matches the won deal and is linked`);
          return notYet('No customer created from a won deal yet');
        },
      },
      {
        id: 'contract',
        task: 'In step 3 of the handoff click Create rate contract. Then click Open contract and look at the route the ERP made.',
        expected: 'A rate contract created from the won deal.',
        screen: 'marketing/handoff',
        check: (db, base) => {
          const rc = created(db, base, 'rateContracts', (r) => !!r.crmDealId);
          if (!rc.length) return notYet('No rate contract created from a won deal yet');
          const r = rc[rc.length - 1];
          const rt = (r.routes || [])[0];
          const city = (id: string) => (db?.cities || []).find((c: any) => c.id === id)?.name || id || '—';
          return pass(`Contract for ${(db?.customers || []).find((c: any) => c.id === r.customerId)?.name || r.customerId} · ${r.from} → ${r.to}${rt ? ` · ${city(rt.source)} → ${city(rt.dest)} at ${inr(rt.rate)}` : ''}`);
        },
      },
      {
        id: 'booking',
        task: 'Back on the handoff, click Create first booking. In New booking choose destination Pune and goods Refrigerator 190L (the goods the handoff put on the route), pick a receiver, check the freight hint, choose a truck or Decide later, and book.',
        expected: 'An LR booked for the customer created through the handoff.',
        screen: 'book',
        check: (db, base) => {
          const custs = new Set((Array.isArray(db?.customers) ? db.customers : []).filter((c: any) => c?.crmDealId).map((c: any) => c.id));
          const l = created(db, base, 'lrs', (r) => custs.has(r.consignorId));
          if (!l.length) return notYet('No LR booked for a handoff customer yet');
          const lr = l[l.length - 1];
          return pass(`LR ${lr.lrNo} · ${lr.source} → ${lr.destination} · freight ${inr(lr.freight)} · ${lr.status}`);
        },
      },
    ],
  },
  {
    id: 'ex.cust.rate-contract',
    title: 'Add a rate contract and see it pre-fill freight',
    module: 'cust',
    roles: ['AC', 'OP', 'AD'],
    summary:
      'Create a rate contract for Tapti Pipes & Fittings on a new lane, then book a load on that lane and see New booking suggest freight "from the customer’s rate contract".',
    minutes: 8,
    watch: ['rateContracts', 'lrs'],
    steps: [
      {
        id: 'contract',
        task: 'In Rate Contracts click New contract. Client Tapti Pipes & Fittings, keep the dates. Route: From city Jalgaon, To city Surat, Item PVC Pipes 110mm (bundle), Mode Road, Unit Truck, Rate 24500, Std. days 2 → Add item. Save contract.',
        expected: 'A new rate contract with at least one route.',
        screen: 'cust/rate-contracts',
        check: (db, base) => {
          const rc = created(db, base, 'rateContracts', (r) => Array.isArray(r.routes) && r.routes.length > 0);
          if (!rc.length) return notYet('No new rate contract with a route yet – remember to click Add item before Save contract');
          const r = rc[rc.length - 1];
          const cust = (db?.customers || []).find((c: any) => c.id === r.customerId)?.name || r.customerId;
          const city = (id: string) => (db?.cities || []).find((c: any) => c.id === id)?.name || id;
          const rt = r.routes[0];
          return pass(`Contract for ${cust} · ${r.routes.length} route(s) · ${city(rt.source)} → ${city(rt.dest)} ${inr(rt.rate)} · valid till ${r.to}`);
        },
      },
      {
        id: 'book',
        task: 'Open New booking. Customer Tapti Pipes & Fittings, destination Surat, a receiver, goods PVC Pipes 110mm (bundle). Check the Freight hint says "from the customer’s rate contract" (click "Use ₹24,500" if needed). Book with Decide later.',
        expected: 'An LR for the contract customer to a destination on the new contract.',
        screen: 'book',
        check: (db, base) => {
          const rcs = created(db, base, 'rateContracts', (r) => Array.isArray(r.routes) && r.routes.length > 0);
          if (!rcs.length) return notYet('Create the rate contract first');
          const lrs = created(db, base, 'lrs', (l) => rcs.some((r) => r.customerId === l.consignorId && r.routes.some((rt: any) => rt.dest === l.destCity)));
          if (!lrs.length) return notYet('No LR booked yet for the contract customer on a contract route');
          const l = lrs[lrs.length - 1];
          const rc = rcs.find((r) => r.customerId === l.consignorId)!;
          const rt = rc.routes.find((x: any) => x.dest === l.destCity && (!x.goodsId || x.goodsId === l.items?.[0]?.goodsId));
          const note = rt ? (Number(l.freight) === Number(rt.rate) ? 'freight matches the contract rate' : `freight ${inr(l.freight)} differs from contract ${inr(rt.rate)} – check goods and use the suggestion`) : 'goods differ from the contract route';
          return pass(`LR ${l.lrNo} · ${l.source} → ${l.destination} · ${inr(l.freight)} · ${note}`);
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
    id: 'wf.crm',
    title: 'Enquiry to first booking (Marketing → Operations)',
    module: 'crm',
    roles: ['CC', 'AD', 'SA', 'OP', 'AC'],
    summary:
      'How a new enquiry becomes a lead, is followed up, turns into a deal with a quotation, is won, and is handed to Operations as a customer with a rate contract and a first booking.',
    steps: [
      { screen: 'marketing/leads', title: 'Record the enquiry', does: 'Add lead with company, contact, source, owner, mode, lane ("From → To"), cargo, volume, value and next follow-up date.' },
      { screen: 'marketing/followups', title: 'Follow up', does: 'Add calls, meetings or site visits against the lead; Mark done after each one.' },
      { screen: 'marketing/lead-pipeline', title: 'Qualify', does: 'Move the lead New → Contacted → Qualified. This does not create a deal.' },
      { screen: 'marketing/deals', title: 'Open the deal', does: 'New deal with the same company name, value, probability, lane and expected close (starts at Qualified, status Open).' },
      { screen: 'marketing/quotations', title: 'Quote', does: 'Create quotation for the deal: rate, basis and validity (saved as Draft). It does not change any rate contract.' },
      { screen: 'marketing/deal-pipeline', title: 'Negotiate and win', does: 'Move the deal Proposal → Negotiation → Won (status Won, probability 100%), then click Start ERP handoff.' },
      { screen: 'marketing/handoff', title: 'Hand off', does: 'Create customer (or link the existing customer with exactly the same name), then Create rate contract (one starting Road route from the deal lane).' },
      { screen: 'cust/360', title: 'Complete the customer', does: 'Fill GST, PAN, address, billing email; agree credit days and credit limit with Accounts.' },
      { screen: 'cust/rate-contracts', title: 'Correct the contract', does: 'Replace the starting route (deal value ÷ 20, first goods item) with the agreed quotation rate, goods, unit and dates.' },
      { screen: 'book', title: 'First booking', does: 'Create first booking opens New booking with the customer selected; freight is suggested from the rate contract.' },
      { screen: 'ops/orders', title: 'Or take an order', does: 'For planned loads, Operations can instead record a Customer order for the new customer and confirm it before making the LR.' },
    ],
    exercise: 'ex.crm.won-handoff',
    lesson: 'ls.crm.lead-to-booking',
    notes: [
      'Leads, deals, follow-ups and quotations are stored in the user’s browser only; the customer and rate contract made in the handoff are saved in the shared ERP data.',
      'The handoff links an existing customer only on an exact name match – check spelling to avoid duplicates.',
      'Create first booking stays disabled until the customer and an active rate contract both exist.',
    ],
  },
  {
    id: 'wf.customer-setup',
    title: 'Customer setup: master, agreement, rates, documents, support',
    module: 'cust',
    roles: ['AC', 'OP', 'CC', 'AD'],
    summary: 'Set up a customer so Operations can book at the right rate, Accounts can bill correctly, and Customer Care can support them.',
    steps: [
      { screen: 'cust/360', title: 'Customer master', does: 'Add customer (name, short name, city required), contacts, GST/PAN, credit days, credit limit, bill and LR format, billing switches.' },
      { screen: 'cust/agreements', title: 'Agreement', does: 'Record client, start and expiry, rate type and rate, detention rate per day, committed trips and approver.' },
      { screen: 'cust/rate-contracts', title: 'Rate contract', does: 'Add each lane with goods, mode, unit, rate and standard days; this pre-fills freight in New booking and Full LR form.' },
      { screen: 'cust/documents', title: 'Documents', does: 'Make sure current company certificates, insurance and rate card are on file to share with the customer.' },
      { screen: 'cust/support', title: 'Support', does: 'Handle the customer’s tickets; their history shows on the customer’s 360 Support tab.' },
    ],
    exercise: 'ex.cust.rate-contract',
    notes: [
      'Credit hold (Disallow new LR booking) blocks Full LR form and Customer orders; New booking only warns.',
      'Hamali rates (labour) and the transporter rate matrix (lorry hire) are separate setups used by GRN, VP loading and delivery challans.',
    ],
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------------------------------------------
export const lessons: Lesson[] = [
  {
    id: 'ls.crm.lead-to-booking',
    title: 'From lead to first booking',
    module: 'crm',
    kind: 'workflow',
    roles: ['CC', 'AD', 'SA'],
    screens: ['marketing/leads', 'marketing/deals', 'marketing/deal-pipeline', 'marketing/quotations', 'marketing/handoff', 'cust/rate-contracts', 'book'],
    summary: 'What each CRM screen records, what the handoff creates in the ERP, and what you must correct by hand before the first booking.',
    sections: [
      {
        heading: 'Two kinds of data',
        body: 'Leads, deals, follow-ups, campaigns and quotations are sales working records kept in your browser. Customers, rate contracts, LRs and bills are ERP records shared by everyone. The Won Deal Handoff is the only bridge between them.',
        bullets: [
          'A colleague on another computer will not see your leads and deals.',
          'Practice mode does not change this: CRM records are the same in practice and real mode.',
        ],
      },
      {
        heading: 'Leads and deals are separate',
        body: 'Moving a lead to Won does not create a deal. Create the deal in Deals with the same company name and a lane written as "From → To".',
      },
      {
        heading: 'What the handoff creates',
        body: 'Create customer saves a customer with the deal company and contact, 30 credit days and a credit limit of 2 × deal value (at least ₹5,00,000). Create rate contract saves one Road route from the deal lane with rate = deal value ÷ 20, the first goods item and Truck unit.',
        bullets: [
          'An existing customer is linked only if the name matches exactly.',
          'A lane city not in the city master becomes Jalgaon.',
          'Create first booking needs both the customer and an active contract.',
        ],
      },
      {
        heading: 'Fix before you book',
        body: 'Open the new customer and fill GST, PAN, address and billing email. Open the rate contract and replace the starting route with the agreed quotation rate, goods, unit and dates. Then New booking will suggest the right freight.',
      },
    ],
    audio: [
      'Leads और deals आपके browser में रहते हैं, customers और rate contracts सबके लिए ERP में।',
      'दोनों के बीच का पुल है Won Deal Handoff।',
      'Handoff customer बनाता है, और deal value से एक शुरुआती rate contract।',
      'Booking से पहले customer की GST details और contract का सही rate ज़रूर भरिए।',
    ],
    minutes: 5,
    quiz: ['q.crm.handoff-creates', 'q.crm.handoff-contract-rate', 'q.crm.data-local'],
  },
];
