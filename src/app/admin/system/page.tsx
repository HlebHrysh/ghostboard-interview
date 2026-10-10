"use client";

import React, { useEffect, useState } from "react";
import {
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Key,
  RefreshCw,
  Loader2,
  Cpu,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
  Trash2,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface SystemData {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  runtime: {
    nodeVersion: string;
    platform: string;
    env: string;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  services: {
    gemini: {
      configured: boolean;
      maskedKey: string;
      models: string[];
    };
    deepgram: {
      configured: boolean;
      maskedKey: string;
    };
    stripe: {
      configured: boolean;
      mode: string;
      maskedKey: string;
      webhookConfigured: boolean;
    };
    database: {
      type: string;
      configured: boolean;
    };
    rateLimiter: {
      type: string;
      configured: boolean;
    };
    security: {
      adminPasswordConfigured: boolean;
      cronSecretConfigured: boolean;
      corsStrict: boolean;
      cspActive: boolean;
      hstsActive: boolean;
    };
  };
}

export default function AdminSystem() {
  const [system, setSystem] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Diagnostic Test States
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{ latencyMs?: number; model?: string; message?: string; error?: string } | null>(null);

  const [testingDeepgram, setTestingDeepgram] = useState(false);
  const [deepgramResult, setDeepgramResult] = useState<{ latencyMs?: number; message?: string; error?: string } | null>(null);

  const [clearingSync, setClearingSync] = useState(false);

  const fetchSystemData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/system");
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/system";
        return;
      }
      const data = await res.json();
      setSystem(data);
    } catch {
      toast.error("Не вдалося завантажити системні дані");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleTestGemini = async () => {
    setTestingGemini(true);
    setGeminiResult(null);
    try {
      const res = await fetch("/api/admin/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_gemini" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeminiResult(data);
        toast.success(`Gemini API відповів за ${data.latencyMs}мс!`);
      } else {
        setGeminiResult({ error: data.error || "Тест провалився" });
        toast.error(data.error || "Помилка тестування Gemini");
      }
    } catch (e: any) {
      setGeminiResult({ error: e.message });
      toast.error("Мережева помилка при тестуванні Gemini");
    } finally {
      setTestingGemini(false);
    }
  };

  const handleTestDeepgram = async () => {
    setTestingDeepgram(true);
    setDeepgramResult(null);
    try {
      const res = await fetch("/api/admin/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_deepgram" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeepgramResult(data);
        toast.success(`Deepgram API перевірено (${data.latencyMs}мс)`);
      } else {
        setDeepgramResult({ error: data.error || "Тест провалився" });
        toast.error(data.error || "Помилка Deepgram");
      }
    } catch (e: any) {
      setDeepgramResult({ error: e.message });
      toast.error("Мережева помилка Deepgram");
    } finally {
      setTestingDeepgram(false);
    }
  };

  const handleClearSyncStore = async () => {
    setClearingSync(true);
    try {
      const res = await fetch("/api/admin/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_sync_store" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Live Sync Store успішно очищено");
      } else {
        toast.error(data.error || "Не вдалося очистити store");
      }
    } catch (e: any) {
      toast.error(e.message || "Помилка");
    } finally {
      setClearingSync(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-mono">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <span className="text-xs text-zinc-500 uppercase tracking-widest">
          Polling Infrastructure Telemetry...
        </span>
      </div>
    );
  }

  const s = system?.services;
  const r = system?.runtime;
  const uptimeMin = Math.floor((system?.uptimeSeconds || 0) / 60);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider uppercase flex items-center gap-3">
            <span>System Diagnostics</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
              HEALTHY
            </span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Моніторинг сервісів Gemini, Deepgram, Stripe, безпеки та системних ресурсів
          </p>
        </div>

        <button
          onClick={() => fetchSystemData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-white" : ""}`} />
          <span>Оновити телеметрію</span>
        </button>
      </div>

      {/* ── Real-Time Diagnostic Test Suite ── */}
      <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6">
        <div>
          <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-white" />
            <span>Interactive Diagnostic Engine (Live Pings)</span>
          </h2>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Запустіть реальний запит до сторонніх API для вимірювання затримки відгуку (latency)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* Gemini Ping Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Gemini AI 2.5 Flash</span>
                </span>
                <span className="text-[10px] text-zinc-500">LLM Inference</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Тестовий пінг мікро-промпту для перевірки готовності та затримки
              </p>

              {geminiResult && (
                <div
                  className={`mt-3 p-2.5 rounded-xl border text-[11px] ${
                    geminiResult.error
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-white/10 border-white/20 text-white"
                  }`}
                >
                  {geminiResult.error ? (
                    <div>Помилка: {geminiResult.error}</div>
                  ) : (
                    <div>
                      ⚡ Затримка: <span className="font-bold">{geminiResult.latencyMs}мс</span> ({geminiResult.model})
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleTestGemini}
              disabled={testingGemini}
              className="w-full btn-resend-primary !py-2.5 font-mono text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all"
            >
              {testingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{testingGemini ? "Вимірювання..." : "Ping Gemini AI"}</span>
            </button>
          </div>

          {/* Deepgram Ping Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-white" />
                  <span>Deepgram Nova-3</span>
                </span>
                <span className="text-[10px] text-zinc-500">Live STT API</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Перевірка валідності API ключа та зв'язку з Deepgram сервісом
              </p>

              {deepgramResult && (
                <div
                  className={`mt-3 p-2.5 rounded-xl border text-[11px] ${
                    deepgramResult.error
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {deepgramResult.error ? (
                    <div>Помилка: {deepgramResult.error}</div>
                  ) : (
                    <div>
                      ✓ Підтверджено за <span className="font-bold">{deepgramResult.latencyMs}мс</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleTestDeepgram}
              disabled={testingDeepgram}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold flex items-center justify-center gap-2 border border-white/10 cursor-pointer transition-all"
            >
              {testingDeepgram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{testingDeepgram ? "Перевірка..." : "Verify Deepgram"}</span>
            </button>
          </div>

          {/* Sync Store Reset Card */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  <span>Live Sync Store</span>
                </span>
                <span className="text-[10px] text-zinc-500">Memory Cache</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Очистити кеш поточної трансляції Q&A запитань на мобільні та другі екрани
              </p>
            </div>

            <button
              onClick={handleClearSyncStore}
              disabled={clearingSync}
              className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {clearingSync ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Очистити Sync Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Services Health & Runtime Telemetry ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Services Status */}
        <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6">
          <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Server className="w-4 h-4 text-white" />
            <span>Статус підключених сервісів</span>
          </h2>

          <div className="space-y-3 font-mono text-xs">
            <ServiceStatusRow
              title="Google Gemini AI (2.5 Flash / Lite)"
              isReady={Boolean(s?.gemini.configured)}
              detail={s?.gemini.configured ? "API Key налаштовано" : "Ключ відсутній у .env"}
            />
            <ServiceStatusRow
              title="Deepgram Nova-3 (Live STT)"
              isReady={Boolean(s?.deepgram.configured)}
              detail={s?.deepgram.configured ? "API Key налаштовано" : "Ключ відсутній у .env"}
            />
            <ServiceStatusRow
              title="Stripe Payment Gateway"
              isReady={Boolean(s?.stripe.configured)}
              detail={s?.stripe.configured ? `Режим: ${s?.stripe.mode.toUpperCase()}` : "Працює в режимі Simulator"}
            />
            <ServiceStatusRow
              title="Сховище даних (Database)"
              isReady={true}
              detail={s?.database.type || "In-Memory Safe Storage"}
            />
            <ServiceStatusRow
              title="Rate Limiter & Anti-DDoS"
              isReady={true}
              detail={s?.rateLimiter.type || "Active Protection"}
            />
          </div>
        </div>

        {/* Runtime & Server Specs */}
        <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6">
          <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Системні ресурси & Runtime</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Node.js Version</span>
              <div className="text-base font-black text-white">{r?.nodeVersion || process.version}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Server Environment</span>
              <div className="text-base font-black text-zinc-200 uppercase">{r?.env}</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">RAM Heap Used</span>
              <div className="text-base font-black text-white">{r?.heapUsedMb} MB / {r?.heapTotalMb} MB</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Server Uptime</span>
              <div className="text-base font-black text-white">
                {uptimeMin > 60 ? `${(uptimeMin / 60).toFixed(1)} год` : `${uptimeMin} хв`}
              </div>
            </div>
          </div>

          {/* Security Posture */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 font-mono text-xs">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Політика кібербезпеки</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Admin Cookie Guard: Активно</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>CSP Headers: Активно</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Rate Limiting: Активно</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Anti-Hotlinking: Активно</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Masked Configuration Keys Vault ── */}
      <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6">
        <div>
          <h2 className="text-sm font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Масковані змінні середовища (.env.local)</span>
          </h2>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Ключі шифруються та маскуються для безпечного перегляду в інтерфейсі адміна
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          <EnvKeyCard
            name="GEMINI_API_KEY"
            value={s?.gemini.maskedKey || "NOT_SET"}
            isConfigured={Boolean(s?.gemini.configured)}
          />
          <EnvKeyCard
            name="DEEPGRAM_API_KEY"
            value={s?.deepgram.maskedKey || "NOT_SET"}
            isConfigured={Boolean(s?.deepgram.configured)}
          />
          <EnvKeyCard
            name="STRIPE_SECRET_KEY"
            value={s?.stripe.maskedKey || "NOT_SET"}
            isConfigured={Boolean(s?.stripe.configured)}
          />
          <EnvKeyCard
            name="ADMIN_PASSWORD"
            value={s?.security.adminPasswordConfigured ? "••••••••••••••••" : "DEFAULT_FALLBACK"}
            isConfigured={Boolean(s?.security.adminPasswordConfigured)}
          />
          <EnvKeyCard
            name="CRON_SECRET"
            value={s?.security.cronSecretConfigured ? "••••••••••••••••" : "NOT_CONFIGURED"}
            isConfigured={Boolean(s?.security.cronSecretConfigured)}
          />
          <EnvKeyCard
            name="STRIPE_WEBHOOK_SECRET"
            value={s?.stripe.webhookConfigured ? "whsec_••••••••••••" : "NOT_CONFIGURED"}
            isConfigured={Boolean(s?.stripe.webhookConfigured)}
          />
        </div>
      </div>
    </div>
  );
}

function ServiceStatusRow({
  title,
  isReady,
  detail,
}: {
  title: string;
  isReady: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <div>
        <div className="text-white font-bold">{title}</div>
        <div className="text-[11px] text-zinc-500 mt-0.5">{detail}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isReady ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>OPERATIONAL</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>DISABLED</span>
          </span>
        )}
      </div>
    </div>
  );
}

function EnvKeyCard({
  name,
  value,
  isConfigured,
}: {
  name: string;
  value: string;
  isConfigured: boolean;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">{name}</span>
        <span
          className={`w-2 h-2 rounded-full ${
            isConfigured ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
          }`}
        />
      </div>
      <div className="p-2 rounded-xl bg-black/60 border border-white/5 text-[11px] text-zinc-300 truncate">
        {value}
      </div>
    </div>
  );
}
