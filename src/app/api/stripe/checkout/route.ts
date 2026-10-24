import { NextRequest, NextResponse } from 'next/server';
import { isProdSimulatorAllowed } from '@/lib/envGuard';

interface PlanConfig {
  name: string;
  description: string;
  amountCents: number;
  mode: 'payment' | 'subscription';
  targetPlan: 'pro' | 'lifetime';
  interval?: 'month' | 'year';
  displayPrice: string;
}

export function getPlanConfig(planId: string, billingCycle: 'monthly' | 'annual' = 'monthly'): PlanConfig {
  const p = planId.toLowerCase();

  // Emergency 24-hour Pass
  if (p.includes('emergency')) {
    return {
      name: 'Ghostboard Emergency Pass — 24h Unlimited Access',
      description: '24 hours of unlimited real-time interview teleprompter, OCR screen parsing, and AI answers.',
      amountCents: 1499,
      mode: 'payment',
      targetPlan: 'pro',
      displayPrice: '$14.99',
    };
  }

  // Lifetime plans
  if (p.includes('lifetime')) {
    if (p.includes('global')) {
      return {
        name: 'Ghostboard Lifetime Pass — AI Teleprompter & Coach (Global)',
        description: 'Lifetime access: AI-Powered Real-Time Teleprompter, Live Performance Coach & Interview Simulator',
        amountCents: 14900,
        mode: 'payment',
        targetPlan: 'lifetime',
        displayPrice: '$149',
      };
    }
    if (p.includes('ua')) {
      return {
        name: 'Ghostboard Lifetime Pass — AI Teleprompter & Coach (Special PPP)',
        description: 'Пожиттєвий доступ: AI-телесуфлер у реальному часі, персональний коуч та тренажер (Special PPP)',
        amountCents: 9900,
        mode: 'payment',
        targetPlan: 'lifetime',
        displayPrice: '$99',
      };
    }
    return {
      name: 'Ghostboard Lifetime Pass — AI Teleprompter & Coach',
      description: 'Lifetime access: AI-Powered Real-Time Teleprompter & Live Performance Coach for Technical Interviews',
      amountCents: 7900,
      mode: 'payment',
      targetPlan: 'lifetime',
      displayPrice: '$79',
    };
  }

  // Annual Pro Pass plans
  if (billingCycle === 'annual' || p.includes('annual')) {
    if (p.includes('global')) {
      return {
        name: 'Ghostboard Pro Pass — Annual Plan (Global)',
        description: 'Unlimited AI teleprompter sessions, Deepgram Nova-3 speech recognition, code assistance ($20/mo billed annually)',
        amountCents: 24000,
        mode: 'subscription',
        targetPlan: 'pro',
        interval: 'year',
        displayPrice: '$240/рік',
      };
    }
    return {
      name: 'Ghostboard Pro Pass — Річний план (Україна)',
      description: 'Безлімітні сесії AI-телесуфлера, Deepgram Nova-3 розпізнавання мови, допомога з кодом ($12/міс)',
      amountCents: 14400,
      mode: 'subscription',
      targetPlan: 'pro',
      interval: 'year',
      displayPrice: '$144/рік',
    };
  }

  // Monthly Pro Pass plans
  if (p.includes('global')) {
    return {
      name: 'Ghostboard Pro Pass — Monthly Subscription (Global)',
      description: 'AI-Powered Real-Time Teleprompter & Live Performance Coach for Technical Interviews & Daily Standups',
      amountCents: 2500,
      mode: 'subscription',
      targetPlan: 'pro',
      interval: 'month',
      displayPrice: '$25/міс',
    };
  }

  // Default UA Monthly
  return {
    name: 'Ghostboard Pro Pass — Щомісячна підписка (Україна)',
    description: 'AI-телесуфлер у реальному часі та коуч для технічних інтервʼю і стендапів (подолання мовного барʼєру)',
    amountCents: 1500,
    mode: 'subscription',
    targetPlan: 'pro',
    interval: 'month',
    displayPrice: '$15/міс',
  };
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 10 checkout attempts per minute per IP
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const rateLimit = await checkRateLimit(req, 10, 60000, 'stripe_checkout');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Занадто багато запитів. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { planId = 'pro_ua_monthly', billingCycle = 'monthly', successUrl, cancelUrl, simulate: simulateRequested = false } = body;
    // Client-supplied `simulate` is ignored in production unless ENABLE_PROD_SIMULATOR=true
    const simulate = !!simulateRequested && isProdSimulatorAllowed();

    const planConfig = getPlanConfig(planId, billingCycle);
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    const origin = req.nextUrl.origin;

    const { getSessionUser } = await import('@/lib/serverDb');
    const token = req.cookies.get('ghostboard_session')?.value;
    const user = token ? await getSessionUser(token) : null;
    const userId = user?.id || body.userId || `guest_${Date.now().toString(36)}`;
    const userEmail = user?.email || body.email;

    // 1. Live/Test Stripe Checkout (if real Stripe Secret Key is present and simulation is not forced)
    if (stripeKey && stripeKey.startsWith('sk_') && !simulate) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(stripeKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        client_reference_id: userId,
        customer_email: userEmail || undefined,
        metadata: {
          userId,
          userEmail: userEmail || '',
          planId,
          targetPlan: planConfig.targetPlan,
          billingCycle,
        },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: planConfig.name,
                description: planConfig.description,
              },
              unit_amount: planConfig.amountCents,
              ...(planConfig.mode === 'subscription' && {
                recurring: { interval: planConfig.interval || 'month' },
              }),
            },
            quantity: 1,
          },
        ],
        mode: planConfig.mode,
        success_url: successUrl || `${origin}/interview?upgrade=success&plan=${planConfig.targetPlan}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${origin}/pricing`,
      });

      return NextResponse.json({ url: session.url, mode: 'stripe' });
    }

    // Production guard: never route real customers to the fake payment gateway
    if (!isProdSimulatorAllowed()) {
      console.error('[Stripe Checkout] STRIPE_SECRET_KEY is missing/invalid in production; simulator is disabled.');
      return NextResponse.json(
        {
          error:
            'Payments are not configured on this server: set a valid STRIPE_SECRET_KEY (or ENABLE_PROD_SIMULATOR=true to explicitly allow the simulator).',
          code: 'ENV_CONFIG_ERROR',
        },
        { status: 503 }
      );
    }

    // 2. Interactive Payment Simulator Gateway
    // Allows testing the complete payment cycle locally without active Stripe keys
    const simulatorParams = new URLSearchParams({
      planId,
      billingCycle,
      targetPlan: planConfig.targetPlan,
      name: planConfig.name,
      amount: String(planConfig.amountCents),
      price: planConfig.displayPrice,
      userId,
    });
    if (userEmail) simulatorParams.set('email', userEmail);

    const simulatorUrl = `${origin}/checkout/simulator?${simulatorParams.toString()}`;

    return NextResponse.json({
      url: simulatorUrl,
      simulated: true,
      mode: 'simulator',
      plan: planConfig,
      message: 'Перехід до платіжного шлюзу Ghostboard Simulator',
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as { message?: string })?.message || 'Checkout failed' }, { status: 500 });
  }
}
