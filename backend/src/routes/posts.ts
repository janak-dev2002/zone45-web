import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db/pool';
import { getRedis } from '../lib/redis';
import { postsQuerySchema } from '../lib/schemas';
import { sendError } from '../middleware/errorHandler';

const router = Router();

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  cover_image_url: string | null;
  published?: boolean;
  published_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
  tags: Array<{ slug: string; name: string }>;
}

function mapRow(row: PostRow, includeBody = false) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    ...(includeBody ? { body: row.body } : {}),
    coverImageUrl: row.cover_image_url,
    publishedAt: row.published_at,
    tags: row.tags ?? [],
  };
}

// GET /posts/tags — must be defined before /:slug to avoid conflict
router.get('/tags', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const redis = getRedis();
    const cached = await redis.get('cache:posts:tags').catch(() => null);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const pool = getPool();
    const { rows } = await pool.query<{ slug: string; name: string; postCount: string }>(
      `SELECT t.slug, t.name, count(pt.post_id)::text AS "postCount"
         FROM tags t
         JOIN post_tags pt ON pt.tag_id = t.id
         JOIN blog_posts bp ON bp.id = pt.post_id
        WHERE bp.published = true
        GROUP BY t.id
        ORDER BY count(pt.post_id) DESC, t.name ASC`,
    );

    const payload = {
      data: rows.map((r) => ({ slug: r.slug, name: r.name, postCount: parseInt(r.postCount, 10) })),
    };

    await redis.setex('cache:posts:tags', 300, JSON.stringify(payload)).catch(() => null);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /posts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = postsQuerySchema.safeParse(req.query);
    if (!query.success) {
      sendError(res, 422, 'VALIDATION_FAILED', 'Invalid query parameters');
      return;
    }
    const { page, pageSize, tag } = query.data;
    const offset = (page - 1) * pageSize;

    const cacheKey = `cache:posts:list:t${tag ?? ''}:p${page}:s${pageSize}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const pool = getPool();

    let dataQuery: string;
    let countQuery: string;
    let params: (string | number)[];

    if (tag) {
      dataQuery = `
        SELECT p.id, p.slug, p.title, p.excerpt, p.cover_image_url, p.published_at,
               COALESCE(
                 (SELECT jsonb_agg(jsonb_build_object('slug', t2.slug, 'name', t2.name))
                    FROM post_tags pt2 JOIN tags t2 ON t2.id = pt2.tag_id
                   WHERE pt2.post_id = p.id), '[]'::jsonb
               ) AS tags
          FROM blog_posts p
          JOIN post_tags pt ON pt.post_id = p.id
          JOIN tags t ON t.id = pt.tag_id
         WHERE p.published = true AND t.slug = $1
         ORDER BY p.published_at DESC
         LIMIT $2 OFFSET $3`;
      countQuery = `
        SELECT count(DISTINCT p.id)::text
          FROM blog_posts p
          JOIN post_tags pt ON pt.post_id = p.id
          JOIN tags t ON t.id = pt.tag_id
         WHERE p.published = true AND t.slug = $1`;
      params = [tag, pageSize, offset];
    } else {
      dataQuery = `
        SELECT p.id, p.slug, p.title, p.excerpt, p.cover_image_url, p.published_at,
               COALESCE(
                 (SELECT jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name))
                    FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                   WHERE pt.post_id = p.id), '[]'::jsonb
               ) AS tags
          FROM blog_posts p
         WHERE p.published = true
         ORDER BY p.published_at DESC
         LIMIT $1 OFFSET $2`;
      countQuery = `SELECT count(*)::text FROM blog_posts WHERE published = true`;
      params = [pageSize, offset];
    }

    const [dataResult, countResult] = await Promise.all([
      pool.query<PostRow>(dataQuery, params),
      pool.query<{ count: string }>(countQuery, tag ? [tag] : []),
    ]);

    const payload = {
      data: dataResult.rows.map((r) => mapRow(r)),
      pagination: { page, pageSize, total: parseInt(countResult.rows[0].count, 10) },
    };

    await redis.setex(cacheKey, 60, JSON.stringify(payload)).catch(() => null);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /posts/:slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const pool = getPool();
    const { rows } = await pool.query<PostRow>(
      `SELECT p.*,
              COALESCE(
                (SELECT jsonb_agg(jsonb_build_object('slug', t.slug, 'name', t.name))
                   FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
                  WHERE pt.post_id = p.id), '[]'::jsonb
              ) AS tags
         FROM blog_posts p
        WHERE p.slug = $1 AND p.published = true`,
      [slug],
    );

    if (rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Post not found');
      return;
    }

    res.json({ data: mapRow(rows[0], true) });
  } catch (err) {
    next(err);
  }
});

export default router;
