import { NextRequest, NextResponse } from 'next/server';
import {
  updateUser,
  deleteUser,
  getUserById,
  isValidAppRole,
  normalizeAppRole,
} from '@/lib/serverDb';
import { requireAdmin } from '@/lib/adminGuard';
import { clearDevOverrides } from '@/lib/devGuard';
import { logger } from '@/lib/logger';

const rbacLog = logger.child({ component: 'admin-rbac' });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const body = await req.json();
    if (body.role !== undefined && !isValidAppRole(body.role)) {
      return NextResponse.json(
        { error: 'Invalid RBAC role. Allowed values: user, developer, admin' },
        { status: 400 }
      );
    }

    const existing = await getUserById(id);
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await updateUser(id, {
      plan: body.plan,
      name: body.name,
      role: body.role,
    });
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (body.role !== undefined) {
      const previousRole = normalizeAppRole(existing.role);
      if (body.role === 'user') {
        clearDevOverrides(id);
      }
      if (previousRole !== body.role) {
        rbacLog.info('RBAC role updated via user patch endpoint', {
          userId: id,
          email: existing.email,
          previousRole,
          nextRole: body.role,
        });
      }
    }

    return NextResponse.json({ success: true, user: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { id } = await params;

  try {
    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ error: 'User not found or deletion failed' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Deletion failed' }, { status: 500 });
  }
}

