"use client";

import React from "react";
import Link from "next/link";
import { Laptop, Smartphone, Globe } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";
import { Reveal } from "./Reveal";

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
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black overflow-hidden">
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

        {/* Studio frame */}
        <Reveal className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-2 sm:p-3 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.08] rounded-2xl overflow-hidden">
            {devices.map((dev, idx) => {
              const Icon = dev.icon;
              return (
                <div key={idx} className="bg-[#050505] p-6 sm:p-8 flex flex-col justify-between group hover:bg-[#08080a] transition-colors">
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
                  <div className="pt-6 mt-6 border-t border-white/[0.08]">
                    <Link
                      href={dev.href}
                      className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      <span>{dev.linkText}</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">›</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
