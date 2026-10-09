# Smart Load Planning — QA Matrix
- LP-01 One box fits and is valid.
- LP-02 Oversized box remains unplaced.
- LP-03 Excess payload leaves cargo unplaced.
- LP-04 Collision is rejected.
- LP-05 Stacking on non-stackable cargo is rejected.
- LP-06 Unsupported elevated package is rejected.
- LP-07 Rotation disabled respects original dimensions.
- LP-08 Rotation enabled considers orthogonal orientations.
- LP-09 Cargo changes invalidate previous optimization.
- LP-10 Vehicle changes invalidate previous optimization.
- LP-11 Save/reopen reproduces plan.
- LP-12 Existing order ID is linked.
- LP-13 Existing fleet truck ID is linked.
- LP-14 Approval blocked for unplaced cargo.
- LP-15 Manual edits cannot create invalid placement.
- LP-16 Responsive 3D interface tested on mobile.
- LP-17 >500 packages explicitly identified as unplaced.
- LP-18 Cross-module VP/LR/Dispatch synchronization is a Stage-3 gate. — PASS / implemented.
- LP-19 Loading confirmation requires supervisor and zero reconciliation variance.
- LP-20 Approved plan inputs cannot be re-optimized or mutated.
- LP-21 Linked Order operational fields are locked after load-plan approval.
- LP-22 Linked LR operational fields are locked after load-plan approval and after dispatch/delivery/billing.
- LP-23 Dispatch requires finalised LR, Loading Confirmed plan, reconciled loading, planned vehicle and required driver.
- LP-24 Duplicate dispatch/trip creation is rejected.
- LP-25 Delivery is rejected before dispatch and duplicate delivery is rejected.
- LP-26 POD is rejected before delivery and duplicate POD is rejected.
- LP-27 POD deletion is rejected after billing; otherwise workflow rolls back to Delivered.
- LP-28 Bill generation propagates Billed to linked Order/Smart Load Plan.
- LP-29 Partial receipt propagates Payment Partial; full settlement propagates Paid.
- LP-30 Bill deletion / LR removal is blocked while receipts exist.
- LP-31 Receipt deletion recalculates remaining Billed / Payment Partial / Paid state.
- LP-32 Quick POD matches the primary Delivered-without-POD eligibility rule.
- LP-33 Quick Billing matches primary Finance billing/POD eligibility.
- LP-34 Order 360, LR 360, Warehouse and Bill 360 expose linked Smart Load workflow navigation.
- LP-35 Printable top/side projection package numbering matches the loading sequence.

## Automated validation status — 9 October 2026
`npm run test:load` passes geometry, oversize, payload, non-stackable, rotation, independent validation, overflow, vehicle recommendation, multi-vehicle split, report model, multi-stop accessibility, loading/unloading sequence, manual rotation and reproducible optimizer benchmarks. `npm run build` also passes TypeScript and production Vite build validation.

Current reproducible optimizer fixtures: Mixed industrial 45/50 placed; Dense cartons 120/120; Heavy multi-stop 68/80.
