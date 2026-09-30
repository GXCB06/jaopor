import { useTranslations } from "next-intl";
import {
  LOGO_BRIM,
  LOGO_HAT,
  LOGO_LINE,
  LOGO_SMALL_HAT,
  LOGO_TILE,
} from "@/lib/logo";
import { cn } from "@/lib/utils";

/** Spec §3 mark. `mono` is a black tile with a white hat, for light backgrounds. ≤ 24px uses the simplified hat. */
export function LogoMark({
  size = 28,
  mono = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}) {
  const tile = mono ? "#000000" : LOGO_TILE;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx={size <= 24 ? 14 : 15} fill={tile} />
      {size <= 24 ? (
        <>
          <path d={LOGO_SMALL_HAT} fill="#fff" />
          <rect x="3" y="39" width="58" height="10" rx="5" fill="#fff" />
        </>
      ) : (
        <>
          <path d={LOGO_HAT} fill="#fff" />
          <polyline
            points={LOGO_LINE}
            fill="none"
            stroke={tile}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d={LOGO_BRIM} fill="#fff" />
        </>
      )}
    </svg>
  );
}

/** Spec §3 `<Logo size variant="full|mark|mono" />`: mark + "JaoPor" wordmark (mono 800, -0.02em). */
export function Logo({
  size = 28,
  variant = "full",
  className,
}: {
  size?: number;
  variant?: "full" | "mark" | "mono";
  className?: string;
}) {
  const t = useTranslations("Common");
  if (variant !== "full") {
    return (
      <LogoMark size={size} mono={variant === "mono"} className={className} />
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className="font-extrabold tracking-[-0.02em]">{t("brand")}</span>
    </span>
  );
}
