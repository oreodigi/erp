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
- Benchmark the internal heuristic against external open-source engines on reproducible fixtures before deciding whether to add a service.
- DONE: Goods Master now carries dimensions, orientation, stacking layers and max top-load weight; Fleet truck form now carries loading-space dimensions and max payload.
- Planner consumes those master values where present, with presets/fallbacks for demo records.
- DONE: top-load weight and maximum stacking-layer constraints are enforced by the geometric validator.
- DONE: multi-stop rear-door accessibility validation, loading/unloading sequences and approval blocking when later-stop cargo obstructs an earlier stop.
- DONE: selected packages support validated floor rotation / forward rotation in addition to coordinate editing.
- Printable 3D loading diagram / richer loading instruction.
- Performance fixtures for larger manifests.

## Stage 3 — pending
Synchronize approved plans with VP/Warehouse/LR/DC and Dispatch readiness, actual loaded quantities, exceptions and overrides.

## Operational caveat
Goods-master geometry is used where available; missing values are estimates. Vehicle interior dimensions are editable planning values. This is not certified axle, securement or stability analysis.
