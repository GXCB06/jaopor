import { EyeIcon, TagIcon, TrendingUpIcon, UsersIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { MetricHelp } from "@/components/core/MetricHelp";
import { formatMoney } from "@/lib/format";
import type { ListingMultiple, PublicListing } from "@/lib/listing";
import { cn } from "@/lib/utils";

/**
 * Design.md "For-sale listing" §1: the amber banner above a project's header while its listing is
 * public. The price is owner-stated and says so; the multiple appears only when the caller worked
 * one out (verified, exact-disclosed MRR above zero). Shared by the project page and the owner's
 * live preview on the edit page, so both show exactly the same thing.
 */
export function ForSaleBanner({
  listing,
  multiple,
  multipleSource,
  usd,
  stats,
  actions,
  footer,
  id,
  className,
}: {
  listing: PublicListing;
  multiple: ListingMultiple | null;
  /** Where the MRR behind the multiple was verified ("Stripe"), for the ⓘ. */
  multipleSource: string | null;
  /** The price in USD at the display rate, shown only in USD mode and labelled as an estimate. */
  usd: { amount: number; date: string | null } | null;
  stats: { views: number; interested: number } | null;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Anchor for the sticky sale pill (`#for-sale`); it lands under the header + sticky bar. */
  id?: string;
  className?: string;
}) {
  const t = useTranslations("ForSale");
  const format = useFormatter();
  const price = formatMoney(listing.priceThb, "thb");
  const usdText = usd
    ? usd.date
      ? t("usdEstimate", {
          usd: formatMoney(usd.amount, "usd"),
          date: format.dateTime(new Date(`${usd.date}T00:00:00Z`), {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
        })
      : t("usdEstimateNoDate", { usd: formatMoney(usd.amount, "usd") })
    : null;
  const multipleText = multiple
    ? multiple.kind === "over"
      ? t("multipleOver")
      : multiple.kind === "under"
        ? t("multipleUnder")
        : t("multiple", {
            n: format.number(multiple.value, { maximumFractionDigits: 1 }),
          })
    : null;
  const chip =
    "inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-0.5 text-caption tabular-nums";

  return (
    <section
      id={id}
      aria-labelledby="for-sale-title"
      className={cn(
        "scroll-mt-28 space-y-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p
            id="for-sale-title"
            className="flex items-start gap-2 text-sm font-semibold"
          >
            <TagIcon
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            <span className="min-w-0">
              {t("title")} ·{" "}
              <span className="tabular-nums">
                {t("askingPrice", { price })}
              </span>
              {usdText && (
                <span className="cur-usd font-normal text-muted-foreground tabular-nums">
                  {" "}
                  {usdText}
                </span>
              )}
            </span>
          </p>
          {listing.note && (
            <p className="pl-6 text-caption break-words text-muted-foreground">
              {listing.note}
            </p>
          )}
          {(multipleText || stats) && (
            <div className="relative flex flex-wrap gap-1.5 pl-6">
              {multipleText && (
                <span className={chip}>
                  <TrendingUpIcon
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {multipleText}
                  <MetricHelp label={t("multipleHelpLabel")}>
                    <span className="block">{t("multipleHelp")}</span>
                    {multipleSource && (
                      <span className="block">
                        {t("multipleSource", { source: multipleSource })}
                      </span>
                    )}
                  </MetricHelp>
                </span>
              )}
              {stats && stats.views > 0 && (
                <span className={chip} title={t("viewsHelp")}>
                  <EyeIcon
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {t("views", { n: stats.views })}
                </span>
              )}
              {stats && stats.interested > 0 && (
                <span className={chip}>
                  <UsersIcon
                    className="size-3 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {t("interested", { n: stats.interested })}
                </span>
              )}
            </div>
          )}
        </div>
        {actions && <div className="shrink-0 max-sm:w-full">{actions}</div>}
      </div>
      {footer}
    </section>
  );
}
