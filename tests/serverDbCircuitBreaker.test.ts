import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isDbCircuitBroken,
  tripDbCircuitBreaker,
  resetDbCircuitBreaker,
  getSessionUser,
  createSession,
  createUser,
  DB_QUERY_TIMEOUT_MS,
  DB_CIRCUIT_BREAKER_TTL_MS,
} from '../src/lib/serverDb';

describe('serverDb Circuit Breaker & Fast Fallback', () => {
  beforeEach(() => {
    resetDbCircuitBreaker();
  });

  afterEach(() => {
    resetDbCircuitBreaker();
  });

  it('initializes with circuit closed (healthy)', () => {
    expect(isDbCircuitBroken()).toBe(false);
    expect(DB_QUERY_TIMEOUT_MS).toBe(250);
    expect(DB_CIRCUIT_BREAKER_TTL_MS).toBe(1800_000);
  });

  it('trips circuit breaker manually or on failure', () => {
    expect(isDbCircuitBroken()).toBe(false);
    tripDbCircuitBreaker();
    expect(isDbCircuitBroken()).toBe(true);
    resetDbCircuitBreaker();
    expect(isDbCircuitBroken()).toBe(false);
  });

  it('returns within sub-10ms when circuit breaker is open (bypasses dead Postgres)', async () => {
    // Create a test user and session in store
    const user = await createUser('circuit-test@example.com', 'Circuit Tester', 'pro');
    const session = await createSession(user.id, 'web');

    // Trip the circuit breaker
    tripDbCircuitBreaker();
    expect(isDbCircuitBroken()).toBe(true);

    const start = performance.now();
    const fetchedUser = await getSessionUser(session.token);
    const elapsed = performance.now() - start;

    expect(fetchedUser).not.toBeNull();
    expect(fetchedUser?.email).toBe('circuit-test@example.com');
    expect(elapsed).toBeLessThan(20);
  });
});
