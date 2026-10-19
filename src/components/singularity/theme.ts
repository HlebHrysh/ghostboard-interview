export type Theme = "dark" | "light";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Apply + persist a theme with a short colour crossfade. */
export function setTheme(next: Theme) {
  if (typeof document === "undefined") return;
  const d = document.documentElement;
  d.classList.add("theme-fade");
  d.dataset.theme = next;
  d.classList.toggle("dark", next === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f4f4f2" : "#000000");
  try {
    localStorage.setItem("gb-theme", next);
  } catch {}
  window.setTimeout(() => d.classList.remove("theme-fade"), 260);
}

export const toggleTheme = () => setTheme(getTheme() === "dark" ? "light" : "dark");
