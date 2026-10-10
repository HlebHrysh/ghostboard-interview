"use client";

import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface SecuritySettingsProps {
  locale: string;
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

export function SecuritySettings({
  locale,
  onPasswordChange,
}: SecuritySettingsProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Live Password Strength Checklist
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isFormValid = currentPassword.length > 0 && hasMinLength && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (!hasMinLength) {
        toast.error(
          locale === "ua"
            ? "Новий пароль має бути не менше 8 символів"
            : "Password must be at least 8 characters"
        );
      } else if (!hasNumber) {
        toast.error(
          locale === "ua"
            ? "Пароль повинен містити принаймні 1 цифру"
            : "Password must include at least 1 number"
        );
      } else if (!hasSpecial) {
        toast.error(
          locale === "ua"
            ? "Пароль повинен містити принаймні 1 спецсимвол (!@#$%)"
            : "Password must include at least 1 special character"
        );
      }
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onPasswordChange(currentPassword, newPassword);
      if (ok) {
        setCurrentPassword("");
        setNewPassword("");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white tracking-tight">
              {locale === "ua" ? "Безпека та пароль" : "Security & Credentials"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {locale === "ua"
              ? "Оновлення пароля для доступу до веб-кабінету та десктопного додатку"
              : "Update your password to authorize access to web cabinet and desktop app"}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
          <KeyRound className="h-4 w-4 text-zinc-300" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Current Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              {locale === "ua" ? "Поточний пароль" : "Current Password"}
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 pr-11 text-sm text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-300">
              {locale === "ua" ? "Новий пароль" : "New Password"}
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2.5 pr-11 text-sm text-white placeholder-zinc-500 transition-all focus:border-white/30 focus:outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                title={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Live Password Checklist Requirements */}
        <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4">
          <div className="text-[11px] font-medium text-zinc-400 mb-2">
            {locale === "ua" ? "Вимоги до надійності пароля:" : "Password Strength Requirements:"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 text-xs">
              {hasMinLength ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0 mx-1" />
              )}
              <span className={hasMinLength ? "text-zinc-200" : "text-zinc-500"}>
                {locale === "ua" ? "Від 8 символів" : "8+ characters"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasNumber ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0 mx-1" />
              )}
              <span className={hasNumber ? "text-zinc-200" : "text-zinc-500"}>
                {locale === "ua" ? "Принаймні 1 цифра" : "At least 1 number"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasSpecial ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 shrink-0 mx-1" />
              )}
              <span className={hasSpecial ? "text-zinc-200" : "text-zinc-500"}>
                {locale === "ua" ? "1 спецсимвол (!@#$)" : "1 special character"}
              </span>
            </div>
          </div>
        </div>

        {/* Ergonomic Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              {submitting
                ? locale === "ua"
                  ? "Оновлення..."
                  : "Updating..."
                : locale === "ua"
                ? "Оновити пароль"
                : "Update Password"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
