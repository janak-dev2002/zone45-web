import cron from 'node-cron';
import { getPool } from '../db/pool';
import { sendContactNotification } from '../services/email';
import { getLogger } from '../lib/logger';

interface PendingSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  email_attempts: number;
}

export async function retryPendingEmails(): Promise<void> {
  const pool = getPool();
  const log = getLogger();

  const { rows } = await pool.query<PendingSubmission>(
    `SELECT id, name, email, subject, message, email_attempts
       FROM contact_submissions
      WHERE status = 'pending_email' AND email_attempts < 3
      ORDER BY created_at ASC
      LIMIT 20`,
  );

  if (rows.length === 0) return;

  log.info({ count: rows.length }, 'Retrying failed contact emails');

  for (const row of rows) {
    try {
      await sendContactNotification(row);
      await pool.query(
        "UPDATE contact_submissions SET status = 'emailed', email_attempts = email_attempts + 1 WHERE id = $1",
        [row.id],
      );
      log.info({ submissionId: row.id }, 'Contact email retried successfully');
    } catch (err) {
      const attempts = row.email_attempts + 1;
      const newStatus = attempts >= 3 ? 'email_failed' : 'pending_email';
      await pool.query(
        `UPDATE contact_submissions
            SET status = $2, email_attempts = email_attempts + 1, last_email_error = $3
          WHERE id = $1`,
        [row.id, newStatus, String(err).slice(0, 500)],
      );
      log.warn({ err, submissionId: row.id, attempts }, 'Contact email retry failed');
    }
  }
}

export function startEmailRetryJob(): cron.ScheduledTask {
  return cron.schedule('*/15 * * * *', async () => {
    try {
      await retryPendingEmails();
    } catch (err) {
      getLogger().error({ err }, 'Email retry job error');
    }
  });
}
