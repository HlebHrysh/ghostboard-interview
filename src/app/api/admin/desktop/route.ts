import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminGuard';
import { getDesktopFleetStats, listDesktopNodes, removeDesktopNode, getDesktopNode } from '@/lib/desktopFleetStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const stats = getDesktopFleetStats();
  const nodes = listDesktopNodes();

  return NextResponse.json({
    stats,
    nodes,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const { action, nodeId } = body;

    if (!nodeId || typeof nodeId !== 'string') {
      return NextResponse.json({ error: 'Missing nodeId', code: 'INVALID_NODE_ID' }, { status: 400 });
    }

    if (action === 'REVOKE' || action === 'DISCONNECT') {
      const removed = removeDesktopNode(nodeId);
      return NextResponse.json({ success: true, removed, message: `Node ${nodeId} revoked` });
    }

    if (action === 'PING') {
      const node = getDesktopNode(nodeId);
      if (!node) {
        return NextResponse.json({ error: 'Node not found', code: 'NODE_NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        nodeId,
        status: Date.now() - node.lastSeen < 45000 ? 'online' : 'offline',
        lastSeenAgoSec: Math.round((Date.now() - node.lastSeen) / 1000),
      });
    }

    return NextResponse.json({ error: 'Unsupported action', code: 'INVALID_ACTION' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Server error' }, { status: 500 });
  }
}
