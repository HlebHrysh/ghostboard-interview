import { NextRequest, NextResponse } from 'next/server';
import { createDesktopHandshake } from '@/lib/desktopHandshakeStore';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Anti-abuse rate limit: 20 handshake inits per minute per IP
    const rateLimit = await checkRateLimit(req, 20, 60000, 'desktop_init');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSec: rateLimit.retryAfterSec },
        { status: 429 }
      );
    }

    const handshake = await createDesktopHandshake();

    const origin = req.nextUrl.origin || 'http://localhost:3000';
    const loginUrl = `${origin}/auth/login?client=desktop&handshake=${handshake.id}`;
    const signupUrl = `${origin}/auth/signup?client=desktop&handshake=${handshake.id}`;

    return NextResponse.json(
      {
        success: true,
        handshakeId: handshake.id,
        expiresAt: handshake.expiresAt,
        loginUrl,
        signupUrl,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: unknown) {
    console.error('[/api/auth/desktop-init] Error:', err);
    return NextResponse.json(
      { error: 'Failed to initialize desktop handshake' },
      { status: 500 }
    );
  }
}
