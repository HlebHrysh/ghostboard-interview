import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/serverDb';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ghostboard_session')?.value;
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('ghostboard_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Logout failed' }, { status: 500 });
  }
}
