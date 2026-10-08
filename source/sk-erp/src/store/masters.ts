// Master data seeded from the legacy LGST_* schema (fields kept 1:1 with the EDMX model where relevant).
export const CITIES: { id: string; name: string; state: string; lat: number; lng: number }[] = [
  ['jalgaon', 'Jalgaon', 'Maharashtra', 21.0, 75.56], ['mumbai', 'Mumbai', 'Maharashtra', 19.07, 72.88], ['pune', 'Pune', 'Maharashtra', 18.52, 73.86],
  ['nashik', 'Nashik', 'Maharashtra', 20.0, 73.79], ['kolkata', 'Kolkata', 'West Bengal', 22.57, 88.36], ['guwahati', 'Guwahati', 'Assam', 26.14, 91.74],
  ['pondicherry', 'Pondicherry', 'Puducherry', 11.94, 79.81], ['bhusawal', 'Bhusawal', 'Maharashtra', 21.05, 75.78], ['aurangabad', 'Aurangabad', 'Maharashtra', 19.88, 75.34],
  ['nagpur', 'Nagpur', 'Maharashtra', 21.15, 79.09], ['indore', 'Indore', 'Madhya Pradesh', 22.72, 75.86], ['surat', 'Surat', 'Gujarat', 21.17, 72.83],
  ['ahmedabad', 'Ahmedabad', 'Gujarat', 23.02, 72.57], ['hyderabad', 'Hyderabad', 'Telangana', 17.39, 78.49], ['bengaluru', 'Bengaluru', 'Karnataka', 12.97, 77.59],
  ['chennai', 'Chennai', 'Tamil Nadu', 13.08, 80.27], ['siliguri', 'Siliguri', 'West Bengal', 26.73, 88.4], ['dibrugarh', 'Dibrugarh', 'Assam', 27.47, 94.91],
  ['shillong', 'Shillong', 'Meghalaya', 25.58, 91.89], ['agartala', 'Agartala', 'Tripura', 23.83, 91.29], ['patna', 'Patna', 'Bihar', 25.59, 85.14],
  ['raipur', 'Raipur', 'Chhattisgarh', 21.25, 81.63], ['dhule', 'Dhule', 'Maharashtra', 20.9, 74.77], ['delhi', 'New Delhi', 'Delhi', 28.61, 77.21],
].map(([id, name, state, lat, lng]: any) => ({ id, name, state, lat, lng }));

export const STATES = [...new Set(CITIES.map((c) => c.state))].map((s, i) => ({ id: 'st' + i, name: s, country: 'India', description: '' }));
export const COUNTRIES = [{ id: 'in', name: 'India', description: 'Republic of India', lrBookingAllowed: true }, { id: 'np', name: 'Nepal', description: 'Cross-border via Raxaul', lrBookingAllowed: false }, { id: 'bt', name: 'Bhutan', description: 'Via Jaigaon', lrBookingAllowed: false }];

export const COMPANY = { id: 'skt', name: 'S.K. Translines Pvt. Ltd.', city: 'jalgaon', state: 'Maharashtra', country: 'India', address: 'S K Tower, Ground Floor, A-52, Old M.I.D.C, Ayodhya Nagar Road, Jalgaon 425003', phone: '(0257) 2270651, 2270010', estd: 1994, pan: 'AAICS5895G', tan: 'NSKS08127C', gst: '27AAICS5895G1ZR', email: 'customercare@sktrancelines.com', code: 'JGS - 1782' };

export const BRANCHES = [
  { id: 'JL', code: 'JLG-HO', short: 'JL', name: 'Jalgaon (Head Office)', city: 'jalgaon', contact: 'Prakash Wagh', phone: '0257-2270651', email: 'jalgaon@sktranslines.in', gst: '27AAICS5895G1ZR', isRailHead: true, allowLR: true, weeklyOff: 'Sunday', hours: '09:00–19:00', receipt: 'Cheque Receipt', godown: 'gd1', address: 'A-52, Old MIDC, Ayodhya Nagar Road, Jalgaon' },
  { id: 'MB', code: 'MUM-01', short: 'MB', name: 'Mumbai', city: 'mumbai', contact: 'Sachin Kadam', phone: '022-28503311', email: 'mumbai@sktranslines.in', gst: '27AAICS5895G2ZQ', isRailHead: false, allowLR: true, weeklyOff: 'Sunday', hours: '09:30–19:30', receipt: 'Cheque Receipt', godown: 'gd3', address: 'Gala 14, Bhiwandi Logistics Park, Bhiwandi' },
  { id: 'PN', code: 'PUN-01', short: 'PN', name: 'Pune', city: 'pune', contact: 'Amol Deshmukh', phone: '020-27120455', email: 'pune@sktranslines.in', gst: '27AAICS5895G3ZP', isRailHead: false, allowLR: true, weeklyOff: 'Sunday', hours: '09:30–19:00', receipt: 'Cash Receipts', godown: 'gd4', address: 'Plot 22, Chakan MIDC Phase II, Pune' },
  { id: 'NS', code: 'NSK-01', short: 'NS', name: 'Nashik', city: 'nashik', contact: 'Yogesh Bhamre', phone: '0253-2382214', email: 'nashik@sktranslines.in', gst: '27AAICS5895G4ZO', isRailHead: false, allowLR: true, weeklyOff: 'Sunday', hours: '09:30–19:00', receipt: 'Cash Receipts', godown: '', address: 'Ambad MIDC, Nashik' },
  { id: 'KL', code: 'KOL-01', short: 'KL', name: 'Kolkata', city: 'kolkata', contact: 'Subhajit Ghosh', phone: '033-26411209', email: 'kolkata@sktranslines.in', gst: '19AAICS5895G1ZT', isRailHead: true, allowLR: true, weeklyOff: 'Sunday', hours: '10:00–19:00', receipt: 'Cheque Receipt', godown: 'gd5', address: 'Shalimar Goods Shed Road, Howrah' },
  { id: 'GH', code: 'GHY-01', short: 'GH', name: 'Guwahati', city: 'guwahati', contact: 'Bhaskar Kalita', phone: '0361-2680117', email: 'guwahati@sktranslines.in', gst: '18AAICS5895G1ZV', isRailHead: true, allowLR: true, weeklyOff: 'Sunday', hours: '09:00–18:30', receipt: 'Cheque Receipt', godown: 'gd2', address: 'Amingaon Goods Shed, North Guwahati' },
  { id: 'PY', code: 'PDY-01', short: 'PY', name: 'Pondicherry', city: 'pondicherry', contact: 'R. Senthil Kumar', phone: '0413-2271880', email: 'pondy@sktranslines.in', gst: '34AAICS5895G1ZN', isRailHead: false, allowLR: true, weeklyOff: 'Sunday', hours: '09:30–18:30', receipt: 'Cash Receipts', godown: '', address: 'Mettupalayam Industrial Estate, Puducherry' },
];

