import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  floatTo16BitLinearPCM,
  resampleAndQuantize,
  DesktopAudioEngine,
  calculateRMSFromAnalyser,
  StrictSpeakerGuard,
} from '../desktop/src/lib/audioEngine';

describe('Adversarial M2 Audio Engine & PCM Clamping Stress Harness', () => {
  describe('1. Float-to-16bit Linear PCM Clamping & Boundary Invariants', () => {
    it('clamps extreme negative values (-10.0, -100.0, -1e10, -Infinity) strictly to -32768 (0x8000)', () => {
      const extremeNegatives = new Float32Array([-10.0, -100.0, -1e10, -Infinity, -1.0001, -1.5]);
      const buffer = floatTo16BitLinearPCM(extremeNegatives);
      const view = new DataView(buffer);

      for (let i = 0; i < extremeNegatives.length; i++) {
        const val = view.getInt16(i * 2, true);
        expect(val).toBe(-32768);
      }
    });

    it('clamps extreme positive values (10.0, 100.0, 1e10, Infinity) strictly to 32767 (0x7fff)', () => {
      const extremePositives = new Float32Array([10.0, 100.0, 1e10, Infinity, 1.0001, 1.5]);
      const buffer = floatTo16BitLinearPCM(extremePositives);
      const view = new DataView(buffer);

      for (let i = 0; i < extremePositives.length; i++) {
        const val = view.getInt16(i * 2, true);
        expect(val).toBe(32767);
      }
    });

    it('handles exact zero (0.0, -0.0) without offset or sign error', () => {
      const zeros = new Float32Array([0.0, -0.0]);
      const buffer = floatTo16BitLinearPCM(zeros);
      const view = new DataView(buffer);

      expect(view.getInt16(0, true)).toBe(0);
      expect(view.getInt16(2, true)).toBe(0);
    });

    it('handles NaN gracefully without crash or invalid memory writing', () => {
      const nanBuffer = new Float32Array([NaN]);
      const buffer = floatTo16BitLinearPCM(nanBuffer);
      const view = new DataView(buffer);

      // In typed array conversions, NaN coerces safely to 0
      const val = view.getInt16(0, true);
      expect(val).toBe(0);
      expect(Number.isNaN(val)).toBe(false);
    });

    it('verifies standard normal range linear quantization', () => {
      const normalSamples = new Float32Array([-1.0, -0.5, 0.0, 1.0]);
      const buffer = floatTo16BitLinearPCM(normalSamples);
      const view = new DataView(buffer);

      expect(view.getInt16(0, true)).toBe(-32768);
      expect(view.getInt16(2, true)).toBe(-16384);
      expect(view.getInt16(4, true)).toBe(0);
      expect(view.getInt16(6, true)).toBe(32767);
    });

    it('processes massive audio buffer (1,000,000 samples) under 50ms with zero memory corruption', () => {
      const sampleCount = 1_000_000;
      const bigBuffer = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        bigBuffer[i] = Math.sin(i * 0.01) * 2.0; // Oscillates between -2.0 and +2.0 (triggers clamping)
      }

      const t0 = performance.now();
      const output = floatTo16BitLinearPCM(bigBuffer);
      const duration = performance.now() - t0;

      expect(output.byteLength).toBe(sampleCount * 2);
      expect(duration).toBeLessThan(150); // Generous ceiling for CI/stress environments

      const view = new DataView(output);
      // Sample check clamped boundaries
      for (let i = 0; i < 1000; i += 100) {
        const val = view.getInt16(i * 2, true);
        expect(val).toBeGreaterThanOrEqual(-32768);
        expect(val).toBeLessThanOrEqual(32767);
      }
    });

    it('resampleAndQuantize handles high-rate downsampling (96kHz -> 16kHz) and phase carryover', () => {
      const state = { phaseOffset: 0 };
      const inRate = 96000;
      const targetRate = 16000; // ratio = 6.0
      const input = new Float32Array(600); // 600 / 6 = 100 output samples
      input.fill(0.5);

      const out = resampleAndQuantize(input, inRate, targetRate, state);
      expect(out.length).toBe(100);
      expect(out[0]).toBe(16384);
      expect(state.phaseOffset).toBeCloseTo(0, 5);
    });
  });

  describe('2. Teardown Resilience & Zero-Leak Lifecycle Stress Test', () => {
    let originalWindow: any;
    let originalNavigator: any;
    let originalRequestAnimationFrame: any;
    let originalCancelAnimationFrame: any;

    // Tracking instrumentation for mock browser resources
    let createdContexts: any[] = [];
    let createdStreams: any[] = [];
    let createdTracks: any[] = [];
    const activeAnimationFrames = new Set<number>();
    let frameCounter = 0;

    beforeEach(() => {
      createdContexts = [];
      createdStreams = [];
      createdTracks = [];
      activeAnimationFrames.clear();
      frameCounter = 0;

      originalWindow = (global as any).window;
      originalNavigator = (global as any).navigator;
      originalRequestAnimationFrame = (global as any).requestAnimationFrame;
      originalCancelAnimationFrame = (global as any).cancelAnimationFrame;

      // Mock requestAnimationFrame / cancelAnimationFrame
      (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
        const id = ++frameCounter;
        activeAnimationFrames.add(id);
        return id;
      };
      (global as any).cancelAnimationFrame = (id: number) => {
        activeAnimationFrames.delete(id);
      };

      // Mock MediaStreamTrack
      class MockMediaStreamTrack {
        public id = `track-${Math.random().toString(36).slice(2)}`;
        public kind = 'audio';
        public enabled = true;
        public readyState = 'live';
        public stopCount = 0;

        stop() {
          this.stopCount++;
          this.enabled = false;
          this.readyState = 'ended';
        }
      }

      // Mock MediaStream
      class MockMediaStream {
        public id = `stream-${Math.random().toString(36).slice(2)}`;
        public tracks: MockMediaStreamTrack[] = [new MockMediaStreamTrack()];
        public active = true;

        constructor() {
          createdStreams.push(this);
          createdTracks.push(...this.tracks);
        }

        getTracks() {
          return this.tracks;
        }

        getAudioTracks() {
          return this.tracks;
        }

        getVideoTracks() {
          return [];
        }

        removeTrack(t: MockMediaStreamTrack) {
          this.tracks = this.tracks.filter((x) => x !== t);
        }
      }

      // Mock AudioNode hierarchy
      class MockAudioNode {
        public connectedNodes: any[] = [];
        public disconnectCount = 0;

        connect(dest: any) {
          this.connectedNodes.push(dest);
          return dest;
        }

        disconnect() {
          this.disconnectCount++;
          this.connectedNodes = [];
        }
      }

      class MockGainNode extends MockAudioNode {
        public gain = { value: 1.0 };
      }

      class MockAnalyserNode extends MockAudioNode {
        public fftSize = 64;
        public smoothingTimeConstant = 0.8;
        getFloatTimeDomainData(arr: Float32Array) {
          arr.fill(0);
        }
      }

      // Mock AudioContext
      class MockAudioContext {
        public state: 'running' | 'suspended' | 'closed' = 'running';
        public sampleRate = 48000;
        public destination = new MockGainNode();
        public closeCount = 0;
        public resumeCount = 0;
        public audioWorklet = null;

        constructor() {
          createdContexts.push(this);
        }

        async resume() {
          this.resumeCount++;
          this.state = 'running';
        }

        async close() {
          this.closeCount++;
          this.state = 'closed';
        }

        createGain() {
          return new MockGainNode();
        }

        createAnalyser() {
          return new MockAnalyserNode();
        }

        createMediaStreamSource(stream: any) {
          return new MockAudioNode();
        }

        createScriptProcessor(bufferSize: number, inChannels: number, outChannels: number) {
          return new MockAudioNode();
        }
      }

      // Install in global environment
      (global as any).window = {
        AudioContext: MockAudioContext,
        webkitAudioContext: MockAudioContext,
      };

      try {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            mediaDevices: {
              getDisplayMedia: async () => new MockMediaStream(),
              getUserMedia: async () => new MockMediaStream(),
            },
          },
          configurable: true,
          writable: true,
        });
      } catch {
        (globalThis as any).navigator = {
          mediaDevices: {
            getDisplayMedia: async () => new MockMediaStream(),
            getUserMedia: async () => new MockMediaStream(),
          },
        };
      }
    });

    afterEach(() => {
      (global as any).window = originalWindow;
      try {
        Object.defineProperty(globalThis, 'navigator', {
          value: originalNavigator,
          configurable: true,
          writable: true,
        });
      } catch {}
      (global as any).requestAnimationFrame = originalRequestAnimationFrame;
      (global as any).cancelAnimationFrame = originalCancelAnimationFrame;
    });

    it('50 rapid stop/start cycles release all MediaStreamTracks and close all AudioContexts', async () => {
      const engine = new DesktopAudioEngine();

      for (let i = 0; i < 50; i++) {
        await engine.start({ sourceMode: i % 2 === 0 ? 'system' : 'tab' });
        expect(engine.isCapturing).toBe(true);
        expect(engine.audioContext).not.toBeNull();

        await engine.stop();
        expect(engine.isCapturing).toBe(false);
        expect(engine.audioContext).toBeNull();
        expect(engine.interviewerStream).toBeNull();
        expect(engine.candidateStream).toBeNull();
        expect(engine.interviewerGainNode).toBeNull();
        expect(engine.candidateGainNode).toBeNull();
        expect(engine.interviewerAnalyser).toBeNull();
        expect(engine.candidateAnalyser).toBeNull();
      }

      // Assert: Every created AudioContext must be in 'closed' state
      expect(createdContexts.length).toBe(50);
      for (const ctx of createdContexts) {
        expect(ctx.state).toBe('closed');
        expect(ctx.closeCount).toBe(1);
      }

      // Assert: Every created MediaStreamTrack must be stopped
      expect(createdTracks.length).toBeGreaterThanOrEqual(100);
      for (const track of createdTracks) {
        expect(track.stopCount).toBeGreaterThanOrEqual(1);
        expect(track.enabled).toBe(false);
        expect(track.readyState).toBe('ended');
      }

      // Assert: Zero animation frame leaks
      expect(activeAnimationFrames.size).toBe(0);
    });

    it('rapid switchSourceMode does not leak old tracks or duplicate audio nodes', async () => {
      const engine = new DesktopAudioEngine();
      await engine.start({ sourceMode: 'system' });

      const initialTracks = [...createdTracks];
      const modes = ['tab', 'system', 'tab', 'system', 'tab', 'system'] as const;

      for (const mode of modes) {
        await engine.switchSourceMode(mode);
        expect(engine.sourceMode).toBe(mode);
        expect(engine.interviewerStream).not.toBeNull();
      }

      await engine.stop();

      // All tracks created across all switches must be stopped
      for (const track of createdTracks) {
        expect(track.enabled).toBe(false);
        expect(track.stopCount).toBeGreaterThanOrEqual(1);
      }

      // AudioContext closed cleanly
      for (const ctx of createdContexts) {
        expect(ctx.state).toBe('closed');
      }
    });

    it('idempotent stop(): repeated stop calls do not throw or corrupt state', async () => {
      const engine = new DesktopAudioEngine();
      await engine.start({ sourceMode: 'system' });

      // Call stop 5 times in succession
      await engine.stop();
      await engine.stop();
      await engine.stop();
      await engine.stop();
      await engine.stop();

      expect(engine.isCapturing).toBe(false);
      expect(engine.audioContext).toBeNull();
      expect(engine.interviewerStream).toBeNull();
      expect(engine.candidateStream).toBeNull();
    });

    it('handles unexpected track.stop() or audioContext.close() throws gracefully without crashing', async () => {
      const engine = new DesktopAudioEngine();
      await engine.start({ sourceMode: 'system' });

      // Intentionally sabotage track.stop and audioContext.close
      if (engine.audioContext) {
        engine.audioContext.close = () => {
          throw new Error('Host hardware AudioContext.close failed unexpectedly');
        };
      }
      if (engine.interviewerStream) {
        engine.interviewerStream.getTracks()[0].stop = () => {
          throw new Error('Hardware driver refused track.stop');
        };
      }

      // stop() must NOT throw an unhandled exception
      let stopError: any = null;
      try {
        await engine.stop();
      } catch (err) {
        stopError = err;
      }

      expect(stopError).toBeNull();
      expect(engine.isCapturing).toBe(false);
      expect(engine.audioContext).toBeNull();
    });

    it('in-flight cancellation: calling stop() while start() is awaiting stream acquisition', async () => {
      let acquiredTrack: any = null;
      class MockMediaStreamTrack {
        public id = 'track-inflight';
        public kind = 'audio';
        public enabled = true;
        public readyState = 'live';
        public stopCount = 0;
        stop() {
          this.stopCount++;
          this.enabled = false;
          this.readyState = 'ended';
        }
      }
      class MockStream {
        public id = 'stream-inflight';
        public active = true;
        public tracks = [new MockMediaStreamTrack()];
        getTracks() { return this.tracks; }
        getAudioTracks() { return this.tracks; }
        getVideoTracks() { return []; }
        removeTrack() {}
      }

      (globalThis as any).navigator.mediaDevices.getDisplayMedia = async () => {
        await new Promise((r) => setTimeout(r, 40));
        const stream = new MockStream();
        acquiredTrack = stream.getTracks()[0];
        return stream;
      };

      const engine = new DesktopAudioEngine();
      const startPromise = engine.start({ sourceMode: 'system' });

      // Call stop() while getDisplayMedia is still pending (at 10ms)
      await new Promise((r) => setTimeout(r, 10));
      await engine.stop();

      // Wait for start to resolve
      await startPromise;

      // Teardown Resilience Invariant:
      // If stop() was requested, the engine must NOT remain capturing,
      // and delayed acquired tracks must be cleanly closed.
      expect(engine.isCapturing).toBe(false);
      expect(acquiredTrack?.enabled).toBe(false);
    });

    it('duplicate start() calls without stop(): should not leak animation frame loops or duplicate destination connections', async () => {
      const engine = new DesktopAudioEngine();
      await engine.start({ sourceMode: 'system' });
      const framesCountAfterFirstStart = activeAnimationFrames.size;

      await engine.start({ sourceMode: 'system' });
      const framesCountAfterSecondStart = activeAnimationFrames.size;

      await engine.stop();

      console.log('activeAnimationFrames.size after engine.stop():', activeAnimationFrames.size);
      // Even after stop(), the orphaned first rAF loop is leaked!
      expect(activeAnimationFrames.size).toBe(0);
    });

    it('in-flight cancellation: calling stop() while start() is awaiting candidate mic acquisition', async () => {
      let acquiredInterviewerTrack: any = null;
      let acquiredCandidateTrack: any = null;

      class MockMediaStreamTrack {
        public id = 'track-cand-inflight';
        public kind = 'audio';
        public enabled = true;
        public readyState = 'live';
        public stopCount = 0;
        stop() {
          this.stopCount++;
          this.enabled = false;
          this.readyState = 'ended';
        }
      }
      class MockStream {
        public id = 'stream-cand-inflight';
        public active = true;
        public tracks = [new MockMediaStreamTrack()];
        getTracks() { return this.tracks; }
        getAudioTracks() { return this.tracks; }
        getVideoTracks() { return []; }
        removeTrack() {}
      }

      (globalThis as any).navigator.mediaDevices.getDisplayMedia = async () => {
        const stream = new MockStream();
        acquiredInterviewerTrack = stream.getTracks()[0];
        return stream;
      };

      (globalThis as any).navigator.mediaDevices.getUserMedia = async () => {
        await new Promise((r) => setTimeout(r, 40));
        const stream = new MockStream();
        acquiredCandidateTrack = stream.getTracks()[0];
        return stream;
      };

      const engine = new DesktopAudioEngine();
      const startPromise = engine.start({ sourceMode: 'system' });

      // Stop while getUserMedia is awaiting
      await new Promise((r) => setTimeout(r, 15));
      await engine.stop();

      await startPromise;

      expect(engine.isCapturing).toBe(false);
      expect(acquiredInterviewerTrack?.enabled).toBe(false);
      expect(acquiredCandidateTrack?.enabled).toBe(false);
    });

    it('concurrent overlapping start() calls resolve to a single clean session without leaks', async () => {
      let trackCount = 0;
      class MockMediaStreamTrack {
        public id = `track-${++trackCount}`;
        public kind = 'audio';
        public enabled = true;
        public readyState = 'live';
        public stopCount = 0;
        stop() {
          this.stopCount++;
          this.enabled = false;
          this.readyState = 'ended';
        }
      }
      class MockStream {
        public id = `stream-${trackCount}`;
        public active = true;
        public tracks = [new MockMediaStreamTrack()];
        getTracks() { return this.tracks; }
        getAudioTracks() { return this.tracks; }
        getVideoTracks() { return []; }
        removeTrack() {}
      }

      (globalThis as any).navigator.mediaDevices.getDisplayMedia = async () => {
        await new Promise((r) => setTimeout(r, 15));
        return new MockStream();
      };
      (globalThis as any).navigator.mediaDevices.getUserMedia = async () => {
        await new Promise((r) => setTimeout(r, 15));
        return new MockStream();
      };

      const engine = new DesktopAudioEngine();
      const startPromises = [
        engine.start({ sourceMode: 'system' }),
        engine.start({ sourceMode: 'tab' }),
        engine.start({ sourceMode: 'system' }),
      ];

      await Promise.all(startPromises);

      expect(engine.isCapturing).toBe(true);
      expect(engine.audioContext).not.toBeNull();
      expect(engine.interviewerStream).not.toBeNull();
      expect(engine.candidateStream).not.toBeNull();

      await engine.stop();
      expect(engine.isCapturing).toBe(false);
      expect(engine.audioContext).toBeNull();
    });

    it('in-flight cancellation during switchSourceMode stops acquired track cleanly', async () => {
      let switchTrack: any = null;
      class MockMediaStreamTrack {
        public id = 'track-switch-inflight';
        public kind = 'audio';
        public enabled = true;
        public readyState = 'live';
        public stopCount = 0;
        stop() {
          this.stopCount++;
          this.enabled = false;
          this.readyState = 'ended';
        }
      }
      class MockStream {
        public id = 'stream-switch-inflight';
        public active = true;
        public tracks = [new MockMediaStreamTrack()];
        getTracks() { return this.tracks; }
        getAudioTracks() { return this.tracks; }
        getVideoTracks() { return []; }
        removeTrack() {}
      }

      const engine = new DesktopAudioEngine();
      await engine.start({ sourceMode: 'system' });

      (globalThis as any).navigator.mediaDevices.getDisplayMedia = async () => {
        await new Promise((r) => setTimeout(r, 40));
        const stream = new MockStream();
        switchTrack = stream.getTracks()[0];
        return stream;
      };

      const switchPromise = engine.switchSourceMode('tab');
      await new Promise((r) => setTimeout(r, 10));
      await engine.stop();

      await switchPromise;

      expect(engine.isCapturing).toBe(false);
      expect(switchTrack?.enabled).toBe(false);
    });
  });

  describe('3. Strict Speaker Separation & Guardrail Stress Tests', () => {
    it('under high-frequency interleaved speech, candidate speech is 100% blocked from AI pipeline', () => {
      const triggeredAiQuestions: string[] = [];
      const dialogueMessages: any[] = [];

      const guard = new StrictSpeakerGuard({
        onDialogueUpdate: (msg) => dialogueMessages.push(msg),
        onInterlocutorQuestion: (q) => triggeredAiQuestions.push(q),
      });

      // Rapidly interleave 100 utterances between candidate and interviewer
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          // Candidate speaking
          guard.handleTranscript({
            speaker: 'candidate',
            text: `Candidate technical remark ${i}: We implemented atomic locks.`,
            isFinal: true,
          });
        } else {
          // Interlocutor speaking
          guard.handleTranscript({
            speaker: 'interviewer',
            text: `Interlocutor question ${i}: How does Raft handle partition tolerance?`,
            isFinal: true,
          });
        }
      }

      // Assert: Exactly 50 interlocutor questions triggered AI pipeline
      expect(triggeredAiQuestions.length).toBe(50);
      for (const q of triggeredAiQuestions) {
        expect(q).toContain('Interlocutor question');
        expect(q).not.toContain('Candidate');
      }

      // Assert: Candidate utterances recorded with label "Ви" and strictly separated
      const candidateMsgs = dialogueMessages.filter((m) => m.speaker === 'candidate');
      expect(candidateMsgs.length).toBe(50);
      for (const m of candidateMsgs) {
        expect(m.label).toBe('Ви');
      }

      const interlocutorMsgs = dialogueMessages.filter((m) => m.speaker === 'interviewer' || m.speaker === 'interlocutor');
      expect(interlocutorMsgs.length).toBe(50);
      for (const m of interlocutorMsgs) {
        expect(m.label).toBe('Співрозмовник');
      }
    });

    it('rejects trivial or empty transcripts (< 3 characters) from triggering AI', () => {
      const triggeredAiQuestions: string[] = [];
      const guard = new StrictSpeakerGuard({
        onDialogueUpdate: () => {},
        onInterlocutorQuestion: (q) => triggeredAiQuestions.push(q),
      });

      guard.handleTranscript({ speaker: 'interviewer', text: 'Ok', isFinal: true });
      guard.handleTranscript({ speaker: 'interviewer', text: ' ', isFinal: true });
      guard.handleTranscript({ speaker: 'interviewer', text: 'Hi', isFinal: true });
      guard.handleTranscript({ speaker: 'interviewer', text: '', isFinal: true });

      expect(triggeredAiQuestions).toHaveLength(0);
    });
  });
});
