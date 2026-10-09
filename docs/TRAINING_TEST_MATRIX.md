# Training Academy Test Matrix

## Automated frontend/content
Run `npm run test:training`.
- route coverage
- stale/invalid route references
- duplicate content IDs
- question → screen integrity
- screen → quiz/exercise integrity
- workflow → screen/exercise/lesson integrity
- lesson → screen/prerequisite/question integrity
- all 9 role curricula non-empty and de-duplicated
- permission filtering
- readiness Not Started and Ready boundaries
- quiz correct/incorrect scoring
- quiz retake/best-score merge

## API integration
Run `cd api && npm test`.
Covers login/profile, create/edit users, role/permission changes, activation/deactivation, reset password, soft delete, protected Super Admin/self operations, training persistence/reset, quiz attempts, team/user views, training settings and audit events.

## Release regression
Run `npm run test:load`, `npm run test:training`, `npm run build` and API tests. Verify production health, authenticated Academy/User Management API and responsive UI.
