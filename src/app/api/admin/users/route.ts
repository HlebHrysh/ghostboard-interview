import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getAllSessions } from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;


  const users = await getAllUsers();
  const sessions = await getAllSessions();
  
  // Attach session count to each user
  const usersWithStats = users.map(user => {
    const userSessions = sessions.filter(s => s.userId === user.id);
    const totalDuration = userSessions.reduce((sum, s) => sum + s.durationSec, 0);
    return {
      ...user,
      sessionsCount: userSessions.length,
      totalDuration
    };
  });

  return NextResponse.json(usersWithStats);
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const { email, name, plan = 'free', role } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const { createUser, getUserByEmail } = await import('@/lib/serverDb');
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const user = await createUser(email, name, plan, role);
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { userId, plan, resetTrial } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { updateUserPlan, prisma } = await import('@/lib/serverDb');
    if (plan) {
      await updateUserPlan(userId, plan);
    }
    if (resetTrial && process.env.DATABASE_URL) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { trialQuestionsUsed: 0 },
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
