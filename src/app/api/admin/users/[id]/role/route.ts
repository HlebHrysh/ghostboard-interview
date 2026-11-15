import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/adminGuard';
import {
  getUserById,
  normalizeAppRole,
  updateUserRole,
  VALID_APP_ROLES,
} from '@/lib/serverDb';
import { clearDevOverrides } from '@/lib/devGuard';
import { logger } from '@/lib/logger';
import { getClientIp, validateOrigin } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const rbacLog = logger.child({ component: 'admin-rbac' });

const roleUpdateSchema = z.object({
  role: z.enum(VALID_APP_ROLES),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden: Origin mismatch' }, { status: 403 });
  }

  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = roleUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid RBAC role. Allowed values: user, developer, admin' },
        { status: 400 }
      );
    }

    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousRole = normalizeAppRole(existing.role);
    const nextRole = parsed.data.role;

    const updated = await updateUserRole(id, nextRole);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (nextRole === 'user') {
      clearDevOverrides(id);
    }

    const actionType =
      nextRole === 'developer'
        ? 'grant_developer'
        : nextRole === 'user' && previousRole === 'developer'
        ? 'revoke_developer'
        : 'assign_role';

    rbacLog.info('RBAC role updated for user', {
      action: actionType,
      userId: id,
      email: existing.email,
      previousRole,
      nextRole,
      ip: getClientIp(req),
      sessionToken: req.cookies.get('ghostboard_admin_session')?.value,
    });

    return NextResponse.json(
      {
        success: true,
        user: updated,
        previousRole,
        role: nextRole,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err: unknown) {
    rbacLog.error('Failed to update RBAC role', {
      userId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}
