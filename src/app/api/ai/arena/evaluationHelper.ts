/**
 * Arena Evaluation Helper & Schema Normalizer
 * Guarantees that evaluation responses strictly conform to the Senior Rubric & Trap Simulator contract.
 */

export interface SeniorBenchmark {
  hook: string;
  pillars: [string, string, string] | string[];
  productionExample: string;
}

export interface TrapDrill {
  trapQuestion: string;
  interviewerAngle: string;
  idealDefense: string;
}

export interface UpgradedEvaluationResult {
  score: number;
  verdict: string;
  scores: {
    technicalAccuracy: number;
    architecturalVision: number;
    communication: number;
    stressResilience: number;
    thinkingSpeed: number;
  };
  strengths: string[];
  missingKeyConcepts: string[];
  staffEngineerAnswer: string;
  whatWorked: string[];
  weakSpots: string[];
  seniorBenchmark: SeniorBenchmark;
  trapDrill: TrapDrill;
}

interface FallbackParams {
  question?: string;
  candidateAnswer?: string;
  track?: string;
  level?: string;
  isArchitectureCase?: boolean;
  language?: string;
  calculatedSpeed?: number;
}

/**
 * Creates a deterministic, complete senior rubric evaluation fallback
 * when AI service is unavailable or times out.
 */
export function generateArenaEvaluationFallback(params: FallbackParams = {}): UpgradedEvaluationResult {
  const {
    question = 'Технічне питання',
    candidateAnswer = '',
    track = 'frontend',
    level = 'Senior',
    isArchitectureCase = false,
    language = 'uk',
    calculatedSpeed = 85,
  } = params;

  const isUa = language === 'uk' || language === 'ua';
  const hasSubstantialAnswer = candidateAnswer.trim().length > 40;

  const baseScore = hasSubstantialAnswer ? 86 : 65;
  const verdict = isUa
    ? hasSubstantialAnswer
      ? 'Гарна відповідь зі знанням архітектури'
      : 'Відповідь потребує глибшої аргументації та прикладів'
    : hasSubstantialAnswer
    ? 'Strong technical answer with clear trade-offs'
    : 'Answer requires deeper architectural justification';

  const whatWorked = isUa
    ? [
        hasSubstantialAnswer
          ? 'Чітке розуміння базових принципів та термінології'
          : 'Спроба дати пряму відповідь без затримок',
        'Впевнена інтонація та структурований виклад думок',
        'Фокус на стабільності та відсутності критичних помилок',
      ]
    : [
        hasSubstantialAnswer
          ? 'Clear articulation of core engineering concepts'
          : 'Direct response attempt without hesitation',
        'Structured cadence with solid technical terminology',
        'Awareness of runtime constraints and edge cases',
      ];

  const weakSpots = isUa
    ? [
        'Не вистачило конкретних числових метрик (p99 latency, RPS, memory overhead)',
        'Варто було детальніше розкрити поведінку системи при нештатних падіннях мережі',
        'Відсутність живого кодового або конфігураційного прикладу',
      ]
    : [
        'Missing concrete production metrics (p99 latency, RPS, memory profile)',
        'Should detail edge-case resilience during partial network split',
        'Could be elevated by referencing concrete production snippets',
      ];

  const seniorBenchmark: SeniorBenchmark = {
    hook: isUa
      ? `«У продакшені для вирішення задачі ${track} ми завжди розділяємо критичний шлях виконання на атомарні кроки з гарантією ідемпотентності та нульового блокування»`
      : `«In production systems, we isolate the critical execution path into atomic operations with idempotency guards and zero-blocking asynchronous fallbacks»`,
    pillars: isUa
      ? [
          'Якір 1 (Архітектура): Розподіл відповідальності та чіткі межі між збереженням стану та транспортом',
          'Якір 2 (Продуктивність): Запобігання блокуванню потоку, мінімізація алокацій пам’яті та використання кешів',
          'Якір 3 (Надійність): Захист від гонок (Race Conditions), graceful degradation та автоматичні ретраї з експоненційним jitter',
        ]
      : [
          'Pillar 1 (Architecture): Strict boundary separation between persistent state mutations and ingress transport',
          'Pillar 2 (Performance): Zero thread blocking, minimized heap allocations, and near-cache invalidation',
          'Pillar 3 (Resilience): Race condition isolation, graceful degradation, and exponential backoff with jitter',
        ],
    productionExample: isUa
      ? `// Патерн захисту від каскадного падіння:\nconst controller = new AbortController();\nconst timeout = setTimeout(() => controller.abort(), 2500);\ntry {\n  const res = await fetch('/api/upstream', { signal: controller.signal });\n} finally {\n  clearTimeout(timeout);\n}`
      : `// Upstream circuit breaker with abort signals:\nconst controller = new AbortController();\nconst timeout = setTimeout(() => controller.abort(), 2500);\ntry {\n  const res = await fetch('/api/upstream', { signal: controller.signal });\n} finally {\n  clearTimeout(timeout);\n}`,
  };

  const trapDrill: TrapDrill = {
    trapQuestion: isUa
      ? `«Уявіть, що під час виконання вашого рішення мережа раптово розпалася (Network Partition) або upstream сервіс віддає 504 Gateway Timeout. Як саме ваша архітектура гарантує відсутність подвійного списання або втрати даних?»`
      : `«Imagine a sudden network partition or upstream 504 Gateway Timeout during this execution. How exactly does your architecture guarantee zero data loss or duplicate mutation?»`,
    interviewerAngle: isUa
      ? 'Інтервʼюер перевіряє чи мислить кандидат ідемпотентністю та транзакційними межами, чи сподівається на "ідеальний інтернет".'
      : 'The interviewer is validating whether you design for network unreliability using idempotency tokens rather than happy-path assumptions.',
    idealDefense: isUa
      ? '«Ми використовуємо Idempotency-Key у заголовку з попереднім збереженням у Transactional Outbox; якщо відповідь втрачена, повторний запит повертає вже збережений результат без повторних мутацій».'
      : '«We enforce client Idempotency-Keys atomically paired with Transactional Outbox tables; retries safely return cached committed responses without executing side-effects twice».',
  };

  const staffEngineerAnswer = `${seniorBenchmark.hook}\n\n1. ${seniorBenchmark.pillars[0]}\n2. ${seniorBenchmark.pillars[1]}\n3. ${seniorBenchmark.pillars[2]}\n\nПриклад:\n${seniorBenchmark.productionExample}`;

  return {
    score: baseScore,
    verdict,
    scores: {
      technicalAccuracy: hasSubstantialAnswer ? 88 : 70,
      architecturalVision: hasSubstantialAnswer ? 85 : 65,
      communication: hasSubstantialAnswer ? 87 : 72,
      stressResilience: hasSubstantialAnswer ? 86 : 68,
      thinkingSpeed: calculatedSpeed,
    },
    strengths: whatWorked,
    missingKeyConcepts: weakSpots,
    staffEngineerAnswer,
    whatWorked,
    weakSpots,
    seniorBenchmark,
    trapDrill,
  };
}

