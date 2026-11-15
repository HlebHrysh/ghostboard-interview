import React, { useCallback, useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Crosshair,
  GitMerge,
  Mic,
  Play,
  RefreshCw,
  ShieldAlert,
  Square,
} from 'lucide-react';
import {
  LISTEN_MODE_ORDER,
  startListening,
  stopListening,
  useAudioStatus,
} from '../lib/audioSession';
import type { DesktopSettings, ListenMode } from '../lib/desktopSettings';
import { listAudioDevices, type AudioDevice } from '../lib/tauriBridge';
import { SectionTitle, SPRING, stopDrag } from '../ui/primitives';
import { STUDIO_VIDEO_CLIPS, VideoPreviewCapsule } from '../ui/VideoPreviewCapsule';
import { VuBars, VuTrack } from '../ui/VuMeter';

interface AudioStudioTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

const MODE_CARD_INFO: Record<
  ListenMode,
  {
    title: string;
    subtitle: string;
    recommended?: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  interviewer: {
    title: "Тільки Інтерв'юер",
    subtitle: 'System Loopback — мікрофон фізично вимкнено, чує лише голос співрозмовника.',
    recommended: true,
    icon: Crosshair,
  },
  dual: {
    title: '2 Канали (Loopback + Mic)',
    subtitle: "Інтерв'юер запускає ШІ, ваш голос записується в історію контексту.",
    icon: GitMerge,
  },
  mic: {
    title: 'Тільки Мікрофон',
    subtitle: 'Режим для динаміків без навушників або живих зустрічей.',
    icon: Mic,
  },
};

