# Training Academy API

Server-side progress tracking for the Training Academy (`api/training.mjs`). The original course and lesson endpoints still work as before. Everything below is covered by `api/tests/api.test.mjs` (`cd api && npm test`).

Every endpoint needs a valid bearer session (`401` otherwise). JSON bodies are limited to 4096 bytes, matching the gateway cap: a larger body gets `413` and invalid JSON gets `400`. Error responses take the form `{error:"message"}`.

## Tables (`sql/10_users_training_academy.sql`)

| Table | Purpose |
|---|---|
| `app.training_records` | One row per `(user_id, kind, item_id)`. Columns: `status`, `score numeric(5,2)` (0–100 or null), `detail jsonb` (`octet_length(detail::text) <= 3000`), `started_at`, `completed_at`, `updated_at`. Indexed on `(user_id, updated_at DESC)`. `ON DELETE CASCADE` from `app.users`. Users are only ever soft-deleted, so history is kept. |
| `app.training_quiz_attempts` | Append-only attempts. Columns: `quiz_id`, `score`, `correct`, `total`, `passed`, `wrong text[]`, `duration_seconds`, `created_at`. Indexed on `(user_id, quiz_id, created_at DESC)`. |
| `app.training_settings` | Key/value `jsonb` with `updated_by` and `updated_at`. The migration seeds the key `readiness`. |

- **Kinds:** `onboarding, lesson, tour, hint, exercise, workflow, audio, screen`.
- **Statuses:** `started, completed, dismissed, understood, passed, failed, skipped, heard`.
- **Ids:** `item_id`, `quiz_id` and each entry in `wrong` must match `^[a-z0-9][a-z0-9:/._-]{0,119}$`.

Default `readiness`:
```json
{"weights":{"lessons":25,"tours":10,"practice":30,"quiz":25,"workflow":10},
 "thresholds":{"learning":1,"practising":35,"assessment":60,"ready":85},
 "passPct":70,"minPracticePct":60}
```

### Grants
Grants are applied only if the role exists:
- `sk_erp_reader`: `SELECT` on all three tables.
- `sk_erp_writer`: `SELECT, INSERT, UPDATE, DELETE` on records; `SELECT, INSERT` on attempts; `SELECT, INSERT, UPDATE` on settings.

## Endpoints

### `GET /api/training/me`
Returns the caller's own progress:
```json
{"user_id":"12",
 "records":[{"kind","item_id","status","score","detail","started_at","completed_at","updated_at"}],
 "quizzes":[{"quiz_id","attempts","best","last","passed","last_at","wrong"}],
 "settings":{"readiness":{...}}}
```
In each quiz summary:
- `best` is the highest score.
- `last` is the score of the latest attempt.
- `passed` is true if **any** attempt passed.
- `wrong` is the wrong-answer ids from the latest attempt.

### `POST /api/training/records`
Body: `{kind, item_id, status, score?, detail?}`. Upserts the **caller's** record on `(user_id, kind, item_id)` and returns `{record}`.
- `started_at` keeps the value from the first insert.
- `completed_at` depends on `status`:
  - `completed`, `passed`, `understood`, `heard`, `dismissed` or `skipped` set it to `now()`.
  - `started` keeps any existing `completed_at`, so revisiting an item does not erase that it was finished.
  - `failed` clears it to `NULL`.
- If `score` or `detail` is omitted on update, the stored value is kept. `detail` must be a JSON object.
- Validation matches the database checks. A bad kind, id, status or score, a non-object `detail`, or a `detail` over 3000 bytes gets `400`. A `detail` that only goes over the limit once PostgreSQL formats it as `jsonb` text is rejected by the CHECK constraint and also reported as `400`.

### `POST /api/training/reset`
Body: `{kind}`, where `kind` is `onboarding`, `tour` or `hint`. Deletes the caller's records of that kind and returns `{deleted:n}`. Use it for "restart onboarding" or "show tips again". Any other kind gets `400`.

