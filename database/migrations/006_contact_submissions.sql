-- Up Migration
CREATE TYPE contact_status AS ENUM (
  'received',
  'pending_email',
  'emailed',
  'email_failed'
);

CREATE TABLE contact_submissions (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text            NOT NULL,
  email           citext          NOT NULL,
  subject         text            NOT NULL,
  message         text            NOT NULL,
  ip_address      inet            NULL,
  user_agent      text            NULL,
  status          contact_status  NOT NULL DEFAULT 'received',
  email_attempts  smallint        NOT NULL DEFAULT 0,
  last_email_error text           NULL,
  created_at      timestamptz     NOT NULL DEFAULT now(),

  CONSTRAINT contact_name_len
    CHECK (length(name) BETWEEN 1 AND 100),
  CONSTRAINT contact_subject_len
    CHECK (length(subject) BETWEEN 1 AND 200),
  CONSTRAINT contact_message_len
    CHECK (length(message) BETWEEN 10 AND 5000),
  CONSTRAINT contact_email_attempts_cap
    CHECK (email_attempts >= 0 AND email_attempts <= 10),
  CONSTRAINT contact_email_error_len
    CHECK (last_email_error IS NULL OR length(last_email_error) <= 500)
);

CREATE INDEX idx_contact_status_created
  ON contact_submissions (status, created_at DESC);

CREATE INDEX idx_contact_created
  ON contact_submissions (created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TYPE IF EXISTS contact_status CASCADE;