export const GODOWNS = [
  { id: 'gd1', name: 'Jalgaon Rail Head Godown', type: 'Owned', address: 'Near Goods Shed, Jalgaon', city: 'jalgaon', branchId: 'JL', contact: 'Prakash Wagh', phone: '9422771120', rent: 0, deposit: 0, agreementDate: '2016-04-01', expiry: '2031-03-31', length: 120, breadth: 60, width: 60, capacity: 4200, gateNo: 15 },
  { id: 'gd2', name: 'Amingaon Transit Warehouse', type: 'Leased', address: 'Amingaon, North Guwahati', city: 'guwahati', branchId: 'GH', contact: 'Bhaskar Kalita', phone: '9864012233', rent: 185000, deposit: 600000, agreementDate: '2023-07-01', expiry: '2028-06-30', length: 90, breadth: 45, width: 45, capacity: 2600, gateNo: 6 },
  { id: 'gd3', name: 'Bhiwandi Cross-dock', type: 'Leased', address: 'Bhiwandi Logistics Park', city: 'mumbai', branchId: 'MB', contact: 'Sachin Kadam', phone: '9820455102', rent: 240000, deposit: 900000, agreementDate: '2024-01-01', expiry: '2027-12-31', length: 70, breadth: 40, width: 40, capacity: 1800, gateNo: 4 },
  { id: 'gd4', name: 'Chakan Depot', type: 'Leased', address: 'Chakan MIDC Ph II', city: 'pune', branchId: 'PN', contact: 'Amol Deshmukh', phone: '9850221147', rent: 120000, deposit: 360000, agreementDate: '2022-10-01', expiry: '2027-09-30', length: 50, breadth: 30, width: 30, capacity: 900, gateNo: 3 },
  { id: 'gd5', name: 'Shalimar Rail Godown', type: 'Leased', address: 'Shalimar, Howrah', city: 'kolkata', branchId: 'KL', contact: 'Subhajit Ghosh', phone: '9830077214', rent: 160000, deposit: 480000, agreementDate: '2023-03-01', expiry: '2028-02-28', length: 80, breadth: 40, width: 40, capacity: 2100, gateNo: 5 },
];

export const UNITS = [
  { id: 'u1', name: 'Nos', description: 'Numbers / pieces', slab: false }, { id: 'u2', name: 'Cartons', description: 'Packed cartons', slab: false },
  { id: 'u3', name: 'MT', description: 'Metric tonne', slab: true }, { id: 'u4', name: 'Kg', description: 'Kilogram', slab: true },
  { id: 'u5', name: 'Bags', description: '50 kg bags', slab: false }, { id: 'u6', name: 'Bales', description: 'Cotton bales (170 kg)', slab: false },
  { id: 'u7', name: 'Truck', description: 'Full truck load', slab: false }, { id: 'u8', name: 'Ltr', description: 'Litre', slab: false },
];

