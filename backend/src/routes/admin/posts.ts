import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../../db/pool';
import { getRedis } from '../../lib/redis';
import { postBodySchema, postsQuerySchema } from '../../lib/schemas';
import { sendError } from '../../middleware/errorHandler';
import { getEnv } from '../../lib/env';
import { getLogger } from '../../lib/logger';

const router = Router();

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  tags?: Array<{ slug: string; name: string }>;
}

function mapRow(row: PostRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverImageUrl: row.cover_image_url,
    published: row.published,
    publishedAt: row.published_at,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function invalidatePostsCache(): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys('cache:posts:*').catch(() => [] as string[]);
  if (keys.length > 0) await redis.del(...keys).catch(() => null);
}

async function triggerRebuild(): Promise<void> {
  const { GITHUB_TOKEN, GITHUB_REPO } = getEnv();
  if (!GITHUB_TOKEN) {
    getLogger().warn('GITHUB_TOKEN not set — skipping rebuild dispatch');
    return;
  }

  try {
    const resp = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ event_type: 'post-published' }),
    });
    if (!resp.ok) {
      getLogger().warn({ status: resp.status }, 'GitHub dispatch failed');
    }
  } catch (err) {
    getLogger().error({ err }, 'Failed to dispatch GitHub rebuild');
  }
}

async function upsertTags(tagSlugs: string[]): Promise<Array<{ id: string; slug: string; name: string }>> {
  if (tagSlugs.length === 0) return [];
  const pool = getPool();

  const tags: Array<{ id: string; slug: string; name: string }> = [];
  for (const slug of tagSlugs) {
    const name = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const { rows } = await pool.query<{ id: string; slug: string; name: string }>(
      `INSERT INTO tags (slug, name) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
       RETURNING id, slug, name`,
      [slug, name],
    );
    tags.push(rows[0]);
  }
  return tags;
}

