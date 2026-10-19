import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeTechnicalSpeech,
  isFillerOrNoise,
  hasTechnicalKeyword,
  detectQuestionLanguage,
  isolateTargetQuestionHeuristics,
} from '../desktop/src/lib/techSpeechNormalizer';
import {
  parseDualStreamDelimiters,
  DualStreamClient,
} from '../desktop/src/lib/streamClient';
import {
  parseStreamingMarkdown,
  type MarkdownSection,
} from '../desktop/src/components/DualColumnChat';

describe('Challenger M3 Stress Suite — Technical Speech & UI Stability', () => {
  describe('1. Extreme Cyrillic Tech Slang & Phonetic Stress', () => {
    it('normalizes high-density multi-term developer utterances in a single sentence', () => {
      const denseUtterance =
        'розгорни в кубері мікросервіси на пайтоні з фастапі, селері, редіс і кафкою, перевір мвцц в постгресі, налаштуй лру кеш';
      const normalized = normalizeTechnicalSpeech(denseUtterance);

      expect(normalized).toContain('Kubernetes');
      expect(normalized).toContain('Python');
      expect(normalized).toContain('FastAPI');
      expect(normalized).toContain('Celery');
      expect(normalized).toContain('Redis');
      expect(normalized).toContain('Kafka');
      expect(normalized).toContain('MVCC (Multi-Version Concurrency Control)');
      expect(normalized).toContain('PostgreSQL');
      expect(normalized).toContain('LRU Cache');
    });

    it('verifies cascade elimination: GIL expansion remains pure without asyncio.Semaphore / Lock corruption', () => {
      const result = normalizeTechnicalSpeech('поясни джил');
      expect(result).toBe('поясни GIL (Global Interpreter Lock)');
      expect(result).not.toContain('asyncio.Semaphore');
    });

    it('verifies Slavic declension endings on key tools: докером, терраформом', () => {
      expect(normalizeTechnicalSpeech('підключаємо кафку')).toContain('Kafka');
      expect(normalizeTechnicalSpeech('працюємо з постгресом')).toContain('PostgreSQL');

      const dockerUtterance = normalizeTechnicalSpeech('працюємо з докером');
      expect(dockerUtterance).toContain('Docker');

      const terraformUtterance = normalizeTechnicalSpeech('деплоїмо терраформом');
      expect(terraformUtterance).toContain('Terraform');
    });

    it('verifies Ukrainian consonant mutation (palatalization): кафці, асінці', () => {
      const kafkaLocative = normalizeTechnicalSpeech('у кафці є партиції');
      expect(kafkaLocative).toContain('Kafka');

      const asyncioLocative = normalizeTechnicalSpeech('в асінці є корутини');
      expect(asyncioLocative).toContain('Asyncio');
    });

    it('verifies rule order precedence: compound terms before general terms (джанго-рест vs джанго)', () => {
      const result = normalizeTechnicalSpeech('використовуємо джанго-рест');
      expect(result).toBe('використовуємо DRF (Django REST Framework)');
    });

    it('evaluates dunder method variants and compounds', () => {
      expect(normalizeTechnicalSpeech('Що таке дандер?')).toContain('Dunder methods');
      expect(normalizeTechnicalSpeech('розкажи про дандери')).toContain('Dunder methods');
      expect(normalizeTechnicalSpeech('ми використовуємо дандер init')).toContain('Dunder methods');
      expect(normalizeTechnicalSpeech('дандер методи в класі')).toContain('Dunder methods');
      expect(normalizeTechnicalSpeech('магічні методи пайтон')).toContain('Dunder methods');
      expect(normalizeTechnicalSpeech('дандер слотс оптимізує памʼять')).toContain('__slots__');
    });

    it('identifies conversational fillers vs genuine technical questions', () => {
      expect(isFillerOrNoise('алло')).toBe(true);
      expect(isFillerOrNoise('чути мене?')).toBe(true);
      expect(isFillerOrNoise('ясна річ')).toBe(true);
      expect(isFillerOrNoise('ну ок, добре')).toBe(false);
      expect(isFillerOrNoise('Що таке MVCC у PostgreSQL?')).toBe(false);
      expect(isFillerOrNoise('Як влаштований Event Loop у Node.js?')).toBe(false);
    });

    it('isolates target question from preceding interviewer feedback and transition markers', () => {
      const interviewTranscript =
        'Дякую за відповідь по Celery, все зрозуміло. А тепер наступне питання: як влаштований garbage collector у Python?';
      const extracted = isolateTargetQuestionHeuristics(interviewTranscript);

      expect(extracted.hasTransitionMarker).toBe(true);
      expect(extracted.isolatedQuestion).toContain('наступне питання: як влаштований garbage collector у Python?');
      expect(extracted.contextPreamble).toContain('Дякую за відповідь по Celery');
    });
  });

  describe('2. Nested Code Blocks & Streaming Markdown Edge Cases', () => {
    it('handles unclosed code block during active streaming without layout snapping (CLS = 0)', () => {
      const streamingChunk = `Here is the solution:
\`\`\`typescript
interface ConnectionPool {
  acquire(): Promise<Connection>;
  release(conn: Connection): void;
}`;

      const sections = parseStreamingMarkdown(streamingChunk, true);
      expect(sections).toHaveLength(2);
      expect(sections[0].type).toBe('text');
      expect(sections[0].content).toBe('Here is the solution:');

      expect(sections[1].type).toBe('code');
      expect(sections[1].language).toBe('typescript');
      expect(sections[1].content).toContain('interface ConnectionPool');
      expect(sections[1].isStreaming).toBe(true);
    });

    it('preserves explanations both BEFORE and AFTER a closed code block', () => {
      const markdown = `Before the code block:
\`\`\`python
def calculate_hash(val: str) -> str:
    return hashlib.sha256(val.encode()).hexdigest()
\`\`\`
After the code block: this provides cryptographic integrity.`;

      const sections = parseStreamingMarkdown(markdown, false);
      expect(sections).toHaveLength(3);
      expect(sections[0].type).toBe('text');
      expect(sections[0].content).toBe('Before the code block:');

      expect(sections[1].type).toBe('code');
      expect(sections[1].language).toBe('python');
      expect(sections[1].content).toContain('calculate_hash');
      expect(sections[1].isStreaming).toBe(false);

      expect(sections[2].type).toBe('text');
      expect(sections[2].content).toBe('After the code block: this provides cryptographic integrity.');
    });

    it('handles JavaScript template literals with backticks inside code blocks', () => {
      const codeWithBackticks = `\`\`\`typescript
const query = \`SELECT * FROM users WHERE tenant_id = \${tenantId}\`;
console.log(\`Running: \${query}\`);
\`\`\``;

      const sections = parseStreamingMarkdown(codeWithBackticks, false);
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('code');
      expect(sections[0].content).toContain('`SELECT * FROM users');
      expect(sections[0].content).toContain('console.log(`Running:');
    });

    it('handles multiple sequential code blocks with interstitial markdown commentary', () => {
      const multiBlock = `First implementation:
\`\`\`python
def sync_worker(): pass
\`\`\`
Second implementation:
\`\`\`typescript
async function asyncWorker(): Promise<void> {}
\`\`\``;

      const sections = parseStreamingMarkdown(multiBlock, false);
      expect(sections).toHaveLength(4);
      expect(sections[0].content).toBe('First implementation:');
      expect(sections[1].content).toBe('def sync_worker(): pass');
      expect(sections[2].content).toBe('Second implementation:');
      expect(sections[3].content).toBe('async function asyncWorker(): Promise<void> {}');
    });

    it('handles nested markdown blocks (4 backticks outer fence)', () => {
      // Standard nested markdown uses 4 backticks for outer container
      const nested = `\`\`\`\`markdown
\`\`\`json
{"status": "ok"}
\`\`\`
\`\`\`\``;

      const sections = parseStreamingMarkdown(nested, false);
      expect(sections).toHaveLength(1);
      expect(sections[0].type).toBe('code');
      expect(sections[0].language).toBe('markdown');
      expect(sections[0].content).toBe('```json\n{"status": "ok"}\n```');
      expect(sections[0].isStreaming).toBe(false);
    });

    it('stabilizes in-flight streaming code fences before newline arrives (zero CLS)', () => {
      // When streaming, opening fence tag arrives before newline (e.g. '```typescript')
      const partialFence = '```typescript';
      const sectionsBeforeNewline = parseStreamingMarkdown(partialFence, true);

      // Stabilized: parsed immediately as code section with empty content and active cursor to prevent layout snapping
      expect(sectionsBeforeNewline).toHaveLength(1);
      expect(sectionsBeforeNewline[0].type).toBe('code');
      expect(sectionsBeforeNewline[0].language).toBe('typescript');
      expect(sectionsBeforeNewline[0].content).toBe('');
      expect(sectionsBeforeNewline[0].isStreaming).toBe(true);

      // Once '\n' arrives in next token, section remains code block without layout snap:
      const sectionsAfterNewline = parseStreamingMarkdown('```typescript\n', true);
      expect(sectionsAfterNewline).toHaveLength(1);
      expect(sectionsAfterNewline[0].type).toBe('code');
      expect(sectionsAfterNewline[0].language).toBe('typescript');
      expect(sectionsAfterNewline[0].content).toBe('');
      expect(sectionsAfterNewline[0].isStreaming).toBe(true);

      // In non-streaming mode (e.g. completed text without newline), treated as plain text
      const nonStreaming = parseStreamingMarkdown('```typescript', false);
      expect(nonStreaming).toHaveLength(1);
      expect(nonStreaming[0].type).toBe('text');
      expect(nonStreaming[0].content).toBe('```typescript');
    });
  });

  describe('3. Rapid Token Accumulation & Delimiter Extraction Stress', () => {
    it('simulates rapid high-frequency token accumulation (1000 tokens/sec burst)', async () => {
      const client = new DualStreamClient();
      const chunks: string[] = [];
      const tokens: string[] = [];

      const result = await client.requestStream(
        { question: 'Explain the internals of PostgreSQL VACUUM and transaction wraparound' },
        {
          chunkDelayMs: 0,
          onToken: (tok) => tokens.push(tok),
          onChunk: (chk) => chunks.push(chk),
        }
      );

      expect(tokens.length).toBeGreaterThan(10);
      expect(chunks.length).toBeGreaterThan(10);
      expect(result.hook).toBeTruthy();
      expect(result.pillars.length).toBeGreaterThanOrEqual(2);
      expect(result.deepDive).toBeTruthy();
      expect(result.ttftMs).toBeLessThan(900);
    });

    it('handles phase delimiters split across chunk boundaries during streaming', () => {
      // Delimiter arrives fragmented: "<<<PHASE_" in chunk 1, "2:PILLARS>>>" in chunk 2
      const fragment1 = `<<<PHASE_1:HOOK>>>
PostgreSQL uses Multi-Version Concurrency Control.
<<<PHASE_`;

      const res1 = parseDualStreamDelimiters(fragment1);
      expect(res1.hook).toBe('PostgreSQL uses Multi-Version Concurrency Control.');
      expect(res1.hook).not.toContain('<<<');
      expect(res1.pillars).toHaveLength(0);

      // Now chunk 2 completes the delimiter and adds first pillar
      const fragment2 = fragment1 + `2:PILLARS>>>
• Non-blocking reads
• Autovacuum prevents wraparound`;

      const res2 = parseDualStreamDelimiters(fragment2);
      expect(res2.hook).toBe('PostgreSQL uses Multi-Version Concurrency Control.');
      expect(res2.pillars).toHaveLength(2);
      expect(res2.pillars[0]).toBe('Non-blocking reads');
      expect(res2.pillars[1]).toBe('Autovacuum prevents wraparound');
    });

    it('extracts start hook safely even when <<<PHASE_1:HOOK>>> tag is completely missing', () => {
      const rawNoHookTag = `Direct initial response text spoken immediately.
<<<PHASE_2:PILLARS>>>
• Point one
• Point two
<<<PHASE_3:DEEP_DIVE>>>
Detailed code
<<<END>>>`;

      const parsed = parseDualStreamDelimiters(rawNoHookTag);
      expect(parsed.hook).toBe('Direct initial response text spoken immediately.');
      expect(parsed.pillars).toHaveLength(2);
      expect(parsed.deepDive).toBe('Detailed code');
    });
  });

  describe('4. Resilient Clipboard Fallback Under Mocked Failures', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    // Helper replicating handleCopy logic from DualColumnChat.tsx lines 184-218
    async function executeCopy(text: string): Promise<boolean> {
      let success = false;
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          success = true;
        }
      } catch {
        // Fallback triggered on rejection
      }

      if (!success && typeof document !== 'undefined') {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          textarea.style.top = '-9999px';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          success = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {}
      }

      return success;
    }

    it('uses navigator.clipboard.writeText when available and operational', async () => {
      let writtenText = '';
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn(async (text: string) => {
            writtenText = text;
          }),
        },
      });

      const result = await executeCopy('const x = 42;');
      expect(result).toBe(true);
      expect(writtenText).toBe('const x = 42;');
    });

    it('falls back to document.execCommand when navigator.clipboard.writeText rejects', async () => {
      let execCommandCalledWith = '';
      let appendedValue = '';

      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn(async () => {
            throw new Error('NotAllowedError: Clipboard permission denied');
          }),
        },
      });

      const mockTextarea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => {
          if (tag === 'textarea') return mockTextarea;
          return {};
        }),
        body: {
          appendChild: vi.fn((el: any) => {
            appendedValue = el.value;
          }),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn((command: string) => {
          execCommandCalledWith = command;
          return true;
        }),
      });

      const result = await executeCopy('fallback code content');
      expect(result).toBe(true);
      expect(execCommandCalledWith).toBe('copy');
      expect(appendedValue).toBe('fallback code content');
    });

    it('falls back to document.execCommand when navigator.clipboard is undefined (non-secure context)', async () => {
      let execCommandCalledWith = '';
      let appendedValue = '';

      vi.stubGlobal('navigator', {});

      const mockTextarea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockTextarea),
        body: {
          appendChild: vi.fn((el: any) => {
            appendedValue = el.value;
          }),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn((command: string) => {
          execCommandCalledWith = command;
          return true;
        }),
      });

      const result = await executeCopy('http insecure context code');
      expect(result).toBe(true);
      expect(execCommandCalledWith).toBe('copy');
      expect(appendedValue).toBe('http insecure context code');
    });

    it('returns false cleanly without uncaught exceptions if both methods fail', async () => {
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn(async () => {
            throw new Error('Denied');
          }),
        },
      });

      vi.stubGlobal('document', {
        createElement: vi.fn(() => ({
          style: {},
          focus: vi.fn(),
          select: vi.fn(),
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn(() => {
          throw new Error('execCommand disabled');
        }),
      });

      const result = await executeCopy('total failure test');
      expect(result).toBe(false);
    });
  });
});
