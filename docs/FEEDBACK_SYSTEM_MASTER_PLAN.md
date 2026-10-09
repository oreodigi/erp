# ERP Feedback & Review — Build Plan

## Objective
Make ERP SK itself the structured UAT/feedback platform for demo reviewers. Every authenticated user can submit feedback from the exact ERP context they are viewing; admins get a central triage and development-review inbox.

## Data captured automatically
Authenticated user/role, route/screen, module, current route params/record context, Practice vs Company mode, client timestamp and basic browser/device metadata.

## Submission inputs
- Type: Bug / Improvement / Missing Feature / Confusing / Data Issue / Training-Help / Other.
- Impact: Low / Medium / High / Blocking.
- Free text plus repeatable bullet points.
- Voice recording from MediaRecorder with playback/re-record.
- Images and business documents.
- Attachments can be combined with text/voice in one feedback item.

## Stage 1 — Core capture
1. PostgreSQL feedback, points, attachments, comments/history schema.
2. Authenticated feedback API with ownership and admin permissions.
3. Protected file storage outside public web root; validated type/size and authenticated download.
4. Global Give Feedback action in AppShell.
5. Responsive Feedback drawer with automatic screen/record context.
6. Voice recorder, attachment picker/previews and submission.
7. My Feedback list/status.

## Stage 2 — Admin Feedback Centre — COMPLETE
Administration → Feedback & Review now provides KPI cards, search/status/module/impact filters, Feedback 360 context, active-user assignment, status/impact triage, protected attachment/audio review, internal notes, user-visible discussion, resolution notes and API-backed duplicate/reopen lifecycle support.

Lifecycle: New → Reviewing → Accepted → Planned → In Development → Ready for Testing → Fixed → Verified → Closed. Alternate: Duplicate / Not Planned / Need More Information.

## Stage 3 — ERP/training integration — IN PROGRESS
Completed: screen/route/record context, Company/Practice mode context, Help & Training coverage for Feedback & Review, user-visible discussion, resolution visibility in My Feedback, and submitter fix verification (Verified / Still needs work). Remaining: targeted section-level context for selected high-value cards and direct lesson/exercise identifiers where useful.

## Stage 4 — Analytics & QA — IN PROGRESS
Completed: admin-only module/screen/role/type aggregation API, feedback hotspot panel, most-confusing-screen panel, attachment security tests and API integration coverage. Remaining: export, dedicated mobile/desktop visual QA and final end-to-end acceptance pass.

## Security/demo rules
- Never store uploads in PostgreSQL blobs.
- Never expose filesystem paths.
- Validate extension, MIME, size and ownership.
- No executable/script uploads.
- Voice/image/docs only; conservative size/count limits.
- Normal users see their own submissions; Admin/Super Admin/Manager can triage all.
- Feedback failure must never block ERP operational workflows.
- Preserve audit history rather than destructive deletes.

## Definition of done
A reviewer can be on any ERP route, press Give Feedback, record voice and/or attach files and/or enter text/points, submit it with automatic context, later see its status, while an admin can triage, resolve and analyze it centrally.
