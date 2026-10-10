import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, createSession } from '@/lib/serverDb';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('ghostboard_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getSessionUser(sessionToken);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a new session specifically for the desktop device
    const desktopSession = await createSession(user.id, 'desktop');
    
    return NextResponse.json({ 
      token: desktopSession.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        plan: user.plan,
        role: user.role ?? null,
      }
    });
  } catch (err) {
    console.error('[/api/auth/desktop-token] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
