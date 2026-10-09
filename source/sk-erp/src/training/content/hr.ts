// Training Academy content: HR (module 'hr') and Payroll (module 'payroll').
// Source of truth: src/features/hr.tsx. Important facts this content is built on:
// - All HR and Payroll screens share one demo state kept in this browser's localStorage under the key 'sk-hr-demo'
//   (useHR() in hr.tsx). It is NOT part of the shared ERP `db`, is not saved to the server, and is not switched by
//   practice mode. Masters → Employees / Departments / Designations (in `db`) are a separate list.
// - Records are linked by employee NAME (leaves, overtime, expenses, appreciation, payroll overtime lookup).
// - Salary maths (sal() in hr.tsx): Gross = Basic + HRA + Allowance + approved OT hours × ₹250;
//   PF = 12% of Basic; TDS = 5% of Gross; Net = Gross − PF − TDS.
// - The module is demo-oriented (docs/FEATURES.md) and is not statutory payroll compliance.
import type { Exercise, Lesson, Question, ScreenTraining, Workflow, PracticeBaseline, CheckResult } from '../types';
import { pass, notYet } from '../check';

// ---------- practice helpers (read-only) ----------
// HR screens do not write to the practice `db`. These helpers read the HR demo state from localStorage without
// changing it, and use the timestamp inside new record IDs (Date.now()) to count only work done after the exercise began.
const HR_KEY = 'sk-hr-demo';
function hrState(): any | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return JSON.parse(localStorage.getItem(HR_KEY) || 'null');
  } catch {
    return null;
  }
}
const startMs = (base: PracticeBaseline): number => {
  const t = Date.parse(base?.startedAt || '');
  return Number.isFinite(t) ? t : 0;
};
/** Records created on HR screens get IDs like 'LV1760000000000' (leaves) or '1760000000000' (overtime, expenses). */
function newSince(rows: any, base: PracticeBaseline, prefix = ''): any[] {
  if (!Array.isArray(rows)) return [];
  const t0 = startMs(base) - 1000; // small allowance for clock rounding
  return rows.filter((r) => {
    const m = new RegExp('^' + prefix + '(\\d{12,})$').exec(String(r?.id ?? ''));
    return !!m && Number(m[1]) >= t0;
  });
}
const noHR = (): CheckResult => notYet('No HR data found in this browser yet. Open the HR screen first.');

