import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getSessionUser } from '@/lib/serverDb';

const execAsync = promisify(exec);

async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get('ghostboard_session')?.value;
  const clientToken = req.headers.get('x-ghostboard-client');
  if (!token && !clientToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (token) {
    const user = await getSessionUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  return handleEnsureAudio();
}

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req);
  if (authError) return authError;
  return handleEnsureAudio();
}


async function handleEnsureAudio() {
  try {
    // If any legacy ghostboard virtual modules are lingering, safely unload them
    const { stdout: modsOut } = await execAsync('pactl list modules short 2>/dev/null | grep -E "ghostboard" || true').catch(() => ({ stdout: '' }));
    if (modsOut.trim()) {
      const modIds = modsOut.trim().split('\n').map((line) => line.split(/\s+/)[0]).filter(Boolean);
      for (const modId of modIds) {
        await execAsync(`pactl unload-module ${modId} 2>/dev/null || true`).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      disabled: true,
      message: 'Virtual sinks disabled. Ghostboard captures directly from default system audio device.',
      running: false,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: true,
      disabled: true,
      running: false,
      error: (err as { message?: string })?.message,
    });
  }
}

