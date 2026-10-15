"use client";

import { BookmarkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getSaveState, setSave } from "@/app/actions/saves";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Save / saved toggle on a project profile (Phase 9d "ที่บันทึกไว้"). The profile page is ISR-cached
 * and cookie-free, so the saved state is fetched on mount rather than rendered by the server.
 * Signed out → a sign-in link (the query keeps the reader on this page afterwards).
 */
export function SaveButton({
  startupId,
  signedInPath,
  className,
}: {
  startupId: number;
  /** Path to return to after signing in (the profile page, e.g. /th/startup/foo). */
  signedInPath: string;
  className?: string;
}) {
  const t = useTranslations("Save");
  const [state, setState] = useState<{ signedIn: boolean; saved: boolean } | null>(
    null,
  );
  const [busy, start] = useTransition();

  useEffect(() => {
    let alive = true;
    getSaveState(startupId).then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [startupId]);

  const base =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors";

  // Unknown (before the check resolves) or signed out: a quiet button / a sign-in link.
  if (state && !state.signedIn)
    return (
      <Link
        href={{ pathname: "/login", query: { next: signedInPath } }}
        className={cn(base, "hover:border-foreground/30", className)}
        title={t("signIn")}
      >
        <BookmarkIcon className="size-4" aria-hidden="true" />
        <span className="max-sm:sr-only">{t("save")}</span>
      </Link>
    );

  const saved = state?.saved ?? false;
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("saved") : t("save")}
      disabled={busy || !state}
      onClick={() =>
        start(async () => {
          const next = !saved;
          setState((s) => (s ? { ...s, saved: next } : s));
          const res = await setSave(startupId, next);
          if (!res.ok) {
            setState((s) => (s ? { ...s, saved: !next } : s));
            toast.error(t("failed"));
          }
        })
      }
      className={cn(
        base,
        "disabled:opacity-60",
        saved
          ? "border-brand/50 text-brand-text"
          : "hover:border-foreground/30",
        className,
      )}
    >
      <BookmarkIcon
        className={cn("size-4", saved && "fill-current")}
        aria-hidden="true"
      />
      <span className="max-sm:sr-only">{saved ? t("saved") : t("save")}</span>
    </button>
  );
}
