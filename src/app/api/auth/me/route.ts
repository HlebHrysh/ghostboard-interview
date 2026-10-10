import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/serverDb';

export async function GET(req: NextRequest) {
  try {
    let sessionToken = req.cookies.get('ghostboard_session')?.value;
    
    // Support Desktop App token via Authorization header
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
    console.error('[/api/auth/me] Error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
