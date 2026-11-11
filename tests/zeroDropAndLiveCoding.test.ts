import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepgramLiveClient } from '../src/lib/deepgramLive';
import {
  interviewSyncStore,
  syncStore,
  mergeQAsMonotonic,
  SyncQAItem,
} from '../src/lib/interviewSyncStore';
import { parseStructuredGhostboardOutput } from '../src/lib/aiPromptCore';
import {
  extractCodilityProblem,
  detectAndExtract,
} from '../extension/content';

// Mock WebSocket implementation for protocol and ring-buffer testing
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  protocols: string[];
  readyState: number = MockWebSocket.CONNECTING;
  bufferedAmount: number = 0;
  binaryType: string = 'blob';

  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: { code: number; reason: string; wasClean: boolean }) => void) | null = null;

  send = vi.fn();
  close = vi.fn().mockImplementation((code = 1000, reason = '') => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: true });
  });

  constructor(url: string, protocols: string[] = []) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }

  simulateClose(code = 1000, reason = 'Normal Closure') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason, wasClean: true });
  }
}

describe('1. Zero-Drop Audio Ring Buffer & Dynamic Reconnect in DeepgramLiveClient', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.restoreAllMocks();
    MockWebSocket.instances = [];
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
  });

  it('queues audio chunks before WebSocket connects and flushes them in order upon onopen', async () => {
    const client = new DeepgramLiveClient();
    await client.connect({ apiKey: 'test-token' });

    expect(MockWebSocket.instances).toHaveLength(1);
    const socket = MockWebSocket.instances[0];
    expect(socket.readyState).toBe(MockWebSocket.CONNECTING);

    // Send 3 audio chunks while still connecting
    const chunk1 = new Uint8Array([1, 2, 3]).buffer;
    const chunk2 = new Uint8Array([4, 5, 6]).buffer;
    const chunk3 = new Int16Array([100, 200, 300]);

    client.sendAudio(chunk1);
    client.sendAudio(chunk2);
    client.sendAudio(chunk3);

    // Since socket is CONNECTING, nothing sent directly yet
    expect(socket.send).toHaveBeenCalledTimes(0);

    // WebSocket completes handshake
    socket.simulateOpen();

    // All 3 pending chunks must be flushed immediately on open
    expect(socket.send).toHaveBeenCalledTimes(3);
    expect(socket.send).toHaveBeenNthCalledWith(1, chunk1);
    expect(socket.send).toHaveBeenNthCalledWith(2, chunk2);
    expect(socket.send).toHaveBeenNthCalledWith(3, chunk3.buffer);

    // Subsequent chunks are sent directly without queueing
    const chunk4 = new Uint8Array([7, 8, 9]).buffer;
    client.sendAudio(chunk4);
    expect(socket.send).toHaveBeenCalledTimes(4);
    expect(socket.send).toHaveBeenNthCalledWith(4, chunk4);

    client.stop();
  });

  it('bounds audio ring buffer to MAX_BUFFERED_CHUNKS (60) to prevent memory leak / OOM during long reconnects', async () => {
    const client = new DeepgramLiveClient();
    await client.connect({ apiKey: 'test-token' });

    const socket = MockWebSocket.instances[0];

    // Push 75 chunks while socket is CONNECTING (15 over the 60 limit)
    for (let i = 0; i < 75; i++) {
      client.sendAudio(new Uint8Array([i]).buffer);
    }

    // Verify nothing sent yet
    expect(socket.send).toHaveBeenCalledTimes(0);

    // Open connection
    socket.simulateOpen();

    // Only 60 latest chunks flushed, oldest 15 dropped cleanly
    expect(socket.send).toHaveBeenCalledTimes(60);

    // First flushed chunk should be chunk index 15 (0..14 dropped)
    const firstFlushed = socket.send.mock.calls[0][0] as ArrayBuffer;
    expect(new Uint8Array(firstFlushed)[0]).toBe(15);

    // Last flushed chunk should be chunk index 74
    const lastFlushed = socket.send.mock.calls[59][0] as ArrayBuffer;
    expect(new Uint8Array(lastFlushed)[0]).toBe(74);

    client.stop();
  });

  it('supports dual-signature onTranscript callback and status changes', async () => {
    // Declared with parameters so handler.length > 1
    const onTranscript = vi.fn(
      (_text: string, _isFinal: boolean, _confidence?: number, _speechFinal?: boolean) => {}
    );
    const onStatusChange = vi.fn();

    const client = new DeepgramLiveClient();
    await client.connect({
      apiKey: 'test-token',
      onTranscript: onTranscript as any,
      onStatusChange,
    });

    const socket = MockWebSocket.instances[0];
    socket.simulateOpen();
    expect(onStatusChange).toHaveBeenCalledWith('connected');

    // Simulate Deepgram transcript message
    socket.simulateMessage({
      type: 'Results',
      channel: {
        alternatives: [
          {
            transcript: 'Optimizing hash map lookups',
            confidence: 0.98,
          },
        ],
      },
      is_final: true,
      speech_final: true,
    });

    // onTranscript called with (text, isFinal, confidence, speechFinal)
    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith(
      'Optimizing hash map lookups',
      true,
      0.98,
      true
    );

    client.stop();
  });
});

