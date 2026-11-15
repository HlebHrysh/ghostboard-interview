import { NextRequest, NextResponse } from 'next/server';
import { validateOrigin } from '@/lib/rateLimit';
import { getSessionUser } from '@/lib/serverDb';
import { getUserBillingSummary, isStripeConfigured } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const origin = req.nextUrl.origin;
  const token = req.cookies.get('ghostboard_session')?.value;
  const sessionUser = token ? await getSessionUser(token) : null;

  if (!sessionUser) {
    return NextResponse.json({
      url: `${origin}/pricing`,
      provider: 'none',
    });
  }

  const summary = await getUserBillingSummary({
    userId: sessionUser.id,
    email: sessionUser.email,
    fallbackPlan: sessionUser.plan,
  });

  if (summary.provider === 'stripe' && isStripeConfigured()) {
    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
      const customers = await stripe.customers.list({
        email: sessionUser.email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customers.data[0].id,
          return_url: `${origin}/settings?billing_managed=true`,
        });
        return NextResponse.json({ url: portal.url, provider: 'stripe' });
      }
    } catch {
      // Fallback to in-app subscription management view
    }
  }

  if (summary.provider === 'lemonsqueezy') {
    const storeSlug = process.env.LEMONSQUEEZY_STORE_SLUG?.trim();
    if (storeSlug) {
      return NextResponse.json({
        url: `https://${storeSlug}.lemonsqueezy.com/billing`,
        provider: 'lemonsqueezy',
      });
    }
  }

  return NextResponse.json({
    url: `${origin}/pricing?manage=subscription`,
    provider: summary.provider || 'sandbox',
  });
}