// ---------- screens ----------
export const screens: ScreenTraining[] = [
  {
    id: 'hr/employees',
    module: 'hr',
    title: 'Employees',
    purpose: 'The HR employee list: name, department, designation, branch, shift, joining date, PAN and status for every staff member.',
    why: 'Every other HR and Payroll screen picks employees from this list. Leave, overtime, expenses, appreciation and the payroll run all use the employee name saved here.',
    when: 'When a new person joins, when someone moves department, branch or shift, or when a person leaves (set status Inactive).',
    roles: ['HR', 'AD', 'SA'],
    upstream: ['hr/departments', 'hr/designations'],
    downstream: ['payroll/salary', 'hr/shifts', 'hr/leaves', 'payroll/run'],
    before: 'Departments should already exist, because the Department field is a dropdown from the Departments screen.',
    after: 'Set the real salary on Employee Salary. New employees start with a default salary structure.',
    prerequisites: ['The department exists on HR → Departments.'],
    actions: [
      'Add employee: opens a form. Only Full name is required.',
      'Edit: change any field of an existing employee, including Status (Active, Inactive, On Leave).',
    ],
    records: ['Employee with ID EMP001, EMP002 … (next number in the list).'],
    validations: [
      'Save does nothing if Full name is empty. No message is shown; the form simply stays open.',
      'No other field is checked. PAN, email and mobile are not validated.',
    ],
    mistakes: [
      'Saving with only the name. The employee gets default values: Department Operations, Designation Executive, Branch Delhi, Shift General, Joining date 2026-10-09, Basic ₹28,000, HRA ₹11,200, Allowance ₹5,000. Payroll will pay these defaults until you correct them.',
      'Renaming an employee. Leave, overtime and expense records keep the old name, so approved overtime is no longer added to that person’s payroll.',
      'Typing a designation that is spelled differently from the Designations list. The employee still saves, but the Designations screen counts 0 employees for that title.',
      'Setting a leaver to Inactive and expecting payroll to drop them. The payroll run still lists Inactive employees.',
    ],
    warnings: [
      'There is no Delete button. To stop using an employee, set Status to Inactive.',
      'This list is separate from Masters → Employees. Adding a person here does not add them to the Masters list, and the other way round.',
      'HR data is saved only in this browser. Another user or another computer does not see your changes.',
    ],
    fields: [
      { name: 'Full name', help: 'Required. This exact name links the person to leave, overtime, expenses and payroll. Spell it once, correctly.' },
      { name: 'Department', help: 'Dropdown from HR → Departments. If you do not choose one, Operations is saved.' },
      { name: 'Designation', help: 'Free text. Type it exactly as on HR → Designations so the count there is correct.' },
      { name: 'Branch', help: 'Delhi, Jharsuguda, Raipur or Nagpur.' },
      { name: 'Shift', help: 'General, Morning, Evening or Night. Can also be changed later on Shift Roster.' },
      { name: 'PAN', help: 'Shown on the TDS screen. Not checked for format.' },
      { name: 'Status', help: 'Active, Inactive or On Leave. Drives the Active and On leave counts at the top, and the On Leave row on Attendance.' },
    ],
    statuses: [
      { status: 'Active', meaning: 'Working normally. Shown as Present on Attendance.' },
      { status: 'On Leave', meaning: 'Shown as On Leave on Attendance with no check-in. Must be set by hand; approving a leave does not set it.' },
      { status: 'Inactive', meaning: 'No longer working. Still appears on Payroll, Salary and TDS screens in this version.' },
    ],
    example: 'A new fleet supervisor joins Raipur. Add employee → Full name “Deepak Patel”, Department Fleet, Designation “Fleet Supervisor”, Branch Raipur, Shift Morning, PAN → Save. He appears as EMP007. Then open Employee Salary and set his real Basic, HRA and Allowance.',
    walkthrough: [
      { title: 'Check the counts', body: 'The top cards show total employees, Active, On leave and number of departments.' },
      { title: 'Add employee', body: 'Click Add employee. Type the Full name exactly as it should appear on payslips.' },
      { title: 'Fill job details', body: 'Choose Department, type the Designation as on the Designations list, pick Branch, Joining date and Shift.' },
      { title: 'Save', body: 'Click Save. The new row gets the next EMP number.' },
      { title: 'Set salary', body: 'Go to Payroll → Employee Salary and replace the default Basic, HRA and Allowance.' },
    ],
    related: ['payroll/salary', 'hr/departments', 'hr/designations', 'hr/shifts'],
    audio: [
      'यह Employees screen है — HR की पूरी staff list यहीं है।',
      'Add employee दबाइए। सिर्फ़ Full name ज़रूरी है, पर बाकी details भी भरिए, वरना default values save हो जाएँगी।',
      'नाम बहुत ध्यान से लिखिए। Leave, overtime और payroll, सब इसी नाम से जुड़ते हैं।',
      'Employee छोड़ दे तो delete नहीं होता — Status को Inactive कर दीजिए।',
      'Save करने के बाद Employee Salary पर जाकर असली salary ज़रूर डालिए।',
    ],
    quiz: ['q.hr.new-employee-defaults', 'q.hr.name-link'],
    minutes: 4,
  },
  {
    id: 'hr/leaves',
    module: 'hr',
    title: 'Leaves',
    purpose: 'Apply for leave on behalf of an employee and approve or reject pending leave requests.',
    why: 'It keeps one list of who asked for leave, which type, which dates and whether it was approved.',
    when: 'When an employee asks for leave, and daily to clear Pending requests.',
    roles: ['HR', 'AD', 'SA'],
    upstream: ['hr/employees', 'hr/holidays'],
    downstream: ['hr/attendance', 'payroll/reports'],
    before: 'The employee must exist on Employees, because the Employee dropdown lists employee names from there.',
    after: 'If the person will be away now, set their Status to On Leave on Employees so Attendance shows it.',
    prerequisites: ['Employee exists on HR → Employees.'],
    actions: [
      'Apply leave: choose Employee, Leave type, From, To and Reason, then Save. The request is saved as Pending.',
      'Approve: on a Pending row, sets the status to Approved.',
      'Reject: on a Pending row, sets the status to Rejected.',
    ],
    records: ['Leave request with ID LV + a number, status Pending.'],
    validations: [
      'No field is required. A request can be saved without an employee or dates, so check the form before Save.',
      'Approve and Reject appear only while a request is Pending. Once decided, the row has no action.',
    ],
    mistakes: [
      'Trusting the Days column for a multi-day leave. New requests always save Days = 1, whatever From and To you choose. Read the From and To dates.',
      'Approving a leave and assuming the employee is now On Leave everywhere. Employee status does not change; set it on Employees if needed.',
      'Saving without choosing the employee. The row is created with a blank employee and cannot be edited or deleted.',
    ],
    warnings: [
      'There are no leave balances in this version, even though the page subtitle mentions them. The ERP does not stop a leave because the balance is used up.',
      'Unpaid Leave is not deducted from salary on the Payroll screen.',
      'The “On leave today” and “Leave types” cards are fixed numbers, not calculated.',
    ],
    fields: [
      { name: 'Employee', help: 'Dropdown of employee names from HR → Employees.' },
      { name: 'Leave type', help: 'Casual Leave, Sick Leave, Earned Leave, Comp Off or Unpaid Leave.' },
      { name: 'From / To', help: 'First and last day of leave. Not checked against holidays or each other.' },
      { name: 'Reason', help: 'Short reason, shown in the list for the approver.' },
    ],
    statuses: [
      { status: 'Pending', meaning: 'Waiting for a decision. Approve and Reject buttons are shown.' },
      { status: 'Approved', meaning: 'Leave accepted. Counted in the Approved card.' },
      { status: 'Rejected', meaning: 'Leave refused. No further action possible on the row.' },
    ],
    example: 'Ravi Kumar’s Casual Leave LV002 for 12 Oct is Pending. The fleet head agrees, so HR clicks Approve. Status becomes Approved and the Pending card drops by one.',
    walkthrough: [
      { title: 'Look at Pending', body: 'The Pending card shows how many requests wait for a decision.' },
      { title: 'Apply leave', body: 'Click Apply leave, choose the Employee and Leave type.' },
      { title: 'Enter dates and reason', body: 'Fill From, To and Reason, then Save. The request appears as Pending.' },
      { title: 'Decide', body: 'On a Pending row click Approve or Reject after checking the dates and reason.' },
      { title: 'Update status if needed', body: 'If the person is away today, set Status to On Leave on Employees.' },
    ],
    related: ['hr/employees', 'hr/holidays', 'hr/attendance'],
    practice: 'ex.hr.leave-approve',
    audio: [
      'यह Leaves screen है — leave की हर request यहाँ आती है।',
      'Apply leave दबाइए, employee, leave type, from और to date, और reason भरिए। Request Pending में save होती है।',
      'Pending row पर Approve या Reject दबाइए। एक बार decide हो गया, तो फिर बदल नहीं सकते।',
      'ध्यान दीजिए — Days column में नई request हमेशा एक दिन दिखाती है। असली दिन From और To date से गिनिए।',
      'Approve करने से employee का status On Leave अपने आप नहीं होता — वो Employees पर बदलिए।',
    ],
    quiz: ['q.hr.leave-days', 'q.hr.leave-approve-status'],
    minutes: 4,
  },
  {
    id: 'hr/shifts',
    module: 'hr',
    title: 'Shift Roster',
    purpose: 'Shows each employee’s shift for the week and lets you change their default shift.',
    why: 'Branch heads and HR can see in one table who works General, Morning, Evening or Night, and who is on Weekly Off.',
    when: 'When an employee is moved to another shift, or when planning the week.',
    roles: ['HR', 'AD', 'SA'],
    upstream: ['hr/employees'],
    downstream: ['hr/attendance'],
    before: 'Employees are created with a shift on the Employees screen.',
    after: 'The new shift shows on Employees and Attendance straight away.',
    prerequisites: ['Employee exists on HR → Employees.'],
    actions: ['Default shift dropdown: choose General, Morning, Evening, Night or Weekly Off. The change is saved immediately.'],
    records: ['Updates the Shift field of the employee record.'],
    validations: ['None. There is no Save button and no confirmation; the change is applied the moment you pick a value.'],
    mistakes: [
      'Trying to give one employee a different shift on one day only. The Mon–Sat columns always repeat the default shift; day-wise shifts are not supported.',
      'Picking Weekly Off by mistake. The whole week for that person then shows Weekly Off. Pick the right shift again to undo.',
    ],
    warnings: ['There is no shift history. The ERP does not record who changed a shift or when.'],
    fields: [{ name: 'Default shift', help: 'The one shift used for every working day (Mon–Sat) of that employee.' }],
    example: 'Manoj Yadav moves from the Morning to the Night shift in the Raipur workshop. On Shift Roster, change his Default shift to Night. Mon–Sat now show Night, and Employees shows Shift = Night.',
    walkthrough: [
      { title: 'Find the employee', body: 'Each row is one employee with ID and department.' },
      { title: 'Read the week', body: 'Mon to Sat show the shift the person works.' },
      { title: 'Change the shift', body: 'Pick the new value in Default shift. It is saved at once.' },
    ],
    related: ['hr/employees', 'hr/attendance'],
    audio: [
      'यह Shift Roster है — किसकी कौन सी shift है, पूरा हफ़्ता एक table में।',
      'Shift बदलने के लिए आख़िरी column में Default shift चुनिए। Save button नहीं है, बदलाव तुरंत save हो जाता है।',
      'एक employee की पूरे हफ़्ते की एक ही shift होती है, अलग-अलग दिन की shift अभी नहीं बनती।',
    ],
    quiz: ['q.hr.shift-change'],
    minutes: 2,
  },
  {
    id: 'hr/attendance',
    module: 'hr',
    title: 'Attendance',
    purpose: 'A view of daily attendance: shift, check-in, check-out, working hours, late marks, overtime and status for each employee.',
    why: 'It shows management how a daily attendance register will look, and who is On Leave today.',
    when: 'To review who is present or on leave. In this version it is a view only.',
    roles: ['HR', 'AD', 'SA'],
    upstream: ['hr/employees', 'hr/shifts', 'hr/leaves'],
    downstream: ['payroll/overtime', 'payroll/run'],
    before: 'Employee status and shift come from Employees and Shift Roster.',
    after: 'Overtime that must be paid is entered on Payroll → Overtime Request, not here.',
    prerequisites: [],
    actions: ['View only. The month picker at the top can be changed but does not change the table.'],
    records: ['None. Nothing on this screen is saved.'],
    validations: [],
    mistakes: [
      'Trying to mark someone absent or correct a check-in time. Attendance cannot be edited in this version.',
      'Using the OT column here to pay overtime. Payroll only pays hours approved on Overtime Request.',
    ],
    warnings: [
      'Check-in, check-out, working hours, late and OT values are sample figures for demonstration (most rows show 09:28 to 18:34). The KPI cards (Present 5, Absent 0, On leave 1, Late 1, Overtime 5.5 h) are fixed numbers.',
      'Only the Status column is real: an employee whose status is On Leave on Employees shows On Leave with no times.',
    ],
    statuses: [
      { status: 'Present', meaning: 'Employee status is Active (or Inactive) on Employees.' },
      { status: 'On Leave', meaning: 'Employee status is On Leave on Employees.' },
    ],
    walkthrough: [
      { title: 'Read the cards', body: 'Present, Absent, On leave, Late and Overtime give the daily picture (sample figures).' },
      { title: 'Check status', body: 'Look for On Leave rows. They come from the employee Status on Employees.' },
      { title: 'Act elsewhere', body: 'To pay overtime, raise it on Overtime Request. To change who is on leave, update Employees.' },
    ],
    related: ['hr/employees', 'hr/leaves', 'payroll/overtime'],
    audio: [
      'यह Attendance screen है — रोज़ कौन आया, कितने बजे, कितने घंटे।',
      'अभी यह सिर्फ़ देखने के लिए है। Check-in के time और ऊपर के numbers sample हैं, इन्हें बदल नहीं सकते।',
      'असली चीज़ Status है — जिसका status Employees पर On Leave है, वो यहाँ On Leave दिखेगा।',
      'Overtime का पैसा चाहिए, तो Overtime Request पर entry कीजिए, यहाँ से payroll नहीं जुड़ता।',
    ],
    quiz: ['q.hr.attendance-sample'],
    minutes: 2,
  },
  {
    id: 'hr/holidays',
    module: 'hr',
    title: 'Holidays',
    purpose: 'The company holiday calendar with holiday name, date, weekday and type.',
    why: 'Staff and managers check which days are company holidays or optional holidays before planning leave and shifts.',
    when: 'At the start of the year, and whenever management announces a holiday.',
    roles: ['HR', 'AD', 'SA'],
    upstream: [],
    downstream: ['hr/leaves', 'hr/shifts'],
    before: 'Management decides the holiday list.',
    after: 'Use the calendar when approving leave and planning shifts.',
    prerequisites: [],
    actions: ['Add holiday: enter Holiday name, Date and Type (Company Holiday or Optional Holiday), then Save.'],
    records: ['Holiday row. The Day column is worked out from the date.'],
    validations: ['None. A holiday can be saved without a name or date; a missing date shows “Invalid Date” in the Day column.'],
    mistakes: [
      'Saving a wrong date. There is no Edit or Delete for holidays, so a wrong row stays in the list.',
      'Expecting a holiday to reduce leave days or appear on Attendance. Holidays are not linked to other screens in this version.',
    ],
    warnings: ['“Applicable to” always shows All branches. Branch-wise holidays are not supported.'],
    fields: [
      { name: 'Holiday', help: 'Name of the holiday, e.g. Dussehra.' },
      { name: 'Date', help: 'The holiday date. Check it twice — it cannot be changed later.' },
      { name: 'Type', help: 'Company Holiday (office closed) or Optional Holiday (employee may choose).' },
    ],
    example: 'Management adds Chhath Puja on 2026-11-15 as an Optional Holiday. Add holiday → name, date, Type Optional Holiday → Save. The Day column shows Sunday.',
    walkthrough: [
      { title: 'Check the list', body: 'See each holiday with date and weekday.' },
      { title: 'Add holiday', body: 'Click Add holiday and fill name, date and type.' },
      { title: 'Check before Save', body: 'There is no edit later, so confirm the date before you click Save.' },
    ],
    related: ['hr/leaves', 'hr/shifts'],
    audio: [
      'यह Holidays screen है — company की छुट्टियों का calendar।',
      'Add holiday दबाइए, नाम, date और type भरिए — Company Holiday या Optional Holiday।',
      'Date ध्यान से डालिए, क्योंकि बाद में edit या delete नहीं होता।',
      'Holiday जोड़ने से leave के दिन अपने आप कम नहीं होते।',
    ],
    quiz: ['q.hr.holiday-scope'],
    minutes: 2,
  },
  {
    id: 'hr/designations',
    module: 'hr',
    title: 'Designations',
    purpose: 'The list of job titles with their department and level, and how many employees hold each title.',
    why: 'It keeps job titles consistent, so reports by designation are correct.',
    when: 'Before adding employees with a new job title, or when the organisation structure changes.',
    roles: ['HR', 'AD', 'SA'],
    upstream: ['hr/departments'],
    downstream: ['hr/employees'],
    before: 'The department should exist, because Department is a dropdown from Departments.',
    after: 'Use the exact same title in the Designation field on Employees.',
    prerequisites: ['Department exists on HR → Departments.'],
    actions: ['Add: Name, Department and Level, then Save.', 'Edit: change name, department or level.'],
    records: ['Designation with status Active.'],
    validations: ['None. Name is not required.'],
    mistakes: [
      'Expecting the Employees count to follow a rename. The count matches the employee’s Designation text exactly; after a rename, employees with the old text are no longer counted.',
      'Small spelling differences (“Sr. Accountant” vs “Senior Accountant”) give a count of 0.',
    ],
    warnings: ['There is no Delete and no way to set a designation Inactive.'],
    fields: [
      { name: 'Name', help: 'Job title, e.g. Fleet Supervisor.' },
      { name: 'Department', help: 'Dropdown from Departments.' },
      { name: 'Level', help: 'Management, Manager, Supervisor, Senior, Executive or Staff.' },
    ],
    walkthrough: [
      { title: 'Review titles', body: 'Each row shows title, department, level and how many employees hold it.' },
      { title: 'Add a title', body: 'Click Add, enter Name, choose Department and Level, Save.' },
      { title: 'Use it on Employees', body: 'Type exactly the same title in the employee’s Designation field.' },
    ],
    related: ['hr/departments', 'hr/employees'],
    audio: [
      'यह Designations screen है — हर job title, उसका department और level।',
      'Add दबाइए, नाम, department और level चुनिए।',
      'Employees screen पर designation हाथ से लिखा जाता है, इसलिए spelling बिल्कुल यहीं जैसी रखिए, वरना count शून्य दिखेगा।',
    ],
    quiz: ['q.hr.designation-count'],
    minutes: 2,
  },
  {
    id: 'hr/departments',
    module: 'hr',
    title: 'Departments',
    purpose: 'The list of departments with their head and number of employees.',
    why: 'Departments are the dropdown used on Employees and Designations, and the base for department salary cost.',
    when: 'When setting up HR, or when a new department is formed or its head changes.',
    roles: ['HR', 'AD', 'SA'],
    upstream: [],
    downstream: ['hr/designations', 'hr/employees'],
    before: 'Nothing. This is the first HR setup screen.',
    after: 'Create designations for the department, then add employees.',
    prerequisites: [],
    actions: ['Add: Name and Head, then Save.', 'Edit: change name or head.'],
    records: ['Department with status Active.'],
    validations: ['None. Name is not required. Head is free text and is not checked against Employees.'],
    mistakes: [
      'Renaming a department. Employees and designations keep the old department name, so the Employees count for the renamed department drops to 0 until each employee is edited.',
      'Creating the same department twice with slightly different names. Both appear in every Department dropdown.',
    ],
    warnings: ['This list is separate from Masters → Departments. There is no Delete.'],
    fields: [
      { name: 'Name', help: 'Department name, e.g. Fleet.' },
      { name: 'Head', help: 'Name of the reporting head. Type it as on Employees.' },
    ],
    walkthrough: [
      { title: 'Review', body: 'See each department, its head and employee count.' },
      { title: 'Add', body: 'Click Add, type Name and Head, Save.' },
      { title: 'Continue setup', body: 'Add designations for the department, then employees.' },
    ],
    related: ['hr/designations', 'hr/employees'],
    audio: [
      'यह Departments screen है — हर department और उसका head।',
      'नया department Add से बनाइए। यही list Employees और Designations के dropdown में आती है।',
      'Department का नाम बदलेंगे तो पुराने employees अपने आप नहीं बदलते — उन्हें एक-एक करके edit करना पड़ेगा।',
    ],
    quiz: ['q.hr.department-rename'],
    minutes: 2,
  },
  {
    id: 'hr/appreciation',
    module: 'hr',
    title: 'Appreciation',
    purpose: 'Recognition cards for employees: award, employee, message and date.',
    why: 'Recognising good work, safety and attendance in one visible place motivates staff.',
    when: 'After monthly reviews, or whenever a manager wants to recognise someone.',
    roles: ['HR', 'AD', 'SA'],
    upstream: ['hr/employees'],
    downstream: [],
    before: 'The employee must exist on Employees.',
    after: 'The new card appears first in the list.',
    prerequisites: ['Employee exists on HR → Employees.'],
    actions: ['Give appreciation: choose Employee, Award and write a Message, then Save.'],
    records: ['Appreciation card, newest first.'],
    validations: ['None. Employee is not required.'],
    mistakes: ['Saving without choosing an employee. The card has no name and cannot be removed.'],
    warnings: [
      'The date on a new card is always set to 2026-10-09 in this version; it is not today’s date.',
      'There is no Edit or Delete for appreciation cards.',
    ],
    fields: [
      { name: 'Award', help: 'Employee of the Month, Outstanding Performance, Customer Appreciation, Safety Champion or Perfect Attendance.' },
      { name: 'Message', help: 'One or two lines on what the person did, e.g. “Zero accidents on the Jharsuguda route in September.”' },
    ],
    walkthrough: [
      { title: 'Give appreciation', body: 'Click Give appreciation.' },
      { title: 'Choose', body: 'Select the Employee and the Award.' },
      { title: 'Write and save', body: 'Write a specific message and Save. The card appears first.' },
    ],
    related: ['hr/employees'],
    audio: [
      'यह Appreciation screen है — अच्छे काम की तारीफ़ यहाँ दर्ज होती है।',
      'Give appreciation दबाइए, employee और award चुनिए, और साफ़ लिखिए कि उन्होंने क्या अच्छा किया।',
      'Card बाद में edit या delete नहीं होता, इसलिए save से पहले नाम check कर लीजिए।',
    ],
    quiz: ['q.hr.data-location'],
    minutes: 2,
  },
  {
    id: 'payroll/run',
    module: 'payroll',
    title: 'Payroll',
    purpose: 'Monthly payroll sheet for October 2026: Basic, other earnings, Gross, PF, TDS and Net salary per employee, with totals.',
    why: 'It shows the total salary cost and the net amount payable before salaries are released.',
    when: 'At month end, after salary structures are correct and overtime is approved.',
    roles: ['HR', 'AC', 'AD', 'SA'],
    upstream: ['payroll/salary', 'payroll/overtime'],
    downstream: ['payroll/tds', 'payroll/reports'],
    before: 'Salary structures are set on Employee Salary, and overtime for the month is approved on Overtime Request.',
    after: 'Review TDS and the reports. Actual salary payment and accounting entries are done outside this screen.',
    prerequisites: ['Salary set on Employee Salary.', 'Overtime approved on Overtime Request.'],
    actions: ['Process payroll: marks every row Paid on screen and the button changes to “Payroll processed”.'],
    records: ['None saved. Process payroll is not stored anywhere.'],
    validations: ['None. The button can be pressed at any time.'],
    mistakes: [
      'Pressing Process payroll before approving overtime. Pending overtime is not in Gross, so the sheet under-pays that employee.',
      'Thinking Process payroll paid the staff. It only changes the badges on this screen. No payslip, bank file or ledger entry is created, and after you leave the page all rows show Pending again.',
      'Not checking Inactive employees. Every employee in the list is included, whatever their status.',
    ],
    warnings: [
      'Demo payroll, not statutory compliance: PF is a flat 12% of Basic with no ceiling, TDS is a flat 5% of Gross, and there is no ESI, Professional Tax, LOP for unpaid leave, arrears or employer contributions.',
      'Approved Payroll Expenses (reimbursements, bonus, incentive, advance) are not added to this sheet.',
      'The month is fixed to October 2026.',
    ],
    fields: [
      { name: 'Basic', help: 'From Employee Salary.' },
      { name: 'Earnings', help: 'HRA + Allowance.' },
      { name: 'Gross', help: 'Basic + HRA + Allowance + approved overtime hours × ₹250.' },
      { name: 'PF', help: '12% of Basic, rounded.' },
      { name: 'TDS', help: '5% of Gross, rounded.' },
      { name: 'Net salary', help: 'Gross − PF − TDS.' },
    ],
    statuses: [
      { status: 'Pending', meaning: 'Default for every row when the page opens.' },
      { status: 'Paid', meaning: 'Shown on every row after Process payroll, until you leave the page.' },
    ],
    example: 'Ravi Kumar: Basic ₹30,000 + HRA ₹12,000 + Allowance ₹6,000 + 3 approved OT hours (₹750) = Gross ₹48,750. PF ₹3,600, TDS ₹2,438, Net ₹42,712.',
    walkthrough: [
      { title: 'Check overtime first', body: 'Make sure all overtime for the month is approved on Overtime Request.' },
      { title: 'Read the totals', body: 'Gross payroll, Deductions (PF + TDS) and Net payable are at the top.' },
      { title: 'Check each row', body: 'Compare Basic and Gross with Employee Salary; look out for Inactive staff.' },
      { title: 'Process payroll', body: 'Click Process payroll to mark rows Paid for review. This is not saved and does not pay anyone.' },
    ],
    related: ['payroll/salary', 'payroll/overtime', 'payroll/tds', 'payroll/reports'],
    audio: [
      'यह Payroll screen है — इस महीने किसे कितनी salary मिलेगी, एक sheet में।',
      'Gross में Basic, HRA, Allowance, और approved overtime के हर घंटे के ढाई सौ रुपये जुड़ते हैं।',
      'PF, Basic का बारह percent है, और TDS, Gross का पाँच percent।',
      'Process payroll दबाने से rows सिर्फ़ screen पर Paid दिखती हैं — न payslip बनती है, न bank में पैसा जाता है, और page छोड़ते ही वापस Pending।',
      'यह demo payroll है, असली statutory payroll का हिसाब नहीं।',
    ],
    quiz: ['q.payroll.process-not-saved', 'q.payroll.ot-into-gross'],
    minutes: 5,
  },
  {
    id: 'payroll/salary',
    module: 'payroll',
    title: 'Employee Salary',
    purpose: 'Salary structure for each employee: Basic, HRA and Allowance, with the Gross, Deductions and Net they produce.',
    why: 'The payroll run takes every number from here. A wrong structure means a wrong salary.',
    when: 'When an employee joins, gets an increment, or changes role.',
    roles: ['HR', 'AC', 'AD', 'SA'],
    upstream: ['hr/employees'],
    downstream: ['payroll/run', 'payroll/tds'],
    before: 'The employee exists on Employees. New employees start with Basic ₹28,000, HRA ₹11,200, Allowance ₹5,000.',
    after: 'The new figures show immediately on Payroll and TDS.',
    prerequisites: ['Employee exists on HR → Employees.'],
    actions: ['Edit: change Basic, HRA and Allowance for one employee, then Save.'],
    records: ['Updates basic, hra and allow on the employee record.'],
    validations: ['None. Zero and negative numbers are accepted.'],
    mistakes: [
      'Forgetting to update a new joiner. They are paid the default ₹44,200 gross.',
      'Comparing Net here with Net on Payroll. Payroll adds approved overtime, so the two can differ.',
    ],
    warnings: ['Deductions here are only PF (12% of Basic) and TDS (5% of Gross). There is no salary history or effective date; a change applies to the current month at once.'],
    fields: [
      { name: 'Basic', help: 'Monthly basic pay. PF is 12% of this.' },
      { name: 'HRA', help: 'House rent allowance per month.' },
      { name: 'Allowance', help: 'All other fixed monthly allowances.' },
      { name: 'Deductions', help: 'PF + TDS, worked out automatically.' },
    ],
    example: 'Neha Verma gets an increment: Edit → Basic ₹40,000, HRA ₹16,000, Allowance ₹8,000 → Save. Gross ₹64,000, PF ₹4,800, TDS ₹3,200, Net ₹56,000.',
    walkthrough: [
      { title: 'Find the employee', body: 'Each row shows the current structure and Net.' },
      { title: 'Edit', body: 'Click Edit and type the new Basic, HRA and Allowance.' },
      { title: 'Save and check', body: 'Save, then check that Gross and Net look right.' },
    ],
    related: ['hr/employees', 'payroll/run', 'payroll/tds'],
    audio: [
      'यह Employee Salary screen है — हर employee का Basic, HRA और Allowance।',
      'Payroll हर number यहीं से उठाता है, इसलिए नए employee की salary सबसे पहले यहाँ ठीक कीजिए।',
      'Edit दबाइए, तीनों amount डालिए, Save कीजिए। Gross, deductions और net अपने आप बनते हैं।',
    ],
    quiz: ['q.payroll.salary-calc'],
    minutes: 3,
  },
  {
    id: 'payroll/tds',
    module: 'payroll',
    title: 'TDS',
    purpose: 'Yearly TDS planning view for FY 2026–27: PAN, annual gross, taxable income, annual and monthly TDS, deducted so far and remaining.',
    why: 'It gives a quick estimate of how much tax will be deducted from each employee during the year.',
    when: 'After salary structures change, and when reviewing tax deductions with Accounts.',
    roles: ['HR', 'AC', 'AD', 'SA'],
    upstream: ['payroll/salary', 'hr/employees'],
    downstream: ['payroll/reports'],
    before: 'PAN is entered on Employees and salary on Employee Salary.',
    after: 'Actual TDS deposit and returns are handled by Accounts outside this screen.',
    prerequisites: ['PAN entered on Employees.'],
    actions: ['View only.'],
    records: ['None.'],
    validations: [],
    mistakes: [
      'Treating these numbers as final tax. Annual TDS here is 5% of gross × 12, not the income-tax slab calculation.',
      'Missing a blank PAN. Employees added without PAN show an empty PAN cell; nothing warns you.',
    ],
    warnings: [
      'Demo calculation: Annual gross = monthly gross (without overtime) × 12. Taxable income = Annual gross − ₹75,000. Annual TDS is NOT worked out from taxable income; it is monthly TDS (5% of gross) × 12.',
      'Deducted YTD and Remaining both assume 6 months: each is monthly TDS × 6.',
      'No tax regime, declarations, exemptions or Form 16 / 24Q support. Confirm real TDS with Accounts.',
    ],
    fields: [
      { name: 'Annual gross', help: 'Monthly gross × 12, overtime not included.' },
      { name: 'Taxable income', help: 'Annual gross − ₹75,000 standard deduction (for display only).' },
      { name: 'Monthly TDS', help: '5% of monthly gross.' },
    ],
    example: 'Amit Sharma: monthly gross ₹68,000 → Annual gross ₹8,16,000, Taxable income ₹7,41,000, Monthly TDS ₹3,400, Annual TDS ₹40,800, Deducted YTD ₹20,400, Remaining ₹20,400.',
    walkthrough: [
      { title: 'Check PAN', body: 'Every row should have a PAN. Fix blanks on Employees.' },
      { title: 'Read monthly TDS', body: 'This is the same TDS shown on Payroll (without overtime).' },
      { title: 'Confirm with Accounts', body: 'Use the figures as an estimate; real tax is worked out by Accounts.' },
    ],
    related: ['payroll/salary', 'payroll/run', 'hr/employees'],
    audio: [
      'यह TDS screen है — साल भर में हर employee का कितना tax कटेगा, उसका अंदाज़ा।',
      'यहाँ TDS सीधा gross का पाँच percent है, tax slab से नहीं निकलता।',
      'हर row में PAN होना चाहिए। PAN खाली है तो Employees पर जाकर भरिए।',
      'असली tax और return के लिए Accounts से confirm कीजिए।',
    ],
    quiz: ['q.payroll.tds-flat'],
    minutes: 3,
  },
  {
    id: 'payroll/expenses',
    module: 'payroll',
    title: 'Payroll Expenses',
    purpose: 'Staff reimbursements, travel allowance, bonus, incentive, staff welfare and advances, with approval.',
    why: 'One list of money owed to or advanced to employees, so nothing is paid twice or forgotten.',
    when: 'When an employee submits a claim or management sanctions a bonus or advance.',
    roles: ['HR', 'AC', 'AD', 'SA'],
    upstream: ['hr/employees'],
    downstream: ['payroll/reports'],
    before: 'The employee submits bills or a manager approves the payment.',
    after: 'Pay approved items through Accounts. They are not added to the Payroll sheet.',
    prerequisites: ['Employee exists on HR → Employees.'],
    actions: ['New: Employee, Type, Amount, Date, then Save (status Pending).', 'Approve: on a Pending row, sets status Approved.'],
    records: ['Payroll expense, status Pending.'],
    validations: ['None. Amount is not required; an empty amount saves as ₹0.'],
    mistakes: [
      'Expecting an approved Travel Allowance or Bonus to appear in Net salary on Payroll. It does not; it must be paid separately.',
      'Recording an Advance and expecting it to be recovered from salary. Advance recovery is not supported.',
    ],
    warnings: ['There is no Reject button, and no Edit or Delete. A wrong claim stays Pending.'],
    fields: [
      { name: 'Type', help: 'Reimbursement, Travel Allowance, Bonus, Incentive, Staff Welfare or Advance.' },
      { name: 'Amount', help: 'Rupees. Check bills before saving.' },
    ],
    statuses: [
      { status: 'Pending', meaning: 'Waiting for approval.' },
      { status: 'Approved', meaning: 'Approved for payment by Accounts.' },
    ],
    walkthrough: [
      { title: 'New', body: 'Click New, choose Employee and Type.' },
      { title: 'Amount and date', body: 'Enter the amount from the bill and the date, then Save.' },
      { title: 'Approve', body: 'After checking the bill, click Approve on the Pending row.' },
    ],
    related: ['payroll/run', 'payroll/reports'],
    audio: [
      'यह Payroll Expenses screen है — reimbursement, travel allowance, bonus, incentive और advance।',
      'New दबाइए, employee, type, amount और date भरिए। Entry Pending में जाती है।',
      'Bill check करके Approve कीजिए। Reject का button नहीं है, इसलिए गलत entry मत बनाइए।',
      'Approved expense, Payroll sheet की salary में नहीं जुड़ता — उसका payment अलग से होता है।',
    ],
    quiz: ['q.payroll.expenses-not-in-run'],
    minutes: 3,
  },
  {
    id: 'payroll/overtime',
    module: 'payroll',
    title: 'Overtime Request',
    purpose: 'Overtime claims with employee, date, hours, reason and amount (hours × ₹250), and their approval.',
    why: 'Only overtime approved here is paid in the payroll run.',
    when: 'Whenever staff work beyond shift hours — for example a late vehicle arrival or urgent truck repair — and before running payroll.',
    roles: ['HR', 'AC', 'AD', 'SA'],
    upstream: ['hr/attendance', 'hr/employees'],
    downstream: ['payroll/run'],
    before: 'The supervisor confirms the extra hours worked.',
    after: 'Approved hours are added to the employee’s Gross on Payroll at ₹250 per hour.',
    prerequisites: ['Employee exists on HR → Employees.'],
    actions: ['New: Employee, Date, Hours (steps of 0.5) and Reason, then Save (status Pending).', 'Approve: on a Pending row, sets status Approved.'],
    records: ['Overtime request, status Pending. Amount = hours × ₹250.'],
    validations: ['None. Hours is not required; an empty value saves as 0 hours.'],
    mistakes: [
      'Leaving overtime Pending at payroll time. Pending hours are not paid.',
      'Raising the same overtime twice. There is no duplicate check, and both rows are paid once approved.',
    ],
    warnings: [
      'There is no Reject button, and no Edit or Delete.',
      'The rate is fixed at ₹250 per hour for everyone in this version.',
      'Overtime is linked to payroll by employee name. If the employee is renamed, old overtime no longer reaches their payroll.',
    ],
    fields: [
      { name: 'Hours', help: 'Extra hours worked, in steps of 0.5.' },
      { name: 'Reason', help: 'Why the extra work was needed, e.g. “Urgent truck repair”.' },
      { name: 'Amount', help: 'Hours × ₹250, shown automatically.' },
    ],
    statuses: [
      { status: 'Pending', meaning: 'Not yet approved. Not paid in Payroll.' },
      { status: 'Approved', meaning: 'Added to Gross on Payroll.' },
    ],
    example: 'Manoj Yadav’s 2.5 hours on 08 Oct for an urgent truck repair (₹625) is Pending. After the workshop head confirms, click Approve. On Payroll his Gross rises from ₹38,000 to ₹38,625.',
    walkthrough: [
      { title: 'New request', body: 'Click New, choose Employee, Date and Hours, and write the Reason.' },
      { title: 'Check amount', body: 'After Save the row shows hours × ₹250 and status Pending.' },
      { title: 'Approve', body: 'Once confirmed, click Approve.' },
      { title: 'Verify in Payroll', body: 'Open Payroll and check the employee’s Gross includes the overtime.' },
    ],
    related: ['payroll/run', 'hr/attendance'],
    practice: 'ex.payroll.overtime-approve',
    audio: [
      'यह Overtime Request screen है — shift के बाद extra काम का हिसाब।',
      'New दबाइए, employee, date, घंटे और reason भरिए। हर घंटे के ढाई सौ रुपये बनते हैं।',
      'सिर्फ़ Approved overtime ही Payroll में जुड़ता है, Pending वाला नहीं।',
      'Payroll चलाने से पहले सारे pending overtime निपटा दीजिए।',
    ],
    quiz: ['q.payroll.ot-rate', 'q.payroll.ot-approve-next'],
    minutes: 3,
  },
  {
    id: 'payroll/reports',
    module: 'payroll',
    title: 'Payroll Reports',
    purpose: 'The list of HR and payroll MIS reports, with a summary of employees, departments, leaves and overtime requests.',
    why: 'It shows management which HR and payroll reports are planned, and the current record counts.',
    when: 'For month-end management review.',
    roles: ['HR', 'AC', 'AD', 'SA'],
    upstream: ['payroll/run', 'payroll/tds', 'payroll/expenses', 'hr/leaves'],
    downstream: [],
    before: 'Payroll, leave, overtime and expenses for the month are complete.',
    after: 'Share figures with management from the Payroll and TDS screens.',
    prerequisites: [],
    actions: ['View the report list: Payroll Summary, Salary Register, Attendance Summary, Leave Summary, Overtime Report, TDS Report, Department Salary Cost, Payroll Expense Report.'],
    records: ['None.'],
    validations: [],
    mistakes: ['Clicking View report or Export and waiting for a file. These buttons do not open or download anything in this version.'],
    warnings: ['Only the summary counts at the bottom (Employees, Departments, Leaves, OT Requests) are live. For figures, use the Payroll, Employee Salary and TDS screens.'],
    walkthrough: [
      { title: 'Read the summary', body: 'The bottom card shows how many employees, departments, leave requests and overtime requests exist.' },
      { title: 'Pick the source screen', body: 'For salary totals use Payroll; for tax use TDS; for overtime use Overtime Request.' },
    ],
    related: ['payroll/run', 'payroll/tds', 'payroll/overtime'],
    audio: [
      'यह Payroll Reports screen है — HR और payroll की reports की list।',
      'नीचे के numbers असली हैं — कितने employees, departments, leaves और overtime requests।',
      'View report और Export button अभी कुछ नहीं खोलते। आँकड़े Payroll और TDS screen से लीजिए।',
    ],
    quiz: ['q.payroll.hr-payroll-order'],
    minutes: 2,
  },
];

