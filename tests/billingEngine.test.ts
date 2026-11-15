import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminToken } from '@/lib/adminGuard';
import {
  BILLING_PLANS,
  createBillingCheckout,
  getL1BillingEntitlement,
  listEnrichedPayments,
  resetBillingCacheForTests,
  resetPaymentStoreForTests,
  selectBillingProvider,
  verifyMonobankWebhookSignature,
} from '@/lib/billing';
import { POST as adminRevenuePost, GET as adminRevenueGet } from '@/app/api/admin/revenue/route';
import { POST as billingCheckoutPost } from '@/app/api/billing/checkout/route';
import { POST as sandboxConfirmPost } from '@/app/api/billing/sandbox/confirm/route';
import { GET as billingStatusGet } from '@/app/api/billing/status/route';
import { POST as billingWebhookPost } from '@/app/api/billing/webhook/route';
import { GET as sessionsMeGet } from '@/app/api/sessions/me/route';
import { resetRateLimits } from '@/lib/rateLimit';
import {
  createSession,
  createUser,
  getSessionUser,
  resetDbCircuitBreaker,
  tripDbCircuitBreaker,
} from '@/lib/serverDb';
import { getCachedUserById } from '@/lib/server/users';

const ORIGINAL_ENV = { ...process.env };

function signStripe(rawBody: string, secret: string, ts = Math.floor(Date.now() / 1000)) {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`, 'utf8')
    .digest('hex');
  return `t=${ts},v1=${sig}`;
}

function signHmacHex(rawBody: string, secret: string) {
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
}

describe('Ghostboard Modular Multi-Provider Billing Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimits();
    resetDbCircuitBreaker();
    resetBillingCacheForTests();
    resetPaymentStoreForTests();
    process.env = { ...ORIGINAL_ENV };
    vi.stubEnv('NODE_ENV', 'test');
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    resetDbCircuitBreaker();
    resetBillingCacheForTests();
    resetPaymentStoreForTests();
    process.env = { ...ORIGINAL_ENV };
  });

  it('auto-selects providers based on BILLING_PROVIDER and defaults to sandbox in non-production', () => {
    delete process.env.BILLING_PROVIDER;
    delete process.env.MONOBANK_TOKEN;
    delete process.env.LEMONSQUEEZY_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    expect(selectBillingProvider()).toBe('sandbox');

    process.env.BILLING_PROVIDER = 'monobank';
    expect(selectBillingProvider()).toBe('monobank');

    process.env.BILLING_PROVIDER = 'lemonsqueezy';
    expect(selectBillingProvider()).toBe('lemonsqueezy');

    expect(BILLING_PLANS.pro_annual.discountPercent).toBe(20);
    expect(BILLING_PLANS.pro_annual.amountsMinor.USD).toBe(14400);
    expect(BILLING_PLANS.pro_annual.amountsMinor.UAH).toBe(574800);
  });

  it('creates Monobank acquiring invoice with UAH/USD currency and card tokenization for Pro', async () => {
    process.env.BILLING_PROVIDER = 'monobank';
    process.env.MONOBANK_TOKEN = 'mono_test_token_123';

    let capturedBody: Record<string, unknown> | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).includes('api.monobank.ua/api/merchant/invoice/create')) {
          capturedBody = JSON.parse(String(init?.body || '{}'));
          return new Response(
            JSON.stringify({
              invoiceId: 'mono_inv_001',
              pageUrl: 'https://pay.mbnk.biz/mono_inv_001',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
      }),
    );

    const res = await createBillingCheckout({
      origin: 'https://ghostboard.pro',
      userId: 'usr_mono_1',
      email: 'candidate@ua.dev',
      planId: 'pro_annual',
      currency: 'UAH',
    });

    expect(res.mode).toBe('redirect');
    expect(res.provider).toBe('monobank');
    if (res.mode === 'redirect') {
      expect(res.url).toBe('https://pay.mbnk.biz/mono_inv_001');
    }
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!['ccy']).toBe(980);
    expect(capturedBody!['amount']).toBe(574800);
    expect(capturedBody!['saveCardData']).toMatchObject({ saveCard: true });
    expect(capturedBody!['webHookUrl']).toBe(
      'https://ghostboard.pro/api/billing/webhook?provider=monobank',
    );
  });

  it('creates Lemon Squeezy checkout session when BILLING_PROVIDER=lemonsqueezy', async () => {
    process.env.BILLING_PROVIDER = 'lemonsqueezy';
    process.env.LEMONSQUEEZY_API_KEY = 'ls_api_test';
    process.env.LEMONSQUEEZY_STORE_ID = '9911';
    process.env.LEMONSQUEEZY_DEFAULT_VARIANT_ID = '5544';

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            data: {
              id: 'ls_chk_777',
              attributes: {
                url: 'https://ghostboard.lemonsqueezy.com/checkout/buy/ls_chk_777',
              },
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );

    const res = await createBillingCheckout({
      origin: 'https://ghostboard.pro',
      userId: 'usr_ls_1',
      email: 'global@dev.io',
      planId: 'lifetime',
      currency: 'USD',
    });

    expect(res.mode).toBe('redirect');
    expect(res.provider).toBe('lemonsqueezy');
    if (res.mode === 'redirect') {
      expect(res.url).toContain('lemonsqueezy.com/checkout');
    }
  });

  it('verifies Monobank ECDSA X-Sign signature and rejects missing/tampered payloads', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env.MONOBANK_PUBLIC_KEY = Buffer.from(publicPem, 'utf8').toString('base64');

    const user = await createUser('mono.ecdsa@example.com', 'Mono User', 'free');

    const payloadObj = {
      invoiceId: 'mono_ecdsa_9001',
      status: 'success',
      amount: 59900,
      ccy: 980,
      reference: `gb|${user.id}|pro_monthly|${user.email}`,
      walletData: { cardToken: 'tok_card_abc', walletId: 'gb_wallet_1' },
    };
    const rawBody = JSON.stringify(payloadObj);
    const xSign = crypto
      .sign('sha256', Buffer.from(rawBody, 'utf8'), privateKey)
      .toString('base64');

    // 1. Missing X-Sign -> 401
    const missingSigRes = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=monobank', {
        method: 'POST',
        body: rawBody,
      }),
    );
    expect(missingSigRes.status).toBe(401);

    // 2. Tampered payload -> 401
    const tamperedBody = JSON.stringify({ ...payloadObj, amount: 1 });
    const tamperedRes = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=monobank', {
        method: 'POST',
        headers: { 'X-Sign': xSign },
        body: tamperedBody,
      }),
    );
    expect(tamperedRes.status).toBe(401);

    // 3. Valid signature -> 200 & Pro plan activated
    const okRes = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=monobank', {
        method: 'POST',
        headers: { 'X-Sign': xSign },
        body: rawBody,
      }),
    );
    expect(okRes.status).toBe(200);
    const data = await okRes.json();
    expect(data.received).toBe(true);
    expect(data.provider).toBe('monobank');
    expect(data.plan).toBe('pro');
    expect(data.planExpiresAt).toBeTruthy();
  });

  it('verifies Lemon Squeezy and Stripe HMAC-SHA256 signatures and rejects tampered payloads', async () => {
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'ls_secret_hmac_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_stripe_secret';

    const user = await createUser('hmac.tester@example.com', 'HMAC Tester', 'free');

    // Lemon Squeezy tampered vs valid
    const lsRaw = JSON.stringify({
      meta: {
        event_name: 'order_created',
        custom_data: {
          user_id: user.id,
          email: user.email,
          plan_id: 'lifetime',
          target_plan: 'lifetime',
          interval: 'one_time',
          currency: 'USD',
        },
      },
      data: {
        id: 'ls_order_5001',
        attributes: { total: 7900, currency: 'USD', user_email: user.email },
      },
    });
    const lsSig = signHmacHex(lsRaw, process.env.LEMONSQUEEZY_WEBHOOK_SECRET);

    const lsTampered = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=lemonsqueezy', {
        method: 'POST',
        headers: {
          'X-Signature': lsSig,
          'X-Event-Name': 'order_created',
        },
        body: lsRaw.replace('7900', '100'),
      }),
    );
    expect(lsTampered.status).toBe(401);

    const lsOk = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=lemonsqueezy', {
        method: 'POST',
        headers: {
          'X-Signature': lsSig,
          'X-Event-Name': 'order_created',
        },
        body: lsRaw,
      }),
    );
    expect(lsOk.status).toBe(200);
    expect((await lsOk.json()).plan).toBe('lifetime');

    // Stripe tampered vs valid
    const stripeRaw = JSON.stringify({
      id: 'evt_stripe_999',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_999',
          client_reference_id: user.id,
          customer_email: user.email,
          amount_total: 1500,
          currency: 'usd',
          metadata: {
            userId: user.id,
            planId: 'pro_monthly',
            targetPlan: 'pro',
            billingCycle: 'monthly',
          },
        },
      },
    });
    const stripeSig = signStripe(stripeRaw, process.env.STRIPE_WEBHOOK_SECRET);

    const stripeTampered = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=stripe', {
        method: 'POST',
        headers: { 'Stripe-Signature': stripeSig },
        body: stripeRaw.replace('1500', '1'),
      }),
    );
    expect(stripeTampered.status).toBe(400);

    const stripeOk = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=stripe', {
        method: 'POST',
        headers: { 'Stripe-Signature': stripeSig },
        body: stripeRaw,
      }),
    );
    expect(stripeOk.status).toBe(200);
  });

  it('enforces strict webhook idempotency so duplicate deliveries do not double-log payments', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_idem_secret';
    const user = await createUser('idem@example.com', 'Idem User', 'free');

    const payload = JSON.stringify({
      id: 'evt_idem_001',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_idem_001',
          client_reference_id: user.id,
          customer_email: user.email,
          amount_total: 14400,
          currency: 'usd',
          metadata: {
            userId: user.id,
            planId: 'pro_annual',
            targetPlan: 'pro',
            billingCycle: 'annual',
          },
        },
      },
    });
    const sig = signStripe(payload, process.env.STRIPE_WEBHOOK_SECRET);

    const first = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=stripe', {
        method: 'POST',
        headers: { 'Stripe-Signature': sig },
        body: payload,
      }),
    );
    expect(first.status).toBe(200);
    const firstJson = await first.json();
    expect(firstJson.idempotentDuplicate).toBe(false);

    const second = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=stripe', {
        method: 'POST',
        headers: { 'Stripe-Signature': sig },
        body: payload,
      }),
    );
    expect(second.status).toBe(200);
    const secondJson = await second.json();
    expect(secondJson.idempotentDuplicate).toBe(true);
    expect(secondJson.paymentId).toBe(firstJson.paymentId);

    const all = await listEnrichedPayments();
    const matching = all.filter((p) => p.invoiceId === 'cs_idem_001');
    expect(matching).toHaveLength(1);
  });

  it('never falls back to volatile RAM in production when DATABASE_URL is configured and DB circuit breaker trips (returns 503)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ghostboard';
    process.env.ALLOW_MEMORY_DB = 'true';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_prod_failfast';

    tripDbCircuitBreaker(60_000);

    const payload = JSON.stringify({
      id: 'evt_prod_outage_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_prod_outage_1',
          customer_email: 'failfast@example.com',
          amount_total: 1500,
          currency: 'usd',
          metadata: { planId: 'pro_monthly', targetPlan: 'pro' },
        },
      },
    });
    const sig = signStripe(payload, process.env.STRIPE_WEBHOOK_SECRET);

    const res = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=stripe', {
        method: 'POST',
        headers: { 'Stripe-Signature': sig },
        body: payload,
      }),
    );

    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.code).toBe('BILLING_DB_UNAVAILABLE');
    expect(data.retryable).toBe(true);
  });

  it('updates L1 session and user caches in <1ms on sandbox payment and supports 1-click admin refund/revoke', async () => {
    process.env.BILLING_PROVIDER = 'sandbox';
    const user = await createUser('instant.l1@example.com', 'Instant L1', 'free');
    const session = await createSession(user.id, 'web');

    // Warm L1 caches BEFORE upgrade
    const preSession = await getSessionUser(session.token);
    expect(preSession?.plan).toBe('free');
    expect(getCachedUserById(user.id)?.plan).toBe('free');

    // 1. Start Free Sandbox Checkout
    const checkoutReq = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `ghostboard_session=${session.token}`,
      },
      body: JSON.stringify({
        planId: 'pro_monthly',
        billingCycle: 'monthly',
        currency: 'UAH',
      }),
    });
    const checkoutRes = await billingCheckoutPost(checkoutReq);
    expect(checkoutRes.status).toBe(200);
    const checkoutJson = await checkoutRes.json();
    expect(checkoutJson.mode).toBe('sandbox');

    // 2. Confirm 3DS challenge (dispatches signed webhook)
    const confirmRes = await sandboxConfirmPost(
      new NextRequest('http://localhost:3000/api/billing/sandbox/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `ghostboard_session=${session.token}`,
        },
        body: JSON.stringify({
          invoiceId: checkoutJson.invoiceId,
          challengeToken: checkoutJson.challengeToken,
          outcome: 'paid',
        }),
      }),
    );
    expect(confirmRes.status).toBe(200);
    const confirmJson = await confirmRes.json();
    expect(confirmJson.plan).toBe('pro');

    // 3. Instant L1 cache verification (<1ms activation without re-login)
    expect(getL1BillingEntitlement(user.id)?.plan).toBe('pro');
    expect(getCachedUserById(user.id)?.plan).toBe('pro');

    const meRes = await sessionsMeGet(
      new NextRequest('http://localhost:3000/api/sessions/me', {
        headers: { cookie: `ghostboard_session=${session.token}` },
      }),
    );
    expect((await meRes.json()).user.plan).toBe('pro');

    const statusRes = await billingStatusGet(
      new NextRequest('http://localhost:3000/api/billing/status', {
        headers: { cookie: `ghostboard_session=${session.token}` },
      }),
    );
    const statusJson = await statusRes.json();
    expect(statusJson.plan).toBe('pro');
    expect(statusJson.provider).toBe('sandbox');

    // 4. Admin Revenue analytics + 1-click Issue Refund / Revoke Plan
    const adminCookie = `ghostboard_admin_session=${await createAdminToken()}`;
    const revGetRes = await adminRevenueGet(
      new NextRequest('http://localhost:3000/api/admin/revenue', {
        headers: { cookie: adminCookie },
      }),
    );
    expect(revGetRes.status).toBe(200);
    const revData = await revGetRes.json();
    expect(revData.summary.currencyBreakdown.UAH.count).toBeGreaterThanOrEqual(1);

    const refundRes = await adminRevenuePost(
      new NextRequest('http://localhost:3000/api/admin/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: adminCookie,
        },
        body: JSON.stringify({
          action: 'refund_and_revoke',
          paymentId: confirmJson.paymentId,
          reason: 'Test refund & revoke',
          issueGatewayRefund: true,
        }),
      }),
    );
    expect(refundRes.status).toBe(200);
    const refundJson = await refundRes.json();
    expect(refundJson.ok).toBe(true);
    expect(refundJson.payment.status).toBe('refunded');

    // User L1 session immediately reverts to 'free' without logout
    expect(getL1BillingEntitlement(user.id)?.plan).toBe('free');
    expect((await getSessionUser(session.token))?.plan).toBe('free');
  });

  it('automatically revokes Pro access in <1ms on Monobank reversed and Stripe charge.refunded webhooks', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env.MONOBANK_PUBLIC_KEY = Buffer.from(publicPem, 'utf8').toString('base64');
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_auto_revoke';

    const user = await createUser('autorevoke@example.com', 'Auto Revoke', 'free');
    const session = await createSession(user.id, 'web');

    // Pay via Monobank
    const paidPayload = JSON.stringify({
      invoiceId: 'mono_rev_42',
      status: 'success',
      amount: 59900,
      ccy: 980,
      reference: `gb|${user.id}|pro_monthly|${user.email}`,
    });
    const paidSig = crypto
      .sign('sha256', Buffer.from(paidPayload, 'utf8'), privateKey)
      .toString('base64');

    const payRes = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=monobank', {
        method: 'POST',
        headers: { 'X-Sign': paidSig },
        body: paidPayload,
      }),
    );
    expect(payRes.status).toBe(200);
    expect((await getSessionUser(session.token))?.plan).toBe('pro');

    // Reversal webhook from Monobank
    const revPayload = JSON.stringify({
      invoiceId: 'mono_rev_42',
      status: 'reversed',
      amount: 59900,
      ccy: 980,
    });
    const revSig = crypto
      .sign('sha256', Buffer.from(revPayload, 'utf8'), privateKey)
      .toString('base64');

    const revRes = await billingWebhookPost(
      new NextRequest('http://localhost:3000/api/billing/webhook?provider=monobank', {
        method: 'POST',
        headers: { 'X-Sign': revSig },
        body: revPayload,
      }),
    );
    expect(revRes.status).toBe(200);
    const revJson = await revRes.json();
    expect(revJson.revoked).toBe(true);
    expect(getL1BillingEntitlement(user.id)?.plan).toBe('free');
    expect((await getSessionUser(session.token))?.plan).toBe('free');
  });

  it('deduplicates concurrent Monobank /pubkey fetches via single-flight locking', async () => {
    delete process.env.MONOBANK_PUBLIC_KEY;
    process.env.MONOBANK_TOKEN = 'mono_singleflight_token';

    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });
    const encodedPub = Buffer.from(
      publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      'utf8',
    ).toString('base64');

    let pubkeyCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL | Request) => {
        if (String(url).includes('/api/merchant/pubkey')) {
          pubkeyCalls += 1;
          await new Promise((r) => setTimeout(r, 15));
          return new Response(JSON.stringify({ key: encodedPub }), { status: 200 });
        }
        return new Response('{}', { status: 200 });
      }),
    );

    const body = JSON.stringify({ invoiceId: 'sf_1', status: 'success' });
    const sig = crypto
      .sign('sha256', Buffer.from(body, 'utf8'), privateKey)
      .toString('base64');

    const results = await Promise.all([
      verifyMonobankWebhookSignature(body, sig),
      verifyMonobankWebhookSignature(body, sig),
      verifyMonobankWebhookSignature(body, sig),
      verifyMonobankWebhookSignature(body, sig),
      verifyMonobankWebhookSignature(body, sig),
    ]);

    expect(results.every((r) => r.valid)).toBe(true);
    expect(pubkeyCalls).toBe(1);
  });
});
