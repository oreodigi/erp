BEGIN;
CREATE TABLE IF NOT EXISTS app.communication_conversations (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL DEFAULT 'group' CHECK(kind IN ('direct','group','enquiry')),
 subject text NOT NULL CHECK(length(trim(subject)) BETWEEN 1 AND 240),
 created_by bigint NOT NULL REFERENCES app.users(id),
 closed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app.communication_members (
 conversation_id bigint NOT NULL REFERENCES app.communication_conversations(id) ON DELETE CASCADE,
 user_id bigint NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 member_role text NOT NULL DEFAULT 'member' CHECK(member_role IN ('owner','member','watcher')),
 last_read_at timestamptz,
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(conversation_id,user_id)
);
CREATE TABLE IF NOT EXISTS app.communication_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 conversation_id bigint NOT NULL REFERENCES app.communication_conversations(id) ON DELETE CASCADE,
 sender_id bigint NOT NULL REFERENCES app.users(id),
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 12000),
 reference_type text,
 reference_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 edited_at timestamptz
);
CREATE TABLE IF NOT EXISTS app.communication_tasks (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 conversation_id bigint NOT NULL REFERENCES app.communication_conversations(id) ON DELETE CASCADE,
 message_id bigint REFERENCES app.communication_messages(id) ON DELETE SET NULL,
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 240),
 description text NOT NULL DEFAULT '',
 assigned_to bigint REFERENCES app.users(id) ON DELETE SET NULL,
 created_by bigint NOT NULL REFERENCES app.users(id),
 status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','blocked','done','cancelled')),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
 due_at timestamptz,
 version bigint NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_messages_conversation ON app.communication_messages(conversation_id,id);
CREATE INDEX IF NOT EXISTS idx_comm_tasks_assignee ON app.communication_tasks(assigned_to,status);
CREATE INDEX IF NOT EXISTS idx_comm_conversations_updated ON app.communication_conversations(updated_at DESC);
REVOKE ALL ON app.communication_conversations,app.communication_members,app.communication_messages,app.communication_tasks FROM PUBLIC;
GRANT SELECT ON app.communication_conversations,app.communication_members,app.communication_messages,app.communication_tasks TO sk_erp_reader;
GRANT SELECT,INSERT,UPDATE,DELETE ON app.communication_conversations,app.communication_members,app.communication_messages,app.communication_tasks TO sk_erp_writer;
GRANT USAGE,SELECT ON SEQUENCE app.communication_conversations_id_seq,app.communication_messages_id_seq,app.communication_tasks_id_seq TO sk_erp_writer;
COMMIT;
