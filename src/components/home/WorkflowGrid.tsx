"use client";

import React from "react";
import { Mic, Zap, Eye } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";
import { Reveal } from "./Reveal";
import { LuminousBorderCard } from "@/components/ui/LuminousBorderCard";

interface Props {
  t: HomeTranslations["workflow"];
}

export function WorkflowGrid({ t }: Props) {
  const steps = [
    { tag: t.step1Tag, title: t.step1Title, desc: t.step1Desc, icon: Mic, stat: "350ms", statLabel: "STT Latency", highlight: false },
    { tag: t.step2Tag, title: t.step2Title, desc: t.step2Desc, icon: Zap, stat: "1.2s", statLabel: "AI Synthesis", highlight: true },
    { tag: t.step3Tag, title: t.step3Title, desc: t.step3Desc, icon: Eye, stat: "100%", statLabel: "Stealth Affinity", highlight: false },
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black overflow-hidden">
      {/* Background procedural laser scanning pinstripes */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 32px)",
          maskImage: "radial-gradient(circle 650px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 650px at center, black, transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          {/* 3D Holographic Ghost Mascot Animation */}
          <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 mb-6 overflow-hidden rounded-[1.9rem] sm:rounded-[2.2rem] border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <video
              src="/videos/ghost2.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-2" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {t.title}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed">{t.subtitle}</p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Reveal key={idx} delay={idx * 0.08} className="h-full">
                {step.highlight ? (
                  <LuminousBorderCard animated={true} badge="Core Engine" className="h-full">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-400">{step.tag}</span>
                        <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-white">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white tracking-tight">{step.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-white/[0.08] flex items-baseline justify-between">
                      <span className="text-2xl font-mono font-medium text-white tracking-tight">{step.stat}</span>
                      <span className="text-xs font-mono text-zinc-400">{step.statLabel}</span>
                    </div>
                  </LuminousBorderCard>
                ) : (
                  <div className="group relative h-full p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background:
                          "radial-gradient(400px circle at 50% 50%, rgba(255,255,255,0.06), transparent 40%)",
                      }}
                    />
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-zinc-500">{step.tag}</span>
                        <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-white tracking-tight">{step.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{step.desc}</p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-white/[0.08] flex items-baseline justify-between relative z-10">
                      <span className="text-2xl font-mono font-medium text-white tracking-tight">{step.stat}</span>
                      <span className="text-xs font-mono text-zinc-500">{step.statLabel}</span>
                    </div>
                  </div>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
