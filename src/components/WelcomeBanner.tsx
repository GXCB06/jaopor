"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Design.md §6 Sign-in routing: shown on /startups?welcome=1 right after a first sign-in, so new
 * users explore first; adding their own work is an invitation, not a gate.
 */
export function WelcomeBanner() {
  const t = useTranslations("Directory");
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-caption"
    >
      <p className="min-w-0 flex-1 leading-relaxed">
        <span className="font-semibold">{t("welcomeTitle")}</span>{" "}
        <span className="text-muted-foreground">{t("welcomeBody")}</span>{" "}
        <Link
          href="/new"
          className="font-semibold whitespace-nowrap text-brand-text hover:underline"
        >
          {t("welcomeCta")} →
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label={t("welcomeClose")}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <XIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
