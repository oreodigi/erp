// Guide & onboarding: page explainers (shown when Guide is on), a role-based welcome tour for new employees,
// and the Help & Training page with how-tos, glossary, practice mode and a first-week checklist.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUI, useDB, useStore } from '../store/store';
import { useRole } from '../components/AppShell';
import { PageHeader, Card, Toggle } from '../components/ui';
import { cls } from '../lib/util';
import { useT } from '../lib/useT';
import { LangChooser } from '../components/LangSwitch';
import { ListenButton } from '../components/VoicePlayer';
import { WELCOME, TOUR_AUDIO, PAGE_AUDIO, HOWTO_AUDIO, LESSONS } from '../lib/audio-scripts';
import { play, stop, useVoice, hindiVoice, setRate } from '../lib/voice';
import { useTraining } from '../training/store';
import { Lightbulb, X, ChevronRight, ChevronLeft, PlayCircle, BookOpen, GraduationCap, CheckCircle2, Circle, FlaskConical, Database, Search, PackagePlus, Inbox, Receipt, IndianRupee, TrainFront, Route, Wrench, AlertTriangle, Headphones, Volume2 } from 'lucide-react';

// ---------------- Page explainers ----------------
type Help = { title: string; what: string; steps: string[] };
export const PAGE_HELP: Record<string, Help> = {
  dashboard: { title: 'Home', what: 'Your day at a glance – today’s numbers, where every consignment is, and what to do next.', steps: ['Click any number to see the list behind it.', 'The coloured boxes are stages. Red means late.', '“Do these next” shows your most urgent work – press the button on the right.'] },
  work: { title: 'My Work', what: 'Everything waiting on you, oldest first. Clear the red (late) rows first.', steps: ['Each box is one type of task.', 'Press the button on a row to do it – a small form opens.', 'Tick several rows to do POD or billing in one go.'] },
  'fleet/journeys': { title: 'Truck journeys', what: 'Where each of our trucks went, whether it ran loaded or empty, and whether it made money.', steps: ['Pick a period at the top.', 'Sort by profit, empty km or idle days to find problem trucks.', 'Tap a truck to see every trip on a timeline, with diesel and freight.'] },
  'fin/cash-plan': { title: 'Cash plan', what: 'Will we have enough money each week? Money coming in vs going out for the next weeks.', steps: ['Enter today’s cash + bank balance under Assumptions.', 'Look at the line – red weeks are where cash runs short.', 'Tap any amount in the table to see the bills or payments in it.'] },
  'admin/time-limits': { title: 'Stage time limits', what: 'Decide how long a consignment may wait in each stage before it is shown as late.', steps: ['Change the hours or days for a stage.', 'See how many consignments would be late with the new limit.', 'Press Save – the Order Board, Home and My Work use it straight away.'] },
  board: { title: 'Order Board', what: 'Every order and LR as a card in its stage, left to right, from booking to payment.', steps: ['Red cards are late, amber cards are due soon.', 'The card tells you why it is stuck and who it is waiting on.', 'Press the card’s button (or drag it to the next column) to move it forward.'] },
  book: { title: 'New booking', what: 'Make an LR in 3 short steps. We fill most things from the customer’s last booking.', steps: ['Type the customer name and pick from the list.', 'Check goods, pieces and the suggested freight.', 'Pick a truck – or choose “Decide later”.'] },
  'ops/lr': { title: 'All LRs', what: 'Every lorry receipt with its current stage. Click a row to see the full story of that LR.', steps: ['Use the search box for LR number, customer or truck.', 'Use the coloured filters at the top to see drafts, moving, delayed or ready to bill.', 'Open an LR and use the buttons at the bottom for the next step.'] },
  'ops/lr-new': { title: 'Full LR form', what: 'The complete LR form with every legacy field. For everyday bookings, New booking is quicker.', steps: ['Pick an order or make an instant LR.', 'Fill parties, goods and vehicle.', 'Finalise to print and dispatch.'] },
  'ops/orders': { title: 'Customer orders', what: 'Orders noted when a customer calls. An order becomes one or more LRs.', steps: ['Add the order with customer, pickup date and number of trucks.', 'The branch manager confirms it.', 'Then press “Make LR”.'] },
  'ops/pod': { title: 'POD received', what: 'Record the signed delivery copy (POD). Billing is allowed only after this.', steps: ['Pick the LR.', 'Enter received and damaged pieces.', 'Save – the LR moves to “Ready to bill”.'] },
  'ops/dc': { title: 'Delivery challans', what: 'Last-mile trucks from the destination rail branch to the customer.', steps: ['Pick the rake and the LRs to send.', 'Choose the transporter truck and freight.', 'After delivery, record the acknowledgment.'] },
  'ops/grn': { title: 'Goods in at rail head', what: 'Goods arriving at Jalgaon rail head before loading on the rake (GRN).', steps: ['Pick the LR that arrived.', 'Count received and damaged pieces.', 'Save – the goods are now ready for wagon loading.'] },
  'rail/rakes': { title: 'Rakes', what: 'Every parcel rake from planning to closing on one board.', steps: ['Open a rake card to see wagons, LRs and status.', 'Use the steps inside: load, dispatch, arrive, deliver.', 'Close the rake when all LRs are delivered.'] },
  'fleet/trucks': { title: 'Our trucks', what: 'Own and market trucks with status and paper expiry dates.', steps: ['Red papers mean insurance, fitness, permit or tax is due.', 'Click a truck to see trips, costs and profit.'] },
  'fleet/trips': { title: 'Trips', what: 'Each journey of our own trucks – advance, diesel and closing.', steps: ['Start a trip when the truck leaves.', 'Add diesel and expenses on the way.', 'Close the trip when it returns – the log slip follows.'] },
  'fleet/fuel': { title: 'Diesel & expenses', what: 'Diesel and trip expenses, linked to the trip.', steps: ['Pick the trip.', 'Choose the pump – the rate fills automatically.', 'Enter litres and save.'] },
  'fin/billing': { title: 'Make bills', what: 'Turn delivered LRs with POD into GST bills.', steps: ['Pick the customer – their ready LRs appear.', 'Tick the LRs to bill and check extra charges.', 'Generate – the bill goes to receivables and ledger.'] },
  'fin/receivables': { title: 'Payments to collect', what: 'Unpaid bills by customer and how old they are.', steps: ['Red columns are older than the customer’s credit days.', 'Click a customer to see their bills.', 'Record payment when money arrives.'] },
  'fin/client-payments': { title: 'Payment received', what: 'Record money received from a customer against a bill.', steps: ['Pick the bill.', 'Enter amount and TDS deducted.', 'Save – outstanding and ledger update.'] },
  'fin/tp-slips': { title: 'Pay transporters', what: 'Payment slips for market truck owners, then approval and payment.', steps: ['Create a slip for the transporter’s delivered LRs.', 'Accounts approves.', 'Record the payment.'] },
  'ws/jobcards': { title: 'Job cards', what: 'Repairs and service of our trucks.', steps: ['Open a job card when the truck comes in.', 'Add parts and services.', 'After approval, finalise – parts are taken out of stock.'] },
  'cust/360': { title: 'Customers', what: 'Every customer with consignments, revenue and dues.', steps: ['Search a customer by name.', 'Click to see LRs, bills, contracts and complaints.'] },
  reports: { title: 'Reports', what: 'Ready reports for operations, fleet, rail and finance.', steps: ['Pick a report.', 'Set the dates and filters.', 'Export to Excel or print.'] },
  masters: { title: 'Master lists', what: 'Lists used everywhere – customers, cities, goods, branches, rates.', steps: ['Pick a list.', 'Add or edit a record.', 'Changes show in all forms immediately.'] },
};