// ---------- questions ----------
export const questions: Question[] = [
  {
    id: 'q.hr.new-employee-defaults',
    module: 'hr',
    type: 'scenario',
    prompt: 'What salary will the payroll run use for this employee?',
    scenario: 'A new joiner was added on Employees with only the Full name filled in, and Save was clicked. Nobody opened Employee Salary.',
    options: [
      { id: 'a', text: 'Nothing — the employee is left out of payroll until a salary is entered' },
      { id: 'b', text: 'The default structure: Basic ₹28,000, HRA ₹11,200, Allowance ₹5,000' },
      { id: 'c', text: 'The same salary as the department head' },
      { id: 'd', text: 'The ERP blocks Save until salary is entered' },
    ],
    answer: 'b',
    explanation: 'Only Full name is required. Missing fields are filled with defaults, including Basic ₹28,000, HRA ₹11,200 and Allowance ₹5,000, and every employee appears on Payroll. Always set the real structure on Payroll → Employee Salary right after adding someone.',
    screens: ['hr/employees', 'payroll/salary'],
    difficulty: 2,
  },
  {
    id: 'q.hr.name-link',
    module: 'hr',
    type: 'scenario',
    prompt: 'What happens to his approved overtime on the Payroll screen?',
    scenario: 'Ravi Kumar has 3 hours of Approved overtime. HR then edits his Full name on Employees to “Ravi Kumar Sahu”.',
    options: [
      { id: 'a', text: 'It is still paid; overtime follows the employee ID' },
      { id: 'b', text: 'It is no longer added to his Gross, because overtime is matched by employee name' },
      { id: 'c', text: 'The ERP renames the overtime record automatically' },
      { id: 'd', text: 'The rename is blocked because he has overtime' },
    ],
    answer: 'b',
    explanation: 'Leave, overtime and expense records store the employee name, and Payroll adds approved overtime where the name matches exactly. After a rename the old overtime no longer matches. Get the name right when the employee is first added.',
    screens: ['hr/employees', 'payroll/run', 'payroll/overtime'],
    difficulty: 3,
  },
  {
    id: 'q.hr.leave-days',
    module: 'hr',
    type: 'spot',
    prompt: 'Spot the problem in this leave list.',
    scenario: 'You applied Earned Leave for Pooja Singh from 2026-10-14 to 2026-10-16. The new row shows: Type Earned Leave · From 2026-10-14 · To 2026-10-16 · Days 1 · Pending.',
    options: [
      { id: 'a', text: 'The status should be Approved straight away' },
      { id: 'b', text: 'Days shows 1, but the leave is 3 days — new requests always save Days = 1' },
      { id: 'c', text: 'Earned Leave cannot be applied by HR' },
      { id: 'd', text: 'Nothing is wrong' },
    ],
    answer: 'b',
    explanation: 'The Apply leave form does not calculate days from From and To; every new request is saved with Days = 1. Read the From and To dates when approving, and do not rely on the Days column for new requests.',
    screens: ['hr/leaves'],
    difficulty: 2,
  },
  {
    id: 'q.hr.leave-approve-status',
    module: 'hr',
    type: 'tf',
    prompt: 'True or false: when you approve a leave, the employee’s status on Employees automatically becomes On Leave.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ],
    answer: 'false',
    explanation: 'Approve only changes the leave request status to Approved. Employee status (Active / On Leave / Inactive) is changed by hand on Employees, and Attendance shows On Leave only from that status.',
    screens: ['hr/leaves', 'hr/employees', 'hr/attendance'],
    difficulty: 1,
  },
  {
    id: 'q.hr.leave-flow',
    module: 'hr',
    type: 'order',
    prompt: 'Put the leave steps in the order they happen in the ERP.',
    items: [
      { id: 'apply', text: 'Click Apply leave' },
      { id: 'fill', text: 'Choose Employee and Leave type, enter From, To and Reason' },
      { id: 'save', text: 'Save — the request appears as Pending' },
      { id: 'decide', text: 'Click Approve or Reject on the Pending row' },
      { id: 'status', text: 'If the person is away today, set Status On Leave on Employees' },
    ],
    answer: ['apply', 'fill', 'save', 'decide', 'status'],
    explanation: 'A leave is created Pending, then decided with Approve or Reject. Approving does not change the employee’s status, so that is a separate, manual last step.',
    screens: ['hr/leaves', 'hr/employees'],
    difficulty: 1,
  },
  {
    id: 'q.hr.shift-change',
    module: 'hr',
    type: 'next',
    prompt: 'You changed Manoj Yadav’s Default shift on Shift Roster from Morning to Night. What do you do next to save it?',
    options: [
      { id: 'a', text: 'Click Save at the bottom of the table' },
      { id: 'b', text: 'Nothing — the change is saved the moment you pick it, and shows on Employees and Attendance' },
      { id: 'c', text: 'Send it for approval to the branch head' },
      { id: 'd', text: 'Change each day from Mon to Sat separately' },
    ],
    answer: 'b',
    explanation: 'Shift Roster has no Save button. Choosing a value in Default shift updates the employee immediately. Mon–Sat always repeat the default shift; day-wise shifts are not supported.',
    screens: ['hr/shifts'],
    difficulty: 1,
  },
  {
    id: 'q.hr.attendance-sample',
    module: 'hr',
    type: 'mcq',
    prompt: 'A driver supervisor says his check-in time on Attendance is wrong. How do you correct it?',
    options: [
      { id: 'a', text: 'Click the time and type the correct one' },
      { id: 'b', text: 'Change the month at the top and re-load' },
      { id: 'c', text: 'You cannot in this version — Attendance times are sample figures and the screen is view only' },
      { id: 'd', text: 'Raise an Overtime Request with 0 hours' },
    ],
    answer: 'c',
    explanation: 'Attendance shows sample check-in, check-out, late and OT values and fixed KPI cards. Only the Present / On Leave status comes from Employees. There is no attendance marking or correction yet.',
    screens: ['hr/attendance'],
    difficulty: 2,
  },
  {
    id: 'q.hr.holiday-scope',
    module: 'hr',
    type: 'tf',
    prompt: 'True or false: if a leave from 19 to 21 October includes Dussehra (20 Oct, a Company Holiday), the ERP automatically counts the leave as 2 days.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ],
    answer: 'false',
    explanation: 'Holidays are a calendar only. They are not linked to leave, attendance or shifts, and new leave requests always save Days = 1. HR must count leave days by hand.',
    screens: ['hr/holidays', 'hr/leaves'],
    difficulty: 2,
  },
  {
    id: 'q.hr.designation-count',
    module: 'hr',
    type: 'mcq',
    prompt: 'Designations shows 0 employees for “Senior Accountant”, but Neha Verma does that job. What is the most likely reason?',
    options: [
      { id: 'a', text: 'Neha is On Leave, so she is not counted' },
      { id: 'b', text: 'Her Designation on Employees is typed differently (for example “Sr. Accountant”)' },
      { id: 'c', text: 'Designations only count Active designations' },
      { id: 'd', text: 'The count updates only at month end' },
    ],
    answer: 'b',
    explanation: 'Designation on Employees is free text, and the count matches it exactly to the designation name. Edit the employee and type the title exactly as on Designations.',
    screens: ['hr/designations', 'hr/employees'],
    difficulty: 2,
  },
  {
    id: 'q.hr.department-rename',
    module: 'hr',
    type: 'tf',
    prompt: 'True or false: renaming the “Warehouse” department to “Warehouse & Logistics” also updates every employee in that department.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ],
    answer: 'false',
    explanation: 'Employees and designations store the department name as text. After a rename they keep the old name and the new department shows 0 employees until each employee is edited.',
    screens: ['hr/departments', 'hr/employees'],
    difficulty: 2,
  },
  {
    id: 'q.hr.data-location',
    module: 'hr',
    type: 'mcq',
    prompt: 'You gave Ravi Kumar a Safety Champion appreciation on your office computer. Your manager opens Appreciation on her laptop. What does she see?',
    options: [
      { id: 'a', text: 'Your new card, because all ERP data is shared' },
      { id: 'b', text: 'Not your card — HR and Payroll data is saved only in the browser where it was entered' },
      { id: 'c', text: 'Your card, but only after she switches to practice mode' },
      { id: 'd', text: 'An approval request for your card' },
    ],
    answer: 'b',
    explanation: 'In this version HR and Payroll screens keep their data in the browser (demo state), not in the shared ERP database. Other users and devices do not see your changes, and clearing browser data resets the HR sample.',
    screens: ['hr/appreciation', 'hr/employees'],
    difficulty: 2,
  },
  {
    id: 'q.payroll.ot-into-gross',
    module: 'payroll',
    type: 'scenario',
    prompt: 'Which overtime is included when you open Payroll now?',
    scenario: 'Overtime Request shows: Ravi Kumar 3 h — Approved; Manoj Yadav 2.5 h — Pending.',
    options: [
      { id: 'a', text: 'Both, ₹1,375 in total' },
      { id: 'b', text: 'Only Ravi’s 3 h, adding ₹750 to his Gross' },
      { id: 'c', text: 'Neither, until Process payroll is clicked' },
      { id: 'd', text: 'Only overtime shown on the Attendance screen' },
    ],
    answer: 'b',
    explanation: 'Payroll adds approved overtime hours × ₹250 to Gross. Pending overtime is ignored, so approve Manoj’s 2.5 h on Overtime Request before reviewing payroll.',
    screens: ['payroll/run', 'payroll/overtime'],
    difficulty: 1,
  },
  {
    id: 'q.payroll.ot-rate',
    module: 'payroll',
    type: 'mcq',
    prompt: 'An employee has 4 hours of approved overtime this month. How much does it add to Gross on the Payroll screen?',
    options: [
      { id: 'a', text: '₹500' },
      { id: 'b', text: '₹1,000' },
      { id: 'c', text: 'Twice the hourly basic rate' },
      { id: 'd', text: 'Nothing; overtime is paid separately' },
    ],
    answer: 'b',
    explanation: 'The ERP uses a flat ₹250 per approved hour for all employees: 4 × ₹250 = ₹1,000. It is not the statutory double-rate calculation.',
    screens: ['payroll/overtime', 'payroll/run'],
    difficulty: 1,
  },
  {
    id: 'q.payroll.ot-approve-next',
    module: 'payroll',
    type: 'next',
    prompt: 'Payroll is being reviewed today. Manoj Yadav’s 2.5 h overtime for an urgent truck repair is still Pending and the workshop head has confirmed it. What is the next step?',
    options: [
      { id: 'a', text: 'Click Approve on his row in Overtime Request, then check his Gross on Payroll' },
      { id: 'b', text: 'Add ₹625 to his Allowance on Employee Salary' },
      { id: 'c', text: 'Enter it as a Bonus in Payroll Expenses' },
      { id: 'd', text: 'Click Process payroll; pending overtime is added automatically' },
    ],
    answer: 'a',
    explanation: 'Only Approved overtime reaches Payroll. Changing Allowance would pay it every month, and Payroll Expenses are not added to the payroll sheet.',
    screens: ['payroll/overtime', 'payroll/run'],
    difficulty: 1,
  },
  {
    id: 'q.payroll.process-not-saved',
    module: 'payroll',
    type: 'scenario',
    prompt: 'Why are the rows Pending again?',
    scenario: 'You clicked Process payroll. All rows showed Paid. You opened Overtime Request, came back to Payroll, and every row shows Pending.',
    options: [
      { id: 'a', text: 'Someone reversed the payroll' },
      { id: 'b', text: 'Process payroll only changes the view on that screen; nothing is saved, and no payslip, bank file or ledger entry is made' },
      { id: 'c', text: 'Opening Overtime Request cancels the payroll' },
      { id: 'd', text: 'The salaries failed to transfer' },
    ],
    answer: 'b',
    explanation: 'In this demo version Process payroll is a display action. It is not stored and does not pay anyone. Salary payment and accounting are done through Accounts.',
    screens: ['payroll/run'],
    difficulty: 2,
  },
  {
    id: 'q.payroll.salary-calc',
    module: 'payroll',
    type: 'mcq',
    prompt: 'On Employee Salary, Basic is ₹30,000, HRA ₹12,000 and Allowance ₹6,000. What Net does the ERP show?',
    options: [
      { id: 'a', text: '₹48,000' },
      { id: 'b', text: '₹44,400' },
      { id: 'c', text: '₹42,000' },
      { id: 'd', text: '₹45,600' },
    ],
    answer: 'c',
    explanation: 'Gross = 30,000 + 12,000 + 6,000 = ₹48,000. PF = 12% of Basic = ₹3,600. TDS = 5% of Gross = ₹2,400. Net = 48,000 − 3,600 − 2,400 = ₹42,000.',
    screens: ['payroll/salary', 'payroll/run'],
    difficulty: 2,
  },
  {
    id: 'q.payroll.tds-flat',
    module: 'payroll',
    type: 'tf',
    prompt: 'True or false: the TDS screen works out Annual TDS from Taxable income using income-tax slabs.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ],
    answer: 'false',
    explanation: 'Taxable income (Annual gross − ₹75,000) is shown for information only. Annual TDS is simply 5% of monthly gross × 12. It is an estimate; Accounts must confirm actual tax.',
    screens: ['payroll/tds'],
    difficulty: 2,
  },
  {
    id: 'q.payroll.expenses-not-in-run',
    module: 'payroll',
    type: 'tf',
    prompt: 'True or false: approving a ₹4,200 Travel Allowance on Payroll Expenses increases that employee’s Net salary on the Payroll screen.',
    options: [
      { id: 'true', text: 'True' },
      { id: 'false', text: 'False' },
    ],
    answer: 'false',
    explanation: 'Payroll Expenses are tracked and approved separately. The Payroll sheet adds only Basic, HRA, Allowance and approved overtime. Approved expenses are paid through Accounts.',
    screens: ['payroll/expenses', 'payroll/run'],
    difficulty: 1,
  },
  {
    id: 'q.payroll.inactive-in-run',
    module: 'payroll',
    type: 'spot',
    prompt: 'Spot the risk before you share the payroll totals.',
    scenario: 'Sanjay Das left last week. HR set his Status to Inactive on Employees. The Payroll screen shows 6 employees and Net payable includes a row for Sanjay Das.',
    options: [
      { id: 'a', text: 'Nothing — Inactive employees are paid one last month automatically' },
      { id: 'b', text: 'The payroll run includes every employee, including Inactive ones, so the total includes Sanjay’s full salary' },
      { id: 'c', text: 'The TDS for Sanjay is double' },
      { id: 'd', text: 'Sanjay’s PF is missing' },
    ],
    answer: 'b',
    explanation: 'Payroll does not filter by status. Leavers still appear with full salary, so the total must be adjusted manually and the final settlement handled through Accounts.',
    screens: ['payroll/run', 'hr/employees'],
    difficulty: 3,
  },
  {
    id: 'q.payroll.hr-payroll-order',
    module: 'payroll',
    type: 'order',
    prompt: 'Put the month-end HR-to-payroll steps in order.',
    items: [
      { id: 'emp', text: 'Employee record correct on Employees (name, department, PAN, status)' },
      { id: 'sal', text: 'Salary structure set on Employee Salary' },
      { id: 'ot', text: 'Overtime approved on Overtime Request' },
      { id: 'run', text: 'Review Gross, PF, TDS and Net on Payroll' },
      { id: 'tds', text: 'Check TDS estimate and PAN on TDS' },
    ],
    answer: ['emp', 'sal', 'ot', 'run', 'tds'],
    explanation: 'Payroll reads the employee and salary structure, and adds only overtime that is already approved, so those come first. TDS is reviewed after the payroll figures are final.',
    screens: ['hr/employees', 'payroll/salary', 'payroll/overtime', 'payroll/run', 'payroll/tds', 'payroll/reports'],
    difficulty: 1,
  },
];

