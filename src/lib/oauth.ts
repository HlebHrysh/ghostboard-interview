import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export interface OAuthStatePayload {
  state: string;
  provider: 'google' | 'github';
  destination: string;
  role?: string;
  timestamp: number;
  client?: 'web' | 'desktop';
  redirectUri?: string;
  desktopState?: string;
}

const OAUTH_COOKIE_NAME = 'ghostboard_oauth_session';

/**
 * Resolves the application base URL accurately across Docker, Cloud Run, Vercel, and local development.
 */
export function getAppBaseUrl(req: NextRequest): string {
  const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const isLocal = rawHost ? (rawHost.includes('localhost') || rawHost.includes('127.0.0.1')) : false;

  // If testing locally, always preserve local host & port
  if (isLocal && rawHost) {
    return `http://${rawHost.split(',')[0].trim()}`.replace(/\/$/, '');
  }

  // 1. Explicit configured production URL
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Derive from reverse-proxy forwarding headers (e.g., Google Cloud Run, Cloudflare, NGINX)
  const rawProto = req.headers.get('x-forwarded-proto') || 'https';
  const forwardedProto = rawProto.split(',')[0].trim();

  if (rawHost) {
    const forwardedHost = rawHost.split(',')[0].trim();
    return `${forwardedProto || 'https'}://${forwardedHost}`.replace(/\/$/, '');
  }

  // 3. Fallback to Next.js request origin
  return req.nextUrl.origin.replace(/\/$/, '');
}

/**
 * Checks if credentials for the given OAuth provider are set.
 */
export function isOAuthProviderConfigured(provider: 'google' | 'github'): boolean {
  if (provider === 'google') {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() && 
      process.env.GOOGLE_CLIENT_SECRET?.trim()
    );
  }
  if (provider === 'github') {
    return Boolean(
      process.env.GITHUB_CLIENT_ID?.trim() && 
      process.env.GITHUB_CLIENT_SECRET?.trim()
    );
  }
  return false;
}

/**
 * Generates an OAuth state and sets a secure httpOnly cookie to prevent CSRF.
 */
export function createOAuthState(
  provider: 'google' | 'github',
  destination: string = '/interview',
  role?: string,
  client?: 'web' | 'desktop',
  redirectUri?: string,
  desktopState?: string
): { state: string; setCookie: (res: NextResponse) => void } {
  const stateRandom = crypto.randomBytes(24).toString('hex');
  const payload: OAuthStatePayload = {
    state: stateRandom,
    provider,
    destination: destination.startsWith('/') ? destination : '/interview',
    role: role || undefined,
    client: client || 'web',
    redirectUri: redirectUri || undefined,
    desktopState: desktopState || undefined,
    timestamp: Date.now(),
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return {
    state: stateRandom,
    setCookie: (res: NextResponse) => {
      res.cookies.set(OAUTH_COOKIE_NAME, serialized, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60, // 10 minutes
        path: '/',
      });
    },
  };
}

/**
 * Validates the state parameter returned by the OAuth callback against the stored cookie.
 */
export function validateOAuthState(
  req: NextRequest,
  returnedState: string | null
): { valid: boolean; payload?: OAuthStatePayload } {
  if (!returnedState) return { valid: false };

  const cookie = req.cookies.get(OAUTH_COOKIE_NAME)?.value;
  if (!cookie) return { valid: false };

  try {
    const decoded = JSON.parse(Buffer.from(cookie, 'base64url').toString('utf8')) as OAuthStatePayload;
    
    // Check state token equality and expiry (15 mins)
    const isStateMatch = decoded.state === returnedState;
    const isNotExpired = Date.now() - decoded.timestamp < 15 * 60 * 1000;

    if (isStateMatch && isNotExpired) {
      return { valid: true, payload: decoded };
    }
  } catch (err) {
    console.error('[OAuth State] Failed to parse cookie:', err);
  }

  return { valid: false };
}

/**
 * Clears the temporary OAuth state cookie upon flow completion.
 */
export function clearOAuthCookie(res: NextResponse): void {
  res.cookies.set(OAUTH_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
  });
}
