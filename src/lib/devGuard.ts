import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser, type DbUser } from './serverDb';
import { signSessionPayload, verifySessionSignature } from './server/session';
import { can, normalizePlan, type Feature, type Plan } from './plans';
import { checkRateLimit, validateOrigin } from './rateLimit';

export const DEV_PLAN_OVERRIDE_COOKIE = 'ghostboard_dev_plan_override';
export const DEV_FORCED_MODEL_COOKIE = 'ghostboard_dev_forced_model';

export const VALID_PLAN_OVERRIDES = ['free', 'pro', 'lifetime'] as const;
export type PlanOverride = (typeof VALID_PLAN_OVERRIDES)[number];

export const VALID_FORCED_MODELS = [
  'auto',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'groq',
] as const;
export type ForcedModel = (typeof VALID_FORCED_MODELS)[number];

export interface DevSessionOverrideState {
  planOverride: PlanOverride | null;
  forcedModel: ForcedModel;
  updatedAt: number;
}

export interface MinimalRoleUser {
  id?: string | null;
  role?: string | null;
  plan?: string | null;
  isBanned?: boolean | null;
}

const DEFAULT_DEV_STATE: DevSessionOverrideState = {
  planOverride: null,
  forcedModel: 'auto',
  updatedAt: 0,
};

const devOverridesStore: Map<string, DevSessionOverrideState> = ((
  globalThis as unknown as {
    __ghostboardDevOverrides?: Map<string, DevSessionOverrideState>;
  }
).__ghostboardDevOverrides ??= new Map<string, DevSessionOverrideState>());

export function isPlanOverride(value: unknown): value is PlanOverride {
  return (
    typeof value === 'string' &&
    (VALID_PLAN_OVERRIDES as readonly string[]).includes(value)
  );
}

export function isForcedModel(value: unknown): value is ForcedModel {
  return (
    typeof value === 'string' &&
    (VALID_FORCED_MODELS as readonly string[]).includes(value)
  );
}

export function getDevSessionState(userId?: string | null): DevSessionOverrideState {
  if (!userId) return { ...DEFAULT_DEV_STATE };
  const entry = devOverridesStore.get(userId);
  return entry ? { ...entry } : { ...DEFAULT_DEV_STATE };
}

export function getDevPlanOverride(userId?: string | null): PlanOverride | null {
  if (!userId) return null;
  return devOverridesStore.get(userId)?.planOverride ?? null;
}

export function setDevPlanOverride(
  userId: string,
  planOverride: PlanOverride | null
): DevSessionOverrideState {
  const prev = devOverridesStore.get(userId) ?? { ...DEFAULT_DEV_STATE };
  const next: DevSessionOverrideState = {
    ...prev,
    planOverride: planOverride && isPlanOverride(planOverride) ? planOverride : null,
    updatedAt: Date.now(),
  };
  devOverridesStore.set(userId, next);
  return { ...next };
}

export function getDevForcedModel(userId?: string | null): ForcedModel {
  if (!userId) return 'auto';
  return devOverridesStore.get(userId)?.forcedModel ?? 'auto';
}

export function setDevForcedModel(
  userId: string,
  model: ForcedModel
): DevSessionOverrideState {
  const prev = devOverridesStore.get(userId) ?? { ...DEFAULT_DEV_STATE };
  const next: DevSessionOverrideState = {
    ...prev,
    forcedModel: isForcedModel(model) ? model : 'auto',
    updatedAt: Date.now(),
  };
  devOverridesStore.set(userId, next);
  return { ...next };
}

export function clearDevOverrides(userId?: string): void {
  if (userId) {
    devOverridesStore.delete(userId);
  } else {
    devOverridesStore.clear();
  }
}

export function signDevCookieValue(
  userId: string,
  kind: 'plan' | 'model',
  value: string
): string {
  const sig = signSessionPayload(`dev:${userId}:${kind}:${value}`);
  return `${value}.${sig}`;
}

