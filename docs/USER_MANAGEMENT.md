# User management

Server-side account administration for the SK Translines ERP API (`api/users.mjs`, wired from `api/server.mjs`). Everything described here is covered by `api/tests/api.test.mjs` (`cd api && npm test`).

## Who can manage users

| Actor role | Can do |
|---|---|
| `superadmin` | Everything below, including managing other Super Admin accounts and assigning the `superadmin` role. |
| `admin` | List, create, edit, reset passwords for, deactivate and delete any account **except** a `superadmin` account. Cannot assign the `superadmin` role. |
| any other role | `403 Administrator permission required` on every `/api/admin/users*` endpoint. |

The actor's role is re-read from `app.users` on every admin request. If the actor's account is no longer active or has been deleted, the request gets `401` and all of the actor's sessions are revoked.

## Safeguards

- **Admin vs Super Admin.** An `admin` who tries to change, reset, deactivate or delete a `superadmin` account gets `403`. An `admin` who tries to create a user as `superadmin`, or change a user's role to `superadmin`, also gets `403`.
- **Last Super Admin.** Nobody can deactivate, delete or demote the last active, non-deleted `superadmin`. The API returns `409 The last active Super Admin cannot be deactivated, deleted or demoted`. This check runs before the self-protection check, so the only Super Admin gets a `409` even when acting on their own account.
- **Self-protection.** Nobody can deactivate (`400 You cannot deactivate your own account`), delete (`400`) or change the role (`400`) of their own account. Users can still edit their own profile fields.
- **Serialisation.** Every account change runs in a transaction that holds a PostgreSQL advisory lock (`pg_advisory_xact_lock`). This stops two concurrent requests from both passing the last-Super-Admin check.
- **Audit.** Every change writes a row to `app.audit_events` with `entity_type='auth_user'`, the actor, `before_state` and `after_state`. The actions are `account_create`, `account_update`, `account_delete`, `password_reset` and `password_changed` (self-service). Audit state never contains `password_hash` or any password.

## Session revocation

Sessions are kept in memory, in `api/auth.mjs`. Each session records its user id, and `revokeUserSessions(userId)` drops every session that user has. All of the target's sessions are revoked on:

- deactivation (`active:false`)
- soft delete
- a role change
- a change to `extra_permissions` or `denied_permissions` (re-sending the same set, in any order, does **not** revoke)
- an admin password reset

Edits to profile fields (`full_name`, `email`, `phone`, `branch_code`, `department`, `designation`) do not revoke sessions. `GET /auth/me` re-reads the account from the database on every call, so these edits show up straight away. If the account is missing, inactive or deleted, `/auth/me` revokes that session and returns `401`.

## Endpoints

All of these need `Authorization: Bearer <token>`. JSON bodies are limited to 4096 bytes: a larger body gets `413` and invalid JSON gets `400`.

### `GET /api/admin/users[?include_deleted=1]`
Returns `{users:[…]}`, sorted by username. Each user has these fields:
`id, username, role, active, created_at, full_name, email, phone, branch_code, department, designation, extra_permissions, denied_permissions, last_login_at, must_change_password, deleted_at, updated_at, training:{lessons_completed, records, last_activity_at, quizzes_passed, best_quiz_avg}`.
Soft-deleted users are left out unless `include_deleted=1` is passed. `best_quiz_avg` is the average, across quizzes, of the user's best score on each quiz. It is `null` if the user has no attempts.

### `POST /api/admin/users`
Body: `{username, full_name, role, branch_code?, email?, phone?, department?, designation?, extra_permissions?, denied_permissions?, password?}`

Returns `201 {user, temporaryPassword}`. The new account has `must_change_password=true` and `created_by` set to the actor. If no `password` is given, the server generates a strong one (24 characters, always containing letters and digits). The temporary password appears only in this response.

### `PATCH /api/admin/users/:id`
Accepts any of `full_name, email, phone, branch_code, department, designation, role, active, extra_permissions, denied_permissions`. Returns `{user}`.
- Unknown keys are ignored. This keeps older clients working: they send `{role}` or `{active}`.
- Sending `password` or `password_hash` returns `400`. Use the reset-password endpoint instead.
- An empty change set returns `400 No changes supplied`.
- Soft-deleted users return `404`.

### `DELETE /api/admin/users/:id`
Soft delete. Sets `active=false` and `deleted_at=now()`, and renames the username to `<username>.deleted.<id>` so the original name can be reused. Revokes the user's sessions and returns `{ok:true}`. Hard delete is not offered: training and audit history must survive. Deleting an account that is already deleted returns `404`.

### `POST /api/admin/users/:id/reset-password`
Body: `{password?}`. The body may be empty or `{}`.

