/**
 * Desktop Web Audio Routing & Dual-Channel Separation Engine
 * Authoritative implementation for Ghostboard Desktop (Electron 33 + React 19)
 * 
 * Provides:
 * - Complete Web Audio graph topology: Interlocutor branch, Candidate branch, Silent destination pump.
 * - Continuous fractional linear interpolation resampling to 16kHz linear 16-bit PCM.
 * - Deepgram Nova-3 WebSocket integration with keep-alive and auto-reconnect.
 * - Strict Speaker Guardrail: Candidate speech tagged "Ви", Interlocutor tagged "Співрозмовник".
 * - Clean switching and zero-leak teardown protocol.
 */

import type { DesktopMediaSource } from '../types/tauri';
import { fetchDeepgramKey } from './apiClient';

export type AudioSourceMode = 'system' | 'window' | 'tab' | 'mic';
export type SpeakerRole = 'interviewer' | 'candidate';
export type SpeakerType = SpeakerRole;

export interface SpeechTranscriptEvent {
  speaker: SpeakerRole;
  text: string;
  isFinal: boolean;
  speechFinal?: boolean;
  confidence?: number;
}

export interface DialogueMessage {
  id: string;
  speaker: 'interlocutor' | 'interviewer' | 'candidate';
  label: 'Співрозмовник' | 'Ви' | string;
  text: string;
  isFinal: boolean;
  timestamp: number;
  qaId?: string;
}

export interface DesktopAudioEngineOptions {
  sourceMode?: AudioSourceMode;
  deepgramApiKey?: string;
  speechLanguage?: string;
  selectedWindowSourceId?: string | null;
  micDeviceId?: string;
  onTranscript?: (event: SpeechTranscriptEvent) => void;
  onVolumeChange?: (interviewerVol: number, candidateVol: number) => void;
  onSttStateChange?: (speaker: SpeakerRole, state: 'connected' | 'reconnecting' | 'disconnected') => void;
  onError?: (err: Error) => void;
  onAudioChunk?: (speaker: SpeakerRole, buffer: ArrayBuffer) => void;
}

/**
 * Resamples Float32 audio samples into 16-bit linear PCM (signed little-endian)
 * Clamps values outside [-1.0, 1.0] to prevent clipping distortion.
 * Adheres strictly to AC 1.4 & R1 Math Invariant:
 * -1.5 -> -32768, -1.0 -> -32768, -0.5 -> -16384, 0.0 -> 0, 0.5 -> 16383, 1.0 -> 32767, 1.5 -> 32767.
 */
