import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

// Design.md §5 ProviderStrip — "Revenue verified by:" (TrustMRR pattern). Move a name from
// UPCOMING to LIVE when its connector ships (/add-payment-provider).
const LIVE = ["Stripe"];
const UPCOMING = ["Polar", "Lemon Squeezy", "Paddle", "RevenueCat"];

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
