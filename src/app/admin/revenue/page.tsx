"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Download,
  Loader2,
  Percent,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface EnrichedPaymentItem {
  id: string;
  userId: string;
  email: string;
  plan: string;
  amountCents: number;
  amountUsdCents: number;
  currency: "UAH" | "USD" | "EUR";
  provider: "monobank" | "lemonsqueezy" | "stripe" | "sandbox";
  providerEventId: string;
  invoiceId: string;
  status: string;
  signatureStatus: string;
  billingCycle: string;
  planExpiresAt: string | null;
  timestamp: number;
  createdAt: string;
  refundedAt?: string | null;
  refundReason?: string | null;
}

interface RevenueSummary {
  totalTransactions: number;
  succeededTransactions: number;
  refundedTransactions: number;
  totalUsers: number;
  paidUsersCount: number;
  grossUsdCents: number;
  mrrUsdCents: number;
  conversionRatePercent: number;
  currencyBreakdown: Record<
    "UAH" | "USD" | "EUR",
    { count: number; grossMinor: number; refundedMinor: number }
  >;
  providerBreakdown: Record<
    "monobank" | "lemonsqueezy" | "stripe" | "sandbox",
    { count: number; grossUsdCents: number }
  >;
}

const PROVIDER_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  monobank: {
    label: "Monobank",
    className: "bg-zinc-100 text-black border-white/40",
  },
  lemonsqueezy: {
    label: "Lemon Squeezy",
    className: "bg-violet-500/15 text-violet-200 border-violet-400/30",
  },
  stripe: {
    label: "Stripe",
    className: "bg-indigo-500/15 text-indigo-200 border-indigo-400/30",
  },
  sandbox: {
    label: "Sandbox",
    className: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  },
};

const SIG_LABEL: Record<string, { label: string; verified: boolean }> = {
  verified_ecdsa: { label: "ECDSA X-Sign", verified: true },
  verified_hmac: { label: "HMAC X-Signature", verified: true },
  verified_stripe: { label: "Stripe HMAC", verified: true },
  verified_sandbox: { label: "Sandbox HMAC", verified: true },
  dev_unsigned: { label: "Unsigned (Dev)", verified: false },
};

function formatNativeAmount(
  minor: number,
  currency: "UAH" | "USD" | "EUR" | string,
): string {
  const major = (minor || 0) / 100;
  const val = major.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  if (currency === "UAH") return `₴${val}`;
  if (currency === "EUR") return `€${val}`;
  return `$${val}`;
}

