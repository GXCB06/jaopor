"use client";

import { EyeIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLive } from "./LivePresence";

/** Design.md §5 LiveViewersPill: "{n} คนกำลังดูผลงานนี้" on a startup page when n ≥ 2. */
export function LiveViewersPill() {
  const t = useTranslations("Live");
  const pathname = usePathname();
  const { visitors, status } = useLive();
  if (status !== "live") return null;
  // Same project in either language counts together.
  const tail = (p: string) => p.replace(/^\/(th|en)(?=\/|$)/, "");
  const n = visitors.filter((v) => tail(v.path) === tail(pathname)).length;
  if (n < 2) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-positive/30 bg-positive/10 px-2.5 py-0.5 text-2xs font-semibold text-positive">
      <EyeIcon className="size-3.5" aria-hidden="true" />
      {t("watchingThis", { n })}
    </span>
  );
}
