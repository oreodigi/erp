import React, { lazy } from 'react';
const CommandCenter = lazy(() => import('./features/dashboard'));
const Home = lazy(() => import('./features/home'));
import { MyWork } from './features/work';
import { OrderBoard } from './features/board';
import { QuickBooking } from './features/book';
import { HelpCenter } from './features/guide';
import { Journeys } from './features/journeys';
import { CashPlan } from './features/cashplan';
import { TimeLimits } from './features/timelimits';
import { Orders, OrderConfirmation } from './features/ops-orders';
import { GenerateLR, LRRegister } from './features/ops-lr';
import { VPSchedule, VPPlanning, VPLoading, GRNPage, DGRNPage, MRRRPage, RakeEvents, RakeStatusPage, DCWCPage, RakeBoard } from './features/ops-rail';
import { DeliveryChallans, LDCAck, Delivery, POD, Courier } from './features/ops-delivery';
import { Trucks, Drivers, Trips, TripCompletion, LogSlips, FuelExpenses, MonthlyExpenses, Accidents } from './features/fleet';
import { Godowns, Stock, StockMovement, LoadingVerification, DamageShortage, QualityControl } from './features/warehouse';
import { Billing, Receivables, ClientPayments, TPSlips, TPApproval, DCApproval, DCPayslips, Hamali, Ledger, FreightUpdate, Tally } from './features/finance';
import { TruckChecklist, JobCards, JobCardApproval, SparesStock, SparesMaster, Suppliers, PurchaseOrders, POApproval, Inward, Replacement, ServiceBills, ServicePayments } from './features/workshop';
import { Customer360, Agreements, RateContracts, TransporterRates, HamaliRates, Documents, Support } from './features/customers';
import { ReportsHub } from './features/reports';
import { MastersHub, CrudPage, DEFS } from './features/masters';
import { Users, Roles, ChangePassword, CredentialAdministration, Corrections, Announcements, ExcelImport, LRBarcodes, Settings, PrintGallery, LegacyMap } from './features/admin';
import { Communication, CommunicationTasks, CommunicationEnquiries, CommunicationAudit } from './features/communication';

export const PAGES: Record<string, React.ComponentType> = {
  dashboard: Home,
  'dashboard/classic': CommandCenter,
  work: MyWork,
  board: OrderBoard,
  book: QuickBooking,
  help: HelpCenter,
  'ops/orders': Orders, 'ops/order-confirmation': OrderConfirmation, 'ops/vp-schedule': VPSchedule, 'ops/vp-planning': VPPlanning, 'ops/vp-loading': VPLoading,
  'ops/lr-new': GenerateLR, 'ops/lr': LRRegister, 'ops/dc': DeliveryChallans, 'ops/ldc': LDCAck, 'ops/grn': GRNPage, 'ops/dgrn': DGRNPage, 'ops/delivery': Delivery, 'ops/pod': POD, 'ops/courier': Courier,
  'fleet/trucks': Trucks, 'fleet/journeys': Journeys, 'fleet/trips': Trips, 'fleet/logslips': LogSlips, 'fleet/drivers': Drivers, 'fleet/fuel': FuelExpenses, 'fleet/expenses': MonthlyExpenses, 'fleet/trip-completion': TripCompletion, 'fleet/accidents': Accidents,
  'rail/rakes': RakeBoard, 'rail/source': () => <RakeEvents side="src" />, 'rail/destination': () => <RakeEvents side="dst" />, 'rail/status': RakeStatusPage, 'rail/dcwc': DCWCPage,
  'rail/wagons': () => <CrudPage def={DEFS.wagon} />, 'rail/mrrr': MRRRPage, 'rail/freight': () => <CrudPage def={DEFS.railfreight} />,
  'wh/godowns': Godowns, 'wh/stock': Stock, 'wh/movement': StockMovement, 'wh/verification': LoadingVerification, 'wh/damage': DamageShortage, 'wh/qc': QualityControl,
  'fin/cash-plan': CashPlan, 'fin/billing': Billing, 'fin/receivables': Receivables, 'fin/client-payments': ClientPayments, 'fin/tp-slips': TPSlips, 'fin/tp-approval': TPApproval, 'fin/dc-approval': DCApproval, 'fin/dc-payslip': DCPayslips, 'fin/hamali': Hamali, 'fin/ledger': Ledger, 'fin/freight-update': FreightUpdate, 'fin/tally': Tally,
  'ws/checklist': TruckChecklist, 'ws/jobcards': JobCards, 'ws/jobcard-approval': JobCardApproval, 'ws/stock': SparesStock, 'ws/spares': SparesMaster, 'ws/suppliers': Suppliers, 'ws/po': PurchaseOrders, 'ws/po-approval': POApproval, 'ws/inward': Inward, 'ws/replacement': Replacement, 'ws/service-bills': ServiceBills, 'ws/service-payments': ServicePayments,
  'cust/360': Customer360, 'cust/agreements': Agreements, 'cust/rate-contracts': RateContracts, 'cust/transporter-rates': TransporterRates, 'cust/hamali-rates': HamaliRates, 'cust/documents': Documents, 'cust/support': Support,
  reports: ReportsHub, prints: PrintGallery, masters: MastersHub,
  'access/users': Users, 'access/roles': Roles, 'access/password': ChangePassword,
  'access/credentials': CredentialAdministration,
  communication: Communication, 'communication/tasks': CommunicationTasks, 'communication/enquiries': CommunicationEnquiries, 'communication/audit': CommunicationAudit,
  'admin/corrections': Corrections, 'admin/announcements': Announcements, 'admin/import': ExcelImport, 'admin/barcode': LRBarcodes, 'admin/settings': Settings, 'admin/time-limits': TimeLimits, 'admin/legacy-map': LegacyMap,
};
