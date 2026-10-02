import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createSession } from '@/lib/serverDb';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    // Brute-force protection: max 10 login attempts per minute per IP
    const rateLimit = await checkRateLimit(req, 10, 60000, 'auth_login');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Занадто багато спроб входу. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => ({}));

    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Введіть коректну електронну пошту' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(cleanEmail);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Користувача не знайдено' }, { status: 404 });
    }

    const session = await createSession(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role,
      },
    });

    response.cookies.set('ghostboard_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Error during login:', err);
    return NextResponse.json({ error: err.message || 'Помилка авторизації' }, { status: 500 });
  }
}
