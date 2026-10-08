# Smart Load Planning — Progress
Started: 9 October 2026.

## Final technology
Original TypeScript 3D packing heuristic and independent validator; Three.js / React Three Fiber / Drei for interactive rendering. Benchmark candidates remain skjolber/3d-bin-container-packing (Apache-2.0) and fontanf/packingsolver (MIT). No commercial code copied.

## Stage 1 — complete
- Operations > Smart Load Planning route and Order > Smart Load Plan action.
- Existing Orders, Goods master and Fleet selection.
- Editable cargo/vehicle geometry, automatic packing, utilization and exceptions.
- Interactive 3D viewer with validated coordinate edits.
- Shared ERP-state save/reopen, approval and loading-confirmed status.
- VP Loading and LR navigation.
- Automated fit, oversize, payload, nonstack, rotation, collision, support and overflow tests.

## Stage 2 — started
Implemented in first Stage-2 increment:
- Reusable 14/17/20/24/32 FT vehicle body templates.
- Automatic vehicle recommendation comparing the active cargo manifest.
- Multi-vehicle split calculation using the selected vehicle.
- Printable Smart Load Plan with manifest, utilization, payload and supervisor sign-off.
- Stage-2 automated tests for vehicle recommendations, multivehicle split and report model.

Remaining Stage 2:
- IN PROGRESS: planner now actually executes baseline + improved candidate-placement algorithms and selects the result that places more cargo. External open-source engine comparison remains pending.
- DONE: Goods Master now carries dimensions, orientation, stacking layers and max top-load weight; Fleet truck form now carries loading-space dimensions and max payload.
- Planner consumes those master values where present, with presets/fallbacks for demo records.
- DONE: top-load weight and maximum stacking-layer constraints are enforced by the geometric validator.
- DONE: multi-stop rear-door accessibility validation, loading/unloading sequences and approval blocking when later-stop cargo obstructs an earlier stop.
- DONE: selected packages support validated floor rotation / forward rotation in addition to coordinate editing.
- DONE: printable visual loading instruction now includes numbered top and side projections generated from validated 3D coordinates, loading sequence with XYZ positions, stop IDs, dimensions, manifest and sign-off.
- DONE: reproducible 50/120/80-package internal benchmark fixtures with in-app runtime/utilization results. External-engine comparison remains pending.

## Stage 3 — pending
Synchronize approved plans with VP/Warehouse/LR/DC and Dispatch readiness, actual loaded quantities, exceptions and overrides.

## Operational caveat
Goods-master geometry is used where available; missing values are estimates. Vehicle interior dimensions are editable planning values. This is not certified axle, securement or stability analysis.

## Stage 2 external-engine assessment (2026-10-09)
- Reviewed published features, licenses and integration implications for PackingSolver (C++ MIT), 3d-bin-container-packing (Java Apache-2.0) and py3dbp (Python MIT). See `SMART_LOAD_PLANNING_ENGINE_ASSESSMENT.md`.
- Decision: keep browser-native dual heuristic for the client demo. External engines have not been executed head-to-head; no service added.
- In-app benchmarks now compare baseline and improved placement counts, selected result, LIFO warnings and elapsed time; candidate geometry is independently validated.
- Stage 3 cross-module ERP synchronization remains outstanding.

## Stage 3 — ERP synchronization
- Increment 1 DONE: Approved/Loading Confirmed Smart Load Plan status is synchronized to linked Orders.
- Loading confirmation is propagated to existing matching LRs, including load-plan number/status and planned truck where applicable.
- Generate LR detects an order's Smart Load Plan and blocks road LR finalisation until that plan is Loading Confirmed.
- LR 360 shows its Smart Load Plan and gates Dispatch when a linked plan exists but loading is not confirmed.
- Existing workflows without a Smart Load Plan remain usable; gating applies only when a plan is linked.
- Next: warehouse/vehicle-planning operational queue and loading confirmation quantities, then dispatch audit synchronization.
- Stage 3 increment 3 DONE: Smart Load Plan now has physical loading reconciliation by cargo line (planned, loaded, damage, shortage, variance), supervisor and remarks.
- Loading confirmation is blocked until every planned package is accounted for and a supervisor is recorded.
- Confirmed reconciliation persists on the load plan, feeds the Warehouse road load-plan queue actual quantity/variance, and writes a Smart Load Confirmed event to linked LR audit history.
- Stage 3 increment 4 DONE: Dispatch modal now performs a visible readiness checklist for linked Smart Load Plans: LR finalised, plan loading-confirmed, physical quantities reconciled, selected vehicle matches the approved plan, and driver assigned for own-fleet movement.
- Dispatch is blocked when any linked-plan readiness check fails. On successful dispatch, LR, linked Order and Smart Load Plan are synchronized; the plan records dispatch time, LR and truck and moves to Dispatched.
- Stage 3 increment 5 DONE: Road delivery and POD now synchronize the linked Smart Load Plan and Order. Delivery moves the plan/order chain to Delivered; POD receipt moves it to POD Received and records timestamps/LR references while preserving the LR's existing billing eligibility workflow.
- Stage 3 increment 6 DONE: Billing and client receipts now close the same Level-3 walkthrough chain. Bill generation synchronizes bill reference/status to the linked Smart Load Plan and Order. Client receipts synchronize Partial or Paid status; full settlement stamps the paid timestamp while the existing receivable/ledger posting remains authoritative.
