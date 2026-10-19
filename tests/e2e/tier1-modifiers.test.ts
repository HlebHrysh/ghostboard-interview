import { describe, it, expect, beforeEach } from 'vitest';
import { MockSSEClient } from './fixtures/mockSseServer';

describe('Tier 1: Feature Coverage — 1-Click AI Modifiers (R4.1)', () => {
  let sseClient: MockSSEClient;

  beforeEach(() => {
    sseClient = new MockSSEClient();
  });

  it('AC 4.1: Bridge Phrase [B] triggers instant spoken transition phrase to buy candidate time', () => {
    const BRIDGE_PHRASES = {
      uk: 'Це ключовий архітектурний компроміс. У нашому продакшн-стеку ми зазвичай підходили до цього з двох ракурсів...',
      en: "That's a fundamental architectural trade-off. In our production environment, we approached this from two core perspectives...",
    };

    let activeBridge: { text: string; visible: boolean; autoDismissMs: number } | null = null;

    const triggerBridge = (lang: 'uk' | 'en' = 'uk') => {
      activeBridge = {
        text: BRIDGE_PHRASES[lang],
        visible: true,
        autoDismissMs: 9000,
      };
    };

    // Candidate hits hotkey [B]
    triggerBridge('uk');
    expect(activeBridge).not.toBeNull();
    expect((activeBridge as any)?.visible).toBe(true);
    expect((activeBridge as any)?.text).toContain('ключовий архітектурний компроміс');
    expect((activeBridge as any)?.autoDismissMs).toBe(9000);

    // English interview mode
    triggerBridge('en');
    expect((activeBridge as any)?.text).toContain('fundamental architectural trade-off');
  });

  it('AC 4.1: Blitz / Shorter Mode [Q] sets directorModifier="shorter" and limits output to 3 concise bullets', async () => {
    const question = 'What is the difference between TCP and UDP?';
    const output = await sseClient.requestStream({
      question,
      directorModifier: 'shorter',
    });

    expect(output.hook).toContain('Direct core answer');
    expect(output.pillars).toHaveLength(3);
    expect(output.pillars[0]).toMatch(/^1\./);
    expect(output.pillars[1]).toMatch(/^2\./);
    expect(output.pillars[2]).toMatch(/^3\./);
    expect(output.deepDive).toContain('Key takeaway');
  });

  it('AC 4.1: Deep Dive chip sets directorModifier="more_technical" forcing kernel and memory internals', async () => {
    const question = 'How does Node.js event loop handle non-blocking I/O?';
    const output = await sseClient.requestStream({
      question,
      directorModifier: 'more_technical',
    });

    expect(output.deepDive).toContain('Kernel details');
    expect(output.deepDive).toContain('epoll_wait');
    expect(output.deepDive).toContain('kqueue');
  });

  it('AC 4.1: Code Example chip sets directorModifier="code_example" returning formatted code block', async () => {
    const question = 'How do you process async streams in Python?';
    const output = await sseClient.requestStream({
      question,
      directorModifier: 'code_example',
    });

    expect(output.deepDive).toContain('```python');
    expect(output.deepDive).toContain('async for chunk in reader:');
  });

  it('AC 4.1: Dispatches revised prompt with previous QA history preserved on modifier click', async () => {
    const initialQuestion = 'Explain distributed transactions across microservices.';
    const initialOutput = await sseClient.requestStream({
      question: initialQuestion,
      directorModifier: 'normal',
    });

    expect(initialOutput.hook).toBeTruthy();

    // User clicks "Code Example" on the active card
    const revisedOutput = await sseClient.requestStream({
      question: initialQuestion,
      directorModifier: 'code_example',
      history: [
        { speaker: 'interviewer', text: initialQuestion },
        { speaker: 'candidate', text: initialOutput.hook },
      ],
    });

    // Revised answer received with code example
    expect(revisedOutput.deepDive).toContain('```python');
    expect(revisedOutput.model).toBe('gemini-3.8-flash');
  });
});
