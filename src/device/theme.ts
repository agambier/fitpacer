import { store } from "./store";

// Colour theme: "dark" (default, gym use) or "light" (light greys).
// The choice is stored; without one, the system preference applies.
// index.html applies the stored choice before first paint (same key) to avoid a flash.
export type Theme = "dark" | "light";
const KEY = "fitpacer.theme";
const BAR_COLOR: Record<Theme, string> = { dark: "#101C26", light: "#DADFE4" };

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function currentTheme(): Theme {
  const t = store.get(KEY, "");
  return t === "light" || t === "dark" ? t : systemTheme();
}

export function applyTheme(t: Theme = currentTheme()) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BAR_COLOR[t]);
}

export function setTheme(t: Theme) {
  store.set(KEY, t);
  applyTheme(t);
}
