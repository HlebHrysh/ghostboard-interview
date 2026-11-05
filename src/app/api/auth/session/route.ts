import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionUser, createUser, createSession } from '@/lib/serverDb';
import { checkRateLimit, validateOrigin } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    let sessionToken = req.cookies.get('ghostboard_session')?.value;
    const authHeader = req.headers.get('Authorization');
    if (!sessionToken && authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    }

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        plan: user.plan,
        role: user.role ?? null,
      },
    });
  } catch (err) {
    console.error('[/api/auth/session] GET Error:', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

/**
 * POST /api/auth/session
 * Mint a rate-limited guest session or validate existing session token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const client = body?.client === 'desktop' ? 'desktop' : 'web';

    if (client === 'web' && !validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch', code: 'ORIGIN_MISMATCH' }, { status: 403 });
    }

    // P0-4: Strict rate limit on minting guest sessions (max 5 guest sessions per 15 mins per IP)
    const rateLimit = await checkRateLimit(req, 5, 15 * 60 * 1000, 'auth_guest_session');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Забагато запитів на створення сесій. Спробуйте пізніше.',
          code: 'RATE_LIMITED',
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const guestId = `guest_${crypto.randomBytes(8).toString('hex')}`;
    const guestEmail = `${guestId}@guest.ghostboard.ai`;
    const user = await createUser(guestEmail, 'Guest User', 'free', 'Candidate');
    const session = await createSession(user.id, client === 'desktop' ? 'desktop' : 'web');

    const publicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      role: user.role,
      isGuest: true,
    };

    if (client === 'desktop') {
      return NextResponse.json({ success: true, user: publicUser, token: session.token });
    }

    const response = NextResponse.json({ success: true, user: publicUser });
    response.cookies.set('ghostboard_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days for guest session
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('[/api/auth/session] POST Error:', err);
    return NextResponse.json({ error: 'Failed to create session', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
