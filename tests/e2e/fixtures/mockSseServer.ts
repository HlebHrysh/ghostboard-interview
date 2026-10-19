/**
 * Mock SSE Streaming AI Route Simulator
 * Simulates /api/ai/dual-stream Server-Sent Events with progressive 3-phase tokens.
 */

export interface DualStreamRequestPayload {
  question: string;
  history?: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  directorModifier?: 'normal' | 'shorter' | 'more_technical' | 'code_example' | 'tradeoffs';
  candidateProfile?: {
    role?: string;
    primaryStack?: string;
    experienceLevel?: string;
  };
  outputLanguage?: string;
}

export interface TelemetryPayload {
  ttftMs: number;
  model: string;
  timestamp: number;
}

export interface StructuredAnswerOutput {
  hook: string;
  pillars: string[];
  deepDive: string;
  ttftMs: number;
  totalDurationMs: number;
  model: string;
}

function stripTrailingPartialDelimiter(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*(?:<<<END>>>|\[DONE\])\s*$/gi, '')
    .replace(/\s*<{1,3}[\s\S]*?$/, '')
    .replace(/\s*\[D(?:O(?:N(?:E\]?)?)?)?$/i, '')
    .trim();
}

export function parseDualStreamDelimiters(rawText: string) {
  if (!rawText) {
    return { hook: '', pillars: [], deepDive: '' };
  }

  let hook = '';
  let pillars: string[] = [];
  let deepDive = '';

  const hasPhase1 = rawText.includes('<<<PHASE_1:HOOK>>>');
  if (hasPhase1) {
    const hookMatch = rawText.match(/<<<PHASE_1:HOOK>>>([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|$)/);
    if (hookMatch) {
      hook = stripTrailingPartialDelimiter(hookMatch[1]);
    }
  } else {
    const fallbackMatch = rawText.match(/^([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|$)/);
    if (fallbackMatch) {
      hook = stripTrailingPartialDelimiter(fallbackMatch[1]);
    }
  }

  const pillarsMatch = rawText.match(/<<<PHASE_2:PILLARS>>>([\s\S]*?)(?:<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|$)/);
  if (pillarsMatch) {
    const rawPillars = stripTrailingPartialDelimiter(pillarsMatch[1]);
    pillars = rawPillars
      .split('\n')
      .map((line) => line.replace(/^[•\-\*]\s*/, '').replace(/\[DONE\]/gi, '').trim())
      .filter((line) => line.length > 0 && !line.includes('[DONE]'));
  }

  const deepDiveMatch = rawText.match(/<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)(?:<<<END>>>|$)/);
  if (deepDiveMatch) {
    const rawDeepDive = deepDiveMatch[1].replace(/(?:<<<END>>>|\[DONE\])\s*$/gi, '');
    deepDive = stripTrailingPartialDelimiter(rawDeepDive);
  }

  return { hook, pillars, deepDive };
}

export class MockSSEClient {
  isStreaming = false;
  aborted = false;
  activeModel = 'gemini-3.8-flash';
  receivedChunks: string[] = [];
  fullAccumulatedText = '';
  telemetry: TelemetryPayload | null = null;
  completedOutput: StructuredAnswerOutput | null = null;
  onChunkCallback?: (chunk: string, accumulated: string) => void;

  async requestStream(
    payload: DualStreamRequestPayload,
    options?: {
      simulatedTtftMs?: number;
      simulateError?: boolean;
      simulateAbruptDisconnect?: boolean;
      fallbackTriggered?: boolean;
      chunkDelayMs?: number;
      onChunk?: (chunk: string, accumulated: string) => void;
    }
  ): Promise<StructuredAnswerOutput> {
    this.isStreaming = true;
    this.aborted = false;
    this.receivedChunks = [];
    this.fullAccumulatedText = '';

    if (!payload.question || !payload.question.trim()) {
      this.isStreaming = false;
      throw new Error('Question cannot be empty');
    }

    if (options?.simulateError) {
      this.isStreaming = false;
      throw new Error('SSE HTTP 503: Service Unavailable');
    }

    const ttft = options?.simulatedTtftMs ?? 420;
    this.activeModel = options?.fallbackTriggered ? 'gemini-3.6-flash' : 'gemini-3.8-flash';

    this.telemetry = {
      ttftMs: ttft,
      model: this.activeModel,
      timestamp: Date.now(),
    };

    // Synthesize 3-phase text based on question & modifier
    let phase1Hook = `In production architectures, this is handled through deterministic state boundaries and decoupled async workers.`;
    let phase2Pillars = [
      `Throughput & Latency: Non-blocking I/O multiplexing minimizes per-connection thread overhead.`,
      `State Synchronization: Raft consensus or distributed locks guarantee linearizability.`,
      `Resilience: Exponential backoff and circuit breaking isolate cascading failures.`,
    ];
    let phase3DeepDive = `\`\`\`typescript\n// Idiomatic implementation\nconst worker = new WorkerQueue({ concurrency: 4 });\n\`\`\``;

    if (payload.directorModifier === 'shorter') {
      phase1Hook = `Direct core answer: Minimal lock contention with CAS semantics.`;
      phase2Pillars = [
        `1. CAS updates eliminate mutex blocking.`,
        `2. Cache locality minimizes L3 misses.`,
        `3. O(1) constant time overhead.`,
      ];
      phase3DeepDive = `Key takeaway: 60% lower latency under high contention.`;
    } else if (payload.directorModifier === 'more_technical') {
      phase3DeepDive = `Kernel details: Uses epoll_wait (Linux) / kqueue (BSD) with edge-triggered notifications, avoiding O(N) file descriptor sweeps.`;
    } else if (payload.directorModifier === 'code_example') {
      phase3DeepDive = `\`\`\`python\nimport asyncio\n\nasync def handle_stream():\n    async for chunk in reader:\n        await process(chunk)\n\`\`\``;
    }

    const fullContent = `<<<PHASE_1:HOOK>>>\n${phase1Hook}\n<<<PHASE_2:PILLARS>>>\n${phase2Pillars.map((p) => `• ${p}`).join('\n')}\n<<<PHASE_3:DEEP_DIVE>>>\n${phase3DeepDive}\n<<<END>>>`;

    // Stream in simulated token chunks
    const chunkTokens = fullContent.split(' ');
    const delay = options?.chunkDelayMs ?? 1;

    for (const token of chunkTokens) {
      if (this.aborted) {
        this.isStreaming = false;
        throw new Error('Stream aborted by user action');
      }
      if (options?.simulateAbruptDisconnect && this.receivedChunks.length > 5) {
        this.isStreaming = false;
        throw new Error('SSE connection terminated prematurely');
      }

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const tokenWithSpace = token + ' ';
      this.receivedChunks.push(tokenWithSpace);
      this.fullAccumulatedText += tokenWithSpace;

      if (options?.onChunk) {
        options.onChunk(tokenWithSpace, this.fullAccumulatedText);
      }
      if (this.onChunkCallback) {
        this.onChunkCallback(tokenWithSpace, this.fullAccumulatedText);
      }
    }

    const parsed = parseDualStreamDelimiters(this.fullAccumulatedText);
    this.completedOutput = {
      hook: parsed.hook,
      pillars: parsed.pillars,
      deepDive: parsed.deepDive,
      ttftMs: ttft,
      totalDurationMs: ttft + 300,
      model: this.activeModel,
    };

    this.isStreaming = false;
    return this.completedOutput;
  }

  abort() {
    this.aborted = true;
    this.isStreaming = false;
  }
}
