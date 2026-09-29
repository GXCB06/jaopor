"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { applyTheme, useThemeMode } from "@/lib/theme";

/** Design.md §2 Theme: sun/moon icon button in the header. */
export function ThemeToggle() {
  const t = useTranslations("Nav");
  const mode = useThemeMode();
  const next = mode === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={next === "light" ? t("themeLight") : t("themeDark")}
      title={next === "light" ? t("themeLight") : t("themeDark")}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {mode === "dark" ? (
        <SunIcon className="size-4" aria-hidden="true" />
      ) : (
        <MoonIcon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

