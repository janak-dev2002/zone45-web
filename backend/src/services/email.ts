import { getEnv } from '../lib/env';
import { getLogger } from '../lib/logger';
import { getPool } from '../db/pool';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function sendContactNotification(submission: ContactSubmission): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM, EMAIL_TO } = getEnv();

  const html = `
    <h2>New contact form submission</h2>
    <p><strong>From:</strong> ${escapeHtml(submission.name)} &lt;${escapeHtml(submission.email)}&gt;</p>
    <p><strong>Subject:</strong> ${escapeHtml(submission.subject)}</p>
    <hr/>
    <pre style="white-space:pre-wrap;">${escapeHtml(submission.message)}</pre>
    <hr/>
    <p style="color:#666;font-size:12px;">Submission ID: ${submission.id}</p>
  `;

  const text =
    `New contact form submission\n\n` +
    `From: ${submission.name} <${submission.email}>\n` +
    `Subject: ${submission.subject}\n\n` +
    `${submission.message}\n\n` +
    `---\nSubmission ID: ${submission.id}`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [EMAIL_TO],
      subject: `[ZF45 contact] ${submission.subject}`,
      html,
      text,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Resend API ${resp.status}: ${body}`);
  }
}

export async function sendContactAsync(submission: ContactSubmission): Promise<void> {
  const pool = getPool();
  const log = getLogger();

  setImmediate(async () => {
    try {
      await sendContactNotification(submission);
      await pool.query(
        "UPDATE contact_submissions SET status = 'emailed', email_attempts = email_attempts + 1 WHERE id = $1",
        [submission.id],
      );
    } catch (err) {
      log.error({ err, submissionId: submission.id }, 'Failed to send contact notification email');
      await pool.query(
        "UPDATE contact_submissions SET status = 'pending_email', email_attempts = email_attempts + 1, last_email_error = $2 WHERE id = $1",
        [submission.id, String(err).slice(0, 500)],
      );
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