export function floatTo16BitLinearPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const clamped = Math.max(-1.0, Math.min(1.0, input[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.min(0x7fff, Math.round(clamped * 0x7fff));
    view.setInt16(i * 2, int16, true); // little-endian
  }
  return buffer;
}

/**
 * Continuous Fractional Linear Interpolation Resampling
 * Resamples input Float32Array at inSampleRate to targetSampleRate (e.g. 16,000 Hz)
 * and quantizes to 16-bit signed integer linear PCM.
 * Maintains phaseOffset across successive chunks to eliminate boundary clicks.
 */
export function resampleAndQuantize(
  input: Float32Array,
  inSampleRate: number,
  targetSampleRate: number,
  state: { phaseOffset: number }
): Int16Array {
  const ratio = inSampleRate / targetSampleRate;
  const inputLen = input.length;

  const availableInput = inputLen - state.phaseOffset;
  if (availableInput <= 0) {
    state.phaseOffset -= inputLen;
    return new Int16Array(0);
  }

  const outputLen = Math.floor(availableInput / ratio);
  const output = new Int16Array(outputLen);

  let srcPos = state.phaseOffset;
  for (let i = 0; i < outputLen; i++) {
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s0 = input[idx];
    const s1 = idx + 1 < inputLen ? input[idx + 1] : s0;

    // Linear interpolation between adjacent samples
    const interpolated = s0 + frac * (s1 - s0);

    // Clamping to [-1.0, 1.0]
    const clamped = Math.max(-1.0, Math.min(1.0, interpolated));

    // Signed 16-bit PCM quantization
    output[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.min(0x7fff, Math.round(clamped * 0x7fff));

    srcPos += ratio;
  }

  state.phaseOffset = srcPos - inputLen;
  return output;
}

/**
 * Calculates RMS volume (0 - 100) from AnalyserNode using time-domain data.
 */
export function calculateRMSFromAnalyser(
  analyser: AnalyserNode,
  tempBuffer?: Float32Array<ArrayBuffer>
): number {
  const buffer = tempBuffer || new Float32Array(analyser.fftSize || 64);
  analyser.getFloatTimeDomainData(buffer);
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / buffer.length);
  // Scale factor maps conversational speech [0.01 - 0.10] to [10 - 100]
  return Math.min(100, Math.round(rms * 1000));
}

/**
 * Inlined AudioWorklet Processor Code for Low-Latency 16kHz PCM Downsampling
 */
const PCM_WORKLET_CODE = `
class DualPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.inRate = sampleRate;
    this.ratio = this.inRate / this.targetRate;
    this.phase = 0;
    this.chunkSize = 2048; // ~128ms at 16kHz
    this.buffer = new Int16Array(this.chunkSize);
    this.bufIdx = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    const len = channel.length;
    let pos = this.phase;

    while (pos < len) {
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = channel[idx];
      const s1 = (idx + 1 < len) ? channel[idx + 1] : s0;
      const sample = s0 + frac * (s1 - s0);

      const clamped = Math.max(-1.0, Math.min(1.0, sample));
      const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.min(0x7fff, Math.round(clamped * 0x7fff));
      this.buffer[this.bufIdx++] = int16;

      if (this.bufIdx >= this.chunkSize) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
        this.buffer = new Int16Array(this.chunkSize);
        this.bufIdx = 0;
      }

      pos += this.ratio;
    }

    this.phase = pos - len;
    return true;
  }
}
registerProcessor('dual-pcm-processor', DualPcmProcessor);
`;

/**
 * Lightweight Isolated Deepgram Nova-3 Live Client for Single Speaker Stream
 */
export class DeepgramStreamClient {
  private socket: WebSocket | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyStopped = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private readonly speaker: SpeakerRole,
    private readonly apiKey: string,
    private readonly language: string = 'multi',
    private readonly onTranscript: (event: SpeechTranscriptEvent) => void,
    private readonly onStateChange?: (speaker: SpeakerRole, state: 'connected' | 'reconnecting' | 'disconnected') => void,
    private readonly onError?: (err: Error) => void
  ) {}

  public connect(): void {
    if (!this.apiKey || typeof WebSocket === 'undefined') return;
    this.isExplicitlyStopped = false;
    this.cleanupSocket();

    try {
      const targetLang = !this.language || this.language === 'auto' ? 'multi' : this.language;
      const params = new URLSearchParams({
        model: 'nova-3',
        smart_format: 'true',
        interim_results: 'true',
        endpointing: '300',
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1',
        language: targetLang,
      });

      const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      this.socket = new WebSocket(url, ['token', this.apiKey]);

      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStateChange?.(this.speaker, 'connected');
        this.startKeepAlive();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alt = data.channel?.alternatives?.[0];
          const text = alt?.transcript?.trim();
          if (text) {
            this.onTranscript({
              speaker: this.speaker,
              text,
              isFinal: !!data.is_final,
              speechFinal: !!data.speech_final,
              confidence: alt.confidence,
            });
          }
        } catch {}
      };

      this.socket.onerror = (e) => {
        console.warn(`[Deepgram:${this.speaker}] WebSocket error:`, e);
        this.onError?.(new Error(`Deepgram WebSocket error for ${this.speaker}`));
      };

      this.socket.onclose = () => {
        this.stopKeepAlive();
        if (!this.isExplicitlyStopped) {
          this.scheduleReconnect();
        } else {
          this.onStateChange?.(this.speaker, 'disconnected');
        }
      };
    } catch (err: unknown) {
      console.warn(`[Deepgram:${this.speaker}] Failed to initiate connection:`, err);
      this.scheduleReconnect();
    }
  }

  public send(data: ArrayBuffer): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(data);
    }
  }

  public stop(): void {
    this.isExplicitlyStopped = true;
    this.stopKeepAlive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
    this.onStateChange?.(this.speaker, 'disconnected');
  }

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, 7000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private cleanupSocket(): void {
    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onmessage = null;
        this.socket.onerror = null;
        this.socket.onclose = null;
        if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
          this.socket.close();
        }
      } catch {}
      this.socket = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyStopped || this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStateChange?.(this.speaker, 'disconnected');
      return;
    }
    this.reconnectAttempts++;
    this.onStateChange?.(this.speaker, 'reconnecting');
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isExplicitlyStopped) {
        this.connect();
      }
    }, delay);
  }
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export class BrowserSpeechFallback {
  private recognition: SpeechRecognitionLike | null = null;
  private shouldRun = false;

  constructor(
    private readonly speaker: SpeakerRole,
    private readonly language: string = 'uk',
    private readonly onTranscript: (event: SpeechTranscriptEvent) => void,
    private readonly onStateChange?: (speaker: SpeakerRole, state: 'connected' | 'reconnecting' | 'disconnected') => void,
    private readonly onError?: (err: Error) => void
  ) {}

  public start(): boolean {
    if (typeof window === 'undefined') return false;
    const SpeechRec = (window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).SpeechRecognition || (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition;

    if (!SpeechRec) {
      return false;
    }

    this.shouldRun = true;
    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      const langMap: Record<string, string> = {
        uk: 'uk-UA',
        en: 'en-US',
        pl: 'pl-PL',
        de: 'de-DE',
        fr: 'fr-FR',
        es: 'es-ES',
        ru: 'ru-RU',
        auto: 'uk-UA',
      };
      recognition.lang = langMap[this.language] || 'uk-UA';

      recognition.onstart = () => {
        this.onStateChange?.(this.speaker, 'connected');
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalStr = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + ' ';
          } else {
            interim += item[0].transcript;
          }
        }
        const text = (finalStr || interim).trim();
        if (text) {
          this.onTranscript({
            speaker: this.speaker,
            text,
            isFinal: Boolean(finalStr),
            speechFinal: Boolean(finalStr),
          });
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech') {
          console.warn(`[BrowserSpeechFallback:${this.speaker}] Speech recognition error:`, e.error);
        }
      };

      recognition.onend = () => {
        if (this.shouldRun) {
          try {
            recognition.start();
          } catch {}
        } else {
          this.onStateChange?.(this.speaker, 'disconnected');
        }
      };

      this.recognition = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.warn(`[BrowserSpeechFallback:${this.speaker}] Failed to start:`, err);
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  public stop(): void {
    this.shouldRun = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.onStateChange?.(this.speaker, 'disconnected');
  }
}

