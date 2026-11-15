import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/serverDb';
import {
  BILLING_PLANS,
  FREE_TIER_QUOTAS,
  getBillingCapabilities,
  getUserBillingSummary,
} from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('ghostboard_session')?.value;
  const sessionUser = token ? await getSessionUser(token) : null;
  const capabilities = getBillingCapabilities();

  if (!sessionUser) {
    return NextResponse.json(
      {
        authenticated: false,
        plan: 'free',
        planExpiresAt: null,
        provider: null,
        billingCycle: null,
        lastPaymentId: null,
        cardTokenAvailable: false,
        freeQuotas: FREE_TIER_QUOTAS,
        capabilities,
        plans: BILLING_PLANS,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
        },
      },
    );
  }

  const summary = await getUserBillingSummary({
    userId: sessionUser.id,
    email: sessionUser.email,
    fallbackPlan: sessionUser.plan,
  });

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        plan: summary.plan,
      },
      plan: summary.plan,
      planExpiresAt: summary.planExpiresAt,
      provider: summary.provider,
      billingCycle: summary.billingCycle,
      lastPaymentId: summary.lastPaymentId,
      cardTokenAvailable: summary.cardTokenAvailable,
      freeQuotas: FREE_TIER_QUOTAS,
      capabilities,
      plans: BILLING_PLANS,
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
