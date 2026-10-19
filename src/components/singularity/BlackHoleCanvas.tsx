"use client";

import { useEffect, useRef } from "react";
import { warpPoint, mulberry32, easeOutCubic, WAVE_MS, WAVE_RADIUS, type Mass, type Wave, type Warped } from "./gravity";

const GRID = 56;
const STEP = 14;
const INTERACTIVE = 'a[href],button:not(:disabled),[role="tab"],[role="button"],[data-shockwave],summary';
const TEXT_INPUT =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="submit"]):not([type="button"]),textarea';

export const SHOCKWAVE_EVENT = "singularity:shockwave";

/** Fire a gravitational wave from anywhere in the app. */
export function emitShockwave(x: number, y: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHOCKWAVE_EVENT, { detail: { x, y } }));
}

/**
 * The Gravitational Canvas.
 *
 *  • Space-time grid + starfield warped by a spring-driven lens that follows the cursor
 *    (touch-drag on phones, gyroscope tilt where permitted without a prompt).
 *  • Focusing a text field creates a second mass at the field → the grid converges on it
 *    ("wormhole transit": zero-noise focus guidance on auth / forms).
 *  • Clicks on interactive elements emit a 400 ms shockwave.
 *  • Idle = zero CPU: the rAF loop sleeps once every spring has settled.
 *  • Lives on its own fixed compositing layer behind all UI (z-index:-1, pointer-events:none).
 */
