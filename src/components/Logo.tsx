import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Spec §3 `<Logo>`, with the user's blue app tile (the winking fedora mascot on the JaoPor blue
// square) as the mark (user decision 2026-09-30). Same file as the browser-tab icon.

/** The blue app tile. */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/brand/jaopor-tile.png"
      alt=""
      width={128}
      height={128}
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

/** `<Logo size variant="full|mark" />`: tile + "JaoPor" wordmark (mono 800, -0.02em). */
export function Logo({
  size = 28,
  variant = "full",
  className,
}: {
  size?: number;
  variant?: "full" | "mark";
  className?: string;
}) {
  const t = useTranslations("Common");
  if (variant === "mark") return <LogoMark size={size} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className="font-extrabold tracking-[-0.02em]">{t("brand")}</span>
    </span>
  );
}
