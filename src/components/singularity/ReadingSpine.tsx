"use client";

import { motion, useScroll, useSpring, useReducedMotion, useTransform } from "framer-motion";

/** Event-horizon reading gutter: a vertical spine that fills as the reader progresses. Desktop only. */
export function ReadingSpine() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const spring = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  const progress = reduce ? scrollYProgress : spring;
  const top = useTransform(progress, (p) => `${Math.max(0, Math.min(1, p)) * 100}%`);
  return (
    <div aria-hidden className="pointer-events-none fixed bottom-[10vh] left-4 top-[10vh] z-30 hidden w-px xl:block" style={{ background: "rgb(var(--sg-ink) / 0.12)" }}>
      <motion.div className="absolute inset-0 origin-top" style={{ scaleY: progress, background: "linear-gradient(to bottom, rgb(var(--sg-ink) / 0.3), rgb(var(--sg-ink)))" }} />
      <motion.span className="absolute -left-[3px] h-[7px] w-[7px] rounded-full" style={{ top, background: "rgb(var(--sg-ink))", boxShadow: "0 0 12px 3px rgb(var(--sg-ink) / 0.5)" }} />
    </div>
  );
}
