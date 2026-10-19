"use client";

import { useState, type HTMLAttributes, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion, AnimatePresence } from "framer-motion";

interface GravitationalCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  children: ReactNode;
  /** Max tilt in degrees. */
  tilt?: number;
  /** Local ripple on click (never doubles up with the global wave on inner buttons/links). */
  shockwave?: boolean;
  /** Always-on ember border (e.g. best-value plan). */
  ignited?: boolean;
  /** Classes for the inner content wrapper (e.g. "flex h-full flex-col justify-between"). */
  contentClassName?: string;
}

const INTERACTIVE = 'a[href],button,[role="button"],input,textarea,select';

/**
 * Event-horizon surface: frosted obsidian, 3D tidal tilt, a 1px kinetic light-wrap
 * border that follows the pointer, and a click shockwave.
 */
export function GravitationalCard({ children, className = "", tilt = 5, shockwave = true, ignited = false, contentClassName = "", ...rest }: GravitationalCardProps) {
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 180, damping: 18 });
  const [hover, setHover] = useState(false);
  const [rings, setRings] = useState<{ id: number; x: number; y: number }[]>([]);

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    e.currentTarget.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    e.currentTarget.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    if (!reduce && tilt > 0) {
      ry.set((px - 0.5) * 2 * tilt);
      rx.set((0.5 - py) * 2 * tilt);
    }
  };
  const onLeave = () => {
    setHover(false);
    rx.set(0);
    ry.set(0);
  };
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!shockwave || reduce) return;
    if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const id = performance.now();
    setRings((p) => [...p, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    window.setTimeout(() => setRings((p) => p.filter((q) => q.id !== id)), 420);
  };

  return (
    <motion.div
      {...(rest as object)}
      onPointerEnter={() => setHover(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
      style={{
        rotateX: tilt === 0 ? 0 : rx,
        rotateY: tilt === 0 ? 0 : ry,
        transformPerspective: tilt === 0 ? undefined : 1000,
        transformStyle: tilt === 0 ? undefined : "preserve-3d",
        willChange: tilt === 0 ? undefined : "transform",
        ["--gx" as string]: "50%",
        ["--gy" as string]: "50%",
      }}
      className={`group relative isolate overflow-hidden rounded-2xl sg-glass backdrop-blur-xl ${className}`}
    >
      {/* Static hairline */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/[0.09]" />
      {/* Kinetic 1px light-wrap */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: ignited ? 1 : hover ? 1 : 0,
          padding: 1,
          background: "radial-gradient(280px circle at var(--gx) var(--gy), rgb(var(--sg-ink) / 0.85), rgb(var(--sg-ink) / 0.12) 45%, transparent 70%)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        }}
      />
      {/* Interior glare */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{ opacity: hover ? 1 : 0, background: "radial-gradient(360px circle at var(--gx) var(--gy), rgb(var(--sg-ink) / 0.06), transparent 65%)" }}
      />
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
      <AnimatePresence>
        {rings.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute z-20 rounded-full border"
            style={{ borderColor: "rgb(var(--sg-ink) / 0.6)", left: r.x, top: r.y, width: 24, height: 24, marginLeft: -12, marginTop: -12 }}
            initial={{ scale: 0.2, opacity: 0.8 }}
            animate={{ scale: 14, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
