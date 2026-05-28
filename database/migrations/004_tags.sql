-- Up Migration
CREATE TABLE tags (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        citext      NOT NULL UNIQUE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tag_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 1 AND 40),
  CONSTRAINT tag_name_len
    CHECK (length(name) BETWEEN 1 AND 60)
);

CREATE TRIGGER trg_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS tags CASCADE;
