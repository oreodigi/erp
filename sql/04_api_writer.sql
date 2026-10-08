BEGIN;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sk_erp_writer') THEN CREATE ROLE sk_erp_writer NOLOGIN; END IF; END $$;
GRANT USAGE ON SCHEMA app TO sk_erp_writer;
GRANT SELECT,INSERT,UPDATE ON app.work_items TO sk_erp_writer;
GRANT SELECT,INSERT,UPDATE ON app.training_courses,app.training_lessons TO sk_erp_writer;
GRANT SELECT,INSERT,DELETE ON app.training_progress TO sk_erp_writer;
GRANT INSERT,SELECT ON app.audit_events TO sk_erp_writer;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA app TO sk_erp_writer;
COMMIT;