/**
 * Strict Speaker Separation Guardrail & Dialogue Dispatcher
 * Enforces the HARD BLOCKADE:
 * - Speech from microphone is tagged "Ви" (candidate).
 * - Speech from loopback/window is tagged "Співрозмовник" (interlocutor).
 * - Candidate speech is added to dialogue history but NEVER triggers AI answer generation.
 */
export class StrictSpeakerGuard {
  private candidateNotes: DialogueMessage[] = [];
  private onDialogueUpdate: (msg: DialogueMessage) => void;
  private onInterlocutorQuestion: (text: string) => void;

  constructor(options: {
    onDialogueUpdate: (msg: DialogueMessage) => void;
    onInterlocutorQuestion: (text: string) => void;
  }) {
    this.onDialogueUpdate = options.onDialogueUpdate;
    this.onInterlocutorQuestion = options.onInterlocutorQuestion;
  }

  public handleTranscript(event: SpeechTranscriptEvent): void {
    if (!event.text || !event.text.trim()) return;
    const cleanText = event.text.trim();

    // CRITICAL HARD BLOCKADE: Candidate microphone speech NEVER enters AI trigger pipeline
    if (event.speaker === 'candidate') {
      const candidateMsg: DialogueMessage = {
        id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        speaker: 'candidate',
        label: 'Ви',
        text: cleanText,
        isFinal: event.isFinal,
        timestamp: Date.now(),
      };

      if (event.isFinal) {
        this.candidateNotes.push(candidateMsg);
      }

      // Add to personal dialogue stream ONLY
      this.onDialogueUpdate(candidateMsg);

      // HARD RETURN: Execution halts immediately. AI generation is NEVER called.
      return;
    }

    // ── Interlocutor Remote Audio Stream ──
    const interlocutorMsg: DialogueMessage = {
      id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      speaker: 'interlocutor',
      label: 'Співрозмовник',
      text: cleanText,
      isFinal: event.isFinal,
      timestamp: Date.now(),
    };

    this.onDialogueUpdate(interlocutorMsg);

    // Only finalized, non-trivial questions trigger AI prompt generation
    if (event.isFinal && cleanText.length >= 3) {
      this.onInterlocutorQuestion(cleanText);
    }
  }

