import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { InterviewQAItem } from '@/components/LiveInterviewHUD';
import { normalizeTechnicalSpeech, hasTechnicalKeyword, isFillerOrNoise } from '@/lib/techSpeechNormalizer';
import { CandidateProfile } from '@/components/CandidateProfileModal';

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
  const [activeQAId, setActiveQAId] = useState<string | null>(null);
  const activeQAIdRef = useRef<string | null>(null);
  const [isCopilotGenerating, setIsCopilotGenerating] = useState(false);
  
  const pendingFragmentsRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCopilotGeneratingRef = useRef<boolean>(false);
  const lastQATimestampRef = useRef<number>(0);
  const lastQATextRef = useRef<string>('');
  const [pendingNewCount, setPendingNewCount] = useState<number>(0);
  const pendingNewCountRef = useRef<number>(0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const processAggregatedQuestion = async (overrideText?: string, isManualEnter?: boolean) => {
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

    if (!overrideText && !isManualEnter) {
      const elapsedSinceLastCall = now - lastQATimestampRef.current;
      if (elapsedSinceLastCall < 4000) {
        if (lastQATextRef.current && (lower === lastQATextRef.current || (lower.length > 10 && lastQATextRef.current.includes(lower)))) {
          return;
        }
      }
    }

    pendingFragmentsRef.current = [];
    lastQATimestampRef.current = now;
    lastQATextRef.current = lower;
    isCopilotGeneratingRef.current = true;
    setIsCopilotGenerating(true);

    hudBroadcastRef.current?.postMessage({
      type: 'STATUS',
      isProcessing: true,
      isListening: true,
    });

    const toastId = overrideText
      ? toast.loading(`⚡ ШІ аналізує «${overrideText.slice(0, 35)}...»`, { id: 'copilot-gen' })
      : null;

    try {
      const res = await fetch('/api/ai/interview-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: cleanText,
          locale: speechLanguageRef.current,
          outputLanguage: outputLanguageRef.current,
          candidateProfile: candidateProfileRef.current,
          isConcise: isConciseRef.current,
          triggerMode: triggerModeRef.current,
          sessionMode: sessionModeRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.quickAnswer) {
          const finalQA: InterviewQAItem = {
            id: `qa_${now}`,
            timestamp: now,
            timecode: formatTime(sessionDuration),
            question: data.question || cleanText,
            startHook: data.startHook || data.quickAnswer,
            quickAnswer: data.quickAnswer,
            nativeTranslation: data.nativeTranslation || null,
            hints: data.hints?.length
              ? data.hints
              : ['Поясни внутрішню архітектуру та механізми памʼяті', 'Наведи практичний приклад зі свого стеку'],
            tag: data.tag || '#InterviewQA',
            codeSnippet: data.codeSnippet,
            deliveryTip: data.deliveryTip,
            confidenceScore: data.confidenceScore,
            docReference: data.docReference,
          };

          setInterviewQAs((prev) => [finalQA, ...prev]);

          if (isFrozenRef.current) {
            setPendingNewCount((prev) => {
              const next = prev + 1;
              pendingNewCountRef.current = next;
              return next;
            });
            toast.info(`⚡ ШІ дав відповідь на нове питання (+${pendingNewCountRef.current + 1} у черзі). Перегляд зафіксовано. [Space] для переходу.`, {
              id: 'freeze-queue-toast',
              duration: 4000,
            });
          } else {
            setActiveQAId(finalQA.id);
            activeQAIdRef.current = finalQA.id;
          }

          if (toastId) {
            toast.success('✅ Відповідь готова!', { id: 'copilot-gen' });
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
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && (errData.code === 'TRIAL_LIMIT_REACHED' || errData.error?.includes('Trial limit'))) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ghostboard:show_paywall'));
          }
          toast.error(errData.error || 'Trial limit reached', { id: 'copilot-gen' });
        } else if (toastId) {
          toast.error(errData.error || 'Помилка отримання відповіді', { id: 'copilot-gen' });
        }
      }
    } catch (err) {
      console.error('Interview copilot error:', err);
      toast.error('Помилка генерації відповіді', { id: 'copilot-gen' });
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

    // 🛡️ CRITICAL GUARDRAIL: Only ever process speech from verified 'interviewer' (Tab/Screen audio).
    // Candidate microphone speech is strictly rejected from entering AI question generation!
    if (speaker !== 'interviewer') {
      return;
    }

    // Avoid duplicate insertions
    const last = pendingFragmentsRef.current[pendingFragmentsRef.current.length - 1];
    if (!last || last.toLowerCase() !== clean.toLowerCase()) {
      pendingFragmentsRef.current.push(clean);
    }

    // In auto mode, trigger analysis when speaker pauses or finalizes speech
    if (triggerModeRef.current === 'auto' && !isCopilotGeneratingRef.current) {
      const combined = pendingFragmentsRef.current.join(' ');
      const words = combined.split(/\s+/).filter(Boolean).length;
      if (words >= 3) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          processAggregatedQuestion();
        }, speechFinal ? 700 : 1500);
      }
    }
  }, []);

  const handleManualEnterTrigger = useCallback((liveTranscript: string) => {
    if (isCopilotGeneratingRef.current) {
      toast.info('⚡ ШІ вже аналізує та формує відповідь...', { id: 'copilot-busy' });
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
      toast.info('⏳ Немає накопиченого тексту запитання. Зачекайте, поки співрозмовник озвучить запитання.', {
        id: 'no-transcript-enter',
      });
      return;
    }

    processAggregatedQuestion(combinedText, true);
  }, []);

  const handleRefineQA = async (qaId: string, refinement: 'under_the_hood' | 'code' | 'shorter' | 're_angle') => {
    const existing = interviewQAs.find((q) => q.id === qaId);
    if (!existing) return;

    const labels: Record<string, string> = {
      under_the_hood: '⚙️ Поглиблюю механіку "Під капотом"...',
      code: '💻 Генерую практичний код...',
      shorter: '✂️ Стискаю до ключової тези...',
      re_angle: '🔄 Переосмислюю під іншим кутом...',
    };

    const pendingQA: InterviewQAItem = {
      ...existing,
      startHook: labels[refinement] || 'Оновлюю відповідь...',
      quickAnswer: '...',
    };

    setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? pendingQA : q)));
    hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: pendingQA });

    try {
      const res = await fetch('/api/ai/interview-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: existing.question,
          existingQA: existing,
          refinement,
          locale: speechLanguageRef.current,
          outputLanguage: outputLanguageRef.current,
          candidateProfile: candidateProfileRef.current,
          sessionMode: sessionModeRef.current,
        }),
      });

      const data = await res.json();
      if (data && data.quickAnswer) {
        const finalQA: InterviewQAItem = {
          ...existing,
          timestamp: Date.now(),
          question: data.question || existing.question,
          startHook: data.startHook || data.quickAnswer,
          quickAnswer: data.quickAnswer,
          hints: data.hints && data.hints.length > 0 ? data.hints : existing.hints,
          codeSnippet: data.codeSnippet !== undefined ? data.codeSnippet : existing.codeSnippet,
          deliveryTip: data.deliveryTip || existing.deliveryTip,
          tag: data.tag || existing.tag,
          confidenceScore: data.confidenceScore ?? existing.confidenceScore,
          docReference: data.docReference || existing.docReference,
        };
        setInterviewQAs((prev) => prev.map((q) => (q.id === qaId ? finalQA : q)));
        hudBroadcastRef.current?.postMessage({ type: 'NEW_QA', qa: finalQA });
        fetch('/api/ai/interview-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ADD_OR_UPDATE_QA', qa: finalQA, activeId: finalQA.id }),
        }).catch(() => {});
        toast.success('Відповідь скориговано!');
      }
    } catch (err) {
      console.error('Failed to refine answer:', err);
      toast.error('Не вдалося скоригувати відповідь');
    }
  };

  return {
    interviewQAs,
    setInterviewQAs,
    activeQAId,
    setActiveQAId,
    activeQAIdRef,
    isCopilotGenerating,
    isCopilotGeneratingRef,
    pendingFragmentsRef,
    debounceTimerRef,
    processAggregatedQuestion,
    handleManualEnterTrigger,
    handleRefineQA,
    handleIncomingTranscript,
    pendingNewCount,
    setPendingNewCount,
    pendingNewCountRef
  };
}
