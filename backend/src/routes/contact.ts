import { Router, Request, Response, NextFunction } from 'express';
import { getPool } from '../db/pool';
import { contactBodySchema } from '../lib/schemas';
import { sendError } from '../middleware/errorHandler';
import { contactRateLimit } from '../middleware/rateLimit';
import { verifyTurnstile } from '../services/turnstile';
import { sendContactAsync } from '../services/email';
import { getLogger } from '../lib/logger';

const router = Router();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? '0.0.0.0';
}

router.post('/', contactRateLimit(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = contactBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.reduce<Record<string, string>>((acc, e) => {
        acc[e.path.join('.')] = e.message;
        return acc;
      }, {});
      sendError(res, 422, 'VALIDATION_FAILED', 'Validation failed', details);
      return;
    }

    const { name, email, subject, message, hpField, turnstileToken } = parsed.data;

    // Honeypot — deceive the bot, return 202 but drop the submission
    if (hpField !== '') {
      res.status(202).json({ data: { status: 'received', submissionId: null } });
      return;
    }

    const ip = getClientIp(req);
    const valid = await verifyTurnstile(turnstileToken, ip);
    if (!valid) {
      sendError(res, 422, 'VALIDATION_FAILED', 'Bot verification failed', { field: 'turnstileToken', reason: 'INVALID' });
      return;
    }

    const pool = getPool();
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO contact_submissions (name, email, subject, message, ip_address, user_agent, status)
       VALUES ($1, $2, $3, $4, $5::inet, $6, 'received')
       RETURNING id`,
      [name, email, subject, message, ip, req.headers['user-agent'] ?? null],
    );

    const submission = { id: rows[0].id, name, email, subject, message };
    sendContactAsync(submission);

    getLogger().info({ submissionId: submission.id, ip }, 'Contact form submission received');

    res.status(202).json({ data: { status: 'received', submissionId: submission.id } });
  } catch (err) {
    next(err);
  }
});

export default router;
