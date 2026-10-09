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

## Stage 3 — ERP/training integration — COMPLETE
Screen/route/record context, Company/Practice mode, Help & Training coverage, user-visible discussion, resolution visibility, submitter fix verification and optional page-section context are integrated. The feedback drawer discovers labelled/tour sections on the current ERP screen and stores the selected section with the submission, while screen IDs continue to map to the Training registry.

## Stage 4 — Analytics & QA — IN PROGRESS
Completed: admin-only module/screen/role/type aggregation API, module hotspot panel, most-confusing-screen panel, filtered CSV export, attachment security tests, analytics authorization tests and a full API end-to-end acceptance lifecycle from employee submission through admin review/fix to submitter verification. The acceptance pass exposed and fixed the owner-verification API permission mismatch. Remaining before marking complete: dedicated authenticated mobile/desktop visual QA. The 2026-10-09 live-browser attempt reached tejum.in but the available pranav credential was rejected, so visual QA was not falsely marked as passed.

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
