import { createError, sendError } from '../src/middleware/errorHandler';
import { Response } from 'express';

describe('createError', () => {
  it('creates an error with correct properties', () => {
    const err = createError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});

describe('sendError', () => {
  it('sends correct JSON error response', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;

    sendError(res, 404, 'NOT_FOUND', 'Resource not found');

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  });

  it('includes details when provided', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status, json } as unknown as Response;

    sendError(res, 422, 'VALIDATION_FAILED', 'Bad input', { field: 'email' });

    expect(json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_FAILED', message: 'Bad input', details: { field: 'email' } },
    });
  });
});
