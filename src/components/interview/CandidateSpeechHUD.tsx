'use client';

import React, { useState } from 'react';
import { Mic, Shield, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { SupportedLocale } from '@/lib/geoLang';

export interface CandidateSpeechItem {
  id: string;
  text: string;
  timestamp: number;
}

export interface CandidateSpeechHUDProps {
  isCapturing: boolean;
  candidateLiveTranscript: string;
  candidateVolume: number;
  speechHistory: CandidateSpeechItem[];
  onClearHistory?: () => void;
}

const CANDIDATE_HUD_I18N: Record<SupportedLocale, {
  title: string;
  badge: string;
  shieldTooltip: string;
  liveLabel: string;
  idleText: string;
  recentHeading: string;
  clearBtn: string;
  minimize: string;
  expand: string;
  isolatedNotice: string;
}> = {
  ua: {
    title: 'Ваш мікрофон',
    badge: 'ШІ ігнорує',
    shieldTooltip: 'ШІ слухає тільки співрозмовника. Ваші слова не відправляються в Gemini.',
    liveLabel: 'Ви говорите:',
    idleText: 'Мікрофон підключено. Відповідайте спокійно — ШІ не відповідає на ваші слова.',
    recentHeading: 'Останні сказані фрази:',
    clearBtn: 'Очистити',
    minimize: 'Згорнути',
    expand: 'Історія вашої мови',
    isolatedNotice: 'Ізольований канал кандидата',
  },
  en: {
    title: 'Candidate Mic',
    badge: 'AI Ignores',
    shieldTooltip: 'AI only listens to the interviewer. Your words are never fed to Gemini.',
    liveLabel: 'You said:',
    idleText: 'Microphone active. Speak freely — AI does not answer your own speech.',
    recentHeading: 'Recent candidate phrases:',
    clearBtn: 'Clear',
    minimize: 'Minimize',
    expand: 'Candidate Speech Log',
    isolatedNotice: 'Isolated Candidate Channel',
  },
  pl: {
    title: 'Twój mikrofon',
    badge: 'AI ignoruje',
    shieldTooltip: 'AI słucha tylko rekrutera. Twoje słowa nie są przesyłane do Gemini.',
    liveLabel: 'Mówisz:',
    idleText: 'Mikrofon podłączony. Mów swobodnie — AI nie generuje odpowiedzi na Twój głos.',
    recentHeading: 'Ostatnie wypowiedzi:',
    clearBtn: 'Wyczyść',
    minimize: 'Zwiń',
    expand: 'Historia wypowiedzi',
    isolatedNotice: 'Izolowany kanał kandydata',
  },
  de: {
    title: 'Ihr Mikrofon',
    badge: 'KI ignoriert',
    shieldTooltip: 'Die KI hört nur dem Interviewer zu. Ihre Worte werden nicht an Gemini gesendet.',
    liveLabel: 'Sie sagen:',
    idleText: 'Mikrofon aktiv. Sprechen Sie frei — die KI antwortet nicht auf Ihre eigenen Worte.',
    recentHeading: 'Kürzliche Aussagen:',
    clearBtn: 'Löschen',
    minimize: 'Minimieren',
    expand: 'Verlauf',
    isolatedNotice: 'Isolierter Kandidatenkanal',
  },
  fr: {
    title: 'Votre micro',
    badge: 'IA ignore',
    shieldTooltip: "L'IA n'écoute que le recruteur. Vos propos ne sont jamais envoyés à Gemini.",
    liveLabel: 'Vous dites :',
    idleText: "Microphone connecté. Parlez librement — l'IA ne répond pas à vos propres paroles.",
    recentHeading: 'Phrases récentes :',
    clearBtn: 'Effacer',
    minimize: 'Réduire',
    expand: 'Historique',
    isolatedNotice: 'Canal candidat isolé',
  },
  es: {
    title: 'Tu micrófono',
    badge: 'IA ignora',
    shieldTooltip: 'La IA solo escucha al entrevistador. Tus palabras no se envían a Gemini.',
    liveLabel: 'Estás diciendo:',
    idleText: 'Micrófono activo. Habla con tranquilidad: la IA no genera respuestas a tu voz.',
    recentHeading: 'Frases recientes:',
    clearBtn: 'Limpiar',
    minimize: 'Minimizar',
    expand: 'Historial',
    isolatedNotice: 'Canal candidato aislado',
  },
  pt: {
    title: 'Seu microfone',
    badge: 'IA ignora',
    shieldTooltip: 'A IA ouve apenas o entrevistador. Suas palavras não são enviadas ao Gemini.',
    liveLabel: 'Você disse:',
    idleText: 'Microfone ativo. Fale livremente — a IA não responde à sua voz.',
    recentHeading: 'Frases recentes:',
    clearBtn: 'Limpar',
    minimize: 'Minimizar',
    expand: 'Histórico',
    isolatedNotice: 'Canal candidato isolado',
  },
  it: {
    title: 'Tuo microfono',
    badge: 'IA ignora',
    shieldTooltip: 'La IA ascolta solo il selezionatore. Le tue parole non vengono inviate a Gemini.',
    liveLabel: 'Stai dicendo:',
    idleText: 'Microfono attivo. Parla tranquillamente — l’IA non risponde alla tua voce.',
    recentHeading: 'Frasi recenti:',
    clearBtn: 'Cancella',
    minimize: 'Riduci',
    expand: 'Cronologia',
    isolatedNotice: 'Canale candidato isolato',
  },
  cs: {
    title: 'Váš mikrofon',
    badge: 'AI ignoruje',
    shieldTooltip: 'AI poslouchá pouze tazatele. Vaše slova se neposílají do Gemini.',
    liveLabel: 'Říkáte:',
    idleText: 'Mikrofon aktivní. Mluvte klidně — AI nereaguje na vaše slova.',
    recentHeading: 'Poslední fráze:',
    clearBtn: 'Vymazat',
    minimize: 'Minimalizovat',
    expand: 'Historie',
    isolatedNotice: 'Izolovaný kanál kandidáta',
  },
  nl: {
    title: 'Uw microfoon',
    badge: 'AI negeert',
    shieldTooltip: 'AI luistert alleen naar de interviewer. Uw woorden worden niet naar Gemini gestuurd.',
    liveLabel: 'U zegt:',
    idleText: 'Microfoon actief. Spreek gerust — AI reageert niet op uw eigen stem.',
    recentHeading: 'Recente uitspraken:',
    clearBtn: 'Wissen',
    minimize: 'Minimaliseren',
    expand: 'Geschiedenis',
    isolatedNotice: 'Geïsoleerd kandidaatkanaal',
  },
};

export const CandidateSpeechHUD: React.FC<CandidateSpeechHUDProps> = ({
  isCapturing,
  candidateLiveTranscript,
  candidateVolume,
  speechHistory,
  onClearHistory,
}) => {
  const { locale } = useLocale();
  const txt = CANDIDATE_HUD_I18N[locale] || CANDIDATE_HUD_I18N.en;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!isCapturing) return null;

  const isSpeaking = candidateVolume > 8 || !!candidateLiveTranscript;
  const normalizedVol = Math.min(100, Math.max(0, candidateVolume));

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed top-14 right-4 z-40 animate-in fade-in duration-200 select-none">
      {/* ── Discreet Pill Mode (Default: Compact & Non-distracting) ── */}
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0D0D10]/90 border border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white shadow-[0_8px_25px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all cursor-pointer group"
          title={txt.expand}
        >
          <span className="relative flex h-2 w-2">
            {isSpeaking && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2 w-2 transition-colors ${
                isSpeaking ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-zinc-600'
              }`}
            />
          </span>

          <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-white' : 'text-zinc-500'}`} />

          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200">
            {txt.title}
          </span>

          {candidateLiveTranscript ? (
            <span className="font-sans text-[11px] text-zinc-200 max-w-[120px] truncate italic">
              «{candidateLiveTranscript}»
            </span>
          ) : (
            <span className="text-[9px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.04]">
              {txt.badge}
            </span>
          )}

          <ChevronDown className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
        </button>
      ) : (
        /* ── Slide-down Drawer when explicitly opened ── */
        <div className="w-[320px] rounded-2xl bg-[#0D0D10]/95 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.8)] p-3.5 backdrop-blur-2xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-xs font-mono">
            <div className="flex items-center gap-2">
              <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-white' : 'text-zinc-500'}`} />
              <span className="font-bold text-white uppercase text-[11px]">{txt.title}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-zinc-400 font-mono">
                {txt.badge}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2.5">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
              {txt.liveLabel}
            </span>
            <p className="text-xs text-zinc-200 font-sans leading-relaxed italic bg-white/[0.02] p-2 rounded-lg border border-white/[0.04] min-h-[36px]">
              {candidateLiveTranscript ? `«${candidateLiveTranscript}»` : txt.idleText}
            </p>
          </div>

          {speechHistory.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{txt.recentHeading}</span>
                {onClearHistory && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{txt.clearBtn}</span>
                  </button>
                )}
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-sans text-xs">
                {speechHistory.map((item) => (
                  <div key={item.id} className="p-1.5 rounded bg-white/[0.02] text-zinc-300 flex items-start justify-between gap-2">
                    <span className="leading-snug">{item.text}</span>
                    <span className="text-[9px] font-mono text-zinc-600 shrink-0">{formatTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