export function verifyDevCookieValue(
  userId: string,
  kind: 'plan' | 'model',
  rawCookie?: string | null
): string | null {
  if (!rawCookie || typeof rawCookie !== 'string') return null;
  const dotIdx = rawCookie.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const value = rawCookie.slice(0, dotIdx);
  const sig = rawCookie.slice(dotIdx + 1);
  if (!value || !sig) return null;
  return verifySessionSignature(`dev:${userId}:${kind}:${value}`, sig)
    ? value
    : null;
}

function hydrateDevOverridesFromCookies(
  userId: string,
  rawPlanCookie?: string | null,
  rawModelCookie?: string | null
): void {
  if (devOverridesStore.has(userId)) return;

  const verifiedPlan = verifyDevCookieValue(userId, 'plan', rawPlanCookie);
  const verifiedModel = verifyDevCookieValue(userId, 'model', rawModelCookie);

  const planOverride = isPlanOverride(verifiedPlan) ? verifiedPlan : null;
  const forcedModel = isForcedModel(verifiedModel) ? verifiedModel : 'auto';

  if (planOverride !== null || forcedModel !== 'auto') {
    devOverridesStore.set(userId, {
      planOverride,
      forcedModel,
      updatedAt: Date.now(),
    });
  }
}

/**
 * Authoritative server-side RBAC check.
 * Returns true ONLY when the server-resolved user object has role === 'developer' or 'admin'
 * and is not banned. Never trusts HTTP headers or query parameters.
 */
export function hasDeveloperAccess(user: MinimalRoleUser | null | undefined): boolean {
  if (!user || user.isBanned) return false;
  return user.role === 'developer' || user.role === 'admin';
}

/**
 * Resolves the effective product tier for a user.
 * Developers and admins automatically receive unrestricted Pro / Lifetime capabilities ('lifetime')
 * across all AI streams, unlimited duration, OCR screenshots, and desktop sync, unless they
 * explicitly set a temporary Plan Preview Override ('free' | 'pro' | 'lifetime') in their dev session.
 */
export function resolveEffectivePlan(
  user: MinimalRoleUser | null | undefined,
  overridePlan?: PlanOverride | 'reset_to_dev_unlimited' | null
): Plan {
  if (!hasDeveloperAccess(user)) {
    return normalizePlan(user?.plan);
  }

  if (overridePlan === 'reset_to_dev_unlimited') {
    return 'lifetime';
  }

  const activeOverride = isPlanOverride(overridePlan)
    ? overridePlan
    : getDevPlanOverride(user?.id);

  if (activeOverride) {
    return activeOverride;
  }

  return 'lifetime';
}

export interface EffectiveEntitlements {
  effectivePlan: Plan;
  isDeveloper: boolean;
  isOverrideActive: boolean;
  overridePlan: PlanOverride | null;
  forcedModel: ForcedModel;
  aiStreamsUnlimited: boolean;
  unlimitedDuration: boolean;
  ocrScreenshots: boolean;
  desktopSync: boolean;
  panicShield: boolean;
  mockInterview: boolean;
  resumeParse: boolean;
  hasFeature: (feature: Feature) => boolean;
}

export function getEffectiveEntitlements(
  user: MinimalRoleUser | null | undefined,
  overridePlan?: PlanOverride | 'reset_to_dev_unlimited' | null
): EffectiveEntitlements {
  const isDeveloper = hasDeveloperAccess(user);
  const storedOverride = isDeveloper && user?.id ? getDevPlanOverride(user.id) : null;
  const effectiveOverride =
    isDeveloper && overridePlan !== 'reset_to_dev_unlimited'
      ? isPlanOverride(overridePlan)
        ? overridePlan
        : storedOverride
      : null;

  const effectivePlan = resolveEffectivePlan(user, overridePlan);
  const forcedModel = isDeveloper && user?.id ? getDevForcedModel(user.id) : 'auto';
  const isPaidProOrLifetime = effectivePlan === 'pro' || effectivePlan === 'lifetime';

  return {
    effectivePlan,
    isDeveloper,
    isOverrideActive: isDeveloper && effectiveOverride !== null,
    overridePlan: effectiveOverride,
    forcedModel,
    aiStreamsUnlimited: isPaidProOrLifetime || can(effectivePlan, 'unlimited_questions'),
    unlimitedDuration: isPaidProOrLifetime,
    ocrScreenshots: can(effectivePlan, 'screenshot_ai'),
    desktopSync: isPaidProOrLifetime || effectivePlan === 'emergency',
    panicShield: can(effectivePlan, 'panic_shield'),
    mockInterview: can(effectivePlan, 'mock_interview'),
    resumeParse: can(effectivePlan, 'resume_parse'),
    hasFeature: (feature: Feature) => can(effectivePlan, feature),
  };
}

