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
      const card = t?.closest<HTMLElement>('[class*="rounded-2xl"],[class*="rounded-3xl"],.gb-card,.stealth-card');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      if (reduce) return;
      const btn = t?.closest<HTMLElement>("button");
      if (btn && btn.offsetWidth < 320 && !btn.closest("[data-magnetic]")) {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--tx", `${(e.clientX - r.left - r.width / 2) * 0.12}px`);
        btn.style.setProperty("--ty", `${(e.clientY - r.top - r.height / 2) * 0.2}px`);
      }
    };
    const onLeave = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>("button");
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
