"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { toggleTheme } from "@/components/singularity/theme";
import { useTheme } from "@/components/singularity/useTheme";

export function ThemeToggle() {
  const theme = useTheme();

  useEffect(() => {
    // Stay in sync with other tabs / OS changes (when no explicit choice stored).
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onSys = () => {
      try {
        if (localStorage.getItem("gb-theme")) return;
      } catch {}
      document.documentElement.dataset.theme = mq.matches ? "light" : "dark";
      document.documentElement.classList.toggle("dark", !mq.matches);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "gb-theme" && e.newValue) {
        document.documentElement.dataset.theme = e.newValue;
        document.documentElement.classList.toggle("dark", e.newValue !== "light");
      }
    };
    mq.addEventListener("change", onSys);
    window.addEventListener("storage", onStorage);
    return () => {
      mq.removeEventListener("change", onSys);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] hover:border-white/25 text-zinc-300 hover:text-white flex items-center justify-center flex-shrink-0"
    >
      {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </button>
  );
}
