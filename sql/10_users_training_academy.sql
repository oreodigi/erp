-- 10: User management profile fields + Training Academy tracking.
-- Idempotent: safe to re-run. Apply as the postgres superuser after a backup:
--   runuser -u postgres -- psql -d sk_translines -v ON_ERROR_STOP=1 -f sql/10_users_training_academy.sql
BEGIN;
CREATE SCHEMA IF NOT EXISTS app;

-- Production creates app.users out-of-band; this only matters for fresh/dev databases.
CREATE TABLE IF NOT EXISTS app.users (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 username text NOT NULL UNIQUE,
 password_hash text NOT NULL,
 role text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app.users
 ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS branch_code text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS designation text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS extra_permissions text[] NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS denied_permissions text[] NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
 ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
 ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
 ADD COLUMN IF NOT EXISTS created_by bigint,
 ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
-- Non-unique helper index for case-insensitive username checks (uniqueness is enforced by the API).
CREATE INDEX IF NOT EXISTS idx_users_lower_username ON app.users(lower(username));

CREATE TABLE IF NOT EXISTS app.training_records (
 user_id bigint NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('onboarding','lesson','tour','hint','exercise','workflow','audio','screen')),
 item_id text NOT NULL CHECK (item_id ~ '^[a-z0-9][a-z0-9:/._-]{0,119}$'),
 status text NOT NULL CHECK (status IN ('started','completed','dismissed','understood','passed','failed','skipped','heard')),
 score numeric(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
 detail jsonb NOT NULL DEFAULT '{}' CHECK (octet_length(detail::text) <= 3000),
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,kind,item_id)
);
CREATE INDEX IF NOT EXISTS idx_training_records_user_updated ON app.training_records(user_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS app.training_quiz_attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 quiz_id text NOT NULL CHECK (quiz_id ~ '^[a-z0-9][a-z0-9:/._-]{0,119}$'),
 score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
 correct integer NOT NULL CHECK (correct >= 0),
 total integer NOT NULL CHECK (total > 0),
 passed boolean NOT NULL,
 wrong text[] NOT NULL DEFAULT '{}',
 duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_user_quiz ON app.training_quiz_attempts(user_id,quiz_id,created_at DESC);

CREATE TABLE IF NOT EXISTS app.training_settings (
 key text PRIMARY KEY,
 value jsonb NOT NULL,
 updated_by bigint REFERENCES app.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app.training_settings(key,value) VALUES ('readiness',
 '{"weights":{"lessons":25,"tours":10,"practice":30,"quiz":25,"workflow":10},"thresholds":{"learning":1,"practising":35,"assessment":60,"ready":85},"passPct":70,"minPracticePct":60}'::jsonb)
ON CONFLICT (key) DO NOTHING;

REVOKE ALL ON app.training_records,app.training_quiz_attempts,app.training_settings FROM PUBLIC;

DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sk_erp_reader') THEN
  GRANT USAGE ON SCHEMA app TO sk_erp_reader;
  GRANT SELECT ON app.users,app.training_records,app.training_quiz_attempts,app.training_settings TO sk_erp_reader;
 END IF;
END $$;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sk_erp_writer') THEN
  GRANT USAGE ON SCHEMA app TO sk_erp_writer;
  GRANT SELECT,INSERT,UPDATE ON app.users TO sk_erp_writer;
  GRANT SELECT,INSERT,UPDATE,DELETE ON app.training_records TO sk_erp_writer;
  GRANT SELECT,INSERT ON app.training_quiz_attempts TO sk_erp_writer;
  GRANT SELECT,INSERT,UPDATE ON app.training_settings TO sk_erp_writer;
  GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA app TO sk_erp_writer;
 END IF;
END $$;
COMMIT;
