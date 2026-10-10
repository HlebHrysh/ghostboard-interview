import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';

describe('Auth Guard & Middleware Protection', () => {
  it('redirects unauthenticated users trying to access /interview to /auth/login?from=/interview', () => {
    const req = new NextRequest('http://localhost:3001/interview');
    const res = middleware(req);

    // Expect redirect response
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeDefined();
    expect(location).toContain('/auth/login');
    expect(location).toContain('from=%2Finterview');
  });

  it('redirects unauthenticated users trying to access sub-paths like /interview/session to /auth/login', () => {
    const req = new NextRequest('http://localhost:3001/interview/live');
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/auth/login');
    expect(location).toContain('from=%2Finterview%2Flive');
  });

  it('allows access to /interview when ghostboard_session cookie is present', () => {
    const req = new NextRequest('http://localhost:3001/interview', {
      headers: {
        cookie: 'ghostboard_session=valid_test_token_123',
      },
    });
    const res = middleware(req);

    // NextResponse.next() returns status 200 without redirect location
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('blocks unauthenticated access to admin routes', () => {
    const req = new NextRequest('http://localhost:3001/admin/dashboard');
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('blocks forged plain string "authenticated" cookie on admin routes', () => {
    const req = new NextRequest('http://localhost:3001/admin/dashboard', {
      headers: { cookie: 'ghostboard_admin_session=authenticated' },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/admin/login');
  });

  it('allows access to admin routes when a cryptographically signed HMAC token is present', async () => {
    const { createAdminToken } = await import('../src/lib/adminGuard');
    const token = createAdminToken();
    const req = new NextRequest('http://localhost:3001/admin/dashboard', {
      headers: { cookie: `ghostboard_admin_session=${token}` },
    });
    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated users trying to access /profile to /auth/login?from=/profile', () => {
    const req = new NextRequest('http://localhost:3001/profile');
    const res = middleware(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toBeDefined();
    expect(location).toContain('/auth/login');
    expect(location).toContain('from=%2Fprofile');
  });

  it('allows access to /profile when ghostboard_session cookie is present', () => {
    const req = new NextRequest('http://localhost:3001/profile', {
      headers: {
        cookie: 'ghostboard_session=valid_test_token_123',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('blocks empty or whitespace-only ghostboard_session cookies', () => {
    const req = new NextRequest('http://localhost:3001/interview', {
      headers: {
        cookie: 'ghostboard_session=   ',
      },
    });
    const res = middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/login');
  });
});
