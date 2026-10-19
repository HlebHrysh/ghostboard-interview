import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import http from 'http';
import {
  DualStreamClient,
  parseDualStreamDelimiters,
  StructuredAnswerOutput,
} from '../desktop/src/lib/streamClient';

describe('Challenger 1 (Milestone 3): Empirical SSE Streaming & Boundary Stress Tests', () => {
  // =========================================================================
  // 1. Boundary Condition: Chunks Split Exactly Across Delimiters
  // =========================================================================
  describe('1. Phase Delimiter Split & Fragmentation Stress Tests', () => {
    it('handles exact split: "<<<PHASE_" in chunk 1 and "2:PILLARS>>>" in chunk 2', () => {
      const hookText = 'PostgreSQL relies on MVCC for non-blocking read-write concurrency.';
      const chunk1 = `<<<PHASE_1:HOOK>>>\n${hookText}\n<<<PHASE_`;
      const chunk2 = `2:PILLARS>>>\n• Point 1: Tuple visibility via xmin/xmax\n• Point 2: Write-ahead logging (WAL)`;

      // Intermediate state: only chunk 1 received
      const intermediate = parseDualStreamDelimiters(chunk1);
      expect(intermediate.hook).toBe(hookText);
      expect(intermediate.hook).not.toContain('<<<');
      expect(intermediate.hook).not.toContain('PHASE');
      expect(intermediate.pillars).toEqual([]);
      expect(intermediate.deepDive).toBe('');

      // Final state: chunk 1 + chunk 2 accumulated
      const fullText = chunk1 + chunk2;
      const finalResult = parseDualStreamDelimiters(fullText);
      expect(finalResult.hook).toBe(hookText);
      expect(finalResult.pillars).toHaveLength(2);
      expect(finalResult.pillars[0]).toBe('Point 1: Tuple visibility via xmin/xmax');
      expect(finalResult.pillars[1]).toBe('Point 2: Write-ahead logging (WAL)');
      expect(finalResult.deepDive).toBe('');
    });

    it('handles exact split: "<<<PHASE_3:DEEP_" in chunk 1 and "DIVE>>>" in chunk 2', () => {
      const chunk1 = `<<<PHASE_1:HOOK>>>\nDistributed consensus ensures strong consistency.\n<<<PHASE_2:PILLARS>>>\n• Raft election\n• Log replication\n<<<PHASE_3:DEEP_`;
      const chunk2 = `DIVE>>>\n\`\`\`rust\nfn elect_leader() {}\n\`\`\`\n<<<END>>>`;

      // Intermediate state: Phase 3 delimiter partially cut off
      const intermediate = parseDualStreamDelimiters(chunk1);
      expect(intermediate.hook).toBe('Distributed consensus ensures strong consistency.');
      expect(intermediate.pillars).toHaveLength(2);
      expect(intermediate.pillars[0]).toBe('Raft election');
      expect(intermediate.pillars[1]).toBe('Log replication');
      expect(intermediate.deepDive).toBe('');

      // Final state
      const finalResult = parseDualStreamDelimiters(chunk1 + chunk2);
      expect(finalResult.pillars).toHaveLength(2);
      expect(finalResult.deepDive).toContain('fn elect_leader()');
      expect(finalResult.deepDive).not.toContain('<<<END>>>');
    });

    it('resilient against extreme character-by-character token streaming across delimiter', () => {
      const prefix = `<<<PHASE_1:HOOK>>>\nAtomic operations bypass mutex overhead.\n`;
      const delimiterToFragment = `<<<PHASE_2:PILLARS>>>`;
      const suffix = `\n• Memory barriers\n• Compare-and-swap`;

      let streamAccumulator = prefix;

      // Simulate character-by-character arrival of the Phase 2 delimiter
      for (let i = 0; i < delimiterToFragment.length; i++) {
        streamAccumulator += delimiterToFragment[i];
        const parsed = parseDualStreamDelimiters(streamAccumulator);

        // Invariant: Hook must NEVER leak any part of the approaching delimiter
        expect(parsed.hook).toBe('Atomic operations bypass mutex overhead.');
        expect(parsed.hook).not.toContain('<');
        expect(parsed.hook).not.toContain('PHASE');

        if (i < delimiterToFragment.length - 1) {
          // While delimiter is incomplete, pillars must remain empty
          expect(parsed.pillars).toEqual([]);
        }
      }

      // Now add suffix
      streamAccumulator += suffix;
      const finalResult = parseDualStreamDelimiters(streamAccumulator);
      expect(finalResult.pillars).toHaveLength(2);
      expect(finalResult.pillars[0]).toBe('Memory barriers');
      expect(finalResult.pillars[1]).toBe('Compare-and-swap');
    });

    it('handles 3-way split: "<<<" + "PHASE_2:" + "PILLARS>>>"', () => {
      const part1 = `<<<PHASE_1:HOOK>>>\nFast memory layout.\n<<<`;
      const parsed1 = parseDualStreamDelimiters(part1);
      expect(parsed1.hook).toBe('Fast memory layout.');
      expect(parsed1.pillars).toEqual([]);

      const part2 = part1 + 'PHASE_2:';
      const parsed2 = parseDualStreamDelimiters(part2);
      expect(parsed2.hook).toBe('Fast memory layout.');
      expect(parsed2.pillars).toEqual([]);

      const part3 = part2 + 'PILLARS>>>\n• L1 Cache hits';
      const parsed3 = parseDualStreamDelimiters(part3);
      expect(parsed3.hook).toBe('Fast memory layout.');
      expect(parsed3.pillars).toEqual(['L1 Cache hits']);
    });
  });

  // =========================================================================
  // 2. Boundary Condition: Missing Phase 1 Hook Tag
  // =========================================================================
  describe('2. Missing Phase 1 Hook Tag Robustness', () => {
    it('recovers hook content when LLM completely omits <<<PHASE_1:HOOK>>>', () => {
      const rawText = `Direct spoken opening statement without any phase tag.
<<<PHASE_2:PILLARS>>>
• Architecture component 1
• Architecture component 2
<<<PHASE_3:DEEP_DIVE>>>
Detailed internals
<<<END>>>`;

      const parsed = parseDualStreamDelimiters(rawText);
      expect(parsed.hook).toBe('Direct spoken opening statement without any phase tag.');
      expect(parsed.pillars).toHaveLength(2);
      expect(parsed.pillars[0]).toBe('Architecture component 1');
      expect(parsed.pillars[1]).toBe('Architecture component 2');
      expect(parsed.deepDive).toBe('Detailed internals');
    });

    it('recovers hook content when LLM omits Phase 1 tag AND streaming splits at Phase 2', () => {
      const chunk1 = `Direct spoken opening statement.\n<<<PHASE_`;
      const intermediate = parseDualStreamDelimiters(chunk1);
      expect(intermediate.hook).toBe('Direct spoken opening statement.');
      expect(intermediate.pillars).toEqual([]);

      const fullText = chunk1 + `2:PILLARS>>>\n• Point 1`;
      const finalResult = parseDualStreamDelimiters(fullText);
      expect(finalResult.hook).toBe('Direct spoken opening statement.');
      expect(finalResult.pillars).toEqual(['Point 1']);
    });

    it('handles LLM starting immediately with <<<PHASE_2:PILLARS>>> (zero hook)', () => {
      const rawText = `<<<PHASE_2:PILLARS>>>
• Point 1: Direct pillar
• Point 2: Second pillar
<<<PHASE_3:DEEP_DIVE>>>
Code here`;

      const parsed = parseDualStreamDelimiters(rawText);
      expect(parsed.hook).toBe('');
      expect(parsed.pillars).toHaveLength(2);
      expect(parsed.pillars[0]).toBe('Point 1: Direct pillar');
      expect(parsed.deepDive).toBe('Code here');
    });

    it('handles LLM returning completely unformatted plain text (no tags at all)', () => {
      const rawText = `This is a pure plain text answer without any phase tags or delimiters at all.`;
      const parsed = parseDualStreamDelimiters(rawText);
      expect(parsed.hook).toBe(rawText);
      expect(parsed.pillars).toEqual([]);
      expect(parsed.deepDive).toBe('');
    });
  });

  // =========================================================================
  // 3. Boundary Condition: Trailing <<<END>>> and [DONE]
  // =========================================================================
  describe('3. Trailing Delimiters and Sentinels (<<<END>>>, [DONE])', () => {
    it('strips <<<END>>> from Phase 3 Deep Dive', () => {
      const raw = `<<<PHASE_1:HOOK>>>\nHook text\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n<<<PHASE_3:DEEP_DIVE>>>\n\`\`\`ts\nconsole.log(42);\n\`\`\`\n<<<END>>>`;
      const parsed = parseDualStreamDelimiters(raw);
      expect(parsed.deepDive).not.toContain('<<<END>>>');
      expect(parsed.deepDive).toBe('```ts\nconsole.log(42);\n```');
    });

    it('strips [DONE] from Phase 3 Deep Dive', () => {
      const raw = `<<<PHASE_1:HOOK>>>\nHook text\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n<<<PHASE_3:DEEP_DIVE>>>\nSystem trade-offs analysis\n[DONE]`;
      const parsed = parseDualStreamDelimiters(raw);
      expect(parsed.deepDive).not.toContain('[DONE]');
      expect(parsed.deepDive).toBe('System trade-offs analysis');
    });

    it('checks behavior when [DONE] is trailing at the end of Phase 1 hook', () => {
      const raw = `<<<PHASE_1:HOOK>>>\nDirect spoken hook.\n[DONE]`;
      const parsed = parseDualStreamDelimiters(raw);
      // Observe whether [DONE] leaks into hook
      expect(parsed.hook).toBe('Direct spoken hook.');
    });

    it('checks behavior when [DONE] is trailing at the end of Phase 2 pillars', () => {
      const raw = `<<<PHASE_1:HOOK>>>\nHook text\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n• Pillar 2\n[DONE]`;
      const parsed = parseDualStreamDelimiters(raw);
      // Observe whether [DONE] leaks as a pillar
      expect(parsed.pillars).toEqual(['Pillar 1', 'Pillar 2']);
    });

    it('strips partial trailing end marker <<<EN before it finishes', () => {
      const raw = `<<<PHASE_1:HOOK>>>\nHook text\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n<<<PHASE_3:DEEP_DIVE>>>\nDeep dive content\n<<<EN`;
      const parsed = parseDualStreamDelimiters(raw);
      expect(parsed.deepDive).toBe('Deep dive content');
      expect(parsed.deepDive).not.toContain('<<<');
    });

    it('handles stream without Phase 3 ending with <<<END>>>', () => {
      const raw = `<<<PHASE_1:HOOK>>>\nHook text\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n• Pillar 2\n<<<END>>>`;
      const parsed = parseDualStreamDelimiters(raw);
      expect(parsed.pillars).toHaveLength(2);
      expect(parsed.pillars[1]).toBe('Pillar 2');
      expect(parsed.deepDive).toBe('');
    });
  });

  // =========================================================================
  // 4. Live HTTP SSE Server Integration: Real Network Stress Tests
  // =========================================================================
  describe('4. Live SSE Stream Network Stress Tests (Real HTTP Server)', () => {
    let server: http.Server;
    let serverUrl: string;
    let serverPort: number;

    type RequestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => void;
    let activeHandler: RequestHandler | null = null;

    beforeAll(async () => {
      server = http.createServer((req, res) => {
        if (activeHandler) {
          activeHandler(req, res);
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (typeof addr === 'object' && addr !== null) {
            serverPort = addr.port;
            serverUrl = `http://127.0.0.1:${serverPort}`;
          }
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    });

    it('streams real SSE with delimiter split across separate TCP write packets', async () => {
      activeHandler = (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        // Frame 1: Telemetry
        res.write(`event: telemetry\ndata: {"type":"TTFT","ttftMs":280,"model":"gemini-3.8-flash"}\n\n`);

        // Frame 2: Hook with partial Phase 2 delimiter
        res.write(`event: chunk\ndata: {"text":"<<<PHASE_1:HOOK>>>\\nHigh concurrency engine.\\n<<<PHASE_"}\n\n`);

        setTimeout(() => {
          // Frame 3: Completion of Phase 2 delimiter and pillars
          res.write(`event: chunk\ndata: {"text":"2:PILLARS>>>\\n• Lock-free queues\\n• Zero-copy ring buffer"}\n\n`);

          setTimeout(() => {
            // Frame 4: Phase 3 and completion
            res.write(`event: chunk\ndata: {"text":"\\n<<<PHASE_3:DEEP_DIVE>>>\\nInternals\\n<<<END>>>"}\n\n`);
            res.write(`event: complete\ndata: {"model":"gemini-3.8-flash"}\n\n`);
            res.end();
          }, 15);
        }, 15);
      };

      const client = new DualStreamClient(serverUrl);
      const intermediateStates: StructuredAnswerOutput[] = [];

      const result = await client.requestStream(
        { question: 'High concurrency queue architecture' },
        {
          onPhaseUpdate: (state) => intermediateStates.push({ ...state }),
        }
      );

      // Verify intermediate phase update after Frame 2:
      // Must NOT leak `<<<PHASE_` into hook
      const midState = intermediateStates.find(
        (s) => s.rawText.includes('<<<PHASE_') && !s.rawText.includes('2:PILLARS>>>')
      );
      if (midState) {
        expect(midState.hook).toBe('High concurrency engine.');
        expect(midState.hook).not.toContain('<<<');
        expect(midState.pillars).toEqual([]);
      }

      // Final result verification
      expect(result.hook).toBe('High concurrency engine.');
      expect(result.pillars).toHaveLength(2);
      expect(result.pillars[0]).toBe('Lock-free queues');
      expect(result.pillars[1]).toBe('Zero-copy ring buffer');
      expect(result.deepDive).toBe('Internals');
      expect(result.ttftMs).toBe(280);
      expect(client.activeModel).toBe('gemini-3.8-flash');
      expect(client.isStreaming).toBe(false);
    });

    it('handles SSE line split across network chunks (e.g., partial line buffering)', async () => {
      activeHandler = (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        // Split "event: chunk\ndata: {"text":"Hello"}\n\n" right across network chunks
        res.write(`event: ch`);
        setTimeout(() => {
          res.write(`unk\ndata: {"text":"<<<PHASE_1:HOOK>>>\\nBuffered`);
          setTimeout(() => {
            res.write(` token stream."}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
          }, 10);
        }, 10);
      };

      const client = new DualStreamClient(serverUrl);
      const result = await client.requestStream({ question: 'Test line buffering' });

      expect(result.hook).toBe('Buffered token stream.');
      expect(client.isStreaming).toBe(false);
    });

    it('aborts active fetch when timeoutMs expires via AbortController', async () => {
      activeHandler = (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        // Deliberately stall response without sending data or closing
        res.write(`: keepalive\n\n`);
      };

      const client = new DualStreamClient(serverUrl);
      const streamPromise = client.requestStream(
        { question: 'Hanging query' },
        { timeoutMs: 40 }
      );

      await expect(streamPromise).rejects.toThrow(/aborted/i);
      expect(client.isStreaming).toBe(false);
    });

    it('supports immediate manual cancellation via client.abort() during active network stream', async () => {
      activeHandler = (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write(`event: chunk\ndata: {"text":"<<<PHASE_1:HOOK>>>\\nInitial start"}\n\n`);
      };

      const client = new DualStreamClient(serverUrl);
      const streamPromise = client.requestStream({ question: 'Test manual abort' });

      // Allow request to start
      await new Promise((r) => setTimeout(r, 10));
      expect(client.isStreaming).toBe(true);

      client.abort();
      expect(client.aborted).toBe(true);
      expect(client.isStreaming).toBe(false);

      await expect(streamPromise).rejects.toThrow(/aborted/i);
    });

    it('falls back to heuristic engine when server returns HTTP 500 error', async () => {
      activeHandler = (req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      };

      const client = new DualStreamClient(serverUrl);
      const result = await client.requestStream({
        question: 'Explain PostgreSQL MVCC',
      });

      // Heuristic fallback should trigger cleanly
      expect(result.hook).toBeTruthy();
      expect(result.pillars.length).toBeGreaterThan(0);
      expect(result.ttftMs).toBeLessThan(900);
      expect(client.isStreaming).toBe(false);
    });

    it('falls back to heuristic engine when server is completely unreachable (dead port)', async () => {
      // Connect to unused port
      const client = new DualStreamClient('http://127.0.0.1:59987');
      const tokens: string[] = [];

      const result = await client.requestStream(
        { question: 'What is database replication?' },
        { onToken: (t) => tokens.push(t) }
      );

      expect(result.hook).toBeTruthy();
      expect(result.pillars.length).toBeGreaterThan(0);
      expect(result.deepDive).toBeTruthy();
      expect(tokens.length).toBeGreaterThan(5);
      expect(result.ttftMs).toBeLessThan(900);
      expect(client.isStreaming).toBe(false);
    });
  });

  // =========================================================================
  // 5. Heuristic Fallback & Modifier Stress Tests
  // =========================================================================
  describe('5. Heuristic Engine Modifiers & Cyrillic Normalization', () => {
    it('generates Ukrainian responses when Cyrillic question is provided in fallback', async () => {
      const client = new DualStreamClient('http://127.0.0.1:59988');
      const result = await client.requestStream({
        question: 'Як працює багатоверсійність у базах даних?',
        directorModifier: 'normal',
      });

      expect(result.hook).toMatch(/[а-яіїєґ]/i);
      expect(result.pillars.length).toBeGreaterThan(0);
    });

    it('pre-normalizes Cyrillic slang before executing request', async () => {
      const client = new DualStreamClient('http://127.0.0.1:59988');
      // "дандер методи", "постгрес", "асінк"
      const result = await client.requestStream({
        question: 'Поясни дандер методи, постгрес та асінк',
        directorModifier: 'tradeoffs',
      });

      expect(result.hook).toBeTruthy();
      expect(result.pillars.some((p) => p.includes('Latency') || p.includes('Throughput') || p.includes('затримк'))).toBe(true);
    });

    it('handles rapid sequential requests on the same client instance without race conditions', async () => {
      const client = new DualStreamClient('http://127.0.0.1:59988');

      // Fire 3 sequential requests
      const res1 = await client.requestStream({ question: 'First question' });
      expect(res1.hook).toBeTruthy();
      expect(client.isStreaming).toBe(false);

      const res2 = await client.requestStream({ question: 'Second question', directorModifier: 'shorter' });
      expect(res2.hook).toBeTruthy();
      expect(res2.pillars).toHaveLength(3);
      expect(client.isStreaming).toBe(false);

      const res3 = await client.requestStream({ question: 'Third question', directorModifier: 'code_example' });
      expect(res3.deepDive).toContain('```python');
      expect(client.isStreaming).toBe(false);
    });
  });

  // =========================================================================
  // 6. Extreme Character-by-Character Streaming Across All Delimiters & Sentinels
  // =========================================================================
  describe('6. Extreme Character-by-Character Streaming Across All Delimiters & Sentinels', () => {
    it('resilient against character-by-character streaming across <<<PHASE_3:DEEP_DIVE>>> without leaking into pillars', () => {
      const prefix = `<<<PHASE_1:HOOK>>>\nEvent loop multiplexing.\n<<<PHASE_2:PILLARS>>>\n• Non-blocking poll\n• Callback queue`;
      const delimiter = `\n<<<PHASE_3:DEEP_DIVE>>>`;
      const suffix = `\n\`\`\`rust\nasync fn poll() {}\n\`\`\``;

      let accumulator = prefix;

      for (let i = 0; i < delimiter.length; i++) {
        accumulator += delimiter[i];
        const parsed = parseDualStreamDelimiters(accumulator);

        expect(parsed.hook).toBe('Event loop multiplexing.');
        expect(parsed.pillars).toHaveLength(2);
        expect(parsed.pillars[0]).toBe('Non-blocking poll');
        expect(parsed.pillars[1]).toBe('Callback queue');
        expect(parsed.pillars[1]).not.toContain('<');
        expect(parsed.pillars[1]).not.toContain('PHASE');

        if (i < delimiter.length - 1) {
          expect(parsed.deepDive).toBe('');
        }
      }

      accumulator += suffix;
      const finalResult = parseDualStreamDelimiters(accumulator);
      expect(finalResult.deepDive).toContain('async fn poll()');
    });

    it('resilient against character-by-character streaming of <<<END>>> across Deep Dive', () => {
      const prefix = `<<<PHASE_1:HOOK>>>\nHook text\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n<<<PHASE_3:DEEP_DIVE>>>\n\`\`\`ts\nconst x = 42;\n\`\`\``;
      const delimiter = `\n<<<END>>>`;

      let accumulator = prefix;

      for (let i = 0; i < delimiter.length; i++) {
        accumulator += delimiter[i];
        const parsed = parseDualStreamDelimiters(accumulator);

        expect(parsed.deepDive).toBe('```ts\nconst x = 42;\n```');
        expect(parsed.deepDive).not.toContain('<<<');
        expect(parsed.deepDive).not.toContain('END');
      }

      const finalParsed = parseDualStreamDelimiters(accumulator);
      expect(finalParsed.deepDive).toBe('```ts\nconst x = 42;\n```');
    });

    it('resilient against character-by-character streaming of [DONE] across Hook, Pillars, and Deep Dive', () => {
      // 1. Hook + [DONE]
      const hookPrefix = `<<<PHASE_1:HOOK>>>\nImmediate spoken answer.`;
      const doneSentinel = `\n[DONE]`;
      let hookAcc = hookPrefix;

      for (let i = 0; i < doneSentinel.length; i++) {
        hookAcc += doneSentinel[i];
        const parsed = parseDualStreamDelimiters(hookAcc);
        expect(parsed.hook).toBe('Immediate spoken answer.');
        expect(parsed.hook).not.toContain('[');
        expect(parsed.hook).not.toContain('DONE');
      }

      // 2. Pillars + [DONE]
      const pillarsPrefix = `<<<PHASE_1:HOOK>>>\nHook\n<<<PHASE_2:PILLARS>>>\n• Core pillar 1\n• Core pillar 2`;
      let pillarsAcc = pillarsPrefix;

      for (let i = 0; i < doneSentinel.length; i++) {
        pillarsAcc += doneSentinel[i];
        const parsed = parseDualStreamDelimiters(pillarsAcc);
        expect(parsed.pillars).toEqual(['Core pillar 1', 'Core pillar 2']);
        for (const p of parsed.pillars) {
          expect(p).not.toContain('[');
          expect(p).not.toContain('DONE');
        }
      }

      // 3. Deep Dive + [DONE]
      const deepDivePrefix = `<<<PHASE_1:HOOK>>>\nHook\n<<<PHASE_2:PILLARS>>>\n• Pillar 1\n<<<PHASE_3:DEEP_DIVE>>>\nconst kernel = true;`;
      let deepAcc = deepDivePrefix;

      for (let i = 0; i < doneSentinel.length; i++) {
        deepAcc += doneSentinel[i];
        const parsed = parseDualStreamDelimiters(deepAcc);
        expect(parsed.deepDive).toBe('const kernel = true;');
        expect(parsed.deepDive).not.toContain('[');
        expect(parsed.deepDive).not.toContain('DONE');
      }
    });
  });

  // =========================================================================
  // 7. Non-Corruption of Math Comparisons, Generics, Bitshifts, and HTML Tags
  // =========================================================================
  describe('7. Non-Corruption of Math Comparisons, Generics, Bitshifts, and HTML Tags', () => {
    it('preserves math comparisons (< 1000), generics (<int>), bitshifts (<< 2), and HTML tags (<div>) across all phases', () => {
      const raw = `<<<PHASE_1:HOOK>>>
PostgreSQL handles queries where latency < 1000ms using bitshift flags << 2.
<<<PHASE_2:PILLARS>>>
• Math comparison: ensure latency < 1000ms and active_threads <= 64
• Generic typing: std::vector<int> and HashMap<string, list<int>>
• Bitwise operations: mask = 1 << 2 and status = flags << 4
• DOM components: render within <div><span>HUD Content</span></div> container
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`cpp
#include <vector>
#include <iostream>

template <typename T>
class StreamBuffer {
    int capacity = 1 << 10;
    bool is_fast(int t) { return t < 1000 && t > 0; }
    void render() {
        std::vector<int> vec = {1, 2, 3};
        std::cout << "<div>" << capacity << "</div>\\n";
    }
};
\`\`\`
<<<END>>>`;

      const parsed = parseDualStreamDelimiters(raw);

      // Verify Hook
      expect(parsed.hook).toBe('PostgreSQL handles queries where latency < 1000ms using bitshift flags << 2.');
      expect(parsed.hook).toContain('< 1000ms');
      expect(parsed.hook).toContain('<< 2');

      // Verify Pillars
      expect(parsed.pillars).toHaveLength(4);
      expect(parsed.pillars[0]).toBe('Math comparison: ensure latency < 1000ms and active_threads <= 64');
      expect(parsed.pillars[0]).toContain('< 1000ms');

      expect(parsed.pillars[1]).toBe('Generic typing: std::vector<int> and HashMap<string, list<int>>');
      expect(parsed.pillars[1]).toContain('vector<int>');
      expect(parsed.pillars[1]).toContain('list<int>');

      expect(parsed.pillars[2]).toBe('Bitwise operations: mask = 1 << 2 and status = flags << 4');
      expect(parsed.pillars[2]).toContain('1 << 2');
      expect(parsed.pillars[2]).toContain('flags << 4');

      expect(parsed.pillars[3]).toBe('DOM components: render within <div><span>HUD Content</span></div> container');
      expect(parsed.pillars[3]).toContain('<div><span>HUD Content</span></div>');

      // Verify Deep Dive
      expect(parsed.deepDive).toContain('template <typename T>');
      expect(parsed.deepDive).toContain('1 << 10');
      expect(parsed.deepDive).toContain('t < 1000 && t > 0');
      expect(parsed.deepDive).toContain('std::vector<int>');
      expect(parsed.deepDive).toContain('<div>');
      expect(parsed.deepDive).toContain('</div>');
      expect(parsed.deepDive).not.toContain('<<<END>>>');
    });

    it('preserves code constructs when delimiter fragments arrive directly following math and bitshifts', () => {
      // Hook ends with math expression before delimiter arrives
      const chunk1 = `<<<PHASE_1:HOOK>>>\nBenchmark threshold is < 1000\n<<<`;
      const parsed1 = parseDualStreamDelimiters(chunk1);
      expect(parsed1.hook).toBe('Benchmark threshold is < 1000');
      expect(parsed1.hook).toContain('< 1000');

      // Hook ends with bitshift before delimiter arrives
      const chunk2 = `<<<PHASE_1:HOOK>>>\nShift factor is 1 << 2\n<<<PHASE_2:PILL`;
      const parsed2 = parseDualStreamDelimiters(chunk2);
      expect(parsed2.hook).toBe('Shift factor is 1 << 2');
      expect(parsed2.hook).toContain('<< 2');

      // Deep dive with brackets before [DONE] arrives
      const chunk3 = `<<<PHASE_1:HOOK>>>\nHook\n<<<PHASE_2:PILLARS>>>\n• Pillar\n<<<PHASE_3:DEEP_DIVE>>>\nconst item = array[0];\n[DO`;
      const parsed3 = parseDualStreamDelimiters(chunk3);
      expect(parsed3.deepDive).toBe('const item = array[0];');
      expect(parsed3.deepDive).toContain('array[0]');
    });

    it('fine-grained character streaming across complex payload with math, generics, and tags', () => {
      const fullText = `<<<PHASE_1:HOOK>>>
Threshold < 1000 with bitshift << 2.
<<<PHASE_2:PILLARS>>>
• Vector: std::vector<int>
• DOM: <div>teleprompter</div>
<<<PHASE_3:DEEP_DIVE>>>
if (x < 1000) { val = x << 2; }
<<<END>>>`;

      let acc = '';
      for (let i = 0; i < fullText.length; i++) {
        acc += fullText[i];
        const res = parseDualStreamDelimiters(acc);

        // Verification invariants:
        // 1. Hook must never leak raw delimiters
        expect(res.hook).not.toMatch(/<{3,}PHASE/);
        expect(res.hook).not.toMatch(/\[DONE\]/);
        // 2. Pillars must never leak raw delimiters or sentinels
        for (const p of res.pillars) {
          expect(p).not.toMatch(/<{3,}PHASE/);
          expect(p).not.toMatch(/\[DONE\]/);
          expect(p).not.toMatch(/<{3,}END/);
        }
        // 3. Deep dive must never leak END or DONE
        expect(res.deepDive).not.toMatch(/\[DONE\]/);
        expect(res.deepDive).not.toMatch(/<{3,}END/);
      }

      const finalRes = parseDualStreamDelimiters(acc);
      expect(finalRes.hook).toBe('Threshold < 1000 with bitshift << 2.');
      expect(finalRes.pillars).toEqual([
        'Vector: std::vector<int>',
        'DOM: <div>teleprompter</div>',
      ]);
      expect(finalRes.deepDive).toBe('if (x < 1000) { val = x << 2; }');
    });
  });
});

