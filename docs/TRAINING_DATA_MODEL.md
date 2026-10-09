# Training Academy Data Model

## User extensions
Migration `sql/10_users_training_academy.sql` extends `app.users` with profile, branch/department/designation, per-user permission overrides, login/password metadata, soft-delete metadata and audit ownership fields.

## app.training_records
One current progress record per employee + kind + item. Kinds cover onboarding, lessons, tours, hints, exercises, workflows, audio and screen activity. Stores status, optional score/detail and completion/update timestamps.

## app.training_quiz_attempts
Append-only quiz attempt history used to derive attempts, best/last score, passed state and weak topics.

## app.training_settings
Stores configurable readiness weights/thresholds and minimum practice requirements.

## Server ownership
Training records are keyed to the authenticated user. Admin/team endpoints can read employee readiness subject to role checks. Browser local storage is only a retry/fallback cache; it is not the authoritative training database when the API is available.
