import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, redactSecrets } from '../src/lib/logger';

describe('Structured Logger (logger.ts)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('redactSecrets', () => {
    it('redacts sensitive keys including password, token, secret, apiKey, authorization, cookie', () => {
      const sensitive = {
        user: 'alice',
        password: 'super-secret-password',
        api_key: 'sk_live_12345678',
        jwtToken: 'eyJhbGciOi...',
        authToken: 'bearer xyz',
        clientSecret: 'secret_value',
        cookie: 'session_id=abc',
        nested: {
          secretKey: 'top-secret',
          safeValue: 42,
        },
        list: [
          { token: 'nested-token', ok: true },
          'regular-string',
        ],
      };

      const redacted = redactSecrets(sensitive);
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.api_key).toBe('[REDACTED]');
      expect(redacted.jwtToken).toBe('[REDACTED]');
      expect(redacted.authToken).toBe('[REDACTED]');
      expect(redacted.clientSecret).toBe('[REDACTED]');
      expect(redacted.cookie).toBe('[REDACTED]');
      expect(redacted.nested.secretKey).toBe('[REDACTED]');
      expect(redacted.nested.safeValue).toBe(42);
      const firstItem = redacted.list[0] as { token: string; ok: boolean };
      expect(firstItem.token).toBe('[REDACTED]');
      expect(firstItem.ok).toBe(true);
      expect(redacted.user).toBe('alice');
    });

    it('safely handles circular references without throwing', () => {
      const obj: Record<string, unknown> = { name: 'cyclic' };
      obj.self = obj;

      expect(() => redactSecrets(obj)).not.toThrow();
      const res = redactSecrets(obj);
      expect(res.name).toBe('cyclic');
      expect(res.self).toBe('[Circular]');
    });

    it('passes primitives, null, and undefined unchanged', () => {
      expect(redactSecrets(null)).toBe(null);
      expect(redactSecrets(undefined)).toBe(undefined);
      expect(redactSecrets('hello')).toBe('hello');
      expect(redactSecrets(123)).toBe(123);
      expect(redactSecrets(true)).toBe(true);
    });
  });

  describe('production Google Cloud Logging output', () => {
    it('outputs single-line JSON with GCP severity and timestamp', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'info';

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const testLogger = new Logger();

      testLogger.info('Candidate connected', { userId: 'usr_1', token: 'secret-token' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const jsonOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(jsonOutput.severity).toBe('INFO');
      expect(jsonOutput.message).toBe('Candidate connected');
      expect(jsonOutput.context.userId).toBe('usr_1');
      expect(jsonOutput.context.token).toBe('[REDACTED]');
      expect(new Date(jsonOutput.timestamp).getTime()).not.toBeNaN();

      testLogger.warn('High latency detected', { durationMs: 1400 });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const warnOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(warnOutput.severity).toBe('WARNING');
      expect(warnOutput.message).toBe('High latency detected');
      expect(warnOutput.context.durationMs).toBe(1400);

      const err = new Error('Database connection failed');
      testLogger.error('Fatal database error', { component: 'serverDb' }, err);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const errorOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(errorOutput.severity).toBe('ERROR');
      expect(errorOutput.message).toBe('Fatal database error');
      expect(errorOutput.context.component).toBe('serverDb');
      expect(errorOutput.error.message).toBe('Database connection failed');
    });
  });

  describe('child loggers and level filtering', () => {
    it('inherits context in child loggers', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'debug';

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const parent = new Logger({ service: 'copilot-api' });
      const child = parent.child({ component: 'gemini' });

      child.info('Model prompt dispatched', { model: 'gemini-2.5-flash' });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.service).toBe('copilot-api');
      expect(output.context.component).toBe('gemini');
      expect(output.context.model).toBe('gemini-2.5-flash');
    });

    it('suppresses logs lower than configured LOG_LEVEL', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'error';

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const l = new Logger();
      l.debug('ignore me');
      l.info('ignore me too');
      l.warn('ignore me as well');
      l.error('report me');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('stays silent in test environment when LOG_LEVEL is not set', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
      delete process.env.LOG_LEVEL;

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const l = new Logger();
      l.info('hello');
      l.error('boom');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
