"use client";

import React from "react";
import Link from "next/link";
import { Laptop, Smartphone, Globe } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";
import { Reveal } from "./Reveal";
import { GravitationalCard } from "@/components/singularity/GravitationalCard";

interface Props {
  t: HomeTranslations["devices"];
}

export function DeviceShowcase({ t }: Props) {
  const devices = [
    { icon: Laptop, title: t.desktopTitle, desc: t.desktopDesc, badge: t.desktopBadge, href: "/download", linkText: "Download Native Client" },
    { icon: Smartphone, title: t.mobileTitle, desc: t.mobileDesc, badge: t.mobileBadge, href: "/interview", linkText: "Pair Phone Companion" },
    { icon: Globe, title: t.webTitle, desc: t.webDesc, badge: t.webBadge, href: "/interview", linkText: "Launch Web Playground" },
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-transparent overflow-hidden">
      {/* Subtle vertical perspective coordinate lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 48px)",
          maskImage: "radial-gradient(circle 600px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 600px at center, black, transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-2" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {t.title}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed">{t.subtitle}</p>
        </Reveal>

        {/* 3D Gravitational Device Grid */}
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {devices.map((dev, idx) => {
              const Icon = dev.icon;
              return (
                <GravitationalCard
                  key={idx}
                  tilt={4}
                  className="p-6 sm:p-8"
                  contentClassName="flex flex-col justify-between h-full space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 group-hover:text-white group-hover:border-white/20 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-white/[0.08] text-zinc-400 bg-white/[0.02]">
                        {dev.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-white tracking-tight">{dev.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{dev.desc}</p>
                  </div>
                  <div className="pt-6 border-t border-white/[0.08]">
                    <Link
                      href={dev.href}
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      <span>{dev.linkText}</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">›</span>
                    </Link>
                  </div>
                </GravitationalCard>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
