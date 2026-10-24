import { NextRequest, NextResponse } from 'next/server';
import { getUserBySessionToken } from '@/lib/serverDb';
import { registerUserPresence } from '@/lib/userActivity';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Rate limit: 20 heartbeats per minute per client IP
  const rateLimit = await checkRateLimit(req, 20, 60000, 'client_heartbeat');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Heartbeat rate limited' }, { status: 429 });
  }

  try {
    const sessionCookie = req.cookies.get('ghostboard_session')?.value;
    const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = sessionCookie || authHeader;

    let userId = 'guest';
    let userEmail = 'guest@ghostboard.local';

    if (token) {
      const user = await getUserBySessionToken(token);
      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    }

    const body = await req.json().catch(() => ({}));
    const clientType = body.clientType === 'desktop' ? 'desktop' : 'web';

    await registerUserPresence(userId, userEmail, clientType);

    return NextResponse.json({
      success: true,
      userId,
      clientType,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as { message?: string })?.message || 'Heartbeat failed' },
      { status: 500 }
    );
  }
}
