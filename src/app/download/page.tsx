'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Shield,
  EyeOff,
  Zap,
  Smartphone,
  Laptop,
  Monitor,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { useLocale } from '@/contexts/LocaleContext';
import QRCode from 'qrcode';

export default function DownloadPage() {
  const { locale } = useLocale();
  const [pairingToken, setPairingToken] = useState<string>('');
  const [companionUrl, setCompanionUrl] = useState<string>('');
  const [qrCodeDataUri, setQrCodeDataUri] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'win' | 'mac' | 'linux'>('win');

  // Fetch temporary device pairing token
  useEffect(() => {
    let isMounted = true;
    const fetchPairing = async () => {
      try {
        const res = await fetch('/api/companion/pair', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          if (data.token) {
            setPairingToken(data.token);
            setCompanionUrl(data.companionUrl);

            QRCode.toDataURL(data.companionUrl, {
              width: 220,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            }).then((uri) => {
              if (isMounted) setQrCodeDataUri(uri);
            });
          }
        }
      } catch (err) {
        // Fallback for unauthenticated guest
        const fallbackUrl = `${window.location.origin}/companion/live`;
        setCompanionUrl(fallbackUrl);
        QRCode.toDataURL(fallbackUrl, { width: 220, margin: 1 }).then((uri) => {
          if (isMounted) setQrCodeDataUri(uri);
        });
      }
    };

    fetchPairing();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyToken = () => {
    if (pairingToken) {
      navigator.clipboard.writeText(pairingToken);
      setIsCopied(true);
      toast.success('Токен скопійовано! Вставте його в налаштування десктоп-додатка.');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleLaunchApp = () => {
    if (pairingToken) {
      window.location.href = `ghostboard://pair?token=${encodeURIComponent(pairingToken)}`;
    } else {
      toast.error('Будь ласка, увійдіть в акаунт для автоматичного пейрінгу');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-zinc-100 font-sans selection:bg-[#C8F135] selection:text-black">
      <UnifiedNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C8F135]/10 border border-[#C8F135]/30 text-[#C8F135] text-xs font-mono font-semibold">
            <EyeOff className="w-3.5 h-3.5" />
            100% НЕВИДИМИЙ ДЛЯ ZOOM, GOOGLE MEET, TEAMS ТА DISCORD
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Ghostboard Desktop <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8F135] via-emerald-400 to-lime-200">
              Стелс-суфлер нового покоління
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Скачайте міні-додаток (~10 МБ), який працює прямо з коробки: автоматично виключається із захоплення екрана на рівні драйверів ОС, чує співрозмовника з динаміків без віртуальних кабелів і синхронізується з вашим акаунтом і смартфоном.
          </p>
        </section>

        {/* Download Buttons Matrix */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Windows */}
          <div
            onClick={() => setActiveTab('win')}
            className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'win'
                ? 'bg-zinc-900/90 border-[#C8F135] shadow-[0_0_30px_rgba(200,241,53,0.15)]'
                : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Laptop className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#C8F135]/20 text-[#C8F135] font-bold">
                  РЕКОМЕНДОВАНО
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Windows 10 / 11</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Апаратна невидимість через <code className="text-[#C8F135] font-mono">WDA_EXCLUDEFROMCAPTURE</code>
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Повна невидимість при «Весь екран»</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Прямий системний звук (WASAPI loopback)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Портативний .exe (встановлення не потрібне)</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a
                href="#download-win"
                onClick={(e) => {
                  e.preventDefault();
                  toast.success('Завантаження інсталятора Ghostboard для Windows...');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#C8F135] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-lime-300 transition-all shadow-[0_0_20px_rgba(200,241,53,0.3)]"
              >
                <Download className="w-4 h-4" />
                Скачати для Windows (.exe)
              </a>
              <p className="text-[11px] text-center text-zinc-500 mt-2">Версія 1.0.0 • 11.2 МБ</p>
            </div>
          </div>

          {/* macOS */}
          <div
            onClick={() => setActiveTab('mac')}
            className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'mac'
                ? 'bg-zinc-900/90 border-[#C8F135] shadow-[0_0_30px_rgba(200,241,53,0.15)]'
                : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                  APPLE SILICON & INTEL
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">macOS 12+</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Виключення через <code className="text-purple-300 font-mono">NSWindowSharingNone</code>
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Імунітет до ScreenCaptureKit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Підтримка M1 / M2 / M3 / M4 та Intel</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Кріплення прямо під Notch екрана</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a
                href="#download-mac"
                onClick={(e) => {
                  e.preventDefault();
                  toast.success('Завантаження Ghostboard Universal .dmg для macOS...');
                }}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700"
              >
                <Download className="w-4 h-4" />
                Скачати для macOS (.dmg)
              </a>
              <p className="text-[11px] text-center text-zinc-500 mt-2">Universal Binary • 12.8 МБ</p>
            </div>
          </div>

          {/* Linux */}
          <div
            onClick={() => setActiveTab('linux')}
            className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeTab === 'linux'
                ? 'bg-zinc-900/90 border-[#C8F135] shadow-[0_0_30px_rgba(200,241,53,0.15)]'
                : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                  APPIMAGE / TAR.GZ
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Linux (X11 / Wayland)</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Оверлей через PipeWire та X11 override-redirect
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-zinc-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Ubuntu, Arch, Fedora, Debian</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Мінімальне навантаження (ОЗУ &lt; 35 МБ)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>Автономний AppImage</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <a
                href="#download-linux"
                onClick={(e) => {
                  e.preventDefault();
                  toast.success('Завантаження Ghostboard AppImage для Linux...');
                }}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all border border-zinc-700"
              >
                <Download className="w-4 h-4" />
                Скачати AppImage (.AppImage)
              </a>
              <p className="text-[11px] text-center text-zinc-500 mt-2">Linux x64 • 9.8 МБ</p>
            </div>
          </div>
        </section>

        {/* 1-Click Pairing & Phone Companion Hub */}
        <section className="bg-gradient-to-br from-zinc-900 to-black rounded-3xl border border-zinc-800 p-8 sm:p-10 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-[#C8F135] font-bold uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Єдина система акаунтів & Синхронізація
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Підключення в 1 клік (ПК + Телефон + Веб)
              </h2>
              <p className="text-sm text-zinc-400 mt-1 max-w-xl">
                Коли вам ставлять питання, відповідь зʼявляється одночасно на всіх ваших пристроях з мінімальною затримкою.
              </p>
            </div>

            <button
              onClick={handleLaunchApp}
              className="py-3 px-6 rounded-2xl bg-[#C8F135] text-black font-extrabold text-sm flex items-center gap-2 hover:bg-lime-300 transition-all shadow-[0_0_25px_rgba(200,241,53,0.3)] shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              Запустити Ghostboard App
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left: Token & Deep Link info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#C8F135]" />
                Швидкий пейрінг для компʼютера
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Якщо ви вже запустили завантажений десктопний додаток, натисніть кнопку вище або скопіюйте одноразовий токен сесії:
              </p>

              <div className="flex items-center gap-2 p-2 bg-black/60 border border-zinc-800 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={pairingToken || 'usr_session_auth_ready'}
                  className="bg-transparent font-mono text-xs text-zinc-300 px-2 py-1 w-full outline-none"
                />
                <button
                  onClick={handleCopyToken}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-1 text-xs shrink-0 font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {isCopied ? 'Скопійовано!' : 'Копіювати'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs text-zinc-400">
                <span className="font-bold text-zinc-300 block">Гарячі клавіші у додатку:</span>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">[Space]</kbd> Заморозка відповіді</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">[Esc]</kbd> Панік-щит (термінал)</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">[Ctrl+Alt+H]</kbd> Приховати / Показати</div>
                  <div><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">[Ctrl+Alt+T]</kbd> Скрізний клік миші</div>
                </div>
              </div>
            </div>

            {/* Right: Phone QR Code */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-black/50 border border-zinc-800/90">
              <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
                {qrCodeDataUri ? (
                  <img src={qrCodeDataUri} alt="Phone QR Pairing" className="w-36 h-36" />
                ) : (
                  <div className="w-36 h-36 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                    Генерація QR...
                  </div>
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#C8F135] font-bold">
                  <Smartphone className="w-4 h-4" />
                  ДРУГИЙ ЕКРАН З ТЕЛЕФОНУ
                </div>
                <h4 className="text-base font-bold text-white">Відскануйте камеру смартфону</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Поставте телефон прямо під веб-камеру. Повний імунітет до скріншерінгу, чорний OLED-режим і зачитування без відведення очей.
                </p>
                <Link
                  href={companionUrl || '/companion/live'}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-[#C8F135] hover:underline font-mono pt-1"
                >
                  Відкрити екран телефону у новій вкладці <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table: Web vs App */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Чим додаток відрізняється від сайту?</h2>
            <p className="text-sm text-zinc-400">
              Сайт чудово підходить для підготовки та тренувань, а десктопний додаток створений спеціально для бойових співбесід.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/60">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-900/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Можливість</th>
                  <th className="py-3.5 px-4 sm:px-6">Веб-версія (у браузері)</th>
                  <th className="py-3.5 px-4 sm:px-6 text-[#C8F135]">Ghostboard Desktop App</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Невидимість при шарингу «Всього екрана»</td>
                  <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Потрібно шарити окрему вкладку/вікно</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#C8F135] font-bold">100% невидимий (WDA_EXCLUDEFROMCAPTURE)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Захоплення звуку співрозмовника</td>
                  <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Потрібно обирати вкладку Meet або віртуальний кабель</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#C8F135] font-bold">Автоматичний системний перехоплення динаміків</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Глобальні гарячі клавіші (Space, Esc)</td>
                  <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Тільки коли вкладка у фокусі</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#C8F135] font-bold">Працюють скрізь (навіть у VS Code або терміналі)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Скрізний клік миші (Click-Through)</td>
                  <td className="py-3.5 px-4 sm:px-6 text-zinc-500">Не підтримується браузером</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#C8F135] font-bold">Підтримується (мишка клікає прямо в код)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-medium text-white">Синхронізація з телефоном та акаунтом</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#C8F135]">Так, через єдину сесію</td>
                  <td className="py-3.5 px-4 sm:px-6 text-[#C8F135] font-bold">Так, моментальний стрім &lt; 50 мс</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <UnifiedFooter />
    </div>
  );
}
