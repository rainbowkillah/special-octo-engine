import type { Context, Next } from 'hono';
import { verifyAccessJwt } from '../lib/access/verify';

const BYPASS_HEADER = 'x-dev-bypass';
const ACCESS_HEADER = 'cf-access-jwt-assertion';

// Cloudflare Access gate with dev bypass option
export async function accessGuard(c: Context, next: Next) {
  // Allow explicit dev bypass header (useful for local wrangler dev)
  const bypass = c.req.header(BYPASS_HEADER);
  if (bypass && bypass.toLowerCase() === 'true') {
    return next();
  }

  const accessJwt = c.req.header(ACCESS_HEADER);
  if (!accessJwt) {
    return c.json(
      {
        success: false,
        error: 'Unauthorized: missing Cloudflare Access token',
      },
      401,
    );
  }

  try {
    await verifyAccessJwt(accessJwt, {
      teamName: c.env.CF_ACCESS_TEAM_NAME ?? '',
      expectedAud: c.env.CF_ACCESS_AUD,
      cache: c.env.CACHE,
    });
  } catch (err) {
    console.error('Access verification failed', err);
    return c.json(
      {
        success: false,
        error: 'Unauthorized: invalid Access token',
      },
      401,
    );
  }

  return next();
}
