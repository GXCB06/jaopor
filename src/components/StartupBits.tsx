import Image from "next/image";
import { useTranslations } from "next-intl";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

// Small shared pieces used by cards, leaderboard and profile (Design.md §3 / §5).

export function StartupLogo({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-sm border object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-sm border bg-secondary font-bold text-muted-foreground uppercase",
        size >= 48 ? "text-xl" : "text-2xs",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

/** Design.md §3 metric label: 9px uppercase, faint. */
export function MetricLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-3xs font-semibold tracking-wider text-faint uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function FoundingBadge({ n }: { n: number | null }) {
  const t = useTranslations("Card");
  if (!n) return null;
  return (
    <span className="inline-flex rounded-sm border border-brand/40 px-1.5 py-0.5 text-2xs font-bold text-brand tabular-nums">
      {t("foundingBadge", { n })}
    </span>
  );
}

export function GrowthValue({
  pct,
  className,
}: {
  pct: number | null;
  className?: string;
}) {
  if (pct === null)
    return <span className={cn("text-faint", className)}>–</span>;
  const up = pct >= 0;
  const abs = Math.abs(pct);
  return (
    <span
      className={cn(
        "tabular-nums",
        up ? "text-positive" : "text-negative",
        className,
      )}
    >
      {up ? "↑" : "↓"}{" "}
      {abs >= 100
        ? Math.round(abs).toLocaleString("en")
        : abs.toFixed(abs >= 10 ? 0 : 1)}
      %
    </span>
  );
}

/** Design.md §5 RevenueChartCard growth pill ("↑ 42% vs. prev period"). */
export function GrowthPill({
  pct,
  suffix,
}: {
  pct: number | null;
  suffix: string;
}) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold",
        up
          ? "border-positive/30 bg-positive/10 text-positive"
          : "border-negative/30 bg-negative/10 text-negative",
      )}
    >
      <GrowthValue pct={pct} className="text-inherit" />
      <span className="font-normal opacity-80">{suffix}</span>
    </span>
  );
}

/** Rounded pill chip (insights, tech stack, audience). */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border bg-secondary px-2.5 py-0.5 text-caption text-foreground/90",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Design.md §5 corner tag: verified (positive) or a looking-for ask (warning). */
export function CornerTag({
  tone,
  children,
  className,
}: {
  tone: "positive" | "warning" | "neutral";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border px-1.5 py-0.5 text-3xs font-bold tracking-wider whitespace-nowrap uppercase",
        tone === "positive"
          ? "border-positive/30 bg-positive/10 text-positive"
          : tone === "warning"
            ? "border-warning/30 bg-warning/10 text-warning"
            : "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Design.md §3 Currency: renders the amount in USD and THB; html[data-currency] (set before paint)
 * decides which one shows, so server-rendered and ISR pages never flash. USD only without a rate.
 */
export function Money({
  cents,
  thbPerUsd,
  full = false,
}: {
  cents: number | null | undefined;
  thbPerUsd: number | null | undefined;
  full?: boolean;
}) {
  const usd = money(cents, { full });
  if (!thbPerUsd || cents === null || cents === undefined) return <>{usd}</>;
  return (
    <>
      <span className="cur-usd">{usd}</span>
      <span className="cur-thb" title={`≈ 1 USD = ${thbPerUsd.toFixed(2)} THB`}>
        {money(cents, { currency: "thb", thbPerUsd, full })}
      </span>
    </>
  );
}
