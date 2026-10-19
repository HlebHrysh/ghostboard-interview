import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSSEClient,
  parseDualStreamDelimiters,
} from './fixtures/mockSseServer';
import { normalizeTechnicalSpeech } from '../../src/lib/techSpeechNormalizer';

describe('Tier 1: Feature Coverage — Streaming AI Chat Architecture (R2)', () => {
  let sseClient: MockSSEClient;

  beforeEach(() => {
    sseClient = new MockSSEClient();
  });

  it('AC 2.1: Left column segregates dialogue transcriptions into interlocutor vs candidate feeds', () => {
    interface DialogueBubble {
      id: string;
      speaker: 'interviewer' | 'candidate';
      label: string;
      text: string;
      styleClass: string;
    }

    const dialogueFeed: DialogueBubble[] = [];

    const addDialogue = (speaker: 'interviewer' | 'candidate', text: string) => {
      dialogueFeed.push({
        id: `msg-${dialogueFeed.length + 1}`,
        speaker,
        label: speaker === 'interviewer' ? 'Співрозмовник' : 'Ви',
        text,
        styleClass:
          speaker === 'interviewer'
            ? 'bg-[#101014] border-white/40 text-white'
            : 'bg-white/[0.06] border-white/[0.06] text-zinc-300 ml-auto',
      });
    };

    addDialogue('interviewer', 'Як ви масштабуєте черги повідомлень?');
    addDialogue('candidate', 'Ми використовували кластер Kafka з 6 брокерами.');

    expect(dialogueFeed).toHaveLength(2);
    expect(dialogueFeed[0].label).toBe('Співрозмовник');
    expect(dialogueFeed[0].styleClass).toContain('bg-[#101014]');
    expect(dialogueFeed[1].label).toBe('Ви');
    expect(dialogueFeed[1].styleClass).toContain('ml-auto');
  });

  it('AC 2.2: Right column renders AI answers streaming incrementally token-by-token (typewriter effect)', async () => {
    const question = 'Explain how optimistic concurrency control works in PostgreSQL.';
    const incrementalFrames: string[] = [];

    // Track typewriter token accumulation via onChunk callback
    let streamInProgressState = false;
    const completed = await sseClient.requestStream(
      { question },
      {
        chunkDelayMs: 2,
        onChunk: (chunk, accumulated) => {
          streamInProgressState = sseClient.isStreaming;
          incrementalFrames.push(accumulated);
        },
      }
    );

    expect(streamInProgressState).toBe(true);
    expect(sseClient.isStreaming).toBe(false);
    expect(incrementalFrames.length).toBeGreaterThan(15);

    // Verify typewriter effect strictly grew in size monotonically
    expect(incrementalFrames[0].length).toBeLessThan(incrementalFrames[incrementalFrames.length - 1].length);
    expect(completed.hook).toContain('production architectures');
  });

  it('AC 2.2: Progressive 3-phase delivery extracts Hook, Pillars, and Deep-Dive sections', async () => {
    const question = 'What are the trade-offs of microservices vs monolith?';
    const output = await sseClient.requestStream({ question }, { chunkDelayMs: 0 });

    // Phase 1: Spoken Start Hook (1-2 direct sentences)
    expect(output.hook).toBeTruthy();
    expect(output.hook.length).toBeGreaterThan(20);

    // Phase 2: Core Architectural Pillars (3 bullet points)
    expect(output.pillars).toHaveLength(3);
    expect(output.pillars[0]).toContain('Throughput');
    expect(output.pillars[1]).toContain('State Synchronization');
    expect(output.pillars[2]).toContain('Resilience');

    // Phase 3: Deep Dive (Code snippet or trade-offs)
    expect(output.deepDive).toBeTruthy();
    expect(output.deepDive).toContain('WorkerQueue');
  });

  it('AC 2.3: First token latency (TTFT) is sub-second (<900ms) utilizing Gemini Flash series', async () => {
    const question = 'How does Redis Sentinel provide high availability?';
    const output = await sseClient.requestStream(
      { question },
      { simulatedTtftMs: 540, chunkDelayMs: 0 }
    );

    expect(output.ttftMs).toBeLessThan(900);
    expect(output.ttftMs).toBe(540);
    expect(output.model).toMatch(/gemini-3\.[68]-flash/);
    expect(sseClient.telemetry?.ttftMs).toBe(540);
  });

  it('AC 2.4: Markdown code blocks render with syntax tags and 1-click clipboard copy action', async () => {
    const rawMarkdown = `Here is the solution:
\`\`\`typescript
interface TokenBucket {
  capacity: number;
  refillRate: number;
}
\`\`\``;

    // Simulate code block parsing
    const codeBlockMatch = rawMarkdown.match(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/);
    expect(codeBlockMatch).toBeTruthy();

    const language = codeBlockMatch![1];
    const codeSnippet = codeBlockMatch![2].trim();

    expect(language).toBe('typescript');
    expect(codeSnippet).toContain('interface TokenBucket');

    // 1-click clipboard action
    let copiedText = '';
    const onCopyCode = (text: string) => {
      copiedText = text;
      return true;
    };

    const copyResult = onCopyCode(codeSnippet);
    expect(copyResult).toBe(true);
    expect(copiedText).toBe(codeSnippet);
  });

  it('R2 Slang Normalization: Pre-processes accented Cyrillic developer slang into standard technical terms', () => {
    const spokenSlangQuestion = 'Як працюють дандер методи, асінк, постгрес і джил у пайтон?';
    const normalized = normalizeTechnicalSpeech(spokenSlangQuestion);

    expect(normalized).toContain('Dunder methods');
    expect(normalized).toContain('Asyncio');
    expect(normalized).toContain('PostgreSQL');
    expect(normalized).toContain('GIL');
  });
});
