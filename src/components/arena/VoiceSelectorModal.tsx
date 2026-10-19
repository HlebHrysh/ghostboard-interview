'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Key,
  Play,
  Square,
  Mic,
} from 'lucide-react';
import { ARENA_VOICES, ArenaVoice, VOICE_SAMPLE_TEXTS } from '@/lib/arenaVoices';
import { useLocale } from '@/contexts/LocaleContext';
import { toast } from 'sonner';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceId: string;
  onSelectVoice: (voice: ArenaVoice) => void;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedVoiceId,
  onSelectVoice,
}) => {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<'deepgram' | 'elevenlabs'>('deepgram');
  const [elevenKey, setElevenKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ghostboard_elevenlabs_key') || '';
    }
    return '';
  });
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const saveElevenKey = (val: string) => {
    setElevenKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ghostboard_elevenlabs_key', val.trim());
    }
  };

  const stopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current = null;
    }
    setPlayingVoiceId(null);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    return () => stopPreview();
  }, [isOpen]);

  if (!isOpen) return null;

  const playVoiceSample = (voice: ArenaVoice) => {
    if (playingVoiceId === voice.id) {
      stopPreview();
      return;
    }

    stopPreview();
    setPlayingVoiceId(voice.id);

    const sampleText = VOICE_SAMPLE_TEXTS[locale] || VOICE_SAMPLE_TEXTS['en'];
    const url = new URL('/api/audio/tts', window.location.origin);
    url.searchParams.set('text', sampleText);
    url.searchParams.set('voice', voice.id);
    url.searchParams.set('provider', voice.provider);
    url.searchParams.set('lang', locale === 'ua' ? 'uk' : locale);
    if (voice.provider === 'elevenlabs' && elevenKey.trim()) {
      url.searchParams.set('elevenlabsApiKey', elevenKey.trim());
    }

    const audio = new Audio(url.toString());
    audioPreviewRef.current = audio;

    audio.onended = () => {
      setPlayingVoiceId(null);
      audioPreviewRef.current = null;
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
      audioPreviewRef.current = null;
      toast.error('Не вдалося завантажити аудіо-сэмпл голосу.');
    };

    audio.play().catch(() => {
      setPlayingVoiceId(null);
      audioPreviewRef.current = null;
    });
  };

  const filteredVoices = ARENA_VOICES.filter((v) => v.provider === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Голос та Персона Інтервʼюера</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                  Neural TTS
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Виберіть тембр та характер вашого співрозмовника на арені
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Tabs */}
        <div className="flex items-center gap-2 p-4 pb-0 border-b border-white/5 bg-zinc-900/40">
          <button
            onClick={() => {
              stopPreview();
              setActiveTab('deepgram');
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'deepgram'
                ? 'bg-zinc-950 border-white/15 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span>Deepgram Aura (Вбудовано • Студійний sub-200ms)</span>
          </button>

          <button
            onClick={() => {
              stopPreview();
              setActiveTab('elevenlabs');
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
              activeTab === 'elevenlabs'
                ? 'bg-zinc-950 border-white/15 text-white shadow-sm'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>🎙️ ElevenLabs Multilingual</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* ElevenLabs API Key banner if active */}
          {activeTab === 'elevenlabs' && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 text-xs">
              <div className="flex items-center gap-2 font-mono text-zinc-300 font-bold mb-2">
                <Key className="w-3.5 h-3.5 text-white" />
                <span>Опціональний ElevenLabs API Ключ:</span>
              </div>
              <input
                type="password"
                value={elevenKey}
                onChange={(e) => saveElevenKey(e.target.value)}
                placeholder="xi-... (залиште порожнім, якщо налаштовано на сервері)"
                className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-white/50"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Ключ зберігається лише у вашому браузері для генерації озвучки через ElevenLabs API.
              </p>
            </div>
          )}

          {/* Voice Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPlaying = playingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => onSelectVoice(voice)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                    isSelected
                      ? 'bg-zinc-900 border-white shadow-[0_0_25px_rgba(255,255,255,0.12)]'
                      : 'bg-zinc-950/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1.5 rounded-xl bg-white/5 border border-white/5">
                          {voice.avatar}
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{voice.name}</span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">
                            {voice.title}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/5">
                        {voice.tag}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
                      💡 Рекомендовано для: <span className="text-zinc-200">{voice.recommendedFor}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {voice.accent}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playVoiceSample(voice);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isPlaying
                          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse'
                          : 'bg-white/5 hover:bg-white/15 text-zinc-300 border-white/10'
                      }`}
                      title="Прослухати тестове аудіо"
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-black text-black" />
                          <span>Стоп</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-white text-white" />
                          <span>Сэмпл</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-zinc-900/40">
          <span className="text-[11px] font-mono text-zinc-400">
            Вибрано: <strong className="text-white">{ARENA_VOICES.find((v) => v.id === selectedVoiceId)?.name || 'Asteria'}</strong>
          </span>

          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="py-2.5 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
