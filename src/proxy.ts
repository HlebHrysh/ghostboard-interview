import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminGuard';
import { isProdSimulatorAllowed } from '@/lib/envGuard';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block the payment simulator page in production (unless ENABLE_PROD_SIMULATOR=true)
  if (pathname === '/checkout/simulator' && !isProdSimulatorAllowed()) {
    const pricingUrl = new URL('/pricing', req.url);
    pricingUrl.searchParams.set('error', 'simulator_disabled');
    return NextResponse.redirect(pricingUrl);
  }

  // Protect /interview, /profile, /cabinet, and /dashboard UI — require active ghostboard_session
  if (
    (pathname === '/interview' ||
      (pathname.startsWith('/interview/') && pathname !== '/interview/dual-stream') ||
      pathname === '/profile' ||
      pathname.startsWith('/profile/') ||
      pathname === '/cabinet' ||
      pathname.startsWith('/cabinet/') ||
      pathname === '/dashboard' ||
      pathname.startsWith('/dashboard/') ||
      pathname === '/mock-interview' ||
      pathname === '/settings' ||
      pathname === '/sandbox')
  ) {
    const sessionCookie = req.cookies.get('ghostboard_session')?.value;
    if (!sessionCookie || !sessionCookie.trim()) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /admin UI and /api/admin routes, except auth endpoints
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && 
      pathname !== '/admin/login' && 
      pathname !== '/api/admin/auth') {
    
    const adminCookie = req.cookies.get('ghostboard_admin_session')?.value;
    const isValid = adminCookie ? await verifyAdminToken(adminCookie) : false;
    
    if (!isValid) {
      // If it's an API request, return 401 JSON
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized Admin API Access' }, { status: 401 });
      }
      // If it's a page request, redirect to login
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/interview',
    '/interview/:path*',
    '/profile',
    '/profile/:path*',
    '/cabinet',
    '/cabinet/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/mock-interview',
    '/settings',
    '/sandbox',
    '/checkout/simulator',
  ],
};
