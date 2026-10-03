import { NextResponse } from 'next/server';
import { isOAuthProviderConfigured } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    google: isOAuthProviderConfigured('google'),
    github: isOAuthProviderConfigured('github'),
  });
}
