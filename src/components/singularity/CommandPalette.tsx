"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft } from "lucide-react";
import { emitShockwave } from "./BlackHoleCanvas";
import { toggleTheme } from "./theme";

const DESTINATIONS = [
  { label: "Home", href: "/", hint: "Landing" },
  { label: "Interview HUD", href: "/interview", hint: "Live teleprompter" },
  { label: "Mock interview", href: "/mock-interview", hint: "Practice" },
  { label: "Cabinet", href: "/cabinet", hint: "Mission control" },
  { label: "Dashboard", href: "/dashboard", hint: "Sessions" },
  { label: "Pricing", href: "/pricing", hint: "Plans" },
  { label: "Download", href: "/download", hint: "Desktop & mobile" },
  { label: "Guide", href: "/guide", hint: "Documentation" },
  { label: "Settings", href: "/settings", hint: "Audio, keys, theme" },
  { label: "Profile", href: "/profile", hint: "Account" },
  { label: "Sign in", href: "/auth/login", hint: "Auth" },
  { label: "Create account", href: "/auth/signup", hint: "Auth" },
  { label: "Toggle theme", href: "#theme", hint: "Dark / Light" },
];

/** ⌘K / Ctrl+K — the space-fold navigator. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? DESTINATIONS.filter((d) => `${d.label} ${d.hint} ${d.href}`.toLowerCase().includes(s)) : DESTINATIONS;
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) prevFocus.current = document.activeElement as HTMLElement | null;
          return !o;
        });
        setQ("");
        setIdx(0);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    else prevFocus.current?.focus?.();
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    if (href === "#theme") {
      toggleTheme();
      return;
    }
    emitShockwave(window.innerWidth / 2, window.innerHeight * 0.25);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && items[idx]) {
      e.preventDefault();
      go(items[idx].href);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center sg-scrim px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 sg-glass-strong backdrop-blur-2xl"
            style={{ transformPerspective: 900, transformOrigin: "50% 0%" }}
            initial={{ scaleY: 0.04, rotateX: -35, opacity: 0, filter: "blur(10px)" }}
            animate={{ scaleY: 1, rotateX: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ scaleY: 0.04, rotateX: -35, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="h-4 w-4 text-zinc-400" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => (setQ(e.target.value), setIdx(0))}
                onKeyDown={onInputKey}
                role="combobox"
                aria-expanded="true"
                aria-controls="gb-cmdk-list"
                aria-activedescendant={items[idx] ? `gb-cmdk-${idx}` : undefined}
                placeholder="Jump to…"
                className="h-12 w-full bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
              />
              <kbd className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">ESC</kbd>
            </div>
            <ul id="gb-cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-400">Nothing in this region of space.</li>}
              {items.map((d, i) => (
                <li
                  key={d.href}
                  id={`gb-cmdk-${i}`}
                  role="option"
                  aria-selected={i === idx}
                  onMouseMove={() => setIdx(i)}
                  onClick={() => go(d.href)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    i === idx ? "bh-face-primary font-semibold shadow-sm" : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <span className="font-medium">{d.label}</span>
                  <span className={`flex items-center gap-2 text-xs ${i === idx ? "text-zinc-700" : "text-zinc-500"}`}>
                    {d.hint}
                    {i === idx && <CornerDownLeft className="h-3 w-3" aria-hidden />}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
