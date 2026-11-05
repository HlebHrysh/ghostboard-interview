import crypto from 'crypto';

export const MIN_SESSION_SECRET_LENGTH = 32;
const DEV_FALLBACK_SECRET = 'ghostboard-dev-insecure-session-secret-32-chars-minimum';

export interface SessionSecretValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates whether a SESSION_SECRET meets the high-entropy requirement (>= 32 characters).
 */
export function validateSessionSecret(
  secret: string | undefined = process.env.SESSION_SECRET
): SessionSecretValidationResult {
  if (!secret || typeof secret !== 'string') {
    return {
      valid: false,
      error: 'SESSION_SECRET environment variable is missing or empty',
    };
  }

  const trimmed = secret.trim();
  if (trimmed.length < MIN_SESSION_SECRET_LENGTH) {
    return {
      valid: false,
      error: `SESSION_SECRET is too short (${trimmed.length} chars). Minimum length is ${MIN_SESSION_SECRET_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

/**
 * Asserts that SESSION_SECRET is valid.
 * In production (NODE_ENV === 'production'), throws an error if missing or < 32 characters.
 * In development or test, issues a warning if using the fallback.
 */
export function assertSessionSecretValid(
  env: NodeJS.ProcessEnv = process.env
): void {
  const isProd = env.NODE_ENV === 'production';
  const validation = validateSessionSecret(env.SESSION_SECRET);

  if (!validation.valid) {
    if (isProd) {
      throw new Error(`[FATAL] Production SESSION_SECRET validation failed: ${validation.error}`);
    } else {
      console.warn(`[WARN] Development mode: ${validation.error}. Using fallback secret.`);
    }
  }
}

/**
 * Returns the active session secret.
 * In production, strictly requires a configured secret (>= 32 chars).
 * In dev/test, falls back to the constant default.
 */
export function getSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.SESSION_SECRET?.trim();
  if (secret && secret.length >= MIN_SESSION_SECRET_LENGTH) {
    return secret;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('[FATAL] Cannot retrieve SESSION_SECRET: not set or insecure in production');
  }

  return DEV_FALLBACK_SECRET;
}

/**
 * Cryptographically signs a session payload using HMAC-SHA256
 */
export function signSessionPayload(payload: string, secret?: string): string {
  const key = secret || getSessionSecret();
  return crypto.createHmac('sha256', key).update(payload).digest('hex');
}

/**
 * Verifies HMAC-SHA256 signature using timing-safe comparison
 */
export function verifySessionSignature(
  payload: string,
  signature: string,
  secret?: string
): boolean {
  try {
    const key = secret || getSessionSecret();
    const expected = crypto.createHmac('sha256', key).update(payload).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(signature, 'hex');
    return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