export function BlackHoleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let reduce = mqReduce.matches;

    // Theme ink (rgb triplet) + opacity multipliers; refreshed on theme change.
    let ink = "255,255,255";
    let paper = "0,0,0";
    let light = false;
    const readTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      ink = cs.getPropertyValue("--sg-ink").trim().split(/\s+/).join(",") || "255,255,255";
      paper = cs.getPropertyValue("--sg-paper").trim().split(/\s+/).join(",") || "0,0,0";
      light = document.documentElement.dataset.theme === "light";
    };
    readTheme();

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();

    // Spring state ---------------------------------------------------------
    let tx = 0;
    let ty = 0;
    let seen = false;
    let active = false;
    const lens = { x: 0, y: 0, s: 0 };
    let focalTX = 0;
    let focalTY = 0;
    let focalOn = false;
    let focusEl: HTMLElement | null = null;
    const focal = { x: 0, y: 0, s: 0 };
    const waves: Wave[] = [];

    const lensMass: Mass = { x: 0, y: 0, k: 0, r: 170 };
    const focalMass: Mass = { x: 0, y: 0, k: 0, r: 240 };
    const masses: Mass[] = [];
    const out: Warped = { x: 0, y: 0, a: 0 };

    // Stars (normalised coordinates → stable across resize) -----------------
    const rng = mulberry32(0x5eed);
    const stars = Array.from({ length: 140 }, () => ({ x: rng(), y: rng(), b: 0.15 + rng() * 0.45 }));
    let starCount = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      starCount = Math.round(Math.min(stars.length, Math.max(40, (w * h) / 14000)));
      lensMass.r = Math.max(120, Math.min(190, w * 0.18));
      draw();
    };

    // Rendering -------------------------------------------------------------
    function draw() {
      const now = performance.now();
      ctx!.clearRect(0, 0, w, h);

      masses.length = 0;
      lensMass.x = lens.x;
      lensMass.y = lens.y;
      lensMass.k = 0.6 * lens.s;
      focalMass.x = focal.x;
      focalMass.y = focal.y;
      focalMass.k = 0.5 * focal.s;
      if (lensMass.k > 0.004) masses.push(lensMass);
      if (focalMass.k > 0.004) masses.push(focalMass);
      for (let i = waves.length - 1; i >= 0; i--) if (now - waves[i].t0 >= WAVE_MS) waves.splice(i, 1);

      // Grid (two batched paths: calm base + lit/bent highlight)
      const base = new Path2D();
      const hot = new Path2D();
      const cols = Math.ceil(w / GRID) + 1;
      const rows = Math.ceil(h / GRID) + 1;

      for (let pass = 0; pass < 2; pass++) {
        const vertical = pass === 0;
        const n = vertical ? cols : rows;
        const len = vertical ? h : w;
        for (let i = 0; i < n; i++) {
          const fixed = i * GRID;
          let prevHot = false;
          for (let s = 0; s <= len + STEP; s += STEP) {
            const px = vertical ? fixed : s;
            const py = vertical ? s : fixed;
            warpPoint(px, py, masses, waves, now, out);
            if (s === 0) base.moveTo(out.x, out.y);
            else base.lineTo(out.x, out.y);
            if (out.a > 0.12) {
              if (!prevHot) hot.moveTo(out.x, out.y);
              else hot.lineTo(out.x, out.y);
              prevHot = true;
            } else prevHot = false;
          }
        }
      }
      ctx!.lineWidth = 1;
      ctx!.strokeStyle = `rgba(${ink},${light ? 0.06 : 0.022})`;
      ctx!.stroke(base);
      ctx!.strokeStyle = `rgba(${ink},${light ? 0.18 : 0.08})`;
      ctx!.stroke(hot);

      // Stars (calm, subtle depth without interfering with text pixels)
      for (let i = 0; i < starCount; i++) {
        const st = stars[i];
        warpPoint(st.x * w, st.y * h, masses, waves, now, out);
        ctx!.fillStyle = `rgba(${ink},${Math.min(0.35, (st.b * 0.5 * (light ? 0.7 : 1)) + out.a * 0.25).toFixed(3)})`;
        ctx!.fillRect(out.x, out.y, 1.2, 1.2);
      }

      // Shockwave rings
      for (const wv of waves) {
        const t = (now - wv.t0) / WAVE_MS;
        ctx!.beginPath();
        ctx!.arc(wv.x, wv.y, WAVE_RADIUS * easeOutCubic(t), 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${ink},${((1 - t) * 0.2).toFixed(3)})`;
        ctx!.stroke();
      }

      // Event horizon + photon ring + faint accretion glow at the cursor
      if (lens.s > 0.02) {
        const g = ctx!.createRadialGradient(lens.x, lens.y, 0, lens.x, lens.y, 110);
        g.addColorStop(0, `rgba(${ink},${(0.025 * lens.s).toFixed(3)})`);
        g.addColorStop(1, `rgba(${ink},0)`);
        ctx!.fillStyle = g;
        ctx!.fillRect(lens.x - 110, lens.y - 110, 220, 220);
        ctx!.beginPath();
        ctx!.arc(lens.x, lens.y, 8 * lens.s, 0, Math.PI * 2);
        ctx!.fillStyle = `rgb(${paper})`;
        ctx!.fill();
        ctx!.strokeStyle = `rgba(${ink},${(0.35 * lens.s).toFixed(3)})`;
        ctx!.stroke();
      }
    }

    // Loop (sleeps when settled) -------------------------------------------
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const follow = 1 - Math.exp(-dt * 11);
      const fade = 1 - Math.exp(-dt * 5);

      lens.x += (tx - lens.x) * follow;
      lens.y += (ty - lens.y) * follow;
      lens.s += ((active ? 1 : 0) - lens.s) * fade;
      focal.x += (focalTX - focal.x) * follow;
      focal.y += (focalTY - focal.y) * follow;
      focal.s += ((focalOn ? 1 : 0) - focal.s) * fade;

      draw();

      const busy =
        Math.abs(tx - lens.x) > 0.25 ||
        Math.abs(ty - lens.y) > 0.25 ||
        Math.abs((active ? 1 : 0) - lens.s) > 0.004 ||
        Math.abs(focalTX - focal.x) > 0.25 ||
        Math.abs(focalTY - focal.y) > 0.25 ||
        Math.abs((focalOn ? 1 : 0) - focal.s) > 0.004 ||
        waves.length > 0;
      if (busy && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (raf || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    // Input -----------------------------------------------------------------
    const aim = (x: number, y: number) => {
      tx = x;
      ty = y;
      if (!seen) {
        lens.x = x;
        lens.y = y;
        seen = true;
      }
      active = true;
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!reduce) aim(e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      if (reduce) return;
      aim(e.clientX, e.clientY);
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      if (el) spawn(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") {
        active = false;
        wake();
      }
    };
    const onLeave = () => {
      active = false;
      wake();
    };
    const spawn = (x: number, y: number) => {
      if (reduce) return;
      waves.push({ x, y, t0: performance.now() });
      if (waves.length > 6) waves.shift();
      wake();
    };
    const onWave = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      if (d) spawn(d.x, d.y);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (reduce || !coarse || e.gamma == null || e.beta == null) return;
      const nx = Math.max(-1, Math.min(1, e.gamma / 40));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 40));
      aim(w * (0.5 + nx * 0.4), h * (0.5 + ny * 0.4));
    };

    // Wormhole: converge on the focused field ---------------------------------
    const syncFocal = () => {
      if (!focusEl || !focusEl.isConnected) return;
      const r = focusEl.getBoundingClientRect();
      focalTX = r.left + r.width / 2;
      focalTY = r.top + r.height / 2;
      if (focal.s < 0.01) {
        focal.x = focalTX;
        focal.y = focalTY;
      }
      wake();
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (reduce || !(t instanceof HTMLElement) || !t.matches(TEXT_INPUT)) return;
      focusEl = t;
      focalOn = true;
      syncFocal();
    };
    const onFocusOut = () => {
      focusEl = null;
      focalOn = false;
      wake();
    };

    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : (raf = 0, draw(), wake()));
    const onReduce = () => {
      reduce = mqReduce.matches;
      if (reduce) {
        active = false;
        focalOn = false;
        lens.s = focal.s = 0;
        waves.length = 0;
      }
      draw();
    };

    const themeObs = new MutationObserver(() => {
      readTheme();
      draw();
    });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", syncFocal, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("blur", onLeave);
    window.addEventListener(SHOCKWAVE_EVENT, onWave);
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVis);
    mqReduce.addEventListener("change", onReduce);

    return () => {
      themeObs.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", syncFocal);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener(SHOCKWAVE_EVENT, onWave);
      window.removeEventListener("deviceorientation", onTilt);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVis);
      mqReduce.removeEventListener("change", onReduce);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="cosmic-field" />;
}
