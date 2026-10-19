import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Tablet,
  Copy,
  Check,
  ExternalLink,
  X,
  Wifi,
  Sparkles,
  RefreshCw,
  Eye,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  formatCompanionUrl,
  requestPairingSession,
  copyToClipboard,
  generateSessionId,
  generatePairingToken,
} from '../lib/companionSync';

export interface CompanionQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverBaseUrl?: string;
  authToken?: string | null;
  sessionId?: string;
  pairingToken?: string;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export const CompanionQRModal: React.FC<CompanionQRModalProps> = ({
  isOpen,
  onClose,
  serverBaseUrl = 'http://localhost:3001',
  authToken = null,
  sessionId: initialSessionId,
  pairingToken: initialPairingToken,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [companionUrl, setCompanionUrl] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string>(initialSessionId || '');
  const [currentToken, setCurrentToken] = useState<string>(initialPairingToken || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const initPairing = useCallback(async () => {
    setIsLoading(true);

    try {
      if (initialSessionId && initialPairingToken) {
        const url = formatCompanionUrl(serverBaseUrl, initialSessionId, initialPairingToken);
        setCompanionUrl(url);
        setCurrentSessionId(initialSessionId);
        setCurrentToken(initialPairingToken);
        const dataUri = await QRCode.toDataURL(url, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setQrDataUrl(dataUri);
        setIsLoading(false);
        return;
      }

      // Request pairing session from server with local fallback
      const result = await requestPairingSession(serverBaseUrl, authToken);
      setCompanionUrl(result.companionUrl);
      setCurrentSessionId(result.sessionId);
      setCurrentToken(result.token);

      const dataUri = await QRCode.toDataURL(result.companionUrl, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(dataUri);
    } catch (err) {
      console.warn('[CompanionQRModal] QR generation error:', err);
      // Fallback url
      const sId = initialSessionId || generateSessionId();
      const pToken = initialPairingToken || generatePairingToken();
      const fallbackUrl = formatCompanionUrl(serverBaseUrl, sId, pToken);
      setCompanionUrl(fallbackUrl);
      setCurrentSessionId(sId);
      setCurrentToken(pToken);

      try {
        const fallbackDataUri = await QRCode.toDataURL(fallbackUrl, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setQrDataUrl(fallbackDataUri);
      } catch (qrErr) {
        console.error('[CompanionQRModal] Failed to render fallback QR code:', qrErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [serverBaseUrl, authToken, initialSessionId, initialPairingToken]);

  useEffect(() => {
    if (!isOpen) return;
    initPairing();
  }, [isOpen, initPairing]);

  // Global ESC shortcut to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyLink = async () => {
    if (!companionUrl) return;
    const success = await copyToClipboard(companionUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenPopout = () => {
    if (!companionUrl) return;
    window.open(
      companionUrl,
      'GhostboardCompanion',
      'width=420,height=820,left=1200,top=100,menubar=no,toolbar=no,location=no,status=no'
    );
  };

  const handleRefreshCode = () => {
    const freshSession = generateSessionId();
    const freshToken = generatePairingToken();
    const freshUrl = formatCompanionUrl(serverBaseUrl, freshSession, freshToken);
    setCurrentSessionId(freshSession);
    setCurrentToken(freshToken);
    setCompanionUrl(freshUrl);
    QRCode.toDataURL(freshUrl, {
      width: 260,
      margin: 1.5,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch(console.warn);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={SPRING_PHYSICS}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#08090a] border border-white/10 p-6 sm:p-7 shadow-[0_0_80px_rgba(6,182,212,0.15)] text-zinc-100"
        >
          {/* Subtle Ambient Radial Mesh Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Закрити [Esc]"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Smartphone className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  MOBILE COMPANION
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REALTIME
                </span>
              </div>
              <h3 className="text-lg font-bold font-sans text-white">
                Мобільний Суфлер на Телефоні
              </h3>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-4">
            Покладіть смартфон безпосередньо під веб-камеру. Ваші очі дивитимуться прямо у погляд інтерв'юера, читаючи 3 ключові тези та голосовий старт.
          </p>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#0d0f12]/90 border border-white/[0.08] mb-4 shadow-inner">
            {qrDataUrl && !isLoading ? (
              <div className="p-3 bg-white rounded-2xl shadow-xl transition-transform hover:scale-[1.01]">
                <img
                  src={qrDataUrl}
                  alt="Ghostboard Mobile Companion QR Code"
                  className="w-48 h-48 block rounded-xl select-none"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex flex-col items-center justify-center text-xs font-mono text-zinc-400 gap-2">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Генерація QR-коду...</span>
              </div>
            )}

            <div className="flex items-center justify-between w-full mt-3 px-1">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span>LAN & Cloud SSE Sync</span>
              </div>

              <button
                onClick={handleRefreshCode}
                title="Згенерувати новий токен підключення"
                className="text-[10px] font-mono text-zinc-500 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Оновити</span>
              </button>
            </div>
          </div>

          {/* Eyeline Benefits Badge */}
          <div className="mb-4 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-2 text-[11px] text-cyan-200">
            <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Збереження контакту очей:</strong> телефон працює як фізичний телесуфлер без руху зіниць.
            </span>
          </div>

          {/* Action buttons with spring feedback */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono font-medium flex items-center justify-center gap-2 text-zinc-200 transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Скопійовано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Скопіювати посилання</span>
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={handleOpenPopout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Вікно-попаут</span>
              </motion.button>
            </div>

            <div className="text-center text-[10px] font-mono text-zinc-400 truncate">
              {companionUrl || `${serverBaseUrl}/companion/live`}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
