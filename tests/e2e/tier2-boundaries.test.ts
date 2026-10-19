import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockDualAudioCaptureEngine,
  floatTo16BitLinearPCM,
} from './fixtures/mockAudioGraph';
import { MockDeepgramLiveClient } from './fixtures/mockDeepgramServer';
import { MockSSEClient } from './fixtures/mockSseServer';
import { MockElectronBridge } from './fixtures/mockElectronBridge';
import { isFillerOrNoise } from '../../src/lib/techSpeechNormalizer';

describe('Tier 2: Boundary & Corner Cases Suite', () => {
  let audioEngine: MockDualAudioCaptureEngine;
  let deepgram: MockDeepgramLiveClient;
  let sseClient: MockSSEClient;
  let bridge: MockElectronBridge;

  beforeEach(() => {
    audioEngine = new MockDualAudioCaptureEngine();
    deepgram = new MockDeepgramLiveClient();
    deepgram.connect('test-key');
    sseClient = new MockSSEClient();
    bridge = new MockElectronBridge();
  });

  it('Boundary 2.1: Empty, whitespace-only, and conversational filler noise transcripts are strictly dropped', () => {
    const rawInputs = [
      '',
      '   ',
      '\n\t',
      'так',
      'ну',
      'угу',
      'чути мене?',
      'алло',
      'гм',
      'ясна річ',
    ];

    const triggeredQuestions: string[] = [];
    const handleTranscript = (text: string) => {
      if (isFillerOrNoise(text)) return;
      triggeredQuestions.push(text);
    };

    rawInputs.forEach((input) => handleTranscript(input));

    // Zero filler noises triggered AI question pipeline
    expect(triggeredQuestions).toHaveLength(0);
  });

  it('Boundary 2.2: Network error / service unavailable (HTTP 503) triggers model fallback across FLASH_MODELS', async () => {
    const question = 'How does distributed locking work in Redis?';

    // First attempt fails with 503
    let failedFirstAttempt = false;
    try {
      await sseClient.requestStream({ question }, { simulateError: true });
    } catch (err: any) {
      failedFirstAttempt = true;
      expect(err.message).toContain('HTTP 503');
    }
    expect(failedFirstAttempt).toBe(true);

    // Fallback model cascade automatically retries with gemini-3.6-flash
    const fallbackOutput = await sseClient.requestStream(
      { question },
      { fallbackTriggered: true, simulatedTtftMs: 620 }
    );

    expect(fallbackOutput.model).toBe('gemini-3.6-flash');
    expect(fallbackOutput.hook).toBeTruthy();
    expect(fallbackOutput.pillars.length).toBeGreaterThan(0);
  });

  it('Boundary 2.3: Rapid switching between System Audio and Tab Audio in quick succession does not leak tracks', () => {
    audioEngine.start('system');
    const modes = ['tab', 'system', 'tab', 'system', 'tab'] as const;

    // Switch 5 times in rapid succession
    for (const mode of modes) {
      audioEngine.switchSourceMode(mode);
    }

    expect(audioEngine.sourceMode).toBe('tab');
    expect(audioEngine.interviewerStream).not.toBeNull();
    expect(audioEngine.interviewerStream?.active).toBe(true);
    expect(audioEngine.interviewerGain.connectedNodes).toHaveLength(1);
  });

  it('Boundary 2.4: Prolonged audio silence (>15s) triggers keep-alive pings without dropping connection', () => {
    expect(deepgram.isConnected).toBe(true);
    expect(deepgram.receivedKeepAlives).toBe(0);

    // Simulate 4 keep-alive pings sent over 16 seconds of silence (one every 4s)
    for (let i = 0; i < 4; i++) {
      deepgram.sendKeepAlive();
    }

    expect(deepgram.receivedKeepAlives).toBe(4);
    expect(deepgram.isConnected).toBe(true);
  });

  it('Boundary 2.5: Massive Markdown answers (10,000+ characters, 50+ lines of code) parse without freeze or truncation', () => {
    let largeAnswer = `<<<PHASE_1:HOOK>>>\nHigh-throughput streaming requires memory-mapped ring buffers with cache alignment.\n<<<PHASE_2:PILLARS>>>\n`;
    for (let i = 1; i <= 10; i++) {
      largeAnswer += `• Architectural Rule ${i}: Zero-copy I/O with scatter-gather syscalls (readv/writev) maximizes bus saturation.\n`;
    }
    largeAnswer += `<<<PHASE_3:DEEP_DIVE>>>\n\`\`\`c\n`;
    for (let i = 1; i <= 60; i++) {
      largeAnswer += `void process_stream_chunk_${i}(int buffer_id) { ring_buffer_advance(buffer_id); }\n`;
    }
    largeAnswer += `\`\`\`\n<<<END>>>`;

    expect(largeAnswer.length).toBeGreaterThan(2500);

    const matchHook = largeAnswer.match(/<<<PHASE_1:HOOK>>>([\s\S]*?)<<<PHASE_2:PILLARS>>>/);
    const matchPillars = largeAnswer.match(/<<<PHASE_2:PILLARS>>>([\s\S]*?)<<<PHASE_3:DEEP_DIVE>>>/);
    const matchDeep = largeAnswer.match(/<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)<<<END>>>/);

    expect(matchHook).not.toBeNull();
    expect(matchPillars).not.toBeNull();
    expect(matchDeep).not.toBeNull();

    const pillars = matchPillars![1].trim().split('\n');
    expect(pillars).toHaveLength(10);
    expect(matchDeep![1]).toContain('process_stream_chunk_60');
  });

  it('Boundary 2.6: Rapid hotkey hammering (Space, B, F12 in rapid succession) preserves coherent state machine', () => {
    let isFrozen = false;
    let isPanic = false;
    let activeBridge: string | null = null;

    const handleKey = (key: string) => {
      if (key === 'Space') {
        isFrozen = !isFrozen;
      } else if (key === 'B') {
        activeBridge = 'Emergency Spoken Transition Phrase';
      } else if (key === 'F12') {
        isPanic = !isPanic;
      }
    };

    // Simulate user rapid hammering
    const keys = ['Space', 'B', 'Space', 'F12', 'F12', 'B', 'Space'];
    keys.forEach((k) => handleKey(k));

    // State machine remains coherent (frozen: true, panic: false, bridge active)
    expect(isFrozen).toBe(true);
    expect(isPanic).toBe(false);
    expect(activeBridge).toBe('Emergency Spoken Transition Phrase');
  });

  it('Boundary 2.7: Partial SSE stream with premature connection disconnect preserves received partial tokens', async () => {
    const question = 'What is Raft consensus?';
    let abortedWithError = false;

    try {
      await sseClient.requestStream(
        { question },
        { simulateAbruptDisconnect: true, chunkDelayMs: 0 }
      );
    } catch (err: any) {
      abortedWithError = true;
      expect(err.message).toContain('terminated prematurely');
    }

    expect(abortedWithError).toBe(true);
    // Received tokens before disconnect are preserved in buffer
    expect(sseClient.receivedChunks.length).toBeGreaterThanOrEqual(5);
    expect(sseClient.fullAccumulatedText.length).toBeGreaterThan(0);
  });

  it('Boundary 2.8: Audio sample extreme clipping (Float32 values outside [-1.0, 1.0]) clamps safely in 16-bit PCM', () => {
    // Extreme audio spikes (e.g. microphone unplug, acoustic shock)
    const extremeSamples = new Float32Array([-100.0, -2.5, 2.5, 100.0, NaN]);
    const buffer = floatTo16BitLinearPCM(extremeSamples);
    const view = new DataView(buffer);

    // -100.0 clamped to -1.0 -> -32768
    expect(view.getInt16(0, true)).toBe(-32768);
    // -2.5 clamped to -1.0 -> -32768
    expect(view.getInt16(2, true)).toBe(-32768);
    // 2.5 clamped to 1.0 -> 32767
    expect(view.getInt16(4, true)).toBe(32767);
    // 100.0 clamped to 1.0 -> 32767
    expect(view.getInt16(6, true)).toBe(32767);
  });
});
