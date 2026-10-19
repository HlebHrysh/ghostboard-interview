import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getUserById, updateUser, updateUserPlan, banUser, resetUserSessions } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, plan } = body;

    let updatedUser = null;
    let message = '';

    switch (action) {
      case 'grant_vip':
        await updateUserPlan(id, 'lifetime');
        updatedUser = await getUserById(id);
        message = `Lifetime Founder VIP access granted to ${user.email}`;
        break;

      case 'grant_pro':
        await updateUserPlan(id, 'pro');
        updatedUser = await getUserById(id);
        message = `Pro Pass granted to ${user.email}`;
        break;

      case 'revoke_plan':
        await updateUserPlan(id, 'free');
        updatedUser = await getUserById(id);
        message = `Plan revoked to Free for ${user.email}`;
        break;

      case 'toggle_ban':
        const newBannedState = !user.isBanned;
        await banUser(id, newBannedState);
        updatedUser = await getUserById(id);
        message = newBannedState
          ? `User ${user.email} banned and sessions terminated`
          : `User ${user.email} unbanned`;
        break;

      case 'ban':
        await banUser(id, true);
        updatedUser = await getUserById(id);
        message = `User ${user.email} banned`;
        break;

      case 'unban':
        await banUser(id, false);
        updatedUser = await getUserById(id);
        message = `User ${user.email} unbanned`;
        break;

      case 'reset_sessions':
        const revokedCount = await resetUserSessions(id);
        await updateUser(id, { trialQuestionsUsed: 0 });
        updatedUser = await getUserById(id);
        message = `Reset ${revokedCount} active sessions and trial questions for ${user.email}`;
        break;

      case 'set_plan':
        if (!plan) return NextResponse.json({ error: 'Missing plan parameter' }, { status: 400 });
        await updateUserPlan(id, plan);
        updatedUser = await getUserById(id);
        message = `Plan updated to ${plan} for ${user.email}`;
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported admin action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('[Admin User Action Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to execute administrative action' },
      { status: 500 }
    );
  }
}