// Dimensions in cm, weight in kg (used by VP load optimisation)
export const GOODS = [
  { id: 'g1', name: 'Refrigerator 190L', description: 'Single-door refrigerator, packed', weight: 38, unit: 'u2', length: 62, width: 66, height: 128, category: 'Consumer Durable', storagePosition: 'Upright', layer: 2, stacking: true },
  { id: 'g2', name: 'Refrigerator 260L FF', description: 'Frost-free double door', weight: 54, unit: 'u2', length: 64, width: 70, height: 165, category: 'Consumer Durable', storagePosition: 'Upright', layer: 1, stacking: false },
  { id: 'g3', name: 'Washing Machine 7kg', description: 'Top-load, packed', weight: 32, unit: 'u2', length: 58, width: 60, height: 96, category: 'Consumer Durable', storagePosition: 'Upright', layer: 2, stacking: true },
  { id: 'g4', name: 'Split AC Indoor Unit', description: '1.5 TR indoor', weight: 12, unit: 'u2', length: 105, width: 30, height: 38, category: 'Consumer Durable', storagePosition: 'Any', layer: 5, stacking: true },
  { id: 'g5', name: 'Split AC Outdoor Unit', description: '1.5 TR outdoor', weight: 34, unit: 'u2', length: 92, width: 40, height: 66, category: 'Consumer Durable', storagePosition: 'Upright', layer: 3, stacking: true },
  { id: 'g6', name: 'LED TV 43"', description: 'Panel in carton', weight: 11, unit: 'u2', length: 106, width: 14, height: 68, category: 'Electronics', storagePosition: 'Upright', layer: 4, stacking: true },
  { id: 'g7', name: 'Microwave Oven 25L', description: 'Convection', weight: 16, unit: 'u2', length: 56, width: 46, height: 36, category: 'Electronics', storagePosition: 'Any', layer: 6, stacking: true },
  { id: 'g8', name: 'Luggage Trolley Set (3 pc)', description: 'Hard-shell set', weight: 14, unit: 'u2', length: 80, width: 55, height: 34, category: 'Lifestyle', storagePosition: 'Any', layer: 6, stacking: true },
  { id: 'g9', name: 'PVC Pipes 110mm (bundle)', description: '6 m lengths, bundle of 10', weight: 62, unit: 'u1', length: 600, width: 40, height: 25, category: 'Building Material', storagePosition: 'Flat', layer: 6, stacking: true },
  { id: 'g10', name: 'Banana Cartons (13 kg)', description: 'Fresh G9 bananas', weight: 13.5, unit: 'u2', length: 50, width: 34, height: 24, category: 'Perishable', storagePosition: 'Upright', layer: 8, stacking: true },
  { id: 'g11', name: 'Cotton Bales', description: 'Pressed bales 170 kg', weight: 170, unit: 'u6', length: 140, width: 55, height: 70, category: 'Agri', storagePosition: 'Flat', layer: 3, stacking: true },
  { id: 'g12', name: 'Edible Oil Tins 15L', description: 'Refined soyabean', weight: 15.5, unit: 'u2', length: 24, width: 24, height: 36, category: 'FMCG', storagePosition: 'Upright', layer: 5, stacking: true },
  { id: 'g13', name: 'Cement Bags (50 kg)', description: 'OPC 53 grade', weight: 50, unit: 'u5', length: 70, width: 45, height: 12, category: 'Building Material', storagePosition: 'Flat', layer: 10, stacking: true },
  { id: 'g14', name: 'MS Steel Tubes (bundle)', description: 'ERW tubes, 6 m', weight: 950, unit: 'u1', length: 600, width: 50, height: 40, category: 'Steel', storagePosition: 'Flat', layer: 2, stacking: true },
];

export const WAGONS = [
  { id: 'w1', name: 'VPU', type: 'Parcel Van', description: 'Parcel van, 23 t, CR fleet', height: 290, width: 300, length: 2200, weight: 23000 },
  { id: 'w2', name: 'VPH', type: 'High Capacity Parcel Van', description: 'HCPV 24 t, RDSO design', height: 300, width: 310, length: 2300, weight: 24000 },
  { id: 'w3', name: 'BCN', type: 'Covered Wagon', description: 'Bogie covered, 58 t', height: 300, width: 290, length: 1470, weight: 58000 },
  { id: 'w4', name: 'NMG', type: 'Auto Carrier', description: 'Modified coach for vehicles', height: 280, width: 300, length: 2100, weight: 20000 },
  { id: 'w5', name: 'BCNHL', type: 'Covered Wagon HL', description: 'High-capacity covered 64 t', height: 320, width: 295, length: 1520, weight: 64000 },
];

