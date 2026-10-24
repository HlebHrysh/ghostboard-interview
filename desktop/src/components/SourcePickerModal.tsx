import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  AppWindow,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Radio,
  Video,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { DesktopMediaSource } from '../types/tauri';

export interface SourcePickerModalProps {
  isOpen: boolean;
  activeSourceId: string | null;
  onSelect: (source: DesktopMediaSource) => void;
  onCancel: () => void;
}

type SourceCategory = 'all' | 'meetings' | 'windows' | 'screens';

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

const MEETING_REGEX = /meet|zoom|teams|slack|discord|huddle|webex|skype|conference|call/i;

export const SourcePickerModal: React.FC<SourcePickerModalProps> = ({
  isOpen,
  activeSourceId,
  onSelect,
  onCancel,
}) => {
  const [sources, setSources] = useState<DesktopMediaSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(activeSourceId);
  const [category, setCategory] = useState<SourceCategory>('all');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch desktop sources from Electron main process via ContextBridge
  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    setPermissionError(null);
    try {
      const api = window.ghostboard || window.desktopAPI;
      if (!api?.getSources) {
        throw new Error('Ghostboard IPC ContextBridge unavailable');
      }

      const list = await api.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true,
      });

      if (Array.isArray(list)) {
        setSources(list);
        if (list.length === 0) {
          const perms = await api.checkPermissions?.();
          if (perms?.platform === 'darwin' && perms.screen !== 'granted') {
            setPermissionError('Доступ до запису екрана не надано в системних налаштуваннях macOS.');
          }
        }
      }
    } catch (err: unknown) {
      console.error('[SourcePickerModal] Error fetching sources:', err);
      setPermissionError(err instanceof Error ? err.message : 'Не вдалося отримати список вікон');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedId(activeSourceId);
      setSearchQuery('');
      fetchSources();
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [isOpen, activeSourceId, fetchSources]);

  // Global hotkeys: [Esc] to cancel, [Enter] to select, [Cmd/Ctrl+K] to search
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter' && selectedId) {
        const found = sources.find((s) => s.id === selectedId);
        if (found) {
          e.preventDefault();
          onSelect(found);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedId, sources, onSelect, onCancel]);

  // Categorize and filter sources
  const filteredSources = useMemo(() => {
    return sources.filter((src) => {
      const isScreen = src.id.startsWith('screen:');
      const isMeeting = MEETING_REGEX.test(src.name);

      if (category === 'screens' && !isScreen) return false;
      if (category === 'windows' && isScreen) return false;
      if (category === 'meetings' && !isMeeting) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return src.name.toLowerCase().includes(q) || src.id.toLowerCase().includes(q);
      }

      return true;
    });
  }, [sources, category, searchQuery]);

  // Count meeting sources for badge
  const meetingCount = useMemo(() => {
    return sources.filter((s) => MEETING_REGEX.test(s.name)).length;
  }, [sources]);

  const handleConfirm = () => {
    if (!selectedId) return;
    const found = sources.find((s) => s.id === selectedId);
    if (found) {
      onSelect(found);
    }
  };

  const handleOpenSettings = async () => {
    const api = window.ghostboard || window.desktopAPI;
    await api?.openSystemSettings?.('screen');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Surface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={SPRING_TRANSITION}
          className="relative w-full max-w-[780px] h-[560px] rounded-2xl glass-panel border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] bg-[#0d0f12]/95 flex flex-col overflow-hidden text-zinc-100 select-none z-10"
        >
          {/* Ambient Mesh Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 mesh-glow pointer-events-none" />

          {/* Modal Header */}
          <div className="w-full h-14 border-b border-white/[0.07] px-5 flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold tracking-tight text-white uppercase">
                  Оберіть вікно конференції
                </h2>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Ізольоване захоплення аудіо співрозмовника (Google Meet, Zoom, Teams)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchSources}
                disabled={isLoading}
                title="Оновити список вікон"
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onCancel}
                title="Закрити [Esc]"
                className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Controls: Search Bar & Categories */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3 bg-black/20 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук за назвою вікна... (Ctrl+K)"
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
              {(
                [
                  { id: 'all', label: 'Всі' },
                  { id: 'meetings', label: 'Конференції', count: meetingCount },
                  { id: 'windows', label: 'Вікна' },
                  { id: 'screens', label: 'Екрани' },
                ] as const
              ).map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                    category === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  {'count' in cat && cat.count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 text-[9px] flex items-center justify-center font-bold">
                      {cat.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sources Grid Container */}
          <div className="flex-1 overflow-y-auto p-5">
            {permissionError && (
              <div className="mb-4 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-rose-300 mb-1">Потрібен дозвіл системи</div>
                  <div className="text-zinc-400 mb-2">{permissionError}</div>
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Відкрити налаштування</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {isLoading && sources.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl bg-white/[0.02] border border-white/[0.05] p-3 animate-pulse flex flex-col justify-between"
                  >
                    <div className="w-full h-16 rounded bg-white/[0.04]" />
                    <div className="w-2/3 h-3 rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <div className="text-xs font-medium text-zinc-400 mb-1">Вікон не знайдено</div>
                <div className="text-[11px] font-mono text-zinc-600 max-w-xs">
                  {searchQuery ? `Немає вікон, що відповідають «${searchQuery}»` : 'Запустіть Google Meet або Zoom і оновіть список'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredSources.map((source) => {
                  const isSelected = selectedId === source.id;
                  const isScreen = source.id.startsWith('screen:');
                  const isMeeting = MEETING_REGEX.test(source.name);

                  return (
                    <motion.div
                      key={source.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedId(source.id)}
                      onDoubleClick={() => onSelect(source)}
                      className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/20 hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Thumbnail Preview */}
                      <div className="relative w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-white/5 mb-2 flex items-center justify-center">
                        {source.thumbnail ? (
                          <img
                            src={source.thumbnail}
                            alt={source.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-600">
                            {isScreen ? <Monitor className="w-8 h-8" /> : <AppWindow className="w-8 h-8" />}
                          </div>
                        )}

                        {/* Meeting Badge Overlay */}
                        {isMeeting && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-cyan-500/80 text-black uppercase tracking-wider backdrop-blur-md">
                            Конференція
                          </span>
                        )}

                        {/* Selected Indicator Checkmark */}
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Source Title & Identifier */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {source.appIcon ? (
                            <img src={source.appIcon} alt="" className="w-3.5 h-3.5 rounded shrink-0" />
                          ) : isScreen ? (
                            <Monitor className="w-3 h-3 text-cyan-400 shrink-0" />
                          ) : (
                            <AppWindow className="w-3 h-3 text-zinc-400 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {source.name || 'Без назви'}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500 truncate">
                          {source.id}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="w-full h-14 border-t border-white/[0.07] px-5 flex items-center justify-between shrink-0 bg-black/40">
            <div className="text-[11px] font-mono text-zinc-500">
              {selectedId ? (
                <span>
                  Обрано: <span className="text-zinc-300">{sources.find((s) => s.id === selectedId)?.name || selectedId}</span>
                </span>
              ) : (
                <span>Оберіть вікно для початку захоплення</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Скасувати [Esc]
              </button>
              <button
                type="button"
                disabled={!selectedId}
                onClick={handleConfirm}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono font-bold text-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                Підтвердити [Enter]
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
