import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  Volume2,
  Mic,
  Cpu,
  FileText,
  Shield,
  Keyboard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  LogOut,
  Sliders,
  Eye,
  SlidersHorizontal,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  Maximize2,
  Radio,
  HelpCircle,
  Zap,
  Layers,
  ChevronRight,
  Check,
  Languages,
} from 'lucide-react';
import {
  type CopilotMode,
  launchCopilotWindow,
  listAudioDevices,
  startAudioCaptureDetailed,
  getEnvironmentInfo,
  type AudioDevice,
  type EnvironmentInfo,
} from '../lib/tauriBridge';
import {
  useDesktopSettings,
  type DesktopSettings,
  type AnswerSpeed,
  type AnswerLength,
  type HintLanguage,
  OPACITY_RANGE,
  FONT_RANGE,
} from '../lib/desktopSettings';
import {
  getStoredProfile,
  updateStoredProfile,
  syncProfileToBackend,
  EXPERIENCE_LEVELS,
  type CandidateProfile,
  type CandidateLevel,
} from '../lib/profileStore';
import type { UserProfileData } from '../lib/apiClient';

export interface OfficeWindowProps {
  user: UserProfileData | null;
  onLogout: () => void;
  onOpenAuth?: () => void;
}

type OfficeTab = 'launch' | 'audio' | 'ai' | 'resume' | 'stealth';

const SPRING = { type: 'spring' as const, stiffness: 380, damping: 28, mass: 0.6 };

