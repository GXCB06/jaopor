import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CATEGORIES } from "@/lib/catalog";
import { BrandLogo } from "./BrandLogo";
import { categoryName } from "@/lib/config/display";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const locale = useLocale();
  const link = "text-caption text-faint hover:text-foreground";

  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <BrandLogo className="text-sm" />
          <p className="text-caption text-muted-foreground">{t("tagline")}</p>
        </div>
        <div>
          <h3 className="mb-3 text-3xs font-semibold tracking-wider text-faint uppercase">
            {t("navigation")}
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/startups" className={link}>
                {nav("startups")}
              </Link>
            </li>
            <li>
              <Link href="/categories" className={link}>
                {nav("categories")}
              </Link>
            </li>
            <li>
              <Link href="/builders" className={link}>
                {nav("builders")}
              </Link>
            </li>
            <li>
              <Link href="/feed" className={link}>
                {nav("feed")}
              </Link>
            </li>
            <li>
              <Link
                href={{ pathname: "/", hash: "leaderboard" }}
                className={link}
              >
                {nav("leaderboard")}
              </Link>
            </li>
            <li>
              <Link href="/olympics" className={link}>
                {t("olympics")}
              </Link>
            </li>
            <li>
              <Link href="/new" className={link}>
                {nav("addStartup")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className={link}>
                {nav("dashboard")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-3xs font-semibold tracking-wider text-faint uppercase">
            {t("browse")}
          </h3>
          <ul className="grid grid-cols-2 gap-2">
            {CATEGORIES.slice(0, 8).map((c) => (
              <li key={c}>
                <Link href={`/category/${c}`} className={link}>
                  {categoryName(c, locale)}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/categories"
            className="mt-3 inline-block text-caption text-brand-text hover:underline"
          >
            {t("allCategories")} →
          </Link>
        </div>
        <div>
          <h3 className="mb-3 text-3xs font-semibold tracking-wider text-faint uppercase">
            {t("about")}
          </h3>
          <ul className="space-y-2">
            <li>
              <Link href="/security" className={link}>
                {t("keySafety")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={link}>
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={link}>
                {t("terms")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t py-6 text-center text-2xs text-faint">
        © 2026 JaoPor · {t("builtWith")}
      </p>
    </footer>
  );
}
