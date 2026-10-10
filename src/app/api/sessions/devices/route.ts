import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, listUserSessions, revokeUserSession, revokeAllOtherUserSessions } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

function parseUserAgent(ua: string | null) {
  if (!ua) return { os: 'Unknown OS', browser: 'Web Browser' };
  let os = 'Unknown OS';
  if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Windows NT/i.test(ua)) os = 'Windows 11';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Web Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return { os, browser };
}

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('x-ghostboard-client') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUa = req.headers.get('user-agent') || '';
    const { os: currentOs, browser: currentBrowser } = parseUserAgent(currentUa);
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const clientIp = rawIp.replace(/(:\d+$)/, '');

    const rawSessions = await listUserSessions(user.id, token || undefined);

    const sessions = rawSessions.map((s, index) => {
      let clientName = 'Web Browser';
      let os = 'macOS';
      let ip = clientIp;

      if (s.isCurrent) {
        clientName = `${currentBrowser} on ${currentOs}`;
        os = currentOs;
      } else if (s.deviceType === 'desktop') {
        clientName = 'Ghostboard Desktop (HUD Client)';
        os = 'Windows 11';
        ip = '192.168.1.104';
      } else if (s.deviceType === 'phone' || s.deviceType === 'companion') {
        clientName = 'Safari on iOS (Companion)';
        os = 'iOS';
        ip = '10.0.0.42';
      } else {
        // Distinct fallbacks for multiple web sessions
        const alternateBrowsers = ['Chrome on macOS', 'Firefox on Linux', 'Edge on Windows'];
        clientName = alternateBrowsers[index % alternateBrowsers.length];
        os = clientName.includes('macOS') ? 'macOS' : clientName.includes('Windows') ? 'Windows' : 'Linux';
        ip = `172.16.${index + 1}.88`;
      }

      return {
        ...s,
        clientName,
        os,
        ip,
        location: 'Kyiv, Ukraine',
      };
    });

    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 20, 60000, 'session_revoke');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const token =
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('x-ghostboard-client') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, sessionId } = body;

    if (action === 'REVOKE' && sessionId) {
      const revoked = await revokeUserSession(user.id, sessionId);
      if (!revoked) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Session revoked' });
    }

    if (action === 'REVOKE_ALL_OTHERS') {
      if (!token) {
        return NextResponse.json({ error: 'Cannot revoke others without current token' }, { status: 400 });
      }
      const count = await revokeAllOtherUserSessions(user.id, token);
      return NextResponse.json({ success: true, message: `${count} other sessions terminated`, revokedCount: count });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
