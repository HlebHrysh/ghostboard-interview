import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserById, setUserPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '@/lib/serverDb';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch', code: 'ORIGIN_MISMATCH' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(req, 10, 60000, 'password_change');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, { status: 429 });
    }

    const token =
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('x-ghostboard-client') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const sessionUser = token ? await getSessionUser(token) : null;
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = await getUserById(sessionUser.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found', code: 'USER_NOT_FOUND' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    // If user already has a password, verify it
    if (user.passwordHash) {
      if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: 'Current password incorrect', code: 'WRONG_CURRENT_PASSWORD' }, { status: 400 });
      }
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`, code: 'WEAK_PASSWORD' },
        { status: 400 }
      );
    }

    await setUserPassword(user.id, newPassword);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Server error', code: 'SERVER_ERROR' }, { status: 500 });
  }
}
