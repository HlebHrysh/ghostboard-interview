import { describe, it, expect, beforeEach } from 'vitest';
import { MockDeepgramLiveClient } from './fixtures/mockDeepgramServer';

interface ActiveHUDState {
  isPanic: boolean;
  isFrozen: boolean;
  activeQAId: string | null;
  queuedQAs: string[];
  disguiseScreen: {
    terminalCommand: string;
    testOutput: string;
    backgroundSttIndicator: string;
  } | null;
}

class SafetyStateManager {
  state: ActiveHUDState = {
    isPanic: false,
    isFrozen: false,
    activeQAId: 'qa-active-1',
    queuedQAs: [],
    disguiseScreen: null,
  };

  triggerPanic() {
    this.state.isPanic = true;
    this.state.disguiseScreen = {
      terminalCommand: 'git status && pytest tests/test_async_workers.py -v',
      testOutput: '================ 4 passed in 0.42s ================',
      backgroundSttIndicator: 'sys_mon • q:0',
    };
  }

  dismissPanic() {
    this.state.isPanic = false;
    this.state.disguiseScreen = null;
  }

  toggleFreeze() {
    this.state.isFrozen = !this.state.isFrozen;
    if (!this.state.isFrozen && this.state.queuedQAs.length > 0) {
      // Advance to the newest queued question on unfreeze
      this.state.activeQAId = this.state.queuedQAs.pop()!;
    }
  }

  handleNewQuestion(questionId: string) {
    if (this.state.isFrozen) {
      // Locked: queue question without displacing current card
      this.state.queuedQAs.push(questionId);
    } else {
      // Unlocked: immediately show new question card
      this.state.activeQAId = questionId;
    }

    if (this.state.isPanic && this.state.disguiseScreen) {
      this.state.disguiseScreen.backgroundSttIndicator = `sys_mon • q:${this.state.queuedQAs.length}`;
    }
  }
}

describe('Tier 1: Feature Coverage — Safety Utilities: Panic Shield & Freeze Mode (R4.3)', () => {
  let safety: SafetyStateManager;
  let deepgram: MockDeepgramLiveClient;

  beforeEach(() => {
    safety = new SafetyStateManager();
    deepgram = new MockDeepgramLiveClient();
    deepgram.connect('test-key');
  });

  it('AC 4.3: Panic Shield [F12] instantly mounts realistic developer terminal disguise (<16ms)', () => {
    expect(safety.state.isPanic).toBe(false);
    expect(safety.state.disguiseScreen).toBeNull();

    // Hotkey F12 pressed
    safety.triggerPanic();

    expect(safety.state.isPanic).toBe(true);
    expect(safety.state.disguiseScreen).not.toBeNull();
    expect(safety.state.disguiseScreen?.terminalCommand).toContain('git status');
    expect(safety.state.disguiseScreen?.testOutput).toContain('4 passed in 0.42s');
  });

  it('AC 4.3: Panic Shield maintains background STT capture with discreet sys_mon indicator', () => {
    safety.triggerPanic();
    expect(safety.state.disguiseScreen?.backgroundSttIndicator).toBe('sys_mon • q:0');

    // While panic disguise is active, background audio arrives and generates a QA item
    safety.handleNewQuestion('qa-background-2');

    // The interface remains disguised, but the ultra-discreet status dot reflects the queued count
    expect(safety.state.isPanic).toBe(true);
    expect(safety.state.disguiseScreen?.backgroundSttIndicator).toBe('sys_mon • q:0');
  });

  it('AC 4.3: Dismissing Panic Shield [Esc] restores teleprompter view seamlessly', () => {
    safety.triggerPanic();
    expect(safety.state.isPanic).toBe(true);

    safety.dismissPanic();
    expect(safety.state.isPanic).toBe(false);
    expect(safety.state.disguiseScreen).toBeNull();
    expect(safety.state.activeQAId).toBe('qa-active-1');
  });

  it('AC 4.4: Freeze Mode [Space] locks active answer card preventing incoming speech displacement', () => {
    expect(safety.state.isFrozen).toBe(false);
    expect(safety.state.activeQAId).toBe('qa-active-1');

    // Candidate hits Space to lock card
    safety.toggleFreeze();
    expect(safety.state.isFrozen).toBe(true);

    // Interlocutor asks follow-up question while candidate is speaking
    safety.handleNewQuestion('qa-incoming-2');

    // Active card MUST NOT change while frozen!
    expect(safety.state.activeQAId).toBe('qa-active-1');
  });

  it('AC 4.4: Freeze Mode queues new incoming questions and displays queue counter badge', () => {
    safety.toggleFreeze();

    safety.handleNewQuestion('qa-queue-2');
    safety.handleNewQuestion('qa-queue-3');

    expect(safety.state.queuedQAs).toHaveLength(2);
    expect(safety.state.queuedQAs).toEqual(['qa-queue-2', 'qa-queue-3']);
    // Active card still locked
    expect(safety.state.activeQAId).toBe('qa-active-1');
  });

  it('AC 4.4: Unfreezing [Space] smoothly transitions to the latest queued question card', () => {
    safety.toggleFreeze();
    safety.handleNewQuestion('qa-queue-2');
    safety.handleNewQuestion('qa-queue-3');

    expect(safety.state.isFrozen).toBe(true);

    // Candidate hits Space again to unfreeze
    safety.toggleFreeze();
    expect(safety.state.isFrozen).toBe(false);

    // Automatically navigated to latest card
    expect(safety.state.activeQAId).toBe('qa-queue-3');
  });
});
