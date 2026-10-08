BEGIN;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='sk_erp_service') THEN CREATE ROLE sk_erp_service LOGIN INHERIT; END IF; END $$;
GRANT sk_erp_writer TO sk_erp_service;
GRANT sk_erp_api TO sk_erp_service;
GRANT CONNECT ON DATABASE sk_translines TO sk_erp_service;
COMMIT;