// GET /admin/posts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = postsQuerySchema.safeParse(req.query);
    if (!query.success) {
      sendError(res, 422, 'VALIDATION_FAILED', 'Invalid query parameters');
      return;
    }
    const { page, pageSize, status } = query.data;
    const offset = (page - 1) * pageSize;
    const pool = getPool();

    let dataResult, countResult;

    const tagsSubquery = `COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('slug',t.slug,'name',t.name))
         FROM post_tags pt JOIN tags t ON t.id=pt.tag_id
        WHERE pt.post_id=p.id),'[]'::jsonb
    ) AS tags`;

    if (status === 'draft') {
      [dataResult, countResult] = await Promise.all([
        pool.query<PostRow>(
          `SELECT p.*, ${tagsSubquery} FROM blog_posts p WHERE p.published = false ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
          [pageSize, offset],
        ),
        pool.query<{ count: string }>('SELECT count(*)::text FROM blog_posts WHERE published = false'),
      ]);
    } else if (status === 'published') {
      [dataResult, countResult] = await Promise.all([
        pool.query<PostRow>(
          `SELECT p.*, ${tagsSubquery} FROM blog_posts p WHERE p.published = true ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
          [pageSize, offset],
        ),
        pool.query<{ count: string }>('SELECT count(*)::text FROM blog_posts WHERE published = true'),
      ]);
    } else {
      [dataResult, countResult] = await Promise.all([
        pool.query<PostRow>(
          `SELECT p.*, ${tagsSubquery} FROM blog_posts p ORDER BY p.created_at DESC LIMIT $1 OFFSET $2`,
          [pageSize, offset],
        ),
        pool.query<{ count: string }>('SELECT count(*)::text FROM blog_posts'),
      ]);
    }

    res.json({
      data: dataResult.rows.map(mapRow),
      pagination: { page, pageSize, total: parseInt(countResult.rows[0].count, 10) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/posts/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<PostRow>(
      `SELECT p.*,
              COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('slug',t.slug,'name',t.name))
                   FROM post_tags pt JOIN tags t ON t.id=pt.tag_id
                  WHERE pt.post_id=p.id),'[]'::jsonb
              ) AS tags
         FROM blog_posts p
        WHERE p.id = $1`,
      [req.params.id],
    );
    if (rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Post not found');
      return;
    }
    res.json({ data: mapRow(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /admin/posts
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = postBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.reduce<Record<string, string>>((acc, e) => {
        acc[e.path.join('.')] = e.message;
        return acc;
      }, {});
      sendError(res, 422, 'VALIDATION_FAILED', 'Validation failed', details);
      return;
    }

    const d = parsed.data;
    const pool = getPool();

    try {
      const publishedAt = d.published ? 'now()' : 'NULL';
      const { rows } = await pool.query<PostRow>(
        `INSERT INTO blog_posts (slug, title, excerpt, body, cover_image_url, published, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,${publishedAt})
         RETURNING *`,
        [d.slug, d.title, d.excerpt, d.body, d.coverImageUrl ?? null, d.published],
      );

      const post = rows[0];
      const tags = await upsertTags(d.tags);

      if (tags.length > 0) {
        const values = tags.map((t) => `('${post.id}','${t.id}')`).join(',');
        await pool.query(`INSERT INTO post_tags (post_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`);
      }

      await invalidatePostsCache();

      if (d.published) {
        setImmediate(() => triggerRebuild());
      }

      const { rows: withTags } = await pool.query<PostRow>(
        `SELECT p.*,
                COALESCE(
                  (SELECT jsonb_agg(jsonb_build_object('slug',t.slug,'name',t.name))
                     FROM post_tags pt JOIN tags t ON t.id=pt.tag_id
                    WHERE pt.post_id=p.id),'[]'::jsonb
                ) AS tags
           FROM blog_posts p WHERE p.id=$1`,
        [post.id],
      );

      res.status(201).json({ data: mapRow(withTags[0]) });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        sendError(res, 409, 'CONFLICT', 'A post with this slug already exists');
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// PUT /admin/posts/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = postBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.reduce<Record<string, string>>((acc, e) => {
        acc[e.path.join('.')] = e.message;
        return acc;
      }, {});
      sendError(res, 422, 'VALIDATION_FAILED', 'Validation failed', details);
      return;
    }

    const d = parsed.data;
    const pool = getPool();

    // Get the current post to determine if we're doing a first-publish transition
    const { rows: existing } = await pool.query<{ published: boolean; published_at: Date | null }>(
      'SELECT published, published_at FROM blog_posts WHERE id = $1',
      [req.params.id],
    );

    if (existing.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Post not found');
      return;
    }

    const wasPublished = existing[0].published;
    const hadPublishedAt = existing[0].published_at !== null;

    // Set publishedAt on first true→true (or false→true) transition. Never clear it.
    const publishedAtExpr = d.published && !hadPublishedAt ? 'now()' : 'published_at';

    try {
      const { rows } = await pool.query<PostRow>(
        `UPDATE blog_posts
            SET slug=$2, title=$3, excerpt=$4, body=$5, cover_image_url=$6,
                published=$7, published_at=${publishedAtExpr}
          WHERE id=$1
          RETURNING *`,
        [req.params.id, d.slug, d.title, d.excerpt, d.body, d.coverImageUrl ?? null, d.published],
      );

      if (rows.length === 0) {
        sendError(res, 404, 'NOT_FOUND', 'Post not found');
        return;
      }

      // Replace tags
      await pool.query('DELETE FROM post_tags WHERE post_id = $1', [req.params.id]);
      const tags = await upsertTags(d.tags);
      if (tags.length > 0) {
        const values = tags.map((t) => `('${req.params.id}','${t.id}')`).join(',');
        await pool.query(`INSERT INTO post_tags (post_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`);
      }

      await invalidatePostsCache();

      if (d.published && !wasPublished) {
        setImmediate(() => triggerRebuild());
      }

      const { rows: withTags } = await pool.query<PostRow>(
        `SELECT p.*,
                COALESCE(
                  (SELECT jsonb_agg(jsonb_build_object('slug',t.slug,'name',t.name))
                     FROM post_tags pt JOIN tags t ON t.id=pt.tag_id
                    WHERE pt.post_id=p.id),'[]'::jsonb
                ) AS tags
           FROM blog_posts p WHERE p.id=$1`,
        [req.params.id],
      );

      res.json({ data: mapRow(withTags[0]) });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        sendError(res, 409, 'CONFLICT', 'A post with this slug already exists');
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/posts/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const { rowCount } = await pool.query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
    if (!rowCount) {
      sendError(res, 404, 'NOT_FOUND', 'Post not found');
      return;
    }
    await invalidatePostsCache();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string }).code === '23505';
}

export default router;
