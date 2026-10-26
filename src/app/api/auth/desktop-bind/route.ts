import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, createSession } from '@/lib/serverDb';
import { bindDesktopHandshake } from '@/lib/desktopHandshakeStore';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 30, 60000, 'desktop_bind');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const handshakeId = body?.handshakeId || body?.handshake;
    const directToken = body?.token;

    if (!handshakeId) {
      return NextResponse.json(
        { error: 'Missing handshakeId' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Determine current user session: check directToken, or cookie, or auth header
    const candidateToken =
      directToken ||
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!candidateToken) {
      return NextResponse.json(
        { error: 'Unauthorized: No active user session to bind', code: 'AUTH_REQUIRED' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const user = await getSessionUser(candidateToken);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: User not found in database', code: 'INVALID_SESSION' },
        { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Create a dedicated desktop session for the user
    const desktopSession = await createSession(user.id, 'desktop');

    const publicUser = {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      plan: user.plan,
      role: user.role ?? null,
    };

    const bound = await bindDesktopHandshake(handshakeId, {
      token: desktopSession.token,
      user: publicUser,
    });

    if (!bound) {
      return NextResponse.json(
        { error: 'Handshake expired or invalid', code: 'HANDSHAKE_EXPIRED' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const deepLink = `ghostboard://auth?token=${encodeURIComponent(desktopSession.token)}`;

    return NextResponse.json(
      {
        success: true,
        user: publicUser,
        token: desktopSession.token,
        deepLink,
        handshakeId,
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: unknown) {
    console.error('[/api/auth/desktop-bind] Error:', err);
    return NextResponse.json(
      { error: 'Failed to bind session to desktop handshake' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
