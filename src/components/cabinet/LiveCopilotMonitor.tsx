"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  Monitor,
  Smartphone,
  Cpu,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Volume2,
  Zap,
  Play,
} from "lucide-react";
import { GravitationalCard } from "@/components/singularity/GravitationalCard";

interface QAItem {
  id: string;
  question: string;
  shortAnswer: string;
  bullets?: string[];
  code?: string;
  lang?: string;
  timestamp?: number;
}

interface LiveCopilotMonitorProps {
  locale: string;
  userEmail?: string;
}

export function LiveCopilotMonitor({ locale, userEmail }: LiveCopilotMonitorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeQA, setActiveQA] = useState<QAItem | null>(null);
  const [sttStatus, setSttStatus] = useState<string>("idle");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [connectedDevices, setConnectedDevices] = useState<{ desktop?: boolean; web?: boolean; phone?: boolean }>({
    desktop: false,
    web: false,
    phone: false,
  });
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to SSE stream
  useEffect(() => {
    let sse: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        sse = new EventSource("/api/companion/stream?device=web");
        eventSourceRef.current = sse;

        sse.onopen = () => {
          setIsConnected(true);
        };

        sse.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "NEW_QA" && data.payload) {
              setActiveQA({
                id: data.payload.id || String(Date.now()),
                question: data.payload.question || "",
                shortAnswer: data.payload.shortAnswer || data.payload.answer || "",
                bullets: data.payload.bullets || [],
                code: data.payload.code || "",
                lang: data.payload.lang || "typescript",
                timestamp: data.payload.timestamp || Date.now(),
              });
            } else if (data.type === "STATUS" && data.payload) {
              setSttStatus(data.payload.sttStatus || "idle");
              setIsCapturing(!!data.payload.isCapturing);
              setIsFrozen(!!data.payload.isFrozen);
            } else if (data.type === "FREEZE_TOGGLE") {
              setIsFrozen(!!data.payload?.isFrozen);
            }
          } catch {}
        };

        sse.onerror = () => {
          setIsConnected(false);
          if (sse) {
            sse.close();
            sse = null;
          }
        };
      } catch {
        setIsConnected(false);
      }
    };

    // Initial state fetch & polling fallback
    const fetchLatestSync = async () => {
      try {
        const res = await fetch("/api/ai/interview-sync");
        if (res.ok) {
          const data = await res.json();
          if (data.qas && data.qas.length > 0) {
            const latest = data.qas.find((q: { id?: string }) => q.id === data.activeId) || data.qas[0];
            if (latest) {
              setActiveQA({
                id: latest.id,
                question: latest.question,
                shortAnswer: latest.shortAnswer || latest.answer || "",
                bullets: latest.bullets || [],
                code: latest.code || "",
                lang: latest.lang || "typescript",
                timestamp: latest.timestamp || Date.now(),
              });
            }
          }
          if (data.sttStatus) setSttStatus(data.sttStatus);
          if (typeof data.isCapturing === "boolean") setIsCapturing(data.isCapturing);
          if (typeof data.isFrozen === "boolean") setIsFrozen(data.isFrozen);
          if (data.connectedDevices) setConnectedDevices(data.connectedDevices);
          if (data.liveTranscript) setLiveTranscript(data.liveTranscript);
        }
      } catch {}
    };

    fetchLatestSync();
    connectSSE();

    // Check periodically for state updates and device ping
    pollInterval = setInterval(fetchLatestSync, 3000);

    return () => {
      if (sse) sse.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  const handleCopy = () => {
    if (!activeQA) return;
    const textToCopy = `${activeQA.question}\n\n${activeQA.shortAnswer}${
      activeQA.bullets && activeQA.bullets.length > 0 ? "\n\n" + activeQA.bullets.map((b) => `• ${b}`).join("\n") : ""
    }${activeQA.code ? "\n\n```" + (activeQA.lang || "ts") + "\n" + activeQA.code + "\n```" : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success(locale === "ua" ? "Відповідь скопійовано" : "Answer copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerTest = async () => {
    setIsSimulating(true);
    try {
      const testQA = {
        id: "qa-test-" + Date.now(),
        question:
          locale === "ua"
            ? "Як забезпечити Exactly-Once семантику в розподілених системах (Kafka + DB)?"
            : "How do you guarantee Exactly-Once semantics across Kafka consumers and SQL databases?",
        shortAnswer:
          locale === "ua"
            ? "Через патерн Transactional Outbox або двофазний коміт (2PC). Споживач фіксує offset Kafka та записує стан у БД в єдиній локальній транзакції або забезпечує ідемпотентність через dedup-ключі."
            : "Combine the Transactional Outbox pattern with idempotent consumer deduplication. Read records, execute DB mutation + save offset/idempotency key within a single local DB transaction.",
        bullets: [
          locale === "ua"
            ? "Transactional Outbox: події записуються в outbox-таблицю перед пушем"
            : "Transactional Outbox: state & outbox events commit together atomically",
          locale === "ua"
            ? "Ідемпотентні ключі: deduplication на рівні Redis/PostgreSQL UNIQUE"
            : "Idempotent keys: dedup layer via Redis TTL or PostgreSQL unique constraint",
          locale === "ua"
            ? "Isolation Level: READ COMMITTED / SERIALIZABLE для запобігання race conditions"
            : "Isolation Level: READ COMMITTED / SERIALIZABLE prevents race conditions",
        ],
        code: `// Atomically store idempotency key and state in single transaction\nawait prisma.$transaction(async (tx) => {\n  const existing = await tx.processedEvent.findUnique({ where: { eventId } });\n  if (existing) return; // Deduplicated\n  await tx.processedEvent.create({ data: { eventId, processedAt: new Date() } });\n  await tx.orders.update({ where: { id: orderId }, data: { status: 'PAID' } });\n});`,
        lang: "typescript",
        timestamp: Date.now(),
      };

      const res = await fetch("/api/ai/interview-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_OR_UPDATE_QA",
          qa: testQA,
          device: "web",
          activeId: testQA.id,
        }),
      });

      if (res.ok) {
        setActiveQA(testQA);
        toast.success(
          locale === "ua"
            ? "Тестове запитання надіслано в реальному часі на всі пристрої!"
            : "Live test QA broadcasted to all connected HUD devices!"
        );
      }
    } catch {
      toast.error(locale === "ua" ? "Помилка передачі тестового сигналу" : "Failed to broadcast test signal");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Radio className={`w-4 h-4 ${isConnected ? "animate-pulse text-cyan-400" : "text-zinc-500"}`} />
            {isConnected && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {locale === "ua" ? "Live Copilot Monitor" : "Live Copilot Monitor"}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase border ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {isConnected ? (locale === "ua" ? "ОНЛАЙН СИНХРОН" : "SYNC ACTIVE") : (locale === "ua" ? "ОЧІКУВАННЯ" : "STANDBY")}
              </span>
              {isFrozen && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  FREEZE
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {locale === "ua"
                ? "Двостороннє дзеркало між Redskopt Desktop HUD та Web-кабінетом"
                : "Real-time bi-directional mirror for Redskopt Desktop HUD and Web copilot"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleTriggerTest}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-50"
            title={locale === "ua" ? "Симулювати запитання" : "Simulate Live QA"}
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
            <span>{locale === "ua" ? "Тестовий сигнал" : "Test Signal"}</span>
          </button>

          <Link
            href="/interview"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white text-xs font-medium transition-all group"
          >
            <span>{locale === "ua" ? "Відкрити Копілот" : "Open Copilot"}</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* ── Sync Topology & Hardware Status Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] flex items-center gap-2.5">
          <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Desktop HUD
            </span>
            <span className="text-xs font-medium text-zinc-300 truncate">
              {connectedDevices.desktop ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {locale === "ua" ? "Підключено" : "Connected"}
                </span>
              ) : (
                <span className="text-zinc-500">{locale === "ua" ? "Очікує запуску" : "Ready"}</span>
              )}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] flex items-center gap-2.5">
          <Smartphone className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Companion App
            </span>
            <span className="text-xs font-medium text-zinc-300 truncate">
              {connectedDevices.phone ? (
                <span className="text-violet-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  {locale === "ua" ? "Активний" : "Active"}
                </span>
              ) : (
                <span className="text-zinc-500">{locale === "ua" ? "Офлайн" : "Standby"}</span>
              )}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] flex items-center gap-2.5">
          <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              STT Stream
            </span>
            <span className="text-xs font-medium text-zinc-300 truncate">
              {isCapturing || sttStatus === "listening" ? (
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  STREAMING
                </span>
              ) : (
                <span className="text-zinc-500 font-mono uppercase">{sttStatus}</span>
              )}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              AI Synthesis
            </span>
            <span className="text-xs font-medium text-amber-300 font-mono">
              Nova-3 + 2.5 Flash
            </span>
          </div>
        </div>
      </div>

      {/* ── Live Dialogue & Copilot Card Monitor ── */}
      <GravitationalCard tilt={2} className="p-5 border border-white/[0.08] bg-zinc-950/70">
        {activeQA ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider uppercase text-cyan-400">
                  {locale === "ua" ? "Останній відповідний фрейм" : "Latest Live Prompt & Answer"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/10 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? (locale === "ua" ? "Скопійовано" : "Copied") : (locale === "ua" ? "Копіювати" : "Copy")}</span>
              </button>
            </div>

            {/* Question Box */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase block mb-1">
                {locale === "ua" ? "Запитання інтерв'юера:" : "Interviewer Question:"}
              </span>
              <p className="text-sm font-semibold text-white leading-relaxed">
                {activeQA.question}
              </p>
            </div>

            {/* Answer Box */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 space-y-3">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 fill-cyan-400/20" />
                <span>{locale === "ua" ? "Швидка відповідь (Elevator Pitch):" : "Core Response:"}</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed font-sans">
                {activeQA.shortAnswer}
              </p>

              {/* Key Bullet Points */}
              {activeQA.bullets && activeQA.bullets.length > 0 && (
                <div className="pt-2 border-t border-cyan-500/15 space-y-1.5">
                  <span className="text-[10px] font-mono tracking-wider text-cyan-400/80 uppercase block">
                    {locale === "ua" ? "Ключові архітектурні тези:" : "Key Technical Points:"}
                  </span>
                  <ul className="space-y-1">
                    {activeQA.bullets.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Code Snippet if present */}
              {activeQA.code && (
                <div className="mt-3 rounded-lg bg-black/60 border border-white/10 p-3 font-mono text-xs overflow-x-auto text-emerald-300">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-white/[0.06] pb-1 mb-2">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-emerald-400" />
                      <span>{activeQA.lang || "code"}</span>
                    </span>
                  </div>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{activeQA.code}</pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-zinc-500">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">
                {locale === "ua" ? "Очікування першого сигналу від HUD" : "Awaiting First Signal from HUD"}
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                {locale === "ua"
                  ? "Запустіть Redskopt Desktop або натисніть «Тестовий сигнал» вище, щоб перевірити миттєву синхронізацію."
                  : "Launch Redskopt Desktop or click 'Test Signal' above to test instant multi-device telemetry."}
              </p>
            </div>
          </div>
        )}
      </GravitationalCard>
    </div>
  );
}
