# Smart Load Planning — ERP SK Implementation Plan
Version 1.0 · 9 October 2026

## Product decision
Build an owned, functional 3D rectangular cargo planner in the existing React/Vite/TypeScript ERP. Reuse existing Orders, Fleet, Vehicle Planning, Warehouse, LR and Dispatch references. Do not copy commercial products.

## Final technology selection
- React + Vite + TypeScript, existing Zustand shared PostgreSQL ERP state.
- Three.js, @react-three/fiber v8 and @react-three/drei v9 for 3D rendering.
- Initial engine: original deterministic TypeScript extreme-point heuristic at src/lib/load-planning.ts; no third-party algorithm source copied.
- Benchmark candidate: skjolber/3d-bin-container-packing (Apache-2.0, Java); use only if performance/quality warrants an extra service.
- Alternative: fontanf/packingsolver (MIT, C++). Benchmark reference: enzoruiz/3dbinpacking (Python).
- Goodloading, CargoTetris, EasyCargo are UX/feature references, not source dependencies.
- Verify dependency licenses and notices before any code reuse.

## Integration contract
Booking → Order → Vehicle Planning → Smart Load Planning → Approval → VP Loading → LR → Dispatch → Delivery → POD.
A saved plan links to db.orders[].id and db.trucks[].id; it does NOT automatically change order, LR or dispatch status in Stage 1.
Store records in db.loadPlans[] through existing shared ERP state (not localStorage).
Routes: ops/smart-load, ops/vp-planning, ops/vp-loading, ops/lr.
Files: src/lib/load-planning.ts, src/features/smart-load-planning.tsx, src/nav.ts, src/pages.tsx.

## Stage 1 — working baseline
- Select an existing ERP order or use sample cargo.
- Enter/adjust cargo dimensions, weight, quantity, rotation, stackability, stop number.
- Select ERP truck and edit its interior dimensions and max payload.
- Run actual geometric packing; validate collisions, bounds, stacking support and payload.
- Render 3D arrangement with orbit/zoom and selected-package coordinate editing.
- Display loaded/unplaced cargo and volume/weight utilization.
- Save/reopen plans in shared ERP state, approve plan and confirm loading status.
- Expose navigation to VP Loading and LR.

## Stage 2 — optimizer improvement
Benchmark 3+ engines against reproducible fixtures; improve packing quality, multivehicle recommendations, multistop access, stacking limits, manual rotation and printable loading reports. Add reusable cargo/vehicle dimension masters.

## Stage 3 — full ERP walkthrough
Wire approved plans into VP/warehouse loading verification, LR/DC allocations and dispatch readiness. Track actual loaded quantities, exceptions, overrides and delivery reconciliation. Preserve original records and avoid duplicate sources of truth.

## Stage 4 — advanced features
Palletization, multi-stop LIFO accessibility, axle/center-of-gravity calculations only with verified vehicle specifications, async optimization and large-shipment benchmarks.

## Known limitations
Cargo dimensions and weights use the Goods master when available; missing values are editable estimates. Package units require verification. Truck interior dimensions are estimates. The first engine is heuristic, not mathematically optimal or safety certified. Axle loading, securing, true stability and multistop access are NOT certified. Do not market it as a safety-approved loading instruction.

## QA and release
Run npm run test:load and npm run build. Check oversize, overweight, nonstackable, rotation, collision, support, save/reopen and linked IDs. Commit/push GitHub main, deploy dist to /home/tejum/public_html, verify live. Do not touch unrelated domains or secrets.
