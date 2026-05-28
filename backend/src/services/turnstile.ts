import { getEnv } from '../lib/env';
import { getLogger } from '../lib/logger';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  const { TURNSTILE_SECRET } = getEnv();

  try {
    const body = new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
      ...(remoteip ? { remoteip } : {}),
    });

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    const data = (await resp.json()) as TurnstileResponse;

    if (!data.success) {
      getLogger().warn({ codes: data['error-codes'] }, 'Turnstile verification failed');
    }

    return data.success;
  } catch (err) {
    getLogger().error({ err }, 'Turnstile API error');
    return false;
  }
}