export default function AdminRevenue() {
  const [payments, setPayments] = useState<EnrichedPaymentItem[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const refundDialogRef = useRef<HTMLDialogElement | null>(null);
  const [refundTarget, setRefundTarget] = useState<EnrichedPaymentItem | null>(
    null,
  );
  const [refundReason, setRefundReason] = useState(
    "Customer refund / plan revoked by admin",
  );
  const [processingRefund, setProcessingRefund] = useState(false);

  const fetchRevenue = async () => {
    try {
      const res = await fetch("/api/admin/revenue", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/admin/login?from=/admin/revenue";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setPayments(data);
      } else if (data && Array.isArray(data.payments)) {
        setPayments(data.payments);
        if (data.summary) setSummary(data.summary);
      } else {
        setPayments([]);
      }
    } catch {
      toast.error("Failed to fetch revenue analytics");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  useEffect(() => {
    const dlg = refundDialogRef.current;
    if (!dlg) return;
    if (refundTarget && !dlg.open) {
      dlg.showModal();
    } else if (!refundTarget && dlg.open) {
      dlg.close();
    }
  }, [refundTarget]);

  const { grossUsd, mrrUsd, uahGrossMinor, usdGrossMinor } = useMemo(() => {
    const computedGrossUsd =
      (summary?.grossUsdCents ??
        payments
          .filter((p) => p.status !== "refunded" && p.status !== "failed")
          .reduce((acc, p) => acc + (p.amountUsdCents || p.amountCents || 0), 0)) /
      100;

    const computedMrrUsd =
      (summary?.mrrUsdCents ??
        payments
          .filter(
            (p) =>
              p.status !== "refunded" &&
              p.status !== "failed" &&
              p.plan.toLowerCase().includes("pro"),
          )
          .reduce((acc, p) => acc + (p.amountUsdCents || 1500), 0)) / 100;

    const computedUahGross =
      summary?.currencyBreakdown?.UAH?.grossMinor ??
      payments
        .filter((p) => p.currency === "UAH" && p.status !== "refunded")
        .reduce((acc, p) => acc + (p.amountCents || 0), 0);

    const computedUsdGross =
      summary?.currencyBreakdown?.USD?.grossMinor ??
      payments
        .filter((p) => p.currency === "USD" && p.status !== "refunded")
        .reduce((acc, p) => acc + (p.amountCents || 0), 0);

    return {
      grossUsd: computedGrossUsd,
      mrrUsd: computedMrrUsd,
      uahGrossMinor: computedUahGross,
      usdGrossMinor: computedUsdGross,
    };
  }, [payments, summary]);

  const conversionRate = summary?.conversionRatePercent ?? 0;

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesSearch =
        !q ||
        p.email.toLowerCase().includes(q) ||
        p.invoiceId?.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.plan.toLowerCase().includes(q);
      const matchesProvider =
        providerFilter === "all" || p.provider === providerFilter;
      const matchesCurrency =
        currencyFilter === "all" || p.currency === currencyFilter;
      const matchesStatus =
        statusFilter === "all" || p.status === statusFilter;
      return (
        matchesSearch && matchesProvider && matchesCurrency && matchesStatus
      );
    });
  }, [payments, search, providerFilter, currencyFilter, statusFilter]);

  const escapeCsvCell = (raw: string | number | null | undefined): string => {
    const str = String(raw ?? "");
    const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const exportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error("No transactions match the current filters");
      return;
    }
    const headers = [
      "PaymentID",
      "InvoiceID",
      "Provider",
      "Email",
      "Plan",
      "Cycle",
      "Currency",
      "AmountNative",
      "AmountUSD",
      "SignatureStatus",
      "Status",
      "Timestamp",
    ];
    const rows = filteredPayments.map((p) =>
      [
        p.id,
        p.invoiceId,
        p.provider,
        p.email,
        p.plan,
        p.billingCycle,
        p.currency,
        (p.amountCents / 100).toFixed(2),
        ((p.amountUsdCents || p.amountCents) / 100).toFixed(2),
        p.signatureStatus,
        p.status,
        new Date(p.timestamp).toISOString(),
      ].map(escapeCsvCell),
    );
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ghostboard_revenue_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Revenue ledger exported as CSV");
  };

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;
    setProcessingRefund(true);
    try {
      const res = await fetch("/api/admin/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refund_and_revoke",
          paymentId: refundTarget.id,
          reason: refundReason,
          issueGatewayRefund: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to revoke plan / issue refund");
        return;
      }

      toast.success(
        `Refund processed & plan revoked for ${refundTarget.email}`,
      );
      setRefundTarget(null);
      await fetchRevenue();
    } catch {
      toast.error("Network error while issuing refund");
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-mono text-white tracking-wider uppercase flex flex-wrap items-center gap-3">
            <span>Multi-Gateway Revenue Ledger</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/25">
              ${grossUsd.toFixed(2)} USD Normalized
            </span>
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-1">
            Monobank Acquiring · Lemon Squeezy · Stripe · Sandbox · Real-time ECDSA & HMAC audit
          </p>
        </div>

        <button
          type="button"
          onClick={exportCSV}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-200 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
        >
          <Download className="w-3.5 h-3.5 text-zinc-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#0d0f12] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              Net Active Revenue
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              ${grossUsd.toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {summary?.succeededTransactions ?? payments.length} settled ·{" "}
              {summary?.refundedTransactions ?? 0} refunded
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0d0f12] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              Normalized MRR
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              ${mrrUsd.toFixed(0)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Recurring Pro equivalent
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0d0f12] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              Paid Conversion
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-300 mt-1">
              {conversionRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {summary?.paidUsersCount ?? 0} paid / {summary?.totalUsers ?? 0} users
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-[#0d0f12] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex items-center justify-between font-mono">
          <div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
              Currency Mix
            </div>
            <div className="text-base sm:text-lg font-black text-amber-300 mt-1">
              ₴{Math.round(uahGrossMinor / 100).toLocaleString("en-US")} UAH
            </div>
            <div className="text-xs font-bold text-zinc-300 mt-0.5">
              ${(usdGrossMinor / 100).toFixed(2)} USD
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Multi-Provider Breakdown Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {(["monobank", "lemonsqueezy", "stripe", "sandbox"] as const).map(
          (prov) => {
            const stat = summary?.providerBreakdown?.[prov] || {
              count: payments.filter((p) => p.provider === prov).length,
              grossUsdCents: payments
                .filter((p) => p.provider === prov && p.status !== "refunded")
                .reduce((acc, p) => acc + (p.amountUsdCents || p.amountCents), 0),
            };
            const meta = PROVIDER_BADGE[prov];
            return (
              <div
                key={prov}
                className="rounded-2xl border border-white/[0.08] bg-[#08090a] px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-[11px] font-bold text-zinc-200">
                    {meta.label}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {stat.count} tx
                  </div>
                </div>
                <div className="text-xs font-bold text-emerald-300">
                  ${(stat.grossUsdCents / 100).toFixed(2)}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-3xl bg-[#08090a] border border-white/[0.08] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by email, invoiceId, paymentId..."
            aria-label="Filter transactions"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-2 focus-visible:outline-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            aria-label="Filter by payment provider"
            className="bg-[#0d0f12] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus-visible:outline-2 focus-visible:outline-white"
          >
            <option value="all">All Gateways</option>
            <option value="monobank">Monobank</option>
            <option value="lemonsqueezy">Lemon Squeezy</option>
            <option value="stripe">Stripe</option>
            <option value="sandbox">Sandbox</option>
          </select>

          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            aria-label="Filter by currency"
            className="bg-[#0d0f12] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus-visible:outline-2 focus-visible:outline-white"
          >
            <option value="all">All Currencies</option>
            <option value="UAH">UAH (₴)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by payment status"
            className="bg-[#0d0f12] border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus-visible:outline-2 focus-visible:outline-white"
          >
            <option value="all">All Statuses</option>
            <option value="succeeded">Succeeded</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Responsive Table */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Multi-Provider Payment Ledger Table"
        className="rounded-3xl border border-white/[0.08] bg-[#08090a] overflow-x-auto focus-visible:outline-2 focus-visible:outline-white"
      >
        <table className="w-full text-left border-collapse font-mono text-xs min-w-[880px]">
          <caption className="sr-only">
            Multi-provider payment transactions with webhook signature verification and refund actions
          </caption>
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] text-zinc-400 uppercase tracking-wider">
              <th scope="col" className="py-3.5 px-5 font-bold">
                Invoice / Gateway
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Customer
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Plan & Expiry
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Amount
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Signature
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Status
              </th>
              <th scope="col" className="py-3.5 px-5 font-bold text-right">
                Admin Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.05]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                    <span>Loading payment telemetry...</span>
                  </div>
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center gap-2">
                    <CreditCard className="w-8 h-8 text-zinc-700" />
                    <span>No transactions found matching filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => {
                const provMeta = PROVIDER_BADGE[p.provider] || PROVIDER_BADGE.stripe;
                const sigMeta = SIG_LABEL[p.signatureStatus] || {
                  label: p.signatureStatus || "Verified",
                  verified: true,
                };
                const isRefunded = p.status === "refunded";
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${provMeta.className}`}
                        >
                          {provMeta.label}
                        </span>
                        <span
                          className="text-[11px] text-zinc-500 truncate max-w-[160px]"
                          title={p.invoiceId || p.id}
                        >
                          {p.invoiceId || p.id.slice(0, 12)}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-zinc-100 font-semibold">
                        {p.email}
                      </div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(p.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          p.plan.toLowerCase().includes("lifetime")
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : "bg-white/10 text-white border-white/20"
                        }`}
                      >
                        {p.plan} ({p.billingCycle})
                      </span>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        {p.planExpiresAt
                          ? `Exp: ${new Date(p.planExpiresAt).toLocaleDateString()}`
                          : p.plan === "lifetime"
                          ? "Permanent Access"
                          : "—"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div
                        className={`text-sm font-black ${
                          isRefunded ? "text-zinc-500 line-through" : "text-white"
                        }`}
                      >
                        {formatNativeAmount(p.amountCents, p.currency)}
                      </div>
                      {p.currency !== "USD" && (
                        <div className="text-[10px] text-zinc-500">
                          ≈ ${((p.amountUsdCents || 0) / 100).toFixed(2)} USD
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                          sigMeta.verified
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/25"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{sigMeta.label}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {isRefunded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold">
                          <RotateCcw className="w-3 h-3" />
                          <span>refunded</span>
                        </span>
                      ) : p.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          <span>failed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{p.status}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      {!isRefunded ? (
                        <button
                          type="button"
                          onClick={() => setRefundTarget(p)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-200 hover:bg-rose-500/20 hover:border-rose-400/50 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-300"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Issue Refund / Revoke Plan</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600">
                          Revoked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Native <dialog> Confirmation Modal for 1-Click Refund / Revoke Plan */}
      <dialog
        ref={refundDialogRef}
        onCancel={(e) => {
          e.preventDefault();
          if (!processingRefund) setRefundTarget(null);
        }}
        className="m-auto w-[min(92vw,460px)] rounded-3xl border border-white/[0.12] bg-[#0d0f12] p-6 text-zinc-100 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop:bg-black/80 backdrop:backdrop-blur-md overscroll-contain"
      >
        {refundTarget && (
          <div className="space-y-4 font-mono">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">
                  <AlertTriangle className="w-3 h-3" />
                  Admin Security Action
                </span>
                <h2 className="mt-2 text-lg font-bold text-white">
                  Issue Refund & Revoke Plan
                </h2>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/50 p-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Customer:</span>
                <span className="text-white font-semibold">
                  {refundTarget.email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Gateway:</span>
                <span className="text-zinc-200 uppercase">
                  {refundTarget.provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Refund Amount:</span>
                <span className="text-rose-300 font-bold">
                  {formatNativeAmount(
                    refundTarget.amountCents,
                    refundTarget.currency,
                  )}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="refund-reason-input"
                className="block text-[11px] text-zinc-400 mb-1.5"
              >
                Audit Reason:
              </label>
              <input
                id="refund-reason-input"
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-white"
              />
            </div>

            <p className="text-[11px] font-sans text-zinc-400 leading-relaxed">
              This will mark the transaction as refunded, immediately downgrade the user to Free tier, and purge their L1 session cache in &lt;1ms.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                autoFocus
                disabled={processingRefund}
                onClick={() => setRefundTarget(null)}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.08] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingRefund}
                onClick={handleConfirmRefund}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white hover:bg-rose-400 cursor-pointer disabled:opacity-60"
              >
                {processingRefund ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>
                  {processingRefund
                    ? "Refunding..."
                    : "Confirm Refund & Revoke"}
                </span>
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
