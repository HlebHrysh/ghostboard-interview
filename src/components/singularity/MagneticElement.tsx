"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { magneticOffset } from "./gravity";

interface MagneticElementProps {
  children: ReactNode;
  className?: string;
  /** Halo around the element (px) in which attraction starts. */
  radius?: number;
  /** 0‥1 fraction of the pointer offset the element follows. */
  strength?: number;
  maxPull?: number;
}

/** Wraps any control; it gently falls toward the cursor inside a 40px halo. Fine pointers only. */
export function MagneticElement({ children, className = "inline-flex", radius = 40, strength = 0.35, maxPull = 14 }: MagneticElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;

    let rect: DOMRect | null = null;
    const invalidate = () => (rect = null);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      // Cheap reject before touching layout.
      rect ??= el.getBoundingClientRect();
      // rect includes the current transform; subtract it to recover the resting centre.
      const cx = rect.left + rect.width / 2 - x.get();
      const cy = rect.top + rect.height / 2 - y.get();
      const o = magneticOffset(e.clientX, e.clientY, cx, cy, rect.width / 2, rect.height / 2, radius, strength, maxPull);
      if (o.x !== x.get() || o.y !== y.get()) {
        x.set(o.x);
        y.set(o.y);
        rect = null;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, [radius, strength, maxPull, x, y]);

  return (
    <motion.div ref={ref} data-magnetic style={{ x: sx, y: sy, willChange: "transform" }} className={className}>
      {children}
    </motion.div>
  );
}
