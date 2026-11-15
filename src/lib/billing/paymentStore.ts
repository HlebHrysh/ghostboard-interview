import crypto from 'node:crypto';
import type { Plan } from '@/lib/plans';
import { normalizePlan } from '@/lib/plans';
import { isProduction } from '@/lib/envGuard';
import {
  getAllPayments as getServerDbPayments,
  getAllUsers as getServerDbUsers,
  getUserByEmail as getServerDbUserByEmail,
  getUserById as getServerDbUserById,
  createUser as createServerDbUser,
  isDbCircuitBroken,
  logPayment as logServerDbPayment,
  rawPrisma,
  updateUserPlan as updateServerDbUserPlan,
} from '@/lib/serverDb';
import { logger } from '@/lib/logger';
import {
  acquireBillingLock,
  getBillingRedis,
  getL1BillingEntitlement,
  getRedisBillingEntitlement,
  invalidateAndRefreshUserL1Caches,
  setBoundedMapEntry,
  setL1BillingEntitlement,
} from './cache';
import {
  BILLING_PLANS,
  computePlanExpiration,
  convertMinorToUsdCents,
  normalizeCurrency,
  resolveBillingPlan,
  type BillingCurrency,
  type BillingInterval,
  type BillingProvider,
  type TargetPaidPlan,
} from './plans';

const log = logger.child({ component: 'billingPaymentStore' });

export type WebhookSignatureStatus =
  | 'verified_ecdsa'
  | 'verified_hmac'
  | 'verified_stripe'
  | 'verified_sandbox'
  | 'dev_unsigned';

export interface EnrichedPaymentRecord {
  id: string;
  userId: string;
  email: string;
  plan: string;
  amountCents: number;
  amountUsdCents: number;
  currency: BillingCurrency;
  provider: BillingProvider;
  providerEventId: string;
  invoiceId: string;
  status: 'succeeded' | 'failed' | 'refunded' | string;
  signatureStatus: WebhookSignatureStatus;
  billingCycle: BillingInterval;
  planExpiresAt: string | null;
  timestamp: number;
  createdAt: string;
  refundedAt?: string | null;
  refundReason?: string | null;
  reference?: string | null;
}

export interface FulfillWebhookInput {
  provider: BillingProvider;
  providerEventId: string;
  invoiceId: string;
  userId?: string | null;
  email?: string | null;
  planId?: string | null;
  targetPlan?: TargetPaidPlan | null;
  interval?: BillingInterval | string | null;
  amountMinor: number;
  currency: BillingCurrency | string;
  signatureStatus: WebhookSignatureStatus;
  reference?: string | null;
  cardToken?: string | null;
  walletId?: string | null;
  explicitExpiresAt?: string | null;
}

export interface FulfillWebhookResult {
  idempotentDuplicate: boolean;
  alreadyProcessed: boolean;
  payment: EnrichedPaymentRecord;
  userId: string;
  email: string;
  plan: Plan;
  planExpiresAt: string | null;
  sessionToken?: string;
}

export class BillingDatabaseUnavailableError extends Error {
  readonly status = 503;
  readonly code = 'BILLING_DB_UNAVAILABLE';

  constructor(
    message = 'Primary billing database is unavailable; failing fast so payment gateway retries.',
  ) {
    super(message);
    this.name = 'BillingDatabaseUnavailableError';
  }
}

export function isPersistentBillingDbRequired(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && isProduction();
}

function isTransientDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { code?: string; message?: string; name?: string };
  const code = record.code || '';
  const msg = (record.message || '').toLowerCase();
  return (
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1008' ||
    code === 'P1017' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    msg.includes('can\'t reach database server') ||
    msg.includes('connection refused') ||
    msg.includes('timed out') ||
    msg.includes('circuit breaker')
  );
}

/**
 * Generates a deterministic RFC-4122 UUID-v4 shaped identifier from provider + eventId
 * so PostgreSQL `Payment.id` enforces DB-level idempotency automatically.
 */
export function deterministicPaymentUuid(
  provider: BillingProvider,
  providerEventId: string,
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`ghostboard:payment:${provider}:${providerEventId.trim()}`)
    .digest('hex');

  const bytes = Buffer.from(hash.slice(0, 32), 'hex');
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

interface BillingMetaStore {
  paymentsById: Map<string, EnrichedPaymentRecord>;
  eventKeys: Map<string, string>; // `${provider}:${eventId}` -> paymentId
  linkedServerDbIds: Map<string, string>; // serverDb.id -> canonical paymentRowId
  userBillingMeta: Map<
    string,
    {
      plan: Plan;
      planExpiresAt: string | null;
      provider: BillingProvider;
      billingCycle: BillingInterval;
      lastPaymentId: string;
      cardToken?: string | null;
      walletId?: string | null;
      updatedAt: string;
    }
  >;
}

