/**
 * 1-click demo simulation: a realistic two-question mock interview streamed through the SAME
 * event path as the native pipeline (`HudEvent`s), so the candidate can verify audio-less UI,
 * message<->answer linking, history navigation and the 3-phase teleprompter in ~2 seconds.
 */

import type { HudEvent } from '../types/hud';

export interface DemoHandle {
  cancel: () => void;
}

interface DemoScene {
  id: string;
  question: string;
  answer: string;
  candidateLine?: string;
}

const L = (...lines: string[]) => lines.join('\n');

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'demo-q1',
    question: 'Розкажіть, як би ви спроєктували rate limiter для публічного API?',
    answer: L(
      '<<<META: Backend | Senior | UA>>>',
      '<<<PHASE_1:HOOK>>>',
      'Я б почав із **token bucket** у Redis: він дає плавні ліміти, дозволяє burst і рахується атомарно одним Lua-скриптом.',
      '<<<PHASE_2:PILLARS>>>',
      '- **Алгоритм:** token bucket на ключ `user:{id}`, refill за часом, burst до N запитів',
      '- **Атомарність:** Lua-скрипт у Redis — без race condition між інстансами API',
      '- **Відповідь клієнту:** `429` + заголовки `Retry-After` і `X-RateLimit-Remaining`',
      '- **Деградація:** якщо Redis недоступний — fail-open з локальним лімітом на інстанс',
      '<<<PHASE_3:DEEP_DIVE>>>',
      "**Trade-off:** sliding window точніший, але дорожчий по пам'яті (O(n) на ключ); token bucket — O(1) і достатньо точний для публічного API.",
      '',
      '```ts',
      'const LUA = `',
      "  local tokens = tonumber(redis.call('GET', KEYS[1]) or ARGV[1])",
      '  local refill = math.floor((ARGV[3] - ARGV[4]) * ARGV[2])',
      '  tokens = math.min(ARGV[1], tokens + refill)',
      '  if tokens < 1 then return 0 end',
      "  redis.call('SET', KEYS[1], tokens - 1, 'PX', 60000)",
      '  return 1',
      '`;',
      '',
      'export async function allow(userId: string): Promise<boolean> {',
      '  const now = Date.now();',
      '  return (await redis.eval(LUA, 1, `rl:${userId}`, 100, 10, now, now - 1000)) === 1;',
      '}',
      '```',
      '<<<END>>>'
    ),
    candidateLine: 'Так, зараз коротко опишу підхід.',
  },
  {
    id: 'demo-q2',
    question: 'А як ви реалізуєте LRU-кеш з O(1) для get і put?',
    answer: L(
      '<<<META: Algorithms | Senior | UA>>>',
      '<<<PHASE_1:HOOK>>>',
      'Класика: **хеш-мапа плюс двозв\'язний список** — мапа дає O(1) доступ, список тримає порядок використання.',
      '<<<PHASE_2:PILLARS>>>',
      '- **get:** знайти вузол у мапі, перемістити в голову списку',
      '- **put:** оновити або вставити в голову; якщо перевищено ємність — видалити хвіст',
      '- **У JS:** `Map` зберігає порядок вставки, тому можна обійтися без власного списку',
      '<<<PHASE_3:DEEP_DIVE>>>',
      '```ts',
      'class LRU<K, V> {',
      '  private m = new Map<K, V>();',
      '  constructor(private cap: number) {}',
      '  get(k: K): V | undefined {',
      '    if (!this.m.has(k)) return undefined;',
      '    const v = this.m.get(k)!;',
      '    this.m.delete(k);',
      '    this.m.set(k, v);',
      '    return v;',
      '  }',
      '  put(k: K, v: V) {',
      '    this.m.delete(k);',
      '    this.m.set(k, v);',
      '    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value!);',
      '  }',
      '}',
      '```',
      '<<<END>>>'
    ),
  },
];

/** Splits text into small, human-looking token groups. */
export function tokenizeForStream(text: string, size = 4): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/**
 * Plays the scenes. Timings are intentionally brisk: the first question lands after ~300 ms and the
 * first streamed token after ~700 ms (mirrors the <220 ms TTFT promise without feeling instant-fake).
 */
export function runDemoInterview(
  emit: (event: HudEvent) => void,
  options: { speedFactor?: number; scenes?: DemoScene[] } = {}
): DemoHandle {
  const speed = Math.max(0.1, options.speedFactor ?? 1);
  const scenes = options.scenes ?? DEMO_SCENES;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let cancelled = false;

  const later = (ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!cancelled) fn();
    }, ms / speed);
    timers.add(t);
  };

  let clock = 250;
  scenes.forEach((scene) => {
    const words = scene.question.split(' ');
    // Interim typing effect of the transcript.
    words.forEach((_, i) => {
      if (i % 2 === 1 || i === words.length - 1) {
        later(clock + i * 70, () =>
          emit({
            type: 'sttTranscript',
            payload: {
              speaker: 'interlocutor',
              text: words.slice(0, i + 1).join(' '),
              is_final: i === words.length - 1,
              speech_final: i === words.length - 1,
              timestamp_ms: Date.now(),
            },
          })
        );
      }
    });
    clock += words.length * 70 + 120;

    later(clock, () =>
      emit({
        type: 'questionDetected',
        payload: { id: scene.id, question: scene.question, timestamp_ms: Date.now() },
      })
    );
    clock += 190;

    const chunks = tokenizeForStream(scene.answer);
    chunks.forEach((token, i) => {
      later(clock + i * 22, () =>
        emit({
          type: 'llmChunk',
          payload: { question_id: scene.id, token, is_first: i === 0 },
        })
      );
    });
    clock += chunks.length * 22 + 40;
    const latency = 190 + chunks.length * 22;
    later(clock, () =>
      emit({
        type: 'llmDone',
        payload: { question_id: scene.id, full_text: scene.answer, latency_ms: latency },
      })
    );

    if (scene.candidateLine) {
      clock += 700;
      const line = scene.candidateLine;
      later(clock, () =>
        emit({
          type: 'sttTranscript',
          payload: { speaker: 'candidate', text: line, is_final: true, speech_final: true, timestamp_ms: Date.now() },
        })
      );
    }
    clock += 2200;
  });

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}

// ------------------------------------------------------------------ cross-window demo handshake

export const DEMO_FLAG_KEY = 'gb_demo_pending';
export const DEMO_EVENT = 'gb:demo-start';

/** Marks a demo request that the (possibly not yet mounted) HUD picks up on mount. */
export function markDemoPending(): void {
  try {
    localStorage.setItem(DEMO_FLAG_KEY, String(Date.now()));
  } catch {
    /* storage unavailable: the live Tauri event still reaches an already open HUD */
  }
}

/** Consumes a fresh pending-demo flag (valid for 15 s). */
export function consumeDemoPending(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(DEMO_FLAG_KEY);
    if (!raw) return false;
    localStorage.removeItem(DEMO_FLAG_KEY);
    return now - Number(raw) < 15_000;
  } catch {
    return false;
  }
}
