import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, isOAuthProviderConfigured, createOAuthState } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '/interview';
  const role = searchParams.get('role') || undefined;

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

  const baseUrl = getAppBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/oauth/github/callback`;

  // Check if credentials are set
  if (!clientId || !clientSecret) {
    const errorUrl = new URL('/auth/login', baseUrl);
    errorUrl.searchParams.set('error', 'missing_credentials');
    errorUrl.searchParams.set('provider', 'GitHub');
    errorUrl.searchParams.set('from', from);
    return NextResponse.redirect(errorUrl);
  }

  const { state, setCookie } = createOAuthState('github', from, role);

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(githubAuthUrl);
  setCookie(response);
  return response;
}