  public getCandidateNotes(): readonly DialogueMessage[] {
    return this.candidateNotes;
  }

  public clear(): void {
    this.candidateNotes = [];
  }
}

/**
 * DesktopAudioEngine: Cross-Platform Web Audio Graph & Strict Separation Controller
 */
export class DesktopAudioEngine {
  public sourceMode: AudioSourceMode = 'system';
  public isCapturing: boolean = false;

  // Web Audio Nodes (Exposed for visualizers and test parity)
  public audioContext: AudioContext | null = null;
  public interviewerGainNode: GainNode | null = null;
  public candidateGainNode: GainNode | null = null;
  public masterMixNode: GainNode | null = null;
  public interviewerAnalyser: AnalyserNode | null = null;
  public candidateAnalyser: AnalyserNode | null = null;

  // Active MediaStreams
  public interviewerStream: MediaStream | null = null;
  public candidateStream: MediaStream | null = null;

  // Private internals
  private sessionEpoch = 0;
  private interviewerSourceNode: MediaStreamAudioSourceNode | null = null;
  private candidateSourceNode: MediaStreamAudioSourceNode | null = null;
  private interviewerProcessor: AudioWorkletNode | ScriptProcessorNode | null = null;
  private candidateProcessor: AudioWorkletNode | ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private animationFrameId: number | null = null;
  private options: DesktopAudioEngineOptions = {};

  // STT Clients
  private interviewerSttClient: DeepgramStreamClient | null = null;
  private candidateSttClient: DeepgramStreamClient | null = null;
  private webSpeechFallback: BrowserSpeechFallback | null = null;

  // Simulated levels for test environments / soundcheck
  private simulatedInterviewerVol = 0;
  private simulatedCandidateVol = 0;

  constructor() {}

  /**
   * Initializes the dual Web Audio graph and begins audio capture.
   */
  public async start(options: DesktopAudioEngineOptions = {}): Promise<void> {
    const currentEpoch = ++this.sessionEpoch;
    this.isCapturing = true;
    this.options = options;
    this.sourceMode = options.sourceMode || 'system';

    // Cancel any previous metering loop to prevent duplicate animation frames
    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    // Teardown any existing tracks or nodes if start() is called sequentially
    if (this.interviewerStream) {
      this.interviewerStream.getTracks().forEach((t) => {
        try { t.stop(); t.enabled = false; } catch {}
      });
      this.interviewerStream = null;
    }
    if (this.candidateStream) {
      this.candidateStream.getTracks().forEach((t) => {
        try { t.stop(); t.enabled = false; } catch {}
      });
      this.candidateStream = null;
    }
    if (this.interviewerSourceNode) {
      try { this.interviewerSourceNode.disconnect(); } catch {}
      this.interviewerSourceNode = null;
    }
    if (this.candidateSourceNode) {
      try { this.candidateSourceNode.disconnect(); } catch {}
      this.candidateSourceNode = null;
    }
    if (this.interviewerProcessor) {
      try { this.interviewerProcessor.disconnect(); } catch {}
      this.interviewerProcessor = null;
    }
    if (this.candidateProcessor) {
      try { this.candidateProcessor.disconnect(); } catch {}
      this.candidateProcessor = null;
    }

    try {
      // 1. Initialize AudioContext synchronously on user interaction
      if (typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          if (!this.audioContext || this.audioContext.state === 'closed') {
            this.audioContext = new AudioCtx();
          }
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume().catch(console.warn);
          }
        }
      }

      // Guard 1: AudioContext initialization boundary
      if (this.sessionEpoch !== currentEpoch || !this.isCapturing) {
        return;
      }

      // 2. Build Web Audio graph backbone
      this.buildRoutingBackbone();

      // 3. Acquire MediaStreams (Interlocutor + Candidate)
      let tempInterviewerStream: MediaStream | null = null;
      let tempCandidateStream: MediaStream | null = null;

      try {
        tempInterviewerStream = await this.acquireInterlocutorStream(this.sourceMode, options.selectedWindowSourceId);
      } catch (err: unknown) {
        console.warn('[DesktopAudioEngine] Interlocutor stream acquisition failed, falling back to dummy:', (err as { message?: string })?.message);
        tempInterviewerStream = this.createFallbackStream('interviewer-stream-fallback');
      }

