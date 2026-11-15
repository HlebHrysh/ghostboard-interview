import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateOrigin } from '@/lib/rateLimit';
import { getSessionUser } from '@/lib/serverDb';
import {
  BillingDatabaseUnavailableError,
  BillingProviderConfigError,
  createBillingCheckout,
} from '@/lib/billing';

export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({
  planId: z.string().max(64).optional(),
  billingCycle: z.enum(['monthly', 'annual', 'one_time']).optional(),
  currency: z.enum(['UAH', 'USD', 'EUR', 'uah', 'usd', 'eur']).optional(),
  provider: z
    .enum(['monobank', 'lemonsqueezy', 'stripe', 'sandbox'])
    .optional(),
  email: z.string().email().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(req, 12, 60_000, 'billing_checkout');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many checkout attempts. Retry in ${rateLimit.retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      },
    );
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid checkout request parameters' },
        { status: 400 },
      );
    }

    const token = req.cookies.get('ghostboard_session')?.value;
    const sessionUser = token ? await getSessionUser(token) : null;

    const userId =
      sessionUser?.id || `guest_${Date.now().toString(36)}`;
    const email =
      sessionUser?.email ||
      parsed.data.email?.trim().toLowerCase() ||
      `guest_${Date.now().toString(36)}@ghostboard.pro`;

    // Prevent open-redirect: accept success/cancel URLs only if same-origin
    const origin = req.nextUrl.origin;
    const safeSuccessUrl =
      parsed.data.successUrl && parsed.data.successUrl.startsWith(origin)
        ? parsed.data.successUrl
        : undefined;
    const safeCancelUrl =
      parsed.data.cancelUrl && parsed.data.cancelUrl.startsWith(origin)
        ? parsed.data.cancelUrl
        : undefined;

    const result = await createBillingCheckout({
      origin,
      userId,
      email,
      planId: parsed.data.planId,
      interval: parsed.data.billingCycle,
      currency: parsed.data.currency,
      requestedProvider: parsed.data.provider,
      successUrl: safeSuccessUrl,
      cancelUrl: safeCancelUrl,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (
      err instanceof BillingProviderConfigError ||
      err instanceof BillingDatabaseUnavailableError
    ) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Unable to start checkout session',
      },
      { status: 500 },
    );
  }
}
