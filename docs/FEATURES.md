# Feature status

## Functional and production-connected

- Secure login with PostgreSQL-backed accounts and server sessions.
- Role-based navigation and direct-route guards for ERP roles.
- Super Admin credential administration: account listing, role changes, activation, and one-time password reset.
- PostgreSQL-backed shared ERP state with optimistic version checks and audit events.
- Work items and training APIs with validation, role checks, and audit logging.
- Per-user dashboard layout preferences stored in PostgreSQL; customize, resize, reorder, and reset.
- Communication module: direct/group conversations, ERP references, enquiries, assignable tasks, polling refresh, and administrator oversight audit.
- Original ERP navigation and workflow screens restored from the preserved prototype.
- Historical logistics, customers, branches, LRs, billing, fleet, rail, warehouse, finance, workshop, reports, and administration data loaded from the preserved historical snapshot.
- Production gateway routes API calls only over HTTPS and forwards bearer authentication.

## Demo modules added / materially expanded — 9 October 2026

### HR & Payroll
- Interactive HR and payroll demo screens were added and wired into ERP navigation/routing.
- Demo-oriented HR state is intentionally lightweight; this module is for client walkthroughs rather than production payroll compliance.

### Marketing & CRM
- Interactive marketing/CRM screens were added with enquiries/deals and sales-demo interactions.
- Won CRM deals can hand off into ERP operations by creating/reusing shared customer and rate-contract context and opening the booking workflow.

### DC Detention Management
- Finance now includes Detention Management and Detention Rules for delivery-challan/LR detention review.
- Detention calculation uses reporting/unloading timing, configurable slabs, claimed/approved/deduction values and exception handling for a believable finance walkthrough.

### Smart Load Planning — Level 3 walkthrough complete
- Functional 3D cargo packing is integrated with Orders, Goods Master, Fleet, Warehouse, LR, Dispatch, Delivery/POD, Billing and Receivables.
- The planner includes editable geometry, payload/stacking constraints, reusable vehicle templates, vehicle recommendations, multi-vehicle splitting, multi-stop LIFO accessibility checks, manual validated movement/rotation, optimizer benchmarks and printable visual loading instructions.
- Physical loading reconciliation records planned/loaded/damage/shortage quantities, supervisor and remarks; loading cannot be confirmed with unreconciled quantities.
- Approved plans lock operational planning inputs. Order/LR operational fields are protected from changes that would contradict an approved plan.
- Dispatch readiness checks LR finalisation, loading confirmation/reconciliation, planned vehicle and driver assignment. Store-level guards also prevent invalid dispatch, delivery and POD transitions.
- Lifecycle synchronization now covers Order → Plan → Loading Confirmed → LR → Dispatch → Delivery → POD → Billing → Payment Partial/Paid.
- Order 360, LR 360, Warehouse loading verification and Bill 360 expose linked Smart Load records and direct navigation.
- Quick POD and Quick Billing now enforce the same delivery/POD/billing eligibility rules as their primary workflows.
- Finance rollback is guarded: bills/LRs cannot be destructively changed while receipts exist, and receipt deletion recalculates Billed/Payment Partial/Paid state from remaining settlement.
- Automated load-planning tests and reproducible optimizer fixtures are part of `npm run test:load`. See the Smart Load Planning documents for algorithm and safety limitations.

### UX improvements
- Operational sidebar menu search was added.
- Floating chat control layout was corrected for the client-facing shell.

## Role-Based ERP Training Academy & User Management

- PostgreSQL-backed employee/user administration with create, edit, role and per-user permission overrides, activate/deactivate, soft delete, password reset, forced first-login password change and administrative safeguards.
- Role-aware Training Academy with persistent employee progress, onboarding, 175 lessons, Hinglish audio support, 14 end-to-end workflows, 39 isolated practice exercises, 210 ERP-behavior questions, module/final assessments and a 66-term glossary.
- 123/123 meaningful ERP routes have contextual training metadata and Screen Help.
- Screen Help includes purpose, why/when, before/after, guided walkthrough, field/status help, common mistakes, related screens, lesson/audio and Practice links.
- Practice Mode cannot upload sample state to shared PostgreSQL, can be reset independently and displays a global safety banner.
- Readiness combines lessons, tours, practical exercises, workflows and assessments. Admin Training Dashboard shows employee readiness and detailed progress.
- Training coverage is enforced by `npm run test:training` so new routes cannot silently ship without training metadata.

## Partially functional / migration boundary

- Many original screens use the preserved ERP state document and shared PostgreSQL JSONB persistence rather than individual normalized operational tables.
- Some forms and workflows update the shared ERP state and are not yet connected to a dedicated normalized API endpoint for every legacy transaction.
- The order board and dashboard use preserved historical data plus new operational state; transaction-level concurrency is strongest on the dedicated work, training, communication, and layout APIs.
- Chat currently refreshes by authenticated polling rather than a WebSocket connection.

## Prototype or non-production data

- `source/sk-erp/src/store/seed.ts` is sample/demo seed data and must not be used as production data.
- Prototype-only static artifacts and uploaded archives are excluded from the production repository.
- Any screen showing example values from the original prototype must be replaced with live PostgreSQL data before being advertised as a completed transaction workflow.

## Explicitly not included yet

- File/image attachments in chat.
- Push notifications, email notifications, and WebSocket presence.
- Full normalized API coverage for every legacy form and report.
- Automated browser/mobile end-to-end tests in this server environment.
