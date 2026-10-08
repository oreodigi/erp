BEGIN;
CREATE TABLE IF NOT EXISTS app.dashboard_layouts (
  user_id bigint PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON app.dashboard_layouts FROM PUBLIC;
GRANT SELECT ON app.dashboard_layouts TO sk_erp_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.dashboard_layouts TO sk_erp_writer;
COMMIT;
