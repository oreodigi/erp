import {
  LayoutDashboard, ClipboardList, CheckCircle2, CalendarRange, Boxes, PackagePlus, FileText, Truck, ClipboardCheck, Warehouse, PackageCheck, MapPinned, Inbox, Mail,
  Bus, Route, ScrollText, IdCard, Fuel, Receipt, Flag, Siren, TrainFront, Train, Activity, Container, FileBadge, IndianRupee, Wallet, HandCoins, BadgeCheck,
  FileSpreadsheet, BookOpen, Database, Wrench, ListChecks, Cog, Package, Store, ShoppingCart, Stamp, ArrowDownToLine, Repeat, Receipt as ReceiptIcon, Users,
  Building2, FileSignature, Table2, Files, LifeBuoy, Megaphone, BarChart3, Printer, Layers, Shield, KeyRound, Settings, Upload, Barcode, Eraser, Gauge, AlertTriangle, ShieldCheck, Scale, Hammer, Banknote, CircleDollarSign, Sparkles, Columns3, Home, Timer, MessageCircle, HelpCircle, Target
} from 'lucide-react';

export type NavItem = { key: string; label: string; icon: any; legacy?: string[]; badge?: string };
export type NavGroup = { key: string; label: string; icon: any; items: NavItem[] };

export const NAV: NavGroup[] = [
  { key: 'home', label: 'Home', icon: LayoutDashboard, items: [{ key: 'work', label: 'My Work', icon: ListChecks }, { key: 'board', label: 'Order Board', icon: Columns3 }, { key: 'help', label: 'Help & Training', icon: LifeBuoy }, { key: 'dashboard', label: 'Home', icon: LayoutDashboard, legacy: ['Dashboard/DashboardSA', 'DashboardAD', 'DashboardOP', 'DashboardCC', 'DashboardCO', 'DashboardAC', 'DashboardBU'] }] },
  { key: 'comms', label: 'Communication', icon: MessageCircle, items: [{ key: 'communication', label: 'Team Chat', icon: MessageCircle }, { key: 'communication/tasks', label: 'Assigned Tasks', icon: ListChecks }, { key: 'communication/enquiries', label: 'Enquiries', icon: HelpCircle }] },
  {
    key: 'ops', label: 'Operations', icon: ClipboardList, items: [
      { key: 'book', label: 'New Booking', icon: PackagePlus },
      { key: 'ops/orders', label: 'Orders', icon: ClipboardList, legacy: ['Transactions/InitiateOrder', 'Transactions/OrderList'] },
      { key: 'ops/order-confirmation', label: 'Order Confirmation', icon: CheckCircle2, legacy: ['Transactions/OrderConfirmation'] },
      { key: 'ops/vp-schedule', label: 'VP Scheduling', icon: CalendarRange, legacy: ['Transactions/VPSchedule'] },
      { key: 'ops/vp-planning', label: 'Vehicle Planning', icon: Layers, legacy: ['Transactions/VPPlanning'] },
      { key: 'ops/vp-loading', label: 'VP Loading', icon: Boxes, legacy: ['Transactions/VPLoading', 'Prints/VPLoadSummary'] },
      { key: 'ops/lr-new', label: 'Generate LR', icon: PackagePlus, legacy: ['Transactions/GenerateLR', 'GenerateDirectLR', 'GenerateTruckLR'] },
      { key: 'ops/lr', label: 'LR & Consignments', icon: FileText, legacy: ['Reports/LRDetails', 'Prints/LRPrint'] },
      { key: 'ops/dc', label: 'Delivery Challans', icon: Truck, legacy: ['Transactions/DeliveryChallan', 'CreateConnectedLDC', 'DeliveryChallanComments'] },
      { key: 'ops/ldc', label: 'LDC Acknowledgment', icon: ClipboardCheck, legacy: ['Transactions/DCAcknowledgment', 'DCAckCollection', 'DCAckClient'] },
      { key: 'ops/grn', label: 'GRN at Rail Head', icon: Warehouse, legacy: ['Transactions/GRN', 'Prints/GRNPrint'] },
      { key: 'ops/dgrn', label: 'DGRN at Branch', icon: PackageCheck, legacy: ['Transactions/DGRNDetail'] },
      { key: 'ops/delivery', label: 'Delivery', icon: MapPinned, legacy: ['Transactions/Delivered'] },
      { key: 'ops/pod', label: 'POD / Acknowledgment', icon: Inbox, legacy: ['Transactions/LRAcknowledgment', 'Prints/AcknowledgmentPrint'] },
      { key: 'ops/courier', label: 'Courier', icon: Mail, legacy: ['Transactions/CourierList', 'CourierDetail', 'CourierReceived'] },
    ],
  },
  {
    key: 'fleet', label: 'Road Fleet', icon: Bus, items: [
      { key: 'fleet/trucks', label: 'Fleet', icon: Truck, legacy: ['MasterPages/TruckList', 'TruckDetail', 'Dashboard/DashboardCO'] },
      { key: 'fleet/journeys', label: 'Truck Journeys', icon: MapPinned },
      { key: 'fleet/trips', label: 'Trips', icon: Route, legacy: ['Container/TripList', 'TripDetail', 'Prints/TripAdvance'] },
      { key: 'fleet/logslips', label: 'Log Slips', icon: ScrollText, legacy: ['Container/LogSlipGeneration', 'Prints/LogSlipPrint'] },
      { key: 'fleet/drivers', label: 'Drivers', icon: IdCard, legacy: ['MasterPages/DriverList', 'DriverDetail'] },
      { key: 'fleet/fuel', label: 'Fuel & Trip Expenses', icon: Fuel, legacy: ['Container/TripExpense', 'Prints/DieselExpenseSlip', 'MasterPages/PumpList'] },
      { key: 'fleet/expenses', label: 'Monthly Expenses', icon: Receipt, legacy: ['Container/MonthlyVariableExpensesList', 'MonthlyVariableExpensesDetail'] },
      { key: 'fleet/trip-completion', label: 'Trip Completion', icon: Flag, legacy: ['Container/TripCompletion'] },
      { key: 'fleet/accidents', label: 'Accidents', icon: Siren, legacy: ['Container/AccidentList', 'AccidentDetail'] },
    ],
  },
  {
    key: 'rail', label: 'Rail & Rake', icon: TrainFront, items: [
      { key: 'rail/rakes', label: 'Rake Planning', icon: TrainFront, legacy: ['Transactions/VPSchedule (board)'] },
      { key: 'rail/source', label: 'Rake at Rail Head', icon: Train, legacy: ['Transactions/RakeSource'] },
      { key: 'rail/destination', label: 'Rake at Branch', icon: Train, legacy: ['Transactions/RakeDestination'] },
      { key: 'rail/status', label: 'Rake Status', icon: Activity, legacy: ['Transactions/RakeStatus'] },
      { key: 'rail/dcwc', label: 'Demurrage & Wharfage', icon: Scale, legacy: ['Transactions/DCWCSource', 'DCWCDestination'] },
      { key: 'rail/wagons', label: 'Wagons', icon: Container, legacy: ['MasterPages/WagonList', 'WagonDetail'] },
      { key: 'rail/mrrr', label: 'MR / RR', icon: FileBadge, legacy: ['Transactions/MR_RR'] },
      { key: 'rail/freight', label: 'Railway Freight', icon: IndianRupee, legacy: ['MasterPages/RailwayFreight'] },
    ],
  },
  {
    key: 'wh', label: 'Warehouse', icon: Warehouse, items: [
      { key: 'wh/godowns', label: 'Godowns', icon: Warehouse, legacy: ['MasterPages/GodownList', 'GodownDetail'] },
      { key: 'wh/stock', label: 'Stock', icon: Package, legacy: ['Reports/GodownStock', 'GodownStockSummary'] },
      { key: 'wh/movement', label: 'Stock Movement', icon: Repeat, legacy: ['Reports/StockMove'] },
      { key: 'wh/verification', label: 'Loading Verification', icon: ListChecks, legacy: ['Reports/StockLoadingVerification'] },
      { key: 'wh/damage', label: 'Damage / Shortage', icon: AlertTriangle, legacy: ['Reports/DamageShortage'] },
      { key: 'wh/qc', label: 'Quality Control', icon: ShieldCheck, legacy: ['Reports/QualityControl'] },
    ],
  },
  {
    key: 'fin', label: 'Finance', icon: Wallet, items: [
      { key: 'fin/cash-plan', label: 'Cash Plan', icon: Wallet },
      { key: 'fin/billing', label: 'Customer Billing', icon: FileSpreadsheet, legacy: ['Accounts/LRToBillGeneration', 'LRToBillGeneration_V1', 'Prints/Bill*Print', 'Prints/Supplementary*'] },
      { key: 'fin/receivables', label: 'Receivables', icon: HandCoins, legacy: ['Reports/ClientOutstanding'] },
      { key: 'fin/client-payments', label: 'Client Payments', icon: CircleDollarSign, legacy: ['Accounts/ClientPaymentEntry'] },
      { key: 'fin/tp-slips', label: 'Transporter Payables', icon: Banknote, legacy: ['Accounts/GenerateTransporterPaymentSlip', 'Prints/TransporterPaySlip'] },
      { key: 'fin/tp-approval', label: 'Transporter Approval', icon: BadgeCheck, legacy: ['Accounts/TransporterPaymentApprove', 'TransporterPaymentEntry'] },
      { key: 'fin/dc-approval', label: 'DC Approval', icon: Stamp, legacy: ['Accounts/DCApproval'] },
      { key: 'fin/dc-payslip', label: 'DC Payment Slips', icon: Wallet, legacy: ['Accounts/DCPaymentSlip', 'DCPaymentEntry'] },
      { key: 'fin/hamali', label: 'Hamali Payments', icon: Hammer, legacy: ['Accounts/HamaliPaymentGRN', 'HamaliPaymentDGRN', 'HamaliPaymentVPLoading'] },
      { key: 'fin/ledger', label: 'Ledger', icon: BookOpen, legacy: ['Accounts/LedgerPaymentEntry', 'Reports/LedgerReport', 'LedgerAudit'] },
      { key: 'fin/freight-update', label: 'Update LR Freight', icon: IndianRupee, legacy: ['Accounts/UpdateLRFreight'] },
      { key: 'fin/tally', label: 'Tally Export', icon: Database, legacy: ['Accounts/TallyXML'] },
    ],
  },
  {
    key: 'ws', label: 'Workshop & Inventory', icon: Wrench, items: [
      { key: 'ws/checklist', label: 'Truck Checklist', icon: ListChecks, legacy: ['Inventory/TruckCheckList', 'Prints/MaintenancePrint'] },
      { key: 'ws/jobcards', label: 'Job Cards', icon: Wrench, legacy: ['Inventory/GenerateJobCard', 'Prints/JobCard', 'Prints/JCGatePass'] },
      { key: 'ws/jobcard-approval', label: 'Job Card Approval', icon: BadgeCheck, legacy: ['Inventory/JobCardApproval'] },
      { key: 'ws/stock', label: 'Spares Stock', icon: Package, legacy: ['Inventory/Dashboard', 'Dashboard/DashboardSI'] },
      { key: 'ws/spares', label: 'Spares & Services', icon: Cog, legacy: ['Inventory/SpareList', 'SpareDetail', 'CategoryList', 'CategoryDetail'] },
      { key: 'ws/suppliers', label: 'Suppliers', icon: Store, legacy: ['Inventory/SupplierList', 'SupplierDetail'] },
      { key: 'ws/po', label: 'Purchase Orders', icon: ShoppingCart, legacy: ['Inventory/GeneratePurchaseOrder', 'Prints/POPrint'] },
      { key: 'ws/po-approval', label: 'PO Approval', icon: Stamp, legacy: ['Inventory/PurchaseOrderApproval'] },
      { key: 'ws/inward', label: 'Stock Inward', icon: ArrowDownToLine, legacy: ['Inventory/InwardStock', 'InventoryPaymentEntry'] },
      { key: 'ws/replacement', label: 'Spare Replacement', icon: Repeat, legacy: ['Inventory/SpareReplacement', 'ReplacementInward', 'Prints/RPGatePass'] },
      { key: 'ws/service-bills', label: 'Service Bills', icon: ReceiptIcon, legacy: ['Inventory/GenerateServiceBill'] },
      { key: 'ws/service-payments', label: 'Service Payments', icon: Banknote, legacy: ['Inventory/ServicePaymentEntry'] },
    ],
  },
  {
    key: 'cust', label: 'Customers', icon: Users, items: [
      { key: 'cust/360', label: 'Customer 360', icon: Building2, legacy: ['MasterPages/CustomerList', 'CustomerDetail', 'CustomerUpload'] },
      { key: 'cust/agreements', label: 'Agreements', icon: FileSignature, legacy: ['MasterPages/AgreementList', 'AgreementDetail'] },
      { key: 'cust/rate-contracts', label: 'Rate Contracts', icon: Table2, legacy: ['MasterPages/RateContract', 'OwnVehicleRateContract', 'Reports/RateMatrix', 'ClientRateMatrix'] },
      { key: 'cust/transporter-rates', label: 'Transporter Rate Matrix', icon: Table2, legacy: ['MasterPages/TransporterRateMatrix'] },
      { key: 'cust/hamali-rates', label: 'Hamali Rates', icon: Hammer, legacy: ['MasterPages/HamaliList', 'HamaliDetail'] },
      { key: 'cust/documents', label: 'Documents', icon: Files, legacy: ['MasterPages/DocumentList', 'DocumentDetail'] },
      { key: 'cust/support', label: 'Complaints & Support', icon: LifeBuoy, legacy: ['Support/CustomerComplaint'] },
    ],
  },
  { key: 'marketing', label: 'Marketing & CRM', icon: Megaphone, items: [
    { key: 'marketing/dashboard', label: 'Marketing Dashboard', icon: BarChart3 },
    { key: 'marketing/leads', label: 'All Leads', icon: Users },
    { key: 'marketing/lead-pipeline', label: 'Lead Pipeline', icon: Columns3 },
    { key: 'marketing/followups', label: 'Follow-ups & Activities', icon: CalendarRange },
    { key: 'marketing/campaigns', label: 'Campaigns', icon: Megaphone },
    { key: 'marketing/deals', label: 'Deals', icon: HandCoins },
    { key: 'marketing/deal-pipeline', label: 'Deal Pipeline', icon: Columns3 },
    { key: 'marketing/quotations', label: 'Quotations', icon: FileText },
    { key: 'marketing/handoff', label: 'Won Deal Handoff', icon: CheckCircle2 },
    { key: 'marketing/targets', label: 'Sales Targets', icon: Target },
    { key: 'marketing/performance', label: 'Sales Performance', icon: Activity },
    { key: 'marketing/reports', label: 'CRM Reports', icon: BarChart3 },
  ] },
  { key: 'hr', label: 'HR', icon: Users, items: [
    { key: 'hr/employees', label: 'Employees', icon: Users },
    { key: 'hr/leaves', label: 'Leaves', icon: CalendarRange },
    { key: 'hr/shifts', label: 'Shift Roster', icon: Timer },
    { key: 'hr/attendance', label: 'Attendance', icon: CheckCircle2 },
    { key: 'hr/holidays', label: 'Holidays', icon: CalendarRange },
    { key: 'hr/designations', label: 'Designations', icon: IdCard },
    { key: 'hr/departments', label: 'Departments', icon: Building2 },
    { key: 'hr/appreciation', label: 'Appreciation', icon: Sparkles },
  ] },
  { key: 'payroll', label: 'Payroll', icon: IndianRupee, items: [
    { key: 'payroll/run', label: 'Payroll', icon: Wallet },
    { key: 'payroll/salary', label: 'Employee Salary', icon: Banknote },
    { key: 'payroll/tds', label: 'TDS', icon: FileSpreadsheet },
    { key: 'payroll/expenses', label: 'Payroll Expenses', icon: Receipt },
    { key: 'payroll/overtime', label: 'Overtime Request', icon: Timer },
    { key: 'payroll/reports', label: 'Reports', icon: BarChart3 },
  ] },
  { key: 'reports', label: 'Reports & MIS', icon: BarChart3, items: [{ key: 'reports', label: 'Reports & MIS', icon: BarChart3, legacy: ['Reports/* (42)'] }, { key: 'prints', label: 'Print Formats', icon: Printer, legacy: ['Prints/* (33)'] }] },
  { key: 'masters', label: 'Masters', icon: Database, items: [{ key: 'masters', label: 'Masters', icon: Database, legacy: ['MasterPages/* (58)'] }] },
  {
    key: 'access', label: 'Users & Access', icon: Shield, items: [
      { key: 'access/users', label: 'Users', icon: Users, legacy: ['MasterPages/UserList', 'UserDetail', 'UserPerRoleList', 'Admin/ResetPassword'] },
      { key: 'access/roles', label: 'Roles & Permissions', icon: Shield, legacy: ['MasterPages/RoleList', 'RoleDetail', 'Admin/MenuPerUser'] },
      { key: 'access/password', label: 'Change Password', icon: KeyRound, legacy: ['Admin/ChangePassword'] },
    ],
  },
  { key: 'superadmin', label: 'Super Admin', icon: ShieldCheck, items: [{ key: 'access/credentials', label: 'Credential Administration', icon: KeyRound }] },
  { key: 'comms-admin', label: 'Communication Admin', icon: ShieldCheck, items: [{ key: 'communication/audit', label: 'Communication Oversight', icon: ShieldCheck }] },
  {
    key: 'admin', label: 'Administration', icon: Settings, items: [
      { key: 'admin/corrections', label: 'Data Corrections', icon: Eraser, legacy: ['Admin/DeleteLR', 'DeleteBill', 'DeleteBillLR', 'DeleteLedgerEntry', 'DeletePaymentReceivableEntry', 'OpenLogslip', 'UpdateLR', 'UpdateTruckLR', 'UpdateTrip'] },
      { key: 'admin/announcements', label: 'Announcements', icon: Megaphone, legacy: ['Admin/Announcements', 'Announcement-Customer'] },
      { key: 'admin/import', label: 'Excel Import', icon: Upload, legacy: ['MasterPages/ExcelUploadData', 'CustomerUpload', 'ImportExcel/'] },
      { key: 'admin/barcode', label: 'LR Barcodes', icon: Barcode, legacy: ['GenerateBarcode/GenerateLRBarcode'] },
      { key: 'admin/time-limits', label: 'Stage Time Limits', icon: Timer },
      { key: 'admin/settings', label: 'System Settings', icon: Gauge, legacy: ['Web.config', 'Schedule/GRNMail'] },
      { key: 'admin/legacy-map', label: 'Developer Reference', icon: Sparkles, legacy: [] },
    ],
  },
];

