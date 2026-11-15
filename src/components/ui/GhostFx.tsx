"use client";

import { useEffect, useRef } from "react";

/**
 * Global interaction layer: cursor spotlight on cards, magnetic buttons,
 * scroll-reveal for sections and a top scroll-progress bar.
 */
export function GhostFx() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bar = barRef.current;

    const onMove = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const card = t?.closest<HTMLElement>(
        '.spotlight, .gb-card, .bento-card, .liquid-glass-card, .stealth-card, .spotlight-card-wrapper'
      );
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      if (reduce) return;
      const btn = t?.closest<HTMLElement>("[data-magnetic]");
      if (btn) {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--tx", `${(e.clientX - r.left - r.width / 2) * 0.08}px`);
        btn.style.setProperty("--ty", `${(e.clientY - r.top - r.height / 2) * 0.1}px`);
      }
    };
    const onLeave = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic]");
      btn?.style.removeProperty("--tx");
      btn?.style.removeProperty("--ty");
    };
    const onScroll = () => {
      if (!bar) return;
      const h = document.documentElement;
      bar.style.setProperty("--p", String(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <div ref={barRef} className="gp-progress" aria-hidden="true" />;
}
