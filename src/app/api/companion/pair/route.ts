import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, createSession } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 30, 60000, 'companion_pair');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const token =
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('x-ghostboard-client') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please login first.' }, { status: 401 });
    }

    // Generate a fresh session token specifically for the paired companion device
    const deviceSession = await createSession(user.id);
    const host = req.headers.get('host') || 'localhost:3001';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const companionUrl = `${proto}://${host}/companion/${deviceSession.token}?token=${deviceSession.token}`;
    const desktopDeepLink = `ghostboard://pair?token=${deviceSession.token}`;

    return NextResponse.json({
      success: true,
      token: deviceSession.token,
      userId: user.id,
      email: user.email,
      companionUrl,
      desktopDeepLink,
      expiresAt: deviceSession.expiresAt,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Internal error' }, { status: 500 });
  }
}
