import crypto from 'node:crypto';
import type { BillingCurrency, BillingPlanDefinition } from './plans';

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';

export interface LemonCheckoutInput {
  userId: string;
  email: string;
  plan: BillingPlanDefinition;
  currency: BillingCurrency;
  redirectUrl: string;
  reference: string;
}

export interface LemonCheckoutResponse {
  checkoutId: string;
  checkoutUrl: string;
  reference: string;
  testMode: boolean;
}

export interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
    test_mode?: boolean;
    custom_data?: {
      user_id?: string;
      email?: string;
      plan_id?: string;
      target_plan?: string;
      interval?: string;
      currency?: string;
      reference?: string;
    };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      store_id?: number;
      customer_id?: number;
      order_number?: number;
      user_email?: string;
      status?: string;
      currency?: string;
      total?: number;
      subtotal?: number;
      refunded?: boolean;
      refunded_at?: string | null;
      renews_at?: string | null;
      ends_at?: string | null;
      first_order_item?: {
        id?: number;
        order_id?: number;
        product_id?: number;
        variant_id?: number;
        price?: number;
      };
    };
  };
}

export function isLemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
      process.env.LEMONSQUEEZY_STORE_ID?.trim(),
  );
}

function resolveLemonVariantId(plan: BillingPlanDefinition): string {
  const specific = process.env[plan.lemonVariantEnvKey]?.trim();
  const fallback = process.env.LEMONSQUEEZY_DEFAULT_VARIANT_ID?.trim();
  const variantId = specific || fallback;
  if (!variantId) {
    throw new Error(
      `Lemon Squeezy variant ID missing: configure ${plan.lemonVariantEnvKey} or LEMONSQUEEZY_DEFAULT_VARIANT_ID`,
    );
  }
  return variantId;
}

export async function createLemonSqueezyCheckout(
  input: LemonCheckoutInput,
): Promise<LemonCheckoutResponse> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  if (!apiKey || !storeId) {
    throw new Error(
      'LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID are required for Lemon Squeezy checkout',
    );
  }

  const variantId = resolveLemonVariantId(input.plan);
  const testMode =
    process.env.LEMONSQUEEZY_TEST_MODE === 'true' ||
    process.env.NODE_ENV !== 'production';

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: input.plan.amountsMinor.USD,
        product_options: {
          name: input.plan.name,
          description: input.plan.description,
          redirect_url: input.redirectUrl,
          enabled_variants: Number.isFinite(Number(variantId))
            ? [Number(variantId)]
            : undefined,
        },
        checkout_options: {
          embed: false,
          dark: true,
        },
        checkout_data: {
          email: input.email,
          custom: {
            user_id: input.userId,
            email: input.email,
            plan_id: input.plan.id,
            target_plan: input.plan.targetPlan,
            interval: input.plan.interval,
            currency: input.currency,
            reference: input.reference,
          },
        },
        test_mode: testMode,
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: String(storeId),
          },
        },
        variant: {
          data: {
            type: 'variants',
            id: String(variantId),
          },
        },
      },
    },
  };

  const res = await fetch(`${LEMON_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Lemon Squeezy checkout creation failed (${res.status}): ${errText.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as {
    data?: { id?: string; attributes?: { url?: string } };
  };
  const checkoutUrl = json.data?.attributes?.url;
  const checkoutId = json.data?.id;
  if (!checkoutUrl || !checkoutId) {
    throw new Error('Lemon Squeezy response missing checkout URL or ID');
  }

  return {
    checkoutId,
    checkoutUrl,
    reference: input.reference,
    testMode,
  };
}

/**
 * Verifies Lemon Squeezy `X-Signature` HMAC-SHA256 hex digest using timingSafeEqual.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  xSignatureHeader: string | null,
  secretOverride?: string,
): { valid: boolean; reason?: string } {
  const secret = (
    secretOverride || process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''
  ).trim();
  if (!secret) {
    return { valid: false, reason: 'LEMONSQUEEZY_WEBHOOK_SECRET is not configured' };
  }
  if (!xSignatureHeader || !xSignatureHeader.trim()) {
    return { valid: false, reason: 'Missing X-Signature header' };
  }

  const normalizedHeader = xSignatureHeader.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedHeader)) {
    return { valid: false, reason: 'Malformed X-Signature hex digest' };
  }

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const sigBuf = Buffer.from(normalizedHeader, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return { valid: false, reason: 'HMAC-SHA256 signature mismatch' };
  }

  return { valid: true };
}

export async function issueLemonSqueezyRefund(params: {
  orderId: string;
  amountMinor?: number;
}): Promise<{ status: string }> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('LEMONSQUEEZY_API_KEY is not configured');
  }

  const res = await fetch(`${LEMON_API_BASE}/orders/${encodeURIComponent(params.orderId)}/refund`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'orders',
        id: String(params.orderId),
        attributes:
          typeof params.amountMinor === 'number' && params.amountMinor > 0
            ? { amount: params.amountMinor }
            : {},
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Lemon Squeezy refund failed (${res.status}): ${text.slice(0, 250)}`);
  }

  return { status: 'refunded' };
}
