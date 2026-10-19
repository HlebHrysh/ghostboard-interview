import { describe, it, expect } from 'vitest';
import {
  DualStreamClient,
  parseDualStreamDelimiters,
} from '../desktop/src/lib/streamClient';

describe('desktop/src/lib/streamClient.ts', () => {
  describe('parseDualStreamDelimiters', () => {
    it('cleanly parses complete 3-phase response', () => {
      const raw = `<<<PHASE_1:HOOK>>>
PostgreSQL implements MVCC via snapshot isolation.
<<<PHASE_2:PILLARS>>>
• Concurrency: Non-blocking readers and writers
• Indexing: B-Tree for fast lookups
• Vacuum: Autovacuum cleans dead tuples
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`sql
SELECT * FROM users;
\`\`\`
<<<END>>>`;

      const result = parseDualStreamDelimiters(raw);
      expect(result.hook).toBe('PostgreSQL implements MVCC via snapshot isolation.');
      expect(result.pillars).toHaveLength(3);
      expect(result.pillars[0]).toBe('Concurrency: Non-blocking readers and writers');
      expect(result.pillars[1]).toBe('Indexing: B-Tree for fast lookups');
      expect(result.pillars[2]).toBe('Vacuum: Autovacuum cleans dead tuples');
      expect(result.deepDive).toContain('```sql');
      expect(result.deepDive).toContain('SELECT * FROM users;');
    });

    it('strips partial delimiters during streaming without tag leakage into hook or pillars', () => {
      // Incomplete Phase 2 delimiter arriving at end of buffer
      const streamingChunk1 = `<<<PHASE_1:HOOK>>>
Distributed systems require strong partition tolerance.
<<<PHASE_2:PILL`;

      const res1 = parseDualStreamDelimiters(streamingChunk1);
      expect(res1.hook).toBe('Distributed systems require strong partition tolerance.');
      expect(res1.hook).not.toContain('<<<');
      expect(res1.pillars).toHaveLength(0);

      // Incomplete Phase 3 delimiter arriving at end of buffer
      const streamingChunk2 = `<<<PHASE_1:HOOK>>>
Distributed systems require strong partition tolerance.
<<<PHASE_2:PILLARS>>>
• Latency vs Throughput
• Consensus Protocols
<<<PHASE_3:DEEP_DI`;

      const res2 = parseDualStreamDelimiters(streamingChunk2);
      expect(res2.hook).toBe('Distributed systems require strong partition tolerance.');
      expect(res2.pillars).toHaveLength(2);
      expect(res2.pillars[0]).toBe('Latency vs Throughput');
      expect(res2.pillars[1]).toBe('Consensus Protocols');
      expect(res2.deepDive).toBe('');
    });

    it('provides fallback start hook if <<<PHASE_1:HOOK>>> is omitted by model', () => {
      const rawWithoutPhase1 = `Direct spoken answer without phase 1 tag.
<<<PHASE_2:PILLARS>>>
• Point A
• Point B
<<<PHASE_3:DEEP_DIVE>>>
Code snippet
<<<END>>>`;

      const res = parseDualStreamDelimiters(rawWithoutPhase1);
      expect(res.hook).toBe('Direct spoken answer without phase 1 tag.');
      expect(res.pillars).toHaveLength(2);
      expect(res.deepDive).toBe('Code snippet');
    });

    it('handles empty input gracefully', () => {
      const res = parseDualStreamDelimiters('');
      expect(res.hook).toBe('');
      expect(res.pillars).toEqual([]);
      expect(res.deepDive).toBe('');
    });
  });

  describe('DualStreamClient Heuristic Fallback & Modifiers', () => {
    it('generates high-speed answer with sub-second TTFT when offline', async () => {
      const client = new DualStreamClient();
      const tokens: string[] = [];
      const chunks: string[] = [];

      const result = await client.requestStream(
        { question: 'What is database sharding?' },
        {
          onToken: (tok) => tokens.push(tok),
          onChunk: (chk) => chunks.push(chk),
        }
      );

      expect(result.hook).toBeTruthy();
      expect(result.pillars.length).toBeGreaterThan(0);
      expect(result.ttftMs).toBeLessThan(900);
      expect(tokens.length).toBeGreaterThan(5);
      expect(chunks.length).toBeGreaterThan(5);
      expect(client.telemetry?.ttftMs).toBeLessThan(900);
    });

    it('handles "shorter" modifier with 3 concise numbered pillars', async () => {
      const client = new DualStreamClient();
      const result = await client.requestStream({
        question: 'Explain TCP vs UDP',
        directorModifier: 'shorter',
        outputLanguage: 'en',
      });

      expect(result.hook).toContain('Direct core answer');
      expect(result.pillars).toHaveLength(3);
      expect(result.pillars[0]).toMatch(/^1\./);
      expect(result.pillars[1]).toMatch(/^2\./);
      expect(result.pillars[2]).toMatch(/^3\./);
      expect(result.deepDive).toContain('Key takeaway');
    });

    it('handles "more_technical" modifier with kernel details (epoll_wait, kqueue)', async () => {
      const client = new DualStreamClient();
      const result = await client.requestStream({
        question: 'Explain event loop',
        directorModifier: 'more_technical',
        outputLanguage: 'en',
      });

      expect(result.deepDive).toContain('Kernel details');
      expect(result.deepDive).toContain('epoll_wait');
      expect(result.deepDive).toContain('kqueue');
    });

    it('handles "code_example" modifier returning markdown python code', async () => {
      const client = new DualStreamClient();
      const result = await client.requestStream({
        question: 'How to stream async in Python?',
        directorModifier: 'code_example',
        outputLanguage: 'en',
      });

      expect(result.deepDive).toContain('```python');
      expect(result.deepDive).toContain('async for chunk in reader:');
    });

    it('handles "tradeoffs" modifier with latency vs throughput analysis', async () => {
      const client = new DualStreamClient();
      const result = await client.requestStream({
        question: 'Microservices architecture',
        directorModifier: 'tradeoffs',
        outputLanguage: 'en',
      });

      expect(result.pillars.some((p) => p.includes('Latency vs Throughput'))).toBe(true);
      expect(result.deepDive).toContain('Production trade-offs');
    });

    it('handles case-insensitive delimiters and strips dangling brackets with ZERO leakage', () => {
      const rawMixed = `<<<phase_1:hook>>>
Modern event-driven architectures decouple producers from consumers.>>>
<<<Phase_2:Pillars>>>
• Decoupling: Event streams isolate services<<<
• Replayability: Commit logs allow point-in-time processing
• Backpressure: Consumers pull at their own pace
<<<phase_3:deep_dive>>>
\`\`\`typescript
const consumer = kafka.consumer({ groupId: 'order-group' });
\`\`\`
<<<end>>>`;

      const res = parseDualStreamDelimiters(rawMixed);
      expect(res.hook).toBe('Modern event-driven architectures decouple producers from consumers.');
      expect(res.hook).not.toContain('<<<');
      expect(res.hook).not.toContain('>>>');
      expect(res.pillars).toHaveLength(3);
      expect(res.pillars[0]).toBe('Decoupling: Event streams isolate services');
      expect(res.pillars[0]).not.toContain('<<<');
      expect(res.pillars[0]).not.toContain('>>>');
      expect(res.deepDive).toContain('const consumer = kafka.consumer');
      expect(res.deepDive).not.toContain('<<<');
      expect(res.deepDive).not.toContain('>>>');
    });

    it('supports setting/toggling backend URL and defaults to cloud under Tauri production', () => {
      // In web/dev environment
      const devClient = new DualStreamClient();
      expect(devClient.getBaseUrl()).toBe('');

      devClient.setBaseUrl('http://localhost:3001');
      expect(devClient.getBaseUrl()).toBe('http://localhost:3001');

      devClient.setBaseUrl('https://ghostboard.ai');
      expect(devClient.getBaseUrl()).toBe('https://ghostboard.ai');

      // Under simulated Tauri production
      (globalThis as any).window = { __TAURI_INTERNALS__: {} };
      const tauriClient = new DualStreamClient();
      expect(tauriClient.getBaseUrl()).toBe('https://ghostboard.ai');
      delete (globalThis as any).window;
    });

    it('attaches Authorization Bearer token header in requestStream fetch', async () => {
      const client = new DualStreamClient('http://localhost:3001');
      let capturedHeaders: any = null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_url: any, init: any) => {
        capturedHeaders = init?.headers;
        return {
          ok: false,
          status: 401,
        } as any;
      };

      try {
        await client.requestStream(
          {
            question: 'Explain OAuth 2.0 PKCE',
            authToken: 'gb_mock_token_123',
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }

      expect(capturedHeaders).toBeTruthy();
      expect(capturedHeaders['Authorization']).toBe('Bearer gb_mock_token_123');
      expect(capturedHeaders['x-ghostboard-client']).toBe('desktop-app');
    });

    it('supports aborting active stream', async () => {
      const client = new DualStreamClient();
      const streamPromise = client.requestStream(
        { question: 'Long running query' },
        { chunkDelayMs: 20 }
      );

      expect(client.isStreaming).toBe(true);
      client.abort();
      expect(client.aborted).toBe(true);

      await expect(streamPromise).rejects.toThrow(/aborted/);
      expect(client.isStreaming).toBe(false);
    });
  });
});
