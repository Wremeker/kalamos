import type { Context, Next } from 'koa';
import { env } from '../config/env';

/**
 * Optional bearer-token guard. Disabled unless `API_TOKEN` is set, so the
 * reference server runs auth-free out of the box but can be locked down for
 * self-hosting.
 */
export async function bearerAuth(ctx: Context, next: Next): Promise<void> {
  if (!env.apiToken) {
    await next();
    return;
  }

  const header = ctx.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== env.apiToken) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  await next();
}