/**
 * Extracts session token exclusively from the trusted HttpOnly session cookie or Bearer header.
 */
export function extractSessionToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get('ghostboard_session')?.value?.trim();
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const bearerToken = match?.[1]?.trim();
    if (bearerToken) return bearerToken;
  }

  return null;
}

/**
 * Strict same-origin check for /api/dev/** endpoints.
 * Rejects cross-site requests and third-party origins (e.g. external web tabs).
 */
export function validateDevOrigin(req: NextRequest): boolean {
  const secFetchSite = req.headers.get('sec-fetch-site')?.toLowerCase();
  if (secFetchSite === 'cross-site') {
    return false;
  }

  if (!validateOrigin(req)) {
    return false;
  }

  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const expectedHost = req.headers.get('host') || req.nextUrl.host;
      const isLocalOrigin =
        originHost.startsWith('localhost') || originHost.startsWith('127.0.0.1');
      if (expectedHost && originHost === expectedHost) {
        return true;
      }
      if (process.env.NODE_ENV !== 'production' && isLocalOrigin) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  return true;
}

export type RequireDeveloperResult =
  | { ok: true; user: DbUser; token: string }
  | { ok: false; response: NextResponse };

function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden' },
    {
      status: 403,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

/**
 * Route guard for /api/dev/** endpoints.
 * Enforces Origin validation, rate limiting, and authenticated session + RBAC role lookup
 * against PostgreSQL/L1 cache. Returns generic 403 Forbidden to non-developers without
 * leaking privileged route state or trusting client-forged headers/query params.
 */
export async function requireDeveloper(
  req: NextRequest
): Promise<RequireDeveloperResult> {
  if (!validateDevOrigin(req)) {
    return { ok: false, response: forbiddenResponse() };
  }

  const rateLimit = await checkRateLimit(req, 60, 60_000, 'dev_api');
  if (!rateLimit.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSec),
            'Cache-Control': 'no-store',
          },
        }
      ),
    };
  }

  const token = extractSessionToken(req);
  if (!token) {
    return { ok: false, response: forbiddenResponse() };
  }

  const user = await getSessionUser(token);
  if (!hasDeveloperAccess(user)) {
    return { ok: false, response: forbiddenResponse() };
  }

  const devUser = user as DbUser;
  hydrateDevOverridesFromCookies(
    devUser.id,
    req.cookies.get(DEV_PLAN_OVERRIDE_COOKIE)?.value,
    req.cookies.get(DEV_FORCED_MODEL_COOKIE)?.value
  );

  return { ok: true, user: devUser, token };
}

/**
 * Resolves the authenticated developer/admin user inside Next.js Server Components
 * using the HttpOnly `ghostboard_session` cookie. Never falls back to headers/query params.
 */
export async function getServerDeveloperUser(): Promise<DbUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ghostboard_session')?.value?.trim();
    if (!token) return null;

    const user = await getSessionUser(token);
    if (!hasDeveloperAccess(user) || !user) return null;

    hydrateDevOverridesFromCookies(
      user.id,
      cookieStore.get(DEV_PLAN_OVERRIDE_COOKIE)?.value,
      cookieStore.get(DEV_FORCED_MODEL_COOKIE)?.value
    );

    return user;
  } catch {
    return null;
  }
}
