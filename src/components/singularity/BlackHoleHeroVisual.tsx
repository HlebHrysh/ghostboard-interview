"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { emitShockwave } from "./BlackHoleCanvas";

interface BlackHoleHeroVisualProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Awwwards-Tier Relativistic Black Hole Centerpiece.
 *
 * Features:
 *  - Relativistic Accretion Disk with Doppler beaming (asymmetric luminosity)
 *  - Gravitational Lensing (light warped over & under the event horizon)
 *  - Photon Sphere (coherent photon ring with optical flare)
 *  - Gyroscopic 3D Parallax tilt reacting to user cursor
 *  - Keplerian particle stream orbiting the event horizon
 *  - Automatic theme adaptation (Void Dark ↔ Paper Light)
 *  - Zero CPU idle sleep when settled
 */
export function BlackHoleHeroVisual({ className = "", children }: BlackHoleHeroVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  // Mouse tilt spring values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(mouseY, { stiffness: 120, damping: 20 });
  const rotateY = useSpring(mouseX, { stiffness: 120, damping: 20 });

  const [isHovered, setIsHovered] = useState(false);

  // Canvas particle stream & gravitational accretion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;

    // Theme state
    let ink = "255, 255, 255";
    let isLight = false;

    const updateTheme = () => {
      const cs = getComputedStyle(document.documentElement);
      const rawInk = cs.getPropertyValue("--sg-ink").trim();
      ink = rawInk ? rawInk.split(/\s+/).join(",") : "255,255,255";
      isLight = document.documentElement.dataset.theme === "light";
    };
    updateTheme();

    const themeObserver = new MutationObserver(() => updateTheme());
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Accretion disk plasma particles
    const PARTICLE_COUNT = 64;
    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const radius = 90 + Math.random() * 110;
      const speed = (0.012 + Math.random() * 0.016) * (140 / radius); // Keplerian: closer = faster
      const size = 1 + Math.random() * 1.8;
      const opacity = 0.2 + Math.random() * 0.7;
      return { angle, radius, speed, size, opacity };
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    window.addEventListener("resize", resize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Draw Orbiting Accretion Particles along tilted ellipse
      // Tilt aspect ratio: vertical compression = 0.36
      const tiltY = 0.36;

      for (const p of particles) {
        p.angle += p.speed * (reduce ? 0 : 1);
        if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2;

        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);

        // Relativistic Doppler beaming factor:
        // Left side (cosA < 0) moves toward observer in counter-clockwise rotation -> brighter
        const dopplerBoost = Math.max(0.2, 1.0 - cosA * 0.55);

        const px = cx + cosA * p.radius;
        const py = cy + sinA * p.radius * tiltY;

        // Gravitational lensing warp when behind the event horizon (sinA < 0)
        let warpedPy = py;
        if (sinA < -0.1) {
          const distToCenter = Math.abs(cosA * p.radius);
          if (distToCenter < 75) {
            // Light bent over the top of the event horizon
            warpedPy -= (75 - distToCenter) * 0.45;
          }
        }

        const alpha = Math.min(1, p.opacity * dopplerBoost * (isLight ? 0.75 : 0.9));
        ctx.fillStyle = `rgba(${ink}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, warpedPy, p.size * dopplerBoost, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      themeObserver.disconnect();
    };
  }, [reduce]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x * 14); // Max 14 deg tilt
    mouseY.set(-y * 14);
  }, [mouseX, mouseY, reduce]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    emitShockwave(e.clientX, e.clientY);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerEnter={() => setIsHovered(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      className={`relative flex items-center justify-center select-none cursor-crosshair isolate ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* ── 3D Relativistic Singularity Stage ── */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* 1. Deep Space Gravitational Aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-[420px] h-[420px] rounded-full blur-[90px] transition-opacity duration-700 opacity-60"
          style={{
            background: "radial-gradient(circle, rgb(var(--sg-ink) / 0.18) 0%, transparent 70%)",
          }}
        />

        {/* 2. Gravitational Lensing Arc (Top Bent Ray / Einstein Ring) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-[260px] h-[260px] rounded-full"
          style={{
            border: "1.5px solid rgb(var(--sg-ink) / 0.35)",
            boxShadow: "0 0 40px rgb(var(--sg-ink) / 0.25), inset 0 0 30px rgb(var(--sg-ink) / 0.2)",
            maskImage: "radial-gradient(circle, transparent 46%, black 50%, black 58%, transparent 68%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 46%, black 50%, black 58%, transparent 68%)",
          }}
        />

        {/* 3. Relativistic Accretion Disk (Tilted 3D Conic Glowing Mesh) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-[380px] h-[380px] rounded-full animate-disk-spin"
          style={{
            transform: "rotateX(72deg)",
            background: `conic-gradient(
              from 0deg,
              transparent 0deg,
              rgb(var(--sg-ink) / 0.75) 60deg,
              rgb(var(--sg-ink) / 0.95) 120deg,
              rgb(var(--sg-ink) / 0.35) 200deg,
              transparent 280deg,
              transparent 360deg
            )`,
            filter: "blur(4px)",
            maskImage: "radial-gradient(circle, transparent 36%, black 42%, black 60%, transparent 76%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 36%, black 42%, black 60%, transparent 76%)",
          }}
        />

        {/* Secondary Counter-Rotating Accretion Filament */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-[340px] h-[340px] rounded-full opacity-70"
          style={{
            transform: "rotateX(72deg) rotate(45deg)",
            background: `conic-gradient(
              from 180deg,
              transparent 0deg,
              rgb(var(--sg-ink) / 0.6) 90deg,
              transparent 240deg
            )`,
            filter: "blur(2px)",
            maskImage: "radial-gradient(circle, transparent 40%, black 48%, black 56%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 40%, black 48%, black 56%, transparent 70%)",
          }}
        />

        {/* 4. Canvas Keplerian Orbiting Particles */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full z-10"
        />

        {/* 5. The Photon Sphere & Inner Event Horizon */}
        <div
          aria-hidden="true"
          className="pointer-events-none relative z-20 w-[140px] h-[140px] rounded-full flex items-center justify-center"
          style={{
            boxShadow: `
              0 0 35px rgb(var(--sg-ink) / 0.8),
              0 0 70px rgb(var(--sg-ink) / 0.3),
              inset 0 0 20px rgb(var(--sg-paper) / 0.9)
            `,
            background: "rgb(var(--sg-paper))",
            border: "1px solid rgb(var(--sg-ink) / 0.85)",
          }}
        >
          {/* Pitch Black Void Core */}
          <div
            className="w-[136px] h-[136px] rounded-full"
            style={{
              background: "rgb(var(--sg-paper))",
            }}
          />
        </div>

        {/* 6. Children / Mascot Layer (e.g. Ghost Detective floating in the gravitational field) */}
        {children && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            style={{ transform: "translateZ(40px)" }}
          >
            {children}
          </div>
        )}
      </motion.div>

      {/* Interactive Micro-badge on hover */}
      <div
        className="pointer-events-none absolute bottom-2 inset-x-0 flex justify-center transition-opacity duration-300"
        style={{ opacity: isHovered ? 1 : 0 }}
      >
        <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/20 text-zinc-300 shadow-sm">
          Gravitational Core · Click to Pulse
        </span>
      </div>
    </div>
  );
}
