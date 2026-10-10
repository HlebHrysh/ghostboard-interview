import { NextRequest, NextResponse } from 'next/server';
import { getUserBySessionToken } from '@/lib/serverDb';
import { registerOrUpdateDesktopNode } from '@/lib/desktopFleetStore';
import { getClientIp } from '@/lib/rateLimit';
import { interviewSyncStore } from '@/lib/interviewSyncStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      nodeId,
      token,
      appVersion = '1.0.0',
      platform = 'unknown',
      state = 'launcher',
      isCapturing = false,
      sttStatus = 'idle',
      micStatus = 'active',
      audioLatencyMs = 25,
    } = body;

    let user = null;
    if (token && typeof token === 'string') {
      user = await getUserBySessionToken(token);
    }

    // Default guest candidate if unauthenticated desktop client
    const userId = user?.id || 'desktop-guest';
    const userEmail = user?.email || 'guest@ghostboard.local';
    const userPlan = user?.plan || 'pro';

    const clientIp = getClientIp(req);

    const node = registerOrUpdateDesktopNode({
      nodeId: typeof nodeId === 'string' && nodeId ? nodeId : undefined,
      userId,
      userEmail,
      userPlan,
      appVersion: String(appVersion).slice(0, 32),
      platform: String(platform).slice(0, 32),
      state: state === 'stealth' || state === 'ticker' ? state : 'launcher',
      isCapturing: Boolean(isCapturing),
      sttStatus,
      micStatus,
      audioLatencyMs: Number(audioLatencyMs) || 25,
      ip: clientIp,
    });

    // Sync desktop connection state to interviewSyncStore
    interviewSyncStore.registerDevice('desktop', true, userId);
    if (isCapturing) {
      interviewSyncStore.setCapturingStatus(true, userId);
    }

    const userSync = interviewSyncStore.getState(userId);

    return NextResponse.json({
      success: true,
      nodeId: node.nodeId,
      lastSeen: node.lastSeen,
      cloudSync: {
        isFrozen: userSync.isFrozen || false,
        isPanic: userSync.isPanic || false,
        activeId: userSync.activeId || null,
        outputLanguage: userSync.outputLanguage || 'en',
        nativeLanguage: userSync.nativeLanguage || 'uk',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Heartbeat failed', code: 'HEARTBEAT_ERROR' },
      { status: 500 }
    );
  }
}
