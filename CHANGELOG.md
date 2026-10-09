# Changelog

## 2026-10-09 — Role-Based Training Academy & User Management

- Added server-backed user lifecycle administration and per-user RBAC overrides.
- Added persistent employee training records, quiz attempts, readiness settings and admin/team training APIs.
- Added role-aware Academy curriculum, onboarding, lessons/audio, workflows, isolated practice, quizzes/final assessments, glossary, readiness and weak-topic recommendations.
- Added contextual Screen Help and server-tracked hints/tours across all 123 meaningful ERP routes.
- Added global Practice Mode safety banner and fixed sample-state isolation so practice cannot overwrite shared company state.
- Added Admin Training Dashboard, employee training profiles and coverage matrix.
- Added `npm run test:training` route/content integrity and training-engine unit tests.
- API integration suite: 33/33 passing; frontend production build and training tests passing.

## 2026-10-09 — ERP demo expansion (last 12 hours)

### HR & Payroll
- Added interactive HR and Payroll demo module and ERP navigation/routes.

### Marketing & CRM
- Added interactive Marketing/CRM demo module.
- Added won-deal handoff into shared ERP customer/rate-contract context and Booking.

### DC Detention Management
- Added integrated Detention Management and Detention Rules under Finance.
- Added DC/LR timing, slab calculation, claimed/approved/deduction and exception-oriented demo workflow.

### Smart Load Planning
- Added functional 3D Smart Load Planning integrated with ERP Orders and Fleet.
- Added owned TypeScript packing heuristic, independent geometric validation and Three.js/R3F visualization.
- Added reusable vehicle templates, automatic recommendations, multi-vehicle splitting, Goods/Fleet geometry masters and stacking/top-load constraints.
- Added multi-stop LIFO accessibility checks, loading/unloading sequences and validated manual package movement/rotation.
- Added reproducible optimizer benchmarks and dual-heuristic result selection.
- Added printable visual loading instructions with top/side projections and synchronized package numbering.
- Assessed external packing engines; retained browser-native engine for the demo.
- Added physical loading reconciliation, supervisor confirmation and Warehouse verification queue.
- Added Order/LR/load-plan synchronization and LR finalisation gate.
- Added dispatch-readiness checks and store-level dispatch, delivery and POD transition guards.
- Added lifecycle propagation through Delivery, POD, Billing, Payment Partial and Paid.
- Added guarded financial rollback for bill/LR/receipt changes.
- Added approved-plan, linked-Order and linked-LR mutation locks.
- Added 8-step ERP lifecycle presentation and Smart Load linkage in Order 360, LR 360, Warehouse and Bill 360.
- Aligned Quick POD and Quick Billing eligibility with the primary workflows.
- Completed final approved-plan input locking and standard LR audit timeline event shape.
- Final Level-3 walkthrough: Order → Plan → Loading → LR → Dispatch → Delivery → POD → Billing → Payment.

### UX
- Added operational sidebar menu search.
- Corrected floating chat button layout.

### Validation
- Smart Load automated test suite passes.
- Reproducible fixtures: Mixed industrial 45/50, Dense cartons 120/120, Heavy multi-stop 68/80.
- TypeScript/Vite production build passes.
- Latest functional completion commit before documentation refresh: d6ce6f7.
