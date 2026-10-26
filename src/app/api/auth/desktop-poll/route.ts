import { NextRequest, NextResponse } from 'next/server';
import { pollDesktopHandshake } from '@/lib/desktopHandshakeStore';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const handshakeId = req.nextUrl.searchParams.get('handshake');
    if (!handshakeId) {
      return NextResponse.json(
        { error: 'Missing handshake parameter', code: 'MISSING_HANDSHAKE' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Rate limit polling: max 120 polls per minute per IP (polling every 1.5s = ~40 req/min)
    const rateLimit = await checkRateLimit(req, 120, 60000, `desktop_poll_${handshakeId}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfterSec: rateLimit.retryAfterSec },
        { status: 429, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const record = await pollDesktopHandshake(handshakeId);
    if (!record) {
      return NextResponse.json(
        { ready: false, error: 'Handshake expired or not found', code: 'HANDSHAKE_NOT_FOUND' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (record.status === 'ready' && record.token) {
      return NextResponse.json(
        {
          ready: true,
          status: 'ready',
          token: record.token,
          user: record.user,
        },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return NextResponse.json(
      {
        ready: false,
        status: 'pending',
        expiresAt: record.expiresAt,
      },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err: unknown) {
    console.error('[/api/auth/desktop-poll] Error:', err);
    return NextResponse.json(
      { error: 'Polling error', ready: false },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
