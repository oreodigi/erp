# Training Academy + User Management: implementation status

Status as of 9 Oct 2026, 15:15 IST. Nothing has been committed or pushed yet. All work is in the local working copy of `oreodigi/erp` (branch `main`).

Legend: **Done + tested**, **Done, not yet tested in a browser**, **Pending**.

---

## 1. Files created / changed

### Database
| File | Status | What it does |
|---|---|---|
| `sql/10_users_training_academy.sql` (new) | Done + tested | Idempotent migration. Adds to `app.users`: `full_name`, `email`, `phone`, `branch_code`, `department`, `designation`, `extra_permissions[]`, `denied_permissions[]`, `last_login_at`, `password_changed_at`, `must_change_password`, `deleted_at`, `created_by`, `updated_at`. New tables `app.training_records`, `app.training_quiz_attempts`, `app.training_settings` (default readiness thresholds). Grants only run if the role exists. |

### API (`api/`)
| File | Status | What it does |
|---|---|---|
| `api/users.mjs` (new) | Done + tested | User management for superadmin and admin: list (with training summary), create (one-time temporary password, forced change at first login), edit profile/role/permissions, activate/deactivate, soft delete, reset password. Safeguards: you can't act on your own account; the last Super Admin is protected; an admin can't touch a Super Admin. All changes are audited, and passwords are never logged. Role/permission changes and deactivation end that user's sessions. |
| `api/training.mjs` | Done + tested | New endpoints: `GET /api/training/me`, `POST /records`, `POST /reset`, `POST /quiz-attempts`, `GET /team`, `GET /users/:id`, `GET/PUT /settings`. The old endpoints are unchanged. |
| `api/server.mjs` | Done + tested | Port and database can be set by env (defaults unchanged). Login accepts only active, non-deleted users, records the last login and returns the full profile. `/auth/me` re-reads the account from the database. Password change clears the must-change flag. Bad request bodies get 400/413 instead of 503. |
| `api/auth.mjs` | Done + tested | Sessions remember the user id; adds `revokeUserSessions()`. |
| `api/tests/api.test.mjs` (new), `api/package.json` (`npm test`) | Done + tested | Integration tests on a throwaway PostgreSQL 16. **Result: 33 passed, 0 failed.** |

### Gateway
| File | Status | What it does |
|---|---|---|
| `deploy/public_html/erp-gateway.php` | Done, checked with `php -l` and a PHP CLI run | Adds the new routes to the whitelist with the allowed methods per route (including DELETE/PATCH/PUT). |

### Frontend (`source/sk-erp/`)
| File | Status | What it does |
|---|---|---|
| `src/store/store.ts` | Done, type-checked | **Safety fix:** practice/sample data can never be uploaded to the shared PostgreSQL ERP state. Returning from practice reloads live data from the server. "Reset" on company data now reloads from the server. Adds `usePrincipal` (the signed-in server account). |
| `src/components/AppShell.tsx` | Done, type-checked | Name and per-user permission overrides come from the server account. |
| `src/features/secure-portal.tsx` | Done, type-checked | Loads training progress at sign-in and sends temporary-password users to Change Password. |
| `src/App.prototype.tsx` | Done, type-checked | Blocks every other screen until a temporary password is changed. Mounts the practice runner and the screen-help host. |
| `src/features/admin.tsx` | Done, type-checked | The Change Password rule now matches the server (12+ characters, letters and numbers), and the must-change flag is cleared after a change. |
| `src/nav.ts` | Done | Change Password is open to every role. New menu items: Training Dashboard and Training Coverage. |
| `src/pages.tsx` | Done | Route `help` now opens the Academy; `access/users` and `access/credentials` open the new User Management screen; adds `admin/training` and `admin/training-coverage`. |
| `src/lib/api.ts` | Done | Client calls for the new user and training endpoints. |
| `vite.config.ts` | Done | Local-only API proxy (active only when `SK_API_PROXY` is set). |
| `scripts/dev-stack.mjs` (new) | Done + used | Local full stack: throwaway PostgreSQL, the real API, sample data, dev-only logins, and Vite. |
| `src/training/types.ts`, `check.ts` | Done (already existed, extended) | Content data types and practice-checker helpers. |
| `src/training/content/*.ts` (9 module files) | Done (already existed) | All 121 ERP routes have training metadata. 210 quiz questions, 39 practice exercises, 14 workflows, 27 concept lessons. |
| `src/training/content/getting-started.ts` (new) | Done, validated | 7 Getting Started lessons, plus a Role lesson and a Daily Work lesson for each of the 9 roles, with Hinglish audio. |
| `src/training/content/glossary.ts` (new) | Done, validated | 66 ERP terms. |
| `src/training/modules.ts`, `config.ts`, `registry.ts`, `curriculum.ts`, `progress.ts`, `quiz.ts`, `store.ts`, `practice.ts`, `useLearner.ts` (new) | Done, type-checked; no unit tests yet | Registry over all content; role curriculum built from role + permissions with no duplicates; readiness weights and thresholds configurable; progress, readiness, weak topics and next step; quiz scoring for all 6 question types; server-synced progress store with an offline fallback; practice sandbox and exercise checking. |
| `src/features/academy.tsx`, `src/training/ui/*.tsx` (CourseCard, ProgressCard, RoleReadiness, LessonViewer, WorkflowTrainer, QuizPlayer, PracticeExercise, PracticeHost, Glossary, common) | **Written, compiles, NOT yet tested in a browser** | Academy home, lesson viewer with audio, workflow trainer, quiz player, practice runner. This work was interrupted mid-way, so it may be incomplete. |
| `src/features/user-admin.tsx`, `src/features/training-admin.tsx`, `src/features/admin-ui/*.tsx` | **Written, compiles, NOT yet tested in a browser** | User Management, Training Dashboard with employee profile, Training Coverage matrix. This work was interrupted mid-way, so it may be incomplete. |
| `src/training/ui/ScreenHelp.tsx` | Placeholder only | Contextual screen help: pending. |

