"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Radio, Terminal, Play } from "lucide-react";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";
import { SpacetimeRift } from "@/components/singularity/SpacetimeRift";
import { BlackHoleButton } from "@/components/singularity/BlackHoleButton";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";

export default function NotFound() {
  const router = useRouter();

  // Listen for [Enter] key to immediately teleport back to /interview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        router.push("/interview");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <SubpageStripesContainer pattern="fracture" className="flex flex-col justify-between py-12 px-4 sm:px-6">
      {/* Top micro-bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-white/[0.08] pb-4">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <GhostDetectiveLogo size="mini" />
          <span className="font-mono text-xs font-bold tracking-widest text-zinc-300 uppercase">
            GHOSTBOARD
          </span>
        </Link>
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
          <Radio className="w-3 h-3 text-white animate-pulse" />
          <span>STATUS: SIGNAL_LOST (404)</span>
        </div>
      </div>

      {/* Main error block */}
      <main className="max-w-xl mx-auto w-full my-auto py-12"><SpacetimeRift><div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-zinc-400">
          <Terminal className="w-3.5 h-3.5 text-zinc-300" />
          <span>DISCONNECTED_ROUTE_DETECTOR</span>
        </div>

        <h1 className="text-6xl sm:text-8xl font-black font-mono tracking-tighter text-white bg-gradient-to-b from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold font-sans text-white">
            Сигнал потерян: Маршрут не существует
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans max-w-md mx-auto">
            Этот URL был перемещен или удален. Ваш рабочий профиль, аудио-настройки и история сессий сохранены и не затронуты.
          </p>
        </div>

        {/* Primary Rescue Action */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <BlackHoleButton href="/interview" size="lg">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Телепорт в суфлер [Enter]</span>
          </BlackHoleButton>
          <Link
            href="/settings"
            className="btn-resend-glass !py-3 !px-5 text-xs font-mono w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Настройки платформы</span>
          </Link>
        </div>

        {/* Quick destinations */}
        <div className="pt-8 border-t border-white/[0.08] flex items-center justify-center gap-6 text-xs font-mono text-zinc-500">
          <Link href="/guide" className="hover:text-white transition-colors">
            Руководство
          </Link>
          <Link href="/pricing" className="hover:text-white transition-colors">
            Тарифы
          </Link>
          <Link href="/profile" className="hover:text-white transition-colors">
            Профиль
          </Link>
        </div>
      </div></SpacetimeRift></main>

      {/* Bottom status */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[10px] font-mono text-zinc-600 border-t border-white/[0.08] pt-4">
        © 2026 Ghostboard · Autonomous In-Flight Resilience
      </footer>
    </SubpageStripesContainer>
  );
}
