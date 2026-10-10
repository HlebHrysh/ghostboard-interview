import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import crypto from 'crypto';

const ADMIN_TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getAdminSecret(): string {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET || 'ghostboard_default_admin_secret_key';
}

/**
 * Creates an HMAC-SHA256 signed session token for authenticated admins.
 * Format: admin.<timestamp>.<signature>
 */
export function createAdminToken(): string {
  const secret = getAdminSecret();
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', secret).update(`admin:${timestamp}`).digest('hex');
  return `admin.${timestamp}.${signature}`;
}

/**
 * Verifies that the admin token has a valid HMAC signature and has not expired.
 */
export function verifyAdminToken(token?: string | null): boolean {
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

  const secret = getAdminSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(`admin:${timestampStr}`).digest('hex');

  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
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
  // Rate limit admin endpoint access: 30 requests per minute per IP
  const rateLimit = await checkRateLimit(req, 30, 60000, 'admin_access');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Занадто багато запитів. Зачекайте ${rateLimit.retryAfterSec} сек.` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    );
  }

  const adminCookie = req.cookies.get('ghostboard_admin_session')?.value;
  if (!verifyAdminToken(adminCookie)) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required.' },
      { status: 401 }
    );
  }

  return null; // Authorized — proceed
}
