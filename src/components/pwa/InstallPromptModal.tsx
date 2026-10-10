'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Monitor, 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ChevronRight,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type DetectedOS = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';
export type DetectedBrowser = 'chrome' | 'edge' | 'safari' | 'firefox' | 'brave' | 'opera' | 'unknown';

export function useEnvironmentDetection() {
  const [os, setOs] = useState<DetectedOS>('unknown');
  const [browser, setBrowser] = useState<DetectedBrowser>('unknown');
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detect Standalone Mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Detect OS
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform?.toLowerCase() || navigator.platform.toLowerCase();

    if (/iphone|ipad|ipod/.test(ua) || (platform.includes('mac') && navigator.maxTouchPoints > 1)) {
      setOs('ios');
    } else if (/android/.test(ua)) {
      setOs('android');
    } else if (platform.includes('win') || ua.includes('windows')) {
      setOs('windows');
    } else if (platform.includes('mac') || ua.includes('macintosh')) {
      setOs('macos');
    } else if (platform.includes('linux') || ua.includes('linux')) {
      setOs('linux');
    } else {
      setOs('unknown');
    }

    // 3. Detect Browser
    if (ua.includes('edg/')) {
      setBrowser('edge');
    } else if (ua.includes('opr/') || ua.includes('opera/')) {
      setBrowser('opera');
    } else if (ua.includes('firefox/')) {
      setBrowser('firefox');
    } else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
      setBrowser('safari');
    } else if (ua.includes('chrome') || ua.includes('crios')) {
      // Check for Brave
      if ((navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave) {
        setBrowser('brave');
      } else {
        setBrowser('chrome');
      }
    } else {
      setBrowser('unknown');
    }
  }, []);

  return { os, browser, isStandalone };
}

interface InstallPromptModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  triggerButtonOnly?: boolean;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  triggerButtonOnly = false
}) => {
  const { os, browser, isStandalone } = useEnvironmentDetection();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Capture beforeinstallprompt event for Chromium
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('Ghostboard successfully installed to your desktop!');
      if (onClose) onClose();
      else setIsModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onClose]);

  const showModal = controlledIsOpen !== undefined ? controlledIsOpen : isModalOpen;

  const handleOpen = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsModalOpen(false);
    }
  };

  const handleNativeInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          toast.success('Installing Ghostboard...');
          handleClose();
        } else {
          toast.info('Installation deferred.');
        }
      } catch (err) {
        console.error('PWA install error:', err);
      }
    }
  }, [deferredPrompt]);

  // If already running inside standalone window, hide prompt
  if (isStandalone || isInstalled) {
    return null;
  }

  // Trigger Button
  if (triggerButtonOnly) {
    return (
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-medium text-lime-400 bg-lime-400/10 border border-lime-400/30 hover:bg-lime-400/20 transition-all cursor-pointer shadow-[0_0_15px_rgba(200,241,53,0.15)] active:scale-95"
      >
        <Download className="w-3.5 h-3.5 text-lime-400" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-lg bg-[#0d0d12]/95 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            {/* Background luxury glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/10 blur-3xl rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center p-2 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icon.svg" alt="Ghostboard" className="w-8 h-8 drop-shadow-[0_0_8px_rgba(200,241,53,0.3)]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                    Install Ghostboard
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/30">
                      Standalone HUD
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Dedicated borderless window • Fast launch • Zero address bar
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dynamic OS / Browser Instructional Content */}
            <div className="space-y-4 mb-6">
              {/* Option 1: Native Chromium Install (Chrome / Edge) */}
              {deferredPrompt ? (
                <div className="p-4 rounded-xl bg-lime-400/[0.05] border border-lime-400/20 space-y-3">
                  <div className="flex items-center gap-2 text-lime-400 text-xs font-mono font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>Instant 1-Click Install Available</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Install Ghostboard directly onto your Desktop and Taskbar/Dock without downloading any binary files.
                  </p>
                  <button
                    onClick={handleNativeInstall}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-mono text-xs font-semibold bg-lime-400 text-black hover:bg-lime-300 transition-all cursor-pointer shadow-[0_0_20px_rgba(200,241,53,0.3)] active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Ghostboard Now</span>
                  </button>
                </div>
              ) : null}

              {/* Option 2: Safari on macOS (Sonoma+) */}
              {os === 'macos' && browser === 'safari' && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-200 text-xs font-mono font-semibold">
                    <Laptop className="w-4 h-4" />
                    <span>macOS Safari • Add to Dock</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed font-sans">
                    <li>In the top menu bar, click <strong className="text-white font-mono">File</strong> (or click the <strong className="text-white">Share</strong> icon <Share className="inline w-3.5 h-3.5 mx-1 text-zinc-400" />).</li>
                    <li>Select <strong className="text-white font-mono">Add to Dock...</strong></li>
                    <li>Click <strong className="text-white font-mono">Add</strong> to create an instant, borderless standalone app in your Dock and Launchpad.</li>
                  </ol>
                </div>
              )}

              {/* Option 3: iOS Safari */}
              {os === 'ios' && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-200 text-xs font-mono font-semibold">
                    <Smartphone className="w-4 h-4" />
                    <span>iOS Safari • Add to Home Screen</span>
                  </div>
                  <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed font-sans">
                    <li>Tap the <strong className="text-white">Share</strong> button <Share className="inline w-3.5 h-3.5 mx-1 text-zinc-400" /> at the bottom bar.</li>
                    <li>Scroll down and tap <strong className="text-white font-mono">Add to Home Screen</strong> <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-zinc-400" />.</li>
                    <li>Tap <strong className="text-white font-mono">Add</strong> in the top-right corner to launch with zero Safari UI.</li>
                  </ol>
                </div>
              )}

              {/* Option 4: Firefox or Desktop Chromium without deferred prompt */}
              {!deferredPrompt && (os === 'windows' || os === 'linux' || os === 'macos') && browser !== 'safari' && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-300 text-xs font-mono font-semibold">
                    <Monitor className="w-4 h-4" />
                    <span>Desktop App Mode Instructions</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    If your browser did not automatically trigger the install banner, click the install icon in your address bar:
                  </p>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 bg-black/40 p-2.5 rounded-lg border border-white/5">
                    <Download className="w-3.5 h-3.5 text-lime-400 flex-shrink-0" />
                    <span>Look for the <strong>«Install»</strong> icon on the right side of the URL address bar.</span>
                  </div>
                </div>
              )}

              {/* Alternative: Download Native Desktop App or Script */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-mono font-semibold text-zinc-200">
                    Looking for Native Desktop App?
                  </div>
                  <div className="text-[11px] text-zinc-500 font-sans">
                    Includes screen-share invisibility & system loopback audio
                  </div>
                </div>
                <a
                  href="/download"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-white/10 hover:bg-white/20 transition-all border border-white/10 flex-shrink-0"
                >
                  <span>Downloads</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-zinc-500 font-mono">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-lime-400" />
                Always synced with ghostboard.ai
              </span>
              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