describe('2. Monotonic State Merging & upsertQA in interviewSyncStore', () => {
  beforeEach(() => {
    interviewSyncStore.clear();
  });

  it('mergeQAsMonotonic preserves longer streamed text from local memory over delayed remote', () => {
    const remoteQAs: SyncQAItem[] = [
      {
        id: 'qa-1',
        question: 'Two Sum',
        quickAnswer: 'Short answer',
        startHook: 'Hook 1',
        hints: ['Hint 1'],
        timestamp: 1000,
      },
      {
        id: 'qa-2',
        question: 'LRU Cache',
        quickAnswer: 'Use doubly linked list',
        startHook: 'Hook 2',
        hints: ['Hint 2'],
        timestamp: 900,
      },
    ];

    const localQAs: SyncQAItem[] = [
      {
        id: 'qa-1',
        question: 'Two Sum',
        // Local has streamed much more content in RAM
        quickAnswer: 'Short answer that has expanded with complete O(N) explanation and map lookups',
        startHook: 'Hook 1 with extra context',
        deepDive: 'export function twoSum() {}',
        hints: ['Hint 1', 'Hint 1.2'],
        timestamp: 1000,
      },
    ];

    const merged = mergeQAsMonotonic(localQAs, remoteQAs);

    expect(merged).toHaveLength(2);
    const mergedQa1 = merged.find((q) => q.id === 'qa-1');
    expect(mergedQa1?.quickAnswer).toContain('expanded with complete O(N) explanation');
    expect(mergedQa1?.deepDive).toBe('export function twoSum() {}');

    // qa-2 is preserved from remote
    const mergedQa2 = merged.find((q) => q.id === 'qa-2');
    expect(mergedQa2?.quickAnswer).toBe('Use doubly linked list');
  });

  it('interviewSyncStore.upsertQA automatically generates id, timestamp, and createdAt', () => {
    interviewSyncStore.upsertQA({
      question: 'Reverse Linked List',
      quickAnswer: 'Iterate with prev, curr, next pointers in O(N) time and O(1) space.',
      keyPillars: ['Initialize prev = null', 'Update pointers in loop', 'Return prev'],
      status: 'ready',
    });

    const state = interviewSyncStore.getState();
    expect(state.qas).toHaveLength(1);
    const item = state.qas[0];
    expect(item.id).toMatch(/^qa_\d+/);
    expect(item.question).toBe('Reverse Linked List');
    expect(item.createdAt).toBeGreaterThan(0);
    expect(item.timestamp).toBeGreaterThan(0);
    expect(item.keyPillars).toHaveLength(3);
    expect(item.status).toBe('ready');
    expect(state.activeId).toBe(item.id);
  });

  it('interviewSyncStore.upsertQA works with explicit userId partition', () => {
    const userA = 'user_alex_123';
    interviewSyncStore.upsertQA(userA, {
      id: 'custom_qa_42',
      question: 'Valid Parentheses',
      quickAnswer: 'Use a stack to match brackets.',
    });

    const stateUserA = interviewSyncStore.getState(userA);
    expect(stateUserA.qas).toHaveLength(1);
    expect(stateUserA.qas[0].id).toBe('custom_qa_42');

    // Default user state is unaffected
    const stateDefault = interviewSyncStore.getState();
    expect(stateDefault.qas.some((q) => q.id === 'custom_qa_42')).toBe(false);
  });

  it('syncStore.upsertQA facade operates correctly', async () => {
    const item = await syncStore.upsertQA({
      question: 'Merge K Sorted Lists',
      quickAnswer: 'Use a min-heap of size K.',
    });

    expect(item).toBeDefined();
    const state = await syncStore.getState();
    expect(state.qas.some((q) => q.question === 'Merge K Sorted Lists')).toBe(true);
  });
});

