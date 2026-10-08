# External 3D Packing Engine Assessment — Stage 2

Assessment date: 2026-10-09. This is a documentation/source-feature review, **not** an executed head-to-head benchmark of external engines. No third-party packing engine is installed in the ERP.

| Candidate | Language/license | Relevant documented capabilities | Demo integration cost | Decision |
|---|---|---|---|---|
| fontanf/packingsolver (boxstacks) | C++ / MIT | 3D stacks, rotations, max top weight, maximum stack count, axle limits and unloading constraints | High: compile native binary, bridge process/API, normalize units and validate output | **Best technical candidate for a later controlled benchmark** |
| skjolber/3d-bin-container-packing | Java / Apache-2.0 | LAFF/3D packing, weight and container constraints, deadline-oriented packers, validator | Medium-high: Java service or CLI, output adapter | Backup candidate |
| enzoruiz/3dbinpacking | Python / MIT | Simple 3D packing, multiple bins, weights and rotations | Medium: Python runtime/service; missing SK-specific LIFO/top-load logic | Reference baseline only |

References (official repositories):
- https://github.com/fontanf/packingsolver
- https://fontanf.github.io/packingsolver/boxstacks.html
- https://github.com/skjolber/3d-bin-container-packing
- https://github.com/enzoruiz/3dbinpacking

## ERP SK decision

Keep the TypeScript dual-heuristic engine for the sales demo. It already runs in the browser and uses the ERP's existing shared state; adding a native or Java service now would create operational complexity without a proven demonstration benefit.

Benchmark fixtures are reproducible in `src/lib/load-planning-benchmark.ts`. The in-app benchmark now compares baseline, improved and selected results, runtime, and accessibility alerts. A higher geometric placement count does **not** mean a valid multi-stop plan: door-accessibility exceptions still block approval.

**Before any external engine adoption:** build a disposable, isolated benchmark runner (not production), translate the same fixtures to its input format, normalize results back to `Placement[]`, enforce `validatePlan` and `accessibilityIssues`, record placed count, utilization, elapsed time and invalid outputs, then compare on identical hardware. Verify exact dependency version, license notices, and maintenance at adoption time.

## Known constraints

- Existing stop access is a straight rear-door corridor approximation, not a forklift path simulation.
- Current maximum-layer calculation is approximate for mixed-height stacks.
- No certified axle, load stability, tie-down or road-safety assessment.
- A printed top/side projection is not a true 3D screenshot.
- This assessment does not claim that external engines were built, run or benchmarked.
