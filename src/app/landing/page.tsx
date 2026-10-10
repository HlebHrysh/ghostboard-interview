"use client";

import React from "react";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { useLocale } from "@/contexts/LocaleContext";
import { getHomeTranslations } from "@/lib/homeI18n";
import { ResendHero } from "@/components/home/ResendHero";
import { ScreenShareSplitSlider } from "@/components/home/ScreenShareSplitSlider";
import { EyelineTickerShowcase } from "@/components/home/EyelineTickerShowcase";
import { WorkflowGrid } from "@/components/home/WorkflowGrid";
import { DeviceShowcase } from "@/components/home/DeviceShowcase";
import { MinimalFaq } from "@/components/home/MinimalFaq";
import { CtaBanner } from "@/components/home/CtaBanner";

export default function HomePage() {
  const { locale } = useLocale();
  const t = getHomeTranslations(locale);

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-white/20 selection:text-white font-sans flex flex-col justify-between overflow-x-hidden">
      <UnifiedNavbar />

      <main className="flex-1 flex flex-col">
        {/* Resend.com-style Typography Hero */}
        <ResendHero t={t} />

        {/* Author Signature Feature: Interactive X-Ray Screen-Share Split Slider */}
        <ScreenShareSplitSlider t={t.stealthLens} />

        {/* True-to-Life Physical Laptop Bezel & Eyeline Simulator */}
        <EyelineTickerShowcase t={t.tickerDemo} />

        {/* 3-Step Low-Latency Architecture */}
        <WorkflowGrid t={t.workflow} />

        {/* Multi-Device Matrix: Desktop, Mobile Eyeline, Web */}
        <DeviceShowcase t={t.devices} />

        {/* Minimalist FAQ */}
        <MinimalFaq t={t.faq} />

        {/* Closing Action Banner */}
        <CtaBanner t={t.ctaSection} />
      </main>

      <UnifiedFooter />
    </div>
  );
}
