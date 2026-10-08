BEGIN;
GRANT SELECT (id,username,role,active) ON app.users TO sk_erp_writer;
COMMIT;
