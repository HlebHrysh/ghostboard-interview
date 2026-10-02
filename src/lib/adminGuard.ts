import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

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
  if (adminCookie !== 'authenticated') {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required.' },
      { status: 401 }
    );
  }

  return null; // Authorized — proceed
}