export const CUSTOMERS = [
  { id: 'c1', name: 'Deccan Home Appliances Ltd', short: 'DECCAN', city: 'pune', address: 'Gat 410, Chakan Industrial Area, Pune 410501', gst: '27AADCD4471K1Z2', pan: 'AADCD4471K', contact: 'Nilesh Joshi', phone: '9822041188', contactPerson: 'Rohan Mehta (Logistics Head)', contactMobile: '9881200433', email: 'dispatch@deccanhome.example', secondaryEmail: 'accounts@deccanhome.example', billingEmail: 'ap@deccanhome.example', notiEmail: 'track@deccanhome.example', website: 'deccanhome.example', creditDays: 45, creditLimit: 4500000, interest: 18, tds: 2, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: true, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c2', name: 'Indus Cool Appliances Pvt Ltd', short: 'INDUSCOOL', city: 'jalgaon', address: 'D-14, MIDC Area, Jalgaon 425003', gst: '27AACCI2210P1ZX', pan: 'AACCI2210P', contact: 'Vivek Chaudhari', phone: '9423188420', contactPerson: 'Swati Patil', contactMobile: '9370011244', email: 'scm@induscool.example', secondaryEmail: '', billingEmail: 'billing@induscool.example', notiEmail: '', website: 'induscool.example', creditDays: 30, creditLimit: 6000000, interest: 18, tds: 2, billFormat: 'Whirlpool Bill Format', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: true, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c3', name: 'Meridian Electronics India', short: 'MERIDIAN', city: 'pune', address: 'Ranjangaon MIDC, Pune 412220', gst: '27AAFCM9032E1Z4', pan: 'AAFCM9032E', contact: 'Ketan Shah', phone: '9890566012', contactPerson: 'Anand Rao', contactMobile: '9765400112', email: 'logistics@meridian.example', secondaryEmail: '', billingEmail: 'payables@meridian.example', notiEmail: '', website: 'meridian.example', creditDays: 60, creditLimit: 8000000, interest: 15, tds: 2, billFormat: 'LG Bill Format', lrFormat: 'Standard Format A', billWithoutAck: true, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c4', name: 'Voyager Luggage Co.', short: 'VOYAGER', city: 'nashik', address: 'Plot F-7, Sinnar MIDC, Nashik 422113', gst: '27AAHFV5501B1ZK', pan: 'AAHFV5501B', contact: 'Sneha Kulkarni', phone: '9545033271', contactPerson: 'Sneha Kulkarni', contactMobile: '9545033271', email: 'dispatch@voyagerluggage.example', secondaryEmail: '', billingEmail: 'finance@voyagerluggage.example', notiEmail: '', website: '', creditDays: 30, creditLimit: 1500000, interest: 18, tds: 2, billFormat: 'Samsonite Bill Format', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c5', name: 'Khandesh Agro Exports', short: 'KHANDESH', city: 'jalgaon', address: 'Raver Road, Savda, Jalgaon 425502', gst: '27AAKFK7781M1Z9', pan: 'AAKFK7781M', contact: 'Dilip Mahajan', phone: '9421504488', contactPerson: 'Dilip Mahajan', contactMobile: '9421504488', email: 'despatch@khandeshagro.example', secondaryEmail: '', billingEmail: 'accounts@khandeshagro.example', notiEmail: '', website: '', creditDays: 15, creditLimit: 2500000, interest: 21, tds: 1, billFormat: 'Standard Fromat B', lrFormat: 'Standard Format A', billWithoutAck: true, detentionBill: true, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c6', name: 'Tapti Pipes & Fittings', short: 'TAPTI', city: 'jalgaon', address: 'G-21, MIDC Jalgaon', gst: '27AAEFT3302Q1Z7', pan: 'AAEFT3302Q', contact: 'Hemant Sonawane', phone: '9370412289', contactPerson: '', contactMobile: '', email: 'sales@taptipipes.example', secondaryEmail: '', billingEmail: 'accounts@taptipipes.example', notiEmail: '', website: '', creditDays: 30, creditLimit: 1200000, interest: 18, tds: 2, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c7', name: 'Satpuda Cotton Mills', short: 'SATPUDA', city: 'dhule', address: 'Shirpur Road, Dhule 424001', gst: '27AACCS6640H1ZB', pan: 'AACCS6640H', contact: 'Rajendra Borse', phone: '9422200917', contactPerson: '', contactMobile: '', email: 'mill@satpudacotton.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 21, creditLimit: 1800000, interest: 18, tds: 2, billFormat: 'Standard Fromat B', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c8', name: 'Konkan Consumer Products', short: 'KONKAN', city: 'mumbai', address: 'Unit 5, Taloja MIDC, Navi Mumbai', gst: '27AABCK1188R1Z3', pan: 'AABCK1188R', contact: 'Farhan Sayed', phone: '9819332001', contactPerson: '', contactMobile: '', email: 'scm@konkancp.example', secondaryEmail: '', billingEmail: 'ap@konkancp.example', notiEmail: '', website: '', creditDays: 45, creditLimit: 3000000, interest: 18, tds: 2, billFormat: 'Reliance Bill Format', lrFormat: 'Reliance', billWithoutAck: false, detentionBill: true, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c9', name: 'Brahmaputra Distributors', short: 'BRAHMA', city: 'guwahati', address: 'A.T. Road, Fancy Bazar, Guwahati 781001', gst: '18AAFFB2207C1ZQ', pan: 'AAFFB2207C', contact: 'Pranjal Baruah', phone: '9435011820', contactPerson: '', contactMobile: '', email: 'stores@brahmadist.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 30, creditLimit: 900000, interest: 18, tds: 1, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: false },
  { id: 'c10', name: 'Eastern Home Retail', short: 'EHR', city: 'kolkata', address: 'Dankuni Warehousing Hub, Hooghly 712311', gst: '19AAGCE8814L1ZU', pan: 'AAGCE8814L', contact: 'Arindam Sen', phone: '9831044217', contactPerson: '', contactMobile: '', email: 'inbound@easternhome.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 30, creditLimit: 1200000, interest: 18, tds: 2, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: false },
  { id: 'c11', name: 'Seven Sisters Trading Co', short: '7SIS', city: 'shillong', address: 'Police Bazar, Shillong 793001', gst: '17AAJFS4410D1ZM', pan: 'AAJFS4410D', contact: 'Daniel Syiem', phone: '9436102284', contactPerson: '', contactMobile: '', email: 'orders@sevensisters.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 30, creditLimit: 600000, interest: 18, tds: 1, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: false },
  { id: 'c12', name: 'Coromandel Appliance Mart', short: 'COROMANDEL', city: 'chennai', address: 'Ambattur Industrial Estate, Chennai 600058', gst: '33AAHCC7720F1ZD', pan: 'AAHCC7720F', contact: 'K. Ramesh', phone: '9840011277', contactPerson: '', contactMobile: '', email: 'grn@coromandelmart.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 30, creditLimit: 900000, interest: 18, tds: 2, billFormat: 'Standard Format A', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: false },
  { id: 'c13', name: 'Purvanchal Cement Ltd', short: 'PURVANCHAL', city: 'raipur', address: 'Tilda Road, Raipur 493114', gst: '22AACCP5512A1Z6', pan: 'AACCP5512A', contact: 'Sunil Agrawal', phone: '9827155093', contactPerson: '', contactMobile: '', email: 'despatch@purvanchalcement.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 30, creditLimit: 2000000, interest: 18, tds: 2, billFormat: 'Hier Bill Format', lrFormat: 'Standard Format A', billWithoutAck: true, detentionBill: false, disallowLR: false, cst: '', bst: '', vat: '', shipper: true },
  { id: 'c14', name: 'Narmada Steel Tubes', short: 'NARMADA', city: 'indore', address: 'Pithampur Sector 3, Dhar 454775', gst: '23AADCN6620J1ZE', pan: 'AADCN6620J', contact: 'Ashish Jain', phone: '9826011430', contactPerson: '', contactMobile: '', email: 'ops@narmadatubes.example', secondaryEmail: '', billingEmail: '', notiEmail: '', website: '', creditDays: 45, creditLimit: 2200000, interest: 18, tds: 2, billFormat: 'Godrej Bill Format', lrFormat: 'Standard Format A', billWithoutAck: false, detentionBill: true, disallowLR: true, cst: '', bst: '', vat: '', shipper: true },
];

export const TRANSPORTERS = [
  { id: 't1', name: 'Shree Sai Roadlines', address: 'Transport Nagar, Jalgaon', city: 'jalgaon', contact: 'Ganesh Patil', phone: '0257-2212201', mobile: '9422551102', mobile2: '9850112290', pan: 'ABCPS1122K', stNo: '27ABCPS1122K1Z1', tdsRate: 1, noTdsAmt: 30000, blacklisted: false, associate: true, paymentMode: 'Bank', payable1: 70, payable2: 20, payable3: 10, payable4: 0, declaration: true, locations: 'Jalgaon, Nashik, Pune' },
  { id: 't2', name: 'Jai Bhavani Transport Co.', address: 'Ajanta Road, Jalgaon', city: 'jalgaon', contact: 'Santosh More', phone: '0257-2236610', mobile: '9890221104', mobile2: '', pan: 'AHKPM4401R', stNo: '', tdsRate: 1, noTdsAmt: 30000, blacklisted: false, associate: false, paymentMode: 'Bank', payable1: 80, payable2: 20, payable3: 0, payable4: 0, declaration: true, locations: 'Jalgaon, Mumbai' },
  { id: 't3', name: 'Annapurna Roadways', address: 'Wakadewadi, Pune', city: 'pune', contact: 'Vinod Jagtap', phone: '020-25530987', mobile: '9822018876', mobile2: '', pan: 'AAKFA2290M', stNo: '27AAKFA2290M1ZT', tdsRate: 2, noTdsAmt: 0, blacklisted: false, associate: false, paymentMode: 'Bank', payable1: 70, payable2: 30, payable3: 0, payable4: 0, declaration: false, locations: 'Pune, Mumbai, Bengaluru' },
  { id: 't4', name: 'Maa Kamakhya Transport', address: 'Amingaon, Guwahati', city: 'guwahati', contact: 'Ranjit Das', phone: '0361-2690133', mobile: '9435122201', mobile2: '9101100223', pan: 'AFQPD6612C', stNo: '', tdsRate: 1, noTdsAmt: 30000, blacklisted: false, associate: true, paymentMode: 'Cash', payable1: 60, payable2: 40, payable3: 0, payable4: 0, declaration: true, locations: 'Guwahati, Shillong, Dibrugarh, Agartala' },
  { id: 't5', name: 'Bengal Freight Movers', address: 'Kona Expressway, Howrah', city: 'kolkata', contact: 'Tapas Mondal', phone: '033-26501142', mobile: '9831220018', mobile2: '', pan: 'AAEFB7781H', stNo: '19AAEFB7781H1ZP', tdsRate: 2, noTdsAmt: 0, blacklisted: false, associate: false, paymentMode: 'Bank', payable1: 70, payable2: 30, payable3: 0, payable4: 0, declaration: true, locations: 'Kolkata, Siliguri, Patna' },
  { id: 't6', name: 'Khandesh Truck Owners Union', address: 'Bhusawal Road, Jalgaon', city: 'jalgaon', contact: 'Ramdas Chaudhari', phone: '0257-2240451', mobile: '9421100778', mobile2: '', pan: 'AAATK3310F', stNo: '', tdsRate: 0, noTdsAmt: 0, blacklisted: false, associate: true, paymentMode: 'Cheque', payable1: 100, payable2: 0, payable3: 0, payable4: 0, declaration: true, locations: 'Jalgaon district' },
  { id: 't7', name: 'Om Sairam Carriers', address: 'Nashik Road', city: 'nashik', contact: 'Pravin Gaikwad', phone: '0253-2465521', mobile: '9765112245', mobile2: '', pan: 'AMNPG2219B', stNo: '', tdsRate: 1, noTdsAmt: 30000, blacklisted: true, associate: false, paymentMode: 'Bank', payable1: 70, payable2: 30, payable3: 0, payable4: 0, declaration: false, locations: 'Nashik' },
  { id: 't8', name: 'Coromandel Lorry Service', address: 'Madhavaram, Chennai', city: 'chennai', contact: 'S. Murugan', phone: '044-25551920', mobile: '9884033120', mobile2: '', pan: 'AAJFC1840N', stNo: '33AAJFC1840N1ZX', tdsRate: 2, noTdsAmt: 0, blacklisted: false, associate: false, paymentMode: 'Bank', payable1: 70, payable2: 30, payable3: 0, payable4: 0, declaration: true, locations: 'Chennai, Pondicherry, Bengaluru' },
];

export const TRUCK_CAPACITIES = ['32 LQ', '32 HQ', '34 LQ', '34 HQ', '36 LQ', '36 HQ', '38 LQ', '38 HQ', '40 LQ', '40 HQ', '407', '18 Feet Truck', '19 Feet Truck', 'DCM', 'DI', '6 Wheeler', '10 Wheeler', '12 Wheeler', '9 MT', '16 MT', '20 MT'];

export const PUMPS = [
  { id: 'p1', name: 'Khandesh Highway Fuels', city: 'jalgaon', address: 'NH-53, Paldhi, Jalgaon', contact: 'Mahesh Attarde', phone: '9422205561', dieselRate: 90.48, rateUpdated: '', vat: '27ABQFK1102R1ZL', pan: 'ABQFK1102R', creditLimit: 1500000, bank: 'State Bank of India', account: 'Khandesh Highway Fuels', ifsc: 'SBIN0000398', blacklisted: false },
  { id: 'p2', name: 'Balaji Petroleum', city: 'dhule', address: 'Mumbai–Agra Hwy, Dhule', contact: 'Sanjay Agrawal', phone: '9823011470', dieselRate: 90.72, rateUpdated: '', vat: '', pan: 'AAPFB2290K', creditLimit: 800000, bank: 'Bank of Maharashtra', account: 'Balaji Petroleum', ifsc: 'MAHB0000214', blacklisted: false },
  { id: 'p3', name: 'Shivneri Fuel Station', city: 'nashik', address: 'Ozar, Nashik', contact: 'Tushar Pawar', phone: '9890440012', dieselRate: 90.31, rateUpdated: '', vat: '', pan: 'AAQFS6619P', creditLimit: 600000, bank: 'HDFC Bank', account: 'Shivneri Fuel Station', ifsc: 'HDFC0001022', blacklisted: false },
  { id: 'p4', name: 'Narmada Highway Service Centre', city: 'indore', address: 'AB Road, Rau, Indore', contact: 'Vikas Tiwari', phone: '9826033017', dieselRate: 92.14, rateUpdated: '', vat: '', pan: 'AAKFN1180L', creditLimit: 500000, bank: 'ICICI Bank', account: 'Narmada HSC', ifsc: 'ICIC0000417', blacklisted: false },
  { id: 'p5', name: 'Ganga Fuels', city: 'patna', address: 'NH-19 Bypass, Patna', contact: 'Rakesh Singh', phone: '9431022284', dieselRate: 92.84, rateUpdated: '', vat: '', pan: 'AAGFG4402D', creditLimit: 400000, bank: 'Punjab National Bank', account: 'Ganga Fuels', ifsc: 'PUNB0110400', blacklisted: false },
  { id: 'p6', name: 'Assam Gateway Petro', city: 'guwahati', address: 'Jalukbari, Guwahati', contact: 'Hiren Bora', phone: '9864211780', dieselRate: 91.67, rateUpdated: '', vat: '', pan: 'AAKFA3381E', creditLimit: 400000, bank: 'State Bank of India', account: 'Assam Gateway Petro', ifsc: 'SBIN0014239', blacklisted: false },
];

export const LEDGERS = [
  { id: 'l1', name: 'State Bank of India – CA 30412', type: 'Bank', branches: 'All' }, { id: 'l2', name: 'HDFC Bank – CC 50200', type: 'Bank', branches: 'JL, MB, PN' },
  { id: 'l3', name: 'Axis Bank – CA 9120', type: 'Bank', branches: 'KL, GH' }, { id: 'l4', name: 'Cash in Hand – Jalgaon', type: 'Bank', branches: 'JL' },
  { id: 'l5', name: 'Fleet Card FC-0112', type: 'Card', branches: 'All' }, { id: 'l6', name: 'Fleet Card FC-0219', type: 'Card', branches: 'All' },
];

export const EXPENSE_TYPES = [
  { id: 'e1', name: 'Diesel', ledger: 'Diesel Expenses', l1: 25000, l2: 40000, l3: 60000, l4: 90000, mode: 'Card', applicableFor: 'Own Vehicle' },
  { id: 'e2', name: 'Toll Tax', ledger: 'Toll Expenses', l1: 3000, l2: 6000, l3: 9000, l4: 12000, mode: 'Card', applicableFor: 'Own Vehicle' },
  { id: 'e3', name: 'Driver Bhatta', ledger: 'Driver Allowance', l1: 1500, l2: 3000, l3: 4500, l4: 6000, mode: 'Cash', applicableFor: 'Own Vehicle' },
  { id: 'e4', name: 'Loading Charges', ledger: 'Loading & Unloading', l1: 2000, l2: 4000, l3: 6000, l4: 8000, mode: 'Cash', applicableFor: 'All' },
  { id: 'e5', name: 'Unloading Charges', ledger: 'Loading & Unloading', l1: 2000, l2: 4000, l3: 6000, l4: 8000, mode: 'Cash', applicableFor: 'All' },
  { id: 'e6', name: 'RTO / Check Post', ledger: 'RTO Expenses', l1: 1000, l2: 2000, l3: 3000, l4: 5000, mode: 'Cash', applicableFor: 'Own Vehicle' },
  { id: 'e7', name: 'Road Repair', ledger: 'Repairs & Maintenance', l1: 5000, l2: 10000, l3: 20000, l4: 40000, mode: 'Cash', applicableFor: 'Own Vehicle' },
  { id: 'e8', name: 'Parking', ledger: 'Parking Charges', l1: 500, l2: 1000, l3: 1500, l4: 2000, mode: 'Cash', applicableFor: 'All' },
  { id: 'e9', name: 'Weighbridge (Kata)', ledger: 'Kata Charges', l1: 300, l2: 600, l3: 900, l4: 1200, mode: 'Cash', applicableFor: 'All' },
  { id: 'e10', name: 'Tyre Puncture', ledger: 'Repairs & Maintenance', l1: 800, l2: 1500, l3: 2500, l4: 4000, mode: 'Cash', applicableFor: 'Own Vehicle' },
];

const firstNames = ['Ramesh', 'Suresh', 'Vijay', 'Santosh', 'Ganesh', 'Dnyaneshwar', 'Rajesh', 'Sunil', 'Anil', 'Prakash', 'Dinesh', 'Mahendra', 'Sanjay', 'Ravindra', 'Kailas', 'Bhagwan', 'Sopan', 'Nandu', 'Shankar', 'Ashok', 'Manoj', 'Raju', 'Bapu', 'Vasant', 'Gopal', 'Arjun', 'Kishor', 'Pandurang'];
const lastNames = ['Patil', 'Chaudhari', 'Mahajan', 'Sonawane', 'Bhamre', 'Pawar', 'Jadhav', 'Shinde', 'More', 'Wagh', 'Koli', 'Bhil', 'Thakur', 'Gujar', 'Marathe', 'Nemade', 'Baviskar', 'Salunkhe', 'Yadav', 'Singh'];
export const NAMES = { firstNames, lastNames };

export const LABOURS_SEED = [
  ['Supervisor', 'Prashant Nemade', 'JL'], ['Supervisor', 'Umesh Baviskar', 'JL'], ['Supervisor', 'Bijoy Saikia', 'GH'], ['Supervisor', 'Sourav Pal', 'KL'], ['Supervisor', 'Kiran Gade', 'MB'], ['Supervisor', 'Ajit Jagdale', 'PN'],
  ['Hamal', 'Hamal Gang – Ramesh Koli', 'JL'], ['Hamal', 'Hamal Gang – Bhika Bhil', 'JL'], ['Hamal', 'Hamal Gang – Shamrao Thakur', 'JL'], ['Hamal', 'Hamal Gang – Nur Islam', 'GH'], ['Hamal', 'Hamal Gang – Biren Deka', 'GH'], ['Hamal', 'Hamal Gang – Sk. Rafiq', 'KL'], ['Hamal', 'Hamal Gang – Babu Lal', 'MB'],
  ['Mechanic', 'Javed Shaikh', 'JL'], ['Mechanic', 'Sudam Marathe', 'JL'], ['Mechanic', 'Iqbal Khan', 'JL'], ['Mechanic', 'Tukaram Salunkhe', 'JL'], ['Mechanic', 'Vilas Gujar (Auto Electrician)', 'JL'],
];

export const SPARE_CATEGORIES = [
  { id: 'sc1', name: 'Engine', type: 'Item', description: 'Engine parts & filters' }, { id: 'sc2', name: 'Lubricants', type: 'Item', description: 'Oils, grease, coolant' },
  { id: 'sc3', name: 'Tyres & Tubes', type: 'Item', description: 'Tyres, tubes, flaps' }, { id: 'sc4', name: 'Brakes & Clutch', type: 'Item', description: '' },
  { id: 'sc5', name: 'Electrical', type: 'Item', description: 'Batteries, lamps, wiring' }, { id: 'sc6', name: 'Suspension', type: 'Item', description: 'Springs, bushes, bearings' },
  { id: 'sc7', name: 'Mechanical Service', type: 'Service', description: 'Outside labour & machining' }, { id: 'sc8', name: 'Body & Tyre Service', type: 'Service', description: 'Retreading, denting, painting' },
];
export const SPARES = [
  ['sp1', 'Engine Oil 15W-40', 'sc2', 285, 60, 'Ltr', false, true], ['sp2', 'Oil Filter (Tata 1613)', 'sc1', 640, 10, 'Nos', false, true], ['sp3', 'Air Filter Element', 'sc1', 1450, 6, 'Nos', false, true],
  ['sp4', 'Fuel Filter Assembly', 'sc1', 980, 8, 'Nos', false, true], ['sp5', 'Brake Liner Set', 'sc4', 3200, 4, 'Nos', false, true], ['sp6', 'Clutch Plate 380mm', 'sc4', 7800, 2, 'Nos', true, true],
  ['sp7', 'Tyre 10.00-20 Nylon', 'sc3', 21500, 8, 'Nos', true, true], ['sp8', 'Tube 10.00-20', 'sc3', 1650, 8, 'Nos', false, true], ['sp9', 'Battery 150Ah', 'sc5', 11800, 3, 'Nos', true, true],
  ['sp10', 'Fan Belt', 'sc1', 520, 6, 'Nos', false, false], ['sp11', 'Wheel Bearing (rear)', 'sc6', 2350, 4, 'Nos', false, true], ['sp12', 'Grease (Lithium)', 'sc2', 210, 20, 'Kg', false, false],
  ['sp13', 'Coolant Concentrate', 'sc2', 340, 20, 'Ltr', false, false], ['sp14', 'Head Lamp Assembly', 'sc5', 1850, 2, 'Nos', false, false], ['sp15', 'Leaf Spring (main)', 'sc6', 4600, 2, 'Nos', true, true],
  ['sp16', 'Hydraulic Brake Hose', 'sc4', 690, 4, 'Nos', false, false],
].map(([id, name, categoryId, rate, minStock, unit, recyclable, batch]: any) => ({ id, name, type: 'Item', categoryId, rate, minStock, unit, recyclable, batch, description: '' }));
export const SERVICES = [
  ['sv1', 'Wheel Alignment & Balancing', 'sc7', 1800], ['sv2', 'Tyre Retreading', 'sc8', 6200], ['sv3', 'Auto Electrical Work', 'sc7', 1500], ['sv4', 'Denting & Painting', 'sc8', 9500],
  ['sv5', 'Chassis Welding', 'sc7', 2400], ['sv6', 'Fuel Injection Pump Calibration', 'sc7', 7200], ['sv7', 'Radiator Repair', 'sc7', 2800],
].map(([id, name, categoryId, rate]: any) => ({ id, name, type: 'Service', categoryId, rate, minStock: 0, unit: 'Job', recyclable: false, batch: false, description: '' }));

export const SUPPLIERS = [
  { id: 'su1', name: 'Mahavir Auto Spares', type: 'Seller', shop: 'Mahavir Auto Spares', city: 'jalgaon', address: 'Transport Nagar, Jalgaon', contactPerson: 'Pankaj Jain', contact: '0257-2229011', mobile: '9422777301', email: 'mahavirauto@example.in', vat: '27AAJPJ2210H1ZQ', pan: 'AAJPJ2210H' },
  { id: 'su2', name: 'Shree Tyres & Retreads', type: 'Seller', shop: 'Shree Tyres', city: 'jalgaon', address: 'Ajanta Chowk, Jalgaon', contactPerson: 'Nitin Wani', contact: '0257-2231802', mobile: '9850332210', email: '', vat: '27ABHPW1180K1ZD', pan: 'ABHPW1180K' },
  { id: 'su3', name: 'Khandesh Lubricants', type: 'Seller', shop: 'Khandesh Lubricants', city: 'jalgaon', address: 'MIDC, Jalgaon', contactPerson: 'Rahul Lodha', contact: '', mobile: '9370021145', email: '', vat: '', pan: 'AAQFK3301M' },
  { id: 'su4', name: 'Power Battery House', type: 'Seller', shop: 'Power Battery House', city: 'bhusawal', address: 'Station Road, Bhusawal', contactPerson: 'Sameer Khan', contact: '', mobile: '9822501144', email: '', vat: '', pan: 'BKZPK7710R' },
  { id: 'su5', name: 'Ganesh Diesel Works', type: 'Service', shop: 'Ganesh Diesel Works', city: 'jalgaon', address: 'Shivaji Nagar, Jalgaon', contactPerson: 'Ganesh Sutar', contact: '', mobile: '9423411270', email: '', vat: '', pan: 'BHGPS4402A' },
  { id: 'su6', name: 'Precision Wheel Alignment', type: 'Service', shop: 'Precision Wheel Alignment', city: 'jalgaon', address: 'NH-53, Jalgaon', contactPerson: 'Imran Pathan', contact: '', mobile: '9890661022', email: '', vat: '', pan: 'BPZPP1102Q' },
  { id: 'su7', name: 'Royal Body Builders', type: 'Service', shop: 'Royal Body Builders', city: 'jalgaon', address: 'Kalinka Mata Road, Jalgaon', contactPerson: 'Salim Sheikh', contact: '', mobile: '9764021108', email: '', vat: '', pan: 'CAKPS6640B' },
];

export const CHECKLIST_PARTICULARS = ['Engine oil level', 'Coolant level', 'Brake fluid level', 'Tyre pressure (all wheels)', 'Tyre tread & sidewall', 'Battery terminals & charge', 'Head lamps, indicators & tail lamps', 'Horn & reverse alarm', 'Wipers & washer', 'Clutch free play', 'Service & parking brake', 'Steering play', 'Leaf springs & U-bolts', 'Wheel nuts torque', 'Exhaust smoke', 'Fuel / oil leakage', 'Tarpaulin & ropes', 'RC, permit, insurance, PUC on board', 'Fire extinguisher', 'First-aid kit'];

export const ROLE_DEFS = [
  { id: 'r1', code: 'SA', name: 'Super Admin', description: 'Full access to every module and administration' },
  { id: 'r2', code: 'AD', name: 'Administrator', description: 'Masters, users and data corrections' },
  { id: 'r3', code: 'OP', name: 'Operations Head', description: 'Bookings, rakes, delivery, fleet' },
  { id: 'r4', code: 'BU', name: 'Branch Operations', description: 'Branch LR booking, GRN/DGRN, delivery challans' },
  { id: 'r5', code: 'AC', name: 'Accounts', description: 'Billing, receivables, payables, ledger, Tally' },
  { id: 'r6', code: 'CC', name: 'Customer Care', description: 'Tracking, acknowledgments, complaints' },
  { id: 'r7', code: 'CO', name: 'Fleet Coordinator', description: 'Trucks, trips, log slips, documents expiry' },
  { id: 'r8', code: 'SI', name: 'Workshop & Store', description: 'Job cards, spares, purchase and inward' },
  { id: 'r9', code: 'HR', name: 'HR', description: 'Employees, drivers, labour' },
];
