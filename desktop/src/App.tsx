import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  Sliders,
  Terminal,
  Volume2,
  Mic,
  Monitor,
  Radio,
  Minimize2,
  X,
  Play,
  Square,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Cpu,
  ArrowUpRight,
  AppWindow,
  Headphones,
  Bot,
  MessageSquare,
  Zap,
  Clock,
  History,
  Maximize2,
  Download,
  Pause,
  Camera,
  Briefcase,
  Smartphone,
  QrCode,
  ArrowDownCircle,
} from 'lucide-react';
import type { DesktopMediaSource } from './types/tauri';
import {
  DesktopAudioEngine,
  AudioSourceMode,
  SpeechTranscriptEvent,
  DialogueMessage,
} from './lib/audioEngine';
import { DualStreamClient, StructuredAnswerOutput, parseDualStreamDelimiters } from './lib/streamClient';
import {
  normalizeTechnicalSpeech,
  isFillerOrNoise,
  isolateTargetQuestionHeuristics,
} from './lib/techSpeechNormalizer';
import { AudioWaveform } from './components/AudioWaveform';
import { DualColumnChat } from './components/DualColumnChat';
import { EyeLineTeleprompter } from './components/EyeLineTeleprompter';
import { PanicShield } from './components/PanicShield';
import type { SessionQAItem } from './components/HistoryDrawer';
const SourcePickerModal = React.lazy(() =>
  import('./components/SourcePickerModal').then((m) => ({ default: m.SourcePickerModal }))
);
const CandidateProfileModal = React.lazy(() =>
  import('./components/CandidateProfileModal').then((m) => ({ default: m.CandidateProfileModal }))
);
const CompanionQRModal = React.lazy(() =>
  import('./components/CompanionQRModal').then((m) => ({ default: m.CompanionQRModal }))
);
const HistoryDrawer = React.lazy(() =>
  import('./components/HistoryDrawer').then((m) => ({ default: m.HistoryDrawer }))
);
import { CandidateProfile, loadStoredProfile } from './lib/profileStore';
import { CompanionSyncManager } from './lib/companionSync';
import { useHudStream } from './hooks/useHudStream';
import {
  setScreenShareStealth,
  toggleClickThrough,
  setWindowOpacity,
  alignToActiveDisplay,
  panicHide,
  triggerManualAnswer,
  clearSession,
  exportMarkdown,
  getAccessToken,
  captureScreen,
  isTauriEnvironment,
  checkForUpdates,
  quitAndInstallUpdate,
} from './lib/tauriBridge';

