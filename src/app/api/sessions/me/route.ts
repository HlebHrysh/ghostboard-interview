import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/serverDb';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ghostboard_session')?.value;
    const user = token ? await getSessionUser(token) : null;
    
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
