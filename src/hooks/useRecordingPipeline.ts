'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useCopilotAI } from '@/hooks/useCopilotAI';
import { CandidateProfile, DEFAULT_CANDIDATE_PROFILE } from '@/components/CandidateProfileModal';
import { InterviewQAItem } from '@/types/interview';

/**
 * Queue item tracking an enqueued request with promise callbacks.
 */
export interface PipelineQueueItem<T = unknown, R = unknown> {
  id: string;
  payload: T;
  timestamp: number;
  resolve: (value: R) => void;
  reject: (reason?: unknown) => void;
}

/**
 * RequestQueueWithBackpressure
 *
 * Implements a bounded FIFO queue with concurrency control and backpressure:
 * - concurrency: 1 (processes one LLM generation at a time)
 * - maxQueueSize: 2 (holds at most 2 pending requests)
 * - drop oldest: when capacity is exceeded, drops the oldest pending question,
 *   preventing generation of outdated answers when the interviewer moves on.
 */
export class RequestQueueWithBackpressure<T = unknown, R = unknown> {
  private queue: Array<PipelineQueueItem<T, R>> = [];
  private activeCount = 0;
  public readonly maxQueueSize: number;
  public readonly concurrency: number;
  private readonly worker: (payload: T) => Promise<R>;

  constructor(options: {
    maxQueueSize?: number;
    concurrency?: number;
    worker: (payload: T) => Promise<R>;
  }) {
    this.maxQueueSize = options.maxQueueSize ?? 2;
    this.concurrency = options.concurrency ?? 1;
    this.worker = options.worker;
  }