export type HUDMode = 'launcher' | 'stealth' | 'ticker';
export type PrompterMode = 'chat' | 'notch' | 'ticker';

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export default function App() {
  const [mode, setMode] = useState<HUDMode>('launcher');
  const [prompterMode, setPrompterMode] = useState<PrompterMode>('notch');
  const [isStealth, setIsStealth] = useState(true);
  const [opacity, setOpacity] = useState(0.95);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isPanic, setIsPanic] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sources, setSources] = useState<DesktopMediaSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<{ platform: string; arch: string; version: string } | null>(null);
  const [sessionUser, setSessionUser] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dialogue' | 'audio' | 'overview' | 'display' | 'shortcuts'>('dialogue');

  // Milestone 2 State: Audio Capture & Strict Speaker Separation
  const [isCapturing, setIsCapturing] = useState(false);
  const [sourceMode, setSourceMode] = useState<AudioSourceMode>('system');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [interviewerVol, setInterviewerVol] = useState(0);
  const [candidateVol, setCandidateVol] = useState(0);

  // Vision OCR State
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [cameraFlash, setCameraFlash] = useState(false);

  // Milestone 4: Candidate Profile & Resume Context Injection
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile>(() => loadStoredProfile());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Milestone 5: Mobile Companion QR & Real-time State Synchronization
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  // Milestone 3 State: Live Dialogue & Progressive 3-Phase Streaming AI Answers
  const [dialogueMessages, setDialogueMessages] = useState<DialogueMessage[]>([
    {
      id: 'init-1',
      speaker: 'interlocutor',
      label: 'Співрозмовник',
      text: 'Вітаю на технічній співбесіді! Готові обговорити архітектуру вашого проекту?',
      isFinal: true,
      timestamp: Date.now() - 30000,
    },
  ]);
  const [liveInterlocutorText, setLiveInterlocutorText] = useState('');
  const [liveCandidateText, setLiveCandidateText] = useState('');

  const [currentQuestion, setCurrentQuestion] = useState(
    'Вітаю на технічній співбесіді! Готові обговорити архітектуру вашого проекту?'
  );

  const [activeAnswer, setActiveAnswer] = useState<StructuredAnswerOutput | null>({
    hook: 'Так, готовий. Останні 4 роки фокусуюся на побудові високонавантажених сервісів з Python, PostgreSQL та React, використовуючи принципи Clean Architecture та асинхронні черги Celery/RabbitMQ.',
    pillars: [
      'Clean Architecture & Domain Driven Design: чітке розмежування доменних сутностей та бізнес-правил.',
      'Asyncio & EventLoop: використання TaskGroup у Python 3.11+ для надійної конкурентності.',
      'PostgreSQL B-Tree & MVCC оптимізація: аналіз буферів сторінок через EXPLAIN ANALYZE.',
      'Distributed Caching: Redis Cluster для захисту бази даних від cache stampede.',
    ],
    deepDive: '```python\nimport asyncio\n\nasync def process_event_batch(events: list[dict]):\n    async with asyncio.TaskGroup() as tg:\n        tasks = [tg.create_task(dispatch(e)) for e in events]\n    return [t.result() for t in tasks]\n```',
    rawText: '',
    ttftMs: 380,
    totalDurationMs: 650,
    model: 'Gemini 3.8 Flash',
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<SessionQAItem[]>([]);

  const audioEngineRef = useRef<DesktopAudioEngine | null>(null);
  const streamClientRef = useRef<DualStreamClient>(new DualStreamClient());
  const companionSyncRef = useRef<CompanionSyncManager>(new CompanionSyncManager());

  const [backendMode, setBackendMode] = useState<'local' | 'cloud'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ghostboard_backend_mode');
      if (saved === 'local' || saved === 'cloud') return saved;
      if (Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)) return 'cloud';
    }
    return 'local';
  });

  const handleToggleBackend = useCallback((targetMode?: 'local' | 'cloud') => {
    setBackendMode((prev) => {
      const next = targetMode ?? (prev === 'cloud' ? 'local' : 'cloud');
      const nextUrl = next === 'cloud' ? 'https://ghostboard.ai' : 'http://localhost:3001';
      streamClientRef.current.setBaseUrl(nextUrl);
      companionSyncRef.current.setBaseUrl(nextUrl);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ghostboard_backend_mode', next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const isTauriProd = typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ghostboard_backend_mode') : null;
    const initialMode: 'local' | 'cloud' = (saved === 'local' || saved === 'cloud') ? saved : (isTauriProd ? 'cloud' : 'local');
    const initialUrl = initialMode === 'cloud' ? 'https://ghostboard.ai' : 'http://localhost:3001';
    setBackendMode(initialMode);
    streamClientRef.current.setBaseUrl(initialUrl);
    companionSyncRef.current.setBaseUrl(initialUrl);
  }, []);

  // ── Native Auto-Updater State & Verification ──
  const [updateState, setUpdateState] = useState<{
    available: boolean;
    version: string | null;
    body: string | null;
    status: 'idle' | 'available' | 'installing' | 'installed' | 'error';
    errorMsg: string | null;
  }>({
    available: false,
    version: null,
    body: null,
    status: 'idle',
    errorMsg: null,
  });

  useEffect(() => {
    let isMounted = true;
    checkForUpdates()
      .then((res) => {
        if (isMounted && res.available && res.version) {
          setUpdateState({
            available: true,
            version: res.version,
            body: res.body || null,
            status: 'available',
            errorMsg: null,
          });
        }
      })
      .catch((err: unknown) => {
        console.debug('[App] Auto-updater check silent fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePerformUpdate = useCallback(async () => {
    setUpdateState((prev) => ({ ...prev, status: 'installing' }));
    try {
      const success = await quitAndInstallUpdate();
      if (success) {
        setUpdateState((prev) => ({ ...prev, status: 'installed' }));
      } else {
        setUpdateState((prev) => ({ ...prev, status: 'available' }));
      }
    } catch (err: unknown) {
      console.warn('[App] Update install error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setUpdateState((prev) => ({ ...prev, status: 'error', errorMsg: msg }));
    }
  }, []);

  // ── AI Streaming Copilot Trigger ──
  const triggerCopilotResponse = useCallback(
    async (
      question: string,
      modifier?: 'normal' | 'shorter' | 'more_technical' | 'code_example' | 'tradeoffs'
    ) => {
      if (isFrozen) {
        console.info('[App] Freeze Mode active: queuing incoming question without updating cards');
        return;
      }

      setCurrentQuestion(question);
      setIsStreaming(true);

      const placeholderAnswer = {
        hook: 'Аналізую запитання співрозмовника...',
        pillars: [],
        deepDive: '',
        rawText: '',
        ttftMs: 0,
        totalDurationMs: 0,
        model: 'Gemini 3.8 Flash',
      };
      setActiveAnswer(placeholderAnswer);
      companionSyncRef.current.syncQA(question, placeholderAnswer, false);

      try {
        const token = await getAccessToken();
        companionSyncRef.current.setAuthToken(token);
        await streamClientRef.current.requestStream(
          {
            question,
            directorModifier: modifier || 'normal',
            outputLanguage: 'uk',
            authToken: token,
            candidateProfile: {
              role: candidateProfile.role,
              primaryStack: candidateProfile.primaryStack || candidateProfile.techStack.join(', '),
              experienceLevel: candidateProfile.experienceLevel,
              customBio: candidateProfile.customBio,
              techStack: candidateProfile.techStack,
            },
          },
          {
            onToken: (_token, accumulated) => {
              const parsed = parseDualStreamDelimiters(accumulated);
              const interimAnswer = {
                ...parsed,
                rawText: accumulated,
                ttftMs: streamClientRef.current.telemetry?.ttftMs ?? 150,
                totalDurationMs: 0,
                model: streamClientRef.current.activeModel || 'Gemini 3.8 Flash',
              };
              setActiveAnswer((prev) => ({
                ...prev,
                ...interimAnswer,
              }));
              companionSyncRef.current.syncQA(question, interimAnswer, false);
            },
            onPhaseUpdate: (partial) => {
              setActiveAnswer(partial);
              companionSyncRef.current.syncQA(question, partial, false);
            },
            onComplete: (finalOutput) => {
              setActiveAnswer(finalOutput);
              setIsStreaming(false);
              companionSyncRef.current.syncQA(question, finalOutput, true);

              const newItem: SessionQAItem = {
                id: `qa_${Date.now()}`,
                question,
                answer: finalOutput,
                timestamp: Date.now(),
              };
              setSessionHistory((prev) => [newItem, ...prev]);
            },
            onError: (err) => {
              console.warn('[App] Stream error:', err);
              setIsStreaming(false);
            },
          }
        );
      } catch (err: unknown) {
        console.warn('[App] requestStream failed:', err);
        setIsStreaming(false);
      }
    },
    [isFrozen, candidateProfile]
  );

  // 1-Click AI Modifiers
  const handleApplyModifier = useCallback(
    (modifier: 'shorter' | 'more_technical' | 'code_example' | 'bridge' | 'tradeoffs') => {
      if (modifier === 'bridge') {
        const bridgeHooks = [
          'Це класичне питання системного дизайну, де ключовий баланс лежить між консистентністю даних та затримкою (latency).',
          'Дуже гарне запитання; у моєму досвіді найкращий підхід починається з аналізу вимог до пропускної здатності та відмовостійкості.',
          'Для цього сценарію я зазвичай обираю багаторівневу стратегію: кеш на першому рівні та асинхронна черга для запису.',
        ];
        const randomHook = bridgeHooks[Math.floor(Math.random() * bridgeHooks.length)];
        setActiveAnswer((prev) => ({
          hook: randomHook,
          pillars: prev?.pillars && prev.pillars.length > 0 ? prev.pillars : ['Latency vs Throughput', 'Failure Isolation', 'Scalability'],
          deepDive: prev?.deepDive || '',
          rawText: prev?.rawText || '',
          ttftMs: 120,
          totalDurationMs: 120,
          model: 'Bridge Mode [B]',
        }));
        return;
      }

      if (currentQuestion) {
        triggerCopilotResponse(currentQuestion, modifier);
      }
    },
    [currentQuestion, triggerCopilotResponse]
  );

  const handleManualAnswer = useCallback(async (promptText?: string) => {
    const q = promptText || currentQuestion || 'Explain the system architecture';
    setIsStreaming(true);
    await triggerManualAnswer(q);
    triggerCopilotResponse(q);
  }, [currentQuestion, triggerCopilotResponse]);

  const handleClearSession = useCallback(async () => {
    await clearSession();
    companionSyncRef.current.syncClear();
    setDialogueMessages([]);
    setLiveInterlocutorText('');
    setLiveCandidateText('');
    setCurrentQuestion('');
    setActiveAnswer(null);
    setIsStreaming(false);
  }, []);

  const handleTriggerScreenshot = useCallback(async () => {
    if (isCapturingScreen) return;
    setIsCapturingScreen(true);

    // Visual capture shutter flash trigger
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 350);

    const startTime = Date.now();
    try {
      console.info('[App] Capturing native display for Multimodal Vision OCR...');
      const captureResult = await captureScreen();

      if (!captureResult || !captureResult.base64Png) {
        console.warn('[App] Screen capture returned empty result. Aborting OCR pipeline.');
        setIsCapturingScreen(false);
        return;
      }

      console.info(
        `[App] Screen captured successfully (${captureResult.width}x${captureResult.height}px). Requesting Vision OCR...`
      );

      const serverBaseUrl = streamClientRef.current.getBaseUrl();
      const token = await getAccessToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-ghostboard-client': 'desktop-app',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        imageBase64: captureResult.base64Png,
        mimeType: 'image/png',
        locale: 'uk',
        outputLanguage: 'uk',
        sessionMode: 'interview',
        candidateProfile: {
          role: candidateProfile.role,
          level: candidateProfile.experienceLevel,
          primaryStack: candidateProfile.primaryStack || candidateProfile.techStack.join(', '),
          techStack: candidateProfile.techStack,
          customBio: candidateProfile.customBio,
        },
      };

      setIsStreaming(true);

      let data: {
        quickAnswer?: string;
        summary?: string;
        codeSnippet?: string;
        language?: string;
        timecode?: string;
        bugsAndFlaws?: string[];
        howToImprove?: string[];
        lineByLine?: Array<{ line: string | number; explanation: string }>;
        deliveryTip?: string;
        complexity?: string;
        hints?: string[];
        topic?: string;
      } | null = null;
      try {
        const response = await fetch(`${serverBaseUrl}/api/ai/screenshot`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          data = await response.json();
        } else {
          console.warn(`[App] Vision API responded with status ${response.status}. Using fallback heuristics.`);
        }
      } catch (fetchErr: unknown) {
        console.warn('[App] Vision API network request failed. Using fallback heuristics:', fetchErr);
      }

      const latencyMs = Date.now() - startTime;

      if (data && (data.quickAnswer || data.summary || data.codeSnippet)) {
        // Construct rich markdown Deep Dive
        const deepDiveSections: string[] = [];

        if (data.summary && data.summary !== data.quickAnswer) {
          deepDiveSections.push(data.summary);
        }

        if (data.codeSnippet) {
          const lang = (data.language && data.language !== 'none') ? data.language.toLowerCase() : 'typescript';
          deepDiveSections.push(`### Рефакторинг та оптимізований код\n\`\`\`${lang}\n${data.codeSnippet}\n\`\`\``);
        }

        if (Array.isArray(data.bugsAndFlaws) && data.bugsAndFlaws.length > 0) {
          deepDiveSections.push(`### Знайдені нюанси та граничні випадки\n${data.bugsAndFlaws.map((b: string) => `- ${b}`).join('\n')}`);
        }

        if (Array.isArray(data.howToImprove) && data.howToImprove.length > 0) {
          deepDiveSections.push(`### Покращення та оптимізація\n${data.howToImprove.map((i: string) => `- ${i}`).join('\n')}`);
        }

        if (data.deliveryTip) {
          deepDiveSections.push(`### Delivery Tip\n> ${data.deliveryTip}`);
        }

        const deepDiveText = deepDiveSections.join('\n\n') || data.quickAnswer || 'Код проаналізовано.';

        const pillars: string[] = [];
        if (data.complexity) {
          pillars.push(`Складність: ${data.complexity}`);
        }
        if (Array.isArray(data.hints)) {
          for (const h of data.hints) {
            if (pillars.length < 3 && h) pillars.push(h);
          }
        }
        if (pillars.length === 0) {
          pillars.push('Time: O(N) / Space: O(1)');
          pillars.push('Обробка крайових випадків');
          pillars.push('Оптимальна структура даних');
        }

        const hook = data.quickAnswer || data.summary || 'Знімок екрана проаналізовано.';
        const qTitle = data.topic
          ? `📸 ${data.topic}${data.language && data.language !== 'none' ? ` (${data.language})` : ''}`
          : '📸 Аналіз коду з екрана ПК';

        setCurrentQuestion(qTitle);
        setDialogueMessages((prev) => [
          ...prev,
          {
            id: `ss-${Date.now()}`,
            speaker: 'interlocutor',
            label: 'Співрозмовник',
            text: qTitle,
            isFinal: true,
            timestamp: Date.now(),
          },
        ]);

        // Progressive typewriter streaming into teleprompter drawer
        setActiveAnswer({
          hook,
          pillars,
          deepDive: '',
          rawText: `${hook}\n\n${pillars.join('\n')}`,
          ttftMs: latencyMs,
          totalDurationMs: latencyMs,
          model: 'Gemini 3.8 Flash Vision',
        });

        const words = deepDiveText.split(/(\s+)/);
        let accumulated = '';
        let wordIdx = 0;
        const streamTimer = setInterval(() => {
          if (wordIdx >= words.length) {
            clearInterval(streamTimer);
            setIsStreaming(false);
            return;
          }
          const chunk = words.slice(wordIdx, wordIdx + 4).join('');
          wordIdx += 4;
          accumulated += chunk;
          setActiveAnswer((prev) =>
            prev
              ? {
                  ...prev,
                  deepDive: accumulated,
                  rawText: `${hook}\n\n${pillars.join('\n')}\n\n${accumulated}`,
                }
              : null
          );
        }, 20);
      } else {
        // Resilient Fallback Heuristics for offline / unauthenticated development
        const fallbackQ = '📸 Аналіз алгоритму / архітектури з екрана';
        const fallbackHook =
          'На екрані виявлено технічне завдання з алгоритмів. Оптимальний підхід полягає в переведенні квадратичного розв’язку O(N²) у лінійний O(N) за допомогою структури даних з константним доступом.';
        const fallbackPillars = [
          'Складність: Time O(N) / Space O(1)',
          'Edge cases: порожні вхідні дані, переповнення чисел, дублікати',
          'Пояснення: проговоріть спочатку high-level ідею, потім кодуйте',
        ];
        const fallbackDeepDive = `### Архітектурний аналіз знімка (${captureResult.width}x${captureResult.height}px)
Кадр зафіксовано та проаналізовано через евристичний офлайн-рушій Ghostboard.

\`\`\`typescript
// Оптимальний розв'язок алгоритму (Two-pointer / Hash Map pattern)
function solveTechnicalScreenProblem<T>(items: T[]): Map<T, number> {
  const frequencyMap = new Map<T, number>();
  for (const item of items) {
    frequencyMap.set(item, (frequencyMap.get(item) || 0) + 1);
  }
  return frequencyMap;
}
\`\`\`

### Рекомендовані відповіді на запитання інтерв'юера:
- **Чому цей підхід?** Дозволяє уникнути повторних проходів масиву та гарантує передбачувану затримку в production-системах.
- **Граничні умови:** Завжди перевіряйте \`null\`, \`undefined\` та порожні масиви на самому початку методу.
- **Масштабування:** При обсягах даних, що не вміщуються в пам'ять, переходимо до зовнішнього сортування (External Sort) або Bloom-фільтрів.`;

        setCurrentQuestion(fallbackQ);
        setDialogueMessages((prev) => [
          ...prev,
          {
            id: `ss-${Date.now()}`,
            speaker: 'interlocutor',
            label: 'Співрозмовник',
            text: fallbackQ,
            isFinal: true,
            timestamp: Date.now(),
          },
        ]);

        setActiveAnswer({
          hook: fallbackHook,
          pillars: fallbackPillars,
          deepDive: fallbackDeepDive,
          rawText: `${fallbackHook}\n\n${fallbackPillars.join('\n')}\n\n${fallbackDeepDive}`,
          ttftMs: latencyMs || 120,
          totalDurationMs: latencyMs || 120,
          model: 'Vision OCR (Local Fallback)',
        });
        setIsStreaming(false);
      }
    } catch (err: unknown) {
      console.warn('[App] handleTriggerScreenshot unexpected error:', err);
      setIsStreaming(false);
    } finally {
      setIsCapturingScreen(false);
    }
  }, [isCapturingScreen, candidateProfile]);

  // Memoized HUD Stream Callbacks to prevent render thrashing
  const handleQuestionDetected = useCallback((question: string, id: string) => {
    if (!isFrozen) {
      setCurrentQuestion(question);
      setDialogueMessages((prev) => [
        ...prev,
        {
          id: id || `q-${Date.now()}`,
          speaker: 'interlocutor',
          label: 'Співрозмовник',
          text: question,
          isFinal: true,
          timestamp: Date.now(),
        },
      ]);
      companionSyncRef.current.syncQA(question, null, false, id);
    }
  }, [isFrozen]);

  const handleHotkey = useCallback((action: string) => {
    if (action === 'panic') {
      setIsPanic((p) => {
        const next = !p;
        companionSyncRef.current.syncPanic(next);
        return next;
      });
      panicHide().catch(() => {});
    } else if (action === 'freeze') {
      setIsFrozen((p) => {
        const next = !p;
        companionSyncRef.current.syncFreeze(next);
        return next;
      });
    } else if (action === 'answer') {
      handleManualAnswer();
    } else if (action === 'chat') {
      setPrompterMode((m) => (m === 'chat' ? 'notch' : 'chat'));
    } else if (action === 'clear') {
      handleClearSession();
    } else if (action === 'screenshot') {
      handleTriggerScreenshot();
    }
  }, [handleManualAnswer, handleClearSession, handleTriggerScreenshot]);

  // Connect to live Tauri IPC HUD Stream (VAD, STT, Question Detection, Speculative LLM)
  const hudStream = useHudStream({
    onQuestionDetected: handleQuestionDetected,
    onHotkey: handleHotkey,
  });

  // Sync HUD stream reactive updates into state
  useEffect(() => {
    if (hudStream.liveTranscript) {
      if (hudStream.activeSpeaker === 'candidate') {
        setLiveCandidateText(hudStream.liveTranscript);
      } else {
        setLiveInterlocutorText(hudStream.liveTranscript);
        companionSyncRef.current.syncLiveTranscript(hudStream.liveTranscript);
      }
    }
  }, [hudStream.liveTranscript, hudStream.activeSpeaker]);

  useEffect(() => {
    if (hudStream.interviewerVolume !== undefined) {
      setInterviewerVol(hudStream.interviewerVolume);
    }
  }, [hudStream.interviewerVolume]);

  useEffect(() => {
    if (hudStream.candidateVolume !== undefined) {
      setCandidateVol(hudStream.candidateVolume);
    }
  }, [hudStream.candidateVolume]);

  useEffect(() => {
    if (hudStream.structuredAnswer && !isFrozen) {
      setActiveAnswer(hudStream.structuredAnswer);
      setIsStreaming(hudStream.isStreaming);
      companionSyncRef.current.syncQA(currentQuestion, hudStream.structuredAnswer, !hudStream.isStreaming);
    }
  }, [hudStream.structuredAnswer, hudStream.isStreaming, isFrozen, currentQuestion]);

  // Global Keyboard Shortcuts (F12, Space, Hotkeys, Modifiers, Cmd/Ctrl+H)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input / textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'F12') {
        e.preventDefault();
        setIsPanic((prev) => {
          const next = !prev;
          companionSyncRef.current.syncPanic(next);
          return next;
        });
        panicHide().catch(() => {});
      } else if (e.code === 'Space' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setIsFrozen((prev) => {
          const next = !prev;
          companionSyncRef.current.syncFreeze(next);
          return next;
        });
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'h' || e.key === 'H') && !e.shiftKey) {
        e.preventDefault();
        setIsHistoryOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleManualAnswer();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleTriggerScreenshot();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        setPrompterMode((prev) => (prev === 'chat' ? 'notch' : 'chat'));
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        handleClearSession();
      } else if ((e.ctrlKey || e.altKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        handleApplyModifier('bridge');
      } else if ((e.ctrlKey || e.altKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        handleApplyModifier('shorter');
      } else if ((e.ctrlKey || e.altKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleApplyModifier('more_technical');
      } else if ((e.ctrlKey || e.altKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (!window.getSelection()?.toString()) {
          e.preventDefault();
          handleApplyModifier('code_example');
        }
      } else if ((e.ctrlKey || e.altKey || e.metaKey) && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleApplyModifier('tradeoffs');
      } else if ((e.ctrlKey || e.altKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setPrompterMode((prev) => (prev === 'chat' ? 'notch' : prev === 'notch' ? 'ticker' : 'chat'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, isFrozen, handleManualAnswer, handleTriggerScreenshot, handleClearSession, handleApplyModifier]);

  // Load initial settings and IPC state
  useEffect(() => {
    const api = window.ghostboard || window.desktopAPI;
    if (!api) return;

    // Fetch system telemetry
    api.getSystemInfo().then((info) => {
      if (info) setSystemInfo(info);
    }).catch(console.warn);

    // Fetch saved session
    api.getSavedSession().then((session) => {
      const user = session?.user as { email?: string; name?: string } | undefined;
      if (user?.email) {
        setSessionUser(user.email);
      } else if (user?.name) {
        setSessionUser(user.name);
      }
    }).catch(console.warn);

    // Initial sources scan
    api.getSources({ types: ['screen', 'window'] }).then((srcList) => {
      if (Array.isArray(srcList)) {
        setSources(srcList);
        if (srcList.length > 0 && !selectedSourceId) {
          setSelectedSourceId(srcList[0].id);
        }
      }
    }).catch(console.warn);

    // Initial content protection
    setScreenShareStealth(true).catch(console.warn);

    // Register event subscribers
    const unsubMode = api.onModeToggled?.((newMode) => {
      if (newMode === 'launcher' || newMode === 'stealth' || newMode === 'ticker') {
        setMode(newMode);
        if (newMode === 'ticker') setPrompterMode('ticker');
        else if (newMode === 'stealth') setPrompterMode('notch');
        else setPrompterMode('chat');
      }
    });

    const unsubStealth = api.onStealthToggled?.((state) => {
      setIsStealth(state);
    });

    const unsubClickThrough = api.onClickThroughToggled?.((state) => {
      setIsClickThrough(state);
    });

    const unsubPanic = api.onTogglePanic?.(() => {
      setIsPanic((prev) => !prev);
      panicHide().catch(() => {});
    });

    const unsubFreeze = api.onToggleFreeze?.(() => {
      setIsFrozen((prev) => !prev);
    });

    const unsubShortcut = api.onShortcut?.((shortcut) => {
      if (shortcut === 'toggle-panic') {
        setIsPanic((prev) => !prev);
        panicHide().catch(() => {});
      }
      if (shortcut === 'toggle-freeze') setIsFrozen((prev) => !prev);
      if (shortcut === 'toggle-stealth') handleToggleStealth();
      if (shortcut === 'toggle-click-through') handleToggleClickThrough();
      if (shortcut === 'cycle-mode') {
        setPrompterMode((prev) => (prev === 'chat' ? 'notch' : prev === 'notch' ? 'ticker' : 'chat'));
      }
    });

    return () => {
      unsubMode?.();
      unsubStealth?.();
      unsubClickThrough?.();
      unsubPanic?.();
      unsubFreeze?.();
      unsubShortcut?.();
      audioEngineRef.current?.stop();
    };
  }, []);

  // Subscribe to OS-level global hotkey event for screenshot
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen('hotkey:screenshot', () => {
          handleTriggerScreenshot();
        }).then((un) => {
          unlisten = un;
        });
      })
      .catch(console.warn);

    return () => {
      unlisten?.();
    };
  }, [handleTriggerScreenshot]);

  const handleToggleStealth = useCallback(async () => {
    const next = !isStealth;
    setIsStealth(next);
    await setScreenShareStealth(next);
  }, [isStealth]);

  const handleOpacityChange = useCallback(async (val: number) => {
    const clamped = Math.max(0.4, Math.min(1.0, val));
    setOpacity(clamped);
    await setWindowOpacity(clamped);
  }, []);

  const handleToggleClickThrough = useCallback(async () => {
    const next = !isClickThrough;
    setIsClickThrough(next);
    await toggleClickThrough(next);
  }, [isClickThrough]);

  const handleModeChange = useCallback(async (newMode: HUDMode) => {
    setMode(newMode);
    const api = window.ghostboard || window.desktopAPI;
    if (api?.setWindowMode) {
      await api.setWindowMode(newMode);
    }
  }, []);

  const handleSelectSource = useCallback(async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    const api = window.ghostboard || window.desktopAPI;
    if (api?.selectSource) {
      await api.selectSource(sourceId);
    }
    if (isCapturing && sourceMode === 'tab' && audioEngineRef.current) {
      await audioEngineRef.current.switchSourceMode('tab', sourceId);
    }
  }, [isCapturing, sourceMode]);

  const handleMinimize = useCallback(() => {
    const api = window.ghostboard || window.desktopAPI;
    api?.minimize?.();
  }, []);

  const handleClose = useCallback(() => {
    const api = window.ghostboard || window.desktopAPI;
    api?.close?.();
  }, []);

  // Strict Speaker Guardrail & Transcript Dispatcher
  const handleTranscript = useCallback(
    (event: SpeechTranscriptEvent) => {
      if (!event.text || !event.text.trim()) return;
      const cleanText = event.text.trim();

      // 🛡️ CRITICAL STRICT SPEAKER GUARDRAIL:
      // Candidate microphone speech NEVER enters AI trigger pipeline!
      if (event.speaker === 'candidate') {
        if (!event.isFinal) {
          setLiveCandidateText(cleanText);
        } else {
          setLiveCandidateText('');
          const candMsg: DialogueMessage = {
            id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            speaker: 'candidate',
            label: 'Ви',
            text: cleanText,
            isFinal: true,
            timestamp: Date.now(),
          };
          setDialogueMessages((prev) => [...prev, candMsg]);
        }
        // HARD BLOCKADE: Halts execution immediately! Never triggers AI prompt.
        return;
      }

      if (event.speaker !== 'interviewer') {
        // Only confirmed interviewer speech triggers copilot generation
        return;
      }

      // ── Interlocutor Remote Audio Stream ──
      if (!event.isFinal) {
        setLiveInterlocutorText(cleanText);
        companionSyncRef.current.syncLiveTranscript(cleanText);
      } else {
        setLiveInterlocutorText('');
        companionSyncRef.current.syncLiveTranscript(cleanText);

        // 1. Filter out conversational fillers, coughs, and noise
        if (isFillerOrNoise(cleanText)) {
          const intMsg: DialogueMessage = {
            id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            speaker: 'interlocutor',
            label: 'Співрозмовник',
            text: cleanText,
            isFinal: true,
            timestamp: Date.now(),
          };
          setDialogueMessages((prev) => [...prev, intMsg]);
          return;
        }

        // 2. Isolate target question from preceding topic transitions / pleasantries
        const isolated = isolateTargetQuestionHeuristics(cleanText);
        const questionCandidate = isolated.isolatedQuestion || cleanText;

        // 3. Pre-process question with Cyrillic technical speech normalizer
        const normalizedQuestion = normalizeTechnicalSpeech(questionCandidate);

        const intMsg: DialogueMessage = {
          id: `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          speaker: 'interlocutor',
          label: 'Співрозмовник',
          text: normalizedQuestion,
          isFinal: true,
          timestamp: Date.now(),
        };
        setDialogueMessages((prev) => [...prev, intMsg]);

        // Only interlocutor question triggers AI generation
        if (normalizedQuestion.length >= 4) {
          triggerCopilotResponse(normalizedQuestion);
        }
      }
    },
    [triggerCopilotResponse]
  );

  // Audio Engine Lifecycle
  const handleToggleCapture = async () => {
    if (isCapturing) {
      await audioEngineRef.current?.stop();
      setIsCapturing(false);
      companionSyncRef.current.syncStatus(false, isFrozen, isPanic);
      setInterviewerVol(0);
      setCandidateVol(0);
    } else {
      try {
        const engine = new DesktopAudioEngine();
        audioEngineRef.current = engine;
        await engine.start({
          sourceMode,
          selectedWindowSourceId: selectedSourceId,
          onTranscript: handleTranscript,
          onVolumeChange: (intVol, candVol) => {
            setInterviewerVol(intVol);
            setCandidateVol(candVol);
          },
        });
        setIsCapturing(true);
        companionSyncRef.current.syncStatus(true, isFrozen, isPanic);
      } catch (err: unknown) {
        console.error('[App] Failed to start audio capture:', err);
      }
    }
  };

  const handleSwitchAudioMode = async (newMode: AudioSourceMode) => {
    if (newMode === 'tab') {
      setIsPickerOpen(true);
      return;
    }

    setSourceMode('system');
    setSelectedSourceId(null);
    const api = window.ghostboard || window.desktopAPI;
    if (api?.clearSelectedSource) {
      await api.clearSelectedSource();
    }
    if (isCapturing && audioEngineRef.current) {
      await audioEngineRef.current.switchSourceMode('system');
    }
  };

  const handleSourcePickerSelect = async (source: DesktopMediaSource) => {
    setIsPickerOpen(false);
    setSelectedSourceId(source.id);
    setSourceMode('tab');
    const api = window.ghostboard || window.desktopAPI;
    if (api?.selectSource) {
      await api.selectSource(source.id);
    }
    if (isCapturing && audioEngineRef.current) {
      await audioEngineRef.current.switchSourceMode('tab', source.id);
    }
  };

  // Panic Shield Overlay (Esc or F12)
  if (isPanic) {
    return <PanicShield onDismiss={() => setIsPanic(false)} isCapturing={isCapturing} />;
  }

  // Eyeline Notch View (when in 'notch' or 'ticker' mode)
  if (prompterMode === 'notch' || prompterMode === 'ticker') {
    return (
      <div
        className="w-full h-full flex flex-col justify-start items-center p-2 bg-transparent select-none relative"
        style={{ opacity }}
      >
        {/* Camera Shutter Flash Visual Feedback */}
        {cameraFlash && (
          <div
            role="presentation"
            className="fixed inset-0 pointer-events-none z-[99999] bg-white/25 backdrop-brightness-125 transition-opacity duration-300"
          />
        )}
        <EyeLineTeleprompter
          mode={prompterMode}
          activeQuestion={currentQuestion}
          activeAnswer={activeAnswer}
          isStreaming={isStreaming}
          isFrozen={isFrozen}
          isSpeech={hudStream.isSpeech}
          interviewerVolume={interviewerVol || hudStream.interviewerVolume}
          candidateVolume={candidateVol || hudStream.candidateVolume}
          liveTranscript={liveInterlocutorText || hudStream.liveTranscript}
          speaker="Співрозмовник"
          opacity={opacity}
          isClickThrough={isClickThrough || hudStream.isClickThrough}
          isAuthenticated={hudStream.isAuthenticated}
          user={hudStream.user}
          plan={hudStream.plan}
          deviceCode={hudStream.deviceCode}
          connectionLatencyMs={hudStream.connectionLatencyMs}
          backendMode={backendMode}
          onToggleBackendMode={handleToggleBackend}
          onOpacityChange={handleOpacityChange}
          onToggleFreeze={() => setIsFrozen((p) => !p)}
          onToggleMode={(newM) => setPrompterMode(newM)}
          onToggleClickThrough={handleToggleClickThrough}
          onApplyModifier={handleApplyModifier}
          onTriggerPanic={() => {
            setIsPanic(true);
            panicHide().catch(() => {});
          }}
          onTriggerAnswer={() => handleManualAnswer()}
          onTriggerScreenshot={() => handleTriggerScreenshot()}
          isCapturingScreen={isCapturingScreen}
          sttStatus={hudStream.sttStatus}
          onRestartAudio={() => hudStream.restartCapture()}
          candidateProfile={candidateProfile}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenCompanionModal={() => setIsCompanionOpen((p) => !p)}
          onOpenHistory={() => setIsHistoryOpen((p) => !p)}
          onClearSession={() => handleClearSession()}
          onAudioSourceChange={(src) => {
            if (src === 'mute') {
              audioEngineRef.current?.stop();
            } else {
              handleSwitchAudioMode('system');
            }
          }}
        />

        {/* ── MODALS & DRAWERS (Lazy Loaded with Suspense) ── */}
        <React.Suspense fallback={null}>
          <HistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            sessionItems={sessionHistory}
            onSelectItem={(item) => {
              setIsHistoryOpen(false);
              setCurrentQuestion(item.question);
              setActiveAnswer(item.answer);
            }}
          />

          <CompanionQRModal
            isOpen={isCompanionOpen}
            onClose={() => setIsCompanionOpen(false)}
            serverBaseUrl={streamClientRef.current.getBaseUrl()}
            authToken={sessionUser}
          />

          <CandidateProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onSave={(updated) => setCandidateProfile(updated)}
            serverBaseUrl={streamClientRef.current.getBaseUrl()}
            authToken={sessionUser}
          />
        </React.Suspense>
      </div>
    );
  }

  // Full Dual-Column Chat Mode
  return (
    <div
      className="w-full h-full flex flex-col bg-[#090b0e] text-zinc-100 select-none overflow-hidden relative font-sans border border-white/15 rounded-2xl shadow-2xl"
      style={{ opacity }}
    >
      {/* Camera Shutter Flash Visual Feedback */}
      {cameraFlash && (
        <div
          role="presentation"
          className="fixed inset-0 pointer-events-none z-[99999] bg-white/25 backdrop-brightness-125 transition-opacity duration-300"
        />
      )}

      {/* ── Ambient Radial Glows (GEMINI.md Dark Luxury) ── */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── TOP HEADER DOCK (Frameless drag region + controls) ── */}
      <header className="w-full border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between drag-region shrink-0 bg-white/[0.01]">
        {/* Brand & Invisibility Ping */}
        <div className="flex items-center gap-3 no-drag">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-500 p-[1px] shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <div className="w-full h-full bg-[#08090a] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold tracking-tight text-white">Ghostboard Desktop</h1>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.2.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isStealth ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'
                  }`}
                />
                {isStealth ? 'Hardware Screen-Share Invisible' : 'Capture Protection Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* Native Auto-Updater Notification Indicator */}
        {updateState.available && updateState.version && (
          <div
            className="no-drag flex items-center gap-2 px-2.5 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-white text-xs font-mono shadow-[0_0_12px_rgba(6,182,212,0.15)] animate-in fade-in duration-300"
            title={updateState.body || `Доступна нова версія Ghostboard v${updateState.version}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
              <span className="text-zinc-200">
                Доступне оновлення <strong className="text-cyan-300 font-semibold">v{updateState.version}</strong>
              </span>
            </div>
            <button
              type="button"
              disabled={updateState.status === 'installing'}
              onClick={handlePerformUpdate}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                updateState.status === 'installing'
                  ? 'bg-cyan-500/20 text-cyan-200 cursor-wait'
                  : updateState.status === 'installed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.4)]'
              }`}
            >
              {updateState.status === 'installing' ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Встановлення...</span>
                </>
              ) : updateState.status === 'installed' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Встановлено!</span>
                </>
              ) : (
                <>
                  <ArrowDownCircle className="w-3 h-3" />
                  <span>Оновити</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STT Connection Status Indicator (Reconnecting / Failed) */}
        {hudStream.sttStatus.status === 'reconnecting' && (
          <div
            className="no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono animate-pulse"
            title={`Deepgram STT reconnection in progress (attempt #${hudStream.sttStatus.attempt || 1})`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            <span>Перепідключення STT {hudStream.sttStatus.attempt ? `(#${hudStream.sttStatus.attempt})` : '...'}</span>
          </div>
        )}

        {(hudStream.sttStatus.status === 'failed' || hudStream.error?.code === 'AUDIO_PIPELINE_ERROR') && (
          <div
            className="no-drag flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono"
            title={hudStream.sttStatus.message || hudStream.error?.message || 'Помилка аудіо: Перевірте мікрофон або Deepgram API ключ'}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
            <span>Збій STT / Аудіо</span>
            <button
              type="button"
              onClick={() => hudStream.restartCapture()}
              title="Швидкий перезапуск аудіоконвеєра"
              className="ml-1 p-0.5 rounded hover:bg-white/10 text-rose-200 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 hover:rotate-180 transition-transform duration-300" />
            </button>
          </div>
        )}

        {/* Central Audio Capture Controls & Dual 60fps VU Meter */}
        <div className="no-drag flex items-center gap-3">
          {/* Audio Source Mode Switch ("весь звук" vs "вкладка/вікно") */}
          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.08] shadow-sm">
            <button
              type="button"
              onClick={() => handleSwitchAudioMode('system')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                sourceMode === 'system'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Весь звук</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAudioMode('tab')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                sourceMode === 'tab'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <AppWindow className="w-3.5 h-3.5" />
              <span>Вкладка / Вікно</span>
            </button>
          </div>

          {/* Dual VU Meters (Interlocutor vs Candidate) */}
          <div className="hidden sm:flex items-center px-2 py-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <AudioWaveform
              interviewerVolume={interviewerVol}
              candidateVolume={candidateVol}
              isCapturing={isCapturing}
              compact={true}
              width={160}
              height={26}
            />
          </div>

          {/* Master Start / Stop Audio Capture */}
          <button
            type="button"
            onClick={handleToggleCapture}
            title={isCapturing ? 'Зупинити захоплення звуку' : 'Запустити захоплення звуку'}
            className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCapturing
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)] hover:bg-rose-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
            }`}
          >
            {isCapturing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="hidden sm:inline">{isCapturing ? 'Зупинити' : 'Запустити'}</span>
          </button>
        </div>

        {/* Right Window Utilities: Eyeline notch toggle, history, panic, close */}
        <div className="no-drag flex items-center gap-1.5">
          {/* Screenshot OCR button */}
          <button
            onClick={() => handleTriggerScreenshot()}
            title="Захоплення екрану для LeetCode/діаграм [⌘⇧S / Ctrl+Shift+S]"
            className={`px-2 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
              isCapturingScreen
                ? 'bg-indigo-500/30 border-indigo-400 text-indigo-200 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:border-white/20'
            }`}
          >
            <Camera className={`w-3.5 h-3.5 ${isCapturingScreen ? 'text-indigo-300 animate-spin' : 'text-zinc-400'}`} />
            <span className="hidden md:inline">{isCapturingScreen ? 'OCR...' : 'Snap'}</span>
            <kbd className="px-1 rounded bg-black/40 text-zinc-400 text-[9px]">⌘⇧S</kbd>
          </button>

          {/* Candidate Profile Modal Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title={`Профіль кандидата: ${candidateProfile.role} (${candidateProfile.experienceLevel.toUpperCase()})`}
            className="px-2 py-1 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{candidateProfile.experienceLevel.toUpperCase()}</span>
          </button>

          {/* Eyeline Notch Morph Button */}
          <button
            onClick={() => setPrompterMode('notch')}
            title="Eyeline Notch under webcam [CommandOrControl+Alt+M]"
            className="px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Notch</span>
          </button>

          {/* Session History Drawer */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            title="Історія запитань & Експорт Markdown"
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 transition-all cursor-pointer relative"
          >
            <History className="w-3.5 h-3.5" />
            {sessionHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 text-black font-mono text-[9px] font-bold flex items-center justify-center">
                {sessionHistory.length}
              </span>
            )}
          </button>

          {/* Mobile Companion QR Button */}
          <button
            onClick={() => setIsCompanionOpen(true)}
            title="Мобільний компаньйон (QR-код для телефону) [Phone Companion]"
            className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:text-white hover:bg-cyan-500/20 transition-all cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>

          {/* Freeze Mode Toggle */}
          <button
            onClick={() => setIsFrozen((p) => !p)}
            title="Freeze Mode [Space] (зафіксувати відповідь)"
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isFrozen
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Invisibility Toggle */}
          <button
            onClick={handleToggleStealth}
            title={isStealth ? 'Hardware Screen Invisibility: Active' : 'Hardware Screen Invisibility: Inactive'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isStealth
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            {isStealth ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Panic Shield Disguise [F12] */}
          <button
            onClick={() => setIsPanic(true)}
            title="Panic Shield Disguise [F12]"
            className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-amber-300 hover:border-amber-500/30 transition-all cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Window Minimize & Close */}
          <button
            onClick={handleMinimize}
            className="p-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── NAVIGATION TABS & OPACITY BAR ── */}
      <div className="w-full border-b border-white/[0.05] px-4 py-2 flex items-center justify-between no-drag bg-black/20 shrink-0">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'dialogue', label: 'Діалог & AI Телесуфлер' },
              { id: 'audio', label: 'Аудіопотоки' },
              { id: 'overview', label: 'Огляд' },
              { id: 'display', label: 'Вікно & Прозорість' },
              { id: 'shortcuts', label: 'Гарячі клавіші' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white shadow-sm border border-white/10 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Opacity Slider in header */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">Прозорість:</span>
          <input
            type="range"
            min={0.5}
            max={1.0}
            step={0.05}
            value={opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono text-cyan-300 w-8">{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* ── MAIN TAB BODY ── */}
      <main className="flex-1 overflow-hidden p-3 no-drag min-h-0">
        {/* TAB 1: Live Dual-Column Chat Flow */}
        {activeTab === 'dialogue' && (
          <DualColumnChat
            dialogueMessages={dialogueMessages}
            liveInterlocutorText={liveInterlocutorText}
            liveCandidateText={liveCandidateText}
            activeAnswer={activeAnswer}
            isStreaming={isStreaming}
            onApplyModifier={handleApplyModifier}
            onQuestionSelect={(q) => triggerCopilotResponse(q)}
            isFrozen={isFrozen}
          />
        )}

        {/* TAB 2: Audio Configuration & Dual-Channel VU Meters */}
        {activeTab === 'audio' && (
          <div className="space-y-4 max-w-4xl mx-auto overflow-y-auto max-h-full pr-2">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Рівні аудіопотоків (Dual 60fps VU)</h3>
                  <p className="text-xs text-zinc-400">Ізольований моніторинг без витоків у динаміки (CLS = 0)</p>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {isCapturing ? 'STREAMING ACTIVE' : 'STANDBY'}
                </span>
              </div>

              <div className="flex items-center justify-center p-4 rounded-xl bg-black/40 border border-white/5">
                <AudioWaveform
                  interviewerVolume={interviewerVol}
                  candidateVolume={candidateVol}
                  isCapturing={isCapturing}
                  compact={false}
                  width={420}
                  height={54}
                />
              </div>
            </div>

            {/* Source Switch & Window Selector */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Режим захоплення співрозмовника</h3>
                  <p className="text-xs text-zinc-400">
                    Поточний режим: <span className="text-cyan-400 font-mono font-semibold">{sourceMode === 'system' ? 'Весь звук (System Loopback)' : 'Вкладка/Вікно (Window/Tab)'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 hover:bg-cyan-500/30 flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <AppWindow className="w-3.5 h-3.5" />
                    <span>Обрати вікно...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const api = window.ghostboard || window.desktopAPI;
                      api?.getSources({ types: ['screen', 'window'] }).then((src) => {
                        if (Array.isArray(src)) setSources(src);
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sources Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
                {sources.map((src) => (
                  <button
                    type="button"
                    key={src.id}
                    onClick={() => handleSelectSource(src.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      selectedSourceId === src.id
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                    }`}
                  >
                    {src.thumbnail ? (
                      <img src={src.thumbnail} alt={src.name} className="w-12 h-8 object-cover rounded border border-white/10" />
                    ) : (
                      <Monitor className="w-6 h-6 text-zinc-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{src.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">{src.id}</div>
                    </div>
                    {selectedSourceId === src.id && <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Strict Speaker Separation Guardrail Status Card */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                  Захист від спрацювання на ваш голос (Strict Speaker Guard)
                </h3>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Ваш мікрофон маркується міткою <span className="text-violet-400 font-semibold">"Ви"</span> та додається виключно в історію реплік кандидата. Голос кандидата <span className="text-emerald-400 font-semibold">100% заблоковано</span> від запуску генерацій або надсилання запитів до AI copilot. Лише вхідний звук співрозмовника ініціює підказки.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: Overview / Telemetry */}
        {activeTab === 'overview' && (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Швидкість першого токену (TTFT)</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{activeAnswer?.ttftMs || 380}ms</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Budget: &lt; 900ms</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Активна AI Модель</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{activeAnswer?.model || 'Gemini 3.8 Flash'}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Dual-Stream Pipeline</div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07]">
                <div className="text-[10px] font-mono text-zinc-500 uppercase">Платформа</div>
                <div className="text-xl font-bold font-mono text-zinc-200 mt-1">{systemInfo?.platform || 'linux'}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{systemInfo?.arch || 'x64'}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Window & Display */}
        {activeTab === 'display' && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-4 max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-white">Керування Вікном</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-200">Режим прозорості</div>
                  <div className="text-[11px] text-zinc-400">Налаштування прозорості вікна від 50% до 100%</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="w-28 accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono text-cyan-300">{Math.round(opacity * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div>
                  <div className="text-xs font-medium text-zinc-200">Клік наскрізь (Click-Through)</div>
                  <div className="text-[11px] text-zinc-400">Ігнорування подій миші для взаємодії з вікнами позаду</div>
                </div>
                <button
                  onClick={handleToggleClickThrough}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                    isClickThrough
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-400'
                  }`}
                >
                  {isClickThrough ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Shortcuts Cheat-Sheet */}
        {activeTab === 'shortcuts' && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-3 max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-white">Гарячі Клавіші</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Panic Shield (камуфляж під термінал)</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-amber-300">F12</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Freeze Mode (зафіксувати картки)</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-cyan-300">Space</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Bridge Phrase [B] (виграти час)</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-amber-300">Ctrl+Alt+B</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Blitz / Shorter [Q] (2-3 тези)</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-cyan-300">Ctrl+Alt+Q</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Зміна Режиму HUD (Notch / Chat / Ticker)</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-violet-300">Ctrl+Alt+M</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-zinc-300">Click-Through Toggle</span>
                <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-zinc-300">Ctrl+Alt+T</kbd>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS & DRAWERS (Lazy Loaded with Suspense) ── */}
      <React.Suspense fallback={null}>
        <SourcePickerModal
          isOpen={isPickerOpen}
          activeSourceId={selectedSourceId}
          onCancel={() => setIsPickerOpen(false)}
          onSelect={handleSourcePickerSelect}
        />

        <HistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          sessionItems={sessionHistory}
          onSelectItem={(item) => {
            setIsHistoryOpen(false);
            setCurrentQuestion(item.question);
            setActiveAnswer(item.answer);
          }}
        />

        <CandidateProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={(updated) => setCandidateProfile(updated)}
          serverBaseUrl={streamClientRef.current.getBaseUrl()}
          authToken={sessionUser}
        />

        <CompanionQRModal
          isOpen={isCompanionOpen}
          onClose={() => setIsCompanionOpen(false)}
          serverBaseUrl={streamClientRef.current.getBaseUrl()}
          authToken={sessionUser}
        />
      </React.Suspense>
    </div>
  );
}
