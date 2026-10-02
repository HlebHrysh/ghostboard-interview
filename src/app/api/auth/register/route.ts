import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUser, createSession } from '@/lib/serverDb';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    // Anti-spam: max 5 registrations per minute per IP
    const rateLimit = await checkRateLimit(req, 5, 60000, 'auth_register');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Занадто багато реєстрацій. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => ({}));

    const { email, name, role } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Введіть коректну електронну пошту' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = typeof name === 'string' && name.trim() ? name.trim() : cleanEmail.split('@')[0];
    const cleanRole = typeof role === 'string' && role.trim() ? role.trim() : 'Python Backend Developer';

    const user = await findOrCreateUser(cleanEmail, cleanName, cleanRole);
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
    console.error('Error during register:', err);
    return NextResponse.json({ error: err.message || 'Помилка реєстрації' }, { status: 500 });
  }
}
