import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession, verifyPassword } from '@/lib/serverDb';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

/**
 * POST /api/auth/login
 * Body: { email, password, client?: 'web' | 'desktop' }
 *
 * Error codes (translated on the client):
 *  INVALID_EMAIL, PASSWORD_REQUIRED, USER_NOT_FOUND, PASSWORD_NOT_SET, WRONG_PASSWORD, RATE_LIMITED
 *
 * - web: sets the httpOnly `ghostboard_session` cookie.
 * - desktop: returns the session token in the body (the Electron app runs from file://
 *   and cannot use cookies). Cross-origin pages cannot read this response, so returning
 *   the token is safe; the password is still required.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body as { email?: unknown; password?: unknown };
    const client = body?.client === 'desktop' ? 'desktop' : 'web';

    if (client === 'web' && !validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch', code: 'ORIGIN_MISMATCH' }, { status: 403 });
    }

    // Brute-force protection: max 10 login attempts per minute per IP
    const rateLimit = await checkRateLimit(req, 10, 60000, 'auth_login');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts', code: 'RATE_LIMITED', retryAfterSec: rateLimit.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email', code: 'INVALID_EMAIL' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required', code: 'PASSWORD_REQUIRED' }, { status: 400 });
    }

    const user = await getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      // The UI asks the visitor whether they want to register instead.
      return NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 });
    }

    if (!user.passwordHash) {
      // Legacy passwordless account or OAuth-only account. We must NOT let anyone set a
      // password here without proving ownership of the email (that would be account takeover).
      return NextResponse.json(
        { error: 'This account has no password. Sign in with Google/GitHub.', code: 'PASSWORD_NOT_SET' },
        { status: 403 }
      );
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Wrong password', code: 'WRONG_PASSWORD' }, { status: 401 });
    }

    const session = await createSession(user.id, client === 'desktop' ? 'desktop' : 'web');
    const publicUser = { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role };

    if (client === 'desktop') {
      return NextResponse.json({ success: true, user: publicUser, token: session.token });
    }

    const response = NextResponse.json({ success: true, user: publicUser });
    response.cookies.set('ghostboard_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    return response;
  } catch (err: any) {
    console.error('Error during login:', err);
    return NextResponse.json({ error: 'Login failed', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
