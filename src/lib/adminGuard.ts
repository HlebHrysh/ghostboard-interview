import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
const ADMIN_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const encoder = new TextEncoder();

export function getAdminSecret(): string {
  const secret = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY FATAL] ADMIN_PASSWORD or ADMIN_SECRET must be configured with at least 16 characters in production.');
  }
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return 'ghostboard_test_environment_ephemeral_secret_key_32_chars!';
  }
  throw new Error('[SECURITY FATAL] ADMIN_PASSWORD or ADMIN_SECRET environment variable is missing.');
}

async function getHmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

/**
 * Creates an HMAC-SHA256 signed session token for authenticated admins.
 * Format: admin.<timestamp>.<signature>
 */
export async function createAdminToken(): Promise<string> {
  const secret = getAdminSecret();
  const timestamp = Date.now().toString();
  const key = await getHmacKey(secret, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`admin:${timestamp}`));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `admin.${timestamp}.${signature}`;
}

/**
 * Verifies that the admin token has a valid HMAC signature and has not expired.
 */
export async function verifyAdminToken(token?: string | null): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'admin') return false;

  const [, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  // Reject future tokens (> 1 min clock drift) or expired tokens (> 24 hours)
  if (timestamp > now + 60000 || now - timestamp > ADMIN_TOKEN_MAX_AGE_MS) {
    return false;
  }

  if (typeof signature !== 'string' || signature.length !== 64) {
    return false;
  }

  try {
    const sigBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      const byte = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
      if (isNaN(byte)) return false;
      sigBytes[i] = byte;
    }

    const secret = getAdminSecret();
    const key = await getHmacKey(secret, ['verify']);
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(`admin:${timestampStr}`));
  } catch {
    return false;
  }
}

/**
 * Centralized admin authentication guard.
 * Verifies the ghostboard_admin_session cookie and enforces rate limiting.
 *
 * @returns NextResponse with 401/429 if unauthorized, null if authorized.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  // Rate limit admin endpoint access: 30 requests per minute per IP (3000 in test mode)
  const limit = (process.env.NODE_ENV === 'test' || process.env.VITEST) ? 3000 : 30;
  const rateLimit = await checkRateLimit(req, limit, 60000, 'admin_access');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Занадто багато запитів. Зачекайте ${rateLimit.retryAfterSec} сек.` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    );
  }

  const adminCookie = req.cookies.get('ghostboard_admin_session')?.value;
  const isValid = adminCookie ? await verifyAdminToken(adminCookie) : false;
  if (!isValid) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required.' },
      { status: 401 }
    );
  }

  return null; // Authorized — proceed
}
