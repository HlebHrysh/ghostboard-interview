"use client";

import React, { useEffect, useRef } from "react";

export type StripeDirection = "vertical" | "diagonal" | "horizontal" | "perspective";
export type StripeDensity = "tight" | "normal" | "sparse";

interface MonochromeStripesCanvasProps {
  density?: StripeDensity;
  direction?: StripeDirection;
  glowIntensity?: number;
  showScanlines?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function MonochromeStripesCanvas({
  density = "normal",
  direction = "vertical",
  glowIntensity = 0.07,
  showScanlines = true,
  className = "",
  children,
}: MonochromeStripesCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mouse-x", `${x.toFixed(2)}%`);
      el.style.setProperty("--mouse-y", `${y.toFixed(2)}%`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const gapMap: Record<StripeDensity, string> = {
    tight: "16px",
    normal: "32px",
    sparse: "56px",
  };

  const getStripePattern = () => {
    switch (direction) {
      case "diagonal":
        return "repeating-linear-gradient(45deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 24px)";
      case "horizontal":
        return `repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent ${gapMap[density]})`;
      case "perspective":
        return `repeating-linear-gradient(to right, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent ${gapMap[density]})`;
      case "vertical":
      default:
        return `repeating-linear-gradient(to right, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent ${gapMap[density]})`;
    }
  };

  return (
    <div
      ref={containerRef}
      style={
        {
          "--mouse-x": "50%",
          "--mouse-y": "25%",
          "--glow-opacity": glowIntensity,
        } as React.CSSProperties
      }
      className={`relative w-full overflow-hidden bg-black text-zinc-100 ${className}`}
    >
      {/* Layer 1: Procedural mathematical pinstripes */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-80"
        style={{
          backgroundImage: getStripePattern(),
          maskImage:
            "radial-gradient(circle 800px at var(--mouse-x) var(--mouse-y), black 20%, rgba(0,0,0,0.35) 60%, transparent 95%)",
          WebkitMaskImage:
            "radial-gradient(circle 800px at var(--mouse-x) var(--mouse-y), black 20%, rgba(0,0,0,0.35) 60%, transparent 95%)",
        }}
      />

      {/* Layer 2: Titanium ambient specular light cone */}
      <div
        className="pointer-events-none absolute inset-0 z-0 will-change-transform"
        style={{
          background: `radial-gradient(700px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, var(--glow-opacity)), transparent 70%)`,
        }}
      />

      {/* Layer 3: Architectural horizontal scanlines (subtle depth) */}
      {showScanlines && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 120px",
            maskImage:
              "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          }}
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
