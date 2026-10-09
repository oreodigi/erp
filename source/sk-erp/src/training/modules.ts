// Training module catalogue: display names, icons and order. Module IDs match ScreenTraining.module.
import type { ModuleId } from './types';

export type ModuleMeta = { id: ModuleId; title: string; summary: string; icon: string; order: number };

export const MODULES: ModuleMeta[] = [
  { id: 'home', title: 'Home, My Work & Order Board', summary: 'Your daily start: today’s numbers, your task list and where every consignment is stuck.', icon: 'Home', order: 1 },
  { id: 'ops', title: 'Road Operations', summary: 'Orders, bookings, LRs, dispatch, delivery and POD.', icon: 'ClipboardList', order: 2 },
  { id: 'smartload', title: 'Smart Load Planning', summary: 'Cargo and vehicle geometry, optimisation, approval and physical loading.', icon: 'Boxes', order: 3 },
  { id: 'rail', title: 'Rail & Rake', summary: 'GRN at the rail head, wagon loading, rake movement, DGRN and delivery challans.', icon: 'TrainFront', order: 4 },
  { id: 'wh', title: 'Warehouse', summary: 'Godowns, stock, movement, loading verification, damage and quality checks.', icon: 'Warehouse', order: 5 },
  { id: 'fleet', title: 'Road Fleet', summary: 'Trucks, drivers, trips, journeys, diesel, expenses and trip completion.', icon: 'Truck', order: 6 },
  { id: 'fin', title: 'Finance', summary: 'Billing, receivables, payments, detention, transporter payables, ledger and Tally.', icon: 'IndianRupee', order: 7 },
  { id: 'ws', title: 'Workshop & Inventory', summary: 'Job cards, spares, purchase orders, inward, replacement and service bills.', icon: 'Wrench', order: 8 },
  { id: 'cust', title: 'Customers & Contracts', summary: 'Customer 360, agreements, rate contracts, transporter and hamali rates, support.', icon: 'Users', order: 9 },
  { id: 'crm', title: 'Marketing & CRM', summary: 'Leads, follow-ups, deals, quotations, targets and the hand-off to operations.', icon: 'Megaphone', order: 10 },
  { id: 'hr', title: 'HR', summary: 'Employees, leave, shifts, attendance, holidays and appreciation.', icon: 'IdCard', order: 11 },
  { id: 'payroll', title: 'Payroll', summary: 'Payroll run, salary structures, TDS, expenses, overtime and payroll reports.', icon: 'Wallet', order: 12 },
  { id: 'comms', title: 'Communication', summary: 'Chats, ERP-linked conversations, enquiries, tasks and oversight.', icon: 'MessageSquare', order: 13 },
  { id: 'reports', title: 'Reports & Prints', summary: 'Ready reports, exports and print formats.', icon: 'BarChart3', order: 14 },
  { id: 'masters', title: 'Master Lists', summary: 'Customers, cities, goods, trucks and the other lists every screen uses.', icon: 'Database', order: 15 },
  { id: 'access', title: 'Users & Access', summary: 'Logins, roles, permissions and passwords.', icon: 'Shield', order: 16 },
  { id: 'admin', title: 'Administration', summary: 'Settings, time limits, corrections, announcements, imports and training oversight.', icon: 'Settings', order: 17 },
];
export const MODULE_BY_ID = new Map(MODULES.map((m) => [m.id, m]));
export const moduleTitle = (id: string) => MODULE_BY_ID.get(id as ModuleId)?.title || id;

/** Role names as employees see them (codes from nav.ts ROLE_GROUPS). */
export const ROLE_LABEL: Record<string, string> = {
  SA: 'Super Admin', AD: 'Admin / Manager', OP: 'Operations', BU: 'Branch User', AC: 'Accounts', CC: 'Customer Care', CO: 'Fleet', SI: 'Workshop & Stores', HR: 'HR',
};
export const MANAGER_ROLES = new Set(['SA', 'AD']);
