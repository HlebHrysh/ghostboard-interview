import React, { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  Mic,
  RefreshCw,
  ShieldAlert,
  Headphones,
  Check,
  Radio,
  Sliders,
  Play,
  Square,
} from 'lucide-react';
import { Card, SectionTitle, Button, Pill, StatusDot, stopDrag } from '../ui/primitives';
import { VuTrack } from '../ui/VuMeter';
import {
  listAudioDevices,
  type AudioDevice,
} from '../lib/tauriBridge';
import {
  LISTEN_MODE_META,
  LISTEN_MODE_ORDER,
  startListening,
  stopListening,
  useAudioStatus,
} from '../lib/audioSession';
import type { DesktopSettings, ListenMode } from '../lib/desktopSettings';

interface AudioStudioTabProps {
  settings: DesktopSettings;
  updateSettings: (patch: Partial<DesktopSettings>) => void;
}

export const AudioStudioTab: React.FC<AudioStudioTabProps> = ({
  settings,
  updateSettings,
}) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTestCapturing, setIsTestCapturing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const audioStatus = useAudioStatus();

  const refreshDevices = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      const list = await listAudioDevices();
      setDevices(list);
    } catch (err) {
      console.warn('[AudioStudio] listAudioDevices error:', err);
      setRefreshError('Не вдалося отримати список пристроїв');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  const loopbackDevices = devices.filter(
    (d) => d.isLoopbackCapable || d.name.toLowerCase().includes('monitor') || d.name.toLowerCase().includes('loopback')
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

  return (
    <div className="space-y-6 pb-6 select-none">
      <SectionTitle
        eyebrow="АУДІОСТУДІЯ"
        title="Аудіо та Канали"
        hint="Сувора фізична ізоляція каналів: гарантія того, що ваш голос не викличе випадкову генерацію ШІ"
        right={
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshDevices}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Оновити пристрої</span>
          </Button>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          1. STRICT 3-WAY AUDIO ISOLATION SELECTOR
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Режим ізоляції джерел звуку
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {LISTEN_MODE_ORDER.map((mode) => {
            const isSelected = settings.listenMode === mode;
            const isInterviewer = mode === 'interviewer';
            const isDual = mode === 'dual';

            return (
              <div
                key={mode}
                data-tauri-drag-region="false"
                onMouseDown={stopDrag}
                onClick={() => handleModeChange(mode)}
                className={`relative rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-white bg-white/[0.06] ring-1 ring-white/20 shadow-md'
                    : 'border-white/[0.08] bg-[#111114] hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white">
                      {mode === 'interviewer' && "🎯 Тільки Інтерв'юер"}
                      {mode === 'dual' && '🔀 Роздільні канали'}
                      {mode === 'mic' && '🎙️ Тільки Мікрофон'}
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-white text-zinc-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    {mode === 'interviewer' && (
                      <>
                        <strong className="text-emerald-300">[Рекомендовано]</strong> Мікрофон фізично
                        вимкнений. Ваш голос ніколи не потрапить у розпізнавання ШІ.
                      </>
                    )}
                    {mode === 'dual' && (
                      <>
                        Системний звук — це <code>[Інтерв'юер]</code> (активує ШІ), а мікрофон — це{' '}
                        <code>[Ви]</code> (лише записується в чат).
                      </>
                    )}
                    {mode === 'mic' && (
                      <>
                        Один мікрофон кімнати для випадків, коли інтерв'ю йде через динаміки
                        ноутбука або для тесту звуку.
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>{mode === 'interviewer' ? 'Loopback only' : mode === 'dual' ? 'Dual Source' : 'Microphone only'}</span>
                  {isInterviewer && <span className="text-emerald-400 font-semibold">100% захист</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. HARDWARE DEVICE ROUTING
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Loopback Output Monitor */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Системний Loopback (Звук співрозмовника)</span>
            </label>
            {settings.listenMode === 'mic' && (
              <Pill tone="neutral" className="h-4 px-1 text-[9px]">ВИМКНЕНО</Pill>
            )}
          </div>

          <select
            className="gb-input font-mono text-xs cursor-pointer disabled:opacity-40"
            disabled={settings.listenMode === 'mic'}
            value={settings.loopbackDevice || ''}
            onChange={(e) => updateSettings({ loopbackDevice: e.target.value || null })}
          >
            <option value="">За замовчуванням (Default Loopback Monitor)</option>
            {loopbackDevices.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} {d.isDefault ? '(За замовчуванням)' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Перехоплює звук із навушників або динаміків. Працює з Zoom, Google Meet, Teams, Telegram.
          </p>
        </div>

        {/* Microphone Device */}
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-zinc-400" />
              <span>Мікрофон (Ваш голос)</span>
            </label>
            {settings.listenMode === 'interviewer' && (
              <Pill tone="ok" className="h-4 px-1 text-[9px]">ІЗОЛЬОВАНО (MUTED)</Pill>
            )}
          </div>

          <select
            className="gb-input font-mono text-xs cursor-pointer disabled:opacity-40"
            disabled={settings.listenMode === 'interviewer'}
            value={settings.micDevice || ''}
            onChange={(e) => updateSettings({ micDevice: e.target.value || null })}
          >
            <option value="">За замовчуванням (Default Microphone)</option>
            {micDevices.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} {d.isDefault ? '(За замовчуванням)' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            {settings.listenMode === 'interviewer'
              ? "Потік мікрофона апаратно вимкнений у режимі 'Тільки Інтерв'юер'."
              : 'Використовується для запису ваших реплік у діалог або в режимі одного мікрофона.'}
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. LIVE SOUNDCHECK (Zero-lag VU-Track, rAF + CSS variable)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-white/[0.08] bg-[#111114] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>🔊 Живий тест звуку</span>
              {isTestCapturing && <StatusDot tone="ok" ping />}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Перевірте рівні гучності в реальному часі без відкриття інтерв'ю-вікна
            </p>
          </div>

          <Button
            variant={isTestCapturing ? 'danger' : 'ghost'}
            size="sm"
            onClick={toggleTestCapture}
            className="flex items-center gap-1.5 cursor-pointer font-mono"
          >
            {isTestCapturing ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Зупинити тест</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Запустити тест</span>
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3 pt-1">
          {/* Interviewer VU Track */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300">Канал 1: Звук співрозмовника (Loopback)</span>
              <span className="text-zinc-500">
                {settings.listenMode === 'mic' ? 'Muted' : isTestCapturing ? 'Active' : 'Standby'}
              </span>
            </div>
            <VuTrack channel="interviewer" label="Interviewer sound level" />
          </div>

          {/* Candidate Mic VU Track */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-300">Канал 2: Ваш мікрофон (Candidate Mic)</span>
              <span className="text-zinc-500">
                {settings.listenMode === 'interviewer'
                  ? 'Muted (Safe)'
                  : isTestCapturing
                  ? 'Active'
                  : 'Standby'}
              </span>
            </div>
            <VuTrack channel="candidate" label="Candidate microphone level" />
          </div>
        </div>

        {audioStatus?.error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            Помилка аудіо: {audioStatus.error}
          </div>
        )}
      </div>
    </div>
  );
};
