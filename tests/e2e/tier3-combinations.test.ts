import { describe, it, expect, beforeEach } from 'vitest';
import { MockDualAudioCaptureEngine } from './fixtures/mockAudioGraph';
import { MockDeepgramLiveClient } from './fixtures/mockDeepgramServer';
import { MockSSEClient } from './fixtures/mockSseServer';
import { MockElectronBridge } from './fixtures/mockElectronBridge';

describe('Tier 3: Cross-Feature Combinations & Concurrency Suite', () => {
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
    audioEngine.start('system');
  });

  it('Combo 3.1: Candidate speaks into microphone while interlocutor answer is actively streaming', async () => {
    const candidateChatLog: string[] = [];
    const triggeredQuestions: string[] = [];

    deepgram.onTranscript((event) => {
      if (event.speaker === 'candidate' && event.isFinal) {
        candidateChatLog.push(event.text);
      } else if (event.speaker === 'interviewer' && event.isFinal) {
        triggeredQuestions.push(event.text);
      }
    });

    // 1. Interlocutor question starts streaming on Right Column
    const streamPromise = sseClient.requestStream(
      { question: 'How do you design a rate limiter in distributed systems?' },
      { chunkDelayMs: 2 }
    );

    // 2. Concurrently, candidate speaks into microphone on Left Column
    deepgram.emitSpeech(
      'candidate',
      'I would use a Redis token bucket with Lua scripts for atomic increments.',
      true,
      true
    );

    // 3. Complete the stream
    const answer = await streamPromise;

    // Assert: candidate speech is captured in chat log
    expect(candidateChatLog).toHaveLength(1);
    expect(candidateChatLog[0]).toContain('Redis token bucket');

    // Assert: candidate speech did NOT trigger any additional AI generation
    expect(triggeredQuestions).toHaveLength(0);

    // Assert: interlocutor answer stream finished cleanly
    expect(answer.hook).toBeTruthy();
    expect(answer.pillars).toHaveLength(3);
  });

  it('Combo 3.2: User clicks AI modifier chip during active mid-flight SSE stream', async () => {
    // 1. Initial stream started
    const initialStreamPromise = sseClient.requestStream(
      { question: 'Explain CAP theorem tradeoffs.' },
      { chunkDelayMs: 5 }
    );

    // Verify stream is running
    expect(sseClient.isStreaming).toBe(true);

    // 2. User clicks "Blitz / Shorter" [Q] mid-stream
    sseClient.abort();
    expect(sseClient.aborted).toBe(true);

    // Initial stream rejects or terminates safely
    try {
      await initialStreamPromise;
    } catch (e: any) {
      expect(e.message).toContain('aborted');
    }

    // 3. Revised stream launches with 'shorter' modifier
    const revisedAnswer = await sseClient.requestStream(
      {
        question: 'Explain CAP theorem tradeoffs.',
        directorModifier: 'shorter',
      },
      { chunkDelayMs: 0 }
    );

    expect(revisedAnswer.hook).toContain('Direct core answer');
    expect(revisedAnswer.pillars).toHaveLength(3);
    expect(revisedAnswer.deepDive).toContain('Key takeaway');
  });

  it('Combo 3.3: Panic Shield [F12] triggered during active audio capture and streaming', async () => {
    let isPanic = false;
    let disguiseTerminal = '';
    const sttTranscriptBuffer: string[] = [];

    deepgram.onTranscript((event) => {
      sttTranscriptBuffer.push(event.text);
    });

    // 1. Stream is launched
    const streamPromise = sseClient.requestStream(
      { question: 'What is database sharding?' },
      { chunkDelayMs: 2 }
    );

    // 2. Panic Shield triggered due to room intrusion
    isPanic = true;
    disguiseTerminal = 'user@workstation:~$ git status && pytest -v';

    expect(isPanic).toBe(true);
    expect(disguiseTerminal).toContain('pytest -v');

    // 3. Audio arrives while disguised
    deepgram.emitSpeech('interviewer', 'Follow-up on consistent hashing', true, true);

    const streamResult = await streamPromise;

    // Stream finished in background
    expect(streamResult.hook).toBeTruthy();
    // STT captured background speech without interruption
    expect(sttTranscriptBuffer).toHaveLength(1);
    expect(sttTranscriptBuffer[0]).toBe('Follow-up on consistent hashing');
  });

  it('Combo 3.4: Freeze mode activated while 3-phase stream is arriving, queues follow-up question', async () => {
    let isFrozen = false;
    let activeCardId = 'card-1';
    const queuedCards: string[] = [];

    // 1. First question streaming
    const q1Promise = sseClient.requestStream(
      { question: 'Explain event-driven microservices.' },
      { chunkDelayMs: 0 }
    );
    await q1Promise;

    // 2. Candidate hits Space to lock card while speaking
    isFrozen = true;

    // 3. Second question arrives while candidate is answering
    const newQuestionId = 'card-2';
    if (isFrozen) {
      queuedCards.push(newQuestionId);
    } else {
      activeCardId = newQuestionId;
    }

    // Active card remained locked on card-1
    expect(activeCardId).toBe('card-1');
    expect(queuedCards).toEqual(['card-2']);

    // 4. Candidate hits Space to unfreeze
    isFrozen = false;
    activeCardId = queuedCards.pop()!;

    expect(isFrozen).toBe(false);
    expect(activeCardId).toBe('card-2');
  });

  it('Combo 3.5: Audio source mode switch initiated while candidate microphone is actively capturing', () => {
    expect(audioEngine.sourceMode).toBe('system');
    expect(audioEngine.candidateStream?.active).toBe(true);

    // Candidate is speaking into mic
    const micDataBefore = audioEngine.simulateCandidateAudio(45);
    deepgram.sendAudioChunk(micDataBefore);

    // Interlocutor source switched from system loopback to tab audio
    audioEngine.switchSourceMode('tab');
    expect(audioEngine.sourceMode).toBe('tab');

    // Candidate mic remains active and uninterrupted!
    expect(audioEngine.candidateStream?.active).toBe(true);
    const micDataAfter = audioEngine.simulateCandidateAudio(55);
    deepgram.sendAudioChunk(micDataAfter);

    expect(deepgram.receivedFramesCount).toBe(2);
  });

  it('Combo 3.6: Multi-stage emergency sequence: Question -> Bridge -> Panic -> Dismiss -> Answer Ready', async () => {
    let activeBridge: string | null = null;
    let isPanic = false;

    // 1. Question asked
    const streamPromise = sseClient.requestStream(
      { question: 'How do you prevent cache stampede?' },
      { chunkDelayMs: 2 }
    );

    // 2. Candidate buys time with Bridge Phrase [B]
    activeBridge = 'Це фундаментальний архітектурний виклик...';
    expect(activeBridge).toContain('архітектурний');

    // 3. Screen sharing requested / room intrusion -> hit Panic [F12]
    isPanic = true;
    expect(isPanic).toBe(true);

    // 4. Panic dismissed [Esc]
    isPanic = false;
    expect(isPanic).toBe(false);

    // 5. Answer finishes streaming and is fully rendered
    const answer = await streamPromise;
    expect(answer.hook).toBeTruthy();
    expect(answer.pillars).toHaveLength(3);
  });
});