// ---------- practice exercises ----------
export const exercises: Exercise[] = [
  {
    id: 'ex.hr.leave-approve',
    title: 'Apply and approve a leave',
    module: 'hr',
    roles: ['HR', 'AD', 'SA'],
    summary: 'Apply a leave for an employee and approve it. Note: HR screens keep demo data in this browser, not in the practice dataset.',
    minutes: 4,
    watch: [],
    steps: [
      {
        id: 'apply',
        task: 'On HR → Leaves, click Apply leave. Choose an employee, a leave type, From and To dates and a reason, then Save.',
        expected: 'A new leave request for that employee with status Pending.',
        screen: 'hr/leaves',
        check: (_db, base) => {
          const s = hrState();
          if (!s) return noHR();
          const rows = newSince(s.leaves, base, 'LV');
          const good = rows.filter((r) => r.employee && r.from);
          if (good.length) {
            const r = good[good.length - 1];
            return pass(`${r.id}: ${r.employee}, ${r.type || 'leave'} from ${r.from}${r.to ? ' to ' + r.to : ''} — ${r.status}`);
          }
          if (rows.length) return notYet('A leave was saved without an employee or From date. Apply again and fill Employee and From.');
          return notYet();
        },
      },
      {
        id: 'approve',
        task: 'In the Action column of the request you just applied, click Approve.',
        expected: 'Your new leave request shows status Approved.',
        screen: 'hr/leaves',
        check: (_db, base) => {
          const s = hrState();
          if (!s) return noHR();
          const rows = newSince(s.leaves, base, 'LV').filter((r) => r.employee);
          const ok = rows.find((r) => r.status === 'Approved');
          if (ok) return pass(`${ok.id} for ${ok.employee} is Approved`);
          const rej = rows.find((r) => r.status === 'Rejected');
          if (rej) return notYet(`${rej.id} was Rejected. Apply a new leave and click Approve this time.`);
          return notYet(rows.length ? 'Your leave is still Pending' : 'Not done yet');
        },
      },
    ],
  },
  {
    id: 'ex.payroll.overtime-approve',
    title: 'Raise and approve overtime for payroll',
    module: 'payroll',
    roles: ['HR', 'AC', 'AD', 'SA'],
    summary: 'Record an overtime request and approve it so it is paid in the payroll run (hours × ₹250 added to Gross). HR screens keep demo data in this browser, not in the practice dataset.',
    minutes: 4,
    watch: [],
    workflow: true,
    steps: [
      {
        id: 'raise',
        task: 'On Payroll → Overtime Request, click New. Choose an employee, the date, the hours (for example 2.5) and the reason, then Save.',
        expected: 'A new Pending overtime row with hours above 0 and amount = hours × ₹250.',
        screen: 'payroll/overtime',
        check: (_db, base) => {
          const s = hrState();
          if (!s) return noHR();
          const rows = newSince(s.overtime, base);
          const good = rows.filter((r) => r.employee && Number(r.hours) > 0);
          if (good.length) {
            const r = good[good.length - 1];
            return pass(`${r.employee}: ${r.hours} h on ${r.date || 'no date'} = ₹${Number(r.hours) * 250} — ${r.status}`);
          }
          if (rows.length) return notYet('An overtime row was saved without an employee or with 0 hours. Create it again with both filled.');
          return notYet();
        },
      },
      {
        id: 'approve',
        task: 'Click Approve on the overtime row you created. Then open Payroll and check that the employee’s Gross includes it.',
        expected: 'Your new overtime row is Approved, so its hours × ₹250 are added to Gross on Payroll.',
        screen: 'payroll/overtime',
        check: (_db, base) => {
          const s = hrState();
          if (!s) return noHR();
          const ok = newSince(s.overtime, base).find((r) => r.employee && Number(r.hours) > 0 && r.status === 'Approved');
          return ok ? pass(`${ok.employee}: ${ok.hours} h Approved — ₹${Number(ok.hours) * 250} added to Gross on Payroll`) : notYet('Your overtime is still Pending');
        },
      },
    ],
  },
];

