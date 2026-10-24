import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, saveInterviewSession, getUserInterviewSessions } from '@/lib/serverDb';
import { validateOrigin } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    const token = req.cookies.get('ghostboard_session')?.value;
    const user = token ? await getSessionUser(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: authentication required' }, { status: 401 });
    }
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const { title, durationSec, items } = body;

    const saved = await saveInterviewSession(userId, {
      title,
      durationSec: Number(durationSec) || 0,
      items: Array.isArray(items) ? items : [],
    });

    return NextResponse.json({ success: true, session: saved });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Помилка збереження сесії' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('ghostboard_session')?.value;
    const user = token ? await getSessionUser(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;

    const history = await getUserInterviewSessions(userId);
    return NextResponse.json({ success: true, history });
  } catch {
    return NextResponse.json({ success: true, history: [] });
  }
}
