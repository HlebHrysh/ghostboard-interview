/**
 * Mock Web Audio Graph & Linear PCM Resampling Harness
 * Simulates dual-channel audio separation: interviewer vs candidate.
 */

export type AudioSourceMode = 'tab' | 'system' | 'mic';

export interface MockAudioTrack {
  id: string;
  kind: 'audio';
  enabled: boolean;
  muted: boolean;
  stop: () => void;
}

export interface MockMediaStream {
  id: string;
  active: boolean;
  tracks: MockAudioTrack[];
  getAudioTracks: () => MockAudioTrack[];
}

export class MockGainNode {
  gain = { value: 1.0 };
  connectedNodes: any[] = [];

  connect(destination: any) {
    this.connectedNodes.push(destination);
    return destination;
  }

  disconnect() {
    this.connectedNodes = [];
  }
}

export class MockAnalyserNode {
  fftSize = 64;
  frequencyBinCount = 32;
  private simulatedVolume = 0;

  setVolume(vol: number) {
    this.simulatedVolume = Math.max(0, Math.min(100, vol));
  }

  getByteFrequencyData(array: Uint8Array) {
    const byteVal = Math.round((this.simulatedVolume / 100) * 255);
    for (let i = 0; i < array.length; i++) {
      array[i] = byteVal;
    }
  }

  getFloatTimeDomainData(array: Float32Array) {
    const amp = this.simulatedVolume / 100;
    for (let i = 0; i < array.length; i++) {
      array[i] = amp * Math.sin((i / array.length) * Math.PI * 2);
    }
  }

  calculateRMS(): number {
    return this.simulatedVolume;
  }
}

/**
 * Resamples Float32 audio samples into 16-bit linear PCM (signed little-endian)
 * Clamps values outside [-1.0, 1.0] to prevent overflow distortion.
 */
export function floatTo16BitLinearPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const clamped = Math.max(-1.0, Math.min(1.0, input[i]));
    const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(i * 2, int16, true); // little-endian
  }
  return buffer;
}

export class MockDualAudioCaptureEngine {
  sourceMode: AudioSourceMode = 'system';
  interviewerGain: MockGainNode;
  candidateGain: MockGainNode;
  interviewerAnalyser: MockAnalyserNode;
  candidateAnalyser: MockAnalyserNode;
  interviewerStream: MockMediaStream | null = null;
  candidateStream: MockMediaStream | null = null;
  isCapturing = false;

  constructor() {
    this.interviewerGain = new MockGainNode();
    this.candidateGain = new MockGainNode();
    this.interviewerAnalyser = new MockAnalyserNode();
    this.candidateAnalyser = new MockAnalyserNode();

    this.interviewerGain.connect(this.interviewerAnalyser);
    this.candidateGain.connect(this.candidateAnalyser);
  }

  start(mode: AudioSourceMode = 'system') {
    this.sourceMode = mode;
    this.interviewerStream = this.createMockStream('interviewer-stream-1');
    this.candidateStream = this.createMockStream('candidate-mic-stream-1');
    this.isCapturing = true;
  }

  switchSourceMode(newMode: AudioSourceMode) {
    if (this.sourceMode === newMode) return;
    // Teardown old interviewer stream
    if (this.interviewerStream) {
      this.interviewerStream.tracks.forEach((t) => t.stop());
      this.interviewerGain.disconnect();
    }
    // Re-initialize with new mode
    this.sourceMode = newMode;
    this.interviewerStream = this.createMockStream(`interviewer-stream-${newMode}`);
    this.interviewerGain.connect(this.interviewerAnalyser);
  }

  stop() {
    this.interviewerStream?.tracks.forEach((t) => t.stop());
    this.candidateStream?.tracks.forEach((t) => t.stop());
    this.interviewerStream = null;
    this.candidateStream = null;
    this.interviewerGain.disconnect();
    this.candidateGain.disconnect();
    this.isCapturing = false;
  }

  simulateInterviewerAudio(volumePercent: number, samples?: Float32Array): ArrayBuffer {
    this.interviewerAnalyser.setVolume(volumePercent);
    const audioData = samples || new Float32Array([0.1, 0.4, 0.8, -0.2, -0.7]);
    return floatTo16BitLinearPCM(audioData);
  }

  simulateCandidateAudio(volumePercent: number, samples?: Float32Array): ArrayBuffer {
    this.candidateAnalyser.setVolume(volumePercent);
    const audioData = samples || new Float32Array([0.05, 0.2, 0.3, -0.1, -0.2]);
    return floatTo16BitLinearPCM(audioData);
  }

  private createMockStream(id: string): MockMediaStream {
    const track: MockAudioTrack = {
      id: `${id}-track`,
      kind: 'audio',
      enabled: true,
      muted: false,
      stop: () => {
        track.enabled = false;
      },
    };
    return {
      id,
      active: true,
      tracks: [track],
      getAudioTracks: () => [track],
    };
  }
}
