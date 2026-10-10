"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const from = searchParams.get("from") || "/admin";
        window.location.href = from;
      } else {
        const data = await res.json();
        setError(data.error || "Помилка авторизації");
      }
    } catch {
      setError("Мережева помилка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SubpageStripesContainer pattern="telemetry" className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-white selection:text-black">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <GhostDetectiveLogo size="lg" animated={true} />
          </div>
          <h1 className="text-lg font-black font-mono text-white tracking-widest uppercase flex items-center gap-2">
            Ghostboard Admin
          </h1>
          <span className="text-[10px] font-mono text-zinc-500 tracking-widest mt-1">
            EXECUTIVE CONTROL VAULT
          </span>
        </div>

        <form onSubmit={handleLogin} className="bg-[#08080c]/90 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          <div className="mb-6">
            <label className="block text-xs font-mono font-bold text-zinc-400 mb-2 uppercase tracking-wider">
              Secret Key
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-4 h-4 text-zinc-500" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/20 transition-all"
                placeholder="Enter password..."
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-mono text-zinc-500 hover:text-white"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-xs font-mono text-rose-400 animate-in fade-in">
                {error}
              </p>
            )}
          </div>


          <button
            type="submit"
            disabled={loading || !password}
            className="w-full btn-resend-primary text-xs font-mono !py-3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <span className="text-black font-bold uppercase tracking-wider">Unlock</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-[10px] font-mono text-zinc-600">
          AUTHORIZED PERSONNEL ONLY
        </p>
      </div>
    </SubpageStripesContainer>
  );
}

export default function AdminLogin() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#000000]"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
