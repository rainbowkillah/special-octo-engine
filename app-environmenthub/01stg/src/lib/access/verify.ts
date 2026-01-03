import type { KVNamespace } from '@cloudflare/workers-types';

const CACHE_KEY_PREFIX = 'access-jwks';
const CACHE_TTL_SECONDS = 300; // 5 minutes

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
}

interface VerifyOptions {
  teamName: string;
  expectedAud?: string;
  cache?: KVNamespace;
}

function base64UrlToUint8Array(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getJwks(teamName: string, cache?: KVNamespace): Promise<Jwk[]> {
  const cacheKey = `${CACHE_KEY_PREFIX}:${teamName}`;

  if (cache) {
    const cached = await cache.get(cacheKey, 'json');
    if (cached && Array.isArray((cached as any).keys)) {
      return (cached as any).keys as Jwk[];
    }
  }

  const response = await fetch(`https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`, {
    cf: { cacheEverything: true, cacheTtl: CACHE_TTL_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Access certs: ${response.status}`);
  }

  const jwks = (await response.json()) as { keys: Jwk[] };

  if (cache) {
    await cache.put(cacheKey, JSON.stringify(jwks), { expirationTtl: CACHE_TTL_SECONDS });
  }

  return jwks.keys;
}

async function importKey(jwk: Jwk): Promise<CryptoKey> {
  if (jwk.alg !== 'RS256') {
    throw new Error(`Unsupported alg ${jwk.alg}`);
  }

  return crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );
}

export async function verifyAccessJwt(token: string, options: VerifyOptions): Promise<Record<string, unknown>> {
  const { teamName, expectedAud, cache } = options;
  if (!teamName) {
    throw new Error('CF_ACCESS_TEAM_NAME is required for Access verification');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))) as { kid?: string; alg?: string };
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as {
    aud?: string | string[];
    exp?: number;
    iss?: string;
  };

  if (!header.kid) {
    throw new Error('Missing kid in Access token');
  }

  const jwks = await getJwks(teamName, cache);
  const jwk = jwks.find((key) => key.kid === header.kid);
  if (!jwk) {
    throw new Error('Unknown signing key');
  }

  const cryptoKey = await importKey(jwk);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);

  const valid = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, signature, data);
  if (!valid) {
    throw new Error('Invalid signature');
  }

  if (expectedAud) {
    const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audList.includes(expectedAud)) {
      throw new Error('Invalid audience');
    }
  }

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('Token expired');
  }

  if (payload.iss && !payload.iss.includes(teamName)) {
    throw new Error('Invalid issuer');
  }

  return payload;
}
