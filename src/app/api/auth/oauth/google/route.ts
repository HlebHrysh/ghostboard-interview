import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, isOAuthProviderConfigured, createOAuthState } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '/interview';
  const role = searchParams.get('role') || undefined;

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  const baseUrl = getAppBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;

  // Check if credentials are set
  if (!clientId || !clientSecret) {
    const errorUrl = new URL('/auth/login', baseUrl);
    errorUrl.searchParams.set('error', 'missing_credentials');
    errorUrl.searchParams.set('provider', 'Google');
    errorUrl.searchParams.set('from', from);
    return NextResponse.redirect(errorUrl);
  }

  const { state, setCookie } = createOAuthState('google', from, role);

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(googleAuthUrl);
  setCookie(response);
  return response;
}
