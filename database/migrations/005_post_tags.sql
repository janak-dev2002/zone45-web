-- Up Migration
CREATE TABLE post_tags (
  post_id   uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES tags(id)       ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_tag_post
  ON post_tags (tag_id, post_id);

-- Down Migration
DROP TABLE IF EXISTS post_tags CASCADE;
