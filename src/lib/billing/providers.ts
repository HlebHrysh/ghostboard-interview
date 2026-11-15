import crypto from 'node:crypto';
import { isProduction } from '@/lib/envGuard';
import { getBillingRedis, setBoundedMapEntry } from './cache';
import {
  createLemonSqueezyCheckout,
  isLemonSqueezyConfigured,
  issueLemonSqueezyRefund,
} from './lemonsqueezy';
import {
  createMonobankInvoice,
  isMonobankConfigured,
  refundMonobankInvoice,
} from './monobank';
import {
  normalizeCurrency,
  resolveBillingPlan,
  type BillingCurrency,
  type BillingInterval,
  type BillingPlanDefinition,
  type BillingProvider,
  type TargetPaidPlan,
} from './plans';
import {
  createSandboxCheckoutSession,
  isSandboxAllowed,
} from './sandbox';
import {
  createStripeCheckoutSession,
  isStripeConfigured,
  issueStripeRefund,
} from './stripe';

export interface PendingCheckoutMetadata {
  provider: BillingProvider;
  invoiceId: string;
  reference: string;
  userId: string;
  email: string;
  planId: string;
  targetPlan: TargetPaidPlan;
  interval: BillingInterval;
  currency: BillingCurrency;
  amountMinor: number;
  createdAt: number;
}

const g = globalThis as typeof globalThis & {
  __ghostboardPendingCheckouts?: Map<string, PendingCheckoutMetadata>;
};

function getPendingStore(): Map<string, PendingCheckoutMetadata> {
  if (!g.__ghostboardPendingCheckouts) {
    g.__ghostboardPendingCheckouts = new Map();
  }
  return g.__ghostboardPendingCheckouts;
}

export async function recordPendingCheckout(
  meta: PendingCheckoutMetadata,
): Promise<void> {
  const store = getPendingStore();
  setBoundedMapEntry(store, meta.invoiceId, meta, 2000);
  setBoundedMapEntry(store, `ref:${meta.reference}`, meta, 2000);

  const redis = getBillingRedis();
  if (redis) {
    try {
      await Promise.all([
        redis.set(`billing:pending:inv:${meta.invoiceId}`, meta, { ex: 86_400 }),
        redis.set(`billing:pending:ref:${meta.reference}`, meta, { ex: 86_400 }),
      ]);
    } catch {
      // Non-fatal
    }
  }
}

export async function lookupPendingCheckout(params: {
  invoiceId?: string | null;
  reference?: string | null;
}): Promise<PendingCheckoutMetadata | null> {
  const store = getPendingStore();
  if (params.invoiceId && store.has(params.invoiceId)) {
    return store.get(params.invoiceId)!;
  }
  if (params.reference && store.has(`ref:${params.reference}`)) {
    return store.get(`ref:${params.reference}`)!;
  }

  const redis = getBillingRedis();
  if (redis) {
    try {
      if (params.invoiceId) {
        const byInv = await redis.get<PendingCheckoutMetadata>(
          `billing:pending:inv:${params.invoiceId}`,
        );
        if (byInv) return byInv;
      }
      if (params.reference) {
        const byRef = await redis.get<PendingCheckoutMetadata>(
          `billing:pending:ref:${params.reference}`,
        );
        if (byRef) return byRef;
      }
    } catch {
      // Safe fallback
    }
  }
  return null;
}

export function isProviderConfigured(provider: BillingProvider): boolean {
  switch (provider) {
    case 'monobank':
      return isMonobankConfigured();
    case 'lemonsqueezy':
      return isLemonSqueezyConfigured();
    case 'stripe':
      return isStripeConfigured();
    case 'sandbox':
      return isSandboxAllowed();
  }
}

/**
 * Selects active billing provider from `BILLING_PROVIDER` (or requested override when allowed),
 * falling back to configured live gateways or sandbox in non-production environments.
 */
export function selectBillingProvider(
  requestedProvider?: string | null,
): BillingProvider {
  const valid: BillingProvider[] = ['monobank', 'lemonsqueezy', 'stripe', 'sandbox'];
  const envProvider = (process.env.BILLING_PROVIDER || '')
    .trim()
    .toLowerCase() as BillingProvider;
  const reqProvider = (requestedProvider || '')
    .trim()
    .toLowerCase() as BillingProvider;

  if (reqProvider && valid.includes(reqProvider)) {
    if (reqProvider === 'sandbox') {
      if (isSandboxAllowed()) return 'sandbox';
    } else if (isProviderConfigured(reqProvider)) {
      return reqProvider;
    }
  }

  if (envProvider && valid.includes(envProvider)) {
    if (envProvider === 'sandbox') {
      if (isSandboxAllowed()) return 'sandbox';
    } else {
      return envProvider;
    }
  }

  // Automatic fallback order when BILLING_PROVIDER is unset
  if (!isProduction() && isSandboxAllowed()) {
    // Allow explicit live gateways if user configured them in dev; otherwise Sandbox
    if (isMonobankConfigured()) return 'monobank';
    if (isLemonSqueezyConfigured()) return 'lemonsqueezy';
    if (isStripeConfigured()) return 'stripe';
    return 'sandbox';
  }

  if (isMonobankConfigured()) return 'monobank';
  if (isLemonSqueezyConfigured()) return 'lemonsqueezy';
  if (isStripeConfigured()) return 'stripe';
  return 'sandbox';
}

