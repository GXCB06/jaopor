"use client";

import { DownloadIcon, LinkIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { localizedName } from "@/lib/config/localized";
import { getProvince } from "@/lib/config/provinces";
import { useMyProvince } from "@/lib/my-province";

/**
 * Design.md §5 ShareRankCard: "แชร์อันดับจังหวัดคุณ" — download the province share image (or the
 * Olympics image when no province is picked) and copy the matching link.
 */
export function ShareRankCard({ ranks }: { ranks: Record<string, number> }) {
  const t = useTranslations("Olympics");
  const locale = useLocale();
  const mine = useMyProvince();
  const p = mine ? getProvince(mine) : undefined;
  const path = p ? `/${locale}/province/${p.slug}` : `/${locale}/olympics`;
  const rank = p ? ranks[p.slug] : undefined;

  return (
    <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
      <h2 className="text-xs font-semibold">{t("shareTitle")}</h2>
      <p className="mt-1 text-caption text-muted-foreground">
        {p
          ? t("shareBodyProvince", {
              name: localizedName(p, locale),
              rank: rank ? `#${rank}` : "–",
            })
          : t("shareBody")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={`${path}/opengraph-image`}
          download={`jaopor-${p?.slug ?? "olympics"}.png`}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <DownloadIcon className="size-3.5" aria-hidden="true" />
          {t("downloadImage")}
        </a>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(
              new URL(path, window.location.origin).toString(),
            );
            toast.success(t("linkCopied"));
          }}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-background px-2 text-xs font-semibold hover:bg-accent"
        >
          <LinkIcon className="size-3.5" aria-hidden="true" />
          {t("copyLink")}
        </button>
      </div>
    </div>
  );
}