Returns `{user, temporaryPassword}`. The reset sets `must_change_password=true` and `password_changed_at=now()`, and revokes the target's sessions. It works only on active, non-deleted users (`404 Active user not found` otherwise).

### Related auth changes
- `POST /auth/login` only accepts accounts that are active and have `deleted_at IS NULL`. On success it updates `last_login_at`. This is best-effort: if the write fails, the error is logged and login continues. The response `user` is `{id, username, role, full_name, branch_code, department, designation, extra_permissions, denied_permissions, must_change_password}`.
- `GET /auth/me` returns the same profile shape, re-read from the database (see above).
- `POST /auth/change-password` also sets `password_changed_at=now()` and `must_change_password=false`.

## Field validation

| Field | Rule |
|---|---|
| `username` | `^[a-zA-Z0-9_.-]{3,64}$`. Uniqueness is case-insensitive (`409 Username already exists`). Names ending in `.deleted.<n>` are reserved. |
| `full_name` | 1–120 characters after trimming. Required on create. |
| `role` | One of `superadmin, admin, manager, operator, operations, dispatcher, accounts, accountant, finance_approver, customer_care, customerrelations, branch_admin, branch_user, container, hr, onboarding, storeincharge, storedirector, fleetmanager, warehousemanager, workshopmanager`. |
| `email` | Optional. Empty, or a simple `a@b.c` pattern of at most 160 characters. |
| `phone` | Optional. At most 20 characters from `[0-9+ -]`. |
| `branch_code` | Optional. `^[A-Za-z0-9_-]{0,12}$`. |
| `department`, `designation` | Optional. At most 80 characters. |
| `extra_permissions`, `denied_permissions` | Arrays of at most 200 unique strings, each matching `^[a-z0-9][a-z0-9/_-]{0,79}$`. |
| `active` | Boolean. |
| `password` | 12–256 characters, with at least one letter and one digit. This is the existing `accountPassword` rule. |

String fields are trimmed before they are stored.

## Database (`sql/10_users_training_academy.sql`)

The migration adds these columns to `app.users`: `full_name, email, phone, branch_code, department, designation` (text, default `''`), `extra_permissions, denied_permissions` (text[], default `{}`), `last_login_at, password_changed_at, deleted_at` (timestamptz), `must_change_password` (boolean, default false), `created_by` (bigint) and `updated_at`. It also adds a non-unique index on `lower(username)`. If `app.users` does not exist, as on a fresh or dev database, the migration creates it.

Grants are applied only if the role exists:
- `sk_erp_reader`: `SELECT` on `app.users`.
- `sk_erp_writer`: `SELECT, INSERT, UPDATE` on `app.users`, plus `USAGE, SELECT` on the sequences in `app`.

## Deployment

1. **Back up first:** `runuser -u postgres -- pg_dump -Fc sk_translines > /root/backups/sk_translines-$(date +%F-%H%M).dump`. Keep the dump out of the repository.
2. **Apply the migration as postgres:** `runuser -u postgres -- psql -d sk_translines -v ON_ERROR_STOP=1 -f sql/10_users_training_academy.sql`. It is idempotent and safe to re-run. Then review the grants with `\dp app.users` and `\dp app.training_*`.
3. **Deploy the API files** (`api/server.mjs`, `api/auth.mjs`, `api/users.mjs`, `api/training.mjs`) to the API directory and run `systemctl restart sk-erp-api`. Check `curl -fsS http://127.0.0.1:3107/health`. Restarting clears every in-memory session, so all users must log in again.
4. **Deploy the gateway:** copy `deploy/public_html/erp-gateway.php`. It adds strict method whitelists for `/api/admin/users` (GET, POST), `/api/admin/users/{id}` (PATCH, DELETE) and `/api/admin/users/{id}/reset-password` (POST).

Environment overrides are optional. Production defaults apply when these are absent: `SK_API_PORT=3107`, `SK_API_HOST=127.0.0.1`, `SK_DB_HOST=127.0.0.1`, `SK_DB_PORT=5432`, `SK_DB_NAME=sk_translines`.

## Behaviour changes to note

- `admin` (not only `superadmin`) can now use the user-administration endpoints, within the rules above.
- Generated passwords now always satisfy the password rule. Before, about 1 in 60 generated reset passwords had no digit, and the reset failed with `400`.
- Body parsing now returns `400` for invalid JSON and `413` for an oversized body. The size limit is counted in bytes, not characters, and an empty body is read as `{}`. Before, these cases returned the route's generic `503`. The new codes apply on admin users, training, work items, communication, ERP state, change-password and login. `/api/dashboard-layout` still returns `503`.
