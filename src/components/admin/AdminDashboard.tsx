"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
  Clock,
  Search,
  Download,
  RefreshCw,
  Laptop,
  Globe,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  X,
  FileText,
  CheckCircle2,
  Lock,
  Unlock,
  RotateCcw,
  Headphones,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { AdminMetricsResponse, MetricTimeSeriesPoint } from "@/lib/adminMetrics";

interface UserRecord {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
  trialQuestionsUsed?: number;
  stripeCustomerId?: string | null;
  resumeContext?: string | null;
  isBanned?: boolean;
  lastActiveAt?: string | null;
  createdAt: string;
  sessionsCount: number;
  questionsCount: number;
  totalDuration: number;
  status: "active_desktop" | "active_web" | "active" | "idle" | "banned" | string;
  isLive: boolean;
  connectedDevices?: string[];
}

export function AdminDashboard() {
  // ── Metrics State ──
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [range, setRange] = useState<"24h" | "7d" | "30d" | "90d" | "all">("30d");

  // ── Auto-Refresh Countdown ──
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // ── User Directory State ──
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);

  // ── Drill-down User Drawer State ──
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Interactive Chart Hover State ──
  const [hoveredPoint, setHoveredPoint] = useState<MetricTimeSeriesPoint | null>(null);

  // ── Search Debounce ──
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Fetch Metrics ──
  const fetchMetrics = useCallback(async (force = false) => {
    try {
      setMetricsLoading(true);
      const url = `/api/admin/metrics?range=${range}${force ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load telemetry");
    } finally {
      setMetricsLoading(false);
      setCountdown(30);
    }
  }, [range]);

  // ── Fetch Users ──
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        search: debouncedSearch,
        plan: planFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin";
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalUsersCount(data.pagination?.total || data.users.length);
      } else if (Array.isArray(data)) {
        setUsers(data);
        setTotalPages(1);
        setTotalUsersCount(data.length);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [page, debouncedSearch, planFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Auto-refresh Interval Timer ──
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchMetrics(true);
          fetchUsers();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMetrics, fetchUsers]);

  // ── User Action Execution ──
  const executeUserAction = async (userId: string, action: string, extra?: Record<string, any>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      toast.success(data.message || "Action executed successfully");
      setActiveActionMenuId(null);
      if (selectedUser?.id === userId && data.user) {
        setSelectedUser((prev) => (prev ? { ...prev, ...data.user } : null));
      }
      fetchUsers();
      fetchMetrics(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute action");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Export CSV ──
  const handleExportCSV = async () => {
    try {
      toast.info("Generating CSV export...");
      const res = await fetch("/api/admin/users?limit=1000&format=array");
      const list: UserRecord[] = await res.json();
      if (!Array.isArray(list) || list.length === 0) {
        toast.error("No users found to export");
        return;
      }

      const headers = [
        "User ID",
        "Email",
        "Name",
        "Plan",
        "Role",
        "Status",
        "Sessions Count",
        "Questions Answered",
        "Practice Minutes",
        "Created At",
        "Last Active At",
      ];

      const csvRows = list.map((u) => [
        `"${u.id}"`,
        `"${u.email}"`,
        `"${u.name || ""}"`,
        `"${u.plan}"`,
        `"${u.role || ""}"`,
        `"${u.status}"`,
        u.sessionsCount,
        u.questionsCount,
        Math.round((u.totalDuration || 0) / 60),
        `"${u.createdAt || ""}"`,
        `"${u.lastActiveAt || ""}"`,
      ]);

      const csvString = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ghostboard_user_directory_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV export downloaded");
    } catch {
      toast.error("CSV export failed");
    }
  };

  const summary = metrics?.summary;
  const timeSeries = metrics?.timeSeries || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* ── Operational System Alert Banner (Condition: error rate or latency) ── */}
      {summary && (summary.systemErrorRate > 1.5 || summary.aiLatencyP95 > 2.5) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              <strong>System Advisory:</strong> Latency elevated (P95: {summary.aiLatencyP95}s, Error Rate: {summary.systemErrorRate}%). Model fallback routes engaged.
            </span>
          </div>
          <Link href="/admin/system" className="underline hover:text-white font-bold ml-4">
            Diagnostics →
          </Link>
        </div>
      )}

      {/* ── Executive Header Strip ── */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#050508] via-[#09090f] to-[#050508] border border-white/[0.08] relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl">
        <div className="absolute top-0 right-1/4 w-96 h-full bg-white/[0.02] blur-3xl pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <span className="text-[11px] font-mono tracking-widest text-emerald-400 uppercase font-black">
              LIVE MISSION TELEMETRY
            </span>
            <span className="text-zinc-600 font-mono text-xs">•</span>
            <span className="text-zinc-400 font-mono text-[11px]">Sub-Second Aggregations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase">
            Ghostboard Command Vault
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            {summary?.totalUsers.toLocaleString() || "..."} total registered candidates •{" "}
            <span className="text-white font-bold">{summary?.dau || 0} active daily</span> •{" "}
            <span className="text-emerald-400 font-bold">{summary?.liveActiveNow || 0} online now</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {/* Live countdown pill */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-mono transition-all ${
              autoRefresh
                ? "bg-white/[0.04] border-white/10 text-zinc-300 hover:text-white"
                : "bg-zinc-900 border-zinc-800 text-zinc-500"
            }`}
            title="Toggle 30-second background polling"
          >
            <div
              className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-ping" : "bg-zinc-600"}`}
            />
            <span>{autoRefresh ? `Live Sync (${countdown}s)` : "Sync Paused"}</span>
          </button>

          {/* Manual Refresh button */}
          <button
            onClick={() => {
              fetchMetrics(true);
              fetchUsers();
            }}
            disabled={metricsLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading ? "animate-spin text-white" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: THE VITAL SIGNS (BENTO CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Users */}
        <StatCard
          title="Total Users"
          value={summary ? summary.totalUsers.toLocaleString() : "..."}
          delta={summary ? `+${summary.userGrowthPercent}%` : undefined}
          deltaPositive={true}
          subtext="All-time registrations"
          icon={<Users className="w-4 h-4 text-sky-400" />}
          glow="sky"
        />

        {/* Card 2: Signups Today */}
        <StatCard
          title="Signups Today"
          value={summary ? String(summary.signupsToday) : "..."}
          delta={summary ? (summary.signupsTodayDelta >= 0 ? `+${summary.signupsTodayDelta}%` : `${summary.signupsTodayDelta}%`) : undefined}
          deltaPositive={summary ? summary.signupsTodayDelta >= 0 : true}
          subtext={`vs. ${summary?.signupsYesterday ?? 0} yesterday`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          glow="emerald"
        />

        {/* Card 3: DAU */}
        <StatCard
          title="Daily Active (DAU)"
          value={summary ? String(summary.dau) : "..."}
          delta={summary ? `${summary.stickinessRatio}%` : undefined}
          deltaLabel="Stickiness (DAU/MAU)"
          deltaPositive={true}
          subtext={`MAU: ${summary?.mau || 0} candidates`}
          icon={<Activity className="w-4 h-4 text-cyan-400" />}
          glow="cyan"
        />

        {/* Card 4: Live Active Now */}
        <StatCard
          title="Live Right Now"
          value={summary ? String(summary.liveActiveNow) : "..."}
          subtext="Active in last 5m"
          icon={<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_#34d399]" />}
          glow="emerald"
          isPulsing={true}
        />

        {/* Card 5: Lifetime VIP & Paid */}
        <StatCard
          title="Lifetime & Pro"
          value={summary ? String(summary.paidUsers) : "..."}
          delta={summary ? `${summary.conversionRate}%` : undefined}
          deltaLabel="Conversion"
          deltaPositive={true}
          subtext={`${summary?.lifetimeUsers || 0} VIP Founder`}
          icon={<ShieldCheck className="w-4 h-4 text-amber-400" />}
          glow="amber"
        />

        {/* Card 6: Total Revenue */}
        <StatCard
          title="Total Revenue"
          value={summary ? `$${Math.round(summary.totalRevenueCents / 100).toLocaleString()}` : "..."}
          subtext={`MRR: $${Math.round((summary?.mrrCents || 0) / 100)}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-300" />}
          glow="emerald"
        />
      </div>

      {/* ── ROW 2: DUAL-AXIS RETENTION & ACQUISITION CHART ── */}
      <div className="bg-[#08080c] border border-white/[0.08] p-6 sm:p-7 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-white" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                User Acquisition vs. True Daily Active Engagement
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-500 mt-1">
              Visualizes sign-up cohorts alongside daily practicing candidates to detect drop-off curves
            </p>
          </div>

          {/* Time range selector pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.08] font-mono text-xs">
            {(["24h", "7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                  range === r
                    ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {r === "all" ? "All Time" : r}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Dual-Axis Area & Bar Chart */}
        <DualAxisChart
          data={timeSeries}
          hoveredPoint={hoveredPoint}
          onHover={setHoveredPoint}
        />

        {/* Chart Legend & Summary Footnote */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-white/[0.04] text-xs font-mono text-zinc-400 gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-white" />
              <span className="text-zinc-300">New Signups (Bars)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-300">Daily Active Users (Area)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-zinc-300">Interview Questions (Overlay)</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500">
            Showing {timeSeries.length} time buckets • Filter: {range.toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── ROW 3: AI & INFRASTRUCTURE HEALTH METRICS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Questions Answered */}
        <div className="bg-[#08080c] border border-white/[0.08] p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
            <span>Interview Q&A Answered</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {summary ? summary.totalQuestionsCount.toLocaleString() : "..."}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            ~{summary ? (summary.estimatedTokens / 1000).toFixed(1) : 0}k API tokens consumed
          </div>
        </div>

        {/* Metric 2: AI Response Latency (P50 / P95) */}
        <div className="bg-[#08080c] border border-white/[0.08] p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
            <span>AI Response Latency</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight flex items-baseline gap-2">
            <span>{summary ? `${summary.aiLatencyP50}s` : "..."}</span>
            <span className="text-xs text-zinc-500 font-normal">P50</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            P95: {summary ? `${summary.aiLatencyP95}s` : "..."} • Sub-2s SLA
          </div>
        </div>

        {/* Metric 3: Streaming Practice Time */}
        <div className="bg-[#08080c] border border-white/[0.08] p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
            <span>Practice Audio Streamed</span>
            <Headphones className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white tracking-tight">
            {summary ? `${summary.totalAudioMinutes.toLocaleString()} min` : "..."}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Deepgram Nova-3 16kHz PCM stream
          </div>
        </div>

        {/* Metric 4: Gemini / Deepgram Error Rate */}
        <div className="bg-[#08080c] border border-white/[0.08] p-5 rounded-3xl space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
            <span>AI Provider Error Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
            {summary ? `${summary.systemErrorRate}%` : "..."}
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Gemini Flash 2.5 + Resend SMTP optimal
          </div>
        </div>
      </div>

      {/* ── ROW 4: INTERACTIVE USER DIRECTORY & MANAGEMENT ── */}
      <div className="bg-[#08080c] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl space-y-4 p-6 sm:p-7">
        {/* Controls Bar: Search, Filters, Sorting */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider flex items-center gap-2.5">
              <span>Candidate Directory & Accounts</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-normal">
                {totalUsersCount} Total
              </span>
            </h3>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              Instant email lookup, drill-down activity logs, and 1-click VIP privileges
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[260px] flex-1 lg:flex-none">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email, name, role or ID..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-2 pl-10 pr-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white/50"
              />
            </div>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="bg-black/40 border border-white/10 text-zinc-300 rounded-2xl px-3 py-2 text-xs font-mono outline-none focus:border-white/50 cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="free">Free Trial</option>
              <option value="pro">Pro Pass</option>
              <option value="lifetime">Lifetime VIP</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-black/40 border border-white/10 text-zinc-300 rounded-2xl px-3 py-2 text-xs font-mono outline-none focus:border-white/50 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="idle">Idle (&gt;7d)</option>
              <option value="banned">Banned</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="bg-black/40 border border-white/10 text-zinc-300 rounded-2xl px-3 py-2 text-xs font-mono outline-none focus:border-white/50 cursor-pointer"
            >
              <option value="createdAt">Joined Date</option>
              <option value="lastActiveAt">Last Active</option>
              <option value="sessions">Sessions</option>
              <option value="questions">Questions</option>
            </select>
          </div>
        </div>

        {/* Directory Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full text-left font-mono text-xs whitespace-nowrap">
            <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400">
              <tr>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider">Candidate / Email</th>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider">Role & Stack</th>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider">Plan Access</th>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider">Status</th>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider text-right">Practice</th>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider text-right">Last Active</th>
                <th className="p-3.5 font-bold uppercase text-[10px] tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {usersLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400 mb-2" />
                    <span>Loading candidate accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    No candidates found matching the query.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isMenuOpen = activeActionMenuId === u.id;
                  const joinedDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-";
                  const lastActiveDate = u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : joinedDate;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setSelectedUser(u)}
                    >
                      {/* User & Email */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                            {u.email.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-bold truncate max-w-[200px]">
                              {u.name || u.email.split("@")[0]}
                            </div>
                            <div className="text-zinc-500 text-[11px] truncate max-w-[200px]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Target Role */}
                      <td className="p-3.5 text-zinc-300">
                        <span className="truncate block max-w-[180px]">{u.role || "Developer"}</span>
                      </td>

                      {/* Plan */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            u.plan === "lifetime"
                              ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                              : u.plan === "pro"
                              ? "bg-white/10 text-white border border-white/20"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {u.plan === "lifetime" ? "VIP Lifetime" : u.plan}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <StatusPill status={u.status} isLive={u.isLive} />
                      </td>

                      {/* Practice Telemetry */}
                      <td className="p-3.5 text-right">
                        <div className="text-white font-bold">{u.questionsCount || 0} Qs</div>
                        <div className="text-zinc-500 text-[10px]">{u.sessionsCount || 0} sessions</div>
                      </td>

                      {/* Last Active */}
                      <td className="p-3.5 text-right text-zinc-400 text-[11px]">
                        <div>{lastActiveDate}</div>
                        <div className="text-[10px] text-zinc-600">Joined {joinedDate}</div>
                      </td>

                      {/* Quick 1-Click Actions */}
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setActiveActionMenuId(isMenuOpen ? null : u.id)}
                            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all cursor-pointer"
                            title="Admin Actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Action Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0e0e14] border border-white/10 shadow-2xl z-50 p-1.5 space-y-1 font-mono text-xs">
                              {u.plan !== "lifetime" && (
                                <button
                                  onClick={() => executeUserAction(u.id, "grant_vip")}
                                  className="w-full text-left px-3 py-2 rounded-xl text-amber-400 hover:bg-amber-400/10 flex items-center gap-2 cursor-pointer font-bold"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Grant Lifetime VIP</span>
                                </button>
                              )}

                              {u.plan !== "pro" && (
                                <button
                                  onClick={() => executeUserAction(u.id, "grant_pro")}
                                  className="w-full text-left px-3 py-2 rounded-xl text-zinc-200 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                >
                                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Grant Pro Pass</span>
                                </button>
                              )}

                              {u.plan !== "free" && (
                                <button
                                  onClick={() => executeUserAction(u.id, "revoke_plan")}
                                  className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Revoke to Free</span>
                                </button>
                              )}

                              <button
                                onClick={() => executeUserAction(u.id, "reset_sessions")}
                                className="w-full text-left px-3 py-2 rounded-xl text-zinc-300 hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reset Sessions/Limits</span>
                              </button>

                              <div className="border-t border-white/[0.06] my-1" />

                              <button
                                onClick={() => executeUserAction(u.id, "toggle_ban")}
                                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer font-bold ${
                                  u.isBanned
                                    ? "text-emerald-400 hover:bg-emerald-400/10"
                                    : "text-rose-400 hover:bg-rose-500/10"
                                }`}
                              >
                                {u.isBanned ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>Unban Account</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Ban Account</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-2">
          <span>
            Page {page} of {totalPages} ({totalUsersCount} accounts)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── USER DETAILS SLIDE-OVER DRAWER ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg bg-[#07070b] border-l border-white/10 h-full p-6 sm:p-8 overflow-y-auto space-y-6 font-mono text-xs shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                  User Intelligence Profile
                </span>
                <h3 className="text-lg font-black text-white">{selectedUser.name || "Candidate"}</h3>
                <p className="text-zinc-400 text-xs">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Badges Strip */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full font-bold uppercase text-[10px] ${
                  selectedUser.plan === "lifetime"
                    ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                    : selectedUser.plan === "pro"
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {selectedUser.plan}
              </span>
              <StatusPill status={selectedUser.status} isLive={selectedUser.isLive} />
              {selectedUser.isBanned && (
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase text-[10px]">
                  Banned
                </span>
              )}
            </div>

            {/* Resume & Stack Context */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Target Role & Profile Context</span>
              </div>
              <div className="text-white font-bold">{selectedUser.role || "Software Engineer"}</div>
              {selectedUser.resumeContext ? (
                <div className="text-zinc-400 text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto leading-relaxed">
                  {selectedUser.resumeContext}
                </div>
              ) : (
                <div className="text-zinc-600 text-[11px]">No custom resume context uploaded yet.</div>
              )}
            </div>

            {/* Activity Summary Counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase">Interview Sessions</div>
                <div className="text-xl font-bold text-white">{selectedUser.sessionsCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase">Questions Answered</div>
                <div className="text-xl font-bold text-white">{selectedUser.questionsCount}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase">Practice Time</div>
                <div className="text-xl font-bold text-white">
                  {Math.round((selectedUser.totalDuration || 0) / 60)} min
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase">Trial Questions Used</div>
                <div className="text-xl font-bold text-white">{selectedUser.trialQuestionsUsed || 0}</div>
              </div>
            </div>

            {/* Connected Devices */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5 text-zinc-300" />
                <span>Connected Devices</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedUser.connectedDevices && selectedUser.connectedDevices.length > 0 ? (
                  selectedUser.connectedDevices.map((dev, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-zinc-300 text-[10px] capitalize"
                    >
                      {dev} Client
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-500 text-[11px]">No active device sessions registered</span>
                )}
              </div>
            </div>

            {/* Quick Admin Actions */}
            <div className="space-y-2 pt-2 border-t border-white/[0.08]">
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold mb-3">
                Administrative Controls
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => executeUserAction(selectedUser.id, "grant_vip")}
                  className="p-3 rounded-2xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Grant VIP</span>
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => executeUserAction(selectedUser.id, "grant_pro")}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>Grant Pro</span>
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => executeUserAction(selectedUser.id, "reset_sessions")}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Limits</span>
                </button>

                <button
                  disabled={actionLoading}
                  onClick={() => executeUserAction(selectedUser.id, "toggle_ban")}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    selectedUser.isBanned
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  }`}
                >
                  {selectedUser.isBanned ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{selectedUser.isBanned ? "Unban" : "Ban Account"}</span>
                </button>
              </div>
            </div>

            {/* Account Metadata */}
            <div className="text-[10px] text-zinc-600 space-y-1 pt-4 border-t border-white/[0.06]">
              <div>Candidate ID: <span className="text-zinc-400">{selectedUser.id}</span></div>
              <div>Created: <span className="text-zinc-400">{new Date(selectedUser.createdAt).toLocaleString()}</span></div>
              {selectedUser.lastActiveAt && (
                <div>Last Active: <span className="text-zinc-400">{new Date(selectedUser.lastActiveAt).toLocaleString()}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: Stat Card with Trend Deltas ──
function StatCard({
  title,
  value,
  delta,
  deltaLabel,
  deltaPositive = true,
  subtext,
  icon,
  glow = "white",
  isPulsing = false,
}: {
  title: string;
  value: string;
  delta?: string;
  deltaLabel?: string;
  deltaPositive?: boolean;
  subtext?: string;
  icon: React.ReactNode;
  glow?: "sky" | "emerald" | "cyan" | "amber" | "white";
  isPulsing?: boolean;
}) {
  const glowBorder = {
    sky: "hover:border-sky-400/30 hover:shadow-[0_0_25px_rgba(56,189,248,0.12)]",
    emerald: "hover:border-emerald-400/30 hover:shadow-[0_0_25px_rgba(52,211,153,0.12)]",
    cyan: "hover:border-cyan-400/30 hover:shadow-[0_0_25px_rgba(34,211,238,0.12)]",
    amber: "hover:border-amber-400/30 hover:shadow-[0_0_25px_rgba(251,191,36,0.12)]",
    white: "hover:border-white/30 hover:shadow-[0_0_25px_rgba(255,255,255,0.12)]",
  }[glow];

  return (
    <div
      className={`bg-[#08080c] border border-white/[0.08] p-5 rounded-3xl flex flex-col justify-between transition-all duration-300 group ${glowBorder}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-white tracking-tight">{value}</span>
          {delta && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                deltaPositive
                  ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                  : "bg-rose-400/10 text-rose-400 border border-rose-400/20"
              }`}
              title={deltaLabel || "Change"}
            >
              {deltaPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {delta}
            </span>
          )}
        </div>
        {subtext && <div className="text-[10px] font-mono text-zinc-500 mt-1 truncate">{subtext}</div>}
      </div>
    </div>
  );
}

// ── Sub-component: Status Badge ──
function StatusPill({ status, isLive }: { status: string; isLive?: boolean }) {
  if (status === "banned") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
        Banned
      </span>
    );
  }
  if (status === "active_desktop" || (isLive && status.includes("desktop"))) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 flex items-center gap-1 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Desktop Live</span>
      </span>
    );
  }
  if (status === "active_web" || isLive) {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-400/15 text-cyan-400 border border-cyan-400/30 flex items-center gap-1 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        <span>Web Live</span>
      </span>
    );
  }
  if (status === "idle") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-500">
        Idle &gt;7d
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/10">
      Active
    </span>
  );
}

// ── Sub-component: High-Performance Dual-Axis Chart ──
function DualAxisChart({
  data,
  hoveredPoint,
  onHover,
}: {
  data: MetricTimeSeriesPoint[];
  hoveredPoint: MetricTimeSeriesPoint | null;
  onHover: (pt: MetricTimeSeriesPoint | null) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center font-mono text-xs text-zinc-600">
        No time-series data available for the chosen interval.
      </div>
    );
  }

  const width = 800;
  const height = 180;
  const paddingX = 20;
  const paddingY = 20;

  // Max calculations
  const maxSignups = Math.max(...data.map((d) => d.signups), 1);
  const maxActive = Math.max(...data.map((d) => d.activeUsers), 1);
  const chartMax = Math.max(maxSignups, maxActive, 5);

  const stepX = (width - paddingX * 2) / Math.max(data.length - 1, 1);

  // Points for Active Users (Area)
  const activePoints = data.map((d, idx) => {
    const x = paddingX + idx * stepX;
    const y = height - paddingY - (d.activeUsers / chartMax) * (height - paddingY * 2);
    return { x, y, pt: d };
  });

  // Area Path for Active Users
  const areaPath = `M ${activePoints[0].x} ${height - paddingY} ` +
    activePoints.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${activePoints[activePoints.length - 1].x} ${height - paddingY} Z`;

  // Line Path for Active Users
  const linePath = activePoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48 overflow-visible"
        onMouseLeave={() => onHover(null)}
      >
        <defs>
          <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {[0, 0.33, 0.66, 1].map((pct, idx) => {
          const y = height - paddingY - pct * (height - paddingY * 2);
          return (
            <line
              key={idx}
              x1={paddingX}
              y1={y}
              x2={width - paddingX}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Bars: Daily Signups */}
        {data.map((d, idx) => {
          const x = paddingX + idx * stepX;
          const barHeight = ((d.signups / chartMax) * (height - paddingY * 2));
          const y = height - paddingY - barHeight;
          const barWidth = Math.min(Math.max(stepX * 0.45, 3), 16);

          return (
            <rect
              key={idx}
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={2}
              fill="url(#barGradient)"
              className="transition-all hover:opacity-100 opacity-75"
              onMouseEnter={() => onHover(d)}
            />
          );
        })}

        {/* Area: Active Users */}
        <path d={areaPath} fill="url(#activeGradient)" />

        {/* Line: Active Users */}
        <path
          d={linePath}
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover Points & Interactive Hit Area */}
        {activePoints.map((p, idx) => (
          <g key={idx} onMouseEnter={() => onHover(p.pt)}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.date === p.pt.date ? 5 : 2.5}
              fill="#34d399"
              stroke="#000000"
              strokeWidth="2"
              className="cursor-pointer transition-all"
            />
          </g>
        ))}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && (
        <div className="absolute top-2 right-4 bg-[#0d0d13] border border-white/20 p-3 rounded-2xl shadow-2xl font-mono text-xs space-y-1 pointer-events-none z-20">
          <div className="text-white font-bold">{hoveredPoint.label} ({hoveredPoint.date})</div>
          <div className="flex items-center justify-between gap-4 text-zinc-300">
            <span>New Signups:</span>
            <span className="text-white font-bold">{hoveredPoint.signups}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Daily Active Users:</span>
            <span className="font-bold">{hoveredPoint.activeUsers}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-cyan-400">
            <span>Questions Asked:</span>
            <span className="font-bold">{hoveredPoint.questionsCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
