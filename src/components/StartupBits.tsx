import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Small shared pieces used by cards, leaderboard and profile.

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
        className={cn("shrink-0 rounded-md border object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-bold text-muted-foreground uppercase",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function MetricLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-0.5 text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function FoundingBadge({ n }: { n: number | null }) {
  const t = useTranslations("Card");
  if (!n) return null;
  return (
    <span className="inline-flex rounded-md border border-brand/40 px-1.5 py-0.5 text-[10px] font-bold text-brand tabular-nums">
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
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "tabular-nums",
        up ? "text-positive" : "text-negative",
        className,
      )}
    >
      {up ? "▲" : "▼"}{" "}
      {Math.abs(pct) >= 100
        ? Math.round(Math.abs(pct))
        : Math.abs(pct).toFixed(1)}
      %
    </span>
  );
}

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
        "inline-flex rounded-md border px-2 py-0.5 text-xs",
        className,
      )}
    >
      {children}
    </span>
  );
}