export function PageGuide({ routeKey }: { routeKey: string }) {
  const guide = useUI((s) => s.guide);
  const done = useUI((s) => s.toursDone);
  const set = useUI((s) => s.set);
  const t = useT();
  const voice = useUI((s) => s.voice);
  const h = PAGE_HELP[routeKey];
  const clip = PAGE_AUDIO[routeKey];
  const show = guide && !!h && !done['page:' + routeKey];
  // speak the tip once, the first time a page is opened (if audio tips are on)
  useEffect(() => {
    const st = useUI.getState();
    if (!show || !voice || !clip || st.toursDone['heard:' + routeKey] || st.tour || !st.toursDone['welcome:' + st.userId]) return; // welcome speaks first
    const tm = setTimeout(() => { if (useVoice.getState().status === 'idle') { setRate(useUI.getState().voiceRate || 0.95); play(clip); } set({ toursDone: { ...useUI.getState().toursDone, ['heard:' + routeKey]: true } }); }, 600);
    return () => clearTimeout(tm);
  }, [routeKey, show, voice]);
  if (!show || !h) return null;
  return (
    <div className="mb-4 rounded-xl border border-warn/35 bg-warn/[.07] px-4 py-3 flex gap-3" role="note" aria-label={t('How {title} works', { title: t(h.title) })}>
      <Lightbulb size={20} className="text-warn shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[14px]">{t(h.what)}</div>
        <ol className="mt-1.5 grid gap-1 text-[13px] text-muted list-none">{h.steps.map((s, i) => <li key={i} className="flex gap-2"><span className="w-5 h-5 rounded-full bg-warn/20 text-warn text-[11px] font-bold grid place-items-center shrink-0">{i + 1}</span><span>{t(s)}</span></li>)}</ol>
      </div>
      {clip && <ListenButton clip={clip} size="sm" label={t('Listen')} className="self-start" />}
      <button className="btn-icon shrink-0 -mr-1 -mt-1" aria-label={t('Hide this tip')} title={t('Hide this tip')} onClick={() => set({ toursDone: { ...done, ['page:' + routeKey]: true } })}><X size={16} /></button>
    </div>
  );
}

