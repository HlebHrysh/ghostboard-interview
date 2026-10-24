/**
 * Production environment guard (fail-fast).
 *
 * Rule of thumb: in `development` / `test` we may silently degrade to in-memory stores and
 * simulators; in `production` we must NEVER silently lose data or fake payments/emails.
 */

export class EnvConfigError extends Error {
  readonly code = 'ENV_CONFIG_ERROR';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'EnvConfigError';
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

export function isProduction(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production';
}

/** In-memory DB (users/sessions/history/payments) is allowed outside production or with ALLOW_MEMORY_DB=true. */
export function isMemoryDbAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isProduction(env) || env.ALLOW_MEMORY_DB === 'true';
}

/** Payment simulator & mocked emails are allowed outside production or with ENABLE_PROD_SIMULATOR=true. */
export function isProdSimulatorAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return !isProduction(env) || env.ENABLE_PROD_SIMULATOR === 'true';
}

export function isRedisConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

/** Throws if the in-memory DB would be used in production (missing DATABASE_URL). */
export function assertMemoryDbAllowed(context = 'database'): void {
  if (!isMemoryDbAllowed()) {
    throw new EnvConfigError(
      `[envGuard] In-memory ${context} fallback is disabled in production: DATABASE_URL is not set. ` +
        'Configure DATABASE_URL (PostgreSQL) or set ALLOW_MEMORY_DB=true to explicitly accept data loss.'
    );
  }
}

/**
 * Call from a Prisma `catch` block that would otherwise fall back to memory.
 * In production (without ALLOW_MEMORY_DB) it rethrows as a critical error so no user data is lost silently.
 * "Record not found" (P2025) is a normal outcome and is not treated as an outage.
 */
export function failDbInProduction(err: unknown): void {
  if (isMemoryDbAllowed()) return;
  if ((err as { code?: string } | null)?.code === 'P2025') return;
  const msg = err instanceof Error ? err.message : String(err);
  throw new EnvConfigError(
    `[envGuard] Database operation failed in production; refusing to fall back to in-memory storage: ${msg}`,
    { cause: err }
  );
}

export function assertSimulatorAllowed(feature: string): void {
  if (!isProdSimulatorAllowed()) {
    throw new EnvConfigError(
      `[envGuard] ${feature} is disabled in production. Configure the real provider ` +
        '(STRIPE_SECRET_KEY / RESEND_API_KEY) or set ENABLE_PROD_SIMULATOR=true to explicitly allow simulation.'
    );
  }
}

export interface EnvValidationResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

/** Validates infrastructure env for production. Only meaningful when NODE_ENV === 'production'. */
export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!isProduction(env)) return { ok: true, missing, warnings };

  if (!env.DATABASE_URL && env.ALLOW_MEMORY_DB !== 'true') missing.push('DATABASE_URL');
  if (!env.UPSTASH_REDIS_REST_URL) missing.push('UPSTASH_REDIS_REST_URL');
  if (!env.UPSTASH_REDIS_REST_TOKEN) missing.push('UPSTASH_REDIS_REST_TOKEN');

  if (env.ENABLE_PROD_SIMULATOR !== 'true') {
    if (!env.STRIPE_SECRET_KEY) warnings.push('STRIPE_SECRET_KEY is not set: checkout will return a configuration error');
    if (!env.RESEND_API_KEY) warnings.push('RESEND_API_KEY is not set: emails will return a configuration error');
  }
  for (const key of ['GEMINI_API_KEY', 'DEEPGRAM_API_KEY', 'STRIPE_WEBHOOK_SECRET', 'ADMIN_PASSWORD']) {
    if (!env[key]) warnings.push(`${key} is not set`);
  }
  return { ok: missing.length === 0, missing, warnings };
}

/** Throws EnvConfigError when required production infrastructure env is missing. */
export function assertProductionEnv(env: NodeJS.ProcessEnv = process.env): void {
  const { ok, missing, warnings } = validateProductionEnv(env);
  warnings.forEach((w) => console.warn(`[envGuard] ${w}`));
  if (!ok) {
    throw new EnvConfigError(`[envGuard] Missing required production environment variables: ${missing.join(', ')}`);
  }
}
