"use client";

import { useSyncExternalStore } from "react";
import type { Theme } from "./theme";

function subscribe(cb: () => void) {
  if (typeof document === "undefined") return () => {};
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** Reactive current theme (SSR-safe: renders "dark" on the server, corrects after hydration). */
export function useTheme(): Theme {
  return useSyncExternalStore<Theme>(
    subscribe,
    () => (typeof document !== "undefined" && document.documentElement.dataset.theme === "light" ? "light" : "dark"),
    () => "dark"
  );
}
