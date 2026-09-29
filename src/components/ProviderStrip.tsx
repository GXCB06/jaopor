import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { SOURCES, SOURCE_NAME } from "@/lib/sources/catalog";

// Design.md §5 ProviderStrip — "Numbers verified by:" (TrustMRR pattern). LIVE comes from the
// sources catalog; move a name out of UPCOMING when its connector ships (/add-payment-provider).
const LIVE = SOURCES.map((s) => SOURCE_NAME[s]);
const UPCOMING = ["Polar", "Lemon Squeezy", "Paddle", "App Store"];

export function ProviderStrip() {
  const t = useTranslations("Home");
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
      <span className="mr-1 text-muted-foreground">{t("verifiedBy")}</span>
      {LIVE.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium"
        >
          {p}
          <CheckIcon className="size-3 text-brand" aria-hidden="true" />
        </span>
      ))}
      {UPCOMING.map((p) => (
        <span
          key={p}
          className="rounded-md border border-dashed px-2 py-0.5 text-muted-foreground"
        >
          {p}
        </span>
      ))}
      <span className="text-[10px] text-muted-foreground">
        · {t("comingSoon")}
      </span>
    </div>
  );
}
