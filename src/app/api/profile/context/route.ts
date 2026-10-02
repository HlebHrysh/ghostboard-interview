import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, updateUserResumeContext } from '@/lib/serverDb';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('ghostboard_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({ resumeContext: user.resumeContext || '' });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ghostboard_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { resumeContext } = await req.json();
    await updateUserResumeContext(user.id, resumeContext || '');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
