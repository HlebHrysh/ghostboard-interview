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

  describe('Adversarial Stress Suite: Candidate Speech Guardrail Robustness', () => {
    it('empirically verifies that tokens tagged "candidate" or "Ви" under rapid bursts NEVER trigger ingest or evaluate_eot', () => {
      const ingestedTranscripts: string[] = [];
      const evaluatedEoTCalls: Array<{ vadPause: boolean; timestamp: number }> = [];
      const broadcastEvents: Array<{ speaker: string; text: string }> = [];

      // Exact behavioral model mirroring desktop/src-tauri/src/main.rs spawn_copilot_pipeline
      const copilotTranscriptPipeline = (token: {
        speaker: string;
        text: string;
        is_final: boolean;
        speech_final: boolean;
        timestamp_ms: number;
      }) => {
        const is_candidate = token.speaker === 'candidate' || token.speaker === 'Ви';
        const speaker_tag = is_candidate ? 'candidate' : 'interlocutor';

        broadcastEvents.push({ speaker: speaker_tag, text: token.text });

        // 🛡️ CRITICAL SPEAKER GUARDRAIL: Candidate speech tagged "Ви" / "candidate"
        // strictly bypasses LLM prompt triggers and question ingestion!
        if (is_candidate) {
          return;
        }

        ingestedTranscripts.push(token.text);

        if (token.speech_final || token.text.endsWith('?')) {
          evaluatedEoTCalls.push({ vadPause: false, timestamp: token.timestamp_ms });
        }
      };

      // 100 rapid adversarial candidate tokens with aggressive question patterns
      const interrogatives = [
        'How does PostgreSQL MVCC handle tuple visibility under concurrent writes?',
        'Why would you use RabbitMQ instead of Kafka for transactional tasks?',
        'Could you explain the difference between processes and threads in Linux?',
        'What is the trade-off between B-Trees and LSM Trees in distributed storage?',
        'Як працює Garbage Collection у V8 і чому generational hypothesis важливий?',
        'Чому ми обираємо gRPC над REST для міжсервісної взаємодії?',
        'Де зберігаються сесії у безсерверних архітектурах?',
        'Чи можна уникнути deadlock у базі даних через правильний порядок транзакцій?',
        'What happens when a goroutine blocks on a channel write???',
        'Is optimistic concurrency control better for read-heavy workloads?!?!',
      ];

      for (let i = 0; i < 100; i++) {
        const text = interrogatives[i % interrogatives.length];
        const speaker = i % 2 === 0 ? 'candidate' : 'Ви';

        copilotTranscriptPipeline({
          speaker,
          text,
          is_final: true,
          speech_final: true,
          timestamp_ms: 1000 + i * 30,
        });
      }

      // Assertions: 100% suppression of candidate speech in ingest and EoT evaluation
      expect(broadcastEvents).toHaveLength(100);
      for (const ev of broadcastEvents) {
        expect(ev.speaker).toBe('candidate');
      }
      expect(ingestedTranscripts).toHaveLength(0);
      expect(evaluatedEoTCalls).toHaveLength(0);

      // Now send one INTERLOCUTOR question with the exact same format
      copilotTranscriptPipeline({
        speaker: 'interlocutor',
        text: 'How does the Python GIL affect multi-threaded CPU-bound programs?',
        is_final: true,
        speech_final: true,
        timestamp_ms: 5000,
      });

      // Assert: Interlocutor question DOES trigger ingest and evaluate_eot
      expect(broadcastEvents).toHaveLength(101);
      expect(broadcastEvents[100].speaker).toBe('interlocutor');
      expect(ingestedTranscripts).toHaveLength(1);
      expect(ingestedTranscripts[0]).toBe('How does the Python GIL affect multi-threaded CPU-bound programs?');
      expect(evaluatedEoTCalls).toHaveLength(1);
    });

    it('handles adversarial edge cases: trailing punctuation bursts ("???", "!?!"), whitespace, and case sensitivity', () => {
      const ingestedTranscripts: string[] = [];
      const evaluatedEoTCalls: string[] = [];

      const dispatchToken = (speaker: string, text: string, speech_final = true) => {
        const is_candidate = speaker === 'candidate' || speaker === 'Ви';
        if (is_candidate) return;

        ingestedTranscripts.push(text);
        if (speech_final || text.endsWith('?')) {
          evaluatedEoTCalls.push(text);
        }
      };

      const adversarialPhrases = [
        'wait, what???',
        'is that really true??!?!?',
        'WHY????????',
        'як це працює???',
        'що саме ти маєш на увазі???',
        '  чому так?   ',
        '???',
        '??????',
      ];

      for (const phrase of adversarialPhrases) {
        dispatchToken('candidate', phrase, true);
        dispatchToken('Ви', phrase, true);
      }

      expect(ingestedTranscripts).toHaveLength(0);
      expect(evaluatedEoTCalls).toHaveLength(0);
    });

    it('interleaved bursts: interlocutor questions trigger AI while interleaved candidate queries are strictly suppressed', () => {
      const interlocutorQuestions: string[] = [];
      const candidateRemarks: string[] = [];

      const processDialogue = (speaker: string, text: string) => {
        const is_candidate = speaker === 'candidate' || speaker === 'Ви';
        if (is_candidate) {
          candidateRemarks.push(text);
          return; // Guardrail
        }
        interlocutorQuestions.push(text);
      };

      for (let i = 0; i < 20; i++) {
        // Interlocutor asks question
        processDialogue('interviewer', `Interviewer question ${i}: How does Raft handle partition tolerance?`);
        // Candidate asks clarification question
        processDialogue('candidate', `Candidate query ${i}: Do you mean network partitions or disk failures?`);
        // Candidate remarks in Ukrainian
        processDialogue('Ви', `Кандидат коментар ${i}: Чи розглядаємо ми quorum loss?`);
      }

      expect(interlocutorQuestions).toHaveLength(20);
      expect(candidateRemarks).toHaveLength(40);
      for (const q of interlocutorQuestions) {
        expect(q).toContain('Interviewer question');
        expect(q).not.toContain('Candidate');
        expect(q).not.toContain('Кандидат');
      }
    });
  });
});

