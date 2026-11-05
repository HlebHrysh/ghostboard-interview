import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/adminGuard';
import { isProdSimulatorAllowed } from '@/lib/envGuard';

const MAX_API_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_UPLOAD_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB for resume uploads

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // P1-6: Enforce body size limits and chunked transfer-encoding protection on mutating /api/* routes
  if (pathname.startsWith('/api/')) {
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const transferEncoding = req.headers.get('transfer-encoding');
      const contentLength = req.headers.get('content-length');

      // Reject chunked transfer-encoding without Content-Length
      if (transferEncoding && transferEncoding.toLowerCase().includes('chunked') && !contentLength) {
        return NextResponse.json(
          { error: 'Length Required: chunked transfer encoding without Content-Length is rejected' },
          { status: 411 }
        );
      }

      if (contentLength) {
        const parsedLength = parseInt(contentLength, 10);
        const maxLimit = pathname.startsWith('/api/resume') ? MAX_UPLOAD_PAYLOAD_BYTES : MAX_API_PAYLOAD_BYTES;
        if (isNaN(parsedLength) || parsedLength > maxLimit) {
          return NextResponse.json(
            { error: 'Payload Too Large: request body exceeds allowed limit' },
            { status: 413 }
          );
        }
      }
    }
  }

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
    '/api/:path*',
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
