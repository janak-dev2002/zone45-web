import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../../db/pool';
import { getRedis } from '../../lib/redis';
import { portfolioBodySchema, portfolioQuerySchema } from '../../lib/schemas';
import { sendError } from '../../middleware/errorHandler';

const router = Router();

interface PortfolioRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  tech_stack: string[];
  outcome: string | null;
  project_url: string | null;
  cover_image_url: string | null;
  sort_order: number;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: PortfolioRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    body: row.body,
    techStack: row.tech_stack,
    outcome: row.outcome,
    projectUrl: row.project_url,
    coverImageUrl: row.cover_image_url,
    sortOrder: row.sort_order,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function invalidatePortfolioCache(): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys('cache:portfolio:list:*').catch(() => [] as string[]);
  if (keys.length > 0) await redis.del(...keys).catch(() => null);
}

// GET /admin/portfolio
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = portfolioQuerySchema.safeParse(req.query);
    if (!query.success) {
      sendError(res, 422, 'VALIDATION_FAILED', 'Invalid query parameters');
      return;
    }
    const { page, pageSize } = query.data;
    const offset = (page - 1) * pageSize;
    const pool = getPool();

    const [dataResult, countResult] = await Promise.all([
      pool.query<PortfolioRow>(
        `SELECT * FROM portfolio_projects ORDER BY sort_order ASC, created_at DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
      pool.query<{ count: string }>('SELECT count(*)::text FROM portfolio_projects'),
    ]);

    res.json({
      data: dataResult.rows.map(mapRow),
      pagination: { page, pageSize, total: parseInt(countResult.rows[0].count, 10) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/portfolio/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<PortfolioRow>(
      'SELECT * FROM portfolio_projects WHERE id = $1',
      [req.params.id],
    );
    if (rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Portfolio project not found');
      return;
    }
    res.json({ data: mapRow(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// POST /admin/portfolio
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = portfolioBodySchema.safeParse(req.body);
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
      const { rows } = await pool.query<PortfolioRow>(
        `INSERT INTO portfolio_projects
           (slug, title, description, body, tech_stack, outcome, project_url, cover_image_url, sort_order, published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [d.slug, d.title, d.description, d.body, JSON.stringify(d.techStack),
         d.outcome ?? null, d.projectUrl ?? null, d.coverImageUrl ?? null,
         d.sortOrder, d.published],
      );
      await invalidatePortfolioCache();
      res.status(201).json({ data: mapRow(rows[0]) });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        sendError(res, 409, 'CONFLICT', 'A project with this slug already exists');
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// PUT /admin/portfolio/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = portfolioBodySchema.safeParse(req.body);
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
      const { rows } = await pool.query<PortfolioRow>(
        `UPDATE portfolio_projects
            SET slug=$2, title=$3, description=$4, body=$5, tech_stack=$6,
                outcome=$7, project_url=$8, cover_image_url=$9, sort_order=$10, published=$11
          WHERE id=$1
          RETURNING *`,
        [req.params.id, d.slug, d.title, d.description, d.body, JSON.stringify(d.techStack),
         d.outcome ?? null, d.projectUrl ?? null, d.coverImageUrl ?? null,
         d.sortOrder, d.published],
      );

      if (rows.length === 0) {
        sendError(res, 404, 'NOT_FOUND', 'Portfolio project not found');
        return;
      }
      await invalidatePortfolioCache();
      res.json({ data: mapRow(rows[0]) });
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        sendError(res, 409, 'CONFLICT', 'A project with this slug already exists');
        return;
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/portfolio/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const { rowCount } = await pool.query(
      'DELETE FROM portfolio_projects WHERE id = $1',
      [req.params.id],
    );
    if (!rowCount) {
      sendError(res, 404, 'NOT_FOUND', 'Portfolio project not found');
      return;
    }
    await invalidatePortfolioCache();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string }).code === '23505';
}

export default router;
