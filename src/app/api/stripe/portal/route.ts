import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/serverDb';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('ghostboard_session')?.value;
    const user = token ? await getSessionUser(token) : null;
    const origin = req.nextUrl.origin;

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (stripeKey && stripeKey.startsWith('sk_') && user) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeKey);

      // Search for customer by email
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customers.data[0].id,
          return_url: `${origin}/settings`,
        });
        return NextResponse.json({ url: portalSession.url });
      }
    }

    // Fallback: in sandbox mode or no stripe customer yet
    return NextResponse.json({
      url: `${origin}/settings?billing_managed=true`,
      simulated: true,
      message: 'Керування підпискою в симуляторі',
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Portal session failed' }, { status: 500 });
  }
}