export function getBillingCapabilities() {
  const activeProvider = selectBillingProvider();
  return {
    activeProvider,
    sandboxAllowed: isSandboxAllowed(),
    providers: {
      monobank: {
        configured: isMonobankConfigured(),
        currencies: ['UAH', 'USD', 'EUR'] as BillingCurrency[],
        supportsAppleGooglePay: true,
        supportsRecurringTokenization: true,
      },
      lemonsqueezy: {
        configured: isLemonSqueezyConfigured(),
        currencies: ['USD', 'EUR', 'UAH'] as BillingCurrency[],
        merchantOfRecord: true,
        testMode: process.env.LEMONSQUEEZY_TEST_MODE === 'true' || !isProduction(),
      },
      stripe: {
        configured: isStripeConfigured(),
        currencies: ['USD', 'EUR', 'UAH'] as BillingCurrency[],
      },
      sandbox: {
        configured: isSandboxAllowed(),
        currencies: ['UAH', 'USD', 'EUR'] as BillingCurrency[],
        zeroCost: true,
      },
    },
  };
}

export interface UnifiedCheckoutInput {
  origin: string;
  userId: string;
  email: string;
  planId?: string | null;
  interval?: BillingInterval | string | null;
  currency?: string | null;
  requestedProvider?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
}

export type UnifiedCheckoutResult =
  | {
      mode: 'redirect';
      provider: 'monobank' | 'lemonsqueezy' | 'stripe';
      url: string;
      invoiceId: string;
      reference: string;
      plan: BillingPlanDefinition;
      currency: BillingCurrency;
      amountMinor: number;
    }
  | {
      mode: 'sandbox';
      provider: 'sandbox';
      invoiceId: string;
      challengeToken: string;
      reference: string;
      plan: BillingPlanDefinition;
      currency: BillingCurrency;
      amountMinor: number;
      redirectUrl: string;
      threeDsSimulated: true;
    };

