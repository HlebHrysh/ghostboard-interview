"use client";

import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Always-reachable theme switch (pages without a navbar: auth, cabinet, HUD). */
export function FloatingThemeToggle() {
  return (
    <div className="sg-float-theme rounded-full p-0.5 bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <ThemeToggle />
    </div>
  );
}
