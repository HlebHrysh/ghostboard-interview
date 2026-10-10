import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { createAdminToken } from '@/lib/adminGuard';

export async function POST(req: NextRequest) {
  // Brute-force protection: max 5 admin login attempts per minute per IP
  const rateLimit = await checkRateLimit(req, 5, 60000, 'admin_auth');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Забагато спроб входу. Зачекайте ${rateLimit.retryAfterSec} сек.` },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body;

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: "Пароль обов'язковий" }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error('[Admin Auth] ADMIN_PASSWORD env var is not set!');
    return NextResponse.json({ error: 'Сервер не налаштований' }, { status: 503 });
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Невірний пароль' }, { status: 401 });
  }

  const token = createAdminToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set('ghostboard_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('ghostboard_admin_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
  return res;
}

