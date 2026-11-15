import { NextResponse } from 'next/server';
import {
  verifyLemonSqueezySignature,
  type LemonWebhookPayload,
} from './lemonsqueezy';
import {
  verifyMonobankWebhookSignature,
  type MonobankWebhookPayload,
} from './monobank';
import {
  BillingDatabaseUnavailableError,
  fulfillPaymentWebhook,
  revokePaymentByInvoiceOrUser,
  type FulfillWebhookResult,
} from './paymentStore';
import {
  normalizeCurrency,
  resolveBillingPlan,
  type BillingCurrency,
  type BillingInterval,
  type BillingProvider,
  type TargetPaidPlan,
} from './plans';
import { lookupPendingCheckout } from './providers';
import {
  verifySandboxSignature,
  type SandboxWebhookPayload,
} from './sandbox';
import { verifyStripeWebhookSignature } from './stripe';

export function detectWebhookProvider(
  headers: Headers,
  explicitProvider?: string | null,
): BillingProvider | null {
  const cleanExplicit = (explicitProvider || '').trim().toLowerCase();
  if (
    cleanExplicit === 'monobank' ||
    cleanExplicit === 'lemonsqueezy' ||
    cleanExplicit === 'stripe' ||
    cleanExplicit === 'sandbox'
  ) {
    return cleanExplicit;
  }

  if (headers.get('x-sign')) return 'monobank';
  if (headers.get('x-signature') || headers.get('x-event-name')) {
    return 'lemonsqueezy';
  }
  if (headers.get('stripe-signature')) return 'stripe';
  if (headers.get('x-sandbox-signature')) return 'sandbox';
  return null;
}

function currencyFromIsoNumeric(ccy?: number): BillingCurrency {
  if (ccy === 980) return 'UAH';
  if (ccy === 978) return 'EUR';
  if (ccy === 840) return 'USD';
  return 'UAH';
}

function parsePipeReference(reference?: string | null): {
  userId?: string;
  planId?: string;
  email?: string;
} {
  if (!reference) return {};
  if (reference.includes('|')) {
    const [, userId, planId, email] = reference.split('|');
    return {
      userId: userId || undefined,
      planId: planId || undefined,
      email: email || undefined,
    };
  }
  return {};
}

