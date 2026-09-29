import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Design.md §5: JaoPor brand assets supplied by the user (2026-09-30). The blue app tile is the
// small mark (header, footer, login); the mascot without background leads the hero pill.

/** Blue app tile (also the browser-tab icon). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/jaopor-tile.png"
      alt=""
      width={128}
      height={128}
      className={cn("size-7 shrink-0 rounded-md", className)}
    />
  );
}

/** Tile + wordmark (header, footer). */
export function BrandLogo({ className }: { className?: string }) {
  const t = useTranslations("Common");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-bold tracking-tight",
        className,
      )}
    >
      <BrandMark />
      <span>{t("brand")}</span>
    </span>
  );
}

/** Hero brand pill: small mascot + "JaoPor", a link back home (Design.md §5 Hero). */
export function BrandPill() {
  const t = useTranslations("Common");
  return (
    <Link
      href="/"
      className="mb-4 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-bold tracking-tight transition-colors hover:bg-accent"
    >
      <Image
        src="/brand/jaopor-mascot-128.webp"
        alt=""
        width={128}
        height={128}
        loading="eager"
        className="size-9"
      />
      {t("brand")}
    </Link>
  );
}
