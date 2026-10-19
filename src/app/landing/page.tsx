"use client";

import React from "react";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { useLocale } from "@/contexts/LocaleContext";
import { getHomeTranslations } from "@/lib/homeI18n";
import { LandingHero } from "@/components/home/LandingHero";
import { InteractiveHudSimulator } from "@/components/home/InteractiveHudSimulator";
import { EngineeringBentoGrid } from "@/components/home/EngineeringBentoGrid";
import { SetupStepsSection } from "@/components/home/SetupStepsSection";
import { NoBsFaqSection } from "@/components/home/NoBsFaqSection";
import { TransparentPricingSection } from "@/components/home/TransparentPricingSection";
import { FooterSmartCta } from "@/components/home/FooterSmartCta";

export default function HomePage() {
  const { locale } = useLocale();
  const t = getHomeTranslations(locale);

  return (
    <div className="min-h-screen bg-[#08090A] text-zinc-100 selection:bg-emerald-500/20 selection:text-white font-sans flex flex-col justify-between overflow-x-hidden">
      <UnifiedNavbar />

      <main className="flex-1 flex flex-col">
        {/* Screen 1: Dark Tech Luxury Hero with Smart OS-Aware Download CTA */}
        <LandingHero t={t} />

        {/* Screen 1 (Interactive Anchor): Flagship Camera-Line HUD Simulator with Candidate vs Recruiter View */}
        <InteractiveHudSimulator t={t} />

        {/* Screen 2: 4-Card Engineering Proof Bento Grid */}
        <EngineeringBentoGrid t={t} />

        {/* Screen 3: Ready in 60 Seconds Onboarding Steps */}
        <SetupStepsSection t={t} />

        {/* Screen 4: No-BS Fear-Busting FAQ Accordion */}
        <NoBsFaqSection t={t} />

        {/* Screen 5: Transparent Pricing Tiers without hidden subscriptions */}
        <TransparentPricingSection t={t} />

        {/* Screen 6: Final Closing CTA with Platform Detection */}
        <FooterSmartCta t={t} />
      </main>

      <UnifiedFooter />
    </div>
  );
}
