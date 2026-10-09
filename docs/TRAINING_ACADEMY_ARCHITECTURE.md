# Training Academy Architecture

## Purpose
ERP SK Training Academy is an in-product, role-aware onboarding and competency layer. It trains authenticated employees against the same routes and workflows they will use in the ERP while keeping practice data isolated from company data.

## Runtime architecture
- **Identity/RBAC:** PostgreSQL-backed `app.users`, authenticated sessions, role plus per-user extra/denied permissions.
- **Content registry:** `src/training/registry.ts` aggregates typed screen metadata, lessons, workflows, exercises, questions and quizzes.
- **Curriculum:** `curriculum.ts` filters training by the employee's role and effective route permissions and removes duplicates.
- **Progress:** `store.ts` synchronizes training records and quiz attempts with `/api/training/*`; local persistence is only an outage/older-server fallback.
- **Readiness:** `progress.ts` calculates completion, weighted readiness, blockers, next step, weak topics and status.
- **Practice:** `practice.ts` switches to sample data, captures exercise baselines and evaluates user actions. The ERP store explicitly refuses to upload sample data to shared PostgreSQL state.
- **Context help:** every training-covered route can show a dismissible server-tracked hint and a Screen Help drawer with purpose, timing, before/after, walkthrough, fields/statuses, mistakes, audio, lesson and practice links.
- **Admin:** User Management manages authenticated employees. Training Dashboard and Coverage expose readiness and content coverage.

## Employee lifecycle
Admin creates user → role/permissions assigned → first login forces password change → server-backed onboarding → role curriculum → lessons/audio → contextual tours → isolated practice → quizzes → final assessment → readiness → admin review.

## Content maintenance
Every meaningful route is a stable training screen ID. `npm run test:training` fails on uncovered routes, stale screen references, broken questions/exercises/workflows/lessons, duplicate IDs or incomplete screen help.

## Demo boundary
This is an ERP demo training system, not an external LMS. It intentionally reuses ERP roles, routes and practice state instead of introducing a separate learning platform.
