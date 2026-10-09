# Practice Mode Architecture

Practice Mode uses the ERP sample dataset as an isolated browser-side sandbox.

## Safety
- `source !== 'legacy'` identifies practice/sample state.
- Shared ERP PostgreSQL persistence is disabled for sample data.
- Returning to company mode reloads live state from the server.
- Reset Practice Data restores the original sample dataset only.
- A persistent global Practice Mode banner is shown while the sandbox is active.

## Exercises
Each exercise defines watched collections and ordered steps. Starting captures a baseline. Checkers compare the current practice state with that baseline and return Pass/Needs correction evidence. Passing is saved to the authenticated employee's server-backed training record.

The sandbox therefore trains real ERP interactions without mutating company/historical records.
