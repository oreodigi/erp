# Smart Load Planning — Progress
Started: 9 October 2026.
## Final technology
Original TypeScript 3D packing heuristic and independent validator; Three.js / React Three Fiber / Drei for interactive rendering. Benchmark candidates: skjolber/3d-bin-container-packing (Apache-2.0) and fontanf/packingsolver (MIT). No commercial code or unverified GitHub algorithm copied.
## Stage 1 implemented
- Operations > Smart Load Planning route (also simple Bookings menu).
- ERP Order row action > Smart Load Plan.
- Existing Orders, Goods master and Fleet selections integrated.
- Editable manifest, vehicle geometry, automatic 3D packing, utilization, exceptions.
- Interactive 3D viewer and validated coordinate edits.
- Shared ERP state saved/reopened plans; plan approval and loading-confirmed status.
- Downstream VP Loading and LR navigation (not yet automated cross-module status changes).
## Validation
- PASS: automated engine fixtures for fit, oversize, payload, nonstack, rotation, collision, support and >500 item handling.
- PASS: TypeScript + Vite production build (nonfatal large-chunk warning).
- Browser end-to-end verification of authenticated workflow remains pending.
## Remaining stages
Stage 2: benchmark engines, cargo/vehicle masters, printable reports, multivehicle and robust constraints.
Stage 3: synchronized VP, Warehouse, LR/DC and Dispatch gating; actual load verification.
Stage 4: multistop accessibility, palletization and advanced weight distribution.
## Operational caveat
Goods master geometry is used where available; missing values are estimates. Vehicle interior dimensions are editable estimates. No certified axle, securement or stability analysis.