// ---------------- Welcome tour ----------------
const ROLE_INTRO: Record<string, { title: string; points: string[] }> = {
  SA: { title: 'You see the whole business', points: ['Home shows today, the pipeline and where things are stuck.', 'Order Board shows every consignment – red ones are late.', 'Switch Home between Owner, Operations, Accounts and Fleet views.'] },
  AD: { title: 'You look after the system', points: ['Users, roles and master lists are under Settings.', 'Home shows where work is stuck across branches.', 'Use Show all screens for every legacy screen.'] },
  OP: { title: 'You move the goods', points: ['Book trucks with New booking – 3 short steps.', 'My Work shows orders to confirm, trucks to assign and late deliveries.', 'Order Board shows every load and where it is stuck.'] },
  BU: { title: 'You run your branch’s bookings', points: ['New booking makes an LR in 3 steps.', 'My Work tells you what to do next – oldest first.', 'Record POD as soon as the signed copy comes back.'] },
  AC: { title: 'You handle bills and payments', points: ['My Work shows LRs ready to bill and overdue payments.', 'Bill several LRs at once from the board or My Work.', 'Approve transporter and challan payments from My Work.'] },
  CC: { title: 'You keep customers informed', points: ['Search any LR or customer from the top bar.', 'My Work shows late deliveries and pending PODs.', 'Order Board shows exactly where each load is.'] },
  CO: { title: 'You manage the trucks', points: ['Home shows free trucks, trips and papers due.', 'My Work lists trips to close and papers to renew.', 'Add diesel under Trucks → Diesel & expenses.'] },
  SI: { title: 'You run the workshop', points: ['Open job cards when a truck comes in.', 'Approve job cards and spare purchases from My Work.', 'Spares stock updates automatically.'] },
  HR: { title: 'You manage people', points: ['Employees, drivers and labour are in Master lists.', 'Users and access are under Settings.'] },
};
const TOUR = [
  { t: 'menu', title: 'Your menu', body: 'Only the screens you need. Everything else is under “Show all screens” at the bottom.' },
  { t: 'work', title: 'My Work', body: 'Everything waiting on you, oldest first. Start your day here.' },
  { t: 'board', title: 'Order Board', body: 'Every consignment by stage. Red cards are late – the card says why.' },
  { t: 'pipeline', title: 'Where things are', body: 'The same stages on Home. Click a box to open those consignments.' },
  { t: 'create', title: 'Create', body: 'New booking, POD received, trip, job card or bill – all from here.' },
  { t: 'search', title: 'Search', body: 'Type an LR number, truck number or customer name to jump straight to it.' },
  { t: 'lang', title: 'Language', body: 'Change the screen language to Hindi or Marathi here.' },
  { t: 'guide', title: 'Guide button', body: 'Turns these tips on or off. Help & Training (the ? button) has step-by-step how-tos.' },
];

