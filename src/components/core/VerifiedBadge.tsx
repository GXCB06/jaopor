import { BadgeCheckIcon, ShieldCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Spec 2.2 VerifiedBadge: green "ยืนยันแล้ว · Stripe"; else, when the snippet was found on the
 * website, a neutral "ยืนยันเจ้าของเว็บแล้ว" (Design.md §5 Owner verified); else a muted
 * "ยังไม่ยืนยัน".
 */
export function VerifiedBadge({
  source,
  ownerVerified = false,
  className,
}: {
  /** Display name of the verifying source; omit when the numbers aren't verified. */
  source?: string | null;
  ownerVerified?: boolean;
  className?: string;
}) {
  const t = useTranslations("Common");
  if (!source && ownerVerified)
    return (
      <span
        title={t("ownerVerifiedHint")}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border bg-secondary px-2 py-0.5 text-caption font-semibold text-foreground",
          className,
        )}
      >
        <ShieldCheckIcon className="size-3.5" aria-hidden="true" />
        {t("ownerVerified")}
      </span>
    );
  return source ? (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-2 py-0.5 text-caption font-semibold text-positive",
        className,
      )}
    >
      <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
      {t("verifiedVia", { source })}
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center rounded-full border bg-secondary px-2 py-0.5 text-caption text-muted-foreground",
        className,
      )}
    >
      {t("notVerified")}
    </span>
  );
}
