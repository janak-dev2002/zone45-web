import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db/pool';
import { getRedis } from '../lib/redis';
import { portfolioQuerySchema } from '../lib/schemas';
import { sendError } from '../middleware/errorHandler';

const router = Router();

interface PortfolioRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  body?: string;
  tech_stack: string[];
  outcome: string | null;
  project_url: string | null;
  cover_image_url: string | null;
  sort_order: number;
  published?: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: PortfolioRow, includeBody = false) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    ...(includeBody ? { body: row.body } : {}),
    techStack: row.tech_stack,
    outcome: row.outcome,
    projectUrl: row.project_url,
    coverImageUrl: row.cover_image_url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /portfolio
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = portfolioQuerySchema.safeParse(req.query);
    if (!query.success) {
      sendError(res, 422, 'VALIDATION_FAILED', 'Invalid query parameters');
      return;
    }
    const { page, pageSize } = query.data;
    const offset = (page - 1) * pageSize;

    const cacheKey = `cache:portfolio:list:p${page}:s${pageSize}`;
    const redis = getRedis();
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const pool = getPool();
    const [dataResult, countResult] = await Promise.all([
      pool.query<PortfolioRow>(
        `SELECT id, slug, title, description, tech_stack, outcome,
                project_url, cover_image_url, sort_order, created_at, updated_at
           FROM portfolio_projects
          WHERE published = true
          ORDER BY sort_order ASC, created_at DESC
          LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
      pool.query<{ count: string }>(
        'SELECT count(*)::text FROM portfolio_projects WHERE published = true',
      ),
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

// GET /portfolio/:slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const pool = getPool();
    const { rows } = await pool.query<PortfolioRow>(
      `SELECT * FROM portfolio_projects WHERE slug = $1 AND published = true`,
      [slug],
    );

    if (rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Portfolio project not found');
      return;
    }

    res.json({ data: mapRow(rows[0], true) });
  } catch (err) {
    next(err);
  }
});

export default router;
