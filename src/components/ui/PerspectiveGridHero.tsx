"use client";

import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function PerspectiveGridHero() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Soft spring physics for buttery smooth motion
  const springX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 40, damping: 25 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX.set(((e.clientX - centerX) / centerX) * 4);
      mouseY.set(-((e.clientY - centerY) / centerY) * 4);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden [perspective:1000px]">
      <motion.div
        style={{
          rotateX: springY,
          rotateY: springX,
        }}
        className="relative h-[150%] w-[150%] origin-center opacity-25 will-change-transform"
      >
        {/* Monochromatic horizon coordinate grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            maskImage:
              "radial-gradient(ellipse 65% 55% at 50% 50%, black 15%, rgba(0,0,0,0.4) 55%, transparent 85%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 50%, black 15%, rgba(0,0,0,0.4) 55%, transparent 85%)",
          }}
        />
      </motion.div>
    </div>
  );
}
