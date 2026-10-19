/**
 * Mock Deepgram Nova-3 WebSocket Protocol Simulator
 * Simulates real-time STT streaming, keep-alives, endpointing, and speaker tags.
 */

export interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words?: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

export interface DeepgramMessage {
  type: 'Results' | 'Metadata';
  channel_index?: number[];
  duration?: number;
  start?: number;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: DeepgramChannel;
}

export type SpeakerRole = 'interviewer' | 'candidate';

export interface SpeechTranscriptEvent {
  speaker: SpeakerRole;
  text: string;
  isFinal: boolean;
  speechFinal: boolean;
  confidence: number;
}

export class MockDeepgramLiveClient {
  isConnected = false;
  receivedFramesCount = 0;
  receivedKeepAlives = 0;
  listeners: ((event: SpeechTranscriptEvent) => void)[] = [];
  disconnectListeners: (() => void)[] = [];

  connect(apiKey: string, subprotocol: string = 'token') {
    if (!apiKey) {
      throw new Error('Deepgram API key missing');
    }
    this.isConnected = true;
  }

  sendAudioChunk(pcmBuffer: ArrayBuffer) {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }
    this.receivedFramesCount++;
  }

  sendKeepAlive() {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }
    this.receivedKeepAlives++;
  }

  onTranscript(callback: (event: SpeechTranscriptEvent) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  onDisconnect(callback: () => void) {
    this.disconnectListeners.push(callback);
  }

  /**
   * Helper to simulate speech arrival from either speaker
   */
  emitSpeech(speaker: SpeakerRole, text: string, isFinal = true, speechFinal = true, confidence = 0.98) {
    const event: SpeechTranscriptEvent = {
      speaker,
      text,
      isFinal,
      speechFinal,
      confidence,
    };
    this.listeners.forEach((cb) => cb(event));
  }

  disconnect() {
    this.isConnected = false;
    this.disconnectListeners.forEach((cb) => cb());
  }
}