// ---------- workflows ----------
export const workflows: Workflow[] = [
  {
    id: 'wf.hr-payroll',
    title: 'HR to payroll (demo workflow)',
    module: 'payroll',
    roles: ['HR', 'AC', 'AD', 'SA'],
    summary: 'From an employee record to a monthly payroll sheet: organisation setup, employee, shift, attendance and leave, overtime, salary structure, payroll run, TDS, expenses and reports. This is a demo-oriented workflow for walkthroughs, not statutory payroll compliance.',
    steps: [
      { screen: 'hr/departments', title: 'Set up departments', does: 'Create departments and their heads. They feed the Department dropdown on Employees and Designations.' },
      { screen: 'hr/designations', title: 'Set up designations', does: 'Create job titles with department and level. Use the exact title on Employees so counts are right.' },
      { screen: 'hr/employees', title: 'Create the employee record', does: 'Add the employee with the correct full name, department, designation, branch, shift, PAN and status. The name links every later record.' },
      { screen: 'hr/shifts', title: 'Assign the shift', does: 'Set the default shift. It is saved immediately and shown on Employees and Attendance.' },
      { screen: 'hr/attendance', title: 'Review attendance', does: 'Check who is Present or On Leave. Times and KPIs are sample figures; attendance is not marked or fed to payroll.' },
      { screen: 'hr/leaves', title: 'Apply and decide leave', does: 'Apply leave and Approve or Reject it. Leave is not deducted from salary and does not change employee status.', lesson: 'ls.hr.demo-scope' },
      { screen: 'payroll/overtime', title: 'Approve overtime', does: 'Raise overtime and Approve it. Approved hours × ₹250 are added to Gross on Payroll.' },
      { screen: 'payroll/salary', title: 'Set the salary structure', does: 'Enter Basic, HRA and Allowance. New employees otherwise keep the default ₹28,000 / ₹11,200 / ₹5,000.', lesson: 'ls.payroll.salary-maths' },
      { screen: 'payroll/run', title: 'Review the payroll run', does: 'Check Gross, PF (12% of Basic), TDS (5% of Gross) and Net. Process payroll only marks rows Paid on screen; it is not saved.' },
      { screen: 'payroll/tds', title: 'Review TDS', does: 'Check PAN and the yearly TDS estimate. Confirm real tax with Accounts.' },
      { screen: 'payroll/expenses', title: 'Approve payroll expenses', does: 'Approve reimbursements, allowances, bonus and advances. These are paid separately and are not on the payroll sheet.' },
      { screen: 'payroll/reports', title: 'Management review', does: 'See the report list and live counts. View report and Export do not produce files yet.' },
    ],
    exercise: 'ex.payroll.overtime-approve',
    lesson: 'ls.hr.demo-scope',
    notes: [
      'HR and Payroll data is kept in each user’s browser (demo state), not in the shared ERP database, and practice mode does not change it.',
      'Records are linked by employee name. Renaming an employee breaks the link to their old leave and overtime.',
      'Not covered: statutory PF ceiling, ESI, Professional Tax, LWF, loss of pay, arrears, payslips, bank transfer files, Form 16 / 24Q and posting salaries to Finance.',
    ],
  },
];