export const AudioStudioTab: React.FC<AudioStudioTabProps> = ({
  settings,
  updateSettings,
}) => {
  const loopbackSelectId = useId();
  const micSelectId = useId();

  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestCapturing, setIsTestCapturing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const audioStatus = useAudioStatus();

  // Manual / initial device scan ONLY — zero 2-second polling spam
  const refreshDevices = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const list = await listAudioDevices();
      setDevices(list);
    } catch (err) {
      console.warn('[AudioStudio] listAudioDevices error:', err);
      setRefreshError('Не вдалося отримати перелік аудіопристроїв');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const loopbackDevices = devices.filter(
    (d) =>
      d.isLoopbackCapable ||
      d.name.toLowerCase().includes('monitor') ||
      d.name.toLowerCase().includes('loopback')
  );
  const micDevices = devices.filter(
    (d) => !d.isLoopbackCapable || d.name.toLowerCase().includes('mic')
  );

  const handleModeChange = async (mode: ListenMode) => {
    updateSettings({ listenMode: mode });
    if (isTestCapturing) {
      await startListening(settings, mode);
    }
  };

  const toggleTestCapture = async () => {
    if (isTestCapturing) {
      await stopListening();
      setIsTestCapturing(false);
    } else {
      await startListening(settings);
      setIsTestCapturing(true);
    }
  };

  useEffect(() => {
    return () => {
      if (isTestCapturing) {
        void stopListening();
      }
    };
  }, [isTestCapturing]);

  const activeVuChannel = settings.listenMode === 'mic' ? 'candidate' : 'interviewer';
  const isCapturingNow = Boolean(audioStatus?.ok || isTestCapturing);

  return (
    <div className="space-y-5 pb-4">
      <SectionTitle
        title="Аудіо та ізоляція каналів"
        right={
          <button
            type="button"
            onClick={() => void refreshDevices()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#111114] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Оновити пристрої
          </button>
        }
      />

      {/* 3-Position Strict Channel Isolation Switcher */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LISTEN_MODE_ORDER.map((mode) => {
          const info = MODE_CARD_INFO[mode];
          const Icon = info.icon;
          const active = settings.listenMode === mode;

          return (
            <motion.button
              key={mode}
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING}
              onClick={() => void handleModeChange(mode)}
              className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer space-y-2 ${
                active
                  ? 'border-emerald-500/45 bg-[#15171c] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.22)]'
                  : 'border-white/[0.08] bg-[#111114] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border ${
                    active
                      ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-[#09090b] text-zinc-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {info.recommended && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-medium text-emerald-300">
                    Рекомендовано
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-white">{info.title}</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  {info.subtitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Physical Hardware Isolation Note */}
      <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-[#111114] px-3.5 py-2.5 text-xs text-zinc-300">
        {settings.listenMode === 'interviewer' ? (
          <>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Ізоляція 100%:</strong> ваш голос та звуки клавіатури фізично не потрапляють у Deepgram. ШІ реагує виключно на мовлення інтерв’юера.
            </span>
          </>
        ) : (
          <>
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              <strong>Активний мікрофон:</strong> використовуйте гарнітуру або комбінацію{' '}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10.5px]">Ctrl+M</code> під час роздумів вголос.
            </span>
          </>
        )}
      </div>

      {/* Device Selectors + Soundcheck Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-white/[0.08] bg-[#111114] p-4 space-y-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="text-xs font-semibold text-white">Апаратні пристрої захоплення</div>

          {refreshError && <p className="text-[11px] text-amber-300">{refreshError}</p>}

          <div className="space-y-1.5">
            <label htmlFor={loopbackSelectId} className="block text-[11px] font-medium text-zinc-400">
              Системне джерело (PipeWire Monitor / WASAPI Loopback)
            </label>
            <select
              id={loopbackSelectId}
              value={settings.loopbackDevice || ''}
              onChange={(e) => updateSettings({ loopbackDevice: e.target.value || null })}
              disabled={settings.listenMode === 'mic'}
              className="gb-input h-9 text-xs disabled:opacity-45"
            >
              <option value="">Автоматичний системний вихід (Default Monitor)</option>
              {loopbackDevices.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={micSelectId} className="block text-[11px] font-medium text-zinc-400">
              Мікрофон (для Dual або Solo Mic режиму)
            </label>
            <select
              id={micSelectId}
              value={settings.micDevice || ''}
              onChange={(e) => updateSettings({ micDevice: e.target.value || null })}
              disabled={settings.listenMode === 'interviewer'}
              className="gb-input h-9 text-xs disabled:opacity-45"
            >
              <option value="">Системний мікрофон за замовчуванням</option>
              {micDevices.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Live rAF VU Soundcheck */}
          <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-200">Перевірка сигналу (60fps ref)</span>
                <VuBars channel={activeVuChannel} bars={8} />
              </div>

              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => void toggleTestCapture()}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isTestCapturing
                    ? 'border border-rose-500/35 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                    : 'bg-white text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                {isTestCapturing ? (
                  <>
                    <Square className="h-3 w-3 fill-current" />
                    Зупинити тест
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    Перевірити звук
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-400">
                <span>ІНТЕРВ’ЮЕР (LOOPBACK)</span>
                <span>{isCapturingNow && settings.listenMode !== 'mic' ? 'ACTIVE' : 'IDLE'}</span>
              </div>
              <VuTrack channel="interviewer" label="Рівень системного аудіо інтерв'юера" />
            </div>

            {settings.listenMode !== 'interviewer' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-400">
                  <span>МІКРОФОН (КАНДИДАТ)</span>
                  <span>{isCapturingNow ? 'ACTIVE' : 'IDLE'}</span>
                </div>
                <VuTrack channel="candidate" label="Рівень сигналу мікрофона" />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <VideoPreviewCapsule clip={STUDIO_VIDEO_CLIPS.headphones} />
          <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-3 text-[11px] leading-relaxed text-zinc-400">
            Підказка: у браузерному дзвінку або Zoom виводьте звук на навушники — Loopback зчитує потік прямо з аудіо-шини ОС без фонового шуму кімнати.
          </div>
        </div>
      </div>
    </div>
  );
};