export const ALL_ITEMS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.key, groupLabel: g.label })));
export const findItem = (key: string) => ALL_ITEMS.find((i) => i.key === key || key.startsWith(i.key + '/'));

// Role → module groups (from legacy role dashboards + MenuPerRole)
export const ROLE_GROUPS: Record<string, string[]> = {
  SA: NAV.map((g) => g.key),
  AD: ['home', 'comms', 'comms-admin', 'ops', 'fleet', 'rail', 'wh', 'cust', 'marketing', 'hr', 'payroll', 'reports', 'masters', 'access', 'admin'],
  OP: ['home', 'comms', 'ops', 'fleet', 'rail', 'wh', 'cust', 'reports'],
  BU: ['home', 'comms', 'ops', 'rail', 'wh', 'reports'],
  AC: ['home', 'comms', 'fin', 'cust', 'payroll', 'reports'],
  CC: ['home', 'comms', 'ops', 'cust', 'marketing', 'reports'],
  CO: ['home', 'comms', 'fleet', 'ws', 'reports'],
  SI: ['home', 'comms', 'ws', 'reports'],
  HR: ['home', 'comms', 'hr', 'payroll', 'masters', 'access'],
};


// Simple menu: plain-language labels, everyday screens only. "Show all screens" switches to the full NAV.
export type SimpleGroup = { key: string; label: string; icon: any; items: { key: string; label: string; hint?: string }[] };
export const SIMPLE_NAV: SimpleGroup[] = [
  { key: 's-home', label: 'Home', icon: Home, items: [{ key: 'dashboard', label: 'Home' }] },
  { key: 's-work', label: 'My Work', icon: ListChecks, items: [{ key: 'work', label: 'My Work' }] },
  { key: 's-board', label: 'Order Board', icon: Columns3, items: [{ key: 'board', label: 'Order Board' }] },
  { key: 's-book', label: 'Bookings', icon: PackagePlus, items: [
    { key: 'book', label: 'New booking', hint: 'Book a truck or rail load in 3 short steps' },
    { key: 'ops/lr', label: 'All LRs' }, { key: 'ops/orders', label: 'Customer orders' }, { key: 'ops/pod', label: 'POD received' }] },
  { key: 's-rail', label: 'Rail', icon: TrainFront, items: [{ key: 'rail/rakes', label: 'Rakes' }, { key: 'ops/grn', label: 'Goods in at rail head' }, { key: 'ops/dc', label: 'Delivery challans' }] },
  { key: 's-fleet', label: 'Trucks', icon: Truck, items: [{ key: 'fleet/trucks', label: 'Our trucks' }, { key: 'fleet/journeys', label: 'Truck journeys', hint: 'Where each truck went, loaded or empty, and its profit' }, { key: 'fleet/trips', label: 'Trips' }, { key: 'fleet/fuel', label: 'Diesel & expenses' }, { key: 'fleet/drivers', label: 'Drivers' }] },
  { key: 's-money', label: 'Money', icon: IndianRupee, items: [{ key: 'fin/cash-plan', label: 'Cash plan', hint: 'Money in and out for the coming weeks' }, { key: 'fin/billing', label: 'Make bills' }, { key: 'fin/receivables', label: 'Payments to collect' }, { key: 'fin/tp-slips', label: 'Pay transporters' }, { key: 'fin/ledger', label: 'Ledger' }, { key: 'fin/tally', label: 'Send to Tally' }] },
  { key: 's-ws', label: 'Workshop', icon: Wrench, items: [{ key: 'ws/jobcards', label: 'Job cards' }, { key: 'ws/po', label: 'Buy spares' }, { key: 'ws/stock', label: 'Spares stock' }] },
  { key: 's-cust', label: 'Customers', icon: Users, items: [{ key: 'cust/360', label: 'Customers' }] },
  { key: 's-rep', label: 'Reports', icon: BarChart3, items: [{ key: 'reports', label: 'Reports' }] },
  { key: 's-set', label: 'Settings', icon: Settings, items: [{ key: 'masters', label: 'Master lists' }, { key: 'access/users', label: 'Users' }, { key: 'admin/time-limits', label: 'Stage time limits' }, { key: 'admin/settings', label: 'System settings' }] },
];
export const OPEN_ROUTES = ['dashboard', 'work', 'board', 'help'];

// New screens inherit access from an existing screen of the same module (role menus are stored with the data).
export const ROUTE_ALIAS: Record<string, string> = { 'fleet/journeys': 'fleet/trips', 'fin/cash-plan': 'fin/receivables', 'admin/time-limits': 'admin/settings' };
