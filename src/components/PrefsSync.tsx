"use client";

import { useLayoutEffect } from "react";
import { CURRENCY_STORAGE_KEY } from "@/lib/currency-script";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";

/**
 * Re-applies the theme and currency to <html> whenever the [locale] layout mounts. The <head>
 * scripts only run on a full page load; a language switch remounts the layout client-side, React
 * resets <html>'s attributes and the user's light theme (or currency) silently reverted.
 * Runs in a layout effect, so it lands before paint (no flash).
 */
export function PrefsSync() {
  useLayoutEffect(() => {
    const d = document.documentElement;
    try {
      const theme = localStorage.getItem(THEME_STORAGE_KEY);
      d.setAttribute("data-theme", theme === "light" ? "light" : "dark");
      const c = localStorage.getItem(CURRENCY_STORAGE_KEY);
      d.dataset.currency =
        c === "usd" || c === "thb" ? c : d.lang === "th" ? "thb" : "usd";
    } catch {
      // Blocked storage: keep whatever the page loaded with.
    }
  }, []);
  return null;
}