const g = globalThis as typeof globalThis & {
  __ghostboardBillingMetaStore?: BillingMetaStore;
};

function getMetaStore(): BillingMetaStore {
  if (!g.__ghostboardBillingMetaStore) {
    g.__ghostboardBillingMetaStore = {
      paymentsById: new Map(),
      eventKeys: new Map(),
      linkedServerDbIds: new Map(),
      userBillingMeta: new Map(),
    };
  }
  return g.__ghostboardBillingMetaStore;
}

const REDIS_TX_META_PREFIX = 'billing:tx:';
const REDIS_EVENT_PREFIX = 'billing:event:';
const REDIS_SUB_PREFIX = 'billing:sub:';

function assertDbWritableIfRequired(): void {
  if (!isPersistentBillingDbRequired()) return;
  if (isDbCircuitBroken()) {
    throw new BillingDatabaseUnavailableError(
      'PostgreSQL circuit breaker is tripped in production; refusing volatile RAM fallback.',
    );
  }
}

const MAX_STORE_ENTRIES = 2500;

async function saveExtendedMeta(record: EnrichedPaymentRecord): Promise<void> {
  const store = getMetaStore();
  setBoundedMapEntry(store.paymentsById, record.id, record, MAX_STORE_ENTRIES);
  setBoundedMapEntry(
    store.eventKeys,
    `${record.provider}:${record.providerEventId}`,
    record.id,
    MAX_STORE_ENTRIES * 2,
  );
  setBoundedMapEntry(
    store.eventKeys,
    `${record.provider}:${record.invoiceId}`,
    record.id,
    MAX_STORE_ENTRIES * 2,
  );

  const redis = getBillingRedis();
  if (redis) {
    try {
      await Promise.all([
        redis.set(`${REDIS_TX_META_PREFIX}${record.id}`, record, {
          ex: 365 * 86_400,
        }),
        redis.set(
          `${REDIS_EVENT_PREFIX}${record.provider}:${record.providerEventId}`,
          record.id,
          { ex: 90 * 86_400 },
        ),
        redis.set(
          `${REDIS_EVENT_PREFIX}${record.provider}:${record.invoiceId}`,
          record.id,
          { ex: 90 * 86_400 },
        ),
      ]);
    } catch (err) {
      log.warn('Failed to mirror tx metadata to Redis', { paymentId: record.id }, err);
    }
  }
}

async function getExtendedMeta(
  paymentId: string,
): Promise<Partial<EnrichedPaymentRecord> | null> {
  const inMem = getMetaStore().paymentsById.get(paymentId);
  if (inMem) return inMem;

  const redis = getBillingRedis();
  if (redis) {
    try {
      const fromRedis = await redis.get<EnrichedPaymentRecord>(
        `${REDIS_TX_META_PREFIX}${paymentId}`,
      );
      if (fromRedis) {
        getMetaStore().paymentsById.set(paymentId, fromRedis);
        return fromRedis;
      }
    } catch {
      // Ignore Redis read failure
    }
  }
  return null;
}

async function checkAlreadyProcessedEvent(
  provider: BillingProvider,
  providerEventId: string,
  invoiceId: string,
  paymentRowId: string,
): Promise<EnrichedPaymentRecord | null> {
  const store = getMetaStore();
  const memId =
    store.eventKeys.get(`${provider}:${providerEventId}`) ||
    store.eventKeys.get(`${provider}:${invoiceId}`);

  if (memId) {
    const existing = store.paymentsById.get(memId);
    if (existing) return existing;
  }

  // If production requires Postgres, check authoritative DB row directly
  if (isPersistentBillingDbRequired()) {
    assertDbWritableIfRequired();
    try {
      const row = await rawPrisma.payment.findUnique({
        where: { id: paymentRowId },
      });
      if (row) {
        const meta = await getExtendedMeta(row.id);
        return {
          id: row.id,
          userId: row.userId,
          email: row.email,
          plan: row.plan,
          amountCents: row.amountCents,
          amountUsdCents:
            meta?.amountUsdCents ??
            convertMinorToUsdCents(row.amountCents, meta?.currency || 'USD'),
          currency: meta?.currency || 'USD',
          provider: meta?.provider || provider,
          providerEventId: meta?.providerEventId || providerEventId,
          invoiceId: meta?.invoiceId || invoiceId,
          status: row.status,
          signatureStatus: meta?.signatureStatus || 'verified_hmac',
          billingCycle: meta?.billingCycle || (row.plan === 'lifetime' ? 'one_time' : 'monthly'),
          planExpiresAt: meta?.planExpiresAt ?? null,
          timestamp: Number(row.timestamp),
          createdAt: row.createdAt.toISOString(),
          refundedAt: meta?.refundedAt ?? null,
          refundReason: meta?.refundReason ?? null,
        };
      }
    } catch (err) {
      if (isTransientDbConnectionError(err)) {
        throw new BillingDatabaseUnavailableError(
          `Database read failed while checking webhook idempotency: ${(err as Error).message}`,
        );
      }
      throw err;
    }
  }

  // Also check Redis idempotency markers in a single batched mget
  const redis = getBillingRedis();
  if (redis) {
    try {
      const keys = [
        `${REDIS_EVENT_PREFIX}${provider}:${providerEventId}`,
        `${REDIS_EVENT_PREFIX}${provider}:${invoiceId}`,
      ];
      const results = await redis.mget<(string | null)[]>(...keys);
      const existingId = results.find((id): id is string => Boolean(id));
      if (existingId) {
        const meta = await getExtendedMeta(existingId);
        if (meta && meta.id) {
          return meta as EnrichedPaymentRecord;
        }
      }
    } catch (err) {
      log.warn('Redis idempotency check failed', undefined, err);
    }
  }

  return null;
}

