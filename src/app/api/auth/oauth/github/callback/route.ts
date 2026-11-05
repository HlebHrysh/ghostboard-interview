import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, validateOAuthState, clearOAuthCookie } from '@/lib/oauth';
import { findOrCreateUser, createSession } from '@/lib/serverDb';
import { bindDesktopHandshake } from '@/lib/desktopHandshakeStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const { searchParams } = new URL(req.url);

  const error = searchParams.get('error');
  if (error) {
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('provider', 'GitHub');
    return NextResponse.redirect(redirectUrl);
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Validate state
  const { valid, payload } = validateOAuthState(req, state);
  if (!valid || !code || !payload) {
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'invalid_state');
    redirectUrl.searchParams.set('provider', 'GitHub');
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const redirectUri = `${baseUrl}/api/auth/oauth/github/callback`;

  if (!clientId || !clientSecret) {
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'missing_credentials');
    redirectUrl.searchParams.set('provider', 'GitHub');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[GitHub OAuth Token Error]', errText);
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      redirectUrl.searchParams.set('provider', 'GitHub');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('[GitHub OAuth Missing Token]', tokenData);
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      redirectUrl.searchParams.set('provider', 'GitHub');
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Fetch User Profile from GitHub API
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Ghostboard-Auth',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!userRes.ok) {
      console.error('[GitHub OAuth User Error]', await userRes.text());
      const redirectUrl = new URL('/auth/login', baseUrl);
      redirectUrl.searchParams.set('error', 'profile_fetch_failed');
      redirectUrl.searchParams.set('provider', 'GitHub');
      return NextResponse.redirect(redirectUrl);
    }

    const profile = await userRes.json();
    let email = profile.email?.trim().toLowerCase();

    // If email is private in GitHub profile, fetch from /user/emails
    if (!email) {
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Ghostboard-Auth',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (emailsRes.ok) {
          const emailsList: Array<{ email: string; primary: boolean; verified: boolean }> = await emailsRes.json();
          const primaryVerified = emailsList.find((e) => e.primary && e.verified);
          const anyVerified = emailsList.find((e) => e.verified);
          email = primaryVerified?.email?.trim().toLowerCase() || anyVerified?.email?.trim().toLowerCase() || emailsList[0]?.email?.trim().toLowerCase();
        }
      } catch (emailErr) {
        console.warn('[GitHub OAuth Email Fetch Warning]', emailErr);
      }
    }

    // Fallback if GitHub account has no public or verified email
    if (!email || !email.includes('@')) {
      email = `${profile.login || profile.id}@users.noreply.github.com`;
    }

    const name = profile.name || profile.login || 'GitHub Developer';

    // 3. Find or register user in database
    const assignedRole = payload.role || 'Full-Stack Software Engineer';
    const user = await findOrCreateUser(email, name, assignedRole);

    // 4. Create persistent session
    const isDesktop = payload.client === 'desktop';
    const session = await createSession(user.id, isDesktop ? 'desktop' : 'web');

    // 4.1 Bind desktop handshake if initiated from desktop app
    if (payload.handshake) {
      try {
        await bindDesktopHandshake(payload.handshake, {
          token: session.token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name ?? null,
            plan: user.plan,
            role: user.role ?? null,
          },
        });
      } catch (bindErr) {
        console.warn('[GitHub OAuth Callback] Failed to bind handshake:', bindErr);
      }
    }

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
        console.warn('[GitHub OAuth Callback] Invalid desktop redirectUri:', payload.redirectUri);
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
    console.error('[GitHub OAuth Callback Exception]', err);
    const redirectUrl = new URL('/auth/login', baseUrl);
    redirectUrl.searchParams.set('error', 'server_error');
    redirectUrl.searchParams.set('provider', 'GitHub');
    return NextResponse.redirect(redirectUrl);
  }
}
