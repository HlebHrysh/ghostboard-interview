"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Laptop,
  Activity,
  Mic,
  Shield,
  Zap,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Radio,
  Apple,
  Cpu,
  Loader2,
  Volume2,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface DesktopNode {
  nodeId: string;
  userId: string;
  userEmail: string;
  userPlan: string;
  appVersion: string;
  platform: string;
  state: "launcher" | "stealth" | "ticker";
  isCapturing: boolean;
  sttStatus: string;
  micStatus: string;
  audioLatencyMs: number;
  ip?: string;
  lastSeen: number;
  startedAt: number;
}

interface DesktopFleetStats {
  totalNodes: number;
  onlineNodes: number;
  inSessionNodes: number;
  osBreakdown: {
    macos: number;
    windows: number;
    linux: number;
  };
  avgLatencyMs: number;
  activeVersions: Record<string, number>;
}

export default function AdminDesktopFleet() {
  const [nodes, setNodes] = useState<DesktopNode[]>([]);
  const [stats, setStats] = useState<DesktopFleetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchFleet = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/desktop");
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/desktop";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNodes(data.nodes || []);
      setStats(data.stats || null);
    } catch (err: any) {
      toast.error(err.message || "Помилка завантаження телеметрії десктопів");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchFleet(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchFleet]);

  const handleRevoke = async (nodeId: string) => {
    if (!confirm(`Відключити сесію вузла ${nodeId}?`)) return;
    setRevokingId(nodeId);
    try {
      const res = await fetch("/api/admin/desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE", nodeId }),
      });
      if (res.ok) {
        toast.success(`Вузол ${nodeId} успішно відключено`);
        fetchFleet(false);
      } else {
        toast.error("Не вдалося відключити вузол");
      }
    } catch (err) {
      toast.error("Мережева помилка");
    } finally {
      setRevokingId(null);
    }
  };

  const filteredNodes = nodes.filter((n) => {
    const matchesSearch =
      n.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      n.nodeId.toLowerCase().includes(search.toLowerCase()) ||
      n.platform.toLowerCase().includes(search.toLowerCase());
    const matchesState = stateFilter === "all" || n.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("darwin") || p.includes("mac")) return "🍎 macOS";
    if (p.includes("win")) return "🪟 Windows";
    return "🐧 Linux";
  };

  const getStateBadge = (state: string, isCapturing: boolean) => {
    if (state === "stealth") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          STEALTH HUD
        </span>
      );
    }
    if (state === "ticker") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          TICKER STREAM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        LAUNCHER IDLE
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-mono">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <span className="text-xs text-zinc-500 uppercase tracking-widest">
          Scanning Desktop Fleet Nodes...
        </span>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/20 text-white">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-3">
                DESKTOP FLEET TELEMETRY
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  REALTIME
                </span>
              </h1>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">
                Моніторинг підключених десктопних додатків, стану невидимого суфлера та аудіо-потоків
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-400 cursor-pointer hover:bg-white/[0.06]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0"
            />
            <span>Auto (5s)</span>
          </label>

          <button
            onClick={() => fetchFleet(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-mono text-zinc-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Оновити</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Nodes */}
        <div className="p-5 rounded-2xl bg-[#09090D] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Active Nodes</span>
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {stats?.onlineNodes || 0}
            </span>
            <span className="text-xs font-mono text-zinc-500">
              / {stats?.totalNodes || 0} всього
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{stats?.onlineNodes ? "Підключення стабільні" : "Очікування клієнтів"}</span>
          </div>
        </div>

        {/* In-Session / Stealth Active */}
        <div className="p-5 rounded-2xl bg-[#09090D] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">In-Session Stealth</span>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {stats?.inSessionNodes || 0}
            </span>
            <span className="text-xs font-mono text-zinc-500">на співбесіді</span>
          </div>
          <div className="mt-3 text-[11px] font-mono text-zinc-400">
            Екран повністю прихований від шарингу
          </div>
        </div>

        {/* OS Breakdown */}
        <div className="p-5 rounded-2xl bg-[#09090D] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">OS Distribution</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs font-mono text-zinc-300">
              🍏 Mac: <strong className="text-white">{stats?.osBreakdown.macos || 0}</strong>
            </span>
            <span className="text-xs font-mono text-zinc-300">
              🪟 Win: <strong className="text-white">{stats?.osBreakdown.windows || 0}</strong>
            </span>
            <span className="text-xs font-mono text-zinc-300">
              🐧 Linux: <strong className="text-white">{stats?.osBreakdown.linux || 0}</strong>
            </span>
          </div>
          <div className="mt-3 text-[11px] font-mono text-zinc-500">
            Мультиплатформенна сумісність
          </div>
        </div>

        {/* Audio Latency */}
        <div className="p-5 rounded-2xl bg-[#09090D] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Stream Latency</span>
            <Volume2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-300">
              {stats?.avgLatencyMs || 24}
              <span className="text-sm font-normal text-zinc-500 ml-1">ms</span>
            </span>
          </div>
          <div className="mt-3 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Deepgram Nova-3 PCM Stream</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 rounded-xl bg-[#09090D] border border-white/[0.08]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за email, ID, ОС..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-white/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-zinc-500">Режим:</span>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300 focus:outline-none focus:border-white/50 cursor-pointer"
          >
            <option value="all">Усі режими</option>
            <option value="stealth">Stealth HUD</option>
            <option value="ticker">Ticker Stream</option>
            <option value="launcher">Launcher</option>
          </select>
        </div>
      </div>

      {/* Fleet Nodes Table */}
      <div className="rounded-2xl bg-[#09090D] border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-white uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-white" />
            <span>Підключені десктопні клієнти ({filteredNodes.length})</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Оновлюється автоматично
          </span>
        </div>

        {filteredNodes.length === 0 ? (
          <div className="p-12 text-center font-mono">
            <Laptop className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-zinc-400 mb-1">Немає активних десктопних клієнтів</p>
            <p className="text-xs text-zinc-600 max-w-md mx-auto">
              Запустіть додаток командою <code className="text-zinc-200">npm start</code> в папці <code className="text-zinc-200">desktop/</code> для реєстрації нового вузла в системі.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-white/[0.02] text-zinc-500 border-b border-white/[0.06] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Node ID</th>
                  <th className="py-3 px-4">Користувач / Тариф</th>
                  <th className="py-3 px-4">ОС / Платформа</th>
                  <th className="py-3 px-4">Версія</th>
                  <th className="py-3 px-4">Стан додатку</th>
                  <th className="py-3 px-4">Мікрофон / STT</th>
                  <th className="py-3 px-4">Ping</th>
                  <th className="py-3 px-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredNodes.map((n) => {
                  const isOnline = now - n.lastSeen < 45000;
                  const secondsAgo = Math.max(0, Math.round((now - n.lastSeen) / 1000));

                  return (
                    <tr key={n.nodeId} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-zinc-200 font-bold">
                        <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20">
                          {n.nodeId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{n.userEmail}</span>
                          <span className="text-[10px] text-zinc-500 uppercase mt-0.5">
                            {n.userPlan.toUpperCase()} TIER
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">
                        {getPlatformIcon(n.platform)}
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400">
                        v{n.appVersion}
                      </td>

                      <td className="py-3.5 px-4">
                        {getStateBadge(n.state, n.isCapturing)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              n.micStatus === "active" ? "bg-emerald-400" : "bg-zinc-500"
                            }`}
                          />
                          <span className="text-zinc-300 uppercase text-[10px]">
                            {n.micStatus} · {n.sttStatus}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                        {isOnline ? (
                          <span className="text-emerald-400">{secondsAgo}с тому</span>
                        ) : (
                          <span className="text-zinc-600">Offline</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevoke(n.nodeId)}
                          disabled={revokingId === n.nodeId}
                          className="px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer text-[11px]"
                          title="Відключити клієнт від сервера"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                          Відключити
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
