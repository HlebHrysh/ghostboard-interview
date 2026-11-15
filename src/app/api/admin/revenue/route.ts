import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/adminGuard';
import { validateOrigin } from '@/lib/rateLimit';
import {
  BillingDatabaseUnavailableError,
  getTotalUsersCountForRevenue,
  issueProviderRefund,
  listEnrichedPayments,
  revokeOrRefundPaymentRecord,
  type BillingCurrency,
  type BillingProvider,
} from '@/lib/billing';

export const dynamic = 'force-dynamic';

const refundActionSchema = z.object({
  action: z.literal('refund_and_revoke').default('refund_and_revoke'),
  paymentId: z.string().min(1).max(128),
  reason: z.string().max(300).optional(),
  issueGatewayRefund: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const [payments, totalUsers] = await Promise.all([
      listEnrichedPayments(),
      getTotalUsersCountForRevenue(),
    ]);

    const currencyBreakdown: Record<
      BillingCurrency,
      { count: number; grossMinor: number; refundedMinor: number }
    > = {
      UAH: { count: 0, grossMinor: 0, refundedMinor: 0 },
      USD: { count: 0, grossMinor: 0, refundedMinor: 0 },
      EUR: { count: 0, grossMinor: 0, refundedMinor: 0 },
    };

    const providerBreakdown: Record<
      BillingProvider,
      { count: number; grossUsdCents: number }
    > = {
      monobank: { count: 0, grossUsdCents: 0 },
      lemonsqueezy: { count: 0, grossUsdCents: 0 },
      stripe: { count: 0, grossUsdCents: 0 },
      sandbox: { count: 0, grossUsdCents: 0 },
    };

    let grossUsdCents = 0;
    let mrrUsdCents = 0;
    let succeededCount = 0;
    let refundedCount = 0;
    const paidUsers = new Set<string>();

    for (const p of payments) {
      const cur: BillingCurrency =
        p.currency === 'UAH' || p.currency === 'EUR' ? p.currency : 'USD';
      const prov: BillingProvider =
        p.provider === 'monobank' ||
        p.provider === 'lemonsqueezy' ||
        p.provider === 'sandbox'
          ? p.provider
          : 'stripe';

      if (p.status === 'refunded') {
        refundedCount += 1;
        currencyBreakdown[cur].refundedMinor += p.amountCents || 0;
        continue;
      }

      if (p.status === 'failed') {
        continue;
      }

      succeededCount += 1;
      paidUsers.add(p.userId);
      const usdCents = p.amountUsdCents || p.amountCents || 0;
      grossUsdCents += usdCents;

      currencyBreakdown[cur].count += 1;
      currencyBreakdown[cur].grossMinor += p.amountCents || 0;

      providerBreakdown[prov].count += 1;
      providerBreakdown[prov].grossUsdCents += usdCents;

      if (p.plan.toLowerCase().includes('pro')) {
        if (p.billingCycle === 'annual') {
          mrrUsdCents += Math.round(usdCents / 12);
        } else {
          mrrUsdCents += usdCents || 1500;
        }
      }
    }

    const conversionRatePercent =
      totalUsers > 0
        ? Math.round((paidUsers.size / totalUsers) * 1000) / 10
        : 0;

    return NextResponse.json({
      payments,
      summary: {
        totalTransactions: payments.length,
        succeededTransactions: succeededCount,
        refundedTransactions: refundedCount,
        totalUsers,
        paidUsersCount: paidUsers.size,
        grossUsdCents,
        mrrUsdCents,
        conversionRatePercent,
        currencyBreakdown,
        providerBreakdown,
      },
    });
  } catch (err) {
    if (err instanceof BillingDatabaseUnavailableError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to load revenue ledger',
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = refundActionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid refund/revoke request payload' },
      { status: 400 },
    );
  }

  try {
    const payments = await listEnrichedPayments();
    const target = payments.find((p) => p.id === parsed.data.paymentId);
    if (!target) {
      return NextResponse.json(
        { error: 'Payment transaction not found' },
        { status: 404 },
      );
    }

    let gatewayRefund: { refundedAtGateway: boolean; gatewayStatus: string } = {
      refundedAtGateway: false,
      gatewayStatus: 'skipped',
    };

    if (parsed.data.issueGatewayRefund && target.status !== 'refunded') {
      try {
        gatewayRefund = await issueProviderRefund({
          provider: target.provider,
          invoiceId: target.invoiceId || target.id,
          amountMinor: target.amountCents,
        });
      } catch (gwErr) {
        gatewayRefund = {
          refundedAtGateway: false,
          gatewayStatus:
            gwErr instanceof Error
              ? `gateway_error: ${gwErr.message}`
              : 'gateway_error',
        };
      }
    }

    const result = await revokeOrRefundPaymentRecord({
      paymentId: parsed.data.paymentId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      ok: true,
      payment: result.payment,
      revokedUserId: result.revokedUserId,
      gatewayRefund,
    });
  } catch (err) {
    if (err instanceof BillingDatabaseUnavailableError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to issue refund and revoke plan',
      },
      { status: 500 },
    );
  }
}
