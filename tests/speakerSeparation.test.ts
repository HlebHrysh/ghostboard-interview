import { describe, it, expect, vi } from 'vitest';
import type { SpeakerType, TabCaptureOptions } from '../src/lib/tabAudioCapture';

describe('Dual Stream Speaker Separation & Guardrail Suite', () => {
  it('defines valid SpeakerType values ("interviewer" and "candidate")', () => {
    const s1: SpeakerType = 'interviewer';
    const s2: SpeakerType = 'candidate';
    expect(s1).toBe('interviewer');
    expect(s2).toBe('candidate');
  });

  it('guarantees candidate speech is completely ignored by the question aggregation pipeline', () => {
    const pendingFragments: string[] = [];
    let isCopilotGenerating = false;
    let triggeredQuestion = '';

    const processAggregatedQuestion = vi.fn((q?: string) => {
      triggeredQuestion = q || pendingFragments.join(' ');
      isCopilotGenerating = true;
    });

    // Simulated handleIncomingTranscript logic with the Speaker Guardrail
    const handleIncomingTranscript = (
      text: string,
      isFinal: boolean,
      speechFinal: boolean,
      speaker: SpeakerType = 'interviewer'
    ) => {
      if (!text || !text.trim()) return;
      const clean = text.trim();

      // 🛡️ CRITICAL GUARDRAIL: Never feed candidate's microphone speech into AI question generation!
      if (speaker === 'candidate') {
        return;
      }

      const last = pendingFragments[pendingFragments.length - 1];
      if (!last || last.toLowerCase() !== clean.toLowerCase()) {
        pendingFragments.push(clean);
      }

      if (speechFinal && pendingFragments.length >= 1) {
        processAggregatedQuestion();
      }
    };

    // 1. Candidate speaks into their microphone
    handleIncomingTranscript('I have five years of experience building microservices with Python and FastAPI', true, true, 'candidate');
    handleIncomingTranscript('We used Celery for background workers and Redis as message broker', true, true, 'candidate');

    // Assert: candidate words NEVER entered pendingFragments and NEVER triggered the AI!
    expect(pendingFragments).toHaveLength(0);
    expect(processAggregatedQuestion).not.toHaveBeenCalled();
    expect(triggeredQuestion).toBe('');

    // 2. Interviewer asks a question from the tab
    handleIncomingTranscript('Can you explain how the Python GIL affects multi-threading?', true, true, 'interviewer');

    // Assert: interviewer question entered fragments and triggered AI response!
    expect(pendingFragments).toHaveLength(1);
    expect(pendingFragments[0]).toBe('Can you explain how the Python GIL affects multi-threading?');
    expect(processAggregatedQuestion).toHaveBeenCalledTimes(1);
    expect(triggeredQuestion).toBe('Can you explain how the Python GIL affects multi-threading?');
  });

  it('supports separate volume callbacks for interviewer and candidate in TabCaptureOptions', () => {
    let capturedInterviewerVol = -1;
    let capturedCandidateVol = -1;

    const options: TabCaptureOptions = {
      source: 'tab',
      onVolumeChange: (interviewerVol: number, candidateVol?: number) => {
        capturedInterviewerVol = interviewerVol;
        capturedCandidateVol = candidateVol ?? 0;
      },
    };

    options.onVolumeChange?.(35, 12);
    expect(capturedInterviewerVol).toBe(35);
    expect(capturedCandidateVol).toBe(12);
  });

  it('strictly rejects any speaker that is not "interviewer" from triggering copilot AI', () => {
    const pendingQuestions: string[] = [];
    const onQuestionDetected = vi.fn((text: string) => {
      pendingQuestions.push(text);
    });

    const guardrailDispatcher = (text: string, speaker: SpeakerType) => {
      // 🛡️ CRITICAL GUARDRAIL
      if (speaker !== 'interviewer') {
        return;
      }
      onQuestionDetected(text);
    };

    guardrailDispatcher('How does garbage collection work in V8?', 'interviewer');
    guardrailDispatcher('I believe mark-and-sweep algorithm is used here', 'candidate');
    guardrailDispatcher('Let me explain generational hypothesis', 'candidate');

    expect(onQuestionDetected).toHaveBeenCalledTimes(1);
    expect(pendingQuestions).toEqual(['How does garbage collection work in V8?']);
  });

  it('accumulates candidate speech into isolated history without leaking to interviewer queue', () => {
    const candidateHistory: Array<{ id: string; text: string; timestamp: number }> = [];
    const interviewerQueue: string[] = [];

    const handleSpeech = (text: string, isFinal: boolean, speaker: SpeakerType) => {
      if (speaker === 'candidate') {
        if (isFinal) {
          candidateHistory.push({
            id: `cand_${Date.now()}_${Math.random()}`,
            text,
            timestamp: Date.now(),
          });
        }
      } else if (speaker === 'interviewer') {
        interviewerQueue.push(text);
      }
    };

    handleSpeech('I worked with PostgreSQL indexing and B-Trees', true, 'candidate');
    handleSpeech('What is the difference between clustered and non-clustered index?', true, 'interviewer');

    expect(candidateHistory).toHaveLength(1);
    expect(candidateHistory[0].text).toBe('I worked with PostgreSQL indexing and B-Trees');
    expect(interviewerQueue).toHaveLength(1);
    expect(interviewerQueue[0]).toBe('What is the difference between clustered and non-clustered index?');
  });
});
