"use client";

import { useEffect, useRef } from "react";

/**
 * Cosmic particle field: monochrome stars drifting along one shared trajectory
 * (parallax layers), repelled/whirled by mouse or touch. Same behaviour on mobile.
 */
export function CosmicField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1, raf = 0, last = performance.now();
    const ptr = { x: -9999, y: -9999, active: false, vx: 0, vy: 0 };

    type P = { x: number; y: number; z: number; ox: number; oy: number; tw: number };
    let ps: P[] = [];
    // Shared flight direction: up-right diagonal.
    const DIR = { x: 0.8, y: -0.6 };

    const spawn = (anywhere: boolean): P => {
      const z = Math.random();
      let x = Math.random() * w, y = Math.random() * h;
      if (!anywhere) { // re-enter from the bottom/left edges
        if (Math.random() < 0.5) { x = -10; } else { y = h + 10; }
      }
      return { x, y, z: 0.15 + z * 0.85, ox: 0, oy: 0, tw: Math.random() * 6.28 };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(260, Math.max(70, (w * h) / 9000)));
      ps = Array.from({ length: count }, () => spawn(true));
    };

    const move = (x: number, y: number) => {
      ptr.vx = x - ptr.x; ptr.vy = y - ptr.y;
      ptr.x = x; ptr.y = y; ptr.active = true;
    };
    const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY);
    const onEnd = () => { ptr.active = false; ptr.x = ptr.y = -9999; };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(180, Math.max(110, w * 0.2));
      for (const p of ps) {
        const speed = (reduce ? 4 : 18 + p.z * 46);
        p.x += DIR.x * speed * dt; p.y += DIR.y * speed * dt;

        if (ptr.active) {
          const dx = p.x + p.ox - ptr.x, dy = p.y + p.oy - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1, f = (1 - d / R);
            p.ox += (dx / d) * f * 6 * p.z + ptr.vx * 0.04 * f;
            p.oy += (dy / d) * f * 6 * p.z + ptr.vy * 0.04 * f;
          }
        }
        p.ox *= 0.94; p.oy *= 0.94; // spring back to the lane
        const x = p.x + p.ox, y = p.y + p.oy;

        if (p.x > w + 20 || p.y < -20) Object.assign(p, spawn(false));

        p.tw += dt * (1 + p.z * 2);
        const a = (0.25 + 0.55 * p.z) * (0.75 + 0.25 * Math.sin(p.tw));
        const r = 0.5 + p.z * 1.5;
        // motion streak along the shared direction
        const len = reduce ? 0 : 4 + p.z * 14;
        ctx.strokeStyle = `rgba(${200 + p.z * 55 | 0},${205 + p.z * 50 | 0},${215 + p.z * 40 | 0},${a * 0.35})`;
        ctx.lineWidth = r;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - DIR.x * len, y - DIR.y * len); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
      ptr.vx *= 0.8; ptr.vy *= 0.8;
      raf = requestAnimationFrame(frame);
    };

    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); } };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerup", (e) => e.pointerType === "touch" && onEnd());
    window.addEventListener("pointercancel", onEnd);
    document.addEventListener("pointerleave", onEnd);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointercancel", onEnd);
      document.removeEventListener("pointerleave", onEnd);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="cosmic-field" />;
}