describe('3. Codility Extraction in Chrome Extension', () => {
  const originalDoc = (globalThis as unknown as { document?: unknown }).document;
  const originalWin = (globalThis as unknown as { window?: unknown }).window;

  afterEach(() => {
    (globalThis as unknown as { document?: unknown }).document = originalDoc;
    (globalThis as unknown as { window?: unknown }).window = originalWin;
  });

  function setupMockDom(hostname = 'app.codility.com', title = 'CyclicRotation - Codility') {
    const mockDoc = {
      title,
      querySelector: (selector: string) => {
        if (selector.includes('task-title') || selector.includes('.task-title')) {
          return { innerText: 'CyclicRotation' };
        }
        if (
          selector.includes('task-description') ||
          selector.includes('.task-description') ||
          selector.includes('.task-body')
        ) {
          return {
            innerText:
              'An array A consisting of N integers is given. Rotation of the array means that each element is shifted right by one index.',
          };
        }
        return null;
      },
      querySelectorAll: () => [],
    };

    const mockWin = {
      location: {
        hostname,
        href: `https://${hostname}/c/run/demo123/`,
      },
      getSelection: () => null,
    };

    (globalThis as unknown as { document?: unknown }).document = mockDoc;
    (globalThis as unknown as { window?: unknown }).window = mockWin;
  }

  it('extracts problem details from Codility DOM selectors', () => {
    setupMockDom();

    const extracted = extractCodilityProblem();
    expect(extracted).not.toBeNull();
    expect(extracted?.platform).toBe('Codility');
    expect(extracted?.title).toBe('CyclicRotation');
    expect(extracted?.tag).toBe('#Codility');
    expect(extracted?.fullPrompt).toContain('CyclicRotation');
    expect(extracted?.fullPrompt).toContain('shifted right by one index');
  });

  it('detectAndExtract correctly routes codility.com hostnames', () => {
    setupMockDom('app.codility.com');

    const result = detectAndExtract();
    expect(result).not.toBeNull();
    expect(result?.platform).toBe('Codility');
    expect(result?.title).toBe('CyclicRotation');
  });
});

describe('4. Structured Live-Coding 4-Phase Prompt & Output Parsing', () => {
  it('parses strict Ghostboard 4-Phase live coding output with meta, hook, pillars, code, and trap', () => {
    const sampleOutput = `<<<META: TypeScript | Senior | EN>>>
<<<PHASE_1:HOOK>>>
Use a sliding window with a HashMap to track character frequencies in O(N) time and O(K) space.
<<<PHASE_2:PILLARS>>>
- Maintain invariant that current window [left, right] contains at most K distinct characters.
- Expand right pointer until violation, then contract left pointer while updating max length.
- Time complexity is strictly O(N) because each character enters and leaves the window at most once.
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`typescript
export function lengthOfLongestSubstringKDistinct(s: string, k: number): number {
  if (k === 0 || !s) return 0;
  const map = new Map<string, number>();
  let left = 0;
  let maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    map.set(char, (map.get(char) || 0) + 1);

    while (map.size > k) {
      const leftChar = s[left];
      const count = map.get(leftChar)! - 1;
      if (count === 0) {
        map.delete(leftChar);
      } else {
        map.set(leftChar, count);
      }
      left++;
    }

    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}
\`\`\`
<<<PHASE_4:TRAP>>>
Q: Asking what happens when K >= string length or string is empty?
A: Immediately handle early returns K <= 0 or K >= N for O(1) best-case execution.
<<<END>>>`;

    const parsed = parseStructuredGhostboardOutput(sampleOutput);

    expect(parsed.meta).toBeDefined();
    expect(parsed.meta?.domain).toBe('TypeScript');
    expect(parsed.meta?.level).toBe('Senior');
    expect(parsed.meta?.language).toBe('EN');

    expect(parsed.hook).toContain('sliding window with a HashMap');
    expect(parsed.pillars).toHaveLength(3);
    expect(parsed.pillars[0]).toContain('Maintain invariant');
    expect(parsed.pillars[2]).toContain('strictly O(N)');

    expect(parsed.deepDive).toContain('lengthOfLongestSubstringKDistinct');
    expect(parsed.deepDive).toContain('export function');

    expect(parsed.followUpTrap).toBeDefined();
    expect(parsed.followUpTrap?.question).toContain('Asking what happens when K >= string length');
    expect(parsed.followUpTrap?.answer).toContain('Immediately handle early returns');
  });
});