/**
 * Normalizes raw AI output to ensure senior rubric and trap drill fields are always populated.
 */
export function normalizeEvaluationResult(
  raw: Record<string, unknown>,
  fallbackParams: FallbackParams = {}
): UpgradedEvaluationResult {
  const fallback = generateArenaEvaluationFallback(fallbackParams);

  const rawScores = (raw.scores as Record<string, number>) || {};

  const scores = {
    technicalAccuracy: typeof rawScores.technicalAccuracy === 'number' ? rawScores.technicalAccuracy : fallback.scores.technicalAccuracy,
    architecturalVision: typeof rawScores.architecturalVision === 'number' ? rawScores.architecturalVision : fallback.scores.architecturalVision,
    communication: typeof rawScores.communication === 'number' ? rawScores.communication : fallback.scores.communication,
    stressResilience: typeof rawScores.stressResilience === 'number' ? rawScores.stressResilience : fallback.scores.stressResilience,
    thinkingSpeed: typeof rawScores.thinkingSpeed === 'number' ? rawScores.thinkingSpeed : fallback.scores.thinkingSpeed,
  };

  const whatWorked = Array.isArray(raw.whatWorked) && raw.whatWorked.length > 0
    ? (raw.whatWorked as string[])
    : Array.isArray(raw.strengths) && raw.strengths.length > 0
    ? (raw.strengths as string[])
    : fallback.whatWorked;

  const weakSpots = Array.isArray(raw.weakSpots) && raw.weakSpots.length > 0
    ? (raw.weakSpots as string[])
    : Array.isArray(raw.missingKeyConcepts) && raw.missingKeyConcepts.length > 0
    ? (raw.missingKeyConcepts as string[])
    : fallback.weakSpots;

  const rawBenchmark = (raw.seniorBenchmark as Record<string, unknown>) || {};
  const seniorBenchmark: SeniorBenchmark = {
    hook: typeof rawBenchmark.hook === 'string' && rawBenchmark.hook.trim().length > 10
      ? rawBenchmark.hook
      : fallback.seniorBenchmark.hook,
    pillars: Array.isArray(rawBenchmark.pillars) && rawBenchmark.pillars.length >= 3
      ? (rawBenchmark.pillars as [string, string, string])
      : fallback.seniorBenchmark.pillars,
    productionExample: typeof rawBenchmark.productionExample === 'string' && rawBenchmark.productionExample.trim().length > 10
      ? rawBenchmark.productionExample
      : fallback.seniorBenchmark.productionExample,
  };

  const rawTrap = (raw.trapDrill as Record<string, unknown>) || {};
  const trapDrill: TrapDrill = {
    trapQuestion: typeof rawTrap.trapQuestion === 'string' && rawTrap.trapQuestion.trim().length > 10
      ? rawTrap.trapQuestion
      : fallback.trapDrill.trapQuestion,
    interviewerAngle: typeof rawTrap.interviewerAngle === 'string' && rawTrap.interviewerAngle.trim().length > 10
      ? rawTrap.interviewerAngle
      : fallback.trapDrill.interviewerAngle,
    idealDefense: typeof rawTrap.idealDefense === 'string' && rawTrap.idealDefense.trim().length > 10
      ? rawTrap.idealDefense
      : fallback.trapDrill.idealDefense,
  };

  const score = typeof raw.score === 'number' ? raw.score : fallback.score;
  const verdict = typeof raw.verdict === 'string' && raw.verdict ? raw.verdict : fallback.verdict;
  const staffEngineerAnswer = typeof raw.staffEngineerAnswer === 'string' && raw.staffEngineerAnswer
    ? raw.staffEngineerAnswer
    : fallback.staffEngineerAnswer;

  return {
    score,
    verdict,
    scores,
    strengths: whatWorked,
    missingKeyConcepts: weakSpots,
    staffEngineerAnswer,
    whatWorked,
    weakSpots,
    seniorBenchmark,
    trapDrill,
  };
}
