-- Up Migration
CREATE TABLE portfolio_projects (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              citext      NOT NULL UNIQUE,
  title             text        NOT NULL,
  description       text        NOT NULL,
  body              text        NOT NULL,
  tech_stack        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  outcome           text        NULL,
  project_url       text        NULL,
  cover_image_url   text        NULL,
  sort_order        integer     NOT NULL DEFAULT 0,
  published         boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT portfolio_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 1 AND 80),
  CONSTRAINT portfolio_title_len
    CHECK (length(title) BETWEEN 1 AND 200),
  CONSTRAINT portfolio_description_len
    CHECK (length(description) BETWEEN 1 AND 280),
  CONSTRAINT portfolio_body_len
    CHECK (length(body) BETWEEN 1 AND 50000),
  CONSTRAINT portfolio_outcome_len
    CHECK (outcome IS NULL OR length(outcome) <= 280),
  CONSTRAINT portfolio_project_url_len
    CHECK (project_url IS NULL OR length(project_url) <= 2048),
  CONSTRAINT portfolio_cover_url_len
    CHECK (cover_image_url IS NULL OR length(cover_image_url) <= 2048),
  CONSTRAINT portfolio_tech_stack_is_array
    CHECK (jsonb_typeof(tech_stack) = 'array')
);

CREATE INDEX idx_portfolio_published_sort
  ON portfolio_projects (published, sort_order ASC, created_at DESC);

CREATE TRIGGER trg_portfolio_projects_updated_at
BEFORE UPDATE ON portfolio_projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS portfolio_projects CASCADE;
