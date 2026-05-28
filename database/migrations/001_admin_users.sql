-- Up Migration
CREATE TABLE admin_users (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext      NOT NULL UNIQUE,
  password_hash   text        NOT NULL,
  name            text        NOT NULL,
  last_login_at   timestamptz NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS admin_users CASCADE;
