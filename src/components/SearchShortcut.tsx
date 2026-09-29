"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/** Focuses the page's search box, or opens the directory when the page has none. */
function focusSearch(router: ReturnType<typeof useRouter>) {
  const input = document.querySelector<HTMLInputElement>(
    'form[role="search"] input[name="q"]',
  );
  if (input) {
    input.focus();
    input.select();
  } else {
    router.push("/startups?focus=1");
  }
}

/** Design.md §5 SiteHeader: search trigger with a "/" shortcut (ledgerly pattern). */
export function SearchShortcut() {
  const t = useTranslations("Nav");
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      )
        return;
      e.preventDefault();
      focusSearch(router);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <button
      type="button"
      onClick={() => focusSearch(router)}
      aria-label={t("search")}
      className="inline-flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 text-xs text-faint transition-colors hover:text-foreground"
    >
      <SearchIcon className="size-3.5" aria-hidden="true" />
      <span className="hidden lg:inline">{t("search")}</span>
      <kbd className="hidden rounded-sm border bg-secondary px-1 text-2xs text-muted-foreground lg:inline">
        /
      </kbd>
    </button>
  );
}
