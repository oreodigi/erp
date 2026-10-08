BEGIN;
CREATE TABLE IF NOT EXISTS app.erp_state (
 id integer PRIMARY KEY CHECK (id=1),
 data jsonb NOT NULL,
 version bigint NOT NULL DEFAULT 1,
 updated_by bigint REFERENCES app.users(id) ON DELETE SET NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON app.erp_state FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON app.erp_state TO sk_erp_writer;
GRANT SELECT ON app.erp_state TO sk_erp_reader;
COMMIT;
