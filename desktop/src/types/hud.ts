/**
 * Strongly typed HUD Event contracts for Ghostboard Tauri v2 IPC Channel.
 * Maps 1:1 to Rust HudEvent in desktop/src-tauri/src/ipc/events.rs.
 */

export type SpeakerRole = 'interlocutor' | 'candidate' | string;

export interface VadStatePayload {
  is_speech: boolean;
  confidence: number;
  /** Convenience alias */
  isSpeaking?: boolean;
}

export interface SttTranscriptPayload {
  speaker: SpeakerRole;
  text: string;
  is_final: boolean;
  speech_final?: boolean;
  timestamp_ms?: number;
  /** Convenience alias */
  isFinal?: boolean;
  timestamp?: number;
}

export interface QuestionDetectedPayload {
  id: string;
  question: string;
  timestamp_ms: number;
  /** Convenience aliases */
  questionId?: string;
  text?: string;
  confidence?: number;
  category?: string;
}

export interface LlmChunkPayload {
  question_id: string;
  token: string;
  is_first?: boolean;
  /** Convenience aliases */
  questionId?: string;
  delta?: string;
  chunk?: string;
}

export interface LlmDonePayload {
  question_id: string;
  full_text: string;
  latency_ms?: number;
  /** Convenience aliases */
  questionId?: string;
  durationMs?: number;
  ttftMs?: number;
}

export interface HotkeyTriggeredPayload {
  action: 'answer' | 'screenshot' | 'chat' | 'clear' | 'panic' | 'freeze' | string;
}

export interface AudioLevelPayload {
  interlocutor?: number;
  candidate?: number;
  source?: 'loopback' | 'microphone' | string;
  level?: number;
}

export interface StealthChangedPayload {
  enabled: boolean;
}

export interface ClickThroughChangedPayload {
  enabled: boolean;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface UserProfile {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'lifetime' | string;
}

export interface AuthChangedPayload {
  authenticated: boolean;
  user?: UserProfile | null;
  plan: string;
}

export interface DeviceCodePendingPayload {
  user_code: string;
  verification_uri: string;
  expires_in_sec: number;
}

export interface PlanUpdatedPayload {
  plan: string;
}

export type HudEvent =
  | { type: 'vadState'; payload: VadStatePayload }
  | { type: 'sttTranscript'; payload: SttTranscriptPayload }
  | { type: 'questionDetected'; payload: QuestionDetectedPayload }
  | { type: 'llmChunk'; payload: LlmChunkPayload }
  | { type: 'llmDone'; payload: LlmDonePayload }
  | { type: 'hotkeyTriggered'; payload: HotkeyTriggeredPayload }
  | { type: 'audioLevel'; payload: AudioLevelPayload }
  | { type: 'stealthChanged'; payload: StealthChangedPayload }
  | { type: 'clickThroughChanged'; payload: ClickThroughChangedPayload }
  | { type: 'authChanged'; payload: AuthChangedPayload }
  | { type: 'deviceCodePending'; payload: DeviceCodePendingPayload }
  | { type: 'planUpdated'; payload: PlanUpdatedPayload }
  | { type: 'error'; payload: ErrorPayload };

export interface HudStreamState {
  isSpeech: boolean;
  vadConfidence: number;
  interlocutorVolume: number;
  candidateVolume: number;
  liveTranscript: string;
  activeSpeaker: SpeakerRole;
  recentTranscripts: Array<{
    id: string;
    speaker: SpeakerRole;
    text: string;
    isFinal: boolean;
    timestamp: number;
  }>;
  currentQuestion: string;
  currentQuestionId: string | null;
  streamingAnswer: string;
  isStreaming: boolean;
  ttftMs: number | null;
  latencyMs: number | null;
  lastHotkeyAction: string | null;
  isStealthEnabled: boolean;
  isClickThroughEnabled: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  plan: string;
  deviceCode: DeviceCodePendingPayload | null;
  connectionLatencyMs: number;
  error: { code: string; message: string } | null;
}
