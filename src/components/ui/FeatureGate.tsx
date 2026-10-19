"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { can, type Feature } from "@/lib/plans";

/** Renders children if the signed-in user's plan includes `feature`, otherwise an upgrade card. */
export function FeatureGate({ feature, children, label }: { feature: Feature; children: ReactNode; label?: string }) {
  const [plan, setPlan] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setPlan(d?.authenticated ? d.user.plan : null)).catch(() => setPlan(null));
  }, []);
  if (plan === undefined) return <div className="h-32 rounded-2xl border border-white/10 animate-pulse" />;
  if (plan !== null && can(plan, feature)) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <Lock className="w-5 h-5 mx-auto text-[var(--gp-mint)]" />
      <h3 className="mt-3 text-lg font-medium text-white">{label ?? "Доступно на Pro"}</h3>
      <p className="mt-1 text-sm text-zinc-400">{plan === null ? "Войдите, чтобы продолжить." : "Улучшите план, чтобы открыть эту функцию."}</p>
      <Link href={plan === null ? "/auth/login" : "/pricing"} className="btn-lime inline-flex mt-5 px-5 py-2.5 rounded-full text-sm font-semibold">
        {plan === null ? "Войти" : "Смотреть планы"}
      </Link>
    </div>
  );
}