export async function createBillingCheckout(
  input: UnifiedCheckoutInput,
): Promise<UnifiedCheckoutResult> {
  const plan = resolveBillingPlan(input.planId, input.interval);
  const requestedCur = input.currency ? normalizeCurrency(input.currency) : null;
  const provider = selectBillingProvider(input.requestedProvider);

  // Check if selected provider actually has credentials configured in prod
  if (!isProviderConfigured(provider)) {
    throw new BillingProviderConfigError(
      `Payment provider "${provider}" is not configured on this server.`,
    );
  }

  const currency: BillingCurrency =
    requestedCur || (provider === 'monobank' ? 'UAH' : 'USD');
  const amountMinor = plan.amountsMinor[currency] ?? plan.amountsMinor.USD;
  const reference = `gb_${plan.id}_${crypto.randomBytes(6).toString('hex')}`;
  const successUrl =
    input.successUrl ||
    `${input.origin}/interview?upgrade=success&plan=${plan.targetPlan}&provider=${provider}`;
  const cancelUrl = input.cancelUrl || `${input.origin}/pricing?checkout=cancelled`;
  const webhookUrl = `${input.origin}/api/billing/webhook?provider=${provider}`;

  if (provider === 'monobank') {
    const invoice = await createMonobankInvoice({
      userId: input.userId,
      email: input.email,
      plan,
      currency,
      redirectUrl: successUrl,
      webhookUrl,
      reference,
    });

    await recordPendingCheckout({
      provider: 'monobank',
      invoiceId: invoice.invoiceId,
      reference,
      userId: input.userId,
      email: input.email,
      planId: plan.id,
      targetPlan: plan.targetPlan,
      interval: plan.interval,
      currency,
      amountMinor: invoice.amountMinor,
      createdAt: Date.now(),
    });

    return {
      mode: 'redirect',
      provider: 'monobank',
      url: invoice.pageUrl,
      invoiceId: invoice.invoiceId,
      reference,
      plan,
      currency,
      amountMinor: invoice.amountMinor,
    };
  }

  if (provider === 'lemonsqueezy') {
    const ls = await createLemonSqueezyCheckout({
      userId: input.userId,
      email: input.email,
      plan,
      currency,
      redirectUrl: successUrl,
      reference,
    });

    await recordPendingCheckout({
      provider: 'lemonsqueezy',
      invoiceId: ls.checkoutId,
      reference,
      userId: input.userId,
      email: input.email,
      planId: plan.id,
      targetPlan: plan.targetPlan,
      interval: plan.interval,
      currency,
      amountMinor,
      createdAt: Date.now(),
    });

    return {
      mode: 'redirect',
      provider: 'lemonsqueezy',
      url: ls.checkoutUrl,
      invoiceId: ls.checkoutId,
      reference,
      plan,
      currency,
      amountMinor,
    };
  }

  if (provider === 'stripe') {
    const stripeRes = await createStripeCheckoutSession({
      userId: input.userId,
      email: input.email,
      plan,
      currency,
      successUrl,
      cancelUrl,
      reference,
    });

    await recordPendingCheckout({
      provider: 'stripe',
      invoiceId: stripeRes.sessionId,
      reference,
      userId: input.userId,
      email: input.email,
      planId: plan.id,
      targetPlan: plan.targetPlan,
      interval: plan.interval,
      currency,
      amountMinor,
      createdAt: Date.now(),
    });

    return {
      mode: 'redirect',
      provider: 'stripe',
      url: stripeRes.checkoutUrl,
      invoiceId: stripeRes.sessionId,
      reference,
      plan,
      currency,
      amountMinor,
    };
  }

  // Built-in Zero-Cost Free Sandbox Gateway
  const sandbox = await createSandboxCheckoutSession({
    userId: input.userId,
    email: input.email,
    plan,
    currency,
    redirectUrl: successUrl,
    reference,
  });

  await recordPendingCheckout({
    provider: 'sandbox',
    invoiceId: sandbox.invoiceId,
    reference,
    userId: input.userId,
    email: input.email,
    planId: plan.id,
    targetPlan: plan.targetPlan,
    interval: plan.interval,
    currency,
    amountMinor,
    createdAt: Date.now(),
  });

  return {
    mode: 'sandbox',
    provider: 'sandbox',
    invoiceId: sandbox.invoiceId,
    challengeToken: sandbox.challengeToken,
    reference,
    plan,
    currency,
    amountMinor,
    redirectUrl: successUrl,
    threeDsSimulated: true,
  };
}

export class BillingProviderConfigError extends Error {
  readonly status = 503;
  readonly code = 'ENV_CONFIG_ERROR';
}

export async function issueProviderRefund(params: {
  provider: BillingProvider;
  invoiceId: string;
  amountMinor: number;
}): Promise<{ refundedAtGateway: boolean; gatewayStatus: string }> {
  if (params.provider === 'sandbox') {
    return { refundedAtGateway: true, gatewayStatus: 'sandbox_reversed' };
  }

  if (params.provider === 'monobank') {
    if (!isMonobankConfigured()) {
      return {
        refundedAtGateway: false,
        gatewayStatus: 'revoked_locally_no_monobank_token',
      };
    }
    const res = await refundMonobankInvoice({
      invoiceId: params.invoiceId,
      amountMinor: params.amountMinor,
    });
    return { refundedAtGateway: true, gatewayStatus: res.status };
  }

  if (params.provider === 'lemonsqueezy') {
    if (!isLemonSqueezyConfigured()) {
      return {
        refundedAtGateway: false,
        gatewayStatus: 'revoked_locally_no_lemonsqueezy_key',
      };
    }
    const res = await issueLemonSqueezyRefund({
      orderId: params.invoiceId,
      amountMinor: params.amountMinor,
    });
    return { refundedAtGateway: true, gatewayStatus: res.status };
  }

  if (params.provider === 'stripe') {
    if (!isStripeConfigured()) {
      return {
        refundedAtGateway: false,
        gatewayStatus: 'revoked_locally_no_stripe_key',
      };
    }
    const res = await issueStripeRefund({
      sessionId: params.invoiceId.startsWith('cs_') ? params.invoiceId : undefined,
      paymentIntentId: params.invoiceId.startsWith('pi_')
        ? params.invoiceId
        : undefined,
      chargeId: params.invoiceId.startsWith('ch_') ? params.invoiceId : undefined,
      amountMinor: params.amountMinor,
    });
    return {
      refundedAtGateway: res.status !== 'revoked_without_gateway_intent',
      gatewayStatus: res.status,
    };
  }

  return { refundedAtGateway: false, gatewayStatus: 'revoked_locally' };
}
