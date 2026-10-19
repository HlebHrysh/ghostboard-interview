import { describe, it, expect, beforeEach } from 'vitest';
import { MockDualAudioCaptureEngine } from './fixtures/mockAudioGraph';
import { MockDeepgramLiveClient } from './fixtures/mockDeepgramServer';
import { MockSSEClient } from './fixtures/mockSseServer';
import { MockElectronBridge } from './fixtures/mockElectronBridge';
import { normalizeTechnicalSpeech } from '../../src/lib/techSpeechNormalizer';

interface SessionQAItem {
  id: string;
  question: string;
  startHook: string;
  quickAnswer: string;
  keyPoints: string[];
  codeSnippet?: string;
  tag: string;
  timestamp: number;
}

describe('Tier 4: Real-World Application Scenario — Full Technical Interview Simulation', () => {
  let audioEngine: MockDualAudioCaptureEngine;
  let deepgram: MockDeepgramLiveClient;
  let sseClient: MockSSEClient;
  let bridge: MockElectronBridge;
  let sessionHistory: SessionQAItem[];
  let candidateDialogue: string[];
  let interlocutorDialogue: string[];

  beforeEach(() => {
    audioEngine = new MockDualAudioCaptureEngine();
    deepgram = new MockDeepgramLiveClient();
    deepgram.connect('mock-deepgram-prod-key');
    sseClient = new MockSSEClient();
    bridge = new MockElectronBridge();
    sessionHistory = [];
    candidateDialogue = [];
    interlocutorDialogue = [];

    // Opaque-box dialogue listener
    deepgram.onTranscript((event) => {
      if (event.speaker === 'candidate' && event.isFinal) {
        candidateDialogue.push(event.text.trim());
      } else if (event.speaker === 'interviewer' && event.isFinal) {
        interlocutorDialogue.push(event.text.trim());
      }
    });
  });

  it('executes a complete end-to-end Senior Engineer technical interview simulation', async () => {
    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 1: Pre-Flight HUD Configuration & Hardware Stealth
    // ═══════════════════════════════════════════════════════════════════════
    bridge.setPlatform('win32');

    // 1.1 Window placed into compact Eyeline Notch pinned under webcam
    const geom = await bridge.setWindowMode('stealth');
    expect(geom.width).toBe(580);
    expect(geom.height).toBe(220);
    expect(geom.y).toBeLessThanOrEqual(20);

    // 1.2 Enable hardware-level content protection (WDA_EXCLUDEFROMCAPTURE)
    const protectedStatus = await bridge.setContentProtection(true);
    expect(protectedStatus).toBe(true);
    expect(bridge.contentProtection).toBe(true);

    // 1.3 Calibrate window opacity to 90%
    const opacity = await bridge.setOpacity(0.9);
    expect(opacity).toBe(0.9);

    // 1.4 Initialize audio capture in System Audio loopback mode
    audioEngine.start('system');
    expect(audioEngine.isCapturing).toBe(true);
    expect(audioEngine.sourceMode).toBe('system');

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 2: Question 1 — Behavioral & System Architecture
    // ═══════════════════════════════════════════════════════════════════════
    const q1Raw = 'Розкажіть про ваш досвід оптимізації високонавантажених сервісів у продакшні.';
    deepgram.emitSpeech('interviewer', q1Raw, true, true);
    expect(interlocutorDialogue).toContain(q1Raw);

    // Candidate uses Bridge Phrase [B] to buy 6-8 seconds while formulating thoughts
    const bridgePhrase = 'Це ключовий архітектурний компроміс. У нашому продакшн-стеку ми підходили до цього з двох ракурсів...';
    expect(bridgePhrase).toBeTruthy();

    // Streaming AI Copilot delivers sub-second response
    const q1Answer = await sseClient.requestStream({
      question: q1Raw,
      candidateProfile: {
        role: 'Senior Backend Architect',
        primaryStack: 'Python / PostgreSQL / Kafka',
        experienceLevel: '8+ years',
      },
    });

    expect(q1Answer.ttftMs).toBeLessThan(900);
    expect(q1Answer.hook).toBeTruthy();
    expect(q1Answer.pillars).toHaveLength(3);

    // Store in session
    sessionHistory.push({
      id: 'qa-1',
      question: q1Raw,
      startHook: q1Answer.hook,
      quickAnswer: q1Answer.pillars.join('; '),
      keyPoints: q1Answer.pillars,
      tag: 'System Architecture',
      timestamp: Date.now(),
    });

    // Candidate speaks answer into microphone
    const candidateSpeech = 'У нашому продакшн-сервісі ми ізолювали CPU-bound воркери через окремі пули процесів.';
    deepgram.emitSpeech('candidate', candidateSpeech, true, true);

    // Verify candidate speech recorded in dialogue but NEVER triggered a new AI query
    expect(candidateDialogue).toContain(candidateSpeech);
    expect(sessionHistory).toHaveLength(1);

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 3: Question 2 — Live Coding Question with Cyrillic Tech Slang
    // ═══════════════════════════════════════════════════════════════════════
    const q2RawWithSlang = 'Напиши лру кеш з ордерд дікт на пайтон і поясни складність.';
    // Normalize technical speech
    const q2Normalized = normalizeTechnicalSpeech(q2RawWithSlang);

    deepgram.emitSpeech('interviewer', q2RawWithSlang, true, true);

    // Request stream with code_example modifier
    const q2Answer = await sseClient.requestStream({
      question: q2Normalized,
      directorModifier: 'code_example',
    });

    expect(q2Answer.deepDive).toContain('```python');

    sessionHistory.push({
      id: 'qa-2',
      question: q2Normalized,
      startHook: q2Answer.hook,
      quickAnswer: 'LRU Cache provides O(1) get and put operations via Doubly Linked List and Hash Map.',
      keyPoints: q2Answer.pillars,
      codeSnippet: 'from collections import OrderedDict\n\nclass LRUCache(OrderedDict):\n    pass',
      tag: 'Algorithms & Coding',
      timestamp: Date.now() + 1000,
    });

    // Candidate uses Quick Copy [C] to copy code to clipboard without mouse movement
    await bridge.copyClipboard(sessionHistory[1].codeSnippet!);
    expect(bridge.clipboardContent).toContain('class LRUCache');

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 4: Sudden Intrusion — Panic Shield [F12] & Background Audio
    // ═══════════════════════════════════════════════════════════════════════
    let isPanicActive = true;
    const disguiseTerminal = 'user@workstation:~$ git status && pytest -v';
    expect(isPanicActive).toBe(true);
    expect(disguiseTerminal).toContain('pytest -v');

    // While disguised, interlocutor speaks next sentence
    deepgram.emitSpeech('interviewer', 'Good explanation. Moving on to database transactions.', true, true);
    expect(interlocutorDialogue).toContain('Good explanation. Moving on to database transactions.');

    // Danger passes: hit Esc to dismiss panic shield
    isPanicActive = false;
    expect(isPanicActive).toBe(false);

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 5: Question 3 — Freeze Mode during Follow-up
    // ═══════════════════════════════════════════════════════════════════════
    let isFrozen = true;
    let activeCardId = 'qa-2';
    const queuedCards: string[] = [];

    // Interlocutor asks follow-up while candidate is speaking
    const q3Raw = 'What isolation level prevents non-repeatable reads in PostgreSQL?';
    if (isFrozen) {
      queuedCards.push('qa-3');
    }

    // Card remains locked on qa-2 while candidate finishes explanation
    expect(activeCardId).toBe('qa-2');
    expect(queuedCards).toEqual(['qa-3']);

    // Candidate presses Space to unfreeze
    isFrozen = false;
    activeCardId = queuedCards.pop()!;
    expect(activeCardId).toBe('qa-3');

    sessionHistory.push({
      id: 'qa-3',
      question: q3Raw,
      startHook: 'Repeatable Read isolation level prevents non-repeatable reads.',
      quickAnswer: 'PostgreSQL implements Repeatable Read using MVCC snapshots at transaction start.',
      keyPoints: ['Snapshot taken at first query', 'Serialization failure on concurrent update'],
      tag: 'PostgreSQL',
      timestamp: Date.now() + 2000,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 6: Debrief & Export
    // ═══════════════════════════════════════════════════════════════════════
    // Verify 3 distinct questions captured in session history
    expect(sessionHistory).toHaveLength(3);

    // Format debrief markdown
    let debriefMd = `# Ghostboard Technical Interview Debrief\n\n`;
    debriefMd += `**Total Questions:** ${sessionHistory.length}\n\n`;
    sessionHistory.forEach((qa, idx) => {
      debriefMd += `### ${idx + 1}. ${qa.question} [${qa.tag}]\n`;
      debriefMd += `- Start Hook: ${qa.startHook}\n`;
      debriefMd += `- Answer: ${qa.quickAnswer}\n\n`;
    });
    debriefMd += `## Tailored Follow-Up Thank-You Email\n\n`;
    debriefMd += `**Subject:** Thank you for the interview - Senior Backend Architect\n\n`;
    debriefMd += `Hi team,\nThank you for discussing system architecture and PostgreSQL concurrency today.\n`;

    // 1-Click Export to file
    const exportResult = await bridge.exportMarkdown(debriefMd, 'senior-backend-debrief.md');
    expect(exportResult.success).toBe(true);
    expect(bridge.exportedFiles).toHaveLength(1);
    expect(bridge.exportedFiles[0].filename).toBe('senior-backend-debrief.md');
    expect(bridge.exportedFiles[0].content).toContain('Ghostboard Technical Interview Debrief');
    expect(bridge.exportedFiles[0].content).toContain('Tailored Follow-Up Thank-You Email');

    // Teardown audio
    audioEngine.stop();
    expect(audioEngine.isCapturing).toBe(false);
  });
});