/**
 * Atomically logs an incoming verified webhook payment, updates User.plan and
 * billing expiration metadata, and refreshes all L1/Redis session caches in <1ms.
 */
export async function fulfillPaymentWebhook(
  input: FulfillWebhookInput,
): Promise<FulfillWebhookResult> {
  const providerEventId = input.providerEventId.trim() || input.invoiceId.trim();
  const invoiceId = input.invoiceId.trim() || providerEventId;
  const paymentRowId = deterministicPaymentUuid(input.provider, providerEventId);
  const currency = normalizeCurrency(input.currency);
  const resolvedPlanDef = resolveBillingPlan(input.planId, input.interval);
  const targetPlan: TargetPaidPlan =
    input.targetPlan || resolvedPlanDef.targetPlan;
  const billingCycle: BillingInterval =
    (input.interval as BillingInterval) || resolvedPlanDef.interval;

  const lock = await acquireBillingLock(`${input.provider}:${invoiceId}`, 30);
  if (!lock.acquired) {
    // Another worker is currently processing the exact same invoice/event;
    // re-check idempotency cleanly.
    const existingAfterWait = await checkAlreadyProcessedEvent(
      input.provider,
      providerEventId,
      invoiceId,
      paymentRowId,
    );
    if (existingAfterWait) {
      return {
        idempotentDuplicate: true,
        alreadyProcessed: true,
        payment: existingAfterWait,
        userId: existingAfterWait.userId,
        email: existingAfterWait.email,
        plan: normalizePlan(existingAfterWait.plan),
        planExpiresAt: existingAfterWait.planExpiresAt,
      };
    }
    throw new BillingDatabaseUnavailableError(
      'Concurrent webhook lock active for this invoice; gateway should retry shortly.',
    );
  }

  try {
    // 1. Check strict DB fail-fast BEFORE doing anything
    assertDbWritableIfRequired();

    // 2. Check idempotency across memory, Redis, and PostgreSQL
    const duplicate = await checkAlreadyProcessedEvent(
      input.provider,
      providerEventId,
      invoiceId,
      paymentRowId,
    );
    if (duplicate) {
      log.info('Ignoring duplicate webhook event (idempotent hit)', {
        provider: input.provider,
        invoiceId,
        providerEventId,
        paymentId: duplicate.id,
      });
      return {
        idempotentDuplicate: true,
        alreadyProcessed: true,
        payment: duplicate,
        userId: duplicate.userId,
        email: duplicate.email,
        plan: normalizePlan(duplicate.plan),
        planExpiresAt: duplicate.planExpiresAt,
      };
    }

    const planExpiresAt =
      input.explicitExpiresAt !== undefined
        ? input.explicitExpiresAt
        : computePlanExpiration(
            targetPlan === 'lifetime'
              ? BILLING_PLANS.lifetime
              : billingCycle === 'annual'
                ? BILLING_PLANS.pro_annual
                : BILLING_PLANS.pro_monthly,
          );

    const amountMinor = Math.max(0, Math.round(input.amountMinor || 0));
    const amountUsdCents = convertMinorToUsdCents(amountMinor, currency);
    const now = Date.now();
    const cleanEmail = (input.email || '').trim().toLowerCase();

    let resolvedUserId: string;
    let resolvedEmail: string;

    if (isPersistentBillingDbRequired()) {
      // Production Postgres authoritative write via rawPrisma (NEVER memPayments)
      try {
        const result = await rawPrisma.$transaction(async (tx) => {
          // Re-check inside serial transaction by deterministic PK
          const existingRow = await tx.payment.findUnique({
            where: { id: paymentRowId },
          });
          if (existingRow) {
            return { duplicateRow: existingRow };
          }

          let dbUser =
            input.userId && !input.userId.startsWith('guest_')
              ? await tx.user.findUnique({ where: { id: input.userId } })
              : null;

          if (!dbUser && cleanEmail) {
            dbUser = await tx.user.findUnique({ where: { email: cleanEmail } });
          }

          if (!dbUser) {
            const fallbackEmail =
              cleanEmail || `customer_${invoiceId.slice(-10)}@ghostboard.pro`;
            dbUser = await tx.user.upsert({
              where: { email: fallbackEmail },
              create: {
                email: fallbackEmail,
                name: fallbackEmail.split('@')[0],
                plan: targetPlan,
                role: 'user',
              },
              update: {
                plan: targetPlan,
              },
            });
          }

          const existingProfile =
            dbUser.candidateProfile &&
            typeof dbUser.candidateProfile === 'object' &&
            !Array.isArray(dbUser.candidateProfile)
              ? (dbUser.candidateProfile as Record<string, unknown>)
              : {};

          const mergedProfile = {
            ...existingProfile,
            _billing: {
              provider: input.provider,
              billingCycle,
              planExpiresAt,
              lastPaymentId: paymentRowId,
              invoiceId,
              cardTokenAvailable: Boolean(input.cardToken),
              walletId: input.walletId || null,
              updatedAt: new Date(now).toISOString(),
            },
          };

          await tx.user.update({
            where: { id: dbUser.id },
            data: {
              plan: targetPlan,
              candidateProfile: mergedProfile,
            },
          });

          const createdPayment = await tx.payment.create({
            data: {
              id: paymentRowId,
              userId: dbUser.id,
              email: dbUser.email,
              plan: targetPlan,
              amountCents: amountMinor,
              status: 'succeeded',
              timestamp: BigInt(now),
            },
          });

          return { dbUser, createdPayment };
        });

        if ('duplicateRow' in result && result.duplicateRow) {
          const dup = result.duplicateRow;
          const record: EnrichedPaymentRecord = {
            id: dup.id,
            userId: dup.userId,
            email: dup.email,
            plan: dup.plan,
            amountCents: dup.amountCents,
            amountUsdCents,
            currency,
            provider: input.provider,
            providerEventId,
            invoiceId,
            status: dup.status,
            signatureStatus: input.signatureStatus,
            billingCycle,
            planExpiresAt,
            timestamp: Number(dup.timestamp),
            createdAt: dup.createdAt.toISOString(),
            reference: input.reference ?? null,
          };
          await saveExtendedMeta(record);
          return {
            idempotentDuplicate: true,
            alreadyProcessed: true,
            payment: record,
            userId: dup.userId,
            email: dup.email,
            plan: normalizePlan(dup.plan),
            planExpiresAt,
          };
        }

        resolvedUserId = result.dbUser!.id;
        resolvedEmail = result.dbUser!.email;
      } catch (err) {
        // Handle P2002 unique constraint violation as idempotent replay
        if (
          err &&
          typeof err === 'object' &&
          (err as { code?: string }).code === 'P2002'
        ) {
          const existing = await rawPrisma.payment.findUnique({
            where: { id: paymentRowId },
          });
          if (existing) {
            const record: EnrichedPaymentRecord = {
              id: existing.id,
              userId: existing.userId,
              email: existing.email,
              plan: existing.plan,
              amountCents: existing.amountCents,
              amountUsdCents,
              currency,
              provider: input.provider,
              providerEventId,
              invoiceId,
              status: existing.status,
              signatureStatus: input.signatureStatus,
              billingCycle,
              planExpiresAt,
              timestamp: Number(existing.timestamp),
              createdAt: existing.createdAt.toISOString(),
            };
            await saveExtendedMeta(record);
            return {
              idempotentDuplicate: true,
              alreadyProcessed: true,
              payment: record,
              userId: existing.userId,
              email: existing.email,
              plan: normalizePlan(existing.plan),
              planExpiresAt,
            };
          }
        }

        // ANY DB connectivity / timeout error in production MUST throw 503 (never fallback to RAM)
        log.error(
          'PostgreSQL billing persistence failed in production; throwing 503 for gateway retry',
          { provider: input.provider, invoiceId },
          err,
        );
        throw new BillingDatabaseUnavailableError(
          `Billing DB write failed in production: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }
    } else {
      // Non-production / memory-dev path: keep serverDb consistent
      let user =
        input.userId && !input.userId.startsWith('guest_')
          ? await getServerDbUserById(input.userId)
          : null;

      if (!user && cleanEmail) {
        user = await getServerDbUserByEmail(cleanEmail);
      }
      if (!user) {
        const fallbackEmail =
          cleanEmail || `customer_${invoiceId.slice(-10)}@ghostboard.pro`;
        user = await createServerDbUser(
          fallbackEmail,
          fallbackEmail.split('@')[0],
          targetPlan,
        );
      } else {
        await updateServerDbUserPlan(user.id, targetPlan);
      }

      resolvedUserId = user.id;
      resolvedEmail = user.email;

      const loggedRow = await logServerDbPayment({
        userId: resolvedUserId,
        email: resolvedEmail,
        plan: targetPlan,
        amountCents: amountMinor,
        status: 'succeeded',
      });
      if (loggedRow?.id && loggedRow.id !== paymentRowId) {
        getMetaStore().linkedServerDbIds.set(loggedRow.id, paymentRowId);
      }
    }

    const record: EnrichedPaymentRecord = {
      id: paymentRowId,
      userId: resolvedUserId,
      email: resolvedEmail,
      plan: targetPlan,
      amountCents: amountMinor,
      amountUsdCents,
      currency,
      provider: input.provider,
      providerEventId,
      invoiceId,
      status: 'succeeded',
      signatureStatus: input.signatureStatus,
      billingCycle,
      planExpiresAt,
      timestamp: now,
      createdAt: new Date(now).toISOString(),
      reference: input.reference ?? null,
    };

    getMetaStore().userBillingMeta.set(resolvedUserId, {
      plan: targetPlan,
      planExpiresAt,
      provider: input.provider,
      billingCycle,
      lastPaymentId: paymentRowId,
      cardToken: input.cardToken ?? null,
      walletId: input.walletId ?? null,
      updatedAt: new Date(now).toISOString(),
    });

    const redis = getBillingRedis();
    if (redis) {
      try {
        await redis.set(
          `${REDIS_SUB_PREFIX}${resolvedUserId}`,
          getMetaStore().userBillingMeta.get(resolvedUserId),
          { ex: 365 * 86_400 },
        );
      } catch {
        // Best effort
      }
    }

    await saveExtendedMeta(record);

    // 3. Instant <1ms L1 session & user cache invalidation/update
    await invalidateAndRefreshUserL1Caches({
      userId: resolvedUserId,
      email: resolvedEmail,
      plan: targetPlan,
      planExpiresAt,
      provider: input.provider,
      billingCycle,
      lastPaymentId: paymentRowId,
      cardTokenAvailable: Boolean(input.cardToken),
    });

    return {
      idempotentDuplicate: false,
      alreadyProcessed: false,
      payment: record,
      userId: resolvedUserId,
      email: resolvedEmail,
      plan: targetPlan,
      planExpiresAt,
    };
  } finally {
    await lock.release();
  }
}

export async function revokeOrRefundPaymentRecord(params: {
  paymentId: string;
  reason?: string;
}): Promise<{
  payment: EnrichedPaymentRecord;
  revokedUserId: string;
}> {
  assertDbWritableIfRequired();

  const metaStore = getMetaStore();
  let targetMeta = metaStore.paymentsById.get(params.paymentId) || null;
  if (!targetMeta) {
    const fromRedis = await getExtendedMeta(params.paymentId);
    if (fromRedis && fromRedis.id) {
      targetMeta = fromRedis as EnrichedPaymentRecord;
    }
  }

  let userId = targetMeta?.userId || '';
  let email = targetMeta?.email || '';
  let amountCents = targetMeta?.amountCents || 0;
  const nowIso = new Date().toISOString();

  if (isPersistentBillingDbRequired()) {
    try {
      const updated = await rawPrisma.$transaction(async (tx) => {
        const dbPay = await tx.payment.findUnique({
          where: { id: params.paymentId },
        });
        if (!dbPay) {
          throw new Error(`Payment ${params.paymentId} not found`);
        }
        userId = dbPay.userId;
        email = dbPay.email;
        amountCents = dbPay.amountCents;

        const paid = await tx.payment.update({
          where: { id: dbPay.id },
          data: { status: 'refunded' },
        });

        const dbUser = await tx.user.findUnique({ where: { id: dbPay.userId } });
        const existingProfile =
          dbUser?.candidateProfile &&
          typeof dbUser.candidateProfile === 'object' &&
          !Array.isArray(dbUser.candidateProfile)
            ? (dbUser.candidateProfile as Record<string, unknown>)
            : {};

        await tx.user.update({
          where: { id: dbPay.userId },
          data: {
            plan: 'free',
            candidateProfile: {
              ...existingProfile,
              _billing: {
                ...(typeof existingProfile._billing === 'object' &&
                existingProfile._billing !== null
                  ? (existingProfile._billing as Record<string, unknown>)
                  : {}),
                planExpiresAt: null,
                revokedAt: nowIso,
                revokeReason: params.reason || 'admin_refund',
              },
            },
          },
        });

        return paid;
      });
      userId = updated.userId;
      email = updated.email;
      amountCents = updated.amountCents;
    } catch (err) {
      if (isTransientDbConnectionError(err)) {
        throw new BillingDatabaseUnavailableError(
          `Database error during refund/revoke: ${(err as Error).message}`,
        );
      }
      throw err;
    }
  } else {
    if (!userId) {
      const memList = await getServerDbPayments();
      const found = memList.find((p) => p.id === params.paymentId);
      if (found) {
        userId = found.userId;
        email = found.email;
        amountCents = found.amountCents;
        found.status = 'refunded';
      }
    }
    if (!userId) {
      throw new Error(`Payment ${params.paymentId} not found`);
    }
    const memList = await getServerDbPayments();
    for (const p of memList) {
      const canonical = metaStore.linkedServerDbIds.get(p.id);
      if (p.id === params.paymentId || canonical === params.paymentId) {
        p.status = 'refunded';
      }
    }
    await updateServerDbUserPlan(userId, 'free');
  }

  const refundedRecord: EnrichedPaymentRecord = {
    id: params.paymentId,
    userId,
    email,
    plan: targetMeta?.plan || 'pro',
    amountCents,
    amountUsdCents:
      targetMeta?.amountUsdCents ??
      convertMinorToUsdCents(amountCents, targetMeta?.currency || 'USD'),
    currency: targetMeta?.currency || 'USD',
    provider: targetMeta?.provider || 'stripe',
    providerEventId: targetMeta?.providerEventId || params.paymentId,
    invoiceId: targetMeta?.invoiceId || params.paymentId,
    status: 'refunded',
    signatureStatus: targetMeta?.signatureStatus || 'verified_hmac',
    billingCycle: targetMeta?.billingCycle || 'monthly',
    planExpiresAt: null,
    timestamp: targetMeta?.timestamp || Date.now(),
    createdAt: targetMeta?.createdAt || nowIso,
    refundedAt: nowIso,
    refundReason: params.reason || 'Admin refund / plan revoke',
  };

  metaStore.userBillingMeta.set(userId, {
    plan: 'free',
    planExpiresAt: null,
    provider: refundedRecord.provider,
    billingCycle: refundedRecord.billingCycle,
    lastPaymentId: params.paymentId,
    updatedAt: nowIso,
  });

  await saveExtendedMeta(refundedRecord);
  await invalidateAndRefreshUserL1Caches({
    userId,
    email,
    plan: 'free',
    planExpiresAt: null,
    provider: refundedRecord.provider,
    billingCycle: refundedRecord.billingCycle,
    lastPaymentId: params.paymentId,
    cardTokenAvailable: false,
  });

  return {
    payment: refundedRecord,
    revokedUserId: userId,
  };
}

async function getExtendedMetaBatch(
  paymentIds: string[],
): Promise<Map<string, Partial<EnrichedPaymentRecord>>> {
  const result = new Map<string, Partial<EnrichedPaymentRecord>>();
  const store = getMetaStore();
  const missing: string[] = [];

  for (const id of paymentIds) {
    const cached = store.paymentsById.get(id);
    if (cached) {
      result.set(id, cached);
    } else {
      missing.push(id);
    }
  }

  if (missing.length === 0) return result;

  const redis = getBillingRedis();
  if (redis) {
    try {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        const chunk = missing.slice(i, i + CHUNK_SIZE);
        const keys = chunk.map((id) => `${REDIS_TX_META_PREFIX}${id}`);
        const records = await redis.mget<(EnrichedPaymentRecord | null)[]>(...keys);
        for (let idx = 0; idx < chunk.length; idx++) {
          const rec = records[idx];
          if (rec) {
            setBoundedMapEntry(store.paymentsById, chunk[idx], rec, MAX_STORE_ENTRIES);
            result.set(chunk[idx], rec);
          }
        }
      }
    } catch {
      // Safe fallback to Postgres defaults
    }
  }

  return result;
}

/**
 * Handles automated provider refund/reversal/cancellation webhooks by locating
 * the matching transaction/user and revoking paid entitlements in <1ms.
 */
export async function revokePaymentByInvoiceOrUser(params: {
  provider: BillingProvider;
  invoiceId?: string | null;
  email?: string | null;
  reason?: string;
}): Promise<{ revoked: boolean; paymentId?: string; userId?: string }> {
  const store = getMetaStore();
  const cleanInvoice = (params.invoiceId || '').trim();
  const cleanEmail = (params.email || '').trim().toLowerCase();

  let targetPaymentId = cleanInvoice
    ? store.eventKeys.get(`${params.provider}:${cleanInvoice}`) || null
    : null;

  if (!targetPaymentId && cleanInvoice) {
    const redis = getBillingRedis();
    if (redis) {
      try {
        targetPaymentId = await redis.get<string>(
          `${REDIS_EVENT_PREFIX}${params.provider}:${cleanInvoice}`,
        );
      } catch {
        // ignore
      }
    }
  }

  if (!targetPaymentId && cleanInvoice) {
    const all = await listEnrichedPayments();
    const matched = all.find(
      (p) =>
        p.invoiceId === cleanInvoice ||
        p.id === cleanInvoice ||
        (cleanEmail && p.email.toLowerCase() === cleanEmail && p.status !== 'refunded'),
    );
    if (matched) {
      targetPaymentId = matched.id;
    }
  }

  if (targetPaymentId) {
    const res = await revokeOrRefundPaymentRecord({
      paymentId: targetPaymentId,
      reason: params.reason || `${params.provider}_webhook_revoked`,
    });
    return {
      revoked: true,
      paymentId: res.payment.id,
      userId: res.revokedUserId,
    };
  }

  // Fallback: downgrade user by email if subscription cancelled without matched invoice
  if (cleanEmail) {
    assertDbWritableIfRequired();
    let userId: string | null = null;
    if (isPersistentBillingDbRequired()) {
      const dbUser = await rawPrisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true },
      });
      if (dbUser) {
        await rawPrisma.user.update({
          where: { id: dbUser.id },
          data: { plan: 'free' },
        });
        userId = dbUser.id;
      }
    } else {
      const memUser = await getServerDbUserByEmail(cleanEmail);
      if (memUser) {
        await updateServerDbUserPlan(memUser.id, 'free');
        userId = memUser.id;
      }
    }

    if (userId) {
      await invalidateAndRefreshUserL1Caches({
        userId,
        email: cleanEmail,
        plan: 'free',
        planExpiresAt: null,
        provider: params.provider,
      });
      return { revoked: true, userId };
    }
  }

  return { revoked: false };
}

export async function listEnrichedPayments(): Promise<EnrichedPaymentRecord[]> {
  const store = getMetaStore();
  const byId = new Map<string, EnrichedPaymentRecord>();

  // 1. Seed from billing metadata store
  for (const rec of store.paymentsById.values()) {
    byId.set(rec.id, rec);
  }

  // 2. Merge DB payments (authoritative in PostgreSQL)
  const dbRows = isPersistentBillingDbRequired()
    ? isDbCircuitBroken()
      ? (() => {
          throw new BillingDatabaseUnavailableError();
        })()
      : await rawPrisma.payment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 500,
        })
    : await getServerDbPayments();

  // 3. Batch-fetch missing extended metadata from Redis in a single round-trip chunk
  const uncachedIds: string[] = [];
  for (const row of dbRows) {
    const linkedCanonicalId = store.linkedServerDbIds.get(row.id);
    if (linkedCanonicalId && byId.has(linkedCanonicalId)) continue;
    if (!byId.has(row.id)) {
      uncachedIds.push(row.id);
    }
  }
  const batchMeta = await getExtendedMetaBatch(uncachedIds);

  for (const row of dbRows) {
    const linkedCanonicalId = store.linkedServerDbIds.get(row.id);
    if (linkedCanonicalId && byId.has(linkedCanonicalId)) {
      if (row.status === 'refunded') {
        const canonicalRecord = byId.get(linkedCanonicalId)!;
        canonicalRecord.status = 'refunded';
      }
      continue;
    }
    const existing = byId.get(row.id) || batchMeta.get(row.id) || null;
    const currency: BillingCurrency = normalizeCurrency(existing?.currency || 'USD');
    const createdAt =
      'createdAt' in row && row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : existing?.createdAt || new Date(Number(row.timestamp)).toISOString();

    const merged: EnrichedPaymentRecord = {
      id: row.id,
      userId: row.userId,
      email: row.email,
      plan: row.plan,
      amountCents: row.amountCents,
      amountUsdCents:
        existing?.amountUsdCents ??
        convertMinorToUsdCents(row.amountCents, currency),
      currency,
      provider: existing?.provider || 'stripe',
      providerEventId: existing?.providerEventId || row.id,
      invoiceId: existing?.invoiceId || row.id,
      status: row.status,
      signatureStatus: existing?.signatureStatus || 'verified_stripe',
      billingCycle:
        existing?.billingCycle ||
        (row.plan === 'lifetime' ? 'one_time' : 'monthly'),
      planExpiresAt: existing?.planExpiresAt ?? null,
      timestamp: Number(row.timestamp),
      createdAt,
      refundedAt: existing?.refundedAt ?? null,
      refundReason: existing?.refundReason ?? null,
      reference: existing?.reference ?? null,
    };

    if (row.status === 'refunded') {
      merged.status = 'refunded';
    }
    byId.set(merged.id, merged);
  }

  return Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export async function getUserBillingSummary(params: {
  userId: string;
  email?: string | null;
  fallbackPlan?: string | null;
}): Promise<{
  plan: Plan;
  planExpiresAt: string | null;
  provider: BillingProvider | null;
  billingCycle: BillingInterval | null;
  lastPaymentId: string | null;
  cardTokenAvailable: boolean;
}> {
  // 1. Sub-millisecond L1 cache lookup
  const l1 = getL1BillingEntitlement(params.userId, params.email);
  if (l1) {
    return {
      plan: l1.plan,
      planExpiresAt: l1.planExpiresAt,
      provider: l1.provider,
      billingCycle: l1.billingCycle,
      lastPaymentId: l1.lastPaymentId,
      cardTokenAvailable: Boolean(l1.cardTokenAvailable),
    };
  }

  // 2. Redis cross-instance lookup
  const fromRedis = await getRedisBillingEntitlement(params.userId);
  if (fromRedis) {
    return {
      plan: fromRedis.plan,
      planExpiresAt: fromRedis.planExpiresAt,
      provider: fromRedis.provider,
      billingCycle: fromRedis.billingCycle,
      lastPaymentId: fromRedis.lastPaymentId,
      cardTokenAvailable: Boolean(fromRedis.cardTokenAvailable),
    };
  }

  // 3. Process metadata + single DB lookup fallback (and warm L1 cache)
  const memMeta = getMetaStore().userBillingMeta.get(params.userId);
  if (memMeta) {
    const summary = {
      plan: memMeta.plan,
      planExpiresAt: memMeta.planExpiresAt,
      provider: memMeta.provider,
      billingCycle: memMeta.billingCycle,
      lastPaymentId: memMeta.lastPaymentId,
      cardTokenAvailable: Boolean(memMeta.cardToken),
    };
    setL1BillingEntitlement({
      userId: params.userId,
      email: (params.email || '').toLowerCase(),
      ...summary,
      updatedAt: Date.now(),
    });
    return summary;
  }

  let plan = normalizePlan(params.fallbackPlan || 'free');
  let planExpiresAt: string | null = null;
  let provider: BillingProvider | null = null;
  let billingCycle: BillingInterval | null = null;
  let lastPaymentId: string | null = null;
  let cardTokenAvailable = false;

  if (process.env.DATABASE_URL?.trim() && !isDbCircuitBroken()) {
    try {
      const dbUser = await rawPrisma.user.findUnique({
        where: { id: params.userId },
        select: { plan: true, candidateProfile: true },
      });
      if (dbUser) {
        plan = normalizePlan(dbUser.plan || plan);
      }
      if (dbUser?.candidateProfile && typeof dbUser.candidateProfile === 'object') {
        const billing = (dbUser.candidateProfile as Record<string, unknown>)
          ._billing as Record<string, unknown> | undefined;
        if (billing) {
          planExpiresAt =
            typeof billing.planExpiresAt === 'string'
              ? billing.planExpiresAt
              : null;
          provider = (billing.provider as BillingProvider) || null;
          billingCycle = (billing.billingCycle as BillingInterval) || null;
          lastPaymentId =
            typeof billing.lastPaymentId === 'string'
              ? billing.lastPaymentId
              : null;
          cardTokenAvailable = Boolean(billing.cardTokenAvailable);
        }
      }
    } catch {
      // Safe fallback to normalized plan
    }
  } else if (!params.fallbackPlan) {
    const user = await getServerDbUserById(params.userId);
    if (user) {
      plan = normalizePlan(user.plan);
    }
  }

  const summary = {
    plan,
    planExpiresAt,
    provider,
    billingCycle,
    lastPaymentId,
    cardTokenAvailable,
  };

  setL1BillingEntitlement({
    userId: params.userId,
    email: (params.email || '').toLowerCase(),
    ...summary,
    updatedAt: Date.now(),
  });

  return summary;
}

export async function getTotalUsersCountForRevenue(): Promise<number> {
  if (isPersistentBillingDbRequired() && !isDbCircuitBroken()) {
    try {
      return await rawPrisma.user.count();
    } catch {
      // fall through
    }
  }
  const users = await getServerDbUsers();
  return users.length;
}

export function resetPaymentStoreForTests(): void {
  const store = getMetaStore();
  store.paymentsById.clear();
  store.eventKeys.clear();
  store.linkedServerDbIds.clear();
  store.userBillingMeta.clear();
}
