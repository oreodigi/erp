BEGIN;
CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.work_items (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),
 description text NOT NULL DEFAULT '',
 module text NOT NULL CHECK(module IN ('onboarding','training','kanban','operations','fleet','warehouse','finance','workshop','customers')),
 status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','blocked','review','done','cancelled')),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
 assigned_to bigint REFERENCES app.users(id) ON DELETE SET NULL,
 created_by bigint NOT NULL REFERENCES app.users(id),
 branch_id bigint,
 due_at timestamptz,
 version bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_work_items_module_status ON app.work_items(module,status);
CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON app.work_items(assigned_to,status);
CREATE TABLE IF NOT EXISTS app.training_courses (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),
 description text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 created_by bigint NOT NULL REFERENCES app.users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.training_lessons (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 course_id bigint NOT NULL REFERENCES app.training_courses(id) ON DELETE CASCADE,
 title text NOT NULL,
 body text NOT NULL DEFAULT '',
 sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app.training_progress (
 user_id bigint NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 lesson_id bigint NOT NULL REFERENCES app.training_lessons(id) ON DELETE CASCADE,
 completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,lesson_id)
);
CREATE TABLE IF NOT EXISTS app.audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id bigint REFERENCES app.users(id) ON DELETE SET NULL,
 entity_type text NOT NULL,
 entity_id text NOT NULL,
 action text NOT NULL,
 before_state jsonb,
 after_state jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON app.audit_events(entity_type,entity_id,created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO sk_erp_reader;
GRANT SELECT ON app.work_items,app.training_courses,app.training_lessons,app.training_progress TO sk_erp_reader;
COMMIT;
