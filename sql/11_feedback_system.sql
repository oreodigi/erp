BEGIN;

CREATE TABLE IF NOT EXISTS app.feedback (
 id bigserial PRIMARY KEY,
 feedback_no text UNIQUE,
 user_id bigint NOT NULL REFERENCES app.users(id),
 feedback_type text NOT NULL CHECK(feedback_type IN ('Bug','Improvement','Missing Feature','Confusing','Data Issue','Training/Help Issue','Other')),
 impact text NOT NULL DEFAULT 'Medium' CHECK(impact IN ('Low','Medium','High','Blocking')),
 title text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 module text NOT NULL DEFAULT '',
 screen_id text NOT NULL DEFAULT '',
 route text NOT NULL DEFAULT '',
 route_params jsonb NOT NULL DEFAULT '{}'::jsonb,
 record_type text,
 record_id text,
 record_no text,
 section text,
 mode text NOT NULL DEFAULT 'Company' CHECK(mode IN ('Company','Practice')),
 client_context jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'New' CHECK(status IN ('New','Reviewing','Accepted','Planned','In Development','Ready for Testing','Fixed','Verified','Closed','Duplicate','Not Planned','Need More Information')),
 assigned_to bigint REFERENCES app.users(id),
 resolution text NOT NULL DEFAULT '',
 duplicate_of bigint REFERENCES app.feedback(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON app.feedback(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON app.feedback(status,updated_at DESC);
CREATE INDEX IF NOT EXISTS feedback_screen_idx ON app.feedback(screen_id,created_at DESC);

CREATE TABLE IF NOT EXISTS app.feedback_points (
 id bigserial PRIMARY KEY, feedback_id bigint NOT NULL REFERENCES app.feedback(id) ON DELETE CASCADE,
 position int NOT NULL DEFAULT 0, body text NOT NULL CHECK(length(body)<=2000)
);
CREATE TABLE IF NOT EXISTS app.feedback_attachments (
 id bigserial PRIMARY KEY, feedback_id bigint NOT NULL REFERENCES app.feedback(id) ON DELETE CASCADE,
 user_id bigint NOT NULL REFERENCES app.users(id), kind text NOT NULL CHECK(kind IN ('image','document','audio')),
 original_name text NOT NULL, stored_name text NOT NULL UNIQUE, mime_type text NOT NULL, size_bytes bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.feedback_comments (
 id bigserial PRIMARY KEY, feedback_id bigint NOT NULL REFERENCES app.feedback(id) ON DELETE CASCADE,
 user_id bigint NOT NULL REFERENCES app.users(id), body text NOT NULL CHECK(length(body)<=5000),
 internal boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.feedback_history (
 id bigserial PRIMARY KEY, feedback_id bigint NOT NULL REFERENCES app.feedback(id) ON DELETE CASCADE,
 actor_id bigint REFERENCES app.users(id), action text NOT NULL, before_state jsonb, after_state jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION app.feedback_number() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
 IF NEW.feedback_no IS NULL THEN NEW.feedback_no='FB-'||lpad(NEW.id::text,6,'0'); END IF; RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS feedback_number_trg ON app.feedback;
CREATE TRIGGER feedback_number_trg BEFORE INSERT ON app.feedback FOR EACH ROW EXECUTE FUNCTION app.feedback_number();
GRANT SELECT ON app.feedback,app.feedback_points,app.feedback_attachments,app.feedback_comments,app.feedback_history TO sk_erp_reader;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.feedback,app.feedback_points,app.feedback_attachments,app.feedback_comments,app.feedback_history TO sk_erp_writer;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA app TO sk_erp_writer;
COMMIT;
