import { useTranslations } from "next-intl";

import { SOURCES, SOURCE_NAME } from "@/lib/sources/catalog";

// Design.md §5 ProviderStrip — "Numbers verified by:" + one small tile per live source (initial
// letter, no third-party logos). LIVE comes from the sources catalog; move a name out of
// UPCOMING when its connector ships (/add-payment-provider).
const LIVE = SOURCES.map((s) => SOURCE_NAME[s]);
const UPCOMING = ["Polar", "Lemon Squeezy", "Paddle", "App Store"];

export function ProviderStrip() {
  const t = useTranslations("Home");
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-caption text-muted-foreground">{t("verifiedBy")}</p>
      <ul className="flex flex-wrap items-center justify-center gap-1.5">
        {LIVE.map((p) => (
          <li
            key={p}
            title={p}
            className="inline-flex h-6 items-center gap-1.5 rounded-sm border bg-card px-1.5 text-2xs font-medium"
          >
            <span
              aria-hidden="true"
              className="flex size-4 items-center justify-center rounded-[3px] bg-brand text-3xs font-bold text-brand-foreground"
            >
              {p.slice(0, 1)}
            </span>
            {p}
          </li>
        ))}
        <li className="text-2xs text-faint">
          + {UPCOMING.join(" · ")} {t("comingSoon")}
        </li>
      </ul>
    </div>
  );
}
