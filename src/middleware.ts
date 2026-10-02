import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /interview and /profile UI — require active ghostboard_session
  if (
    pathname === '/interview' ||
    pathname.startsWith('/interview/') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/')
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
    
    if (!adminCookie || adminCookie !== 'authenticated') {
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
  matcher: ['/admin/:path*', '/api/admin/:path*', '/interview', '/interview/:path*', '/profile', '/profile/:path*'],
};