### `POST /api/training/quiz-attempts`
Body: `{quiz_id, score, correct, total, passed, wrong:[ids], duration_seconds?}`. Returns `201 {attempt, summary}`, where `summary` has the same shape as a `/me` quiz entry.

Validation (`400` on failure):
- `total` is an integer from 1 to 200.
- `correct` is an integer from 0 to `total`.
- `score` is a number from 0 to 100, within ±1 of `correct/total*100`.
- `passed` is a boolean.
- `wrong` is an array of at most `total` valid ids.
- `duration_seconds` is a non-negative integer or null.

The server does not check `passed` against `passPct`; the client decides it.

### `GET /api/training/settings`
Any session can call this. Returns `{readiness}`.

### `PUT /api/training/settings`
Only `admin` and `superadmin` can call this; other roles get `403`. Body: `{readiness:{weights, thresholds, passPct, minPracticePct}}`, with exactly these keys.

Validation:
- `weights` must have exactly the keys `lessons, tours, practice, quiz, workflow`. Each is an integer from 0 to 100, and they must sum to 100.
- `thresholds` must have exactly the keys `learning, practising, assessment, ready`. Each is an integer from 0 to 100, and they must strictly increase: `learning < practising < assessment < ready`.
- `passPct` is an integer from 40 to 100.
- `minPracticePct` is an integer from 0 to 100.

The settings row is upserted, and an audit event is written: `entity_type='training_settings'`, `entity_id='readiness'`, with before and after states. Returns `{readiness, updated_at}`.

### `GET /api/training/team`
Only `admin`, `superadmin`, `manager` and `hr` can call this; other roles get `403`. Covers every non-deleted user:
```json
{"users":[{"id","username","full_name","role","branch_code","department","designation","active",
  "last_login_at","last_activity_at",
  "records":[{"kind","item_id","status","score"}],
  "quizzes":[{"quiz_id","attempts","best","last","passed"}]}]}
```
`last_activity_at` is the latest record update or quiz attempt.

### `GET /api/training/users/:id`
Same roles as `/team`. Returns:
```json
{"user":{"id","username","full_name","role","branch_code","department","designation","active","email","phone","last_login_at","created_at","deleted_at"},
 "records":[full records],
 "attempts":[{"id","quiz_id","score","correct","total","passed","wrong","duration_seconds","created_at"}]}
```
`attempts` holds the last 100 attempts, newest first. Soft-deleted users can be viewed, so their history survives. An unknown or invalid id gets `404`.

### Existing endpoints (unchanged)
- `GET /api/training`
- `POST /api/training/progress`
- `POST /api/training/courses` (admin, superadmin or manager)
- `POST /api/training/lessons` (admin, superadmin or manager)

## Role summary

| Endpoint | Allowed roles |
|---|---|
| `/me`, `/records`, `/reset`, `/quiz-attempts`, `GET /settings` | Any signed-in user (acts on their own data) |
| `/team`, `/users/:id` | `admin`, `superadmin`, `manager`, `hr` |
| `PUT /settings` | `admin`, `superadmin` |

## Gateway

`deploy/public_html/erp-gateway.php` whitelists each path with strict methods. A wrong method gets `405` and an unknown path gets `404`:

| Path | Methods |
|---|---|
| `/api/training` | GET |
| `/api/training/progress`, `/api/training/courses`, `/api/training/lessons` | POST |
| `/api/training/me`, `/api/training/team` | GET |
| `/api/training/records`, `/api/training/reset`, `/api/training/quiz-attempts` | POST |
| `/api/training/settings` | GET, PUT |
| `/api/training/users/{id}` | GET |

Training request bodies are capped at 4096 bytes by the gateway.

## Not implemented

- Rate limiting on training writes.
- Server-side readiness scoring. The settings are stored and served, and the client computes readiness from them.
