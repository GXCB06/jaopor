// Light/dark theme (Design.md §2 Theme). Dark is the default; the choice lives in localStorage.
// Client side: client components read the <html> class through useThemeMode(). The no-flash
// <head> script lives in theme-script.ts (importable from Server Components).
import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ThemeMode = "light" | "dark";

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Private mode / blocked storage: the theme still applies for this page view.
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(
    subscribe,
    () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    () => "dark",
  );
}
