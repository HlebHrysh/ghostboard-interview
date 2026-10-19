import { NextRequest, NextResponse } from 'next/server';
import { prisma, getAllUsers, getAllSessions } from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminGuard';
import { getLiveActivePresence } from '@/lib/userActivity';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const planFilter = (searchParams.get('plan') || 'all').toLowerCase();
  const statusFilter = (searchParams.get('status') || 'all').toLowerCase();
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const rawArray = searchParams.get('format') === 'array';

  const livePresence = await getLiveActivePresence();
  const liveUserMap = new Map(livePresence.activeUsers.map((u) => [u.userId, u]));

  const isPostgres = Boolean(process.env.DATABASE_URL);

  if (isPostgres) {
    try {
      const where: any = {};

      if (search) {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { role: { contains: search, mode: 'insensitive' } },
          { id: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (planFilter !== 'all') {
        where.plan = planFilter;
      }

      if (statusFilter === 'banned') {
        where.isBanned = true;
      } else if (statusFilter === 'idle') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        where.OR = [
          { lastActiveAt: { lt: sevenDaysAgo } },
          { lastActiveAt: null },
        ];
      }

      // Order By
      let orderBy: any = { createdAt: sortOrder };
      if (sortBy === 'lastActiveAt') orderBy = { lastActiveAt: sortOrder };
      else if (sortBy === 'email') orderBy = { email: sortOrder };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: {
            _count: {
              select: { history: true, sessions: true },
            },
            history: {
              select: { durationSec: true, questionsCount: true },
            },
            sessions: {
              select: { deviceType: true, expiresAt: true, createdAt: true },
              take: 5,
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const now = Date.now();
      const enrichedUsers = users.map((u) => {
        const liveInfo = liveUserMap.get(u.id);
        const totalDuration = u.history.reduce((sum, h) => sum + (h.durationSec || 0), 0);
        const totalQuestions = u.history.reduce((sum, h) => sum + (h.questionsCount || 0), 0);
        const lastActiveTime = u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : new Date(u.createdAt).getTime();
        const isIdle = now - lastActiveTime > 7 * 24 * 60 * 60 * 1000;

        let status = 'active';
        if (u.isBanned) status = 'banned';
        else if (liveInfo?.clientType === 'desktop') status = 'active_desktop';
        else if (liveInfo?.clientType === 'web') status = 'active_web';
        else if (isIdle) status = 'idle';

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          plan: u.plan,
          role: u.role,
          trialQuestionsUsed: u.trialQuestionsUsed,
          stripeCustomerId: u.stripeCustomerId,
          resumeContext: u.resumeContext,
          isBanned: u.isBanned,
          lastActiveAt: u.lastActiveAt,
          createdAt: u.createdAt,
          sessionsCount: u._count.history,
          questionsCount: totalQuestions,
          totalDuration,
          status,
          isLive: Boolean(liveInfo),
          connectedDevices: u.sessions.map((s) => s.deviceType || 'web'),
        };
      });

      if (rawArray) {
        return NextResponse.json(enrichedUsers);
      }

      return NextResponse.json({
        users: enrichedUsers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch {
      // Fallback to in-memory handling
    }
  }

  // In-Memory Fallback
  const allUsers = await getAllUsers();
  const allSessions = await getAllSessions();

  let filtered = allUsers.map((user) => {
    const userSessions = allSessions.filter((s) => s.userId === user.id);
    const totalDuration = userSessions.reduce((sum, s) => sum + s.durationSec, 0);
    const totalQuestions = userSessions.reduce((sum, s) => sum + (s.questionsCount || 0), 0);
    const liveInfo = liveUserMap.get(user.id);
    const lastActiveTime = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : new Date(user.createdAt).getTime();
    const isIdle = Date.now() - lastActiveTime > 7 * 24 * 60 * 60 * 1000;

    let status = 'active';
    if (user.isBanned) status = 'banned';
    else if (liveInfo?.clientType === 'desktop') status = 'active_desktop';
    else if (liveInfo?.clientType === 'web') status = 'active_web';
    else if (isIdle) status = 'idle';

    return {
      ...user,
      sessionsCount: userSessions.length,
      questionsCount: totalQuestions,
      totalDuration,
      status,
      isLive: Boolean(liveInfo),
      connectedDevices: ['web'],
    };
  });

  if (search) {
    filtered = filtered.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.role && u.role.toLowerCase().includes(search)) ||
        u.id.toLowerCase().includes(search)
    );
  }

  if (planFilter !== 'all') {
    filtered = filtered.filter((u) => u.plan.toLowerCase().includes(planFilter));
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((u) => u.status === statusFilter);
  }

  if (sortBy === 'sessions') {
    filtered.sort((a, b) => (sortOrder === 'asc' ? a.sessionsCount - b.sessionsCount : b.sessionsCount - a.sessionsCount));
  } else if (sortBy === 'questions') {
    filtered.sort((a, b) => (sortOrder === 'asc' ? a.questionsCount - b.questionsCount : b.questionsCount - a.questionsCount));
  } else if (sortBy === 'duration') {
    filtered.sort((a, b) => (sortOrder === 'asc' ? a.totalDuration - b.totalDuration : b.totalDuration - a.totalDuration));
  } else {
    filtered.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });
  }

  if (rawArray) {
    return NextResponse.json(filtered);
  }

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    users: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
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
    const { userId, plan, resetTrial, isBanned } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { updateUser, updateUserPlan, banUser, resetUserSessions } = await import('@/lib/serverDb');
    if (plan) {
      await updateUserPlan(userId, plan);
    }
    if (isBanned !== undefined) {
      await banUser(userId, Boolean(isBanned));
    }
    if (resetTrial) {
      await updateUser(userId, { trialQuestionsUsed: 0 });
      await resetUserSessions(userId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
