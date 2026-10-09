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

## Stage 2 — Admin Feedback Centre
Administration → Feedback & Review: KPIs, filters, Feedback 360, assignment, status, internal notes, resolution, duplicate/reopen flow and attachment/audio review.

Lifecycle: New → Reviewing → Accepted → Planned → In Development → Ready for Testing → Fixed → Verified → Closed. Alternate: Duplicate / Not Planned / Need More Information.

## Stage 3 — ERP/training integration
Section-level feedback context for important cards, Training lesson/exercise context, Practice mode context, fix-verification by submitter, admin screen feedback counters.

## Stage 4 — Analytics & QA
Module/role/screen/type/status analytics, most confusing screens, exports, mobile/desktop QA, attachment security tests, API integration tests and end-to-end acceptance.

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
