"use client";

import React, { useState } from "react";
import { Laptop, Smartphone, Globe, RefreshCw, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export interface DeviceSession {
  id: string;
  publicId?: string;
  deviceType: string;
  clientName?: string;
  os?: string;
  createdAt: string;
  lastSeenAt?: string;
  isCurrent: boolean;
  ip?: string;
  location?: string;
}

interface DeviceManagerProps {
  devices: DeviceSession[];
  loading: boolean;
  locale: string;
  onRefresh: () => void;
  onRevokeDevice: (sessionId: string) => Promise<void>;
  onRevokeAllOthers: () => Promise<void>;
}

export function DeviceManager({
  devices,
  loading,
  locale,
  onRefresh,
  onRevokeDevice,
  onRevokeAllOthers,
}: DeviceManagerProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isTerminatingAll, setIsTerminatingAll] = useState(false);
  const [confirmTerminateModal, setConfirmTerminateModal] = useState(false);

  const nonCurrentDevices = devices.filter((d) => !d.isCurrent);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await onRevokeDevice(id);
    } finally {
      setRevokingId(null);
    }
  };

  const handleTerminateAll = async () => {
    setIsTerminatingAll(true);
    try {
      await onRevokeAllOthers();
      setConfirmTerminateModal(false);
    } finally {
      setIsTerminatingAll(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 2) return locale === "ua" ? "Активний зараз" : "Active just now";
    if (mins < 60) return locale === "ua" ? `${mins} хв тому` : `${mins}m ago`;
    if (hours < 24) return locale === "ua" ? `${hours} год тому` : `${hours}h ago`;
    return locale === "ua" ? `${days} дн тому` : `${days}d ago`;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-6">
      {/* Header and Bulk Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-tight">
              {locale === "ua" ? "Підключені пристрої" : "Connected Devices & Sessions"}
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono text-zinc-300 border border-white/10">
              {devices.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {locale === "ua"
              ? "Активні веб-сесії, десктопний стелс-суфлер та мобільний компаньйон"
              : "Active web browser logins, desktop stealth HUD prompters, and mobile companions"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white cursor-pointer disabled:opacity-50"
            title={locale === "ua" ? "Оновити список пристроїв" : "Refresh active sessions"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{locale === "ua" ? "Оновити" : "Refresh"}</span>
          </button>

          {nonCurrentDevices.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmTerminateModal(true)}
              disabled={isTerminatingAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-2 text-xs font-medium text-red-300 transition-all hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-200 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{locale === "ua" ? "Відключити всі інші" : "Terminate all other sessions"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation banner for bulk revocation */}
      {confirmTerminateModal && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-red-500/30 bg-red-950/30">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-white block">
                {locale === "ua"
                  ? "Відключити всі інші сесії?"
                  : "Terminate all other active sessions?"}
              </span>
              <span className="text-zinc-400">
                {locale === "ua"
                  ? `Усі інші ${nonCurrentDevices.length} пристрої будуть негайно деавторизовані.`
                  : `All other ${nonCurrentDevices.length} devices will be immediately signed out.`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmTerminateModal(false)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-300 hover:text-white"
            >
              {locale === "ua" ? "Скасувати" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleTerminateAll}
              disabled={isTerminatingAll}
              className="px-3.5 py-1.5 rounded-lg bg-red-500 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isTerminatingAll
                ? locale === "ua"
                  ? "Відключення..."
                  : "Terminating..."
                : locale === "ua"
                ? "Підтвердити"
                : "Confirm Terminate"}
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {loading && devices.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-zinc-400" />
            <span>{locale === "ua" ? "Завантаження сесій..." : "Loading active device sessions..."}</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-6 text-center text-xs text-zinc-500">
            {locale === "ua" ? "Немає інших активних пристроїв" : "No other connected devices found"}
          </div>
        ) : (
          devices.map((dev) => {
            const isDesktop = dev.deviceType === "desktop";
            const isCompanion = dev.deviceType === "companion" || dev.deviceType === "phone";
            const isRevoking = revokingId === (dev.publicId || dev.id);

            // Compute icon
            const DeviceIcon = isDesktop ? Laptop : isCompanion ? Smartphone : Globe;

            // Compute title
            const title =
              dev.clientName ||
              (isDesktop
                ? "Ghostboard Desktop (HUD Client)"
                : isCompanion
                ? "Safari on iOS (Companion)"
                : "Chrome on macOS");

            return (
              <div
                key={dev.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4.5 transition-all ${
                  dev.isCurrent
                    ? "border-emerald-500/30 bg-emerald-950/[0.07]"
                    : "border-white/[0.06] bg-zinc-900/40 hover:border-white/10"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                      dev.isCurrent
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : isDesktop
                        ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                        : isCompanion
                        ? "border-purple-500/20 bg-purple-500/10 text-purple-400"
                        : "border-white/10 bg-white/[0.04] text-zinc-300"
                    }`}
                  >
                    <DeviceIcon className="h-5 w-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white tracking-tight truncate">
                        {title}
                      </span>

                      {dev.isCurrent && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{locale === "ua" ? "Поточний пристрій" : "Current Device"}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span>{formatRelativeTime(dev.createdAt)}</span>
                      <span>•</span>
                      <span>{dev.location || "Kyiv, Ukraine"}</span>
                      {dev.ip && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-zinc-400">IP: {dev.ip}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!dev.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(dev.publicId || dev.id)}
                    disabled={isRevoking}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98] disabled:opacity-50 cursor-pointer self-end sm:self-center shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>
                      {isRevoking
                        ? locale === "ua"
                          ? "Відключення..."
                          : "Disconnecting..."
                        : locale === "ua"
                        ? "Відключити"
                        : "Disconnect"}
                    </span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
