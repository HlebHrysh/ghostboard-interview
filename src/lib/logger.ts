/**
 * Structured Logger for Ghostboard (Backend & Web).
 *
 * Requirements:
 * - Zero heavy native dependencies (isomorphic).
 * - Production: Single-line JSON compliant with Google Cloud Logging schema:
 *     { severity: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG', message, timestamp, context, error }
 * - Development: Human-friendly formatted output.
 * - Test: Silent by default (or governed by LOG_LEVEL) to prevent test runner pollution.
 * - Automatic redaction of sensitive metadata keys:
 *     password, token, secret, apiKey, authorization, cookie, credential.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type GcpSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface LogEntry {
  severity: GcpSeverity;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Record<string, unknown> | string;
}

const SENSITIVE_KEY_REGEX = /(?:password|token|secret|api[_-]?key|authorization|cookie|credential)/i;
const REDACTED = '[REDACTED]';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const GCP_SEVERITY_MAP: Record<LogLevel, GcpSeverity> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

/**
 * Safely deep-redacts sensitive keys in objects, maps, and arrays without cyclic reference crashes.
 */
export function redactSecrets<T>(data: T, seen = new WeakSet<object>()): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (seen.has(data as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item, seen)) as unknown as T;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
      ...(data as unknown as Record<string, unknown>),
    } as unknown as T;
  }

  const redactedObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      redactedObj[key] = REDACTED;
    } else if (typeof val === 'object' && val !== null) {
      redactedObj[key] = redactSecrets(val, seen);
    } else {
      redactedObj[key] = val;
    }
  }

  return redactedObj as T;
}

function serializeError(err: unknown): Record<string, unknown> | string {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...redactSecrets(err as unknown as Record<string, unknown>),
    };
  }
  if (typeof err === 'object' && err !== null) {
    return redactSecrets(err as Record<string, unknown>);
  }
  return String(err);
}

export class Logger {
  private baseContext: Record<string, unknown>;

  constructor(baseContext: Record<string, unknown> = {}) {
    this.baseContext = baseContext;
  }

  /**
   * Spawns a child logger inheriting base context metadata (e.g. component, service, requestId).
   */
  public child(extraContext: Record<string, unknown>): Logger {
    return new Logger({
      ...this.baseContext,
      ...extraContext,
    });
  }

  public debug(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('debug', message, context, error);
  }

  public info(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('info', message, context, error);
  }

  public warn(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('warn', message, context, error);
  }

  public error(message: string, context?: Record<string, unknown>, error?: unknown): void {
    this.log('error', message, context, error);
  }

  private isLevelActive(level: LogLevel): boolean {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;

    if (configuredLevel && LEVEL_WEIGHT[configuredLevel] !== undefined) {
      return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[configuredLevel];
    }

    // In tests without an explicit LOG_LEVEL, keep output silent to preserve clean reporter
    if (isTest) {
      return false;
    }

    const isProd = process.env.NODE_ENV === 'production';
    const defaultLevel: LogLevel = isProd ? 'info' : 'debug';
    return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[defaultLevel];
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): void {
    if (!this.isLevelActive(level)) {
      return;
    }

    const isProd = process.env.NODE_ENV === 'production';
    const timestamp = new Date().toISOString();
    const severity = GCP_SEVERITY_MAP[level];

    const mergedContext = {
      ...this.baseContext,
      ...(context || {}),
    };

    const hasContext = Object.keys(mergedContext).length > 0;
    const sanitizedContext = hasContext ? (redactSecrets(mergedContext) as Record<string, unknown>) : undefined;
    const sanitizedError = error !== undefined ? serializeError(error) : undefined;

    if (isProd) {
      const entry: LogEntry = {
        severity,
        message,
        timestamp,
        ...(sanitizedContext ? { context: sanitizedContext } : {}),
        ...(sanitizedError !== undefined ? { error: sanitizedError } : {}),
      };
      const jsonLine = JSON.stringify(entry);
      if (level === 'error') {
        console.error(jsonLine);
      } else if (level === 'warn') {
        console.warn(jsonLine);
      } else {
        console.log(jsonLine);
      }
    } else {
      const prefix = `[${timestamp}] [${severity}]`;
      const contextStr = sanitizedContext ? ` ${JSON.stringify(sanitizedContext)}` : '';
      const fullMsg = `${prefix} ${message}${contextStr}`;

      if (level === 'error') {
        if (sanitizedError !== undefined) {
          console.error(fullMsg, sanitizedError);
        } else {
          console.error(fullMsg);
        }
      } else if (level === 'warn') {
        if (sanitizedError !== undefined) {
          console.warn(fullMsg, sanitizedError);
        } else {
          console.warn(fullMsg);
        }
      } else {
        console.log(fullMsg);
      }
    }
  }
}

export const logger = new Logger();
