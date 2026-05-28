-- Up Migration
CREATE TABLE blog_posts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              citext      NOT NULL UNIQUE,
  title             text        NOT NULL,
  excerpt           text        NOT NULL,
  body              text        NOT NULL,
  cover_image_url   text        NULL,
  published         boolean     NOT NULL DEFAULT false,
  published_at      timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT post_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND length(slug) BETWEEN 1 AND 80),
  CONSTRAINT post_title_len
    CHECK (length(title) BETWEEN 1 AND 200),
  CONSTRAINT post_excerpt_len
    CHECK (length(excerpt) BETWEEN 1 AND 400),
  CONSTRAINT post_body_len
    CHECK (length(body) BETWEEN 1 AND 100000),
  CONSTRAINT post_cover_url_len
    CHECK (cover_image_url IS NULL OR length(cover_image_url) <= 2048),
  CONSTRAINT post_published_implies_publishedat
    CHECK ( (published = false) OR (published_at IS NOT NULL) )
);

CREATE INDEX idx_posts_published_publishedat
  ON blog_posts (published, published_at DESC NULLS LAST);

CREATE TRIGGER trg_blog_posts_updated_at
BEFORE UPDATE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS blog_posts CASCADE;
