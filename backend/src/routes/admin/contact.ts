import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../../db/pool';
import { contactQuerySchema } from '../../lib/schemas';
import { sendError } from '../../middleware/errorHandler';

const router = Router();

interface ContactRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  email_attempts: number;
  created_at: Date;
}

// GET /admin/contact
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = contactQuerySchema.safeParse(req.query);
    if (!query.success) {
      sendError(res, 422, 'VALIDATION_FAILED', 'Invalid query parameters');
      return;
    }
    const { page, pageSize, status } = query.data;
    const offset = (page - 1) * pageSize;
    const pool = getPool();

    let dataResult, countResult;

    if (status) {
      [dataResult, countResult] = await Promise.all([
        pool.query<ContactRow>(
          `SELECT id, name, email, subject,
                  left(message, 120) AS message,
                  ip_address, user_agent, status, email_attempts, created_at
             FROM contact_submissions
            WHERE status = $3
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2`,
          [pageSize, offset, status],
        ),
        pool.query<{ count: string }>(
          'SELECT count(*)::text FROM contact_submissions WHERE status = $1',
          [status],
        ),
      ]);
    } else {
      [dataResult, countResult] = await Promise.all([
        pool.query<ContactRow>(
          `SELECT id, name, email, subject,
                  left(message, 120) AS message,
                  ip_address, user_agent, status, email_attempts, created_at
             FROM contact_submissions
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
          [pageSize, offset],
        ),
        pool.query<{ count: string }>('SELECT count(*)::text FROM contact_submissions'),
      ]);
    }

    res.json({
      data: dataResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        subject: r.subject,
        messagePreview: r.message,
        status: r.status,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      })),
      pagination: { page, pageSize, total: parseInt(countResult.rows[0].count, 10) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/contact/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = getPool();
    const { rows } = await pool.query<ContactRow>(
      'SELECT * FROM contact_submissions WHERE id = $1',
      [req.params.id],
    );

    if (rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Contact submission not found');
      return;
    }

    const r = rows[0];
    res.json({
      data: {
        id: r.id,
        name: r.name,
        email: r.email,
        subject: r.subject,
        message: r.message,
        status: r.status,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        emailAttempts: r.email_attempts,
        createdAt: r.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
