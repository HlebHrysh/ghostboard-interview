'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tablet, Copy, Check, ExternalLink, X, Smartphone, Wifi, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';

interface CompanionQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanionQRModal: React.FC<CompanionQRModalProps> = ({ isOpen, onClose }) => {
  const { locale } = useLocale();
  const c = getModalsTranslations(locale).companion;
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [hudUrl, setHudUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/companion/live`;
      setHudUrl(url);

      QRCode.toDataURL(url, {
        width: 260,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((dataUri) => {
          setQrDataUrl(dataUri);
        })
        .catch((err) => {
          console.error('QR code generation error:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (hudUrl) {
      navigator.clipboard.writeText(hudUrl);
      setCopied(true);
      toast.success(c.toastCopied);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenLocal = () => {
    window.open(hudUrl, 'GhostboardTeleprompter', 'width=700,height=900,left=1200,top=100');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md overflow-hidden bg-[#111113] border border-[#C8F135]/30 rounded-3xl p-6 sm:p-7 shadow-[0_0_80px_rgba(200,241,53,0.12)] text-zinc-100"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-[#C8F135]/15 border border-[#C8F135]/30 flex items-center justify-center text-[#C8F135]">
              <Tablet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-[#C8F135] uppercase tracking-widest font-bold">
                {c.badge}
              </div>
              <h3 className="text-xl font-bold font-sans text-white">
                {c.title}
              </h3>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-5">
            {c.desc}
          </p>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 mb-5">
            {qrDataUrl ? (
              <div className="p-3 bg-white rounded-xl shadow-lg">
                <img
                  src={qrDataUrl}
                  alt="Ghostboard Companion QR Code"
                  className="w-48 h-48 block rounded-lg"
                />
              </div>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs font-mono text-zinc-500">
                {c.generating}
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-mono text-zinc-400">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>{c.sseSync}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-medium transition-all cursor-pointer flex items-center justify-center gap-2 text-zinc-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#C8F135]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? c.copied : c.copyLink}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenLocal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#C8F135]/10 hover:bg-[#C8F135]/20 border border-[#C8F135]/30 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-[#C8F135]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{c.popout}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
