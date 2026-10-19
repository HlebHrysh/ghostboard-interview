"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const CRACKS = [
  "M50 0 L46 14 L54 26 L45 41 L55 55 L47 70 L53 84 L50 100",
  "M50 41 L36 47 L28 60 L18 63",
  "M55 55 L68 52 L76 40 L90 38",
  "M47 70 L38 78 L33 92",
];

/** 404 Spacetime Rift: fractured light that parts toward the cursor. */
export function SpacetimeRift({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0);
  const gap = useSpring(useTransform(px, (v) => 6 + Math.abs(v) * 10), { stiffness: 120, damping: 18 });
  const left = useTransform(gap, (g) => -g);

  return (
    <div
      ref={ref}
      className="relative"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set(1 - Math.min(1, Math.abs(e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      }}
      onPointerLeave={() => px.set(0)}
    >
      <div aria-hidden className="pointer-events-none absolute inset-y-[-30%] left-1/2 w-[260px] -translate-x-1/2">
        {[left, gap].map((x, i) => (
          <motion.svg key={i} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" style={{ x, willChange: "transform" }}>
            {CRACKS.map((d, j) => (
              <motion.path
                key={j}
                d={d}
                fill="none"
                                strokeWidth={j === 0 ? 1.2 : 0.7}
                vectorEffect="non-scaling-stroke"
                strokeOpacity={i === 0 ? 0.55 : 0.3}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: j * 0.12, ease: "easeOut" }}
                style={{ stroke: "rgb(var(--sg-ink))", filter: "drop-shadow(0 0 4px rgb(var(--sg-ink) / .6))" }}
              />
            ))}
          </motion.svg>
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
