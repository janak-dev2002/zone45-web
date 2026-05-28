jest.mock('../src/db/pool');
jest.mock('../src/services/email');
jest.mock('../src/lib/logger', () => ({
  getLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() })),
}));

import { retryPendingEmails } from '../src/jobs/emailRetry';
import { getPool } from '../src/db/pool';
import { sendContactNotification } from '../src/services/email';

const mockQuery = jest.fn();
(getPool as jest.Mock).mockReturnValue({ query: mockQuery });
const mockSend = sendContactNotification as jest.Mock;

describe('retryPendingEmails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing when no pending submissions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await retryPendingEmails();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('marks submission as emailed on success', async () => {
    const row = { id: 'abc', name: 'Jane', email: 'j@x.com', subject: 'Hi', message: 'Hello there', email_attempts: 0 };
    mockQuery.mockResolvedValueOnce({ rows: [row] }).mockResolvedValue({ rowCount: 1 });
    mockSend.mockResolvedValueOnce(undefined);

    await retryPendingEmails();

    expect(mockSend).toHaveBeenCalledWith(row);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'emailed'"),
      [row.id],
    );
  });

  it('marks as email_failed after 3 attempts', async () => {
    const row = { id: 'abc', name: 'Jane', email: 'j@x.com', subject: 'Hi', message: 'Hello there', email_attempts: 2 };
    mockQuery.mockResolvedValueOnce({ rows: [row] }).mockResolvedValue({ rowCount: 1 });
    mockSend.mockRejectedValueOnce(new Error('Resend error'));

    await retryPendingEmails();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $2'),
      [row.id, 'email_failed', expect.any(String)],
    );
  });

  it('keeps pending_email when under 3 attempts', async () => {
    const row = { id: 'abc', name: 'Jane', email: 'j@x.com', subject: 'Hi', message: 'Hello there', email_attempts: 1 };
    mockQuery.mockResolvedValueOnce({ rows: [row] }).mockResolvedValue({ rowCount: 1 });
    mockSend.mockRejectedValueOnce(new Error('Resend error'));

    await retryPendingEmails();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status = $2'),
      [row.id, 'pending_email', expect.any(String)],
    );
  });
});
