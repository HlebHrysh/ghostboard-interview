import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAppBaseUrl, 
  isOAuthProviderConfigured, 
  createOAuthState, 
  validateOAuthState 
} from '../src/lib/oauth';
import { GET as googleInitRoute } from '../src/app/api/auth/oauth/google/route';
import { GET as githubInitRoute } from '../src/app/api/auth/oauth/github/route';
import { GET as oauthStatusRoute } from '../src/app/api/auth/oauth/status/route';

describe('OAuth Authentication System', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAppBaseUrl', () => {
    it('uses x-forwarded-host and x-forwarded-proto when behind reverse proxy', () => {
      const req = new NextRequest('http://internal-docker-host:3000/api/auth/oauth/google', {
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'ghostboard.ai',
        },
      });
      expect(getAppBaseUrl(req)).toBe('https://ghostboard.ai');
    });

    it('falls back to request origin if no forwarding headers', () => {
      const req = new NextRequest('http://localhost:3001/api/auth/oauth/google');
      expect(getAppBaseUrl(req)).toBe('http://localhost:3001');
    });
  });

  describe('isOAuthProviderConfigured', () => {
    it('returns false when credentials are empty', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      expect(isOAuthProviderConfigured('google')).toBe(false);
      expect(isOAuthProviderConfigured('github')).toBe(false);
    });

    it('returns true when client id and secret are set', () => {
      process.env.GOOGLE_CLIENT_ID = 'test_google_id';
      process.env.GOOGLE_CLIENT_SECRET = 'test_google_secret';
      process.env.GITHUB_CLIENT_ID = 'test_github_id';
      process.env.GITHUB_CLIENT_SECRET = 'test_github_secret';

      expect(isOAuthProviderConfigured('google')).toBe(true);
      expect(isOAuthProviderConfigured('github')).toBe(true);
    });
  });

  describe('createOAuthState and validateOAuthState', () => {
    it('generates state and validates it from cookie', () => {
      const { state, setCookie } = createOAuthState('google', '/interview', 'frontend');
      expect(state).toHaveLength(48);

      const fakeRes = NextResponse.next();
      setCookie(fakeRes);

      const cookieVal = fakeRes.cookies.get('ghostboard_oauth_session')?.value;
      expect(cookieVal).toBeDefined();

      const reqWithCookie = new NextRequest('http://localhost:3001/api/auth/oauth/google/callback', {
        headers: {
          cookie: `ghostboard_oauth_session=${cookieVal}`,
        },
      });

      const { valid, payload } = validateOAuthState(reqWithCookie, state);
      expect(valid).toBe(true);
      expect(payload?.provider).toBe('google');
      expect(payload?.destination).toBe('/interview');
      expect(payload?.role).toBe('frontend');
    });

    it('rejects invalid or tampered state', () => {
      const { setCookie } = createOAuthState('github', '/profile');
      const fakeRes = NextResponse.next();
      setCookie(fakeRes);
      const cookieVal = fakeRes.cookies.get('ghostboard_oauth_session')?.value;

      const reqWithCookie = new NextRequest('http://localhost:3001/api/auth/oauth/github/callback', {
        headers: {
          cookie: `ghostboard_oauth_session=${cookieVal}`,
        },
      });

      const { valid } = validateOAuthState(reqWithCookie, 'wrong_tampered_state');
      expect(valid).toBe(false);
    });
  });

  describe('OAuth Route Handlers', () => {
    it('googleInitRoute redirects to /auth/login with missing_credentials error if unconfigured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const req = new NextRequest('http://localhost:3001/api/auth/oauth/google?from=/interview');
      const res = await googleInitRoute(req);

      expect(res.status).toBe(307);
      const loc = res.headers.get('location');
      expect(loc).toContain('/auth/login');
      expect(loc).toContain('error=missing_credentials');
      expect(loc).toContain('provider=Google');
    });

    it('googleInitRoute redirects to accounts.google.com when credentials are configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'my_google_client_id';
      process.env.GOOGLE_CLIENT_SECRET = 'my_google_client_secret';

      const req = new NextRequest('http://localhost:3001/api/auth/oauth/google?from=/interview');
      const res = await googleInitRoute(req);

      expect(res.status).toBe(307);
      const loc = res.headers.get('location');
      expect(loc).toContain('accounts.google.com/o/oauth2/v2/auth');
      expect(loc).toContain('client_id=my_google_client_id');
      expect(loc).toContain('scope=openid+email+profile');
    });

    it('githubInitRoute redirects to /auth/login with missing_credentials error if unconfigured', async () => {
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      const req = new NextRequest('http://localhost:3001/api/auth/oauth/github?from=/interview');
      const res = await githubInitRoute(req);

      expect(res.status).toBe(307);
      const loc = res.headers.get('location');
      expect(loc).toContain('/auth/login');
      expect(loc).toContain('error=missing_credentials');
      expect(loc).toContain('provider=GitHub');
    });

    it('githubInitRoute redirects to github.com/login/oauth/authorize when configured', async () => {
      process.env.GITHUB_CLIENT_ID = 'my_github_client_id';
      process.env.GITHUB_CLIENT_SECRET = 'my_github_client_secret';

      const req = new NextRequest('http://localhost:3001/api/auth/oauth/github?from=/interview');
      const res = await githubInitRoute(req);

      expect(res.status).toBe(307);
      const loc = res.headers.get('location');
      expect(loc).toContain('github.com/login/oauth/authorize');
      expect(loc).toContain('client_id=my_github_client_id');
      expect(loc).toContain('scope=read%3Auser+user%3Aemail');
    });

    it('oauthStatusRoute reports configuration state accurately', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      process.env.GITHUB_CLIENT_ID = 'test_id';
      process.env.GITHUB_CLIENT_SECRET = 'test_secret';

      const res = await oauthStatusRoute();
      const data = await res.json();
      expect(data).toEqual({
        google: false,
        github: true,
      });
    });
  });
});
