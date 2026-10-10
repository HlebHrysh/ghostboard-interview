"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Search,
  Download,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Sparkles,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface PaymentItem {
  id: string;
  userId: string;
  email: string;
  plan: string;
  amountCents: number;
  timestamp: number;
  status: string;
}

export default function AdminRevenue() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/revenue");
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/revenue";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setPayments(data);
      } else {
        setPayments([]);
      }
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const safePayments = Array.isArray(payments) ? payments : [];

  // Financial Metrics
  const totalRevenue = safePayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const proPayments = safePayments.filter((p) => p.plan && p.plan.toLowerCase().includes("pro"));
  const lifetimePayments = safePayments.filter((p) => p.plan && p.plan.toLowerCase().includes("lifetime"));
  const proRevenue = proPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
  const lifetimeRevenue = lifetimePayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;

  // Approx MRR: sum of monthly active pro rate
  const mrr = proPayments.length > 0 ? (proPayments.length * 15) : 0;
  const aov = safePayments.length > 0 ? totalRevenue / safePayments.length : 0;

  const exportCSV = () => {
    if (safePayments.length === 0) {
      toast.error("Немає записів для експорту");
      return;
    }
    const headers = ["PaymentID", "UserID", "CustomerEmail", "Plan", "AmountUSD", "Status", "Date"];
    const rows = safePayments.map((p) => [
      p.id,
      p.userId,
      p.email,
      p.plan,
      (p.amountCents / 100).toFixed(2),
      p.status,
      new Date(p.timestamp).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ghostboard_financials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV фінансовий звіт завантажено");
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return safePayments.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        p.email.toLowerCase().includes(q) ||
        p.plan.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "succeeded" && p.status === "succeeded") ||
        (statusFilter === "simulated" && p.status === "simulated") ||
        (statusFilter === "failed" && p.status === "failed");

      const matchesPlan =
        planFilter === "all" ||
        (planFilter === "pro" && p.plan.toLowerCase().includes("pro")) ||
        (planFilter === "lifetime" && p.plan.toLowerCase().includes("lifetime"));

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [safePayments, search, statusFilter, planFilter]);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider uppercase flex items-center gap-3">
            <span>Financial Ledger</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              ${totalRevenue.toFixed(2)} USD
            </span>
          </h1>
          <p className="text-xs font-mono text-zinc-500 mt-1">
            Транзакції Stripe, підписки Pro та довічні перепустки Lifetime Founder
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export CSV</span>
          </button>

          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white transition-all"
          >
            <span>Stripe Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* ── Financial Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Gross Revenue</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">${totalRevenue.toFixed(2)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{safePayments.length} транзакцій</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Estimated MRR</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">${mrr.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{proPayments.length} активних Pro</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Lifetime Passes</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">${lifetimeRevenue.toFixed(0)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{lifetimePayments.length} засновників</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#08080c] border border-white/[0.08] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg Order Value (AOV)</div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">${aov.toFixed(1)}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">на транзакцію</div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-[#08080c] border border-white/[0.08] p-4 rounded-3xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за email клієнта або ID транзакції..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 transition-all"
          />
        </div>

        {/* Plan Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: "all", label: "Всі плани" },
            { key: "pro", label: "Pro" },
            { key: "lifetime", label: "Lifetime" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPlanFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[10px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                planFilter === tab.key
                  ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.07]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: "all", label: "Всі статуси" },
            { key: "succeeded", label: "Stripe Live" },
            { key: "simulated", label: "Simulator" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[10px] tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.key
                  ? "bg-white text-black font-bold"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Payments Table ── */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      ) : (
        <div className="bg-[#08080c] border border-white/[0.08] rounded-3xl overflow-hidden overflow-x-auto shadow-2xl">
          <table className="w-full text-left font-mono text-xs whitespace-nowrap">
            <thead className="bg-white/[0.03] border-b border-white/[0.08] text-zinc-400">
              <tr>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Date</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Customer Email</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider">Purchased Plan</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-right">Amount</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">Gateway Mode</th>
                <th className="p-4 font-bold uppercase text-[10px] tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredPayments.map((p) => {
                const dateStr = new Date(p.timestamp).toLocaleString("uk-UA", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isSimulated = p.status === "simulated";

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-zinc-400">{dateStr}</td>
                    <td className="p-4 text-white font-bold">{p.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          p.plan.toLowerCase().includes("lifetime")
                            ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                            : "bg-white/10 text-white border border-white/20"
                        }`}
                      >
                        {p.plan}
                      </span>
                    </td>
                    <td className="p-4 text-right text-emerald-400 font-bold text-sm">
                      ${((p.amountCents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isSimulated
                            ? "bg-white/[0.08] text-zinc-300 border border-white/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isSimulated ? "Simulator" : "Stripe API"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          p.status === "succeeded" || p.status === "simulated"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{p.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500 font-mono">
                    Транзакцій за заданим фільтром не знайдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
