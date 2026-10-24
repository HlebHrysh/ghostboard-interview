import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, updateUserResumeContext, updateUserCandidateProfile } from '@/lib/serverDb';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('ghostboard_session')?.value || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json({
    resumeContext: user.resumeContext || '',
    candidateProfile: user.candidateProfile || null,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('ghostboard_session')?.value || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { resumeContext, candidateProfile } = body;
    if (resumeContext !== undefined) {
      await updateUserResumeContext(user.id, resumeContext || '');
    }
    if (candidateProfile !== undefined) {
      await updateUserCandidateProfile(user.id, candidateProfile);
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message }, { status: 500 });
  }
}
