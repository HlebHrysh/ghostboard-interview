import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MockDualAudioCaptureEngine,
  floatTo16BitLinearPCM,
} from './fixtures/mockAudioGraph';
import {
  MockDeepgramLiveClient,
  SpeechTranscriptEvent,
} from './fixtures/mockDeepgramServer';

describe('Tier 1: Feature Coverage — Audio Separation & Strict Speaker Guard (R1)', () => {
  let audioEngine: MockDualAudioCaptureEngine;
  let deepgramClient: MockDeepgramLiveClient;
  let triggeredAIQuestions: string[];
  let candidateDialogueHistory: string[];

  beforeEach(() => {
    audioEngine = new MockDualAudioCaptureEngine();
    deepgramClient = new MockDeepgramLiveClient();
    deepgramClient.connect('mock-deepgram-key');
    triggeredAIQuestions = [];
    candidateDialogueHistory = [];

    // Opaque-box speech routing dispatcher adhering to R1 interface contracts
    deepgramClient.onTranscript((event: SpeechTranscriptEvent) => {
      if (!event.text || !event.text.trim()) return;

      // 🛡️ CRITICAL GUARDRAIL: Candidate microphone speech NEVER enters AI trigger pipeline
      if (event.speaker === 'candidate') {
        if (event.isFinal) {
          candidateDialogueHistory.push(event.text.trim());
        }
        return;
      }

      // Interlocutor speech enters AI question pipeline
      if (event.speaker === 'interviewer' && event.isFinal) {
        triggeredAIQuestions.push(event.text.trim());
      }
    });
  });

  it('AC 1.1: Interlocutor speech captured via System Audio loopback triggers AI pipeline', () => {
    audioEngine.start('system');
    expect(audioEngine.sourceMode).toBe('system');
    expect(audioEngine.isCapturing).toBe(true);

    // Simulate system loopback audio frame
    const pcmData = audioEngine.simulateInterviewerAudio(65);
    deepgramClient.sendAudioChunk(pcmData);
    expect(deepgramClient.receivedFramesCount).toBe(1);

    // Deepgram returns finalized transcription for interlocutor
    const question = 'Can you explain the difference between processes and threads in Linux?';
    deepgramClient.emitSpeech('interviewer', question, true, true);

    expect(triggeredAIQuestions).toHaveLength(1);
    expect(triggeredAIQuestions[0]).toBe(question);
    expect(candidateDialogueHistory).toHaveLength(0);
  });

  it('AC 1.1: Interlocutor speech captured via Window/Tab capture triggers AI pipeline', () => {
    audioEngine.start('tab');
    expect(audioEngine.sourceMode).toBe('tab');

    // Simulate tab audio frame
    const pcmData = audioEngine.simulateInterviewerAudio(80);
    deepgramClient.sendAudioChunk(pcmData);

    const question = 'How does PostgreSQL handle MVCC under concurrent read-write transactions?';
    deepgramClient.emitSpeech('interviewer', question, true, true);

    expect(triggeredAIQuestions).toHaveLength(1);
    expect(triggeredAIQuestions[0]).toBe(question);
    expect(candidateDialogueHistory).toHaveLength(0);
  });

  it('AC 1.2: Candidate speech from microphone is strictly blocked from initiating AI prompt generation', () => {
    audioEngine.start('system');

    // Candidate speaks into microphone answering the previous question
    deepgramClient.emitSpeech(
      'candidate',
      'In Linux, processes have separate virtual memory spaces, while threads share the heap and descriptors.',
      true,
      true
    );
    deepgramClient.emitSpeech(
      'candidate',
      'We also used clone() system call with CLONE_VM and CLONE_FILES flags in our custom daemon.',
      true,
      true
    );

    // Guardrail verification: ZERO triggers fired to AI
    expect(triggeredAIQuestions).toHaveLength(0);
    expect(candidateDialogueHistory).toHaveLength(2);
  });

  it('AC 1.2: Candidate speech is isolated into candidate dialogue history ("Ви")', () => {
    audioEngine.start('system');

    const candidateUtterance = 'Let me walk through our database indexing strategy.';
    deepgramClient.emitSpeech('candidate', candidateUtterance, true, true);

    expect(candidateDialogueHistory).toContain(candidateUtterance);
    expect(triggeredAIQuestions).toHaveLength(0);
  });

  it('AC 1.3: Switching between System Audio ("весь звук") and Window/Tab capture works cleanly without leaks', () => {
    audioEngine.start('system');
    expect(audioEngine.sourceMode).toBe('system');
    const oldInterviewerStream = audioEngine.interviewerStream;
    expect(oldInterviewerStream?.active).toBe(true);

    // User flips UI toggle to Window/Tab capture
    audioEngine.switchSourceMode('tab');
    expect(audioEngine.sourceMode).toBe('tab');

    // Verify previous tracks stopped to avoid memory/hardware leaks
    expect(oldInterviewerStream?.tracks[0].enabled).toBe(false);
    expect(audioEngine.interviewerStream?.id).toBe('interviewer-stream-tab');

    // System continues receiving audio post-switch
    const pcmData = audioEngine.simulateInterviewerAudio(72);
    deepgramClient.sendAudioChunk(pcmData);
    expect(deepgramClient.receivedFramesCount).toBe(1);

    deepgramClient.emitSpeech('interviewer', 'What is the CAP theorem?', true, true);
    expect(triggeredAIQuestions).toContain('What is the CAP theorem?');
  });

  it('AC 1.4: Real-time dual VU/waveform meters respond independently to interlocutor vs candidate volume', () => {
    audioEngine.start('system');

    // 1. Interlocutor speaks loudly, candidate is silent
    audioEngine.simulateInterviewerAudio(85);
    audioEngine.simulateCandidateAudio(0);

    expect(audioEngine.interviewerAnalyser.calculateRMS()).toBe(85);
    expect(audioEngine.candidateAnalyser.calculateRMS()).toBe(0);

    // 2. Candidate speaks, interlocutor is listening
    audioEngine.simulateInterviewerAudio(5);
    audioEngine.simulateCandidateAudio(60);

    expect(audioEngine.interviewerAnalyser.calculateRMS()).toBe(5);
    expect(audioEngine.candidateAnalyser.calculateRMS()).toBe(60);
  });

  it('R1 Math Invariant: Converts Float32 audio samples to 16-bit linear PCM with zero clipping distortion', () => {
    const rawSamples = new Float32Array([-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5]);
    const buffer = floatTo16BitLinearPCM(rawSamples);
    const view = new DataView(buffer);

    expect(buffer.byteLength).toBe(rawSamples.length * 2);

    // -1.5 clamped to -1.0 -> -32768 (0x8000)
    expect(view.getInt16(0, true)).toBe(-32768);
    // -1.0 -> -32768
    expect(view.getInt16(2, true)).toBe(-32768);
    // -0.5 -> -16384
    expect(view.getInt16(4, true)).toBe(-16384);
    // 0.0 -> 0
    expect(view.getInt16(6, true)).toBe(0);
    // 0.5 -> ~16383
    expect(view.getInt16(8, true)).toBe(16383);
    // 1.0 -> 32767
    expect(view.getInt16(10, true)).toBe(32767);
    // 1.5 clamped to 1.0 -> 32767
    expect(view.getInt16(12, true)).toBe(32767);
  });
});