export async function processVerifiedWebhookRequest(params: {
  rawBody: string;
  headers: Headers;
  explicitProvider?: string | null;
  forceProvider?: BillingProvider;
}): Promise<NextResponse> {
  const provider =
    params.forceProvider ||
    detectWebhookProvider(params.headers, params.explicitProvider);

  if (!provider) {
    return NextResponse.json(
      {
        error:
          'Unable to determine billing provider (pass ?provider=monobank|lemonsqueezy|stripe|sandbox or standard provider signature header).',
      },
      { status: 400 },
    );
  }

  // 1. Cryptographic signature check FIRST
  if (provider === 'monobank') {
    const check = await verifyMonobankWebhookSignature(
      params.rawBody,
      params.headers.get('x-sign'),
    );
    if (!check.valid) {
      return NextResponse.json(
        {
          error: check.reason || 'Invalid Monobank X-Sign signature',
          provider: 'monobank',
        },
        { status: 401 },
      );
    }
  } else if (provider === 'lemonsqueezy') {
    const check = verifyLemonSqueezySignature(
      params.rawBody,
      params.headers.get('x-signature'),
    );
    if (!check.valid) {
      return NextResponse.json(
        {
          error: check.reason || 'Invalid Lemon Squeezy X-Signature',
          provider: 'lemonsqueezy',
        },
        { status: 401 },
      );
    }
  } else if (provider === 'stripe') {
    const check = verifyStripeWebhookSignature(
      params.rawBody,
      params.headers.get('stripe-signature'),
    );
    if (!check.valid) {
      return NextResponse.json(
        {
          error: check.reason || 'Invalid Stripe-Signature',
          provider: 'stripe',
        },
        { status: 400 },
      );
    }
  } else if (provider === 'sandbox') {
    const check = verifySandboxSignature(
      params.rawBody,
      params.headers.get('x-sandbox-signature'),
    );
    if (!check.valid) {
      return NextResponse.json(
        {
          error: check.reason || 'Invalid Sandbox HMAC signature',
          provider: 'sandbox',
        },
        { status: 401 },
      );
    }
  }

  // 2. Parse verified payload
  let parsed: unknown;
  try {
    parsed = JSON.parse(params.rawBody);
  } catch {
    return NextResponse.json(
      { error: 'Malformed JSON webhook body' },
      { status: 400 },
    );
  }

  try {
    let result: FulfillWebhookResult | null = null;

    if (provider === 'monobank') {
      const mono = parsed as MonobankWebhookPayload;
      if (!mono?.invoiceId || !mono?.status) {
        return NextResponse.json(
          { error: 'Monobank payload missing invoiceId or status' },
          { status: 400 },
        );
      }

      if (mono.status === 'reversed') {
        const rev = await revokePaymentByInvoiceOrUser({
          provider: 'monobank',
          invoiceId: mono.invoiceId,
          reason: 'monobank_invoice_reversed',
        });
        return NextResponse.json({
          received: true,
          revoked: rev.revoked,
          provider: 'monobank',
          status: mono.status,
          invoiceId: mono.invoiceId,
          userId: rev.userId,
        });
      }

      if (mono.status !== 'success') {
        return NextResponse.json({
          received: true,
          ignored: true,
          provider: 'monobank',
          status: mono.status,
          invoiceId: mono.invoiceId,
        });
      }

      const pending = await lookupPendingCheckout({
        invoiceId: mono.invoiceId,
        reference: mono.reference,
      });
      const parsedRef = parsePipeReference(mono.reference);
      const planDef = resolveBillingPlan(
        pending?.planId || parsedRef.planId,
        pending?.interval,
      );

      result = await fulfillPaymentWebhook({
        provider: 'monobank',
        providerEventId: `mono:${mono.invoiceId}:success`,
        invoiceId: mono.invoiceId,
        userId: pending?.userId || parsedRef.userId || null,
        email: pending?.email || parsedRef.email || null,
        planId: pending?.planId || planDef.id,
        targetPlan: pending?.targetPlan || planDef.targetPlan,
        interval: pending?.interval || planDef.interval,
        amountMinor:
          mono.finalAmount ??
          mono.amount ??
          pending?.amountMinor ??
          planDef.amountsMinor.UAH,
        currency: pending?.currency || currencyFromIsoNumeric(mono.ccy),
        signatureStatus: 'verified_ecdsa',
        reference: mono.reference || pending?.reference || null,
        cardToken: mono.walletData?.cardToken || null,
        walletId: mono.walletData?.walletId || null,
      });
    } else if (provider === 'lemonsqueezy') {
      const ls = parsed as LemonWebhookPayload;
      const eventName =
        ls.meta?.event_name || params.headers.get('x-event-name') || '';
      const orderId = String(
        ls.data?.id || ls.data?.attributes?.first_order_item?.order_id || '',
      );

      const paidEvents = new Set([
        'order_created',
        'subscription_created',
        'subscription_payment_success',
      ]);
      const revokeEvents = new Set([
        'order_refunded',
        'subscription_expired',
        'subscription_cancelled',
      ]);

      if (revokeEvents.has(eventName)) {
        const custom = ls.meta?.custom_data || {};
        const rev = await revokePaymentByInvoiceOrUser({
          provider: 'lemonsqueezy',
          invoiceId: orderId || custom.reference || null,
          email: custom.email || ls.data?.attributes?.user_email || null,
          reason: `lemonsqueezy_${eventName}`,
        });
        return NextResponse.json({
          received: true,
          revoked: rev.revoked,
          provider: 'lemonsqueezy',
          eventName,
          orderId,
          userId: rev.userId,
        });
      }

      if (!paidEvents.has(eventName)) {
        return NextResponse.json({
          received: true,
          ignored: true,
          provider: 'lemonsqueezy',
          eventName,
          orderId,
        });
      }

      const custom = ls.meta?.custom_data || {};
      const pending = await lookupPendingCheckout({
        invoiceId: orderId,
        reference: custom.reference,
      });
      const planDef = resolveBillingPlan(
        custom.plan_id || pending?.planId,
        (custom.interval as BillingInterval) || pending?.interval,
      );

      const invoiceId = orderId || custom.reference || `ls_${Date.now()}`;
      result = await fulfillPaymentWebhook({
        provider: 'lemonsqueezy',
        providerEventId: `ls:${eventName}:${invoiceId}`,
        invoiceId,
        userId: custom.user_id || pending?.userId || null,
        email:
          custom.email ||
          ls.data?.attributes?.user_email ||
          pending?.email ||
          null,
        planId: custom.plan_id || planDef.id,
        targetPlan:
          (custom.target_plan as TargetPaidPlan) ||
          pending?.targetPlan ||
          planDef.targetPlan,
        interval:
          (custom.interval as BillingInterval) ||
          pending?.interval ||
          planDef.interval,
        amountMinor:
          ls.data?.attributes?.total ??
          pending?.amountMinor ??
          planDef.amountsMinor.USD,
        currency: normalizeCurrency(
          ls.data?.attributes?.currency || custom.currency || pending?.currency || 'USD',
        ),
        signatureStatus: 'verified_hmac',
        reference: custom.reference || pending?.reference || null,
        explicitExpiresAt: ls.data?.attributes?.renews_at ?? undefined,
      });
    } else if (provider === 'stripe') {
      const evt = parsed as {
        id?: string;
        type?: string;
        data?: { object?: Record<string, unknown> };
      };
      const eventType = evt.type || '';
      const paidTypes = new Set([
        'checkout.session.completed',
        'invoice.paid',
        'invoice.payment_succeeded',
      ]);
      const revokeTypes = new Set([
        'charge.refunded',
        'customer.subscription.deleted',
      ]);

      if (revokeTypes.has(eventType)) {
        const obj = (evt.data?.object || {}) as {
          id?: string;
          payment_intent?: string;
          customer_email?: string;
          receipt_email?: string;
          billing_details?: { email?: string };
          metadata?: Record<string, string>;
        };
        const rev = await revokePaymentByInvoiceOrUser({
          provider: 'stripe',
          invoiceId: obj.id || obj.payment_intent || obj.metadata?.reference || null,
          email:
            obj.customer_email ||
            obj.receipt_email ||
            obj.billing_details?.email ||
            obj.metadata?.userEmail ||
            null,
          reason: `stripe_${eventType}`,
        });
        return NextResponse.json({
          received: true,
          revoked: rev.revoked,
          provider: 'stripe',
          eventType,
          userId: rev.userId,
        });
      }

      if (!paidTypes.has(eventType)) {
        return NextResponse.json({
          received: true,
          ignored: true,
          provider: 'stripe',
          eventType,
        });
      }

      const obj = (evt.data?.object || {}) as {
        id?: string;
        client_reference_id?: string;
        customer_email?: string;
        customer_details?: { email?: string };
        amount_total?: number;
        amount_paid?: number;
        currency?: string;
        metadata?: Record<string, string>;
      };
      const meta = obj.metadata || {};
      const invoiceId = obj.id || evt.id || `stripe_${Date.now()}`;
      const pending = await lookupPendingCheckout({
        invoiceId,
        reference: meta.reference,
      });
      const planDef = resolveBillingPlan(
        meta.planId || meta.targetPlan || pending?.planId,
        (meta.billingCycle as BillingInterval) || pending?.interval,
      );

      result = await fulfillPaymentWebhook({
        provider: 'stripe',
        providerEventId: evt.id || `stripe:${invoiceId}`,
        invoiceId,
        userId: obj.client_reference_id || meta.userId || pending?.userId || null,
        email:
          obj.customer_email ||
          obj.customer_details?.email ||
          meta.userEmail ||
          pending?.email ||
          null,
        planId: meta.planId || planDef.id,
        targetPlan:
          (meta.targetPlan === 'lifetime' ? 'lifetime' : meta.targetPlan === 'pro' ? 'pro' : null) ||
          pending?.targetPlan ||
          planDef.targetPlan,
        interval:
          (meta.billingCycle as BillingInterval) ||
          pending?.interval ||
          planDef.interval,
        amountMinor:
          obj.amount_total ??
          obj.amount_paid ??
          pending?.amountMinor ??
          planDef.amountsMinor.USD,
        currency: normalizeCurrency(
          obj.currency || meta.currency || pending?.currency || 'USD',
        ),
        signatureStatus: 'verified_stripe',
        reference: meta.reference || pending?.reference || null,
      });
    } else if (provider === 'sandbox') {
      const sbx = parsed as SandboxWebhookPayload;
      if (sbx.status !== 'paid' || sbx.threeDsStatus !== 'authenticated') {
        return NextResponse.json({
          received: true,
          ignored: true,
          provider: 'sandbox',
          status: sbx.status,
        });
      }

      const planDef = resolveBillingPlan(sbx.planId, sbx.interval);
      result = await fulfillPaymentWebhook({
        provider: 'sandbox',
        providerEventId: sbx.eventId || `sbx:${sbx.invoiceId}`,
        invoiceId: sbx.invoiceId,
        userId: sbx.userId,
        email: sbx.email,
        planId: sbx.planId || planDef.id,
        targetPlan: sbx.targetPlan || planDef.targetPlan,
        interval: sbx.interval || planDef.interval,
        amountMinor: sbx.amountMinor ?? planDef.amountsMinor.USD,
        currency: normalizeCurrency(sbx.currency),
        signatureStatus: 'verified_sandbox',
        reference: sbx.reference,
      });
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Unhandled billing webhook event' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      received: true,
      provider,
      idempotentDuplicate: result.idempotentDuplicate,
      alreadyProcessed: result.alreadyProcessed,
      paymentId: result.payment.id,
      userId: result.userId,
      email: result.email,
      plan: result.plan,
      planExpiresAt: result.planExpiresAt,
    });
  } catch (err) {
    if (err instanceof BillingDatabaseUnavailableError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          retryable: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Billing webhook processing failed',
      },
      { status: 500 },
    );
  }
}
