import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "./Logo";

// Design.md §5: the spec "Rising Fedora" tile is the mark (header, footer, login, OG, badge, icons);
// the mascot without background stays in the hero pill only.

/** The mark tile (login, small spots). */
export function BrandMark({ className }: { className?: string }) {
  return <LogoMark size={28} className={className} />;
}

/** Mark + wordmark (header, footer). */
export function BrandLogo({ className }: { className?: string }) {
  return <Logo className={cn("font-bold tracking-tight", className)} />;
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

/** Home hero lockup: big mascot + "JaoPor." (brand dot), not a link (Design.md §5 Hero). */
export function HeroBrand() {
  const t = useTranslations("Common");
  return (
    <p className="mb-5 inline-flex items-center gap-3 md:mb-6 md:gap-4">
      <Image
        src="/brand/jaopor-mascot-128.webp"
        alt=""
        width={128}
        height={128}
        loading="eager"
        className="size-14 md:size-[4.5rem]"
      />
      <span className="text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
        {t("brand")}
        <span className="text-hero-gradient">.</span>
      </span>
    </p>
  );
}

/**
 * Home hero background (Design.md §5 Hero light): a spotlight from the top with slowly swaying
 * beams, full window width, CSS only. Decorative; the wrapper in the layout clips its sides.
 */
export function HeroLight() {
  return (
    <div
      aria-hidden="true"
      className="hero-light pointer-events-none absolute top-0 left-1/2 -z-10 h-[44rem] w-screen max-w-none -translate-x-1/2 overflow-hidden"
    >
      <div className="hero-light-glow" />
      <div className="hero-light-beams" />
    </div>
  );
}