// ---------- lessons ----------
export const lessons: Lesson[] = [
  {
    id: 'ls.hr.demo-scope',
    title: 'What the HR & Payroll module does today',
    module: 'hr',
    kind: 'concept',
    roles: ['HR', 'AC', 'AD', 'SA'],
    screens: ['hr/employees', 'hr/leaves', 'hr/attendance', 'payroll/run', 'payroll/reports'],
    summary: 'Where HR data is saved, how records are linked, and which actions are real versus display only.',
    sections: [
      {
        heading: 'Where the data lives',
        body: 'HR and Payroll screens save to this browser only. They do not use the shared ERP database, so other users and devices do not see your entries, and practice mode does not switch them.',
        bullets: [
          'Clearing browser data brings back the sample employees (EMP001–EMP006).',
          'HR → Employees is separate from Masters → Employees.',
        ],
      },
      {
        heading: 'Linked by name',
        body: 'Leave, overtime, expenses and appreciation store the employee name. Payroll adds overtime where the name matches exactly.',
        bullets: ['Type the full name correctly when adding an employee.', 'Avoid renaming employees who already have overtime or leave.'],
      },
      {
        heading: 'Real actions and display-only parts',
        body: 'Some actions save data, others only show what the finished module will look like.',
        bullets: [
          'Saved: employees, departments, designations, shifts, leave requests and decisions, holidays, appreciation, salary structures, overtime and payroll expenses with approval.',
          'Display only: attendance times and KPI cards, Process payroll (not stored), report View and Export buttons.',
          'Not supported: leave balances, unpaid-leave deduction, statutory payroll, payslips and bank files.',
        ],
      },
    ],
    audio: [
      'HR और Payroll का data अभी सिर्फ़ आपके browser में save होता है, company के shared database में नहीं।',
      'इसलिए आपकी entry दूसरे user या दूसरे computer पर नहीं दिखेगी।',
      'Leave, overtime और payroll, employee के नाम से जुड़ते हैं — नाम एक बार सही लिखिए।',
      'Attendance के time और Process payroll सिर्फ़ दिखाने के लिए हैं, असली salary payment Accounts से होता है।',
    ],
    minutes: 4,
    quiz: ['q.hr.data-location', 'q.hr.name-link', 'q.payroll.process-not-saved'],
  },
  {
    id: 'ls.payroll.salary-maths',
    title: 'How the ERP calculates salary',
    module: 'payroll',
    kind: 'concept',
    roles: ['HR', 'AC', 'AD', 'SA'],
    screens: ['payroll/salary', 'payroll/run', 'payroll/tds', 'payroll/overtime'],
    summary: 'The exact formulas behind Gross, PF, TDS and Net, with a worked example.',
    sections: [
      {
        heading: 'The formulas',
        body: 'Every payroll figure comes from four simple rules.',
        bullets: [
          'Gross = Basic + HRA + Allowance + approved overtime hours × ₹250 (overtime only on Payroll, not on Employee Salary or TDS).',
          'PF = 12% of Basic, with no wage ceiling.',
          'TDS = 5% of Gross.',
          'Net = Gross − PF − TDS.',
        ],
      },
      {
        heading: 'Worked example',
        body: 'Ravi Kumar: Basic ₹30,000, HRA ₹12,000, Allowance ₹6,000 and 3 approved overtime hours. Gross = ₹48,000 + ₹750 = ₹48,750. PF = ₹3,600. TDS = ₹2,438. Net = ₹42,712. On Employee Salary, without overtime, his Net is ₹42,000.',
      },
      {
        heading: 'What is not included',
        body: 'These are demo rules, not statutory payroll.',
        bullets: [
          'No ESI, Professional Tax, employer PF or loss of pay for unpaid leave.',
          'Approved payroll expenses (reimbursement, bonus, incentive, advance) are not added.',
          'TDS is not based on tax slabs; confirm real tax with Accounts.',
        ],
      },
    ],
    audio: [
      'Gross में Basic, HRA, Allowance और approved overtime के हर घंटे के ढाई सौ रुपये जुड़ते हैं।',
      'PF, Basic का बारह percent है, और TDS, Gross का पाँच percent।',
      'Net यानी Gross में से PF और TDS घटाइए।',
      'ESI, Professional Tax और unpaid leave की कटौती अभी इसमें नहीं है।',
    ],
    minutes: 4,
    quiz: ['q.payroll.salary-calc', 'q.payroll.ot-rate', 'q.payroll.tds-flat'],
  },
];
