'use client';

import React, { useState, useEffect } from 'react';
import { Download, ChevronDown, Check, Apple, Monitor, Terminal } from 'lucide-react';

export type DetectedPlatform = 'mac-arm64' | 'mac-intel' | 'win' | 'linux';

interface PlatformDetails {
  id: DetectedPlatform;
  label: string;
  osName: string;
  archName: string;
  filename: string;
  downloadUrl: string;
  icon: React.ReactNode;
}

const PLATFORMS: Record<DetectedPlatform, PlatformDetails> = {
  'mac-arm64': {
    id: 'mac-arm64',
    label: 'macOS (Apple Silicon M1-M4)',
    osName: 'macOS',
    archName: 'Apple Silicon',
    filename: 'Ghostboard-1.2.0-arm64.dmg',
    downloadUrl: '/api/download?os=mac-arm64',
    icon: <Apple className="w-4 h-4" />,
  },
  'mac-intel': {
    id: 'mac-intel',
    label: 'macOS (Intel Core x64)',
    osName: 'macOS',
    archName: 'Intel',
    filename: 'Ghostboard-1.2.0-x64.dmg',
    downloadUrl: '/api/download?os=mac-intel',
    icon: <Apple className="w-4 h-4" />,
  },
  win: {
    id: 'win',
    label: 'Windows 10 / 11 (64-bit)',
    osName: 'Windows',
    archName: 'x64 Installer',
    filename: 'Ghostboard-Setup-1.2.0.exe',
    downloadUrl: '/api/download?os=win',
    icon: <Monitor className="w-4 h-4" />,
  },
  linux: {
    id: 'linux',
    label: 'Linux (Universal AppImage)',
    osName: 'Linux',
    archName: 'x86_64',
    filename: 'Ghostboard-1.2.0-x64.AppImage',
    downloadUrl: '/api/download?os=linux',
    icon: <Terminal className="w-4 h-4" />,
  },
};

export function SmartDownloadButton() {
  const [activePlatform, setActivePlatform] = useState<DetectedPlatform>('win');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const nav = window.navigator;
    const ua = nav.userAgent.toLowerCase();

    // Client Hints Architecture Probe (Edge/Chrome on macOS)
    // @ts-expect-error userAgentData is standard in Chromium Client Hints
    const uaData = nav.userAgentData;
    if (uaData && uaData.platform === 'macOS') {
      uaData.getHighEntropyValues(['architecture']).then((values: { architecture?: string }) => {
        if (values.architecture === 'arm') {
          setActivePlatform('mac-arm64');
        } else {
          setActivePlatform('mac-intel');
        }
      }).catch(() => {
        setActivePlatform('mac-arm64');
      });
      return;
    }

    if (ua.includes('mac')) {
      // GPU WebGL Renderer Probe for Apple M-series chips
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
          if (/apple m/i.test(renderer)) {
            setActivePlatform('mac-arm64');
            return;
          }
        }
      } catch {
        // Fallback
      }
      setActivePlatform('mac-arm64');
    } else if (ua.includes('linux')) {
      setActivePlatform('linux');
    } else {
      setActivePlatform('win');
    }
  }, []);

  const current = PLATFORMS[activePlatform];

  return (
    <div className="relative inline-flex flex-col items-center">
      <div className="flex items-center rounded-xl bg-white text-black p-1 shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.25)] transition-all">
        {/* Main 1-Click Download Button */}
        <a
          href={current.downloadUrl}
          className="flex items-center gap-3 px-6 py-3.5 font-semibold text-sm transition-transform active:scale-[0.98]"
        >
          <Download className="w-5 h-5 text-black" />
          <div className="text-left leading-tight">
            <span className="block text-xs uppercase tracking-wider text-zinc-500 font-mono">
              {isClient ? `Download for ${current.osName}` : 'Download Ghostboard'}
            </span>
            <span className="text-base font-bold text-black font-sans">
              {isClient ? `${current.osName} (${current.archName})` : 'Get Desktop App'}
            </span>
          </div>
        </a>

        {/* Platform Selection Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="px-3 py-4 border-l border-zinc-200 hover:bg-zinc-100 rounded-r-lg transition-colors cursor-pointer"
          title="Select other platforms"
        >
          <ChevronDown className={`w-4 h-4 text-zinc-700 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute top-full mt-2 w-72 rounded-xl bg-zinc-950 border border-white/10 shadow-2xl p-2 z-50 text-left">
          <div className="px-3 py-2 text-[11px] font-mono text-zinc-400 border-b border-white/[0.08]">
            SELECT TARGET PLATFORM
          </div>
          <div className="mt-1 space-y-1">
            {(Object.keys(PLATFORMS) as DetectedPlatform[]).map((key) => {
              const p = PLATFORMS[key];
              const isSelected = activePlatform === key;
              return (
                <a
                  key={key}
                  href={p.downloadUrl}
                  onClick={() => {
                    setActivePlatform(key);
                    setDropdownOpen(false);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-mono transition-colors ${
                    isSelected ? 'bg-white/15 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {p.icon}
                    <span>{p.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <span className="mt-2 text-[11px] font-mono text-zinc-400">
        v1.2.0 • Gatekeeper &amp; SmartScreen Verified • Free Updates
      </span>
    </div>
  );
}
