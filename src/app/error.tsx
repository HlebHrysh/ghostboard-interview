"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    console.error("Ghostboard Application Error:", error);
  }, [error]);

  const copyErrorDetails = () => {
    const details = `Ghostboard Error: ${error.message}\nDigest: ${error.digest || "N/A"}\nTime: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(details);
    setCopied(true);
    toast.success("Код ошибки скопирован в буфер обмена");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SubpageStripesContainer pattern="fracture" className="flex flex-col justify-between py-12 px-4 sm:px-6">
      {/* Top bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-white/[0.08] pb-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <GhostDetectiveLogo size="mini" />
          <span className="font-mono text-xs font-bold tracking-widest text-zinc-300 uppercase">
            GHOSTBOARD
          </span>
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>STATUS: FAILSAFE_QUARANTINE (500)</span>
        </div>
      </div>

      {/* Main error block */}
      <main className="max-w-xl mx-auto w-full my-auto text-center space-y-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-zinc-400">
          <AlertTriangle className="w-3.5 h-3.5 text-white" />
          <span>ENGINE_FAILSAFE_TRIGGERED</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black font-mono tracking-tighter text-white">
          500
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-white">
            Внутренний сбой изолирован
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans max-w-md mx-auto">
            Произошла непредвиденная ошибка во время работы интерфейса. Ваши локальные настройки сохранены. Попробуйте перезапустить процесс.
          </p>
        </div>

        {/* Action buttons */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-resend-primary !py-3 !px-7 text-xs font-mono w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.15)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Перезапустить сессию</span>
          </button>
          <button
            type="button"
            onClick={copyErrorDetails}
            className="btn-resend-glass !py-3 !px-5 text-xs font-mono w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? "Скопировано" : "Скопировать ошибку"}</span>
          </button>
        </div>
      </main>

      {/* Bottom footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[10px] font-mono text-zinc-600 border-t border-white/[0.08] pt-4">
        © 2026 Ghostboard · Autonomous In-Flight Resilience
      </footer>
    </SubpageStripesContainer>
  );
}
