import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, validateOAuthState, clearOAuthCookie } from '@/lib/oauth';
import { findOrCreateUser, createSession } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const { searchParams } = new URL(req.url);

  const error = searchParams.get('error');
  if (error) {
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('provider', 'Google');
    return NextResponse.redirect(redirectUrl);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Validate state
  const { valid, payload } = validateOAuthState(req, state);
  if (!valid || !code || !payload) {
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'invalid_state');
    redirectUrl.searchParams.set('provider', 'Google');
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;

  if (!clientId || !clientSecret) {
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'missing_credentials');
    redirectUrl.searchParams.set('provider', 'Google');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Google OAuth Token Error]', errText);
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      redirectUrl.searchParams.set('provider', 'Google');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile from Google userinfo API
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('[Google OAuth UserInfo Error]', await userRes.text());
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('error', 'profile_fetch_failed');
      redirectUrl.searchParams.set('provider', 'Google');
      return NextResponse.redirect(redirectUrl);
    }

    const profile = await userRes.json();
    const email = profile.email?.trim().toLowerCase();
    const name = profile.name || profile.given_name || email?.split('@')[0] || 'Google Candidate';

    if (!email || !email.includes('@')) {
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('error', 'no_email');
      redirectUrl.searchParams.set('provider', 'Google');
      return NextResponse.redirect(redirectUrl);
    }

    // 3. Find or register user in database
    const assignedRole = payload.role || 'Full-Stack Software Engineer';
    const user = await findOrCreateUser(email, name, assignedRole);

    // 4. Create persistent session
    const isDesktop = payload.client === 'desktop' && !!payload.redirectUri;
    const session = await createSession(user.id, isDesktop ? 'desktop' : 'web');

    // 5. Successful redirect (Desktop loopback or Web destination)
    if (isDesktop && payload.redirectUri) {
      try {
        const u = new URL(payload.redirectUri);
        if (['127.0.0.1', 'localhost'].includes(u.hostname)) {
          u.searchParams.set('token', session.token);
          if (payload.desktopState) {
            u.searchParams.set('state', payload.desktopState);
          }
          const response = NextResponse.redirect(u.toString());
          response.cookies.set('ghostboard_session', session.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
          });
          clearOAuthCookie(response);
          return response;
        }
      } catch (e) {
        console.warn('[Google OAuth Callback] Invalid desktop redirectUri:', payload.redirectUri);
      }
    }

    const destination = payload.destination || '/interview';
    const destinationUrl = new URL(destination, baseUrl);

    const response = NextResponse.redirect(destinationUrl);

    // Set Ghostboard session cookie
    response.cookies.set('ghostboard_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    clearOAuthCookie(response);
    return response;
  } catch (err: unknown) {
    console.error('[Google OAuth Callback Exception]', err);
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'server_error');
    redirectUrl.searchParams.set('provider', 'Google');
    return NextResponse.redirect(redirectUrl);
  }
}
