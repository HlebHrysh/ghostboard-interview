import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { InterviewQAItem } from '@/types/interview';
import { normalizeTechnicalSpeech, hasTechnicalKeyword, isFillerOrNoise } from '@/lib/techSpeechNormalizer';
import { CandidateProfile } from '@/components/CandidateProfileModal';
import { parseStructuredGhostboardOutput, mergeContinuationQuestion } from '@/lib/aiPromptCore';
import { matchSpokenTranscriptToPillars } from '@/lib/voiceAnchorTracker';
import { evaluateSpeechIntent } from '@/lib/speechIntentGate';
import {
  PatchTargetSlot,
  SpeculativeHookEntry,
  StructuredAnswerSlots,
  isSpeculativeHookValid,
  mergeSurgicalAnswerSlots,
  resolvePatchSlotForModifier,
  tokenizeSignificantWords,
} from '@/lib/speculativeSlotEngine';

const SPECULATIVE_DEBOUNCE_MS = 280;
const SPECULATIVE_CACHE_TTL_MS = 20000;

async function consumeDualStreamSSE(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onTelemetry?: (data: { ttftMs?: number; model?: string }) => void;
    onChunk?: (text: string) => 'stop' | void | Promise<'stop' | void>;
    onError?: (message: string) => void;
  }
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'chunk';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEvent = 'chunk';
          continue;
        }

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace(/^event:\s*/, '').trim();
          continue;
        }

        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
          if (jsonStr === '[DONE]') continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(jsonStr) as Record<string, unknown>;
          } catch {
            continue;
          }

          if (currentEvent === 'telemetry') {
            handlers.onTelemetry?.(parsed as { ttftMs?: number; model?: string });
          } else if (currentEvent === 'chunk' && typeof parsed.text === 'string' && parsed.text) {
            const action = await handlers.onChunk?.(parsed.text);
            if (action === 'stop') {
              try {
                await reader.cancel();
              } catch {}
              return;
            }
          } else if (currentEvent === 'error') {
            throw new Error(typeof parsed.message === 'string' ? parsed.message : 'Stream error');
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

interface CopilotMessages {
  analyzing: (q: string) => string;
  ready: string;
  busy: string;
  noTranscript: string;
  answerFailed: string;
  genFailed: string;
  timeout: string;
  queued: (n: number) => string;
  refined: string;
  refineFailed: string;
  updating: string;
  defaultHints: string[];
  refineLabels: Record<string, string>;
}

const MESSAGES: Record<string, CopilotMessages> = {
  uk: {
    analyzing: (q) => `⚡ ШІ аналізує «${q}...»`,
    ready: '✅ Відповідь готова!',
    busy: '⚡ ШІ вже аналізує та формує відповідь...',
    noTranscript: '⏳ Немає накопиченого тексту запитання. Зачекайте, поки співрозмовник озвучить запитання.',
    answerFailed: 'Помилка отримання відповіді',
    genFailed: 'Помилка генерації відповіді',
    timeout: 'ШІ відповідає надто довго. Спробуйте ще раз [Enter].',
    queued: (n) => `⚡ ШІ дав відповідь на нове питання (+${n} у черзі). Перегляд зафіксовано. [Space] для переходу.`,
    refined: 'Відповідь скориговано!',
    refineFailed: 'Не вдалося скоригувати відповідь',
    updating: 'Оновлюю відповідь...',
    defaultHints: ['Поясни внутрішню архітектуру та механізми памʼяті', 'Наведи практичний приклад зі свого стеку'],
    refineLabels: {
      under_the_hood: '⚙️ Поглиблюю механіку "Під капотом"...',
      code: '💻 Генерую практичний код...',
      shorter: '✂️ Стискаю до ключової тези...',
      simpler: '💡 Пояснюю простіше, на пальцях...',
      re_angle: '🔄 Переосмислюю під іншим кутом...',
    },
  },
  ru: {
    analyzing: (q) => `⚡ ИИ анализирует «${q}...»`,
    ready: '✅ Ответ готов!',
    busy: '⚡ ИИ уже анализирует и формирует ответ...',
    noTranscript: '⏳ Нет накопленного текста вопроса. Подождите, пока собеседник задаст вопрос.',
    answerFailed: 'Ошибка получения ответа',
    genFailed: 'Ошибка генерации ответа',
    timeout: 'ИИ отвечает слишком долго. Попробуйте ещё раз [Enter].',
    queued: (n) => `⚡ ИИ ответил на новый вопрос (+${n} в очереди). Просмотр зафиксирован. [Space] для перехода.`,
    refined: 'Ответ скорректирован!',
    refineFailed: 'Не удалось скорректировать ответ',
    updating: 'Обновляю ответ...',
    defaultHints: ['Объясни внутреннюю архитектуру и работу с памятью', 'Приведи практический пример из своего стека'],
    refineLabels: {
      under_the_hood: '⚙️ Углубляю механику «под капотом»...',
      code: '💻 Генерирую практический код...',
      shorter: '✂️ Сжимаю до ключевого тезиса...',
      simpler: '💡 Объясняю проще, на пальцах...',
      re_angle: '🔄 Переосмысляю под другим углом...',
    },
  },
  en: {
    analyzing: (q) => `⚡ AI is analyzing "${q}..."`,
    ready: '✅ Answer ready!',
    busy: '⚡ AI is already generating an answer...',
    noTranscript: '⏳ No question captured yet. Wait for the interviewer to finish speaking.',
    answerFailed: 'Failed to get an answer',
    genFailed: 'Answer generation failed',
    timeout: 'AI is taking too long. Try again with [Enter].',
    queued: (n) => `⚡ AI answered a new question (+${n} queued). View is frozen. Press [Space] to jump.`,
    refined: 'Answer refined!',
    refineFailed: 'Could not refine the answer',
    updating: 'Updating answer...',
    defaultHints: ['Explain the internal architecture and memory behavior', 'Give a practical example from your stack'],
    refineLabels: {
      under_the_hood: '⚙️ Digging into the internals...',
      code: '💻 Generating practical code...',
      shorter: '✂️ Condensing to the key point...',
      simpler: '💡 Simplifying explanation...',
      re_angle: '🔄 Rethinking from another angle...',
    },
  },
};

function getMsg(lang: string | undefined): CopilotMessages {
  return MESSAGES[lang || ''] || MESSAGES.en;
}

interface UseCopilotAIOptions {
  speechLanguageRef: React.MutableRefObject<string>;
  outputLanguageRef: React.MutableRefObject<string>;
  candidateProfileRef: React.MutableRefObject<CandidateProfile>;
  isConciseRef: React.MutableRefObject<boolean>;
  triggerModeRef: React.MutableRefObject<'auto' | 'enter'>;
  hudBroadcastRef: React.MutableRefObject<BroadcastChannel | null>;
  isFrozenRef: React.MutableRefObject<boolean>;
  sessionModeRef: React.MutableRefObject<'interview' | 'meeting'>;
  sessionDuration: number;
}

export function useCopilotAI({
  speechLanguageRef,
  outputLanguageRef,
  candidateProfileRef,
  isConciseRef,
  triggerModeRef,
  hudBroadcastRef,
  isFrozenRef,
  sessionModeRef,
  sessionDuration,
}: UseCopilotAIOptions) {
  const [interviewQAs, setInterviewQAs] = useState<InterviewQAItem[]>([]);
  const interviewQAsRef = useRef<InterviewQAItem[]>([]);
  interviewQAsRef.current = interviewQAs;
  const [activeQAId, setActiveQAId] = useState<string | null>(null);
  const activeQAIdRef = useRef<string | null>(null);
  const [isCopilotGenerating, setIsCopilotGenerating] = useState(false);
  
  const pendingFragmentsRef = useRef<string[]>([]);
  const interviewerStoryBufferRef = useRef<string>('');
  const interviewerStoryClausesRef = useRef<Array<{ text: string; timestamp: number }>>([]);
  const lastInterviewerChunkTimeRef = useRef<number>(0);
  const lastAutoVoiceTriggerTimeRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCopilotGeneratingRef = useRef<boolean>(false);
  const lastQATimestampRef = useRef<number>(0);
  const lastQATextRef = useRef<string>('');
  const [pendingNewCount, setPendingNewCount] = useState<number>(0);
  const pendingNewCountRef = useRef<number>(0);
  const sessionDurationRef = useRef<number>(sessionDuration);
  sessionDurationRef.current = sessionDuration;

  const [speculativeHitMap, setSpeculativeHitMap] = useState<Record<string, boolean>>({});
  const [patchingSlotMap, setPatchingSlotMap] = useState<Record<string, PatchTargetSlot>>({});
  const speculativeHookCacheRef = useRef<SpeculativeHookEntry | null>(null);
  const speculativeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const speculativeAbortRef = useRef<AbortController | null>(null);
  const speculativeInFlightQuestionRef = useRef<string | null>(null);
  const refineAbortRef = useRef<AbortController | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const buildRecentHistory = useCallback(() => {
    return interviewQAsRef.current
      .slice(0, 2)
      .reverse()
      .flatMap((qa) => [
        { speaker: 'interviewer' as const, text: qa.question },
        { speaker: 'candidate' as const, text: qa.quickAnswer || qa.startHook || '' },
      ])
      .filter((h) => h.text.trim().length > 0);
  }, []);

  const clearSpeculativeDebounce = useCallback(() => {
    if (speculativeDebounceRef.current) {
      clearTimeout(speculativeDebounceRef.current);
      speculativeDebounceRef.current = null;
    }
  }, []);

  const abortSpeculativePrefetch = useCallback(() => {
    clearSpeculativeDebounce();
    if (speculativeAbortRef.current) {
      speculativeAbortRef.current.abort();
      speculativeAbortRef.current = null;
    }
    speculativeInFlightQuestionRef.current = null;
    speculativeHookCacheRef.current = null;
  }, [clearSpeculativeDebounce]);

  const startSpeculativeHookPrefetch = useCallback(
    async (interimQuestion: string) => {
      const cleanQ = interimQuestion.trim();
      if (!cleanQ || isCopilotGeneratingRef.current) return;

      if (
        speculativeInFlightQuestionRef.current &&
        isSpeculativeHookValid(speculativeInFlightQuestionRef.current, cleanQ)
      ) {
        return;
      }

      const existingCache = speculativeHookCacheRef.current;
      if (
        existingCache &&
        Date.now() - existingCache.createdAt < SPECULATIVE_CACHE_TTL_MS &&
        isSpeculativeHookValid(existingCache.interimQuestion, cleanQ)
      ) {
        return;
      }

      if (speculativeAbortRef.current) {
        speculativeAbortRef.current.abort();
      }

      const controller = new AbortController();
      speculativeAbortRef.current = controller;
      speculativeInFlightQuestionRef.current = cleanQ;

      const timeoutId = setTimeout(() => controller.abort(), 6000);
      let rawHookStream = '';

      try {
        const res = await fetch('/api/ai/dual-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            question: cleanQ,
            history: buildRecentHistory(),
            outputLanguage: outputLanguageRef.current.startsWith('bilingual')
              ? 'bilingual'
              : outputLanguageRef.current,
            helperLanguage: outputLanguageRef.current === 'bilingual_ru' ? 'ru' : 'uk',
            candidateProfile: candidateProfileRef.current,
            isConcise: isConciseRef.current,
            directorModifier: 'normal',
            patchSlot: 'speculative_hook',
          }),
        });

        if (!res.ok || !res.body) return;

        await consumeDualStreamSSE(res.body, {
          onChunk: (chunkText) => {
            if (controller.signal.aborted) return 'stop';
            rawHookStream += chunkText;
            if (rawHookStream.trim().startsWith('<<<IGNORE>>>')) {
              speculativeHookCacheRef.current = null;
              return 'stop';
            }
            const structured = parseStructuredGhostboardOutput(rawHookStream);
            if (structured.hook.trim().length > 0) {
              speculativeHookCacheRef.current = {
                interimQuestion: cleanQ,
                normalizedTokens: tokenizeSignificantWords(cleanQ),
                rawHookStream,
                meta: structured.meta?.raw || '',
                hook: structured.hook,
                createdAt: Date.now(),
              };
            }
          },
        });
      } catch {
        // Speculative prefetch runs silently in background; never surface errors.
      } finally {
        clearTimeout(timeoutId);
        if (speculativeAbortRef.current === controller) {
          speculativeAbortRef.current = null;
          speculativeInFlightQuestionRef.current = null;
        }
      }
    },
    [buildRecentHistory, candidateProfileRef, isConciseRef, outputLanguageRef]
  );

  const processAggregatedQuestion = async (
    overrideText?: string,
    isManualEnter?: boolean,
    sourceMessageId?: string
  ) => {
    if (isCopilotGeneratingRef.current && !overrideText) return;

    const rawFragments = pendingFragmentsRef.current.join(' ').trim();
    const textToAnalyze = overrideText || rawFragments;

    if (!textToAnalyze || textToAnalyze.length < 4) return;
    const cleanText = normalizeTechnicalSpeech(textToAnalyze);
    const lower = cleanText.toLowerCase();

    if (!overrideText && !isManualEnter && isFillerOrNoise(cleanText)) {
      return;
    }

    const questionTriggers = [
      'як', 'чому', 'що', 'коли', 'де', 'який', 'яка', 'які', 'яке', 'чим', 'для чого', 'навіщо', 'хто', 'скільки',
      'чи можна', 'чи варто', 'чи треба', 'чи маєте', 'чи знаєте', 'чи працювали', 'чи стикалися', 'чи доводилося', 'чи використовували',
      'розкажіть', 'розкажи', 'поясніть', 'поясни', 'опишіть', 'опиши', 'наведіть', 'наведи', 'підкажіть', 'скажіть', 'поділіться',
      'різниця', 'відрізняється', 'як би ви', 'як би ти', 'який досвід', 'досвід з', 'досвід роботи', 'архітектур', 'патерн', 'проблем', 'стек',
      'как', 'почему', 'что такое', 'что', 'когда', 'где', 'какой', 'какая', 'какие', 'чем', 'зачем', 'для чего', 'кто', 'сколько',
      'можно ли', 'стоит ли', 'нужно ли', 'сталкивались ли', 'доводилось ли', 'использовали ли', 'знаете ли', 'был ли опыт',
      'расскажите', 'расскажи', 'объясните', 'объясни', 'опишите', 'опиши', 'приведите', 'приведи', 'подскажите', 'скажите', 'поделитесь',
      'в чем разница', 'в чём разница', 'чем отличается', 'как бы вы', 'как бы ты', 'какой опыт', 'опыт работы',
      'how', 'why', 'what', 'when', 'where', 'which', 'who',
      'can you', 'could you', 'would you', 'do you', 'did you', 'have you',
      'tell me', 'tell us', 'explain', 'describe', 'difference', 'compare',
      'experience with', 'architecture', 'under the hood', 'best practice'
    ];

    const hasQuestionSign = cleanText.includes('?');
    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const hasTriggerWord = questionTriggers.some((t) => lower.includes(t));
    const hasTechTerm = hasTechnicalKeyword(cleanText);

    const answerOpeners = [
      'я думаю', 'я вважаю', 'у моєму проєкті', 'я використовував', 'на мою думку',
      'у мене був досвід', 'я робив', 'ми робили', 'я налаштовував', 'я писав', 'так, звісно',
      'i think', 'in my project', 'i used', 'in my experience', 'i have worked',
      'i would say', 'as far as i know', 'i built', 'we built', 'yes, exactly',
      'в моем проекте', 'я использовал', 'по моему мнению', 'я считаю', 'мы делали'
    ];
    const isAnswerDeclaration = !hasQuestionSign && answerOpeners.some((op) => lower.startsWith(op) || lower.includes(op));
    if (isAnswerDeclaration && !overrideText && !isManualEnter) return;

    const isQuestionPrompt = isManualEnter || overrideText || (hasQuestionSign && wordCount >= 2) || (hasTriggerWord && wordCount >= 3) || (hasTechTerm && wordCount >= 3);
    
    if (!isQuestionPrompt) {
      if (pendingFragmentsRef.current.length > 30) {
        pendingFragmentsRef.current = pendingFragmentsRef.current.slice(-15);
      }
      return;
    }

    const now = Date.now();

    let targetQuestion = cleanText;
    let isContinuationMerged = false;
    let previousQuestionText: string | undefined = undefined;

    if (!overrideText && !isManualEnter) {
      const elapsedSinceLastCall = now - lastQATimestampRef.current;
      if (elapsedSinceLastCall < 2500 && interviewQAsRef.current.length > 0) {
        const lastQA = interviewQAsRef.current[0];
        const merged = mergeContinuationQuestion(lastQA.question, cleanText);
        if (merged.addedConstraint) {
          targetQuestion = merged.mergedQuestion;
          isContinuationMerged = true;
          previousQuestionText = lastQA.question;
        }
      } else if (elapsedSinceLastCall < 4000) {
        if (lastQATextRef.current && (lower === lastQATextRef.current || (lower.length > 10 && lastQATextRef.current.includes(lower)))) {
          return;
        }
      }
    }

    pendingFragmentsRef.current = [];
    interviewerStoryClausesRef.current = [];
    interviewerStoryBufferRef.current = '';
    lastQATimestampRef.current = now;
    lastQATextRef.current = lower;
    isCopilotGeneratingRef.current = true;
    setIsCopilotGenerating(true);

    hudBroadcastRef.current?.postMessage({
      type: 'STATUS',
      isProcessing: true,
      isListening: true,
    });

    const msg = getMsg(outputLanguageRef.current);
    const toastId = overrideText
      ? toast.loading(msg.analyzing(overrideText.slice(0, 35)), { id: 'copilot-gen' })
      : null;

    // Rolling 2-turn history for follow-up context resolution
    const recentHistory = buildRecentHistory();

    // Check Speculative Hook Cache (Idea #1: 0ms TTFT Hit)
    clearSpeculativeDebounce();
    const cachedSpec = speculativeHookCacheRef.current;
    const isSpecCacheFresh = cachedSpec ? now - cachedSpec.createdAt < SPECULATIVE_CACHE_TTL_MS : false;
    const isSpeculativeHit = Boolean(
      !isContinuationMerged &&
        cachedSpec &&
        isSpecCacheFresh &&
        cachedSpec.hook.trim().length > 0 &&
        isSpeculativeHookValid(cachedSpec.interimQuestion, targetQuestion)
    );
    const hitSpecEntry = isSpeculativeHit ? cachedSpec : null;

    // Consume or invalidate speculative cache and cancel any stale speculative request
    speculativeHookCacheRef.current = null;
    if (speculativeAbortRef.current) {
      speculativeAbortRef.current.abort();
      speculativeAbortRef.current = null;
    }
    speculativeInFlightQuestionRef.current = null;

    const cachedParsedMeta = hitSpecEntry
      ? parseStructuredGhostboardOutput(hitSpecEntry.rawHookStream).meta
      : undefined;
    const speculativeBaseSlots: StructuredAnswerSlots | null = hitSpecEntry
      ? {
          meta: hitSpecEntry.meta || cachedParsedMeta?.raw,
          hook: hitSpecEntry.hook,
          pillars: [],
          deepDive: '',
        }
      : null;

    const previousActiveQAId = activeQAIdRef.current;
    const qaId = `qa_${now}`;
    const initialQA: InterviewQAItem = {
      id: qaId,
      sourceMessageId,
      timestamp: now,
      timecode: formatTime(sessionDurationRef.current),
      question: targetQuestion,
      startHook: hitSpecEntry ? hitSpecEntry.hook : '',
      quickAnswer: hitSpecEntry ? hitSpecEntry.hook : '',
      nativeTranslation: null,
      hints: [],
      meta: cachedParsedMeta,
      tag: '#InterviewQA',
      isStreaming: true,
      ttftMs: hitSpecEntry ? 0 : undefined,
      isContinuationMerged,
      completedPillarIndices: [],
      activePillarIndex: 0,
    };

    if (hitSpecEntry) {
      setSpeculativeHitMap((prev) => ({ ...prev, [qaId]: true }));
    }

    setInterviewQAs((prev) => [initialQA, ...prev]);

    if (isFrozenRef.current) {
      setPendingNewCount((prev) => {
        const next = prev + 1;
        pendingNewCountRef.current = next;
        return next;
      });
      toast.info(msg.queued(pendingNewCountRef.current + 1), {
        id: 'freeze-queue-toast',
        duration: 4000,
      });
    } else {
      setActiveQAId(qaId);
      activeQAIdRef.current = qaId;
    }

    hudBroadcastRef.current?.postMessage({
      type: 'NEW_QA',
      qa: initialQA,
    });

    const requestStartMs = performance.now();
    let firstTokenTime: number | null = hitSpecEntry ? requestStartMs : null;
    let accumulatedText = '';
    let measuredTtft: number | undefined = hitSpecEntry ? 0 : undefined;

    try {
      const res = await fetch('/api/ai/dual-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          question: targetQuestion,
          previousQuestion: previousQuestionText,
          isContinuation: isContinuationMerged,
          history: recentHistory,
          outputLanguage: outputLanguageRef.current.startsWith('bilingual')
            ? 'bilingual'
            : outputLanguageRef.current,
          helperLanguage: outputLanguageRef.current === 'bilingual_ru' ? 'ru' : 'uk',
          candidateProfile: candidateProfileRef.current,
          isConcise: isConciseRef.current,
          directorModifier: 'normal',
          patchSlot: hitSpecEntry ? 'rest_after_hook' : 'full',
          ...(hitSpecEntry ? { preGeneratedHook: hitSpecEntry.hook } : {}),
        }),
      });

      if (res.ok && res.body) {
        let ignoredByGuardrail = false;

        await consumeDualStreamSSE(res.body, {
          onTelemetry: (parsed) => {
            if (measuredTtft === undefined) {
              measuredTtft = parsed.ttftMs || Math.round(performance.now() - requestStartMs);
            }
          },
          onChunk: (chunkText) => {
            accumulatedText += chunkText;

            if (!hitSpecEntry && accumulatedText.trim().startsWith('<<<IGNORE>>>')) {
              ignoredByGuardrail = true;
              return 'stop';
            }

            const structured = parseStructuredGhostboardOutput(accumulatedText);

            if (
              !firstTokenTime &&
              (structured.hook.length > 0 ||
                (!accumulatedText.startsWith('<<<') && accumulatedText.trim().length > 0))
            ) {
              firstTokenTime = performance.now();
              measuredTtft = Math.round(firstTokenTime - requestStartMs);
            }

            const mergedSlots = speculativeBaseSlots
              ? mergeSurgicalAnswerSlots(
                  speculativeBaseSlots,
                  {
                    meta: structured.meta?.raw,
                    hook: structured.hook,
                    pillars: structured.pillars,
                    deepDive: structured.deepDive,
                    followUpTrap: structured.followUpTrap,
                  },
                  'rest_after_hook'
                )
              : null;

            const resolvedHook = mergedSlots
              ? mergedSlots.hook
              : structured.hook || (accumulatedText.startsWith('<<<') ? '' : accumulatedText);
            const resolvedPillars = mergedSlots ? mergedSlots.pillars : structured.pillars;
            const resolvedDeepDive = mergedSlots ? mergedSlots.deepDive : structured.deepDive;
            const resolvedTrap = mergedSlots ? mergedSlots.followUpTrap : structured.followUpTrap;

            const updatedQA: InterviewQAItem = {
              id: qaId,
              sourceMessageId,
              timestamp: now,
              timecode: formatTime(sessionDurationRef.current),
              question: targetQuestion,
              startHook: resolvedHook,
              quickAnswer: resolvedHook,
              hints: resolvedPillars.length > 0 ? resolvedPillars : resolvedHook ? [] : msg.defaultHints,
              pillars: resolvedPillars.length > 0 ? resolvedPillars : undefined,
              codeSnippet: resolvedDeepDive || undefined,
              deepDive: resolvedDeepDive || undefined,
              followUpTrap: resolvedTrap,
              isContinuationMerged,
              completedPillarIndices: [],
              activePillarIndex: 0,
              meta: structured.meta || cachedParsedMeta,
              tag: '#InterviewQA',
              ttftMs: measuredTtft,
              isStreaming: true,
            };

            setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? updatedQA : q)));
            hudBroadcastRef.current?.postMessage({
              type: 'NEW_QA',
              qa: updatedQA,
            });
          },
        });

        if (ignoredByGuardrail || (!hitSpecEntry && accumulatedText.trim().startsWith('<<<IGNORE>>>'))) {
          if (toastId) toast.dismiss(toastId);
          setInterviewQAs((prev) => prev.filter((q) => q.id !== qaId));
          if (activeQAIdRef.current === qaId) {
            setActiveQAId(previousActiveQAId);
            activeQAIdRef.current = previousActiveQAId;
          }
          return;
        }

        const finalStructured = parseStructuredGhostboardOutput(accumulatedText);
        const finalMerged = speculativeBaseSlots
          ? mergeSurgicalAnswerSlots(
              speculativeBaseSlots,
              {
                meta: finalStructured.meta?.raw,
                hook: finalStructured.hook,
                pillars: finalStructured.pillars,
                deepDive: finalStructured.deepDive,
                followUpTrap: finalStructured.followUpTrap,
              },
              'rest_after_hook'
            )
          : null;

        const finalHook = finalMerged
          ? finalMerged.hook
          : finalStructured.hook || (accumulatedText.startsWith('<<<') ? '' : accumulatedText.slice(0, 160));
        const finalQuickAnswer = finalMerged
          ? finalMerged.hook
          : finalStructured.hook || (accumulatedText.startsWith('<<<') ? '' : accumulatedText);
        const finalPillars = finalMerged ? finalMerged.pillars : finalStructured.pillars;
        const finalDeepDive = finalMerged ? finalMerged.deepDive : finalStructured.deepDive;
        const finalTrap = finalMerged ? finalMerged.followUpTrap : finalStructured.followUpTrap;

        const finalQA: InterviewQAItem = {
          id: qaId,
          sourceMessageId,
          timestamp: now,
          timecode: formatTime(sessionDurationRef.current),
          question: targetQuestion,
          startHook: finalHook,
          quickAnswer: finalQuickAnswer,
          nativeTranslation: null,
          hints: finalPillars.length > 0 ? finalPillars : msg.defaultHints,
          pillars: finalPillars.length > 0 ? finalPillars : undefined,
          tag: '#InterviewQA',
          codeSnippet: finalDeepDive || undefined,
          deepDive: finalDeepDive || undefined,
          followUpTrap: finalTrap,
          isContinuationMerged,
          completedPillarIndices: [],
          activePillarIndex: 0,
          meta: finalStructured.meta || cachedParsedMeta,
          ttftMs: measuredTtft !== undefined ? measuredTtft : Math.round(performance.now() - requestStartMs),
          isStreaming: false,
        };

        setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? finalQA : q)));

        if (toastId) {
          toast.success(msg.ready, { id: 'copilot-gen' });
        }

        fetch('/api/ai/interview-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ADD_OR_UPDATE_QA',
            qa: finalQA,
            activeId: isFrozenRef.current ? activeQAIdRef.current : finalQA.id,
          }),
        }).catch(() => {});

        hudBroadcastRef.current?.postMessage({
          type: 'NEW_QA',
          qa: finalQA,
        });

        return finalQA;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && (errData.code === 'TRIAL_LIMIT_REACHED' || errData.error?.includes('Trial limit'))) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ghostboard:show_paywall'));
          }
          toast.error(errData.error || 'Trial limit reached', { id: 'copilot-gen' });
        } else if (toastId || res.status >= 500 || res.status === 429) {
          toast.error(errData.error || msg.answerFailed, { id: 'copilot-gen' });
        }
        // Remove empty placeholder QA on error
        setInterviewQAs((prev) => prev.filter((q) => q.id !== qaId));
      }
    } catch (err) {
      console.error('Interview copilot error:', err);
      const timedOut = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
      toast.error(timedOut ? msg.timeout : msg.genFailed, { id: 'copilot-gen' });
    } finally {
      isCopilotGeneratingRef.current = false;
      setIsCopilotGenerating(false);
      hudBroadcastRef.current?.postMessage({
        type: 'STATUS',
        isProcessing: false,
        isListening: true,
      });
      if (pendingFragmentsRef.current.length > 0 && triggerModeRef.current === 'auto') {
        setTimeout(() => {
          processAggregatedQuestion();
        }, 500);
      }
    }
  };

  const handleIncomingTranscript = useCallback((
    text: string,
    isFinal: boolean,
    speechFinal: boolean,
    speaker: 'interviewer' | 'candidate' = 'interviewer'
  ) => {
    if (!text || !text.trim()) return;
    const clean = text.trim();

    // 🛡️ CRITICAL GUARDRAIL: Only ever process speech from verified 'interviewer' (Tab/Screen audio) for AI questions.
    // Candidate microphone speech is strictly rejected from entering AI question generation!
    if (speaker !== 'interviewer') {
      // 🎤 Live Voice Karaoke: match candidate spoken words against active AI pillars
      const activeQA = interviewQAsRef.current.find(
        (q) => q.id === (activeQAIdRef.current || interviewQAsRef.current[0]?.id)
      );
      const pillars = activeQA?.hints || activeQA?.pillars;
      if (activeQA && Array.isArray(pillars) && pillars.length > 0) {
        const tracker = matchSpokenTranscriptToPillars(
          clean,
          pillars,
          activeQA.completedPillarIndices || []
        );
        const hasNewCompletion =
          tracker.completedIndices.length !== (activeQA.completedPillarIndices || []).length ||
          tracker.activeIndex !== activeQA.activePillarIndex;

        if (hasNewCompletion) {
          const updatedQA: InterviewQAItem = {
            ...activeQA,
            completedPillarIndices: tracker.completedIndices,
            activePillarIndex: tracker.activeIndex,
          };
          setInterviewQAs((prev) => prev.map((q) => (q.id === activeQA.id ? updatedQA : q)));
          hudBroadcastRef.current?.postMessage({
            type: 'NEW_QA',
            qa: updatedQA,
          });
          fetch('/api/ai/interview-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ADD_OR_UPDATE_QA',
              qa: updatedQA,
              activeId: activeQAIdRef.current || activeQA.id,
            }),
          }).catch(() => {});
        }
      }
      return;
    }

    // Avoid duplicate insertions
    const last = pendingFragmentsRef.current[pendingFragmentsRef.current.length - 1];
    if (!last || last.toLowerCase() !== clean.toLowerCase()) {
      pendingFragmentsRef.current.push(clean);
    }

    // Idea #1: Speculative Hook Prefetch Engine during Interim Speech
    if (!isFinal && !speechFinal) {
      const normalizedInterim = normalizeTechnicalSpeech(clean);
      const interimWords = normalizedInterim.split(/\s+/).filter(Boolean);
      if (interimWords.length >= 6 && !isCopilotGeneratingRef.current) {
        const interimEval = evaluateSpeechIntent(
          normalizedInterim,
          interviewerStoryBufferRef.current,
          200
        );
        if (interimEval.decision === 'TRIGGER_NOW' && interimEval.score >= 50) {
          const candidateQuestion = interimEval.normalizedQuestion || normalizedInterim;
          const activeInFlight = speculativeInFlightQuestionRef.current;
          const cachedEntry = speculativeHookCacheRef.current;
          const alreadyValidInFlight =
            activeInFlight && isSpeculativeHookValid(activeInFlight, candidateQuestion);
          const alreadyValidCached =
            cachedEntry &&
            Date.now() - cachedEntry.createdAt < SPECULATIVE_CACHE_TTL_MS &&
            isSpeculativeHookValid(cachedEntry.interimQuestion, candidateQuestion);

          if (!alreadyValidInFlight && !alreadyValidCached) {
            clearSpeculativeDebounce();
            speculativeDebounceRef.current = setTimeout(() => {
              void startSpeculativeHookPrefetch(candidateQuestion);
            }, SPECULATIVE_DEBOUNCE_MS);
          }
        }
      }
      return null;
    }

    if (isFinal || speechFinal) {
      const now = Date.now();
      const silenceMs = lastInterviewerChunkTimeRef.current > 0 ? Math.max(0, now - lastInterviewerChunkTimeRef.current) : 350;
      lastInterviewerChunkTimeRef.current = now;

      // Maintain rolling 30-second context window of unspoken/untriggered interviewer clauses
      interviewerStoryClausesRef.current = interviewerStoryClausesRef.current.filter(
        (c) => now - c.timestamp <= 30000
      );
      interviewerStoryBufferRef.current = interviewerStoryClausesRef.current.map((c) => c.text).join(' ');

      const evaluation = evaluateSpeechIntent(clean, interviewerStoryBufferRef.current, silenceMs);

      // 1. IGNORE_NOISE: Display transcript in Left Dialogue column, but DO NOT trigger /api/ai/dual-stream
      if (evaluation.decision === 'IGNORE_NOISE') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        abortSpeculativePrefetch();
        return { decision: 'IGNORE_NOISE' as const, evaluation };
      }

      // 2. WAIT_FOR_COMPLETION: Storytelling or mid-sentence pause -> Append to story buffer and wait
      if (evaluation.decision === 'WAIT_FOR_COMPLETION') {
        interviewerStoryClausesRef.current.push({ text: clean, timestamp: now });
        interviewerStoryBufferRef.current = interviewerStoryClausesRef.current.map((c) => c.text).join(' ');
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        return { decision: 'WAIT_FOR_COMPLETION' as const, evaluation };
      }

      // 3. TRIGGER_NOW: Explicit question or prompt -> Immediately trigger /api/ai/dual-stream!
      if (evaluation.decision === 'TRIGGER_NOW') {
        const targetQuestion = evaluation.normalizedQuestion || clean;
        interviewerStoryClausesRef.current = [];
        interviewerStoryBufferRef.current = '';
        pendingFragmentsRef.current = [];
        clearSpeculativeDebounce();
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }

        if (triggerModeRef.current === 'auto') {
          const elapsedSinceLastAuto = now - lastAutoVoiceTriggerTimeRef.current;
          // Minimum 2200ms cooldown for automatic voice triggers so rapid bursts never fire parallel requests
          if (elapsedSinceLastAuto < 2200 || isCopilotGeneratingRef.current) {
            return { decision: 'WAIT_FOR_COMPLETION' as const, evaluation };
          }
          lastAutoVoiceTriggerTimeRef.current = now;
          void processAggregatedQuestion(targetQuestion, false);
        }
        return { decision: 'TRIGGER_NOW' as const, evaluation };
      }
    }

    return null;
  }, [abortSpeculativePrefetch, clearSpeculativeDebounce, startSpeculativeHookPrefetch]);

  const handleManualEnterTrigger = useCallback((liveTranscript: string) => {
    const msg = getMsg(outputLanguageRef.current);
    if (isCopilotGeneratingRef.current) {
      toast.info(msg.busy, { id: 'copilot-busy' });
      return;
    }

    const fragments = [...pendingFragmentsRef.current];
    if (liveTranscript && liveTranscript.trim()) {
      const last = fragments[fragments.length - 1];
      if (!last || !last.toLowerCase().includes(liveTranscript.trim().toLowerCase())) {
        fragments.push(liveTranscript.trim());
      }
    }

    const combinedText = fragments.join(' ').trim();
    if (!combinedText || combinedText.length < 3 || isFillerOrNoise(combinedText)) {
      toast.info(msg.noTranscript, {
        id: 'no-transcript-enter',
      });
      return;
    }

    processAggregatedQuestion(combinedText, true);
  }, []);

  const handleRefineQA = async (
    qaId: string,
    refinement: 'under_the_hood' | 'code' | 'shorter' | 're_angle' | 'simpler'
  ) => {
    const existing = interviewQAsRef.current.find((q) => q.id === qaId);
    if (!existing) return;

    const msg = getMsg(outputLanguageRef.current);
    const labels: Record<string, string> = msg.refineLabels;

    const modifierMap: Record<string, string> = {
      under_the_hood: 'more_technical',
      code: 'code',
      shorter: 'shorter',
      re_angle: 're_angle',
      simpler: 'simpler',
    };
    const directorModifier = modifierMap[refinement] || 'normal';
    const slotMode = resolvePatchSlotForModifier(directorModifier);

    const existingSlots: StructuredAnswerSlots = {
      meta: existing.meta?.raw,
      hook: existing.startHook || existing.quickAnswer || '',
      pillars: existing.pillars || existing.hints || [],
      deepDive: existing.codeSnippet || existing.deepDive || '',
      followUpTrap: existing.followUpTrap,
    };

    if (refineAbortRef.current) {
      refineAbortRef.current.abort();
    }
    const controller = new AbortController();
    refineAbortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const isSuperseded = () => refineAbortRef.current !== controller;

    // Idea #4: Surgical Slot Patching — keep existing answer frozen in state (no UI wipe or jump)
    setPatchingSlotMap((prev) => ({ ...prev, [qaId]: slotMode }));
    const streamingPlaceholderQA: InterviewQAItem = {
      ...existing,
      isStreaming: true,
    };
    setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? streamingPlaceholderQA : q)));
    hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: streamingPlaceholderQA });
    toast.loading(labels[refinement] || msg.updating, { id: 'copilot-refine' });

    const clearPatching = () => {
      setPatchingSlotMap((prev) => {
        if (!(qaId in prev)) return prev;
        const next = { ...prev };
        delete next[qaId];
        return next;
      });
    };

    const restore = () => {
      if (isSuperseded()) return;
      clearPatching();
      setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? existing : q)));
      hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: existing });
    };

    const recentHistory = interviewQAsRef.current.slice(0, 3).map((qa) => ({
      question: qa.question,
      answer: qa.quickAnswer || qa.startHook || '',
    }));

    try {
      const res = await fetch('/api/ai/dual-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: existing.question,
          history: recentHistory,
          directorModifier,
          patchSlot: slotMode,
          outputLanguage: outputLanguageRef.current.startsWith('bilingual')
            ? 'bilingual'
            : outputLanguageRef.current,
          helperLanguage: outputLanguageRef.current === 'bilingual_ru' ? 'ru' : 'uk',
          candidateProfile: candidateProfileRef.current,
          isConcise: isConciseRef.current,
        }),
      });

      if (res.ok && res.body) {
        let accumulatedText = '';

        await consumeDualStreamSSE(res.body, {
          onChunk: (chunkText) => {
            if (isSuperseded()) return 'stop';
            accumulatedText += chunkText;
            const structured = parseStructuredGhostboardOutput(accumulatedText);
            const incomingSlots: StructuredAnswerSlots = {
              meta: structured.meta?.raw,
              hook: structured.hook,
              pillars: structured.pillars,
              deepDive: structured.deepDive,
              followUpTrap: structured.followUpTrap,
            };
            const merged = mergeSurgicalAnswerSlots(existingSlots, incomingSlots, slotMode);
            const fallbackUntagged =
              slotMode === 'full' && !accumulatedText.startsWith('<<<') ? accumulatedText : '';
            const resolvedHook = merged.hook || fallbackUntagged;
            const resolvedPillars =
              merged.pillars.length > 0 ? merged.pillars : slotMode === 'full' ? existing.hints : [];

            const updatedQA: InterviewQAItem = {
              ...existing,
              startHook: resolvedHook,
              quickAnswer: resolvedHook,
              hints: resolvedPillars.length > 0 ? resolvedPillars : existing.hints,
              pillars: merged.pillars.length > 0 ? merged.pillars : existing.pillars,
              codeSnippet: merged.deepDive || undefined,
              deepDive: merged.deepDive || undefined,
              followUpTrap: merged.followUpTrap,
              meta: structured.meta || existing.meta,
              isStreaming: true,
            };
            setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? updatedQA : q)));
            hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: updatedQA });
          },
        });

        if (isSuperseded()) return;

        const finalStructured = parseStructuredGhostboardOutput(accumulatedText);
        const finalIncoming: StructuredAnswerSlots = {
          meta: finalStructured.meta?.raw,
          hook: finalStructured.hook,
          pillars: finalStructured.pillars,
          deepDive: finalStructured.deepDive,
          followUpTrap: finalStructured.followUpTrap,
        };
        const finalMerged = mergeSurgicalAnswerSlots(existingSlots, finalIncoming, slotMode);
        const finalUntagged =
          slotMode === 'full' && !accumulatedText.startsWith('<<<') ? accumulatedText : '';

        const finalQA: InterviewQAItem = {
          ...existing,
          timestamp: Date.now(),
          startHook: finalMerged.hook || finalUntagged.slice(0, 160),
          quickAnswer: finalMerged.hook || finalUntagged,
          hints: finalMerged.pillars.length > 0 ? finalMerged.pillars : existing.hints,
          pillars: finalMerged.pillars.length > 0 ? finalMerged.pillars : existing.pillars,
          codeSnippet: finalMerged.deepDive || undefined,
          deepDive: finalMerged.deepDive || undefined,
          followUpTrap: finalMerged.followUpTrap,
          meta: finalStructured.meta || existing.meta,
          isStreaming: false,
        };
        clearPatching();
        setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? finalQA : q)));
        hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: finalQA });
        fetch('/api/ai/interview-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ADD_OR_UPDATE_QA', qa: finalQA, activeId: finalQA.id }),
        }).catch(() => {});
        toast.success(msg.refined, { id: 'copilot-refine' });
        return;
      }

      // Fallback to legacy endpoint if dual-stream not ok
      const legacyRes = await fetch('/api/ai/interview-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: existing.question,
          existingQA: existing,
          history: recentHistory,
          refinement,
          locale: speechLanguageRef.current,
          outputLanguage: outputLanguageRef.current.startsWith('bilingual')
            ? 'bilingual'
            : outputLanguageRef.current,
          helperLanguage: outputLanguageRef.current === 'bilingual_ru' ? 'ru' : 'uk',
          candidateProfile: candidateProfileRef.current,
          isConcise: isConciseRef.current,
          sessionMode: sessionModeRef.current,
        }),
      });

      if (isSuperseded()) return;

      const data = legacyRes.ok ? await legacyRes.json().catch(() => null) : null;
      if (data && data.quickAnswer) {
        const legacyMerged = mergeSurgicalAnswerSlots(
          existingSlots,
          {
            hook: data.startHook || data.quickAnswer || '',
            pillars: Array.isArray(data.hints) ? data.hints : [],
            deepDive: data.codeSnippet || '',
            followUpTrap: existing.followUpTrap,
          },
          slotMode
        );
        const finalQA: InterviewQAItem = {
          ...existing,
          timestamp: Date.now(),
          question: data.question || existing.question,
          startHook: legacyMerged.hook,
          quickAnswer: legacyMerged.hook,
          hints: legacyMerged.pillars.length > 0 ? legacyMerged.pillars : existing.hints,
          pillars: legacyMerged.pillars.length > 0 ? legacyMerged.pillars : existing.pillars,
          codeSnippet: legacyMerged.deepDive || undefined,
          deepDive: legacyMerged.deepDive || undefined,
          deliveryTip: data.deliveryTip || existing.deliveryTip,
          tag: data.tag || existing.tag,
          confidenceScore: data.confidenceScore ?? existing.confidenceScore,
          docReference: data.docReference || existing.docReference,
          isStreaming: false,
        };
        clearPatching();
        setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? finalQA : q)));
        hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: finalQA });
        fetch('/api/ai/interview-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ADD_OR_UPDATE_QA', qa: finalQA, activeId: finalQA.id }),
        }).catch(() => {});
        toast.success(msg.refined, { id: 'copilot-refine' });
      } else {
        restore();
        toast.error(msg.refineFailed, { id: 'copilot-refine' });
      }
    } catch (err) {
      if (isSuperseded()) return;
      console.error('Failed to refine answer:', err);
      restore();
      toast.error(msg.refineFailed, { id: 'copilot-refine' });
    } finally {
      clearTimeout(timeoutId);
      if (refineAbortRef.current === controller) {
        refineAbortRef.current = null;
      }
    }
  };

  const togglePillarCompletion = useCallback((qaId: string, pillarIndex: number) => {
    setInterviewQAs((prev) =>
      prev.map((qa) => {
        if (qa.id !== qaId) return qa;
        const currentCompleted = new Set(qa.completedPillarIndices || []);
        if (currentCompleted.has(pillarIndex)) {
          currentCompleted.delete(pillarIndex);
        } else {
          currentCompleted.add(pillarIndex);
        }
        const updatedCompleted = Array.from(currentCompleted).sort((a, b) => a - b);
        const totalPillars = (qa.hints || qa.pillars || []).length;
        let nextActive = 0;
        for (let i = 0; i < totalPillars; i++) {
          if (!currentCompleted.has(i)) {
            nextActive = i;
            break;
          }
        }
        const updated: InterviewQAItem = {
          ...qa,
          completedPillarIndices: updatedCompleted,
          activePillarIndex: nextActive,
        };
        hudBroadcastRef.current?.postMessage({
          type: 'NEW_QA',
          qa: updated,
        });
        fetch('/api/ai/interview-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ADD_OR_UPDATE_QA',
            qa: updated,
            activeId: activeQAIdRef.current || qa.id,
          }),
        }).catch(() => {});
        return updated;
      })
    );
  }, []);

  const handleExplainLine = useCallback(
    async (qaId: string, lineIndex: number, lineText: string) => {
      const qa = interviewQAsRef.current.find((q) => q.id === qaId);
      if (!qa || !lineText || !lineText.trim()) return;
      if (qa.lineExplanations?.[lineIndex]) return;

      const pendingQA: InterviewQAItem = {
        ...qa,
        lineExplanations: {
          ...(qa.lineExplanations || {}),
          [lineIndex]: '⚡ Генерую пояснення рядка (explain_line)...',
        },
      };
      setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? pendingQA : q)));

      try {
        const res = await fetch('/api/ai/dual-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `Поясни цей рядок коду: "${lineText.trim()}". Надай 2 стислих речення: суть та часову/просторову складність.`,
            directorModifier: 'explain_line',
            outputLanguage: outputLanguageRef.current.startsWith('bilingual')
              ? 'bilingual'
              : outputLanguageRef.current,
          }),
        });

        if (res.ok && res.body) {
          const text = await res.text();
          const structured = parseStructuredGhostboardOutput(text);
          const explanation = structured.hook || text.replace(/<<<[^>]*>>>/g, '').trim().slice(0, 240);
          const finalExplanation = explanation || `Рядок виконує логіку: ${lineText.trim()}`;
          setInterviewQAs((prev) =>
            prev.map((q) => {
              if (q.id !== qaId) return q;
              return {
                ...q,
                lineExplanations: {
                  ...(q.lineExplanations || {}),
                  [lineIndex]: finalExplanation,
                },
              };
            })
          );
          return;
        }
      } catch {}

      setInterviewQAs((prev) =>
        prev.map((q) => {
          if (q.id !== qaId) return q;
          return {
            ...q,
            lineExplanations: {
              ...(q.lineExplanations || {}),
              [lineIndex]:
                'Рядок виконує ключову операцію обробки даних у памʼяті. Складність O(1), без виділення додаткової памʼяті.',
            },
          };
        })
      );
    },
    [outputLanguageRef]
  );

  return {
    interviewQAs,
    setInterviewQAs,
    activeQAId,
    setActiveQAId,
    activeQAIdRef,
    isCopilotGenerating,
    isCopilotGeneratingRef,
    pendingFragmentsRef,
    interviewerStoryBufferRef,
    debounceTimerRef,
    processAggregatedQuestion,
    handleManualEnterTrigger,
    handleRefineQA,
    handleIncomingTranscript,
    pendingNewCount,
    setPendingNewCount,
    pendingNewCountRef,
    togglePillarCompletion,
    handleExplainLine,
    speculativeHitMap,
    patchingSlotMap,
    speculativeHookCacheRef,
  };
}
