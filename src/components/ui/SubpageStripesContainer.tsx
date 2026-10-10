"use client";

import React, { useEffect, useRef } from "react";

export type SubpagePattern = "horizon" | "blueprint" | "spine" | "telemetry" | "fracture";

interface SubpageStripesContainerProps {
  pattern?: SubpagePattern;
  className?: string;
  glowIntensity?: number;
  children: React.ReactNode;
}

export function SubpageStripesContainer({
  pattern = "blueprint",
  className = "",
  glowIntensity = 0.06,
  children,
}: SubpageStripesContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--cursor-x", `${x.toFixed(2)}%`);
      el.style.setProperty("--cursor-y", `${y.toFixed(2)}%`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (pattern) {
      case "horizon":
        return {
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "24px 64px",
          maskImage:
            "radial-gradient(circle 800px at var(--cursor-x, 50%) var(--cursor-y, 30%), black 30%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(circle 800px at var(--cursor-x, 50%) var(--cursor-y, 30%), black 30%, transparent 90%)",
        };
      case "spine":
        return {
          backgroundImage:
            "repeating-linear-gradient(to right, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 48px)",
          maskImage:
            "linear-gradient(to right, black 20%, rgba(0,0,0,0.5) 70%, transparent 95%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 20%, rgba(0,0,0,0.5) 70%, transparent 95%)",
        };
      case "telemetry":
        return {
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "16px 16px, 100% 32px",
        };
      case "fracture":
        return {
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 2px, transparent 8px)",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 80%)",
        };
      case "blueprint":
      default:
        return {
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(circle 700px at var(--cursor-x, 50%) var(--cursor-y, 25%), black 25%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(circle 700px at var(--cursor-x, 50%) var(--cursor-y, 25%), black 25%, transparent 85%)",
        };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-screen bg-black text-zinc-100 overflow-x-hidden ${className}`}
    >
      {/* Mathematical procedural stripe pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-80 transition-opacity duration-500 will-change-transform"
        style={getBackgroundStyle()}
      />

      {/* Subtle specular pointer light cone */}
      <div
        className="pointer-events-none absolute inset-0 z-0 will-change-transform opacity-50"
        style={{
          background: `radial-gradient(600px circle at var(--cursor-x, 50%) var(--cursor-y, 30%), rgba(255,255,255,${glowIntensity}), transparent 70%)`,
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