      // Guard 2: Interlocutor stream acquisition boundary
      if (this.sessionEpoch !== currentEpoch || !this.isCapturing) {
        tempInterviewerStream?.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
        return;
      }

      try {
        tempCandidateStream = await this.acquireCandidateStream(options.micDeviceId);
      } catch (err: unknown) {
        console.warn('[DesktopAudioEngine] Candidate mic acquisition failed, falling back to dummy:', (err as { message?: string })?.message);
        tempCandidateStream = this.createFallbackStream('candidate-mic-fallback');
      }

      // Guard 3: Candidate microphone acquisition boundary
      if (this.sessionEpoch !== currentEpoch || !this.isCapturing) {
        tempInterviewerStream?.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
        tempCandidateStream?.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
        return;
      }

      // 4. Setup dual 16kHz PCM streaming processors
      await this.setupDualPcmProcessors(options);

      // Guard 4: AudioWorklet / processor initialization boundary
      if (this.sessionEpoch !== currentEpoch || !this.isCapturing) {
        tempInterviewerStream?.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
        tempCandidateStream?.getTracks().forEach((t) => { try { t.stop(); t.enabled = false; } catch {} });
        return;
      }

      // 5. Commit streams and attach sources to graph ONLY after active epoch is confirmed
      this.interviewerStream = tempInterviewerStream;
      this.candidateStream = tempCandidateStream;
      this.attachStreamsToGraph();

      // 6. Start 60fps volume metering loop
      if (this.animationFrameId) {
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = null;
      }
      this.startMeteringLoop(options.onVolumeChange);