export function OnboardingHost() {
  const { user, role } = useRole();
  const guide = useUI((s) => s.guide);
  const tour = useUI((s) => s.tour);
  const route = useUI((s) => s.route);
  const set = useUI((s) => s.set);
  const nav = useUI((s) => s.nav);
  const t = useT();
  const records = useTraining((s) => s.records);
  const welcomeDone = ['completed','skipped'].includes(String(records['onboarding:welcome']?.status || ''));
  // Visits/search are training records, so first-week progress follows the employee across devices.
  useEffect(() => { if (route) void useTraining.getState().record('screen', route, 'completed'); }, [route]);
  const palette = useUI((s) => s.palette);
  useEffect(() => { if (palette) void useTraining.getState().record('onboarding', 'search', 'completed'); }, [palette]);
  const voice = useUI((s) => s.voice);
  const welcomeClip = WELCOME[role.code] || WELCOME.BU;
  const showWelcome = guide && !welcomeDone && tour !== 'run';
  useEffect(() => { if (showWelcome && voice) { const tm = setTimeout(() => { setRate(useUI.getState().voiceRate || 0.95); play(welcomeClip); }, 700); return () => clearTimeout(tm); } }, [showWelcome, voice]);
  if (tour === 'run') return <Tour onEnd={() => { set({ tour: null }); void useTraining.getState().record('tour', 'app-tour', 'completed'); void useTraining.getState().record('onboarding', 'welcome', 'completed'); }} />;
  if (!guide || welcomeDone) return null;
  const intro = ROLE_INTRO[role.code] || ROLE_INTRO.BU;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={t('Welcome')}>
      <div className="absolute inset-0 bg-black/50 animate-in" />
      <div className="relative card shadow-pop w-full max-w-md p-6 animate-up">
        <div className="text-[12px] font-semibold text-muted mb-1.5">{t('Choose your language')}</div>
        <LangChooser className="mb-4" />
        <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand grid place-items-center"><GraduationCap size={24} /></div>
        <h2 className="font-display text-[22px] font-semibold mt-3">{t('Welcome, {name}!', { name: user.firstName })}</h2>
        <p className="text-muted text-[14px]">{t('You are signed in as')} <b className="text-ink">{t(role.name)}</b>. {t(intro.title)}:</p>
        <ul className="mt-3 grid gap-2">{intro.points.map((p) => <li key={p} className="flex gap-2 text-[14px]"><CheckCircle2 size={17} className="text-ok shrink-0 mt-0.5" />{t(p)}</li>)}</ul>
        <div className="mt-3"><ListenButton clip={welcomeClip} label={t('Listen in Hinglish')} /></div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 mt-5">
          <button className="btn-primary h-12 text-[15px]" onClick={() => { nav('dashboard'); set({ tour: 'run' }); }}><PlayCircle size={18} /> {t('Show me around (1 minute)')}</button>
          <button className="btn-ghost h-11" onClick={() => { stop(); void useTraining.getState().record('onboarding', 'welcome', 'skipped'); }}>{t('Skip – I’ll explore myself')}</button>
        </div>
        <p className="text-[12px] text-faint mt-3 text-center">{t('You can restart this from Help & Training any time.')}</p>
      </div>
    </div>
  );
}

