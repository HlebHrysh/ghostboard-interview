import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createUser, createSession, setUserPassword, MIN_PASSWORD_LENGTH } from '@/lib/serverDb';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

/**
 * POST /api/auth/register
 * Body: { email, password, name?, role? }
 *
 * Error codes: INVALID_EMAIL, WEAK_PASSWORD, EMAIL_TAKEN, RATE_LIMITED
 *
 * Previously this used findOrCreateUser, which meant "registering" with someone else's
 * email silently logged you into their account. Now an existing email is rejected.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, name, role } = body;
    const client = body?.client === 'desktop' ? 'desktop' : 'web';

    if (client === 'web' && !validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch', code: 'ORIGIN_MISMATCH' }, { status: 403 });
    }

    // Anti-spam: max 5 registrations per minute per IP
    const rateLimit = await checkRateLimit(req, 5, 60000, 'auth_register');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts', code: 'RATE_LIMITED', retryAfterSec: rateLimit.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email', code: 'INVALID_EMAIL' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, code: 'WEAK_PASSWORD' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (await getUserByEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Email already registered', code: 'EMAIL_TAKEN' }, { status: 409 });
    }

    const cleanName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 80) : cleanEmail.split('@')[0];
    const cleanRole = typeof role === 'string' && role.trim() ? role.trim().slice(0, 80) : 'Python Backend Developer';

    const user = await createUser(cleanEmail, cleanName, 'free', cleanRole);
    await setUserPassword(user.id, password);
    const session = await createSession(user.id, client === 'desktop' ? 'desktop' : 'web');

    const publicUser = { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role };
    if (client === 'desktop') {
      return NextResponse.json({
        success: true,
        user: publicUser,
        token: session.token,
      });
    }

    const response = NextResponse.json({
      success: true,
      user: publicUser,
    });

    response.cookies.set('ghostboard_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (err: unknown) {
    console.error('Error during register:', err);
    return NextResponse.json({ error: 'Registration failed', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