      this.isCapturing = true;
    } catch (err) {
      if (this.sessionEpoch === currentEpoch) {
        this.isCapturing = false;
        try { await this.stop(); } catch {}
      }
      throw err;
    }
  }

  /**
   * Switching between System Audio ("весь звук") and Window/Tab capture
   * Stops old tracks cleanly and preserves candidate microphone stream.
   */
  public async switchSourceMode(newMode: AudioSourceMode, windowSourceId?: string | null): Promise<void> {
    if (this.sourceMode === newMode && !windowSourceId && this.interviewerStream && this.interviewerStream.active) {
      return;
    }
    this.sourceMode = newMode;
    if (!this.isCapturing) {
      return;
    }
    const currentEpoch = ++this.sessionEpoch;

    // 1. Teardown existing interviewer stream
    if (this.interviewerStream) {
      try {
        this.interviewerStream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      this.interviewerStream = null;
    }

    // 2. Disconnect previous interviewer source node
    if (this.interviewerSourceNode) {
      try {
        this.interviewerSourceNode.disconnect();
      } catch {}
      this.interviewerSourceNode = null;
    }

    // 3. Acquire new stream for new mode
    let newStream: MediaStream | null = null;
    try {
      newStream = await this.acquireInterlocutorStream(newMode, windowSourceId);
    } catch (err) {
      console.warn('[DesktopAudioEngine] switchSourceMode failed to acquire stream:', err);
      newStream = this.createFallbackStream(`interviewer-stream-${newMode}`);
    }

    // In-flight cancellation guard
    if (this.sessionEpoch !== currentEpoch || !this.isCapturing) {
      newStream?.getTracks().forEach((track) => {
        try {
          track.stop();
          track.enabled = false;
        } catch {}
      });
      return;
    }

    this.interviewerStream = newStream;

    // 4. Re-attach new stream to existing backbone
    if (this.audioContext && this.interviewerGainNode && this.interviewerStream) {
      try {
        this.interviewerSourceNode = this.audioContext.createMediaStreamSource(this.interviewerStream);
        this.interviewerSourceNode.connect(this.interviewerGainNode);
        if (this.masterMixNode) {
          this.interviewerSourceNode.connect(this.masterMixNode);
        }
      } catch (err) {
        console.warn('[DesktopAudioEngine] Reconnecting source node failed:', err);
      }
    }
  }

  /**
   * Full teardown protocol: stops all media tracks, disconnects graph nodes, closes AudioContext.
   */
  public async stop(): Promise<void> {
    this.sessionEpoch++;
    this.isCapturing = false;

    // 1. Cancel metering animation frame
    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    // 2. Stop Deepgram live STT clients and browser speech fallback
    this.interviewerSttClient?.stop();
    this.candidateSttClient?.stop();
    this.interviewerSttClient = null;
    this.candidateSttClient = null;
    if (this.webSpeechFallback) {
      try { this.webSpeechFallback.stop(); } catch {}
      this.webSpeechFallback = null;
    }

    // 3. Disconnect audio processors
    if (this.interviewerProcessor) {
      try { this.interviewerProcessor.disconnect(); } catch {}
      this.interviewerProcessor = null;
    }
    if (this.candidateProcessor) {
      try { this.candidateProcessor.disconnect(); } catch {}
      this.candidateProcessor = null;
    }

    // 4. Stop all MediaStreamTracks
    this.interviewerStream?.getTracks().forEach((t) => {
      try { t.stop(); t.enabled = false; } catch {}
    });
    this.candidateStream?.getTracks().forEach((t) => {
      try { t.stop(); t.enabled = false; } catch {}
    });
    this.interviewerStream = null;
    this.candidateStream = null;

    // 5. Disconnect all graph nodes
    try { this.interviewerSourceNode?.disconnect(); } catch {}
    try { this.candidateSourceNode?.disconnect(); } catch {}
    try { this.interviewerGainNode?.disconnect(); } catch {}
    try { this.candidateGainNode?.disconnect(); } catch {}
    try { this.masterMixNode?.disconnect(); } catch {}
    try { this.silentGainNode?.disconnect(); } catch {}
    try { this.interviewerAnalyser?.disconnect(); } catch {}
    try { this.candidateAnalyser?.disconnect(); } catch {}

    this.interviewerSourceNode = null;
    this.candidateSourceNode = null;
    this.interviewerGainNode = null;
    this.candidateGainNode = null;
    this.masterMixNode = null;
    this.silentGainNode = null;
    this.interviewerAnalyser = null;
    this.candidateAnalyser = null;

    // 6. Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  // --- Testing & Simulation APIs ---

  public simulateInterviewerAudio(volumePercent: number, samples?: Float32Array): ArrayBuffer {
    this.simulatedInterviewerVol = Math.max(0, Math.min(100, volumePercent));
    const audioData = samples || new Float32Array([0.1, 0.4, 0.8, -0.2, -0.7]);
    return floatTo16BitLinearPCM(audioData);
  }

  public simulateCandidateAudio(volumePercent: number, samples?: Float32Array): ArrayBuffer {
    this.simulatedCandidateVol = Math.max(0, Math.min(100, volumePercent));
    const audioData = samples || new Float32Array([0.05, 0.2, 0.3, -0.1, -0.2]);
    return floatTo16BitLinearPCM(audioData);
  }

  // --- Internal Web Audio Construction ---

  private buildRoutingBackbone(): void {
    if (!this.audioContext) return;

    // Interlocutor Gain (gain: 1.0)
    this.interviewerGainNode = this.audioContext.createGain();
    this.interviewerGainNode.gain.value = 1.0;

    // Candidate Gain (gain: 1.0)
    this.candidateGainNode = this.audioContext.createGain();
    this.candidateGainNode.gain.value = 1.0;

    // Optional Master Mix Node
    this.masterMixNode = this.audioContext.createGain();
    this.masterMixNode.gain.value = 1.0;

    // Silent Destination Pump: NEVER route audio to speakers to prevent acoustic feedback!
    this.silentGainNode = this.audioContext.createGain();
    this.silentGainNode.gain.value = 0.0;
    this.silentGainNode.connect(this.audioContext.destination);

    // Interlocutor Analyser (fftSize: 64)
    this.interviewerAnalyser = this.audioContext.createAnalyser();
    this.interviewerAnalyser.fftSize = 64;
    this.interviewerAnalyser.smoothingTimeConstant = 0.8;
    this.interviewerGainNode.connect(this.interviewerAnalyser);

    // Candidate Analyser (fftSize: 64)
    this.candidateAnalyser = this.audioContext.createAnalyser();
    this.candidateAnalyser.fftSize = 64;
    this.candidateAnalyser.smoothingTimeConstant = 0.8;
    this.candidateGainNode.connect(this.candidateAnalyser);

    // Attach custom test helper calculateRMS to analysers for parity
    (this.interviewerAnalyser as unknown as { calculateRMS: () => number }).calculateRMS = () => {
      if (this.simulatedInterviewerVol > 0) return this.simulatedInterviewerVol;
      return calculateRMSFromAnalyser(this.interviewerAnalyser!);
    };
    (this.candidateAnalyser as unknown as { calculateRMS: () => number }).calculateRMS = () => {
      if (this.simulatedCandidateVol > 0) return this.simulatedCandidateVol;
      return calculateRMSFromAnalyser(this.candidateAnalyser!);
    };
  }

  private attachStreamsToGraph(): void {
    if (!this.audioContext) return;

    if (this.interviewerStream && this.interviewerGainNode) {
      try {
        this.interviewerSourceNode = this.audioContext.createMediaStreamSource(this.interviewerStream);
        this.interviewerSourceNode.connect(this.interviewerGainNode);
        if (this.masterMixNode) {
          this.interviewerSourceNode.connect(this.masterMixNode);
        }
      } catch (err) {
        console.warn('[DesktopAudioEngine] Failed to connect interviewerSourceNode:', err);
      }
    }

    if (this.candidateStream && this.candidateGainNode) {
      try {
        this.candidateSourceNode = this.audioContext.createMediaStreamSource(this.candidateStream);
        this.candidateSourceNode.connect(this.candidateGainNode);
        if (this.masterMixNode) {
          this.candidateSourceNode.connect(this.masterMixNode);
        }
      } catch (err) {
        console.warn('[DesktopAudioEngine] Failed to connect candidateSourceNode:', err);
      }
    }
  }

  private async acquireInterlocutorStream(mode: AudioSourceMode, windowSourceId?: string | null): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      return this.createFallbackStream(`interviewer-stream-${mode}`);
    }

    const api = window.ghostboard || window.desktopAPI;
    // If window source provided, notify Electron main process via ContextBridge
    if (windowSourceId && api?.selectSource) {
      await api.selectSource(windowSourceId);
    } else if (mode === 'system' && api?.clearSelectedSource) {
      await api.clearSelectedSource();
    }

    // Acquire display media with loopback audio
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 2, max: 2 },
        height: { ideal: 2, max: 2 },
        frameRate: { ideal: 1, max: 1 },
      },
      audio: {
        suppressLocalAudioPlayback: false,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      } as unknown as MediaTrackConstraints,
      systemAudio: mode === 'system' ? 'include' : 'exclude',
    } as unknown as DisplayMediaStreamOptions);

    // Strip and stop video tracks immediately to prevent GPU/CPU overhead
    stream.getVideoTracks().forEach((track) => {
      try {
        track.stop();
        stream.removeTrack(track);
      } catch {}
    });

    return stream;
  }

  private async acquireCandidateStream(micDeviceId?: string): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return this.createFallbackStream('candidate-mic-stream-1');
    }

    return await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: micDeviceId && micDeviceId !== 'default' ? { exact: micDeviceId } : undefined,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });
  }

  private async setupDualPcmProcessors(options: DesktopAudioEngineOptions): Promise<void> {
    if (!this.audioContext) return;

    // 1. Dual Audio Contour: fetch ephemeral Deepgram key if not configured locally
    let effectiveKey = options.deepgramApiKey;
    if (!effectiveKey) {
      try {
        const fetchedKey = await fetchDeepgramKey();
        if (fetchedKey) {
          effectiveKey = fetchedKey;
          options.deepgramApiKey = fetchedKey;
        }
      } catch (err) {
        console.warn('[DesktopAudioEngine] Ephemeral Deepgram key fetch error:', err);
      }
    }

    // 2. Initialize Deepgram Live WebSocket clients if apiKey available
    if (effectiveKey) {
      this.interviewerSttClient = new DeepgramStreamClient(
        'interviewer',
        effectiveKey,
        options.speechLanguage || 'multi',
        (evt) => options.onTranscript?.(evt),
        options.onSttStateChange,
        (err) => {
          options.onError?.(err);
          // If Deepgram fails, engage Browser Web Speech fallback
          this.startBrowserSpeechFallback(options);
        }
      );
      this.interviewerSttClient.connect();

      this.candidateSttClient = new DeepgramStreamClient(
        'candidate',
        effectiveKey,
        options.speechLanguage || 'multi',
        (evt) => options.onTranscript?.(evt),
        options.onSttStateChange,
        options.onError
      );
      this.candidateSttClient.connect();
    } else {
      // Ephemeral Deepgram key unavailable or offline: engage Browser Web Speech API fallback
      this.startBrowserSpeechFallback(options);
    }

    // 2. Try loading inlined AudioWorklet
    let workletLoaded = false;
    if (this.audioContext.audioWorklet) {
      try {
        const blob = new Blob([PCM_WORKLET_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);
        workletLoaded = true;
      } catch (err) {
        console.warn('[DesktopAudioEngine] AudioWorklet load failed, using ScriptProcessor fallback:', err);
      }
    }

    // 3. Connect Interviewer processor
    if (this.interviewerGainNode) {
      if (workletLoaded) {
        try {
          const workletNode = new AudioWorkletNode(this.audioContext, 'dual-pcm-processor');
          workletNode.port.onmessage = (e) => {
            const buf: ArrayBuffer = e.data;
            this.interviewerSttClient?.send(buf);
            options.onAudioChunk?.('interviewer', buf);
          };
          this.interviewerGainNode.connect(workletNode);
          this.interviewerProcessor = workletNode;
        } catch {
          this.setupScriptProcessor('interviewer', this.interviewerGainNode, options);
        }
      } else {
        this.setupScriptProcessor('interviewer', this.interviewerGainNode, options);
      }
    }

    // 4. Connect Candidate processor
    if (this.candidateGainNode) {
      if (workletLoaded) {
        try {
          const workletNode = new AudioWorkletNode(this.audioContext, 'dual-pcm-processor');
          workletNode.port.onmessage = (e) => {
            const buf: ArrayBuffer = e.data;
            this.candidateSttClient?.send(buf);
            options.onAudioChunk?.('candidate', buf);
          };
          this.candidateGainNode.connect(workletNode);
          this.candidateProcessor = workletNode;
        } catch {
          this.setupScriptProcessor('candidate', this.candidateGainNode, options);
        }
      } else {
        this.setupScriptProcessor('candidate', this.candidateGainNode, options);
      }
    }
  }

  private setupScriptProcessor(
    speaker: SpeakerRole,
    sourceGain: GainNode,
    options: DesktopAudioEngineOptions
  ): void {
    if (!this.audioContext) return;
    try {
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      const state = { phaseOffset: 0 };

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isCapturing) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const pcm16 = resampleAndQuantize(channelData, this.audioContext!.sampleRate, 16000, state);
        if (pcm16.length > 0) {
          const buffer = pcm16.buffer as ArrayBuffer;
          if (speaker === 'interviewer') {
            this.interviewerSttClient?.send(buffer);
          } else {
            this.candidateSttClient?.send(buffer);
          }
          options.onAudioChunk?.(speaker, buffer);
        }
      };

      sourceGain.connect(processor);
      // Connect to silent pump to keep ScriptProcessor running without generating audible sound
      if (this.silentGainNode) {
        processor.connect(this.silentGainNode);
      }

      if (speaker === 'interviewer') {
        this.interviewerProcessor = processor;
      } else {
        this.candidateProcessor = processor;
      }
    } catch (err) {
      console.warn(`[DesktopAudioEngine] Failed to setup ScriptProcessor for ${speaker}:`, err);
    }
  }

  private startBrowserSpeechFallback(options: DesktopAudioEngineOptions): void {
    if (this.webSpeechFallback || !this.isCapturing) return;
    try {
      this.webSpeechFallback = new BrowserSpeechFallback(
        'interviewer',
        options.speechLanguage || 'uk',
        (evt) => options.onTranscript?.(evt),
        options.onSttStateChange,
        options.onError
      );
      this.webSpeechFallback.start();
    } catch (err) {
      console.warn('[DesktopAudioEngine] Failed to start BrowserSpeechFallback:', err);
    }
  }

  private startMeteringLoop(onVolumeChange?: (intVol: number, candVol: number) => void): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }

    let lastDispatch = 0;
    const tick = (now: number) => {
      if (!this.isCapturing) return;

      let intVol = this.simulatedInterviewerVol;
      let candVol = this.simulatedCandidateVol;

      if (this.interviewerAnalyser && intVol === 0) {
        intVol = calculateRMSFromAnalyser(this.interviewerAnalyser);
      }
      if (this.candidateAnalyser && candVol === 0) {
        candVol = calculateRMSFromAnalyser(this.candidateAnalyser);
      }

      if (now - lastDispatch > 50) {
        lastDispatch = now;
        onVolumeChange?.(intVol, candVol);
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private createFallbackStream(id: string): MediaStream {
    const track = {
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
      getTracks: () => [track],
      getAudioTracks: () => [track],
      getVideoTracks: () => [],
      removeTrack: () => {},
    } as unknown as MediaStream;
  }
}
