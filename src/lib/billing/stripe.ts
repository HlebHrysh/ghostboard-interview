import crypto from 'node:crypto';
import type { BillingCurrency, BillingPlanDefinition } from './plans';

export interface StripeCheckoutInput {
  userId: string;
  email?: string | null;
  plan: BillingPlanDefinition;
  currency: BillingCurrency;
  successUrl: string;
  cancelUrl: string;
  reference: string;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
  reference: string;
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return Boolean(key && key.startsWith('sk_'));
}

export async function createStripeCheckoutSession(
  input: StripeCheckoutInput,
): Promise<StripeCheckoutResponse> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey || !stripeKey.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey);

  const stripePriceId = process.env[input.plan.stripePriceEnvKey]?.trim();
  const mode: 'payment' | 'subscription' =
    input.plan.interval === 'one_time' ? 'payment' : 'subscription';
  const currencyLower = input.currency.toLowerCase();
  const unitAmount =
    input.plan.amountsMinor[input.currency] ?? input.plan.amountsMinor.USD;

  const lineItems = stripePriceId
    ? [{ price: stripePriceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: currencyLower,
            product_data: {
              name: input.plan.name,
              description: input.plan.description,
            },
            unit_amount: unitAmount,
            ...(mode === 'subscription' && {
              recurring: {
                interval: (input.plan.interval === 'annual' ? 'year' : 'month') as
                  | 'month'
                  | 'year',
              },
            }),
          },
          quantity: 1,
        },
      ];

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    client_reference_id: input.userId,
    customer_email: input.email || undefined,
    metadata: {
      userId: input.userId,
      userEmail: input.email || '',
      planId: input.plan.id,
      targetPlan: input.plan.targetPlan,
      billingCycle: input.plan.interval,
      currency: input.currency,
      reference: input.reference,
    },
    line_items: lineItems,
    mode,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout session URL');
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    reference: input.reference,
  };
}

/**
 * Verifies Stripe `Stripe-Signature` (`t=<unix>,v1=<hex>,...`) using HMAC-SHA256
 * and `crypto.timingSafeEqual` with a 5-minute replay tolerance window.
 */
export function verifyStripeWebhookSignature(
  rawBody: string,
  stripeSignatureHeader: string | null,
  secretOverride?: string,
  toleranceSeconds = 300,
): { valid: boolean; reason?: string; timestamp?: number } {
  const secret = (
    secretOverride || process.env.STRIPE_WEBHOOK_SECRET || ''
  ).trim();
  if (!secret) {
    return { valid: false, reason: 'STRIPE_WEBHOOK_SECRET is not configured' };
  }
  if (!stripeSignatureHeader || !stripeSignatureHeader.trim()) {
    return { valid: false, reason: 'Missing Stripe-Signature header' };
  }

  const parts = stripeSignatureHeader.split(',').map((p) => p.trim());
  let timestampStr = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key === 't') {
      timestampStr = val;
    } else if (key === 'v1' && val) {
      signatures.push(val.toLowerCase());
    }
  }

  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || signatures.length === 0) {
    return { valid: false, reason: 'Malformed Stripe-Signature header' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (toleranceSeconds > 0 && Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { valid: false, reason: 'Stripe webhook timestamp outside tolerance window' };
  }

  const signedPayload = `${timestampStr}.${rawBody}`;
  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  for (const candidate of signatures) {
    if (!/^[a-f0-9]{64}$/.test(candidate)) continue;
    const candidateBuf = Buffer.from(candidate, 'hex');
    if (
      candidateBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return { valid: true, timestamp };
    }
  }

  return { valid: false, reason: 'Stripe HMAC-SHA256 signature mismatch' };
}

export async function issueStripeRefund(params: {
  paymentIntentId?: string;
  chargeId?: string;
  sessionId?: string;
  amountMinor?: number;
}): Promise<{ refundId: string; status: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey || !stripeKey.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey);

  let paymentIntent = params.paymentIntentId;
  if (!paymentIntent && params.sessionId?.startsWith('cs_')) {
    const sess = await stripe.checkout.sessions.retrieve(params.sessionId);
    if (typeof sess.payment_intent === 'string') {
      paymentIntent = sess.payment_intent;
    }
  }

  if (!paymentIntent && !params.chargeId) {
    return {
      refundId: `revoked_local_${Date.now()}`,
      status: 'revoked_without_gateway_intent',
    };
  }

  const refund = await stripe.refunds.create({
    ...(paymentIntent ? { payment_intent: paymentIntent } : {}),
    ...(params.chargeId && !paymentIntent ? { charge: params.chargeId } : {}),
    ...(typeof params.amountMinor === 'number' && params.amountMinor > 0
      ? { amount: params.amountMinor }
      : {}),
  });

  return {
    refundId: refund.id,
    status: refund.status || 'succeeded',
  };
}