  public enqueue(payload: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      // Backpressure: drop oldest pending question if queue is at capacity
      if (this.queue.length >= this.maxQueueSize) {
        const dropped = this.queue.shift();
        if (dropped) {
          dropped.reject(new Error('Dropped from queue: superseded by newer interviewer question'));
        }
      }

      const item: PipelineQueueItem<T, R> = {
        id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        payload,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      this.queue.push(item);
      void this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    try {
      const result = await this.worker(item.payload);
      item.resolve(result);
    } catch (err) {
      item.reject(err);
    } finally {
      this.activeCount--;
      void this.processNext();
    }
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  public get isBusy(): boolean {
    return this.activeCount > 0;
  }

  public clear(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item?.reject(new Error('Queue cleared'));
    }
  }
}

export interface UseRecordingPipelineOptions {
  speechLanguage?: string;
  outputLanguage?: string;
  candidateProfile?: CandidateProfile;
  isConcise?: boolean;
  triggerMode?: 'auto' | 'enter';
  sessionMode?: 'interview' | 'meeting';
  userPlan?: 'free' | 'pro' | 'lifetime';
  onQAUpdate?: (qa: InterviewQAItem) => void;
  onPaywallTrigger?: () => void;
}

export interface QuestionRequest {
  text?: string;
  isManualEnter?: boolean;
}

/**
 * useRecordingPipeline
 *
 * Unified custom hook extracting audio capture, real-time STT streaming,
 * and LLM card generation with backpressure queue.
 *
 * Kill List Optimization:
 * - Raw audio Blobs are NEVER forwarded to LLMs (saving tens of MBs of base64).
 * - Real-time transcripts from Deepgram are parsed and fed directly as text.
 * - Noise filtering, relevance extraction, and card generation are combined into
 *   a single fast inference call.
 */
export function useRecordingPipeline(options: UseRecordingPipelineOptions = {}) {
  const [sessionDuration, setSessionDuration] = useState(0);
  const [queueSize, setQueueSize] = useState(0);

  const speechLanguageRef = useRef(options.speechLanguage || 'auto');
  speechLanguageRef.current = options.speechLanguage || 'auto';

  const outputLanguageRef = useRef(options.outputLanguage || 'auto');
  outputLanguageRef.current = options.outputLanguage || 'auto';

  const isConciseRef = useRef(options.isConcise || false);
  isConciseRef.current = options.isConcise || false;

  const triggerModeRef = useRef<'auto' | 'enter'>(options.triggerMode || 'auto');
  triggerModeRef.current = options.triggerMode || 'auto';

  const sessionModeRef = useRef<'interview' | 'meeting'>(options.sessionMode || 'interview');
  sessionModeRef.current = options.sessionMode || 'interview';

  const userPlanRef = useRef<'free' | 'pro' | 'lifetime'>(options.userPlan || 'free');
  userPlanRef.current = options.userPlan || 'free';

  const isFrozenRef = useRef(false);
  const hudBroadcastRef = useRef<BroadcastChannel | null>(null);

  const candidateProfileRef = useRef<CandidateProfile>(
    options.candidateProfile || DEFAULT_CANDIDATE_PROFILE
  );

  const copilot = useCopilotAI({
    speechLanguageRef,
    outputLanguageRef,
    candidateProfileRef,
    isConciseRef,
    triggerModeRef,
    hudBroadcastRef,
    isFrozenRef,
    sessionModeRef,
    sessionDuration,
  });

  // Backpressure request queue (concurrency: 1, maxQueueSize: 2)
  const queueRef = useRef<RequestQueueWithBackpressure<QuestionRequest, InterviewQAItem | undefined> | null>(null);

  if (!queueRef.current) {
    queueRef.current = new RequestQueueWithBackpressure<QuestionRequest, InterviewQAItem | undefined>({
      concurrency: 1,
      maxQueueSize: 2,
      worker: async (request: QuestionRequest) => {
        const res = await copilot.processAggregatedQuestion(request.text, request.isManualEnter);
        setQueueSize(queueRef.current?.pendingCount ?? 0);
        return res;
      },
    });
  }

  const enqueueQuestion = useCallback(
    async (text?: string, isManualEnter?: boolean): Promise<InterviewQAItem | undefined> => {
      if (!queueRef.current) return;
      const promise = queueRef.current.enqueue({ text, isManualEnter });
      setQueueSize(queueRef.current.pendingCount);
      return promise;
    },
    []
  );

  const handleLiveTranscript = useCallback(
    (
      text: string,
      isFinal: boolean,
      speechFinal: boolean,
      speaker: 'interviewer' | 'candidate' = 'interviewer'
    ) => {
      // Send text transcript to AI copilot logic. Candidate speech is strictly filtered out.
      copilot.handleIncomingTranscript(text, isFinal, speechFinal, speaker);
    },
    [copilot]
  );

  const audioCapture = useAudioCapture({
    speechLanguageRef,
    triggerModeRef,
    userPlanRef,
    onLiveTranscript: handleLiveTranscript,
    setShowTrialLimitModal: (show: boolean) => {
      if (show && options.onPaywallTrigger) {
        options.onPaywallTrigger();
      }
    },
    sessionDuration,
    setSessionDuration,
  });

  const clearQueue = useCallback(() => {
    queueRef.current?.clear();
    setQueueSize(0);
  }, []);

  return {
    // Audio Capture
    isCapturing: audioCapture.isCapturing,
    audioSource: audioCapture.audioSource,
    setAudioSource: audioCapture.setAudioSource,
    startCapture: audioCapture.startCapture,
    stopCapture: audioCapture.stopCapture,
    repickTabAudio: audioCapture.repickTabAudio,
    liveVolume: audioCapture.liveVolume,
    interviewerVolume: audioCapture.interviewerVolume,
    candidateVolume: audioCapture.candidateVolume,
    sttStatus: audioCapture.sttStatus,
    liveTranscript: audioCapture.liveTranscript,
    candidateLiveTranscript: audioCapture.candidateLiveTranscript,
    tabCaptureRef: audioCapture.tabCaptureRef,
    handleManualReconnect: audioCapture.handleManualReconnect,

    // Copilot AI
    interviewQAs: copilot.interviewQAs,
    setInterviewQAs: copilot.setInterviewQAs,
    activeQAId: copilot.activeQAId,
    setActiveQAId: copilot.setActiveQAId,
    isCopilotGenerating: copilot.isCopilotGenerating,
    handleManualEnterTrigger: copilot.handleManualEnterTrigger,
    handleRefineQA: copilot.handleRefineQA,
    pendingNewCount: copilot.pendingNewCount,
    setPendingNewCount: copilot.setPendingNewCount,

    // Queue & Backpressure
    enqueueQuestion,
    clearQueue,
    queueSize,
    sessionDuration,
    setSessionDuration,
  };
}