function Tour({ onEnd }: { onEnd: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = TOUR[i];
  useLayoutEffect(() => {
    const find = () => { const el = [...document.querySelectorAll(`[data-tour="${step.t}"]`)].find((e) => (e as HTMLElement).offsetParent !== null) as HTMLElement | undefined; if (el) { el.scrollIntoView({ block: 'nearest' }); setRect(el.getBoundingClientRect()); } else setRect(null); };
    find(); const t = setTimeout(find, 250); window.addEventListener('resize', find);
    return () => { clearTimeout(t); window.removeEventListener('resize', find); };
  }, [i]);
  const voice = useUI((s) => s.voice);
  useEffect(() => { if (voice && TOUR_AUDIO[step.t]) { setRate(useUI.getState().voiceRate || 0.95); play(TOUR_AUDIO[step.t]); } }, [i]);
  useEffect(() => () => stop(), []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onEnd(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); });
  const next = () => (i < TOUR.length - 1 ? setI(i + 1) : onEnd());
  const pad = 6;
  const card = useRef<HTMLDivElement>(null);
  const [ch, setCh] = useState(200);
  useLayoutEffect(() => { if (card.current) setCh(card.current.offsetHeight); });
  const vw = window.innerWidth, vh = window.innerHeight;
  const W = Math.min(320, vw - 24);
  let style: React.CSSProperties = { left: (vw - W) / 2, top: Math.max(12, (vh - ch) / 2), width: W };
  if (rect && vw < 640) {
    // phone: dock the tip at the top or bottom, away from the highlighted spot
    const lower = rect.top + rect.height / 2 > vh / 2;
    style = lower ? { left: 12, right: 12, top: 'calc(12px + env(safe-area-inset-top, 0px))' } : { left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' };
  } else if (rect) {
    const below = rect.bottom + 12 + ch < vh;
    const left = Math.min(Math.max(12, rect.left), vw - W - 12);
    const side = rect.right + W + 24 < vw && rect.width < 300 && rect.height > 200;
    const top = rect.height > 200 ? rect.top + 20 : below ? rect.bottom + 12 : rect.top - ch - 12;
    style = { width: W, left: side ? rect.right + 14 : left, top: Math.max(12, Math.min(top, vh - ch - 12)) };
  }
  return (
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label={t('Tour step {i} of {n}', { i: i + 1, n: TOUR.length })}>
      {rect ? <div className="absolute rounded-xl transition-all duration-200 pointer-events-none" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgb(0 0 0 / .55), 0 0 0 3px rgb(var(--warn))' }} />
        : <div className="absolute inset-0 bg-black/55" />}
      <div ref={card} className="absolute card shadow-pop p-4 animate-in" style={style}>
        <div className="text-[11.5px] font-semibold text-warn">{t('Step {i} of {n}', { i: i + 1, n: TOUR.length })}</div>
        <div className="font-semibold text-[16px] mt-0.5">{t(step.title)}</div>
        <p className="text-[13.5px] text-muted mt-1">{t(step.body)}</p>
        {TOUR_AUDIO[step.t] && <ListenButton clip={TOUR_AUDIO[step.t]} size="sm" label={t('Listen in Hinglish')} className="mt-2" />}
        <div className="flex items-center gap-2 mt-4">
          <button className="text-[12.5px] text-muted hover:text-ink" onClick={onEnd}>{t('Skip tour')}</button>
          <span className="flex-1" />
          {i > 0 && <button className="btn-ghost h-9" onClick={() => setI(i - 1)}><ChevronLeft size={15} /></button>}
          <button className="btn-primary h-9" onClick={next}>{i < TOUR.length - 1 ? <>{t('Next')} <ChevronRight size={15} /></> : t('Finish')}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Help & Training page ----------------
const HOWTO = [
  { icon: PackagePlus, title: 'Book a truck (make an LR)', steps: ['Press Create → New booking.', 'Type the customer name – the rest fills from their last booking.', 'Check goods, pieces and freight, then pick a truck.', 'Press “Book & send truck”. Print the LR.'], go: 'book' },
  { icon: Inbox, title: 'Record a POD', steps: ['Open My Work → Collect POD copies.', 'Press “POD received” on the LR (or tick many LRs).', 'Enter the date and any damaged pieces. Save.'], go: 'work' },
  { icon: Receipt, title: 'Make a bill', steps: ['Open My Work → Make bills (or Order Board → Ready to bill).', 'Tick the LRs of one customer.', 'Check GST and press Generate bill.'], go: 'work' },
  { icon: IndianRupee, title: 'Record a payment from a customer', steps: ['Open My Work → Follow up on overdue payments.', 'Press “Payment received” on the bill.', 'Enter amount and TDS. Save.'], go: 'work' },
  { icon: AlertTriangle, title: 'Find what is stuck', steps: ['Open the Order Board.', 'Press “Late only” or “Show only these” on the red banner.', 'Each red card says why it is stuck and who must act.'], go: 'board' },
  { icon: TrainFront, title: 'Send goods by rail', steps: ['In New booking choose Rail and the destination branch.', 'At Jalgaon rail head record goods in (GRN).', 'Load wagons on the rake, dispatch, then make delivery challans at the destination.'], go: 'rail/rakes' },
  { icon: Route, title: 'Close a truck trip', steps: ['Open My Work → Close finished trips.', 'Enter closing date and KM.', 'The log slip and diesel settlement follow.'], go: 'fleet/trip-completion' },
  { icon: Wrench, title: 'Repair a truck (job card)', steps: ['Create → Job card.', 'Add parts from stock and outside services.', 'After approval, finalise when the truck leaves.'], go: 'ws/jobcards' },
  { icon: Route, title: 'See where a truck went and if it made money', steps: ['Open Trucks → Truck journeys.', 'Sort by Profit or Empty km %.', 'Tap a truck – its timeline shows every trip, diesel and freight.'], go: 'fleet/journeys' },
  { icon: IndianRupee, title: 'Check if we will have enough cash', steps: ['Open Money → Cash plan.', 'Enter today’s cash + bank balance.', 'Red weeks need action – chase the biggest overdue customers first.'], go: 'fin/cash-plan' },
  { icon: AlertTriangle, title: 'Change when a consignment counts as late', steps: ['Open Settings → Stage time limits.', 'Change the hours or days for a stage.', 'Check the new late count and press Save.'], go: 'admin/time-limits' },
  { icon: Search, title: 'Find any LR, truck or customer', steps: ['Press the search box at the top (or Ctrl+K).', 'Type a few letters or digits.', 'Pick the result to open it.'], go: '' },
];
const GLOSSARY: [string, string][] = [
  ['LR', 'Lorry Receipt – the main document for one consignment.'], ['POD', 'Proof of Delivery – the signed copy from the receiver. Needed before billing.'],
  ['TBB', 'To Be Billed – we send the customer a bill later.'], ['To Pay', 'The receiver pays the freight on delivery.'],
  ['GRN', 'Goods Receipt Note – goods counted in at the rail head.'], ['DGRN', 'Goods counted in at the destination branch after the rake arrives.'],
  ['Rake', 'A goods train SK books. It has several wagons (VPs).'], ['VP', 'One wagon (parcel van) on the rake.'], ['MR / RR', 'Railway money receipt / railway receipt for each wagon.'],
  ['LDC / DC', 'Delivery challan – the truck from the rail branch to the customer.'], ['Hamali', 'Loading / unloading labour charges.'], ['Demurrage', 'Railway charge when a rake is held too long.'],
  ['Log slip', 'Closing document for our truck’s trips – KM and diesel.'], ['Job card', 'Workshop record of repairs on a truck.'],
];

export function HelpCenter() {
  const { user, role } = useRole();
  const guide = useUI((s) => s.guide);
  const done = useUI((s) => s.toursDone);
  const set = useUI((s) => s.set);
  const nav = useUI((s) => s.nav);
  const toast = useUI((s) => s.toast);
  const source = useStore((s) => s.source);
  const switchSource = useStore((s) => s.switchSource);
  const t = useT();
  const [open, setOpen] = useState<number | null>(0);
  const voice = useUI((s) => s.voice);
  const rate = useUI((s) => s.voiceRate);
  const playing = useVoice((s) => (s.status !== 'idle' ? s.clip?.id : ''));
  const vIdx = useVoice((s) => s.idx);
  const vName = useVoice((s) => s.voiceName) || hindiVoice()?.name || '';
  // a lesson counts as heard once its last line has been reached
  useEffect(() => { const l = LESSONS.find((x) => x.id === playing); if (l && vIdx >= l.lines.length - 1 && !done['heard:' + l.id]) set({ toursDone: { ...useUI.getState().toursDone, ['heard:' + l.id]: true } }); }, [playing, vIdx]);
  const heard = LESSONS.filter((l) => done['heard:' + l.id]).length;
  const checklist = [
    ['Take the 1-minute tour', !!done['chk:tour'] || !!done['welcome:' + user.id]],
    ['Open My Work', !!done['visit:work']], ['Look at the Order Board', !!done['visit:board']], ['Make a booking (practice is fine)', !!done['visit:book']],
    ['Search for an LR or truck', !!done['chk:search']], ['Read “How do I…” below', !!done['visit:help']],
  ] as [string, boolean][];
  const pct = Math.round((checklist.filter((c) => c[1]).length / checklist.length) * 100);
  return (
    <div>
      <PageHeader eyebrow={t('Help & Training')} title={t('Learn the ERP')} subtitle={t('Short how-tos, a glossary of transport words, a practice mode and your first-week checklist.')} />
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <Card title={t('Your first week')} subtitle={`${user.firstName} · ${t(role.name)}`}>
            <div className="h-2 rounded-full bg-surface2 overflow-hidden mb-3"><div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{checklist.map(([label, ok]) => <li key={label} className="flex items-center gap-2 text-[13.5px]">{ok ? <CheckCircle2 size={18} className="text-ok shrink-0" /> : <Circle size={18} className="text-faint shrink-0" />}<span className={cls(ok && 'text-muted line-through')}>{t(label)}</span></li>)}</ul>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 mt-4">
              <button className="btn-primary h-11" onClick={() => { nav('dashboard'); set({ tour: 'run' }); }}><PlayCircle size={17} /> {t('Start the tour')}</button>
              <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><span className="text-[13.5px] font-semibold">{t('On-screen guide')}</span><Toggle checked={guide} onChange={(v) => set({ guide: v })} label={guide ? t('On') : t('Off')} /></div>
              <button className="btn-ghost h-10" onClick={() => { const td = { ...done }; Object.keys(td).filter((k) => k.startsWith('page:')).forEach((k) => delete td[k]); set({ toursDone: td, guide: true }); toast('All page tips will show again', 'info'); }}>{t('Show all page tips again')}</button>
            </div>
          </Card>
          <Card title={t('Practice mode')} subtitle={t('Learn without touching real records')}>
            <p className="text-[13px] text-muted mb-3">{source === 'legacy' ? t('You are on real SK data. Switch to practice data to try bookings, PODs and bills safely.') : t('You are on practice data. Nothing you do here affects real records.')}</p>
            {source === 'legacy'
              ? <button className="btn-ghost h-11 w-full" onClick={() => switchSource('sample').then(() => toast('Practice data loaded', 'ok', 'Try anything – switch back when done'))}><FlaskConical size={16} /> {t('Start practising')}</button>
              : <button className="btn-ghost h-11 w-full" onClick={() => switchSource('legacy').then(() => toast('Back on SK data', 'ok'))}><Database size={16} /> {t('Back to real data')}</button>}
          </Card>
          <Card title={t('Language')} subtitle={t('Choose your language')}>
            <LangChooser />
          </Card>
          <Card title={t('Audio guide')} subtitle={t('Tips and lessons spoken in Hinglish')} icon={Headphones}>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2"><span className="text-[13.5px] font-semibold">{t('Speak tips automatically')}</span><Toggle checked={voice} onChange={(v) => { set({ voice: v } as any); if (!v) stop(); }} label={voice ? t('On') : t('Off')} /></div>
              <div className="flex items-center gap-2 text-[13px]"><span className="text-muted">{t('Speed')}</span>
                {[0.8, 0.95, 1.1].map((r) => <button key={r} className={cls('h-8 px-2.5 rounded-lg border text-[12.5px] font-semibold', Math.abs((rate || 0.95) - r) < 0.01 ? 'border-violet bg-violet/10 text-violet' : 'border-line')} onClick={() => { set({ voiceRate: r } as any); setRate(r); }}>{r === 0.8 ? t('Slow') : r === 0.95 ? t('Normal') : t('Fast')}</button>)}
              </div>
              <p className="text-[12px] text-muted">{vName ? t('Voice: {name}', { name: vName }) : t('No Hindi voice found on this device yet – the text will still show. On Android: Settings → Text-to-speech → Google → install Hindi.')}</p>
              <ListenButton clip={{ id: 'test', title: t('Test voice'), lines: ['नमस्ते! यह SK Translines ERP की आवाज़ है। क्या आपको साफ़ सुनाई दे रहा है?'] }} label={t('Test voice')} />
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2 grid grid-cols-[minmax(0,1fr)] gap-4">
        <Card title={t('Audio training course')} subtitle={t('{n} short lessons in Hinglish · {h} heard', { n: LESSONS.length, h: heard })} icon={Headphones} pad={false}
          actions={<ListenButton clips={LESSONS} size="sm" label={t('Play all')} />}>
          <div className="h-1.5 bg-surface2"><div className="h-full bg-ok transition-all" style={{ width: `${(heard / LESSONS.length) * 100}%` }} /></div>
          <ol className="divide-y divide-line">
            {LESSONS.map((l, i) => (
              <li key={l.id} className={cls('flex items-center gap-3 px-4 py-2.5', playing === l.id && 'bg-violet/5')}>
                <span className={cls('w-8 h-8 rounded-full grid place-items-center shrink-0 text-[12.5px] font-bold', done['heard:' + l.id] ? 'bg-ok/15 text-ok' : 'bg-surface2 text-muted')}>{done['heard:' + l.id] ? <CheckCircle2 size={16} /> : i + 1}</span>
                <div className="min-w-0 flex-1"><div className="font-semibold text-[14px] truncate" lang="hi">{l.title}</div><div className="text-[12px] text-muted">{t('{n} min', { n: l.minutes })}{playing === l.id ? ' · ' + t('Playing') : ''}</div></div>
                {l.go && <button className="text-[12.5px] link shrink-0 hidden sm:inline" onClick={() => nav(l.go!)}>{t('Open screen')}</button>}
                <ListenButton clip={l} size="sm" label={t('Listen')} />
              </li>))}
          </ol>
        </Card>
        <Card title={t('How do I…?')} pad={false}>
          <ul className="divide-y divide-line">
            {HOWTO.map((h, i) => { const I = h.icon; const o = open === i; return (
              <li key={h.title}>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface2" aria-expanded={o} onClick={() => setOpen(o ? null : i)}>
                  <span className="w-9 h-9 rounded-lg bg-violet/10 text-violet grid place-items-center shrink-0"><I size={17} /></span>
                  <span className="flex-1 font-semibold text-[14px]">{t(h.title)}</span><ChevronRight size={16} className={cls('text-muted transition', o && 'rotate-90')} />
                </button>
                {o && <div className="px-4 pb-4 pl-[64px]">
                  <ol className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{h.steps.map((s, k) => <li key={k} className="flex gap-2 text-[13.5px]"><span className="w-5 h-5 rounded-full bg-violet/10 text-violet text-[11px] font-bold grid place-items-center shrink-0">{k + 1}</span>{t(s)}</li>)}</ol>
                  {HOWTO_AUDIO[h.title] && <ListenButton clip={HOWTO_AUDIO[h.title]} size="sm" label={t('Listen')} className="mt-3 mr-2" />}
                  {h.go ? <button className="btn-primary h-9 mt-3" onClick={() => { set({ guide: true }); nav(h.go); }}>{t('Do it now')} <ChevronRight size={15} /></button> : <button className="btn-primary h-9 mt-3" onClick={() => set({ palette: true, toursDone: { ...done, 'chk:search': true } })}>{t('Try search')} <ChevronRight size={15} /></button>}
                </div>}
              </li>); })}
          </ul>
        </Card>
        </div>
        <Card title={t('Words you will hear')} subtitle={t('Transport and ERP terms in plain language')} className="lg:col-span-3">
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">{GLOSSARY.map(([k, v]) => <div key={k}><dt className="font-semibold text-[13.5px]">{t(k)}</dt><dd className="text-[13px] text-muted">{t(v)}</dd></div>)}</dl>
        </Card>
      </div>
    </div>
  );
}
