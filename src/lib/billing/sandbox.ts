import crypto from 'node:crypto';
import { isProdSimulatorAllowed, isProduction } from '@/lib/envGuard';
import { getBillingRedis, setBoundedMapEntry } from './cache';
import type {
  BillingCurrency,
  BillingInterval,
  BillingPlanDefinition,
  TargetPaidPlan,
} from './plans';

export interface SandboxSessionRecord {
  invoiceId: string;
  reference: string;
  userId: string;
  email: string;
  planId: string;
  targetPlan: TargetPaidPlan;
  interval: BillingInterval;
  currency: BillingCurrency;
  amountMinor: number;
  redirectUrl: string;
  createdAt: number;
}

export interface SandboxWebhookPayload {
  eventId: string;
  invoiceId: string;
  reference: string;
  status: 'paid' | 'failed' | 'refunded';
  userId: string;
  email: string;
  planId: string;
  targetPlan: TargetPaidPlan;
  interval: BillingInterval;
  currency: BillingCurrency;
  amountMinor: number;
  threeDsStatus: 'authenticated' | 'failed';
  timestamp: string;
}

const g = globalThis as typeof globalThis & {
  __ghostboardSandboxSessions?: Map<string, SandboxSessionRecord>;
};

function getSandboxStore(): Map<string, SandboxSessionRecord> {
  if (!g.__ghostboardSandboxSessions) {
    g.__ghostboardSandboxSessions = new Map();
  }
  return g.__ghostboardSandboxSessions;
}

export function isSandboxAllowed(): boolean {
  if (process.env.BILLING_PROVIDER?.trim().toLowerCase() === 'sandbox') {
    return true;
  }
  return !isProduction() || isProdSimulatorAllowed();
}

export function getSandboxSigningSecret(): string {
  const configured =
    process.env.SANDBOX_WEBHOOK_SECRET?.trim() ||
    process.env.BILLING_SANDBOX_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }
  if (isProduction()) {
    throw new Error(
      'SANDBOX_WEBHOOK_SECRET or SESSION_SECRET must be set to sign sandbox webhooks in production',
    );
  }
  return 'ghostboard_dev_sandbox_hmac_key_not_for_production';
}

export function signSandboxPayload(
  rawBody: string,
  secretOverride?: string,
): string {
  const secret = secretOverride || getSandboxSigningSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');
}

export function verifySandboxSignature(
  rawBody: string,
  headerSignature: string | null,
  secretOverride?: string,
): { valid: boolean; reason?: string } {
  if (!headerSignature || !headerSignature.trim()) {
    return { valid: false, reason: 'Missing X-Sandbox-Signature header' };
  }
  const normalized = headerSignature.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    return { valid: false, reason: 'Malformed X-Sandbox-Signature header' };
  }

  let expectedHex: string;
  try {
    expectedHex = signSandboxPayload(rawBody, secretOverride);
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : 'Missing sandbox signing secret',
    };
  }

  const providedBuf = Buffer.from(normalized, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return { valid: false, reason: 'Sandbox HMAC-SHA256 signature mismatch' };
  }
  return { valid: true };
}

export async function createSandboxCheckoutSession(input: {
  userId: string;
  email: string;
  plan: BillingPlanDefinition;
  currency: BillingCurrency;
  redirectUrl: string;
  reference: string;
}): Promise<{
  invoiceId: string;
  challengeToken: string;
  record: SandboxSessionRecord;
}> {
  if (!isSandboxAllowed()) {
    throw new Error(
      'Sandbox gateway is disabled in production without BILLING_PROVIDER=sandbox or ENABLE_PROD_SIMULATOR=true',
    );
  }

  const invoiceId = `sbx_inv_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const amountMinor =
    input.plan.amountsMinor[input.currency] ?? input.plan.amountsMinor.USD;

  const record: SandboxSessionRecord = {
    invoiceId,
    reference: input.reference,
    userId: input.userId,
    email: input.email,
    planId: input.plan.id,
    targetPlan: input.plan.targetPlan,
    interval: input.plan.interval,
    currency: input.currency,
    amountMinor,
    redirectUrl: input.redirectUrl,
    createdAt: Date.now(),
  };

  setBoundedMapEntry(getSandboxStore(), invoiceId, record, 2000);

  const redis = getBillingRedis();
  if (redis) {
    try {
      await redis.set(`billing:sandbox:session:${invoiceId}`, record, {
        ex: 3600,
      });
    } catch {
      // Non-fatal in sandbox mode
    }
  }

  const challengeToken = signSandboxPayload(
    JSON.stringify({ invoiceId, userId: input.userId, amountMinor }),
  );

  return {
    invoiceId,
    challengeToken,
    record,
  };
}

export async function getSandboxCheckoutSession(
  invoiceId: string,
): Promise<SandboxSessionRecord | null> {
  const inMem = getSandboxStore().get(invoiceId);
  if (inMem) return inMem;

  const redis = getBillingRedis();
  if (redis) {
    try {
      const fromRedis = await redis.get<SandboxSessionRecord>(
        `billing:sandbox:session:${invoiceId}`,
      );
      if (fromRedis) {
        getSandboxStore().set(invoiceId, fromRedis);
        return fromRedis;
      }
    } catch {
      // Ignore Redis lookup errors in sandbox
    }
  }
  return null;
}

export function buildSignedSandboxWebhook(
  record: SandboxSessionRecord,
  outcome: 'paid' | 'failed' = 'paid',
): { rawBody: string; signature: string; payload: SandboxWebhookPayload } {
  const payload: SandboxWebhookPayload = {
    eventId: `sbx_evt_${record.invoiceId}`,
    invoiceId: record.invoiceId,
    reference: record.reference,
    status: outcome,
    userId: record.userId,
    email: record.email,
    planId: record.planId,
    targetPlan: record.targetPlan,
    interval: record.interval,
    currency: record.currency,
    amountMinor: record.amountMinor,
    threeDsStatus: outcome === 'paid' ? 'authenticated' : 'failed',
    timestamp: new Date().toISOString(),
  };

  const rawBody = JSON.stringify(payload);
  const signature = signSandboxPayload(rawBody);
  return { rawBody, signature, payload };
}

export async function simulateSandboxGatewayLatency(
  ms = 140,
): Promise<void> {
  if (ms <= 0 || process.env.VITEST) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
