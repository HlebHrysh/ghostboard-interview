"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  Mic,
  TrendingUp,
  DollarSign,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Activity,
  Calendar,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  proUsers: number;
  lifetimeUsers: number;
  paidUsers: number;
  conversionRate: number;
  totalSessions: number;
  totalRevenueCents: number;
  mrrCents: number;
  totalQuestionsCount: number;
  totalDurationSec: number;
  avgDurationSec: number;
  plans: {
    free: number;
    pro: number;
    lifetime: number;
  };
  weekSessions: number[];
  weekLabels?: string[];
  recentActivity: Array<{
    id: string;
    type: "user" | "session" | "payment";
    title: string;
    subtitle: string;
    timestamp: number;
    badge?: string;
    amountCents?: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin";
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStats(data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || "Помилка завантаження статистики");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-mono">
        <Loader2 className="w-10 h-10 animate-spin text-[#C8F135]" />
        <span className="text-xs text-zinc-500 uppercase tracking-widest">
          Loading Executive Telemetry...
        </span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-[#08080c] border border-rose-500/20 p-8 rounded-3xl max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <Activity className="w-6 h-6" />
        </div>
        <h2 className="text-base font-mono font-bold text-white uppercase">Access Restricted or Error</h2>
        <p className="text-xs font-mono text-rose-400/90">{error || "Дані статистики недоступні"}</p>
        <button
          onClick={() => {
            window.location.href = "/admin/login?from=/admin";
          }}
          className="btn-lime text-xs font-mono px-5 py-2.5 shadow-[0_0_20px_rgba(200,241,53,0.2)]"
        >
          Увійти в адмінку знову →
        </button>
      </div>
    );
  }

  const totalUsers = stats.totalUsers ?? 0;
  const proUsers = stats.proUsers ?? 0;
  const lifetimeUsers = stats.lifetimeUsers ?? 0;
  const paidUsers = stats.paidUsers ?? proUsers + lifetimeUsers;
  const totalSessions = stats.totalSessions ?? 0;
  const totalRev = (stats.totalRevenueCents ?? 0) / 100;
  const mrr = (stats.mrrCents ?? 0) / 100;
  const conversionRate = stats.conversionRate ?? 0;
  const totalQuestions = stats.totalQuestionsCount ?? 0;
  const avgDurationMin = Math.round((stats.avgDurationSec ?? 0) / 60);
  const totalHours = Math.round(((stats.totalDurationSec ?? 0) / 3600) * 10) / 10;

  const plans = stats.plans ?? { free: 0, pro: 0, lifetime: 0 };
  const weekSessions = stats.weekSessions ?? [0, 0, 0, 0, 0, 0, 0];
  const maxSessionCount = Math.max(...weekSessions, 1);
  const weekLabels = stats.weekLabels ?? ["6d ago", "5d ago", "4d ago", "3d ago", "2d ago", "Yesterday", "Today"];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Top Executive Welcome Strip ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#08080c] via-[#0c0c12] to-[#08080c] border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-[#C8F135]/5 blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-[#C8F135] uppercase font-bold">
              SYSTEM LIVE & OPTIMAL
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            Ghostboard Executive Operations
          </h2>
          <p className="text-xs text-zinc-400 font-mono">
            {totalUsers} зареєстрованих кандидатів • {totalSessions} проведених тренувань • ${totalRev.toFixed(2)} загальний дохід
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C8F135]" : ""}`} />
            <span>Оновити метрики</span>
          </button>

          <Link
            href="/admin/users"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#C8F135] text-black text-xs font-mono font-bold tracking-wider hover:shadow-[0_0_25px_rgba(200,241,53,0.4)] transition-all active:scale-95"
          >
            <span>Керувати юзерами</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ── 6 Primary Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Всього юзерів"
          value={totalUsers.toLocaleString()}
          subtitle={`${paidUsers} платних (${conversionRate}%)`}
          icon={<Users className="w-4 h-4 text-sky-400" />}
          glow="sky"
        />
        <MetricCard
          title="Загальний дохід"
          value={`$${totalRev.toFixed(0)}`}
          subtitle={`Всього платежів`}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          glow="emerald"
        />
        <MetricCard
          title="MRR (Pro Pass)"
          value={`$${mrr.toFixed(0)}`}
          subtitle={`${proUsers} активних Pro`}
          icon={<CreditCard className="w-4 h-4 text-[#C8F135]" />}
          glow="lime"
        />
        <MetricCard
          title="Lifetime Founder"
          value={lifetimeUsers.toLocaleString()}
          subtitle="Пожиттєвий доступ"
          icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
          glow="amber"
        />
        <MetricCard
          title="Всього сесій"
          value={totalSessions.toLocaleString()}
          subtitle={`Сер. трив.: ${avgDurationMin} хв`}
          icon={<Mic className="w-4 h-4 text-violet-400" />}
          glow="violet"
        />
        <MetricCard
          title="Питань Copilot"
          value={totalQuestions.toLocaleString()}
          subtitle={`${totalHours} годин практики`}
          icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
          glow="cyan"
        />
      </div>

      {/* ── Visual Charts & Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Session Activity Bar Chart */}
        <div className="lg:col-span-2 bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C8F135]" />
                <span>Динаміка тренувань (останні 7 днів)</span>
              </h3>
              <p className="text-[11px] font-mono text-zinc-500 mt-1">
                Кількість проведених сесій щодня
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#C8F135] bg-[#C8F135]/10 px-2.5 py-1 rounded-full border border-[#C8F135]/20">
              {weekSessions.reduce((a, b) => a + b, 0)} сесій за тиждень
            </span>
          </div>

          <div className="pt-6">
            <div className="flex items-end gap-3 sm:gap-4 h-44">
              {weekSessions.map((count, idx) => {
                const heightPercent = Math.max((count / maxSessionCount) * 100, 8);
                const isToday = idx === weekSessions.length - 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip & Value */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono text-[#C8F135] bg-black/90 border border-white/10 px-2 py-0.5 rounded-md shadow-lg pointer-events-none mb-1">
                      {count} сесій
                    </div>

                    {/* Bar */}
                    <div className="w-full bg-white/[0.04] rounded-xl overflow-hidden p-1 flex items-end h-full">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          isToday
                            ? "bg-gradient-to-t from-[#C8F135] to-[#E3FFA8] shadow-[0_0_20px_rgba(200,241,53,0.35)]"
                            : "bg-[#C8F135]/40 hover:bg-[#C8F135]/80"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>

                    {/* Label */}
                    <span
                      className={`text-[10px] font-mono truncate w-full text-center ${
                        isToday ? "text-[#C8F135] font-bold" : "text-zinc-500"
                      }`}
                    >
                      {weekLabels[idx] || `Day ${idx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Plan Distribution Breakdown */}
        <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Розподіл за тарифами</span>
            </h3>
            <p className="text-[11px] font-mono text-zinc-500 mb-6">
              Конверсія безкоштовних у платні передплати
            </p>

            <div className="space-y-4">
              <PlanProgressRow
                label="Free Trial"
                count={plans.free}
                total={totalUsers}
                color="bg-zinc-500"
                badgeText="Базовий"
              />
              <PlanProgressRow
                label="Pro Pass"
                count={plans.pro}
                total={totalUsers}
                color="bg-[#C8F135]"
                badgeText="$15-25/mo"
              />
              <PlanProgressRow
                label="Lifetime Founder"
                count={plans.lifetime}
                total={totalUsers}
                color="bg-amber-400"
                badgeText="$79-149"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono space-y-1 text-zinc-400">
            <div className="flex justify-between">
              <span>Платна конверсія:</span>
              <span className="text-[#C8F135] font-bold">{conversionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span>Загалом платних:</span>
              <span className="text-white font-bold">{paidUsers} кандидатів</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Action Tiles & Activity Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Management Hub */}
        <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-4">
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#C8F135]" />
            <span>Швидкі дії</span>
          </h3>
          <div className="grid grid-cols-1 gap-2.5 font-mono text-xs">
            <Link
              href="/admin/users"
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-white font-bold">База кандидатів</div>
                  <div className="text-[10px] text-zinc-500">Переглянути та надати Pro доступ</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/admin/sessions"
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-white font-bold">Історія тренувань</div>
                  <div className="text-[10px] text-zinc-500">Записи запитань та скоркарди</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/admin/revenue"
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-white font-bold">Фінансовий аудит</div>
                  <div className="text-[10px] text-zinc-500">Транзакції Stripe та симулятора</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>

            <Link
              href="/admin/system"
              className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <div>
                  <div className="text-white font-bold">Діагностика API & ШІ</div>
                  <div className="text-[10px] text-zinc-500">Тести пінгів Gemini та Deepgram</div>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>
          </div>
        </div>

        {/* Live Unified Activity Feed */}
        <div className="lg:col-span-2 bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Остання активність</span>
            </h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Останні 8 подій</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((act) => {
                const dateStr = new Date(act.timestamp).toLocaleString("uk-UA", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={act.id} className="py-3 flex items-center justify-between gap-4 font-mono text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl border flex-shrink-0 ${
                          act.type === "payment"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : act.type === "session"
                            ? "bg-violet-500/10 border-violet-500/20 text-violet-400"
                            : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                        }`}
                      >
                        {act.type === "payment" ? (
                          <DollarSign className="w-3.5 h-3.5" />
                        ) : act.type === "session" ? (
                          <Mic className="w-3.5 h-3.5" />
                        ) : (
                          <Users className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">{act.title}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{act.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end flex-shrink-0">
                      {act.badge && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            act.badge.includes("PRO") || act.badge.includes("SUCCEEDED")
                              ? "bg-[#C8F135]/20 text-[#C8F135]"
                              : act.badge.includes("LIFETIME")
                              ? "bg-amber-400/20 text-amber-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {act.badge}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-600 mt-0.5">{dateStr}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-zinc-500 font-mono text-xs">
                Немає зареєстрованих подій.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  glow = "lime",
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  glow?: "lime" | "sky" | "amber" | "violet" | "emerald" | "cyan";
}) {
  const glowStyles = {
    lime: "group-hover:border-[#C8F135]/40 group-hover:shadow-[0_0_30px_rgba(200,241,53,0.15)]",
    sky: "group-hover:border-sky-400/40 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.15)]",
    amber: "group-hover:border-amber-400/40 group-hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]",
    violet: "group-hover:border-violet-400/40 group-hover:shadow-[0_0_30px_rgba(167,139,250,0.15)]",
    emerald: "group-hover:border-emerald-400/40 group-hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]",
    cyan: "group-hover:border-cyan-400/40 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]",
  };

  return (
    <div
      className={`bg-[#08080c] border border-white/[0.08] p-5 rounded-3xl flex flex-col justify-between transition-all duration-300 group ${glowStyles[glow]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-black font-mono text-white tracking-tight">{value}</div>
        <div className="text-[10px] font-mono text-zinc-500 mt-1 truncate">{subtitle}</div>
      </div>
    </div>
  );
}

function PlanProgressRow({
  label,
  count,
  total,
  color,
  badgeText,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  badgeText: string;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5 font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{label}</span>
          <span className="text-[9px] text-zinc-500 px-1.5 py-0.2 rounded bg-white/5">{badgeText}</span>
        </div>
        <div className="text-right">
          <span className="text-white font-bold">{count}</span>
          <span className="text-zinc-500 ml-1.5">({percent}%)</span>
        </div>
      </div>
      <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden p-0.5 border border-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}
