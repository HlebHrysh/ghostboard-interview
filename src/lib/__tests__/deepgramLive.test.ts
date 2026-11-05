import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepgramLiveClient } from '../deepgramLive';

// Mock WebSocket implementation for empirical protocol testing
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

  simulateError(err = new Error('WebSocket connection failed')) {
    this.onerror?.(err);
  }
}

// Mock AudioContext and Nodes
class MockAudioWorkletPort {
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
}

class MockAudioWorkletNode {
  static instances: MockAudioWorkletNode[] = [];
  port = new MockAudioWorkletPort();
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    MockAudioWorkletNode.instances.push(this);
  }
}

function createMockAudioContext() {
  return {
    state: 'running' as AudioContextState,
    sampleRate: 48000,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    audioWorklet: {
      addModule: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as AudioContext;
}

function createMockSourceNode() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
}

describe('DeepgramLiveClient: Resilient Audio Pipeline & Reconnect Suite', () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalAudioWorkletNode = globalThis.AudioWorkletNode;

  beforeEach(() => {
    vi.restoreAllMocks();
    MockWebSocket.instances = [];
    MockAudioWorkletNode.instances = [];
    // Register test doubles
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    globalThis.AudioWorkletNode = MockAudioWorkletNode as unknown as typeof AudioWorkletNode;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    globalThis.AudioWorkletNode = originalAudioWorkletNode;
  });

  describe('a) Dynamic Token Provider (getApiKey) Verification', () => {
    it('invokes getApiKey() upon initial connection and again on each manual or scheduled reconnect', async () => {
      let callCount = 0;
      const getApiKey = vi.fn().mockImplementation(async () => {
        callCount++;
        return `ephemeral-token-${callCount}`;
      });

      const client = new DeepgramLiveClient();
      const mockCtx = createMockAudioContext();
      const mockNode = createMockSourceNode();

      // 1. Initial connection
      await client.startWithNode(mockCtx, mockNode, {
        getApiKey,
        language: 'uk',
      });

      expect(getApiKey).toHaveBeenCalledTimes(1);
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].protocols).toEqual(['token', 'ephemeral-token-1']);

      // Complete initial connection
      MockWebSocket.instances[0].simulateOpen();
      expect(client.isConnected()).toBe(true);

      // 2. Trigger reconnect
      await client.reconnect();
      expect(getApiKey).toHaveBeenCalledTimes(2);
      expect(MockWebSocket.instances).toHaveLength(2);
      expect(MockWebSocket.instances[1].protocols).toEqual(['token', 'ephemeral-token-2']);

      MockWebSocket.instances[1].simulateOpen();
      expect(client.isConnected()).toBe(true);

      client.stop();
    });
  });

  describe('b) Socket Race Condition & Generation Counter (P0-2 & P0-3)', () => {
    it('ensures that an onclose from a previous stale socket generation does NOT kill or disrupt a newer active socket', async () => {
      const getApiKey = vi.fn().mockResolvedValue('valid-token');
      const onStateChange = vi.fn();
      const onClose = vi.fn();

      const client = new DeepgramLiveClient();
      const mockCtx = createMockAudioContext();
      const mockNode = createMockSourceNode();

      // Start socket Gen 1
      await client.startWithNode(mockCtx, mockNode, {
        getApiKey,
        onStateChange,
        onClose,
      });

      expect(client.getGeneration()).toBe(1);
      const socketGen1 = MockWebSocket.instances[0];
      socketGen1.simulateOpen();
      expect(client.isConnected()).toBe(true);
      expect(onStateChange).toHaveBeenCalledWith('connected');

      // Reconnect increments generation to Gen 2 and creates Socket Gen 2
      await client.reconnect();
      expect(client.getGeneration()).toBe(2);
      const socketGen2 = MockWebSocket.instances[1];
      socketGen2.simulateOpen();

      expect(client.isConnected()).toBe(true);
      onClose.mockClear();
      onStateChange.mockClear();

      // Stale Socket Gen 1 now fires onclose event after being closed in background
      socketGen1.simulateClose(1006, 'Stale socket dropped');

      // Assert: Socket Gen 2 remains connected and client generation is still 2!
      expect(client.isConnected()).toBe(true);
      expect(client.getGeneration()).toBe(2);
      // Stale onclose did NOT trigger options.onClose or options.onStateChange('disconnected')
      expect(onClose).not.toHaveBeenCalled();
      expect(onStateChange).not.toHaveBeenCalledWith('disconnected');

      client.stop();
    });
  });

  describe('c) Backpressure Guarding (P1-2)', () => {
    it('drops audio chunks when socket.bufferedAmount > 256 * 1024 to prevent browser tab OOM', async () => {
      const getApiKey = vi.fn().mockResolvedValue('valid-token');
      const client = new DeepgramLiveClient();
      const mockCtx = createMockAudioContext();
      const mockNode = createMockSourceNode();

      await client.startWithNode(mockCtx, mockNode, { getApiKey });
      const socket = MockWebSocket.instances[0];
      socket.simulateOpen();

      const workletNode = MockAudioWorkletNode.instances[0];
      expect(workletNode).toBeDefined();

      const dummyPcm = new Int16Array(2048).buffer;

      // 1. When buffer is healthy (e.g. 64KB <= 256KB), chunk is sent
      socket.bufferedAmount = 64 * 1024;
      workletNode.port.onmessage?.({ data: dummyPcm } as MessageEvent);
      expect(socket.send).toHaveBeenCalledTimes(1);

      // 2. When buffer is congested (> 256KB), chunk is dropped without error
      socket.bufferedAmount = 300 * 1024;
      workletNode.port.onmessage?.({ data: dummyPcm } as MessageEvent);
      // socket.send count remains 1!
      expect(socket.send).toHaveBeenCalledTimes(1);

      // 3. When buffer drains back under threshold (128KB <= 256KB), chunk sending resumes
      socket.bufferedAmount = 128 * 1024;
      workletNode.port.onmessage?.({ data: dummyPcm } as MessageEvent);
      expect(socket.send).toHaveBeenCalledTimes(2);

      client.stop();
    });
  });

  describe('d) Technical Keyterms Query Limit Safety', () => {
    it('verifies that the WebSocket connection URL contains safely bounded keyterms (< 40 items and < 1.5 KB query)', async () => {
      const getApiKey = vi.fn().mockResolvedValue('valid-token');
      const client = new DeepgramLiveClient();
      const mockCtx = createMockAudioContext();
      const mockNode = createMockSourceNode();

      await client.startWithNode(mockCtx, mockNode, { getApiKey, language: 'uk' });
      const socket = MockWebSocket.instances[0];

      const urlObj = new URL(socket.url);
      const keyterms = urlObj.searchParams.getAll('keyterm');

      expect(keyterms.length).toBeLessThan(40);
      expect(urlObj.search.length).toBeLessThan(1500);

      client.stop();
    });
  });
});
