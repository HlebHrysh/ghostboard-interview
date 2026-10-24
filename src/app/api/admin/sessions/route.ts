import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, getAllUsers } from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;


  const sessions = await getAllSessions();
  const users = await getAllUsers();
  const usersMap = new Map(users.map(u => [u.id, u]));

  const enriched = sessions.map(s => ({
    ...s,
    userEmail: usersMap.get(s.userId)?.email || 'Unknown'
  }));

  return NextResponse.json(enriched);
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const idFromQuery = searchParams.get('id');
    const body = await req.json().catch(() => ({}));
    const sessionId = idFromQuery || body.id;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { deleteSavedSession } = await import('@/lib/serverDb');
    const deleted = await deleteSavedSession(sessionId);
    if (!deleted) {
      return NextResponse.json({ error: 'Session not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Session deleted' });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Failed to delete session' }, { status: 500 });
  }
}

