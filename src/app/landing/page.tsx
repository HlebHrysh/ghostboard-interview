"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { ShieldCheck, Award, Sparkles, Volume2, ArrowRight } from "lucide-react";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { NoirHero } from "@/components/landing/NoirHero";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { useLocale } from "@/contexts/LocaleContext";
import { LangDropdown } from "@/components/ui/LangDropdown";
/* ─────────────────────────────────────────────
   Animation constants
───────────────────────────────────────────── */
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 35 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.08, ease: EASE },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

function useAnimInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return { ref, inView };
}

/* ─────────────────────────────────────────────
   Noise overlay
───────────────────────────────────────────── */
const NoiseOverlay = () => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 z-[999] opacity-[0.025]"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      backgroundRepeat: "repeat",
      backgroundSize: "128px 128px",
      mixBlendMode: "overlay",
    }}
  />
);

/* ─────────────────────────────────────────────
   Kinetic Counter
───────────────────────────────────────────── */
function KineticCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setVal(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Magnetic Button
───────────────────────────────────────────── */
function MagneticCTA({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.22;
    const dy = (e.clientY - cy) * 0.22;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);

  const handleLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = "translate(0,0)";
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" }}
    >
      {children}
    </Link>
  );
}

/* ─────────────────────────────────────────────
   Section Label
───────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.22em] uppercase text-[#C8F135]">
      <span className="w-4 h-px bg-[#C8F135]" />
      {children}
    </span>
  );
}

import { LANDING_COPY } from '@/lib/landingI18n';

const COPY = LANDING_COPY;

/* ─────────────────────────────────────────────
   Ticker Component
───────────────────────────────────────────── */
function Ticker({ items, direction = 1 }: { items: string[]; direction?: 1 | -1 }) {
  const repeated = [...items, ...items];
  return (
    <div className="overflow-hidden select-none">
      <motion.div
        className="flex gap-16 whitespace-nowrap"
        animate={{ x: direction === 1 ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {repeated.map((item, i) => (
          <span
            key={i}
            className="text-[11px] font-mono font-bold tracking-[0.18em] uppercase text-zinc-500 flex items-center gap-6 shrink-0"
          >
            {item}
            <span className="text-[#C8F135] opacity-60">◆</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Interactive Live Demo Component (3D Holographic HUD Answer Card)
───────────────────────────────────────────── */
function LiveDemo({ c }: { c: any }) {
  const [frozen, setFrozen] = useState(false);
  const [visible, setVisible] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // up to 12 deg tilt
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = 'transform 0.1s ease-out';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = 'transform 0.5s ease-out';
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  useEffect(() => {
    setVisible(0);
  }, [c]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!frozen) setVisible((v) => Math.min(v + 1, c.points.length));
    }, 950);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [frozen, c.points.length]);

  const reset = () => {
    setVisible(0);
    setFrozen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setFrozen((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="holo-tilt-card group relative w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-zinc-900/95 via-zinc-950/98 to-black border-2 border-white/15 hover:border-[#C8F135]/40 shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden cursor-pointer select-none transition-transform duration-100 ease-out"
    >
      {/* Dynamic Cursor Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(200, 241, 53, 0.12), transparent 45%)',
        }}
      />

      {/* Holographic Sheen Overlay */}
      <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-45 pointer-events-none animate-pulse" />

      {/* Top Brand Bar */}
      <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C8F135] shadow-[0_0_12px_#C8F135] animate-pulse" />
          <span className="font-mono font-black text-xs sm:text-sm tracking-widest text-[#C8F135]">
            GHOSTBOARD
          </span>
          <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
            LIVE COPILOT HUD
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-emerald-400 mr-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PRIVACY 100%</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFrozen((f) => !f);
            }}
            className={`font-mono text-[10px] tracking-widest font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
              frozen
                ? "bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                : "bg-white/5 border-white/20 text-zinc-300 hover:border-[#C8F135]/50 hover:text-[#C8F135]"
            }`}
          >
            {frozen ? c.freeze_active : c.freeze_idle}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="font-mono text-[10px] text-zinc-500 hover:text-zinc-300 tracking-widest cursor-pointer px-2 py-1"
          >
            {c.reset}
          </button>
        </div>
      </div>

      <div className="my-5 space-y-4 relative z-10">
        {/* Question Container */}
        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-zinc-400 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {c.question_tag}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">0.4s STT</span>
          </div>
          <p className="text-zinc-200 text-sm leading-relaxed font-sans font-medium">
            {c.question_text}
          </p>
        </div>

        {/* Answer Container */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-black/40 border border-[#C8F135]/30 shadow-[0_0_30px_rgba(200,241,53,0.06)] space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#C8F135] uppercase font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
                {c.ai_tag}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                98.4% Confidence
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 font-bold">
              {c.level}
            </span>
          </div>

          <p className="text-sm text-zinc-100 leading-relaxed font-sans font-semibold">
            {c.lead}
          </p>

          <div className="space-y-2.5">
            <AnimatePresence>
              {c.points.slice(0, visible).map((pt: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5"
                >
                  <span className="font-mono text-[10px] font-bold text-[#C8F135] bg-[#C8F135]/10 px-2 py-0.5 rounded shrink-0 mt-0.5 tracking-wider border border-[#C8F135]/20">
                    {pt.tag}
                  </span>
                  <span className="text-xs text-zinc-300 leading-relaxed font-sans">{pt.body}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {visible < c.points.length && !frozen && (
              <div className="flex items-center gap-2 pt-1">
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                  className="font-mono text-xs text-[#C8F135]"
                >
                  █
                </motion.span>
                <span className="font-mono text-[11px] text-zinc-500">{c.generating}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/8 font-sans text-xs text-zinc-400 flex items-center gap-2">
            <span>{c.tip}</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid (matches the 3D scorecard aesthetic!) */}
      <div className="grid grid-cols-3 gap-2.5 my-4 relative z-10">
        <div className="p-3 rounded-2xl bg-black/50 border border-white/5 text-center">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">{c.m_speed}</span>
          <span className="text-base sm:text-lg font-black text-[#C8F135] font-mono">1.35с</span>
        </div>
        <div className="p-3 rounded-2xl bg-black/50 border border-white/5 text-center">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">{c.m_acc}</span>
          <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">98.4%</span>
        </div>
        <div className="p-3 rounded-2xl bg-black/50 border border-white/5 text-center">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">{c.m_level}</span>
          <span className="text-base sm:text-lg font-black text-cyan-400 font-mono">Staff / L6</span>
        </div>
      </div>

      {/* Tech Badges */}
      <div className="flex flex-wrap gap-1.5 my-3 justify-center relative z-10">
        {['PostgreSQL', 'FastAPI', 'MVCC', 'System Design', 'Redis', 'Docker'].map((tech) => (
          <span
            key={tech}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] sm:text-[11px] font-mono text-zinc-300"
          >
            #{tech}
          </span>
        ))}
      </div>

      {/* Bottom Watermark */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-500 relative z-10">
        <span>ghostboard.tech</span>
        <span>AI COPILOT FOR TECH INTERVIEWS</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Split Text Component
───────────────────────────────────────────── */
function SplitText({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={className} aria-label={text} style={style}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={{
            hidden: { opacity: 0, y: "100%" },
            visible: (idx) => ({
              opacity: 1,
              y: "0%",
              transition: { duration: 0.6, delay: idx * 0.025, ease: EASE },
            }),
          }}
          className="inline-block"
          style={{ display: ch === " " ? "inline" : "inline-block", overflow: "hidden" }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </span>
  );
}

import type { SupportedLocale } from '@/lib/geoLang';

const LANDING_BTNS: Record<SupportedLocale, {
  tryLive: string;
  soundCheck: string;
  testAction: string;
  testSlang: string;
  guide2ndScreen: string;
  viewPricing: string;
}> = {
  ua: {
    tryLive: 'Спробувати в реальному дзвінку →',
    soundCheck: 'Тест звуку (30 сек)',
    testAction: 'Випробувати в дії',
    testSlang: 'AI Тренажер сленгу',
    guide2ndScreen: 'Гайд 2-го екрана',
    viewPricing: 'ДИВИТИСЯ ТАРИФИ →',
  },
  en: {
    tryLive: 'Try in Live Interview →',
    soundCheck: 'Sound Check (30s)',
    testAction: 'Test in action',
    testSlang: 'Test slang in simulator',
    guide2ndScreen: 'Teleprompter guide',
    viewPricing: 'VIEW ALL PLANS →',
  },
  pl: {
    tryLive: 'Wypróbuj w rozmowie na żywo →',
    soundCheck: 'Test dźwięku (30 sek)',
    testAction: 'Przetestuj w akcji',
    testSlang: 'Symulator slangu AI',
    guide2ndScreen: 'Przewodnik 2. ekranu',
    viewPricing: 'ZOBACZ CENNIK →',
  },
  de: {
    tryLive: 'Im Live-Interview testen →',
    soundCheck: 'Soundcheck (30 Sek.)',
    testAction: 'In Aktion testen',
    testSlang: 'KI-Slang-Simulator',
    guide2ndScreen: 'Leitfaden 2. Bildschirm',
    viewPricing: 'PREISE ANSEHEN →',
  },
  fr: {
    tryLive: 'Tester en entretien réel →',
    soundCheck: 'Test audio (30 sec)',
    testAction: 'Tester en direct',
    testSlang: 'Simulateur de jargon IA',
    guide2ndScreen: 'Guide 2nd écran',
    viewPricing: 'VOIR LES TARIFS →',
  },
  es: {
    tryLive: 'Probar en entrevista real →',
    soundCheck: 'Test de audio (30s)',
    testAction: 'Probar en acción',
    testSlang: 'Simulador de jerga IA',
    guide2ndScreen: 'Guía de 2.ª pantalla',
    viewPricing: 'VER TARIFAS →',
  },
  pt: {
    tryLive: 'Testar em entrevista real →',
    soundCheck: 'Teste de áudio (30s)',
    testAction: 'Testar na prática',
    testSlang: 'Simulador de gírias dev',
    guide2ndScreen: 'Guia da 2ª tela',
    viewPricing: 'VER PLANOS →',
  },
  it: {
    tryLive: 'Prova in colloquio reale →',
    soundCheck: 'Test audio (30 sec)',
    testAction: 'Prova in azione',
    testSlang: 'Simulatore slang tech',
    guide2ndScreen: 'Guida 2° schermo',
    viewPricing: 'VEDI I PIANI →',
  },
  cs: {
    tryLive: 'Vyzkoušet při pohovoru →',
    soundCheck: 'Test zvuku (30 s)',
    testAction: 'Vyzkoušet v akci',
    testSlang: 'AI trenažér slangu',
    guide2ndScreen: 'Průvodce 2. obrazovkou',
    viewPricing: 'ZOBRAZIT TARIFY →',
  },
  nl: {
    tryLive: 'Testen in live interview →',
    soundCheck: 'Geluidscheck (30s)',
    testAction: 'Test in actie',
    testSlang: 'AI jargon simulator',
    guide2ndScreen: 'Gids voor 2e scherm',
    viewPricing: 'BEKIJK TARIEVEN →',
  },
};

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  // Use global locale context — syncs with navbar switcher
  const { locale: globalLocale } = useLocale();
  const t = COPY[globalLocale] || COPY['en'];
  const btn = LANDING_BTNS[globalLocale] || LANDING_BTNS.en;


  // Section animations
  const featuresAnim = useAnimInView();
  const demoAnim = useAnimInView();
  const compAnim = useAnimInView();
  const pricingAnim = useAnimInView();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 overflow-x-hidden selection:bg-[#C8F135] selection:text-black">
      <NoiseOverlay />

      {/* ── TOP STICKY NAVIGATION ── */}
      <UnifiedNavbar />

      {/* ── HERO SECTION ── */}
      <NoirHero />

      {/* ── METRICS (Kept from old hero) ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 lg:py-12 border-b border-white/[0.06] bg-[#0A0A0B]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
          <div>
            <div className="font-mono font-black text-[#C8F135] text-3xl lg:text-5xl">
              <KineticCounter target={1420} suffix="+" />
            </div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-2">
              {t.hero.stat_sessions}
            </div>
          </div>
          <div>
            <div className="font-mono font-black text-[#C8F135] text-3xl lg:text-5xl">
              <KineticCounter target={116} suffix="+" />
            </div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-2">
              {t.hero.stat_rules}
            </div>
          </div>
          <div>
            <div className="font-mono font-black text-[#C8F135] text-3xl lg:text-5xl">
              <KineticCounter target={100} suffix="%" />
            </div>
            <div className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase mt-2">
              {t.hero.stat_stealth}
            </div>
          </div>
        </div>
      </div>

      {/* ── TICKER STRIP 1 ── */}
      <div className="border-y border-white/[0.06] py-3.5 overflow-hidden bg-[#0D0D0F]">
        <Ticker items={t.tickers.t1} direction={1} />
      </div>

      {/* ── DEMO SECTION ── */}
      <section id="demo" className="py-24 sm:py-32 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            ref={demoAnim.ref}
            initial="hidden"
            animate={demoAnim.inView ? "visible" : "hidden"}
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12 lg:gap-16 items-start"
          >
            {/* Left column */}
            <div>
              <motion.div variants={fadeUp}>
                <Label>{t.demo.label}</Label>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-white font-black uppercase tracking-tight leading-[0.95] text-3xl sm:text-4xl lg:text-5xl font-sans"
              >
                {t.demo.title}
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-5 text-zinc-400 leading-relaxed font-sans text-sm sm:text-base">
                {t.demo.desc}
              </motion.p>

              {/* Feature checkpoints */}
              <motion.div variants={fadeUp} className="mt-10 space-y-3.5">
                {[
                  { id: "01", label: t.demo.f1 },
                  { id: "02", label: t.demo.f2 },
                  { id: "03", label: t.demo.f3 },
                  { id: "04", label: t.demo.f4 },
                ].map((f) => (
                  <div key={f.id} className="flex items-center gap-4 group">
                    <span className="font-mono text-[10px] text-zinc-600 group-hover:text-[#C8F135] transition-colors">
                      {f.id}
                    </span>
                    <span className="flex-1 h-px bg-white/10 group-hover:bg-[#C8F135]/30 transition-colors" />
                    <span className="font-sans text-xs sm:text-sm text-zinc-300 group-hover:text-white transition-colors">
                      {f.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right column — 3D Holographic Live AI Answer Card */}
            <motion.div variants={fadeUp} className="w-full flex flex-col items-center lg:items-end gap-4">
              <LiveDemo c={t.demo} />
              <div className="flex flex-wrap items-center gap-3 w-full justify-center lg:justify-end">
                <Link
                  href="/interview"
                  className="px-5 py-2.5 rounded-xl bg-[#C8F135] hover:bg-white text-black font-mono font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(200,241,53,0.3)] active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>{btn.tryLive}</span>
                </Link>
                <Link
                  href="/interview?modal=soundcheck"
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-xs transition-all flex items-center gap-2"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>{btn.soundCheck}</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section id="features" className="py-24 sm:py-32 px-4 sm:px-8 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            ref={featuresAnim.ref}
            initial="hidden"
            animate={featuresAnim.inView ? "visible" : "hidden"}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex items-end justify-between mb-14 gap-6 flex-wrap">
              <div>
                <Label>{t.features.label}</Label>
                <h2 className="mt-4 text-white font-black uppercase tracking-tight leading-[0.95] text-3xl sm:text-4xl lg:text-5xl font-sans">
                  {t.features.title}
                </h2>
              </div>
              <p className="text-zinc-500 text-xs sm:text-sm max-w-xs text-left lg:text-right font-sans">
                {t.features.subtitle}
              </p>
            </motion.div>

            {/* Asymmetric brutalist grid */}
            <div className="grid grid-cols-12 gap-px bg-white/[0.08]">
              {/* Feature 1 — FREEZE MODE */}
              <motion.div
                variants={fadeUp}
                className="col-span-12 md:col-span-7 bg-[#0A0A0B] p-8 sm:p-12 group hover:bg-[#0D0D0F] transition-colors"
              >
                <div className="flex items-start justify-between mb-8">
                  <span className="font-mono text-[10px] tracking-widest text-zinc-500">{t.features.c1_tag}</span>
                  <span className="font-mono text-[10px] text-[#C8F135] bg-[#C8F135]/10 px-2 py-0.5 border border-[#C8F135]/20">
                    {t.features.c1_badge}
                  </span>
                </div>
                <h3 className="text-white leading-tight mb-4 font-black uppercase tracking-tight text-xl sm:text-2xl lg:text-3xl font-sans">
                  {t.features.c1_title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-md font-sans">
                  {t.features.c1_desc}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="font-mono text-[11px] text-cyan-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    {t.features.c1_status}
                  </div>
                  <Link
                    href="/interview"
                    className="font-mono text-xs text-[#C8F135] hover:text-white flex items-center gap-1.5 transition-colors group/btn"
                  >
                    <span>{btn.testAction}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>

              {/* Feature 2 — SCREEN OCR */}
              <motion.div
                variants={fadeUp}
                className="col-span-12 md:col-span-5 bg-[#0A0A0B] p-8 sm:p-12 group hover:bg-[#0D0D0F] transition-colors border-l border-white/[0.06]"
              >
                <div className="mb-8">
                  <span className="font-mono text-[10px] tracking-widest text-zinc-500">{t.features.c2_tag}</span>
                </div>
                <h3 className="text-white leading-tight mb-4 font-black uppercase tracking-tight text-xl sm:text-2xl lg:text-3xl font-sans">
                  {t.features.c2_title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-sans">
                  {t.features.c2_desc}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="font-mono text-[11px] p-2.5 border border-amber-500/20 text-amber-400 bg-amber-950/15 inline-block">
                    {t.features.c2_status}
                  </div>
                  <Link
                    href="/interview"
                    className="font-mono text-xs text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors group/btn"
                  >
                    <span>[F9 OCR]</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>

              {/* Feature 3 — PANIC SHIELD */}
              <motion.div
                variants={fadeUp}
                className="col-span-12 md:col-span-4 bg-[#0A0A0B] p-8 sm:p-10 group hover:bg-[#0D0D0F] transition-colors border-t border-white/[0.06]"
              >
                <span className="font-mono text-[10px] tracking-widest text-zinc-500 block mb-6">{t.features.c3_tag}</span>
                <h3 className="text-white leading-tight mb-3 font-black uppercase tracking-tight text-lg sm:text-xl font-sans">
                  {t.features.c3_title}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans mb-6">
                  {t.features.c3_desc}
                </p>
                <div className="font-mono text-[11px] text-zinc-400 bg-black p-3 border border-white/10">
                  $ pytest tests/test_async_worker.py -v<br />
                  <span className="text-emerald-400 font-bold">PASSED [100%]</span>
                </div>
                <div className="mt-4">
                  <Link
                    href="/interview"
                    className="font-mono text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors group/btn"
                  >
                    <span>[Esc Shield]</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>

              {/* Feature 4 — IT PHONETICS */}
              <motion.div
                variants={fadeUp}
                className="col-span-12 md:col-span-4 bg-[#0A0A0B] p-8 sm:p-10 group hover:bg-[#0D0D0F] transition-colors border-t border-l border-white/[0.06]"
              >
                <span className="font-mono text-[10px] tracking-widest text-zinc-500 block mb-6">{t.features.c4_tag}</span>
                <h3 className="text-white leading-tight mb-3 font-black uppercase tracking-tight text-lg sm:text-xl font-sans">
                  {t.features.c4_title}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans mb-6">
                  {t.features.c4_desc}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["UA 🇺🇦", "EN 🇬🇧", "116+ Rules"].map((badge) => (
                    <span key={badge} className="font-mono text-[10px] px-2.5 py-1 border border-violet-500/30 text-violet-300 bg-violet-950/20">
                      {badge}
                    </span>
                  ))}
                </div>
                <Link
                  href="/mock-interview"
                  className="font-mono text-xs text-violet-400 hover:text-white flex items-center gap-1.5 transition-colors group/btn"
                >
                  <span>{btn.testSlang}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </motion.div>

              {/* Feature 5 — HUD TELEPROMPTER */}
              <motion.div
                variants={fadeUp}
                className="col-span-12 md:col-span-4 bg-[#0A0A0B] p-8 sm:p-10 group hover:bg-[#0D0D0F] transition-colors border-t border-l border-white/[0.06]"
              >
                <span className="font-mono text-[10px] tracking-widest text-zinc-500 block mb-6">{t.features.c5_tag}</span>
                <h3 className="text-white leading-tight mb-3 font-black uppercase tracking-tight text-lg sm:text-xl font-sans">
                  {t.features.c5_title}
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-sans mb-6">
                  {t.features.c5_desc}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#C8F135] bg-[#C8F135]/10 px-3 py-1 border border-[#C8F135]/25 inline-block">
                    {t.features.c5_status}
                  </span>
                  <Link
                    href="/guide"
                    className="font-mono text-xs text-[#C8F135] hover:text-white flex items-center gap-1.5 transition-colors group/btn"
                  >
                    <span>{btn.guide2ndScreen}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>

              {/* Feature 6 — ZERO SETUP (wide banner) */}
              <motion.div
                variants={fadeUp}
                className="col-span-12 bg-[#C8F135]/[0.04] border-t border-[#C8F135]/20 p-8 sm:p-12 hover:bg-[#C8F135]/[0.07] transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div>
                    <span className="font-mono text-[10px] tracking-widest text-zinc-500 block mb-3">{t.features.c6_tag}</span>
                    <h3 className="text-white leading-tight font-black uppercase tracking-tight text-2xl sm:text-3xl font-sans">
                      {t.features.c6_title}
                    </h3>
                    <p className="text-zinc-400 text-sm mt-3 max-w-xl font-sans">
                      {t.features.c6_desc}
                    </p>
                  </div>
                  <MagneticCTA
                    href="/auth/signup"
                    className="font-mono font-bold text-xs sm:text-sm tracking-widest px-8 py-4 bg-[#C8F135] text-black hover:bg-white transition-colors shrink-0 shadow-lg"
                  >
                    {t.features.c6_cta}
                  </MagneticCTA>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TICKER STRIP 2 ── */}
      <div className="border-y border-white/[0.06] py-3.5 overflow-hidden bg-[#0D0D0F]">
        <Ticker items={t.tickers.t2} direction={-1} />
      </div>

      {/* ── COMPARISON TABLE ── */}
      <section id="comparison" className="py-24 sm:py-32 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            ref={compAnim.ref}
            initial="hidden"
            animate={compAnim.inView ? "visible" : "hidden"}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-14">
              <Label>{t.comparison.label}</Label>
              <h2 className="mt-4 text-white font-black uppercase tracking-tight leading-[0.95] text-3xl sm:text-4xl lg:text-5xl font-sans">
                {t.comparison.title}
              </h2>
            </motion.div>

            <motion.div variants={fadeUp} className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 pr-8 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.comparison.col_product}</th>
                    <th className="text-center py-4 px-4 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.comparison.col_price}</th>
                    <th className="text-center py-4 px-4 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.comparison.col_speed}</th>
                    <th className="text-center py-4 px-4 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.comparison.col_freeze}</th>
                    <th className="text-center py-4 px-4 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.comparison.col_ocr}</th>
                    <th className="text-center py-4 px-4 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.comparison.col_nokeys}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Final Round AI", price: "$24/mo", speed: "3–5s", freeze: false, ocr: false, noKeys: true },
                    { name: "Yoodli", price: "$16/mo", speed: "4s+", freeze: false, ocr: false, noKeys: true },
                    { name: "Interviews.chat", price: "$25/mo", speed: "3s+", freeze: false, ocr: false, noKeys: false },
                    { name: "Ghostboard Studio", price: "$15/mo", speed: "1.4s", freeze: true, ocr: true, noKeys: true, isUs: true },
                  ].map((c) => (
                    <tr
                      key={c.name}
                      className={`border-b transition-colors ${
                        c.isUs ? "border-[#C8F135]/25 bg-[#C8F135]/[0.05]" : "border-white/5 hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-5 pr-8">
                        {c.isUs ? (
                          <span className="flex items-center gap-2 font-mono text-[13px] font-bold text-[#C8F135]">
                            <GhostDetectiveLogo size="mini" />
                            <span>{c.name}</span>
                            <span className="text-[9px] px-2 py-0.5 bg-[#C8F135] text-black font-black tracking-widest">
                              LEADER
                            </span>
                          </span>
                        ) : (
                          <span className="font-mono text-[13px] text-zinc-300">{c.name}</span>
                        )}
                      </td>
                      <td className={`text-center px-4 font-mono text-[13px] ${c.isUs ? "text-[#C8F135] font-bold" : "text-zinc-400"}`}>{c.price}</td>
                      <td className={`text-center px-4 font-mono text-[13px] font-bold ${c.isUs ? "text-[#C8F135]" : "text-zinc-400"}`}>{c.speed}</td>
                      <td className="text-center px-4 font-mono text-[13px]">{c.freeze ? <span className="text-[#C8F135] font-bold">✓</span> : <span className="text-zinc-600">—</span>}</td>
                      <td className="text-center px-4 font-mono text-[13px]">{c.ocr ? <span className="text-[#C8F135] font-bold">✓</span> : <span className="text-zinc-600">—</span>}</td>
                      <td className="text-center px-4 font-mono text-[13px]">
                        {c.noKeys ? (
                          <span className="text-emerald-400 font-semibold">{t.comparison.yes}</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">{t.comparison.no}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── PRICING CTA SECTION ── */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-8 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            ref={pricingAnim.ref}
            initial="hidden"
            animate={pricingAnim.inView ? "visible" : "hidden"}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-12">
              <div>
                <Label>{t.pricing.label}</Label>
                <h2 className="mt-4 text-white font-black uppercase tracking-tight leading-[0.95] text-3xl sm:text-4xl lg:text-5xl font-sans">
                  {t.pricing.title}
                </h2>
                <p className="mt-3 text-zinc-400 font-sans text-sm max-w-md">
                  {t.pricing.subtitle}
                </p>
              </div>
              <MagneticCTA
                href="/pricing"
                className="font-mono font-black text-xs sm:text-sm tracking-widest px-8 py-4 bg-[#C8F135] text-black hover:bg-white transition-colors shrink-0 shadow-[0_0_30px_rgba(200,241,53,0.3)]"
              >
                {btn.viewPricing}
              </MagneticCTA>
            </motion.div>

            {/* 3-column teaser — Free / Pro / Lifetime */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.08]">
              {/* Free */}
              <div className="bg-[#0A0A0B] p-8 flex flex-col gap-3">
                <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.pricing.free_tier}</span>
                <div className="font-mono font-black text-white text-4xl">$0</div>
                <div className="font-mono text-[11px] text-zinc-500">{t.pricing.free_badge}</div>
                <ul className="space-y-2 font-sans text-xs text-zinc-400 mt-2">
                  {t.pricing.free_features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2"><span className="text-zinc-600">◆</span>{f}</li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="mt-4 block text-center font-mono font-bold text-[11px] tracking-widest py-3 border border-white/20 text-zinc-300 hover:border-white hover:text-white transition-all"
                >
                  {t.pricing.free_cta}
                </Link>
              </div>

              {/* Pro (featured) */}
              <div className="bg-[#0D0D0F] p-8 flex flex-col gap-3 relative border border-[#C8F135]/30 shadow-[0_0_60px_rgba(200,241,53,0.06)]">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C8F135]" />
                <span className="absolute -top-3 left-8 font-mono text-[9px] tracking-widest bg-[#C8F135] text-black px-3 py-0.5 font-black uppercase">{t.pricing.pro_badge}</span>
                <span className="font-mono text-[10px] tracking-widest text-[#C8F135] uppercase">{t.pricing.pro_tier}</span>
                <div className="font-mono font-black text-[#C8F135] text-4xl">$15</div>
                <div className="font-mono text-[11px] text-zinc-500">{t.pricing.per_month}</div>
                <ul className="space-y-2 font-sans text-xs text-zinc-200 mt-2">
                  {t.pricing.pro_features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2"><span className="text-[#C8F135]">◆</span>{f}</li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="mt-4 block text-center font-mono font-bold text-[11px] tracking-widest py-3 bg-[#C8F135] text-black hover:bg-white transition-colors"
                >
                  {t.pricing.pro_cta}
                </Link>
              </div>

              {/* Lifetime */}
              <div className="bg-[#0A0A0B] p-8 flex flex-col gap-3">
                <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">{t.pricing.life_tier}</span>
                <div className="font-mono font-black text-white text-4xl">$79</div>
                <div className="font-mono text-[11px] text-zinc-500">{t.pricing.one_time}</div>
                <ul className="space-y-2 font-sans text-xs text-zinc-400 mt-2">
                  {t.pricing.life_features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2"><span className="text-zinc-600">◆</span>{f}</li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="mt-4 block text-center font-mono font-bold text-[11px] tracking-widest py-3 border border-white/20 text-zinc-300 hover:border-white hover:text-white transition-all"
                >
                  {t.pricing.life_cta}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA SECTION ── */}
      <section className="relative py-28 sm:py-40 px-4 sm:px-8 overflow-hidden border-t border-white/[0.06]">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(200,241,53,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-[1400px] mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex justify-center mb-6"
          >
            <GhostDetectiveLogo size="hero" animated={true} />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
            className="text-white leading-[0.95] font-black uppercase tracking-tight text-3xl sm:text-5xl lg:text-6xl font-sans"
          >
            {t.cta.title_part1}
            <span className="text-[#C8F135]">{t.cta.title_accent}</span>
            {t.cta.title_part2}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-5"
          >
            <MagneticCTA
              href="/auth/signup"
              className="font-mono font-black text-xs sm:text-sm tracking-widest px-8 sm:px-10 py-4 sm:py-5 bg-[#C8F135] text-black hover:bg-white transition-colors shadow-[0_0_40px_rgba(200,241,53,0.35)]"
            >
              {t.cta.btn}
            </MagneticCTA>
            <Link
              href="/auth/login"
              className="font-mono text-[11px] tracking-widest text-zinc-400 hover:text-white transition-colors py-3 px-4"
            >
              {t.cta.login}
            </Link>
          </motion.div>
          <p className="mt-6 font-mono text-[11px] tracking-widest text-zinc-600">
            {t.cta.sub}
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <UnifiedFooter />
    </div>
  );
}