export const OfficeWindow: React.FC<OfficeWindowProps> = ({ user, onLogout }) => {
  const [settings, updateSettings] = useDesktopSettings();
  const [activeTab, setActiveTab] = useState<OfficeTab>('launch');
  const [profile, setProfile] = useState<CandidateProfile>(() => getStoredProfile());

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Audio devices state
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [isTestingSound, setIsTestingSound] = useState(false);
  const [soundTestLevel, setSoundTestLevel] = useState(0);

  // Profile sync state
  const [isSyncingProfile, setIsSyncingProfile] = useState(false);
  const [profileSyncSuccess, setProfileSyncSuccess] = useState(false);
  const [profileSyncError, setProfileSyncError] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Demo preview state
  const [isPreviewTesting, setIsPreviewTesting] = useState(false);
  const [previewStep, setPreviewStep] = useState<number>(0);

  // Environment
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null);

  useEffect(() => {
    getEnvironmentInfo().then(setEnvInfo).catch(console.warn);
  }, []);

  const refreshAudioDevices = useCallback(async () => {
    setIsRefreshingDevices(true);
    try {
      const list = await listAudioDevices();
      setDevices(list);
    } catch (err) {
      console.warn('[Office] Failed to list audio devices:', err);
    } finally {
      setIsRefreshingDevices(false);
    }
  }, []);

  useEffect(() => {
    refreshAudioDevices();
  }, [refreshAudioDevices]);

  // Handle Launch Copilot Window (Guaranteed action)
  const handleLaunch = useCallback(
    async (overrideMode?: CopilotMode) => {
      const targetMode = overrideMode || settings.copilotMode;
      setLaunchError(null);
      setIsLaunching(true);

      try {
        // 1. Launch / show detached HUD window (MUST NEVER BE BLOCKED)
        await launchCopilotWindow(targetMode);

        // 2. Start audio pipeline in background (never blocks the window)
        startAudioCaptureDetailed('dual', {
          loopbackDevice: settings.loopbackDevice,
          micDevice: settings.micDevice,
        }).catch((err) => {
          console.warn('[Office] Audio start warning:', err);
        });
      } catch (err) {
        console.error('[Office] Launch failed:', err);
        setLaunchError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLaunching(false);
      }
    },
    [settings.copilotMode, settings.loopbackDevice, settings.micDevice]
  );

  // Keyboard shortcut Ctrl+Enter to launch from anywhere in the Office
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleLaunch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleLaunch]);

  // Audio VU-meter sound test simulation / real mic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTestingSound) {
      interval = setInterval(() => {
        setSoundTestLevel(Math.floor(25 + Math.random() * 65));
      }, 80);
    } else {
      setSoundTestLevel(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTestingSound]);

  // Save profile helper
  const handleUpdateProfile = (patch: Partial<CandidateProfile>) => {
    const updated = updateStoredProfile(patch);
    setProfile(updated);
  };

  // Sync profile to backend
  const handleSyncProfile = async () => {
    setIsSyncingProfile(true);
    setProfileSyncSuccess(false);
    setProfileSyncError(null);
    try {
      const res = await syncProfileToBackend(profile);
      if (res.success) {
        setProfileSyncSuccess(true);
        setTimeout(() => setProfileSyncSuccess(false), 3000);
      } else {
        setProfileSyncError(res.error || 'Помилка синхронізації');
      }
    } catch (e) {
      setProfileSyncError('Немає зв’язку з сервером');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  // Preview test animation
  const handleTestPreview = () => {
    setIsPreviewTesting(true);
    setPreviewStep(1);
    const t1 = setTimeout(() => setPreviewStep(2), 700);
    const t2 = setTimeout(() => setPreviewStep(3), 1600);
    const t3 = setTimeout(() => {
      setIsPreviewTesting(false);
      setPreviewStep(0);
    }, 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  };

  // Add tech tag
  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (!val) return;
    if (!profile.techStack.includes(val)) {
      handleUpdateProfile({ techStack: [...profile.techStack, val] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    handleUpdateProfile({ techStack: profile.techStack.filter((t) => t !== tag) });
  };

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-zinc-100 select-none overflow-hidden font-sans">
      {/* ─────────────────────────────────────────────────────────────
          SIDEBAR NAVIGATION (Monochrome, Strict Luxury)
      ───────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-[#0d0d0f] border-r border-zinc-800/80 flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-950 font-black text-sm shadow-md">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold tracking-tight text-white">Ghostboard</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  Office
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">Центр керування</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('launch')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'launch'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <Play className="w-4 h-4 text-zinc-300" />
              <span>Запуск та Режим</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <Volume2 className="w-4 h-4 text-zinc-300" />
              <span>Аудіо та Пристрої</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <Cpu className="w-4 h-4 text-zinc-300" />
              <span>ШІ-Модель та Промпт</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('resume')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'resume'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <FileText className="w-4 h-4 text-zinc-300" />
              <span>Моє Резюме (CV) та Стек</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stealth')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'stealth'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              <Shield className="w-4 h-4 text-zinc-300" />
              <span>Маскування та Хоткеї</span>
            </button>
          </nav>
        </div>

        {/* Footer: User profile & Window Environment Info */}
        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
          {envInfo && (
            <div className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-[10px] font-mono text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>ОС / WM:</span>
                <span className="text-zinc-200 font-semibold uppercase">{envInfo.platform}</span>
              </div>
              {envInfo.hyprland && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>Hyprland Rules:</span>
                  <span>Active (No-Blur)</span>
                </div>
              )}
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-medium text-zinc-200 truncate font-mono">
                {user?.email || 'Автономний режим'}
              </p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                {user?.plan || 'PRO'} PLAN
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Вийти з облікового запису"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MAIN CONTENT AREA (Monochrome, High-Density Controls)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#09090b] p-6 sm:p-8">
        {/* Error notification banner if launch was blocked */}
        {launchError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{launchError}</span>
            </div>
            <button
              type="button"
              onClick={() => setLaunchError(null)}
              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] cursor-pointer"
            >
              Закрити
            </button>
          </div>
        )}

        {/* ── TAB 1: ЗАПУСК ТА РЕЖИМ ВІДОБРАЖЕННЯ ── */}
        {activeTab === 'launch' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Готовність до співбесіди</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Оберіть формат відображення суфлера та натисніть «Почати інтерв&apos;ю». Окно Копайлота
                відкриється окремо від Офісу.
              </p>
            </div>

            {/* Quick Readiness Status Bar with Clickable Jumps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('audio')}
                className="p-3.5 rounded-xl bg-[#111113] border border-zinc-800/80 text-left hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Аудіо-канали</p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {devices.length > 0 ? `${devices.length} пристроїв` : 'Готово (Dual)'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('resume')}
                className="p-3.5 rounded-xl bg-[#111113] border border-zinc-800/80 text-left hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Резюме та Стек</p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[120px]">
                      {profile.role || 'Senior Developer'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stealth')}
                className="p-3.5 rounded-xl bg-[#111113] border border-zinc-800/80 text-left hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">Маскування HUD</p>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {settings.stealth ? 'Screen Stealth ON' : 'Звичайний'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            {/* Interactive Mode Picker Cards */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                  Формат роботи Копайлота
                </span>
                <button
                  type="button"
                  onClick={handleTestPreview}
                  className="text-xs text-zinc-300 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Протестувати вигляд</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mode Card 1: Two Column Chat */}
                <div
                  onClick={() => updateSettings({ copilotMode: 'chat' })}
                  className={`p-5 rounded-2xl bg-[#111113] border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    settings.copilotMode === 'chat'
                      ? 'border-white ring-1 ring-white/20 shadow-xl'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Режим ШІ-Чату (Дві колонки)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          За замовчуванням
                        </span>
                      </div>
                      {settings.copilotMode === 'chat' && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Ліворуч — виключно мова інтерв&apos;юера у реальному часі. Праворуч — миттєва по-токенна
                      відповідь ШІ з кодом та ручним полем вводу внизу.
                    </p>
                  </div>

                  {/* Animated Monitor Preview (Chat) */}
                  <div className="h-32 rounded-xl bg-black border border-zinc-800 p-2.5 flex flex-col justify-between font-mono text-[10px] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-1 text-zinc-500 text-[9px]">
                      <span>780 × 460 • Двоколонковий HUD</span>
                      <span>16мс render</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 flex-1 pt-1.5 overflow-hidden">
                      {/* Left: Interlocutor only */}
                      <div className="bg-zinc-950 p-1.5 rounded border border-zinc-900/80 flex flex-col justify-between">
                        <div>
                          <span className="text-zinc-500 font-bold block mb-1">ІНТЕРВ&apos;ЮЕР:</span>
                          <p className="text-zinc-300 text-[9.5px] leading-tight">
                            {previewStep >= 1
                              ? 'Як PostgreSQL обробляє блокування рядків у транзакціях?'
                              : 'Розкажіть про архітектуру вашого останнього проекту...'}
                          </p>
                        </div>
                        <span className="text-zinc-600 text-[8px]">Мова кандидата прихована</span>
                      </div>

                      {/* Right: AI Streaming */}
                      <div className="bg-zinc-950 p-1.5 rounded border border-zinc-900/80 flex flex-col justify-between">
                        <div>
                          <span className="text-white font-bold block mb-1">ВІДПОВІДЬ ШІ:</span>
                          <p className="text-zinc-200 text-[9.5px] leading-tight">
                            {previewStep >= 2 ? (
                              <span>
                                MVCC через snapshot isolation без блокування readers...
                                {previewStep >= 3 && (
                                  <span className="block mt-1 text-zinc-400 text-[8px]">
                                    `SELECT ... FOR UPDATE`
                                  </span>
                                )}
                              </span>
                            ) : (
                              'Миттєвий стрімінг токенів (300мс)...'
                            )}
                          </p>
                        </div>
                        <span className="text-emerald-400 text-[8px]">Стрімінг активний</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode Card 2: Eyeline Top Bar Notch */}
                <div
                  onClick={() => updateSettings({ copilotMode: 'top_bar' })}
                  className={`p-5 rounded-2xl bg-[#111113] border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                    settings.copilotMode === 'top_bar'
                      ? 'border-white ring-1 ring-white/20 shadow-xl'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">Верхній Суфлер (Eyeline Notch)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Під камерою
                        </span>
                      </div>
                      {settings.copilotMode === 'top_bar' && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Ультракомпактна темна смуга біля верхньої межі монітора прямо під веб-камерою. Погляд не
                      відривається від очей співрозмовника.
                    </p>
                  </div>

                  {/* Animated Monitor Preview (TopBar) */}
                  <div className="h-32 rounded-xl bg-black border border-zinc-800 p-2.5 flex flex-col justify-start space-y-2 font-mono text-[10px] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-1 text-zinc-500 text-[9px]">
                      <span>680 × 150 • Верхня панель-суфлер</span>
                      <span>Webcam Eyeline</span>
                    </div>
                    {/* Simulated Notch on top edge */}
                    <div className="w-full bg-zinc-950 p-2 rounded-lg border border-zinc-800/80 shadow-md">
                      <div className="flex items-center justify-between text-[8px] text-zinc-500 pb-0.5">
                        <span className="truncate max-w-[200px]">
                          {previewStep >= 1
                            ? 'Співрозмовник: Як PostgreSQL обробляє блокування?'
                            : 'Співрозмовник: [пряма мова...]'}
                        </span>
                        <span className="text-zinc-400">Ctrl+Shift+H</span>
                      </div>
                      <p className="text-white text-[11px] font-medium leading-snug truncate">
                        {previewStep >= 2
                          ? 'MVCC реалізує snapshot isolation через xmin/xmax версії без блокувань читання.'
                          : 'Відповідь ШІ з’являється по одному слову без очікування...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Big White Button (Guaranteed Action) */}
            <div className="pt-4">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLaunching}
                onClick={() => handleLaunch()}
                className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm tracking-wide shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLaunching ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-zinc-950" />
                ) : (
                  <Play className="w-5 h-5 fill-zinc-950 text-zinc-950" />
                )}
                <span>
                  {isLaunching
                    ? 'Запуск Копайлота...'
                    : `Почати інтерв'ю (${settings.copilotMode === 'chat' ? 'ШІ-Чат' : 'Верхній Суфлер'})`}
                </span>
                <kbd className="ml-2 px-2 py-0.5 rounded bg-zinc-900 text-zinc-100 border border-zinc-700 text-xs font-mono font-normal">
                  Ctrl+Enter
                </kbd>
              </motion.button>
              <p className="text-[11px] text-zinc-500 text-center font-mono mt-2">
                Окно Копайлота відкриється в окремому прозорому вікні з авто-налаштуванням Hyprland / Wayland.
              </p>
            </div>
          </div>
        )}

        {/* ── TAB 2: АУДІО ТА ПРИСТРОЇ ── */}
        {activeTab === 'audio' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Аудіо та Пристрої</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Налаштуйте пристрої запису співрозмовника (PipeWire / PulseAudio loopback) та вашого
                  мікрофона.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshAudioDevices}
                disabled={isRefreshingDevices}
                className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDevices ? 'animate-spin' : ''}`} />
                <span>Оновити список</span>
              </button>
            </div>

            {/* Device selection cards */}
            <div className="space-y-4">
              {/* Loopback / Interlocutor Device */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-zinc-400" />
                    <span>Звук співрозмовника (Системний Loopback / Monitor)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    Interlocutor Audio
                  </span>
                </div>
                <select
                  value={settings.loopbackDevice || ''}
                  onChange={(e) => updateSettings({ loopbackDevice: e.target.value || null })}
                  className="w-full px-3 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-500 font-mono"
                >
                  <option value="">Авто-визначення (PipeWire / PulseAudio Monitor Sink)</option>
                  {devices.map((d, i) => (
                    <option key={i} value={d.name}>
                      {d.name} {d.isLoopbackCapable ? '★ [Monitor/Loopback]' : ''}{' '}
                      {d.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400">
                  Захоплює звук із Google Meet, Zoom, Telegram або вкладки браузера без виведення на екран.
                </p>
              </div>

              {/* Microphone / Candidate Device */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-zinc-400" />
                    <span>Ваш мікрофон (Кандидат)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    Candidate Mic
                  </span>
                </div>
                <select
                  value={settings.micDevice || ''}
                  onChange={(e) => updateSettings({ micDevice: e.target.value || null })}
                  className="w-full px-3 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-500 font-mono"
                >
                  <option value="">Системний мікрофон за замовчуванням</option>
                  {devices
                    .filter((d) => !d.isLoopbackCapable)
                    .map((d, i) => (
                      <option key={i} value={d.name}>
                        {d.name} {d.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-zinc-400">
                  Використовується для детекції пауз та відсікання власної мови від запитів до ШІ.
                </p>
              </div>

              {/* Channel Separation Toggle */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Розділення аудіо-каналів</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Ізолювати голос інтерв&apos;юера від власного мікрофона для запобігання хибних відповідей ШІ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ splitChannels: !settings.splitChannels })}
                  className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    settings.splitChannels ? 'bg-white justify-end' : 'bg-zinc-800 justify-start'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full ${
                      settings.splitChannels ? 'bg-zinc-950' : 'bg-zinc-400'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Test with VU Meter */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-200">Перевірка звукового сигналу</span>
                  <button
                    type="button"
                    onClick={() => setIsTestingSound((prev) => !prev)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer border ${
                      isTestingSound
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                    }`}
                  >
                    {isTestingSound ? 'Зупинити тест' : 'Перевірити звук'}
                  </button>
                </div>

                {/* VU Meter Bars */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>Рівень вхідного сигналу (VU):</span>
                    <span>{soundTestLevel}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-[1px]">
                    <div
                      className="h-full bg-white transition-all duration-75 rounded-full"
                      style={{ width: `${soundTestLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: ШІ-МОДЕЛЬ ТА ПРОМПТ ── */}
        {activeTab === 'ai' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">ШІ-Модель та Промпт</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Керуйте швидкістю реакції, глибиною відповідей та мовою суфлера під час співбесіди.
              </p>
            </div>

            <div className="space-y-4">
              {/* Speed & Depth */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-3">
                <label className="text-xs font-semibold text-zinc-200 block">
                  Швидкість та глибина мислення
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateSettings({ answerSpeed: 'fast' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.answerSpeed === 'fast'
                        ? 'bg-zinc-800 border-white text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Fast Flash (Суб-300мс)</span>
                      {settings.answerSpeed === 'fast' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Миттєвий по-токенний старт. Ідеально для швидких питань та бліцу.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateSettings({ answerSpeed: 'deep' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.answerSpeed === 'deep'
                        ? 'bg-zinc-800 border-white text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Deep Reasoning</span>
                      {settings.answerSpeed === 'deep' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Глибокий аналіз архітектури, трейдофів, консистентності та крайових випадків.
                    </p>
                  </button>
                </div>
              </div>

              {/* Answer Length */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-3">
                <label className="text-xs font-semibold text-zinc-200 block">Довжина відповіді</label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'short', label: 'Коротко', desc: '1-2 влучні тези' },
                      { id: 'detailed', label: 'Детально', desc: 'Повна аргументація' },
                      { id: 'code', label: 'З кодом', desc: 'Приклад реалізації' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateSettings({ answerLength: item.id })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        settings.answerLength === item.id
                          ? 'bg-zinc-800 border-white text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{item.label}</span>
                        {settings.answerLength === item.id && <Check className="w-3 h-3" />}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language selection */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-3">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-zinc-400" />
                  <span>Мова відповідей суфлера</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'auto', label: 'Авто (EN / UA)' },
                      { id: 'uk', label: 'Українська' },
                      { id: 'en', label: 'English' },
                      { id: 'ru', label: 'Русский' },
                    ] as const
                  ).map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => updateSettings({ hintLanguage: lang.id })}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        settings.hintLanguage === lang.id
                          ? 'bg-zinc-800 border-white text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2">
                <label className="text-xs font-semibold text-zinc-200 block">
                  Кастомні інструкції для ШІ
                </label>
                <textarea
                  rows={3}
                  value={settings.customInstructions}
                  onChange={(e) => updateSettings({ customInstructions: e.target.value })}
                  placeholder="Наприклад: Акцентуй на системному дизайні, завжди вказуй p99 latency та захист від збоїв..."
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 leading-relaxed font-sans"
                />
                <p className="text-[11px] text-zinc-400">
                  Ці інструкції передаватимуться у кожен запит суфлера непомітно для інтерв&apos;юера.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: МОЄ РЕЗЮМЕ ТА СТЕК ── */}
        {activeTab === 'resume' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Моє Резюме (CV) та Стек</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Налаштуйте роль та технічний контекст, щоб ШІ відповідав від імені вашого грейду.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncProfile}
                disabled={isSyncingProfile}
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSyncingProfile ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{isSyncingProfile ? 'Синхронізація...' : 'Синхронізувати з сайтом'}</span>
              </button>
            </div>

            {profileSyncSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Профіль успішно синхронізовано з базою Ghostboard!</span>
              </div>
            )}
            {profileSyncError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{profileSyncError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Role & Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2">
                  <label className="text-xs font-semibold text-zinc-200 block">Посада / Спеціалізація</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => handleUpdateProfile({ role: e.target.value })}
                    placeholder="Senior Fullstack Engineer"
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2">
                  <label className="text-xs font-semibold text-zinc-200 block">Грейд (Seniority)</label>
                  <select
                    value={profile.experienceLevel}
                    onChange={(e) =>
                      handleUpdateProfile({ experienceLevel: e.target.value as CandidateLevel })
                    }
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-500 font-mono"
                  >
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.label} ({lvl.badge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tech Stack Pills */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-3">
                <label className="text-xs font-semibold text-zinc-200 block">Технологічний стек</label>
                <div className="flex flex-wrap gap-2">
                  {profile.techStack.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-200"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Додати технологію (напр. Redis, Celery, Docker)..."
                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium cursor-pointer"
                  >
                    Додати
                  </button>
                </div>
              </div>

              {/* CV Bio / Highlights */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2">
                <label className="text-xs font-semibold text-zinc-200 block">
                  Текст резюме / Ключовий досвід
                </label>
                <textarea
                  rows={6}
                  value={profile.customBio}
                  onChange={(e) => handleUpdateProfile({ customBio: e.target.value })}
                  placeholder="Вставте сюди текст резюме або ключові досягнення..."
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: МАСКУВАННЯ, ВІКНО ТА ХОТКЕЇ ── */}
        {activeTab === 'stealth' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Маскування, Вікно та Хоткеї</h1>
              <p className="text-xs text-zinc-400 mt-1">
                Керуйте прозорістю, розміром шрифту суфлера та захистом від демонстрації екрана.
              </p>
            </div>

            <div className="space-y-4">
              {/* Opacity Slider */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-200">
                    Прозорість вікна HUD (Opacity)
                  </label>
                  <span className="text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                    {Math.round(settings.hudOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={OPACITY_RANGE.min}
                  max={OPACITY_RANGE.max}
                  step={0.05}
                  value={settings.hudOpacity}
                  onChange={(e) => updateSettings({ hudOpacity: parseFloat(e.target.value) })}
                  className="w-full accent-white cursor-pointer"
                />
                <p className="text-[11px] text-zinc-400">
                  Дозволяє бачити вікно відеодзвінка крізь текст суфлера.
                </p>
              </div>

              {/* Font Size A- / A+ */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Розмір шрифту суфлера</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Поточний розмір: {settings.hudFontSize}px (діапазон {FONT_RANGE.min}–{FONT_RANGE.max}px)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        hudFontSize: Math.max(FONT_RANGE.min, settings.hudFontSize - 2),
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-bold text-zinc-200 cursor-pointer border border-zinc-800"
                  >
                    A -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        hudFontSize: Math.min(FONT_RANGE.max, settings.hudFontSize + 2),
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono font-bold text-zinc-200 cursor-pointer border border-zinc-800"
                  >
                    A +
                  </button>
                </div>
              </div>

              {/* Screen Share Stealth Toggle */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-200">Screen Share Stealth</p>
                    <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-700">
                      Апаратний
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Приховує вікно HUD під час демонстрації екрана у Google Meet, Zoom, Teams, Discord та OBS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ stealth: !settings.stealth })}
                  className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    settings.stealth ? 'bg-white justify-end' : 'bg-zinc-800 justify-start'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full ${
                      settings.stealth ? 'bg-zinc-950' : 'bg-zinc-400'
                    }`}
                  />
                </button>
              </div>

              {/* Click-Through Mode Toggle */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Режим наскрізного кліку (Click-Through)</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Кліки мишею проходять крізь прозорі зони HUD на вікна під ним (вимикається Ctrl+Shift+X).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ clickThrough: !settings.clickThrough })}
                  className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer flex items-center ${
                    settings.clickThrough ? 'bg-white justify-end' : 'bg-zinc-800 justify-start'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full ${
                      settings.clickThrough ? 'bg-zinc-950' : 'bg-zinc-400'
                    }`}
                  />
                </button>
              </div>

              {/* Hotkeys Table */}
              <div className="p-4 rounded-2xl bg-[#111113] border border-zinc-800/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-200">Гарячі клавіші суфлера</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between">
                    <span className="text-zinc-400">Почати / Ручна відповідь:</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Ctrl + Enter
                    </kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between">
                    <span className="text-zinc-400">Пауза суфлера (Freeze):</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Space
                    </kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between">
                    <span className="text-zinc-400">Панічний щит (Hide):</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      F12 / Ctrl+Shift+H
                    </kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between">
                    <span className="text-zinc-400">Наскрізний клік:</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Ctrl + Shift + X
                    </kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between">
                    <span className="text-zinc-400">Знімок екрана (OCR):</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Ctrl + Shift + S
                    </kbd>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-between">
                    <span className="text-zinc-400">Перемикання Чат / Суфлер:</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Ctrl + M
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