### Docs
| File | Status |
|---|---|
| `docs/USER_MANAGEMENT.md` (new) | Done |
| `docs/TRAINING_API.md` (new) | Done |
| `docs/TRAINING_CONTENT_GUIDE.md` (already existed) | Done |
| `docs/TRAINING_ACADEMY_STATUS.md` (this file) | Done |

---

## 2. Pending

1. **Finish and browser-test the Academy UI.** Check: Academy home, lessons with audio, workflow trainer, quiz end-to-end, practice exercise start → check → finish, and that progress survives a reload. Check at phone and desktop sizes.
2. **Finish and browser-test the admin UI.** Check: create user, one-time password, new user forced to change password, edit/permissions, deactivate/reset/delete, refusal cases, Training Dashboard, employee profile, coverage matrix, readiness settings.
3. **Contextual screen help (Phase 5).** Replace the page-tip banner with a ScreenHelp drawer that shows what/why/when, before/after, walkthrough, fields, statuses, mistakes, related lesson, Practice this and Listen. Hints and screen tours become server records.
4. **Onboarding on server records.** The welcome, app tour and page tips still use browser storage (`toursDone`) and need to move to `training_records`. Onboarding needs continue, skip, resume and restart.
5. **Global "Practice mode" banner** shown on every screen while sample data is active.
6. **`npm run test:training`.** It must check: routes without training, lessons with invalid routes, quizzes pointing to missing items, broken workflow steps, duplicate IDs. It also needs an explicit exclusion list (for example `access/credentials`, which is an alias of `access/users`).
7. **Unit tests:** curriculum per role, permission filtering, prerequisites, progress and readiness, quiz scoring and retakes, practice completion.
8. **Full end-to-end QA on the local stack.** Run: admin creates employee → employee logs in → onboarding → curriculum matches role → lesson opens the correct screen → hints → practice isolated → exercise passes → quiz saved → logout/login keeps progress → admin sees readiness. Then run the existing load-planning tests and `npm run build`.
9. **Docs:** architecture, data model, coverage matrix, role curriculum matrix, practice-mode architecture, quiz model, test matrix. Update `FEATURES.md` and `CHANGELOG.md`.
10. **Commit and push to `main`.**
11. **Production deployment.** This needs server access I don't have:
    - Back up the database, then run `sql/10_users_training_academy.sql` as postgres.
    - Copy `api/users.mjs` and the changed API files, then restart the API service.
    - Frontend and gateway deploy through the cPanel webhook after the push.
    - Until the API is updated, the frontend falls back to keeping training progress on the device and shows a notice. Creating users will show an error until then.

## 3. Known issues found during the audit
- **Fixed:** Practice Mode could overwrite the shared company data in PostgreSQL. This affects production today.
- **Fixed:** Most roles could not open Change Password.
- **Fixed:** Generated reset passwords sometimes had no digit, so about 1 in 60 resets failed.
- **Open:** sessions are held in memory, so restarting the API signs everyone out (existing behaviour).
- **Open:** quiz scores are calculated in the browser. The server checks that each score is consistent, but it does not re-score the answers.
